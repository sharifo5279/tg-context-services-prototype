// Governance and world-model checks (no model calls). Tool behavior on current data is covered by the scenario library.
import { invoke } from "./tools/index.js";
import { decidePlan, Ctx } from "./runtime.js";
import { transactions, worldStats } from "./data/insights.js";
import { generateDay } from "./data/world.js";
import { PROFILES } from "./data/roster.js";

const ctx: Ctx = { host: "claude-connector", sessionId: "selftest", baseUrl: "http://localhost:3000" };
const sap: Ctx = { ...ctx, host: "sap-joule" };
let pass = 0, failed = 0;
const call = (n: string, a: any = {}, c = ctx) => invoke(n, a, c, "console").out;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`PASS ${name}`); } else { failed++; console.log(`FAIL ${name} ${detail}`); }
}
const r = (o: any) => o.result;
const DAY = 86400_000;

// World model
const ws = worldStats();
const oldest = transactions[transactions.length - 1]._t, newest = transactions[0]._t;
check("History covers about six months", (Date.now() - oldest) / DAY > 180 && (Date.now() - oldest) / DAY <= 184, `${((Date.now() - oldest) / DAY).toFixed(1)} days`);
check("Nothing visible from the future", newest <= Date.now());
check("Next 30 days generated ahead", ws.pending > 20000 && Date.parse(ws.horizon) - Date.now() > 29 * DAY, JSON.stringify(ws));
const bizDays: number[] = [];
for (let d = 1; d <= 28; d++) { const day = Math.floor(Date.now() / DAY) - d; const w = new Date(day * DAY).getUTCDay(); if (w === 0 || w === 6) continue; bizDays.push(transactions.filter((t) => Math.floor(t._t / DAY) === day && t.documentType !== "997" && t.documentType !== "CONTRL").length); }
const avg = bizDays.reduce((a, b) => a + b, 0) / bizDays.length;
check("Weekday business documents between 800 and 1,600", avg >= 800 && avg <= 1600, avg.toFixed(0));
const d0 = Math.floor(Date.now() / DAY) - 10;
const a = generateDay(d0), b = generateDay(d0);
check("Generation is deterministic", a.length === b.length && a.every((t, i) => t.transactionId === b[i].transactionId && t._t === b[i]._t));
check("Partner roster about 30 trading partners", PROFILES.length >= 28, String(PROFILES.length));
check("Environment reported as PRODUCTION", call("get_access_context").evidence.environment === "PRODUCTION");
check("No prototype wording in responses", !/prototype|seeded/i.test(JSON.stringify([call("get_access_context"), call("list_capabilities"), call("get_capability_contract", { name: "search_transactions" })])));

// Governance
check("Grant resolved", r(call("get_access_context")).grant.grantId === "GRT-HRG-2026-014");
const amb = call("search_transactions", { partner: "Northfield" });
check("Ambiguous partner returns candidates", amb.error?.code === "AMBIGUOUS_PARTNER" && amb.error.candidates.length === 2);
check("Denial: other organization", call("get_company", { company: "C30090001" }).status === "DENIED");
check("Denial: other BUID", call("get_company", { company: "C10023002" }).status === "DENIED");
check("Denial: billing not granted", call("get_billing_profile").status === "DENIED");
check("Scope before discovery", r(call("search_companies", { query: "Lakeshore" })).candidates.length === 0);
const anyTx = transactions.find((t) => t.documentType === "856" && t.sourceStatus === "DLVD")!;
check("Payload denied to SAP Joule service identity", call("get_transaction_payload", { transaction_id: anyTx.transactionId }, sap).status === "DENIED");
const prep = call("prepare_cross_reference_change", { entity: "STORE_TO_GLN", change: "ADD", key: "9901", values: { gln: "0614141990115", locationName: "Store 9901 Test", locationType: "STORE", active: "Y" } });
check("Prepare returns an approval plan", prep.status === "APPROVAL_REQUIRED", JSON.stringify(prep).slice(0, 200));
check("Apply before approval blocked", call("apply_cross_reference_change", { plan_id: prep.result?.planId }).error?.code === "APPROVAL_PENDING");
decidePlan(prep.result?.planId, true, "selftest");
check("Apply after approval verified", r(call("apply_cross_reference_change", { plan_id: prep.result?.planId }))?.verified === true);
check("Plan is single use", call("apply_cross_reference_change", { plan_id: prep.result?.planId }).status === "ERROR");
const big = call("search_transactions", { from: "30d", page_size: 50 });
check("Paging returns a cursor", !!big.evidence.pagination?.nextCursor);
check("Search beyond 183 days is partial", call("search_transactions", { status: "FAILED", from: "270d" }).evidence.completeness === "PARTIAL");
check("Unsupported filter is reported", call("search_transactions", { store_number: "0412" }).error?.code === "UNSUPPORTED_FILTER");

// Agent services and publishing
check("Knowledge: Harborview procedure first", r(call("search_knowledge", { query: "ASN failed missing cross-reference procedure" })).results[0].id === "KB-HRG-201");
check("Map rule: ship-to lookup", r(call("get_map_rule", { map: "BWHG_856_4010_IN", target_field: "ship-to" })).rules[0].ruleId === "R-1001-ST-07");
check("Connection health reported", ["UP", "DOWN", "DEGRADED"].includes(r(call("get_connection_status", { partner: "Atlas Toy" })).status));
check("Support ticket created", r(call("create_support_ticket", { summary: "Atlas AS2 outage", details: "MDN timeouts" })).ticketId.startsWith("CS-"));
const dep = await import("./deployments.js");
check("Every Studio agent published to Claude UI", dep.publishable().every((a: any) => dep.agentsFor("claude-ui").some((b: any) => b.id === a.id)));
check("Every Studio agent published to every client", dep.CLIENT_KEYS.every((h: any) => dep.agentsFor(h).length === dep.publishable().length));
check("Agent tool names", dep.toolNameFor("xref-checker") === "xref_checker_agent" && dep.toolNameFor("error-resolution") === "error_analysis_agent");
dep.blocked["sap-joule"].add("error-resolution");
check("Admin block removes agent", !dep.agentsFor("sap-joule").some((a: any) => a.id === "error-resolution"));
dep.resetDeployments();

console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
