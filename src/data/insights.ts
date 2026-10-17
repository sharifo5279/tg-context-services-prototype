// Trading Grid Insights fixtures: observed transaction activity.
// Shapes are modeled on the TG Insights getTransactions contract described in the incubation brief.
// Generated deterministically relative to server start so the demo always shows recent activity.
import { NOW, ms, rng, pad } from "../util.js";
import { HUB_ID, companyById } from "./cms.js";

export const STORES: Record<string, { gln: string; name: string }> = {
  "0101": { gln: "0614141001019", name: "Store 0101 Charlotte" },
  "0214": { gln: "0614141002146", name: "Store 0214 Raleigh" },
  "0388": { gln: "0614141003884", name: "Store 0388 Atlanta" },
  "0519": { gln: "0614141005192", name: "Store 0519 Nashville" },
  "0601": { gln: "0614141006014", name: "Store 0601 Richmond" },
  "0412": { gln: "0614141000418", name: "DC 0412 Greensboro (opened recently)" },
};

export type Tx = {
  transactionId: string;
  senderTransactionId: string;
  correlationId: string;
  environment: "PRODUCTION" | "TEST";
  receivedAt: string;
  lastModified: string;
  direction: "OUTBOUND" | "INBOUND";
  partnerCompanyId: string;
  sender: { companyId: string; companyName: string; tradingAddress: string; orgId: string };
  receiver: { companyId: string; companyName: string; tradingAddress: string; orgId: string };
  standard: "X12" | "EDIFACT";
  version: string;
  documentType: string;
  ediType: string;
  transactionLevel: "DOCUMENT";
  fileId: string;
  documentCount: number;
  sizeBytes: number;
  controlNumbers: Record<string, string>;
  keys: { primary?: { name: string; value: string }; secondary?: { name: string; value: string }; tertiary?: { name: string; value: string } };
  refs: { poNumber?: string; shipmentId?: string; invoiceNumber?: string; shipToGLN?: string; ackForTransactionId?: string; ackForControlNumber?: string; storeNumber?: string; shippingOrder?: string; statusCode?: string; adjustmentNumber?: string; traceNumber?: string; quantityOrdered?: number; quantityShipped?: number; amount?: number; reason?: string; channel?: string };
  sourceStatus: "DLVD" | "FAIL" | "INPR" | "RCVD";
  statusHistory: { step: string; status: string; at: string }[];
  errors: { code: string; category: string; message: string; service: string; step: string }[];
  ack?: { status: string; code: string; detail?: string };
  mapId?: string;
  payloadVariants: string[];
  _t: number; // epoch ms, internal
};

export const STATUS_TEXT: Record<string, string> = {
  DLVD: "Delivered to receiver",
  FAIL: "Processing failed; not delivered",
  INPR: "In process; not yet delivered",
  RCVD: "Received; processing not started",
};

export const transactions: Tx[] = [];
const byId = new Map<string, Tx>();

const isa = new Map<string, number>();
const nextIsa = (sender: string) => {
  const n = (isa.get(sender) ?? 4200) + 1;
  isa.set(sender, n);
  return n;
};

let txSeq = 0;
const R = rng(20261016);

const addrOf: Record<string, string> = {
  [HUB_ID]: "ZZ:HARBORVIEWUS",
  C20001: "ZZ:NORTHFIELDFD", C20002: "ZZ:NFFARMS", C20003: "ZZ:COASTLINEAPP", C20004: "ZZ:BRIGHTWELLHG", C20005: "ZZ:PINEGATEHOME",
  C20006: "14:8712345000011", C20007: "12:3035550147", C20008: "ZZ:ATLASTOY", C20009: "ZZ:MERIDIANPC", C20010: "02:RDLN", C20013: "ZZ:CRESTLINE3PL", C20014: "ZZ:MAPLERIDGEWEB",
};

const party = (id: string, addrOverride?: string) => {
  const c = companyById(id)!;
  return { companyId: id, companyName: c.companyName, tradingAddress: addrOverride ?? addrOf[id], orgId: c.orgId };
};

const STEPS = ["Receive", "Check", "Transform", "Route", "Deliver"];

type Make = {
  hoursAgo: number;
  partner: string;
  dir: "OUTBOUND" | "INBOUND";
  doc: string;
  std?: "X12" | "EDIFACT";
  refs?: Tx["refs"];
  status?: Tx["sourceStatus"];
  failStep?: string;
  error?: Omit<Tx["errors"][number], "step">;
  ack?: Tx["ack"];
  mapId?: string;
  env?: "PRODUCTION" | "TEST";
  hubAddr?: string;
  lastModifiedHoursAgo?: number;
};

