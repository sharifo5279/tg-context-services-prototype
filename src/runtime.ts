// Execution context, entitlement evaluation, evidence envelope and approval plans.
import { randomUUID, createHash } from "node:crypto";
import { HUB_BUID, HUB_ORG, HUB_ID, SOLUTION_ID, companyById, bprs, invitations } from "./data/cms.js";
import { CARTO_SOLUTION } from "./data/other.js";

export type HostKey = "tg-aviator" | "aviator-studio" | "copilot-studio" | "gemini-enterprise" | "sap-joule" | "claude-connector" | "claude-ui";

const BASE_OPS = [
  "access.read", "community.read", "connectivity.read", "services.read", "contacts.read", "workflow.read",
  "transaction.read", "transaction.payload.read", "map.read", "xref.read", "xref.export", "xref.write",
  "request.read", "request.submit", "provisioning.submit", "dataproduct.read", "dataproduct.query", "dataproduct.export", "dataproduct.schedule", "support.ticket.create", "agent.invoke",
  "ccim.read", "tgi.read", "tgi.configure", "tgi.redeliver", "ccpm.read", "ccpm.triage", "ccpm.write",
];

const EXT = (eco: string) => [eco, "Aviator AKS gateway", "TG Context Services (MCP)", "Trading Grid services"];

export const HOSTS: Record<HostKey, any> = {
  "tg-aviator": {
    key: "tg-aviator", name: "Trading Grid Aviator", shortName: "TG Aviator", exposure: "Internal",
    authPattern: "Trading Grid Online session (first party)",
    principalType: "DELEGATED_USER", principal: "jordan.lee@harborview.example", clientApplication: "tgo-aviator",
    note: "Runs inside Trading Grid Online with the user's own access rights.",
    route: ["Trading Grid Online", "TG Aviator", "Trading Grid services"],
    operations: BASE_OPS,
  },
  "aviator-studio": {
    key: "aviator-studio", name: "OpenText Aviator Studio", shortName: "Aviator Studio", exposure: "OpenText, outside Trading Grid Online",
    route: ["Aviator Studio", "TG Context Services (MCP)", "Trading Grid services"],
    authPattern: "First-party OAuth, delegated user; Trading Grid Online grant",
    principalType: "DELEGATED_USER", principal: "jordan.lee@harborview.example", clientApplication: "app-aviator-studio-hrg",
    note: "Executes as the signed-in user.",
    operations: BASE_OPS,
  },
  "copilot-studio": {
    key: "copilot-studio", exposure: "External", route: EXT("Copilot Studio"), name: "Microsoft Copilot Studio", shortName: "Copilot Studio",
    authPattern: "OAuth authorization code with user consent; Streamable HTTP",
    principalType: "DELEGATED_USER", principal: "jordan.lee@harborview.example", clientApplication: "app-copilot-hrg-b2b-ops",
    note: "Executes as the signed-in user. Verify whose connection runs the published agent.",
    operations: BASE_OPS,
  },
  "gemini-enterprise": {
    key: "gemini-enterprise", exposure: "External", route: EXT("Gemini Enterprise"), name: "Google Gemini Enterprise", shortName: "Gemini Enterprise",
    authPattern: "Custom MCP connector, OAuth with PKCE; Streamable HTTP",
    principalType: "DELEGATED_USER", principal: "jordan.lee@harborview.example", clientApplication: "app-gemini-hrg-b2b-ops",
    note: "Executes as the signed-in user. Only selected tools are enabled.",
    operations: BASE_OPS,
  },
  "sap-joule": {
    key: "sap-joule", exposure: "External", route: EXT("SAP Joule"), name: "SAP Joule Studio", shortName: "SAP Joule",
    authPattern: "BTP destination with client credentials (service identity)",
    principalType: "SERVICE_IDENTITY", principal: "svc-joule-hrg-procurement", clientApplication: "btp-dest-tgcs-hrg",
    note: "No user delegation on this route. Service identity grant excludes payload content.",
    operations: BASE_OPS.filter((o) => o !== "transaction.payload.read"),
  },
  "claude-connector": {
    key: "claude-connector", exposure: "External", route: EXT("Claude"), name: "Claude (MCP connector)", shortName: "Claude connector",
    authPattern: "Remote MCP server, bearer token (prototype)",
    principalType: "DELEGATED_USER", principal: "jordan.lee@harborview.example", clientApplication: "app-claude-hrg-b2b-ops",
    note: "Executes as the connecting user.",
    operations: BASE_OPS,
  },
  "claude-ui": {
    key: "claude-ui", exposure: "External", route: EXT("Claude"), name: "Claude chatbot (Claude UI)", shortName: "Claude UI",
    authPattern: "Custom connector in Claude settings; token in connector URL (prototype)",
    principalType: "DELEGATED_USER", principal: "jordan.lee@harborview.example", clientApplication: "app-claude-ui-hrg",
    note: "Executes as the connecting user.",
    operations: BASE_OPS,
  },
};

