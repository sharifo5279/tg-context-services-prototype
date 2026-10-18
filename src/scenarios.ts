// Scenario library: executable test scenarios for every Context Services tool against the seeded data.
// Each scenario names the tool, the arguments, the expected status and a check on the result.
// Flows chain several calls (prepare, approve, submit). Prompts let the same scenario run through an agent.
import { invoke } from "./tools/index.js";
import { toolByName } from "./tools/index.js";
import { decidePlan, clientStatus, Ctx, HostKey } from "./runtime.js";
import { resetData } from "./reset.js";
import { serializeState, setState } from "./state.js";

type Out = { status: string; result?: any; error?: any; evidence?: any; access?: any };
type Args = Record<string, any> | ((p: Out[]) => Record<string, any>);
type Check = [string, (o: Out, p: Out[]) => boolean];
type Step = { tool: string; args?: Args; expect: string; code?: string; check?: Check; approve?: boolean; host?: HostKey };
export type Scenario = { id: string; title: string; kind: string; host?: HostKey; prompt?: string; steps: Step[]; setup?: () => void };

import { findExamples } from "./data/examples.js";
import { STORES } from "./data/insights.js";
import { changeRequests } from "./data/other.js";
const rejectedCr = () => need(changeRequests.find((c) => c.submissionState === "REJECTED")).statusId;

class Skip extends Error {}
let exCache: ReturnType<typeof findExamples> | null = null;
/** Current examples from the observed traffic (cached for one run). */
const EX = () => (exCache ??= findExamples());
/** Returns the value or skips the scenario when no current example exists. */
function need<T>(v: T | null | undefined): T { if (v == null) throw new Skip("No current example"); return v; }
const glnFor = (d12: string) => { let s = 0; for (let i = 0; i < 12; i++) s += Number(d12[i]) * (i % 2 === 0 ? 1 : 3); return d12 + String((10 - (s % 10)) % 10); };
const storeGln = (n: string) => STORES[n]?.gln ?? glnFor(`0614141${n.padStart(5, "0")}`);
const has = (n: number) => (x: any[]) => Array.isArray(x) && x.length >= n;
const R = (o: Out) => o.result ?? {};

const list: Scenario[] = [];
let n = 0;
const id = () => `SC-${String(++n).padStart(3, "0")}`;
/** Single-call scenario. */
function S(tool: string, title: string, kind: string, args: Args, expect = "OK", o: { check?: Check; code?: string; host?: HostKey; prompt?: string; setup?: () => void } = {}) {
  list.push({ id: id(), title, kind, host: o.host, prompt: o.prompt, setup: o.setup, steps: [{ tool, args, expect, code: o.code, check: o.check, host: o.host }] });
}
/** Multi-step flow. */
function F(title: string, kind: string, steps: Step[], o: { prompt?: string; host?: HostKey } = {}) {
  list.push({ id: id(), title, kind, host: o.host, prompt: o.prompt, steps });
}
const plan = (p: Out[], i = p.length - 1) => R(p[i]).planId;

// ---------------------------------------------------------------- Access and operations
S("get_access_context", "Read the caller's grant", "Happy path", {}, "OK", { check: ["Grant GRT-HRG-2026-014", (o) => R(o).grant?.grantId === "GRT-HRG-2026-014"], prompt: "What can this connection access in Trading Grid?" });
S("get_access_context", "Service identity has no end user", "Happy path", {}, "OK", { host: "sap-joule", check: ["No end user", (o) => R(o).endUser === null] });
S("list_capabilities", "List authorized capabilities", "Happy path", {}, "OK", { check: ["At least 100 capabilities", (o) => R(o).totalAuthorized >= 100] });
S("list_capabilities", "Filter capabilities by domain", "Filter", { domain: "Cross-reference" }, "OK", { check: ["Only matching domains", (o) => R(o).domains.every((d: any) => /cross-reference/i.test(d.domain))] });
S("list_capabilities", "Discovery hides payload access from SAP Joule", "Access denied", {}, "OK", { host: "sap-joule", check: ["No get_transaction_payload", (o) => !JSON.stringify(R(o)).includes("get_transaction_payload")] });
S("get_capability_contract", "Read a capability contract", "Happy path", { name: "search_transactions" }, "OK", { check: ["Input schema present", (o) => !!R(o).inputSchema] });
S("get_capability_contract", "Unknown capability", "Not found", { name: "delete_partner" }, "ERROR", { code: "UNAVAILABLE" });
S("get_capability_contract", "Capability not authorized for caller", "Access denied", { name: "get_transaction_payload" }, "ERROR", { host: "sap-joule", code: "UNAVAILABLE" });
S("get_operation_status", "Status of an accepted change request", "Happy path", { operation_ref: "ST-10421" }, "OK", { check: ["Kind change_request", (o) => R(o).kind === "change_request"] });
S("get_operation_status", "Status of a completed provisioning", "Happy path", { operation_ref: "TRK-PGH-0091" }, "OK", { check: ["Kind partner_provisioning", (o) => R(o).kind === "partner_provisioning"] });
S("get_operation_status", "Unknown operation reference", "Not found", { operation_ref: "ST-99999" }, "ERROR", { code: "NOT_FOUND" });
S("get_operation_result", "Result of a change request", "Happy path", { operation_ref: "ST-10388" }, "OK", { check: ["Result returned", (o) => !!R(o).result] });
S("get_operation_result", "Result of a rejected change request", "Happy path", () => ({ operation_ref: rejectedCr() }), "OK", { check: ["Rejected", (o) => JSON.stringify(R(o)).includes("REJECTED")] });
S("get_operation_result", "Unknown operation reference", "Not found", { operation_ref: "EXP-0000" }, "ERROR", { code: "NOT_FOUND" });

