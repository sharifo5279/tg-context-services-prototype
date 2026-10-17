// Transaction evidence tools (Trading Grid Insights).
import { transactions, txById, STATUS_TEXT, SEARCH_LIMIT_DAYS, renderPayload, Tx } from "../data/insights.js";
import { ok, fail, deny, scopeFilter, Ctx } from "../runtime.js";
import { ToolDef, s, PAGE, paginate, MODELED } from "./types.js";
import { resolveCompany, parseTime } from "./common.js";
import { isoWeekStart } from "../util.js";

const P = "Trading Grid Insights";
const SEARCH = "POST /visibility_transaction_search (getTransactions)";
const LIMIT_MS = SEARCH_LIMIT_DAYS * 86400_000;

const STATUS_ALIASES: Record<string, string> = { DELIVERED: "DLVD", DLVD: "DLVD", FAILED: "FAIL", FAIL: "FAIL", IN_PROCESS: "INPR", PROCESSING: "INPR", INPR: "INPR", RECEIVED: "RCVD", RCVD: "RCVD" };

export const row = (t: Tx) => ({
  transactionId: t.transactionId,
  receivedAt: t.receivedAt,
  lastModified: t.lastModified,
  environment: t.environment,
  direction: t.direction,
  partner: t.direction === "OUTBOUND" ? t.receiver.companyName : t.sender.companyName,
  partnerCompanyId: t.partnerCompanyId,
  ediType: t.ediType,
  documentType: t.documentType,
  keys: Object.fromEntries(Object.values(t.keys).map((k: any) => [k.name, k.value])),
  sourceStatus: t.sourceStatus,
  statusInterpretation: STATUS_TEXT[t.sourceStatus],
  ...(t.errors.length ? { error: `${t.errors[0].code}: ${t.errors[0].message}` } : {}),
  ...(t.ack ? { ackResult: `${t.ack.status} (${t.ack.code})` } : {}),
});

const SUPPORTED_FILTERS = ["partner", "document_type", "direction", "status", "key_value", "ship_to_gln", "from", "to", "last_hours", "modified_before", "environment", "page_size", "cursor"];

function window(args: any) {
  const now = Date.now();
  let from = parseTime(args.from) ?? (args.last_hours ? now - Number(args.last_hours) * 3600_000 : now - 30 * 86400_000);
  const to = parseTime(args.to) ?? now;
  const missing: string[] = [];
  let partial = false;
  if (from < now - LIMIT_MS) {
    missing.push(`Search covers ${SEARCH_LIMIT_DAYS} days. Records before ${new Date(now - LIMIT_MS).toISOString().slice(0, 10)} were not searched. Older history: Trading Grid Data Explorer product tgdp.transaction_activity (25 months).`);
    from = now - LIMIT_MS;
    partial = true;
  }
  return { from, to, missing, partial };
}

function partnerFilter(ctx: Ctx, tool: string, input?: string) {
  if (!input) return { ids: null as string[] | null };
  const r = resolveCompany(input);
  if (r.kind === "ok") return { ids: [r.company.companyId], company: r.company };
  if (r.kind === "ambiguous") return { early: fail(ctx, tool, "transaction.read", "AMBIGUOUS_PARTNER", `'${input}' matches ${r.candidates.length} companies. Select one companyId and retry.`, { candidates: r.candidates }) };
  if (r.kind === "denied") return { early: deny(ctx, tool, "transaction.read", r.reason) };
  return { early: fail(ctx, tool, "transaction.read", "NOT_FOUND", `No permitted company matches '${input}'.`) };
}

function filterTx(args: any, ids: string[] | null, from: number, to: number) {
  const st = args.status ? STATUS_ALIASES[String(args.status).toUpperCase()] : null;
  const env = (args.environment ?? "PRODUCTION").toUpperCase();
  const mb = parseTime(args.modified_before);
  return transactions.filter(
    (t) =>
      t._t >= from && t._t <= to &&
      scopeFilter(t.partnerCompanyId) &&
      (env === "ALL" || t.environment === env) &&
      (!ids || ids.includes(t.partnerCompanyId)) &&
      (!args.document_type || t.documentType.toUpperCase() === String(args.document_type).toUpperCase()) &&
      (!args.direction || t.direction === String(args.direction).toUpperCase()) &&
      (!st || t.sourceStatus === st) &&
      (!args.key_value || Object.values(t.keys).some((k: any) => k.value?.toUpperCase() === String(args.key_value).toUpperCase())) &&
      (!args.ship_to_gln || t.refs.shipToGLN === String(args.ship_to_gln)) &&
      (!mb || Date.parse(t.lastModified) <= mb),
  );
}

