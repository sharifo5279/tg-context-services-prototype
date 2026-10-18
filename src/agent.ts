// Agent loop: Claude with Trading Grid Context Services tools, streamed to the console as NDJSON events.
import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, AGENT_ONLY, invoke, audit } from "./tools/index.js";
import { agentById } from "./agents.js";
import { publishable, agentsFor } from "./deployments.js";
import { HOSTS, PERSONA, HostKey, Ctx } from "./runtime.js";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
export const FAST_MODEL = process.env.ANTHROPIC_FAST_MODEL || "claude-haiku-5-5";
const modelFor = (agentId: string) => (agentById(agentId).model === "fast" ? FAST_MODEL : MODEL);
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
export const apiKeyConfigured = () => !!client;

type Session = { messages: any[]; host: HostKey; agentId: string; updated: number };
const sessions = new Map<string, Session>();

export function resetAllSessions() {
  sessions.clear();
}

export function resetSession(id: string) {
  sessions.delete(id);
}

function systemPrompt(agentId: string, host: HostKey) {
  const a = agentById(agentId);
  const h = HOSTS[host];
  return [
    `You are ${a.name}, running in ${h.name} for ${PERSONA.company}. The user is ${(h.persona ?? PERSONA).name}, ${(h.persona ?? PERSONA).title}.`,
    agentId === TG_AGENT
      ? (host === "tg-aviator"
        ? "You power Trading Grid Aviator inside Trading Grid Online and use Trading Grid services directly with the user's access rights."
        : `${h.name} reaches you through Trading Grid Agent Connectors (MCP)${h.exposure === "External" ? ", via the Aviator AKS gateway" : ""}. Execution principal: ${h.principal} (${h.principalType === "SERVICE_IDENTITY" ? "service identity, no user delegation" : "delegated user"}). Your answer is shown in ${h.name}.`)
      : host === "tg-aviator"
      ? "You run inside Trading Grid Online and use Trading Grid services directly with the user's access rights."
      : `You reach OpenText Trading Grid only through Trading Grid Context Connectors (MCP tools)${h.exposure === "External" ? ", via the Aviator AKS gateway" : ""}. Execution principal: ${h.principal} (${h.principalType === "SERVICE_IDENTITY" ? "service identity, no user delegation" : "delegated user"}).`,
    `Current time: ${new Date().toISOString()}.`,
    "",
    a.role,
    "",
    ...a.instructions.map((i) => `### ${i.title}\n${i.body}`),
    "",
    ...(HOST_NOTES[host] ? ["### This client", HOST_NOTES[host], ""] : []),
    "### Answer format (overrides any longer structure in the instructions above)",
    "Readers are business users (CIOs, operations leads) on a phone or in a side panel. Short and high signal.",
    "- Start with the direct answer in ONE sentence. Do not restate the question. Write no text before or between tool calls.",
    "- Then one or two fenced visual blocks (never more) that carry the data instead of prose. Do not repeat a block's numbers or items in prose. Up to 3 short bullets only when no block fits.",
    "- Aim for under 120 words of prose. Go longer only for a draft message or a design the user asked for. No headings. Never add sections such as Caveats, Gaps, Evidence, Signals checked, Completeness, Notes or What I did not check.",
    "- Visual blocks: a fenced code block whose info string is the type, one row per line, cells split by ' | ', optional first line 'title: <text>'. Labels under 4 words, details under 8 words. Only use values from tools. Pick the best fit:",
    "  kpi: label | value | note | optional trend values comma-separated (sparkline). 2 to 4 rows of headline numbers.",
    "  gauge: label | value% | target%. A rate or compliance against target.",
    "  status: label | state | detail. Per-item health or a checklist.",
    "  steps: step | state | detail. An ordered process (onboarding, request lifecycle).",
    "  timeline: time | event | state. Incident or history.",
    "  flow: document | state | detail. Document chain for one PO (850, 855, 856, 810).",
    "  record: 'title: <id>', optional 'status: <state>', then field | value rows. One incident, PO, partner, request or prepared change.",
    "  contact: name | role | email | phone. Use for any contact answer.",
    "  alert: severity | title | detail. One critical issue.",
    "  chart bar: label | value. Category comparison, max 8. chart line: period | value. Trend, 4 to 12 points.",
    "  compare: first line 'series: A, B, C', then label | a | b | c. Grouped bars, for example ordered vs shipped vs invoiced.",
    "  donut: label | value. Share of a total, max 6 slices. heatmap: first line 'cols: Mon, Tue, ...', then row label | v1 | v2 ...",
    "  table: a markdown table, at most 4 columns and 8 rows, short cells.",
    "  actions: chip label | prompt. 2 to 3 follow-ups the user can click. Use instead of any 'I can also...' sentence.",
    "  State words color the dots: Complete, Active, Live, Delivered, Received, Confirmed (green); In progress, Pending, On hold, Open, Degraded, Waiting (amber); Failed, Blocked, Expired, Missing, Rejected, Overdue (red). Use one of these words as the state.",
    "  No block for a single fact or a draft message.",
    "- End with at most one line 'Next step: ...' (single action and owner) or an actions block, not both. Then one line 'Sources: ' naming Trading Grid products only (for example: TG Insights, Cartographer, Community Management).",
    "- No offers or menus in prose ('I can also...', 'If you want...', 'Tell me...'). Ask a question only when required input is missing.",
    "- Never show internal mechanics: tool or operation names, envelope fields, access decisions (PERMIT, DENY), completeness values, sub-agent ids, plan expiry. Name products and agents in plain words.",
    "- Keep the identifiers a user acts on: partner, PO, request (ST-), work order (WO-), map, error code. For long ID lists give the count and at most 3 examples.",
    "- Enterprise voice. Plain words, short sentences. No emojis, no em dashes, no marketing language, no hedging filler.",
    "",
    "### Accuracy",
    "- Every statement comes from tool results or the screen context. Never invent identifiers, partners, statuses, dates or contacts.",
    "- A missing acknowledgment or response is 'not received', never 'rejected'. Configuration is not observed traffic. Accepted or in progress is not completed.",
    "- Mention partial results or missing evidence only when they change the answer, in one short clause. Interpretation notes in tool results guide your reasoning; do not recite them.",
    "- When access is denied or an operation is unsupported, say so in one sentence with who can grant it. Do not work around it.",
    "- If a partner name matches several companies, use the one the conversation or screen context already identified, or the only one with matching activity, and name it. Ask the user only when several fit equally.",
    "- A <screen_context> block identifies the record open in the user's application; verify Trading Grid facts with tools.",
    "- Keep tool calls lean: prefer one search or summary over opening records one by one, and read document content only when metadata cannot answer. When the question asks which items use or match something, check every candidate before answering.",
    "",
    "### Changes",
    "- Never say a change was made unless a submit or apply tool returned OK.",
    "- To change anything, call the prepare tool. On APPROVAL_REQUIRED, stop. Say in one sentence that the request is prepared and waits for approval on the card, and that nothing is submitted yet. Show the prepared change as one record block (at most 5 fields). Do not call submit in the same turn.",
    "- When the user refers to an item from your earlier answer (for example 'the missing item'), use the item you flagged as having no request. Ask only if several items fit equally.",
    "- When the user says a plan is approved, call the submit or apply tool with that plan_id. Report the outcome in one or two sentences with the tracking reference and owner.",
  ].join("\n");
}