// ---------------------------------------------------------------- Transaction evidence (TG Insights)
S("search_transactions", "Failed ASNs in the last 30 days", "Filter", { document_type: "856", status: "FAILED", from: "30d" }, "OK", { check: ["Only failed 856s", (o) => R(o).transactions.every((t: any) => t.documentType === "856")], prompt: "Which ASNs failed in the last 7 days, and why?" });
S("search_transactions", "Ambiguous partner name", "Ambiguous", { partner: "Northfield" }, "ERROR", { code: "AMBIGUOUS_PARTNER" });
S("search_transactions", "Partner outside the grant", "Access denied", { partner: "Lakeshore Market" }, "ERROR");
S("search_transactions", "Find by business key", "Happy path", () => ({ key_value: need(EX().deliveredInvoice).invoiceNumber }), "OK", { check: ["One document", (o) => R(o).counts.documents >= 1] });
S("search_transactions", "Find by ship-to GLN", "Filter", { ship_to_gln: "0614141001019", from: "7d" }, "OK", { check: ["Matches", (o) => R(o).counts.documents >= 1], prompt: "Show POs shipping to store 0101 (GLN 0614141001019) this week." });
S("search_transactions", "Test environment only", "Filter", { environment: "TEST", from: "30d" }, "OK", { check: ["Test documents", (o) => R(o).counts.documents >= 1] });
S("search_transactions", "Window beyond the 183-day search limit", "Partial evidence", { from: "2025-01-01T00:00:00Z", to: "2025-02-01T00:00:00Z" }, "OK", { check: ["Completeness PARTIAL with missing evidence", (o) => o.evidence?.completeness === "PARTIAL" && o.evidence?.missingEvidence?.length > 0] });
S("search_transactions", "Paginate results", "Pagination", { from: "30d", page_size: 10 }, "OK", { check: ["Next cursor returned", (o) => !!(R(o).nextCursor ?? o.evidence?.pagination?.nextCursor)] });
S("search_transactions", "3PL shipment status messages", "Filter", { partner: "Crestline Logistics", document_type: "214", from: "2d" }, "OK", { check: ["214s found", (o) => R(o).counts.documents >= 1], prompt: "Show Crestline 214 shipment status messages from the last 2 days." });
S("search_transactions", "Remittances in the last 30 days", "Filter", { document_type: "820", from: "30d" }, "OK", { check: ["820s found", (o) => R(o).counts.documents >= 1] });
S("search_transactions", "In-process documents older than 6 hours", "Filter", () => (need(EX().stuckInProcess), { status: "IN_PROCESS", modified_before: "6h", from: "7d" }), "OK", { check: ["Current stuck file listed", (o) => JSON.stringify(R(o)).includes(need(EX().stuckInProcess).transactionId)], prompt: "Which documents have been in process for more than 6 hours?" });
S("get_transaction", "Read a failed ASN", "Happy path", () => ({ key_value: need(EX().failedAsn).shipmentId }), "OK", { check: ["FAIL with error", (o) => R(o).sourceStatus === "FAIL" && !!R(o).errors?.[0]?.code] });
S("get_transaction", "Read by transaction ID", "Happy path", () => ({ transaction_id: need(EX().deliveredAsn).transactionId }), "OK", { check: ["856", (o) => R(o).documentType === "856"] });
S("get_transaction", "Unknown key", "Not found", { key_value: "SH-00000" }, "ERROR");
S("get_transaction", "Short-shipped 945", "Happy path", () => ({ transaction_id: need(EX().shortShipment).transactionId }), "OK", { check: ["Shipped below ordered", (o) => R(o).refs.quantityShipped < R(o).refs.quantityOrdered], prompt: "Which Crestline shipping orders were short shipped this month?" });
S("get_transaction", "Read a chargeback (812)", "Happy path", () => ({ key_value: need(EX().chargeback).adjustmentNumber }), "OK", { check: ["812", (o) => R(o).documentType === "812"] });
S("get_related_transactions", "Full PO lifecycle", "Happy path", () => ({ po_number: need(EX().poLifecycle) }), "OK", { check: ["850 to 810", (o) => ["850", "855", "856", "810"].every((d) => JSON.stringify(R(o)).includes(`"${d}"`))], prompt: "Show everything related to a recent PO that has shipped and been invoiced." });
S("get_related_transactions", "POs missing an 855", "Filter", { scan: "MISSING_855", older_than_hours: 48, from: "7d" }, "OK");
S("get_related_transactions", "Invoice received before ASN", "Filter", { scan: "INVOICE_BEFORE_ASN", from: "14d" }, "OK");
S("get_related_transactions", "Invoice without a PO", "Filter", { scan: "INVOICE_WITHOUT_PO", from: "30d" }, "OK");
S("get_related_transactions", "Web EDI POs missing an ASN", "Filter", { scan: "MISSING_856", partner: "Maple Ridge Crafts", older_than_hours: 72, from: "30d" }, "OK");
S("get_acknowledgment_evidence", "Partner with missing 997s", "Happy path", () => ({ partner: need(EX().missingAck).partnerCompanyId, ack_filter: "MISSING", from: "4d" }), "OK", { check: ["Missing acknowledgments", (o) => R(o).summary?.missing >= 1], prompt: "Which outbound POs have no 997 after 24 hours?" });
S("get_acknowledgment_evidence", "Partner with rejected 997s", "Filter", () => ({ partner: need(EX().rejectedAck).partner, ack_filter: "REJECTED", from: "30d" }), "OK", { check: ["Rejected acknowledgments", (o) => R(o).summary?.rejected >= 1] });
S("get_acknowledgment_evidence", "EDIFACT acknowledgments for Hollanda", "Filter", { partner: "Hollanda", document_type: "ORDERS", ack_filter: "ALL", from: "30d" }, "OK", { check: ["Orders checked", (o) => R(o).summary?.documentsChecked >= 1] });
S("get_acknowledgment_evidence", "Acknowledgment for one transaction", "Happy path", () => ({ transaction_id: need(EX().deliveredAsn).transactionId }), "OK");
S("get_transaction_payload", "Original ASN payload", "Happy path", () => ({ transaction_id: need(EX().deliveredAsn).transactionId }), "OK", { check: ["Available", (o) => R(o).available === true] });
S("get_transaction_payload", "Translated payload", "Happy path", () => ({ transaction_id: need(EX().deliveredInvoice).transactionId, variant: "TRANSLATED" }), "OK");
S("get_transaction_payload", "Translated variant unavailable for failed file", "Partial evidence", () => ({ transaction_id: need(EX().failedAsn).transactionId, variant: "TRANSLATED" }), "OK", { check: ["Not available, reason given", (o) => R(o).available === false && !!R(o).reason] });
S("get_transaction_payload", "Payload denied to SAP Joule", "Access denied", () => ({ transaction_id: need(EX().deliveredAsn).transactionId }), "DENIED", { host: "sap-joule" });
S("get_transaction_payload", "945 payload descriptor", "Happy path", () => ({ transaction_id: need(EX().shortShipment).transactionId }), "OK", { check: ["Available with callback", (o) => R(o).available === true && !!R(o).descriptor?.callbackUri] });
S("summarize_transaction_activity", "Volume by partner and type", "Happy path", { from: "30d", group_by: ["partner", "document_type"] }, "OK", { check: ["Rows", (o) => has(5)(R(o).current?.rows)] });
S("summarize_transaction_activity", "Top error types for Northfield", "Filter", { analysis: "ERRORS", partner: "Northfield Foods", from: "30d" }, "OK", { prompt: "Top error types for Northfield Foods in the last 30 days." });
S("summarize_transaction_activity", "Silent partners", "Happy path", { analysis: "SILENT_PARTNERS", recent_days: 7, baseline_days: 30 }, "OK", { prompt: "Which partners have gone quiet compared with their normal volume?" });
S("summarize_transaction_activity", "Compare with previous period", "Filter", { from: "7d", group_by: ["document_type"], compare_previous: true }, "OK");
S("summarize_transaction_activity", "Count by file", "Filter", { from: "7d", counting_unit: "file" }, "OK");

// ---------------------------------------------------------------- Community
S("search_companies", "Search by name", "Happy path", { query: "Crestline" }, "OK", { check: ["Crestline found", (o) => JSON.stringify(R(o)).includes("C20013")] });
S("search_companies", "Filter by industry", "Filter", { industry: "Third-party logistics" }, "OK", { check: ["Two 3PLs", (o) => JSON.stringify(R(o)).includes("Redline") && JSON.stringify(R(o)).includes("Crestline")] });
S("search_companies", "Companies pending registration", "Filter", { status: "PENDING_REGISTRATION" }, "OK", { check: ["Willow Creek", (o) => JSON.stringify(R(o)).includes("Willow Creek")] });
S("search_companies", "Other organization not returned", "Isolation", { query: "Lakeshore" }, "OK", { check: ["No Lakeshore", (o) => !JSON.stringify(R(o)).includes("C30090001")] });
S("get_company", "Read a partner company", "Happy path", { company: "Brightwell Home Goods" }, "OK");
S("get_company", "Company in another BUID", "Access denied", { company: "C10023002" }, "DENIED");
S("get_company", "Company in another organization", "Isolation", { company: "C30090001" }, "DENIED");
S("get_company_hierarchy", "Harborview hierarchy", "Happy path", {}, "OK", { check: ["Canada child", (o) => JSON.stringify(R(o)).includes("C10023002")] });
S("search_legal_entities", "Legal entities for Harborview", "Happy path", { company: "Harborview Retail Group" }, "OK");
S("search_legal_entities", "Legal entity by profile name", "Filter", { legal_profile_name: "Crestline" }, "OK", { check: ["LE-CRL-01", (o) => JSON.stringify(R(o)).includes("LE-CRL-01")] });
S("get_legal_entity", "Read a legal entity", "Happy path", { legal_entity_id: "LE-HOL-01" }, "OK");
S("get_legal_entity", "Unknown legal entity", "Not found", { legal_entity_id: "LE-XXX-99" }, "ERROR");
S("list_partners", "Active partners", "Happy path", { status: "ACTIVE" }, "OK", { check: ["At least 25 active", (o) => R(o).partners?.length >= 25], prompt: "List our active trading partners." });
S("list_partners", "Pending partners", "Filter", { status: "PENDING" }, "OK", { check: ["Evergreen", (o) => JSON.stringify(R(o)).includes("Evergreen")] });
S("list_partners", "Paginate partners", "Pagination", { page_size: 5 }, "OK", { check: ["5 rows", (o) => R(o).partners?.length === 5] });
S("get_partner_context", "Full context for a partner", "Happy path", { partner: "Summit Beverage" }, "OK", { prompt: "Give me everything about Summit Beverage's setup." });
S("get_partner_context", "Web EDI partner context", "Happy path", { partner: "Maple Ridge Crafts" }, "OK", { check: ["Web EDI", (o) => /WEB_EDI|web EDI/i.test(JSON.stringify(R(o)))] });
S("get_partner_context", "Unknown partner", "Not found", { partner: "Acme Widgets" }, "ERROR");
S("search_business_relationships", "Active relationships", "Happy path", { status: "ACTIVE" }, "OK");
S("search_business_relationships", "Pending relationships", "Filter", { status: "PENDING" }, "OK", { check: ["BPR-4111", (o) => JSON.stringify(R(o)).includes("BPR-4111")] });
S("get_business_relationship", "Read a relationship", "Happy path", { bpr_id: "BPR-4112" }, "OK");
S("get_business_relationship", "Unknown relationship", "Not found", { bpr_id: "BPR-9999" }, "ERROR");
S("get_partner_custom_fields", "Partner custom fields", "Happy path", { partner: "Brightwell Home Goods" }, "OK");
S("list_solutions", "Solutions for Harborview", "Happy path", {}, "OK", { check: ["Retail solution", (o) => JSON.stringify(R(o)).includes("SOL-HRG-RETAIL-01")] });
S("get_solution", "Read a solution", "Happy path", { solution_id: "SOL-HRG-RETAIL-01" }, "OK");
S("get_solution", "Solution outside the grant", "Access denied", { solution_id: "SOL-XXX" }, "DENIED");
S("list_solution_participants", "Solution participants", "Happy path", { solution_id: "SOL-HRG-RETAIL-01" }, "OK");
S("list_solution_participants", "Paginate participants", "Pagination", { solution_id: "SOL-HRG-RETAIL-01", page_size: 3 }, "OK");

