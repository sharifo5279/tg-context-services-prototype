// Trading Grid Agent for the Command Center tenant. Same model, answer format and evidence trail as the other
// clients, with this tenant's tools and grant only. Command Center observes the network; the agent never changes documents.
import Anthropic from "@anthropic-ai/sdk";
import { MODEL, ANSWER_FORMAT } from "../agent.js";
import { CC_TOOLS, ccInvoke } from "./tools.js";
import { CC_CLIENTS, CcCtx, tenantFor } from "./tenant.js";

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

/** Sub-agents the Trading Grid Agent engages for Command Center questions. */
const SUBAGENTS = [
  { id: "ivy", name: "Ivy, Volume agent", does: "Volume against projection by partner and hour; missing documents and volume drops.", tools: ["ccim_list_anomalies", "ccim_get_network_activity", "ccpm_get_finding"] },
  { id: "lex", name: "Lex, Timing and SLA agent", does: "Acknowledgment windows and ship notice timing.", tools: ["ccpm_list_findings", "ccpm_get_finding", "ccpm_list_rules"] },
  { id: "nora", name: "Nora, Conformance agent", does: "Documents against partner rules: price, quantity, labels and required fields.", tools: ["ccpm_list_findings", "ccpm_get_finding", "ccpm_list_rules"] },
  { id: "liz", name: "Liz, Process agent", does: "Business processes across their EDI documents.", tools: ["ccpm_get_process_health", "ccpm_list_findings"] },
  { id: "reese", name: "Reese, Reconciliation agent", does: "Values across orders, shipments, invoices and remittances; deductions.", tools: ["ccpm_get_finding", "search_transactions"] },
  { id: "daily-summarizer", name: "Daily Summarizer Agent", does: "Yesterday's digest and today's network activity.", tools: ["ccim_get_daily_digest", "ccim_get_network_activity"] },
  { id: "community-insights", name: "Community Insights Agent", does: "Partners, connections, required documents and processing errors.", tools: ["ccim_list_trading_community", "ccim_get_partner_details"] },
  { id: "transaction-finder", name: "Transaction Finder Agent", does: "Transactions by reference or control number.", tools: ["search_transactions"] },
];

type Session = { messages: any[]; updated: number };
const sessions = new Map<string, Session>();
setInterval(() => { const cut = Date.now() - 2 * 3600_000; for (const [k, s] of sessions) if (s.updated < cut) sessions.delete(k); }, 600_000).unref?.();

function systemPrompt(ctx: CcCtx) {
  const c = CC_CLIENTS[ctx.perspective], T = tenantFor(ctx.perspective);
  return [
    `You are the Trading Grid Agent, the agent behind Trading Grid Aviator, answering in the Aviator panel of OpenText Command Center for ${c.company} (${ctx.perspective === "retailer" ? "a retailer" : "a CPG supplier"}). The user is ${T.user.name}, ${T.user.title}.`,
    `Command Center reaches you through Trading Grid Agent Connectors (MCP). Execution principal: ${c.principal} (delegated user). Grant ${c.grantId}, organization ${c.organization}. Read only.`,
    `Network time: ${ctx.networkTime || "09:30"} ET on Saturday, 24 October 2026. Yesterday was Friday, 23 October.`,
    "",
    "### Command Center",
    `- Command Center observes EDI and API traffic between ${c.company} and its trading partners on Trading Grid. It does not create, change, resend, redeliver or reprocess documents.`,
    "- People act on a finding through its follow-up: Assign to me, Notify partner, Notify team, Log reply, Mark as known issue, Open in TG Insights. The next documents on the network confirm recovery.",
    "- Never offer to resend, reprocess, redeliver, fix or change a document, map or connection. Name the follow-up action and who owes the next document instead.",
    "- Follow-up states: New, Assigned, Waiting on partner, Waiting on us, Recovering, Verified, Closed, Known issue. 'Need action' means New, Assigned or overdue.",
    "- Modules: Integration Monitor (Ivy, the volume agent: anomalies and missing documents), Performance Monitor (Lex, Nora, Liz, Reese: rules), Retail pack (retail cases and policies).",
    "",
    ...ANSWER_FORMAT,
    "- In an actions block, prompts must be questions for you to answer, not actions on documents.",
    "",
    "### Accuracy",
    "- Every statement comes from tool results or the screen context. Never invent partners, identifiers, statuses, times or amounts.",
    "- A missing acknowledgment or document is 'not received', never 'rejected'. Waiting is not recovered. A reply by email does not close a follow-up.",
    "- Follow-up state, owner and expect-by come from the Command Center session; report them as they are.",
    "- Payment status is not visible to Command Center. Say so when asked about payments.",
    "- Business processes run over days to months: an 856 can follow an 850 by days, an 810 by weeks, an 820 after 30, 60 or 90 day terms. A document that has not arrived yet is not a finding while it is inside its expected window. A finding exists only when a rule, partner agreement or projection says the window has passed or will be missed. Say 'in window' for open documents that are not late.",
    "- Use only data from the licensed modules listed in the screen context.",
    "- Keep tool calls lean: one list call usually answers; open a finding only when its detail is needed.",
  ].join("\n");
}

