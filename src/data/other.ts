// Cartographer, Community Projects, Community Provisioning and Trading Grid Data Platform fixtures.
// Shapes are modeled on the source descriptions in the incubation brief; field-level contracts
// were not supplied for these products.
import { dAgo, hAgo } from "../util.js";
import { HUB_ID, SOLUTION_ID } from "./cms.js";
import { STORES } from "./insights.js";

// ---- Cartographer: maps ---------------------------------------------------------------------------

export const CARTO_SOLUTION = "CARTO-HRG-01";

export const mappingSolutions = [
  { solutionId: CARTO_SOLUTION, solutionName: "Harborview retail maps", sourceSolutionIds: [SOLUTION_ID], translators: ["Contivo", "AI"], mapCount: 12 },
];

const map = (mapId: string, mapName: string, version: number, direction: string, sourceFormat: string, targetFormat: string, status: string, prodMap: boolean, acceptanceState: string, owner: string, modifiedDaysAgo: number, promotedDaysAgo: number | null, partners: string[], extras: any = {}) => ({
  mapId, mapName, version, status, direction, translator: "Contivo", owner,
  metadata: {
    mapId, mapName, version, direction, sourceFormat, targetFormat, prodMap, acceptanceState,
    lifecycleInfo: { stage: prodMap ? "PRODUCTION" : status === "RETIRED" ? "RETIRED" : "TEST", createdOn: dAgo(modifiedDaysAgo + 200), lastModifiedOn: dAgo(modifiedDaysAgo), lastModifiedBy: owner, lastPromotedOn: promotedDaysAgo != null ? dAgo(promotedDaysAgo) : null },
    ...extras,
  },
  partners,
});

export const maps = [
  map("M-1001", "BWHG_856_4010_IN", 7, "INBOUND", "X12 004010 856", "SAP IDoc DESADV", "ACTIVE", true, "ACCEPTED", "s.okafor", 4, 3, ["C20004"], { lookups: ["STORE_TO_GLN"], characteristics: { targetFields: 212, unmappedTargetFields: 9, lookups: 1 } }),
  map("M-1002", "NFF_810_4010_IN", 4, "INBOUND", "X12 004010 810", "SAP IDoc INVOIC", "ACTIVE", true, "ACCEPTED", "s.okafor", 140, 139, ["C20001"], { lookups: [], characteristics: { targetFields: 168, unmappedTargetFields: 4, lookups: 0 } }),
  map("M-1003", "HRG_850_4010_OUT", 12, "OUTBOUND", "SAP IDoc ORDERS", "X12 004010 850", "ACTIVE", true, "ACCEPTED", "edi.team", 60, 59, ["C20001", "C20002", "C20003", "C20004", "C20005", "C20007", "C20008", "C20009"], { lookups: ["VENDOR_NUMBER_BY_PARTNER"], characteristics: { targetFields: 190, unmappedTargetFields: 2, lookups: 1 } }),
  map("M-1004", "HOL_ORDERS_D96A_OUT", 3, "OUTBOUND", "SAP IDoc ORDERS", "EDIFACT D96A ORDERS", "ACTIVE", true, "ACCEPTED", "edi.team", 300, 299, ["C20006"]),
  map("M-1005", "CST_856_4010_IN", 5, "INBOUND", "X12 004010 856", "SAP IDoc DESADV", "ACTIVE", true, "ACCEPTED", "j.patel", 90, 88, ["C20003"]),
  map("M-1006", "PGH_810_4010_IN", 1, "INBOUND", "X12 004010 810", "SAP IDoc INVOIC", "IN_TEST", false, "PENDING", "j.patel", 3, null, ["C20005"]),
  map("M-1007", "ATL_846_4010_IN", 2, "INBOUND", "X12 004010 846", "Inventory feed CSV", "RETIRED", false, "ACCEPTED", "edi.team", 500, 700, ["C20008"]),
  map("M-1008", "SMB_855_4010_IN", 2, "INBOUND", "X12 004010 855", "SAP IDoc ORDRSP", "ACTIVE", true, "ACCEPTED", "j.patel", 220, 219, ["C20007"]),
  map("M-1009", "CRL_945_4010_IN", 4, "INBOUND", "X12 004010 945", "SAP IDoc SHPCON", "ACTIVE", true, "ACCEPTED", "j.patel", 75, 74, ["C20013"], { lookups: [], characteristics: { targetFields: 96, unmappedTargetFields: 3, lookups: 0 } }),
  map("M-1010", "CRL_214_4010_IN", 3, "INBOUND", "X12 004010 214", "SAP IDoc TRXSTA", "ACTIVE", true, "ACCEPTED", "j.patel", 30, 29, ["C20013"], { lookups: ["CARRIER_STATUS_CODE"], characteristics: { targetFields: 41, unmappedTargetFields: 1, lookups: 1 } }),
  map("M-1011", "HRG_940_4010_OUT", 6, "OUTBOUND", "SAP IDoc SHPORD", "X12 004010 940", "ACTIVE", true, "ACCEPTED", "edi.team", 120, 119, ["C20013"]),
  map("M-1012", "HRG_812_4010_OUT", 2, "OUTBOUND", "SAP FI chargeback", "X12 004010 812", "ACTIVE", true, "ACCEPTED", "edi.team", 300, 299, ["C20001"]),
];