// ---------------------------------------------------------------- Connectivity
S("search_mailboxes", "Harborview mailboxes", "Happy path", { company: "Harborview Retail Group" }, "OK", { check: ["Web EDI mailbox", (o) => JSON.stringify(R(o)).includes("MB-HRG-WEBEDI-01")] });
S("search_mailboxes", "Filter hub mailboxes by status", "Filter", { status: "SUSPENDED" }, "OK", { check: ["No suspended hub mailboxes", (o) => R(o).mailboxes.length === 0] });
S("search_mailboxes", "Mailboxes owned by a partner", "Access denied", { company: "Evergreen Paper" }, "DENIED");
S("get_mailbox", "Read a mailbox", "Happy path", { mailbox_id: "MB-HRG-PROD-01" }, "OK");
S("get_mailbox", "Unknown mailbox", "Not found", { mailbox_id: "MB-NOPE" }, "ERROR");
S("search_trading_addresses", "Addresses for a partner", "Happy path", { company: "Coastline Apparel" }, "OK", { check: ["VAN interconnect", (o) => JSON.stringify(R(o)).includes("VAN_INTERCONNECT")] });
S("search_trading_addresses", "Addresses by qualifier", "Filter", { qualifier: "14" }, "OK");
S("search_trading_addresses", "Addresses in a mailbox", "Filter", { mailbox_id: "MB-HRG-PROD-01" }, "OK");
S("get_trading_address", "Read a trading address", "Happy path", { trading_address: "ZZ:CRESTLINE3PL" }, "OK");
S("get_trading_address", "Unknown trading address", "Not found", { trading_address: "ZZ:NOPE" }, "ERROR");
S("get_interconnect_address", "VAN interconnect provider", "Happy path", { trading_address: "ZZ:COASTLINEAPP" }, "OK", { check: ["Keystone", (o) => R(o).vanProvider?.companyName === "Keystone VAN Services"], prompt: "Does Coastline Apparel route through a VAN?" });
S("get_interconnect_address", "Direct address has no VAN", "Happy path", { trading_address: "ZZ:BRIGHTWELLHG" }, "OK", { check: ["No VAN", (o) => !R(o).vanProvider] });
S("get_delivery_methods", "Delivery method for a partner", "Happy path", { trading_address: "ZZ:NFFARMS" }, "OK", { check: ["SFTP", (o) => JSON.stringify(R(o)).includes("SFTP")] });
S("get_delivery_methods", "Web EDI delivery method", "Happy path", { trading_address: "ZZ:MAPLERIDGEWEB" }, "OK", { check: ["Web EDI", (o) => JSON.stringify(R(o)).includes("WEB_EDI")] });
S("list_autoforwards", "All autoforwards", "Happy path", {}, "OK", { check: ["3 rules", (o) => JSON.stringify(R(o)).includes("TPR-70041")] });
S("list_autoforwards", "Autoforwards for one relationship", "Filter", { tpr_id: "TPR-70031" }, "OK");
S("list_distribution_lists", "Distribution lists", "Happy path", {}, "OK", { check: ["Two lists", (o) => JSON.stringify(R(o)).includes("HRGDL-ROUTING")] });
S("get_distribution_list", "Read a distribution list", "Happy path", { trading_address: "ZZ:HRGDL-PO850" }, "OK");
S("get_distribution_list", "Unknown distribution list", "Not found", { trading_address: "ZZ:HRGDL-NONE" }, "ERROR");
S("search_messaging_tuples", "Document routes for a partner", "Happy path", { partner: "Crestline Logistics" }, "OK", { check: ["940 route", (o) => JSON.stringify(R(o)).includes("940")] });
S("search_messaging_tuples", "Routes by document type", "Filter", { doc_type: "812" }, "OK", { check: ["Northfield 812", (o) => JSON.stringify(R(o)).includes("812")] });
S("search_messaging_tuples", "Paginate routes", "Pagination", { page_size: 10 }, "OK");
S("list_open_trading_relationships", "Open relationships", "Happy path", {}, "OK");
S("search_trading_relationships", "Pending relationships", "Filter", { status: "PENDING" }, "OK", { check: ["TPR-70111", (o) => JSON.stringify(R(o)).includes("TPR-70111")] });
S("search_trading_relationships", "Test relationships", "Filter", { tpr_type: "TEST" }, "OK");
S("search_trading_relationships", "Relationships for a partner", "Happy path", { partner: "Pinegate Home" }, "OK");
S("get_trading_relationship", "Read a relationship", "Happy path", { tpr_id: "TPR-70121" }, "OK");
S("get_trading_relationship", "Unknown relationship", "Not found", { tpr_id: "TPR-00000" }, "ERROR");
S("list_network_providers", "VAN providers", "Happy path", {}, "OK", { check: ["Keystone", (o) => JSON.stringify(R(o)).includes("Keystone")] });

// ---------------------------------------------------------------- Services, contacts, billing
S("get_company_service_subscriptions", "Harborview service subscriptions", "Happy path", {}, "OK");
S("get_partner_primary_services", "Primary services for a partner", "Happy path", { partner: "Coastline Apparel" }, "OK");
S("get_partner_primary_services", "Sponsored web EDI service", "Happy path", { partner: "Maple Ridge Crafts" }, "OK", { check: ["Sponsored", (o) => JSON.stringify(R(o)).includes("SPONSORED")] });
S("list_sponsored_services", "Sponsored services", "Happy path", {}, "OK");
S("get_mailbox_subscriptions", "Mailbox subscriptions", "Happy path", { mailbox_id: "MB-HRG-PROD-01" }, "OK");
S("get_mailbox_subscriptions", "Mailbox not owned by the hub", "Access denied", { mailbox_id: "MB-NOPE" }, "DENIED");
S("search_company_contacts", "Technical contacts for a partner", "Happy path", { company: "Brightwell Home Goods", contact_type: "TECHNICAL_CONTACT" }, "OK", { check: ["Priya Raman", (o) => JSON.stringify(R(o)).includes("Priya")], prompt: "Who is the EDI contact at Brightwell?" });
S("search_company_contacts", "Contacts for the 3PL", "Happy path", { company: "Crestline Logistics" }, "OK", { check: ["Two contacts", (o) => JSON.stringify(R(o)).includes("POC-CRL-02")] });
S("get_company_contact", "Read a contact", "Happy path", { poc_id: "POC-NFF-01" }, "OK");
S("get_company_contact", "Unknown contact", "Not found", { poc_id: "POC-XXX" }, "ERROR");
S("get_relationship_contact_rules", "Contact rules for 856", "Filter", { document_type: "856", direction: "RECEIVER" }, "OK");
S("get_relationship_contact_rules", "All contact rules", "Happy path", {}, "OK");
S("get_billing_profile", "Billing is outside every grant", "Access denied", {}, "DENIED");

