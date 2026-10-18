// HTTP server: console (password gate), agent API, tool API and the remote MCP endpoint.
import { sceneS4, sceneServiceNow } from "./data/scenes.js";
import express from "express";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHmac, timingSafeEqual } from "node:crypto";
import { runTurn, resetSession, resetAllSessions, MODEL, apiKeyConfigured } from "./agent.js";
import { agentsFor, deploymentState, published, blocked, resetDeployments, CLIENT_KEYS } from "./deployments.js";
import { changeRequests, provisionings, deliverySchedules } from "./data/other.js";
import { tickets } from "./tools/aviator.js";
import { queries } from "./tools/tgdp.js";
import { catalog, invoke, audit, TOOLS } from "./tools/index.js";
import { HOSTS, GRANT, PERSONA, plans, decidePlan, clientStatus, scopeFilter, HostKey } from "./runtime.js";
import { AGENTS, USE_CASES } from "./agents.js";
import { handleMcp, hostForToken, tokenFor, resetGateway } from "./mcp.js";
import { txById, renderPayload, transactions, STATUS_TEXT, onWorldDay, worldStats } from "./data/insights.js";
import { refreshLifecycle } from "./data/cms.js";
import { findExamples } from "./data/examples.js";
onWorldDay(() => refreshLifecycle());
import { exports } from "./tools/tgdp.js";
import { xrefEntities } from "./data/other.js";
import { resetData } from "./reset.js";
import { loadState } from "./persist.js";
import { scenarioCatalog, SCENARIOS, runOne, runScenarios, coverage } from "./scenarios.js";

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

// OAuth discovery probes from MCP clients: token auth is used, so report no metadata.
app.use("/.well-known", (_req, res) => res.status(404).json({ error: "not_found" }));

// ---- MCP endpoint (bearer token or token-in-path) ---------------------------------------------------
async function mcpRoute(req: any, res: any, token: string | null, connector: "agents" | "context" = "agents") {
  const host = hostForToken(token);
  if (!host) return res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized. Provide a valid Trading Grid Context Connectors token." }, id: null });
  if (req.method !== "POST") return res.status(405).set("Allow", "POST").json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed. Use POST." }, id: null });
  try { await handleMcp(req, res, host, baseUrl(req), connector); }
  catch (e: any) { if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: String(e?.message ?? e) }, id: null }); }
}
app.all("/mcp", (req, res) => mcpRoute(req, res, String(req.headers.authorization || "").replace(/^Bearer\s+/i, "") || null));
app.all("/mcp/k/:token", (req, res) => mcpRoute(req, res, req.params.token, "agents"));
app.all("/mcp/c/:token", (req, res) => mcpRoute(req, res, req.params.token, "context"));

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
  return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
});

// ---- Console API ------------------------------------------------------------------------------------
app.get("/api/meta", (req, res) => {
  const b = baseUrl(req);
  res.json({
    product: "Trading Grid Context Services", model: MODEL, apiKeyConfigured: apiKeyConfigured(), toolCount: TOOLS.length,
    persona: PERSONA, grant: GRANT, hosts: Object.values(HOSTS),
    agents: AGENTS, useCases: USE_CASES,
    clientStatus, examples: findExamples(), world: worldStats(),
    mcp: { url: `${b}/mcp`, tokens: Object.fromEntries((Object.keys(HOSTS) as HostKey[]).filter((h) => h !== "tg-aviator").map((h) => [h, { token: tokenFor(h), pathUrl: `${b}/mcp/k/${tokenFor(h)}`, contextUrl: `${b}/mcp/c/${tokenFor(h)}` }])) },
  });
});

app.get("/api/tools", (_req, res) => res.json(catalog()));

app.post("/api/tools/:name/invoke", (req, res) => {
  const host = (req.body?.host ?? "claude-connector") as HostKey;
  const { out, ms } = invoke(req.params.name, req.body?.args ?? {}, { host, sessionId: "console-try", baseUrl: baseUrl(req) }, "console");
  res.json({ ms, envelope: out });
});

app.get("/api/scene/s4", (_req, res) => res.json(sceneS4()));
app.get("/api/scene/servicenow", (_req, res) => res.json(sceneServiceNow()));