const KEYS: Record<string, (r: Tx["refs"]) => Tx["keys"]> = {
  "850": (r) => ({ primary: { name: "PO number (BEG03)", value: r.poNumber! }, secondary: r.shipToGLN ? { name: "Ship-to GLN (N104, N103=UL)", value: r.shipToGLN } : undefined }),
  "855": (r) => ({ primary: { name: "PO number (BAK03)", value: r.poNumber! } }),
  "856": (r) => ({ primary: { name: "Shipment ID (BSN02)", value: r.shipmentId! }, secondary: { name: "PO number (PRF01)", value: r.poNumber! }, tertiary: r.shipToGLN ? { name: "Ship-to GLN (N104, N103=UL)", value: r.shipToGLN } : undefined }),
  "810": (r) => ({ primary: { name: "Invoice number (BIG02)", value: r.invoiceNumber! }, secondary: { name: "PO number (BIG04)", value: r.poNumber! }, tertiary: r.shipToGLN ? { name: "Ship-to GLN (N104, N103=UL)", value: r.shipToGLN } : undefined }),
  "997": (r) => ({ primary: { name: "Acknowledged group control number (AK102)", value: r.ackForControlNumber! } }),
  "214": (r) => ({ primary: { name: "Shipment ID (B1003)", value: r.shipmentId! }, secondary: r.statusCode ? { name: "Status code (AT701)", value: r.statusCode } : undefined }),
  "846": (r) => ({ primary: { name: "Inventory report number (BIA03)", value: r.poNumber! } }),
  "812": (r) => ({ primary: { name: "Adjustment number (BCD02)", value: r.adjustmentNumber! }, secondary: r.invoiceNumber ? { name: "Invoice number (BCD10)", value: r.invoiceNumber } : undefined }),
  "820": (r) => ({ primary: { name: "Trace number (TRN02)", value: r.traceNumber! }, secondary: r.invoiceNumber ? { name: "Invoice number (RMR02)", value: r.invoiceNumber } : undefined }),
  "940": (r) => ({ primary: { name: "Shipping order number (W0502)", value: r.shippingOrder! }, secondary: { name: "PO number (W0503)", value: r.poNumber! } }),
  "945": (r) => ({ primary: { name: "Shipping order number (W0602)", value: r.shippingOrder! }, secondary: { name: "Shipment ID (W0603)", value: r.shipmentId! } }),
  ORDERS: (r) => ({ primary: { name: "Order number (BGM 1004)", value: r.poNumber! } }),
  DESADV: (r) => ({ primary: { name: "Despatch advice number (BGM 1004)", value: r.shipmentId! }, secondary: { name: "Order number (RFF+ON)", value: r.poNumber! } }),
  INVOIC: (r) => ({ primary: { name: "Invoice number (BGM 1004)", value: r.invoiceNumber! }, secondary: { name: "Order number (RFF+ON)", value: r.poNumber! } }),
  CONTRL: (r) => ({ primary: { name: "Acknowledged interchange reference (UCI 0020)", value: r.ackForControlNumber! } }),
};

export function makeTx(m: Make): Tx {
  const t = NOW - m.hoursAgo * ms.HOUR;
  const std = m.std ?? (["ORDERS", "DESADV", "INVOIC", "CONTRL"].includes(m.doc) ? "EDIFACT" : "X12");
  const hubA = m.hubAddr ?? (std === "EDIFACT" ? "14:0614141000012" : "ZZ:HARBORVIEWUS");
  const sender = m.dir === "OUTBOUND" ? party(HUB_ID, hubA) : party(m.partner);
  const receiver = m.dir === "OUTBOUND" ? party(m.partner) : party(HUB_ID, hubA);
  const n = nextIsa(sender.tradingAddress);
  txSeq += 1;
  const id = `TGT${pad(7000000 + txSeq, 9)}`;
  const status = m.status ?? "DLVD";
  const refs = { ...(m.refs ?? {}) };
  const failIdx = m.failStep ? STEPS.indexOf(m.failStep) : -1;
  const lastIdx = status === "DLVD" ? 4 : status === "FAIL" ? failIdx : status === "INPR" ? 2 : 0;
  const history = STEPS.slice(0, lastIdx + 1).map((step, i) => ({
    step,
    status: status === "FAIL" && i === lastIdx ? "FAILED" : status === "INPR" && i === lastIdx ? "IN_PROCESS" : "COMPLETED",
    at: new Date(t + i * 40_000).toISOString(),
  }));
  const ctrl: Record<string, string> =
    std === "X12"
      ? { isa13: pad(n, 9), gs06: String(n), st02: "0001" }
      : { unb0020: `HRG${pad(n, 8)}`, unh0062: "1" };
  const tx: Tx = {
    transactionId: id,
    senderTransactionId: `${sender.tradingAddress.split(":")[1].slice(0, 4)}-${pad(n, 7)}`,
    correlationId: `COR-${pad(7000000 + txSeq, 9)}`,
    environment: m.env ?? "PRODUCTION",
    receivedAt: new Date(t).toISOString(),
    lastModified: new Date(m.lastModifiedHoursAgo != null ? NOW - m.lastModifiedHoursAgo * ms.HOUR : t + (lastIdx + 1) * 40_000).toISOString(),
    direction: m.dir,
    partnerCompanyId: m.partner,
    sender,
    receiver,
    standard: std,
    version: std === "X12" ? "004010" : "D96A",
    documentType: m.doc,
    ediType: `${std} ${m.doc}`,
    transactionLevel: "DOCUMENT",
    fileId: `F${pad(5000000 + txSeq, 9)}`,
    documentCount: 1,
    sizeBytes: 900 + Math.floor(R() * 6000),
    controlNumbers: ctrl,
    keys: (KEYS[m.doc] ?? (() => ({})))(refs),
    refs,
    sourceStatus: status,
    statusHistory: history,
    errors: m.error ? [{ ...m.error, step: m.failStep ?? "Check" }] : [],
    ack: m.ack,
    mapId: m.mapId,
    payloadVariants: m.doc === "997" || m.doc === "CONTRL" ? ["ORIGINAL"] : status === "DLVD" ? ["ORIGINAL", "TRANSLATED"] : ["ORIGINAL"],
    _t: t,
  };
  Object.keys(tx.keys).forEach((k) => (tx.keys as any)[k] === undefined && delete (tx.keys as any)[k]);
  transactions.push(tx);
  byId.set(id, tx);
  return tx;
}

