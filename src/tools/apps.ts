// Application endpoints: Command Center Integration Monitor, TG Insights application features and
// Command Center Performance Monitor (incubation). Modeled on the Innovation Guide H2 2026; these are demo
// constructs, not product API contracts. Values are computed from the seeded transaction data.
import { transactions, txById, Tx, ackOf, docsByPo, docsByKey, STORE_LIST } from "../data/insights.js";
import { companies, companyById, messagingTuples, addresses, tprs, HUB_ID } from "../data/cms.js";
import { xrefEntities } from "../data/other.js";
import { anomalies, partnersDown } from "../data/monitor.js";
import { incidentAt } from "../data/insights.js";
import { ok, fail, createPlan, approvalRequired, consumePlan, scopeFilter, Ctx } from "../runtime.js";
import { ToolDef, s } from "./types.js";
import { resolveCompany, parseTime } from "./common.js";
import { eq } from "../util.js";

const CCIM = "Command Center Integration Monitor";
const TGI = "Trading Grid Insights";
const CCPM = "Command Center Performance Monitor (incubation)";
const BASIS_GA = "Demo construct: application API modeled on the Innovation Guide (generally available feature)";
const BASIS_INC = "Demo construct: application API modeled on the Innovation Guide (incubation)";
const H = 3600_000, D = 86400_000;

// ---------------------------------------------------------------- shared helpers
const prod = () => transactions.filter((t) => t.environment === "PRODUCTION" && scopeFilter(t.partnerCompanyId));
const within = (ms: number) => { const from = Date.now() - ms; const out: Tx[] = []; for (const t of transactions) { if (t._t < from) break; if (t.environment === "PRODUCTION" && scopeFilter(t.partnerCompanyId)) out.push(t); } return out; };
const partnerName = (id: string) => companyById(id)?.companyName ?? id;
const isAck = (t: Tx) => t.documentType === "997" || t.documentType === "CONTRL";
const ackOfT = (t: Tx) => ackOf(t.transactionId);
/** Latest transaction of a document type for a PO. */
const docFor = (type: string, po?: string) => { if (!po) return undefined; const a = docsByPo(po); for (let i = a.length - 1; i >= 0; i--) if (a[i].documentType === type) return a[i]; return undefined; };
const docsFor = (type: string, po?: string) => (po ? docsByPo(po).filter((x) => x.documentType === type) : []);
const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const count = <T>(list: T[], key: (x: T) => string) => list.reduce((m: Record<string, number>, x) => ((m[key(x)] = (m[key(x)] ?? 0) + 1), m), {});
const top = (m: Record<string, number>, n = 10) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);

function partnerArg(ctx: Ctx, tool: string, op: string, input?: string) {
  if (!input) return { id: null as string | null };
  const r = resolveCompany(input);
  if (r.kind === "ok") return { id: r.company.companyId as string };
  return { early: fail(ctx, tool, op, r.kind === "ambiguous" ? "AMBIGUOUS_PARTNER" : r.kind === "denied" ? "ACCESS_DENIED" : "NOT_FOUND", r.kind === "ambiguous" ? `'${input}' matches several partners. Select one.` : r.kind === "denied" ? (r as any).reason : `No permitted partner matches '${input}'.`, r.kind === "ambiguous" ? { candidates: (r as any).candidates } : {}) };
}

// ---------------------------------------------------------------- CCIM data
const WATCHLISTS = [
  { watchlistId: "WL-01", name: "Inbound ASN volume", metric: "count", filter: { documentType: "856", direction: "INBOUND" }, anomalyDetection: true },
  { watchlistId: "WL-02", name: "PO acknowledgment", metric: "count", filter: { documentType: "997", direction: "INBOUND" }, anomalyDetection: true },
  { watchlistId: "WL-03", name: "Invoice failures", metric: "failed", filter: { documentType: "810", direction: "INBOUND" }, anomalyDetection: true },
  { watchlistId: "WL-04", name: "Inbound document volume", metric: "count", filter: { direction: "INBOUND" }, anomalyDetection: true },
  { watchlistId: "WL-05", name: "Outbound PO volume", metric: "count", filter: { documentType: "850", direction: "OUTBOUND" }, anomalyDetection: false },
  { watchlistId: "WL-06", name: "EDIFACT ORDERS", metric: "count", filter: { documentType: "ORDERS", direction: "OUTBOUND" }, anomalyDetection: false },
];
const wlMatch = (w: any, t: Tx) => (!w.filter.documentType || t.documentType === w.filter.documentType) && (!w.filter.direction || t.direction === w.filter.direction) && (w.metric !== "failed" || t.sourceStatus === "FAIL");

function daily(w: any, days: number) {
  const now = Date.now(); const start = now - days * D;
  const buckets: number[] = new Array(days).fill(0);
  for (const t of prod()) if (t._t >= start && wlMatch(w, t)) buckets[Math.min(days - 1, Math.floor((t._t - start) / D))]++;
  return buckets;
}
function stats(a: number[]) { const m = a.reduce((x, y) => x + y, 0) / (a.length || 1); const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length || 1)); return { mean: m, sd }; }

const ANOMALIES = () => anomalies();

type PStat = { volume30: number; failed30: number; delivery30: number; last: number; months: Set<string> };
let PSTAT: { key: string; m: Map<string, PStat> } = { key: "", m: new Map() };
/** One pass over observed traffic: 30-day volume and failures, last activity and active months per partner. */
function partnerStats() {
  const key = `${transactions.length}|${Math.floor(Date.now() / 60_000)}`;
  if (PSTAT.key === key) return PSTAT.m;
  const m = new Map<string, PStat>(); const from = Date.now() - 30 * D;
  for (const t of transactions) {
    if (t.environment !== "PRODUCTION" || isAck(t)) continue;
    let p = m.get(t.partnerCompanyId); if (!p) { p = { volume30: 0, failed30: 0, delivery30: 0, last: t._t, months: new Set() }; m.set(t.partnerCompanyId, p); }
    p.months.add(new Date(t._t).toISOString().slice(0, 7));
    if (t._t >= from) { p.volume30++; if (t.sourceStatus === "FAIL") { p.failed30++; if (t.errors[0]?.category === "DELIVERY") p.delivery30++; } }
  }
  PSTAT = { key, m };
  return m;
}
function partnerMetrics(id: string, _days = 30) {
  const p = partnerStats().get(id);
  const volume = p?.volume30 ?? 0, failed = p?.failed30 ?? 0;
  return { volume, failed, failureRate: volume ? round((failed / volume) * 100) : 0, lastActivity: p ? new Date(p.last).toISOString() : null };
}
const tradingPartners = () => companies.filter((c) => c.companyId !== HUB_ID && scopeFilter(c.companyId) && c.companyParticipationType === "SPOKE");

// ---------------------------------------------------------------- TGI data
const SAVED_FILTERS = [
  { filterId: "SF-01", name: "Failed ASNs last 24 hours", criteria: { documentType: "856", status: "FAILED", lastHours: 24 } },
  { filterId: "SF-02", name: "POs without 997 after 24 hours", criteria: { documentType: "850", direction: "OUTBOUND", ack: "MISSING", olderThanHours: 24 } },
  { filterId: "SF-03", name: "Failed invoices this week", criteria: { documentType: "810", status: "FAILED", lastHours: 168 } },
  { filterId: "SF-04", name: "Delivery failures", criteria: { status: "FAILED", errorCategory: "DELIVERY", lastHours: 168 } },
];
export const alertRules: any[] = [
  { alertId: "AL-01", name: "Failed ASN", filterId: "SF-01", recipients: ["edi.team@harborviewretail.com"], frequency: "IMMEDIATE", status: "ACTIVE", lastTriggered: new Date(Date.now() - 22 * H).toISOString() },
  { alertId: "AL-02", name: "Missing PO acknowledgments", filterId: "SF-02", recipients: ["buying.desk@harborviewretail.com"], frequency: "HOURLY", status: "ACTIVE", lastTriggered: new Date(Date.now() - 2 * H).toISOString() },
];
const REPORT_RULES = [
  { reportId: "RP-01", name: "Weekly invoice status", filterId: "SF-03", schedule: "Mondays 07:00", format: "XLSX", recipients: ["ap.team@harborviewretail.com"], lastRun: new Date(Date.now() - 4 * D).toISOString() },
  { reportId: "RP-02", name: "Daily shipment status", filterId: "SF-01", schedule: "Daily 06:00", format: "CSV", recipients: ["dc.receiving@harborviewretail.com"], lastRun: new Date(Date.now() - 10 * H).toISOString() },
  { reportId: "RP-03", name: "Failed purchase orders", filterId: "SF-04", schedule: "Daily 06:00", format: "PDF", recipients: ["edi.team@harborviewretail.com"], lastRun: new Date(Date.now() - 10 * H).toISOString() },
];
const REDELIVERY_RULES = [
  { ruleId: "ARD-01", name: "AS2 MDN timeout", match: "Error AS2-MDN-504 on outbound delivery", action: "Redeliver after the partner endpoint reports healthy; at most 3 attempts in 24 hours", poweredBy: "Aviator", status: "ACTIVE", lastApplied: null },
  { ruleId: "ARD-02", name: "SFTP partner pickup stalled", match: "Partner mailbox not collected for 12 hours", action: "Notify partner support contact; no redelivery", poweredBy: "Aviator", status: "ACTIVE", lastApplied: new Date(Date.now() - 20 * H).toISOString() },
];
/** Changes made to observed transactions (redelivery, reprocessing). Persisted and re-applied after restart. */
export const txOverrides: Record<string, { refs?: any; o?: any; redelivered?: boolean }> = {};
function override(t: Tx, rec: { refs?: any; o?: any; redelivered?: boolean }) {
  const cur = (txOverrides[t.transactionId] ??= {});
  if (rec.refs) { cur.refs = { ...(cur.refs ?? {}), ...rec.refs }; Object.assign(t.refs, rec.refs); }
  if (rec.o) { cur.o = { ...(cur.o ?? {}), ...rec.o }; t._o = { ...(t._o ?? {}), ...rec.o }; }
  if (rec.redelivered) { cur.redelivered = true; (t as any).redelivered = true; }
}
/** Re-applies persisted overrides to regenerated transactions. */
export function applyTxOverrides(recs: Record<string, any>) {
  for (const [id, rec] of Object.entries(recs ?? {})) { const t = txById(id); if (t) override(t, rec); else txOverrides[id] = rec; }
}
const delivered = (at = Date.now()) => ({ sourceStatus: "DLVD", errors: [], payloadVariants: ["ORIGINAL", "TRANSLATED"], lastModified: new Date(at + 80_000).toISOString(), statusHistory: ["Receive", "Check", "Transform", "Route", "Deliver"].map((step, i) => ({ step, status: "COMPLETED", at: new Date(at + i * 20_000).toISOString() })) });

