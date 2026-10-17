// HTTP server: console (password gate), agent API, tool API and the remote MCP endpoint.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, timingSafeEqual } from "node:crypto";
import { runTurn, resetSession, MODEL, apiKeyConfigured } from "./agent.js";
import { catalog, invoke, audit, TOOLS } from "./tools/index.js";
import { HOSTS, GRANT, PERSONA, plans, decidePlan, HostKey } from "./runtime.js";
import { AGENTS, USE_CASES } from "./agents.js";
import { handleMcp, hostForToken, tokenFor } from "./mcp.js";
import { txById, renderPayload } from "./data/insights.js";
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
    mcp: { url: `${b}/mcp`, tokens: Object.fromEntries((Object.keys(HOSTS) as HostKey[]).map((h) => [h, { token: tokenFor(h), pathUrl: `${b}/mcp/k/${tokenFor(h)}` }])) },
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
