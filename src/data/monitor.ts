// Signals derived from observed traffic: anomalies (CCIM), integration events (TGDP) and connection health.
import { transactions, Tx, incidentAt } from "./insights.js";
import { companyById } from "./cms.js";
import { PROFILES, DAY } from "./roster.js";
import { CERT_INCIDENT, certIncidentStart } from "./world.js";

const H = 3600_000;
const isAck = (t: Tx) => t.documentType === "997" || t.documentType === "CONTRL";
const name = (id: string) => companyById(id)?.companyName ?? id;
const wkday = (d: number) => { const w = new Date(d * DAY).getUTCDay(); return w !== 0 && w !== 6; };
const hashId = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 9000 + 1000; };

export type Anomaly = { anomalyId: string; watchlistId: string; type: "SPIKE" | "DROP" | "FAILED"; detectedAt: string; partner: string; partnerCompanyId: string; documentType: string; observed: number; expectedRange: string; detail: string };

let cache: { key: string; list: Anomaly[] } = { key: "", list: [] };

/** Detects volume spikes, drops and failed-transaction anomalies over the last 14 business days. */
export function anomalies(): Anomaly[] {
  const now = Date.now();
  const key = `${transactions.length}|${Math.floor(now / H)}`;
  if (cache.key === key) return cache.list;
  const today = Math.floor(now / DAY);
  const from = (today - 42) * DAY;
  const vol = new Map<string, number>(), fail = new Map<string, number>();
  for (const t of transactions) {
    if (t._t < from) break;
    if (t.environment !== "PRODUCTION" || isAck(t) || t.direction !== "INBOUND") continue;
    const d = Math.floor(t._t / DAY);
    const k = `${t.partnerCompanyId}|${d}`;
    vol.set(k, (vol.get(k) ?? 0) + 1);
    if (t.sourceStatus === "FAIL") { const kf = `${t.partnerCompanyId}|${t.documentType}|${d}`; fail.set(kf, (fail.get(kf) ?? 0) + 1); }
  }
  const out: Anomaly[] = [];
  for (const p of PROFILES) {
    for (let d = today - 14; d < today; d++) {
      if (!wkday(d)) continue;
      const base: number[] = [];
      for (let b = d - 28; b < d; b++) if (wkday(b)) base.push(vol.get(`${p.id}|${b}`) ?? 0);
      if (base.length < 10) continue;
      const mean = base.reduce((a, b) => a + b, 0) / base.length;
      const sd = Math.sqrt(base.reduce((a, b) => a + (b - mean) ** 2, 0) / base.length);
      const lo = Math.max(0, Math.floor(mean - 2 * sd)), hi = Math.ceil(mean + 2 * sd);
      const v = vol.get(`${p.id}|${d}`) ?? 0;
      const at = new Date((d + 1) * DAY + 6 * H).toISOString();
      if (mean >= 3 && v < lo) out.push({ anomalyId: `AN-${hashId(`${p.id}D${d}`)}`, watchlistId: "WL-04", type: "DROP", detectedAt: at, partner: name(p.id), partnerCompanyId: p.id, documentType: "All inbound", observed: v, expectedRange: `${lo} to ${hi} per day`, detail: v === 0 ? "Inbound volume dropped to zero." : "Inbound volume below the projected range." });
      else if (mean >= 3 && v > hi + 1) out.push({ anomalyId: `AN-${hashId(`${p.id}S${d}`)}`, watchlistId: "WL-04", type: "SPIKE", detectedAt: at, partner: name(p.id), partnerCompanyId: p.id, documentType: "All inbound", observed: v, expectedRange: `${lo} to ${hi} per day`, detail: "Inbound volume above the projected range." });
    }
  }
  for (const [k, n] of fail) {
    const [pid, doc, ds] = k.split("|"); const d = Number(ds);
    if (d < today - 14 || n < 2) continue;
    const wl = doc === "856" || doc === "DESADV" ? "WL-01" : doc === "810" || doc === "INVOIC" ? "WL-03" : "WL-04";
    out.push({ anomalyId: `AN-${hashId(k)}`, watchlistId: wl, type: "FAILED", detectedAt: new Date(d * DAY + 20 * H).toISOString(), partner: name(pid), partnerCompanyId: pid, documentType: doc, observed: n, expectedRange: "0 to 1 per day", detail: `${n} failed ${doc} documents in one day.` });
  }
  // Acknowledgment gaps: outbound POs without a 997 for more than 24 hours, last 3 days
  const ackOf = new Set<string>();
  for (const t of transactions) { if (t._t < now - 6 * DAY) break; if (t.refs.ackForTransactionId) ackOf.add(t.refs.ackForTransactionId); }
  const gaps = new Map<string, { n: number; first: number }>();
  for (const t of transactions) {
    if (t._t < now - 4 * DAY) break;
    if (t.direction !== "OUTBOUND" || t.documentType !== "850" || t.sourceStatus !== "DLVD" || now - t._t < 24 * H || ackOf.has(t.transactionId)) continue;
    const g = gaps.get(t.partnerCompanyId) ?? { n: 0, first: t._t }; g.n++; g.first = Math.min(g.first, t._t); gaps.set(t.partnerCompanyId, g);
  }
  for (const [pid, g] of gaps) if (g.n >= 2) out.push({ anomalyId: `AN-${hashId(`${pid}ACK${Math.floor(g.first / DAY)}`)}`, watchlistId: "WL-02", type: "DROP", detectedAt: new Date(g.first + 24 * H).toISOString(), partner: name(pid), partnerCompanyId: pid, documentType: "997", observed: 0, expectedRange: "1 per outbound PO", detail: `${g.n} outbound POs without a 997 after 24 hours.` });
  out.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  cache = { key, list: out };
  return out;
}