function ackFor(orig: Tx, hoursAfter: number, status = "ACCEPTED", detail?: string) {
  const isEdifact = orig.standard === "EDIFACT";
  const h = (NOW - orig._t) / ms.HOUR - hoursAfter;
  if (h < 0) return null;
  const a = makeTx({
    hoursAgo: h,
    partner: orig.partnerCompanyId,
    dir: orig.direction === "OUTBOUND" ? "INBOUND" : "OUTBOUND",
    doc: isEdifact ? "CONTRL" : "997",
    refs: { ackForTransactionId: orig.transactionId, ackForControlNumber: isEdifact ? orig.controlNumbers.unb0020 : orig.controlNumbers.gs06 },
    ack: { status, code: isEdifact ? (status === "ACCEPTED" ? "UCI 0083=7" : "UCI 0083=4") : status === "ACCEPTED" ? "AK501=A" : status === "REJECTED" ? "AK501=R" : "AK501=E", detail },
    hubAddr: orig.direction === "OUTBOUND" ? orig.sender.tradingAddress : orig.receiver.tradingAddress,
    env: orig.environment,
  });
  return a;
}

// ---- Background traffic ---------------------------------------------------------------------------

type P = { id: string; perDay: number; recentPerDay?: number; days: number; stopHoursAgo?: number; docs: string[]; std?: "X12" | "EDIFACT"; ackOutageSinceH?: number; prefix: string; inMap?: string };

const PARTNERS: P[] = [
  { id: "C20001", perDay: 1.6, days: 280, docs: ["855", "856", "810"], prefix: "NF", inMap: "M-1002" },
  { id: "C20002", perDay: 0.5, days: 280, docs: ["856", "810"], prefix: "NFR" },
  { id: "C20003", perDay: 1.2, recentPerDay: 1.8, days: 280, docs: ["855", "856", "810"], prefix: "CST", inMap: "M-1005" },
  { id: "C20004", perDay: 1.3, days: 280, docs: ["855", "856", "810"], prefix: "BW", inMap: "M-1001" },
  { id: "C20006", perDay: 0.5, days: 280, docs: ["DESADV", "INVOIC"], std: "EDIFACT", prefix: "HOL" },
  { id: "C20007", perDay: 1.0, days: 280, docs: ["855", "856", "810"], ackOutageSinceH: 32, prefix: "SMB", inMap: "M-1008" },
  { id: "C20008", perDay: 1.1, days: 280, stopHoursAgo: 216, docs: ["855", "856", "810", "846"], prefix: "ATL" },
  { id: "C20009", perDay: 0.9, days: 280, docs: ["855", "856", "810"], prefix: "MPC" },
  { id: "C20014", perDay: 0.25, days: 150, docs: ["856", "810"], prefix: "MRC" },
];

const storeKeys = ["0101", "0214", "0388", "0519", "0601"];
let poSeq = 4500100000;
const ERR_IN = [
  { code: "X12-SYN-022", category: "VALIDATION", message: "Segment REF has an invalid qualifier in REF01", service: "EDI validation" },
  { code: "MAP-TRN-118", category: "TRANSLATION", message: "Mandatory target field Item/UnitPrice has no source value", service: "Translation" },
  { code: "BUS-RULE-07", category: "BUSINESS_RULE", message: "Referenced PO number not found in hub order reference", service: "Business rules" },
];