// ---------------------------------------------------------------- Onboarding workflow
S("get_invitation", "Accepted invitation", "Happy path", { invitation_id: 7702 }, "OK");
S("get_invitation", "Expired invitation", "Happy path", { invitation_id: 7726 }, "OK", { check: ["EXPIRED", (o) => JSON.stringify(R(o)).includes("EXPIRED")] });
S("get_invitation", "Invitation by company", "Filter", { company: "Willow Creek Candle" }, "OK");
S("get_invitation", "Unknown invitation", "Not found", { invitation_id: 1 }, "ERROR");
S("get_user_invitation", "User invitation", "Happy path", { invitation_id: 7801 }, "OK");
S("get_user_invitation", "Unknown user invitation", "Not found", { invitation_id: 2 }, "ERROR");
S("search_registration_requests", "All registration requests", "Happy path", {}, "OK");
S("search_registration_requests", "Rejected registrations", "Filter", { status: "REJECTED" }, "OK", { check: ["55102", (o) => JSON.stringify(R(o)).includes("55102")] });
S("search_registration_requests", "Registrations pending approval", "Filter", { status: "PENDING_APPROVAL" }, "OK");
S("get_registration_request", "Read a registration", "Happy path", { request_id: 55041 }, "OK");
S("get_registration_request", "Unknown registration", "Not found", { request_id: 1 }, "ERROR");
S("search_process_instances", "Steps for an onboarding request", "Happy path", { request_id: 55120 }, "OK", { prompt: "Where is Pinegate Home in onboarding?" });
S("search_process_instances", "Failed step with retries", "Filter", { request_id: 55041 }, "OK", { check: ["FAILED step", (o) => JSON.stringify(R(o)).includes("FAILED")] });
S("get_process_instance", "Read a process step", "Happy path", { pi_unique_id: 900212 }, "OK");
S("get_process_instance", "Unknown process step", "Not found", { pi_unique_id: 1 }, "ERROR");
S("list_workflow_templates", "Workflow templates", "Happy path", {}, "OK");
S("get_workflow_template", "Read a template", "Happy path", { workflow_template_id: 3102 }, "OK");
S("get_workflow_template", "Unknown template", "Not found", { workflow_template_id: 1 }, "ERROR");

// ---------------------------------------------------------------- Cartographer: maps
S("list_mapping_solutions", "Mapping solutions", "Happy path", {}, "OK");
S("list_maps", "All maps", "Happy path", {}, "OK", { check: ["12 maps", (o) => JSON.stringify(R(o)).includes("M-1012")] });
S("list_maps", "Inbound maps", "Filter", { direction: "INBOUND" }, "OK");
S("list_maps", "Active maps", "Filter", { status: "ACTIVE" }, "OK", { check: ["M-1006", (o) => JSON.stringify(R(o)).includes("M-1006")] });
S("list_maps", "Maps changed in 7 days", "Filter", { modified_within_days: 7 }, "OK", { check: ["M-1001", (o) => JSON.stringify(R(o)).includes("M-1001")], prompt: "Which maps changed this week?" });
S("list_maps", "Maps for a partner", "Filter", { partner: "Crestline Logistics" }, "OK");
S("list_maps", "Paginate maps", "Pagination", { page_size: 4, page_no: 2 }, "OK");
S("list_map_partners", "Partners on a shared map", "Happy path", { map: "HRG_850_4010_OUT" }, "OK");
S("get_map_specification", "Specification files", "Happy path", { map: "M-1001" }, "OK");
S("get_map_specification", "Map without specifications", "Not found", { map: "M-1009" }, "OK", { check: ["No files", (o) => (R(o).files ?? R(o).specifications ?? []).length === 0] });
S("get_map_specification_file", "Read a specification file", "Happy path", { map: "M-1001", file_id: "SPEC-1001-A" }, "OK");
S("get_map_specification_file", "Unknown file", "Not found", { map: "M-1001", file_id: "SPEC-X" }, "ERROR");
S("get_map_metadata", "Map metadata", "Happy path", { map: "BWHG_856_4010_IN" }, "OK");
S("get_map_metadata", "Unknown map", "Not found", { map: "NOPE_MAP" }, "ERROR");
S("get_map_annotations", "Map annotations", "Happy path", { map: "BWHG_856_4010_IN" }, "OK");
S("get_map_rule", "Ship-to lookup rule", "Happy path", { map: "BWHG_856_4010_IN", target_field: "ship-to" }, "OK", { prompt: "How does the Brightwell 856 map resolve ship-to?" });
S("get_map_rule", "All rules for a map", "Happy path", { map: "NFF_810_4010_IN" }, "OK");

// ---------------------------------------------------------------- Cartographer: cross-reference
S("list_cross_reference_entities", "Cross-reference entities", "Happy path", {}, "OK", { check: ["CARRIER_STATUS_CODE", (o) => JSON.stringify(R(o)).includes("CARRIER_STATUS_CODE")] });
S("list_cross_reference_entities", "Paginate entities", "Pagination", { offset: 0, count: 2 }, "OK");
S("get_cross_reference_entity", "Read an entity", "Happy path", { entity: "STORE_TO_GLN" }, "OK");
S("get_cross_reference_entity", "Read the pre-xref routing table", "Happy path", { prexref: true }, "OK");
S("get_cross_reference_entry", "Store without a cross-reference entry", "Not found", () => ({ entity: "STORE_TO_GLN", key: need(EX().storeMissingXref).storeNumber }), "ERROR", { code: "KEY_NOT_FOUND", prompt: "Which stores are missing from the STORE_TO_GLN table?" });
S("get_cross_reference_entry", "Existing store", "Happy path", { entity: "STORE_TO_GLN", key: "0214" }, "OK");
S("get_cross_reference_entry", "Missing carrier status A9", "Not found", { entity: "CARRIER_STATUS_CODE", key: "A9" }, "ERROR", { code: "KEY_NOT_FOUND" });
S("get_cross_reference_header", "Header configuration not offered for this solution", "Validation", { entity: "CARRIER_STATUS_CODE" }, "ERROR", { code: "UNSUPPORTED_OPERATION" });
S("get_cross_reference_entity", "Entity reservation status", "Happy path", { entity: "CARRIER_STATUS_CODE" }, "OK", { check: ["Reserved by j.patel", (o) => JSON.stringify(R(o)).includes("j.patel")] });
S("search_cross_reference_entries", "Search entries", "Happy path", { entity: "ITEM_UPC_TO_SKU", search_token: "mug" }, "OK");
S("search_cross_reference_entries", "Count only", "Filter", { entity: "STORE_TO_GLN", search_token: "0", only_count: true }, "OK");
S("export_cross_reference_entries", "Export an entity", "Happy path", { entity: "VENDOR_NUMBER_BY_PARTNER" }, "OK");
S("prepare_cross_reference_change", "Invalid GLN check digit", "Validation", { entity: "STORE_TO_GLN", change: "ADD", key: "0999", values: { gln: "0614141000419", locationName: "Test", locationType: "STORE", active: "Y" } }, "ERROR");
S("prepare_cross_reference_change", "Entity reserved by another user", "Validation", { entity: "CARRIER_STATUS_CODE", change: "ADD", key: "A9", values: { hrgStatus: "APPOINTMENT", description: "Appointment scheduled" } }, "ERROR");
S("apply_cross_reference_change", "Apply without a plan", "Validation", { plan_id: "PLN-NOPE" }, "ERROR");
F("Add a missing store: prepare, approve, apply", "Approval flow", [
  { tool: "prepare_cross_reference_change", args: () => { const st = EX().storeMissingXref ?? { storeNumber: "9001", gln: glnFor("061414190010"), name: "Store 9001" }; return { entity: "STORE_TO_GLN", change: "ADD", key: st.storeNumber, values: { gln: st.gln, locationName: st.name, locationType: "STORE", active: "Y" } }; }, expect: "APPROVAL_REQUIRED" },
  { tool: "apply_cross_reference_change", args: (p) => ({ plan_id: plan(p) }), expect: "ERROR", code: "APPROVAL_PENDING", approve: true },
  { tool: "apply_cross_reference_change", args: (p) => ({ plan_id: plan(p, 0) }), expect: "OK", check: ["Verified readback", (o) => R(o).verified === true] },
  { tool: "apply_cross_reference_change", args: (p) => ({ plan_id: plan(p, 0) }), expect: "ERROR" },
], { prompt: "An ASN failed with a missing store cross-reference. Find it, explain it and prepare the fix." });

