// Trading Grid Community Management (CMS) fixtures.
// Field names follow the CommunityManagementServices v2-v5 Swagger definitions in CMS_context.md.
// All companies, people and identifiers are fictional.
import { dAgo, hAgo } from "../util.js";
import { NEW_PARTNERS, PROFILES, profileById, anchorDay, DAY } from "./roster.js";

export const HUB_ID = "C10023001";
export const HUB_ORG = "ORG-HRG";
export const HUB_BUID = "BU-HRG-US";
export const SOLUTION_ID = "SOL-HRG-RETAIL-01";
export const COMMUNITY = { communityId: "COM-HRG-RETAIL", communityName: "Harborview Retail Supplier Community", communityType: "HUB" };

const log = (createdDaysAgo: number, modifiedDaysAgo = createdDaysAgo, by = "cms.admin") => ({
  createTimeStamp: dAgo(createdDaysAgo),
  createdBy: by,
  modifiedBy: by,
  modifyTimeStamp: dAgo(modifiedDaysAgo),
});

type Co = {
  id: string; name: string; city: string; state: string; country: string; industry: string;
  buid: string; orgId: string; participation: "HUB" | "SPOKE" | "VAN" | "NONE"; created: number;
  duns?: string; gln?: string; status?: string; parent?: string;
};

const CO: Co[] = [
  { id: HUB_ID, name: "Harborview Retail Group", city: "Charlotte", state: "NC", country: "US", industry: "Retail", buid: HUB_BUID, orgId: HUB_ORG, participation: "HUB", created: 2400, duns: "081466849", gln: "0614141000012" },
  { id: "C10023002", name: "Harborview Retail Canada", city: "Toronto", state: "ON", country: "CA", industry: "Retail", buid: "BU-HRG-CA", orgId: HUB_ORG, participation: "HUB", created: 1500, parent: HUB_ID, gln: "0614141000029" },
  { id: "C20001", name: "Northfield Foods Inc", city: "Minneapolis", state: "MN", country: "US", industry: "Consumer packaged goods", buid: "BU-NFF", orgId: "ORG-NFF", participation: "SPOKE", created: 1900, duns: "612004471" },
  { id: "C20002", name: "Northfield Farms LLC", city: "Fresno", state: "CA", country: "US", industry: "Fresh produce", buid: "BU-NFR", orgId: "ORG-NFR", participation: "SPOKE", created: 700, duns: "784110223" },
  { id: "C20003", name: "Coastline Apparel Co", city: "Los Angeles", state: "CA", country: "US", industry: "Apparel", buid: "BU-CST", orgId: "ORG-CST", participation: "SPOKE", created: 1600 },
  { id: "C20004", name: "Brightwell Home Goods", city: "Columbus", state: "OH", country: "US", industry: "Home goods", buid: "BU-BWHG", orgId: "ORG-BWHG", participation: "SPOKE", created: 1300 },
  { id: "C20005", name: "Pinegate Home LLC", city: "Asheville", state: "NC", country: "US", industry: "Home goods", buid: "BU-PGH", orgId: "ORG-PGH", participation: "SPOKE", created: 71 },
  { id: "C20006", name: "Hollanda Trading BV", city: "Rotterdam", state: "ZH", country: "NL", industry: "Import and distribution", buid: "BU-HOL", orgId: "ORG-HOL", participation: "SPOKE", created: 1100, gln: "8712345000011" },
  { id: "C20007", name: "Summit Beverage Co", city: "Denver", state: "CO", country: "US", industry: "Beverages", buid: "BU-SMB", orgId: "ORG-SMB", participation: "SPOKE", created: 1250 },
  { id: "C20008", name: "Atlas Toy Company", city: "Providence", state: "RI", country: "US", industry: "Toys", buid: "BU-ATL", orgId: "ORG-ATL", participation: "SPOKE", created: 1450 },
  { id: "C20009", name: "Meridian Personal Care", city: "Newark", state: "NJ", country: "US", industry: "Health and beauty", buid: "BU-MPC", orgId: "ORG-MPC", participation: "SPOKE", created: 980 },
  { id: "C20010", name: "Redline Logistics Inc", city: "Memphis", state: "TN", country: "US", industry: "Third-party logistics", buid: "BU-RDL", orgId: "ORG-RDL", participation: "SPOKE", created: 90 },
  { id: "C20011", name: "Evergreen Paper Products", city: "Portland", state: "OR", country: "US", industry: "Paper products", buid: "BU-EVP", orgId: "ORG-EVP", participation: "SPOKE", created: 21 },
  { id: "C20012", name: "Willow Creek Candle Co", city: "Burlington", state: "VT", country: "US", industry: "Home fragrance", buid: "BU-WCC", orgId: "ORG-WCC", participation: "NONE", created: 2, status: "PENDING_REGISTRATION" },
  { id: "C20013", name: "Crestline Logistics LLC", city: "Reno", state: "NV", country: "US", industry: "Third-party logistics", buid: "BU-CRL", orgId: "ORG-CRL", participation: "SPOKE", created: 420, duns: "117420938" },
  { id: "C20014", name: "Maple Ridge Crafts", city: "Bend", state: "OR", country: "US", industry: "Home decor", buid: "BU-MRC", orgId: "ORG-MRC", participation: "SPOKE", created: 160 },
  { id: "C40001", name: "Keystone VAN Services", city: "Pittsburgh", state: "PA", country: "US", industry: "Value-added network", buid: "BU-KVAN", orgId: "ORG-KVAN", participation: "VAN", created: 3000 },
  { id: "C30090001", name: "Lakeshore Market Co", city: "Cleveland", state: "OH", country: "US", industry: "Retail", buid: "BU-LKS", orgId: "ORG-LKS", participation: "HUB", created: 1800 },
];
for (const n of NEW_PARTNERS) { const p = profileById(n.id)!; CO.push({ id: n.id, name: n.name, city: n.city, state: n.state, country: "US", industry: n.industry, buid: `BU-${p.prefix}`, orgId: `ORG-${p.prefix}`, participation: "SPOKE", created: Math.max(5, -p.goLive + 30) }); }

export const companies = CO.map((c) => ({
  companyId: c.id,
  companyName: c.name,
  companyNumber: c.id.replace("C", "CN-"),
  status: c.status ?? "ACTIVE",
  orgId: c.orgId,
  industryType: c.industry,
  dunsNumber: c.duns ?? null,
  globalLocationNumber: c.gln ?? null,
  companyParticipationType: c.participation,
  isTestCompany: "NO",
  isFederatedBU: "NO",
  hierarchySupported: c.id === HUB_ID ? "YES" : "NO",
  parentCompanyId: c.parent ? { companyId: c.parent } : null,
  companyAddress: { addressLine1: "On file", city: c.city, state: c.state, countryCode: c.country, postalCode: "On file" },
  community: c.participation === "NONE" || c.id === "C30090001" ? [] : [{ ...COMMUNITY, participationType: c.participation === "HUB" ? "HUB" : "SPOKE" }],
  activityLog: log(c.created, Math.min(c.created, 30)),
  _buid: c.buid,
}));

export const companyById = (id: string) => companies.find((c) => c.companyId === id);

export const hierarchy = {
  [HUB_ID]: {
    companyHierarchyPresent: true,
    isCompanyHierarchyPresent: true,
    rootParentCompanyId: HUB_ID,
    companyHierarchyDetails: {
      companyId: HUB_ID, companyName: "Harborview Retail Group", parentCompanyId: null,
      childCompany: [{ companyId: "C10023002", companyName: "Harborview Retail Canada", parentCompanyId: HUB_ID, childCompany: [] }],
    },
  },
};

