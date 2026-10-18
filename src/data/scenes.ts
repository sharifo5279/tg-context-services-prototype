// Screen data for the SAP S/4HANA and ServiceNow stage clients, derived from the Trading Grid world model.
import { transactions, docsByPo } from "./insights.js";
import { companyById } from "./cms.js";
import { CERT_INCIDENT, certIncidentStart } from "./world.js";
import { CERT_CR } from "./other.js";

const DAY = 86400_000;
const name = (id: string) => companyById(id)?.companyName ?? id;
/** Route transit days per supplier, 1 to 4, as held in the SAP TM route master. */
const transitDays = (id: string) => 1 + ([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 4);

/** Purchase orders for Monitor Supplier Confirmations: last 7 days, newest first, one or two per supplier. */
export function sceneS4() {
  const now = Date.now();
  const seen = new Set<string>();
  const cand: any[] = [];
  for (const t of transactions) {
    if (t._t < now - 7 * DAY) break;
    if (t.documentType !== "850" || t.direction !== "OUTBOUND" || t.environment !== "PRODUCTION" || !/^45\d{8}$/.test(t.refs.poNumber ?? "")) continue;
    const dayKey = `${t.partnerCompanyId}|${Math.floor(t._t / DAY)}`;
    if (seen.has(dayKey)) continue;
    seen.add(dayKey);
    const docs = docsByPo(t.refs.poNumber!).filter((x) => x.partnerCompanyId === t.partnerCompanyId);
    const has = (d: string) => docs.some((x) => x.documentType === d && x.sourceStatus === "DLVD");
    const asn = docs.find((x) => x.documentType === "856" && x.sourceStatus === "DLVD");
    const status = has("810") ? "Invoiced" : asn ? "Shipped" : has("855") ? "Confirmed" : "Not confirmed";
    cand.push({ po: t.refs.poNumber, supplier: name(t.partnerCompanyId), supplierId: t.partnerCompanyId, orderedAt: new Date(t._t).toISOString(), requestedDelivery: new Date(t._t + 6 * DAY).toISOString().slice(0, 10), status, transitDays: transitDays(t.partnerCompanyId), asnAt: asn ? new Date(asn._t).toISOString() : null, shipmentId: asn?.refs.shipmentId ?? null });
  }
  const quota: Record<string, number> = { "Not confirmed": 3, Confirmed: 4, Shipped: 4, Invoiced: 3 };
  const used = new Set<string>();
  const rows = cand.filter((c) => { if (!quota[c.status] || used.has(c.supplierId)) return false; quota[c.status]--; used.add(c.supplierId); return true; }).sort((a, b) => b.orderedAt.localeCompare(a.orderedAt));
  const pick = rows.find((r) => r.status === "Shipped" && r.supplierId !== CERT_INCIDENT.partnerCompanyId) ?? rows[0];
  return { plant: "1710", purchasingGroup: "Home and Seasonal (H02)", rows, selected: pick?.po ?? null };
}

/** Incident record for the Northfield Foods AS2 certificate expiry. */
export function sceneServiceNow() {
  const now = Date.now(), start = certIncidentStart(now);
  const failed = transactions.filter((t) => t._t >= start && t._t <= now && t.partnerCompanyId === CERT_INCIDENT.partnerCompanyId && t.sourceStatus === "FAIL" && t.errors[0]?.code === "AS2-SIG-401");
  const byDoc: Record<string, number> = {};
  for (const t of failed) byDoc[t.documentType] = (byDoc[t.documentType] ?? 0) + 1;
  return {
    number: "INC0041873", shortDescription: "Northfield Foods inbound EDI rejected: AS2 certificate expired",
    caller: "Jordan Lee", openedAt: new Date(start + 18 * 60_000).toISOString(), state: "In Progress", priority: "2 - High", impact: "2 - Medium", urgency: "1 - High",
    category: "Integration", subcategory: "B2B / EDI", service: "Trading Grid B2B integration", ci: "Northfield Foods AS2 connection",
    assignmentGroup: "Supply Chain Integration", assignedTo: "Jordan Lee", partner: name(CERT_INCIDENT.partnerCompanyId), partnerCompanyId: CERT_INCIDENT.partnerCompanyId,
    failed: failed.length, byDoc, changeRequest: CERT_CR.statusId, certificateExpired: new Date(start).toISOString(),
  };
}
