// Catalog discovery, queries and delivery tools (Trading Grid Data Explorer over Trading Grid Data Platform).
import * as O from "../data/other.js";
import { transactions } from "../data/insights.js";
import { partnerDirectory, messagingTuples, companyById } from "../data/cms.js";
import { ok, fail, createPlan, approvalRequired, consumePlan, scopeFilter, GRANT, Ctx } from "../runtime.js";
import { ToolDef, s, NEW_CONTRACT } from "./types.js";
import { isoWeekStart, eq } from "../util.js";
import { randomUUID } from "node:crypto";

const P = "Trading Grid Data Explorer";
const src = (op: string, ids?: string[]) => [{ product: `${P} (catalog: Trading Grid Data Platform)`, operation: op, objectIds: ids }];

export const queries = new Map<string, any>();
export const exports = new Map<string, any>();

function product(ctx: Ctx, tool: string, op: string, id: string, version?: string) {
  const p = O.dataProducts.find((d) => eq(d.productId, id) || eq(d.name, id));
  if (!p) return { early: fail(ctx, tool, op, "NOT_FOUND", `Data product '${id}' is not in the entitled catalog.`) };
  if (!GRANT.dataProducts.includes(p.productId)) return { early: fail(ctx, tool, op, "ACCESS_DENIED", "Product not entitled.") };
  if (version && version !== p.version) return { early: fail(ctx, tool, op, "VERSION_UNAVAILABLE", `Version ${version} is not available. Current version is ${p.version}.`) };
  return { p };
}

function rowsFor(productId: string): any[] {
  if (productId === "tgdp.transaction_activity") {
    return transactions.filter((t) => t.environment === "PRODUCTION" && scopeFilter(t.partnerCompanyId)).map((t) => ({
      transaction_id: t.transactionId, received_at: t.receivedAt, week: isoWeekStart(t.receivedAt), partner_company_id: t.partnerCompanyId,
      partner_name: companyById(t.partnerCompanyId)!.companyName, document_type: t.documentType, direction: t.direction, status: t.sourceStatus, document_count: t.documentCount,
    }));
  }
  if (productId === "tgdp.partner_directory") return partnerDirectory.map((p) => ({ bpr_id: p.bprId, partner_company_id: p.partnerCompanyId, partner_name: p.partnerCompanyName, status: p.partnerShipStatus, activation_date: p.partnerShipActivationDate?.slice(0, 10) ?? null }));
  if (productId === "tgdp.relationship_network") return messagingTuples.map((t: any) => ({ tpr_id: t._tprId, partner_company_id: t._partnerCompanyId, partner_name: companyById(t._partnerCompanyId)!.companyName, document_type: t.docType, direction: t.direction, status: t._status }));
  if (productId === "tgdp.ccim_integration_events") return O.ccimEvents;
  return [];
}

