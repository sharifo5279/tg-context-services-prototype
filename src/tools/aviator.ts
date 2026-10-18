// Trading Grid Aviator agent services used by specific agents. These are not part of the 95-tool
// Context Services inventory: agents call them inside the runtime, and they are not listed over MCP.
import { ok, fail, Ctx } from "../runtime.js";
import { ToolDef, s } from "./types.js";
import { maps } from "../data/other.js";
import { companyById } from "../data/cms.js";
import { eq } from "../util.js";
import { resolveCompany } from "./common.js";
import { connectionStatus } from "../data/monitor.js";

const DEMO = "Demo construct: Aviator agent service (not a Context Connectors tool)";
const AV = "Trading Grid Aviator";

const NOW = Date.now();
const ago = (h: number) => new Date(NOW - h * 3600_000).toISOString();

// ---- Knowledge base: Trading Grid documentation plus Harborview procedures ----------------------------
export const KNOWLEDGE = [
  { id: "KB-TG-101", source: "Trading Grid documentation", title: "Request a new map in Trading Grid Community Projects", text: "Open Community Projects. Select the project, then Menu > New Request or Create Request. Choose Trading Partners > Create New Trading Partner(s) or the existing partner. Select Use Existing Map(s) and Create New Map(s). Enter request name, requester, users to notify and approver. Attach the partner's implementation guide and sample files. Submit. Work orders move through the workflow and notifications go to responsible parties." },
  { id: "KB-TG-102", source: "Trading Grid documentation", title: "Reprocess versus redelivery in TG Insights", text: "Reprocess runs a failed file through processing again, for file-level system errors. Redelivery resends a document that was processed but failed to deliver, for example after a partner endpoint outage. Bulk redelivery supports up to 30 failed transactions in one action. Redelivered status is available as a facet." },
  { id: "KB-TG-103", source: "Trading Grid documentation", title: "Functional acknowledgment status", text: "A 997 or CONTRL confirms syntax only. AK501=A means accepted, E accepted with errors, R rejected. An accepted 997 does not mean the business document was translated or delivered. Outbound Document Tracking marks an acknowledgment overdue after delinquency cycles." },
  { id: "KB-TG-104", source: "Trading Grid documentation", title: "Cross-reference tables in Cartographer", text: "Cross-reference tables hold lookup values used by maps, such as store number to GLN. Reserve the table before editing. Changes apply to documents processed after the change; documents that already failed must be reprocessed or resent." },
  { id: "KB-HRG-201", source: "Harborview procedure", title: "Harborview: ASN failed because of a missing cross-reference", text: "1. EDI team confirms the failing key and the map that uses it. 2. EDI team prepares the cross-reference entry; the EDI manager approves it. 3. After the entry is applied, run a map test with the failed file. 4. Ask the supplier to resend the ASN, or reprocess if the file is retained. 5. Tell the DC receiving team the expected ASN time. Do not ask the supplier to change a correct document." },
  { id: "KB-HRG-202", source: "Harborview procedure", title: "Harborview: opening a new distribution center", text: "Before the first receipt at a new DC, the EDI team adds the DC to STORE_TO_GLN with location type DC and active Y, and confirms all inbound 856 maps that resolve ship-to by store number. Owner: EDI team. Approver: EDI manager." },
  { id: "KB-HRG-203", source: "Harborview procedure", title: "Harborview: supplier acknowledgment terms", text: "Suppliers return a 997 within 24 hours of each 850 and an 855 within 48 hours. After FA cycle 2 the buying desk contacts the supplier's support contact. Rejected 997s are handled by the EDI team the same day." },
  { id: "KB-HRG-204", source: "Harborview procedure", title: "Harborview: when to open a support ticket", text: "Open a Business Network support ticket when a failure is on the OpenText side, when an endpoint is down for more than two hours, or when a map change is needed. Include transaction IDs, control numbers, error codes and the checks already done." },
];

