// Mapping knowledge and cross-reference tools (Trading Grid Cartographer).
import { UPC_INCIDENT } from "../data/world.js";
import * as O from "../data/other.js";
import { ok, fail, deny, createPlan, approvalRequired, consumePlan, Ctx } from "../runtime.js";
import { ToolDef, s, MODELED, NEW_CONTRACT } from "./types.js";
import { companyById } from "../data/cms.js";
import { eq, contains } from "../util.js";

const P = "Trading Grid Cartographer";
const M = "/cartographer/mp/v1/solutions";
const X = `/cartographer/xref/v1/solutions/${O.CARTO_SOLUTION}`;
const src = (op: string, ids?: string[]) => [{ product: P, operation: op, objectIds: ids }];

function solutionCheck(ctx: Ctx, tool: string, op: string, sol?: string) {
  if (sol && !eq(sol, O.CARTO_SOLUTION)) return deny(ctx, tool, op, `Mapping solution ${sol} is not in the grant.`);
  return null;
}

function findMap(v: string) {
  return O.maps.find((m) => eq(m.mapId, v) || eq(m.mapName, v));
}

const mapRow = (m: any) => ({ mapId: m.mapId, mapName: m.mapName, version: m.version, status: m.status, direction: m.direction, owner: m.owner, sourceFormat: m.metadata.sourceFormat, targetFormat: m.metadata.targetFormat, prodMap: m.metadata.prodMap, lastModifiedOn: m.metadata.lifecycleInfo.lastModifiedOn, partners: m.partners.map((p: string) => companyById(p)!.companyName) });

export function glnValid(g: string) {
  if (!/^\d{13}$/.test(g)) return false;
  const d = g.split("").map(Number);
  const sum = d.slice(0, 12).reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === d[12];
}

const mapArg = { map: s.str("Map ID (M-...) or map name.") };

