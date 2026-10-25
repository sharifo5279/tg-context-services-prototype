// Command Center client endpoint: Trading Grid Agent Connectors (MCP, Streamable HTTP, stateless) for the
// Command Center tenant. Browser calls from the Command Center origin only, one token per perspective,
// and a per-tenant agent call limit at the gateway.
import { createHmac } from "node:crypto";
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { CC_TOOLS, ccInvoke } from "./tools.js";
import { runCcAgent, ccAgentReady } from "./agent.js";
import { CC_CLIENTS, CcCtx, FollowUp, Perspective } from "./tenant.js";

const ORIGINS = (process.env.CC_ALLOWED_ORIGINS || "https://process-genome.onrender.com,http://localhost:8765,http://127.0.0.1:8765").split(",").map((x) => x.trim()).filter(Boolean);
const SECRET = process.env.CC_CLIENT_SECRET || "command-center-demo";
const PER_MINUTE = Number(process.env.CC_AGENT_CALLS_PER_MINUTE || 20);
const PER_DAY = Number(process.env.CC_AGENT_CALLS_PER_DAY || 400);

/** Public client token for a perspective. Bound to the Command Center origin, not a secret credential. */
export const ccTokenFor = (p: Perspective) => `tgcs_commandcenter_${p}_${createHmac("sha256", SECRET).update(p).digest("hex").slice(0, 16)}`;
const perspectiveFor = (token: string): Perspective | null => (["retailer", "supplier"] as Perspective[]).find((p) => ccTokenFor(p) === token) ?? null;

const minute = new Map<string, number[]>(), day = new Map<string, { d: string; n: number }>();
function allow(p: string) {
  const now = Date.now(), list = (minute.get(p) ?? []).filter((t) => now - t < 60_000), today = new Date().toISOString().slice(0, 10), d = day.get(p);
  if (list.length >= PER_MINUTE) return `agent call limit reached (${PER_MINUTE} per minute). Retry in a minute.`;
  if (d && d.d === today && d.n >= PER_DAY) return `daily agent call limit reached (${PER_DAY}).`;
  list.push(now); minute.set(p, list); day.set(p, { d: today, n: d && d.d === today ? d.n + 1 : 1 });
  return null;
}

const agentTool = {
  name: "trading_grid_agent", title: "Trading Grid Agent",
  description: "Trading Grid Agent, the agent behind Trading Grid Aviator. Answers questions about partners, findings, follow-ups, anomalies, processes and transactions for this Command Center tenant, using sub-agents (Ivy, Lex, Nora, Liz, Reese, Daily Summarizer, Community Insights, Transaction Finder). Read only. Returns the answer, the sub-agents used and the evidence trail.",
  inputSchema: { type: "object", additionalProperties: false, required: ["request"], properties: {
    request: { type: "string", description: "What you want the agent to do, in plain language." },
    conversation_id: { type: "string", description: "Conversation ID returned by a previous call, to continue it." },
    screen_context: { type: "string", description: "What the user sees in Command Center: the screen and the open follow-up." },
    network_time: { type: "string", description: "Command Center network time, HH:MM ET." },
    follow_ups: { type: "array", description: "Follow-up state from the Command Center session.", items: { type: "object", additionalProperties: true } },
  } },
  annotations: { title: "Trading Grid Agent", readOnlyHint: true, openWorldHint: false },
};

function ctxFrom(p: Perspective, args: any): CcCtx {
  const fu: Record<string, FollowUp> = {};
  for (const f of Array.isArray(args?.follow_ups) ? args.follow_ups.slice(0, 40) : []) if (f && typeof f.id === "string") fu[f.id] = { id: f.id, state: f.state, owner: f.owner, waitingOn: f.waitingOn, expectBy: f.expectBy, since: f.since, activity: Array.isArray(f.activity) ? f.activity.slice(0, 8).map(String) : [] };
  const t = /^\d\d:\d\d$/.test(String(args?.network_time)) ? String(args.network_time) : "09:30";
  return { perspective: p, networkTime: t, followUps: fu, sessionId: `cc-${p}` };
}

function build(p: Perspective) {
  const c = CC_CLIENTS[p];
  const server = new Server({ name: "trading-grid-agent-connectors", version: "0.3.0" }, { capabilities: { tools: {} }, instructions: `Trading Grid Agent Connectors for ${c.company} (Command Center). Read only. Every response is an evidence envelope with source references, completeness and the access decision.` });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [agentTool, ...CC_TOOLS.map((t) => ({ name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema, annotations: { title: t.title, readOnlyHint: true, openWorldHint: false } }))] }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const args: any = req.params.arguments ?? {};
    if (req.params.name === agentTool.name) {
      const block = allow(p);
      if (block) return { content: [{ type: "text", text: `Aviator AKS gateway: ${block}` }], isError: true };
      if (!ccAgentReady()) return { content: [{ type: "text", text: "Agent runtime unavailable. Model API key not configured." }], isError: true };
      const conv = typeof args.conversation_id === "string" && /^[\w-]{4,40}$/.test(args.conversation_id) ? args.conversation_id : `cv-${Math.random().toString(36).slice(2, 10)}`;
      const r = await runCcAgent(ctxFrom(p, args), String(args.request ?? "").slice(0, 2000), conv, typeof args.screen_context === "string" ? args.screen_context : undefined);
      const lines = ["# Trading Grid Agent", r.subagents.length ? `Sub-agents: ${r.subagents.join(", ")}` : "", "", r.text.trim(), "", "---", `Evidence: ${r.steps.filter((s) => s.tool !== "engage_subagent").length} Trading Grid call(s) via ${r.route.join(" > ")}, ${Math.round(r.ms / 1000)} s`, ...r.steps.filter((s) => s.tool !== "engage_subagent").map((s) => `- ${s.tool}${s.subagent ? ` [${s.subagent}]` : ""}: ${s.status}${s.summary ? `, ${s.summary}` : ""}`), "", `conversation_id: ${r.conversationId}`];
      return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { answer: r.text.trim(), subagents: r.subagents, steps: r.steps, route: r.route, ms: r.ms, conversationId: r.conversationId, company: c.company, grantId: c.grantId }, isError: r.error };
    }
    const { out } = ccInvoke(req.params.name, args, ctxFrom(p, args));
    return { content: [{ type: "text", text: JSON.stringify(out, null, 1) }], isError: out.status !== "OK" };
  });
  return server;
}

export const ccRouter = express.Router();
ccRouter.use((req, res, next) => {
  const origin = String(req.headers.origin || "");
  if (origin && ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
    res.setHeader("Access-Control-Max-Age", "600");
  }
  if (req.method === "OPTIONS") return res.status(origin && ORIGINS.includes(origin) ? 204 : 403).end();
  next();
});
ccRouter.get("/health", (_req, res) => res.json({ ok: true, agent: ccAgentReady(), tenants: Object.values(CC_CLIENTS).map((c) => c.company) }));
ccRouter.post("/mcp", async (req, res) => {
  const origin = String(req.headers.origin || "");
  if (!ORIGINS.includes(origin)) return res.status(403).json({ jsonrpc: "2.0", error: { code: -32001, message: "Origin not allowed for the Command Center client." }, id: null });
  const p = perspectiveFor(String(req.headers.authorization || "").replace(/^Bearer\s+/i, ""));
  if (!p) return res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized. Provide a valid Command Center client token." }, id: null });
  const server = build(p), transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => { transport.close(); server.close(); });
  try { await server.connect(transport); await transport.handleRequest(req, res, req.body); }
  catch (e: any) { if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: String(e?.message ?? e) }, id: null }); }
});