for (const p of PARTNERS) {
  for (let day = p.days; day >= 0; day--) {
    const rate = p.recentPerDay && day <= 30 ? p.recentPerDay : p.perDay;
    const count = Math.floor(rate + R());
    for (let k = 0; k < count; k++) {
      const h = day * 24 + 6 + R() * 14;
      if (p.stopHoursAgo && h < p.stopHoursAgo) continue;
      if (h < 2) continue;
      const po = String(poSeq++);
      const store = storeKeys[Math.floor(R() * storeKeys.length)];
      const gln = STORES[store].gln;
      const isEd = p.std === "EDIFACT";
      const ord = makeTx({ hoursAgo: h, partner: p.id, dir: "OUTBOUND", doc: isEd ? "ORDERS" : "850", refs: { poNumber: isEd ? `HRG-ORD-${po.slice(-5)}` : po, shipToGLN: gln }, mapId: isEd ? "M-1004" : "M-1003" });
      const outage = p.ackOutageSinceH && h < p.ackOutageSinceH;
      if (!outage) ackFor(ord, 0.6 + R());
      if (outage) continue;
      let off = 0;
      const ship = `SH-${p.prefix}-${po.slice(-5)}`;
      const inv = `INV-${p.prefix}-${po.slice(-5)}`;
      for (const d of p.docs) {
        off += d === "855" || d === "846" ? 4 + R() * 6 : 30 + R() * 30;
        const hh = h - off;
        if (hh < 0.5 || (p.stopHoursAgo && hh < p.stopHoursAgo)) break;
        const fail = R() < 0.012;
        const refs: Tx["refs"] =
          d === "855" ? { poNumber: po } :
          d === "856" || d === "DESADV" ? { shipmentId: isEd ? `DES-${po.slice(-5)}` : ship, poNumber: isEd ? ord.refs.poNumber : po, shipToGLN: gln } :
          d === "810" || d === "INVOIC" ? { invoiceNumber: isEd ? `HOLINV-${po.slice(-5)}` : inv, poNumber: isEd ? ord.refs.poNumber : po, shipToGLN: gln } :
          { poNumber: po };
        const e = ERR_IN[Math.floor(R() * ERR_IN.length)];
        const tx = makeTx({
          hoursAgo: hh, partner: p.id, dir: "INBOUND", doc: d, refs,
          status: fail ? "FAIL" : "DLVD", failStep: fail ? (e.category === "VALIDATION" ? "Check" : "Transform") : undefined, error: fail ? e : undefined,
          mapId: d === "856" && p.inMap === "M-1001" ? "M-1001" : d === "810" && p.inMap === "M-1002" ? "M-1002" : d === "856" && p.inMap === "M-1005" ? "M-1005" : d === "855" && p.inMap === "M-1008" ? "M-1008" : undefined,
        });
        if (d !== "846") ackFor(tx, 0.2 + R() * 0.3, fail && e.category === "VALIDATION" ? "REJECTED" : "ACCEPTED");
      }
    }
  }
}

// Crestline Logistics (3PL): 940 shipping orders out, 945 shipping advice and 214 shipment status in
const CARRIER_CODES = ["AF", "X6", "X1", "D1"];
let wso = 30000;
for (let day = 400; day >= 0; day--) {
  const count = Math.floor(1.3 + R());
  for (let k = 0; k < count; k++) {
    const h = day * 24 + 4 + R() * 12;
    if (h < 2) continue;
    const order = `WSO-${wso++}`;
    const po = String(poSeq++);
    const o = makeTx({ hoursAgo: h, partner: "C20013", dir: "OUTBOUND", doc: "940", refs: { shippingOrder: order, poNumber: po, shipToGLN: STORES[storeKeys[k % storeKeys.length]].gln }, mapId: "M-1011" });
    ackFor(o, 0.4 + R());
    const shipH = h - (18 + R() * 20);
    if (shipH < 0.5) continue;
    const shipment = `SH-CRL-${order.slice(-5)}`;
    const adv = makeTx({ hoursAgo: shipH, partner: "C20013", dir: "INBOUND", doc: "945", refs: { shippingOrder: order, shipmentId: shipment, poNumber: po, quantityOrdered: 24, quantityShipped: 24 }, mapId: "M-1009" });
    ackFor(adv, 0.2);
    let sh = shipH;
    for (const code of CARRIER_CODES) {
      sh -= 3 + R() * 10;
      if (sh < 0.5) break;
      makeTx({ hoursAgo: sh, partner: "C20013", dir: "INBOUND", doc: "214", refs: { shipmentId: shipment, statusCode: code }, mapId: "M-1010" });
    }
  }
}

// ---- Scripted scenarios ---------------------------------------------------------------------------

// Northfield Foods: complete PO lifecycle (UC21)
{
  const o = makeTx({ hoursAgo: 150, partner: "C20001", dir: "OUTBOUND", doc: "850", refs: { poNumber: "4500018832", shipToGLN: STORES["0388"].gln }, mapId: "M-1003" });
  ackFor(o, 1);
  const a = makeTx({ hoursAgo: 140, partner: "C20001", dir: "INBOUND", doc: "855", refs: { poNumber: "4500018832" } }); ackFor(a, 0.2);
  const s = makeTx({ hoursAgo: 100, partner: "C20001", dir: "INBOUND", doc: "856", refs: { shipmentId: "SH-NF-55021", poNumber: "4500018832", shipToGLN: STORES["0388"].gln } }); ackFor(s, 0.2);
  const i = makeTx({ hoursAgo: 52, partner: "C20001", dir: "INBOUND", doc: "810", refs: { invoiceNumber: "INV-NF-88310", poNumber: "4500018832", shipToGLN: STORES["0388"].gln }, mapId: "M-1002" }); ackFor(i, 0.2);
}