const OPS: Record<string, (a: any, b: any) => boolean> = {
  eq: (a, b) => String(a).toLowerCase() === String(b).toLowerCase(), neq: (a, b) => String(a).toLowerCase() !== String(b).toLowerCase(),
  in: (a, b) => (Array.isArray(b) ? b : [b]).map((x) => String(x).toLowerCase()).includes(String(a).toLowerCase()),
  gte: (a, b) => String(a) >= String(b), lte: (a, b) => String(a) <= String(b), contains: (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
};

function runQuery(p: any, a: any) {
  const fields = p.fields.map((f: any) => f[0]);
  const bad = [...(a.filters ?? []).map((f: any) => f.field), ...(a.group_by ?? []), ...(a.fields ?? [])].filter((f) => !fields.includes(f));
  if (bad.length) return { error: `Unknown field(s): ${[...new Set(bad)].join(", ")}. Use get_data_product_schema.` };
  let rows = rowsFor(p.productId);
  for (const f of a.filters ?? []) { const op = OPS[f.op ?? "eq"]; if (!op) return { error: `Unsupported operator ${f.op}.` }; rows = rows.filter((r) => op(r[f.field], f.value)); }
  if (a.join_product) {
    const j = p.joins.find((x: any) => eq(x.product, a.join_product));
    if (!j?.supported) return { error: `Join with ${a.join_product} is not a supported contract for ${p.productId}.` };
    const dir = new Map(rowsFor(a.join_product).map((r) => [r.partner_company_id, r]));
    rows = rows.map((r) => ({ ...r, [`${a.join_product.split(".")[1]}_status`]: dir.get(r.partner_company_id)?.status ?? null }));
  }
  if (a.group_by?.length || a.measures?.length) {
    const g: string[] = a.group_by ?? [];
    const ms: any[] = a.measures?.length ? a.measures : [{ fn: "count" }];
    const m = new Map<string, any>();
    for (const r of rows) {
      const k = g.map((x) => r[x]).join("\u0001");
      const cur = m.get(k) ?? { ...Object.fromEntries(g.map((x) => [x, r[x]])), ...Object.fromEntries(ms.map((x) => [x.as ?? (x.fn === "count" ? "count" : `${x.fn}_${x.field}`), 0])) };
      for (const x of ms) { const key = x.as ?? (x.fn === "count" ? "count" : `${x.fn}_${x.field}`); cur[key] += x.fn === "count" ? 1 : Number(r[x.field] ?? 0); }
      m.set(k, cur);
    }
    rows = [...m.values()];
  } else if (a.fields?.length) rows = rows.map((r) => Object.fromEntries(a.fields.map((f: string) => [f, r[f]])));
  if (a.order_by?.field) { const d = a.order_by.direction === "asc" ? 1 : -1; rows.sort((x, y) => (x[a.order_by.field] > y[a.order_by.field] ? d : -d)); }
  return { rows: rows.slice(0, Math.min(a.limit ?? 500, 2000)), total: rows.length };
}

const PID = { product_id: s.str("Data product ID, e.g. tgdp.transaction_activity."), version: s.str("Product version (default current).") };
const FILTERS = s.arr(s.obj({ field: s.str("Field name."), op: s.str("eq, neq, in, gte, lte or contains."), value: s.any("Value or list.") as any }, ["field", "value"]), "Filters.");
FILTERS.items.properties.value = { description: "Value or list of values." } as any;

export const tgdpTools: ToolDef[] = [
  {
    name: "list_data_products", domain: "Catalog and queries", product: P, title: "List data products",
    description: "List entitled cataloged data products with ID, version, coverage and supported operations.",
    operation: "dataproduct.read", kind: "read", binding: "Catalog-backed discovery", basis: NEW_CONTRACT,
    inputSchema: s.obj({ search: s.str("Search terms.") }),
    handler: (a, ctx) => ok(ctx, "list_data_products", "dataproduct.read", { products: O.dataProducts.filter((p) => GRANT.dataProducts.includes(p.productId) && (!a.search || `${p.name} ${p.description}`.toLowerCase().includes(String(a.search).toLowerCase()))).map((p) => ({ productId: p.productId, version: p.version, name: p.name, status: p.status, description: p.description, coverage: p.coverage, supportedOperations: p.supportedOperations, unsupportedOperations: p.unsupportedOperations })) }, { sources: src("Catalog discovery") }),
  },
  {
    name: "get_data_product", domain: "Catalog and queries", product: P, title: "Get data product",
    description: "Get a data product's definition, coverage, freshness commitment and access conditions.",
    operation: "dataproduct.read", kind: "read", binding: "Catalog contract", basis: NEW_CONTRACT,
    inputSchema: s.obj(PID, ["product_id"]),
    handler: (a, ctx) => { const r = product(ctx, "get_data_product", "dataproduct.read", a.product_id, a.version); if (r.early) return r.early; const { fields, quality, lineage, ...def } = r.p as any; return ok(ctx, "get_data_product", "dataproduct.read", { ...def, accessConditions: { organization: GRANT.organization, buids: GRANT.buids, rowFilter: "Rows limited to the hub and its permitted partners." } }, { sources: src(`Catalog ${r.p.productId}@${r.p.version}`) }); },
  },
  {
    name: "get_data_product_schema", domain: "Catalog and queries", product: P, title: "Get data product schema",
    description: "Get a versioned product schema: fields, types, keys, measures and supported joins. No cross-product joins are guessed.",
    operation: "dataproduct.read", kind: "read", binding: "Versioned product schema", basis: NEW_CONTRACT,
    inputSchema: s.obj(PID, ["product_id"]),
    handler: (a, ctx) => { const r = product(ctx, "get_data_product_schema", "dataproduct.read", a.product_id, a.version); if (r.early) return r.early; return ok(ctx, "get_data_product_schema", "dataproduct.read", { productId: r.p.productId, version: r.p.version, keys: r.p.keys, fields: r.p.fields.map(([name, type, description]: any) => ({ name, type, description })), measures: ["count", "sum(document_count)"], joins: r.p.joins }, { sources: src(`Schema ${r.p.productId}@${r.p.version}`) }); },
  },
  {
    name: "get_data_product_quality", domain: "Catalog and queries", product: P, title: "Get data product quality",
    description: "Get quality results and freshness observations. Reports unavailable when no quality evidence is supplied.",
    operation: "dataproduct.read", kind: "read", binding: "Product quality contract", basis: NEW_CONTRACT,
    inputSchema: s.obj(PID, ["product_id"]),
    handler: (a, ctx) => { const r = product(ctx, "get_data_product_quality", "dataproduct.read", a.product_id); if (r.early) return r.early; return r.p.quality ? ok(ctx, "get_data_product_quality", "dataproduct.read", { productId: r.p.productId, freshness: r.p.freshness, checks: r.p.quality }, { sources: src(`Quality ${r.p.productId}`) }) : ok(ctx, "get_data_product_quality", "dataproduct.read", { productId: r.p.productId, qualityEvidence: "UNAVAILABLE", freshness: r.p.freshness }, { sources: src(`Quality ${r.p.productId}`), completeness: "UNKNOWN", missingEvidence: ["No quality evidence supplied for this preview product."] }); },
  },
  {
    name: "get_data_product_lineage", domain: "Catalog and queries", product: P, title: "Get data product lineage",
    description: "Get permitted source and transformation lineage for a product.",
    operation: "dataproduct.read", kind: "read", binding: "Catalog lineage contract", basis: NEW_CONTRACT,
    inputSchema: s.obj(PID, ["product_id"]),
    handler: (a, ctx) => { const r = product(ctx, "get_data_product_lineage", "dataproduct.read", a.product_id); if (r.early) return r.early; return ok(ctx, "get_data_product_lineage", "dataproduct.read", { productId: r.p.productId, lineage: r.p.lineage }, { sources: src(`Lineage ${r.p.productId}`) }); },
  },
  {
    name: "query_data_product", domain: "Catalog and queries", product: P, title: "Query data product",
    description: "Run a governed query on one product: fields, filters, group_by, measures (count or sum), order_by and limit. Optional join only where the product declares a supported join. Returns a query ID and the first page.",
    operation: "dataproduct.query", kind: "job", binding: "Governed query contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ ...PID, fields: s.arr(s.str("Field"), "Fields to return (ungrouped queries)."), filters: FILTERS, group_by: s.arr(s.str("Field"), "Group-by fields."), measures: s.arr(s.obj({ fn: s.str("count or sum"), field: s.str("Field for sum."), as: s.str("Alias.") }, ["fn"]), "Measures."), order_by: s.obj({ field: s.str("Field"), direction: s.str("asc or desc") }, ["field"]), join_product: s.str("Product to join, if declared supported."), limit: s.int("Row limit (default 500).") }, ["product_id"]),
    handler: (a, ctx) => {
      const r = product(ctx, "query_data_product", "dataproduct.query", a.product_id, a.version); if (r.early) return r.early;
      if (!r.p.supportedOperations.includes("query")) return fail(ctx, "query_data_product", "dataproduct.query", "UNSUPPORTED_OPERATION", "Query is not supported for this product.");
      const q = runQuery(r.p, a);
      if (q.error) return fail(ctx, "query_data_product", "dataproduct.query", "INVALID_QUERY", q.error);
      const id = `Q-${randomUUID().slice(0, 8).toUpperCase()}`;
      queries.set(id, { queryId: id, productId: r.p.productId, version: r.p.version, status: "COMPLETE", submittedAt: new Date().toISOString(), completedAt: new Date().toISOString(), rows: q.rows, totalRows: q.total, host: ctx.host });
      const first = q.rows!.slice(0, 100);
      return ok(ctx, "query_data_product", "dataproduct.query", { queryId: id, status: "COMPLETE", productId: r.p.productId, version: r.p.version, totalRows: q.total, returnedRows: first.length, rows: first, nextCursor: q.rows!.length > 100 ? "100" : null }, {
        sources: src(`Query ${r.p.productId}@${r.p.version}`, [id]), completeness: q.total! > q.rows!.length ? "PARTIAL" : "COMPLETE", freshnessSeconds: 900,
        notes: r.p.productId === "tgdp.transaction_activity" ? ["Prototype seed holds 280 days of activity; the product contract states 25 months."] : undefined,
      });
    },
  },
  {
    name: "get_data_product_record", domain: "Catalog and queries", product: P, title: "Get data product record",
    description: "Get one entitled entity record by business key, with provenance. Distinguishes missing, ambiguous and inaccessible.",
    operation: "dataproduct.query", kind: "read", binding: "Product-specific key contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ ...PID, key: s.str("Business key value.") }, ["product_id", "key"]),
    handler: (a, ctx) => {
      const r = product(ctx, "get_data_product_record", "dataproduct.query", a.product_id); if (r.early) return r.early;
      if (!r.p.supportedOperations.includes("get_record")) return fail(ctx, "get_data_product_record", "dataproduct.query", "UNSUPPORTED_OPERATION", "Record lookup is not supported for this product.");
      const hits = rowsFor(r.p.productId).filter((x) => x[r.p.keys[0]] === a.key);
      if (!hits.length) return fail(ctx, "get_data_product_record", "dataproduct.query", "MISSING", `No record with ${r.p.keys[0]} = ${a.key}.`);
      if (hits.length > 1) return fail(ctx, "get_data_product_record", "dataproduct.query", "AMBIGUOUS", `${hits.length} records match.`);
      return ok(ctx, "get_data_product_record", "dataproduct.query", { record: hits[0], provenance: r.p.lineage }, { sources: src(`Record ${r.p.productId}`) });
    },
  },
  {
    name: "get_data_product_query_status", domain: "Catalog and queries", product: P, title: "Get query status",
    description: "Get a query's running, complete, failed or canceled state.",
    operation: "dataproduct.query", kind: "read", binding: "Asynchronous execution contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ query_id: s.str("Query ID.") }, ["query_id"]),
    handler: (a, ctx) => { const q = queries.get(a.query_id); if (!q) return fail(ctx, "get_data_product_query_status", "dataproduct.query", "NOT_FOUND", "Query not found."); if (q.host !== ctx.host) return fail(ctx, "get_data_product_query_status", "dataproduct.query", "ACCESS_DENIED", "Query is bound to a different principal."); const { rows, ...meta } = q; return ok(ctx, "get_data_product_query_status", "dataproduct.query", meta, { sources: src(`Query status ${q.queryId}`) }); },
  },
  {
    name: "get_data_product_query_results", domain: "Data results and delivery", product: P, title: "Get query results",
    description: "Page through query results with provenance and completeness. Access is rechecked on retrieval.",
    operation: "dataproduct.query", kind: "read", binding: "Results contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ query_id: s.str("Query ID."), cursor: s.str("Row offset cursor."), page_size: s.int("Rows per page (default 100).") }, ["query_id"]),
    handler: (a, ctx) => { const q = queries.get(a.query_id); if (!q) return fail(ctx, "get_data_product_query_results", "dataproduct.query", "NOT_FOUND", "Query not found or cursor expired."); if (q.host !== ctx.host) return fail(ctx, "get_data_product_query_results", "dataproduct.query", "ACCESS_DENIED", "Query is bound to a different principal."); const off = Number(a.cursor ?? 0), n = a.page_size ?? 100; const rows = q.rows.slice(off, off + n); return ok(ctx, "get_data_product_query_results", "dataproduct.query", { queryId: q.queryId, rows, offset: off, nextCursor: off + n < q.rows.length ? String(off + n) : null }, { sources: src(`Results ${q.queryId}`), completeness: q.totalRows > q.rows.length ? "PARTIAL" : "COMPLETE" }); },
  },
  {
    name: "cancel_data_product_query", domain: "Data results and delivery", product: P, title: "Cancel query",
    description: "Request cancellation of a running query and report its observed final state. A completed query is never reported as undone.",
    operation: "dataproduct.query", kind: "job", binding: "Cancellation contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ query_id: s.str("Query ID.") }, ["query_id"]),
    handler: (a, ctx) => { const q = queries.get(a.query_id); if (!q) return fail(ctx, "cancel_data_product_query", "dataproduct.query", "NOT_FOUND", "Query not found."); return ok(ctx, "cancel_data_product_query", "dataproduct.query", { queryId: q.queryId, cancellationAccepted: q.status === "RUNNING", observedFinalState: q.status }, { sources: src(`Cancel ${q.queryId}`), interpretation: q.status === "COMPLETE" ? "Query had already completed. Nothing was undone." : undefined }); },
  },
  {
    name: "create_data_product_export", domain: "Data results and delivery", product: P, title: "Create data product export",
    description: "Create an export job for a bounded selection. Fails with UNSUPPORTED_OPERATION when the product does not support export; no other dataset is substituted.",
    operation: "dataproduct.export", kind: "job", binding: "Export job contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ ...PID, filters: FILTERS, format: s.str("CSV (default) or JSON.") }, ["product_id"]),
    handler: (a, ctx) => {
      const r = product(ctx, "create_data_product_export", "dataproduct.export", a.product_id); if (r.early) return r.early;
      if (!r.p.supportedOperations.includes("export")) return fail(ctx, "create_data_product_export", "dataproduct.export", "UNSUPPORTED_OPERATION", `${r.p.name} (${r.p.productId}) is discoverable and queryable, but export is not supported for this product. No alternative dataset was substituted.`, { supportedOperations: r.p.supportedOperations });
      const q = runQuery(r.p, { filters: a.filters });
      const id = `EXP-${randomUUID().slice(0, 8).toUpperCase()}`;
      exports.set(id, { exportId: id, productId: r.p.productId, version: r.p.version, format: (a.format ?? "CSV").toUpperCase(), rows: q.rows ?? [], createdAt: Date.now(), host: ctx.host });
      return ok(ctx, "create_data_product_export", "dataproduct.export", { exportId: id, status: "RUNNING", operationRef: id }, { sources: src(`Export ${r.p.productId}`, [id]) });
    },
  },
  {
    name: "get_data_product_export_status", domain: "Data results and delivery", product: P, title: "Get export status",
    description: "Get an export job's processing status, record count and artifact availability.",
    operation: "dataproduct.export", kind: "read", binding: "Export job contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ export_id: s.str("Export ID.") }, ["export_id"]),
    handler: (a, ctx) => { const e = exports.get(a.export_id); if (!e) return fail(ctx, "get_data_product_export_status", "dataproduct.export", "NOT_FOUND", "Export not found."); const done = Date.now() - e.createdAt > 4000; return ok(ctx, "get_data_product_export_status", "dataproduct.export", { exportId: e.exportId, status: done ? "COMPLETE" : "RUNNING", recordCount: done ? e.rows.length : null, artifactAvailable: done }, { sources: src(`Export status ${e.exportId}`) }); },
  },
  {
    name: "get_data_product_export_result", domain: "Data results and delivery", product: P, title: "Get export result",
    description: "Get authorized artifact access for a completed export, with expiry. Download rights are rechecked.",
    operation: "dataproduct.export", kind: "read", binding: "Export result contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ export_id: s.str("Export ID.") }, ["export_id"]),
    handler: (a, ctx) => { const e = exports.get(a.export_id); if (!e) return fail(ctx, "get_data_product_export_result", "dataproduct.export", "NOT_FOUND", "Export not found."); if (Date.now() - e.createdAt <= 4000) return fail(ctx, "get_data_product_export_result", "dataproduct.export", "NOT_READY", "Export is still running. Check status and retry."); return ok(ctx, "get_data_product_export_result", "dataproduct.export", { exportId: e.exportId, format: e.format, recordCount: e.rows.length, artifact: { url: `${ctx.baseUrl}/api/exports/${e.exportId}`, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() } }, { sources: src(`Export result ${e.exportId}`) }); },
  },
  {
    name: "create_data_product_delivery_schedule", domain: "Data results and delivery", product: P, title: "Create delivery schedule",
    description: "Create a recurring delivery to an approved destination. First call returns a plan for approval; call again with plan_id.",
    operation: "dataproduct.schedule", kind: "write", binding: "Conditional delivery contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ ...PID, cadence: s.str("Cadence, e.g. WEEKLY (Mon 06:00 UTC)."), destination: s.str("Approved destination name, e.g. HRG-SFTP-DATA."), format: s.str("CSV or JSON."), plan_id: s.str("Approved plan ID (second call).") }),
    handler: (a, ctx) => {
      if (a.plan_id) {
        const c = consumePlan(ctx, a.plan_id, "create_data_product_delivery_schedule"); if (c.problem) return fail(ctx, "create_data_product_delivery_schedule", "dataproduct.schedule", "PLAN_INVALID", c.problem);
        const sc = { scheduleId: `SCH-${String(O.deliverySchedules.length + 8).padStart(4, "0")}`, ...c.plan!.parameters, status: "ACTIVE", configVersion: 1, createdAt: new Date().toISOString(), lastRun: null, nextRun: new Date(Date.now() + 86400_000).toISOString() };
        O.deliverySchedules.push(sc); c.plan!.status = "EXECUTED";
        return ok(ctx, "create_data_product_delivery_schedule", "dataproduct.schedule", sc, { sources: src(`Schedule ${sc.scheduleId}`) });
      }
      const r = product(ctx, "create_data_product_delivery_schedule", "dataproduct.schedule", a.product_id ?? ""); if (r.early) return r.early;
      if (!r.p.supportedOperations.includes("delivery_schedule")) return fail(ctx, "create_data_product_delivery_schedule", "dataproduct.schedule", "UNSUPPORTED_OPERATION", `Scheduled delivery is not supported for ${r.p.productId}.`);
      if (!eq(a.destination, "HRG-SFTP-DATA")) return fail(ctx, "create_data_product_delivery_schedule", "dataproduct.schedule", "DESTINATION_NOT_APPROVED", "Destination is not on the customer's approved destination list.", { approvedDestinations: ["HRG-SFTP-DATA"] });
      const p = createPlan(ctx, "create_data_product_delivery_schedule", "dataproduct.schedule", r.p.productId, `Deliver ${r.p.name} ${a.cadence} to ${a.destination}`, { productId: r.p.productId, version: r.p.version, cadence: a.cadence, destination: a.destination, format: a.format ?? "CSV" });
      return approvalRequired(ctx, "create_data_product_delivery_schedule", "dataproduct.schedule", p, src("Destination and entitlement validation"));
    },
  },
  {
    name: "get_data_product_delivery_schedule", domain: "Data results and delivery", product: P, title: "Get delivery schedule",
    description: "Get a schedule's configuration, recent run status and next run.",
    operation: "dataproduct.read", kind: "read", binding: "Schedule contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ schedule_id: s.str("Schedule ID (omit to list all).") }),
    handler: (a, ctx) => ok(ctx, "get_data_product_delivery_schedule", "dataproduct.read", a.schedule_id ? O.deliverySchedules.find((x) => eq(x.scheduleId, a.schedule_id)) ?? null : { schedules: O.deliverySchedules }, { sources: src("Schedules") }),
  },
  {
    name: "update_data_product_delivery_schedule", domain: "Data results and delivery", product: P, title: "Update delivery schedule",
    description: "Change a schedule's cadence, destination or format. Revalidates destination and entitlement; requires approval (call again with plan_id).",
    operation: "dataproduct.schedule", kind: "write", binding: "Schedule contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ schedule_id: s.str("Schedule ID."), cadence: s.str("New cadence."), destination: s.str("New destination."), format: s.str("New format."), plan_id: s.str("Approved plan ID.") }),
    handler: (a, ctx) => {
      if (a.plan_id) {
        const c = consumePlan(ctx, a.plan_id, "update_data_product_delivery_schedule"); if (c.problem) return fail(ctx, "update_data_product_delivery_schedule", "dataproduct.schedule", "PLAN_INVALID", c.problem);
        const sc = O.deliverySchedules.find((x) => x.scheduleId === c.plan!.parameters.scheduleId); Object.assign(sc, c.plan!.parameters.changes); sc.configVersion += 1; c.plan!.status = "EXECUTED";
        return ok(ctx, "update_data_product_delivery_schedule", "dataproduct.schedule", { ...sc, effective: new Date().toISOString() }, { sources: src(`Schedule ${sc.scheduleId}`) });
      }
      const sc = O.deliverySchedules.find((x) => eq(x.scheduleId, a.schedule_id)); if (!sc) return fail(ctx, "update_data_product_delivery_schedule", "dataproduct.schedule", "NOT_FOUND", "Schedule not found.");
      if (a.destination && !eq(a.destination, "HRG-SFTP-DATA")) return fail(ctx, "update_data_product_delivery_schedule", "dataproduct.schedule", "DESTINATION_NOT_APPROVED", "Destination is not approved.");
      const changes = Object.fromEntries(["cadence", "destination", "format"].filter((k) => a[k]).map((k) => [k, a[k]]));
      const p = createPlan(ctx, "update_data_product_delivery_schedule", "dataproduct.schedule", sc.scheduleId, `Update ${sc.scheduleId}: ${JSON.stringify(changes)}`, { scheduleId: sc.scheduleId, changes });
      return approvalRequired(ctx, "update_data_product_delivery_schedule", "dataproduct.schedule", p, src(`Schedule ${sc.scheduleId}`));
    },
  },
  {
    name: "cancel_data_product_delivery_schedule", domain: "Data results and delivery", product: P, title: "Cancel delivery schedule",
    description: "Disable future deliveries. Files already delivered are not retracted. Requires approval (call again with plan_id).",
    operation: "dataproduct.schedule", kind: "write", binding: "Schedule contract", basis: NEW_CONTRACT,
    inputSchema: s.obj({ schedule_id: s.str("Schedule ID."), plan_id: s.str("Approved plan ID.") }),
    handler: (a, ctx) => {
      if (a.plan_id) {
        const c = consumePlan(ctx, a.plan_id, "cancel_data_product_delivery_schedule"); if (c.problem) return fail(ctx, "cancel_data_product_delivery_schedule", "dataproduct.schedule", "PLAN_INVALID", c.problem);
        const sc = O.deliverySchedules.find((x) => x.scheduleId === c.plan!.parameters.scheduleId); sc.status = "CANCELED"; sc.nextRun = null; c.plan!.status = "EXECUTED";
        return ok(ctx, "cancel_data_product_delivery_schedule", "dataproduct.schedule", { scheduleId: sc.scheduleId, status: "CANCELED", inFlight: "None", note: "Previously delivered files are not retracted." }, { sources: src(`Schedule ${sc.scheduleId}`) });
      }
      const sc = O.deliverySchedules.find((x) => eq(x.scheduleId, a.schedule_id)); if (!sc) return fail(ctx, "cancel_data_product_delivery_schedule", "dataproduct.schedule", "NOT_FOUND", "Schedule not found.");
      const p = createPlan(ctx, "cancel_data_product_delivery_schedule", "dataproduct.schedule", sc.scheduleId, `Cancel delivery schedule ${sc.scheduleId}`, { scheduleId: sc.scheduleId });
      return approvalRequired(ctx, "cancel_data_product_delivery_schedule", "dataproduct.schedule", p, src(`Schedule ${sc.scheduleId}`));
    },
  },
];