export const cartographerTools: ToolDef[] = [
  {
    name: "list_mapping_solutions", domain: "Mapping knowledge", product: P, title: "List mapping solutions",
    description: "List mapping solutions available in the caller's scope.",
    operation: "map.read", kind: "read", binding: `GET ${M}`, basis: MODELED,
    inputSchema: s.obj({}),
    handler: (_a, ctx) => ok(ctx, "list_mapping_solutions", "map.read", { solutions: O.mappingSolutions }, { sources: src(`GET ${M}`) }),
  },
  {
    name: "list_maps", domain: "Mapping knowledge", product: P, title: "List maps",
    description: "List map metadata in a mapping solution with optional filters for status, direction, partner, document text and recent modification. Default page size 50.",
    operation: "map.read", kind: "read", binding: `GET ${M}/{solutionId}/maps`, basis: MODELED,
    inputSchema: s.obj({ solution_id: s.str("Mapping solution ID (default CARTO-HRG-01)."), status: s.str("ACTIVE, IN_TEST or RETIRED."), direction: s.str("INBOUND or OUTBOUND."), partner: s.str("Partner name fragment."), text: s.str("Text in map name or formats, e.g. 856 or EDIFACT."), modified_within_days: s.int("Only maps modified in the last N days."), page_no: s.int("Page number (default 1)."), page_size: s.int("Page size (default 50).") }),
    handler: (a, ctx) => {
      const d = solutionCheck(ctx, "list_maps", "map.read", a.solution_id); if (d) return d;
      const cutoff = a.modified_within_days ? Date.now() - a.modified_within_days * 86400_000 : 0;
      const rows = O.maps.filter((m) => (!a.status || eq(m.status, a.status)) && (!a.direction || eq(m.direction, a.direction)) && (!a.partner || m.partners.some((p) => contains(companyById(p)!.companyName, a.partner))) && (!a.text || contains(`${m.mapName} ${m.metadata.sourceFormat} ${m.metadata.targetFormat}`, a.text)) && Date.parse(m.metadata.lifecycleInfo.lastModifiedOn) >= cutoff).map(mapRow);
      const size = a.page_size ?? 50, no = a.page_no ?? 1;
      const byStatus = rows.reduce((acc: any, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {});
      return ok(ctx, "list_maps", "map.read", { solutionId: O.CARTO_SOLUTION, countsByStatus: byStatus, maps: rows.slice((no - 1) * size, no * size) }, { sources: src(`GET ${M}/${O.CARTO_SOLUTION}/maps`), pagination: { total: rows.length, pageNo: no, pageSize: size } });
    },
  },
  {
    name: "list_map_partners", domain: "Mapping knowledge", product: P, title: "List map partners",
    description: "List source trading-partner associations for a map.",
    operation: "map.read", kind: "read", binding: `GET ${M}/{solutionId}/maps/{mapId}/trading-partners`, basis: MODELED,
    inputSchema: s.obj(mapArg, ["map"]),
    handler: (a, ctx) => { const m = findMap(a.map); return m ? ok(ctx, "list_map_partners", "map.read", { mapId: m.mapId, mapName: m.mapName, tradingPartners: m.partners.map((p) => ({ companyId: p, companyName: companyById(p)!.companyName })) }, { sources: src(`GET ${M}/${O.CARTO_SOLUTION}/maps/${m.mapId}/trading-partners`) }) : fail(ctx, "list_map_partners", "map.read", "NOT_FOUND", "Map not found in permitted solution."); },
  },
  {
    name: "get_map_specification", domain: "Mapping knowledge", product: P, title: "Get map specification",
    description: "List specification file descriptors attached to a map.",
    operation: "map.read", kind: "read", binding: `GET ${M}/{solutionId}/maps/{mapId}/specifications`, basis: MODELED,
    inputSchema: s.obj(mapArg, ["map"]),
    handler: (a, ctx) => { const m = findMap(a.map); if (!m) return fail(ctx, "get_map_specification", "map.read", "NOT_FOUND", "Map not found."); const f = O.mapSpecifications[m.mapId] ?? []; return ok(ctx, "get_map_specification", "map.read", { mapId: m.mapId, mapName: m.mapName, specifications: f }, { sources: src(`GET ${M}/${O.CARTO_SOLUTION}/maps/${m.mapId}/specifications`), completeness: f.length ? "COMPLETE" : "UNKNOWN", missingEvidence: f.length ? [] : ["No specification files attached."] }); },
  },
  {
    name: "get_map_specification_file", domain: "Mapping knowledge", product: P, title: "Get map specification file",
    description: "Get an approved specification file's content excerpt.",
    operation: "map.read", kind: "read", binding: `GET ${M}/{solutionId}/maps/{mapId}/specifications/{fileId}`, basis: MODELED,
    inputSchema: s.obj({ ...mapArg, file_id: s.str("Specification file ID.") }, ["map", "file_id"]),
    handler: (a, ctx) => { const m = findMap(a.map); const f = m && (O.mapSpecifications[m.mapId] ?? []).find((x) => eq(x.fileId, a.file_id)); return f ? ok(ctx, "get_map_specification_file", "map.read", { ...f, contentExcerpt: O.specFileContent[f.fileId] }, { sources: src(`GET ${M}/${O.CARTO_SOLUTION}/maps/${m!.mapId}/specifications/${f.fileId}`) }) : fail(ctx, "get_map_specification_file", "map.read", "NOT_FOUND", "Specification file not found."); },
  },
  {
    name: "get_map_metadata", domain: "Mapping knowledge", product: P, title: "Get map metadata",
    description: "Get a map's formats, version, direction, status, production flag, acceptance state, lookups and lifecycle. Metadata is not proof of a particular transaction's execution.",
    operation: "map.read", kind: "read", binding: `GET ${M}/{solutionId}/maps/{mapId}/metadata`, basis: MODELED,
    inputSchema: s.obj(mapArg, ["map"]),
    handler: (a, ctx) => { const m = findMap(a.map); return m ? ok(ctx, "get_map_metadata", "map.read", { mapInfo: { mapId: m.mapId, mapName: m.mapName, status: m.status, version: m.version, owner: m.owner, translator: m.translator }, metadata: m.metadata }, { sources: src(`GET ${M}/${O.CARTO_SOLUTION}/maps/${m.mapId}/metadata`, [m.mapId]) }) : fail(ctx, "get_map_metadata", "map.read", "NOT_FOUND", "Map not found in permitted solution."); },
  },
  {
    name: "get_map_annotations", domain: "Mapping knowledge", product: P, title: "Get map annotations",
    description: "Get entitled comments, replies and attachment references on a map, including deployment, promotion and work-order comments.",
    operation: "map.read", kind: "read", binding: `GET ${M}/{solutionId}/maps/{mapId}/annotations`, basis: MODELED,
    inputSchema: s.obj(mapArg, ["map"]),
    handler: (a, ctx) => { const m = findMap(a.map); return m ? ok(ctx, "get_map_annotations", "map.read", { mapId: m.mapId, mapName: m.mapName, annotations: O.mapAnnotations[m.mapId] ?? [] }, { sources: src(`GET ${M}/${O.CARTO_SOLUTION}/maps/${m.mapId}/annotations`) }) : fail(ctx, "get_map_annotations", "map.read", "NOT_FOUND", "Map not found."); },
  },

  // ---------------- Cross-reference ----------------
  {
    name: "list_cross_reference_entities", domain: "Cross-reference configuration", product: P, title: "List cross-reference entities",
    description: "List cross-reference entities in the mapping solution, with entry counts.",
    operation: "xref.read", kind: "read", binding: `GET ${X}/entities`, basis: MODELED,
    inputSchema: s.obj({ offset: s.int("Offset."), count: s.int("Count.") }),
    handler: (_a, ctx) => ok(ctx, "list_cross_reference_entities", "xref.read", { entities: Object.values(O.xrefEntities).map((e) => ({ entityName: e.entityName, description: e.description, keyColumn: e.keyColumn, entryCount: Object.keys(e.entries).length, lastModifiedOn: e.lastModifiedOn })), prexref: { entityName: O.prexref.entityName, profileCount: O.prexref.entries.length } }, { sources: src(`GET ${X}/entities`) }),
  },
  {
    name: "get_cross_reference_entity", domain: "Cross-reference configuration", product: P, title: "Get cross-reference entity",
    description: "Get an entity's content with counts and paging, or the pre-translation routing profiles when prexref is true.",
    operation: "xref.read", kind: "read", binding: `GET ${X}/entities/{entityName}/content; GET ${X}/prexref/content`, basis: MODELED,
    inputSchema: s.obj({ entity: s.str("Entity name, e.g. STORE_TO_GLN."), prexref: s.bool("Return pre-translation routing profiles instead."), offset: s.int("Offset."), count: s.int("Count (default 50).") }),
    handler: (a, ctx) => {
      if (a.prexref) return ok(ctx, "get_cross_reference_entity", "xref.read", O.prexref, { sources: src(`GET ${X}/prexref/content`) });
      const e = O.xrefEntities[String(a.entity ?? "").toUpperCase()];
      if (!e) return fail(ctx, "get_cross_reference_entity", "xref.read", "NOT_FOUND", "Entity not found.");
      const rows = Object.entries(e.entries).map(([k, v]: any) => ({ [e.keyColumn]: k, ...v }));
      const off = a.offset ?? 0, cnt = a.count ?? 50;
      return ok(ctx, "get_cross_reference_entity", "xref.read", { entityName: e.entityName, keyColumn: e.keyColumn, columns: e.columns, totalCount: rows.length, entries: rows.slice(off, off + cnt), state: e.state }, { sources: src(`GET ${X}/entities/${e.entityName}/content`) });
    },
  },
  {
    name: "get_cross_reference_entry", domain: "Cross-reference configuration", product: P, title: "Get cross-reference entry",
    description: "Look up one key in a cross-reference entity.",
    operation: "xref.read", kind: "read", binding: `GET ${X}/entities/{entityName}/entries/{key}`, basis: MODELED,
    inputSchema: s.obj({ entity: s.str("Entity name."), key: s.str("Key value.") }, ["entity", "key"]),
    handler: (a, ctx) => {
      const e = O.xrefEntities[String(a.entity).toUpperCase()];
      if (!e) return fail(ctx, "get_cross_reference_entry", "xref.read", "NOT_FOUND", "Entity not found.");
      const v = e.entries[a.key];
      return v ? ok(ctx, "get_cross_reference_entry", "xref.read", { entityName: e.entityName, key: a.key, values: v }, { sources: src(`GET ${X}/entities/${e.entityName}/entries/${a.key}`) })
        : fail(ctx, "get_cross_reference_entry", "xref.read", "KEY_NOT_FOUND", `Key '${a.key}' is not present in ${e.entityName}.`, { nextAction: "Prepare an ADD change with prepare_cross_reference_change if the key should exist." });
    },
  },
  {
    name: "get_cross_reference_header", domain: "Cross-reference configuration", product: P, title: "Get cross-reference header",
    description: "Get supported column and header configuration for an entity. Documented only for TG16 and AICS solutions.",
    operation: "xref.read", kind: "read", binding: `GET ${X}/entities/{entityName}/header-config`, basis: MODELED,
    inputSchema: s.obj({ entity: s.str("Entity name.") }, ["entity"]),
    handler: (a, ctx) => fail(ctx, "get_cross_reference_header", "xref.read", "UNSUPPORTED_OPERATION", "Header configuration is documented only for TG16 and AICS solutions. This solution uses the standard column set.", { columns: O.xrefEntities[String(a.entity).toUpperCase()]?.columns ?? null }),
  },
  {
    name: "search_cross_reference_entries", domain: "Cross-reference configuration", product: P, title: "Search cross-reference entries",
    description: "Search entries in an entity, or prexref profiles, by token. Optionally return only the count.",
    operation: "xref.read", kind: "read", binding: `GET ${X}/entities/{entityName}/content-search; GET ${X}/prexref/content-search`, basis: MODELED,
    inputSchema: s.obj({ entity: s.str("Entity name."), prexref: s.bool("Search prexref profiles."), search_token: s.str("Search token."), only_count: s.bool("Return count only.") }, ["search_token"]),
    handler: (a, ctx) => {
      const tok = String(a.search_token);
      let rows: any[];
      if (a.prexref) rows = O.prexref.entries.filter((p) => JSON.stringify(p).toLowerCase().includes(tok.toLowerCase()));
      else { const e = O.xrefEntities[String(a.entity ?? "").toUpperCase()]; if (!e) return fail(ctx, "search_cross_reference_entries", "xref.read", "NOT_FOUND", "Entity not found."); rows = Object.entries(e.entries).filter(([k, v]) => `${k} ${JSON.stringify(v)}`.toLowerCase().includes(tok.toLowerCase())).map(([k, v]: any) => ({ [e.keyColumn]: k, ...v })); }
      return ok(ctx, "search_cross_reference_entries", "xref.read", a.only_count ? { count: rows.length } : { count: rows.length, matches: rows }, { sources: src(a.prexref ? `GET ${X}/prexref/content-search` : `GET ${X}/entities/${a.entity}/content-search`) });
    },
  },
  {
    name: "export_cross_reference_entries", domain: "Cross-reference configuration", product: P, title: "Export cross-reference entries",
    description: "Export an entity as an authorized artifact. Prexref export is unsupported.",
    operation: "xref.export", kind: "job", binding: `GET ${X}/entities/{entityName}/export`, basis: MODELED,
    inputSchema: s.obj({ entity: s.str("Entity name."), prexref: s.bool("Export prexref (unsupported).") }),
    handler: (a, ctx) => {
      if (a.prexref) return fail(ctx, "export_cross_reference_entries", "xref.export", "UNSUPPORTED_OPERATION", "Prexref export is not supported by the source.");
      const e = O.xrefEntities[String(a.entity ?? "").toUpperCase()];
      if (!e) return fail(ctx, "export_cross_reference_entries", "xref.export", "NOT_FOUND", "Entity not found.");
      return ok(ctx, "export_cross_reference_entries", "xref.export", { entityName: e.entityName, format: "CSV", rows: Object.keys(e.entries).length, artifact: { url: `${ctx.baseUrl}/api/xref-export/${e.entityName}`, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() } }, { sources: src(`GET ${X}/entities/${e.entityName}/export`) });
    },
  },
  {
    name: "prepare_cross_reference_change", domain: "Cross-reference configuration", product: P, title: "Prepare cross-reference change",
    description: "Prepare and validate an ADD, UPDATE or DELETE of one cross-reference entry. Returns a before/after plan that requires approval. Makes no change.",
    operation: "xref.write", kind: "prepare", binding: "New preparation contract over scoped source reads", basis: NEW_CONTRACT,
    inputSchema: s.obj({ entity: s.str("Entity name."), change: s.str("ADD, UPDATE or DELETE.", { enum: ["ADD", "UPDATE", "DELETE"] }), key: s.str("Key value."), values: s.any("Column values for ADD or UPDATE, e.g. {gln, locationName, locationType, active}."), reason: s.str("Business reason.") }, ["entity", "change", "key"]),
    handler: (a, ctx) => {
      const e = O.xrefEntities[String(a.entity).toUpperCase()];
      if (!e) return fail(ctx, "prepare_cross_reference_change", "xref.write", "NOT_FOUND", "Entity not found.");
      const before = e.entries[a.key] ?? null;
      const checks: any[] = [];
      const change = String(a.change).toUpperCase();
      if (change === "ADD" && before) checks.push({ check: "Key does not already exist", result: "FAIL" });
      if (change !== "ADD" && !before) checks.push({ check: "Key exists", result: "FAIL" });
      const after = change === "DELETE" ? null : { ...(before ?? {}), ...(a.values ?? {}) };
      if (after && e.entityName === "STORE_TO_GLN") {
        const missing = e.columns.filter((c: string) => after[c] == null);
        checks.push({ check: "Required columns present", result: missing.length ? "FAIL" : "PASS", detail: missing.length ? `Missing: ${missing.join(", ")}` : undefined });
        checks.push({ check: "GLN is 13 digits with valid GS1 check digit", result: glnValid(String(after.gln ?? "")) ? "PASS" : "FAIL" });
        const dup = Object.entries(e.entries).find(([k, v]: any) => k !== a.key && v.gln === after.gln);
        checks.push({ check: "GLN not assigned to another key", result: dup ? "FAIL" : "PASS", detail: dup ? `Already used by ${dup[0]}` : undefined });
      }
      checks.push({ check: "Entity not reserved by another user", result: e.state.reserved ? "FAIL" : "PASS" });
      const valid = !checks.some((c) => c.result === "FAIL");
      if (!valid) return fail(ctx, "prepare_cross_reference_change", "xref.write", "VALIDATION_FAILED", "The change did not pass validation. No plan was created.", { checks, before, after });
      const p = createPlan(ctx, "apply_cross_reference_change", "xref.write", `${e.entityName}[${a.key}]`, `${change} ${e.entityName} key ${a.key}${a.reason ? ` (${a.reason})` : ""}`, { entity: e.entityName, change, key: a.key, before, after }, { valid, checks });
      return approvalRequired(ctx, "prepare_cross_reference_change", "xref.write", p, src(`GET ${X}/entities/${e.entityName}/entries/${a.key}`));
    },
  },
  {
    name: "apply_cross_reference_change", domain: "Cross-reference configuration", product: P, title: "Apply cross-reference change",
    description: "Apply an approved cross-reference plan: rechecks access, reserves the entity, writes the entry, releases the reservation and returns a verified readback.",
    operation: "xref.write", kind: "write", binding: `PATCH ${X}/entities/{entityName}/state; POST/PUT/DELETE ${X}/entities/{entityName}/entries`, basis: MODELED,
    inputSchema: s.obj({ plan_id: s.str("Approved plan ID.") }, ["plan_id"]),
    handler: (a, ctx) => {
      const c = consumePlan(ctx, a.plan_id, "apply_cross_reference_change");
      if (c.problem) return fail(ctx, "apply_cross_reference_change", "xref.write", c.plan?.status === "PENDING_APPROVAL" ? "APPROVAL_PENDING" : "PLAN_INVALID", c.problem);
      const p = c.plan!.parameters;
      const e = O.xrefEntities[p.entity];
      const current = e.entries[p.key] ?? null;
      if (JSON.stringify(current) !== JSON.stringify(p.before)) { c.plan!.status = "EXPIRED"; return fail(ctx, "apply_cross_reference_change", "xref.write", "CONFLICT", "The entry changed after the plan was prepared. Prepare a new plan."); }
      e.state = { reserved: true, reservedBy: c.plan!.principal };
      if (p.change === "DELETE") delete e.entries[p.key]; else e.entries[p.key] = p.after;
      if (e.entityName === "ITEM_UPC_TO_SKU" && p.key === UPC_INCIDENT.upc) UPC_INCIDENT.fixedAt = p.change === "DELETE" ? null : Date.now();
      e.lastModifiedOn = new Date().toISOString(); e.lastModifiedBy = c.plan!.principal;
      e.state = { reserved: false, reservedBy: null };
      c.plan!.status = "EXECUTED";
      const readback = e.entries[p.key] ?? null;
      c.plan!.executionResult = { readback };
      return ok(ctx, "apply_cross_reference_change", "xref.write", { planId: c.plan!.planId, writeResult: "APPLIED", entity: p.entity, key: p.key, readback, verified: JSON.stringify(readback) === JSON.stringify(p.after), sourceOperations: [`PATCH ${X}/entities/${p.entity}/state (reserve)`, `${p.change === "ADD" ? "POST" : p.change === "UPDATE" ? "PUT" : "DELETE"} ${X}/entities/${p.entity}/entries${p.change === "ADD" ? "" : `/${p.key}`}`, `PATCH ${X}/entities/${p.entity}/state (release)`, `GET ${X}/entities/${p.entity}/entries/${p.key} (readback)`] }, {
        sources: src(`GET ${X}/entities/${p.entity}/entries/${p.key}`), interpretation: "Entry written and verified. Documents that already failed are not reprocessed automatically; the partner must resend or the document must be reprocessed.",
      });
    },
  },
];