// ---------------------------------------------------------------- CCPM data
const MONITOR_AGENTS = [
  { agentId: "nora", name: "Nora", job: "Conformance", description: "Validates individual transactions against rules." },
  { agentId: "lex", name: "Lex", job: "Timing and SLA", description: "Checks SLA policies across transaction types." },
  { agentId: "liz", name: "Liz", job: "Process", description: "Checks the business process sequence." },
  { agentId: "reese", name: "Reese", job: "Reconciliation", description: "Validates across documents." },
];
export const ccpmRules: any[] = [
  { ruleId: "R-LEX-01", agent: "lex", name: "PO acknowledgment within 24 hours", type: "ACK_WITHIN_HOURS", params: { documentType: "850", ackType: "997", hours: 24, gracePartners: { C20009: 12 } }, scope: "All X12 suppliers", expectedBehavior: "Each outbound 850 has an inbound 997 within 24 hours; Meridian has a 12-hour grace period.", referenceData: ["Approved partner list", "Grace periods"], budget: { monthlyUsd: 40, spentUsd: 18.2 }, status: "ACTIVE" },
  { ruleId: "R-LEX-02", agent: "lex", name: "PO response (855) within 48 hours", type: "ACK_WITHIN_HOURS", params: { documentType: "850", ackType: "855", hours: 48 }, scope: "Suppliers enrolled in PO response", expectedBehavior: "Each outbound 850 has an inbound 855 within 48 hours.", referenceData: ["Supplier acknowledgment terms"], budget: { monthlyUsd: 25, spentUsd: 25.4 }, status: "OVER_BUDGET" },
  { ruleId: "R-NORA-01", agent: "nora", name: "ASN ship-to resolvable", type: "XREF_RESOLVABLE", params: { documentType: "856", entity: "STORE_TO_GLN" }, scope: "Inbound 856", expectedBehavior: "Ship-to resolves to a GLN, directly or through STORE_TO_GLN.", referenceData: ["STORE_TO_GLN"], budget: { monthlyUsd: 30, spentUsd: 9.8 }, status: "ACTIVE" },
  { ruleId: "R-NORA-02", agent: "nora", name: "Invoice unit price format", type: "ERROR_CODE", params: { documentType: "810", code: "X12-SYN-104" }, scope: "Inbound 810", expectedBehavior: "IT104 uses a period decimal separator.", referenceData: ["HRG 810 guide v5"], budget: { monthlyUsd: 15, spentUsd: 3.1 }, status: "PAUSED" },
  { ruleId: "R-LIZ-01", agent: "liz", name: "Ship notice before invoice", type: "SEQUENCE", params: { first: "856", then: "810" }, scope: "Suppliers with ASN required", expectedBehavior: "The 856 for a PO arrives before its 810.", referenceData: ["Supplier profile: ASN required"], budget: { monthlyUsd: 20, spentUsd: 6.5 }, status: "ACTIVE" },
  { ruleId: "R-REESE-01", agent: "reese", name: "Invoice references a sent PO", type: "REFERENCE", params: { documentType: "810", references: "850" }, scope: "Inbound 810", expectedBehavior: "Each invoice PO number matches an outbound 850.", referenceData: ["Purchase order history"], budget: { monthlyUsd: 20, spentUsd: 7.7 }, status: "ACTIVE" },
];
export const findingState: Record<string, any> = {};

function evaluateRule(rule: any, windowMs = 7 * D) {
  const list = within(windowMs);
  const out: any[] = [];
  const now = Date.now();
  if (rule.type === "ACK_WITHIN_HOURS") {
    for (const t of list.filter((x) => x.documentType === rule.params.documentType && x.direction === "OUTBOUND")) {
      const hours = rule.params.gracePartners?.[t.partnerCompanyId] != null ? rule.params.hours + rule.params.gracePartners[t.partnerCompanyId] : rule.params.hours;
      const resp = rule.params.ackType === "997" ? ackOfT(t) : docFor(rule.params.ackType, t.refs.poNumber);
      const late = resp ? (resp._t - t._t) / H > hours : (now - t._t) / H > hours;
      if (late) out.push({ t, evidence: resp ? `${rule.params.ackType} received after ${round((resp._t - t._t) / H)} hours (limit ${hours})` : `No ${rule.params.ackType} after ${round((now - t._t) / H)} hours (limit ${hours})`, refData: rule.params.gracePartners?.[t.partnerCompanyId] ? `Grace period ${rule.params.gracePartners[t.partnerCompanyId]} hours applied` : "No grace period for this partner" });
    }
  } else if (rule.type === "XREF_RESOLVABLE") {
    for (const t of list.filter((x) => x.documentType === rule.params.documentType && x.refs.storeNumber)) {
      const has = !!(xrefEntities as any)[rule.params.entity]?.entries[t.refs.storeNumber!];
      if (!has) out.push({ t, evidence: `Ship-to store ${t.refs.storeNumber} (N103=92) has no entry in ${rule.params.entity}`, refData: `${rule.params.entity}: ${Object.keys((xrefEntities as any)[rule.params.entity].entries).length} entries checked` });
    }
  } else if (rule.type === "ERROR_CODE") {
    for (const t of list.filter((x) => x.documentType === rule.params.documentType && x.errors[0]?.code === rule.params.code)) out.push({ t, evidence: t.errors[0].message, refData: "HRG 810 guide v5: IT104 uses a period separator" });
  } else if (rule.type === "SEQUENCE") {
    for (const inv of list.filter((x) => x.documentType === rule.params.then)) {
      const first = [...docsFor(rule.params.first, inv.refs.poNumber)].sort((a, b) => a._t - b._t)[0];
      if (first && first._t > inv._t) out.push({ t: inv, evidence: `${rule.params.then} arrived ${round((first._t - inv._t) / H)} hours before its ${rule.params.first} (PO ${inv.refs.poNumber})`, refData: "Supplier profile: ASN required before receipt" });
    }
  } else if (rule.type === "REFERENCE") {
    for (const inv of list.filter((x) => x.documentType === rule.params.documentType)) {
      if (!docFor(rule.params.references, inv.refs.poNumber)) out.push({ t: inv, evidence: `PO ${inv.refs.poNumber} has no matching ${rule.params.references}`, refData: "Purchase order history, 6 months" });
    }
  }
  return out;
}

function findings() {
  const all: any[] = [];
  for (const r of ccpmRules.filter((x) => x.status !== "PAUSED" || true)) {
    for (const f of evaluateRule(r, 14 * D)) {
      const id = `F-${r.ruleId.split("-").slice(1).join("")}-${f.t.transactionId.slice(-5)}`;
      const st = findingState[id] ?? {};
      const agent = MONITOR_AGENTS.find((a) => a.agentId === r.agent)!;
      all.push({
        findingId: id, ruleId: r.ruleId, rule: r.name, agent: `${agent.name} (${agent.job})`, partner: partnerName(f.t.partnerCompanyId), partnerCompanyId: f.t.partnerCompanyId,
        transactionId: f.t.transactionId, documentType: f.t.documentType, businessKey: Object.values(f.t.keys)[0] ? (Object.values(f.t.keys)[0] as any).value : null,
        detectedAt: new Date(Math.min(Date.now(), f.t._t + 2 * H)).toISOString(), priority: r.agent === "lex" || r.agent === "nora" ? "HIGH" : "MEDIUM",
        status: st.status ?? (r.status === "PAUSED" ? "SUPPRESSED" : "NEW"), assignee: st.assignee ?? null, history: st.history ?? [],
        summary: f.evidence,
        chainOfReasoning: [
          { step: "Instruction", text: `${r.name}. ${r.expectedBehavior}` },
          { step: "Reference data consulted", text: f.refData },
          { step: "Evidence in the transaction", text: `${f.t.ediType} ${f.t.transactionId} from or to ${partnerName(f.t.partnerCompanyId)}, received ${f.t.receivedAt}. ${f.evidence}.` },
          { step: "Verdict", text: "Does not conform to the rule." },
        ],
      });
    }
  }
  return all.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}