export const mapSpecifications: Record<string, any[]> = {
  "M-1001": [
    { fileId: "SPEC-1001-A", fileName: "HRG_856_Implementation_Guide_v4.pdf", fileType: "application/pdf", sizeBytes: 482113, uploadedOn: dAgo(400), uploadedBy: "edi.team" },
    { fileId: "SPEC-1001-B", fileName: "Brightwell_856_sample.edi", fileType: "text/plain", sizeBytes: 3120, uploadedOn: dAgo(5), uploadedBy: "s.okafor" },
  ],
  "M-1003": [{ fileId: "SPEC-1003-A", fileName: "HRG_850_Implementation_Guide_v6.pdf", fileType: "application/pdf", sizeBytes: 391044, uploadedOn: dAgo(200), uploadedBy: "edi.team" }],
  "M-1006": [{ fileId: "SPEC-1006-A", fileName: "HRG_810_Implementation_Guide_v5.pdf", fileType: "application/pdf", sizeBytes: 352900, uploadedOn: dAgo(4), uploadedBy: "j.patel" }],
};

export const specFileContent: Record<string, string> = {
  "SPEC-1001-A": "HRG 856 implementation guide v4 (excerpt). Ship-to: N1*ST with N103=UL and N104=GLN is preferred. N103=92 with store number is accepted; the store number is resolved through cross-reference STORE_TO_GLN. Pack structure: S-O-P-I. TD1 and TD5 required.",
  "SPEC-1001-B": "Sample from Brightwell: BSN*00*SH-77001*20260930*1130~ ... N1*ST*Harborview Store 0214*92*0214~",
  "SPEC-1003-A": "HRG 850 implementation guide v6 (excerpt). BEG03 purchase order number. N1*ST N104 ship-to GLN. PO1 with UPC (UP qualifier).",
  "SPEC-1006-A": "HRG 810 implementation guide v5 (excerpt). BIG04 must reference an open HRG PO. IT104 unit price uses a period as decimal separator.",
};

export const mapAnnotations: Record<string, any[]> = {
  "M-1001": [
    { annotationId: "AN-501", author: "s.okafor", createdOn: dAgo(4), text: "v7: ship-to N1*ST with N103=92 now resolves the store number through STORE_TO_GLN instead of a hardcoded table. Work order WO-5488.", replies: [{ author: "edi.team", createdOn: dAgo(3), text: "Promoted to production." }], attachments: [{ name: "WO-5488_change_summary.pdf" }] },
    { annotationId: "AN-502", author: "j.patel", createdOn: dAgo(3), text: "Reminder: new DC 0412 Greensboro goes live this week. Confirm STORE_TO_GLN entry before first receipts.", replies: [], attachments: [] },
  ],
  "M-1006": [{ annotationId: "AN-601", author: "j.patel", createdOn: dAgo(3), text: "Initial map for Pinegate 810. Test file INV-PGH-0001 translated successfully.", replies: [], attachments: [] }],
};