/** Client-specific behavior the model cannot infer from the conversation. */
const HOST_NOTES: Partial<Record<HostKey, string>> = {
  "chatgpt-enterprise": "ChatGPT runs recurring tasks itself. When the user asks for something every day or weekday, ChatGPT has already scheduled it: return this run's result only and do not discuss scheduling.",
  "claude-ui": "Claude renders the quantity reconciliation result as an interactive dashboard artifact beside the chat. After tgi_get_quantity_reconciliation, do not reproduce its tables: give one sentence pointing to the dashboard and at most one kpi block with headline totals.",
  "sap-joule": "This client runs as an SAP service identity with status and references only. Answer from metadata; do not mention document content unless the user asks for it.",
  "gemini-enterprise": "The user builds agents in Gemini Enterprise. When asked to build an agent, give its design as at most 5 short steps; Gemini Enterprise creates it.",
};

export const TG_AGENT = "tg-aviator";
/** Sub-agents the Trading Grid Agent can engage in this client: published to it and not blocked. */
export const subagentsFor = (host: HostKey) => (host === "tg-aviator" ? publishable() : agentsFor(host)).filter((x) => x.id !== TG_AGENT && x.id !== "context-assistant");
const subTools = (a: any) => (a.tools === "ALL" ? TOOLS.map((t) => t.name) : (a.tools as string[]));