/** Weekly PO acknowledgment trend: 997 receipt and 855 response tracked separately, with 855 response time. */
function ackTrend(id: string, weeks = 10) {
  const now = Date.now();
  const pos = within(weeks * 7 * D).filter((t) => t.partnerCompanyId === id && t.direction === "OUTBOUND" && t.documentType === "850");
  if (!pos.length) return [];
  const rows: any[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = now - w * 7 * D, start = end - 7 * D;
    const list = pos.filter((p) => p._t >= start && p._t < end);
    if (!list.length) continue;
    const settled = list.filter((p) => now - p._t > 96 * H);
    const lag = list.map((p) => { const r = docFor("855", p.refs.poNumber); return r ? (r._t - p._t) / H : null; }).filter((x) => x != null) as number[];
    const med = lag.length ? [...lag].sort((x, y) => x - y)[Math.floor(lag.length / 2)] : null;
    rows.push({ weekEnding: new Date(end).toISOString().slice(0, 10), posSent: list.length, functionalAck997Received: list.filter((p) => ackOfT(p)).length, poResponse855Received: list.filter((p) => docFor("855", p.refs.poNumber)).length, awaitingResponseUnder96h: list.length - settled.length, response855RatePct: settled.length ? Math.round((settled.filter((p) => docFor("855", p.refs.poNumber)).length / settled.length) * 100) : null, median855ResponseHours: med != null ? Math.round(med) : null });
  }
  return rows;
}
function scorecard(id: string) {
  const list = within(30 * D).filter((t) => t.partnerCompanyId === id);
  const pos = list.filter((t) => t.direction === "OUTBOUND" && (t.documentType === "850" || t.documentType === "ORDERS"));
  const ackHours = pos.map((p) => { const a = ackOfT(p); return a ? (a._t - p._t) / H : null; }).filter((x) => x != null) as number[];
  const missingAck = pos.filter((p) => !ackOfT(p) && Date.now() - p._t > 24 * H).length;
  const respHours = pos.map((p) => { const r = docFor("855", p.refs.poNumber); return r ? (r._t - p._t) / H : null; }).filter((x) => x != null) as number[];
  const inbound = list.filter((t) => t.direction === "INBOUND" && !isAck(t));
  const errRate = inbound.length ? inbound.filter((t) => t.sourceStatus === "FAIL").length / inbound.length : 0;
  const invoices = inbound.filter((t) => t.documentType === "810");
  const invBeforeAsn = invoices.filter((inv) => { const asn = docFor("856", inv.refs.poNumber); return asn && asn._t > inv._t; }).length;
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const score = (actual: number | null, target: number, worse: "higher" | "lower") => actual == null ? null : Math.max(0, Math.min(100, Math.round(worse === "higher" ? 100 - Math.max(0, (actual - target) / target) * 100 : 100 - Math.max(0, (target - actual) / target) * 100)));
  const ackAvg = avg(ackHours); const respAvg = avg(respHours);
  const kpis = [
    { kpi: "PO acknowledgment cycle time", category: "Order and fulfillment", actual: ackAvg == null ? null : round(ackAvg), unit: "hours", target: 4, weight: 0.3, score: score(ackAvg, 4, "higher") },
    { kpi: "PO acknowledgments missing after 24 hours", category: "Partner compliance", actual: missingAck, unit: "count", target: 0, weight: 0.2, score: missingAck === 0 ? 100 : Math.max(0, 100 - missingAck * 25) },
    { kpi: "PO response (855) cycle time", category: "Order and fulfillment", actual: respAvg == null ? null : round(respAvg), unit: "hours", target: 24, weight: 0.15, score: score(respAvg, 24, "higher") },
    { kpi: "Inbound document error rate", category: "EDI health", actual: round(errRate * 100), unit: "percent", target: 1, weight: 0.2, score: Math.max(0, Math.round(100 - Math.max(0, errRate * 100 - 1) * 15)) },
    { kpi: "Invoices received before ASN", category: "Invoicing and financial", actual: invBeforeAsn, unit: "count", target: 0, weight: 0.15, score: invBeforeAsn === 0 ? 100 : Math.max(0, 100 - invBeforeAsn * 30) },
  ];
  const scored = kpis.filter((k) => k.score != null);
  const wsum = scored.reduce((x, k) => x + k.weight, 0) || 1;
  const total = Math.round(scored.reduce((x, k) => x + (k.score as number) * k.weight, 0) / wsum);
  return { partnerCompanyId: id, partner: partnerName(id), period: "Last 30 days", weightedScore: total, kpis };
}

// ---------------------------------------------------------------- tools
const r = (product: string, op: string, ids?: string[]) => [{ product, operation: op, objectIds: ids }];
const WIN = { days: s.int("Window in days (default 30).") };

