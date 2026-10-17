// Remote MCP endpoint (Streamable HTTP, stateless). Bearer token per ecosystem identifies the caller.
import { createHmac } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema, CallToolRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, invoke } from "./tools/index.js";
import { HOSTS, HostKey, checkOperation, Ctx } from "./runtime.js";
import { AGENTS, USE_CASES, agentById } from "./agents.js";
import { agentsFor, agentForTool, toolNameFor } from "./deployments.js";
import { runAgentForCaller } from "./agent.js";
import { audit } from "./tools/index.js";

// Aviator AKS gateway: per-client agent call limit (demo value).
const LIMIT = Number(process.env.AGENT_CALLS_PER_HOUR || 40);
const calls = new Map<string, number[]>();
export const resetGateway = () => calls.clear();
function gatewayAllow(host: string) {
  const now = Date.now();
  const list = (calls.get(host) ?? []).filter((t) => now - t < 3600_000);
  if (list.length >= LIMIT) { calls.set(host, list); return new Date(list[0] + 3600_000); }
  list.push(now); calls.set(host, list); return null;
}

function agentToolDef(a: any) {
  return {
    name: toolNameFor(a.id),
    title: a.name,
    description: `Trading Grid Aviator agent. ${a.role} Runs inside Trading Grid Context Services under your Trading Grid grant and returns the answer with its evidence trail. Pass conversation_id to continue a conversation, for example after approving a prepared change.`,
    inputSchema: { type: "object", properties: { request: { type: "string", description: "What you want the agent to do, in plain language." }, conversation_id: { type: "string", description: "Conversation ID returned by a previous call, to continue it." } }, required: ["request"], additionalProperties: false },
    annotations: { title: a.name, readOnlyHint: false, openWorldHint: false },
  };
}

function formatAgentResult(a: any, host: HostKey, r: any) {
  const route = HOSTS[host].route.join(" > ");
  const lines = [`# ${a.name}`, "", r.text.trim() || "(no answer)", "", "---", `Evidence: ${r.steps.length} Trading Grid call(s) via ${route}, ${Math.round(r.ms / 1000)} s`];
  for (const st of r.steps) lines.push(`- ${st.tool}: ${st.status}${st.completeness && st.completeness !== "COMPLETE" ? ` (${st.completeness})` : ""}${st.summary ? `, ${st.summary}` : ""}`);
  for (const p of r.plans) lines.push("", `Approval required: plan ${p.planId} (${p.summary}). An authorized user approves it at ${p.approvalUrl}. Then call ${toolNameFor(a.id)} again with conversation_id "${r.conversationId}" and request "Plan ${p.planId} is approved. Submit it."`);
  lines.push("", `conversation_id: ${r.conversationId}`);
  return lines.join("\n");
}

const SECRET = process.env.MCP_SECRET || process.env.DEMO_PASSWORD || "OpenText1000!";

export function tokenFor(host: HostKey) {
  return `tgcs_${host.replace(/-/g, "")}_${createHmac("sha256", SECRET).update(host).digest("hex").slice(0, 20)}`;
}

export function hostForToken(token?: string | null): HostKey | null {
  if (!token) return null;
  return (Object.keys(HOSTS) as HostKey[]).filter((h) => h !== "tg-aviator").find((h) => tokenFor(h) === token) ?? null;
}

function buildServer(ctx: Ctx) {
  const server = new Server({ name: "trading-grid-context-services", version: "0.2.0" }, { capabilities: { tools: {}, prompts: {} }, instructions: "Trading Grid Context Services. Every response is an evidence envelope with source references, completeness and the access decision. Changes use prepare, approve, submit." });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...(checkOperation(ctx, "agent.invoke") ? [] : agentsFor(ctx.host).map(agentToolDef)), ...TOOLS.filter((t) => !checkOperation(ctx, t.operation)).map((t) => ({
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: { title: t.title, readOnlyHint: t.kind === "read", destructiveHint: t.kind === "write", openWorldHint: false },
    }))],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const ag = agentForTool(req.params.name);
    if (ag) {
      const denial = checkOperation(ctx, "agent.invoke");
      const allowed = agentsFor(ctx.host).some((x) => x.id === ag.id);
      const t0 = Date.now();
      const rec = (decision: string, status: string, ms: number) => { audit.unshift({ at: new Date().toISOString(), route: HOSTS[ctx.host].route.join(" > "), host: ctx.host, principal: HOSTS[ctx.host].principal, sessionId: ctx.sessionId, channel: "mcp", tool: req.params.name, operation: "agent.invoke", decision, status, ms, args: { request: String((req.params.arguments as any)?.request ?? "").slice(0, 200) } }); };
      if (denial || !allowed) { rec("DENY", "DENIED", 5); return { content: [{ type: "text", text: denial ?? `${ag.name} is not published to ${HOSTS[ctx.host].name}, or the customer administrator has blocked it in Trading Grid Online.` }], isError: true }; }
      const retry = gatewayAllow(ctx.host);
      if (retry) { rec("DENY", "RATE_LIMITED", 2); return { content: [{ type: "text", text: `Aviator AKS gateway: agent call limit reached for ${HOSTS[ctx.host].name} (${LIMIT} per hour). Retry after ${retry.toISOString()}.` }], isError: true }; }
      const args: any = req.params.arguments ?? {};
      const r = await runAgentForCaller({ host: ctx.host, agentId: ag.id, request: String(args.request ?? ""), conversationId: args.conversation_id, baseUrl: ctx.baseUrl });
      rec("PERMIT", r.error ? "ERROR" : "OK", Date.now() - t0);
      return { content: [{ type: "text", text: formatAgentResult(ag, ctx.host, r) }], isError: !!r.error };
    }
    const { out } = invoke(req.params.name, req.params.arguments ?? {}, ctx, "mcp");
    return { content: [{ type: "text", text: JSON.stringify(out, null, 1) }], isError: out.status === "ERROR" || out.status === "DENIED" };
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: agentsFor(ctx.host).map((a) => ({ name: a.id, title: a.name, description: a.role, arguments: [{ name: "request", description: "What to investigate", required: false }] })),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (req) => {
    const a = AGENTS.find((x) => x.id === req.params.name);
    if (!a) throw new Error("Unknown prompt");
    const st0 = a.starters[0];
    const starter = typeof st0 === "string" ? st0 : USE_CASES.find((u) => u.n === st0)?.prompt ?? "";
    const text = [`Act as the ${a.name}. ${a.role}`, ...a.instructions.map((i) => `${i.title}: ${i.body.replace(/## /g, "")}`), `Use only Trading Grid Context Services tools.`, `Request: ${req.params.arguments?.request || starter}`].join("\n\n");
    return { description: a.role, messages: [{ role: "user", content: { type: "text", text } }] };
  });
  return server;
}

export async function handleMcp(req: any, res: any, host: HostKey, baseUrl: string) {
  const ctx: Ctx = { host, sessionId: `mcp-${host}`, baseUrl };
  const server = buildServer(ctx);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