/** Integration monitor events as rows of the tgdp.ccim_integration_events data product. */
export const ccimEventRows = () => anomalies().map((a) => ({ event_id: a.anomalyId.replace("AN-", "EV-"), detected_at: a.detectedAt, watchlist: { "WL-01": "Inbound ASN volume", "WL-02": "PO acknowledgment", "WL-03": "Invoice failures", "WL-04": "Inbound document volume" }[a.watchlistId] ?? a.watchlistId, partner_name: a.partner, document_type: a.documentType, event_type: a.type === "FAILED" ? "FAILED_TRANSACTION" : "ANOMALY", detail: a.detail }));

/** Communications gateway health for a partner, derived from protocol, incidents and recent deliveries. */
export function connectionStatus(pid: string, now = Date.now()) {
  const p = PROFILES.find((x) => x.id === pid);
  if (!p) return null;
  const h = hashId(pid);
  const lastOut = transactions.find((t) => t.partnerCompanyId === pid && t.direction === "OUTBOUND" && t.sourceStatus === "DLVD" && t.environment === "PRODUCTION");
  const fails = transactions.filter((t) => t._t >= now - 24 * H && t.partnerCompanyId === pid && t.errors[0]?.category === "DELIVERY").length;
  const certDays = 20 + (h % 400);
  const base: any = { protocol: p.protocol === "VAN_INTERCONNECT" ? "VAN interconnect" : p.protocol === "WEB_EDI" ? "Web EDI forms" : p.protocol, endpoint: p.protocol === "AS2" ? "https://(redacted)/as2" : p.protocol === "SFTP" ? "sftp://(redacted):22/inbound" : p.protocol === "VAN_INTERCONNECT" ? "Keystone VAN Services (MB-KVAN-IC-07)" : "Harborview supplier web EDI (MB-HRG-WEBEDI-01)", lastSuccess: lastOut ? new Date(Math.max(lastOut._t, now - 60 * DAY)).toISOString() : null, failures24h: fails };
  if (p.protocol === "AS2") { base.certificateExpires = new Date(now + certDays * DAY).toISOString().slice(0, 10); if (certDays <= 35) base.note = `Certificate expires within ${certDays} days.`; }
  if (pid === CERT_INCIDENT.partnerCompanyId) { const cs = certIncidentStart(now); const inFails = transactions.filter((t) => t.partnerCompanyId === pid && t.direction === "INBOUND" && t._t >= cs && t._t <= now && t.sourceStatus === "FAIL").length; const { lastSuccess, ...rest } = base; return { ...rest, lastInboundSuccess: new Date(cs - 7 * 60_000).toISOString(), lastOutboundSuccess: lastSuccess, failures24h: inFails, certificateExpires: new Date(certIncidentStart(now)).toISOString().slice(0, 16).replace("T", " ") + " UTC", status: "DEGRADED", since: new Date(certIncidentStart(now)).toISOString(), lastError: "Inbound AS2 signature verification failed: partner signing certificate expired", note: "Inbound files from the partner are rejected at receipt. Outbound delivery is unaffected." }; }
  const out = incidentAt(pid, "OUTAGE", now);
  if (out) return { ...base, status: "DOWN", since: new Date(out.start).toISOString(), lastError: "AS2 MDN not received: connection timed out after 3 attempts", retryPolicy: "3 attempts, 10-minute interval; then held for redelivery" };
  const van = incidentAt(pid, "VAN_REJECT", now);
  if (van) return { ...base, status: "DEGRADED", since: new Date(van.start).toISOString(), lastError: "Interconnect partner rejected the interchange: receiver mailbox temporarily unavailable" };
  const stall = incidentAt(pid, "PICKUP_STALL", now);
  if (stall) return { ...base, status: "UP", partnerPickup: { lastPickup: new Date(stall.start).toISOString(), note: `Files delivered to the partner mailbox have not been collected for ${Math.round((now - stall.start) / H)} hours.` } };
  return { ...base, status: "UP" };
}

/** Partners with an endpoint outage at the moment. */
export const partnersDown = (now = Date.now()) => PROFILES.filter((p) => incidentAt(p.id, "OUTAGE", now)).map((p) => p.id);