export const legalEntities = [
  { legalEntityId: "LE-HRG-US-01", companyId: HUB_ID, legalProfileName: "Harborview Retail Group LLC", legalProfileType: "SELLER_BUYER", legalEntityHubBuId: HUB_BUID, legalEntitySolutionId: SOLUTION_ID, legalEntityGLN: "0614141000012", legalEntityTaxId: "On file (masked)", legalEntityVatId: null, legalEntityTimeZoneCode: "America/New_York", legalEntityAddress: { addressLine1: "On file", city: "Charlotte", state: "NC", countryCode: "US", postalCode: "On file" }, creationDate: dAgo(2000), lastModifiedDate: dAgo(120), pocId: "POC-HRG-01" },
  { legalEntityId: "LE-CRL-01", companyId: "C20013", legalProfileName: "Crestline Logistics LLC", legalProfileType: "SERVICE_PROVIDER", legalEntityHubBuId: HUB_BUID, legalEntitySolutionId: SOLUTION_ID, legalEntityGLN: "0614141000135", legalEntityTaxId: "On file (masked)", legalEntityVatId: null, legalEntityTimeZoneCode: "America/Los_Angeles", legalEntityAddress: { addressLine1: "On file", city: "Reno", state: "NV", countryCode: "US", postalCode: "On file" }, creationDate: dAgo(410), lastModifiedDate: dAgo(40), pocId: "POC-CRL-01" },
  { legalEntityId: "LE-HOL-01", companyId: "C20006", legalProfileName: "Hollanda Trading B.V.", legalProfileType: "SUPPLIER", legalEntityHubBuId: HUB_BUID, legalEntitySolutionId: SOLUTION_ID, legalEntityGLN: "8712345000011", legalEntityTaxId: null, legalEntityVatId: "NL-on file (masked)", legalEntityTimeZoneCode: "Europe/Amsterdam", legalEntityAddress: { addressLine1: "On file", city: "Rotterdam", state: "ZH", countryCode: "NL", postalCode: "On file" }, creationDate: dAgo(1100), lastModifiedDate: dAgo(300), pocId: "POC-HOL-01" },
];

// ---- Trading addresses and mailboxes ------------------------------------------------------------

export type Addr = { companyId: string; mailboxId: string; qualifier: string; address: string; alias: string; deliveryMethod: string; system: string; created: number; viaVan?: string };

export const addresses: Addr[] = [
  { companyId: HUB_ID, mailboxId: "MB-HRG-PROD-01", qualifier: "ZZ", address: "HARBORVIEWUS", alias: "Harborview US production", deliveryMethod: "AS2", system: "TGMS", created: 2300 },
  { companyId: HUB_ID, mailboxId: "MB-HRG-PROD-01", qualifier: "01", address: "081466849", alias: "Harborview DUNS", deliveryMethod: "AS2", system: "TGMS", created: 2300 },
  { companyId: HUB_ID, mailboxId: "MB-HRG-PROD-01", qualifier: "14", address: "0614141000012", alias: "Harborview GLN", deliveryMethod: "AS2", system: "TGMS", created: 1800 },
  { companyId: HUB_ID, mailboxId: "MB-HRG-TEST-01", qualifier: "ZZ", address: "HARBORVIEWTST", alias: "Harborview US test", deliveryMethod: "AS2", system: "TGMS", created: 2300 },
  { companyId: "C20001", mailboxId: "MB-NFF-01", qualifier: "ZZ", address: "NORTHFIELDFD", alias: "Northfield Foods", deliveryMethod: "AS2", system: "TGMS", created: 1900 },
  { companyId: "C20002", mailboxId: "MB-NFR-01", qualifier: "ZZ", address: "NFFARMS", alias: "Northfield Farms", deliveryMethod: "SFTP", system: "TGMS", created: 700 },
  { companyId: "C20003", mailboxId: "MB-KVAN-IC-07", qualifier: "ZZ", address: "COASTLINEAPP", alias: "Coastline Apparel (via Keystone VAN)", deliveryMethod: "VAN_INTERCONNECT", system: "TGMS", created: 1600, viaVan: "C40001" },
  { companyId: "C20004", mailboxId: "MB-BWHG-01", qualifier: "ZZ", address: "BRIGHTWELLHG", alias: "Brightwell Home Goods", deliveryMethod: "AS2", system: "TGMS", created: 1300 },
  { companyId: "C20005", mailboxId: "MB-PGH-01", qualifier: "ZZ", address: "PINEGATEHOME", alias: "Pinegate Home", deliveryMethod: "AS2", system: "TGMS", created: 68 },
  { companyId: "C20006", mailboxId: "MB-HOL-01", qualifier: "14", address: "8712345000011", alias: "Hollanda Trading", deliveryMethod: "AS2", system: "TGMS", created: 1100 },
  { companyId: "C20007", mailboxId: "MB-SMB-01", qualifier: "12", address: "3035550147", alias: "Summit Beverage", deliveryMethod: "SFTP", system: "TGMS", created: 1250 },
  { companyId: "C20008", mailboxId: "MB-ATL-01", qualifier: "ZZ", address: "ATLASTOY", alias: "Atlas Toy", deliveryMethod: "AS2", system: "TGMS", created: 1450 },
  { companyId: "C20009", mailboxId: "MB-MPC-01", qualifier: "ZZ", address: "MERIDIANPC", alias: "Meridian Personal Care", deliveryMethod: "AS2", system: "TGMS", created: 980 },
  { companyId: "C20010", mailboxId: "MB-RDL-01", qualifier: "02", address: "RDLN", alias: "Redline Logistics (SCAC)", deliveryMethod: "AS2", system: "TGMS", created: 90 },
  { companyId: "C20013", mailboxId: "MB-CRL-01", qualifier: "ZZ", address: "CRESTLINE3PL", alias: "Crestline Logistics", deliveryMethod: "AS2", system: "TGMS", created: 420 },
  { companyId: "C20014", mailboxId: "MB-HRG-WEBEDI-01", qualifier: "ZZ", address: "MAPLERIDGEWEB", alias: "Maple Ridge Crafts (web EDI)", deliveryMethod: "WEB_EDI", system: "TGMS", created: 160 },
  { companyId: "C20011", mailboxId: "MB-EVP-01", qualifier: "ZZ", address: "EVERGREENPP", alias: "Evergreen Paper", deliveryMethod: "SFTP", system: "TGMS", created: 21 },
];
for (const n of NEW_PARTNERS) { const p = profileById(n.id)!; addresses.push({ companyId: n.id, mailboxId: p.protocol === "VAN_INTERCONNECT" ? "MB-KVAN-IC-07" : p.protocol === "WEB_EDI" ? "MB-HRG-WEBEDI-01" : `MB-${p.prefix}-01`, qualifier: n.qualifier, address: n.address, alias: n.name + (p.protocol === "VAN_INTERCONNECT" ? " (via Keystone VAN)" : p.protocol === "WEB_EDI" ? " (web EDI)" : ""), deliveryMethod: p.protocol, system: "TGMS", created: Math.max(3, -p.goLive + 10), ...(p.protocol === "VAN_INTERCONNECT" ? { viaVan: "C40001" } : {}) }); }

