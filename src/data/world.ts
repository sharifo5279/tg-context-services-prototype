// Continuous world model: observed transaction activity for the Harborview trading community.
// Each calendar day is generated deterministically from a fixed seed, so every restart produces the same
// history. Six months of history are visible; the next 30 days are generated ahead and released as time passes.
// Business patterns: business hours and weekdays, month-end invoice peaks, holiday ramp, onboarding and churn.
// Incidents (endpoint outages, acknowledgment outages, map regressions, cross-reference gaps, data errors) occur
// at realistic random rates.
import { pad } from "../util.js";
import { HUB_ID, companyById, addresses } from "./cms.js";
import { PROFILES, Profile, DAY, anchorDay } from "./roster.js";

const HOUR = 3600_000;
const SEED = 20261017;
export const HISTORY_DAYS = 183;
export const AHEAD_DAYS = 30;
export const SEARCH_LIMIT_DAYS = 183;

// ---------------------------------------------------------------- deterministic randomness
function hash(...parts: (string | number)[]) {
  let h = 2166136261 ^ SEED;
  for (const p of parts) { const s = String(p); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= 0x9e37; h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = <T>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];

// ---------------------------------------------------------------- stores and distribution centers
function glnCheck(d12: string) { let s = 0; for (let i = 0; i < 12; i++) s += Number(d12[i]) * (i % 2 === 0 ? 1 : 3); return String((10 - (s % 10)) % 10); }
const gln = (n: number) => { const d = `0614141${pad(n, 5)}`; return d + glnCheck(d); };

export type Store = { number: string; gln: string; name: string; openDay: number; xrefDay: number };
const CITIES = ["Charlotte", "Raleigh", "Atlanta", "Nashville", "Richmond", "Greensboro", "Columbia", "Durham", "Savannah", "Knoxville", "Charleston", "Asheville", "Chattanooga", "Norfolk", "Roanoke", "Wilmington", "Greenville", "Birmingham", "Memphis", "Louisville", "Lexington", "Jacksonville", "Orlando", "Tampa", "Macon", "Augusta", "Spartanburg", "Winston-Salem", "Fayetteville", "Huntsville", "Mobile", "Montgomery", "Lynchburg", "Myrtle Beach"];
export const STORE_LIST: Store[] = [
  { number: "0101", gln: "0614141001019", name: "Store 0101 Charlotte", openDay: anchorDay(-3000), xrefDay: anchorDay(-3000) },
  { number: "0214", gln: "0614141002146", name: "Store 0214 Raleigh", openDay: anchorDay(-3000), xrefDay: anchorDay(-3000) },
  { number: "0388", gln: "0614141003884", name: "Store 0388 Atlanta", openDay: anchorDay(-3000), xrefDay: anchorDay(-3000) },
  { number: "0519", gln: "0614141005192", name: "Store 0519 Nashville", openDay: anchorDay(-3000), xrefDay: anchorDay(-3000) },
  { number: "0601", gln: "0614141006014", name: "Store 0601 Richmond", openDay: anchorDay(-3000), xrefDay: anchorDay(-3000) },
  { number: "0412", gln: "0614141000418", name: "DC 0412 Greensboro", openDay: anchorDay(-400), xrefDay: anchorDay(-398) },
];
{
  const r = rng(hash("stores"));
  const openings = [-150, -112, -76, -41, -16, -4, 9, 23];
  const gaps = [0, 3, 1, 5, 2, 7, 4, 0];
  for (let i = 0; i < CITIES.length; i++) {
    const num = pad(620 + i * 7, 4);
    const k = i - (CITIES.length - openings.length);
    const open = k >= 0 ? anchorDay(openings[k]) : anchorDay(-3000 + Math.floor(r() * 2000));
    const xref = k >= 0 ? open + gaps[k] : open;
    STORE_LIST.push({ number: num, gln: gln(Number(num) * 10 + 7), name: `Store ${num} ${CITIES[i]}`, openDay: open, xrefDay: xref });
  }
}
export const STORES: Record<string, { gln: string; name: string }> = Object.fromEntries(STORE_LIST.map((s) => [s.number, { gln: s.gln, name: s.name }]));
const storesOpen = (day: number) => STORE_LIST.filter((s) => s.openDay <= day);

// ---------------------------------------------------------------- calendar patterns
const dayOf = (t: number) => Math.floor(t / DAY);
function season(t: number) {
  const d = new Date(t); const m = d.getUTCMonth(), dd = d.getUTCDate();
  if (m === 9) return 1.1 + dd * 0.004;            // October ramp
  if (m === 10) return dd >= 20 && dd <= 30 ? 1.55 : 1.35; // November, Thanksgiving week peak
  if (m === 11) return dd <= 18 ? 1.25 : 0.75;     // December, quiet after the 18th
  if (m === 0) return 0.85;
  if (m === 1 || m === 2) return 0.92;
  if (m === 8) return 1.05;
  return 1.0;
}
function weekday(t: number) { const w = new Date(t).getUTCDay(); return w === 0 ? 0.12 : w === 6 ? 0.22 : 1; }
const lastDayOfMonth = (t: number) => { const d = new Date(t); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); };
const isMonthEnd = (t: number) => { const d = new Date(t); return lastDayOfMonth(t) - d.getUTCDate() <= 2; };

