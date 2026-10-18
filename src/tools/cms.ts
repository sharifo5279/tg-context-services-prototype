// Community Management tools: companies, relationships, connectivity, services, contacts, invitations, workflow.
import * as D from "../data/cms.js";
import { ok, fail, deny, scopeFilter, companyInScope, Ctx } from "../runtime.js";
import { ToolDef, s, PAGE, paginate, CMS_BASIS } from "./types.js";
import { resolveCompany, brief } from "./common.js";
import { contains, eq } from "../util.js";

const P = "Trading Grid Community Management";
const B = "/CommunityManagementServices";
const src = (op: string, ids?: string[]) => [{ product: P, operation: `GET ${B}${op}`, objectIds: ids }];
const strip = (o: any) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith("_")));

/** Resolve a company argument (default hub) or return an early envelope. */
function co(ctx: Ctx, tool: string, op: string, input?: string): { c?: any; early?: any } {
  const r = resolveCompany(input ?? D.HUB_ID);
  if (r.kind === "ok") return { c: r.company };
  if (r.kind === "ambiguous") return { early: fail(ctx, tool, op, "AMBIGUOUS_COMPANY", `'${input}' matches ${r.candidates.length} companies. Select one companyId and retry.`, { candidates: r.candidates }) };
  if (r.kind === "denied") return { early: deny(ctx, tool, op, r.reason) };
  return { early: fail(ctx, tool, op, "NOT_FOUND", `No permitted company matches '${input}'.`) };
}

const addrArg = (ctx: Ctx, tool: string, op: string, v: string) => {
  const a = D.addrByKey(String(v ?? "").toUpperCase());
  if (!a) return { early: fail(ctx, tool, op, "NOT_FOUND", `Trading address '${v}' not found in permitted scope. Use qualifier:address, e.g. ZZ:BRIGHTWELLHG.`) };
  if (!scopeFilter(a.companyId)) return { early: deny(ctx, tool, op, `Trading address ${v} belongs to a company outside the grant.`) };
  return { a };
};

const SOLUTION = {
  solutionId: D.SOLUTION_ID, solutionInternalId: "SOLI-88014", solutionType: "HUB_AND_SPOKE", customerCompanyId: D.HUB_ID, customerName: "Harborview Retail Group",
  customerCity: "Charlotte", customerCountryCode: "US", isTest: "NO", processingCell: "US-EAST", computeZoneId: "CZ-US-04",
  hubTemplateType: "RETAIL_HUB", spokeTemplateType: "RETAIL_SUPPLIER", serviceBundleTemplateName: "HRG_HUB_STD", spokeServiceBundleTemplateName: "HRG_SPOKE_STD",
  hubServiceBundle: [{ serviceBundleId: "SB-HRG-HUB", serviceBundleName: "Harborview retail hub bundle", level: "HUB", ownerCompanyId: D.HUB_ID, visibility: "YES" }],
  spokeServiceBundle: [{ serviceBundleId: "SB-HRG-SPOKE-STD", serviceBundleName: "Harborview supplier bundle", level: "SPOKE", ownerCompanyId: D.HUB_ID, visibility: "YES" }],
  activityLog: { createTimeStamp: "2020-03-02T10:00:00Z", createdBy: "cms.admin", modifiedBy: "cms.admin", modifyTimeStamp: "2026-08-14T10:00:00Z" },
};

const CUSTOM_FIELDS: Record<string, any> = {
  C20004: { categoryName: "SUPPLIER_PROFILE", customFieldsAnswers: [{ customFieldId: "CF-TIER", answers: ["Tier 1"] }, { customFieldId: "CF-ASN-REQ", answers: ["ASN required before receipt"] }, { customFieldId: "CF-COMPLIANCE", answers: ["Enrolled in ASN accuracy program"] }] },
  C20001: { categoryName: "SUPPLIER_PROFILE", customFieldsAnswers: [{ customFieldId: "CF-TIER", answers: ["Tier 1"] }, { customFieldId: "CF-ASN-REQ", answers: ["ASN required before receipt"] }] },
  C20007: { categoryName: "SUPPLIER_PROFILE", customFieldsAnswers: [{ customFieldId: "CF-TIER", answers: ["Tier 2"] }, { customFieldId: "CF-PO-ACK", answers: ["855 within 24 hours"] }] },
};

const id = (x: string) => s.str(x);