app.post("/api/chat", async (req, res) => {
  const { sessionId, host, agentId, message, context, connector } = req.body ?? {};
  if (!sessionId || !message || !HOSTS[host as HostKey]) return res.status(400).json({ error: "sessionId, host and message are required." });
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  const emit = (e: any) => res.write(JSON.stringify(e) + "\n");
  const tgAgent = agentId === "tg-aviator";
  if (tgAgent && connector === "context") { emit({ type: "error", message: "Trading Grid Agent is offered through Trading Grid Agent Connectors. Trading Grid Context Connectors expose tools only." }); return res.end(); }
  if (!tgAgent && HOSTS[host as HostKey].exposure === "External" && !agentsFor(host).some((a) => a.id === agentId)) {
    emit({ type: "error", message: `Agent not available to ${HOSTS[host as HostKey].name}. Publish it in Aviator Studio Deployments or unblock it in Trading Grid Online Agent access.` });
    return res.end();
  }
  try { await runTurn({ sessionId, host, agentId, message, context: typeof context === "string" ? context : undefined, connector: connector === "context" ? "context" : "agents", baseUrl: baseUrl(req) }, emit); }
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
  const rest = t.toJSON();
  const related = t.refs.poNumber ? transactions.filter((x) => x.transactionId !== t.transactionId && (x.refs.poNumber === t.refs.poNumber || x.refs.ackForTransactionId === t.transactionId)).sort((a, b) => a._t - b._t).map(tgoRow) : transactions.filter((x) => x.refs.ackForTransactionId === t.transactionId).map(tgoRow);
  res.json({ ...rest, related, translated: t.payloadVariants.includes("TRANSLATED") ? renderPayload(t, "TRANSLATED") : null, row: tgoRow(t), statusText: STATUS_TEXT[t.sourceStatus], ack: ack ? { transactionId: ack.transactionId, documentType: ack.documentType, status: ack.ack?.status, code: ack.ack?.code, receivedAt: ack.receivedAt } : null, payloadPreview: renderPayload(t, "ORIGINAL") });
});

app.get("/api/deployments", (_req, res) => res.json({ clients: CLIENT_KEYS, agents: deploymentState() }));
app.post("/api/deployments", (req, res) => {
  const { agentId, host, published: on } = req.body ?? {};
  if (!published[agentId] || !CLIENT_KEYS.includes(host)) return res.status(400).json({ error: "Unknown agent or client." });
  if (on) published[agentId].add(host); else published[agentId].delete(host);
  res.json({ agents: deploymentState() });
});
app.post("/api/clients/:key/agents/:agentId", (req, res) => {
  const k = req.params.key as HostKey;
  if (!blocked[k]) return res.status(404).json({ error: "Client not found." });
  if (req.body?.blocked) blocked[k].add(req.params.agentId); else blocked[k].delete(req.params.agentId);
  res.json({ agents: deploymentState() });
});

// Demo reset: restore seeded state between recordings.
app.post("/api/demo/reset", (_req, res) => {
  resetData(); resetAllSessions(); resetGateway();
  res.json({ ok: true, resetAt: new Date().toISOString() });
});

// Scenario library
app.get("/api/scenarios", (_req, res) => {
  const covered = new Set(coverage());
  const all = [...TOOLS.map((t) => t.name), "search_knowledge", "create_support_ticket", "get_map_rule", "get_connection_status"];
  res.json({ scenarios: scenarioCatalog(), coverage: { tools: all.length, covered: all.filter((n) => covered.has(n)).length } });
});
app.post("/api/scenarios/run", (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const trim = (r: any, full: boolean) => ({ ...r, steps: r.steps.map((st: any) => ({ ...st, out: full ? st.out : undefined })) });
  if (req.body?.all) return res.json({ results: runScenarios(undefined, base).map((r) => trim(r, false)) });
  const list = SCENARIOS.filter((x) => ids.includes(x.id));
  if (!list.length) return res.status(400).json({ error: "No scenarios selected. Provide scenario IDs or all=true." });
  res.json({ results: list.map((x) => trim(runOne(x, base), true)) });
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
// Copilot client as an installable home-screen app (full screen on iOS Safari).
const APP_HEAD = `<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="Copilot"><meta name="theme-color" content="#f5f2ee"><link rel="manifest" href="/assets/copilot.webmanifest"><link rel="apple-touch-icon" href="/assets/copilot-icon-180.png">`;
app.get("/copilot", (_req, res) => {
  const html = readFileSync(path.join(PUBLIC, "index.html"), "utf8")
    .replace('<meta name="viewport" content="width=device-width, initial-scale=1">', '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1">' + APP_HEAD)
    .replace("<title>Trading Grid Context Services</title>", "<title>Copilot</title>");
  res.type("html").send(html);
});
app.get(/.*/, (_req, res) => res.sendFile(path.join(PUBLIC, "index.html")));

try { await loadState(); } catch (e: any) { console.error("Persistence: load failed; continuing in memory:", e?.message ?? e); }
app.listen(PORT, () => console.log(`Trading Grid Context Services on :${PORT} (model ${MODEL}, ${TOOLS.length} tools, API key ${apiKeyConfigured() ? "set" : "missing"}, ${worldStats().visible} transactions visible, ${worldStats().pending} scheduled)`));