// ---------------------------------------------------------------- incidents (random, deterministic)
type Kind = "OUTAGE" | "ACK_OUTAGE" | "PICKUP_STALL" | "MAP_REGRESSION" | "VAN_REJECT";
const RATE: Record<Kind, { p: number; min: number; max: number }> = {
  OUTAGE: { p: 0.006, min: 2, max: 26 },
  ACK_OUTAGE: { p: 0.006, min: 14, max: 60 },
  PICKUP_STALL: { p: 0.008, min: 10, max: 40 },
  MAP_REGRESSION: { p: 0.003, min: 6, max: 30 },
  VAN_REJECT: { p: 0.01, min: 1, max: 6 },
};
const incCache = new Map<string, { start: number; end: number } | null>();
function incidentStart(pid: string, kind: Kind, day: number) {
  const k = `${pid}|${kind}|${day}`;
  if (incCache.has(k)) return incCache.get(k)!;
  const r = rng(hash("inc", pid, kind, day)); const rate = RATE[kind];
  let v: { start: number; end: number } | null = null;
  if (r() < rate.p) { const start = day * DAY + r() * DAY; v = { start, end: start + (rate.min + r() * (rate.max - rate.min)) * HOUR }; }
  incCache.set(k, v);
  return v;
}
/** Active incident window for a partner at time t, if any. */
export function incidentAt(pid: string, kind: Kind, t: number) {
  const p = PROFILES.find((x) => x.id === pid);
  if (!p) return null;
  if (kind === "OUTAGE" && p.protocol !== "AS2") return null;
  if (kind === "PICKUP_STALL" && p.protocol !== "SFTP") return null;
  if (kind === "VAN_REJECT" && p.protocol !== "VAN_INTERCONNECT") return null;
  if (kind === "ACK_OUTAGE" && p.protocol === "WEB_EDI") return null;
  const d = dayOf(t);
  for (let x = d - 3; x <= d; x++) { const w = incidentStart(pid, kind, x); if (w && w.start <= t && t < w.end) return w; }
  return null;
}

// Demo incident: Northfield Foods' AS2 signing certificate expired two hours before the current time.
// Inbound production files from the partner fail AS2 signature verification at receipt.
export const CERT_INCIDENT = { partnerCompanyId: "C20001", hours: 2 };
export const certIncidentStart = (now = Date.now()) => now - CERT_INCIDENT.hours * HOUR;
const certErr = (): Err => ({ code: "AS2-SIG-401", category: "COMMUNICATION", message: `AS2 signature verification failed: partner signing certificate expired ${new Date(certIncidentStart()).toISOString().slice(0, 16).replace("T", " ")} UTC (CN=as2.northfieldfoods.example)`, service: "Communications gateway", step: "Receive" });

// ---------------------------------------------------------------- transaction record
export const STATUS_TEXT: Record<string, string> = {
  DLVD: "Delivered to receiver",
  FAIL: "Processing failed; not delivered",
  INPR: "In process; not yet delivered",
  RCVD: "Received; processing not started",
};
const STEPS = ["Receive", "Check", "Transform", "Route", "Deliver"];
type Err = { code: string; category: string; message: string; service: string; step: string };
type Party = { companyId: string; companyName: string; tradingAddress: string; orgId: string };
type Refs = { poNumber?: string; shipmentId?: string; invoiceNumber?: string; shipToGLN?: string; ackForTransactionId?: string; ackForControlNumber?: string; storeNumber?: string; shippingOrder?: string; statusCode?: string; adjustmentNumber?: string; traceNumber?: string; quantityOrdered?: number; quantityShipped?: number; amount?: number; reason?: string; channel?: string };

const partyCache = new Map<string, Party>();
const addrOf = (id: string) => { const a = addresses.find((x) => x.companyId === id); return a ? `${a.qualifier}:${a.address}` : "ZZ:UNKNOWN"; };
function party(id: string, addr?: string): Party {
  const a = addr ?? addrOf(id); const k = `${id}|${a}`;
  let p = partyCache.get(k);
  if (!p) { const c = companyById(id)!; p = { companyId: id, companyName: c.companyName, tradingAddress: a, orgId: c.orgId }; partyCache.set(k, p); }
  return p;
}