// ---- Map rules (Contivo) --------------------------------------------------------------------------------
const RULES: Record<string, any[]> = {
  "M-1001": [
    { ruleId: "R-1001-ST-07", targetPath: "DESADV/E1EDKA1[PARVW='WE']/ILNNR", targetField: "Ship-to GLN", sourcePaths: ["N1[N101='ST']/N103", "N1[N101='ST']/N104"],
      explanation: "Sets the ship-to GLN on the inbound delivery. If the supplier sends a GLN (N103=UL) it is used as is. If the supplier sends a store number (N103=92), the map looks up STORE_TO_GLN by that number. Any other qualifier fails the document.",
      conditions: [{ when: "N103 = 'UL'", then: "ILNNR = N104" }, { when: "N103 = '92'", then: "ILNNR = xref('STORE_TO_GLN', N104).gln; fail with XREF-404 if the key is missing" }, { when: "otherwise", then: "fail with MAP-TRN-221 'Unsupported ship-to qualifier'" }],
      snippet: "if (N103 == \"UL\") { ILNNR = N104; }\nelse if (N103 == \"92\") { ILNNR = lookup(\"STORE_TO_GLN\", N104, \"gln\", onMissing: FAIL(\"XREF-404\")); }\nelse { FAIL(\"MAP-TRN-221\"); }",
      example: { input: "N1*ST*Harborview Store 0214*92*0214~", output: "ILNNR = 0614141002146" }, changedIn: "v7 (WO-5488)" },
    { ruleId: "R-1001-TD-02", targetPath: "DESADV/E1EDL20/BTGEW", targetField: "Gross weight", sourcePaths: ["TD1/TD107"], explanation: "Copies TD107 gross weight; defaults to 0 with a warning if missing.", conditions: [{ when: "TD107 present", then: "BTGEW = TD107" }, { when: "otherwise", then: "BTGEW = 0, warning W-TD1" }], snippet: "BTGEW = TD107 ?? warn(0, \"W-TD1\");", example: { input: "TD1*CTN25*12****G*240*LB~", output: "BTGEW = 240" }, changedIn: "v3" },
  ],
  "M-1002": [
    { ruleId: "R-1002-IT-04", targetPath: "INVOIC/E1EDP01/VPREI", targetField: "Unit price", sourcePaths: ["IT1/IT104"], explanation: "Parses IT104 as a decimal with a period separator. A comma separator fails validation before translation.", conditions: [{ when: "IT104 matches ^\\d+(\\.\\d+)?$", then: "VPREI = IT104" }, { when: "otherwise", then: "fail with X12-SYN-104" }], snippet: "VPREI = decimal(IT104, separator: \".\", onError: FAIL(\"X12-SYN-104\"));", example: { input: "IT1*1*24*EA*12.40**UP*012345678905~", output: "VPREI = 12.40" }, changedIn: "v2" },
  ],
};



export const tickets: any[] = [];
let tSeq = 48210;

