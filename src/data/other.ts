// Cartographer, Community Projects, Community Provisioning and Trading Grid Data Platform fixtures.
// Shapes are modeled on the source descriptions in the incubation brief; field-level contracts
// were not supplied for these products.
import { dAgo, hAgo } from "../util.js";
import { HUB_ID, SOLUTION_ID } from "./cms.js";
import { STORE_LIST, onWorldDay } from "./insights.js";
import { PROFILES } from "./roster.js";

// ---- Cartographer: maps ---------------------------------------------------------------------------

export const CARTO_SOLUTION = "CARTO-HRG-01";

export const mappingSolutions = [
  { solutionId: CARTO_SOLUTION, solutionName: "Harborview retail maps", sourceSolutionIds: [SOLUTION_ID], translators: ["Contivo", "AI"], mapCount: 13 },
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
  map("M-1003", "HRG_850_4010_OUT", 12, "OUTBOUND", "SAP IDoc ORDERS", "X12 004010 850", "ACTIVE", true, "ACCEPTED", "edi.team", 60, 59, PROFILES.filter((p) => p.flow === "X12_SUPPLIER").map((p) => p.id), { lookups: ["VENDOR_NUMBER_BY_PARTNER"], characteristics: { targetFields: 190, unmappedTargetFields: 2, lookups: 1 } }),
  map("M-1004", "HOL_ORDERS_D96A_OUT", 3, "OUTBOUND", "SAP IDoc ORDERS", "EDIFACT D96A ORDERS", "ACTIVE", true, "ACCEPTED", "edi.team", 300, 299, ["C20006"]),
  map("M-1005", "CST_856_4010_IN", 5, "INBOUND", "X12 004010 856", "SAP IDoc DESADV", "ACTIVE", true, "ACCEPTED", "j.patel", 90, 88, ["C20003"]),
  map("M-1006", "PGH_810_4010_IN", 1, "INBOUND", "X12 004010 810", "SAP IDoc INVOIC", "ACTIVE", true, "ACCEPTED", "j.patel", 66, 65, ["C20005"]),
  map("M-1007", "ATL_846_4010_IN", 2, "INBOUND", "X12 004010 846", "Inventory feed CSV", "RETIRED", false, "ACCEPTED", "edi.team", 500, 700, ["C20008"]),
  map("M-1008", "SMB_855_4010_IN", 2, "INBOUND", "X12 004010 855", "SAP IDoc ORDRSP", "ACTIVE", true, "ACCEPTED", "j.patel", 220, 219, ["C20007"]),
  map("M-1009", "CRL_945_4010_IN", 4, "INBOUND", "X12 004010 945", "SAP IDoc SHPCON", "ACTIVE", true, "ACCEPTED", "j.patel", 75, 74, ["C20013"], { lookups: [], characteristics: { targetFields: 96, unmappedTargetFields: 3, lookups: 0 } }),
  map("M-1010", "CRL_214_4010_IN", 3, "INBOUND", "X12 004010 214", "SAP IDoc TRXSTA", "ACTIVE", true, "ACCEPTED", "j.patel", 30, 29, ["C20013"], { lookups: ["CARRIER_STATUS_CODE"], characteristics: { targetFields: 41, unmappedTargetFields: 1, lookups: 1 } }),
  map("M-1011", "HRG_940_4010_OUT", 6, "OUTBOUND", "SAP IDoc SHPORD", "X12 004010 940", "ACTIVE", true, "ACCEPTED", "edi.team", 120, 119, ["C20013"]),
  map("M-1012", "HRG_812_4010_OUT", 2, "OUTBOUND", "SAP FI chargeback", "X12 004010 812", "ACTIVE", true, "ACCEPTED", "edi.team", 300, 299, PROFILES.filter((p) => p.flow === "X12_SUPPLIER").map((p) => p.id)),
  map("M-1015", "HRG_855_4010_IN", 3, "INBOUND", "X12 004010 855", "SAP IDoc ORDRSP", "ACTIVE", true, "ACCEPTED", "edi.team", 90, 89, PROFILES.filter((p) => p.flow === "X12_SUPPLIER" && p.poAck > 0 && !p.map855).map((p) => p.id)),
  map("M-1016", "HRG_810_4010_IN", 5, "INBOUND", "X12 004010 810", "SAP IDoc INVOIC", "ACTIVE", true, "ACCEPTED", "edi.team", 120, 119, PROFILES.filter((p) => p.flow === "X12_SUPPLIER" && !p.map810 && p.id !== "C20032").map((p) => p.id)),
  map("M-1017", "HRG_856_4010_IN", 4, "INBOUND", "X12 004010 856", "SAP IDoc DESADV", "ACTIVE", true, "ACCEPTED", "edi.team", 150, 149, PROFILES.filter((p) => p.flow === "X12_SUPPLIER" && !p.map856 && p.id !== "C20032").map((p) => p.id), { lookups: ["ITEM_UPC_TO_SKU"], characteristics: { targetFields: 188, unmappedTargetFields: 5, lookups: 1 } }),
  map("M-1018", "HRG_860_4010_OUT", 2, "OUTBOUND", "SAP IDoc ORDCHG", "X12 004010 860", "ACTIVE", true, "ACCEPTED", "edi.team", 200, 199, PROFILES.filter((p) => p.flow === "X12_SUPPLIER").map((p) => p.id)),
  map("M-1014", "CVF_856_4010_IN", 1, "INBOUND", "X12 004010 856", "SAP IDoc DESADV", "IN_TEST", false, "PENDING", "j.patel", 4, null, ["C20032"]),
  map("M-1013", "HRG_856_4010_STORE_IN", 2, "INBOUND", "X12 004010 856", "SAP IDoc DESADV", "ACTIVE", true, "ACCEPTED", "s.okafor", 45, 44, ["C20017", "C20021"], { lookups: ["STORE_TO_GLN"], characteristics: { targetFields: 205, unmappedTargetFields: 7, lookups: 1 } }),
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
    { annotationId: "AN-502", author: "j.patel", createdOn: dAgo(3), text: "Reminder: confirm the STORE_TO_GLN entry before the first receipts at every new store or DC opening.", replies: [], attachments: [] },
  ],
  "M-1006": [{ annotationId: "AN-601", author: "j.patel", createdOn: dAgo(70), text: "Initial map for Pinegate 810. Test file INV-PGH-0001 translated successfully.", replies: [], attachments: [] }],
};