export const addrKey = (a: { qualifier: string; address: string }) => `${a.qualifier}:${a.address}`;
export const addrByKey = (k: string) => addresses.find((a) => addrKey(a) === k || a.address === k);
export const hubAddr = addresses[0];

export const vanProvider = (a: Addr) => (a.viaVan ? { companyId: a.viaVan, companyName: companyById(a.viaVan)!.companyName } : null);

export function tradingAddressDetails(a: Addr) {
  const owner = companyById(a.companyId)!;
  const mb = mailboxes.find((m) => m.mailboxId === a.mailboxId);
  return {
    tradingAddress: { qualifier: a.qualifier, address: a.address, alias: a.alias, system: a.system, mdType: a.deliveryMethod, provider: a.viaVan ? "KEYSTONE_VAN" : "OPENTEXT" },
    ownerCompanyId: a.companyId,
    ownerCompanyName: owner.companyName,
    mailboxId: a.mailboxId,
    mailboxOwnerCompanyId: a.viaVan ?? a.companyId,
    mailboxOwnerCompanyName: a.viaVan ? companyById(a.viaVan)!.companyName : owner.companyName,
    mailboxStatus: mb?.status ?? "ACTIVE",
    mailboxSubscription: mb?.mailboxSubscription ?? [],
    vanProvider: vanProvider(a),
    nodeId: a.viaVan ? "NODE-IC-02" : "NODE-US-EAST-04",
    activityLog: log(a.created),
  };
}

const sub = (id: string, name: string, map: string, type = "MANDATORY") => ({ subscriptionPackageId: id, subscriptionPackageName: name, subscriptionPackageMap: map, subscriptionType: type });

export const mailboxes = [
  { mailboxId: "MB-HRG-PROD-01", mailboxAlias: "Harborview production", mailboxOwnerCompanyId: HUB_ID, mailboxOwnerCompanyName: "Harborview Retail Group", mailboxType: "PRODUCTION", status: "ACTIVE", system: "TGMS", provider: "OPENTEXT", nodeId: "NODE-US-EAST-04", numOfTradingAddresses: 3, receiverRetentionPeriod: 90, senderRetentionPeriod: 90, isBillable: "YES", tradingPartnerReportFlag: "YES", vanProvider: null, mailboxSubscription: [sub("PKG-EDI-STD", "EDI messaging standard", "EDI_MSG_STD"), sub("PKG-AS2", "AS2 connectivity", "DM_AS2"), sub("PKG-TGI", "TG Insights visibility", "VIS_TGI", "OPTIONAL")], activityLog: log(2300, 40) },
  { mailboxId: "MB-HRG-TEST-01", mailboxAlias: "Harborview test", mailboxOwnerCompanyId: HUB_ID, mailboxOwnerCompanyName: "Harborview Retail Group", mailboxType: "TEST", status: "ACTIVE", system: "TGMS", provider: "OPENTEXT", nodeId: "NODE-US-EAST-04", numOfTradingAddresses: 1, receiverRetentionPeriod: 30, senderRetentionPeriod: 30, isBillable: "NO", tradingPartnerReportFlag: "NO", vanProvider: null, mailboxSubscription: [sub("PKG-EDI-STD", "EDI messaging standard", "EDI_MSG_STD")], activityLog: log(2300, 200) },
  { mailboxId: "MB-HRG-WEBEDI-01", mailboxAlias: "Harborview supplier web EDI", mailboxOwnerCompanyId: HUB_ID, mailboxOwnerCompanyName: "Harborview Retail Group", mailboxType: "PRODUCTION", status: "ACTIVE", system: "TGMS", provider: "OPENTEXT", nodeId: "NODE-US-EAST-04", numOfTradingAddresses: 1, receiverRetentionPeriod: 60, senderRetentionPeriod: 60, isBillable: "YES", tradingPartnerReportFlag: "YES", vanProvider: null, mailboxSubscription: [sub("PKG-WEBEDI", "Supplier web EDI forms", "WEBFORMS_850_810")], activityLog: log(600, 30) },
  { mailboxId: "MB-CRL-01", mailboxAlias: "Crestline", mailboxOwnerCompanyId: "C20013", mailboxOwnerCompanyName: "Crestline Logistics LLC", mailboxType: "PRODUCTION", status: "ACTIVE", system: "TGMS", provider: "OPENTEXT", nodeId: "NODE-US-WEST-01", numOfTradingAddresses: 1, mailboxSubscription: [], vanProvider: null, activityLog: log(420) },
  { mailboxId: "MB-EVP-01", mailboxAlias: "Evergreen Paper", mailboxOwnerCompanyId: "C20011", mailboxOwnerCompanyName: "Evergreen Paper Products", mailboxType: "PRODUCTION", status: "SUSPENDED", system: "TGMS", provider: "OPENTEXT", nodeId: "NODE-US-WEST-01", numOfTradingAddresses: 1, mailboxSubscription: [], vanProvider: null, activityLog: log(21, 6) },
  { mailboxId: "MB-BWHG-01", mailboxAlias: "Brightwell", mailboxOwnerCompanyId: "C20004", mailboxOwnerCompanyName: "Brightwell Home Goods", mailboxType: "PRODUCTION", status: "ACTIVE", system: "TGMS", provider: "OPENTEXT", nodeId: "NODE-US-EAST-02", numOfTradingAddresses: 1, mailboxSubscription: [], vanProvider: null, activityLog: log(1300) },
];

// ---- Business partner relationships (company level) ---------------------------------------------

const BPR = (n: number, partner: string, status: string, days: number, desc: string) => ({
  businessPartnerRelationshipId: `BPR-${n}`,
  communityId: COMMUNITY.communityId,
  initiatorCompanyId: HUB_ID,
  partnerCompanyId: partner,
  solutionIds: [SOLUTION_ID],
  status,
  creationDate: dAgo(days),
  description: desc,
});

export const bprs = [
  BPR(4101, "C20001", "ACTIVE", 1880, "Grocery supplier, direct AS2"),
  BPR(4102, "C20002", "ACTIVE", 690, "Produce supplier, SFTP"),
  BPR(4103, "C20003", "ACTIVE", 1590, "Apparel supplier via Keystone VAN"),
  BPR(4104, "C20004", "ACTIVE", 1290, "Home goods supplier, direct AS2"),
  BPR(4105, "C20005", "ACTIVE", 67, "Supplier new to EDI, live since August"),
  BPR(4106, "C20006", "ACTIVE", 1090, "EDIFACT import supplier"),
  BPR(4107, "C20007", "ACTIVE", 1240, "Beverage supplier, SFTP"),
  BPR(4108, "C20008", "ACTIVE", 1440, "Toy supplier, direct AS2"),
  BPR(4109, "C20009", "ACTIVE", 970, "Health and beauty supplier"),
  BPR(4110, "C20010", "ACTIVE", 85, "3PL carrier, shipment status"),
  BPR(4111, "C20011", "PENDING", 20, "Paper supplier, relationship awaiting partner approval"),
  BPR(4112, "C20013", "ACTIVE", 410, "3PL warehouse: shipping orders, shipping advice and shipment status"),
  BPR(4113, "C20014", "ACTIVE", 150, "Small supplier on Harborview web EDI"),
];
for (const [i, n] of NEW_PARTNERS.entries()) { const p = profileById(n.id)!; bprs.push(BPR(4200 + i, n.id, "ACTIVE", Math.max(3, -p.goLive + 10), `${n.industry} supplier, ${p.protocol === "WEB_EDI" ? "web EDI" : p.protocol === "VAN_INTERCONNECT" ? "via Keystone VAN" : p.protocol}`)); }

