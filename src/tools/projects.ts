// Requests and provisioning tools (Trading Grid Community Projects and Community Provisioning Services).
import * as O from "../data/other.js";
import { invitations, registrations, companyById } from "../data/cms.js";
import { ok, fail, createPlan, approvalRequired, consumePlan, Ctx } from "../runtime.js";
import { ToolDef, s, MODELED, NEW_CONTRACT, PAGE, paginate } from "./types.js";
import { eq } from "../util.js";
import { resolveCompany, parseTime } from "./common.js";

const P = "Trading Grid Community Projects";
const PV = "Trading Grid Community Provisioning Services";
const src = (product: string, op: string, ids?: string[]) => [{ product, operation: op, objectIds: ids }];

let crSeq = 10500, woSeq = 5600, trkSeq = 120;

/** Status advances with elapsed time so the demo shows asynchronous progress. */
export function crView(cr: any) {
  if (cr._rollingMin) { const { _rollingMin, ...rest } = cr; const t = Date.now() - _rollingMin * 60_000; return { ...rest, submittedAt: new Date(t).toISOString(), workOrders: cr.workOrders.map((w: any) => ({ ...w, stateSince: new Date(t + 15 * 60_000).toISOString(), ...(w.similarRequests ? { certificateReceivedAt: new Date(Date.now() - 10 * 60_000).toISOString() } : {}) })) }; }
  if (!cr._submittedMs) return cr;
  const age = (Date.now() - cr._submittedMs) / 1000;
  const state = age < 20 ? "SUBMITTED" : "ACCEPTED";
  const woState = age < 20 ? "NOT_CREATED" : age < 90 ? "NEW" : "IN_PROGRESS";
  const { _submittedMs, ...rest } = cr;
  return { ...rest, submissionState: state, workOrders: cr.workOrders.map((w: any) => ({ ...w, state: woState, stateSince: new Date(cr._submittedMs + (woState === "IN_PROGRESS" ? 90_000 : 20_000)).toISOString() })) };
}

export function provView(pv: any) {
  const age = (Date.now() - (pv._submittedMs ?? Date.parse(pv.submittedAt))) / 1000;
  const done = pv._completeAt ? Date.now() >= pv._completeAt : age >= 120;
  const status = done ? "COMPLETED" : age < 20 ? "QUEUED" : "IN_PROGRESS";
  const { _submittedMs, _completeAt, _resultRefs, ...rest } = pv;
  return { ...rest, status, resultRefs: done ? pv.resultRefs ?? pv._resultRefs : null };
}

const WO = s.obj({ type: s.str("Work order type from list_change_request_types."), fields: s.any("Field values for the work order type.") }, ["type", "fields"]);

