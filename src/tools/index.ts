// Tool registry, access tools and the single invocation path used by the agent console and the MCP server.
import { ToolDef, s, NEW_CONTRACT } from "./types.js";
import { insightsTools } from "./insights.js";
import { cmsTools } from "./cms.js";
import { cartographerTools } from "./cartographer.js";
import { projectsTools, crView, provView } from "./projects.js";
import { tgdpTools, queries, exports } from "./tgdp.js";
import { ok, fail, deny, checkOperation, hostOf, GRANT, PERSONA, Ctx } from "../runtime.js";
import { changeRequests, provisionings } from "../data/other.js";

const A = "Trading Grid Context Services";
let ALL: ToolDef[] = [];

function permitted(ctx: Ctx) {
  return ALL.filter((t) => !checkOperation(ctx, t.operation));
}

function operationLookup(ref: string) {
  const r = String(ref).toUpperCase();
  if (r.startsWith("ST-")) { const c = changeRequests.find((x) => x.statusId === r); return c && { kind: "change_request", status: crView(c).submissionState, view: crView(c) }; }
  if (r.startsWith("TRK-")) { const p = provisionings.find((x) => x.trackingId === r); return p && { kind: "partner_provisioning", status: provView(p).status, view: provView(p) }; }
  if (r.startsWith("Q-")) { const q = queries.get(r); return q && { kind: "data_product_query", status: q.status, view: { queryId: q.queryId, productId: q.productId, totalRows: q.totalRows } }; }
  if (r.startsWith("EXP-")) { const e = exports.get(r); const done = e && Date.now() - e.createdAt > 4000; return e && { kind: "data_product_export", status: done ? "COMPLETE" : "RUNNING", view: { exportId: e.exportId, recordCount: done ? e.rows.length : null } }; }
  return null;
}

const accessTools: ToolDef[] = [
  {
    name: "get_access_context", domain: "Access and operations", product: A, title: "Get access context",
    description: "Return the authenticated caller's permitted organization, BUID, solutions, data products and operation rights. No credentials are returned.",
    operation: "access.read", kind: "read", binding: "New Context Services contract (authoritative access decisions + CMS access inputs)", basis: NEW_CONTRACT,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => {
      const h = hostOf(ctx);
      return ok(ctx, "get_access_context", "access.read", {
        ecosystem: h.name, authPattern: h.authPattern, clientApplication: h.clientApplication, executionPrincipal: h.principal, principalType: h.principalType,
        endUser: h.principalType === "DELEGATED_USER" ? { ...PERSONA } : null,
        grant: { ...GRANT, operations: h.operations },
        note: h.note,
      }, { sources: [{ product: A, operation: "Access decision service (Trading Grid Online grant)" }] });
    },
  },
  {
    name: "list_capabilities", domain: "Access and operations", product: A, title: "List capabilities",
    description: "List authorized capability names and versions, optionally for one domain. Discovery is filtered to the caller's grant.",
    operation: "access.read", kind: "read", binding: "New registry contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ domain: s.str("Domain name, e.g. Transaction evidence.") }),
    handler: (a, ctx) => {
      const list = permitted(ctx).filter((t) => !a.domain || t.domain.toLowerCase().includes(String(a.domain).toLowerCase()));
      const domains = [...new Set(list.map((t) => t.domain))].map((d) => ({ domain: d, capabilities: list.filter((t) => t.domain === d).map((t) => ({ name: t.name, version: "0.1", actionClass: t.kind })) }));
      return ok(ctx, "list_capabilities", "access.read", { totalAuthorized: list.length, domains }, { sources: [{ product: A, operation: "Capability registry" }], interpretation: "Discovery shows authorized capabilities only. Invocation is authorized again on every call." });
    },
  },
  {
    name: "get_capability_contract", domain: "Access and operations", product: A, title: "Get capability contract",
    description: "Return a capability's input schema, source binding, scope and action class.",
    operation: "access.read", kind: "read", binding: "New registry contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ name: s.str("Capability name.") }, ["name"]),
    handler: (a, ctx) => {
      const t = permitted(ctx).find((x) => x.name === a.name);
      if (!t) return fail(ctx, "get_capability_contract", "access.read", "UNAVAILABLE", "Capability is unknown, retired or not authorized for this caller.");
      return ok(ctx, "get_capability_contract", "access.read", { name: t.name, version: "0.1", title: t.title, description: t.description, domain: t.domain, product: t.product, actionClass: t.kind, operation: t.operation, sourceBinding: t.binding, contractBasis: t.basis, inputSchema: t.inputSchema, output: "Evidence envelope: status, result, evidence (sourceRefs, observedAt, freshness, completeness, missingEvidence), access decision" }, { sources: [{ product: A, operation: "Capability registry" }] });
    },
  },
  {
    name: "get_operation_status", domain: "Access and operations", product: A, title: "Get operation status",
    description: "Return running, completed, failed or uncertain status for an operation reference (ST-, TRK-, Q-, EXP-). Accepted is never reported as completed.",
    operation: "access.read", kind: "read", binding: "New tracking contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ operation_ref: s.str("Operation reference.") }, ["operation_ref"]),
    handler: (a, ctx) => { const o = operationLookup(a.operation_ref); return o ? ok(ctx, "get_operation_status", "access.read", { operationRef: a.operation_ref, kind: o.kind, status: o.status }, { sources: [{ product: A, operation: "Operation tracking" }] }) : fail(ctx, "get_operation_status", "access.read", "NOT_FOUND", "Operation reference not found or not bound to this caller."); },
  },
  {
    name: "get_operation_result", domain: "Access and operations", product: A, title: "Get operation result",
    description: "Return the permitted result or evidence for an operation reference, or an explicit pending state. Access is rechecked.",
    operation: "access.read", kind: "read", binding: "New tracking contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ operation_ref: s.str("Operation reference.") }, ["operation_ref"]),
    handler: (a, ctx) => { const o = operationLookup(a.operation_ref); return o ? ok(ctx, "get_operation_result", "access.read", { operationRef: a.operation_ref, kind: o.kind, status: o.status, result: o.view }, { sources: [{ product: A, operation: "Operation tracking" }], completeness: ["COMPLETE", "COMPLETED"].includes(o.status) ? "COMPLETE" : "PARTIAL", missingEvidence: ["COMPLETE", "COMPLETED"].includes(o.status) ? [] : ["Operation not complete; result pending."] }) : fail(ctx, "get_operation_result", "access.read", "NOT_FOUND", "Operation reference not found."); },
  },
];

