// Trading Grid tools for the Command Center tenant. Read-only: Command Center observes the network.
// Every response carries the evidence envelope and the access decision for the tenant's own grant.
import { CC_CLIENTS, CC_OPERATIONS, POLICY_VERSION, CcCtx, tenantFor } from "./tenant.js";

const CCIM = "Command Center Integration Monitor";
const CCPM = "Command Center Performance Monitor";
const RT = "Command Center Retail pack";
const TGI = "Trading Grid Insights";

const str = (description: string, extra: any = {}) => ({ type: "string", description, ...extra });
const obj = (properties: Record<string, any>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });

function asOf(ctx: CcCtx) { return `2026-10-24T${ctx.networkTime || "09:30"}:00-04:00`; }

function access(ctx: CcCtx, operation: string, decision = "PERMIT") {
  const c = CC_CLIENTS[ctx.perspective];
  return { decision, operation, ecosystem: c.name, clientApplication: c.clientApplication, executionPrincipal: c.principal, principalType: c.principalType, endUser: c.principal, organization: c.organization, buid: c.buid, grantId: c.grantId, policyVersion: POLICY_VERSION };
}
function ok(ctx: CcCtx, tool: string, operation: string, result: any, sources: { product: string; operation: string; objectIds?: string[] }[], o: { completeness?: string; missing?: string[]; note?: string } = {}) {
  return {
    status: "OK", tool, result,
    evidence: { environment: "PRODUCTION", observedAt: asOf(ctx), freshness: { asOf: asOf(ctx), maxAgeSeconds: 60 }, completeness: o.completeness ?? "COMPLETE", missingEvidence: o.missing ?? [], sourceRefs: sources, ...(o.note ? { interpretation: o.note } : {}) },
    access: access(ctx, operation),
  };
}
function fail(ctx: CcCtx, tool: string, operation: string, code: string, message: string) {
  return { status: "ERROR", tool, error: { code, message }, access: access(ctx, operation) };
}

const norm = (s: any) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function findPartner(T: any, q?: string) {
  if (!q) return { list: T.partners };
  const n = norm(q), exact = T.partners.filter((p: any) => norm(p.name) === n || norm(p.alias) === n);
  const list = exact.length ? exact : T.partners.filter((p: any) => norm(p.name).includes(n) || n.includes(norm(p.name)));
  return { list };
}

/** Findings and Retail pack cases as one follow-up list, with the calling session's follow-up state. */
function followUps(ctx: CcCtx) {
  const T = tenantFor(ctx.perspective);
  const base = (id: string) => (ctx.perspective === "supplier" && (id === "f3" || id === "f4") ? { state: "Assigned", owner: "Dana Ortiz", since: "07:55" } : { state: "New", owner: "Unassigned" });
  const f = T.findings.map((x: any) => ({ id: x.id, kind: "finding", title: x.title, partner: x.partner, module: x.module, agent: x.agent, document: x.document, process: x.process, severity: x.severity, detectedAt: x.detectedAt, valueAtRisk: x.valueAtRisk, transactions: x.transactions,
    ...base(x.id), ...(ctx.followUps[x.id] ?? {}), id_: undefined }));
  const c = T.retailCases.map((x: any) => ({ id: x.id, kind: "retail case", title: x.title, partner: x.partner, module: "Retail pack", agent: x.agent, document: x.documents[0]?.document, process: x.process, severity: x.severity, detectedAt: null, valueAtRisk: x.amount ?? 0,
    state: "New", owner: x.owner, ...(ctx.followUps[x.id] ?? {}) }));
  return [...f, ...c].map((x: any) => { delete x.id_; return x; });
}

export type CcTool = { name: string; title: string; description: string; operation: string; product: string; inputSchema: any; handler: (a: any, ctx: CcCtx) => any };