export const PERSONA = { name: "Jordan Lee", title: "B2B operations analyst", company: "Harborview Retail Group", user: "jordan.lee@harborview.example" };

export const GRANT = {
  grantId: "GRT-HRG-2026-014",
  organization: HUB_ORG,
  companyId: HUB_ID,
  buids: [HUB_BUID],
  solutions: [SOLUTION_ID, CARTO_SOLUTION, "TGDP-HRG"],
  dataProducts: ["tgdp.transaction_activity", "tgdp.partner_directory", "tgdp.relationship_network", "tgdp.ccim_integration_events"],
  approvalRequiredFor: ["request.submit", "provisioning.submit", "xref.write", "dataproduct.schedule", "tgi.redeliver", "ccpm.write"],
  status: "ACTIVE",
  grantedBy: "hrg.tgo.admin",
  grantedAt: "2026-10-05T14:00:00Z",
  expiresAt: "2027-04-05T14:00:00Z",
  policyVersion: "tgcs-policy-0.4",
};

export type Ctx = { host: HostKey; sessionId: string; baseUrl: string };

export function hostOf(ctx: Ctx) {
  return HOSTS[ctx.host] ?? HOSTS["claude-connector"];
}

function principalBlock(ctx: Ctx) {
  const h = hostOf(ctx);
  return {
    ecosystem: h.name,
    clientApplication: h.clientApplication,
    executionPrincipal: h.principal,
    principalType: h.principalType,
    endUser: h.principalType === "DELEGATED_USER" ? PERSONA.user : null,
    organization: GRANT.organization,
    buid: GRANT.buids[0],
    grantId: GRANT.grantId,
    policyVersion: GRANT.policyVersion,
  };
}

// ---- Entitlement ---------------------------------------------------------------------------------

export function companyInScope(companyId: string): { ok: boolean; reason?: string } {
  const c = companyById(companyId);
  if (!c) return { ok: false, reason: "NOT_FOUND" };
  if (c._buid === HUB_BUID) return { ok: true };
  if (c.orgId === HUB_ORG) return { ok: false, reason: `Company ${companyId} belongs to BUID ${c._buid}, which is not in the active grant.` };
  if (bprs.some((b) => b.partnerCompanyId === companyId)) return { ok: true };
  if (invitations.some((i) => i._companyId === companyId)) return { ok: true };
  if (companyId === "C40001") return { ok: true };
  return { ok: false, reason: `Company ${companyId} is outside organization ${HUB_ORG} and has no relationship with it.` };
}

export const scopeFilter = (companyId: string) => companyInScope(companyId).ok;

// ---- Envelope ------------------------------------------------------------------------------------

export type Source = { product: string; operation: string; objectIds?: string[] };

export type EnvelopeOpts = {
  sources: Source[];
  completeness?: "COMPLETE" | "PARTIAL" | "UNKNOWN";
  missingEvidence?: string[];
  pagination?: any;
  interpretation?: string;
  freshnessSeconds?: number;
  notes?: string[];
};

export function ok(ctx: Ctx, tool: string, operation: string, result: any, o: EnvelopeOpts) {
  return {
    status: "OK",
    tool,
    result,
    evidence: {
      environment: "PROTOTYPE (seeded data)",
      observedAt: new Date().toISOString(),
      freshness: { asOf: new Date(Date.now() - (o.freshnessSeconds ?? 0) * 1000).toISOString(), maxAgeSeconds: o.freshnessSeconds ?? 0 },
      completeness: o.completeness ?? "COMPLETE",
      missingEvidence: o.missingEvidence ?? [],
      sourceRefs: o.sources,
      ...(o.pagination ? { pagination: o.pagination } : {}),
      ...(o.interpretation ? { interpretation: o.interpretation } : {}),
      ...(o.notes ? { notes: o.notes } : {}),
    },
    access: { decision: "PERMIT", operation, ...principalBlock(ctx) },
  };
}