export const partnerDirectory = bprs.map((b) => {
  const p = companyById(b.partnerCompanyId)!;
  return {
    bprId: b.businessPartnerRelationshipId,
    bprStatus: b.status,
    partnerCompanyId: p.companyId,
    partnerCompanyName: p.companyName,
    partnerCompanyDisplayName: p.companyName,
    partnerShipStatus: b.status === "ACTIVE" ? "ACTIVE" : "PENDING",
    partnerShipActivationDate: b.status === "ACTIVE" ? b.creationDate : null,
    facadeCompanyId: null, facadeCompanyName: null, facadeId: null,
  };
});

// ---- Trading partner relationships (address level) and messaging tuples ------------------------

type TprSeed = { id: string; bpr: string; partner: string; status: string; type: "PRODUCTION" | "TEST"; created: number; docs: [string, "SENDER" | "RECEIVER"][]; hubAddr?: string };

const X12_SUPPLIER: [string, "SENDER" | "RECEIVER"][] = [["850", "SENDER"], ["860", "SENDER"], ["855", "RECEIVER"], ["856", "RECEIVER"], ["810", "RECEIVER"], ["997", "SENDER"], ["997", "RECEIVER"]];

const TPRS: TprSeed[] = [
  { id: "TPR-70011", bpr: "BPR-4101", partner: "C20001", status: "ACTIVE", type: "PRODUCTION", created: 1870, docs: [...X12_SUPPLIER, ["812", "SENDER"]] },
  { id: "TPR-70021", bpr: "BPR-4102", partner: "C20002", status: "ACTIVE", type: "PRODUCTION", created: 680, docs: [["850", "SENDER"], ["856", "RECEIVER"], ["810", "RECEIVER"], ["997", "SENDER"], ["997", "RECEIVER"]] },
  { id: "TPR-70031", bpr: "BPR-4103", partner: "C20003", status: "ACTIVE", type: "PRODUCTION", created: 1580, docs: [...X12_SUPPLIER, ["820", "SENDER"]] },
  { id: "TPR-70041", bpr: "BPR-4104", partner: "C20004", status: "ACTIVE", type: "PRODUCTION", created: 1280, docs: X12_SUPPLIER },
  { id: "TPR-70051", bpr: "BPR-4105", partner: "C20005", status: "ACTIVE", type: "PRODUCTION", created: 65, docs: [["850", "SENDER"], ["855", "RECEIVER"], ["856", "RECEIVER"], ["810", "RECEIVER"], ["997", "SENDER"], ["997", "RECEIVER"]] },
  { id: "TPR-70052", bpr: "BPR-4105", partner: "C20005", status: "ACTIVE", type: "TEST", created: 67, docs: [["850", "SENDER"], ["810", "RECEIVER"]], hubAddr: "ZZ:HARBORVIEWTST" },
  { id: "TPR-70061", bpr: "BPR-4106", partner: "C20006", status: "ACTIVE", type: "PRODUCTION", created: 1080, docs: [["ORDERS", "SENDER"], ["DESADV", "RECEIVER"], ["INVOIC", "RECEIVER"], ["CONTRL", "SENDER"], ["CONTRL", "RECEIVER"]], hubAddr: "14:0614141000012" },
  { id: "TPR-70071", bpr: "BPR-4107", partner: "C20007", status: "ACTIVE", type: "PRODUCTION", created: 1230, docs: X12_SUPPLIER },
  { id: "TPR-70081", bpr: "BPR-4108", partner: "C20008", status: "ACTIVE", type: "PRODUCTION", created: 1430, docs: [...X12_SUPPLIER, ["846", "RECEIVER"]] },
  { id: "TPR-70091", bpr: "BPR-4109", partner: "C20009", status: "ACTIVE", type: "PRODUCTION", created: 960, docs: X12_SUPPLIER },
  { id: "TPR-70101", bpr: "BPR-4110", partner: "C20010", status: "ACTIVE", type: "PRODUCTION", created: 80, docs: [["214", "RECEIVER"], ["997", "SENDER"]] },
  { id: "TPR-70111", bpr: "BPR-4111", partner: "C20011", status: "PENDING", type: "PRODUCTION", created: 19, docs: [["850", "SENDER"], ["810", "RECEIVER"]] },
  { id: "TPR-70121", bpr: "BPR-4112", partner: "C20013", status: "ACTIVE", type: "PRODUCTION", created: 400, docs: [["940", "SENDER"], ["945", "RECEIVER"], ["214", "RECEIVER"], ["997", "SENDER"], ["997", "RECEIVER"]] },
  { id: "TPR-70131", bpr: "BPR-4113", partner: "C20014", status: "ACTIVE", type: "PRODUCTION", created: 148, docs: [["850", "SENDER"], ["856", "RECEIVER"], ["810", "RECEIVER"]], hubAddr: "ZZ:HARBORVIEWUS" },
  { id: "TPR-70112", bpr: "BPR-4111", partner: "C20011", status: "REJECTED", type: "TEST", created: 20, docs: [["850", "SENDER"]], hubAddr: "ZZ:HARBORVIEWTST" },
];
for (const [i, n] of NEW_PARTNERS.entries()) {
  const p = profileById(n.id)!;
  const docs: [string, "SENDER" | "RECEIVER"][] = [["850", "SENDER"], ["860", "SENDER"], ...(p.poAck > 0 ? [["855", "RECEIVER"]] as [string, "RECEIVER"][] : []), ["856", "RECEIVER"], ["810", "RECEIVER"], ...(p.protocol === "WEB_EDI" ? [] : [["997", "SENDER"], ["997", "RECEIVER"]] as [string, "SENDER" | "RECEIVER"][])];
  const created = Math.max(3, -p.goLive + 10);
  TPRS.push({ id: `TPR-${70200 + i * 10 + 1}`, bpr: `BPR-${4200 + i}`, partner: n.id, status: "ACTIVE", type: "PRODUCTION", created, docs });
  if (p.goLive > -45) TPRS.push({ id: `TPR-${70200 + i * 10 + 2}`, bpr: `BPR-${4200 + i}`, partner: n.id, status: "ACTIVE", type: "TEST", created, docs: [["850", "SENDER"], ["856", "RECEIVER"], ["810", "RECEIVER"]], hubAddr: "ZZ:HARBORVIEWTST" });
}

const aspect = (a: Addr) => {
  const c = companyById(a.companyId)!;
  return {
    companyId: c.companyId, companyName: c.companyName, companyDisplayName: c.companyName,
    companyCity: c.companyAddress.city, companyState: c.companyAddress.state, companyCountry: c.companyAddress.countryCode,
    deliveryMethod: a.deliveryMethod, deliveryMethodName: a.deliveryMethod === "VAN_INTERCONNECT" ? "VAN interconnect" : a.deliveryMethod,
    vanProvider: a.viaVan ? companyById(a.viaVan)!.companyName : null,
    tradingAddress: { qualifier: a.qualifier, address: a.address, alias: a.alias, system: a.system },
  };
};