// ---- Cartographer: cross-reference ----------------------------------------------------------------

export const xrefEntities: Record<string, any> = {
  STORE_TO_GLN: {
    entityName: "STORE_TO_GLN", description: "Store or DC number to GS1 GLN", keyColumn: "storeNumber", columns: ["gln", "locationName", "locationType", "active"],
    state: { reserved: false, reservedBy: null },
    entries: Object.fromEntries(Object.entries(STORES).filter(([k]) => k !== "0412").map(([k, v]) => [k, { gln: v.gln, locationName: v.name, locationType: "STORE", active: "Y" }])),
    lastModifiedOn: dAgo(45), lastModifiedBy: "edi.team",
  },
  ITEM_UPC_TO_SKU: {
    entityName: "ITEM_UPC_TO_SKU", description: "Supplier UPC to Harborview SKU", keyColumn: "upc", columns: ["sku", "description"],
    state: { reserved: false, reservedBy: null },
    entries: { "012345678905": { sku: "HRG-118204", description: "Ceramic mug set, 4 pc" }, "012345678912": { sku: "HRG-118377", description: "Linen napkins, 6 pc" }, "036000291452": { sku: "HRG-220114", description: "Sparkling water 12 pk" } },
    lastModifiedOn: dAgo(12), lastModifiedBy: "merch.data",
  },
  VENDOR_NUMBER_BY_PARTNER: {
    entityName: "VENDOR_NUMBER_BY_PARTNER", description: "Harborview vendor number by partner trading address", keyColumn: "tradingAddress", columns: ["vendorNumber"],
    state: { reserved: false, reservedBy: null },
    entries: { "ZZ:NORTHFIELDFD": { vendorNumber: "V-10044" }, "ZZ:BRIGHTWELLHG": { vendorNumber: "V-10391" }, "12:3035550147": { vendorNumber: "V-10520" }, "ZZ:COASTLINEAPP": { vendorNumber: "V-10288" } },
    lastModifiedOn: dAgo(60), lastModifiedBy: "edi.team",
  },
};

xrefEntities.CARRIER_STATUS_CODE = {
  entityName: "CARRIER_STATUS_CODE", description: "X12 214 AT701 shipment status code to Harborview receiving status", keyColumn: "statusCode", columns: ["hrgStatus", "description"],
  state: { reserved: true, reservedBy: "j.patel" },
  entries: { AF: { hrgStatus: "IN_TRANSIT", description: "Departed pickup location" }, X6: { hrgStatus: "IN_TRANSIT", description: "En route" }, X1: { hrgStatus: "ARRIVED", description: "Arrived at delivery location" }, D1: { hrgStatus: "DELIVERED", description: "Completed unloading" }, SD: { hrgStatus: "DELAYED", description: "Shipment delayed" } },
  lastModifiedOn: dAgo(30), lastModifiedBy: "j.patel",
};
xrefEntities.VENDOR_NUMBER_BY_PARTNER.entries["ZZ:CRESTLINE3PL"] = { vendorNumber: "V-20113" };
xrefEntities.VENDOR_NUMBER_BY_PARTNER.entries["ZZ:MAPLERIDGEWEB"] = { vendorNumber: "V-20214" };

export const prexref = {
  entityName: "PREXREF_ROUTING", description: "Pre-translation routing profiles (document type, sender, receiver)",
  entries: [
    { profileId: "PX-01", documentType: "856", sender: "ZZ:BRIGHTWELLHG", receiver: "ZZ:HARBORVIEWUS", mapName: "BWHG_856_4010_IN" },
    { profileId: "PX-02", documentType: "810", sender: "ZZ:NORTHFIELDFD", receiver: "ZZ:HARBORVIEWUS", mapName: "NFF_810_4010_IN" },
    { profileId: "PX-03", documentType: "856", sender: "ZZ:COASTLINEAPP", receiver: "ZZ:HARBORVIEWUS", mapName: "CST_856_4010_IN" },
    { profileId: "PX-04", documentType: "810", sender: "ZZ:PINEGATEHOME", receiver: "ZZ:HARBORVIEWTST", mapName: "PGH_810_4010_IN" },
    { profileId: "PX-05", documentType: "945", sender: "ZZ:CRESTLINE3PL", receiver: "ZZ:HARBORVIEWUS", mapName: "CRL_945_4010_IN" },
    { profileId: "PX-06", documentType: "214", sender: "ZZ:CRESTLINE3PL", receiver: "ZZ:HARBORVIEWUS", mapName: "CRL_214_4010_IN" },
  ],
};