const WINDOW = {
  from: s.str("Start of arrival window: ISO timestamp or relative such as '7d' or '24h'. Default 30 days."),
  to: s.str("End of arrival window. Default now."),
  last_hours: s.int("Convenience window: arrivals in the last N hours."),
};

// ---- Tools ---------------------------------------------------------------------------------------

export const insightsTools: ToolDef[] = [
  {
    name: "search_transactions", domain: "Transaction evidence", product: P, title: "Search transactions",
    description: "Search observed transactions by partner, document type, direction, status, collected business key, ship-to GLN and arrival window. Returns paged results with source status. Search covers 6 months. Only collected keys are searchable (PO, shipment ID, invoice number, ship-to GLN, acknowledged control number).",
    operation: "transaction.read", kind: "read", binding: SEARCH, basis: MODELED,
    inputSchema: { ...s.obj({
      partner: s.str("Partner company ID or name."),
      document_type: s.str("Document type, e.g. 850, 855, 856, 810, 997, ORDERS, DESADV, INVOIC, CONTRL."),
      direction: s.str("INBOUND or OUTBOUND relative to the hub.", { enum: ["INBOUND", "OUTBOUND"] }),
      status: s.str("DELIVERED, FAILED, IN_PROCESS or RECEIVED."),
      key_value: s.str("Value of any collected key (PO number, shipment ID, invoice number, control number)."),
      ship_to_gln: s.str("Ship-to GLN (collected key)."),
      modified_before: s.str("Only records last modified before this time (ISO or relative such as '6h'). Use with status IN_PROCESS to find stuck transactions."),
      environment: s.str("PRODUCTION (default), TEST or ALL."),
      ...WINDOW, ...PAGE,
    }), additionalProperties: true },
    handler: (args, ctx) => {
      const unknown = Object.keys(args).filter((k) => !SUPPORTED_FILTERS.includes(k));
      if (unknown.length) {
        return fail(ctx, "search_transactions", "transaction.read", "UNSUPPORTED_FILTER", `Filter(s) ${unknown.join(", ")} are not supported. Only collected keys and documented fields are searchable; store number (N104 qualifier 92) is not a collected key.`, { supportedFilters: SUPPORTED_FILTERS, collectedKeys: ["PO number", "Shipment ID", "Invoice number", "Ship-to GLN", "Acknowledged control number"] });
      }
      const pf = partnerFilter(ctx, "search_transactions", args.partner);
      if (pf.early) return pf.early;
      const w = window(args);
      const rows = filterTx(args, pf.ids, w.from, w.to);
      const { page, pagination } = paginate(rows, args);
      const files = new Set(rows.map((r) => r.fileId)).size;
      return ok(ctx, "search_transactions", "transaction.read", {
        window: { from: new Date(w.from).toISOString(), to: new Date(w.to).toISOString() },
        counts: { documents: rows.length, files, countingUnit: "document" },
        transactions: page.map(row),
      }, {
        sources: [{ product: P, operation: SEARCH }],
        completeness: w.partial ? "PARTIAL" : "COMPLETE",
        missingEvidence: w.missing,
        pagination: { ...pagination, sourcePageLimit: 1000, scrollContextSeconds: 60 },
        freshnessSeconds: 60,
      });
    },
  },
  {
    name: "get_transaction", domain: "Transaction evidence", product: P, title: "Get transaction",
    description: "Get one transaction's details by Insights transaction ID, control number (ISA13/GS06/UNB 0020) or a unique business key. Returns status history, control numbers, keys, errors and payload variants. Returns candidates when the identifier is not unique.",
    operation: "transaction.read", kind: "read", binding: `${SEARCH} (filtered)`, basis: MODELED,
    inputSchema: s.obj({ transaction_id: s.str("Insights transaction ID (TGT...)."), control_number: s.str("ISA13, GS06 or UNB 0020."), key_value: s.str("Business key value such as invoice or shipment ID."), environment: s.str("PRODUCTION (default), TEST or ALL.") }),
    handler: (args, ctx) => {
      const env = (args.environment ?? "ALL").toUpperCase();
      let found: Tx[] = [];
      if (args.transaction_id) { const t = txById(args.transaction_id); if (t) found = [t]; }
      else if (args.control_number) found = transactions.filter((t) => Object.values(t.controlNumbers).includes(String(args.control_number)));
      else if (args.key_value) found = transactions.filter((t) => Object.values(t.keys).some((k: any) => k.value?.toUpperCase() === String(args.key_value).toUpperCase()) && t.documentType !== "997" && t.documentType !== "CONTRL");
      found = found.filter((t) => env === "ALL" || t.environment === env);
      const visible = found.filter((t) => scopeFilter(t.partnerCompanyId));
      if (found.length && !visible.length) return deny(ctx, "get_transaction", "transaction.read", "Transaction exists outside the permitted organization and BUID.");
      if (!visible.length) return fail(ctx, "get_transaction", "transaction.read", "NOT_FOUND", "No permitted transaction matches the identifier in the 6-month search window.");
      if (visible.length > 1) {
        return ok(ctx, "get_transaction", "transaction.read", { unique: false, candidates: visible.map(row) }, { sources: [{ product: P, operation: SEARCH }], interpretation: `Identifier matched ${visible.length} transactions. Select one transaction ID.` });
      }
      const t = visible[0];
      const { _t, ...rest } = t as any;
      return ok(ctx, "get_transaction", "transaction.read", { ...rest, statusInterpretation: STATUS_TEXT[t.sourceStatus] }, { sources: [{ product: P, operation: SEARCH, objectIds: [t.transactionId] }], freshnessSeconds: 60 });
    },
  },
  {
    name: "get_related_transactions", domain: "Transaction evidence", product: P, title: "Get related transactions",
    description: "Find transactions linked by matching business keys (PO number) and acknowledgments. Mode 'trace' follows one PO or transaction. Mode 'scan' lists gaps across a partner or window: MISSING_855, MISSING_856, MISSING_810, INVOICE_BEFORE_ASN, INVOICE_WITHOUT_PO. No lifecycle link is inferred without a matching key.",
    operation: "transaction.read", kind: "read", binding: `${SEARCH} (composed)`, basis: MODELED,
    inputSchema: s.obj({
      transaction_id: s.str("Anchor transaction ID (trace mode)."),
      po_number: s.str("PO number to trace (trace mode)."),
      scan: s.str("Gap scan type (scan mode).", { enum: ["MISSING_855", "MISSING_856", "MISSING_810", "INVOICE_BEFORE_ASN", "INVOICE_WITHOUT_PO"] }),
      partner: s.str("Partner company ID or name (scan mode)."),
      older_than_hours: s.int("Only anchors older than N hours (scan mode)."),
      ...WINDOW,
    }),
    handler: (args, ctx) => {
      const w = window(args);
      const inWin = transactions.filter((t) => t._t >= Date.now() - LIMIT_MS && t.environment === "PRODUCTION" && scopeFilter(t.partnerCompanyId));
      const byPo = (po: string) => inWin.filter((t) => t.refs.poNumber === po);
      const acksOf = (id: string) => inWin.filter((t) => t.refs.ackForTransactionId === id);
      if (args.scan) {
        const pf = partnerFilter(ctx, "get_related_transactions", args.partner);
        if (pf.early) return pf.early;
        const older = args.older_than_hours ? Date.now() - Number(args.older_than_hours) * 3600_000 : Date.now();
        const anchorsBase = inWin.filter((t) => t._t >= w.from && t._t <= Math.min(w.to, older) && (!pf.ids || pf.ids.includes(t.partnerCompanyId)));
        let items: any[] = [];
        const want = { MISSING_855: "855", MISSING_856: "856", MISSING_810: "810" } as Record<string, string>;
        if (want[args.scan]) {
          items = anchorsBase.filter((t) => t.documentType === "850" && !byPo(t.refs.poNumber!).some((x) => x.documentType === want[args.scan]))
            .map((t) => ({ anchor: row(t), finding: `No matching ${want[args.scan]} found for PO ${t.refs.poNumber} in the searched range`, ageHours: Math.round((Date.now() - t._t) / 3600_000) }));
        } else if (args.scan === "INVOICE_BEFORE_ASN") {
          for (const inv of anchorsBase.filter((t) => t.documentType === "810")) {
            const asn = byPo(inv.refs.poNumber!).filter((x) => x.documentType === "856").sort((a, b) => a._t - b._t)[0];
            if (asn && asn._t > inv._t) items.push({ invoice: row(inv), asn: row(asn), finding: `Invoice arrived ${((asn._t - inv._t) / 3600_000).toFixed(1)} hours before its ASN (matched on PO ${inv.refs.poNumber})` });
          }
        } else if (args.scan === "INVOICE_WITHOUT_PO") {
          items = anchorsBase.filter((t) => t.documentType === "810" && !byPo(t.refs.poNumber!).some((x) => x.documentType === "850"))
            .map((t) => ({ invoice: row(t), finding: `No 850 with PO ${t.refs.poNumber} found in the 6-month search window. This is a missing key match, not proof the PO never existed.` }));
        }
        return ok(ctx, "get_related_transactions", "transaction.read", { scan: args.scan, window: { from: new Date(w.from).toISOString(), to: new Date(w.to).toISOString() }, findings: items.slice(0, 50), findingCount: items.length },
          { sources: [{ product: P, operation: SEARCH }], completeness: w.partial || items.length > 50 ? "PARTIAL" : "COMPLETE", missingEvidence: [...w.missing, ...(items.length > 50 ? ["Findings truncated to 50."] : [])], interpretation: "Links are based on matching PO number keys only." });
      }
      let po = args.po_number;
      if (!po && args.transaction_id) {
        const t = txById(args.transaction_id);
        if (!t || !scopeFilter(t.partnerCompanyId)) return fail(ctx, "get_related_transactions", "transaction.read", "NOT_FOUND", "Anchor transaction not found in permitted scope.");
        po = t.refs.poNumber;
        if (!po) return ok(ctx, "get_related_transactions", "transaction.read", { anchor: row(t), related: acksOf(t.transactionId).map(row) }, { sources: [{ product: P, operation: SEARCH }], completeness: "PARTIAL", missingEvidence: ["Anchor has no PO number key; only acknowledgments were matched."] });
      }
      if (!po) return fail(ctx, "get_related_transactions", "transaction.read", "INVALID_INPUT", "Provide transaction_id, po_number or scan.");
      const docs = byPo(po).sort((a, b) => a._t - b._t);
      const lifecycle = docs.map((d) => ({ ...row(d), matchedOn: `PO number ${po}`, acknowledgments: acksOf(d.transactionId).map((a) => ({ transactionId: a.transactionId, receivedAt: a.receivedAt, result: `${a.ack?.status} (${a.ack?.code})`, detail: a.ack?.detail })) }));
      const types = new Set(docs.map((d) => d.documentType));
      const missing = ["850", "855", "856", "810"].filter((d) => !types.has(d)).map((d) => `No matching ${d} found for PO ${po} in the searched range.`);
      const ordering = (() => {
        const inv = docs.find((d) => d.documentType === "810"); const asn = docs.find((d) => d.documentType === "856");
        return inv && asn && inv._t < asn._t ? ["Invoice arrived before ASN."] : [];
      })();
      return ok(ctx, "get_related_transactions", "transaction.read", { poNumber: po, lifecycle, observations: ordering }, {
        sources: [{ product: P, operation: SEARCH, objectIds: docs.map((d) => d.transactionId) }],
        completeness: missing.length ? "PARTIAL" : "COMPLETE", missingEvidence: missing,
        interpretation: "Lifecycle assembled from matching PO number keys. No inferred joins.",
      });
    },
  },
  {
    name: "get_acknowledgment_evidence", domain: "Transaction evidence", product: P, title: "Get acknowledgment evidence",
    description: "Return functional acknowledgment evidence (997 or CONTRL) for one transaction, or scan a partner or window for missing or rejected acknowledgments. Applies FA delinquency cycles (cycle 1 at 24 hours, cycle 2 at 48 hours). Absence of an acknowledgment is reported as unknown, never as rejection.",
    operation: "transaction.read", kind: "read", binding: `${SEARCH} (acknowledgment fields and linked records)`, basis: MODELED,
    inputSchema: s.obj({
      transaction_id: s.str("Transaction ID to check."),
      partner: s.str("Partner company ID or name (scan)."),
      document_type: s.str("Document type to scan, default 850 (use ORDERS for EDIFACT)."),
      direction: s.str("Direction of the documents being acknowledged, default OUTBOUND.", { enum: ["INBOUND", "OUTBOUND"] }),
      ack_filter: s.str("MISSING, REJECTED or ALL (default ALL).", { enum: ["MISSING", "REJECTED", "ALL"] }),
      ...WINDOW,
    }),
    handler: (args, ctx) => {
      const evidenceFor = (t: Tx) => {
        const a = transactions.find((x) => x.refs.ackForTransactionId === t.transactionId);
        const age = (Date.now() - t._t) / 3600_000;
        return {
          transactionId: t.transactionId, documentType: t.documentType, partner: row(t).partner, sentOrReceivedAt: t.receivedAt,
          businessKey: Object.values(t.keys)[0] ? (Object.values(t.keys)[0] as any).value : null,
          controlNumber: t.controlNumbers.gs06 ?? t.controlNumbers.unb0020,
          ackObserved: !!a,
          ...(a ? { ackTransactionId: a.transactionId, ackType: a.documentType, ackReceivedAt: a.receivedAt, ackStatus: a.ack?.status, ackCode: a.ack?.code, ackDetail: a.ack?.detail ?? null } : {}),
          faDelinquency: a ? "ACKNOWLEDGED" : age >= 48 ? "CYCLE_2_OVERDUE" : age >= 24 ? "CYCLE_1_OVERDUE" : "NOT_YET_DUE",
          ...(a ? {} : { interpretation: "No acknowledgment observed. Status unknown; not a rejection." }),
        };
      };
      if (args.transaction_id) {
        const t = txById(args.transaction_id);
        if (!t || !scopeFilter(t.partnerCompanyId)) return fail(ctx, "get_acknowledgment_evidence", "transaction.read", "NOT_FOUND", "Transaction not found in permitted scope.");
        return ok(ctx, "get_acknowledgment_evidence", "transaction.read", evidenceFor(t), { sources: [{ product: P, operation: SEARCH, objectIds: [t.transactionId] }] });
      }
      const pf = partnerFilter(ctx, "get_acknowledgment_evidence", args.partner);
      if (pf.early) return pf.early;
      const w = window(args);
      const dt = (args.document_type ?? "850").toUpperCase();
      const dir = (args.direction ?? "OUTBOUND").toUpperCase();
      let list = transactions.filter((t) => t._t >= w.from && t._t <= w.to && t.environment === "PRODUCTION" && scopeFilter(t.partnerCompanyId) && t.documentType === dt && t.direction === dir && (!pf.ids || pf.ids.includes(t.partnerCompanyId))).map(evidenceFor);
      const total = list.length;
      const f = (args.ack_filter ?? "ALL").toUpperCase();
      if (f === "MISSING") list = list.filter((e) => !e.ackObserved);
      if (f === "REJECTED") list = list.filter((e) => e.ackStatus === "REJECTED" || e.ackStatus === "ACCEPTED_WITH_ERRORS");
      const summary = { documentsChecked: total, acknowledged: list.filter((e) => e.ackObserved).length, missing: list.filter((e) => !e.ackObserved).length, rejected: list.filter((e) => e.ackStatus === "REJECTED").length, cycle1Overdue: list.filter((e) => e.faDelinquency === "CYCLE_1_OVERDUE").length, cycle2Overdue: list.filter((e) => e.faDelinquency === "CYCLE_2_OVERDUE").length };
      return ok(ctx, "get_acknowledgment_evidence", "transaction.read", { filter: f, documentType: dt, direction: dir, window: { from: new Date(w.from).toISOString(), to: new Date(w.to).toISOString() }, summary, items: list.slice(0, 60) }, {
        sources: [{ product: P, operation: SEARCH }], completeness: w.partial || list.length > 60 ? "PARTIAL" : "COMPLETE", missingEvidence: [...w.missing, ...(list.length > 60 ? [`Items truncated to 60 of ${list.length}.`] : [])],
        interpretation: "FA delinquency per Outbound Document Tracking cycles: cycle 1 at 24 hours, cycle 2 at 48 hours.",
      });
    },
  },
  {
    name: "get_transaction_payload", domain: "Transaction evidence", product: P, title: "Get transaction payload",
    description: "Return an entitled payload variant (ORIGINAL or TRANSLATED) for one transaction, with a time-limited callback descriptor. Payload access is entitled separately from metadata.",
    operation: "transaction.payload.read", kind: "read", binding: "Payload descriptors and callbackuri retrieval", basis: MODELED,
    inputSchema: s.obj({ transaction_id: s.str("Insights transaction ID."), variant: s.str("ORIGINAL (default) or TRANSLATED.", { enum: ["ORIGINAL", "TRANSLATED"] }) }, ["transaction_id"]),
    handler: (args, ctx) => {
      const t = txById(args.transaction_id);
      if (!t || !scopeFilter(t.partnerCompanyId)) return fail(ctx, "get_transaction_payload", "transaction.payload.read", "NOT_FOUND", "Transaction not found in permitted scope.");
      const v = (args.variant ?? "ORIGINAL").toUpperCase();
      if (!t.payloadVariants.includes(v)) {
        return ok(ctx, "get_transaction_payload", "transaction.payload.read", { transactionId: t.transactionId, variant: v, available: false, reason: t.sourceStatus === "FAIL" ? "Translation did not complete; no translated variant was produced." : "Variant not produced for this document type.", availableVariants: t.payloadVariants }, { sources: [{ product: P, operation: "payload descriptors", objectIds: [t.transactionId] }], completeness: "PARTIAL", missingEvidence: [`${v} variant unavailable.`] });
      }
      const content = renderPayload(t, v);
      const exp = new Date(Date.now() + 10 * 60_000).toISOString();
      return ok(ctx, "get_transaction_payload", "transaction.payload.read", {
        transactionId: t.transactionId, variant: v, available: true, contentType: v === "TRANSLATED" ? "application/json" : t.standard === "X12" ? "application/edi-x12" : "application/edifact",
        sizeBytes: content.length, descriptor: { callbackUri: `${ctx.baseUrl}/api/payload/${t.transactionId}?variant=${v}`, expiresAt: exp }, content,
      }, { sources: [{ product: P, operation: "payload callbackuri", objectIds: [t.transactionId] }] });
    },
  },
  {
    name: "summarize_transaction_activity", domain: "Transaction evidence", product: P, title: "Summarize transaction activity",
    description: "Summarize volume or errors for a partner or the whole community over a window, grouped by document type, partner, status, error code, day or week. Optional comparison with the previous equal period. Analysis SILENT_PARTNERS lists partners with no recent inbound traffic against their baseline. Derived from complete permitted results.",
    operation: "transaction.read", kind: "read", binding: `${SEARCH} (aggregated)`, basis: MODELED,
    inputSchema: s.obj({
      analysis: s.str("VOLUME (default), ERRORS or SILENT_PARTNERS.", { enum: ["VOLUME", "ERRORS", "SILENT_PARTNERS"] }),
      partner: s.str("Partner company ID or name."),
      group_by: s.arr(s.str("document_type, partner, status, error_code, direction, day or week"), "Grouping dimensions."),
      counting_unit: s.str("document (default) or file.", { enum: ["document", "file"] }),
      compare_previous: s.bool("Compare with the previous period of equal length."),
      recent_days: s.int("SILENT_PARTNERS: recent window in days (default 7)."),
      baseline_days: s.int("SILENT_PARTNERS: baseline window in days before the recent window (default 30)."),
      ...WINDOW,
    }),
    handler: (args, ctx) => {
      const pf = partnerFilter(ctx, "summarize_transaction_activity", args.partner);
      if (pf.early) return pf.early;
      const base = transactions.filter((t) => t.environment === "PRODUCTION" && scopeFilter(t.partnerCompanyId) && (!pf.ids || pf.ids.includes(t.partnerCompanyId)));
      const analysis = (args.analysis ?? "VOLUME").toUpperCase();
      if (analysis === "SILENT_PARTNERS") {
        const rd = Number(args.recent_days ?? 7), bd = Number(args.baseline_days ?? 30);
        const now = Date.now(), rStart = now - rd * 86400_000, bStart = rStart - bd * 86400_000;
        const partners = new Map<string, { name: string; recent: number; baseline: number; last: number }>();
        for (const t of base.filter((t) => t.direction === "INBOUND" && t.documentType !== "997" && t.documentType !== "CONTRL")) {
          const p = partners.get(t.partnerCompanyId) ?? { name: row(t).partner, recent: 0, baseline: 0, last: 0 };
          if (t._t >= rStart) p.recent++; else if (t._t >= bStart) p.baseline++;
          p.last = Math.max(p.last, t._t);
          partners.set(t.partnerCompanyId, p);
        }
        const out = [...partners.entries()].map(([id, p]) => ({ partnerCompanyId: id, partner: p.name, baselineDailyAverage: +(p.baseline / bd).toFixed(2), recentCount: p.recent, lastInboundAt: p.last ? new Date(p.last).toISOString() : null }))
          .filter((p) => p.recentCount === 0 && p.baselineDailyAverage >= 0.5);
        return ok(ctx, "summarize_transaction_activity", "transaction.read", { analysis, recentDays: rd, baselineDays: bd, silentPartners: out }, {
          sources: [{ product: P, operation: SEARCH }], interpretation: "No observed inbound traffic is not proof of failure. Check connectivity and outbound delivery results.",
        });
      }
      const w = window({ ...args, from: args.from ?? (args.last_hours ? undefined : "30d") });
      const span = w.to - w.from;
      const unit = args.counting_unit === "file" ? "file" : "document";
      const groups: string[] = args.group_by?.length ? args.group_by : analysis === "ERRORS" ? ["error_code"] : ["document_type"];
      const keyOf = (t: Tx) => groups.map((g) => ({ document_type: t.documentType, partner: row(t).partner, status: t.sourceStatus, error_code: t.errors[0]?.code ?? "(none)", direction: t.direction, day: t.receivedAt.slice(0, 10), week: isoWeekStart(t.receivedAt) } as any)[g] ?? "?").join(" | ");
      const agg = (from: number, to: number) => {
        let set = base.filter((t) => t._t >= from && t._t <= to);
        if (analysis === "ERRORS") set = set.filter((t) => t.sourceStatus === "FAIL");
        const m = new Map<string, { n: Set<string> | number; sample?: string }>();
        for (const t of set) {
          const k = keyOf(t);
          const cur = m.get(k) ?? { n: unit === "file" ? new Set<string>() : 0, sample: t.errors[0]?.message };
          if (unit === "file") (cur.n as Set<string>).add(t.fileId); else (cur.n as number)++;
          m.set(k, cur);
        }
        return { total: unit === "file" ? new Set(set.map((t) => t.fileId)).size : set.length, rows: [...m.entries()].map(([k, v]) => ({ group: k, count: typeof v.n === "number" ? v.n : v.n.size, ...(analysis === "ERRORS" ? { sampleMessage: v.sample } : {}) })).sort((a, b) => b.count - a.count) };
      };
      const cur = agg(w.from, w.to);
      const result: any = { analysis, groupBy: groups, countingUnit: unit, window: { from: new Date(w.from).toISOString(), to: new Date(w.to).toISOString() }, current: cur };
      if (args.compare_previous) {
        const prev = agg(w.from - span, w.from);
        result.previous = { window: { from: new Date(w.from - span).toISOString(), to: new Date(w.from).toISOString() }, ...prev };
        result.change = cur.rows.map((r) => { const p = prev.rows.find((x) => x.group === r.group)?.count ?? 0; return { group: r.group, current: r.count, previous: p, changePct: p ? Math.round(((r.count - p) / p) * 100) : null }; });
      }
      return ok(ctx, "summarize_transaction_activity", "transaction.read", result, { sources: [{ product: P, operation: SEARCH }], completeness: w.partial ? "PARTIAL" : "COMPLETE", missingEvidence: w.missing, freshnessSeconds: 60 });
    },
  },
];