function toolDefs() {
  const list: any[] = CC_TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
  list.push({ name: "engage_subagent", description: `Engage a Trading Grid sub-agent for the current question. Returns its role and tools. Sub-agents: ${SUBAGENTS.map((x) => `${x.id} (${x.name})`).join("; ")}.`,
    input_schema: { type: "object", properties: { subagent: { type: "string", enum: SUBAGENTS.map((x) => x.id) }, reason: { type: "string" } }, required: ["subagent"] } });
  list[list.length - 1].cache_control = { type: "ephemeral" };
  return list;
}

function summarize(out: any) {
  const r = out?.result ?? {};
  if (r.findingCount != null) return `${r.findingCount} findings`;
  if (r.anomalies) return `${r.anomalies.length} watchlists`;
  if (r.partners) return `${r.partners.length} partners`;
  if (r.transactions) return `${r.returned} transactions`;
  if (r.rules) return `${r.rules.length} rules`;
  if (r.processes) return `${r.processes.length} processes`;
  if (r.title) return r.title;
  if (r.name) return r.name;
  if (out?.error) return out.error.code;
  return "";
}

export const ccAgentReady = () => !!client;

export async function runCcAgent(ctx: CcCtx, request: string, conversationId: string, context?: string) {
  const t0 = Date.now(), c = CC_CLIENTS[ctx.perspective];
  const steps: any[] = [], subagents: string[] = [];
  if (!client) return { conversationId, text: "Agent runtime unavailable. Model API key not configured.", steps, subagents, ms: 0, error: true, route: c.route };
  const key = `${ctx.perspective}:${conversationId}`;
  let s = sessions.get(key); if (!s) { s = { messages: [], updated: Date.now() }; sessions.set(key, s); }
  s.updated = Date.now();
  s.messages.push({ role: "user", content: context ? `<screen_context>\n${String(context).slice(0, 6000)}\n</screen_context>\n\n${request}` : request });
  const system = [{ type: "text", text: systemPrompt(ctx), cache_control: { type: "ephemeral" } }], tools = toolDefs();
  let text = "", error = "";
  for (let step = 0; step < 8; step++) {
    let msg: any;
    try { msg = await client.messages.create({ model: MODEL, max_tokens: 2048, system: system as any, tools: tools as any, messages: s.messages }); }
    catch (e: any) { error = `Model request failed: ${e?.message ?? e}`; s.messages.pop(); break; }
    s.messages.push({ role: "assistant", content: msg.content });
    const said = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const calls = msg.content.filter((b: any) => b.type === "tool_use");
    if (!calls.length || msg.stop_reason !== "tool_use") { text = said; break; }
    const results: any[] = [];
    for (const call of calls) {
      if (call.name === "engage_subagent") {
        const a = SUBAGENTS.find((x) => x.id === call.input?.subagent);
        if (a && !subagents.includes(a.name)) subagents.push(a.name);
        steps.push({ tool: call.name, status: a ? "OK" : "DENIED", summary: a?.name ?? "Unknown sub-agent", ms: 0 });
        results.push({ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(a ? { status: "OK", subagent: a.name, role: a.does, tools: a.tools } : { status: "DENIED", error: "Sub-agent not available." }) });
        continue;
      }
      const { out, ms, tool } = ccInvoke(call.name, call.input, ctx);
      const by = [...subagents].reverse().find((n) => SUBAGENTS.find((x) => x.name === n)?.tools.includes(call.name));
      steps.push({ tool: call.name, title: tool?.title ?? call.name, product: tool?.product, subagent: by, status: out.status, completeness: out.evidence?.completeness, ms, summary: summarize(out) });
      const j = JSON.stringify(out);
      results.push({ type: "tool_result", tool_use_id: call.id, content: j.length > 14000 ? j.slice(0, 14000) + "...(truncated)" : j });
    }
    s.messages.push({ role: "user", content: results });
  }
  if (!text && !error) text = "No answer within the step limit. Ask a narrower question.";
  return { conversationId, text: error ? `${text}\n\n${error}` : text, subagents, steps, ms: Date.now() - t0, error: !!error, route: c.route };
}
