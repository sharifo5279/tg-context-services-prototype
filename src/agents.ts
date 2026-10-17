// Candidate customer agents and the 40 demo use cases.
// Agents are prototype definitions that run on Trading Grid Context Services tools inside a customer's
// agent platform. Each lists the Trading Grid Aviator agent or Innovation Guide scenario that inspired it.

export type AgentDef = {
  id: string;
  name: string;
  persona: string;
  role: string;
  inspiredBy: { name: string; where: string }[];
  scenario: string;
  instructions: { title: string; body: string }[];
  inputs: string[];
  knowledge: string[];
  outputs: { name: string; type: string }[];
  tools: string[] | "ALL";
  starters: number[];
  surface?: "tgo" | "studio";
  /** Status as published in the Trading Grid Aviator portfolio (Innovation Guide H2 2026). */
  status: "Live today" | "On the roadmap" | "Incubating" | "Prototype";
  subtitle?: string;
};

const OUTPUT_RULES = "Present exceptions as a markdown table. Keep the narrative short. End with a 'Recommended action' line.";

export const AGENTS: AgentDef[] = [
  {
    id: "tg-aviator",
    surface: "tgo",
    status: "Live today",
    subtitle: "Trading Grid Online",
    name: "Aviator",
    persona: "Trading Grid Online user",
    role: "Answer questions about transactions, errors, payloads, maps and the trading community inside Trading Grid Online, using the signed-in user's access rights.",
    inspiredBy: [{ name: "Error Analysis Agent", where: "TG Insights" }, { name: "Payload Analysis Agent", where: "TG Insights" }, { name: "Transaction Finder Agent", where: "TG Insights" }, { name: "Knowledge Agent", where: "Trading Grid Aviator" }],
    scenario: "Any EDI error, read and routed to its fix",
    instructions: [
      { title: "Explain the transaction", body: "For a failed transaction: state the likely cause, which side of the exchange owns it, the signals checked, and numbered next steps. Label the analysis as AI-generated." },
      { title: "Read payloads", body: "Summarize document type, parties, key references and line items. Explain qualifiers in plain language." },
    ],
    inputs: ["Transaction", "Question"],
    knowledge: ["Trading Grid documentation", "Harborview procedures"],
    outputs: [{ name: "Answer", type: "Text" }],
    tools: ["search_transactions", "get_transaction", "get_related_transactions", "get_acknowledgment_evidence", "get_transaction_payload", "summarize_transaction_activity", "get_partner_context", "search_company_contacts", "get_map_metadata", "get_map_annotations", "get_cross_reference_entry", "list_maps"],
    starters: [6, 7, 31, 27],
  },
  {
    id: "payload-analysis",
    surface: "tgo",
    status: "Live today",
    subtitle: "Trading Grid Insights Payload Viewer",
    name: "Payload Analysis Agent",
    persona: "Support analyst",
    role: "Explain a payload in plain language: what it is, what it contains and what is wrong with it.",
    inspiredBy: [{ name: "Payload Analysis Agent", where: "TG Insights" }],
    scenario: "Payload problem without reading raw EDI",
    instructions: [
      { title: "Read the payload", body: "Load the selected payload. Give the document type and purpose, sender and receiver roles, key references and line items as a table. Explain qualifiers and codes in plain language. When the payload is incomplete or malformed, state what must change for it to process. Follow-up questions relate only to this payload." },
    ],
    inputs: ["Payload"],
    knowledge: ["X12 and EDIFACT code lists"],
    outputs: [{ name: "Business summary", type: "Text" }, { name: "Line items", type: "Table" }],
    tools: ["get_transaction", "get_transaction_payload", "get_partner_context"],
    starters: [31],
  },
  {
    id: "morning-triage",
    status: "Live today",
    name: "Daily Summarizer Agent",
    persona: "Integration operations lead",
    role: "Your role is to tell the operations lead what failed or went unacknowledged overnight, which partners and flows are affected, and what to look at first.",
    inspiredBy: [{ name: "Daily Summarizer Agent", where: "Command Center Integration Monitor" }, { name: "Transaction Finder Agent", where: "TG Insights" }],
    scenario: "Morning operations triage",
    instructions: [
      { title: "Collect overnight exceptions", body: "## Task goal\nFind failed transactions and missing or rejected acknowledgments from the last 12 hours. Check integration monitor events in the CCIM data product for anomalies.\n## Rules\nUse only data the requesting user is entitled to see. Absence of an acknowledgment is unknown, not a rejection." },
      { title: "Rank by impact", body: "Group findings by partner and flow. Rank by count, document type (856 and 810 first) and age." },
      { title: "Summarize for the operations lead", body: OUTPUT_RULES },
    ],
    inputs: ["Time window", "Trading partners"],
    knowledge: ["FA delinquency cycles"],
    outputs: [{ name: "Exceptions", type: "Table" }, { name: "Key findings", type: "Text" }, { name: "Recommended action", type: "Text" }],
    tools: ["get_access_context", "summarize_transaction_activity", "search_transactions", "get_transaction", "get_acknowledgment_evidence", "list_data_products", "query_data_product", "get_data_product_schema"],
    starters: [40, 26, 29, 27],
  },
  {
    id: "asn-exception",
    status: "Prototype",
    name: "ASN Exception Agent",
    persona: "EDI support analyst",
    role: "Your role is to help the EDI team catch advance ship notices that were rejected, failed or missing, explain why, and prepare the fix and the follow-up to each supplier.",
    inspiredBy: [{ name: "Error Analysis Agent", where: "TG Insights" }, { name: "Map-level Intelligence Agent", where: "Trading Grid Cartographer" }, { name: "Xref Checker Agent (incubating)", where: "Innovation Guide scenario" }],
    scenario: "“Where are my ASNs?”",
    instructions: [
      { title: "Find rejected, failed and missing ASNs", body: "## Task goal\nFind the ASNs (856) the user asks about, or those from the last 24 hours that failed or were rejected. For each, retrieve the transaction, its acknowledgment and its status history.\n## Rules\nUse only data the requesting user is entitled to see. Do not resend, change or cancel anything without approval: prepare the change and wait." },
      { title: "Explain the cause", body: "Use transaction errors, the partner's configuration, map metadata and annotations, and cross-reference entries. Say which side owns the fix." },
      { title: "Prepare the fix", body: "When a configuration change resolves the cause, prepare it with the prepare tool and stop for approval. After approval, apply it and report the verified readback." },
      { title: "Draft the supplier follow-up", body: "Address the supplier's technical contact. State the document, what failed and what to resend. " + OUTPUT_RULES },
    ],
    inputs: ["Time window", "Trading partners"],
    knowledge: ["Supplier routing guide", "HRG 856 implementation guide"],
    outputs: [{ name: "Exceptions", type: "Table" }, { name: "Supplier follow-up", type: "Text" }, { name: "Recommended action", type: "Text" }],
    tools: ["search_transactions", "get_transaction", "get_related_transactions", "get_acknowledgment_evidence", "get_transaction_payload", "get_partner_context", "get_map_metadata", "get_map_annotations", "list_maps", "get_cross_reference_entry", "get_cross_reference_entity", "prepare_cross_reference_change", "apply_cross_reference_change", "search_company_contacts", "list_autoforwards"],
    starters: [6, 24, 32, 17],
  },
  {
    id: "error-resolution",
    status: "Live today",
    subtitle: "Trading Grid Insights Error Analysis",
    name: "Error Analysis Agent",
    persona: "Supplier management and B2B support",
    role: "Your role is to read a failed document, explain the error in plain language, show which side owns the fix, and draft a notice that tells the supplier exactly what to change.",
    inspiredBy: [{ name: "Error Analysis Agent", where: "TG Insights" }, { name: "Payload Analysis Agent", where: "TG Insights" }, { name: "Audience Message Composer Agent (scenario)", where: "Innovation Guide scenario" }],
    scenario: "Telling a supplier exactly what to fix",
    instructions: [
      { title: "Read the error and the payload", body: "## Task goal\nFor the failed transaction or partner, get the error record and the original payload. Identify the segment and element at fault.\n## Rules\nPayload access is entitled separately. If it is denied, say so and continue from metadata." },
      { title: "Check the rules", body: "Compare against the implementation guide attached to the map and the error trend for the partner over 30 days." },
      { title: "Write the supplier notice", body: "Pick recipients from the partner's technical contact. Write numbered steps. " + OUTPUT_RULES },
    ],
    inputs: ["Transaction or partner", "Time window"],
    knowledge: ["HRG 810 and 856 implementation guides"],
    outputs: [{ name: "Diagnosis", type: "Text" }, { name: "Supplier notice", type: "Text" }],
    tools: ["search_transactions", "get_transaction", "get_transaction_payload", "summarize_transaction_activity", "get_map_metadata", "get_map_specification", "get_map_specification_file", "search_company_contacts", "get_company_contact", "get_partner_context"],
    starters: [7, 27, 31, 25],
  },
  {
    id: "fa-reconciliation",
    status: "Incubating",
    name: "FA Reconciliation Agent",
    persona: "EDI manager",
    role: "Your role is to catch every purchase order that was not acknowledged on time, separate missing from rejected acknowledgments, and say which suppliers need follow-up.",
    inspiredBy: [{ name: "FA Reconciliation Agent (incubating)", where: "Innovation Guide scenario" }, { name: "Lex, timing and SLA (incubation)", where: "Command Center Performance Monitor" }],
    scenario: "Every late PO acknowledgment caught and explained",
    instructions: [
      { title: "Check functional acknowledgments", body: "## Task goal\nFor outbound 850 and ORDERS, find missing (997 or CONTRL) and rejected acknowledgments. Apply FA delinquency cycles: cycle 1 at 24 hours, cycle 2 at 48 hours.\n## Rules\nMissing is unknown, never rejected. Use AK5 or UCI codes for rejection detail." },
      { title: "Check business responses", body: "For acknowledged POs, find those with no 855 after 48 hours. Use the supplier's custom fields for agreed response times." },
      { title: "Summarize by supplier", body: OUTPUT_RULES },
    ],
    inputs: ["Time window", "Trading partners"],
    knowledge: ["Supplier acknowledgment terms"],
    outputs: [{ name: "Acknowledgment exceptions", type: "Table" }, { name: "Supplier follow-up list", type: "Text" }],
    tools: ["get_acknowledgment_evidence", "get_related_transactions", "search_transactions", "get_transaction", "get_partner_custom_fields", "search_company_contacts", "get_partner_context"],
    starters: [22, 23, 33, 35],
  },
  {
    id: "partner-onboarding",
    status: "On the roadmap",
    name: "Onboarding Guide Agent",
    persona: "Onboarding manager",
    role: "Your role is to report where each new trading partner is in onboarding, confirm first live transactions, and prepare provisioning and connection requests for approval.",
    inspiredBy: [{ name: "Onboarding Guide Agent (roadmap)", where: "Trading Grid Aviator in Partner Hub" }, { name: "Knowledge Agent", where: "Trading Grid Aviator" }],
    scenario: "First days of a new trading partner",
    instructions: [
      { title: "Report onboarding status", body: "## Task goal\nCombine invitation, registration, workflow process instances, trading relationships and maps to show the partner's stage.\n## Rules\nWorkflow status is not business readiness. Configured relationships are not proof of traffic: confirm with transaction evidence." },
      { title: "Prepare requests", body: "For new connections or provisioning, prepare the request with all required fields and stop for approval. After approval, submit and return the tracking reference." },
      { title: "Track", body: "Report source status as recorded. Accepted is not completed. " + OUTPUT_RULES },
    ],
    inputs: ["Partner", "Invitation"],
    knowledge: ["HRG supplier onboarding template"],
    outputs: [{ name: "Onboarding status", type: "Table" }, { name: "Requests", type: "Text" }],
    tools: ["get_invitation", "search_registration_requests", "get_registration_request", "search_process_instances", "get_process_instance", "get_workflow_template", "list_workflow_templates", "search_trading_relationships", "get_partner_context", "search_transactions", "list_maps", "get_map_metadata", "prepare_partner_provisioning", "submit_partner_provisioning", "get_partner_provisioning_status", "list_change_request_types", "prepare_change_request", "submit_change_request", "get_change_request_status", "get_work_order_status", "search_company_contacts"],
    starters: [12, 30, 19, 18],
  },
  {
    id: "community-insights",
    status: "Live today",
    name: "Community Insights Agent",
    persona: "Supply chain and sourcing leader",
    role: "Your role is to answer questions about the trading community: who is active, which relationships have gone quiet, how volume is changing, and which data products support the analysis.",
    inspiredBy: [{ name: "Community Insights Agent", where: "Command Center Integration Monitor" }],
    scenario: "Finding dormant or inactive partner relationships",
    instructions: [
      { title: "Compare configuration with activity", body: "## Task goal\nJoin configured relationships and messaging tuples with observed transactions to find configured-but-unused flows and silent partners.\n## Rules\nConfigured connectivity is not observed activity. No observed traffic is not proof of failure." },
      { title: "Use governed data products", body: "For trends, query Trading Grid Data Explorer products. Report unsupported operations as unsupported; never substitute another dataset." },
      { title: "Summarize", body: OUTPUT_RULES },
    ],
    inputs: ["Time window", "Trading partners"],
    knowledge: ["Data product catalog"],
    outputs: [{ name: "Community findings", type: "Table" }, { name: "Recommended action", type: "Text" }],
    tools: ["list_partners", "search_companies", "search_trading_relationships", "search_messaging_tuples", "summarize_transaction_activity", "list_data_products", "get_data_product", "get_data_product_schema", "query_data_product", "get_data_product_query_results", "create_data_product_export", "get_data_product_export_status", "get_data_product_export_result", "get_interconnect_address", "get_trading_address", "list_autoforwards", "get_partner_primary_services", "get_partner_context"],
    starters: [9, 29, 28, 20],
  },
  {
    id: "context-assistant",
    status: "Prototype",
    name: "Context Services Assistant",
    persona: "Any Trading Grid user",
    role: "Your role is to answer any question about Harborview's trading community, connectivity, transactions, maps, requests and data products using every authorized Trading Grid Context Services tool.",
    inspiredBy: [{ name: "Knowledge Agent", where: "Trading Grid Aviator" }],
    scenario: "Answers without a support ticket",
    instructions: [
      { title: "Answer from evidence", body: "## Task goal\nPick the fewest tools that answer the question. Resolve partners first when names are ambiguous.\n## Rules\nUse only data the requesting user is entitled to see. Prepare changes and wait for approval." },
      { title: "Report gaps", body: "State completeness, missing evidence and denials with the next action." },
    ],
    inputs: ["Question"],
    knowledge: ["Trading Grid Context Services tool catalog"],
    outputs: [{ name: "Answer", type: "Text" }],
    tools: "ALL",
    starters: [1, 2, 11, 36],
  },
];