const KEYS: Record<string, (r: Refs) => any> = {
  "850": (r) => ({ primary: { name: "PO number (BEG03)", value: r.poNumber! }, secondary: r.shipToGLN ? { name: "Ship-to GLN (N104, N103=UL)", value: r.shipToGLN } : undefined }),
  "860": (r) => ({ primary: { name: "PO number (BCH03)", value: r.poNumber! } }),
  "855": (r) => ({ primary: { name: "PO number (BAK03)", value: r.poNumber! } }),
  "856": (r) => ({ primary: { name: "Shipment ID (BSN02)", value: r.shipmentId! }, secondary: { name: "PO number (PRF01)", value: r.poNumber! }, tertiary: r.shipToGLN ? { name: "Ship-to GLN (N104, N103=UL)", value: r.shipToGLN } : r.storeNumber ? { name: "Ship-to store (N104, N103=92)", value: r.storeNumber } : undefined }),
  "810": (r) => ({ primary: { name: "Invoice number (BIG02)", value: r.invoiceNumber! }, secondary: { name: "PO number (BIG04)", value: r.poNumber! }, tertiary: r.shipToGLN ? { name: "Ship-to GLN (N104, N103=UL)", value: r.shipToGLN } : undefined }),
  "997": (r) => ({ primary: { name: "Acknowledged group control number (AK102)", value: r.ackForControlNumber! } }),
  "214": (r) => ({ primary: { name: "Shipment ID (B1003)", value: r.shipmentId! }, secondary: r.statusCode ? { name: "Status code (AT701)", value: r.statusCode } : undefined }),
  "846": (r) => ({ primary: { name: "Inventory report number (BIA03)", value: r.poNumber! } }),
  "812": (r) => ({ primary: { name: "Adjustment number (BCD02)", value: r.adjustmentNumber! }, secondary: r.invoiceNumber ? { name: "Invoice number (BCD10)", value: r.invoiceNumber } : undefined }),
  "820": (r) => ({ primary: { name: "Trace number (TRN02)", value: r.traceNumber! } }),
  "940": (r) => ({ primary: { name: "Shipping order number (W0502)", value: r.shippingOrder! }, secondary: { name: "PO number (W0503)", value: r.poNumber! } }),
  "945": (r) => ({ primary: { name: "Shipping order number (W0602)", value: r.shippingOrder! }, secondary: { name: "Shipment ID (W0603)", value: r.shipmentId! } }),
  ORDERS: (r) => ({ primary: { name: "Order number (BGM 1004)", value: r.poNumber! } }),
  DESADV: (r) => ({ primary: { name: "Despatch advice number (BGM 1004)", value: r.shipmentId! }, secondary: { name: "Order number (RFF+ON)", value: r.poNumber! } }),
  INVOIC: (r) => ({ primary: { name: "Invoice number (BGM 1004)", value: r.invoiceNumber! }, secondary: { name: "Order number (RFF+ON)", value: r.poNumber! } }),
  CONTRL: (r) => ({ primary: { name: "Acknowledged interchange reference (UCI 0020)", value: r.ackForControlNumber! } }),
};