function toolsFor(agentId: string, host: HostKey) {
  const a = agentById(agentId);
  const list = a.tools === "ALL" ? (agentId === TG_AGENT ? [...TOOLS, ...AGENT_ONLY] : TOOLS) : [...TOOLS, ...AGENT_ONLY].filter((t) => (a.tools as string[]).includes(t.name));
  const subs = agentId === TG_AGENT ? subagentsFor(host) : [];
  const orchestration = subs.length ? [
    { name: "engage_subagent", description: `Engage a Trading Grid sub-agent for the current question. Returns its instructions, tools and expected outputs. Sub-agents: ${subs.map((x) => `${x.id} (${x.name})`).join("; ")}.`, inputSchema: { type: "object", properties: { subagent: { type: "string", enum: subs.map((x) => x.id) }, reason: { type: "string", description: "Why this sub-agent fits, in a few words." } }, required: ["subagent"] } },
    { name: "list_subagents", description: "List the Trading Grid Agent's sub-agents available to this client, with status (Live today, On the roadmap, Incubating, Custom) and focus.", inputSchema: { type: "object", properties: {} } },
  ] : [];
  return [...list, ...orchestration].map((t: any, i, all) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
    ...(i === all.length - 1 ? { cache_control: { type: "ephemeral" } } : {}),
  }));
}