export const aviatorTools: ToolDef[] = [
  {
    name: "search_knowledge", domain: "Aviator agent services", product: AV, title: "Search knowledge",
    description: "Search Trading Grid documentation and Harborview's own procedures. Client procedures come first when they apply.",
    operation: "access.read", kind: "read", binding: "Trading Grid Aviator knowledge base", basis: DEMO,
    inputSchema: s.obj({ query: s.str("Question or keywords.") }, ["query"]),
    handler: (a, ctx) => {
      const words = String(a.query).toLowerCase().split(/\W+/).filter((w) => w.length > 2);
      const scored = KNOWLEDGE.map((k) => ({ k, score: words.reduce((n, w) => n + ((`${k.title} ${k.text}`.toLowerCase().match(new RegExp(w, "g")) ?? []).length), 0) + (k.source.startsWith("Harborview") ? 0.5 : 0) }))
        .filter((x) => x.score > 0.5).sort((x, y) => y.score - x.score).slice(0, 4).map((x) => x.k);
      return ok(ctx, "search_knowledge", "access.read", { results: scored }, { sources: [{ product: AV, operation: "Knowledge base search" }], completeness: scored.length ? "COMPLETE" : "UNKNOWN", missingEvidence: scored.length ? [] : ["No matching article or procedure."] });
    },
  },
  {
    name: "create_support_ticket", domain: "Aviator agent services", product: AV, title: "Create support ticket",
    description: "Create a Business Network support ticket from the conversation, with transaction IDs, error codes and checks already performed.",
    operation: "support.ticket.create", kind: "write", binding: "Business Network support case intake", basis: DEMO,
    inputSchema: s.obj({ summary: s.str("One-line summary."), details: s.str("What happened, checks performed, impact."), transaction_ids: s.arr(s.str("Transaction ID"), "Related transaction IDs."), severity: s.str("LOW, MEDIUM or HIGH.") }, ["summary", "details"]),
    handler: (a, ctx) => {
      const t = { ticketId: `CS-${++tSeq}`, status: "RECEIVED", queue: "Business Network support", summary: a.summary, details: a.details, transactionIds: a.transaction_ids ?? [], severity: (a.severity ?? "MEDIUM").toUpperCase(), createdAt: new Date().toISOString(), createdBy: "jordan.lee@harborviewretail.com", via: ctx.host };
      tickets.push(t);
      return ok(ctx, "create_support_ticket", "support.ticket.create", t, { sources: [{ product: AV, operation: "Support case intake", objectIds: [t.ticketId] }], interpretation: "Ticket received. Support will reach out by email with updates." });
    },
  },
  {
    name: "get_map_rule", domain: "Aviator agent services", product: "Trading Grid Cartographer", title: "Get map rule",
    description: "Return mapping rules for a map, optionally for one target field: conditions, transformation trace, snippet and example. Contivo maps only.",
    operation: "map.read", kind: "read", binding: "Cartographer mapping rule explorer (Contivo)", basis: DEMO,
    inputSchema: s.obj({ map: s.str("Map ID or name."), target_field: s.str("Target field or path fragment, e.g. ship-to GLN.") }, ["map"]),
    handler: (a, ctx) => {
      const m = maps.find((x) => eq(x.mapId, a.map) || eq(x.mapName, a.map));
      if (!m) return fail(ctx, "get_map_rule", "map.read", "NOT_FOUND", "Map not found.");
      let rules = RULES[m.mapId] ?? [];
      if (a.target_field) { const q = String(a.target_field).toLowerCase(); const f = rules.filter((r) => `${r.targetField} ${r.targetPath}`.toLowerCase().includes(q) || q.split(/\W+/).some((w: string) => w.length > 3 && r.targetField.toLowerCase().includes(w))); if (f.length) rules = f; }
      return ok(ctx, "get_map_rule", "map.read", { mapId: m.mapId, mapName: m.mapName, version: m.version, translator: m.translator, rules }, { sources: [{ product: "Trading Grid Cartographer", operation: `Rule explorer ${m.mapId}` }], completeness: rules.length ? "COMPLETE" : "UNKNOWN", missingEvidence: rules.length ? [] : ["No rule detail available for this map in the prototype."] });
    },
  },
  {
    name: "get_connection_status", domain: "Aviator agent services", product: "Trading Grid communications gateway", title: "Get connection status",
    description: "Return connection health for a partner: protocol, status, last success, recent failures, partner pickup and certificate expiry.",
    operation: "connectivity.read", kind: "read", binding: "Communications gateway health", basis: DEMO,
    inputSchema: s.obj({ partner: s.str("Partner company ID or name.") }, ["partner"]),
    handler: (a, ctx) => {
      const r = resolveCompany(a.partner);
      if (r.kind !== "ok") return fail(ctx, "get_connection_status", "connectivity.read", r.kind === "ambiguous" ? "AMBIGUOUS_PARTNER" : "NOT_FOUND", r.kind === "ambiguous" ? "Several partners match. Select one." : "Partner not found in permitted scope.", r.kind === "ambiguous" ? { candidates: (r as any).candidates } : {});
      const c = connectionStatus(r.company.companyId);
      if (!c) return ok(ctx, "get_connection_status", "connectivity.read", { partner: r.company.companyName, status: "UNKNOWN" }, { sources: [{ product: "Communications gateway", operation: "Health" }], completeness: "UNKNOWN", missingEvidence: ["No connection health recorded."] });
      return ok(ctx, "get_connection_status", "connectivity.read", { partner: companyById(r.company.companyId)!.companyName, ...c }, { sources: [{ product: "Communications gateway", operation: "Health", objectIds: [r.company.companyId] }], freshnessSeconds: 120 });
    },
  },
];