export const projectsTools: ToolDef[] = [
  {
    name: "list_change_request_types", domain: "Requests and provisioning", product: P, title: "List change request types",
    description: "List request and work-order types available to the customer, with required fields.",
    operation: "request.read", kind: "read", binding: "Derived catalog from Request/WorkOrder schemas (no native list route)", basis: MODELED,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => ok(ctx, "list_change_request_types", "request.read", { defaultProject: O.DEFAULT_PROJECT, maxWorkOrdersPerRequest: 10, types: O.changeRequestTypes }, { sources: src(P, "Community Projects specification 1.0 schemas") }),
  },
  {
    name: "prepare_change_request", domain: "Requests and provisioning", product: P, title: "Prepare change request",
    description: "Validate a draft change request (title, up to ten work orders, evidence) against required fields and the customer's default project. Returns a plan that requires approval. Submits nothing.",
    operation: "request.submit", kind: "prepare", binding: "New contract using Request/WorkOrder schemas", basis: NEW_CONTRACT,
    inputSchema: s.obj({ title: s.str("Request title."), work_orders: s.arr(WO, "Work orders (1 to 10)."), evidence: s.str("Supporting evidence, e.g. transaction IDs.") }, ["title", "work_orders"]),
    handler: (a, ctx) => {
      const wos: any[] = a.work_orders ?? [];
      const checks: any[] = [{ check: "Default project resolved", result: "PASS", detail: O.DEFAULT_PROJECT.projectId }, { check: "1 to 10 work orders", result: wos.length >= 1 && wos.length <= 10 ? "PASS" : "FAIL" }];
      for (const [i, w] of wos.entries()) {
        const t = O.changeRequestTypes.find((x) => eq(x.type, w.type));
        if (!t) { checks.push({ check: `Work order ${i + 1} type`, result: "FAIL", detail: `Unknown type ${w.type}` }); continue; }
        const missing = t.requiredFields.filter((f) => w.fields?.[f] == null || w.fields?.[f] === "");
        checks.push({ check: `Work order ${i + 1} (${t.type}) required fields`, result: missing.length ? "FAIL" : "PASS", detail: missing.length ? `Missing: ${missing.join(", ")}` : undefined });
        if (w.fields?.partnerCompanyId) { const r = resolveCompany(w.fields.partnerCompanyId); checks.push({ check: `Work order ${i + 1} partner in scope`, result: r.kind === "ok" ? "PASS" : "FAIL" }); if (r.kind === "ok") w.fields.partnerCompanyId = r.company.companyId; }
      }
      const valid = !checks.some((c) => c.result === "FAIL");
      if (!valid) return fail(ctx, "prepare_change_request", "request.submit", "VALIDATION_FAILED", "Draft request did not pass validation. Provide the missing fields and prepare again.", { checks });
      const p = createPlan(ctx, "submit_change_request", "request.submit", O.DEFAULT_PROJECT.projectId, `Submit request "${a.title}" with ${wos.length} work order(s)`, { title: a.title, projectId: O.DEFAULT_PROJECT.projectId, workOrders: wos, evidence: a.evidence ?? null }, { valid, checks });
      return approvalRequired(ctx, "prepare_change_request", "request.submit", p, src(P, "Request/WorkOrder schema validation"));
    },
  },
  {
    name: "submit_change_request", domain: "Requests and provisioning", product: P, title: "Submit change request",
    description: "Submit an approved change-request plan. Rechecks access and returns the status ID and submission acknowledgment. Submission is not fulfillment.",
    operation: "request.submit", kind: "write", binding: "POST /TGCP/v1/work-orders-requests/", basis: MODELED,
    inputSchema: s.obj({ plan_id: s.str("Approved plan ID.") }, ["plan_id"]),
    handler: (a, ctx) => {
      const c = consumePlan(ctx, a.plan_id, "submit_change_request");
      if (c.problem) return fail(ctx, "submit_change_request", "request.submit", c.plan?.status === "PENDING_APPROVAL" ? "APPROVAL_PENDING" : "PLAN_INVALID", c.problem);
      const p = c.plan!.parameters;
      const n = ++crSeq;
      const cr = { statusId: `ST-${n}`, requestId: `REQ-${n}`, title: p.title, projectId: p.projectId, submittedAt: new Date().toISOString(), submittedBy: c.plan!.principal, approvedBy: c.plan!.approvedBy, planId: c.plan!.planId, workOrders: p.workOrders.map((w: any) => ({ workOrderId: `WO-${++woSeq}`, type: w.type, fields: w.fields, assignedTeam: w.type.includes("CONNECTION") ? "BN connectivity" : "BN mapping", attachments: [] })), _submittedMs: Date.now() };
      O.changeRequests.push(cr);
      c.plan!.status = "EXECUTED";
      c.plan!.executionResult = { statusId: cr.statusId };
      return ok(ctx, "submit_change_request", "request.submit", { ...crView(cr), operationRef: cr.statusId }, { sources: src(P, "POST /TGCP/v1/work-orders-requests/", [cr.statusId]), interpretation: "Request accepted for processing. Track with get_change_request_status; acceptance is not completion." });
    },
  },
  {
    name: "attach_change_request_file", domain: "Requests and provisioning", product: P, title: "Attach change request file",
    description: "Attach an approved file to a work order. First call returns a plan for approval; call again with plan_id to attach.",
    operation: "request.submit", kind: "write", binding: "POST /TGCP/v1/work-orders/files?workOrderId=...", basis: MODELED,
    inputSchema: s.obj({ work_order_id: s.str("Work order ID."), file_name: s.str("File name."), plan_id: s.str("Approved plan ID (second call).") }),
    handler: (a, ctx) => {
      if (!a.plan_id) {
        const wo = O.changeRequests.flatMap((r) => r.workOrders).find((w: any) => eq(w.workOrderId, a.work_order_id));
        if (!wo) return fail(ctx, "attach_change_request_file", "request.submit", "NOT_FOUND", "Work order not found.");
        const p = createPlan(ctx, "attach_change_request_file", "request.submit", a.work_order_id, `Attach ${a.file_name} to ${a.work_order_id}`, { workOrderId: wo.workOrderId, fileName: a.file_name });
        return approvalRequired(ctx, "attach_change_request_file", "request.submit", p, src(P, "GET /TGCP/v1/work-orders/status"));
      }
      const c = consumePlan(ctx, a.plan_id, "attach_change_request_file");
      if (c.problem) return fail(ctx, "attach_change_request_file", "request.submit", "PLAN_INVALID", c.problem);
      const wo = O.changeRequests.flatMap((r) => r.workOrders).find((w: any) => w.workOrderId === c.plan!.parameters.workOrderId);
      wo.attachments.push({ fileName: c.plan!.parameters.fileName, attachedAt: new Date().toISOString() });
      c.plan!.status = "EXECUTED";
      return ok(ctx, "attach_change_request_file", "request.submit", { receipt: { workOrderId: wo.workOrderId, fileName: c.plan!.parameters.fileName, receivedAt: new Date().toISOString() } }, { sources: src(P, `POST /TGCP/v1/work-orders/files?workOrderId=${wo.workOrderId}`) });
    },
  },
  {
    name: "list_change_requests", domain: "Requests and provisioning", product: P, title: "List change requests",
    description: "List change requests (work-order requests) with their work orders. Filter by state, type, partner, submitter or date; open returns requests with unfinished work orders.",
    operation: "request.read", kind: "read", binding: "GET /TGCP/v1/work-orders-requests (filtered)", basis: MODELED,
    inputSchema: s.obj({
      state: s.str("Submission or work-order state: SUBMITTED, ACCEPTED, REJECTED, NEW, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED, or OPEN (any unfinished work order)."),
      type: s.str("Work-order type, e.g. AS2_CONNECTION or MAP_CHANGE (see list_change_request_types)."),
      partner: s.str("Partner company ID or name."),
      submitted_by: s.str("Submitter user ID."),
      from: s.str("Submitted on or after: ISO date or relative such as 30d."),
      ...PAGE,
    }),
    handler: (a, ctx) => {
      let pid: string | null = null;
      if (a.partner) { const r = resolveCompany(a.partner); if (r.kind !== "ok") return fail(ctx, "list_change_requests", "request.read", r.kind === "ambiguous" ? "AMBIGUOUS_PARTNER" : "NOT_FOUND", r.kind === "ambiguous" ? `'${a.partner}' matches several partners. Select one.` : `No permitted partner matches '${a.partner}'.`, r.kind === "ambiguous" ? { candidates: (r as any).candidates } : {}); pid = r.company.companyId; }
      const from = a.from ? parseTime(a.from) : null;
      const st = a.state ? String(a.state).toUpperCase() : null;
      const DONE = ["COMPLETED", "CANCELLED", "REJECTED"];
      const rows = O.changeRequests.map(crView).filter((c: any) =>
        (!pid || c.partnerCompanyId === pid) && (!a.submitted_by || eq(c.submittedBy, a.submitted_by)) && (!from || Date.parse(c.submittedAt) >= from)
        && (!a.type || c.workOrders.some((w: any) => eq(w.type, a.type)))
        && (!st || (st === "OPEN" ? c.submissionState !== "REJECTED" && c.workOrders.some((w: any) => !DONE.includes(w.state)) : eq(c.submissionState, st) || c.workOrders.some((w: any) => eq(w.state, st)))))
        .sort((x: any, y: any) => String(y.submittedAt).localeCompare(String(x.submittedAt)));
      const { page, pagination } = paginate(rows, a);
      const byState: Record<string, number> = {};
      for (const c of rows) for (const w of (c as any).workOrders) byState[w.state] = (byState[w.state] ?? 0) + 1;
      return ok(ctx, "list_change_requests", "request.read", {
        total: rows.length, workOrdersByState: byState,
        changeRequests: page.map((c: any) => ({ statusId: c.statusId, title: c.title, partner: c.partnerCompanyId ? companyById(c.partnerCompanyId)?.companyName ?? c.partnerCompanyId : null, submittedAt: c.submittedAt, submittedBy: c.submittedBy, submissionState: c.submissionState, ...(c.rejectionReason ? { rejectionReason: c.rejectionReason } : {}), workOrders: c.workOrders.map((w: any) => ({ workOrderId: w.workOrderId, type: w.type, state: w.state, stateSince: w.stateSince, assignedTeam: w.assignedTeam, ...(w.holdReason ? { holdReason: w.holdReason, waitingOn: w.waitingOn ?? null } : {}) })) })),
      }, { sources: src(P, "GET /TGCP/v1/work-orders-requests"), pagination, interpretation: "Submission state shows whether the request was accepted. Work-order state shows delivery progress." });
    },
  },
  {
    name: "get_change_request_status", domain: "Requests and provisioning", product: P, title: "Get change request status",
    description: "Get a request's submission state and work-order references by status ID.",
    operation: "request.read", kind: "read", binding: "GET /TGCP/v1/work-orders-requests/status/{statusId}", basis: MODELED,
    inputSchema: s.obj({ status_id: s.str("Status ID (ST-...).") }, ["status_id"]),
    handler: (a, ctx) => { const cr = O.changeRequests.find((r) => eq(r.statusId, a.status_id)); return cr ? ok(ctx, "get_change_request_status", "request.read", crView(cr), { sources: src(P, `GET /TGCP/v1/work-orders-requests/status/${cr.statusId}`), interpretation: "Submission state and work-order state are reported as recorded by the source." }) : fail(ctx, "get_change_request_status", "request.read", "NOT_FOUND", "Status ID not found."); },
  },
  {
    name: "get_work_order_status", domain: "Requests and provisioning", product: P, title: "Get work order status",
    description: "Get a work order's authoritative state.",
    operation: "request.read", kind: "read", binding: "GET /TGCP/v1/work-orders/status?workOrderId=...", basis: MODELED,
    inputSchema: s.obj({ work_order_id: s.str("Work order ID.") }, ["work_order_id"]),
    handler: (a, ctx) => {
      for (const cr of O.changeRequests) { const v = crView(cr); const w = v.workOrders.find((x: any) => eq(x.workOrderId, a.work_order_id)); if (w) return ok(ctx, "get_work_order_status", "request.read", { ...w, statusId: v.statusId, requestTitle: v.title, daysInState: Math.floor((Date.now() - Date.parse(w.stateSince)) / 86400_000) }, { sources: src(P, `GET /TGCP/v1/work-orders/status?workOrderId=${w.workOrderId}`) }); }
      return fail(ctx, "get_work_order_status", "request.read", "NOT_FOUND", "Work order not found.");
    },
  },
  {
    name: "prepare_partner_provisioning", domain: "Requests and provisioning", product: P, title: "Prepare partner provisioning",
    description: "Build and validate a provisioning XML plan from an invitation and an approved customer template. Returns a plan that requires approval. Submits nothing.",
    operation: "provisioning.submit", kind: "prepare", binding: "New contract; resolves BUID, solution and template requirements", basis: NEW_CONTRACT,
    inputSchema: s.obj({ invitation_id: s.int("Invitation ID."), company: s.str("Invitee company ID or name (alternative to invitation_id)."), template_name: s.str("Template, e.g. HRG_SUPPLIER_STD."), trading_address: s.str("Requested trading address (qualifier:address)."), delivery_method: s.str("AS2, SFTP or VAN_INTERCONNECT.") }, ["template_name"]),
    handler: (a, ctx) => {
      let inv = a.invitation_id ? invitations.find((i) => i.invitationId === Number(a.invitation_id)) : undefined;
      if (!inv && a.company) { const r = resolveCompany(a.company); if (r.kind === "ok") inv = invitations.find((i) => i._companyId === r.company.companyId); }
      if (!inv) return fail(ctx, "prepare_partner_provisioning", "provisioning.submit", "NOT_FOUND", "No invitation found for the partner. Invite the partner first.");
      const t = O.provisioningTemplates.find((x) => eq(x.templateName, a.template_name));
      if (!t) return fail(ctx, "prepare_partner_provisioning", "provisioning.submit", "VALIDATION_FAILED", `Template ${a.template_name} is not approved for this customer.`, { approvedTemplates: O.provisioningTemplates.map((x) => x.templateName) });
      const reg = registrations.find((r) => r.company.id === inv!._companyId);
      const co = companyById(inv._companyId)!;
      const addr = a.trading_address ?? `ZZ:${co.companyName.replace(/[^A-Z]/gi, "").toUpperCase().slice(0, 12)}`;
      const dm = (a.delivery_method ?? "AS2").toUpperCase();
      const checks = [
        { check: "Invitation belongs to hub", result: "PASS", detail: `Invitation ${inv.invitationId} (${inv.invitationStatus})` },
        { check: "Template approved for customer", result: "PASS", detail: t.templateName },
        { check: "BUID and solution rights", result: "PASS", detail: "BU-HRG-US / SOL-HRG-RETAIL-01" },
        { check: "Trading address available", result: "PASS", detail: addr },
        { check: "Registration status", result: reg?.request.status === "APPROVED" ? "PASS" : "WARNING", detail: reg ? `Request ${reg.requestId} is ${reg.request.status}. Provisioning waits for registration approval.` : "No registration request recorded." },
      ];
      const xml = [`<TradingPartnerProvisioning template="${t.templateName}">`, `  <Invitation id="${inv.invitationId}"/>`, `  <Company name="${co.companyName}" id="${co.companyId}"/>`, `  <Hub companyId="C10023001" buid="BU-HRG-US" solutionId="SOL-HRG-RETAIL-01"/>`, `  <Mailbox create="true"/>`, `  <TradingAddress value="${addr}" deliveryMethod="${dm}"/>`, `  <Relationships documents="850,855,856,810,997" type="TEST"/>`, `</TradingPartnerProvisioning>`].join("\n");
      const p = createPlan(ctx, "submit_partner_provisioning", "provisioning.submit", co.companyId, `Provision ${co.companyName} from ${t.templateName}`, { invitationId: inv.invitationId, templateName: t.templateName, companyId: co.companyId, tradingAddress: addr, deliveryMethod: dm, xmlPlan: xml }, { valid: true, checks });
      return approvalRequired(ctx, "prepare_partner_provisioning", "provisioning.submit", p, src(PV, "Invitation and template reads"));
    },
  },
  {
    name: "submit_partner_provisioning", domain: "Requests and provisioning", product: PV, title: "Submit partner provisioning",
    description: "Submit an approved provisioning XML plan. Returns an asynchronous tracking ID.",
    operation: "provisioning.submit", kind: "write", binding: "POST /CommunityProvisioningServices/v2/onboarding/tradingPartnerProvisionings", basis: MODELED,
    inputSchema: s.obj({ plan_id: s.str("Approved plan ID.") }, ["plan_id"]),
    handler: (a, ctx) => {
      const c = consumePlan(ctx, a.plan_id, "submit_partner_provisioning");
      if (c.problem) return fail(ctx, "submit_partner_provisioning", "provisioning.submit", c.plan?.status === "PENDING_APPROVAL" ? "APPROVAL_PENDING" : "PLAN_INVALID", c.problem);
      const p = c.plan!.parameters;
      const pv = { trackingId: `TRK-${++trkSeq}`, templateName: p.templateName, invitationId: p.invitationId, submittedAt: new Date().toISOString(), planId: c.plan!.planId, _submittedMs: Date.now(), _resultRefs: { companyId: p.companyId, mailboxId: `MB-${p.companyId}-01`, tradingAddress: p.tradingAddress, tradingPartnerRelationshipIds: [`TPR-${70200 + trkSeq}`] } };
      O.provisionings.push(pv);
      c.plan!.status = "EXECUTED";
      return ok(ctx, "submit_partner_provisioning", "provisioning.submit", { ...provView(pv), operationRef: pv.trackingId }, { sources: src(PV, "POST /CommunityProvisioningServices/v2/onboarding/tradingPartnerProvisionings", [pv.trackingId]), interpretation: "Submission accepted. Track with get_partner_provisioning_status." });
    },
  },
  {
    name: "get_partner_provisioning_status", domain: "Requests and provisioning", product: PV, title: "Get partner provisioning status",
    description: "Get provisioning source status and result references by tracking ID.",
    operation: "request.read", kind: "read", binding: "GET /CommunityProvisioningServices/v2/onboarding/tradingPartnerProvisionings/{trackingId}/status", basis: MODELED,
    inputSchema: s.obj({ tracking_id: s.str("Tracking ID.") }, ["tracking_id"]),
    handler: (a, ctx) => { const pv = O.provisionings.find((x) => eq(x.trackingId, a.tracking_id)); return pv ? ok(ctx, "get_partner_provisioning_status", "request.read", provView(pv), { sources: src(PV, `GET /CommunityProvisioningServices/v2/onboarding/tradingPartnerProvisionings/${pv.trackingId}/status`) }) : fail(ctx, "get_partner_provisioning_status", "request.read", "NOT_FOUND", "Tracking ID not found."); },
  },
];