// ---- Community Projects and Provisioning ----------------------------------------------------------

export const DEFAULT_PROJECT = { projectId: "PRJ-HRG-0001", projectName: "Harborview B2B operations", ownerCompanyId: HUB_ID };

export const changeRequestTypes = [
  { type: "AS2_CONNECTION", label: "AS2 connection", requiredFields: ["partnerCompanyId", "as2Id", "endpointUrl", "certificateFileName", "environment"] },
  { type: "SFTP_CONNECTION", label: "SFTP connection", requiredFields: ["partnerCompanyId", "host", "username", "authMethod", "environment"] },
  { type: "TRADING_PARTNER", label: "New or changed trading partner", requiredFields: ["partnerCompanyId", "documentTypes", "tradingAddress"] },
  { type: "MAP_NEW", label: "New map", requiredFields: ["partnerCompanyId", "documentType", "direction", "specificationFileName"] },
  { type: "MAP_CHANGE", label: "Map change", requiredFields: ["mapName", "changeDescription"] },
  { type: "PS_MAP", label: "Professional Services map request", requiredFields: ["description", "documentTypes"] },
];

export const changeRequests: any[] = [
  { statusId: "ST-10421", requestId: "REQ-10421", title: "SFTP connection for Coastline Apparel test", projectId: DEFAULT_PROJECT.projectId, submittedAt: dAgo(9), submittedBy: "jordan.lee", submissionState: "ACCEPTED", workOrders: [{ workOrderId: "WO-5521", type: "SFTP_CONNECTION", state: "IN_PROGRESS", stateSince: dAgo(8), assignedTeam: "BN connectivity", attachments: [] }] },
  { statusId: "ST-10466", requestId: "REQ-10466", title: "AS2 certificate renewal for Brightwell Home Goods", projectId: DEFAULT_PROJECT.projectId, submittedAt: dAgo(3), submittedBy: "s.okafor", submissionState: "REJECTED", rejectionReason: "Certificate file missing; attach the partner public certificate and resubmit.", workOrders: [{ workOrderId: "WO-5560", type: "AS2_CONNECTION", state: "REJECTED", stateSince: dAgo(2), assignedTeam: "BN connectivity", attachments: [] }] },
  { statusId: "ST-10471", requestId: "REQ-10471", title: "New 945 map version for Crestline short-ship reasons", projectId: DEFAULT_PROJECT.projectId, submittedAt: dAgo(1), submittedBy: "j.patel", submissionState: "ACCEPTED", workOrders: [{ workOrderId: "WO-5571", type: "MAP_CHANGE", state: "NEW", stateSince: dAgo(1), assignedTeam: "BN mapping", attachments: [{ fileName: "crestline_945_w12_codes.xlsx" }] }] },
  { statusId: "ST-10388", requestId: "REQ-10388", title: "Brightwell 856 ship-to store resolution", projectId: DEFAULT_PROJECT.projectId, submittedAt: dAgo(14), submittedBy: "jordan.lee", submissionState: "ACCEPTED", workOrders: [{ workOrderId: "WO-5488", type: "MAP_CHANGE", state: "COMPLETED", stateSince: dAgo(4), assignedTeam: "BN mapping", attachments: [{ fileName: "store_resolution_spec.xlsx" }] }] },
];

export const provisioningTemplates = [
  { templateName: "HRG_SUPPLIER_STD", description: "Standard X12 supplier: mailbox, AS2 address, relationships for 850, 855, 856, 810, 997", workflowTemplateId: 3101, requiredInputs: ["invitationId", "tradingAddress", "deliveryMethod"] },
  { templateName: "HRG_DROPSHIP_VENDOR", description: "Drop-ship vendor on supplier web EDI", workflowTemplateId: 3102, requiredInputs: ["invitationId"] },
];