// ---------------------------------------------------------------- Community Projects and Provisioning
S("list_change_request_types", "Change request types", "Happy path", {}, "OK");
S("tgi_get_quantity_reconciliation", "Ordered, shipped and invoiced by PO", "Happy path", {}, "OK", { check: ["Supplier totals", (o) => R(o).suppliers.length > 10 && R(o).rows.length > 0] });
S("tgi_get_quantity_reconciliation", "Invoices before ASN for Meridian", "Filter", { partner: "Meridian Personal Care" }, "OK", { check: ["Invoice before ASN flagged", (o) => R(o).rows.some((x: any) => x.invoiceBeforeAsn)] });
S("ccpm_get_scorecard", "Weekly acknowledgment trend for Pinegate", "Happy path", { partner: "Pinegate Home" }, "OK", { check: ["Weekly rows with 997 and 855 separate", (o) => R(o).weeklyAcknowledgments.length >= 8 && "functionalAck997Received" in R(o).weeklyAcknowledgments[0]] });
S("list_change_requests", "Open requests for Alder and Ash", "Filter", { partner: "Alder and Ash Furniture", state: "OPEN" }, "OK", { check: ["Production move in progress", (o) => JSON.stringify(R(o)).includes("ST-10512")] });
S("list_change_requests", "All change requests", "Happy path", {}, "OK", { check: ["Seeded history", (o) => R(o).total >= 40] });
S("list_change_requests", "Open work orders", "Filter", { state: "OPEN" }, "OK", { check: ["Only unfinished", (o) => R(o).changeRequests.every((c: any) => c.workOrders.some((w: any) => !["COMPLETED", "CANCELLED", "REJECTED"].includes(w.state)))] });
S("list_change_requests", "Rejected requests", "Filter", { state: "REJECTED" }, "OK", { check: ["Reason present", (o) => R(o).changeRequests.length > 0 && R(o).changeRequests.every((c: any) => c.submissionState === "REJECTED" || c.workOrders.some((w: any) => w.state === "REJECTED"))] });
S("list_change_requests", "Map changes in last 90 days", "Filter", { type: "MAP_CHANGE", from: "90d" }, "OK", { check: ["Type matches", (o) => R(o).changeRequests.every((c: any) => c.workOrders.some((w: any) => w.type === "MAP_CHANGE"))] });
S("list_change_requests", "Requests for Coastline Apparel", "Filter", { partner: "Coastline Apparel" }, "OK", { check: ["Includes ST-10421", (o) => JSON.stringify(R(o)).includes("ST-10421")] });
S("list_change_requests", "Second page", "Pagination", { page_size: 10, cursor: Buffer.from("10").toString("base64url") }, "OK", { check: ["Page of 10", (o) => R(o).changeRequests.length === 10] });
S("list_change_requests", "Unknown partner", "Not found", { partner: "Zzyzx Nonexistent" }, "ERROR");
S("get_change_request_status", "Accepted request in progress", "Happy path", { status_id: "ST-10421" }, "OK");
S("get_change_request_status", "Rejected request", "Happy path", () => ({ status_id: rejectedCr() }), "OK", { check: ["Reason", (o) => !!R(o).rejectionReason] });
S("get_change_request_status", "Unknown request", "Not found", { status_id: "ST-00000" }, "ERROR");
S("get_work_order_status", "Work order status", "Happy path", { work_order_id: "WO-5571" }, "OK");
S("get_work_order_status", "Unknown work order", "Not found", { work_order_id: "WO-0000" }, "ERROR");
S("prepare_change_request", "Missing required fields", "Validation", { title: "AS2 connection", work_orders: [{ type: "AS2_CONNECTION", fields: { partnerCompanyId: "C20013" } }] }, "ERROR");
F("Request a new 846 map: prepare, approve, submit, attach", "Approval flow", [
  { tool: "prepare_change_request", args: { title: "New 846 map for Atlas Toy", work_orders: [{ type: "MAP_NEW", fields: { partnerCompanyId: "C20008", documentType: "846", direction: "INBOUND", specificationFileName: "atlas_846_spec.pdf" } }] }, expect: "APPROVAL_REQUIRED", approve: true },
  { tool: "submit_change_request", args: (p) => ({ plan_id: plan(p, 0) }), expect: "OK" },
  { tool: "attach_change_request_file", args: (p) => ({ work_order_id: R(p[1]).workOrders?.[0]?.workOrderId ?? R(p[1]).workOrderIds?.[0], file_name: "atlas_846_sample.edi" }), expect: "APPROVAL_REQUIRED", approve: true },
  { tool: "attach_change_request_file", args: (p) => ({ plan_id: plan(p, 2) }), expect: "OK" },
], { prompt: "Open a request for a new X12 846 map for Atlas Toy Company." });
S("attach_change_request_file", "Attach to an unknown work order", "Not found", { work_order_id: "WO-0000", file_name: "x.pdf" }, "ERROR");
S("get_partner_provisioning_status", "Completed provisioning", "Happy path", { tracking_id: "TRK-PGH-0091" }, "OK");
S("get_partner_provisioning_status", "Web EDI provisioning", "Happy path", { tracking_id: "TRK-MRC-0042" }, "OK");
S("get_partner_provisioning_status", "Unknown tracking ID", "Not found", { tracking_id: "TRK-NOPE" }, "ERROR");
S("prepare_partner_provisioning", "Unknown template", "Validation", { invitation_id: 7713, template_name: "NOPE", trading_address: "ZZ:WILLOWCREEK", delivery_method: "AS2" }, "ERROR");
F("Provision Willow Creek: prepare, approve, submit, track", "Approval flow", [
  { tool: "prepare_partner_provisioning", args: { invitation_id: 7713, template_name: "HRG_SUPPLIER_STD", trading_address: "ZZ:WILLOWCREEK", delivery_method: "AS2" }, expect: "APPROVAL_REQUIRED", approve: true },
  { tool: "submit_partner_provisioning", args: (p) => ({ plan_id: plan(p, 0) }), expect: "OK" },
  { tool: "get_partner_provisioning_status", args: (p) => ({ tracking_id: R(p[1]).trackingId }), expect: "OK" },
], { prompt: "Provision Willow Creek Candle with the standard supplier template on AS2." });
S("submit_partner_provisioning", "Submit without approval", "Validation", { plan_id: "PLN-NOPE" }, "ERROR");