ALL = [...accessTools, ...insightsTools, ...cmsTools, ...cartographerTools, ...projectsTools, ...tgdpTools];

export const TOOLS = ALL;
export const toolByName = (n: string) => ALL.find((t) => t.name === n);

export type AuditEntry = { at: string; route: string; host: string; principal: string; sessionId: string; channel: string; tool: string; operation: string; decision: string; status: string; ms: number; args: any };
export const audit: AuditEntry[] = [];

/** Single enforcement path: authenticate (caller), evaluate operation entitlement, invoke, envelope, audit. */
export function invoke(name: string, args: any, ctx: Ctx, channel: "console" | "mcp") {
  const t0 = Date.now();
  const t = toolByName(name);
  let out: any;
  if (!t) out = { status: "ERROR", error: { code: "UNKNOWN_TOOL", message: `Tool ${name} not found.` } };
  else {
    const denial = checkOperation(ctx, t.operation);
    if (denial) out = deny(ctx, name, t.operation, denial);
    else {
      try { out = t.handler(args ?? {}, ctx); }
      catch (e: any) { out = fail(ctx, name, t.operation, "INTERNAL_ERROR", "Tool execution failed. Retry; if it persists, report the operation reference.", { detail: String(e?.message ?? e) }); }
    }
  }
  const ms = Date.now() - t0 + 40 + Math.floor(Math.random() * 120); // includes simulated source latency
  audit.unshift({ at: new Date().toISOString(), route: (hostOf(ctx).route ?? []).join(" > "), host: ctx.host, principal: hostOf(ctx).principal, sessionId: ctx.sessionId, channel, tool: name, operation: t?.operation ?? "?", decision: out?.access?.decision ?? "N/A", status: out?.status, ms, args });
  if (audit.length > 500) audit.pop();
  return { out, ms, tool: t };
}

export function catalog() {
  return ALL.map((t) => ({ name: t.name, title: t.title, domain: t.domain, product: t.product, description: t.description, operation: t.operation, kind: t.kind, binding: t.binding, basis: t.basis, inputSchema: t.inputSchema }));
}