export type UseCase = { n: number; title: string; prompt: string; agent: string; area: string };

const U = (n: number, area: string, agent: string, title: string, prompt: string): UseCase => ({ n, area, agent, title, prompt });

export const USE_CASES: UseCase[] = [
  U(1, "Community", "context-assistant", "List active trading partners", "List our active trading partners and when each relationship was activated."),
  U(2, "Community", "context-assistant", "Resolve an ambiguous supplier", "Find the supplier Northfield and show its trading addresses."),
  U(3, "Connectivity", "context-assistant", "Partner addresses and delivery method", "Show Coastline Apparel's trading addresses and delivery method."),
  U(4, "Community", "context-assistant", "Pending and rejected relationships", "Which trading relationships are pending or rejected, and since when?"),
  U(5, "Connectivity", "community-insights", "VAN interconnect check", "Does Coastline Apparel route through a VAN interconnect? Which provider?"),
  U(6, "Transactions", "asn-exception", "ASN not visible", "Brightwell says ASN SH-77155 was sent yesterday. Why isn't it visible, and what should happen next?"),
  U(7, "Transactions", "error-resolution", "Failed invoices for a supplier", "Find failed 810 invoices from Northfield Foods in the last 7 days and explain each error."),
  U(8, "Transactions", "fa-reconciliation", "POs without a 997", "Which POs to Summit Beverage have no 997?"),
  U(9, "Community", "community-insights", "Configured but unused", "Which configured relationships and document types had no traffic in the last 30 days?"),
  U(10, "Connectivity", "community-insights", "Autoforward rules", "Which document types are autoforwarded, from which partners, and to whom?"),
  U(11, "Connectivity", "context-assistant", "Mailbox status", "Check our production mailbox: status, trading address count and subscriptions."),
  U(12, "Onboarding", "partner-onboarding", "Onboarding status", "What is the onboarding status of Pinegate Home?"),
  U(13, "Services", "context-assistant", "Partner services", "Which services does Coastline Apparel subscribe to?"),
  U(14, "Services", "context-assistant", "Technical contact", "Who is Brightwell Home Goods' technical contact for 856?"),
  U(15, "Maps", "asn-exception", "Map for a partner flow", "Which map handles Brightwell's 856, what changed recently, and what is its status?"),
  U(16, "Maps", "context-assistant", "Cross-reference lookup", "Look up the GLN for store 0388 in the store cross-reference."),
  U(17, "Maps", "asn-exception", "Correct a cross-reference (approval)", "Add the missing STORE_TO_GLN entry for DC 0412 Greensboro, GLN 0614141000418, location type DC, active Y."),
  U(18, "Requests", "partner-onboarding", "Request an AS2 connection (approval)", "Request a new AS2 connection for Hollanda Trading BV in production: AS2 ID HOLLANDA-AS2, endpoint https://as2.hollanda.example/receive, certificate hollanda_2026.cer. Then track it."),
  U(19, "Onboarding", "partner-onboarding", "Provision a supplier (approval)", "Provision Willow Creek Candle Co from the HRG_SUPPLIER_STD template with address ZZ:WILLOWCREEK over AS2, then track it."),
  U(20, "Data products", "community-insights", "Weekly volume and export", "Show weekly 856 volume by partner for the last 4 weeks from the data product, then export it."),
  U(21, "Transactions", "context-assistant", "Trace a PO lifecycle", "Trace PO 4500018832 from order to invoice."),
  U(22, "Transactions", "fa-reconciliation", "Overdue 997s", "Which POs sent in the last 2 days have no 997 after 24 hours?"),
  U(23, "Transactions", "fa-reconciliation", "Rejected 997s by supplier", "Which suppliers rejected our 850s this week, and why?"),
  U(24, "Transactions", "asn-exception", "Duplicate ASN check", "Did Brightwell send ASN SH-77120 twice?"),
  U(25, "Transactions", "error-resolution", "Find a document by reference", "A supplier quotes invoice INV-99812. Find it and show its status."),
  U(26, "Transactions", "morning-triage", "Stuck in processing", "What has been in process for more than 6 hours?"),
  U(27, "Transactions", "error-resolution", "Error breakdown", "Top error types for Northfield Foods in the last 30 days."),
  U(28, "Transactions", "community-insights", "Volume versus prior period", "Compare Coastline Apparel's volume for the last 30 days with the prior 30 days by document type."),
  U(29, "Transactions", "morning-triage", "Silent partners", "Which suppliers sent nothing in the last 7 days but normally send daily?"),
  U(30, "Onboarding", "partner-onboarding", "First live transaction", "Has Pinegate Home sent its first 810 in production?"),
  U(31, "Transactions", "error-resolution", "ASN payload for a dispute", "Show the ASN payload for shipment SH-77120 and summarize it."),
  U(32, "Transactions", "asn-exception", "Control numbers for a ticket", "Give me ISA13 and GS06 for the failed ASN SH-77155."),
  U(33, "Transactions", "fa-reconciliation", "POs without an 855", "Which POs older than 48 hours have no 855?"),
  U(34, "Transactions", "context-assistant", "Invoice before ASN", "Which 810s arrived before their 856 in the last 7 days?"),
  U(35, "Transactions", "fa-reconciliation", "EDIFACT CONTRL check", "Did Hollanda Trading return CONTRL for our ORDERS this week?"),
  U(36, "Transactions", "context-assistant", "Beyond the history limit", "Show failed transactions for the last 9 months."),
  U(37, "Transactions", "context-assistant", "Large result paging", "How many transactions did we exchange in the last 30 days? Page through the first 50."),
  U(38, "Transactions", "context-assistant", "Filter by ship-to", "Show transactions shipping to DC GLN 0614141000418 this week, then try filtering by store number 0412."),
  U(39, "Transactions", "context-assistant", "Invoices without a PO", "Which 810s reference POs we have no 850 for?"),
  U(40, "Transactions", "morning-triage", "Overnight exceptions", "What failed or went unacknowledged in the last 12 hours?"),
];

export const agentById = (id: string) => AGENTS.find((a) => a.id === id) ?? AGENTS[AGENTS.length - 1];