// Northfield Foods: failed 810s (UC7, UC27)
const nfFail = (h: number, inv: string, po: string, e: any, step: string) => {
  const t = makeTx({ hoursAgo: h, partner: "C20001", dir: "INBOUND", doc: "810", refs: { invoiceNumber: inv, poNumber: po, shipToGLN: STORES["0101"].gln }, status: "FAIL", failStep: step, error: e, mapId: "M-1002" });
  ackFor(t, 0.2, e.category === "VALIDATION" ? "REJECTED" : "ACCEPTED");
};
const IT104 = { code: "X12-SYN-104", category: "VALIDATION", message: "IT104 unit price is not a valid decimal (value '12,40')", service: "EDI validation" };
nfFail(30, "INV-NF-88401", "4500019801", IT104, "Check");
nfFail(60, "INV-NF-88415", "4500019901", { code: "BUS-RULE-07", category: "BUSINESS_RULE", message: "BIG04 PO 4500019901 not found in hub order reference (rule HRG-810-07)", service: "Business rules" }, "Transform");
nfFail(100, "INV-NF-88433", "4500019840", { code: "BUS-RULE-12", category: "BUSINESS_RULE", message: "BIG02 duplicates invoice INV-NF-88410 received within 30 days (rule HRG-810-12)", service: "Business rules" }, "Transform");
nfFail(210, "INV-NF-88290", "4500019620", IT104, "Check");
nfFail(390, "INV-NF-88177", "4500019511", IT104, "Check");
nfFail(520, "INV-NF-88102", "4500019455", { code: "MAP-TRN-118", category: "TRANSLATION", message: "Mandatory target field Item/UnitPrice has no source value", service: "Translation" }, "Transform");

// Brightwell: duplicate ASN SH-77120 (UC24, UC31) and failed ASN SH-77155 (UC6, UC32)
{
  const o = makeTx({ hoursAgo: 120, partner: "C20004", dir: "OUTBOUND", doc: "850", refs: { poNumber: "4500019120", shipToGLN: STORES["0214"].gln }, mapId: "M-1003" }); ackFor(o, 0.8);
  const s1 = makeTx({ hoursAgo: 50, partner: "C20004", dir: "INBOUND", doc: "856", refs: { shipmentId: "SH-77120", poNumber: "4500019120", shipToGLN: STORES["0214"].gln }, mapId: "M-1001" }); ackFor(s1, 0.1);
  const s2 = makeTx({ hoursAgo: 49.3, partner: "C20004", dir: "INBOUND", doc: "856", refs: { shipmentId: "SH-77120", poNumber: "4500019120", shipToGLN: STORES["0214"].gln }, mapId: "M-1001" }); ackFor(s2, 0.1);
  const o2 = makeTx({ hoursAgo: 96, partner: "C20004", dir: "OUTBOUND", doc: "850", refs: { poNumber: "4500019188", shipToGLN: STORES["0412"].gln }, mapId: "M-1003" }); ackFor(o2, 0.7);
  const f = makeTx({
    hoursAgo: 22, partner: "C20004", dir: "INBOUND", doc: "856", refs: { shipmentId: "SH-77155", poNumber: "4500019188", storeNumber: "0412" },
    status: "FAIL", failStep: "Transform", mapId: "M-1001",
    error: { code: "XREF-404", category: "TRANSLATION", message: "Cross-reference lookup failed: entity STORE_TO_GLN, key '0412' not found (map BWHG_856_4010_IN v7, N1*ST N104 qualifier 92)", service: "Translation" },
  });
  ackFor(f, 0.1, "ACCEPTED");
}

// Summit Beverage: POs to DC 0412 with no 997 (UC8, UC22, UC38) and POs with no 855 (UC33)
{
  for (const [h, po] of [[30, "4500019301"], [28, "4500019302"], [26.5, "4500019303"]] as [number, string][]) {
    makeTx({ hoursAgo: h, partner: "C20007", dir: "OUTBOUND", doc: "850", refs: { poNumber: po, shipToGLN: STORES["0412"].gln }, mapId: "M-1003" });
  }
  for (const [h, po] of [[60, "4500019250"], [75, "4500019251"]] as [number, string][]) {
    const o = makeTx({ hoursAgo: h, partner: "C20007", dir: "OUTBOUND", doc: "850", refs: { poNumber: po, shipToGLN: STORES["0519"].gln }, mapId: "M-1003" });
    ackFor(o, 0.9);
  }
}

// Meridian: rejected 997s (UC23) and invoice before ASN (UC34)
{
  const r1 = makeTx({ hoursAgo: 70, partner: "C20009", dir: "OUTBOUND", doc: "850", refs: { poNumber: "4500019401", shipToGLN: STORES["0601"].gln }, mapId: "M-1003" });
  ackFor(r1, 0.5, "REJECTED", "AK3*DTM*4 / AK4*2*374*7: DTM02 date 20261332 invalid");
  const r2 = makeTx({ hoursAgo: 40, partner: "C20009", dir: "OUTBOUND", doc: "850", refs: { poNumber: "4500019402", shipToGLN: STORES["0601"].gln }, mapId: "M-1003" });
  ackFor(r2, 0.5, "REJECTED", "AK3*N1*9 / AK4*4*67*1: N104 mandatory element missing");
  const o = makeTx({ hoursAgo: 110, partner: "C20009", dir: "OUTBOUND", doc: "850", refs: { poNumber: "4500019380", shipToGLN: STORES["0101"].gln }, mapId: "M-1003" }); ackFor(o, 0.6);
  const inv = makeTx({ hoursAgo: 30, partner: "C20009", dir: "INBOUND", doc: "810", refs: { invoiceNumber: "INV-MPC-4410", poNumber: "4500019380", shipToGLN: STORES["0101"].gln } }); ackFor(inv, 0.2);
  const asn = makeTx({ hoursAgo: 27, partner: "C20009", dir: "INBOUND", doc: "856", refs: { shipmentId: "SH-MPC-2210", poNumber: "4500019380", shipToGLN: STORES["0101"].gln } }); ackFor(asn, 0.2);
}

