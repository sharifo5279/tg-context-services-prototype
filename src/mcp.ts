// Remote MCP endpoint (Streamable HTTP, stateless). Bearer token per ecosystem identifies the caller.
import { createHmac } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema, CallToolRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, invoke } from "./tools/index.js";
import { HOSTS, HostKey, checkOperation, Ctx } from "./runtime.js";
import { AGENTS, USE_CASES } from "./agents.js";

const SECRET = process.env.MCP_SECRET || process.env.DEMO_PASSWORD || "OpenText1000!";

export function tokenFor(host: HostKey) {
  return `tgcs_${host.replace(/-/g, "")}_${createHmac("sha256", SECRET).update(host).digest("hex").slice(0, 20)}`;
}

export function hostForToken(token?: string | null): HostKey | null {
  if (!token) return null;
  return (Object.keys(HOSTS) as HostKey[]).find((h) => tokenFor(h) === token) ?? null;
}

function buildServer(ctx: Ctx) {
  const server = new Server({ name: "trading-grid-context-services", version: "0.1.0" }, { capabilities: { tools: {}, prompts: {} }, instructions: "Trading Grid Context Services (prototype, seeded data). Every response is an evidence envelope with source references, completeness and the access decision. Changes use prepare, approve, submit." });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.filter((t) => !checkOperation(ctx, t.operation)).map((t) => ({
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: { title: t.title, readOnlyHint: t.kind === "read", destructiveHint: t.kind === "write", openWorldHint: false },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { out } = invoke(req.params.name, req.params.arguments ?? {}, ctx, "mcp");
    return { content: [{ type: "text", text: JSON.stringify(out, null, 1) }], isError: out.status === "ERROR" || out.status === "DENIED" };
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: AGENTS.map((a) => ({ name: a.id, title: a.name, description: a.role, arguments: [{ name: "request", description: "What to investigate", required: false }] })),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (req) => {
    const a = AGENTS.find((x) => x.id === req.params.name);
    if (!a) throw new Error("Unknown prompt");
    const starter = USE_CASES.find((u) => u.n === a.starters[0])!.prompt;
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
