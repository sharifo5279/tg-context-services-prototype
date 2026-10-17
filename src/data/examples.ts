// Current examples found in the observed traffic, for test scenarios, journey links and suggested prompts.
import { transactions, Tx, STORE_LIST } from "./insights.js";
import { companyById } from "./cms.js";
import { PROFILES, DAY, anchorDay } from "./roster.js";
import { xrefEntities } from "./other.js";
import { partnersDown, anomalies } from "./monitor.js";

const H = 3600_000;
const prod = (t: Tx) => t.environment === "PRODUCTION";
const key = (t?: Tx) => (t ? (Object.values(t.keys)[0] as any)?.value ?? t.transactionId : null);
const name = (id?: string) => (id ? companyById(id)?.companyName ?? id : null);
const within = (days: number) => { const from = Date.now() - days * DAY; const out: Tx[] = []; for (const t of transactions) { if (t._t < from) break; out.push(t); } return out; };

function ackIndex(days: number) { const s = new Set<string>(); for (const t of within(days + 2)) if (t.refs.ackForTransactionId) s.add(t.refs.ackForTransactionId); return s; }

export function findExamples() {
  const now = Date.now();
  const w7 = within(7), w30 = within(30);
  const failed = (pred: (t: Tx) => boolean, list = w7) => list.find((t) => prod(t) && t.sourceStatus === "FAIL" && pred(t));
  const xrefAsn = failed((t) => t.documentType === "856" && t.errors[0]?.code === "XREF-404", w30);
  const xrefOpen = failed((t) => t.documentType === "856" && t.errors[0]?.code === "XREF-404" && !xrefEntities.STORE_TO_GLN.entries[t.refs.storeNumber!], w30);
  const delivery = failed((t) => t.errors[0]?.category === "DELIVERY", w30);
  const validation810 = failed((t) => t.documentType === "810" && t.errors[0]?.category === "VALIDATION", w30);
  const anyFailedAsn = failed((t) => t.documentType === "856", w30);
  const acks = ackIndex(4);
  const missing = new Map<string, number>();
  for (const t of within(4)) if (prod(t) && t.direction === "OUTBOUND" && t.documentType === "850" && t.sourceStatus === "DLVD" && now - t._t > 24 * H && !acks.has(t.transactionId) && companyById(t.partnerCompanyId) && PROFILES.find((p) => p.id === t.partnerCompanyId)?.protocol !== "WEB_EDI") missing.set(t.partnerCompanyId, (missing.get(t.partnerCompanyId) ?? 0) + 1);
  const missingAck = [...missing.entries()].sort((a, b) => b[1] - a[1])[0];
  const rejected = w30.find((t) => prod(t) && t.documentType === "997" && t.ack?.status === "REJECTED" && t.direction === "INBOUND");
  const stuck = w7.find((t) => prod(t) && t.sourceStatus === "INPR" && now - t._t > 6 * H);
  const short945 = w30.find((t) => t.documentType === "945" && (t.refs.quantityShipped ?? 24) < (t.refs.quantityOrdered ?? 24));
  const delayed214 = w30.find((t) => t.documentType === "214" && t.refs.statusCode === "SD");
  const cb = transactions.find((t) => t.documentType === "812");
  const remit = w30.find((t) => t.documentType === "820");
  const webInvoice = w30.find((t) => t.refs.channel === "Web form" && t.documentType === "810");
  // A delivered PO with 855, 856 and 810 all present
  const byPo = new Map<string, Set<string>>();
  for (const t of within(20)) if (prod(t) && t.refs.poNumber && ["850", "855", "856", "810"].includes(t.documentType) && t.sourceStatus === "DLVD") { const s = byPo.get(t.refs.poNumber) ?? new Set(); s.add(t.documentType); byPo.set(t.refs.poNumber, s); }
  const fullPo = [...byPo.entries()].find(([, s]) => s.size === 4)?.[0] ?? null;
  const down = partnersDown(now)[0];
  const quiet = PROFILES.find((p) => p.quietFrom != null && anchorDay(p.quietFrom) <= Math.floor(now / DAY));
  const onboarding = PROFILES.find((p) => anchorDay(p.goLive) > Math.floor(now / DAY));
  const newest = [...PROFILES].filter((p) => anchorDay(p.goLive) <= Math.floor(now / DAY)).sort((a, b) => b.goLive - a.goLive)[0];
  const pendingStore = STORE_LIST.find((s) => s.openDay <= Math.floor(now / DAY) && !xrefEntities.STORE_TO_GLN.entries[s.number]);
  const an = anomalies()[0];
  const dAsn = w7.find((t) => prod(t) && t.documentType === "856" && t.sourceStatus === "DLVD");
  const dInv = w7.find((t) => prod(t) && t.documentType === "810" && t.sourceStatus === "DLVD");
  const downFail = down ? w30.find((t) => t.partnerCompanyId === down && t.sourceStatus === "FAIL" && t.errors[0]?.category === "DELIVERY") : undefined;
  return {
    failedAsnXref: xrefAsn ? { transactionId: xrefAsn.transactionId, shipmentId: key(xrefAsn), partner: name(xrefAsn.partnerCompanyId), storeNumber: xrefAsn.refs.storeNumber ?? null, open: !!xrefOpen && xrefOpen.transactionId === xrefAsn.transactionId } : null,
    openXrefAsn: xrefOpen ? { transactionId: xrefOpen.transactionId, shipmentId: key(xrefOpen), partner: name(xrefOpen.partnerCompanyId), storeNumber: xrefOpen.refs.storeNumber } : null,
    failedAsn: anyFailedAsn ? { transactionId: anyFailedAsn.transactionId, shipmentId: key(anyFailedAsn), partner: name(anyFailedAsn.partnerCompanyId), error: anyFailedAsn.errors[0]?.code } : null,
    deliveryFailure: delivery ? { transactionId: delivery.transactionId, key: key(delivery), partner: name(delivery.partnerCompanyId), documentType: delivery.documentType, error: delivery.errors[0]?.code } : null,
    invoiceValidation: validation810 ? { transactionId: validation810.transactionId, invoiceNumber: key(validation810), partner: name(validation810.partnerCompanyId) } : null,
    missingAck: missingAck ? { partner: name(missingAck[0]), partnerCompanyId: missingAck[0], count: missingAck[1] } : null,
    rejectedAck: rejected ? { transactionId: rejected.transactionId, partner: name(rejected.partnerCompanyId) } : null,
    stuckInProcess: stuck ? { transactionId: stuck.transactionId, key: key(stuck), partner: name(stuck.partnerCompanyId) } : null,
    shortShipment: short945 ? { transactionId: short945.transactionId, shippingOrder: short945.refs.shippingOrder, shipmentId: short945.refs.shipmentId } : null,
    delayedShipment: delayed214 ? { transactionId: delayed214.transactionId, shipmentId: delayed214.refs.shipmentId } : null,
    chargeback: cb ? { transactionId: cb.transactionId, adjustmentNumber: cb.refs.adjustmentNumber, partner: name(cb.partnerCompanyId) } : null,
    remittance: remit ? { transactionId: remit.transactionId, traceNumber: remit.refs.traceNumber, partner: name(remit.partnerCompanyId) } : null,
    webInvoice: webInvoice ? { transactionId: webInvoice.transactionId, invoiceNumber: webInvoice.refs.invoiceNumber, partner: name(webInvoice.partnerCompanyId) } : null,
    poLifecycle: fullPo,
    partnerDown: down ? { partner: name(down), partnerCompanyId: down } : null,
    quietPartner: quiet ? { partner: name(quiet.id), partnerCompanyId: quiet.id } : null,
    onboardingPartner: onboarding ? { partner: name(onboarding.id), partnerCompanyId: onboarding.id, goLive: new Date(anchorDay(onboarding.goLive) * DAY).toISOString().slice(0, 10) } : null,
    newestPartner: newest ? { partner: name(newest.id), partnerCompanyId: newest.id } : null,
    storeMissingXref: pendingStore ? { storeNumber: pendingStore.number, gln: pendingStore.gln, name: pendingStore.name } : null,
    deliveredAsn: dAsn ? { transactionId: dAsn.transactionId, shipmentId: key(dAsn), partner: name(dAsn.partnerCompanyId) } : null,
    deliveredInvoice: dInv ? { transactionId: dInv.transactionId, invoiceNumber: key(dInv), partner: name(dInv.partnerCompanyId) } : null,
    deliveryFailureDown: downFail ? { transactionId: downFail.transactionId, partner: name(downFail.partnerCompanyId) } : null,
    latestAnomaly: an ? { anomalyId: an.anomalyId, partner: an.partner, type: an.type } : null,
  };
}