export const cmsTools: ToolDef[] = [
  // ---------------- Companies and relationships ----------------
  {
    name: "search_companies", domain: "Companies and relationships", product: P, title: "Search companies",
    description: "Search permitted companies by name, industry or status. Scope is applied before discovery; companies outside the grant are never returned.",
    operation: "community.read", kind: "read", binding: `GET ${B}/v3/companies`, basis: CMS_BASIS,
    inputSchema: s.obj({ query: s.str("Name fragment."), industry: s.str("Industry type."), status: s.str("Company status."), ...PAGE }),
    handler: (a, ctx) => {
      const rows = D.companies.filter((c) => scopeFilter(c.companyId) && (!a.query || a.query.toLowerCase().split(/\s+/).every((w: string) => contains(c.companyName, w))) && (!a.industry || contains(c.industryType, a.industry)) && (!a.status || eq(c.status, a.status)))
        .map((c) => ({ companyId: c.companyId, companyName: c.companyName, status: c.status, industryType: c.industryType, city: c.companyAddress.city, state: c.companyAddress.state, countryCode: c.companyAddress.countryCode, participation: c.companyParticipationType }));
      const { page, pagination } = paginate(rows, a);
      return ok(ctx, "search_companies", "community.read", { candidates: page }, { sources: src("/v3/companies"), pagination, interpretation: rows.length > 1 && a.query ? "Multiple candidates returned. Select one companyId." : undefined });
    },
  },
  {
    name: "get_company", domain: "Companies and relationships", product: P, title: "Get company",
    description: "Get a permitted company's identity, references, community membership and status.",
    operation: "community.read", kind: "read", binding: `GET ${B}/v3/companies/{companyId}`, basis: CMS_BASIS,
    inputSchema: s.obj({ company: id("Company ID or name.") }, ["company"]),
    handler: (a, ctx) => { const r = co(ctx, "get_company", "community.read", a.company); return r.early ?? ok(ctx, "get_company", "community.read", strip(r.c), { sources: src(`/v3/companies/${r.c.companyId}`, [r.c.companyId]) }); },
  },
  {
    name: "get_company_hierarchy", domain: "Companies and relationships", product: P, title: "Get company hierarchy",
    description: "Return parent and child company relationships. Children outside the grant are listed by ID only.",
    operation: "community.read", kind: "read", binding: `GET ${B}/v2/companies/{companyId}/companyhierarchy`, basis: CMS_BASIS,
    inputSchema: s.obj({ company: id("Company ID or name (default hub).") }),
    handler: (a, ctx) => {
      const r = co(ctx, "get_company_hierarchy", "community.read", a.company); if (r.early) return r.early;
      const h = (D.hierarchy as any)[r.c.companyId];
      if (!h) return ok(ctx, "get_company_hierarchy", "community.read", { companyHierarchyPresent: false, rootParentCompanyId: r.c.companyId }, { sources: src(`/v2/companies/${r.c.companyId}/companyhierarchy`), interpretation: "No hierarchy recorded. Absence is not proof of a standalone company." });
      const mark = (n: any): any => ({ ...n, accessible: companyInScope(n.companyId).ok, ...(companyInScope(n.companyId).ok ? {} : { companyName: "(outside grant)" }), childCompany: (n.childCompany ?? []).map(mark) });
      return ok(ctx, "get_company_hierarchy", "community.read", { ...h, companyHierarchyDetails: mark(h.companyHierarchyDetails) }, { sources: src(`/v2/companies/${r.c.companyId}/companyhierarchy`) });
    },
  },
  {
    name: "search_legal_entities", domain: "Companies and relationships", product: P, title: "Search legal entities",
    description: "Find legal-entity profiles by company or legal profile name.",
    operation: "community.read", kind: "read", binding: `GET ${B}/v2/legalentities/attributes`, basis: CMS_BASIS,
    inputSchema: s.obj({ company: id("Company ID or name."), legal_profile_name: s.str("Legal profile name fragment.") }),
    handler: (a, ctx) => {
      let cid: string | null = null;
      if (a.company) { const r = co(ctx, "search_legal_entities", "community.read", a.company); if (r.early) return r.early; cid = r.c.companyId; }
      const rows = D.legalEntities.filter((l) => scopeFilter(l.companyId) && (!cid || l.companyId === cid) && (!a.legal_profile_name || contains(l.legalProfileName, a.legal_profile_name)));
      return ok(ctx, "search_legal_entities", "community.read", { legalEntities: rows }, { sources: src("/v2/legalentities/attributes") });
    },
  },
  {
    name: "get_legal_entity", domain: "Companies and relationships", product: P, title: "Get legal entity",
    description: "Get a legal-entity record and its company association. Tax identifiers are masked.",
    operation: "community.read", kind: "read", binding: `GET ${B}/v2/legalentities/{leId}`, basis: CMS_BASIS,
    inputSchema: s.obj({ legal_entity_id: id("Legal entity ID.") }, ["legal_entity_id"]),
    handler: (a, ctx) => {
      const l = D.legalEntities.find((x) => eq(x.legalEntityId, a.legal_entity_id));
      if (!l) return fail(ctx, "get_legal_entity", "community.read", "NOT_FOUND", "Legal entity not found.");
      if (!scopeFilter(l.companyId)) return deny(ctx, "get_legal_entity", "community.read", "Legal entity belongs to a company outside the grant.");
      return ok(ctx, "get_legal_entity", "community.read", l, { sources: src(`/v2/legalentities/${l.legalEntityId}`, [l.legalEntityId]) });
    },
  },
  {
    name: "list_partners", domain: "Companies and relationships", product: P, title: "List partners",
    description: "List partner directory entries for the hub with business relationship status and activation date.",
    operation: "community.read", kind: "read", binding: `GET ${B}/v3/companies/{companyId}/partnerdirectory`, basis: CMS_BASIS,
    inputSchema: s.obj({ status: s.str("ACTIVE or PENDING."), ...PAGE }),
    handler: (a, ctx) => {
      const rows = D.partnerDirectory.filter((p) => !a.status || eq(p.partnerShipStatus, a.status));
      const { page, pagination } = paginate(rows, a, 50);
      return ok(ctx, "list_partners", "community.read", { partners: page }, { sources: src(`/v3/companies/${D.HUB_ID}/partnerdirectory`), pagination, interpretation: "Directory status is configuration, not observed trading activity." });
    },
  },
  {
    name: "get_partner_context", domain: "Companies and relationships", product: P, title: "Get partner context",
    description: "Combined company, partner directory, business relationship, trading relationships and trading address evidence for one partner. Joins that are not proven by shared identifiers are returned separately.",
    operation: "community.read", kind: "read", binding: `Composed: ${B}/v3/companies/{companyId}, /partnerdirectory, /v2/businesspartnerrelationship, /v3/tradingpartnerrelationships, /v4/tradingaddresses`, basis: CMS_BASIS,
    inputSchema: s.obj({ partner: id("Partner company ID or name.") }, ["partner"]),
    handler: (a, ctx) => {
      const r = co(ctx, "get_partner_context", "community.read", a.partner); if (r.early) return r.early;
      const c = r.c;
      const dir = D.partnerDirectory.find((p) => p.partnerCompanyId === c.companyId) ?? null;
      const bpr = D.bprs.find((b) => b.partnerCompanyId === c.companyId) ?? null;
      const tprs = D.tprs.filter((t) => t.partnerTradingAddress.companyId === c.companyId).map(({ _docs, ...t }: any) => ({ tradingPartnerRelationshipId: t.tradingPartnerRelationshipId, status: t.status, tprType: t.tprType, bprId: t.bprId, ownerTradingAddress: `${t.ownerTradingAddress.tradingAddress.qualifier}:${t.ownerTradingAddress.tradingAddress.address}`, partnerTradingAddress: `${t.partnerTradingAddress.tradingAddress.qualifier}:${t.partnerTradingAddress.tradingAddress.address}`, deliveryMethod: t.partnerTradingAddress.deliveryMethodName, configuredDocuments: _docs.map((d: any) => `${d[0]} (${d[1] === "SENDER" ? "hub sends" : "hub receives"})`) }));
      const addrs = D.addresses.filter((x) => x.companyId === c.companyId).map((x) => ({ tradingAddress: D.addrKey(x), alias: x.alias, deliveryMethod: x.deliveryMethod, mailboxId: x.mailboxId, viaVan: x.viaVan ? D.companyById(x.viaVan)!.companyName : null }));
      return ok(ctx, "get_partner_context", "community.read", {
        company: { companyId: c.companyId, companyName: c.companyName, status: c.status, industryType: c.industryType, city: c.companyAddress.city, state: c.companyAddress.state, countryCode: c.companyAddress.countryCode },
        provenJoins: { partnerDirectory: dir, businessRelationship: bpr, tradingRelationships: tprs, tradingAddresses: addrs },
        unprovenJoins: [],
      }, { sources: [...src(`/v3/companies/${c.companyId}`), ...src(`/v3/companies/${D.HUB_ID}/partnerdirectory`), ...src("/v3/tradingpartnerrelationships"), ...src("/v4/tradingaddresses")], completeness: bpr ? "COMPLETE" : "PARTIAL", missingEvidence: bpr ? [] : ["No business relationship recorded with the hub."], interpretation: "Configured context only. Use transaction tools for observed activity." });
    },
  },
  {
    name: "search_business_relationships", domain: "Companies and relationships", product: P, title: "Search business relationships",
    description: "Find company-level business relationships by partner, initiator, solution or status. Directional roles are preserved.",
    operation: "community.read", kind: "read", binding: `GET ${B}/v2/businesspartnerrelationship/attributes`, basis: CMS_BASIS,
    inputSchema: s.obj({ partner: id("Partner company ID or name."), status: s.str("ACTIVE, PENDING or REJECTED."), solution_id: id("Solution ID.") }),
    handler: (a, ctx) => {
      let pid: string | null = null;
      if (a.partner) { const r = co(ctx, "search_business_relationships", "community.read", a.partner); if (r.early) return r.early; pid = r.c.companyId; }
      const rows = D.bprs.filter((b) => (!pid || b.partnerCompanyId === pid) && (!a.status || eq(b.status, a.status)) && (!a.solution_id || b.solutionIds.includes(a.solution_id)));
      return ok(ctx, "search_business_relationships", "community.read", { relationships: rows.map((b) => ({ ...b, partnerCompanyName: D.companyById(b.partnerCompanyId)!.companyName })) }, { sources: src("/v2/businesspartnerrelationship/attributes") });
    },
  },
  {
    name: "get_business_relationship", domain: "Companies and relationships", product: P, title: "Get business relationship",
    description: "Get one business relationship: company pair, solutions, status and creation date.",
    operation: "community.read", kind: "read", binding: `GET ${B}/v2/businesspartnerrelationship/{bprid}`, basis: CMS_BASIS,
    inputSchema: s.obj({ bpr_id: id("Business relationship ID (BPR-...).") }, ["bpr_id"]),
    handler: (a, ctx) => {
      const b = D.bprs.find((x) => eq(x.businessPartnerRelationshipId, a.bpr_id));
      return b ? ok(ctx, "get_business_relationship", "community.read", { ...b, partnerCompanyName: D.companyById(b.partnerCompanyId)!.companyName, sourceStatusNote: "Status is the CMS relationship state; it does not indicate trading readiness." }, { sources: src(`/v2/businesspartnerrelationship/${b.businessPartnerRelationshipId}`, [b.businessPartnerRelationshipId]) }) : fail(ctx, "get_business_relationship", "community.read", "NOT_FOUND", "Business relationship not found in permitted scope.");
    },
  },
  {
    name: "get_partner_custom_fields", domain: "Companies and relationships", product: P, title: "Get partner custom fields",
    description: "Get permitted custom-field answers for a partner relationship and category.",
    operation: "community.read", kind: "read", binding: `GET ${B}/v3/companies/{companyId}/businesspartnerrelationships/{partnerCompanyId}/categorytype/{categoryType}/customFields`, basis: CMS_BASIS,
    inputSchema: s.obj({ partner: id("Partner company ID or name."), category_type: s.str("Category type, default SUPPLIER_PROFILE.") }, ["partner"]),
    handler: (a, ctx) => {
      const r = co(ctx, "get_partner_custom_fields", "community.read", a.partner); if (r.early) return r.early;
      const cf = CUSTOM_FIELDS[r.c.companyId];
      return ok(ctx, "get_partner_custom_fields", "community.read", cf ?? { categoryName: a.category_type ?? "SUPPLIER_PROFILE", customFieldsAnswers: [] }, { sources: src(`/v3/companies/${D.HUB_ID}/businesspartnerrelationships/${r.c.companyId}/categorytype/${a.category_type ?? "SUPPLIER_PROFILE"}/customFields`), completeness: cf ? "COMPLETE" : "UNKNOWN", missingEvidence: cf ? [] : ["No custom-field answers recorded."] });
    },
  },
  {
    name: "list_solutions", domain: "Companies and relationships", product: P, title: "List solutions",
    description: "List solutions visible to a company.",
    operation: "community.read", kind: "read", binding: `GET ${B}/v2/companies/{companyId}/solutions`, basis: CMS_BASIS,
    inputSchema: s.obj({ company: id("Company ID or name (default hub).") }),
    handler: (a, ctx) => { const r = co(ctx, "list_solutions", "community.read", a.company); if (r.early) return r.early; return ok(ctx, "list_solutions", "community.read", { solutions: [{ solutionId: SOLUTION.solutionId, solutionType: SOLUTION.solutionType, customerName: SOLUTION.customerName, role: r.c.companyId === D.HUB_ID ? "HUB" : "SPOKE" }] }, { sources: src(`/v2/companies/${r.c.companyId}/solutions`) }); },
  },
  {
    name: "get_solution", domain: "Companies and relationships", product: P, title: "Get solution",
    description: "Get permitted solution context: type, templates and service bundles.",
    operation: "community.read", kind: "read", binding: `GET ${B}/v4/solutions/{solutionId}`, basis: CMS_BASIS,
    inputSchema: s.obj({ solution_id: id("Solution ID.") }, ["solution_id"]),
    handler: (a, ctx) => eq(a.solution_id, D.SOLUTION_ID) ? ok(ctx, "get_solution", "community.read", SOLUTION, { sources: src(`/v4/solutions/${D.SOLUTION_ID}`) }) : deny(ctx, "get_solution", "community.read", `Solution ${a.solution_id} is not in the grant.`),
  },
  {
    name: "list_solution_participants", domain: "Companies and relationships", product: P, title: "List solution participants",
    description: "List companies participating in a solution, limited to authorized visibility.",
    operation: "community.read", kind: "read", binding: `GET ${B}/v2/solutions/{solutionId}/participants`, basis: CMS_BASIS,
    inputSchema: s.obj({ solution_id: id("Solution ID."), ...PAGE }, ["solution_id"]),
    handler: (a, ctx) => {
      if (!eq(a.solution_id, D.SOLUTION_ID)) return deny(ctx, "list_solution_participants", "community.read", `Solution ${a.solution_id} is not in the grant.`);
      const rows = D.companies.filter((c) => scopeFilter(c.companyId) && c.community.length).map((c) => ({ companyId: c.companyId, companyName: c.companyName, companyParticipationType: c.companyParticipationType, status: c.status }));
      const { page, pagination } = paginate(rows, a, 50);
      return ok(ctx, "list_solution_participants", "community.read", { participants: page }, { sources: src(`/v2/solutions/${D.SOLUTION_ID}/participants`), pagination });
    },
  },

  // ---------------- Configured connectivity ----------------
  {
    name: "search_mailboxes", domain: "Configured connectivity", product: P, title: "Search mailboxes",
    description: "List the hub's mailbox configuration with status, subscriptions and trading-address counts (numOfTradingAddresses counts addresses, not transactions).",
    operation: "connectivity.read", kind: "read", binding: `GET ${B}/v4/companies/{companyId}/mailboxes`, basis: CMS_BASIS,
    inputSchema: s.obj({ company: id("Company ID or name (default hub)."), status: s.str("Mailbox status.") }),
    handler: (a, ctx) => {
      const r = co(ctx, "search_mailboxes", "connectivity.read", a.company); if (r.early) return r.early;
      if (r.c.companyId !== D.HUB_ID) return deny(ctx, "search_mailboxes", "connectivity.read", `Mailbox configuration for ${r.c.companyName} is owned by that company. Source object permission not granted.`);
      const rows = D.mailboxes.filter((m) => m.mailboxOwnerCompanyId === D.HUB_ID && (!a.status || eq(m.status, a.status)));
      return ok(ctx, "search_mailboxes", "connectivity.read", { mailboxes: rows }, { sources: src(`/v4/companies/${D.HUB_ID}/mailboxes`) });
    },
  },
  {
    name: "get_mailbox", domain: "Configured connectivity", product: P, title: "Get mailbox",
    description: "Get one mailbox's ownership, status and supported configuration fields. Internal infrastructure details are filtered.",
    operation: "connectivity.read", kind: "read", binding: `GET ${B}/v2/mailboxes/{mailboxId}`, basis: CMS_BASIS,
    inputSchema: s.obj({ mailbox_id: id("Mailbox ID.") }, ["mailbox_id"]),
    handler: (a, ctx) => {
      const m = D.mailboxes.find((x) => eq(x.mailboxId, a.mailbox_id));
      if (!m) return fail(ctx, "get_mailbox", "connectivity.read", "NOT_FOUND", "Mailbox not found in permitted scope.");
      if (m.mailboxOwnerCompanyId !== D.HUB_ID) return deny(ctx, "get_mailbox", "connectivity.read", `Mailbox ${m.mailboxId} is owned by ${m.mailboxOwnerCompanyName}. Source object permission not granted.`);
      const ta = D.addresses.filter((x) => x.mailboxId === m.mailboxId).map((x) => ({ qualifier: x.qualifier, address: x.address, alias: x.alias, deliveryMethod: x.deliveryMethod, system: x.system }));
      return ok(ctx, "get_mailbox", "connectivity.read", { ...m, baseTradingAddressDetails: ta }, { sources: src(`/v2/mailboxes/${m.mailboxId}`, [m.mailboxId]) });
    },
  },
  {
    name: "search_trading_addresses", domain: "Configured connectivity", product: P, title: "Search trading addresses",
    description: "Find configured trading addresses by company, mailbox, qualifier or address with ownership and delivery method.",
    operation: "connectivity.read", kind: "read", binding: `GET ${B}/v4/tradingaddresses`, basis: CMS_BASIS,
    inputSchema: s.obj({ company: id("Company ID or name."), mailbox_id: id("Mailbox ID."), qualifier: s.str("Qualifier, e.g. ZZ, 01, 12, 14."), address: s.str("Address fragment."), ...PAGE }),
    handler: (a, ctx) => {
      let cid: string | null = null;
      if (a.company) { const r = co(ctx, "search_trading_addresses", "connectivity.read", a.company); if (r.early) return r.early; cid = r.c.companyId; }
      const rows = D.addresses.filter((x) => scopeFilter(x.companyId) && (!cid || x.companyId === cid) && (!a.mailbox_id || eq(x.mailboxId, a.mailbox_id)) && (!a.qualifier || eq(x.qualifier, a.qualifier)) && (!a.address || contains(x.address, a.address))).map(D.tradingAddressDetails);
      const { page, pagination } = paginate(rows, a, 50);
      return ok(ctx, "search_trading_addresses", "connectivity.read", { tradingAddresses: page }, { sources: src("/v4/tradingaddresses"), pagination });
    },
  },
  {
    name: "get_trading_address", domain: "Configured connectivity", product: P, title: "Get trading address",
    description: "Get one trading address with qualifier, owner, mailbox, delivery method and VAN provider.",
    operation: "connectivity.read", kind: "read", binding: `GET ${B}/v4/tradingaddresses/{tradingAddress}`, basis: CMS_BASIS,
    inputSchema: s.obj({ trading_address: id("Qualifier:address, e.g. ZZ:BRIGHTWELLHG.") }, ["trading_address"]),
    handler: (a, ctx) => { const r = addrArg(ctx, "get_trading_address", "connectivity.read", a.trading_address); return r.early ?? ok(ctx, "get_trading_address", "connectivity.read", D.tradingAddressDetails(r.a!), { sources: src(`/v4/tradingaddresses/${r.a!.address}`, [D.addrKey(r.a!)]) }); },
  },
  {
    name: "get_interconnect_address", domain: "Configured connectivity", product: P, title: "Get interconnect address",
    description: "Get documented VAN interconnect configuration for a trading address.",
    operation: "connectivity.read", kind: "read", binding: `GET ${B}/v2/interconnecttradingaddresses/{tradingAddress}`, basis: CMS_BASIS,
    inputSchema: s.obj({ trading_address: id("Qualifier:address.") }, ["trading_address"]),
    handler: (a, ctx) => {
      const r = addrArg(ctx, "get_interconnect_address", "connectivity.read", a.trading_address); if (r.early) return r.early;
      const x = r.a!;
      if (!x.viaVan) return ok(ctx, "get_interconnect_address", "connectivity.read", { interconnect: null, tradingAddress: D.addrKey(x), deliveryMethod: x.deliveryMethod }, { sources: src(`/v2/interconnecttradingaddresses/${x.address}`), interpretation: "No interconnect configuration recorded. The address is connected directly." });
      return ok(ctx, "get_interconnect_address", "connectivity.read", { companyId: x.companyId, mailboxId: x.mailboxId, nodeId: "NODE-IC-02", tradingAddress: { qualifier: x.qualifier, address: x.address, alias: x.alias, system: x.system }, vanProvider: D.vanProvider(x) }, { sources: src(`/v2/interconnecttradingaddresses/${x.address}`, [D.addrKey(x)]) });
    },
  },
  {
    name: "get_delivery_methods", domain: "Configured connectivity", product: P, title: "Get delivery methods",
    description: "Get delivery-method subscription details for a trading address.",
    operation: "connectivity.read", kind: "read", binding: `GET ${B}/v2/deliverymethodsubscriptions/tradingaddresses/{tradingAddress}`, basis: CMS_BASIS,
    inputSchema: s.obj({ trading_address: id("Qualifier:address.") }, ["trading_address"]),
    handler: (a, ctx) => { const r = addrArg(ctx, "get_delivery_methods", "connectivity.read", a.trading_address); return r.early ?? ok(ctx, "get_delivery_methods", "connectivity.read", D.deliveryMethodPackages(r.a!), { sources: src(`/v2/deliverymethodsubscriptions/tradingaddresses/${r.a!.address}`) }); },
  },
  {
    name: "list_autoforwards", domain: "Configured connectivity", product: P, title: "List autoforwards",
    description: "List configured autoforward rules for the hub, optionally for one trading relationship. Destination protocol is not inferred.",
    operation: "connectivity.read", kind: "read", binding: `GET ${B}/v2/companies/{companyId}/autoforwards; {tprId} variant`, basis: CMS_BASIS,
    inputSchema: s.obj({ tpr_id: id("Trading relationship ID.") }),
    handler: (a, ctx) => ok(ctx, "list_autoforwards", "connectivity.read", { autoforwards: D.autoforwards.filter((f) => !a.tpr_id || eq(f.tradingPartnerRelationshipId, a.tpr_id)) }, { sources: src(`/v2/companies/${D.HUB_ID}/autoforwards`) }),
  },
  {
    name: "list_distribution_lists", domain: "Configured connectivity", product: P, title: "List distribution lists",
    description: "List the hub's distribution-list references.",
    operation: "connectivity.read", kind: "read", binding: `GET ${B}/v2/companies/{companyId}/distributionlists`, basis: CMS_BASIS,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => ok(ctx, "list_distribution_lists", "connectivity.read", { distributionLists: D.distributionLists.map((d) => ({ dlTradingAddress: d.dlTradingAddress, mailboxId: d.mailboxId })) }, { sources: src(`/v2/companies/${D.HUB_ID}/distributionlists`) }),
  },
  {
    name: "get_distribution_list", domain: "Configured connectivity", product: P, title: "Get distribution list",
    description: "Get distribution-list detail and permitted participants.",
    operation: "connectivity.read", kind: "read", binding: `GET ${B}/v2/distributionlists/{tradingAddress}`, basis: CMS_BASIS,
    inputSchema: s.obj({ trading_address: id("Distribution list address, e.g. ZZ:HRGDL-PO850.") }, ["trading_address"]),
    handler: (a, ctx) => { const d = D.distributionLists.find((x) => String(a.trading_address).toUpperCase().endsWith(x.dlTradingAddress.address)); return d ? ok(ctx, "get_distribution_list", "connectivity.read", d, { sources: src(`/v2/distributionlists/${d.dlTradingAddress.address}`) }) : fail(ctx, "get_distribution_list", "connectivity.read", "NOT_FOUND", "Distribution list not found."); },
  },
  {
    name: "search_messaging_tuples", domain: "Configured connectivity", product: P, title: "Search messaging tuples",
    description: "Find configured messaging tuples (document type, direction, owner and partner address). Tuples describe configuration, not exchanged documents.",
    operation: "connectivity.read", kind: "read", binding: `GET ${B}/v2/messagingtuples/attributes`, basis: CMS_BASIS,
    inputSchema: s.obj({ partner: id("Partner company ID or name."), doc_type: s.str("Document type."), direction: s.str("SENDER or RECEIVER (from the hub's perspective)."), ...PAGE }),
    handler: (a, ctx) => {
      let pid: string | null = null;
      if (a.partner) { const r = co(ctx, "search_messaging_tuples", "connectivity.read", a.partner); if (r.early) return r.early; pid = r.c.companyId; }
      const rows = D.messagingTuples.filter((t: any) => (!pid || t._partnerCompanyId === pid) && (!a.doc_type || eq(t.docType, a.doc_type)) && (!a.direction || eq(t.direction, a.direction)))
        .map((t: any) => ({ tupleId: t.tupleId, docType: t.docType, direction: t.direction, ownerTradingAddress: `${t.ownerTradingAddress.qualifier}:${t.ownerTradingAddress.address}`, partnerTradingAddress: `${t.partnerTradingAddress.qualifier}:${t.partnerTradingAddress.address}`, partnerCompanyId: t._partnerCompanyId, partnerName: D.companyById(t._partnerCompanyId)!.companyName, tradingPartnerRelationshipId: t._tprId, relationshipStatus: t._status, configuredSince: t._created, eventType: t.eventType }));
      const { page, pagination } = paginate(rows, a, 100);
      return ok(ctx, "search_messaging_tuples", "connectivity.read", { tuples: page }, { sources: src("/v2/messagingtuples/attributes"), pagination, interpretation: "Configured connectivity is not observed message activity." });
    },
  },
  {
    name: "list_open_trading_relationships", domain: "Configured connectivity", product: P, title: "List open trading relationships",
    description: "Get the hub's configured open trading relationship settings. The source returns a generic response structure.",
    operation: "connectivity.read", kind: "read", binding: `GET ${B}/v2/companies/{companyId}/opentradingrelationships`, basis: CMS_BASIS,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => ok(ctx, "list_open_trading_relationships", "connectivity.read", { statusCode: 200, statusMessage: "OK", targetResource: { openTradingEnabled: false, allowedPartnerTypes: [] }, targetResourceLink: `${B}/v2/companies/${D.HUB_ID}/opentradingrelationships` }, { sources: src(`/v2/companies/${D.HUB_ID}/opentradingrelationships`), interpretation: "Source returns SuccessResponse; structure requires validation." }),
  },
  {
    name: "search_trading_relationships", domain: "Configured connectivity", product: P, title: "Search trading relationships",
    description: "Find address-level trading partner relationships by partner, status or type (PRODUCTION or TEST).",
    operation: "connectivity.read", kind: "read", binding: `GET ${B}/v3/tradingpartnerrelationships`, basis: CMS_BASIS,
    inputSchema: s.obj({ partner: id("Partner company ID or name."), status: s.str("ACTIVE, PENDING or REJECTED."), tpr_type: s.str("PRODUCTION or TEST."), ...PAGE }),
    handler: (a, ctx) => {
      let pid: string | null = null;
      if (a.partner) { const r = co(ctx, "search_trading_relationships", "connectivity.read", a.partner); if (r.early) return r.early; pid = r.c.companyId; }
      const rows = D.tprs.filter((t) => (!pid || t.partnerTradingAddress.companyId === pid) && (!a.status || eq(t.status, a.status)) && (!a.tpr_type || eq(t.tprType, a.tpr_type)))
        .map(({ _docs, ...t }: any) => ({ tradingPartnerRelationshipId: t.tradingPartnerRelationshipId, bprId: t.bprId, status: t.status, tprType: t.tprType, partnerCompanyName: t.partnerTradingAddress.companyName, ownerTradingAddress: `${t.ownerTradingAddress.tradingAddress.qualifier}:${t.ownerTradingAddress.tradingAddress.address}`, partnerTradingAddress: `${t.partnerTradingAddress.tradingAddress.qualifier}:${t.partnerTradingAddress.tradingAddress.address}`, deliveryMethod: t.partnerTradingAddress.deliveryMethodName, created: t.activityLog.createTimeStamp, modified: t.activityLog.modifyTimeStamp }));
      const { page, pagination } = paginate(rows, a, 50);
      return ok(ctx, "search_trading_relationships", "connectivity.read", { relationships: page }, { sources: src("/v3/tradingpartnerrelationships"), pagination, interpretation: "Configured direction is not a buyer or seller role." });
    },
  },
  {
    name: "get_trading_relationship", domain: "Configured connectivity", product: P, title: "Get trading relationship",
    description: "Get one trading relationship: direction, addresses, solution, business relationship and billing split.",
    operation: "connectivity.read", kind: "read", binding: `GET ${B}/v4/tradingpartnerrelationships/{tprId}`, basis: CMS_BASIS,
    inputSchema: s.obj({ tpr_id: id("Trading relationship ID (TPR-...).") }, ["tpr_id"]),
    handler: (a, ctx) => { const t: any = D.tprs.find((x) => eq(x.tradingPartnerRelationshipId, a.tpr_id)); if (!t) return fail(ctx, "get_trading_relationship", "connectivity.read", "NOT_FOUND", "Trading relationship not found."); const { _docs, ...rest } = t; return ok(ctx, "get_trading_relationship", "connectivity.read", rest, { sources: src(`/v4/tradingpartnerrelationships/${t.tradingPartnerRelationshipId}`, [t.tradingPartnerRelationshipId]) }); },
  },
  {
    name: "list_network_providers", domain: "Configured connectivity", product: P, title: "List network providers",
    description: "List documented VAN provider records visible to the hub. Only permitted provider metadata is returned.",
    operation: "connectivity.read", kind: "read", binding: `GET ${B}/v3/vanproviderservice`, basis: CMS_BASIS,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => ok(ctx, "list_network_providers", "connectivity.read", D.vanProviders, { sources: src("/v3/vanproviderservice") }),
  },

  // ---------------- Services and contacts ----------------
  {
    name: "get_company_service_subscriptions", domain: "Services and contacts", product: P, title: "Get company service subscriptions",
    description: "Get the hub's service-bundle and service-instance subscriptions. Subscriptions do not establish commercial entitlement.",
    operation: "services.read", kind: "read", binding: `GET ${B}/v2/companies/{companyId}/companyservicebundlesubscriptions; companyserviceinstancesubscriptions`, basis: CMS_BASIS,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => ok(ctx, "get_company_service_subscriptions", "services.read", { serviceBundleSubscriptions: D.companyServiceBundleSubs[D.HUB_ID], serviceInstanceSubscriptions: D.companyServiceInstanceSubs[D.HUB_ID] }, { sources: [...src(`/v2/companies/${D.HUB_ID}/companyservicebundlesubscriptions`), ...src(`/v2/companies/${D.HUB_ID}/companyserviceinstancesubscriptions`)] }),
  },
  {
    name: "get_partner_primary_services", domain: "Services and contacts", product: P, title: "Get partner primary services",
    description: "Get a partner's subscribed primary services in the hub relationship.",
    operation: "services.read", kind: "read", binding: `GET ${B}/v2/companies/{companyId}/partnerservices/{partnerCompanyId}`, basis: CMS_BASIS,
    inputSchema: s.obj({ partner: id("Partner company ID or name.") }, ["partner"]),
    handler: (a, ctx) => { const r = co(ctx, "get_partner_primary_services", "services.read", a.partner); if (r.early) return r.early; return ok(ctx, "get_partner_primary_services", "services.read", { partnerCompanyId: r.c.companyId, partnerCompanyName: r.c.companyName, primaryServices: D.partnerPrimaryServices[r.c.companyId] ?? [] }, { sources: src(`/v2/companies/${D.HUB_ID}/partnerservices/${r.c.companyId}`), interpretation: "Subscriptions do not imply completed onboarding or commercial entitlement." }); },
  },
  {
    name: "list_sponsored_services", domain: "Services and contacts", product: P, title: "List sponsored services",
    description: "List services the hub offers or sponsors for partners.",
    operation: "services.read", kind: "read", binding: `GET ${B}/v2/companies/{companyId}/sponsoredservices`, basis: CMS_BASIS,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => ok(ctx, "list_sponsored_services", "services.read", { sponsoredServices: D.sponsoredServices[D.HUB_ID] }, { sources: src(`/v2/companies/${D.HUB_ID}/sponsoredservices`) }),
  },
  {
    name: "get_mailbox_subscriptions", domain: "Services and contacts", product: P, title: "Get mailbox subscriptions",
    description: "Get permitted messaging subscriptions for a hub mailbox.",
    operation: "services.read", kind: "read", binding: `GET ${B}/v2/mailboxes/{mailboxId}/mailboxsubscriptions`, basis: CMS_BASIS,
    inputSchema: s.obj({ mailbox_id: id("Mailbox ID.") }, ["mailbox_id"]),
    handler: (a, ctx) => { const m = (D.mailboxSubscriptions as any)[String(a.mailbox_id).toUpperCase()]; return m ? ok(ctx, "get_mailbox_subscriptions", "services.read", m, { sources: src(`/v2/mailboxes/${a.mailbox_id}/mailboxsubscriptions`) }) : deny(ctx, "get_mailbox_subscriptions", "services.read", `Mailbox ${a.mailbox_id} is not owned by the hub or does not exist.`); },
  },
  {
    name: "search_company_contacts", domain: "Services and contacts", product: P, title: "Search company contacts",
    description: "Find business, technical, service or support contacts for a permitted company. Personal fields are minimized; telephone is returned only by get_company_contact.",
    operation: "contacts.read", kind: "read", binding: `GET ${B}/v3/companies/{companyId}/pointofcontacts`, basis: CMS_BASIS,
    inputSchema: s.obj({ company: id("Company ID or name."), contact_type: s.str("BUSINESS_CONTACT, TECHNICAL_CONTACT, SERVICE_CONTACT or SUPPORT_CONTACT.") }, ["company"]),
    handler: (a, ctx) => {
      const r = co(ctx, "search_company_contacts", "contacts.read", a.company); if (r.early) return r.early;
      const rows = D.contacts.filter((p) => p.companyId === r.c.companyId && (!a.contact_type || eq(p.contactType, a.contact_type))).map((p) => ({ pointOfContactId: p.pointOfContactId, pointOfContactName: p.pointOfContactName, contactType: p.contactType, isDefaultPOC: p.isDefaultPOC, email: p.contactInformation.email, documentTypes: p.associatedEntities.docType, telephone: p.contactInformation.telephone, ...((p as any).responsibilities ? { responsibilities: (p as any).responsibilities } : {}) }));
      return ok(ctx, "search_company_contacts", "contacts.read", { companyId: r.c.companyId, contacts: rows }, { sources: src(`/v3/companies/${r.c.companyId}/pointofcontacts`), completeness: rows.length ? "COMPLETE" : "UNKNOWN", missingEvidence: rows.length ? [] : ["No contacts of the requested type are recorded."] });
    },
  },
  {
    name: "get_company_contact", domain: "Services and contacts", product: P, title: "Get company contact",
    description: "Get permitted contact details for one point of contact.",
    operation: "contacts.read", kind: "read", binding: `GET ${B}/v3/companies/{companyId}/pointofcontacts/{pocId}`, basis: CMS_BASIS,
    inputSchema: s.obj({ poc_id: id("Point of contact ID.") }, ["poc_id"]),
    handler: (a, ctx) => { const p = D.contacts.find((x) => eq(x.pointOfContactId, a.poc_id)); if (!p) return fail(ctx, "get_company_contact", "contacts.read", "NOT_FOUND", "Contact not found."); if (!scopeFilter(p.companyId)) return deny(ctx, "get_company_contact", "contacts.read", "Contact belongs to a company outside the grant."); return ok(ctx, "get_company_contact", "contacts.read", p, { sources: src(`/v3/companies/${p.companyId}/pointofcontacts/${p.pointOfContactId}`) }); },
  },
  {
    name: "get_relationship_contact_rules", domain: "Services and contacts", product: P, title: "Get relationship contact rules",
    description: "Get the hub's private-contact rules by document type and direction. Restricted read candidate.",
    operation: "contacts.read", kind: "read", binding: `GET ${B}/v3/companies/{companyId}/privateContacts`, basis: CMS_BASIS,
    inputSchema: s.obj({ document_type: s.str("Document type."), direction: s.str("SENDER or RECEIVER.") }),
    handler: (a, ctx) => ok(ctx, "get_relationship_contact_rules", "contacts.read", { tupleContactRules: D.privateContactRules[D.HUB_ID].tupleContactRules.filter((r) => (!a.document_type || eq(r.documentType, a.document_type)) && (!a.direction || eq(r.direction, a.direction))) }, { sources: src(`/v3/companies/${D.HUB_ID}/privateContacts`) }),
  },
  {
    name: "get_billing_profile", domain: "Services and contacts", product: P, title: "Get billing profile",
    description: "Get permitted billing-profile account context. Restricted; requires billing.read.",
    operation: "billing.read", kind: "read", binding: `GET ${B}/v3/companies/{companyId}/billingprofiles`, basis: CMS_BASIS,
    inputSchema: s.obj({ profile_id: id("Billing profile ID.") }),
    handler: (_a, ctx) => ok(ctx, "get_billing_profile", "billing.read", D.billingProfiles[D.HUB_ID], { sources: src(`/v3/companies/${D.HUB_ID}/billingprofiles`) }),
  },

  // ---------------- Invitations and workflow ----------------
  {
    name: "get_invitation", domain: "Invitations and workflow", product: P, title: "Get invitation",
    description: "Get an invitation's status, dates and inviting-company context by invitation ID or invitee company. Invitation codes are omitted.",
    operation: "workflow.read", kind: "read", binding: `GET ${B}/v3/invitations/{invitationId}; code lookup ${B}/v3/invitations`, basis: CMS_BASIS,
    inputSchema: s.obj({ invitation_id: s.int("Invitation ID."), company: id("Invitee company ID or name.") }),
    handler: (a, ctx) => {
      let inv = a.invitation_id ? D.invitations.find((i) => i.invitationId === Number(a.invitation_id)) : undefined;
      if (!inv && a.company) { const r = co(ctx, "get_invitation", "workflow.read", a.company); if (r.early) return r.early; inv = D.invitations.find((i) => i._companyId === r.c.companyId); }
      if (!inv) return fail(ctx, "get_invitation", "workflow.read", "NOT_FOUND", "No invitation found.");
      return ok(ctx, "get_invitation", "workflow.read", { ...strip(inv), inviteeCompanyId: inv._companyId, workflowTemplateId: inv._workflowTemplateId }, { sources: src(`/v3/invitations/${inv.invitationId}`, [String(inv.invitationId)]), interpretation: "Invitation status does not establish partner readiness." });
    },
  },
  {
    name: "get_user_invitation", domain: "Invitations and workflow", product: P, title: "Get user invitation",
    description: "Get a hub user invitation's status. Personal context is restricted.",
    operation: "workflow.read", kind: "read", binding: `GET ${B}/v2/companies/{companyId}/userinvitations/{invitationId}`, basis: CMS_BASIS,
    inputSchema: s.obj({ invitation_id: s.int("User invitation ID.") }, ["invitation_id"]),
    handler: (a, ctx) => { const u = D.userInvitations[D.HUB_ID].find((i) => i.invitationId === Number(a.invitation_id)); return u ? ok(ctx, "get_user_invitation", "workflow.read", u, { sources: src(`/v2/companies/${D.HUB_ID}/userinvitations/${u.invitationId}`) }) : fail(ctx, "get_user_invitation", "workflow.read", "NOT_FOUND", "User invitation not found."); },
  },
  {
    name: "search_registration_requests", domain: "Invitations and workflow", product: P, title: "Search registration requests",
    description: "Find company registration requests by company or status. Request content is masked.",
    operation: "workflow.read", kind: "read", binding: `GET ${B}/v3/cpsregistrations`, basis: CMS_BASIS,
    inputSchema: s.obj({ company: id("Company ID or name."), status: s.str("Request status.") }),
    handler: (a, ctx) => {
      let cid: string | null = null;
      if (a.company) { const r = co(ctx, "search_registration_requests", "workflow.read", a.company); if (r.early) return r.early; cid = r.c.companyId; }
      return ok(ctx, "search_registration_requests", "workflow.read", { registrations: D.registrations.filter((x) => (!cid || x.company.id === cid) && (!a.status || eq(x.request.status, a.status))) }, { sources: src("/v3/cpsregistrations"), notes: ["Pagination and completeness of this source require validation."] });
    },
  },
  {
    name: "get_registration_request", domain: "Invitations and workflow", product: P, title: "Get registration request",
    description: "Get one registration request with workflow and resulting object references.",
    operation: "workflow.read", kind: "read", binding: `GET ${B}/v3/cpsregistrations/{requestId}`, basis: CMS_BASIS,
    inputSchema: s.obj({ request_id: s.int("Registration request ID.") }, ["request_id"]),
    handler: (a, ctx) => { const x = D.registrations.find((r) => r.requestId === Number(a.request_id)); return x ? ok(ctx, "get_registration_request", "workflow.read", x, { sources: src(`/v3/cpsregistrations/${x.requestId}`) }) : fail(ctx, "get_registration_request", "workflow.read", "NOT_FOUND", "Registration request not found."); },
  },
  {
    name: "search_process_instances", domain: "Invitations and workflow", product: P, title: "Search process instances",
    description: "Find BPM workflow process instances for a registration request.",
    operation: "workflow.read", kind: "read", binding: `GET ${B}/v3/bpmProcessInstances`, basis: CMS_BASIS,
    inputSchema: s.obj({ request_id: s.int("Registration request ID.") }),
    handler: (a, ctx) => ok(ctx, "search_process_instances", "workflow.read", { processInstances: D.processInstances.filter((p) => !a.request_id || p.requestId === Number(a.request_id)) }, { sources: src("/v3/bpmProcessInstances"), interpretation: "Process status describes workflow state, not business readiness." }),
  },
  {
    name: "get_process_instance", domain: "Invitations and workflow", product: P, title: "Get process instance",
    description: "Get one process instance's activity, status and timestamps.",
    operation: "workflow.read", kind: "read", binding: `GET ${B}/v3/bpmProcessInstances/{piUniqueId}`, basis: CMS_BASIS,
    inputSchema: s.obj({ pi_unique_id: s.int("Process instance unique ID.") }, ["pi_unique_id"]),
    handler: (a, ctx) => { const p = D.processInstances.find((x) => x.piUniqueId === Number(a.pi_unique_id)); return p ? ok(ctx, "get_process_instance", "workflow.read", p, { sources: src(`/v3/bpmProcessInstances/${p.piUniqueId}`) }) : fail(ctx, "get_process_instance", "workflow.read", "NOT_FOUND", "Process instance not found."); },
  },
  {
    name: "list_workflow_templates", domain: "Invitations and workflow", product: P, title: "List workflow templates",
    description: "List the hub's workflow template metadata.",
    operation: "workflow.read", kind: "read", binding: `GET ${B}/v3/workflowTemplates`, basis: CMS_BASIS,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => ok(ctx, "list_workflow_templates", "workflow.read", { workflowTemplates: D.workflowTemplates.map((w) => ({ workflowTemplateId: w.workflowTemplateId, name: w.template.name, type: w.template.type, invitationIds: w.invitationId, modifiedDate: w.modifiedDate })) }, { sources: src("/v3/workflowTemplates") }),
  },
  {
    name: "get_workflow_template", domain: "Invitations and workflow", product: P, title: "Get workflow template",
    description: "Get a workflow template definition.",
    operation: "workflow.read", kind: "read", binding: `GET ${B}/v3/workflowTemplates/{workflowTemplateId}`, basis: CMS_BASIS,
    inputSchema: s.obj({ workflow_template_id: s.int("Workflow template ID.") }, ["workflow_template_id"]),
    handler: (a, ctx) => { const w = D.workflowTemplates.find((x) => x.workflowTemplateId === Number(a.workflow_template_id)); return w ? ok(ctx, "get_workflow_template", "workflow.read", w, { sources: src(`/v3/workflowTemplates/${w.workflowTemplateId}`) }) : fail(ctx, "get_workflow_template", "workflow.read", "NOT_FOUND", "Workflow template not found."); },
  },
];

export { brief };