export const provisionings: any[] = [
  { trackingId: "TRK-MRC-0042", templateName: "HRG_DROPSHIP_VENDOR", invitationId: 7720, submittedAt: dAgo(160), _completeAt: Date.parse(dAgo(158)), resultRefs: { companyId: "C20014", mailboxId: "MB-HRG-WEBEDI-01", tradingAddress: "ZZ:MAPLERIDGEWEB", tradingPartnerRelationshipIds: ["TPR-70131"] } },
  { trackingId: "TRK-PGH-0091", templateName: "HRG_SUPPLIER_STD", invitationId: 7702, submittedAt: dAgo(5), _completeAt: Date.parse(dAgo(4)), resultRefs: { companyId: "C20005", mailboxId: "MB-PGH-01", tradingAddress: "ZZ:PINEGATEHOME", tradingPartnerRelationshipIds: ["TPR-70051", "TPR-70052"] } },
];

// ---- Trading Grid Data Platform catalog -----------------------------------------------------------

export const dataProducts = [
  {
    productId: "tgdp.transaction_activity", version: "1.2", name: "Transaction activity", status: "AVAILABLE",
    description: "One row per observed transaction from TG Insights, with partner, document type, status and week.",
    coverage: { history: "25 months", grain: "transaction", sources: ["Trading Grid Insights"] },
    freshness: { commitment: "15 minutes", lastRefreshed: hAgo(0.2) },
    supportedOperations: ["query", "get_record", "query_status", "query_results", "cancel_query"],
    unsupportedOperations: ["export", "delivery_schedule"],
    keys: ["transaction_id"],
    fields: [
      ["transaction_id", "string", "Insights transaction ID"], ["received_at", "timestamp", "Arrival time (UTC)"], ["week", "date", "ISO week start"],
      ["partner_company_id", "string", "Partner CMS company ID"], ["partner_name", "string", "Partner name"], ["document_type", "string", "X12 or EDIFACT document type"],
      ["direction", "string", "INBOUND or OUTBOUND relative to the hub"], ["status", "string", "Source status code"], ["document_count", "integer", "Documents in the transaction"],
    ],
    joins: [{ product: "tgdp.partner_directory", on: "partner_company_id = partner_company_id", supported: true }],
    quality: [{ check: "Completeness vs Insights index", result: "PASS", observed: "99.97%", at: hAgo(3) }, { check: "Duplicate transaction_id", result: "PASS", observed: "0", at: hAgo(3) }],
    lineage: ["Trading Grid Insights search index", "TGDP ingestion job tg_insights_tx_v1 (15 min)", "Curated table transaction_activity v1.2"],
  },
  {
    productId: "tgdp.partner_directory", version: "0.9", name: "Trading partner directory", status: "PREVIEW",
    description: "Partner companies, business relationship status and activation dates from Community Management.",
    coverage: { history: "Current state plus 12 months of changes", grain: "business relationship", sources: ["Trading Grid Community Management"] },
    freshness: { commitment: "Daily", lastRefreshed: hAgo(9) },
    supportedOperations: ["query", "get_record", "query_status", "query_results", "cancel_query", "export", "delivery_schedule"],
    unsupportedOperations: [],
    keys: ["bpr_id"],
    fields: [["bpr_id", "string", "Business partner relationship ID"], ["partner_company_id", "string", "Partner CMS company ID"], ["partner_name", "string", "Partner name"], ["status", "string", "Relationship status"], ["activation_date", "date", "Activation date"]],
    joins: [{ product: "tgdp.transaction_activity", on: "partner_company_id = partner_company_id", supported: true }],
    quality: [{ check: "Row count vs CMS partner directory", result: "PASS", observed: "11 of 11", at: hAgo(9) }],
    lineage: ["CMS /v3/companies/{companyId}/partnerdirectory", "TGDP ingestion job cms_partner_dir_v0 (daily)", "Curated table partner_directory v0.9"],
  },
  {
    productId: "tgdp.relationship_network", version: "0.9", name: "Trading relationship network", status: "PREVIEW",
    description: "Address-level trading relationships and configured document types.",
    coverage: { history: "Current state", grain: "relationship and document type", sources: ["Trading Grid Community Management"] },
    freshness: { commitment: "Daily", lastRefreshed: hAgo(9) },
    supportedOperations: ["query", "query_status", "query_results"],
    unsupportedOperations: ["get_record", "export", "delivery_schedule"],
    keys: ["tpr_id", "document_type", "direction"],
    fields: [["tpr_id", "string", "Trading partner relationship ID"], ["partner_company_id", "string", "Partner CMS company ID"], ["partner_name", "string", "Partner name"], ["document_type", "string", "Configured document type"], ["direction", "string", "SENDER or RECEIVER"], ["status", "string", "Relationship status"]],
    joins: [],
    quality: [],
    lineage: ["CMS /v4/tradingpartnerrelationships and /v2/messagingtuples", "TGDP ingestion job cms_tpr_v0 (daily)"],
  },
  {
    productId: "tgdp.ccim_integration_events", version: "0.3", name: "Integration monitor events (CCIM)", status: "PREVIEW",
    description: "Command Center Integration Monitor anomaly and watchlist events.",
    coverage: { history: "90 days", grain: "event", sources: ["Command Center Integration Monitor"] },
    freshness: { commitment: "Not yet defined", lastRefreshed: hAgo(30) },
    supportedOperations: ["query", "query_status", "query_results"],
    unsupportedOperations: ["get_record", "export", "delivery_schedule"],
    keys: ["event_id"],
    fields: [["event_id", "string", "Event ID"], ["detected_at", "timestamp", "Detection time"], ["watchlist", "string", "Watchlist name"], ["partner_name", "string", "Partner"], ["document_type", "string", "Document type"], ["event_type", "string", "ANOMALY or THRESHOLD"], ["detail", "string", "Finding"]],
    joins: [],
    quality: null,
    lineage: ["CCIM watchlist and anomaly store", "TGDP ingestion job ccim_events_v0 (preview)"],
  },
];