export class Tx {
  _o?: any;
  constructor(
    public transactionId: string,
    public _t: number,
    public partnerCompanyId: string,
    public direction: "OUTBOUND" | "INBOUND",
    public documentType: string,
    public standard: "X12" | "EDIFACT",
    public environment: "PRODUCTION" | "TEST",
    public refs: Refs,
    public _base: "DLVD" | "FAIL",
    public _settle: number,
    public _err: Err | undefined,
    public ack: { status: string; code: string; detail?: string } | undefined,
    public mapId: string | undefined,
    public _n: number,
    public _hub: string,
  ) {}
  get version() { return this.standard === "X12" ? "004010" : "D96A"; }
  get ediType() { return `${this.standard} ${this.documentType}`; }
  get transactionLevel() { return "DOCUMENT" as const; }
  get documentCount() { return 1; }
  get sizeBytes() { return 900 + (this._n * 7919) % 6000; }
  get fileId() { return `F${this.transactionId.slice(3)}`; }
  get correlationId() { return `COR-${this.transactionId.slice(3)}`; }
  get sender() { return this.direction === "OUTBOUND" ? party(HUB_ID, this._hub) : party(this.partnerCompanyId); }
  get receiver() { return this.direction === "OUTBOUND" ? party(this.partnerCompanyId) : party(HUB_ID, this._hub); }
  get senderTransactionId() { return `${this.sender.tradingAddress.split(":")[1].slice(0, 4)}-${pad(this._n % 10000000, 7)}`; }
  get receivedAt() { return new Date(this._t).toISOString(); }
  get controlNumbers(): Record<string, string> { return this.standard === "X12" ? { isa13: pad(this._n, 9), gs06: String(this._n), st02: "0001" } : { unb0020: `HRG${pad(this._n, 8)}`, unh0062: "1" }; }
  get _certFail() { return this.partnerCompanyId === CERT_INCIDENT.partnerCompanyId && this.direction === "INBOUND" && this.environment === "PRODUCTION" && this.documentType !== "997" && this._t >= certIncidentStart() && this._t <= Date.now(); }
  get sourceStatus(): "DLVD" | "FAIL" | "INPR" | "RCVD" { if (this._o?.sourceStatus) return this._o.sourceStatus; if (this._certFail) return "FAIL"; if (this._base === "DLVD" && Date.now() < this._t + this._settle) return "INPR"; return this._base; }
  set sourceStatus(v) { (this._o ??= {}).sourceStatus = v; }
  get errors(): Err[] { return this._o?.errors ?? (this._certFail ? [certErr()] : this._err ? [this._err] : []); }
  set errors(v) { (this._o ??= {}).errors = v; }
  get keys() { const k = (KEYS[this.documentType] ?? (() => ({})))(this.refs); for (const x of Object.keys(k)) if (k[x] === undefined) delete k[x]; return k; }
  get statusHistory(): { step: string; status: string; at: string }[] {
    if (this._o?.statusHistory) return this._o.statusHistory;
    const st = this.sourceStatus;
    const failIdx = this._certFail ? 0 : this._err ? STEPS.indexOf(this._err.step) : -1;
    const span = st === "INPR" ? Math.max(1, Math.min(4, Math.floor(((Date.now() - this._t) / Math.max(1, this._settle)) * 4))) : 0;
    const lastIdx = st === "DLVD" ? 4 : st === "FAIL" ? failIdx : st === "INPR" ? Math.min(2, span) : 0;
    const step = st === "DLVD" ? Math.min(40_000, this._settle / 5) : 40_000;
    return STEPS.slice(0, lastIdx + 1).map((s, i) => ({ step: s, status: st === "FAIL" && i === lastIdx ? "FAILED" : st === "INPR" && i === lastIdx ? "IN_PROCESS" : "COMPLETED", at: new Date(this._t + i * step).toISOString() }));
  }
  set statusHistory(v) { (this._o ??= {}).statusHistory = v; }
  get lastModified() { if (this._o?.lastModified) return this._o.lastModified; const st = this.sourceStatus; return new Date(st === "INPR" ? this._t + 40_000 : this._t + Math.min(this._settle, 200_000)).toISOString(); }
  set lastModified(v) { (this._o ??= {}).lastModified = v; }
  get payloadVariants(): string[] { if (this._o?.payloadVariants) return this._o.payloadVariants; return this.documentType === "997" || this.documentType === "CONTRL" ? ["ORIGINAL"] : this.sourceStatus === "DLVD" ? ["ORIGINAL", "TRANSLATED"] : ["ORIGINAL"]; }
  set payloadVariants(v) { (this._o ??= {}).payloadVariants = v; }
  toJSON() {
    return { transactionId: this.transactionId, senderTransactionId: this.senderTransactionId, correlationId: this.correlationId, environment: this.environment, receivedAt: this.receivedAt, lastModified: this.lastModified, direction: this.direction, partnerCompanyId: this.partnerCompanyId, sender: this.sender, receiver: this.receiver, standard: this.standard, version: this.version, documentType: this.documentType, ediType: this.ediType, transactionLevel: this.transactionLevel, fileId: this.fileId, documentCount: 1, sizeBytes: this.sizeBytes, controlNumbers: this.controlNumbers, keys: this.keys, refs: this.refs, sourceStatus: this.sourceStatus, statusHistory: this.statusHistory, errors: this.errors, ...(this.ack ? { ack: this.ack } : {}), ...(this.mapId ? { mapId: this.mapId } : {}), payloadVariants: this.payloadVariants };
  }
}

// ---------------------------------------------------------------- error catalog
const E = (code: string, category: string, message: string, service: string, step: string): Err => ({ code, category, message, service, step });
const ERR = {
  ref: E("X12-SYN-022", "VALIDATION", "Segment REF has an invalid qualifier in REF01", "EDI validation", "Check"),
  it104: E("X12-SYN-104", "VALIDATION", "IT104 unit price is not a valid decimal (value '12,40')", "EDI validation", "Check"),
  td1: E("X12-SYN-311", "VALIDATION", "TD1 segment missing in shipment level HL", "EDI validation", "Check"),
  price: E("MAP-TRN-118", "TRANSLATION", "Mandatory target field Item/UnitPrice has no source value", "Translation", "Transform"),
  poNotFound: E("BUS-RULE-07", "BUSINESS_RULE", "Referenced PO number not found in hub order reference (rule HRG-810-07)", "Business rules", "Transform"),
  dupInv: E("BUS-RULE-12", "BUSINESS_RULE", "Invoice number duplicates an invoice received within 30 days (rule HRG-810-12)", "Business rules", "Transform"),
  as2: E("AS2-MDN-504", "DELIVERY", "AS2 MDN not received: connection timed out to partner endpoint (host redacted) after 3 attempts", "Communications gateway", "Deliver"),
  van: E("VAN-IC-421", "DELIVERY", "Interconnect partner Keystone VAN rejected the interchange: receiver mailbox temporarily unavailable", "Communications gateway", "Deliver"),
  carrier: E("XREF-404", "TRANSLATION", "Cross-reference lookup failed: entity CARRIER_STATUS_CODE, key 'A9' not found (map CRL_214_4010_IN v3, AT701)", "Translation", "Transform"),
};
const xrefErr = (store: string, mapName: string): Err => E("XREF-404", "TRANSLATION", `Cross-reference lookup failed: entity STORE_TO_GLN, key '${store}' not found (map ${mapName}, N1*ST N104 qualifier 92)`, "Translation", "Transform");
const mapRegErr = (doc: string, mapName: string): Err => E("MAP-TRN-207", "TRANSLATION", `Target segment validation failed after map promotion: ${doc} map ${mapName}, loop HL/O missing mandatory PRF`, "Translation", "Transform");
const MAP_NAME: Record<string, string> = { "M-1001": "BWHG_856_4010_IN v7", "M-1013": "HRG_856_4010_STORE_IN v2", "M-1005": "CST_856_4010_IN v5", "M-1002": "NFF_810_4010_IN v4", "M-1006": "PGH_810_4010_IN v1", "M-1008": "SMB_855_4010_IN v2" };