// ---------------------------------------------------------------- Data Explorer (TGDP)
S("list_data_products", "Data product catalog", "Happy path", {}, "OK");
S("list_data_products", "Search the catalog", "Filter", { search: "partner" }, "OK");
S("get_data_product", "Read a data product", "Happy path", { product_id: "tgdp.transaction_activity" }, "OK");
S("get_data_product", "Unknown product", "Not found", { product_id: "tgdp.nope" }, "ERROR");
S("get_data_product_schema", "Product schema", "Happy path", { product_id: "tgdp.partner_directory" }, "OK");
S("get_data_product_quality", "Product quality", "Happy path", { product_id: "tgdp.transaction_activity" }, "OK");
S("get_data_product_lineage", "Product lineage", "Happy path", { product_id: "tgdp.relationship_network" }, "OK");
S("query_data_product", "Weekly volume by partner", "Happy path", { product_id: "tgdp.transaction_activity", group_by: ["partner_name"], measures: ["count"], limit: 20 }, "OK", { prompt: "Query weekly transaction volume by partner from the data platform." });
S("query_data_product", "Filter by status", "Filter", { product_id: "tgdp.transaction_activity", filters: [{ field: "status", op: "eq", value: "FAIL" }], limit: 10 }, "OK");
S("query_data_product", "CCIM events", "Happy path", { product_id: "tgdp.ccim_integration_events" }, "OK", { check: ["Events returned", (o) => JSON.stringify(R(o)).includes("event_id")] });
S("query_data_product", "Unknown field", "Validation", { product_id: "tgdp.partner_directory", fields: ["salary"] }, "ERROR");
S("get_data_product_record", "Record by key", "Happy path", { product_id: "tgdp.partner_directory", key: "BPR-4112" }, "OK");
S("get_data_product_record", "Unknown record", "Not found", { product_id: "tgdp.partner_directory", key: "BPR-9999" }, "ERROR");
F("Query lifecycle: query, status, results", "Happy path", [
  { tool: "query_data_product", args: { product_id: "tgdp.transaction_activity", limit: 500 }, expect: "OK" },
  { tool: "get_data_product_query_status", args: (p) => ({ query_id: R(p[0]).queryId }), expect: "OK" },
  { tool: "get_data_product_query_results", args: (p) => ({ query_id: R(p[0]).queryId, page_size: 50 }), expect: "OK" },
]);
F("Cancel a query", "Happy path", [
  { tool: "query_data_product", args: { product_id: "tgdp.transaction_activity", limit: 500 }, expect: "OK" },
  { tool: "cancel_data_product_query", args: (p) => ({ query_id: R(p[0]).queryId }), expect: "OK" },
]);
S("get_data_product_query_status", "Unknown query", "Not found", { query_id: "Q-NOPE" }, "ERROR");
S("get_data_product_query_results", "Unknown query results", "Not found", { query_id: "Q-NOPE" }, "ERROR");
S("cancel_data_product_query", "Cancel unknown query", "Not found", { query_id: "Q-NOPE" }, "ERROR");
S("create_data_product_export", "Export not supported for product", "Validation", { product_id: "tgdp.transaction_activity" }, "ERROR", { code: "UNSUPPORTED_OPERATION" });
F("Export the partner directory; result not ready while running", "Happy path", [
  { tool: "create_data_product_export", args: { product_id: "tgdp.partner_directory", format: "CSV" }, expect: "OK" },
  { tool: "get_data_product_export_status", args: (p) => ({ export_id: R(p[0]).exportId }), expect: "OK" },
  { tool: "get_data_product_export_result", args: (p) => ({ export_id: R(p[0]).exportId }), expect: "ERROR", code: "NOT_READY" },
]);
S("get_data_product_export_status", "Unknown export", "Not found", { export_id: "EXP-NOPE" }, "ERROR");
S("get_data_product_export_result", "Unknown export result", "Not found", { export_id: "EXP-NOPE" }, "ERROR");
S("get_data_product_delivery_schedule", "Active schedule", "Happy path", { schedule_id: "SCH-0007" }, "OK");
S("get_data_product_delivery_schedule", "Paused schedule with failed run", "Happy path", { schedule_id: "SCH-0009" }, "OK", { check: ["PAUSED", (o) => JSON.stringify(R(o)).includes("PAUSED")] });
S("get_data_product_delivery_schedule", "Unknown schedule", "Not found", { schedule_id: "SCH-0000" }, "ERROR");
F("Create a weekly delivery: prepare, approve, create", "Approval flow", [
  { tool: "create_data_product_delivery_schedule", args: { product_id: "tgdp.partner_directory", cadence: "WEEKLY", destination: "HRG-SFTP-DATA", format: "CSV" }, expect: "APPROVAL_REQUIRED", approve: true },
  { tool: "create_data_product_delivery_schedule", args: (p) => ({ plan_id: plan(p, 0) }), expect: "OK" },
]);
F("Change a delivery cadence: prepare, approve, update", "Approval flow", [
  { tool: "update_data_product_delivery_schedule", args: { schedule_id: "SCH-0007", cadence: "DAILY" }, expect: "APPROVAL_REQUIRED", approve: true },
  { tool: "update_data_product_delivery_schedule", args: (p) => ({ plan_id: plan(p, 0) }), expect: "OK" },
]);
F("Cancel a delivery: prepare, approve, cancel", "Approval flow", [
  { tool: "cancel_data_product_delivery_schedule", args: { schedule_id: "SCH-0007" }, expect: "APPROVAL_REQUIRED", approve: true },
  { tool: "cancel_data_product_delivery_schedule", args: (p) => ({ plan_id: plan(p, 0) }), expect: "OK" },
]);

// ---------------------------------------------------------------- Command Center Integration Monitor
S("ccim_get_daily_digest", "Daily digest", "Happy path", {}, "OK", { prompt: "Give me today's integration digest." });
S("ccim_list_watchlists", "Watchlists and coverage gaps", "Happy path", {}, "OK", { check: ["WL-05 without anomaly detection", (o) => R(o).watchlists.some((w: any) => w.watchlistId === "WL-05" && !w.anomalyDetection)] });
S("ccim_get_projection", "Projection for PO acknowledgments", "Happy path", { watchlist_id: "WL-02" }, "OK", { check: ["Range", (o) => R(o).projectedDailyRange?.high > 0] });
S("ccim_get_projection", "30-day projection", "Filter", { watchlist_id: "WL-01", horizon_days: 30 }, "OK");
S("ccim_get_projection", "Unknown watchlist", "Not found", { watchlist_id: "WL-99" }, "ERROR");
S("ccim_list_anomalies", "All anomalies", "Happy path", {}, "OK", { prompt: "Explain the anomalies detected recently and say which ones look related." });
S("ccim_list_anomalies", "Volume drops only", "Filter", { type: "DROP" }, "OK", { check: ["Only drops", (o) => R(o).anomalies.every((a: any) => a.type === "DROP")] });
S("ccim_get_transaction_volume", "Volume by document type", "Happy path", { group_by: "document_type" }, "OK", { check: ["940 present", (o) => JSON.stringify(R(o)).includes("940")] });
S("ccim_get_transaction_volume", "Volume by EDI address for a partner", "Filter", { group_by: "edi_address", partner: "Crestline Logistics" }, "OK");
S("ccim_get_transaction_volume", "Ambiguous partner", "Ambiguous", { partner: "Northfield" }, "ERROR", { code: "AMBIGUOUS_PARTNER" });
S("ccim_list_trading_community", "Trading community", "Happy path", {}, "OK");
S("ccim_list_trading_community", "Inactive partners", "Filter", { status: "INACTIVE" }, "OK", { check: ["Redline inactive", (o) => JSON.stringify(R(o)).includes("Redline")], prompt: "Which partners have had no traffic in 30 days?" });
S("ccim_get_partner_details", "Partner details panel", "Happy path", { partner: "Atlas Toy" }, "OK", { check: ["Weekly volume", (o) => R(o).weeklyVolume?.length === 8] });
S("ccim_get_partner_stats", "Community growth", "Happy path", { months: 6 }, "OK", { check: ["6 months", (o) => R(o).series.length === 6] });
S("ccim_get_document_type_analysis", "Dormant document types", "Happy path", {}, "OK", { check: ["Dormant rows", (o) => R(o).dormantCount > 0], prompt: "Which configured document types have not been exchanged in 180 days?" });
S("ccim_get_document_type_analysis", "Analysis for one partner, 30-day threshold", "Filter", { partner: "Atlas Toy", dormant_days: 30 }, "OK");
S("ccim_get_partner_integration_analysis", "Partners by protocol", "Happy path", {}, "OK", { check: ["WEB_EDI group", (o) => JSON.stringify(R(o)).includes("WEB_EDI")] });
S("ccim_get_network_graph", "Network graph volume bands", "Happy path", {}, "OK");