// ---- Cartographer: cross-reference ----------------------------------------------------------------

export const xrefEntities: Record<string, any> = {
  STORE_TO_GLN: {
    entityName: "STORE_TO_GLN", description: "Store or DC number to GS1 GLN", keyColumn: "storeNumber", columns: ["gln", "locationName", "locationType", "active"],
    state: { reserved: false, reservedBy: null },
    entries: {} as Record<string, any>,
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
  { statusId: "ST-10471", requestId: "REQ-10471", title: "New 945 map version for Crestline short-ship reasons", projectId: DEFAULT_PROJECT.projectId, submittedAt: dAgo(1), submittedBy: "j.patel", submissionState: "ACCEPTED", workOrders: [{ workOrderId: "WO-5571", type: "MAP_CHANGE", state: "NEW", stateSince: dAgo(1), assignedTeam: "BN mapping", attachments: [{ fileName: "crestline_945_w12_codes.xlsx" }] }] },
  { statusId: "ST-10388", requestId: "REQ-10388", title: "Brightwell 856 ship-to store resolution", projectId: DEFAULT_PROJECT.projectId, submittedAt: dAgo(14), submittedBy: "jordan.lee", submissionState: "ACCEPTED", workOrders: [{ workOrderId: "WO-5488", type: "MAP_CHANGE", state: "COMPLETED", stateSince: dAgo(4), assignedTeam: "BN mapping", attachments: [{ fileName: "store_resolution_spec.xlsx" }] }] },
];
// Certificate renewal for the Northfield Foods AS2 incident; times are relative to the current time.
/** On-hold work orders the follow-up scenario depends on; reapplied after saved state is restored. */
export let ON_HOLD_FIXES: [string, string, string, number][] = [];
export function applyHoldFixes(list: any[]) {
  for (const [id, reason, owner] of ON_HOLD_FIXES) { const c = list.find((x) => x.statusId === id); const w = c?.workOrders?.[0]; if (w) { w.state = "ON_HOLD"; w.holdReason = reason; w.waitingOn = owner; } }
  // Sunfield thread for the ChatGPT scenario: an 856 catch-weight map change waiting on Sunfield's test file, which has just arrived and failed validation.
  const sf = list.find((x) => x.statusId === "ST-10101"); const w = sf?.workOrders?.[0];
  if (sf && w) { sf.title = "856 map change for Sunfield Produce Partners: catch-weight unit of measure"; sf.partnerCompanyId = "C20025"; w.type = "MAP_CHANGE"; w.assignedTeam = "BN mapping"; w.fields = { partnerCompanyId: "C20025", documentType: "856", mapName: "HRG_856_4010_IN", change: "Accept catch-weight items shipped in pounds (LB) with decimal quantities" }; w.attachments = [{ fileName: "sunfield_856_catchweight_spec.pdf" }];
    w._testFile = { fileName: "SFP_856_TEST_catchweight.edi", minAgo: 12, from: "Sunfield Produce Partners (edi@sunfieldproduce.com)", validation: "FAILED: SN103 unit of measure 'LBR' is not a valid X12 code (expected 'LB'); 3 of 4 items affected", note: "Sunfield sent a test file 12 minutes ago. It failed validation: unit of measure 'LBR' instead of 'LB'. The work order stays on hold until a corrected file arrives." }; }
}
export const CERT_CR = { statusId: "ST-10500", requestId: "REQ-10500", title: "AS2 certificate renewal for Northfield Foods", projectId: DEFAULT_PROJECT.projectId, submittedAt: dAgo(0), submittedBy: "jordan.lee", submissionState: "ACCEPTED", partnerCompanyId: "C20001", _rollingMin: 95, workOrders: [{ workOrderId: "WO-5600", type: "AS2_CONNECTION", state: "IN_PROGRESS", stateSince: dAgo(0), assignedTeam: "BN Support Operations", attachments: [{ fileName: "northfield_as2_signing_2026.cer" }], latestNote: "Partner's new signing certificate received and validated. Installation and connection test pending. Inbound files resume after the test passes.", estimatedCompletion: null, estimateNote: "BN Support Operations has not provided a completion estimate.", similarRequests: { count: 6, typicalResolution: "2 to 4 hours from certificate receipt", basis: "AS2 certificate renewals for Harborview partners in the last 12 months" } }] };
changeRequests.push(JSON.parse(JSON.stringify(CERT_CR)));
// Cedar Valley Furniture go-live (Oct 29): production move and connection in flight; no inbound 810 map requested yet.
export const FIXTURE_CRS: any[] = [
  { statusId: "ST-10512", requestId: "REQ-10512", title: "Move Cedar Valley Furniture to production", projectId: DEFAULT_PROJECT.projectId, submittedAt: dAgo(3), submittedBy: "m.chen", submissionState: "ACCEPTED", partnerCompanyId: "C20032", workOrders: [{ workOrderId: "WO-5612", type: "TRADING_PARTNER", state: "IN_PROGRESS", stateSince: dAgo(2), assignedTeam: "BN onboarding", attachments: [] }] },
  { statusId: "ST-10509", requestId: "REQ-10509", title: "AS2 production connection for Cedar Valley Furniture", projectId: DEFAULT_PROJECT.projectId, submittedAt: dAgo(5), submittedBy: "m.chen", submissionState: "ACCEPTED", partnerCompanyId: "C20032", workOrders: [{ workOrderId: "WO-5606", type: "AS2_CONNECTION", state: "COMPLETED", stateSince: dAgo(2), assignedTeam: "BN connectivity", attachments: [{ fileName: "cedar_valley_as2_cert.cer" }] }] },
  { statusId: "ST-10510", requestId: "REQ-10510", title: "New 856 map for Cedar Valley Furniture", projectId: DEFAULT_PROJECT.projectId, submittedAt: dAgo(5), submittedBy: "m.chen", submissionState: "ACCEPTED", partnerCompanyId: "C20032", workOrders: [{ workOrderId: "WO-5608", type: "MAP_NEW", state: "IN_PROGRESS", stateSince: dAgo(4), assignedTeam: "BN mapping", attachments: [{ fileName: "cedar_valley_856_spec.pdf" }] }] },
];
changeRequests.push(...JSON.parse(JSON.stringify(FIXTURE_CRS)));

// History of change requests and their work orders over the last six months (deterministic).
{
  let seed = 7319;
  const r = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  const people = ["jordan.lee", "s.okafor", "j.patel", "m.chen", "edi.team"];
  const TEAM: Record<string, string> = { AS2_CONNECTION: "BN connectivity", SFTP_CONNECTION: "BN connectivity", TRADING_PARTNER: "BN onboarding", MAP_NEW: "BN mapping", MAP_CHANGE: "BN mapping", PS_MAP: "Professional Services" };
  const partners = PROFILES.filter((p) => p.flow !== "WEB_EDI").map((p) => p.id);
  const DOCS = ["850", "855", "856", "810", "846", "940", "945", "214", "820", "812"];
  const NAMES: Record<string, string> = Object.fromEntries(Object.entries({ C20001: "Northfield Foods", C20002: "Northfield Farms", C20003: "Coastline Apparel", C20004: "Brightwell Home Goods", C20005: "Pinegate Home", C20006: "Hollanda Trading", C20007: "Summit Beverage", C20008: "Atlas Toy", C20009: "Meridian Personal Care", C20013: "Crestline Logistics", C20015: "Bayside Snacks", C20016: "Granite Peak Outdoor", C20017: "Lumen Lighting Supply", C20018: "Orchard Lane Juices", C20019: "Riverstone Pet Products", C20020: "Cascadia Paper Goods", C20021: "Silverline Kitchenware", C20022: "Harbor and Pine Textiles", C20023: "Kestrel Electronics", C20024: "Meadowbrook Dairy", C20025: "Sunfield Produce Partners", C20026: "Ironwood Tools", C20027: "Blue Heron Baby", C20029: "Northstar Apparel Group", C20030: "Tidewater Seafood", C20031: "Prairie Grain Foods", C20032: "Cedar Valley Furniture", C20033: "Vantage Health Supply", C20034: "Rocky Coast Beverages" }));
  const title = (type: string, pid: string, doc: string) => {
    const n = NAMES[pid] ?? pid;
    return ({
      AS2_CONNECTION: pick([`AS2 certificate renewal for ${n}`, `New AS2 connection for ${n} production`, `AS2 endpoint change for ${n}`]),
      SFTP_CONNECTION: pick([`SFTP connection for ${n} test`, `SFTP credential rotation for ${n}`]),
      TRADING_PARTNER: pick([`Add ${doc} relationship for ${n}`, `Move ${n} to production`, `New trading address for ${n}`]),
      MAP_NEW: `New ${doc} map for ${n}`,
      MAP_CHANGE: pick([`${n} ${doc} map change: ship-to handling`, `${n} ${doc} map change: unit of measure`, `${n} ${doc} map change: new reference qualifier`]),
      PS_MAP: `Professional Services ${doc} mapping for ${n}`,
    } as Record<string, string>)[type];
  };
  const types = ["AS2_CONNECTION", "SFTP_CONNECTION", "TRADING_PARTNER", "MAP_NEW", "MAP_CHANGE", "MAP_CHANGE", "PS_MAP", "TRADING_PARTNER"];
  for (let k = 0; k < 44; k++) {
    const days = Math.round(Math.pow(r(), 1.4) * 180) + 1;
    const type = pick(types);
    const pid = pick(partners);
    const doc = pick(DOCS);
    const rejected = r() < 0.07;
    const nWo = type === "TRADING_PARTNER" && r() < 0.35 ? 2 : 1;
    const wos = Array.from({ length: nWo }, (_, w) => {
      const t = w === 0 ? type : type === "TRADING_PARTNER" ? "MAP_NEW" : type;
      const leadDays = { AS2_CONNECTION: 6, SFTP_CONNECTION: 5, TRADING_PARTNER: 9, MAP_NEW: 21, MAP_CHANGE: 10, PS_MAP: 35 }[t] ?? 10;
      const prog = days / leadDays;
      const state = rejected ? "REJECTED" : prog > 1.3 ? (r() < 0.06 ? "CANCELLED" : "COMPLETED") : prog > 0.25 ? (r() < 0.3 ? "ON_HOLD" : "IN_PROGRESS") : "NEW";
      const since = state === "COMPLETED" ? Math.max(1, Math.round(days - leadDays * (0.7 + r() * 0.6))) : state === "IN_PROGRESS" ? Math.max(0, Math.round(days * (0.2 + r() * 0.5))) : days;
      return { workOrderId: `WO-${5100 + k * 2 + w}`, type: t, state, stateSince: dAgo(since), assignedTeam: TEAM[t], attachments: r() < 0.5 ? [{ fileName: `${(NAMES[pid] ?? pid).toLowerCase().replace(/[^a-z]+/g, "_")}_${doc}_spec.pdf` }] : [], ...(state === "ON_HOLD" ? { holdReason: pick(["Waiting for partner test file", "Waiting for partner certificate", "Waiting for specification approval"]) } : {}) };
    });
    changeRequests.push({ statusId: `ST-${10100 + k}`, requestId: `REQ-${10100 + k}`, title: title(type, pid, doc), projectId: DEFAULT_PROJECT.projectId, submittedAt: dAgo(days), submittedBy: pick(people), submissionState: rejected ? "REJECTED" : "ACCEPTED", partnerCompanyId: pid, ...(rejected ? { rejectionReason: pick(["Required attachment missing; attach the file and resubmit.", "Duplicate of an open request.", "Partner company is not in the selected project."]) } : {}), workOrders: wos });
  }
  // On-hold work orders are fixed so the follow-up scenario is stable: who owes the next action is recorded.
  const gen = changeRequests.filter((c) => /^ST-101/.test(c.statusId) && c.submissionState === "ACCEPTED");
  for (const c of gen) for (const w of c.workOrders) if (w.state === "ON_HOLD") { w.state = "IN_PROGRESS"; delete w.holdReason; }
  const HOLDS: [string, string, string, number][] = [
    ["ST-10107", "Waiting for specification approval", "Harborview Retail Group", 8],
    ["ST-10101", "Waiting for partner test file", "Sunfield Produce Partners", 2],
    ["ST-10104", "Waiting for partner certificate", "Rocky Coast Beverages", 5],
  ];
  ON_HOLD_FIXES = HOLDS;
  for (const [id, reason, owner, days] of HOLDS) { const c = changeRequests.find((x) => x.statusId === id); if (!c) continue; const w = c.workOrders[0]; w.state = "ON_HOLD"; w.holdReason = reason; w.waitingOn = owner; w.stateSince = dAgo(days); }
  applyHoldFixes(changeRequests);
  gen.filter((c) => c.workOrders[0].state === "COMPLETED").slice(-2).forEach((c) => { c.workOrders[0].state = "CANCELLED"; });
  for (const c of changeRequests) if (!c.partnerCompanyId) c.partnerCompanyId = c.title.includes("Coastline") ? "C20003" : c.title.includes("Brightwell") ? "C20004" : c.title.includes("Crestline") ? "C20013" : null;
  changeRequests.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}


export const provisioningTemplates = [
  { templateName: "HRG_SUPPLIER_STD", description: "Standard X12 supplier: mailbox, AS2 address, relationships for 850, 855, 856, 810, 997", workflowTemplateId: 3101, requiredInputs: ["invitationId", "tradingAddress", "deliveryMethod"] },
  { templateName: "HRG_DROPSHIP_VENDOR", description: "Drop-ship vendor on supplier web EDI", workflowTemplateId: 3102, requiredInputs: ["invitationId"] },
];

export const provisionings: any[] = [
  { trackingId: "TRK-MRC-0042", templateName: "HRG_DROPSHIP_VENDOR", invitationId: 7720, submittedAt: dAgo(160), _completeAt: Date.parse(dAgo(158)), resultRefs: { companyId: "C20014", mailboxId: "MB-HRG-WEBEDI-01", tradingAddress: "ZZ:MAPLERIDGEWEB", tradingPartnerRelationshipIds: ["TPR-70131"] } },
  { trackingId: "TRK-CVF-0107", templateName: "HRG_SUPPLIER_STD", invitationId: null, submittedAt: dAgo(4), _completeAt: Date.parse(dAgo(3)), resultRefs: { companyId: "C20032", mailboxId: "MB-CVF-01", tradingAddress: "ZZ:CEDARVALLEYF", tradingPartnerRelationshipIds: ["TPR-70371", "TPR-70372"] } },
  { trackingId: "TRK-PGH-0091", templateName: "HRG_SUPPLIER_STD", invitationId: 7702, submittedAt: dAgo(68), _completeAt: Date.parse(dAgo(67)), resultRefs: { companyId: "C20005", mailboxId: "MB-PGH-01", tradingAddress: "ZZ:PINEGATEHOME", tradingPartnerRelationshipIds: ["TPR-70051", "TPR-70052"] } },
];
export const SEED_PROVISIONINGS = provisionings.map((p) => ({ ...p }));

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



export const deliverySchedules: any[] = [
  { scheduleId: "SCH-0009", productId: "tgdp.transaction_activity", version: "1.2", cadence: "DAILY (05:00 UTC)", destination: "HRG-SFTP-DATA (approved destination)", format: "PARQUET", status: "PAUSED", configVersion: 2, createdAt: dAgo(40), lastRun: { at: dAgo(9), status: "FAILED", records: 0, error: "Destination quota exceeded" }, nextRun: null },
  { scheduleId: "SCH-0007", productId: "tgdp.partner_directory", version: "0.9", cadence: "WEEKLY (Mon 06:00 UTC)", destination: "HRG-SFTP-DATA (approved destination)", format: "CSV", status: "ACTIVE", configVersion: 3, createdAt: dAgo(60), lastRun: { at: dAgo(4), status: "SUCCEEDED", records: 11 }, nextRun: dAgo(-3) },
];

/** Adds STORE_TO_GLN entries whose maintenance date has passed. User changes are kept. Runs at startup and daily. */
export function refreshStoreXref(now = Date.now()) {
  const today = Math.floor(now / 86400_000);
  const e = xrefEntities.STORE_TO_GLN.entries;
  for (const st of STORE_LIST) if (st.xrefDay <= today && !e[st.number] && !(xrefEntities.STORE_TO_GLN._deleted ?? []).includes(st.number)) e[st.number] = { gln: st.gln, locationName: st.name, locationType: st.name.startsWith("DC") ? "DC" : "STORE", active: "Y" };
}
refreshStoreXref();
onWorldDay(() => refreshStoreXref());