export const tprs = TPRS.map((t) => {
  const own = addrByKey(t.hubAddr ?? "ZZ:HARBORVIEWUS")!;
  const par = addresses.find((a) => a.companyId === t.partner)!;
  return {
    tradingPartnerRelationshipId: t.id,
    bprId: t.bpr,
    solutionId: SOLUTION_ID,
    status: t.status,
    tprType: t.type,
    partnershipDirection: "BOTH",
    yourAlias: own.alias,
    partnerAlias: par.alias,
    ownerTradingAddress: aspect(own),
    partnerTradingAddress: aspect(par),
    billingInfo: { sendPayee: "SENDER", receivePayee: "RECEIVER", connectOutPayee: "SENDER", storagePayee: "RECEIVER" },
    activityLog: log(t.created, Math.min(t.created, 10)),
    _docs: t.docs,
  };
});

export const messagingTuples = tprs.flatMap((t) =>
  (t as any)._docs.map(([docType, dir]: [string, string], i: number) => ({
    tupleId: `${t.tradingPartnerRelationshipId}-T${i + 1}`,
    companyId: HUB_ID,
    solutionId: SOLUTION_ID,
    docType,
    direction: dir,
    ownerTradingAddress: t.ownerTradingAddress.tradingAddress,
    partnerTradingAddress: t.partnerTradingAddress.tradingAddress,
    eventType: "RE_ROUTING_EVENT",
    triggeringNode: dir,
    serviceEndPoint: null,
    timeout: 0,
    additionalParameters: [],
    _tprId: t.tradingPartnerRelationshipId,
    _partnerCompanyId: t.partnerTradingAddress.companyId,
    _status: t.status,
    _created: t.activityLog.createTimeStamp,
  })),
);

// ---- Interconnect, delivery methods, autoforwards, distribution lists ---------------------------

export const vanProviders = { statusCode: 200, statusMessage: "OK", vanProviderDetail: [{ mailboxId: "MB-KVAN-IC-07", vanProvider: { companyId: "C40001", companyName: "Keystone VAN Services" } }] };

export const autoforwards = [
  { tradingPartnerRelationshipId: "TPR-70041", senderCompanyName: "Brightwell Home Goods", senderTradingAddress: { qualifier: "ZZ", address: "BRIGHTWELLHG", alias: "Brightwell Home Goods", system: "TGMS" }, yourCompanyName: "Harborview Retail Group", yourTradingAddress: { qualifier: "ZZ", address: "HARBORVIEWUS", alias: "Harborview US production", system: "TGMS" }, autoForwardCompanyName: "Redline Logistics Inc", autoForwardTradingAddress: { qualifier: "02", address: "RDLN", alias: "Redline Logistics (SCAC)", system: "TGMS" }, supportedDocuments: ["856"], activityLog: log(80) },
  { tradingPartnerRelationshipId: "TPR-70011", senderCompanyName: "Northfield Foods Inc", senderTradingAddress: { qualifier: "ZZ", address: "NORTHFIELDFD", alias: "Northfield Foods", system: "TGMS" }, yourCompanyName: "Harborview Retail Group", yourTradingAddress: { qualifier: "ZZ", address: "HARBORVIEWUS", alias: "Harborview US production", system: "TGMS" }, autoForwardCompanyName: "Redline Logistics Inc", autoForwardTradingAddress: { qualifier: "02", address: "RDLN", alias: "Redline Logistics (SCAC)", system: "TGMS" }, supportedDocuments: ["856"], activityLog: log(80) },
  { tradingPartnerRelationshipId: "TPR-70031", senderCompanyName: "Coastline Apparel Co", senderTradingAddress: { qualifier: "ZZ", address: "COASTLINEAPP", alias: "Coastline Apparel (via Keystone VAN)", system: "TGMS" }, yourCompanyName: "Harborview Retail Group", yourTradingAddress: { qualifier: "ZZ", address: "HARBORVIEWUS", alias: "Harborview US production", system: "TGMS" }, autoForwardCompanyName: "Harborview Retail Group", autoForwardTradingAddress: { qualifier: "ZZ", address: "HARBORVIEWTST", alias: "Harborview US test", system: "TGMS" }, supportedDocuments: ["810"], activityLog: log(400, 60) },
];

export const distributionLists = [
  {
    mailboxId: "MB-HRG-PROD-01",
    dlTradingAddress: { qualifier: "ZZ", address: "HRGDL-PO850", alias: "Harborview PO broadcast", system: "TGMS" },
    dlPrimaryTradingAddress: [{ qualifier: "ZZ", address: "HARBORVIEWUS", alias: "Harborview US production", system: "TGMS" }],
    dlParticipant: [
      { dlParticipantCompanyName: "Northfield Foods Inc", dlParticipantTradingAddress: { qualifier: "ZZ", address: "NORTHFIELDFD", alias: "Northfield Foods", system: "TGMS" } },
      { dlParticipantCompanyName: "Summit Beverage Co", dlParticipantTradingAddress: { qualifier: "12", address: "3035550147", alias: "Summit Beverage", system: "TGMS" } },
      { dlParticipantCompanyName: "Atlas Toy Company", dlParticipantTradingAddress: { qualifier: "ZZ", address: "ATLASTOY", alias: "Atlas Toy", system: "TGMS" } },
    ],
  },
  {
    mailboxId: "MB-HRG-PROD-01",
    dlTradingAddress: { qualifier: "ZZ", address: "HRGDL-ROUTING", alias: "Harborview routing guide notices", system: "TGMS" },
    dlPrimaryTradingAddress: [{ qualifier: "ZZ", address: "HARBORVIEWUS", alias: "Harborview US production", system: "TGMS" }],
    dlParticipant: [
      { dlParticipantCompanyName: "Crestline Logistics LLC", dlParticipantTradingAddress: { qualifier: "ZZ", address: "CRESTLINE3PL", alias: "Crestline Logistics", system: "TGMS" } },
      { dlParticipantCompanyName: "Redline Logistics Inc", dlParticipantTradingAddress: { qualifier: "02", address: "RDLN", alias: "Redline Logistics (SCAC)", system: "TGMS" } },
    ],
  },
];

export const deliveryMethodPackages = (a: Addr) => ({
  companyId: a.companyId,
  serviceBundleId: "SB-HRG-SPOKE-STD",
  serviceBundleName: "Harborview supplier bundle",
  optionalPackages: [
    {
      baseTradingAddress: [{ qualifier: a.qualifier, address: a.address, alias: a.alias, system: a.system }],
      subscriptionPackageSubscription: {
        subPackageSubscriptionId: `SPS-${a.address.slice(0, 6)}`,
        subscriptionPackageId: `PKG-DM-${a.deliveryMethod}`,
        subscriptionPackageName: { AS2: "AS2 delivery", SFTP: "SFTP delivery", VAN_INTERCONNECT: "VAN interconnect delivery", WEB_EDI: "Web EDI forms" }[a.deliveryMethod] ?? a.deliveryMethod,
        subscriptionPackageMap: `DM_${a.deliveryMethod}`,
      },
    },
  ],
});

// ---- Services and contacts ----------------------------------------------------------------------

const bundle = (id: string, name: string, level: string, owner = HUB_ID) => ({ serviceBundleId: id, serviceBundleName: name, serviceBundleDisplayName: name, level, ownerCompanyId: owner, solutionId: SOLUTION_ID, visibility: "YES", description: name, mandatoryPackages: { packages: ["EDI_MSG_STD"] }, optionalPackages: { packages: ["VIS_TGI", "DM_AS2", "DM_SFTP"] } });