export const CC_TOOLS: CcTool[] = [
  { name: "get_access_context", title: "Access context", product: "Trading Grid Context Connectors", operation: "access.read",
    description: "Return the caller's organization, BUID, solutions and operation rights. No credentials are returned.", inputSchema: obj({}),
    handler: (_a, ctx) => { const c = CC_CLIENTS[ctx.perspective]; return ok(ctx, "get_access_context", "access.read", { company: c.company, perspective: ctx.perspective === "retailer" ? "Retailer" : "CPG supplier", user: tenantFor(ctx.perspective).user, grant: { grantId: c.grantId, organization: c.organization, companyId: c.companyId, buids: [c.buid], solutions: c.solutions, operations: CC_OPERATIONS, status: "ACTIVE", policyVersion: POLICY_VERSION }, note: "Executes as the signed-in Command Center user. Read only." }, [{ product: "Trading Grid Context Connectors", operation: "Access decision service (Trading Grid Online grant)" }]); } },

  { name: "ccim_get_daily_digest", title: "Daily digest", product: CCIM, operation: "ccim.read",
    description: "Yesterday's daily digest: documents, failed transactions, onboarding, anomalies, top partners by volume and the document mix for yesterday and last month.", inputSchema: obj({}),
    handler: (_a, ctx) => ok(ctx, "ccim_get_daily_digest", "ccim.read", tenantFor(ctx.perspective).dailyDigest, [{ product: CCIM, operation: "Daily Summarizer and Explainer Agent, generated 06:00" }]) },

  { name: "ccim_get_network_activity", title: "Network activity today", product: CCIM, operation: "ccim.read",
    description: "Today's network activity: documents this week, open anomalies, failed transactions today and active partners.", inputSchema: obj({}),
    handler: (_a, ctx) => ok(ctx, "ccim_get_network_activity", "ccim.read", tenantFor(ctx.perspective).networkActivity, [{ product: CCIM, operation: "Network activity" }]) },

  { name: "ccim_list_anomalies", title: "Projections and anomalies", product: CCIM, operation: "ccim.read",
    description: "Watchlist projections with volume drops, missing documents and failed-transaction anomalies, each with the finding it raised.", inputSchema: obj({ only_alerts: { type: "boolean", description: "Only watchlists with alerts (default true)." } }),
    handler: (a, ctx) => { const L = tenantFor(ctx.perspective).projections.filter((x: any) => a.only_alerts === false || x.alerts > 0); return ok(ctx, "ccim_list_anomalies", "ccim.read", { anomalies: L, count: L.length, runAt: "Today, 08:00" }, [{ product: CCIM, operation: "Projections and anomaly detection" }]); } },

  { name: "ccim_list_trading_community", title: "Trading community", product: CCIM, operation: "community.read",
    description: "Partners with status, protocol, last activity, 30-day documents and processing errors.", inputSchema: obj({ status: str("Active, Onboarding or Inactive.") }),
    handler: (a, ctx) => { const L = tenantFor(ctx.perspective).partners.filter((p: any) => !a.status || norm(p.status) === norm(a.status)).map((p: any) => ({ name: p.name, alias: p.alias, status: p.status, protocol: p.protocol, lastActivity: p.lastActivity, documents30d: p.documents30d, errors30d: p.errors30d, topError: p.topError }));
      return ok(ctx, "ccim_list_trading_community", "community.read", { partners: L, shown: L.length, totalPartners: 208, activePartners: 163 }, [{ product: CCIM, operation: "Partners" }], { completeness: "PARTIAL", missing: ["198 smaller partners not returned in this view"] }); } },

  { name: "ccim_get_partner_details", title: "Partner details", product: CCIM, operation: "connectivity.read",
    description: "One partner: status, EDI addresses, protocol, document relationships, required documents with the Retail pack, processing errors and open follow-ups.", inputSchema: obj({ partner: str("Partner name or alias.") }, ["partner"]),
    handler: (a, ctx) => { const T = tenantFor(ctx.perspective), m = findPartner(T, a.partner).list;
      if (!m.length) return fail(ctx, "ccim_get_partner_details", "connectivity.read", "NOT_FOUND", `No partner matches '${a.partner}' in ${CC_CLIENTS[ctx.perspective].company}'s community.`);
      if (m.length > 1) return fail(ctx, "ccim_get_partner_details", "connectivity.read", "AMBIGUOUS_PARTNER", `'${a.partner}' matches ${m.map((x: any) => x.name).join(", ")}. Select one.`);
      const p = m[0], open = followUps(ctx).filter((f: any) => f.partner === p.name && !/Verified|Closed|Known issue/.test(f.state));
      return ok(ctx, "ccim_get_partner_details", "connectivity.read", { ...p, openFollowUps: open.map((f: any) => ({ id: f.id, title: f.title, state: f.state, owner: f.owner })) }, [{ product: CCIM, operation: "Partner details" }, ...(p.requiredDocuments ? [{ product: RT, operation: "Required document coverage" }] : [])]); } },

  { name: "ccpm_list_findings", title: "Findings and follow-ups", product: CCPM, operation: "ccpm.read",
    description: "Findings from Integration Monitor, Performance Monitor and the Retail pack with their follow-up state, owner and who the next document is owed by. Filters are optional.",
    inputSchema: obj({ partner: str("Partner name."), module: str("Integration Monitor, Performance Monitor or Retail pack."), state: str("New, Assigned, Waiting on partner, Waiting on us, Recovering, Verified, Closed or Known issue."), severity: str("High or Medium."), agent: str("Agent name: Ivy, Lex, Nora, Liz or Reese.") }),
    handler: (a, ctx) => { const L = followUps(ctx).filter((f: any) => (!a.partner || norm(f.partner).includes(norm(a.partner))) && (!a.module || norm(f.module) === norm(a.module)) && (!a.state || norm(f.state) === norm(a.state)) && (!a.severity || norm(f.severity) === norm(a.severity)) && (!a.agent || norm(f.agent).startsWith(norm(a.agent))));
      const counts = L.reduce((m: any, f: any) => ((m[f.state] = (m[f.state] ?? 0) + 1), m), {});
      return ok(ctx, "ccpm_list_findings", "ccpm.read", { findings: L, findingCount: L.length, byState: counts, networkTime: ctx.networkTime }, [{ product: CCIM, operation: "Anomalies and checks" }, { product: CCPM, operation: "Monitor agent findings" }, { product: RT, operation: "Retail cases" }],
        { note: "State, owner and expect-by come from the follow-up in Command Center. Recovery is confirmed only by documents on the network." }); } },

  { name: "ccpm_get_finding", title: "Finding detail", product: CCPM, operation: "ccpm.read",
    description: "One finding or retail case: what the network shows, impact, root cause, suggested next step, events, recovery criteria, sample transactions with control numbers, and its follow-up state.", inputSchema: obj({ id: str("Finding ID (f1) or retail case ID (rt-...), or words from its title.") }, ["id"]),
    handler: (a, ctx) => { const T = tenantFor(ctx.perspective), q = norm(a.id);
      const f = T.findings.find((x: any) => x.id === a.id) ?? T.retailCases.find((x: any) => x.id === a.id) ?? [...T.findings, ...T.retailCases].find((x: any) => norm(x.title).includes(q));
      if (!f) return fail(ctx, "ccpm_get_finding", "ccpm.read", "NOT_FOUND", `No finding matches '${a.id}'.`);
      const st = followUps(ctx).find((x: any) => x.id === f.id), played = T.networkEvents.filter((e: any) => e.finding === f.id && e.time <= (ctx.networkTime || "09:30"));
      return ok(ctx, "ccpm_get_finding", "ccpm.read", { ...f, followUp: st ? { state: st.state, owner: st.owner, waitingOn: st.waitingOn ?? null, expectBy: st.expectBy ?? null, since: st.since ?? null, activity: st.activity ?? [] } : null, networkEventsSince0930: played },
        [{ product: f.module === "Integration Monitor" ? CCIM : f.monitor ? RT : CCPM, operation: "Finding detail", objectIds: [f.id] }, { product: TGI, operation: "Transaction metadata", objectIds: (f.sampleTransactions ?? []).map((t: any) => t.reference) }],
        { completeness: f.transactions > 5 ? "PARTIAL" : "COMPLETE", missing: f.transactions > 5 ? [`${f.transactions - 5} more transactions in TG Insights`] : [] }); } },

  { name: "ccpm_list_rules", title: "Rules, checks and policies", product: CCPM, operation: "ccpm.read",
    description: "Integration Monitor checks, Performance Monitor rules and Retail pack policies with conformance, findings in 30 days, last run and status.", inputSchema: obj({ agent: str("Agent name.") }),
    handler: (a, ctx) => { const T = tenantFor(ctx.perspective), R = T.rules.filter((r: any) => !a.agent || norm(r.agent).startsWith(norm(a.agent)));
      return ok(ctx, "ccpm_list_rules", "ccpm.read", { rules: R, retailPolicies: a.agent ? T.retailPolicies.filter((r: any) => norm(r.agent).startsWith(norm(a.agent))) : T.retailPolicies }, [{ product: CCPM, operation: "Rules" }, { product: RT, operation: "Policy templates" }]); } },

  { name: "ccpm_get_scorecard", title: "Scorecard and KPIs", product: CCPM, operation: "ccpm.read",
    description: "Partner scorecard and retail KPIs by category with value, target, score, weight and whether each is off target.", inputSchema: obj({}),
    handler: (_a, ctx) => ok(ctx, "ccpm_get_scorecard", "ccpm.read", { overallScore: 91.3, grade: "B", categories: tenantFor(ctx.perspective).kpis }, [{ product: CCPM, operation: "Scorecard, last 30 days" }]) },

  { name: "ccpm_get_process_health", title: "Process health", product: CCPM, operation: "ccpm.read",
    description: "Business processes in the client solution: documents today, on track, at risk and breached, overdue 997s, 824 rejects and the document steps.", inputSchema: obj({ process: str("Process name (optional).") }),
    handler: (a, ctx) => { const P = tenantFor(ctx.perspective).processes.filter((p: any) => !a.process || norm(p.name).includes(norm(a.process)) || norm(p.short).includes(norm(a.process)));
      return ok(ctx, "ccpm_get_process_health", "ccpm.read", { processes: P }, [{ product: CCPM, operation: "Business process view" }]); } },

  { name: "search_transactions", title: "Transaction search", product: TGI, operation: "transaction.read",
    description: "Transactions behind open findings by reference (PO, ASN, invoice), control number, partner or document type. Returns metadata only.", inputSchema: obj({ query: str("Reference, ISA13 control number, partner or document type.") }),
    handler: (a, ctx) => { const T = tenantFor(ctx.perspective), q = norm(a.query);
      const rows = T.findings.flatMap((f: any) => f.sampleTransactions.map((t: any) => ({ ...t, partner: f.partner, finding: f.id, findingTitle: f.title })))
        .filter((t: any) => !q || [t.reference, t.isa13, t.partner, t.document].some((v) => v && norm(v).includes(q)));
      return ok(ctx, "search_transactions", "transaction.read", { transactions: rows.slice(0, 25), returned: Math.min(rows.length, 25), matched: rows.length }, [{ product: TGI, operation: "Transaction search (metadata)" }], { completeness: "PARTIAL", missing: ["Only transactions behind open findings are indexed for this view"] }); } },
];

export function ccInvoke(name: string, args: any, ctx: CcCtx) {
  const t0 = Date.now(), tool = CC_TOOLS.find((t) => t.name === name);
  if (!tool) return { out: { status: "ERROR", tool: name, error: { code: "UNKNOWN_TOOL", message: `${name} is not available to Command Center.` } }, ms: 0, tool };
  let out: any;
  try { out = tool.handler(args ?? {}, ctx); } catch (e: any) { out = fail(ctx, name, tool.operation, "TOOL_ERROR", String(e?.message ?? e)); }
  return { out, ms: Date.now() - t0, tool };
}