// ---------------------------------------------------------------- day generator
const BASE_DAY = 19000;
type Gen = { day: number; seq: number; out: Tx[]; r: () => number };

function emit(g: Gen, o: { t: number; p: string; dir: "OUTBOUND" | "INBOUND"; doc: string; refs: Refs; err?: Err; ack?: Tx["ack"]; mapId?: string; env?: "PRODUCTION" | "TEST"; hub?: string; stuck?: boolean }) {
  const std = ["ORDERS", "DESADV", "INVOIC", "CONTRL"].includes(o.doc) ? "EDIFACT" : "X12";
  const hub = o.hub ?? (o.env === "TEST" ? "ZZ:HARBORVIEWTST" : std === "EDIFACT" ? "14:0614141000012" : "ZZ:HARBORVIEWUS");
  g.seq += 1;
  const id = `TGT${pad(g.day - BASE_DAY, 5)}${pad(g.seq, 4)}`;
  const settle = o.err ? 0 : o.stuck ? (6 + g.r() * 24) * HOUR : 40_000 + g.r() * 160_000;
  const tx = new Tx(id, Math.round(o.t), o.p, o.dir, o.doc, std, o.env ?? "PRODUCTION", o.refs, o.err ? "FAIL" : "DLVD", settle, o.err, o.ack, o.mapId, (g.day - BASE_DAY) * 10000 + g.seq, hub);
  g.out.push(tx);
  return tx;
}
function ack(g: Gen, orig: Tx, after: number, status = "ACCEPTED", detail?: string) {
  const ed = orig.standard === "EDIFACT";
  return emit(g, { t: orig._t + after * HOUR, p: orig.partnerCompanyId, dir: orig.direction === "OUTBOUND" ? "INBOUND" : "OUTBOUND", doc: ed ? "CONTRL" : "997", env: orig.environment, hub: orig._hub,
    refs: { ackForTransactionId: orig.transactionId, ackForControlNumber: ed ? orig.controlNumbers.unb0020 : orig.controlNumbers.gs06 },
    ack: { status, code: ed ? (status === "ACCEPTED" ? "UCI 0083=7" : "UCI 0083=4") : status === "ACCEPTED" ? "AK501=A" : status === "REJECTED" ? "AK501=R" : "AK501=E", ...(detail ? { detail } : {}) } });
}
/** Business-hour time on a day, in UTC (Harborview is US Eastern). */
const at = (day: number, fromH: number, toH: number, r: () => number) => day * DAY + (fromH + r() * (toH - fromH)) * HOUR;
const hours = (h: number) => h * HOUR;

function deliveryErr(p: Profile, t: number): Err | undefined {
  if (incidentAt(p.id, "OUTAGE", t)) return ERR.as2;
  if (incidentAt(p.id, "VAN_REJECT", t)) return ERR.van;
  return undefined;
}
function inboundBlocked(p: Profile, t: number) { return !!incidentAt(p.id, "OUTAGE", t); }

const REJECT_DETAIL = ["AK3*DTM*4 / AK4*2*374*7: DTM02 date invalid", "AK3*N1*9 / AK4*4*67*1: N104 mandatory element missing", "AK3*PO1*6 / AK4*7*235*7: PO107 qualifier invalid"];