export const ccimTools: ToolDef[] = [
  { name: "ccim_get_daily_digest", domain: "Command Center Integration Monitor", product: CCIM, title: "Get daily digest", description: "Yesterday's transaction volume and errors for the top 10 partners, partners onboarded, anomalies detected and a document summary.", operation: "ccim.read", kind: "read", binding: "CCIM dashboard: daily digest", basis: BASIS_GA,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => {
      const day = within(24 * H).filter((t) => !isAck(t));
      const byP = count(day, (t) => t.partnerCompanyId);
      const errs = count(day.filter((t) => t.sourceStatus === "FAIL"), (t) => t.partnerCompanyId);
      const month = within(30 * D).filter((t) => !isAck(t));
      return ok(ctx, "ccim_get_daily_digest", "ccim.read", {
        window: "Last 24 hours", totals: { documents: day.length, failed: day.filter((t) => t.sourceStatus === "FAIL").length },
        topPartners: top(byP).map(([id, n]) => ({ partner: partnerName(id), volume: n, errors: errs[id] ?? 0 })),
        partnersOnboarded: tprs.filter((t) => Date.now() - Date.parse(t.activityLog.createTimeStamp) < 7 * D && t.status === "ACTIVE").map((t) => ({ partner: t.partnerTradingAddress.companyName, relationship: t.tradingPartnerRelationshipId, type: t.tprType })),
        anomaliesDetected: ANOMALIES().filter((a) => Date.now() - Date.parse(a.detectedAt) < 36 * H),
        documentSummary: { yesterday: top(count(day, (t) => t.documentType), 5), lastMonth: top(count(month, (t) => t.documentType), 5) },
      }, { sources: r(CCIM, "Daily digest"), freshnessSeconds: 900 });
    } },
  { name: "ccim_list_watchlists", domain: "Command Center Integration Monitor", product: CCIM, title: "List watchlists", description: "Watchlists with their metric, filter and whether anomaly detection is configured.", operation: "ccim.read", kind: "read", binding: "CCIM projections and anomalies: watchlists", basis: BASIS_GA,
    inputSchema: s.obj({}), handler: (_a, ctx) => ok(ctx, "ccim_list_watchlists", "ccim.read", { watchlists: WATCHLISTS }, { sources: r(CCIM, "Watchlists") }) },
  { name: "ccim_get_projection", domain: "Command Center Integration Monitor", product: CCIM, title: "Get projection", description: "Projected daily range for a watchlist over 7 or 30 days, recent actuals against the range, and the hourly activity heat map.", operation: "ccim.read", kind: "read", binding: "CCIM projections and hourly heat map", basis: BASIS_GA,
    inputSchema: s.obj({ watchlist_id: s.str("Watchlist ID, e.g. WL-01."), horizon_days: s.int("7 (default) or 30.") }, ["watchlist_id"]),
    handler: (a, ctx) => {
      const w = WATCHLISTS.find((x) => eq(x.watchlistId, a.watchlist_id)); if (!w) return fail(ctx, "ccim_get_projection", "ccim.read", "NOT_FOUND", "Watchlist not found.");
      const hist = daily(w, 28); const { mean, sd } = stats(hist.slice(0, 21)); const lo = Math.max(0, round(mean - 2 * sd)), hi = round(mean + 2 * sd);
      const recent = hist.slice(21).map((v, i) => ({ day: new Date(Date.now() - (7 - i) * D).toISOString().slice(0, 10), actual: v, withinRange: v >= lo && v <= hi }));
      const heat = Array.from({ length: 7 }, () => new Array(24).fill(0));
      for (const t of within(28 * D)) if (wlMatch(w, t)) { const d = new Date(t._t); heat[d.getUTCDay()][d.getUTCHours()]++; }
      const peak = heat.flatMap((row, di) => row.map((v, hr) => ({ day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][di], hourUtc: hr, count: v }))).sort((x, y) => y.count - x.count).slice(0, 5);
      return ok(ctx, "ccim_get_projection", "ccim.read", { watchlist: w.name, horizonDays: a.horizon_days === 30 ? 30 : 7, projectedDailyRange: { low: lo, high: hi, basis: "21 days, mean plus or minus 2 standard deviations" }, recent, peakHours: peak }, { sources: r(CCIM, `Projection ${w.watchlistId}`), freshnessSeconds: 900 });
    } },
  { name: "ccim_list_anomalies", domain: "Command Center Integration Monitor", product: CCIM, title: "List anomalies", description: "Volume spikes, drops and failed-transaction anomalies detected against projected ranges.", operation: "ccim.read", kind: "read", binding: "CCIM anomaly detection and failed-transaction anomalies", basis: BASIS_GA,
    inputSchema: s.obj({ type: s.str("SPIKE, DROP or FAILED."), ...WIN }),
    handler: (a, ctx) => { const from = Date.now() - (a.days ?? 30) * D; return ok(ctx, "ccim_list_anomalies", "ccim.read", { anomalies: ANOMALIES().filter((x) => Date.parse(x.detectedAt) >= from && (!a.type || eq(x.type, a.type))) }, { sources: r(CCIM, "Anomaly detection") }); } },
  { name: "ccim_get_transaction_volume", domain: "Command Center Integration Monitor", product: CCIM, title: "Get transaction volume", description: "Break volume down by document type, partner, EDI address, status or direction.", operation: "ccim.read", kind: "read", binding: "CCIM transaction volume analysis", basis: BASIS_GA,
    inputSchema: s.obj({ group_by: s.str("document_type, partner, edi_address, status or direction."), partner: s.str("Partner name or ID."), ...WIN }),
    handler: (a, ctx) => {
      const p = partnerArg(ctx, "ccim_get_transaction_volume", "ccim.read", a.partner); if (p.early) return p.early;
      const list = within((a.days ?? 30) * D).filter((t) => !isAck(t) && (!p.id || t.partnerCompanyId === p.id));
      const k = { document_type: (t: Tx) => t.documentType, partner: (t: Tx) => partnerName(t.partnerCompanyId), edi_address: (t: Tx) => (t.direction === "INBOUND" ? t.sender.tradingAddress : t.receiver.tradingAddress), status: (t: Tx) => t.sourceStatus, direction: (t: Tx) => t.direction }[(a.group_by ?? "document_type") as string] ?? ((t: Tx) => t.documentType);
      return ok(ctx, "ccim_get_transaction_volume", "ccim.read", { groupBy: a.group_by ?? "document_type", days: a.days ?? 30, total: list.length, groups: top(count(list, k), 50).map(([g, n]) => ({ group: g, count: n })) }, { sources: r(CCIM, "Transaction volume analysis") });
    } },
  { name: "ccim_list_trading_community", domain: "Command Center Integration Monitor", product: CCIM, title: "List trading community", description: "Every trading partner with status, last activity, 30-day volume and failure rate.", operation: "ccim.read", kind: "read", binding: "CCIM trading community", basis: BASIS_GA,
    inputSchema: s.obj({ status: s.str("ACTIVE or INACTIVE (no traffic in 30 days).") }),
    handler: (a, ctx) => { const rows = tradingPartners().map((c) => { const m = partnerMetrics(c.companyId); return { partnerCompanyId: c.companyId, partner: c.companyName, status: m.volume ? "ACTIVE" : "INACTIVE", lastActivity: m.lastActivity, volume30d: m.volume, failureRatePct: m.failureRate }; }).filter((x) => !a.status || eq(x.status, a.status)); return ok(ctx, "ccim_list_trading_community", "ccim.read", { partners: rows }, { sources: r(CCIM, "Trading community") }); } },
  { name: "ccim_get_partner_details", domain: "Command Center Integration Monitor", product: CCIM, title: "Get partner details", description: "One panel for a partner: addresses, document relationships, protocol, weekly volume trend and recent errors.", operation: "ccim.read", kind: "read", binding: "CCIM partner details panel", basis: BASIS_GA,
    inputSchema: s.obj({ partner: s.str("Partner name or ID.") }, ["partner"]),
    handler: (a, ctx) => {
      const p = partnerArg(ctx, "ccim_get_partner_details", "ccim.read", a.partner); if (p.early) return p.early;
      const id = p.id!; const m = partnerMetrics(id);
      const recent8 = within(56 * D).filter((t) => t.partnerCompanyId === id && !isAck(t)); const weeks = Array.from({ length: 8 }, (_, i) => { const end = Date.now() - i * 7 * D; return { weekEnding: new Date(end).toISOString().slice(0, 10), volume: recent8.filter((t) => t._t < end && t._t >= end - 7 * D).length }; }).reverse();
      return ok(ctx, "ccim_get_partner_details", "ccim.read", {
        partner: partnerName(id), ...m,
        addresses: addresses.filter((x) => x.companyId === id).map((x) => ({ address: `${x.qualifier}:${x.address}`, protocol: x.deliveryMethod })),
        documentRelationships: messagingTuples.filter((t: any) => t._partnerCompanyId === id).map((t: any) => ({ documentType: t.docType, direction: t.direction === "SENDER" ? "Outbound" : "Inbound", relationshipStatus: t._status })),
        weeklyVolume: weeks,
        recentErrors: within(60 * D).filter((t) => t.partnerCompanyId === id && t.sourceStatus === "FAIL").slice(0, 5).map((t) => ({ transactionId: t.transactionId, receivedAt: t.receivedAt, documentType: t.documentType, error: `${t.errors[0]?.code}: ${t.errors[0]?.message}` })),
      }, { sources: r(CCIM, "Partner details", [id]) });
    } },
  { name: "ccim_get_partner_stats", domain: "Command Center Integration Monitor", product: CCIM, title: "Get trading partner stats", description: "Community growth and the share of inactive partners by month.", operation: "ccim.read", kind: "read", binding: "CCIM trading partner stats", basis: BASIS_GA,
    inputSchema: s.obj({ months: s.int("Months (default 8, maximum 9).") }),
    handler: (a, ctx) => { const months = Math.min(a.months ?? 8, 9); const rows = Array.from({ length: months }, (_, i) => { const end = Date.now() - (months - 1 - i) * 30 * D; const members = tradingPartners().filter((c) => Date.parse(c.activityLog.createTimeStamp) <= end); const mk = new Date(end).toISOString().slice(0, 7); const active = members.filter((c) => partnerStats().get(c.companyId)?.months.has(mk)); return { month: new Date(end).toISOString().slice(0, 7), partners: members.length, active: active.length, inactive: members.length - active.length }; }); return ok(ctx, "ccim_get_partner_stats", "ccim.read", { series: rows }, { sources: r(CCIM, "Trading partner stats") }); } },
  { name: "ccim_get_document_type_analysis", domain: "Command Center Integration Monitor", product: CCIM, title: "Get document type analysis", description: "Which partners are configured for which documents and directions, when each last exchanged, and which are dormant beyond 180 days.", operation: "ccim.read", kind: "read", binding: "CCIM document type analysis", basis: BASIS_GA,
    inputSchema: s.obj({ partner: s.str("Partner name or ID."), dormant_days: s.int("Dormant threshold in days (default 180).") }),
    handler: (a, ctx) => {
      const p = partnerArg(ctx, "ccim_get_document_type_analysis", "ccim.read", a.partner); if (p.early) return p.early;
      const th = (a.dormant_days ?? 180) * D;
      const latest = new Map<string, Tx>();
      for (const x of prod()) { const k = `${x.partnerCompanyId}|${x.documentType}|${x.direction}`; if (!latest.has(k)) latest.set(k, x); }
      const rows = messagingTuples.filter((t: any) => !p.id || t._partnerCompanyId === p.id).map((t: any) => {
        const dir = t.direction === "SENDER" ? "OUTBOUND" : "INBOUND";
        const last = latest.get(`${t._partnerCompanyId}|${t.docType}|${dir}`);
        return { partner: partnerName(t._partnerCompanyId), documentType: t.docType, direction: dir, configured: t._status, lastExchanged: last?.receivedAt ?? null, dormant: !last || Date.now() - last._t > th };
      });
      return ok(ctx, "ccim_get_document_type_analysis", "ccim.read", { dormantThresholdDays: a.dormant_days ?? 180, rows, dormantCount: rows.filter((x) => x.dormant).length }, { sources: r(CCIM, "Document type analysis"), interpretation: "Configured relationships are not proof of traffic. Search history covers 6 months." });
    } },
  { name: "ccim_get_partner_integration_analysis", domain: "Command Center Integration Monitor", product: CCIM, title: "Get partner integration analysis", description: "Partners grouped by communication protocol, with volume, failure rate and delivery failures.", operation: "ccim.read", kind: "read", binding: "CCIM partner integration analysis", basis: BASIS_GA,
    inputSchema: s.obj({ ...WIN }),
    handler: (a, ctx) => { const days = a.days ?? 30; const groups: Record<string, any> = {}; for (const c of tradingPartners()) { const addr = addresses.find((x) => x.companyId === c.companyId); const proto = addr?.deliveryMethod ?? "NONE"; const m = partnerMetrics(c.companyId, days); const del = partnerStats().get(c.companyId)?.delivery30 ?? 0; (groups[proto] ??= { protocol: proto, partners: [] }).partners.push({ partner: c.companyName, volume: m.volume, failureRatePct: m.failureRate, deliveryFailures: del }); } return ok(ctx, "ccim_get_partner_integration_analysis", "ccim.read", { days, groups: Object.values(groups) }, { sources: r(CCIM, "Partner integration analysis") }); } },
  { name: "ccim_get_network_graph", domain: "Command Center Integration Monitor", product: CCIM, title: "Get network graph", description: "Trading community grouped into 30-day volume bands for drill-down.", operation: "ccim.read", kind: "read", binding: "CCIM network graph", basis: BASIS_GA,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => { const bands = [["No traffic", 0, 0], ["1 to 30", 1, 30], ["31 to 60", 31, 60], ["Over 60", 61, 1e9]] as const; const ps = tradingPartners().map((c) => ({ partner: c.companyName, volume30d: partnerMetrics(c.companyId).volume })); return ok(ctx, "ccim_get_network_graph", "ccim.read", { bands: bands.map(([label, lo, hi]) => ({ band: label, partners: ps.filter((x) => x.volume30d >= lo && x.volume30d <= hi) })) }, { sources: r(CCIM, "Network graph") }); } },
];