export const companyServiceBundleSubs = {
  [HUB_ID]: [
    { subscriptionId: "SUB-HRG-01", serviceBundleDetailsType: bundle("SB-HRG-HUB", "Harborview retail hub bundle", "HUB"), baseCompanyDetails: { companyName: "Harborview Retail Group", city: "Charlotte", state: "NC", countryCode: "US" }, activityLog: log(2300, 200) },
    { subscriptionId: "SUB-HRG-02", serviceBundleDetailsType: bundle("SB-TGI", "TG Insights", "HUB"), baseCompanyDetails: { companyName: "Harborview Retail Group", city: "Charlotte", state: "NC", countryCode: "US" }, activityLog: log(900) },
  ],
};

export const companyServiceInstanceSubs = {
  [HUB_ID]: [
    { subscriptionId: "SIS-HRG-11", serviceBundleDetailsType: bundle("SI-CARTO", "Trading Grid Cartographer", "SERVICE_INSTANCE"), activityLog: log(800) },
    { subscriptionId: "SIS-HRG-12", serviceBundleDetailsType: bundle("SI-TGCP", "Trading Grid Community Projects", "SERVICE_INSTANCE"), activityLog: log(600) },
  ],
};

export const partnerPrimaryServices: Record<string, any[]> = {
  C20001: [{ primaryService: "EDI messaging (AS2)", subscriptionType: "DIRECT" }],
  C20002: [{ primaryService: "EDI messaging (SFTP)", subscriptionType: "DIRECT" }],
  C20003: [{ primaryService: "VAN interconnect messaging", subscriptionType: "INTERCONNECT" }, { primaryService: "TG Insights partner view", subscriptionType: "SPONSORED" }],
  C20004: [{ primaryService: "EDI messaging (AS2)", subscriptionType: "DIRECT" }],
  C20005: [{ primaryService: "Supplier web EDI", subscriptionType: "SPONSORED" }],
  C20006: [{ primaryService: "EDI messaging (AS2)", subscriptionType: "DIRECT" }],
  C20007: [{ primaryService: "EDI messaging (SFTP)", subscriptionType: "DIRECT" }],
  C20008: [{ primaryService: "EDI messaging (AS2)", subscriptionType: "DIRECT" }],
  C20009: [{ primaryService: "EDI messaging (AS2)", subscriptionType: "DIRECT" }],
  C20010: [{ primaryService: "EDI messaging (AS2)", subscriptionType: "DIRECT" }],
  C20011: [{ primaryService: "Supplier web EDI", subscriptionType: "SPONSORED" }],
  C20013: [{ primaryService: "EDI messaging (AS2)", subscriptionType: "DIRECT" }],
  C20014: [{ primaryService: "Supplier web EDI", subscriptionType: "SPONSORED" }],
};
for (const p of PROFILES) if (!partnerPrimaryServices[p.id]) partnerPrimaryServices[p.id] = [{ primaryService: p.protocol === "WEB_EDI" ? "Supplier web EDI" : p.protocol === "VAN_INTERCONNECT" ? "VAN interconnect messaging" : `EDI messaging (${p.protocol})`, subscriptionType: p.protocol === "WEB_EDI" ? "SPONSORED" : p.protocol === "VAN_INTERCONNECT" ? "INTERCONNECT" : "DIRECT" }];

export const sponsoredServices = {
  [HUB_ID]: [{ serviceBundleDetails: bundle("SB-HRG-WEBEDI", "Harborview supplier web EDI", "SPOKE"), primaryServiceSubscription: [{ primaryService: "Supplier web EDI", subscriptionType: "SPONSORED" }], serviceInstanceMaps: ["WEBFORMS_850_810", "WEBFORMS_856"] }],
};

export const mailboxSubscriptions = {
  "MB-HRG-PROD-01": { companyId: HUB_ID, serviceBundleId: "SB-HRG-HUB", serviceBundleName: "Harborview retail hub bundle", subscriptionId: "MSUB-HRG-01", subscriptionPackageSubscription: [
    { subPackageSubscriptionId: "SPS-1", subscriptionPackageId: "PKG-EDI-STD", subscriptionPackageName: "EDI messaging standard", subscriptionPackageMap: "EDI_MSG_STD", activityLog: log(2300) },
    { subPackageSubscriptionId: "SPS-2", subscriptionPackageId: "PKG-AS2", subscriptionPackageName: "AS2 connectivity", subscriptionPackageMap: "DM_AS2", activityLog: log(2300) },
    { subPackageSubscriptionId: "SPS-3", subscriptionPackageId: "PKG-TGI", subscriptionPackageName: "TG Insights visibility", subscriptionPackageMap: "VIS_TGI", activityLog: log(900) },
  ] },
  "MB-HRG-TEST-01": { companyId: HUB_ID, serviceBundleId: "SB-HRG-HUB", serviceBundleName: "Harborview retail hub bundle", subscriptionId: "MSUB-HRG-02", subscriptionPackageSubscription: [
    { subPackageSubscriptionId: "SPS-4", subscriptionPackageId: "PKG-EDI-STD", subscriptionPackageName: "EDI messaging standard", subscriptionPackageMap: "EDI_MSG_STD", activityLog: log(2300) },
  ] },
};

const poc = (id: string, co: string, first: string, last: string, type: string, email: string, phone: string, docTypes: string[] = [], isDefault = "NO") => ({
  pointOfContactId: id, companyId: co, firstName: first, lastName: last, pointOfContactName: `${first} ${last}`, contactType: type, isDefaultPOC: isDefault,
  contactInformation: { email, telephone: phone }, preferredLanguage: "EN", preferredNotification: "EMAIL", preferredTimezone: "AMERICA_NEW_YORK",
  associatedEntities: { docType: docTypes, direction: docTypes.length ? ["BOTH"] : [] },
});

export const contacts = [
  poc("POC-HRG-01", HUB_ID, "Jordan", "Lee", "BUSINESS_CONTACT", "b2b.ops@harborviewretail.com", "+1 704 555 0110", [], "YES"),
  poc("POC-HRG-02", HUB_ID, "Sam", "Okafor", "TECHNICAL_CONTACT", "edi.team@harborviewretail.com", "+1 704 555 0111", ["850", "856", "810"]),
  poc("POC-BWHG-01", "C20004", "Priya", "Raman", "TECHNICAL_CONTACT", "edi-support@brightwellhome.com", "+1 614 555 0182", ["856", "810"], "YES"),
  poc("POC-BWHG-02", "C20004", "Marcus", "Hale", "BUSINESS_CONTACT", "customer.ops@brightwellhome.com", "+1 614 555 0140"),
  poc("POC-NFF-01", "C20001", "Elena", "Brandt", "TECHNICAL_CONTACT", "edi@northfieldfoodsinc.com", "+1 612 555 0199", ["810"], "YES"),
  poc("POC-SMB-01", "C20007", "Tom", "Alvarez", "SUPPORT_CONTACT", "edi.help@summitbevco.com", "+1 303 555 0147", ["850", "997"], "YES"),
  poc("POC-HOL-01", "C20006", "Femke", "de Vries", "TECHNICAL_CONTACT", "edi@hollandatrading.nl", "+31 10 555 0123", ["ORDERS", "CONTRL"], "YES"),
  poc("POC-PGH-01", "C20005", "Ava", "Collins", "TECHNICAL_CONTACT", "it@pinegatehome.com", "+1 828 555 0101", [], "YES"),
  poc("POC-CRL-01", "C20013", "Dana", "Whitfield", "TECHNICAL_CONTACT", "edi@crestline3pl.com", "+1 775 555 0162", ["940", "945", "214"], "YES"),
  poc("POC-CRL-02", "C20013", "Ray", "Okonkwo", "SUPPORT_CONTACT", "warehouse.ops@crestline3pl.com", "+1 775 555 0190", ["945"]),
  poc("POC-MRC-01", "C20014", "Grace", "Lindqvist", "BUSINESS_CONTACT", "orders@mapleridgecrafts.com", "+1 541 555 0114", [], "YES"),
  poc("POC-ATL-01", "C20008", "Owen", "Pierce", "TECHNICAL_CONTACT", "b2b@atlastoyco.com", "+1 401 555 0133", ["850", "856"], "YES"),
  poc("POC-CST-01", "C20003", "Luis", "Moreno", "TECHNICAL_CONTACT", "edi@coastlineapparel.com", "+1 213 555 0177", ["856", "810"], "YES"),
];
for (const n of NEW_PARTNERS) contacts.push(poc(`POC-${n.id.slice(1)}-01`, n.id, n.contact[0], n.contact[1], "TECHNICAL_CONTACT", n.contact[2], n.contact[3], ["850", "856", "810"], "YES"));