// Coastline: invoice lookup (UC25), orphan invoice (UC39), long-running processing (UC26)
{
  const o = makeTx({ hoursAgo: 160, partner: "C20003", dir: "OUTBOUND", doc: "850", refs: { poNumber: "4500019555", shipToGLN: STORES["0388"].gln }, mapId: "M-1003" }); ackFor(o, 1.2);
  const i = makeTx({ hoursAgo: 75, partner: "C20003", dir: "INBOUND", doc: "810", refs: { invoiceNumber: "INV-99812", poNumber: "4500019555", shipToGLN: STORES["0388"].gln } }); ackFor(i, 0.3);
  const orphan = makeTx({ hoursAgo: 45, partner: "C20003", dir: "INBOUND", doc: "810", refs: { invoiceNumber: "INV-99877", poNumber: "4500017999", shipToGLN: STORES["0214"].gln } }); ackFor(orphan, 0.3);
  makeTx({ hoursAgo: 9, partner: "C20003", dir: "INBOUND", doc: "856", refs: { shipmentId: "SH-CST-9921", poNumber: "4500019555", shipToGLN: STORES["0388"].gln }, status: "INPR", lastModifiedHoursAgo: 8.8, mapId: "M-1005" });
  makeTx({ hoursAgo: 7.5, partner: "C20002", dir: "INBOUND", doc: "810", refs: { invoiceNumber: "INV-NFR-3301", poNumber: "4500019610", shipToGLN: STORES["0101"].gln }, status: "INPR", lastModifiedHoursAgo: 7.4 });
}

// Hollanda: CONTRL evidence (UC35)
{
  const o1 = makeTx({ hoursAgo: 90, partner: "C20006", dir: "OUTBOUND", doc: "ORDERS", refs: { poNumber: "HRG-ORD-77001", shipToGLN: STORES["0412"].gln }, mapId: "M-1004" }); ackFor(o1, 1.5);
  const o2 = makeTx({ hoursAgo: 50, partner: "C20006", dir: "OUTBOUND", doc: "ORDERS", refs: { poNumber: "HRG-ORD-77002", shipToGLN: STORES["0412"].gln }, mapId: "M-1004" }); ackFor(o2, 1.5, "REJECTED", "UCM 0083=4, error code 12: invalid value in NAD+DP party identification");
  makeTx({ hoursAgo: 30, partner: "C20006", dir: "OUTBOUND", doc: "ORDERS", refs: { poNumber: "HRG-ORD-77003", shipToGLN: STORES["0388"].gln }, mapId: "M-1004" });
}

// Pinegate: first exchanges in production and test (UC12, UC30)
{
  const o = makeTx({ hoursAgo: 40, partner: "C20005", dir: "OUTBOUND", doc: "850", refs: { poNumber: "4500019700", shipToGLN: STORES["0101"].gln }, mapId: "M-1003" }); ackFor(o, 1);
  const a = makeTx({ hoursAgo: 20, partner: "C20005", dir: "INBOUND", doc: "855", refs: { poNumber: "4500019700" } }); ackFor(a, 0.2);
  const t = makeTx({ hoursAgo: 30, partner: "C20005", dir: "INBOUND", doc: "810", refs: { invoiceNumber: "INV-PGH-0001", poNumber: "TEST-0001" }, env: "TEST", hubAddr: "ZZ:HARBORVIEWTST", mapId: "M-1006" }); ackFor(t, 0.2);
}

// Overnight exceptions (UC40) and endpoint outage for Atlas (UC29)
{
  makeTx({ hoursAgo: 4, partner: "C20008", dir: "OUTBOUND", doc: "850", refs: { poNumber: "4500019760", shipToGLN: STORES["0214"].gln }, status: "FAIL", failStep: "Deliver", mapId: "M-1003",
    error: { code: "AS2-MDN-504", category: "DELIVERY", message: "AS2 MDN not received: connection timed out to partner endpoint (host redacted) after 3 attempts", service: "Communications gateway" } });
  const f = makeTx({ hoursAgo: 5, partner: "C20002", dir: "INBOUND", doc: "810", refs: { invoiceNumber: "INV-NFR-3317", poNumber: "4500019611", shipToGLN: STORES["0519"].gln }, status: "FAIL", failStep: "Check",
    error: { code: "X12-SYN-022", category: "VALIDATION", message: "Segment REF has an invalid qualifier in REF01", service: "EDI validation" } });
  ackFor(f, 0.2, "REJECTED", "AK3*REF*6 / AK4*1*128*7");
  const n = makeTx({ hoursAgo: 10, partner: "C20001", dir: "OUTBOUND", doc: "850", refs: { poNumber: "4500019660", shipToGLN: STORES["0412"].gln }, mapId: "M-1003" }); ackFor(n, 0.7);
}