function genSupplierOrder(g: Gen, p: Profile, t850: number, k: number) {
  const r = g.r;
  const ed = p.flow === "EDIFACT_SUPPLIER", web = p.flow === "WEB_EDI";
  const store = pick(r, storesOpen(dayOf(t850)));
  const poNum = ed ? `HRG-ORD-${pad(g.day % 1000, 3)}${pad(k, 3)}` : `45${pad(g.day - BASE_DAY, 4)}${pad(k, 4)}`;
  const po = emit(g, { t: t850, p: p.id, dir: "OUTBOUND", doc: ed ? "ORDERS" : "850", refs: { poNumber: poNum, shipToGLN: store.gln }, mapId: ed ? "M-1004" : web ? undefined : "M-1003", err: web ? undefined : deliveryErr(p, t850) });
  if (po._err) return; // held for redelivery; no partner documents follow
  const ackOut = incidentAt(p.id, "ACK_OUTAGE", t850) || incidentAt(p.id, "PICKUP_STALL", t850);
  if (!web && !ackOut) { const rej = r() < 0.004; ack(g, po, 0.2 + r() * (p.protocol === "SFTP" ? 3 : 1.2), rej ? "REJECTED" : "ACCEPTED", rej ? pick(r, REJECT_DETAIL) : undefined); }
  if (!web && r() < 0.02) emit(g, { t: t850 + hours(2 + r() * 20), p: p.id, dir: "OUTBOUND", doc: "860", refs: { poNumber: poNum }, mapId: "M-1003" });
  const inbound = (t: number, doc: string, refs: Refs, err?: Err, mapId?: string) => {
    if (!web && inboundBlocked(p, t)) t += hours(8 + r() * 12); // partner resends after its outage
    const stuck = !err && r() < 0.002;
    const tx = emit(g, { t, p: p.id, dir: "INBOUND", doc, refs: web ? { ...refs, channel: "Web form" } : refs, err, mapId, stuck });
    if (!web) ack(g, tx, 0.05 + r() * 0.3, err?.category === "VALIDATION" ? "REJECTED" : "ACCEPTED");
    return tx;
  };
  // 855
  if (p.poAck > 0 && r() < p.poAck) {
    const late = r() < 0.06;
    inbound(t850 + hours(late ? 50 + r() * 40 : 2 + r() * 26), "855", { poNumber: poNum }, r() < 0.003 ? ERR.ref : undefined, p.map855);
  }
  // 856
  const t856 = t850 + hours(20 + r() * 70);
  const shipId = ed ? `DES-${poNum.slice(-9)}` : `SH-${p.prefix}-${poNum.slice(-8)}`;
  const invFirst = !!p.invoiceFirst && r() < p.invoiceFirst;
  let t810 = invFirst ? t856 - hours(2 + r() * 20) : t856 + hours(4 + r() * 60);
  const d810 = new Date(t810);
  if (!isMonthEnd(t810) && d810.getUTCDate() >= 20 && r() < 0.35) { const last = lastDayOfMonth(t810); t810 = Date.UTC(d810.getUTCFullYear(), d810.getUTCMonth(), last - Math.floor(r() * 2), 14 + r() * 8); }
  if (!web || r() < 0.7) {
    const refs: Refs = { shipmentId: shipId, poNumber: poNum, ...(p.storeNumbers ? { storeNumber: store.number } : { shipToGLN: store.gln }) };
    let err: Err | undefined;
    if (p.storeNumbers && dayOf(t856) < store.xrefDay) err = xrefErr(store.number, MAP_NAME[p.map856 ?? "M-1013"] ?? "HRG_856_4010_STORE_IN v2");
    else if (p.map856 && incidentAt(p.id, "MAP_REGRESSION", t856) && r() < 0.6) err = mapRegErr("856", MAP_NAME[p.map856]);
    else if (r() < 0.004) err = ERR.td1;
    const asn = inbound(t856, ed ? "DESADV" : "856", refs, err, p.map856);
    if (!err && r() < 0.003) inbound(asn._t + hours(0.3 + r() * 2), ed ? "DESADV" : "856", refs, undefined, p.map856); // duplicate ASN
  }
  // 810
  const invNo = ed ? `HOLINV-${poNum.slice(-9)}` : `INV-${p.prefix}-${poNum.slice(-8)}`;
  const x = r();
  const err810 = x < 0.004 ? ERR.it104 : x < 0.006 ? ERR.poNotFound : x < 0.0075 ? ERR.dupInv : x < 0.009 ? ERR.price : p.map810 && incidentAt(p.id, "MAP_REGRESSION", t810) && r() < 0.6 ? mapRegErr("810", MAP_NAME[p.map810]) : undefined;
  inbound(t810, ed ? "INVOIC" : "810", { invoiceNumber: invNo, poNumber: r() < 0.002 ? `45${pad(Math.floor(r() * 9999), 8)}` : poNum, shipToGLN: store.gln }, err810, p.map810);
}

