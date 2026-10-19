// Screen data for the SAP S/4HANA and ServiceNow stage clients, derived from the Trading Grid world model.
import { transactions, docsByPo } from "./insights.js";
import { companyById } from "./cms.js";
import { CERT_INCIDENT, certIncidentStart } from "./world.js";
import { CERT_CR } from "./other.js";

const DAY = 86400_000;
const name = (id: string) => companyById(id)?.companyName ?? id;
/** Route transit days per supplier, 1 to 4, as held in the SAP TM route master. */
const transitDays = (id: string) => 1 + ([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 4);

/** SAP item catalog for Pinegate Home purchase orders (material, description, unit price in USD). */
const ITEMS: [string, string, number][] = [["HG-40112", "Ceramic table lamp, 24 in", 38.5], ["HG-40218", "Linen throw pillow, 18 in", 12.75], ["HG-40305", "Walnut picture frame, 8x10", 9.4], ["HG-40411", "Woven storage basket, large", 21.9], ["HG-40527", "Stoneware vase, 12 in", 16.25], ["HG-40633", "Cotton throw blanket", 27.0]];
const hnum = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
/** SAP supplier agreement for Pinegate Home, held in the S/4HANA vendor master and purchasing info records. */
export const PINEGATE_AGREEMENT = { vendor: "1000452", name: "Pinegate Home LLC", confirmationControl: "Z855: order acknowledgment (EDI 855) required within 24 hours of the PO", complianceTarget: "95% of POs acknowledged within 24 hours", feeText: "Vendor compliance program: chargebacks per Harborview's deduction schedule in Trading Grid Intelligence", escalation: "Below 90% for two consecutive months triggers a supplier performance review" };

/** Monitor Supplier Confirmations filtered to Pinegate Home, last 14 days, newest first. Values come from SAP; document timing from Trading Grid. */
export function sceneS4() {
  const now = Date.now();
  const FOCUS = "C20005";
  const rows: any[] = [];
  for (const t of transactions) {
    if (t._t < now - 14 * DAY) break;
    if (t.partnerCompanyId !== FOCUS || t.documentType !== "850" || t.direction !== "OUTBOUND" || t.environment !== "PRODUCTION" || !/^45\d{8}$/.test(t.refs.poNumber ?? "")) continue;
    const docs = docsByPo(t.refs.poNumber!).filter((x) => x.partnerCompanyId === FOCUS);
    const ack = docs.find((x) => x.documentType === "855" && x.sourceStatus === "DLVD");
    const asn = docs.find((x) => x.documentType === "856" && x.sourceStatus === "DLVD");
    const inv = docs.find((x) => x.documentType === "810" && x.sourceStatus === "DLVD");
    const h = hnum(t.refs.poNumber!);
    const qty = t.refs.quantityOrdered ?? 24;
    const a = ITEMS[h % ITEMS.length], b2 = ITEMS[(h >>> 3) % ITEMS.length === h % ITEMS.length ? (h + 1) % ITEMS.length : (h >>> 3) % ITEMS.length];
    const q1 = Math.max(6, Math.round(qty * 0.6)), q2 = Math.max(6, qty - q1);
    const items = [{ item: 10, material: a[0], description: a[1], quantity: q1, unit: "EA", netPrice: a[2] }, { item: 20, material: b2[0], description: b2[1], quantity: q2, unit: "EA", netPrice: b2[2] }];
    const netValue = Math.round(items.reduce((s2, i) => s2 + i.quantity * i.netPrice, 0) * 100) / 100;
    rows.push({ po: t.refs.poNumber, supplier: name(FOCUS), supplierId: FOCUS, orderedAt: new Date(t._t).toISOString(), requestedDelivery: new Date(t._t + 6 * DAY).toISOString().slice(0, 10), status: ack ? "Confirmed" : "Not confirmed", delivery: inv ? "Invoiced" : asn ? "Shipped" : "Open", netValue, currency: "USD", items, transitDays: transitDays(FOCUS), asnAt: asn ? new Date(asn._t).toISOString() : null, shipmentId: asn?.refs.shipmentId ?? null, confirmedAt: ack ? new Date(ack._t).toISOString() : null });
  }
  for (const r of rows) r.plannedShipDate = new Date(Date.parse(r.requestedDelivery + "T12:00:00Z") - r.transitDays * DAY).toISOString().slice(0, 10);
  // Default selection: the oldest unconfirmed PO with no ASN yet, so the question is open on screen.
  const pick = [...rows].reverse().find((r) => r.status === "Not confirmed" && !r.asnAt) ?? rows.find((r) => r.status === "Not confirmed") ?? rows[0];
  return { plant: "1710", purchasingGroup: "Home and Seasonal (H02)", supplierFilter: "Pinegate Home LLC (1000452)", agreement: PINEGATE_AGREEMENT, rows, selected: pick?.po ?? null };
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