// Crestline: short shipment, late delivery, failed status code lookup, overdue shipping advice
{
  const o = makeTx({ hoursAgo: 70, partner: "C20013", dir: "OUTBOUND", doc: "940", refs: { shippingOrder: "WSO-30412", poNumber: "4500019905", shipToGLN: STORES["0214"].gln }, mapId: "M-1011" }); ackFor(o, 0.5);
  const a = makeTx({ hoursAgo: 44, partner: "C20013", dir: "INBOUND", doc: "945", refs: { shippingOrder: "WSO-30412", shipmentId: "SH-CRL-30412", poNumber: "4500019905", quantityOrdered: 24, quantityShipped: 18, reason: "Short shipped: 6 units backordered (W1215)" }, mapId: "M-1009" }); ackFor(a, 0.2);
  makeTx({ hoursAgo: 40, partner: "C20013", dir: "INBOUND", doc: "214", refs: { shipmentId: "SH-CRL-30412", statusCode: "AF" }, mapId: "M-1010" });
  makeTx({ hoursAgo: 12, partner: "C20013", dir: "INBOUND", doc: "214", refs: { shipmentId: "SH-CRL-30412", statusCode: "SD", reason: "Delayed: weather (AT702=AJ)" }, mapId: "M-1010" });
  const o2 = makeTx({ hoursAgo: 58, partner: "C20013", dir: "OUTBOUND", doc: "940", refs: { shippingOrder: "WSO-30420", poNumber: "4500019911", shipToGLN: STORES["0519"].gln }, mapId: "M-1011" }); ackFor(o2, 0.6);
  makeTx({ hoursAgo: 15, partner: "C20013", dir: "INBOUND", doc: "214", refs: { shipmentId: "SH-CRL-30399", statusCode: "A9" }, status: "FAIL", failStep: "Transform", mapId: "M-1010",
    error: { code: "XREF-404", category: "TRANSLATION", message: "Cross-reference lookup failed: entity CARRIER_STATUS_CODE, key 'A9' not found (map CRL_214_4010_IN v3, AT701)", service: "Translation" } });
}

// Northfield Foods: chargebacks (812) for ASN compliance
{
  const cb = (h: number, n: string, inv: string, amount: number, reason: string, status?: Tx["sourceStatus"]) => {
    const t = makeTx({ hoursAgo: h, partner: "C20001", dir: "OUTBOUND", doc: "812", refs: { adjustmentNumber: n, invoiceNumber: inv, amount, reason }, mapId: "M-1012", status });
    if (!status) ackFor(t, 0.8);
  };
  cb(2200, "CB-NF-2071", "INV-NF-87120", 180.0, "ASN received after goods receipt (H2 code 06)");
  cb(1460, "CB-NF-2133", "INV-NF-87655", 240.0, "ASN missing for receipt (H2 code 04)");
  cb(720, "CB-NF-2188", "INV-NF-88012", 95.5, "Label noncompliance (H2 code 11)");
  cb(36, "CB-NF-2210", "INV-NF-88310", 210.0, "ASN received after goods receipt (H2 code 06)");
}

// Coastline: weekly remittance (820), one rejected by the VAN interconnect
{
  for (let w = 1; w <= 20; w++) {
    const t = makeTx({ hoursAgo: w * 168 + 10, partner: "C20003", dir: "OUTBOUND", doc: "820", refs: { traceNumber: `TRN-CST-${8800 + w}`, amount: 12000 + w * 137 } });
    ackFor(t, 2);
  }
  makeTx({ hoursAgo: 14, partner: "C20003", dir: "OUTBOUND", doc: "820", refs: { traceNumber: "TRN-CST-8800", amount: 14630.25 }, status: "FAIL", failStep: "Deliver",
    error: { code: "VAN-IC-421", category: "DELIVERY", message: "Interconnect partner Keystone VAN rejected the interchange: receiver mailbox temporarily unavailable", service: "Communications gateway" } });
}

// Maple Ridge Crafts (web EDI): invoice submitted through the web form without an ASN
{
  const o = makeTx({ hoursAgo: 120, partner: "C20014", dir: "OUTBOUND", doc: "850", refs: { poNumber: "4500019940", shipToGLN: STORES["0601"].gln }, mapId: "M-1003" });
  makeTx({ hoursAgo: 26, partner: "C20014", dir: "INBOUND", doc: "810", refs: { invoiceNumber: "MRC-INV-0117", poNumber: "4500019940", shipToGLN: STORES["0601"].gln, channel: "Web form" } });
  void o;
}

transactions.sort((a, b) => b._t - a._t);

export const txById = (id: string) => byId.get(id);
export const SEARCH_LIMIT_DAYS = 183;

// ---- Payload rendering --------------------------------------------------------------------------