function gen3plOrder(g: Gen, p: Profile, t: number, k: number) {
  const r = g.r;
  const order = `WSO-${pad(g.day - BASE_DAY, 4)}${pad(k, 3)}`;
  const store = pick(r, storesOpen(dayOf(t)));
  const o = emit(g, { t, p: p.id, dir: "OUTBOUND", doc: "940", refs: { shippingOrder: order, poNumber: `45${pad(g.day - BASE_DAY, 4)}9${pad(k, 3)}`, shipToGLN: store.gln }, mapId: "M-1011", err: deliveryErr(p, t) });
  if (o._err) return;
  if (!incidentAt(p.id, "ACK_OUTAGE", t)) ack(g, o, 0.3 + r());
  const ts = t + hours(16 + r() * 26);
  const short = r() < 0.03;
  const shipment = `SH-CRL-${order.slice(-7)}`;
  const adv = emit(g, { t: ts, p: p.id, dir: "INBOUND", doc: "945", mapId: "M-1009", refs: { shippingOrder: order, shipmentId: shipment, poNumber: o.refs.poNumber, quantityOrdered: 24, quantityShipped: short ? 12 + Math.floor(r() * 10) : 24, ...(short ? { reason: "Short shipped: units backordered (W1215)" } : {}) } });
  ack(g, adv, 0.1 + r() * 0.3);
  let tt = ts;
  for (const code of ["AF", "X6", "X1", "D1"]) {
    tt += hours(3 + r() * 14);
    const c = code === "X1" && r() < 0.05 ? "SD" : code === "X6" && r() < 0.006 ? "A9" : code;
    emit(g, { t: tt, p: p.id, dir: "INBOUND", doc: "214", mapId: "M-1010", refs: { shipmentId: shipment, statusCode: c, ...(c === "SD" ? { reason: "Delayed (AT702=AJ)" } : {}) }, err: c === "A9" ? ERR.carrier : undefined });
  }
}

function volume(p: Profile, day: number, r: () => number) {
  const live = anchorDay(p.goLive);
  if (day < live) return 0;
  if (p.quietFrom != null && day >= anchorDay(p.quietFrom)) return 0;
  const ramp = Math.min(1, 0.3 + ((day - live) / 21) * 0.7);
  const t = day * DAY + 12 * HOUR;
  const mean = p.orders * season(t) * weekday(t) * ramp * (0.85 + r() * 0.3);
  return Math.floor(mean + r());
}

export function generateDay(day: number): Tx[] {
  const g: Gen = { day, seq: 0, out: [], r: rng(hash("day", day)) };
  const r = g.r;
  let orderSeq = 0; // order numbers are unique per day across partners
  for (const p of PROFILES) {
    const n = volume(p, day, r);
    for (let k = 0; k < n; k++) {
      if (p.flow === "3PL") gen3plOrder(g, p, at(day, 11, 22, r), orderSeq++);
      else genSupplierOrder(g, p, at(day, 10, 16, r), orderSeq++);
    }
    const t = day * DAY;
    const wd = new Date(t).getUTCDay();
    const live = anchorDay(p.goLive) <= day && !(p.quietFrom != null && day >= anchorDay(p.quietFrom));
    // Onboarding: test exchanges in the 21 days before go-live
    if (!live && day >= anchorDay(p.goLive) - 21 && day < anchorDay(p.goLive) && wd >= 1 && wd <= 5 && r() < 0.6) {
      const tt = at(day, 13, 21, r);
      emit(g, { t: tt, p: p.id, dir: "OUTBOUND", doc: "850", env: "TEST", refs: { poNumber: `TEST-${pad(day % 10000, 4)}` }, mapId: "M-1003" });
      emit(g, { t: tt + hours(2 + r() * 20), p: p.id, dir: "INBOUND", doc: r() < 0.5 ? "856" : "810", env: "TEST", refs: { poNumber: `TEST-${pad(day % 10000, 4)}`, invoiceNumber: `INV-${p.prefix}-T${pad(day % 1000, 3)}`, shipmentId: `SH-${p.prefix}-T${pad(day % 1000, 3)}` }, err: r() < 0.3 ? ERR.ref : undefined });
    }
    if (!live || p.flow === "3PL" || p.flow === "WEB_EDI" || p.flow === "EDIFACT_SUPPLIER") continue;
    // Weekly remittance (820) on Thursdays
    if (wd === 4) { const tt = at(day, 15, 18, r); const o = emit(g, { t: tt, p: p.id, dir: "OUTBOUND", doc: "820", refs: { traceNumber: `TRN-${p.prefix}-${pad(day % 100000, 5)}`, amount: Math.round((4000 + r() * 30000) * 100) / 100 }, err: deliveryErr(p, tt) }); if (!o._err && !incidentAt(p.id, "ACK_OUTAGE", tt)) ack(g, o, 1 + r() * 2); }
    // Chargebacks (812) on the last business day of the month
    if (isMonthEnd(t) && lastDayOfMonth(t) - new Date(t).getUTCDate() === 0 && r() < 0.35) { const tt = at(day, 14, 20, r); const o = emit(g, { t: tt, p: p.id, dir: "OUTBOUND", doc: "812", mapId: "M-1012", refs: { adjustmentNumber: `CB-${p.prefix}-${pad(day % 10000, 4)}`, invoiceNumber: `INV-${p.prefix}-${pad(Math.floor(r() * 999999), 6)}`, amount: Math.round((60 + r() * 400) * 100) / 100, reason: pick(r, ["ASN received after goods receipt (H2 code 06)", "ASN missing for receipt (H2 code 04)", "Label noncompliance (H2 code 11)"]) }, err: deliveryErr(p, tt) }); if (!o._err) ack(g, o, 1); }
    // Daily inventory (846) from selected suppliers
    if ((p.id === "C20008" || p.id === "C20023") && wd >= 1 && wd <= 5) { const tt = at(day, 8, 10, r); emit(g, { t: tt, p: p.id, dir: "INBOUND", doc: "846", refs: { poNumber: `INV-RPT-${p.prefix}-${pad(day % 10000, 4)}` } }); }
  }
  return g.out;
}