export const privateContactRules = {
  [HUB_ID]: { tupleContactRules: [
    { tupleContactRuleId: "TCR-301", direction: "RECEIVER", documentType: "856", ownerAddress: "ZZ:HARBORVIEWUS", partnerAddress: "ZZ:BRIGHTWELLHG", priority: "1", bitWise: "1", addressBookId: "AB-HRG-DC", addressBook: { name: "DC receiving escalation" }, creationDate: dAgo(300), lastModifiedDate: dAgo(30) },
    { tupleContactRuleId: "TCR-302", direction: "SENDER", documentType: "850", ownerAddress: "ZZ:HARBORVIEWUS", partnerAddress: "*", priority: "2", bitWise: "2", addressBookId: "AB-HRG-BUY", addressBook: { name: "Buying desk" }, creationDate: dAgo(500), lastModifiedDate: dAgo(90) },
  ] },
};

// ---- Invitations and workflow records -----------------------------------------------------------

export const invitations = [
  { invitationId: 7702, invitationName: "Pinegate Home supplier onboarding", invitationType: "COMPANY", inviteeType: "SUPPLIER", invitationStatus: "ACCEPTED", invitingCompanyId: HUB_ID, invitingCompanyName: "Harborview Retail Group", communityId: COMMUNITY.communityId, approvalType: "MANUAL", createdDate: dAgo(72), activationDate: dAgo(68), expirationDate: dAgo(42), lastModifiedDate: dAgo(68), servicePaidBy: "SPONSOR", tradingAddressCreateOption: "INVITEE", requiresEDIQualifier: "YES", locale: "en_US", invitingCompanyTradingAddress: [{ qualifier: "ZZ", address: "HARBORVIEWUS", alias: "Harborview US production", system: "TGMS" }], companyServices: [{ serviceBundleId: "SB-HRG-WEBEDI", serviceBundleName: "Harborview supplier web EDI" }], _companyId: "C20005", _workflowTemplateId: 3101 },
  { invitationId: 7720, invitationName: "Maple Ridge Crafts web EDI onboarding", invitationType: "COMPANY", inviteeType: "SUPPLIER", invitationStatus: "ACCEPTED", invitingCompanyId: HUB_ID, invitingCompanyName: "Harborview Retail Group", communityId: COMMUNITY.communityId, approvalType: "AUTO", createdDate: dAgo(165), activationDate: dAgo(160), expirationDate: dAgo(135), lastModifiedDate: dAgo(160), servicePaidBy: "SPONSOR", tradingAddressCreateOption: "INVITER", requiresEDIQualifier: "NO", locale: "en_US", invitingCompanyTradingAddress: [{ qualifier: "ZZ", address: "HARBORVIEWUS", alias: "Harborview US production", system: "TGMS" }], companyServices: [{ serviceBundleId: "SB-HRG-WEBEDI", serviceBundleName: "Harborview supplier web EDI" }], _companyId: "C20014", _workflowTemplateId: 3102 },
  { invitationId: 7726, invitationName: "Evergreen Paper supplier onboarding", invitationType: "COMPANY", inviteeType: "SUPPLIER", invitationStatus: "EXPIRED", invitingCompanyId: HUB_ID, invitingCompanyName: "Harborview Retail Group", communityId: COMMUNITY.communityId, approvalType: "MANUAL", createdDate: dAgo(60), activationDate: null, expirationDate: dAgo(30), lastModifiedDate: dAgo(30), servicePaidBy: "SPONSOR", tradingAddressCreateOption: "INVITEE", requiresEDIQualifier: "YES", locale: "en_US", invitingCompanyTradingAddress: [{ qualifier: "ZZ", address: "HARBORVIEWUS", alias: "Harborview US production", system: "TGMS" }], companyServices: [{ serviceBundleId: "SB-HRG-WEBEDI", serviceBundleName: "Harborview supplier web EDI" }], _companyId: "C20011", _workflowTemplateId: 3102 },
  { invitationId: 7713, invitationName: "Willow Creek Candle supplier onboarding", invitationType: "COMPANY", inviteeType: "SUPPLIER", invitationStatus: "SENT", invitingCompanyId: HUB_ID, invitingCompanyName: "Harborview Retail Group", communityId: COMMUNITY.communityId, approvalType: "MANUAL", createdDate: dAgo(2), activationDate: null, expirationDate: dAgo(-28), lastModifiedDate: dAgo(2), servicePaidBy: "SPONSOR", tradingAddressCreateOption: "INVITEE", requiresEDIQualifier: "YES", locale: "en_US", invitingCompanyTradingAddress: [{ qualifier: "ZZ", address: "HARBORVIEWUS", alias: "Harborview US production", system: "TGMS" }], companyServices: [{ serviceBundleId: "SB-HRG-SPOKE-STD", serviceBundleName: "Harborview supplier bundle" }], _companyId: "C20012", _workflowTemplateId: 3101 },
];

export const userInvitations = {
  [HUB_ID]: [{ invitationId: 7801, invitationName: "Harborview analyst access", invitationType: "USER", inviteeType: "USER", invitationStatus: "SENT", invitingCompanyId: HUB_ID, invitingCompanyName: "Harborview Retail Group", emailAddress: ["(masked)"], expirationDate: dAgo(-12), activityLog: log(3), userServices: [{ serviceInstanceId: "SI-TGI", serviceInstanceName: "TG Insights", isSubscribed: "NO", isAutoGrant: "YES", isVisible: "YES" }] }],
};