export function renderPayload(tx: Tx, variant: string) {
  const s = tx.sender.tradingAddress.split(":");
  const r = tx.receiver.tradingAddress.split(":");
  const d = tx.receivedAt.slice(2, 10).replace(/-/g, "");
  const c = tx.controlNumbers;
  if (variant === "TRANSLATED") {
    return JSON.stringify({ documentType: tx.documentType, ...tx.refs, sender: tx.sender.companyName, receiver: tx.receiver.companyName, lines: [{ line: 1, sku: "HRG-118204", qty: 24, uom: "EA", unitPrice: 12.4 }, { line: 2, sku: "HRG-118377", qty: 12, uom: "EA", unitPrice: 8.15 }] }, null, 2);
  }
  if (tx.standard === "EDIFACT") {
    return [`UNB+UNOA:2+${s[1]}:14+${r[1]}:14+${d}:0800+${c.unb0020}'`, `UNH+1+${tx.documentType}:D:96A:UN'`, `BGM+220+${tx.refs.poNumber ?? tx.refs.invoiceNumber ?? tx.refs.ackForControlNumber}+9'`, `NAD+DP+${tx.refs.shipToGLN ?? ""}::9'`, "UNT+4+1'", `UNZ+1+${c.unb0020}'`].join("\n");
  }
  const head = [`ISA*00*          *00*          *${s[0]}*${s[1].padEnd(15)}*${r[0]}*${r[1].padEnd(15)}*${d}*0800*U*00401*${c.isa13}*0*P*>~`, `GS*XX*${s[1]}*${r[1]}*20${d}*0800*${c.gs06}*X*004010~`];
  let body: string[] = [];
  const st = `ST*${tx.documentType}*0001~`;
  if (tx.documentType === "856") {
    const shipTo = tx.refs.storeNumber ? `N1*ST*Harborview DC ${tx.refs.storeNumber}*92*${tx.refs.storeNumber}~` : `N1*ST*Harborview*UL*${tx.refs.shipToGLN}~`;
    body = [st, `BSN*00*${tx.refs.shipmentId}*20${d}*1130~`, "HL*1**S~", "TD1*CTN25*12****G*240*LB~", "TD5**2*RDLN~", shipTo, "HL*2*1*O~", `PRF*${tx.refs.poNumber}~`, "HL*3*2*I~", "LIN**UP*012345678905~", "SN1**24*EA~", "CTT*3~", "SE*12*0001~"];
  } else if (tx.documentType === "810") {
    const price = tx.errors[0]?.code === "X12-SYN-104" ? "12,40" : "12.40";
    body = [st, `BIG*20${d}*${tx.refs.invoiceNumber}**${tx.refs.poNumber}~`, `N1*ST*Harborview*UL*${tx.refs.shipToGLN ?? ""}~`, `IT1*1*24*EA*${price}**UP*012345678905~`, "TDS*29760~", "CTT*1~", "SE*7*0001~"];
  } else if (tx.documentType === "850") {
    body = [st, `BEG*00*SA*${tx.refs.poNumber}**20${d}~`, `N1*ST*Harborview*UL*${tx.refs.shipToGLN ?? ""}~`, "PO1*1*24*EA*12.40**UP*012345678905~", "CTT*1~", "SE*6*0001~"];
  } else if (tx.documentType === "997") {
    const code = tx.ack?.code?.split("=")[1] ?? "A";
    body = [st, `AK1*XX*${tx.refs.ackForControlNumber}~`, ...(tx.ack?.detail ? tx.ack.detail.split(" / ").map((x) => `${x}~`) : []), `AK9*${code}*1*1*${code === "A" ? 1 : 0}~`, "SE*4*0001~"];
  } else if (tx.documentType === "940") {
    body = [st, `W05*N*${tx.refs.shippingOrder}*${tx.refs.poNumber}~`, `N1*ST*Harborview*UL*${tx.refs.shipToGLN ?? ""}~`, "LX*1~", "W01*24*EA**UP*012345678905~", "W76*24*EA~", "SE*7*0001~"];
  } else if (tx.documentType === "945") {
    const shipped = tx.refs.quantityShipped ?? 24;
    body = [st, `W06*N*${tx.refs.shippingOrder}*20${d}*${tx.refs.shipmentId}~`, "LX*1~", `W12*${shipped < (tx.refs.quantityOrdered ?? 24) ? "SH" : "CC"}*${tx.refs.quantityOrdered ?? 24}*${shipped}*${(tx.refs.quantityOrdered ?? 24) - shipped}*EA**UP*012345678905~`, `W03*${shipped}~`, "SE*6*0001~"];
  } else if (tx.documentType === "214") {
    body = [st, `B10*${tx.refs.shipmentId}*${tx.refs.shipmentId}*RDLN~`, "LX*1~", `AT7*${tx.refs.statusCode}*NS***20${d}*1000~`, "SE*5*0001~"];
  } else if (tx.documentType === "812") {
    body = [st, `BCD*20${d}*${tx.refs.adjustmentNumber}*D*${(tx.refs.amount ?? 0).toFixed(2)}*D******${tx.refs.invoiceNumber}~`, `CDD*06*D**${(tx.refs.amount ?? 0).toFixed(2)}~`, "SE*4*0001~"];
  } else if (tx.documentType === "820") {
    body = [st, `BPR*C*${(tx.refs.amount ?? 0).toFixed(2)}*C*ACH~`, `TRN*1*${tx.refs.traceNumber}~`, `RMR*IV*${tx.refs.invoiceNumber ?? "MULTIPLE"}**${(tx.refs.amount ?? 0).toFixed(2)}~`, "SE*5*0001~"];
  } else {
    body = [st, `BAK*00*AC*${tx.refs.poNumber}*20${d}~`, "SE*3*0001~"];
  }
  return [...head, ...body, `GE*1*${c.gs06}~`, `IEA*1*${c.isa13}~`].join("\n");
}