// ---------------------------------------------------------------- lookup indexes (maintained on release and prune)
const ackIdx = new Map<string, Tx>();
const poIdx = new Map<string, Tx[]>();
const keyIdx = new Map<string, Tx[]>();
function indexAdd(t: Tx) {
  if (t.refs.ackForTransactionId) ackIdx.set(t.refs.ackForTransactionId, t);
  if (t.refs.poNumber) { const a = poIdx.get(t.refs.poNumber); if (a) a.push(t); else poIdx.set(t.refs.poNumber, [t]); }
  for (const v of [t.refs.shipmentId, t.refs.invoiceNumber, t.refs.shippingOrder, t.refs.adjustmentNumber, t.refs.traceNumber, t.refs.poNumber]) {
    if (!v) continue; const k = v.toUpperCase(); const a = keyIdx.get(k); if (a) { if (a[a.length - 1] !== t) a.push(t); } else keyIdx.set(k, [t]);
  }
}
function indexRemove(t: Tx) {
  if (t.refs.ackForTransactionId && ackIdx.get(t.refs.ackForTransactionId) === t) ackIdx.delete(t.refs.ackForTransactionId);
  const drop = (m: Map<string, Tx[]>, k?: string) => { if (!k) return; const a = m.get(k); if (!a) return; const n = a.filter((x) => x !== t); if (n.length) m.set(k, n); else m.delete(k); };
  drop(poIdx, t.refs.poNumber);
  for (const v of [t.refs.shipmentId, t.refs.invoiceNumber, t.refs.shippingOrder, t.refs.adjustmentNumber, t.refs.traceNumber, t.refs.poNumber]) drop(keyIdx, v?.toUpperCase());
}
/** Acknowledgment (997 or CONTRL) observed for a transaction. */
export const ackOf = (id: string) => ackIdx.get(id);
/** Visible transactions carrying a PO number, oldest first. */
export const docsByPo = (po: string) => poIdx.get(po) ?? [];
/** Visible transactions carrying a business key value (shipment, invoice, order, adjustment, trace or PO number). */
export const docsByKey = (v: string) => keyIdx.get(String(v).toUpperCase()) ?? [];

// ---------------------------------------------------------------- store and release
/** Visible transactions, newest first. */
export const transactions: Tx[] = [];
const pending: Tx[] = [];
const byId = new Map<string, Tx>();
let horizonDay = 0;
let currentDay = 0;
const listeners: (() => void)[] = [];
export const onWorldDay = (f: () => void) => listeners.push(f);

function build() {
  const now = Date.now();
  const today = dayOf(now);
  const all: Tx[] = [];
  for (let d = today - HISTORY_DAYS - 4; d <= today + AHEAD_DAYS; d++) for (const t of generateDay(d)) all.push(t);
  const minT = now - HISTORY_DAYS * DAY;
  for (const t of all) { if (t._t < minT) continue; if (t._t <= now) transactions.push(t); else pending.push(t); }
  transactions.sort((a, b) => b._t - a._t);
  pending.sort((a, b) => a._t - b._t);
  for (let i = transactions.length - 1; i >= 0; i--) { byId.set(transactions[i].transactionId, transactions[i]); indexAdd(transactions[i]); }
  horizonDay = today + AHEAD_DAYS;
  currentDay = today;
}
build();

/** Releases transactions whose time has come and rolls the generation horizon forward each day. */
export function tick(now = Date.now()) {
  const released: Tx[] = [];
  while (pending.length && pending[0]._t <= now) released.push(pending.shift()!);
  if (released.length) { for (const t of released) { byId.set(t.transactionId, t); indexAdd(t); } transactions.unshift(...released.reverse()); }
  const today = dayOf(now);
  if (today !== currentDay) {
    currentDay = today;
    while (horizonDay < today + AHEAD_DAYS) { horizonDay += 1; for (const t of generateDay(horizonDay)) if (t._t > now) pending.push(t); }
    pending.sort((a, b) => a._t - b._t);
    const minT = now - HISTORY_DAYS * DAY;
    while (transactions.length && transactions[transactions.length - 1]._t < minT) { const t = transactions.pop()!; byId.delete(t.transactionId); indexRemove(t); }
    for (const f of listeners) f();
  }
  return released.length;
}
setInterval(() => tick(), 30_000).unref();

export const txById = (id: string) => byId.get(id);
export const worldStats = () => ({ visible: transactions.length, pending: pending.length, nextArrival: pending[0] ? new Date(pending[0]._t).toISOString() : null, horizon: new Date((horizonDay + 1) * DAY).toISOString() });
