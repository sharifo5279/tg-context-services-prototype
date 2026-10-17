// Agent loop: Claude with Trading Grid Context Services tools, streamed to the console as NDJSON events.
import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, invoke } from "./tools/index.js";
import { agentById } from "./agents.js";
import { HOSTS, PERSONA, HostKey, Ctx } from "./runtime.js";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
export const apiKeyConfigured = () => !!client;

type Session = { messages: any[]; host: HostKey; agentId: string; updated: number };
const sessions = new Map<string, Session>();

export function resetSession(id: string) {
  sessions.delete(id);
}

function systemPrompt(agentId: string, host: HostKey) {
  const a = agentById(agentId);
  const h = HOSTS[host];
  return [
    `You are ${a.name}, running in ${h.name} for ${PERSONA.company}. The user is ${PERSONA.name}, ${PERSONA.title}.`,
    host === "tg-aviator"
      ? "You run inside Trading Grid Online and use Trading Grid services directly with the user's access rights."
      : `You reach OpenText Trading Grid only through Trading Grid Context Services MCP tools${h.exposure === "External" ? ", via the Aviator AKS gateway" : ""}. Execution principal: ${h.principal} (${h.principalType === "SERVICE_IDENTITY" ? "service identity, no user delegation" : "delegated user"}).`,
    `Current time: ${new Date().toISOString()}.`,
    "",
    a.role,
    "",
    ...a.instructions.map((i) => `### ${i.title}\n${i.body}`),
    "",
    "### Evidence rules",
    "- Ground every statement in tool results. Do not invent identifiers, partners or statuses.",
    "- Resolve partner names first when ambiguous; if a tool returns candidates, ask the user to choose.",
    "- Preserve source status and its interpretation. A missing acknowledgment is unknown, not a rejection. Configuration is not observed activity. Accepted is not completed.",
    "- When a result is PARTIAL or lists missingEvidence, say so in one line.",
    "- When a tool returns DENIED or UNSUPPORTED_OPERATION, state it plainly with the next action. Do not work around it.",
    "",
    "### Changes",
    "- Never claim a change was made unless a submit or apply tool returned status OK.",
    "- To change anything, call the prepare tool. When it returns APPROVAL_REQUIRED, stop and tell the user an approval card is shown. Do not call the submit tool in the same turn.",
    "- When the user says a plan is approved, call the submit or apply tool with that plan_id, then report the result and how to track it.",
    "",
    "### Style",
    "- Enterprise tone. Short sentences. No emojis. No em dashes.",
    "- Use markdown tables for lists of records. Bold only key identifiers.",
    "- End with a short 'Sources' line naming the Trading Grid products used (for example: TG Insights, Community Management, Cartographer).",
  ].join("\n");
}

function toolsFor(agentId: string) {
  const a = agentById(agentId);
  const list = a.tools === "ALL" ? TOOLS : TOOLS.filter((t) => (a.tools as string[]).includes(t.name));
  return list.map((t, i) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
    ...(i === list.length - 1 ? { cache_control: { type: "ephemeral" } } : {}),
  }));
}

function summarize(out: any) {
  const r = out?.result ?? {};
  const bits: string[] = [];
  if (r.counts?.documents != null) bits.push(`${r.counts.documents} documents`);
  if (r.transactions) bits.push(`${r.transactions.length} returned`);
  if (r.findingCount != null) bits.push(`${r.findingCount} findings`);
  if (r.summary?.documentsChecked != null) bits.push(`${r.summary.documentsChecked} checked, ${r.summary.missing} missing, ${r.summary.rejected} rejected`);
  if (r.totalRows != null) bits.push(`${r.totalRows} rows`);
  if (r.candidates) bits.push(`${r.candidates.length} candidates`);
  if (out?.error) bits.push(out.error.code);
  return bits.join(" · ");
}

export async function runTurn(opts: { sessionId: string; host: HostKey; agentId: string; message: string; baseUrl: string }, emit: (e: any) => void) {
  if (!client) {
    emit({ type: "error", message: "Agent runtime unavailable. ANTHROPIC_API_KEY is not set on the server. Tools remain available in the Tools catalog." });
    return;
  }
  let s = sessions.get(opts.sessionId);
  if (!s || s.host !== opts.host || s.agentId !== opts.agentId) {
    s = { messages: [], host: opts.host, agentId: opts.agentId, updated: Date.now() };
    sessions.set(opts.sessionId, s);
  }
  s.updated = Date.now();
  s.messages.push({ role: "user", content: opts.message });
  const ctx: Ctx = { host: opts.host, sessionId: opts.sessionId, baseUrl: opts.baseUrl };
  const system = [{ type: "text", text: systemPrompt(opts.agentId, opts.host), cache_control: { type: "ephemeral" } }];
  const tools = toolsFor(opts.agentId);
  emit({ type: "start", model: MODEL, toolCount: tools.length });

  for (let step = 0; step < 14; step++) {
    emit({ type: "thinking", step });
    let msg: any;
    try {
      const stream = client.messages.stream({ model: MODEL, max_tokens: 4096, system: system as any, tools: tools as any, messages: s.messages });
      stream.on("text", (delta: string) => emit({ type: "text", delta }));
      msg = await stream.finalMessage();
    } catch (e: any) {
      emit({ type: "error", message: `Model request failed: ${e?.message ?? e}` });
      s.messages.pop();
      return;
    }
    s.messages.push({ role: "assistant", content: msg.content });
    const calls = msg.content.filter((b: any) => b.type === "tool_use");
    if (!calls.length || msg.stop_reason !== "tool_use") {
      emit({ type: "done", usage: msg.usage });
      return;
    }
    const results: any[] = [];
    for (const c of calls) {
      emit({ type: "tool_call", id: c.id, name: c.name, input: c.input });
      const { out, ms, tool } = invoke(c.name, c.input, ctx, "console");
      emit({
        type: "tool_result", id: c.id, name: c.name, ms, status: out.status,
        decision: out.access?.decision, product: tool?.product, binding: tool?.binding, basis: tool?.basis,
        completeness: out.evidence?.completeness, summary: summarize(out), envelope: out, route: HOSTS[opts.host].route,
      });
      if (out.status === "APPROVAL_REQUIRED") emit({ type: "approval", plan: out.result });
      const text = JSON.stringify(out);
      results.push({ type: "tool_result", tool_use_id: c.id, content: text.length > 14000 ? text.slice(0, 14000) + "...(truncated)" : text });
    }
    s.messages.push({ role: "user", content: results });
  }
  emit({ type: "done", note: "Step limit reached." });
}