export const tgiAppTools: ToolDef[] = [
  { name: "tgi_get_compliance_violations", domain: "Trading Grid Intelligence", product: "Trading Grid Intelligence: Deductions Management", title: "Get vendor compliance violations and chargebacks", description: "Trading Grid Intelligence Deductions Management: vendor compliance violations captured from EDI activity, the flat chargeback per violation from Harborview's deduction schedule, exemptions, and deduction status. Optionally limited to a list of PO numbers.", operation: "transaction.read", kind: "read", binding: "TGI Deductions Management violation capture", basis: BASIS_GA,
    inputSchema: s.obj({ partner: s.str("Vendor name or ID."), days: s.int("Days back by PO date (default 14, max 90).", { minimum: 1, maximum: 90 }), po_numbers: s.arr(s.str("PO number"), "Limit to these purchase orders (for example the POs on the user's screen).") }, ["partner"]),
    handler: (a, ctx) => {
      const p = partnerArg(ctx, "tgi_get_compliance_violations", "transaction.read", a.partner); if (p.early) return p.early;
      const days = Math.min(90, Math.max(1, Number(a.days) || 14));
      const only = new Set<string>((a.po_numbers ?? []).map(String));
      const SCHEDULE = [{ violation: "PO acknowledgment (855) late or missing", rule: "855 not received within 24 hours of the PO", chargebackPerPo: 50 }, { violation: "Advance ship notice (856) after invoice", rule: "810 received before the 856", chargebackPerPo: 75 }, { violation: "Advance ship notice (856) missing", rule: "No 856 within 48 hours of shipment", chargebackPerPo: 100 }];
      const prof = companyById(p.id!) ; const goLive = transactions.filter((t) => t.partnerCompanyId === p.id && t.environment === "PRODUCTION").reduce((m, t) => Math.min(m, t._t), Date.now());
      const exemptUntil = goLive + 30 * D;
      const pos = within(days * D).filter((t) => t.partnerCompanyId === p.id && t.direction === "OUTBOUND" && t.documentType === "850" && (!only.size || only.has(t.refs.poNumber ?? "")));
      const rows: any[] = [];
      for (const po of pos) {
        if (po._t < exemptUntil || Date.now() - po._t < 24 * H) continue;
        const ack = docsByPo(po.refs.poNumber!).find((d) => d.partnerCompanyId === p.id && d.documentType === "855" && d.sourceStatus === "DLVD");
        const lagH = ack ? (ack._t - po._t) / H : null;
        if (lagH != null && lagH <= 24) continue;
        const ageDays = (Date.now() - po._t) / D;
        rows.push({ po: po.refs.poNumber, orderedAt: new Date(po._t).toISOString(), violation: SCHEDULE[0].violation, detail: ack ? `855 received after ${Math.round(lagH!)} hours` : "855 not received", chargeback: 50, status: ageDays > 5 ? "Approved, deducts on next 820 remittance" : "Pending supplier review", violationId: `VIO-${po.refs.poNumber!.slice(-6)}` });
      }
      rows.sort((x, y) => y.orderedAt.localeCompare(x.orderedAt));
      const byStatus: Record<string, number> = {}; for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      return ok(ctx, "tgi_get_compliance_violations", "transaction.read", { vendor: prof?.companyName, deductionSchedule: SCHEDULE, chargebackBasis: "Flat amount per PO per violation, regardless of order value", newVendorExemption: { days: 30, ended: new Date(exemptUntil).toISOString().slice(0, 10) }, purchaseOrdersChecked: pos.length, violations: rows.length, chargebackTotal: rows.reduce((x, r) => x + r.chargeback, 0), currency: "USD", byStatus, rows: rows.slice(0, 60) },
        { sources: [{ product: "Trading Grid Intelligence: Deductions Management", operation: "Violation capture and deduction schedule" }], interpretation: "Violations are captured automatically from EDI timing. Chargebacks are flat per PO; order value does not change the amount." });
    } },
  { name: "tgi_get_shipment_reconciliation", domain: "TG Insights application", product: TGI, title: "Get 3PL shipment reconciliation", description: "For a 3PL (default Crestline Logistics): each 940 warehouse shipping order matched to its 945 warehouse shipping advice, with ordered and shipped quantities, short shipments by store, and orders still waiting for a 945. Window by 945 arrival day.", operation: "transaction.read", kind: "read", binding: "TG Insights document correlation by shipping order", basis: BASIS_GA,
    inputSchema: s.obj({ days: s.int("Days back, by 945 arrival. 1 = yesterday only (default 1, max 30).", { minimum: 1, maximum: 30 }), partner: s.str("3PL name or ID (default Crestline Logistics).") }),
    handler: (a, ctx) => {
      const p = partnerArg(ctx, "tgi_get_shipment_reconciliation", "transaction.read", a.partner ?? "Crestline Logistics"); if (p.early) return p.early;
      const days = Math.min(30, Math.max(1, Number(a.days) || 1));
      const today = new Date(); today.setUTCHours(0, 0, 0, 0);
      const from = today.getTime() - days * D, to = days === 1 ? today.getTime() : Date.now();
      const glnStore = new Map(STORE_LIST.map((x) => [x.gln, `${x.number} ${x.name}`]));
      const adv = within(days * D + 2 * D).filter((t) => t.partnerCompanyId === p.id && t.documentType === "945" && t._t >= from && t._t < to);
      const rows = adv.map((t) => { const o = docsByKey(t.refs.shippingOrder!).find((x) => x.documentType === "940"); const ordered = o?.refs.quantityOrdered ?? t.refs.quantityOrdered ?? null, shipped = t.refs.quantityShipped ?? null;
        return { shippingOrder: t.refs.shippingOrder, po: t.refs.poNumber, store: glnStore.get(o?.refs.shipToGLN ?? "") ?? o?.refs.shipToGLN ?? null, ordered, shipped, short: ordered != null && shipped != null ? Math.max(0, ordered - shipped) : null, reason: t.refs.reason ?? null, receivedAt: new Date(t._t).toISOString(), documents: { "940": o?.transactionId ?? null, "945": t.transactionId } }; });
      const short = rows.filter((r) => (r.short ?? 0) > 0);
      const pending = within(5 * D).filter((t) => t.partnerCompanyId === p.id && t.documentType === "940" && t.sourceStatus === "DLVD" && Date.now() - t._t > 48 * H && !docsByKey(t.refs.shippingOrder!).some((x) => x.documentType === "945")).map((t) => ({ shippingOrder: t.refs.shippingOrder, sentAt: new Date(t._t).toISOString(), transactionId: t.transactionId }));
      return ok(ctx, "tgi_get_shipment_reconciliation", "transaction.read", { partner: companyById(p.id!)?.companyName, window: { from: new Date(from).toISOString().slice(0, 10), to: new Date(to - 1).toISOString().slice(0, 10), days }, confirmations945: rows.length, shippedComplete: rows.length - short.length, shortShipped: short.length, unitsOrdered: rows.reduce((x, r) => x + (r.ordered ?? 0), 0), unitsShipped: rows.reduce((x, r) => x + (r.shipped ?? 0), 0), shortOrders: short, awaiting945: pending.slice(0, 20) },
        { sources: r(TGI, "Transactions correlated by shipping order (940, 945)"), interpretation: "940 = warehouse shipping order Harborview sends; 945 = warehouse shipping advice the 3PL returns after shipping. Quantities are order totals." });
    } },
  { name: "tgi_get_quantity_reconciliation", domain: "TG Insights application", product: TGI, title: "Get quantity reconciliation", description: "Per purchase order: ordered quantity (850), shipped quantity (856) and invoiced quantity (810), with variances, invoices received before the ASN, invoices with no ASN, and the document IDs for drill-down. Supplier totals included; for one supplier, a weekly roll-up too.", operation: "transaction.read", kind: "read", binding: "TG Insights document correlation by PO", basis: BASIS_GA,
    inputSchema: s.obj({ days: s.int("Look-back window in days (default 30, max 90).", { minimum: 1, maximum: 90 }), partner: s.str("Supplier name or ID."), only_exceptions: s.bool("Return only POs with a variance or an invoice before the ASN (default true).") }),
    handler: (a, ctx) => {
      const p = partnerArg(ctx, "tgi_get_quantity_reconciliation", "transaction.read", a.partner); if (p.early) return p.early;
      const days = Math.min(90, Math.max(1, Number(a.days) || 30));
      const onlyEx = a.only_exceptions !== false;
      const pos = within(days * D).filter((t) => t.direction === "OUTBOUND" && t.documentType === "850" && t.refs.quantityOrdered != null && (!p.id || t.partnerCompanyId === p.id));
      const sup: Record<string, any> = {};
      const rows: any[] = [];
      const weeks: Record<string, any> = {};
      for (const po of pos) {
        const docs = docsByPo(po.refs.poNumber!).filter((d) => d.partnerCompanyId === po.partnerCompanyId);
        const asn = docs.find((d) => d.documentType === "856"), inv = docs.find((d) => d.documentType === "810");
        const ordered = po.refs.quantityOrdered!, shipped = asn?.refs.quantityShipped ?? null, invoiced = inv?.refs.quantityInvoiced ?? null;
        const noAsn = !!(inv && !asn && Date.now() - inv._t > 6 * H);
        const before = !!(asn && inv && inv._t < asn._t);
        const name = companyById(po.partnerCompanyId)?.companyName ?? po.partnerCompanyId;
        const s0 = (sup[name] ??= { supplier: name, purchaseOrders: 0, ordered: 0, shipped: 0, invoiced: 0, shortShipped: 0, overInvoiced: 0, invoiceBeforeAsn: 0, invoiceWithoutAsn: 0 });
        s0.purchaseOrders++; s0.ordered += ordered; s0.shipped += shipped ?? 0; s0.invoiced += invoiced ?? 0;
        const short = shipped != null && shipped < ordered, over = invoiced != null && shipped != null && invoiced > shipped;
        if (short) s0.shortShipped++; if (over) s0.overInvoiced++; if (before) s0.invoiceBeforeAsn++; if (noAsn) s0.invoiceWithoutAsn++;
        const wk = new Date(po._t - ((new Date(po._t).getUTCDay() + 6) % 7) * D).toISOString().slice(0, 10);
        const w0 = (weeks[wk] ??= { weekOf: wk, purchaseOrders: 0, ordered: 0, shipped: 0, invoiced: 0, shortShipped: 0, overInvoiced: 0, invoiceBeforeAsn: 0, invoiceWithoutAsn: 0 });
        w0.purchaseOrders++; w0.ordered += ordered; w0.shipped += shipped ?? 0; w0.invoiced += invoiced ?? 0; if (short) w0.shortShipped++; if (over) w0.overInvoiced++; if (before) w0.invoiceBeforeAsn++; if (noAsn) w0.invoiceWithoutAsn++;
        if (onlyEx && !short && !over && !before && !noAsn) continue;
        rows.push({ po: po.refs.poNumber, supplier: name, orderedAt: new Date(po._t).toISOString(), ordered, shipped, invoiced, shipVariance: shipped == null ? null : shipped - ordered, invoiceVariance: invoiced == null || shipped == null ? null : invoiced - shipped, invoiceBeforeAsn: before, invoiceWithoutAsn: noAsn, invoiceAt: inv ? new Date(inv._t).toISOString() : null, invoiceNumber: inv?.refs.invoiceNumber ?? null,
          documents: { "850": po.transactionId, "856": asn?.transactionId ?? null, "810": inv?.transactionId ?? null }, status: { "856": asn?.sourceStatus ?? "NOT_RECEIVED", "810": inv?.sourceStatus ?? "NOT_RECEIVED" } });
      }
      rows.sort((x, y) => y.orderedAt.localeCompare(x.orderedAt));
      return ok(ctx, "tgi_get_quantity_reconciliation", "transaction.read", { window: { days }, purchaseOrders: pos.length, exceptions: rows.length, suppliers: Object.values(sup).sort((x: any, y: any) => y.purchaseOrders - x.purchaseOrders), ...(p.id ? { weekly: Object.values(weeks).sort((x: any, y: any) => x.weekOf.localeCompare(y.weekOf)) } : {}), rows: rows.slice(0, 80) },
        { sources: r(TGI, "Transactions correlated by PO number (850, 856, 810)"), interpretation: "Quantities are document totals. A missing 856 or 810 is not yet received, not a zero quantity. invoiceWithoutAsn: invoice received more than 6 hours ago with no ASN for the PO. Rows are limited to 80; supplier totals cover every PO in the window." });
    } },
  { name: "tgi_get_dashboard", domain: "TG Insights application", product: TGI, title: "Get dashboard", description: "The EDI operations dashboard: partner volumes, critical errors, recent alerts and saved filters.", operation: "tgi.read", kind: "read", binding: "TG Insights configurable dashboards", basis: BASIS_GA,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => { const day = within(24 * H); return ok(ctx, "tgi_get_dashboard", "tgi.read", { dashboard: "EDI operations", widgets: [{ widget: "Volume by partner, 24 hours", data: top(count(day.filter((t) => !isAck(t)), (t) => partnerName(t.partnerCompanyId)), 10) }, { widget: "Critical errors, 24 hours", data: day.filter((t) => t.sourceStatus === "FAIL").map((t) => ({ transactionId: t.transactionId, partner: partnerName(t.partnerCompanyId), documentType: t.documentType, error: t.errors[0]?.code })) }, { widget: "Recent alerts", data: alertRules.map((x) => ({ alert: x.name, lastTriggered: x.lastTriggered })) }, { widget: "Saved filters", data: SAVED_FILTERS.map((f) => f.name) }] }, { sources: r(TGI, "Dashboards") }); } },
  { name: "tgi_list_saved_filters", domain: "TG Insights application", product: TGI, title: "List saved filters", description: "Saved searches that alerts and reports are built on.", operation: "tgi.read", kind: "read", binding: "TG Insights saved filters", basis: BASIS_GA,
    inputSchema: s.obj({}), handler: (_a, ctx) => ok(ctx, "tgi_list_saved_filters", "tgi.read", { savedFilters: SAVED_FILTERS }, { sources: r(TGI, "Saved filters") }) },
  { name: "tgi_list_alert_rules", domain: "TG Insights application", product: TGI, title: "List alert rules", description: "Self-service email alerts built on saved filters.", operation: "tgi.read", kind: "read", binding: "TG Insights self-service alerts", basis: BASIS_GA,
    inputSchema: s.obj({}), handler: (_a, ctx) => ok(ctx, "tgi_list_alert_rules", "tgi.read", { alertRules }, { sources: r(TGI, "Alert rules") }) },
  { name: "tgi_create_alert_rule", domain: "TG Insights application", product: TGI, title: "Create alert rule", description: "Turn a saved filter into an email alert.", operation: "tgi.configure", kind: "write", binding: "TG Insights self-service alerts", basis: BASIS_GA,
    inputSchema: s.obj({ name: s.str("Alert name."), filter_id: s.str("Saved filter ID."), recipients: s.arr(s.str("Email"), "Recipients."), frequency: s.str("IMMEDIATE, HOURLY or DAILY.") }, ["name", "filter_id", "recipients"]),
    handler: (a, ctx) => { if (!SAVED_FILTERS.some((f) => eq(f.filterId, a.filter_id))) return fail(ctx, "tgi_create_alert_rule", "tgi.configure", "NOT_FOUND", "Saved filter not found."); const al = { alertId: `AL-${String(alertRules.length + 1).padStart(2, "0")}`, name: a.name, filterId: a.filter_id.toUpperCase(), recipients: a.recipients, frequency: (a.frequency ?? "IMMEDIATE").toUpperCase(), status: "ACTIVE", lastTriggered: null }; alertRules.push(al); return ok(ctx, "tgi_create_alert_rule", "tgi.configure", al, { sources: r(TGI, "Alert rules", [al.alertId]) }); } },
  { name: "tgi_list_report_rules", domain: "TG Insights application", product: TGI, title: "List report rules", description: "Scheduled transaction reports built on saved filters.", operation: "tgi.read", kind: "read", binding: "TG Insights self-service reports", basis: BASIS_GA,
    inputSchema: s.obj({}), handler: (_a, ctx) => ok(ctx, "tgi_list_report_rules", "tgi.read", { reportRules: REPORT_RULES }, { sources: r(TGI, "Report rules") }) },
  { name: "tgi_get_facets", domain: "TG Insights application", product: TGI, title: "Get facets", description: "Narrow-by counts: delivery status, acknowledgment status, redelivered status and error type.", operation: "tgi.read", kind: "read", binding: "TG Insights transaction search facets", basis: BASIS_GA,
    inputSchema: s.obj({ ...WIN }),
    handler: (a, ctx) => { const list = within((a.days ?? 7) * D).filter((t) => !isAck(t)); const fa = (t: Tx) => { const k = ackOfT(t); return k ? k.ack?.status ?? "ACCEPTED" : Date.now() - t._t > 24 * H ? "MISSING_OVERDUE" : "PENDING"; }; return ok(ctx, "tgi_get_facets", "tgi.read", { days: a.days ?? 7, deliveryStatus: count(list, (t) => t.sourceStatus), acknowledgmentStatus: count(list, fa), redelivered: count(list, (t) => ((t as any).redelivered ? "REDELIVERED" : "NOT_REDELIVERED")), errorType: count(list.filter((t) => t.errors.length), (t) => t.errors[0].category) }, { sources: r(TGI, "Facets") }); } },
  { name: "tgi_get_processing_flow", domain: "TG Insights application", product: TGI, title: "Get processing flow", description: "Each processing step between sender and receiver for one transaction, with the service that ran it.", operation: "tgi.read", kind: "read", binding: "TG Insights processing flow", basis: BASIS_GA,
    inputSchema: s.obj({ transaction_id: s.str("Transaction ID.") }, ["transaction_id"]),
    handler: (a, ctx) => { const t = txById(a.transaction_id); if (!t || !scopeFilter(t.partnerCompanyId)) return fail(ctx, "tgi_get_processing_flow", "tgi.read", "NOT_FOUND", "Transaction not found."); const svc: Record<string, string> = { Receive: `Communications gateway (${t.direction === "INBOUND" ? "partner" : "ERP"} inbound)`, Check: "EDI validation", Transform: t.mapId ? `Translation, map ${t.mapId}` : "Translation", Route: "Orchestration engine", Deliver: `Delivery to ${t.receiver.companyName}` }; return ok(ctx, "tgi_get_processing_flow", "tgi.read", { transactionId: t.transactionId, steps: t.statusHistory.map((h) => ({ ...h, service: svc[h.step], error: h.status === "FAILED" ? t.errors[0] : undefined })) }, { sources: r(TGI, "Processing flow", [t.transactionId]) }); } },
  { name: "tgi_get_business_document", domain: "TG Insights application", product: TGI, title: "Get business document", description: "Read an EDI document as a business document: header references, parties and line items.", operation: "transaction.payload.read", kind: "read", binding: "TG Insights business document viewer", basis: BASIS_GA,
    inputSchema: s.obj({ transaction_id: s.str("Transaction ID.") }, ["transaction_id"]),
    handler: (a, ctx) => { const t = txById(a.transaction_id); if (!t || !scopeFilter(t.partnerCompanyId)) return fail(ctx, "tgi_get_business_document", "transaction.payload.read", "NOT_FOUND", "Transaction not found."); const title: Record<string, string> = { "850": "Purchase order", "855": "Purchase order acknowledgment", "856": "Advance ship notice", "810": "Invoice", "997": "Functional acknowledgment", ORDERS: "Purchase order", DESADV: "Despatch advice", INVOIC: "Invoice", CONTRL: "Syntax acknowledgment" }; return ok(ctx, "tgi_get_business_document", "transaction.payload.read", { document: title[t.documentType] ?? t.documentType, standard: `${t.standard} ${t.version}`, from: t.sender.companyName, to: t.receiver.companyName, references: t.refs, shipTo: t.refs.shipToGLN ? { gln: t.refs.shipToGLN } : t.refs.storeNumber ? { storeNumber: t.refs.storeNumber, note: "Store number only (N103=92); GLN resolved by the map." } : null, lines: ["850", "856", "810", "ORDERS", "DESADV", "INVOIC"].includes(t.documentType) ? [{ line: 1, upc: "012345678905", sku: "HRG-118204", description: "Ceramic mug set, 4 pc", quantity: 24, uom: "EA", unitPrice: t.errors[0]?.code === "X12-SYN-104" ? "12,40 (invalid format)" : 12.4 }] : [] }, { sources: r(TGI, "Business document viewer", [t.transactionId]) }); } },
  { name: "tgi_list_redelivery_rules", domain: "TG Insights application", product: TGI, title: "List automated redelivery rules", description: "Aviator-powered rules that match delivery errors and redeliver automatically.", operation: "tgi.read", kind: "read", binding: "TG Insights automated redelivery (powered by Aviator)", basis: BASIS_GA,
    inputSchema: s.obj({}), handler: (_a, ctx) => ok(ctx, "tgi_list_redelivery_rules", "tgi.read", { rules: REDELIVERY_RULES }, { sources: r(TGI, "Automated redelivery") }) },
  { name: "tgi_redeliver_transactions", domain: "TG Insights application", product: TGI, title: "Redeliver transactions", description: "Resend up to 30 transactions that failed delivery. First call returns a plan for approval; call again with plan_id.", operation: "tgi.redeliver", kind: "write", binding: "TG Insights bulk redelivery", basis: BASIS_GA,
    inputSchema: s.obj({ transaction_ids: s.arr(s.str("Transaction ID"), "Up to 30 transactions."), plan_id: s.str("Approved plan ID (second call).") }),
    handler: (a, ctx) => {
      if (!a.plan_id) {
        const ids: string[] = a.transaction_ids ?? []; if (!ids.length || ids.length > 30) return fail(ctx, "tgi_redeliver_transactions", "tgi.redeliver", "INVALID_INPUT", "Provide 1 to 30 transaction IDs.");
        const checks = ids.map((id) => { const t = txById(id); const eligible = !!t && t.sourceStatus === "FAIL" && t.errors[0]?.category === "DELIVERY"; return { check: `${id} eligible for redelivery`, result: eligible ? "PASS" : "FAIL", detail: !t ? "Not found" : eligible ? "Failed at delivery" : `Failed at ${t.errors[0]?.step ?? t.sourceStatus}; use reprocess or fix configuration` }; });
        if (!checks.some((c) => c.result === "PASS")) return fail(ctx, "tgi_redeliver_transactions", "tgi.redeliver", "VALIDATION_FAILED", "No transaction is eligible for redelivery.", { checks });
        const p = createPlan(ctx, "tgi_redeliver_transactions", "tgi.redeliver", `${ids.length} transaction(s)`, `Redeliver ${checks.filter((c) => c.result === "PASS").length} failed deliveries`, { transactionIds: ids.filter((_, i) => checks[i].result === "PASS") }, { valid: true, checks });
        return approvalRequired(ctx, "tgi_redeliver_transactions", "tgi.redeliver", p, r(TGI, "Bulk redelivery validation"));
      }
      const c = consumePlan(ctx, a.plan_id, "tgi_redeliver_transactions"); if (c.problem) return fail(ctx, "tgi_redeliver_transactions", "tgi.redeliver", "PLAN_INVALID", c.problem);
      const downNow = partnersDown();
      const results = c.plan!.parameters.transactionIds.map((id: string) => { const t = txById(id)!; const down = downNow.includes(t.partnerCompanyId); override(t, down ? { redelivered: true } : { redelivered: true, o: delivered() }); return { transactionId: id, result: down ? "QUEUED" : "REDELIVERED", detail: down ? "Partner endpoint still reports DOWN; redelivery queued until it recovers." : "Redelivered and delivered to the partner." }; });
      c.plan!.status = "EXECUTED";
      return ok(ctx, "tgi_redeliver_transactions", "tgi.redeliver", { planId: c.plan!.planId, results }, { sources: r(TGI, "Bulk redelivery") });
    } },
  { name: "tgi_reprocess_transaction", domain: "TG Insights application", product: TGI, title: "Reprocess transaction", description: "Run a failed file through processing again. First call returns a plan for approval; call again with plan_id. Succeeds only if the cause has been fixed.", operation: "tgi.redeliver", kind: "write", binding: "TG Insights reprocess", basis: BASIS_GA,
    inputSchema: s.obj({ transaction_id: s.str("Transaction ID."), plan_id: s.str("Approved plan ID (second call).") }),
    handler: (a, ctx) => {
      if (!a.plan_id) {
        const t = txById(a.transaction_id); if (!t || !scopeFilter(t.partnerCompanyId)) return fail(ctx, "tgi_reprocess_transaction", "tgi.redeliver", "NOT_FOUND", "Transaction not found.");
        if (t.sourceStatus !== "FAIL" || !["Check", "Transform"].includes(t.errors[0]?.step)) return fail(ctx, "tgi_reprocess_transaction", "tgi.redeliver", "NOT_ELIGIBLE", "Only files that failed in validation or translation can be reprocessed.");
        const p = createPlan(ctx, "tgi_reprocess_transaction", "tgi.redeliver", t.transactionId, `Reprocess ${t.ediType} ${t.transactionId}`, { transactionId: t.transactionId });
        return approvalRequired(ctx, "tgi_reprocess_transaction", "tgi.redeliver", p, r(TGI, "Reprocess validation", [t.transactionId]));
      }
      const c = consumePlan(ctx, a.plan_id, "tgi_reprocess_transaction"); if (c.problem) return fail(ctx, "tgi_reprocess_transaction", "tgi.redeliver", "PLAN_INVALID", c.problem);
      const t = txById(c.plan!.parameters.transactionId)!; c.plan!.status = "EXECUTED";
      const e = t.errors[0];
      const xr = (xrefEntities as any);
      let fix: { refs?: any; detail: string } | null = null;
      if (e?.code === "XREF-404" && t.refs.storeNumber && xr.STORE_TO_GLN.entries[t.refs.storeNumber]) fix = { refs: { shipToGLN: xr.STORE_TO_GLN.entries[t.refs.storeNumber].gln }, detail: `Ship-to store ${t.refs.storeNumber} resolved to GLN ${xr.STORE_TO_GLN.entries[t.refs.storeNumber].gln}; delivered to Harborview.` };
      else if (e?.code === "XREF-404" && t.refs.statusCode && xr.CARRIER_STATUS_CODE?.entries[t.refs.statusCode]) fix = { detail: `Status code ${t.refs.statusCode} resolved; delivered to Harborview.` };
      else if (e?.code === "XREF-404" && /ITEM_UPC_TO_SKU/.test(e.message)) { const upc = e.message.match(/key '(\d+)'/)?.[1]; const hit = upc && xr.ITEM_UPC_TO_SKU?.entries[upc]; if (hit) fix = { detail: `UPC ${upc} resolved to SKU ${hit.sku}; delivered to Harborview.` }; }
      else if (e?.code === "MAP-TRN-207" && !incidentAt(t.partnerCompanyId, "MAP_REGRESSION", Date.now())) fix = { detail: "Map version corrected; translation completed and delivered." };
      if (!fix) return ok(ctx, "tgi_reprocess_transaction", "tgi.redeliver", { transactionId: t.transactionId, result: "FAILED_AGAIN", error: e }, { sources: r(TGI, "Reprocess", [t.transactionId]), interpretation: e?.category === "VALIDATION" ? "The document itself is invalid. The partner must correct and resend it." : "The cause is still present. Fix it, then reprocess again." });
      override(t, { refs: fix.refs, o: { ...delivered(), reprocessed: true } });
      return ok(ctx, "tgi_reprocess_transaction", "tgi.redeliver", { transactionId: t.transactionId, result: "DELIVERED", detail: fix.detail }, { sources: r(TGI, "Reprocess", [t.transactionId]) });
    } },
];