export const ccimEvents = [
  { event_id: "EV-9001", detected_at: hAgo(20), watchlist: "Inbound ASN volume", partner_name: "Brightwell Home Goods", document_type: "856", event_type: "ANOMALY", detail: "Failed 856 count above expected range" },
  { event_id: "EV-9002", detected_at: hAgo(26), watchlist: "PO acknowledgment", partner_name: "Summit Beverage Co", document_type: "997", event_type: "ANOMALY", detail: "No 997 received for outbound 850s since 32 hours ago" },
  { event_id: "EV-9004", detected_at: hAgo(15), watchlist: "Inbound document volume", partner_name: "Crestline Logistics LLC", document_type: "214", event_type: "FAILED_TRANSACTION", detail: "214 failed: status code A9 not in CARRIER_STATUS_CODE" },
  { event_id: "EV-9005", detected_at: hAgo(14), watchlist: "Outbound remittance", partner_name: "Coastline Apparel Co", document_type: "820", event_type: "FAILED_TRANSACTION", detail: "820 delivery rejected by Keystone VAN interconnect" },
  { event_id: "EV-9003", detected_at: hAgo(200), watchlist: "Inbound document volume", partner_name: "Atlas Toy Company", document_type: "856", event_type: "ANOMALY", detail: "Inbound volume dropped to zero" },
];

export const deliverySchedules: any[] = [
  { scheduleId: "SCH-0009", productId: "tgdp.transaction_activity", version: "1.2", cadence: "DAILY (05:00 UTC)", destination: "HRG-SFTP-DATA (approved destination)", format: "PARQUET", status: "PAUSED", configVersion: 2, createdAt: dAgo(40), lastRun: { at: dAgo(9), status: "FAILED", records: 0, error: "Destination quota exceeded" }, nextRun: null },
  { scheduleId: "SCH-0007", productId: "tgdp.partner_directory", version: "0.9", cadence: "WEEKLY (Mon 06:00 UTC)", destination: "HRG-SFTP-DATA (approved destination)", format: "CSV", status: "ACTIVE", configVersion: 3, createdAt: dAgo(60), lastRun: { at: dAgo(4), status: "SUCCEEDED", records: 11 }, nextRun: dAgo(-3) },
];