// ---------------------------------------------------------------- TG Insights application
S("tgi_get_dashboard", "Operations dashboard", "Happy path", {}, "OK");
S("tgi_list_saved_filters", "Saved filters", "Happy path", {}, "OK");
S("tgi_list_alert_rules", "Alert rules", "Happy path", {}, "OK");
S("tgi_create_alert_rule", "Create an alert from a saved filter", "Happy path", { name: "Failed invoices", filter_id: "SF-03", recipients: ["ap.team@harborviewretail.com"], frequency: "DAILY" }, "OK", { prompt: "Create a daily alert for failed invoices this week to ap.team@harborviewretail.com." });
S("tgi_create_alert_rule", "Unknown saved filter", "Not found", { name: "x", filter_id: "SF-99", recipients: ["a@b.com"] }, "ERROR");
S("tgi_list_report_rules", "Scheduled reports", "Happy path", {}, "OK");
S("tgi_get_facets", "Narrow-by facets", "Happy path", {}, "OK", { check: ["Delivery status facet", (o) => !!R(o).deliveryStatus] });
S("tgi_get_facets", "Facets over 30 days", "Filter", { days: 30 }, "OK");
S("tgi_get_processing_flow", "Processing flow of a failed ASN", "Happy path", () => ({ transaction_id: need(EX().failedAsn).transactionId }), "OK", { check: ["A failed step", (o) => R(o).steps.some((x: any) => x.status === "FAILED")] });
S("tgi_get_processing_flow", "Unknown transaction", "Not found", { transaction_id: "TGT000000000" }, "ERROR");
S("tgi_get_business_document", "Business view of an invoice", "Happy path", () => ({ transaction_id: need(EX().deliveredInvoice).transactionId }), "OK", { check: ["Invoice", (o) => R(o).document === "Invoice"] });
S("tgi_get_business_document", "Business document denied to SAP Joule", "Access denied", () => ({ transaction_id: need(EX().deliveredInvoice).transactionId }), "DENIED", { host: "sap-joule" });
S("tgi_list_redelivery_rules", "Automated redelivery rules", "Happy path", {}, "OK");
S("tgi_redeliver_transactions", "Translation failures are not redeliverable", "Validation", () => ({ transaction_ids: [need(EX().failedAsn).transactionId] }), "ERROR");
S("tgi_redeliver_transactions", "More than 30 transactions", "Validation", { transaction_ids: Array.from({ length: 31 }, (_, i) => `TGT${i}`) }, "ERROR");
F("Redeliver a failed delivery", "Approval flow", [
  { tool: "tgi_redeliver_transactions", args: () => ({ transaction_ids: [need(EX().deliveryFailure).transactionId] }), expect: "APPROVAL_REQUIRED", approve: true },
  { tool: "tgi_redeliver_transactions", args: (p) => ({ plan_id: plan(p, 0) }), expect: "OK", check: ["Redelivered or queued", (o) => ["REDELIVERED", "QUEUED"].includes(R(o).results?.[0]?.result)] },
], { prompt: "Which failed deliveries can be redelivered now?" });
F("Redelivery is queued while the partner endpoint is down", "Approval flow", [
  { tool: "tgi_redeliver_transactions", args: () => ({ transaction_ids: [need(EX().deliveryFailureDown).transactionId] }), expect: "APPROVAL_REQUIRED", approve: true },
  { tool: "tgi_redeliver_transactions", args: (p) => ({ plan_id: plan(p, 0) }), expect: "OK", check: ["Queued", (o) => R(o).results?.[0]?.result === "QUEUED"] },
]);
S("tgi_reprocess_transaction", "Delivered files cannot be reprocessed", "Validation", () => ({ transaction_id: need(EX().deliveredInvoice).transactionId }), "ERROR", { code: "NOT_ELIGIBLE" });
F("Reprocess a failed ASN after the cross-reference fix", "Approval flow", [
  { tool: "prepare_cross_reference_change", args: () => { const a = need(EX().openXrefAsn); return { entity: "STORE_TO_GLN", change: "ADD", key: a.storeNumber, values: { gln: storeGln(a.storeNumber), locationName: `Store ${a.storeNumber}`, locationType: "STORE", active: "Y" } }; }, expect: "APPROVAL_REQUIRED", approve: true },
  { tool: "apply_cross_reference_change", args: (p) => ({ plan_id: plan(p, 0) }), expect: "OK" },
  { tool: "tgi_reprocess_transaction", args: () => ({ transaction_id: need(EX().openXrefAsn).transactionId }), expect: "APPROVAL_REQUIRED", approve: true },
  { tool: "tgi_reprocess_transaction", args: (p) => ({ plan_id: plan(p, 2) }), expect: "OK", check: ["Delivered", (o) => R(o).result === "DELIVERED"] },
], { prompt: "Find ASNs that failed on a missing store cross-reference, fix the table and reprocess them." });
F("Reprocess an invalid invoice fails again", "Approval flow", [
  { tool: "tgi_reprocess_transaction", args: () => ({ transaction_id: need(EX().invoiceValidation).transactionId }), expect: "APPROVAL_REQUIRED", approve: true },
  { tool: "tgi_reprocess_transaction", args: (p) => ({ plan_id: plan(p, 0) }), expect: "OK", check: ["Failed again", (o) => R(o).result === "FAILED_AGAIN"] },
]);

// ---------------------------------------------------------------- Command Center Performance Monitor
S("ccpm_list_monitor_agents", "Monitor agents", "Happy path", {}, "OK", { check: ["Four agents", (o) => R(o).agents.length === 4] });
S("ccpm_list_rules", "All rules", "Happy path", {}, "OK");
S("ccpm_list_rules", "Rules for Lex", "Filter", { agent: "lex" }, "OK", { check: ["Only Lex", (o) => R(o).rules.every((x: any) => x.agent === "lex")] });
S("ccpm_get_rule", "Read a rule", "Happy path", { rule_id: "R-LEX-01" }, "OK");
S("ccpm_get_rule", "Unknown rule", "Not found", { rule_id: "R-NOPE" }, "ERROR");
S("ccpm_test_rule", "Test an existing rule", "Happy path", { rule_id: "R-REESE-01" }, "OK");
S("ccpm_test_rule", "Test a draft rule", "Happy path", { type: "ACK_WITHIN_HOURS", params: { documentType: "850", ackType: "855", hours: 48 } }, "OK", { check: ["Matches", (o) => R(o).matches > 0] });
S("ccpm_test_rule", "Draft without a type", "Validation", {}, "ERROR");
S("ccpm_create_rule", "Unknown agent", "Validation", { agent: "max", name: "x", type: "SEQUENCE" }, "ERROR");
F("Create and deploy a Lex rule", "Approval flow", [
  { tool: "ccpm_create_rule", args: { agent: "lex", name: "855 within 24 hours", type: "ACK_WITHIN_HOURS", params: { documentType: "850", ackType: "855", hours: 24 }, expected_behavior: "Each 850 has an 855 within 24 hours.", monthly_budget_usd: 15 }, expect: "APPROVAL_REQUIRED", approve: true },
  { tool: "ccpm_create_rule", args: (p) => ({ plan_id: plan(p, 0) }), expect: "OK" },
], { prompt: "Create a Lex rule: 855 within 24 hours of the 850. Test it first." });
S("ccpm_list_findings", "Open findings", "Happy path", { status: "NEW" }, "OK");
S("ccpm_list_findings", "Lex findings for a partner", "Filter", () => ({ agent: "lex", partner: need(EX().missingAck).partnerCompanyId }), "OK", { check: ["Findings", (o) => R(o).total >= 1], prompt: "Which suppliers missed the 24-hour PO acknowledgment SLA this week?" });
S("ccpm_list_findings", "Findings for one rule", "Filter", { rule_id: "R-NORA-01" }, "OK", { check: ["Only R-NORA-01", (o) => R(o).findings.every((f: any) => f.ruleId === "R-NORA-01")] });
F("Finding chain of reasoning, assign and resolve", "Happy path", [
  { tool: "ccpm_list_findings", args: { status: "NEW" }, expect: "OK" },
  { tool: "ccpm_get_finding", args: (p) => ({ finding_id: need(R(p[0]).findings[0]).findingId }), expect: "OK", check: ["Four reasoning steps", (o) => R(o).chainOfReasoning?.length === 4] },
  { tool: "ccpm_update_finding", args: (p) => ({ finding_id: R(p[0]).findings[0].findingId, assignee: "edi.team@harborviewretail.com", note: "Investigating" }), expect: "OK", check: ["Assigned", (o) => R(o).status === "ASSIGNED"] },
  { tool: "ccpm_update_finding", args: (p) => ({ finding_id: R(p[0]).findings[0].findingId, disposition: "RESOLVED", note: "Fixed" }), expect: "OK", check: ["Resolved", (o) => R(o).status === "RESOLVED"] },
], { prompt: "Explain the chain of reasoning for the newest monitoring finding." });
S("ccpm_get_finding", "Unknown finding", "Not found", { finding_id: "F-NOPE" }, "ERROR");
S("ccpm_update_finding", "Update unknown finding", "Not found", { finding_id: "F-NOPE", disposition: "RESOLVED" }, "ERROR");
S("ccpm_get_dashboard", "Performance dashboard", "Happy path", {}, "OK");
S("ccpm_get_scorecard", "Supplier scorecard", "Happy path", { partner: "Summit Beverage" }, "OK", { check: ["Five KPIs", (o) => R(o).kpis?.length === 5], prompt: "Show the scorecard for Summit Beverage." });
S("ccpm_get_scorecard", "Scorecard for the 3PL", "Happy path", { partner: "Crestline Logistics" }, "OK");
S("ccpm_get_scorecard", "Unknown partner", "Not found", { partner: "Acme Widgets" }, "ERROR");
S("ccpm_get_supplier_analytics", "Suppliers ranked by score", "Happy path", {}, "OK", { prompt: "Rank suppliers by scorecard and show each one's weakest KPI." });