const ccpmFinding = (id: string) => findings().find((f) => eq(f.findingId, id));
export const ccpmTools: ToolDef[] = [
  { name: "ccpm_list_monitor_agents", domain: "Command Center Performance Monitor", product: CCPM, title: "List monitor agents", description: "Nora (conformance), Lex (timing and SLA), Liz (process) and Reese (reconciliation), with rules, inspections, findings and cost.", operation: "ccpm.read", kind: "read", binding: "CCPM agents", basis: BASIS_INC,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => { const fs = findings(); return ok(ctx, "ccpm_list_monitor_agents", "ccpm.read", { agents: MONITOR_AGENTS.map((m) => { const rules = ccpmRules.filter((x) => x.agent === m.agentId); return { ...m, rules: rules.length, inspections30d: rules.length * 412, findingsOpen: fs.filter((f) => f.agent.startsWith(m.name) && ["NEW", "ASSIGNED"].includes(f.status)).length, runningCostUsd: round(rules.reduce((x, y) => x + y.budget.spentUsd, 0), 2) }; }) }, { sources: r(CCPM, "Agents") }); } },
  { name: "ccpm_list_rules", domain: "Command Center Performance Monitor", product: CCPM, title: "List rules", description: "Monitoring rules grouped by agent with conformance, findings and status (active, over budget or paused).", operation: "ccpm.read", kind: "read", binding: "CCPM rules", basis: BASIS_INC,
    inputSchema: s.obj({ agent: s.str("nora, lex, liz or reese.") }),
    handler: (a, ctx) => { const fs = findings(); return ok(ctx, "ccpm_list_rules", "ccpm.read", { rules: ccpmRules.filter((x) => !a.agent || eq(x.agent, a.agent)).map((x) => { const n = fs.filter((f) => f.ruleId === x.ruleId).length; const inspected = Math.max(n, 60); return { ruleId: x.ruleId, agent: x.agent, name: x.name, status: x.status, findings14d: n, conformancePct: round(100 - (n / inspected) * 100), budget: x.budget }; }) }, { sources: r(CCPM, "Rules") }); } },
  { name: "ccpm_get_rule", domain: "Command Center Performance Monitor", product: CCPM, title: "Get rule", description: "A rule's scope, expected behavior, reference data, parameters and budget.", operation: "ccpm.read", kind: "read", binding: "CCPM rule detail", basis: BASIS_INC,
    inputSchema: s.obj({ rule_id: s.str("Rule ID.") }, ["rule_id"]),
    handler: (a, ctx) => { const x = ccpmRules.find((y) => eq(y.ruleId, a.rule_id)); return x ? ok(ctx, "ccpm_get_rule", "ccpm.read", x, { sources: r(CCPM, "Rule", [x.ruleId]) }) : fail(ctx, "ccpm_get_rule", "ccpm.read", "NOT_FOUND", "Rule not found."); } },
  { name: "ccpm_test_rule", domain: "Command Center Performance Monitor", product: CCPM, title: "Test rule", description: "Test an existing rule or a draft definition against existing transactions and return the matches it would raise.", operation: "ccpm.read", kind: "read", binding: "CCPM rule wizard: test", basis: BASIS_INC,
    inputSchema: s.obj({ rule_id: s.str("Existing rule ID."), type: s.str("Draft type: ACK_WITHIN_HOURS, SEQUENCE, REFERENCE, XREF_RESOLVABLE or ERROR_CODE."), params: s.any("Draft parameters, e.g. {documentType:'850', ackType:'997', hours:24}."), days: s.int("Test window in days (default 14).") }),
    handler: (a, ctx) => { const rule = a.rule_id ? ccpmRules.find((y) => eq(y.ruleId, a.rule_id)) : { type: a.type, params: a.params ?? {} }; if (!rule?.type) return fail(ctx, "ccpm_test_rule", "ccpm.read", "INVALID_INPUT", "Provide rule_id or a draft type and params."); const m = evaluateRule(rule, (a.days ?? 14) * D); return ok(ctx, "ccpm_test_rule", "ccpm.read", { matches: m.length, samples: m.slice(0, 10).map((f) => ({ transactionId: f.t.transactionId, partner: partnerName(f.t.partnerCompanyId), evidence: f.evidence })) }, { sources: r(CCPM, "Rule test") }); } },
  { name: "ccpm_create_rule", domain: "Command Center Performance Monitor", product: CCPM, title: "Create rule", description: "Create a monitoring rule for an agent with scope, expected behavior, reference data and budget. First call returns a plan for approval; call again with plan_id to deploy.", operation: "ccpm.write", kind: "write", binding: "CCPM rule wizard: deploy", basis: BASIS_INC,
    inputSchema: s.obj({ agent: s.str("nora, lex, liz or reese."), name: s.str("Rule name."), type: s.str("ACK_WITHIN_HOURS, SEQUENCE, REFERENCE, XREF_RESOLVABLE or ERROR_CODE."), params: s.any("Rule parameters."), expected_behavior: s.str("Expected behavior in plain language."), monthly_budget_usd: s.int("Monthly budget in USD."), plan_id: s.str("Approved plan ID (second call).") }),
    handler: (a, ctx) => {
      if (a.plan_id) { const c = consumePlan(ctx, a.plan_id, "ccpm_create_rule"); if (c.problem) return fail(ctx, "ccpm_create_rule", "ccpm.write", "PLAN_INVALID", c.problem); const rule = { ...c.plan!.parameters, status: "ACTIVE" }; ccpmRules.push(rule); c.plan!.status = "EXECUTED"; return ok(ctx, "ccpm_create_rule", "ccpm.write", { deployed: rule }, { sources: r(CCPM, "Rule deploy", [rule.ruleId]) }); }
      if (!MONITOR_AGENTS.some((m) => eq(m.agentId, a.agent))) return fail(ctx, "ccpm_create_rule", "ccpm.write", "INVALID_INPUT", "Agent must be nora, lex, liz or reese.");
      const id = `R-${String(a.agent).toUpperCase()}-${String(ccpmRules.filter((x) => eq(x.agent, a.agent)).length + 1).padStart(2, "0")}`;
      const test = evaluateRule({ type: a.type, params: a.params ?? {} }, 14 * D);
      const p = createPlan(ctx, "ccpm_create_rule", "ccpm.write", id, `Deploy ${id} "${a.name}" for ${a.agent}`, { ruleId: id, agent: String(a.agent).toLowerCase(), name: a.name, type: a.type, params: a.params ?? {}, scope: "As defined", expectedBehavior: a.expected_behavior ?? "", referenceData: [], budget: { monthlyUsd: a.monthly_budget_usd ?? 20, spentUsd: 0 } }, { valid: true, checks: [{ check: "Test against last 14 days", result: "PASS", detail: `${test.length} match(es) would be raised` }, { check: "Budget set", result: "PASS", detail: `$${a.monthly_budget_usd ?? 20} per month` }] });
      return approvalRequired(ctx, "ccpm_create_rule", "ccpm.write", p, r(CCPM, "Rule wizard"));
    } },
  { name: "ccpm_list_findings", domain: "Command Center Performance Monitor", product: CCPM, title: "List findings", description: "Findings raised by the monitor agents, with priority, status and assignee.", operation: "ccpm.read", kind: "read", binding: "CCPM findings", basis: BASIS_INC,
    inputSchema: s.obj({ status: s.str("NEW, ASSIGNED, RESOLVED, DISMISSED or SUPPRESSED."), agent: s.str("nora, lex, liz or reese."), partner: s.str("Partner name or ID."), rule_id: s.str("Rule ID.") }),
    handler: (a, ctx) => { const p = partnerArg(ctx, "ccpm_list_findings", "ccpm.read", a.partner); if (p.early) return p.early; const list = findings().filter((f) => (!a.status || eq(f.status, a.status)) && (!a.agent || f.agent.toLowerCase().startsWith(String(a.agent).toLowerCase())) && (!p.id || f.partnerCompanyId === p.id) && (!a.rule_id || eq(f.ruleId, a.rule_id))); return ok(ctx, "ccpm_list_findings", "ccpm.read", { total: list.length, findings: list.slice(0, 40).map(({ chainOfReasoning, history, ...f }) => f) }, { sources: r(CCPM, "Findings"), completeness: list.length > 40 ? "PARTIAL" : "COMPLETE", missingEvidence: list.length > 40 ? ["Truncated to 40."] : [] }); } },
  { name: "ccpm_get_finding", domain: "Command Center Performance Monitor", product: CCPM, title: "Get finding", description: "A finding with its chain of reasoning: instruction, reference data consulted, evidence and verdict.", operation: "ccpm.read", kind: "read", binding: "CCPM finding detail", basis: BASIS_INC,
    inputSchema: s.obj({ finding_id: s.str("Finding ID.") }, ["finding_id"]),
    handler: (a, ctx) => { const f = ccpmFinding(a.finding_id); return f ? ok(ctx, "ccpm_get_finding", "ccpm.read", f, { sources: r(CCPM, "Finding", [f.findingId]) }) : fail(ctx, "ccpm_get_finding", "ccpm.read", "NOT_FOUND", "Finding not found."); } },
  { name: "ccpm_update_finding", domain: "Command Center Performance Monitor", product: CCPM, title: "Update finding", description: "Assign a finding to a colleague or disposition it (RESOLVED, DISMISSED or ACCEPTED_RISK) with a note.", operation: "ccpm.triage", kind: "write", binding: "CCPM finding triage", basis: BASIS_INC,
    inputSchema: s.obj({ finding_id: s.str("Finding ID."), assignee: s.str("Assignee email."), disposition: s.str("RESOLVED, DISMISSED or ACCEPTED_RISK."), note: s.str("Note.") }, ["finding_id"]),
    handler: (a, ctx) => { const f = ccpmFinding(a.finding_id); if (!f) return fail(ctx, "ccpm_update_finding", "ccpm.triage", "NOT_FOUND", "Finding not found."); const st = (findingState[f.findingId] ??= { history: [] }); if (a.assignee) { st.assignee = a.assignee; st.status = "ASSIGNED"; } if (a.disposition) st.status = String(a.disposition).toUpperCase() === "ACCEPTED_RISK" ? "DISMISSED" : String(a.disposition).toUpperCase(); st.history.push({ at: new Date().toISOString(), by: "jordan.lee@harborviewretail.com", assignee: a.assignee, disposition: a.disposition, note: a.note }); return ok(ctx, "ccpm_update_finding", "ccpm.triage", ccpmFinding(f.findingId), { sources: r(CCPM, "Finding triage", [f.findingId]), interpretation: "Dispositions feed agentic learning: agents adjust monitoring frequency and conditions." }); } },
  { name: "ccpm_get_dashboard", domain: "Command Center Performance Monitor", product: CCPM, title: "Get dashboard", description: "Top rules by findings, open actions, and agent metrics for inspections, findings, resolutions and running cost.", operation: "ccpm.read", kind: "read", binding: "CCPM dashboard", basis: BASIS_INC,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => { const fs = findings(); return ok(ctx, "ccpm_get_dashboard", "ccpm.read", { topRules: top(count(fs, (f) => `${f.ruleId} ${f.rule}`), 10).map(([rule, n]) => ({ rule, findings: n })), openActions: fs.filter((f) => f.status === "ASSIGNED" || f.status === "NEW").length, assignedToMe: fs.filter((f) => f.assignee === "jordan.lee@harborviewretail.com" && f.status === "ASSIGNED").length, metrics: { inspections30d: ccpmRules.length * 412, findings14d: fs.length, resolved: fs.filter((f) => f.status === "RESOLVED").length, runningCostUsd: round(ccpmRules.reduce((x, y) => x + y.budget.spentUsd, 0), 2) } }, { sources: r(CCPM, "Dashboard") }); } },
  { name: "ccpm_get_scorecard", domain: "Command Center Performance Monitor", product: CCPM, title: "Get supplier scorecard", description: "A supplier's weighted scorecard: KPIs with actual, target, weight and score, plus a weekly PO acknowledgment trend (997 receipt, 855 response rate and response time).", operation: "ccpm.read", kind: "read", binding: "CCPM scorecard", basis: BASIS_INC,
    inputSchema: s.obj({ partner: s.str("Partner name or ID.") }, ["partner"]),
    handler: (a, ctx) => { const p = partnerArg(ctx, "ccpm_get_scorecard", "ccpm.read", a.partner); if (p.early) return p.early; return ok(ctx, "ccpm_get_scorecard", "ccpm.read", { ...scorecard(p.id!), weeklyAcknowledgments: ackTrend(p.id!) }, { sources: r(CCPM, "Scorecard", [p.id!]), interpretation: "Weights are set by the client. Scores are computed from observed transactions. weeklyAcknowledgments tracks 997 receipt and 855 response separately; a missing 855 is unknown, not a rejection. 855 rate counts POs older than 96 hours." }); } },
  { name: "ccpm_get_supplier_analytics", domain: "Command Center Performance Monitor", product: CCPM, title: "Get supplier analytics", description: "All suppliers ranked by weighted score, with the lowest-scoring KPI for each and category averages.", operation: "ccpm.read", kind: "read", binding: "CCPM analytics", basis: BASIS_INC,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => { const cards = tradingPartners().filter((c) => partnerMetrics(c.companyId).volume > 0).map((c) => scorecard(c.companyId)); const cats: Record<string, number[]> = {}; cards.forEach((c) => c.kpis.forEach((k) => k.score != null && (cats[k.category] ??= []).push(k.score))); return ok(ctx, "ccpm_get_supplier_analytics", "ccpm.read", { suppliers: cards.sort((x, y) => x.weightedScore - y.weightedScore).map((c) => ({ partner: c.partner, weightedScore: c.weightedScore, weakestKpi: [...c.kpis].filter((k) => k.score != null).sort((x, y) => (x.score as number) - (y.score as number))[0] })), categoryAverages: Object.entries(cats).map(([k, v]) => ({ category: k, average: Math.round(v.reduce((x, y) => x + y, 0) / v.length) })) }, { sources: r(CCPM, "Analytics") }); } },
];

export function resetApps() {
  clearTxOverrides();
  for (const k of Object.keys(findingState)) delete findingState[k];
  alertRules.splice(2);
  ccpmRules.splice(6);
}
/** Removes every transaction override and restores generated values. */
export function clearTxOverrides() {
  for (const [id, rec] of Object.entries(txOverrides)) { const t = txById(id); if (t) { delete t._o; delete (t as any).redelivered; for (const k of Object.keys(rec.refs ?? {})) delete (t.refs as any)[k]; } delete txOverrides[id]; }
}

export const appTools: ToolDef[] = [...ccimTools, ...tgiAppTools, ...ccpmTools];