export const registrations = [
  { requestId: 55120, trackingId: 88120, workflowId: "WF-HRG-SUPPLIER-STD", description: "Pinegate Home company registration", createdDate: dAgo(71), modifiedDate: dAgo(68), approvedBy: "hrg.onboarding", mailboxId: "MB-PGH-01", tradingAddress: "ZZ:PINEGATEHOME", userLogin: "(masked)", userId: "(masked)", company: { id: "C20005", name: "Pinegate Home LLC", city: "Asheville", state: "NC", countryCode: "US" }, request: { type: "COMPANY_REGISTRATION", status: "APPROVED", content: "(masked: request payload withheld)" } },
  { requestId: 55041, trackingId: 88041, workflowId: "WF-HRG-DROPSHIP", description: "Maple Ridge Crafts company registration", createdDate: dAgo(162), modifiedDate: dAgo(158), approvedBy: "hrg.onboarding", mailboxId: "MB-HRG-WEBEDI-01", tradingAddress: "ZZ:MAPLERIDGEWEB", userLogin: "(masked)", userId: "(masked)", company: { id: "C20014", name: "Maple Ridge Crafts", city: "Bend", state: "OR", countryCode: "US" }, request: { type: "COMPANY_REGISTRATION", status: "APPROVED", content: "(masked: request payload withheld)" } },
  { requestId: 55102, trackingId: null, workflowId: "WF-HRG-SUPPLIER-STD", description: "Evergreen Paper company registration", createdDate: dAgo(25), modifiedDate: dAgo(22), approvedBy: null, mailboxId: null, tradingAddress: null, userLogin: "(masked)", userId: "(masked)", company: { id: "C20011", name: "Evergreen Paper Products", city: "Portland", state: "OR", countryCode: "US" }, request: { type: "COMPANY_REGISTRATION", status: "REJECTED", content: "(masked: request payload withheld)", rejectionReason: "Tax ID could not be verified" } },
  { requestId: 55188, trackingId: null, workflowId: "WF-HRG-SUPPLIER-STD", description: "Willow Creek Candle company registration", createdDate: dAgo(1), modifiedDate: dAgo(1), approvedBy: null, mailboxId: null, tradingAddress: null, userLogin: "(masked)", userId: "(masked)", company: { id: "C20012", name: "Willow Creek Candle Co", city: "Burlington", state: "VT", countryCode: "US" }, request: { type: "COMPANY_REGISTRATION", status: "PENDING_APPROVAL", content: "(masked: request payload withheld)" } },
];

export const processInstances = [
  { piUniqueId: 900301, processInstanceId: "PI-55120-1", processName: "HRG supplier onboarding", activityName: "Registration approval", processStatus: "COMPLETED", requestId: 55120, workFlowRootId: "WF-HRG-SUPPLIER-STD", retryCount: 0, httpCode: 200, createdDate: dAgo(71), modifiedDate: dAgo(68) },
  { piUniqueId: 900302, processInstanceId: "PI-55120-2", processName: "HRG supplier onboarding", activityName: "Mailbox and address provisioning", processStatus: "COMPLETED", requestId: 55120, workFlowRootId: "WF-HRG-SUPPLIER-STD", retryCount: 1, httpCode: 200, createdDate: dAgo(68), modifiedDate: dAgo(68) },
  { piUniqueId: 900303, processInstanceId: "PI-55120-3", processName: "HRG supplier onboarding", activityName: "Trading relationship setup", processStatus: "COMPLETED", requestId: 55120, workFlowRootId: "WF-HRG-SUPPLIER-STD", retryCount: 0, httpCode: 200, createdDate: dAgo(67), modifiedDate: dAgo(66) },
  { piUniqueId: 900304, processInstanceId: "PI-55120-4", processName: "HRG supplier onboarding", activityName: "Partner test exchange", processStatus: "COMPLETED", requestId: 55120, workFlowRootId: "WF-HRG-SUPPLIER-STD", retryCount: 0, httpCode: 200, createdDate: dAgo(66), modifiedDate: dAgo(65) },
  { piUniqueId: 900211, processInstanceId: "PI-55041-1", processName: "HRG drop-ship vendor onboarding", activityName: "Registration approval", processStatus: "COMPLETED", requestId: 55041, workFlowRootId: "WF-HRG-DROPSHIP", retryCount: 0, httpCode: 200, createdDate: dAgo(162), modifiedDate: dAgo(161) },
  { piUniqueId: 900212, processInstanceId: "PI-55041-2", processName: "HRG drop-ship vendor onboarding", activityName: "Web EDI enablement", processStatus: "FAILED", requestId: 55041, workFlowRootId: "WF-HRG-DROPSHIP", retryCount: 3, httpCode: 500, createdDate: dAgo(161), modifiedDate: dAgo(160), errorMessage: "Web EDI form package WEBFORMS_856 not subscribed for mailbox MB-HRG-WEBEDI-01" },
  { piUniqueId: 900213, processInstanceId: "PI-55041-3", processName: "HRG drop-ship vendor onboarding", activityName: "Web EDI enablement (manual retry)", processStatus: "COMPLETED", requestId: 55041, workFlowRootId: "WF-HRG-DROPSHIP", retryCount: 0, httpCode: 200, createdDate: dAgo(159), modifiedDate: dAgo(158) },
  { piUniqueId: 900271, processInstanceId: "PI-55102-1", processName: "HRG supplier onboarding", activityName: "Registration approval", processStatus: "TERMINATED", requestId: 55102, workFlowRootId: "WF-HRG-SUPPLIER-STD", retryCount: 0, httpCode: 200, createdDate: dAgo(25), modifiedDate: dAgo(22) },
  { piUniqueId: 900351, processInstanceId: "PI-55188-1", processName: "HRG supplier onboarding", activityName: "Registration approval", processStatus: "WAITING", requestId: 55188, workFlowRootId: "WF-HRG-SUPPLIER-STD", retryCount: 0, httpCode: 202, createdDate: dAgo(1), modifiedDate: dAgo(1) },
];

export const workflowTemplates = [
  { workflowTemplateId: 3101, ownerCompanyId: HUB_ID, invitationId: [7702, 7713], createdDate: dAgo(700), modifiedDate: dAgo(60), template: { name: "HRG_SUPPLIER_STD", type: "ONBOARDING", content: "Steps: registration approval; mailbox and address provisioning; trading relationship setup (850, 855, 856, 810, 997); partner test exchange; production activation." } },
  { workflowTemplateId: 3102, ownerCompanyId: HUB_ID, invitationId: [7720, 7726], createdDate: dAgo(400), modifiedDate: dAgo(400), template: { name: "HRG_DROPSHIP_VENDOR", type: "ONBOARDING", content: "Steps: registration approval; web EDI enablement; 850 drop-ship and 856 setup; production activation." } },
];

export const billingProfiles = {
  [HUB_ID]: [{ profileId: "BP-HRG-01", profileName: "Harborview US billing", isDefaultBillingProfile: "YES", companyId: HUB_ID, attention: "(restricted)", billingAddress: { city: "Charlotte", state: "NC", countryCode: "US" } }],
};


/** Applies partner lifecycle (go-live dates) to relationship statuses. Called at startup and daily. */
export function refreshLifecycle(now = Date.now()) {
  const today = Math.floor(now / DAY);
  for (const p of PROFILES) {
    const live = anchorDay(p.goLive) <= today;
    for (const b of bprs) if (b.partnerCompanyId === p.id && (b.status === "ACTIVE" || b.status === "PENDING")) b.status = live ? "ACTIVE" : "PENDING";
    for (const d of partnerDirectory) if (d.partnerCompanyId === p.id && (d.bprStatus === "ACTIVE" || d.bprStatus === "PENDING")) { d.bprStatus = live ? "ACTIVE" : "PENDING"; d.partnerShipStatus = live ? "ACTIVE" : "PENDING"; }
    for (const t of tprs) if (t.partnerTradingAddress.companyId === p.id && t.tprType === "PRODUCTION" && (t.status === "ACTIVE" || t.status === "PENDING")) t.status = live ? "ACTIVE" : "PENDING";
    for (const m of messagingTuples) if (m._partnerCompanyId === p.id && (m._status === "ACTIVE" || m._status === "PENDING")) { const t = tprs.find((x) => x.tradingPartnerRelationshipId === m._tprId); if (t) m._status = t.status; }
  }
}
refreshLifecycle();