function subagentCall(name: string, input: any, ctx: Ctx) {
  const subs = subagentsFor(ctx.host);
  const t0 = Date.now();
  const src = { sourceRefs: [{ product: "Trading Grid Agent", operation: "Sub-agent registry" }], completeness: "COMPLETE" };
  const tool = { product: "Trading Grid Agent", binding: "Sub-agent registry", basis: "Sub-agents run inside the Trading Grid Agent under the caller's access" } as any;
  if (name === "list_subagents") return { out: { status: "OK", tool: name, result: { agent: "Trading Grid Agent", client: HOSTS[ctx.host].name, subagents: subs.map((x) => ({ id: x.id, name: x.name, status: x.status, focus: x.role })) }, evidence: src, access: { decision: "PERMIT", operation: "agent.invoke" } }, ms: Date.now() - t0, tool };
  const a = subs.find((x) => x.id === input?.subagent);
  if (!a) return { out: { status: "DENIED", tool: name, error: { code: "SUBAGENT_NOT_AVAILABLE", message: "Sub-agent is not published to this client or is blocked by the administrator." }, access: { decision: "DENY", operation: "agent.invoke" } }, ms: 0, tool };
  return { out: { status: "OK", tool: name, result: { subagent: a.name, status: a.status, role: a.role, instructions: a.instructions, tools: subTools(a), outputs: a.outputs }, evidence: src, access: { decision: "PERMIT", operation: "agent.invoke" } }, ms: Date.now() - t0, tool, sub: a };
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

async function runCore(s: Session, ctx: Ctx, agentId: string, channel: string, emit: (e: any) => void) {
  const system = [{ type: "text", text: systemPrompt(agentId, ctx.host), cache_control: { type: "ephemeral" } }];
  const tools = toolsFor(agentId, ctx.host);
  const engaged: any[] = [];
  const model = modelFor(agentId);
  emit({ type: "start", model, toolCount: tools.length });
  for (let step = 0; step < 12; step++) {
    emit({ type: "thinking", step });
    let msg: any;
    try {
      const stream = client!.messages.stream({ model, max_tokens: 4096, system: system as any, tools: tools as any, messages: s.messages });
      stream.on("text", (delta: string) => emit({ type: "text", delta }));
      msg = await stream.finalMessage();
    } catch (e: any) {
      emit({ type: "error", message: `Model request failed: ${e?.message ?? e}. Retry the request.` });
      if (s.messages[s.messages.length - 1]?.role === "user" && typeof s.messages[s.messages.length - 1].content === "string") s.messages.pop();
      return;
    }
    s.messages.push({ role: "assistant", content: msg.content });
    const calls = msg.content.filter((b: any) => b.type === "tool_use");
    if (!calls.length || msg.stop_reason !== "tool_use") { emit({ type: "done", usage: msg.usage }); return; }
    const results: any[] = [];
    for (const c of calls) {
      const allowed = new Set(tools.map((t: any) => t.name));
      const orch = c.name === "engage_subagent" || c.name === "list_subagents";
      const by = orch ? undefined : [...engaged].reverse().find((x) => subTools(x).includes(c.name))?.name ?? engaged[engaged.length - 1]?.name;
      emit({ type: "tool_call", id: c.id, name: c.name, input: c.input, by });
      const r: any = !allowed.has(c.name) ? { out: { status: "DENIED", error: { code: "TOOL_NOT_ASSIGNED", message: `${c.name} is not assigned to this agent.` }, access: { decision: "DENY" } }, ms: 0, tool: undefined as any }
        : orch ? subagentCall(c.name, c.input, ctx) : invoke(c.name, c.input, ctx, (by ? `agent:${agentId}` : channel) as any);
      const { out, ms, tool } = r;
      if (r.sub && !engaged.some((x) => x.id === r.sub.id)) { engaged.push(r.sub); emit({ type: "subagent", id: r.sub.id, name: r.sub.name, status: r.sub.status }); }
      else if (r.sub) { engaged.splice(engaged.findIndex((x) => x.id === r.sub.id), 1); engaged.push(r.sub); }
      emit({
        type: "tool_result", id: c.id, name: c.name, ms, status: out.status, by,
        decision: out.access?.decision, product: tool?.product, binding: tool?.binding, basis: tool?.basis,
        completeness: out.evidence?.completeness, summary: r.sub ? r.sub.name : summarize(out), envelope: out, route: agentId === TG_AGENT ? HOSTS[ctx.host].route.map((x) => x.replace("Trading Grid Context Connectors", "Trading Grid Agent Connectors")) : HOSTS[ctx.host].route,
      });
      if (out.status === "APPROVAL_REQUIRED") emit({ type: "approval", plan: out.result });
      const text = JSON.stringify(out);
      results.push({ type: "tool_result", tool_use_id: c.id, content: text.length > 14000 ? text.slice(0, 14000) + "...(truncated)" : text });
    }
    s.messages.push({ role: "user", content: results });
  }
  emit({ type: "done", note: "Step limit reached." });
}

function session(id: string, host: HostKey, agentId: string) {
  let s = sessions.get(id);
  if (!s || s.host !== host || s.agentId !== agentId) { s = { messages: [], host, agentId, updated: Date.now() }; sessions.set(id, s); }
  s.updated = Date.now();
  return s;
}

export async function runTurn(opts: { sessionId: string; host: HostKey; agentId: string; message: string; baseUrl: string; context?: string; connector?: "agents" | "context" }, emit: (e: any) => void) {
  if (!client) { emit({ type: "error", message: "Agent runtime unavailable. Model API key not configured. Tools remain available in the Tools catalog." }); return; }
  const s = session(opts.sessionId, opts.host, opts.agentId);
  s.messages.push({ role: "user", content: opts.context ? `<screen_context>\n${String(opts.context).slice(0, 2000)}\n</screen_context>\n\n${opts.message}` : opts.message });
  await runCore(s, { host: opts.host, sessionId: opts.sessionId, baseUrl: opts.baseUrl }, opts.agentId, "console", emit);
}

/** Run a published agent for an MCP caller. Returns the answer and the evidence trail. */
export async function runAgentForCaller(opts: { host: HostKey; agentId: string; request: string; conversationId?: string; baseUrl: string }) {
  const conversationId = opts.conversationId || `cv-${Math.random().toString(36).slice(2, 10)}`;
  const t0 = Date.now();
  if (!client) return { conversationId, text: "Agent runtime unavailable. Model API key not configured.", steps: [], plans: [], ms: 0, error: true };
  const sid = `mcp:${opts.host}:${conversationId}`;
  const s = session(sid, opts.host, opts.agentId);
  s.messages.push({ role: "user", content: opts.request });
  let text = ""; const steps: any[] = []; const plans: any[] = []; const subagents: string[] = []; let error = "";
  await runCore(s, { host: opts.host, sessionId: sid, baseUrl: opts.baseUrl }, opts.agentId, `agent:${opts.agentId}`, (e) => {
    if (e.type === "text") text += e.delta;
    if (e.type === "tool_call" && text && !text.endsWith("\n")) text += "\n\n";
    if (e.type === "subagent") subagents.push(e.name);
    if (e.type === "tool_result") steps.push({ tool: e.name, subagent: e.by, status: e.status, completeness: e.completeness, ms: e.ms, summary: e.summary });
    if (e.type === "approval") plans.push(e.plan);
    if (e.type === "error") error = e.message;
  });
  return { conversationId, text: error ? `${text}\n\n${error}` : text, subagents, steps, plans, ms: Date.now() - t0, error: !!error };
}
