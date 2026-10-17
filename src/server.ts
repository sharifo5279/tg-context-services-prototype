// HTTP server: console (password gate), agent API, tool API and the remote MCP endpoint.
import express from "express";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHmac, timingSafeEqual } from "node:crypto";
import { runTurn, resetSession, MODEL, apiKeyConfigured } from "./agent.js";
import { catalog, invoke, audit, TOOLS } from "./tools/index.js";
import { HOSTS, GRANT, PERSONA, plans, decidePlan, clientStatus, scopeFilter, HostKey } from "./runtime.js";
import { AGENTS, USE_CASES } from "./agents.js";
import { handleMcp, hostForToken, tokenFor } from "./mcp.js";
import { txById, renderPayload, transactions, STATUS_TEXT } from "./data/insights.js";
import { exports } from "./tools/tgdp.js";
import { xrefEntities } from "./data/other.js";

const PASSWORD = process.env.DEMO_PASSWORD || "OpenText1000!";
const SIGN = process.env.MCP_SECRET || PASSWORD;
const PORT = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public");

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "1mb" }));

const baseUrl = (req: any) => process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
const cookieValue = () => createHmac("sha256", SIGN).update("console").digest("hex").slice(0, 32);

function authed(req: any) {
  const c = String(req.headers.cookie || "").split(/;\s*/).find((x) => x.startsWith("tgcs="));
  const v = c?.slice(5) ?? "";
  const want = cookieValue();
  return v.length === want.length && timingSafeEqual(Buffer.from(v), Buffer.from(want));
}

app.get("/healthz", (_req, res) => res.json({ ok: true, tools: TOOLS.length }));

// OAuth discovery probes from MCP clients: this prototype uses token auth, so report no metadata.
app.use("/.well-known", (_req, res) => res.status(404).json({ error: "not_found" }));

// ---- MCP endpoint (bearer token or token-in-path) ---------------------------------------------------
async function mcpRoute(req: any, res: any, token: string | null) {
  const host = hostForToken(token);
  if (!host) return res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized. Provide a valid Trading Grid Context Services token." }, id: null });
  if (req.method !== "POST") return res.status(405).set("Allow", "POST").json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed. This server is stateless; use POST." }, id: null });
  try { await handleMcp(req, res, host, baseUrl(req)); }
  catch (e: any) { if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: String(e?.message ?? e) }, id: null }); }
}
app.all("/mcp", (req, res) => mcpRoute(req, res, String(req.headers.authorization || "").replace(/^Bearer\s+/i, "") || null));
app.all("/mcp/k/:token", (req, res) => mcpRoute(req, res, req.params.token));

// ---- Login ------------------------------------------------------------------------------------------
app.post("/api/login", (req, res) => {
  if (String(req.body?.password ?? "") !== PASSWORD) return res.status(401).json({ error: "Incorrect password." });
  res.setHeader("Set-Cookie", `tgcs=${cookieValue()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}${req.secure ? "; Secure" : ""}`);
  res.json({ ok: true });
});
app.get("/login", (_req, res) => res.sendFile(path.join(PUBLIC, "login.html")));
app.use("/assets", express.static(path.join(PUBLIC, "assets")));

app.use((req, res, next) => {
  if (authed(req)) return next();
  if (req.path.startsWith("/api/")) return res.status(401).json({ error: "Sign in required." });
  return res.redirect("/login");
});

// ---- Console API ------------------------------------------------------------------------------------
app.get("/api/meta", (req, res) => {
  const b = baseUrl(req);
  res.json({
    product: "Trading Grid Context Services", model: MODEL, apiKeyConfigured: apiKeyConfigured(), toolCount: TOOLS.length,
    persona: PERSONA, grant: GRANT, hosts: Object.values(HOSTS),
    agents: AGENTS, useCases: USE_CASES,
    clientStatus,
    mcp: { url: `${b}/mcp`, tokens: Object.fromEntries((Object.keys(HOSTS) as HostKey[]).filter((h) => h !== "tg-aviator").map((h) => [h, { token: tokenFor(h), pathUrl: `${b}/mcp/k/${tokenFor(h)}` }])) },
  });
});

app.get("/api/tools", (_req, res) => res.json(catalog()));

app.post("/api/tools/:name/invoke", (req, res) => {
  const host = (req.body?.host ?? "claude-connector") as HostKey;
  const { out, ms } = invoke(req.params.name, req.body?.args ?? {}, { host, sessionId: "console-try", baseUrl: baseUrl(req) }, "console");
  res.json({ ms, envelope: out });
});

app.post("/api/chat", async (req, res) => {
  const { sessionId, host, agentId, message } = req.body ?? {};
  if (!sessionId || !message || !HOSTS[host as HostKey]) return res.status(400).json({ error: "sessionId, host and message are required." });
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  const emit = (e: any) => res.write(JSON.stringify(e) + "\n");
  try { await runTurn({ sessionId, host, agentId, message, baseUrl: baseUrl(req) }, emit); }
  catch (e: any) { emit({ type: "error", message: String(e?.message ?? e) }); }
  res.end();
});

app.post("/api/sessions/:id/reset", (req, res) => { resetSession(req.params.id); res.json({ ok: true }); });