// ---------------------------------------------------------------- Aviator agent services
S("search_knowledge", "Harborview procedure first", "Happy path", { query: "ASN failed missing cross-reference procedure" }, "OK", { check: ["KB-HRG-201 first", (o) => R(o).results?.[0]?.id === "KB-HRG-201"] });
S("search_knowledge", "Reprocess versus redelivery", "Happy path", { query: "difference between reprocess and redelivery" }, "OK");
S("create_support_ticket", "Create a support ticket", "Happy path", { summary: "Atlas AS2 outage", details: "MDN timeouts since 4 hours", severity: "HIGH" }, "OK", { check: ["Ticket ID", (o) => String(R(o).ticketId).startsWith("CS-")] });
S("get_connection_status", "Partner endpoint down", "Happy path", () => ({ partner: need(EX().partnerDown).partnerCompanyId }), "OK", { check: ["DOWN", (o) => R(o).status === "DOWN"], prompt: "Which partner endpoints are down right now?" });
S("get_connection_status", "SFTP partner health", "Happy path", { partner: "Summit Beverage" }, "OK", { check: ["SFTP", (o) => R(o).protocol === "SFTP"] });
S("get_connection_status", "Web EDI partner", "Happy path", { partner: "Maple Ridge Crafts" }, "OK");
S("get_connection_status", "No health record", "Partial evidence", { partner: "Redline Logistics" }, "OK", { check: ["UNKNOWN", (o) => R(o).status === "UNKNOWN"] });

// ---------------------------------------------------------------- Client governance
S("search_transactions", "Suspended client receives no data", "Access denied", { from: "7d" }, "DENIED", { host: "copilot-studio", setup: () => { clientStatus["copilot-studio"] = "SUSPENDED"; } });
S("list_partners", "Gemini Enterprise reads partners", "Happy path", { status: "ACTIVE" }, "OK", { host: "gemini-enterprise" });
S("get_change_request_status", "SAP Joule reads request status", "Happy path", { status_id: "ST-10421" }, "OK", { host: "sap-joule" });

export const SCENARIOS = list;

// ---------------------------------------------------------------- runner
export type StepResult = { tool: string; expected: string; status: string; code?: string; pass: boolean; note?: string; ms: number; args: any; out: Out };
export type ScenarioResult = { id: string; pass: boolean; skipped?: boolean; note?: string; steps: StepResult[]; ms: number };

export function runScenario(sc: Scenario, baseUrl = "http://localhost"): ScenarioResult {
  const t0 = Date.now();
  sc.setup?.();
  const outs: Out[] = [];
  const steps: StepResult[] = [];
  let pass = true;
  for (const st of sc.steps) {
    const ctx: Ctx = { host: st.host ?? sc.host ?? "claude-connector", sessionId: `scenario-${sc.id}`, baseUrl };
    let args: any;
    try { args = typeof st.args === "function" ? st.args(outs) : st.args ?? {}; } catch (e: any) { if (e instanceof Skip) { for (const k of Object.keys(clientStatus)) delete (clientStatus as any)[k]; return { id: sc.id, pass: true, skipped: true, note: "No current example in the observed traffic.", steps, ms: Date.now() - t0 }; } args = { _error: String(e?.message ?? e) }; }
    const s0 = Date.now();
    const out = invoke(st.tool, args, ctx, "console").out as Out;
    outs.push(out);
    let ok = out.status === st.expect;
    let note = ok ? "" : `Expected ${st.expect}, got ${out.status}${out.error?.code ? ` (${out.error.code})` : ""}.`;
    if (ok && st.code && out.error?.code !== st.code) { ok = false; note = `Expected error ${st.code}, got ${out.error?.code ?? "none"}.`; }
    if (ok && st.check) { let c = false; try { c = st.check[1](out, outs); } catch { c = false; } if (!c) { ok = false; note = `Check failed: ${st.check[0]}.`; } }
    if (st.approve) { const pid = R(out).planId ?? outs.map((x) => R(x).planId).find(Boolean); if (pid) decidePlan(pid, true, "scenario-runner"); }
    steps.push({ tool: st.tool, expected: st.expect, status: out.status, code: out.error?.code, pass: ok, note, ms: Date.now() - s0, args, out });
    if (!ok) pass = false;
  }
  for (const k of Object.keys(clientStatus)) delete (clientStatus as any)[k];
  return { id: sc.id, pass, steps, ms: Date.now() - t0 };
}

/** Runs scenarios against a fresh seeded state and restores it afterwards. */
export function runScenarios(ids?: string[], baseUrl?: string) {
  const saved = serializeState();
  exCache = null;
  const results = SCENARIOS.filter((s) => !ids?.length || ids.includes(s.id)).map((s) => { resetData(); return runScenario(s, baseUrl); });
  setState(saved);
  return results;
}
/** Single run on the current state, with fresh examples. */
export function runOne(sc: Scenario, baseUrl?: string) { exCache = null; return runScenario(sc, baseUrl); }

export function scenarioCatalog() {
  return SCENARIOS.map((s) => {
    const t = toolByName(s.steps[0].tool);
    return {
      id: s.id, title: s.title, kind: s.kind, host: s.host ?? "claude-connector", prompt: s.prompt ?? null,
      domain: t?.domain ?? "Unknown", product: t?.product ?? "", tools: [...new Set(s.steps.map((x) => x.tool))],
      steps: s.steps.map((x) => ({ tool: x.tool, expect: x.expect, code: x.code ?? null, check: x.check?.[0] ?? null, args: typeof x.args === "function" ? "(computed from seeded data or earlier steps)" : x.args ?? {} })),
    };
  });
}

export function coverage() {
  const all = [...new Set(SCENARIOS.flatMap((s) => s.steps.map((x) => x.tool)))];
  return all;
}