export function deny(ctx: Ctx, tool: string, operation: string, reason: string) {
  return {
    status: "DENIED",
    tool,
    error: { code: "ACCESS_DENIED", message: reason, nextAction: "Request a grant change from the customer administrator in Trading Grid Online." },
    access: { decision: "DENY", operation, ...principalBlock(ctx) },
  };
}

export function fail(ctx: Ctx, tool: string, operation: string, code: string, message: string, extra: any = {}) {
  return { status: "ERROR", tool, error: { code, message, ...extra }, access: { decision: "PERMIT", operation, ...principalBlock(ctx) } };
}

/** Client status is managed by the customer administrator in Trading Grid Online (Agent access). */
export const clientStatus: Record<string, "ACTIVE" | "SUSPENDED"> = {};

export function checkOperation(ctx: Ctx, operation: string): string | null {
  const h = hostOf(ctx);
  if (clientStatus[h.key] === "SUSPENDED") return `Access suspended for ${h.name} in Trading Grid Online Agent access. No data returned.`;
  if (!h.operations.includes(operation)) {
    return `Operation '${operation}' is not in the grant for ${h.principalType === "SERVICE_IDENTITY" ? "service identity" : "principal"} ${h.principal} (${h.name}).`;
  }
  return null;
}

// ---- Approval plans ------------------------------------------------------------------------------

export type Plan = {
  planId: string;
  submitTool: string;
  operation: string;
  target: string;
  summary: string;
  parameters: any;
  validation: any;
  host: HostKey;
  principal: string;
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "EXECUTED" | "EXPIRED";
  approvedBy?: string;
  approvedAt?: string;
  paramsHash: string;
  executionResult?: any;
};

export const plans = new Map<string, Plan>();

const hash = (o: any) => createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 16);

export function createPlan(ctx: Ctx, submitTool: string, operation: string, target: string, summary: string, parameters: any, validation: any = { valid: true, checks: [] }) {
  const id = `PLN-${randomUUID().slice(0, 8).toUpperCase()}`;
  const p: Plan = {
    planId: id, submitTool, operation, target, summary, parameters, validation,
    host: ctx.host, principal: hostOf(ctx).principal, sessionId: ctx.sessionId,
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    status: "PENDING_APPROVAL", paramsHash: hash({ submitTool, target, parameters }),
  };
  plans.set(id, p);
  return p;
}

export function approvalRequired(ctx: Ctx, tool: string, operation: string, p: Plan, sources: Source[]) {
  return {
    ...ok(ctx, tool, operation, {
      planId: p.planId,
      planStatus: p.status,
      summary: p.summary,
      target: p.target,
      parameters: p.parameters,
      validation: p.validation,
      expiresAt: p.expiresAt,
      submitWith: { tool: p.submitTool, arguments: { plan_id: p.planId } },
      approvalUrl: `${ctx.baseUrl}/approve/${p.planId}`,
    }, { sources, interpretation: "Plan prepared. Nothing has been submitted. An authorized user must approve the plan before submission." }),
    status: "APPROVAL_REQUIRED",
  };
}

export function consumePlan(ctx: Ctx, planId: string, submitTool: string): { plan?: Plan; problem?: string } {
  const p = plans.get(planId);
  if (!p) return { problem: `Plan ${planId} not found.` };
  if (Date.parse(p.expiresAt) < Date.now() && p.status !== "EXECUTED") p.status = "EXPIRED";
  if (p.submitTool !== submitTool) return { problem: `Plan ${planId} is bound to ${p.submitTool}, not ${submitTool}.` };
  if (p.host !== ctx.host || p.principal !== hostOf(ctx).principal) return { problem: `Plan ${planId} is bound to a different principal.` };
  if (p.status === "PENDING_APPROVAL") return { plan: p, problem: `Plan ${planId} is awaiting approval. Approve it at ${ctx.baseUrl}/approve/${planId}.` };
  if (p.status !== "APPROVED") return { plan: p, problem: `Plan ${planId} is ${p.status} and cannot be submitted.` };
  if (hash({ submitTool: p.submitTool, target: p.target, parameters: p.parameters }) !== p.paramsHash) return { problem: "Plan parameters changed after approval." };
  return { plan: p };
}

export function decidePlan(planId: string, approve: boolean, by: string) {
  const p = plans.get(planId);
  if (!p) return null;
  if (p.status !== "PENDING_APPROVAL") return p;
  if (Date.parse(p.expiresAt) < Date.now()) {
    p.status = "EXPIRED";
    return p;
  }
  p.status = approve ? "APPROVED" : "REJECTED";
  p.approvedBy = by;
  p.approvedAt = new Date().toISOString();
  return p;
}