app.get("/api/plans", (_req, res) => res.json([...plans.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
app.get("/api/plans/:id", (req, res) => { const p = plans.get(req.params.id); return p ? res.json(p) : res.status(404).json({ error: "Plan not found." }); });
app.post("/api/plans/:id/decision", (req, res) => {
  const p = decidePlan(req.params.id, !!req.body?.approve, PERSONA.user);
  return p ? res.json(p) : res.status(404).json({ error: "Plan not found." });
});

app.post("/api/clients/:key/status", (req, res) => {
  const k = req.params.key as HostKey;
  if (!HOSTS[k] || k === "tg-aviator") return res.status(404).json({ error: "Client not found." });
  clientStatus[k] = req.body?.active ? "ACTIVE" : "SUSPENDED";
  res.json({ key: k, status: clientStatus[k] });
});

// ---- Trading Grid Online: TG Insights transactions (first-party UI data) ---------------------------
const DELIVERY: Record<string, string> = { DLVD: "Delivered", FAIL: "Delivery failed", INPR: "In process", RCVD: "Received" };
const tgoRow = (t: any) => ({
  transactionId: t.transactionId, receivedAt: t.receivedAt, sender: t.sender, receiver: t.receiver, senderTransactionId: t.senderTransactionId,
  transactionType: { "850": "PurchaseOrder", "855": "POAcknowledgment", "856": "ShipNotice", "810": "Invoice", "997": "FunctionalAck", "846": "InventoryAdvice", ORDERS: "PurchaseOrder", DESADV: "ShipNotice", INVOIC: "Invoice", CONTRL: "SyntaxAck" }[t.documentType as string] ?? t.documentType,
  ediType: t.documentType, delivery: DELIVERY[t.sourceStatus], sourceStatus: t.sourceStatus, hasError: t.errors.length > 0, fa: t.ack?.status ?? null,
});
app.get("/api/tgo/transactions", (req, res) => {
  const q = req.query as any;
  const from = Date.now() - Number(q.days ?? 7) * 86400_000;
  let rows = transactions.filter((t) => t._t >= from && t.environment === "PRODUCTION" && scopeFilter(t.partnerCompanyId));
  const facets = (key: (t: any) => string) => Object.entries(rows.reduce((m: any, t) => ((m[key(t)] = (m[key(t)] ?? 0) + 1), m), {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8);
  const base = { sender: facets((t) => t.sender.companyName), receiver: facets((t) => t.receiver.companyName), delivery: facets((t) => DELIVERY[t.sourceStatus]), ediType: facets((t) => t.documentType) };
  if (q.delivery) rows = rows.filter((t) => DELIVERY[t.sourceStatus] === q.delivery);
  if (q.sender) rows = rows.filter((t) => t.sender.companyName === q.sender);
  if (q.receiver) rows = rows.filter((t) => t.receiver.companyName === q.receiver);
  if (q.ediType) rows = rows.filter((t) => t.documentType === q.ediType);
  if (q.q) { const v = String(q.q).toUpperCase(); rows = rows.filter((t) => t.transactionId === v || Object.values(t.keys).some((k: any) => String(k.value).toUpperCase() === v) || Object.values(t.controlNumbers).includes(v)); }
  res.json({ total: rows.length, facets: base, rows: rows.slice(0, 60).map(tgoRow) });
});
app.get("/api/tgo/transactions/:id", (req, res) => {
  const t: any = txById(req.params.id);
  if (!t) return res.status(404).json({ error: "Transaction not found." });
  const ack = transactions.find((x) => x.refs.ackForTransactionId === t.transactionId);
  const { _t, ...rest } = t;
  const related = t.refs.poNumber ? transactions.filter((x) => x.transactionId !== t.transactionId && (x.refs.poNumber === t.refs.poNumber || x.refs.ackForTransactionId === t.transactionId)).sort((a, b) => a._t - b._t).map(tgoRow) : transactions.filter((x) => x.refs.ackForTransactionId === t.transactionId).map(tgoRow);
  res.json({ ...rest, related, translated: t.payloadVariants.includes("TRANSLATED") ? renderPayload(t, "TRANSLATED") : null, row: tgoRow(t), statusText: STATUS_TEXT[t.sourceStatus], ack: ack ? { transactionId: ack.transactionId, documentType: ack.documentType, status: ack.ack?.status, code: ack.ack?.code, receivedAt: ack.receivedAt } : null, payloadPreview: renderPayload(t, "ORIGINAL") });
});

app.get("/api/backlog", (_req, res) => {
  try { res.type("application/json").send(readFileSync(path.join(__dirname, "..", "backlog.json"), "utf8")); }
  catch { res.status(404).json({ error: "Backlog not found." }); }
});

app.get("/api/audit", (_req, res) => res.json(audit.slice(0, 200)));

app.get("/api/payload/:id", (req, res) => {
  const t = txById(req.params.id);
  if (!t) return res.status(404).send("Not found");
  res.type("text/plain").send(renderPayload(t, String(req.query.variant ?? "ORIGINAL").toUpperCase()));
});

const csv = (rows: any[]) => { if (!rows.length) return ""; const cols = Object.keys(rows[0]); return [cols.join(","), ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(","))].join("\n"); };
app.get("/api/exports/:id", (req, res) => { const e = exports.get(req.params.id); if (!e) return res.status(404).send("Export not found or expired."); res.type("text/csv").attachment(`${e.productId}-${e.exportId}.csv`).send(csv(e.rows)); });
app.get("/api/xref-export/:entity", (req, res) => { const e = xrefEntities[req.params.entity]; if (!e) return res.status(404).send("Not found"); res.type("text/csv").attachment(`${e.entityName}.csv`).send(csv(Object.entries(e.entries).map(([k, v]: any) => ({ [e.keyColumn]: k, ...v })))); });

// ---- Single-page console --------------------------------------------------------------------------
app.use(express.static(PUBLIC, { index: false }));
app.get(/.*/, (_req, res) => res.sendFile(path.join(PUBLIC, "index.html")));

app.listen(PORT, () => console.log(`Trading Grid Context Services prototype on :${PORT} (model ${MODEL}, ${TOOLS.length} tools, API key ${apiKeyConfigured() ? "set" : "missing"})`));
