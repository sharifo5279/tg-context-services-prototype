/* Trading Grid agent journey prototype: Trading Grid Online, Aviator Studio, Context Services, external ecosystems */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const qs = () => new URLSearchParams(location.search);

  const I = {
    home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
    agent: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5z"/>',
    doc: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    key: '<circle cx="7.5" cy="15.5" r="3.5"/><path d="m10 13 9-9M16 7l3 3"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    text: '<path d="M5 6h14M12 6v13M9 19h6"/>',
    send: '<path d="m4 12 16-8-6 16-2-7z"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
    collapse: '<path d="M4 14h6v6M20 10h-6V4M10 14l-7 7M14 10l7-7"/>',
    route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8"/>',
  };
  const ic = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${I[n] ?? ""}</svg>`;

  const S = { meta: null, tools: [], convs: {}, plans: [], tgo: null, tgoFilters: { days: 7 }, aviatorOpen: false, txOpen: null };
  const app = $("#app");

  async function api(path, opts = {}) {
    const r = await fetch(path, { headers: { "content-type": "application/json" }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
    if (r.status === 401) { location.href = "/login"; throw new Error("auth"); }
    return r.json();
  }
  const hostBy = (k) => S.meta.hosts.find((h) => h.key === k);
  const agent = (id) => S.meta.agents.find((a) => a.id === id);
  const studioAgents = () => S.meta.agents.filter((a) => a.id !== "tg-aviator");
  const STATUS_CLS = { "Live today": "ok", "On the roadmap": "info", Incubating: "warn", Prototype: "neutral" };
  const statusTag = (a) => `<span class="pill ${STATUS_CLS[a.status] ?? "neutral"}">${esc(a.status)}</span>`;
  const uc = (n) => S.meta.useCases.find((u) => u.n === n);
  const promptOf = (n) => (typeof n === "number" ? uc(n).prompt : n);
  const ucLabel = (n) => (typeof n === "number" ? `UC${n}` : "");
  const EXT = ["copilot-studio", "gemini-enterprise", "sap-joule", "claude-ui"];

  // ---------- markdown ----------
  const inline = (s) => s.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  function md(src) {
    const lines = esc(src).split("\n");
    let out = "", i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (/^```/.test(l)) { let b = ""; i++; while (i < lines.length && !/^```/.test(lines[i])) b += lines[i++] + "\n"; i++; out += `<pre>${b}</pre>`; continue; }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        const cells = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));
        const head = cells(l); i += 2; let body = "";
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) body += `<tr>${cells(lines[i++]).map((c) => `<td>${c}</td>`).join("")}</tr>`;
        out += `<div style="overflow:auto"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`; continue;
      }
      const h = l.match(/^(#{1,4})\s+(.*)/); if (h) { out += `<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`; i++; continue; }
      if (/^\s*[-*]\s+/.test(l)) { let b = ""; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) b += `<li>${inline(lines[i++].replace(/^\s*[-*]\s+/, ""))}</li>`; out += `<ul>${b}</ul>`; continue; }
      if (/^\s*\d+[.)]\s+/.test(l)) { let b = ""; while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) b += `<li>${inline(lines[i++].replace(/^\s*\d+[.)]\s+/, ""))}</li>`; out += `<ol>${b}</ol>`; continue; }
      if (!l.trim()) { i++; continue; }
      let p = l; i++;
      while (i < lines.length && lines[i].trim() && !/^(#|\s*[-*]\s|\s*\d+[.)]\s|```|\s*\|)/.test(lines[i])) p += "<br>" + lines[i++];
      out += `<p>${inline(p)}</p>`;
    }
    return out;
  }

  // ---------- conversations ----------
  function conv(key, agentId, host) {
    if (!S.convs[key]) S.convs[key] = { key, agentId, host, id: `${key}-${Math.random().toString(36).slice(2, 8)}`, items: [], busy: false, usage: {}, live: null };
    return S.convs[key];
  }

  function stepIcon(s) {
    if (!s.done) return `<span class="si run"></span>`;
    if (s.status === "DENIED") return `<span class="si deny">×</span>`;
    if (s.status === "ERROR") return `<span class="si err">!</span>`;
    return `<span class="si">✓</span>`;
  }
  function statusPill(s) {
    if (!s.done) return `<span class="pill neutral">Running</span>`;
    const m = { OK: ["ok", "Permit"], APPROVAL_REQUIRED: ["info", "Approval required"], DENIED: ["bad", "Denied"], ERROR: ["warn", s.envelope?.error?.code ?? "Error"] }[s.status] ?? ["neutral", s.status];
    return `<span class="pill ${m[0]}">${esc(m[1])}</span>`;
  }
  const toolTitle = (n) => S.tools?.find((t) => t.name === n)?.title ?? n.replace(/_/g, " ");
  function renderStep(s, si, mi) {
    const flag = !s.done ? "" : s.status === "DENIED" ? `<span class="af bad">Denied</span>` : s.status === "ERROR" ? `<span class="af warn">${esc(s.envelope?.error?.code ?? "Error")}</span>` : s.status === "APPROVAL_REQUIRED" ? `<span class="af info">Approval required</span>` : "";
    return `<div class="astep${s.open ? " open" : ""}"><div class="ar" data-step="${mi}:${si}"><span class="ad ${!s.done ? "run" : s.status === "OK" ? "" : "x"}"></span><span class="an">${esc(toolTitle(s.name))}</span>${flag}<span class="as">${esc(s.summary ?? "")}</span>${s.done ? `<span class="ams">${s.ms} ms</span>` : ""}</div>
      ${s.open ? `<div class="adetail">
        <div class="kv"><span class="k">Tool</span><span class="mono">${esc(s.name)}</span><span class="k">Source</span><span>${esc((s.product ?? "").replace("Trading Grid ", ""))} · <span class="mono">${esc(s.binding ?? "")}</span></span><span class="k">Basis</span><span>${esc(s.basis ?? "")}</span>${s.envelope?.access ? `<span class="k">Access</span><span>${esc(s.envelope.access.decision)} · ${esc(s.envelope.access.operation)} · ${esc(s.envelope.access.executionPrincipal)}</span>` : ""}${s.completeness ? `<span class="k">Completeness</span><span>${esc(s.completeness)}</span>` : ""}</div>
        <details><summary>Input</summary><pre class="json">${esc(JSON.stringify(s.input, null, 2))}</pre></details>
        ${s.envelope ? `<details><summary>Response</summary><pre class="json">${esc(JSON.stringify(s.envelope, null, 2))}</pre></details>` : ""}
      </div>` : ""}</div>`;
  }
  /** One quiet activity line per answer; expands to the tool calls and route. */
  function activity(m, mi, route) {
    if (!m.steps.length && !m.thinking) return "";
    const running = m.steps.find((x) => !x.done);
    let label;
    if (m.thinking || running) label = running ? `${esc(toolTitle(running.name))}` : m.steps.length ? "Reviewing results" : "Thinking";
    else label = `Used ${m.steps.length} tool${m.steps.length === 1 ? "" : "s"}${m.elapsed ? ` · ${(m.elapsed / 1000).toFixed(1)} s` : ""}`;
    const busy = m.thinking || running;
    return `<div class="activity${m.showSteps ? " open" : ""}${busy ? " busy" : ""}"><button class="ah" data-togglesteps="${mi}" ${!m.steps.length ? "disabled" : ""}>${busy ? `<span class="spin"></span>` : ""}<span class="al">${label}</span>${m.steps.length ? `<span class="chev">${m.showSteps ? "▾" : "▸"}</span>` : ""}</button>
      ${m.showSteps && m.steps.length ? `<div class="alist">${route?.length ? `<div class="aroute">${route.map((r) => esc(r)).join(" › ")}</div>` : ""}${m.steps.map((x, si) => renderStep(x, si, mi)).join("")}</div>` : ""}</div>`;
  }
  function renderPlan(p) {
    const st = S.plans.find((x) => x.planId === p.planId)?.status ?? p.planStatus ?? p.status;
    const cks = p.validation?.checks ?? [];
    const passed = cks.filter((c) => c.result === "PASS").length;
    const rows = cks.map((c) => `<tr><td>${esc(c.check)}</td><td><span class="pill ${c.result === "PASS" ? "ok" : c.result === "WARNING" ? "warn" : "bad"}">${esc(c.result)}</span></td><td class="small muted">${esc(c.detail ?? "")}</td></tr>`).join("");
    const pending = st === "PENDING_APPROVAL";
    return `<div class="approval${pending ? "" : " decided"}"><div class="ah"><span class="at">${esc(p.summary)}</span><span class="pill ${pending ? "info" : st === "APPROVED" || st === "EXECUTED" ? "ok" : "bad"}">${pending ? "Approval required" : esc(String(st).replace("_", " ").toLowerCase())}</span></div>
      <div class="am small muted"><span class="mono">${esc(p.planId)}</span> · ${esc(p.target)}${cks.length ? ` · ${passed} of ${cks.length} checks passed` : ""} · expires ${esc(new Date(p.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))}</div>
      <details class="ad"><summary>Details</summary><div class="kv"><span class="k">Submit with</span><span class="mono">${esc(p.submitWith?.tool ?? p.submitTool)}</span></div>${rows ? `<table class="t"><tbody>${rows}</tbody></table>` : ""}<pre class="json">${esc(JSON.stringify(p.parameters, null, 2))}</pre></details>
      ${pending ? `<div class="acts"><button class="btn sm primary" data-approve="${p.planId}">Approve and submit</button><button class="btn sm" data-reject="${p.planId}">Reject</button></div>` : ""}
    </div>`;
  }
  function renderItem(c, m, mi) {
    if (m.role === "user") return `<div class="msg user">${esc(m.text)}</div>`;
    const a = agent(m.agentId);
    const route = m.route ?? hostBy(c.host)?.route ?? [];
    return `<div class="msg agent"><div class="mh"><div class="aico sm">${ic(c.host === "tg-aviator" ? "spark" : "agent")}</div>${esc(a?.name ?? "Agent")}</div>
      ${activity(m, mi, route)}
      ${m.error ? `<div class="md"><div class="alert bad">${esc(m.error)}</div></div>` : ""}
      <div class="md">${md(m.text)}</div>
      ${m.plans.map(renderPlan).join("")}
      ${c.host === "tg-aviator" && m.text && !m.thinking ? `<div class="aidisc">AI-generated. Verify before acting.</div>` : ""}
    </div>`;
  }
  S.max = {};
  function chatView(c, opts = {}) {
    const a = agent(c.agentId);
    const max = !!S.max[c.key];
    const starters = !c.items.length && a.starters?.length ? `<div class="label" style="margin-top:0"><span>${esc(opts.startLabel ?? "Suggested")}</span></div><div class="starters">${a.starters.map((n) => `<button class="starter" data-prompt="${esc(promptOf(n))}"><span class="ucn">${ucLabel(n)}</span><span>${esc(promptOf(n))}</span></button>`).join("")}</div>` : "";
    return `<div class="chatframe${max ? " max" : ""}"><div class="chatbar"><span class="cbt">${max ? esc(a.name) : ""}</span><button class="iconbtn" data-chatmax="${c.key}" title="${max ? "Exit full screen" : "Full screen"}">${ic(max ? "collapse" : "expand")}</button></div>
      <div class="chatscroll"><div class="chat">${opts.top ?? ""}${starters}${c.items.map((m, mi) => renderItem(c, m, mi)).join("")}</div></div>
      <form class="composer" data-compose><textarea rows="1" placeholder="${esc(opts.placeholder ?? `Ask ${a.name}`)}" ${c.busy ? "disabled" : ""}></textarea><button class="btn primary" ${c.busy ? "disabled" : ""}>${ic("send")}Send</button></form></div>`;
  }

  // Each page registers its chat mount: element [data-conv=key] whose content = mount(c)
  const mounts = {};
  let raf = {};
  function refreshConv(key) {
    if (raf[key]) return;
    raf[key] = requestAnimationFrame(() => {
      raf[key] = 0;
      const el = document.querySelector(`[data-conv="${key}"]`);
      if (!el || !mounts[key]) return;
      const scroller = el.querySelector(".chatframe.max .chatscroll") ?? el.closest("[data-scroll]") ?? document.scrollingElement;
      const near = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 160;
      const draft = el.querySelector("textarea")?.value ?? "";
      el.innerHTML = mounts[key](S.convs[key]);
      const ta = el.querySelector("textarea"); if (ta) ta.value = draft;
      document.querySelectorAll(`[data-side="${key}"]`).forEach((s) => (s.innerHTML = sideMounts[key]?.(S.convs[key]) ?? ""));
      if (near) scroller.scrollTop = scroller.scrollHeight;
    });
  }
  const sideMounts = {};

  async function send(key, text) {
    const c = S.convs[key];
    if (!c || c.busy || !text.trim()) return;
    c.busy = true;
    c.items.push({ role: "user", text });
    const m = { role: "agent", agentId: c.agentId, steps: [], text: "", plans: [], thinking: true, t0: Date.now() };
    c.items.push(m);
    refreshConv(key);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: c.id, host: c.host, agentId: c.agentId, message: text }) });
      if (r.status === 401) { location.href = "/login"; return; }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const e = JSON.parse(line);
          if (e.type === "thinking") m.thinking = true;
          if (e.type === "text") { m.thinking = false; m.text += e.delta; }
          if (e.type === "tool_call") { m.thinking = false; m.steps.push({ id: e.id, name: e.name, input: e.input, done: false }); c.live = e.name; if (m.text && !/\n$/.test(m.text)) m.text += "\n\n"; }
          if (e.type === "tool_result") { const s = m.steps.find((x) => x.id === e.id); Object.assign(s, { done: true, status: e.status, ms: e.ms, product: e.product, binding: e.binding, basis: e.basis, completeness: e.completeness, summary: e.summary, envelope: e.envelope }); m.route = e.route; c.usage[e.name] = (c.usage[e.name] ?? 0) + 1; c.live = null; }
          if (e.type === "approval") { m.plans.push(e.plan); S.plans.unshift({ planId: e.plan.planId, status: "PENDING_APPROVAL" }); }
          if (e.type === "error") { m.error = e.message; m.thinking = false; }
          if (e.type === "done") m.thinking = false;
          refreshConv(key);
        }
      }
    } catch (err) { m.error = `Connection interrupted: ${err.message}`; }
    m.thinking = false; m.elapsed = Date.now() - m.t0; c.busy = false; c.live = null;
    S.plans = await api("/api/plans");
    refreshConv(key);
  }

  async function decide(planId, approve, key) {
    const p = await api(`/api/plans/${planId}/decision`, { method: "POST", body: { approve } });
    const i = S.plans.findIndex((x) => x.planId === planId);
    if (i >= 0) S.plans[i] = p; else S.plans.unshift(p);
    if (key) refreshConv(key); else render();
    if (approve && key && p.status === "APPROVED") send(key, `Plan ${planId} is approved. Submit it.`);
  }

  // ---------- shells ----------
  function navList(sections, p) {
    return sections.map((sec) => `${sec.g ? `<div class="group">${sec.g}</div>` : ""}${sec.items.map(([icn, href, label, count]) => {
      const active = p === href || (href.length > 1 && p.startsWith(href + "/") && !sections.some((x) => x.items.some(([, h2]) => h2 !== href && h2.startsWith(href) && p.startsWith(h2))));
      return `<button class="navlink ${active ? "active" : ""}" data-href="${href}">${ic(icn)}<span>${label}</span><span class="count">${count ?? ""}</span></button>`;
    }).join("")}`).join("");
  }
  const journeyBtn = `<button class="btn ghost sm" data-href="/">${ic("route")}Demo journey</button>`;
  const avatar = () => `<div class="avatar" title="${esc(S.meta.persona.name)}, ${esc(S.meta.persona.title)}">JL</div>`;

  function shellStandard({ title, tag, nav, inner, cls = "" }) {
    return `<header class="topbar ${cls}"><div class="brand"><img src="/assets/opentext-logo.svg" alt="OpenText"><span class="divider"></span><span class="name">${esc(title)}</span>${tag ? `<span class="tag">${esc(tag)}</span>` : ""}</div><div class="spacer"></div>${journeyBtn}${avatar()}</header>
      <div class="layout"><nav class="sidenav">${nav}<div class="foot">Prototype on seeded data. Not connected to production Trading Grid.</div></nav><main class="main">${inner}</main></div>`;
  }

  // ---------- Demo journey ----------
  const SCENES = [
    { n: 1, where: "Trading Grid Online", title: "Find the failed ASN", text: "Open Transactions, filter to delivery failures and select ASN SH-77155.", href: "/tgo" },
    { n: 2, where: "Trading Grid Online", title: "Analyze with Aviator", text: "Analyze with Aviator runs the Error Analysis Agent. Payloads runs the Payload Analysis Agent.", href: "/tgo/insights?q=SH-77155&open=1" },
    { n: 3, where: "Trading Grid Online", title: "Review agent access", text: "Review applications with access to Harborview data, their scope and operations.", href: "/tgo/access" },
    { n: 4, where: "Aviator Studio", title: "Run ASN Exception Agent", text: "Identify the cause through Context Services and prepare the cross-reference fix.", href: "/studio/agents/asn-exception/simulate" },
    { n: 5, where: "Aviator Studio", title: "Approve the change", text: "Approval binds to the exact entry. The agent applies it and returns a verified readback.", href: "/studio/agents/asn-exception/simulate" },
    { n: 6, where: "Trading Grid Context Services", title: "Inspect the service layer", text: "Review authorization and audit records by client, principal, route and decision.", href: "/cs" },
    { n: 7, where: "External platforms", title: "Run in external platforms", text: "Run the published agent through the Aviator AKS gateway. SAP Joule is denied payload access.", href: "/ext?eco=copilot-studio" },
    { n: 8, where: "External platforms", title: "Call agents from Claude", text: "Claude calls Trading Grid agents as tools. Agents run in Context Services and return evidence.", href: "/cs/agents" },
    { n: 8, where: "External platforms", title: "Connect Claude", text: "Add the connector URL in Claude. Calls appear in the service layer audit.", href: "/cs/clients" },
    { n: 9, where: "Trading Grid Online", title: "Suspend access", text: "Suspend Copilot Studio, rerun the request and confirm no data is returned.", href: "/tgo/access" },
  ];
  function pageBoundaries() {
    const row = (a, b, c) => `<tr><td><strong>${esc(a)}</strong></td><td>${esc(b)}</td><td class="small muted">${esc(c)}</td></tr>`;
    return `<header class="topbar"><div class="brand"><img src="/assets/opentext-logo.svg" alt="OpenText"><span class="divider"></span><span class="name">Simulation boundaries</span><span class="tag">Prototype</span></div><div class="spacer"></div>${journeyBtn}${avatar()}</header>
    <div class="journey"><h1>Implemented and simulated components</h1><p class="sub">Seeded retail data. Not connected to production Trading Grid.</p>
    <div class="section-title">Implemented</div><table class="t"><tbody>
      ${row("Tool runtime", `${S.tools.length} tools run against seeded data and return evidence envelopes.`, `95 from the incubation brief; ${S.tools.length - 95} application tools modeled on the Innovation Guide. CMS fields follow Swagger v2 to v5.`)}
      ${row("Entitlements", "Organization, BUID, solution, operation, client suspension and agent blocks enforced on every call.", "Fail closed.")}
      ${row("Approvals", "Changes follow prepare, approve, recheck and submit. Plans are single use and expire.", "")}
      ${row("Agents", "Agents run on Claude models with their assigned tools.", "Answers use seeded data only.")}
      ${row("MCP endpoint", "Streamable HTTP endpoint for tools and agents. Claude connects live.", "Prototype tokens. OAuth not implemented.")}
    </tbody></table>
    <div class="section-title">Simulated</div><table class="t"><tbody>
      ${row("Trading Grid Online and TG Insights screens", "Layouts follow shipped screens. Data is seeded.", "Not connected to production.")}
      ${row("Aviator Studio", "Agent definition, simulation and deployments are demo constructs.", "Aviator Studio for Business Network is in incubation.")}
      ${row("Aviator AKS gateway", "Represented as a route hop with a per-client call limit.", "Owned by the central Aviator team.")}
      ${row("External ecosystem screens", "Copilot Studio, Gemini Enterprise and SAP Joule are simulated.", "Claude connects live.")}
      ${row("Insights, Cartographer, Projects, TGDP and application contracts", "Response shapes modeled on the incubation brief and Innovation Guide.", "Basis labeled on each tool.")}
      ${row("Agent status", "Status labels follow the Aviator portfolio.", "Roadmap and incubating agents are not commitments.")}
    </tbody></table></div>`;
  }

  function pageJourney() {
    const col = (cls, label, items, sub) => `<div class="lane ${cls}"><div class="lh">${esc(label)}</div><div class="ls">${esc(sub)}</div>${items.map(([t, d, href]) => `<button class="lanecard" data-href="${href}"><strong>${esc(t)}</strong><span>${esc(d)}</span></button>`).join("")}</div>`;
    return `<header class="topbar"><div class="brand"><img src="/assets/opentext-logo.svg" alt="OpenText"><span class="divider"></span><span class="name">Trading Grid agent journey</span><span class="tag">Prototype</span></div><div class="spacer"></div><button class="btn ghost sm" data-href="/boundaries">${ic("shield")}Simulation boundaries</button><button class="btn ghost sm" data-demoreset>${ic("refresh")}Reset demo</button>${avatar()}</header>
    <div class="journey">
      <h1>Trading Grid agent journey</h1>
      <p class="sub">Investigate one failed ASN in Trading Grid Online, Aviator Studio and external agent platforms.</p>
      <div class="lanes">
        ${col("", "Internal", [["Trading Grid Online", "TG Insights transactions and agent access", "/tgo/insights"], ["Trading Grid Aviator", "In-app Error Analysis, Payload Analysis and Transaction Finder agents", "/tgo/insights?aviator=1"]], "Core Business Network applications")}
        <div class="lanearrow">›</div>
        ${col("", "OpenText", [["Aviator Studio", "Agent definition, simulation and publishing", "/studio"]], "Outside Trading Grid Online")}
        <div class="lanearrow">›</div>
        ${col("emph", "Service layer", [["Trading Grid Context Services", `${S.meta.toolCount} governed MCP tools, grants, approvals and audit`, "/cs"], ["Aviator AKS gateway", "Central Aviator egress to external platforms", "/cs/clients"]], "Governed externalization")}
        <div class="lanearrow">›</div>
        ${col("", "External", EXT.map((k) => [hostBy(k).name, hostBy(k).authPattern, `/ext?eco=${k}`]), "Customer agent platforms")}
      </div>
      <div class="section-title">Demo script</div>
      <div class="scenes">${SCENES.map((s, i) => ({ ...s, n: i + 1 })).map((s) => `<div class="scene"><div class="sn">${s.n}</div><div class="sb"><div class="sw">${esc(s.where)}</div><div class="st">${esc(s.title)}</div><div class="sd">${esc(s.text)}</div></div><button class="btn sm" data-href="${s.href}">${ic("play")}Open</button></div>`).join("")}</div>
      <p class="small muted" style="margin-top:20px">Prototype. Seeded retail data; not connected to production Trading Grid. Tool contracts are proposed.</p>
    </div>`;
  }

  // ---------- Trading Grid Online ----------
  const AV_LOGO = `<img class="avlogo" src="/assets/aviator-logo.png" alt="">`;
  const AV_AVATAR = `<img class="avavatar" src="/assets/aviator-avatar.png" alt="">`;
  const avKey = () => `tgo:${S.av.agentId}`;
  S.av = { open: false, agentId: "tg-aviator", txId: null };

  function aviatorItem(c, m, mi) {
    if (m.role === "user") return `<div class="avmsg user">${esc(m.text)}</div>`;
    const steps = activity(m, mi, m.route);
    const done = !m.thinking && (m.text || m.error);
    const disc = done && c.agentId === "error-resolution" ? `<p class="avdisc"><strong>Disclaimer:</strong> This analysis is AI-generated and intended to assist with understanding transactional error messages. Human judgment should always be applied when interpreting these errors or deciding on further actions.</p>${S.av.txId ? `<p class="avdisc"><strong>Transaction ID:</strong> <a data-tx="${S.av.txId}">${esc(S.av.txId)}</a></p>` : ""}` : "";
    return `<div class="avmsg bot">${AV_AVATAR}<div class="avbody">${steps}
      ${m.error ? `<div class="alert bad">${esc(m.error)}</div>` : ""}
      <div class="md avmd">${md(m.text)}</div>${m.plans.map(renderPlan).join("")}${disc}
      ${done ? `<div class="avfb"><span title="Copy">${ic("doc")}</span><span title="Helpful">${ic("check")}</span><span title="Not helpful">${ic("x")}</span></div>` : ""}</div></div>`;
  }
  function aviatorChat(c) {
    const a = agent(c.agentId);
    let intro;
    if (c.agentId === "payload-analysis") {
      intro = `<div class="avmsg bot">${AV_AVATAR}<div class="avbody"><div class="avcard"><p>Welcome to Ask Aviator. The file you selected has been loaded.</p><p>Select one of the actions below to begin. Follow-up questions must relate only to this payload.</p>
        ${[["Create a tabulated view", "Create a tabulated view of the line items: quantities, units, prices and product codes, with totals."], ["Parse the data", "Parse the data segment by segment and explain each qualifier and code in plain language."], ["Summarize payload details", "Summarize the payload: document type and purpose, sender and receiver roles, and key references."]].map(([l, q]) => `<button class="avradio" data-avask="${esc(`${q} Transaction ${S.av.txId}.`)}"><span class="rb"></span>${l}</button>`).join("")}</div></div></div>`;
    } else {
      intro = `<div class="avmsg bot">${AV_AVATAR}<div class="avbody"><p style="margin:2px 0 8px">Hi! I'm Aviator. How can I help you today?</p>${!c.items.length && a.starters?.length ? `<div class="avsugg">${a.starters.map((n) => `<button data-prompt="${esc(promptOf(n))}">${esc(promptOf(n))}</button>`).join("")}</div>` : ""}</div></div>`;
    }
    return `<div class="avstream">${intro}${c.items.map((m, mi) => aviatorItem(c, m, mi)).join("")}</div>
      <form class="avcompose" data-compose><textarea rows="2" placeholder="Ask Aviator" ${c.busy ? "disabled" : ""}></textarea><button ${c.busy ? "disabled" : ""} title="Send">${ic("send")}</button></form>
      <div class="avfoot">AI can make mistakes. <a>Learn more</a></div>`;
  }
  function aviatorPanel() {
    if (!S.av.open) return "";
    const a = agent(S.av.agentId);
    const key = avKey();
    const c = conv(key, S.av.agentId, "tg-aviator");
    mounts[key] = aviatorChat;
    return `<aside class="aviator${S.av.max ? " max" : ""}" data-scroll><div class="avh">${AV_LOGO}<div><div class="avt">Aviator</div><div class="avs">${esc(a.subtitle ?? "Trading Grid Online")}</div></div>
      <div class="avicons"><button class="iconbtn" data-avnew title="New conversation">${ic("refresh")}</button><button class="avmaxbtn" data-avmax title="${S.av.max ? "Exit full screen (Esc)" : "Full screen"}">${ic(S.av.max ? "collapse" : "expand")}<span>${S.av.max ? "Exit full screen" : "Full screen"}</span></button><button class="iconbtn" data-avclose title="Close">${ic("x")}</button></div></div>
      <div class="avb" data-conv="${key}">${aviatorChat(c)}</div></aside>`;
  }
  function openAviator(agentId, prompt, txId) {
    S.av = { open: true, agentId, txId: txId ?? S.av.txId };
    const key = `tgo:${agentId}`;
    if (prompt) delete S.convs[key];
    render().then(() => prompt && send(key, prompt));
  }

  function tgoHeader(variant, appName) {
    if (variant === "portal") {
      return `<header class="tgohead"><span class="tgomenu">${ic("list")}</span><img src="/assets/opentext-logo-white.svg" alt="OpenText" class="wm"><span class="bar">|</span><span class="ap">${esc(appName)}</span><span class="ver">26.4</span><div class="spacer"></div>
        <button class="tgoicon" data-avopen="tg-aviator" title="Aviator"><img src="/assets/aviator-logo.png" alt=""></button><button class="myav" data-avopen="tg-aviator">${ic("agent")}MyAviator</button>${journeyBtn}</header>`;
    }
    return `<header class="topbar tgi"><div class="brand"><img src="/assets/opentext-logo.svg" alt="OpenText"><span class="divider"></span><span class="name">${esc(appName)}</span><span class="ver">26.4</span></div><div class="spacer"></div>
      <button class="iconbtn av" data-avopen="tg-aviator" title="Ask Aviator"><img src="/assets/aviator-logo.png" alt=""></button>${journeyBtn}${avatar()}</header>`;
  }
  const TGO_RAIL = [["home", "/tgo", "Trading Grid Online"], ["swap", "/tgo/insights", "Transactions"], ["key", "/tgo/access", "Agent access"]];
  function shellTgo(variant, appName, inner) {
    const p = location.pathname;
    return `${tgoHeader(variant, appName)}
      <div class="tgo-wrap ${S.av.open ? "with-aviator" : ""} ${variant}">
        ${variant === "portal" ? "" : `<nav class="rail">${TGO_RAIL.map(([icn, href, label]) => `<button class="railbtn ${p === href ? "active" : ""}" data-href="${href}" title="${label}">${ic(icn)}</button>`).join("")}</nav>`}
        <div class="tgo-main">${inner}</div>${aviatorPanel()}
      </div>`;
  }

  function pageTgoHome() {
    const tile = (cls, icn, label, href) => `<button class="tgtile ${cls}" ${href ? `data-href="${href}"` : "disabled"}><span class="tc">${ic(icn)}</span><span>${label}</span></button>`;
    const inner = `<div class="tgohome">
      <section class="welcome"><h1>Welcome, Jordan</h1><h3>Global Partner Directory</h3><div class="wstats"><div><span class="wi">${ic("globe")}</span>Partners in GPD<strong>287.9K+</strong></div><div><span class="wi">${ic("agent")}</span>Partners in your community<strong>11</strong></div><div><span class="wi">${ic("swap")}</span>Transactions last 7 days<strong>${S.tgoCount ?? "1.9K"}</strong></div></div></section>
      <section class="tgcard"><h4>${ic("doc")}Documentation Library</h4><a>Trading Grid Online</a><a>Trading Grid Community Projects</a><a>Trading Grid Insights</a></section>
      <section class="tgcard"><h4>${ic("chart")}Trading Grid Insights</h4><a data-href="/tgo/insights">Dashboard</a><a data-href="/tgo/insights">Transactions</a><a data-href="/tgo/insights">Monitoring</a></section>
      ${tile("teal", "route", "Trading Grid Cartographer")}
      <section class="tgcard"><h4>${ic("agent")}Account Manager</h4><a>My Company and Services</a><a>My Users</a><a>Roles and Permissions</a><a data-href="/tgo/access">Agent access</a></section>
      ${tile("magenta", "chart", "Reports")}
      ${tile("purple", "doc", "Transaction Manager NG")}
      ${tile("blue", "swap", "File Transfer Service NG")}
    </div>`;
    return shellTgo("portal", "Trading Grid Online", inner);
  }

  const DELIV_ICON = { Delivered: ["ok", "check"], "Delivery failed": ["bad", "x"], "In process": ["warn", "refresh"], Received: ["neutral", "doc"] };
  const fmtTime = (iso) => new Date(iso).toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
  function statusIcon(d) { const [cls, icn] = DELIV_ICON[d] ?? ["neutral", "doc"]; return `<span class="sicon ${cls}">${ic(icn)}</span>`; }

  async function pageTgoInsights() {
    const f = S.tgoFilters;
    const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== "" && v != null));
    S.tgo = await api(`/api/tgo/transactions?${params}`);
    const d = S.tgo;
    const facet = (key, label, list) => `<div class="facet"><div class="fh">${ic("list")}<span>${label}</span></div>${list.map(([name, n]) => `<button class="frow ${f[key] === name ? "on" : ""}" data-facet="${key}" data-val="${esc(name)}">${key === "delivery" ? statusIcon(name) : ""}<span>${esc(name)}</span><span class="fc">${n}</span></button>`).join("")}</div>`;
    const active = ["delivery", "sender", "receiver", "ediType", "q"].filter((k) => f[k]);
    const inner = `<div class="tgo-crumbs">${ic("home")}<span>/</span><strong>Transactions</strong><span class="region">Region: USA</span></div>
      <div class="tgo-grid">
        <aside class="filters-panel"><h3>Filtering</h3>
          <div class="facet"><div class="fh"><span>Active filters</span>${active.length ? `<button class="linkbtn" data-clearf>Clear</button>` : ""}</div>${active.map((k) => `<div class="activef">${esc(k === "q" ? `Search: ${f.q}` : f[k])}<button data-unf="${k}">${ic("x")}</button></div>`).join("") || `<div class="small muted">None</div>`}</div>
          <div class="facet"><div class="fh"><span>Date range</span></div><select class="select" data-days><option value="1" ${f.days == 1 ? "selected" : ""}>Last 24 hours</option><option value="7" ${f.days == 7 ? "selected" : ""}>Last 7 days</option><option value="30" ${f.days == 30 ? "selected" : ""}>Last 30 days</option></select></div>
          <div class="small muted" style="margin:14px 0 6px">Narrow by</div>
          ${facet("delivery", "Delivery status", d.facets.delivery)}${facet("sender", "Sender name", d.facets.sender)}${facet("receiver", "Receiver name", d.facets.receiver)}${facet("ediType", "EDI type", d.facets.ediType)}
        </aside>
        <section class="txpanel">
          <div class="txtabs"><span class="active">Transactions</span><form class="txsearch" data-txsearch>${ic("search")}<input name="q" placeholder="Search from transactions" value="${esc(f.q ?? "")}"></form></div>
          <div class="txbar"><span class="small muted">${d.total} transactions</span><button class="btn sm" data-reload>Refresh</button></div>
          <div style="overflow:auto"><table class="txt"><thead><tr><th>Arrival time<div>Transaction status</div></th><th>Sender name<div>Sender org ID</div></th><th>Receiver name<div>Receiver org ID</div></th><th>OpenText transaction ID<div>Sender transaction ID</div></th><th>Transaction type<div>EDI type</div></th></tr></thead><tbody>
          ${d.rows.map((r) => `<tr data-tx="${r.transactionId}"><td><a>${esc(fmtTime(r.receivedAt))}</a><div class="st">${statusIcon(r.delivery)}${r.hasError ? `<span class="sicon bad">${ic("x")}</span>` : ""}${esc(r.delivery)}</div></td><td>${esc(r.sender.companyName)}<div>${esc(r.sender.orgId)}</div></td><td>${esc(r.receiver.companyName)}<div>${esc(r.receiver.orgId)}</div></td><td class="mono">${esc(r.transactionId)}<div>${esc(r.senderTransactionId)}</div></td><td>${esc(r.transactionType)}<div>${esc(r.ediType)}</div></td></tr>`).join("") || `<tr><td colspan="5" class="muted">No transactions match the filters. Clear filters to view all.</td></tr>`}
          </tbody></table></div>
        </section>
      </div>${S.txOpen ? await txDetail(S.txOpen) : ""}`;
    return shellTgo("tgi", "Trading Grid Insights", inner);
  }

  async function txDetail(id) {
    const t = await api(`/api/tgo/transactions/${id}`);
    if (t.error) return "";
    const tab = S.txTab ?? "details";
    const kv = (rows) => rows.filter(([, v]) => v != null && v !== "").map(([k, v, cls]) => `<span class="k">${esc(k)}</span><span class="${cls ?? ""}">${esc(v)}</span>`).join("");
    const keys = Object.values(t.keys).map((k) => [k.name, k.value, "mono"]);
    let body = "";
    if (tab === "details") {
      body = `<div class="dgrid"><div>
        ${t.errors.length ? `<div class="dsec"><div class="dsh">Error <button class="avpill" data-analyze="${t.transactionId}"><img src="/assets/aviator-logo.png" alt="">Analyze with Aviator</button></div><div class="dkv">${kv([["Error code", t.errors[0].code, "red"], ["External error message", t.errors[0].message, "red"], ["Service name", t.errors[0].service, "red"], ["Processing step", t.errors[0].step]])}</div></div>` : ""}
        <div class="dsec"><div class="dsh">Sender</div><div class="dkv">${kv([["Sender name", t.sender.companyName], ["Sender org ID", t.sender.orgId], ["Trading address", t.sender.tradingAddress, "mono"], ["Region", "US"], ["EDI type", t.ediType], ["Transaction type", t.row.transactionType], ["Size in", String(t.sizeBytes)]])}</div></div>
        <div class="dsec"><div class="dsh">Business keys</div><div class="dkv">${kv(keys)}</div></div>
      </div><div>
        <div class="dsec"><div class="dsh">Internal</div><div class="dkv">${kv([["Correlation ID", t.correlationId, "mono"], ["Sender transaction ID", t.senderTransactionId, "mono"], ["Map", t.mapId, "mono"]])}</div></div>
        <div class="dsec"><div class="dsh">Receiver</div><div class="dkv">${kv([["Receiver name", t.receiver.companyName], ["Receiver org ID", t.receiver.orgId], ["Trading address", t.receiver.tradingAddress, "mono"], ["Outbound format", t.ediType], ["Priority", "Real time"]])}</div></div>
        <div class="dsec"><div class="dsh">Additional information</div><div class="dkv">${kv([["Control numbers", Object.entries(t.controlNumbers).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(" · "), "mono"], ["Version", t.version], ["Functional acknowledgment", t.ack ? `${t.ack.documentType} ${t.ack.status} (${t.ack.code})` : "No acknowledgment observed"], ["Last modified", fmtTime(t.lastModified)]])}</div></div>
      </div></div>`;
    } else if (tab === "flow") {
      body = `<div class="flowsteps">${t.statusHistory.map((h) => `<div class="fstep ${h.status === "FAILED" ? "bad" : h.status === "COMPLETED" ? "ok" : "warn"}"><span class="fdot"></span><strong>${esc(h.step)}</strong><span class="small muted">${esc(h.status)} · ${esc(new Date(h.at).toLocaleTimeString())}</span></div>`).join("")}</div>`;
    } else if (tab === "related") {
      body = t.related.length ? `<table class="txt"><thead><tr><th>Arrival time</th><th>Transaction type</th><th>Status</th><th>OpenText transaction ID</th></tr></thead><tbody>${t.related.map((r) => `<tr data-tx="${r.transactionId}"><td><a>${esc(fmtTime(r.receivedAt))}</a></td><td>${esc(r.transactionType)} (${esc(r.ediType)})</td><td><div class="st">${statusIcon(r.delivery)}${esc(r.delivery)}${r.fa ? ` · FA ${esc(r.fa)}` : ""}</div></td><td class="mono">${esc(r.transactionId)}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">No related transactions found.</div>`;
    } else {
      body = `<div class="paygrid"><table class="t"><thead><tr><th>File type</th><th>Filename</th><th>Size</th></tr></thead><tbody><tr><td>Input</td><td class="mono">${esc(t.fileId)}.edi</td><td>${t.payloadPreview.length}</td></tr>${t.translated ? `<tr><td>Output</td><td class="mono">${esc(t.fileId)}.json</td><td>${t.translated.length}</td></tr>` : ""}</tbody></table>
        <div class="payview"><div class="payh">Input<button class="avpill" data-askpayload="${t.transactionId}"><img src="/assets/aviator-logo.png" alt="">Ask Aviator</button></div><pre>${t.payloadPreview.split("\n").map((l, i) => `<span class="ln">${i + 1}</span>${esc(l)}`).join("\n")}</pre></div></div>`;
    }
    return `<div class="txdetail ${S.av.open ? "with-aviator" : ""}"><div class="txh"><span class="mono">${esc(t.transactionId)}</span>${ic("link")}<span class="muted">Delivery status:</span>${statusIcon(t.row.delivery)}<span>${esc(t.row.delivery)}</span>
        <div class="spacer"></div><button class="iconbtn av" data-avopen="tg-aviator" title="Aviator"><img src="/assets/aviator-logo.png" alt=""></button><button class="iconbtn" data-closetx title="Close">${ic("x")}</button></div>
      <div class="txtabs2">${[["details", "Details"], ["flow", "Flow"], ["related", "Related transactions"], ["payloads", "Payloads"]].map(([k, l]) => `<button class="${tab === k ? "active" : ""}" data-txtab="${k}">${l}</button>`).join("")}</div>
      <div class="txb">${body}</div></div>`;
  }

  function pageTgoAccess() {
    const ext = S.meta.hosts.filter((h) => h.key !== "tg-aviator" && h.key !== "claude-connector");
    const last = {};
    for (const a of S.audit ?? []) if (!last[a.host]) last[a.host] = a.at;
    const inner = `<div class="tgo-crumbs">${ic("home")}<span>/</span><span>Account Manager</span><span>/</span><strong>Agent access</strong></div>
      <div class="tgo-page">
        <div class="titlerow"><h1>Agent access</h1></div>
        <p class="sub">Applications with access to Harborview Retail Group's Trading Grid data, limited to the scope below.</p>
        <div class="section-title">Grant</div>
        <table class="t"><tbody>
          <tr><td class="muted" style="width:220px">Grant</td><td class="mono">${esc(S.meta.grant.grantId)}</td></tr>
          <tr><td class="muted">Organization and BUID</td><td>${esc(S.meta.grant.organization)} / ${esc(S.meta.grant.buids.join(", "))}</td></tr>
          <tr><td class="muted">Solutions</td><td class="mono">${esc(S.meta.grant.solutions.join(", "))}</td></tr>
          <tr><td class="muted">Data products</td><td class="mono">${esc(S.meta.grant.dataProducts.join(", "))}</td></tr>
          <tr><td class="muted">Approval required for</td><td class="mono">${esc(S.meta.grant.approvalRequiredFor.join(", "))}</td></tr>
          <tr><td class="muted">Granted by</td><td>${esc(S.meta.grant.grantedBy)} on ${esc(S.meta.grant.grantedAt.slice(0, 10))}; expires ${esc(S.meta.grant.expiresAt.slice(0, 10))}</td></tr>
        </tbody></table>
        <div class="section-title">Connected agent applications</div>
        <div style="overflow:auto"><table class="t"><thead><tr><th>Application</th><th>Exposure</th><th>Execution principal</th><th>Operations</th><th>Last used</th><th>Status</th><th></th></tr></thead><tbody>
        ${ext.map((h) => { const st = S.meta.clientStatus[h.key] ?? "ACTIVE"; return `<tr><td><strong>${esc(h.name)}</strong><div class="small muted">${esc(h.authPattern)}</div></td><td class="small">${esc(h.exposure)}${h.exposure === "External" ? "<div class=\"muted\">via Aviator AKS gateway</div>" : ""}</td><td class="mono small">${esc(h.principal)}<div class="muted">${esc(h.principalType.replace("_", " ").toLowerCase())}</div></td><td>${h.operations.length} of ${Math.max(...S.meta.hosts.map((x) => x.operations.length))}</td><td class="small">${last[h.key] ? esc(new Date(last[h.key]).toLocaleTimeString()) : '<span class="muted">Not used</span>'}</td><td><span class="pill ${st === "ACTIVE" ? "ok" : "bad"}">${st === "ACTIVE" ? "Active" : "Suspended"}</span></td><td>${st === "ACTIVE" ? `<button class="btn sm danger" data-suspend="${h.key}">Suspend access</button>` : `<button class="btn sm" data-restore="${h.key}">Restore access</button>`}</td></tr>`; }).join("")}
        </tbody></table></div>
        <p class="small muted">Suspension applies on the next call. All operations are denied while suspended.</p>
        <div class="section-title">Agents available to each application</div>
        <p class="sub" style="margin-top:0">Agents published through Aviator Studio. Block an agent per application.</p>
        <div style="overflow:auto"><table class="t"><thead><tr><th>Agent</th><th>Status</th>${ext.map((h) => `<th>${esc(h.shortName)}</th>`).join("")}</tr></thead><tbody>
        ${(S.deploy?.agents ?? []).filter((x) => Object.values(x.clients).some((c) => c.published)).map((x) => `<tr><td><strong>${esc(x.name)}</strong></td><td>${statusTag(x)}</td>${ext.map((h) => { const st = x.clients[h.key]; if (!st?.published) return '<td class="small muted">Not published</td>'; return `<td><button class="btn sm ${st.blocked ? "" : "ghost"}" data-blockagent="${h.key}|${x.agentId}" data-on="${st.blocked ? 0 : 1}">${st.blocked ? "Unblock" : "Block"}</button>${st.blocked ? ' <span class="pill bad">Blocked</span>' : ""}</td>`; }).join("")}</tr>`).join("")}
        </tbody></table></div>
      </div>`;
    return shellTgo("portal", "Trading Grid Online", inner);
  }

  // ---------- Aviator Studio ----------
  const studioNav = (p) => navList([{ g: "Solutions", items: [["agent", "/studio", "Agents", studioAgents().length], ["list", "/studio/use-cases", "Use cases", S.meta.useCases.length]] }, { g: "Registries", items: [["server", "/studio/mcp", "MCP management"]] }], p);
  const shellStudio = (inner) => shellStandard({ title: "Aviator Studio", nav: studioNav(location.pathname), inner });

  function agentCard(a) {
    const n = a.tools === "ALL" ? S.meta.toolCount : a.tools.length;
    return `<div class="agentcard" data-href="/studio/agents/${a.id}"><div class="h"><div class="aico">${ic("agent")}</div><div><div class="nm">${esc(a.name)}</div><div class="small muted">${esc(a.persona)}</div></div><span style="margin-left:auto">${statusTag(a)}</span></div><div class="role">${esc(a.role)}</div><div class="meta"><span>${n} tools</span><span>Based on ${esc(a.inspiredBy[0].name)}</span></div></div>`;
  }
  const pageStudioAgents = () => shellStudio(`<div class="pagehead"><div class="titlerow"><h1>Agents</h1></div><p class="sub">Aviator agents on Trading Grid Context Services. Status follows the Aviator portfolio. Prototype agents are demo only.</p></div><div class="content">${["Live today", "On the roadmap", "Incubating", "Prototype"].map((st) => { const list = studioAgents().filter((a) => a.status === st); return list.length ? `<div class="section-title">${st} <span class="muted small">${list.length}</span></div><div class="agentgrid">${list.map(agentCard).join("")}</div>` : ""; }).join("")}</div>`);

  function deploymentsView(a) {
    const d = S.deploy?.agents.find((x) => x.agentId === a.id);
    if (!d) return `<div class="empty">Not publishable. TG Aviator runs only in Trading Grid Online.</div>`;
    return `<p class="sub" style="margin-top:0">Published agents appear as the MCP tool <span class="mono">${esc(d.toolName)}</span> for each published client. Administrators can block an agent per client in Trading Grid Online.</p>
      ${a.status !== "Live today" ? `<div class="alert" style="margin:10px 0">${esc(a.status)} agent. Labeled as a preview in external clients.</div>` : ""}
      <table class="t"><thead><tr><th>Client</th><th>Route</th><th>Published</th><th>Trading Grid Online</th><th></th></tr></thead><tbody>
      ${S.deploy.clients.map((h) => { const st = d.clients[h]; const hh = hostBy(h); return `<tr><td><strong>${esc(hh.name)}</strong></td><td class="small">${esc(hh.route.join(" › "))}</td><td><span class="pill ${st.published ? "ok" : "neutral"}">${st.published ? "Published" : "Not published"}</span></td><td>${st.blocked ? '<span class="pill bad">Blocked by admin</span>' : '<span class="small muted">Allowed</span>'}</td><td><button class="btn sm ${st.published ? "danger" : ""}" data-publish="${a.id}|${h}" data-on="${st.published ? 0 : 1}">${st.published ? "Unpublish" : "Publish"}</button></td></tr>`; }).join("")}
      </tbody></table>`;
  }

  function resources(a, c) {
    const tools = a.tools === "ALL" ? S.tools.map((t) => t.name) : a.tools;
    const used = c?.usage ?? {};
    return `<div class="res"><h3>Resources</h3>
      <div class="sect"><div class="shead">Input <span class="num">${a.inputs.length}</span></div><div class="chipset">${a.inputs.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></div>
      <div class="sect"><div class="shead">Knowledge <span class="num">${a.knowledge.length}</span></div><div class="chipset">${a.knowledge.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></div>
      <div class="sect"><div class="shead">Tools <span class="num">${tools.length}</span></div>
        <div class="rescard"><div class="ico">${ic("server")}</div><div><div class="t">Trading Grid Context Services</div><div class="d">${tools.length} tools: partner configuration, exchange evidence, maps, requests and data products</div></div><span class="kind">MCP</span></div>
        <ul class="toollist">${tools.map((t) => `<li class="${c?.live === t ? "live" : used[t] ? "used" : ""}"><span class="pip"></span>${esc(t)}${used[t] ? `<span class="n">${used[t]}</span>` : ""}</li>`).join("")}</ul></div>
      <div class="sect"><div class="shead">Output <span class="num">${a.outputs.length}</span></div>${a.outputs.map((o) => `<div class="outrow">${ic(o.type === "Table" ? "table" : "text")}<div><div class="t">${esc(o.name)}</div><div class="d">${esc(o.type)}</div></div></div>`).join("")}</div>
    </div>`;
  }

  function pageStudioAgent(id, tab) {
    const a = agent(id);
    if (!a) return shellStudio(`<div class="content"><div class="empty">Agent not found.</div></div>`);
    const key = `studio:${id}`;
    const c = conv(key, id, "aviator-studio");
    mounts[key] = (cc) => chatView(cc, { startLabel: "Use cases" });
    sideMounts[key] = (cc) => resources(a, cc);
    const def = `<div class="rolebox">${esc(a.role)}</div>
      <div class="label"><span>Task instructions</span><span class="small muted">Scenario: ${esc(a.scenario)}</span></div>
      ${a.instructions.map((ins, i) => `<details class="acc" ${i === 0 ? "open" : ""}><summary><span class="grip">⠿</span>${esc(ins.title)}<span class="chev">›</span></summary><div class="body">${esc(ins.body).replace(/^## (.*)$/gm, "<h4>## $1</h4>")}</div></details>`).join("")}
      <div class="label"><span>Based on</span></div>
      <table class="t"><tbody>${a.inspiredBy.map((x) => `<tr><td><strong>${esc(x.name)}</strong></td><td class="muted">${esc(x.where)}</td></tr>`).join("")}</tbody></table>`;
    return shellStudio(`<div class="pagehead"><div class="crumbs"><a data-href="/studio">Agents</a> / ${esc(a.name)}</div>
      <div class="titlerow"><h1>${esc(a.name)}</h1>${statusTag(a)}
        <div class="actions"><button class="btn" data-href="/ext?eco=copilot-studio&agent=${a.id}">${ic("globe")}Run in external ecosystem</button><button class="btn" data-newconv="${key}">${ic("refresh")}New conversation</button><button class="btn primary" data-href="/studio/agents/${a.id}/simulate">${ic("play")}Simulate</button></div></div>
      <div class="tabs"><button class="tab ${!tab ? "active" : ""}" data-href="/studio/agents/${a.id}">${ic("doc")}Agent definition</button><button class="tab ${tab === "simulate" ? "active" : ""}" data-href="/studio/agents/${a.id}/simulate">${ic("play")}Simulate</button><button class="tab ${tab === "deployments" ? "active" : ""}" data-href="/studio/agents/${a.id}/deployments">${ic("globe")}Deployments</button></div></div>
      <div class="grid2"><div class="leftcol">${tab === "simulate" ? `<div data-conv="${key}">${mounts[key](c)}</div>` : tab === "deployments" ? deploymentsView(a) : def}</div><div class="rightcol" data-side="${key}">${resources(a, c)}</div></div>`);
  }

  function pageStudioUseCases() {
    const areas = [...new Set(S.meta.useCases.map((u) => u.area))];
    const f = S.ucFilter ?? "";
    const rows = S.meta.useCases.filter((u) => !f || u.area === f);
    return shellStudio(`<div class="pagehead"><div class="titlerow"><h1>Use cases</h1></div><p class="sub">40 retail B2B scenarios with assigned agents.</p></div>
      <div class="content"><div class="filters"><select class="select" data-ucarea><option value="">All areas</option>${areas.map((a) => `<option ${a === f ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></div>
      <div style="overflow:auto"><table class="t"><thead><tr><th>#</th><th>Use case</th><th>Prompt</th><th>Area</th><th>Agent</th><th></th></tr></thead><tbody>
      ${rows.map((u) => `<tr><td class="mono">UC${u.n}</td><td><strong>${esc(u.title)}</strong></td><td class="small">${esc(u.prompt)}</td><td class="small">${esc(u.area)}</td><td class="small">${esc(agent(u.agent).name)}</td><td><button class="btn sm" data-runuc="${u.n}">${ic("play")}Run</button></td></tr>`).join("")}
      </tbody></table></div></div>`);
  }

  const pageStudioMcp = () => shellStudio(`<div class="pagehead"><div class="titlerow"><h1>MCP management</h1></div><p class="sub">MCP servers available to agents in this workspace.</p></div>
      <div class="content"><div class="rescard" style="max-width:640px"><div class="ico">${ic("server")}</div><div><div class="t">Trading Grid Context Services</div><div class="d">${S.meta.toolCount} tools: partner configuration, exchange evidence, maps, requests and data products</div><div class="d mono">${esc(S.meta.mcp.url)}</div><div class="d">Connected as <span class="mono">${esc(hostBy("aviator-studio").principal)}</span> · Grant ${esc(S.meta.grant.grantId)}</div></div><span class="kind">MCP</span></div>
      <button class="btn" data-href="/cs/clients">${ic("link")}Open Context Services console</button></div>`);

  // ---------- Context Services console ----------
  const csNav = (p) => navList([{ g: null, items: [["home", "/cs", "Overview"]] }, { g: "Service", items: [["wrench", "/cs/tools", "Tools", S.meta.toolCount], ["agent", "/cs/agents", "Published agents"], ["server", "/cs/clients", "Clients and endpoint", S.meta.hosts.length - 1], ["shield", "/cs/access", "Access and audit"], ["check", "/cs/approvals", "Approvals", S.plans.filter((x) => x.status === "PENDING_APPROVAL").length || ""]] }], p);
  const shellCs = (inner) => shellStandard({ title: "Trading Grid Context Services", tag: "Service layer", nav: csNav(location.pathname), inner });

  function pageCsAgents() {
    const d = S.deploy;
    return shellCs(`<div class="pagehead"><div class="titlerow"><h1>Published agents</h1></div><p class="sub">Aviator agents available as MCP tools. Runs execute under the caller's grant; each tool call is audited.</p></div>
      <div class="content"><div style="overflow:auto"><table class="t"><thead><tr><th>Agent</th><th>MCP tool</th><th>Status</th>${d.clients.map((h) => `<th>${esc(hostBy(h).shortName)}</th>`).join("")}</tr></thead><tbody>
      ${d.agents.map((x) => `<tr><td><strong>${esc(x.name)}</strong></td><td class="mono small">${esc(x.toolName)}</td><td>${statusTag(x)}</td>${d.clients.map((h) => { const st = x.clients[h]; return `<td>${st.blocked ? '<span class="pill bad">Blocked</span>' : st.published ? '<span class="pill ok">Published</span>' : '<span class="small muted">No</span>'}</td>`; }).join("")}</tr>`).join("")}
      </tbody></table></div><p class="small muted">Publish in Aviator Studio Deployments. Block in Trading Grid Online Agent access. The Aviator AKS gateway limits agent calls per client.</p></div>`);
  }

  function auditTable(rows) {
    return rows.length ? `<div style="overflow:auto"><table class="t"><thead><tr><th>Time</th><th>Route</th><th>Principal</th><th>Tool</th><th>Decision</th><th>Result</th><th>ms</th></tr></thead><tbody>
      ${rows.map((a) => `<tr><td class="small">${esc(new Date(a.at).toLocaleTimeString())}</td><td class="small">${esc(a.route)}${a.operation === "agent.invoke" ? ' <span class="pill info">Agent call</span>' : a.channel?.startsWith("agent:") ? ` <span class="pill neutral">via ${esc(agent(a.channel.slice(6))?.name ?? "agent")}</span>` : a.channel === "mcp" ? ' <span class="pill info">MCP</span>' : ""}</td><td class="mono small">${esc(a.principal)}</td><td class="mono small">${esc(a.tool)}</td><td><span class="pill ${a.decision === "PERMIT" ? "ok" : "bad"}">${esc(a.decision)}</span></td><td class="small">${esc(a.status)}</td><td class="small">${a.ms}</td></tr>`).join("")}
      </tbody></table></div>` : `<div class="empty">No calls recorded.</div>`;
  }

  function pageCsOverview() {
    const rows = S.audit ?? [];
    const domains = {};
    for (const t of S.tools) domains[t.domain] = (domains[t.domain] ?? 0) + 1;
    return shellCs(`<div class="pagehead"><div class="titlerow"><h1>Overview</h1><div class="actions"><button class="btn ghost" data-reload>${ic("refresh")}Refresh</button></div></div>
      <p class="sub">Governed MCP access to Trading Grid context for OpenText and customer agents. Every call is authorized, scoped and audited.</p></div>
      <div class="content">
        <div class="kpis"><div class="kpi"><div class="v">${S.meta.toolCount}</div><div class="k">MCP tools</div></div><div class="kpi"><div class="v">6</div><div class="k">Trading Grid source products</div></div><div class="kpi"><div class="v">${S.meta.hosts.length - 1}</div><div class="k">Registered clients</div></div><div class="kpi"><div class="v">${rows.length}</div><div class="k">Calls recorded</div></div></div>
        <div class="section-title">Request path</div>
        <div class="flow4">
          <div class="box"><h4>Clients</h4><ul class="small"><li>Aviator Studio (direct)</li>${EXT.map((k) => `<li>${esc(hostBy(k).shortName)}</li>`).join("")}</ul></div><div class="arrow">›</div>
          <div class="box"><h4>Aviator AKS gateway</h4><ul class="small"><li>External ecosystem egress</li><li>Client registration and token exchange</li><li>Rate and cost limits</li></ul></div><div class="arrow">›</div>
          <div class="box emph"><h4>Trading Grid Context Services</h4><ul class="small"><li>Resolve grant from Trading Grid Online</li><li>Evaluate organization, BUID, solution, operation</li><li>Invoke scoped source operation</li><li>Evidence envelope and audit</li></ul></div><div class="arrow">›</div>
          <div class="box"><h4>Trading Grid sources</h4><ul class="small"><li>Community Management</li><li>TG Insights</li><li>Cartographer</li><li>Community Projects</li><li>Data Explorer (TGDP)</li></ul></div>
        </div>
        <div class="section-title">Live calls</div>${auditTable(rows.slice(0, 12))}
        <div class="section-title">Tools by domain</div>
        <table class="t"><tbody>${Object.entries(domains).map(([d, n]) => `<tr class="click" data-domain="${esc(d)}"><td>${esc(d)}</td><td class="muted" style="text-align:right">${n}</td></tr>`).join("")}</tbody></table>
      </div>`);
  }

  function pageCsTools() {
    const q = (S.toolQ ?? "").toLowerCase(), d = S.toolDomain ?? "";
    const domains = [...new Set(S.tools.map((t) => t.domain))];
    const rows = S.tools.filter((t) => (!d || t.domain === d) && (!q || `${t.name} ${t.description} ${t.binding}`.toLowerCase().includes(q)));
    return shellCs(`<div class="pagehead"><div class="titlerow"><h1>Tools</h1></div><p class="sub">${S.tools.length} candidate MCP tools. Select a tool to invoke it as any registered client.</p></div>
      <div class="content"><div class="filters"><input class="input" data-toolq placeholder="Search tools or source paths" value="${esc(S.toolQ ?? "")}"><select class="select" data-tooldomain><option value="">All domains</option>${domains.map((x) => `<option ${x === d ? "selected" : ""}>${esc(x)}</option>`).join("")}</select><span class="small muted" style="align-self:center">${rows.length} shown</span></div>
      <div style="overflow:auto"><table class="t"><thead><tr><th>Tool</th><th>Domain</th><th>Product</th><th>Action</th><th>Source binding</th></tr></thead><tbody>
      ${rows.map((t) => `<tr class="click" data-tool="${t.name}"><td><span class="mono"><strong>${esc(t.name)}</strong></span><div class="small muted">${esc(t.title)}</div></td><td class="small">${esc(t.domain)}</td><td class="small">${esc(t.product.replace("Trading Grid ", ""))}</td><td><span class="pill ${t.kind === "write" ? "warn" : t.kind === "prepare" ? "info" : "neutral"}">${esc(t.kind)}</span></td><td class="mono small" style="max-width:360px;word-break:break-word">${esc(t.binding)}</td></tr>`).join("")}
      </tbody></table></div></div>`);
  }

  function sampleArgs(t) {
    const ex = { partner: "Brightwell Home Goods", company: "Brightwell Home Goods", key_value: "SH-77155", transaction_id: "", trading_address: "ZZ:BRIGHTWELLHG", map: "BWHG_856_4010_IN", entity: "STORE_TO_GLN", key: "0388", product_id: "tgdp.transaction_activity", mailbox_id: "MB-HRG-PROD-01", bpr_id: "BPR-4104", tpr_id: "TPR-70041", solution_id: "SOL-HRG-RETAIL-01", poc_id: "POC-BWHG-01", legal_entity_id: "LE-HRG-US-01", invitation_id: 7702, request_id: 55120, pi_unique_id: 900304, workflow_template_id: 3101, status_id: "ST-10421", work_order_id: "WO-5521", tracking_id: "TRK-PGH-0091", operation_ref: "ST-10421", name: "search_transactions", file_id: "SPEC-1001-A", search_token: "Store", schedule_id: "SCH-0007", template_name: "HRG_SUPPLIER_STD", po_number: "4500018832" };
    const o = {};
    for (const r of t.inputSchema.required ?? []) o[r] = ex[r] ?? "";
    if (!Object.keys(o).length && t.name === "search_transactions") o.key_value = "SH-77155";
    return JSON.stringify(o, null, 2);
  }
  function toolDrawer(name) {
    const t = S.tools.find((x) => x.name === name);
    const el = document.createElement("div");
    el.innerHTML = `<div class="drawer-bg" data-close></div><div class="drawer"><div class="dh"><div><div class="mono"><strong>${esc(t.name)}</strong></div><div class="small muted">${esc(t.domain)} · ${esc(t.product)}</div></div><button class="btn ghost sm" style="margin-left:auto" data-close>Close</button></div>
      <div class="db"><p>${esc(t.description)}</p>
      <div class="kv"><span class="k">Source binding</span><span class="mono">${esc(t.binding)}</span><span class="k">Contract basis</span><span>${esc(t.basis)}</span><span class="k">Operation</span><span class="mono">${esc(t.operation)}</span><span class="k">Action class</span><span>${esc(t.kind)}</span><span class="k">Call as client</span><span><select class="select" id="tryHost">${S.meta.hosts.filter((h) => h.key !== "tg-aviator").map((h) => `<option value="${h.key}">${esc(h.name)}</option>`).join("")}</select></span></div>
      <div class="label"><span>Arguments (JSON)</span></div><textarea id="tryArgs">${esc(sampleArgs(t))}</textarea>
      <div style="margin:10px 0"><button class="btn primary" id="tryRun">${ic("play")}Invoke tool</button></div><div id="tryOut"></div>
      <details style="margin-top:12px"><summary class="small muted" style="cursor:pointer">Input schema</summary><pre class="json">${esc(JSON.stringify(t.inputSchema, null, 2))}</pre></details></div></div>`;
    document.body.appendChild(el);
    el.addEventListener("click", async (ev) => {
      if (ev.target.closest("[data-close]")) el.remove();
      if (ev.target.closest("#tryRun")) {
        let args; try { args = JSON.parse($("#tryArgs", el).value || "{}"); } catch { $("#tryOut", el).innerHTML = `<div class="alert bad">Invalid JSON. Correct the arguments and retry.</div>`; return; }
        $("#tryOut", el).innerHTML = `<div class="thinking"><span class="dots"><span></span><span></span><span></span></span>Invoking</div>`;
        const r = await api(`/api/tools/${t.name}/invoke`, { method: "POST", body: { host: $("#tryHost", el).value, args } });
        $("#tryOut", el).innerHTML = `<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">${statusPill({ done: true, status: r.envelope.status, envelope: r.envelope })}${r.envelope.evidence ? `<span class="pill ${r.envelope.evidence.completeness === "COMPLETE" ? "ok" : "warn"}">${esc(r.envelope.evidence.completeness)}</span>` : ""}<span class="small muted">${r.ms} ms</span></div><pre class="json">${esc(JSON.stringify(r.envelope, null, 2))}</pre>`;
      }
    });
  }

  function pageCsClients() {
    const m = S.meta.mcp;
    const hosts = S.meta.hosts.filter((h) => h.key !== "tg-aviator");
    return shellCs(`<div class="pagehead"><div class="titlerow"><h1>Clients and endpoint</h1></div><p class="sub">One MCP endpoint for all clients. Each client credential selects its execution principal and grant.</p></div>
      <div class="content">
        <table class="t"><tbody><tr><td class="muted" style="width:200px">Endpoint</td><td class="mono">${esc(m.url)}</td><td><button class="btn sm ghost" data-copy="${esc(m.url)}">Copy</button></td></tr>
        <tr><td class="muted">Transport</td><td colspan="2">Streamable HTTP, JSON responses, POST only</td></tr>
        <tr><td class="muted">Authentication</td><td colspan="2"><span class="mono">Authorization: Bearer &lt;token&gt;</span>, or the token in the connector URL path for clients without custom headers</td></tr>
        <tr><td class="muted">Capabilities</td><td colspan="2">Tools, filtered to the caller's grant. Prompts, one per published agent.</td></tr></tbody></table>
        <div class="section-title">Registered clients</div>
        <div style="overflow:auto"><table class="t"><thead><tr><th>Client</th><th>Route</th><th>Execution principal</th><th>Status</th><th>Bearer token</th><th>Connector URL</th></tr></thead><tbody>
        ${hosts.map((h) => { const k = m.tokens[h.key]; const st = S.meta.clientStatus[h.key] ?? "ACTIVE"; return `<tr><td><strong>${esc(h.name)}</strong><div class="small muted">${esc(h.authPattern)}</div></td><td class="small">${esc(h.route.join(" › "))}</td><td class="mono small">${esc(h.principal)}</td><td><span class="pill ${st === "ACTIVE" ? "ok" : "bad"}">${st === "ACTIVE" ? "Active" : "Suspended"}</span></td>
          <td><button class="btn sm ghost" data-copy="${esc(k.token)}">Copy token</button></td><td><button class="btn sm ghost" data-copy="${esc(k.pathUrl)}">Copy URL</button></td></tr>`; }).join("")}
        </tbody></table></div>
        <div class="section-title">Test from a terminal</div>
        <pre class="json">curl -s ${esc(m.url)} \\
  -H "Authorization: Bearer ${esc(m.tokens["claude-connector"].token)}" \\
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_transaction","arguments":{"key_value":"SH-77155"}}}'</pre>
        <p class="small muted">Prototype credentials. Production requires OAuth with PKCE and audience-bound tokens through the Aviator AKS gateway.</p>
      </div>`);
  }

  function pageCsAccess() {
    const hosts = S.meta.hosts;
    const ops = [...new Set(hosts.flatMap((h) => h.operations).concat(["billing.read"]))];
    return shellCs(`<div class="pagehead"><div class="titlerow"><h1>Access and audit</h1><div class="actions"><button class="btn ghost" data-reload>${ic("refresh")}Refresh</button></div></div><p class="sub">Effective access is the intersection of identity, active grant, organization, BUID, solution, operation and approval. Explicit denial wins.</p></div>
      <div class="content">
        <div class="section-title" style="margin-top:0">Operation grants by client</div>
        <div style="overflow:auto"><table class="t"><thead><tr><th>Operation</th>${hosts.map((h) => `<th>${esc(h.shortName)}</th>`).join("")}</tr></thead><tbody>
        ${ops.map((o) => `<tr><td class="mono small">${esc(o)}${S.meta.grant.approvalRequiredFor.includes(o) ? ' <span class="pill info">Approval</span>' : ""}</td>${hosts.map((h) => `<td>${h.operations.includes(o) && (S.meta.clientStatus[h.key] ?? "ACTIVE") === "ACTIVE" ? '<span class="pill ok">Granted</span>' : '<span class="pill bad">No</span>'}</td>`).join("")}</tr>`).join("")}
        </tbody></table></div>
        <div class="section-title">Audit log</div>${auditTable(S.audit ?? [])}
      </div>`);
  }

  function planRow(p) {
    const cls = p.status === "PENDING_APPROVAL" ? "info" : p.status === "APPROVED" || p.status === "EXECUTED" ? "ok" : "bad";
    return `<tr><td class="mono">${esc(p.planId)}</td><td>${esc(p.summary)}</td><td class="mono small">${esc(p.submitTool)}</td><td class="small">${esc(hostBy(p.host)?.shortName ?? p.host)}</td><td><span class="pill ${cls}">${esc(p.status.replace("_", " "))}</span></td><td class="small muted">${esc(new Date(p.createdAt).toLocaleString())}</td>
      <td>${p.status === "PENDING_APPROVAL" ? `<button class="btn sm primary" data-approve="${p.planId}">Approve</button> <button class="btn sm danger" data-reject="${p.planId}">Reject</button>` : ""}</td></tr>`;
  }
  const pageCsApprovals = () => shellCs(`<div class="pagehead"><div class="titlerow"><h1>Approvals</h1><div class="actions"><button class="btn ghost" data-reload>${ic("refresh")}Refresh</button></div></div><p class="sub">Prepared changes awaiting approval. Approval binds to the exact target and parameters and expires after 30 minutes.</p></div>
      <div class="content">${S.plans.length ? `<div style="overflow:auto"><table class="t"><thead><tr><th>Plan</th><th>Action</th><th>Submit tool</th><th>Client</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>${S.plans.map(planRow).join("")}</tbody></table></div>` : `<div class="empty">No pending plans. Plans appear when an agent prepares a change.</div>`}</div>`);
  async function pageApprove(id) {
    const p = await api(`/api/plans/${id}`);
    if (p.error) return shellCs(`<div class="content"><div class="empty">Plan ${esc(id)} not found.</div></div>`);
    return shellCs(`<div class="pagehead"><div class="crumbs"><a data-href="/cs/approvals">Approvals</a> / ${esc(id)}</div><div class="titlerow"><h1>Review plan</h1></div><p class="sub">Prepared by ${esc(p.principal)} through ${esc(hostBy(p.host)?.name)}. The agent submits after approval.</p></div><div class="content">${renderPlan({ ...p, submitWith: { tool: p.submitTool } })}</div>`);
  }

  // ---------- External ecosystems (simulated clients) ----------
  function pageExt() {
    const eco = EXT.includes(qs().get("eco")) ? qs().get("eco") : "copilot-studio";
    const avail = studioAgents().filter((a) => S.deploy?.agents.find((x) => x.agentId === a.id)?.clients[eco]?.published && !S.deploy.agents.find((x) => x.agentId === a.id).clients[eco].blocked);
    const agentId = avail.some((a) => a.id === qs().get("agent")) ? qs().get("agent") : (avail.find((a) => a.id === "error-resolution") ?? avail[0])?.id ?? "error-resolution";
    const h = hostBy(eco);
    const key = `ext:${eco}:${agentId}`;
    const c = conv(key, agentId, eco);
    const st = S.meta.clientStatus[eco] ?? "ACTIVE";
    mounts[key] = (cc) => chatView(cc, { startLabel: "Suggested requests", placeholder: `Message the agent in ${h.shortName}` });
    const nav = navList([{ g: "Ecosystem", items: EXT.map((k) => ["globe", `/ext?eco=${k}&agent=${agentId}`, hostBy(k).shortName]) }], location.pathname + location.search);
    return `<header class="topbar ext"><div class="brand"><span class="extmark">${ic("globe")}</span><span class="name">External ecosystem client</span><span class="tag">Simulated</span></div><div class="spacer"></div>${journeyBtn}${avatar()}</header>
      <div class="layout"><nav class="sidenav">${nav}<div class="foot">Simulated client. Requests run as MCP tool calls through Context Services.</div></nav>
      <main class="main"><div class="pagehead"><div class="titlerow"><h1>${esc(h.name)}</h1><span class="pill ${st === "ACTIVE" ? "ok" : "bad"}">${st === "ACTIVE" ? "Connected" : "Suspended in Trading Grid Online"}</span>
        <div class="actions"><select class="select" data-extagent>${avail.map((a) => `<option value="${a.id}" ${a.id === agentId ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select><button class="btn" data-newconv="${key}">${ic("refresh")}New conversation</button></div></div>
        <div class="routebar">${ic("route")}${h.route.map((r, i) => `<span class="${i === 1 ? "gw" : i === 2 ? "cs" : ""}">${esc(r)}</span>`).join('<span class="sep">›</span>')}</div>
        <div class="kv" style="margin-top:10px"><span class="k">Authentication</span><span>${esc(h.authPattern)}</span><span class="k">Principal</span><span class="mono">${esc(h.principal)} (${esc(h.principalType.replace("_", " ").toLowerCase())})</span>${h.note ? `<span class="k">Note</span><span>${esc(h.note)}</span>` : ""}</div>
        ${eco === "claude-ui" ? `<div class="alert" style="margin-top:12px">For a live connection, add the Claude UI connector URL from <a data-href="/cs/clients">Clients and endpoint</a> as a custom connector in Claude.</div>` : ""}
      </div><div class="content" data-conv="${key}">${mounts[key](c)}</div></main></div>`;
  }

  // ---------- router ----------
  let poll = 0;
  async function render() {
    const p = location.pathname;
    clearTimeout(poll);
    Object.keys(mounts).forEach((k) => delete mounts[k]);
    let html;
    if (p === "/") html = pageJourney();
    else if (p === "/tgo") html = pageTgoHome();
    else if (p === "/tgo/insights") {
      if (qs().get("q") != null && S.lastQ !== location.search) { S.lastQ = location.search; S.tgoFilters = { days: 7, q: qs().get("q") }; }
      if (qs().get("aviator") === "1" && S.lastAv !== location.search) { S.lastAv = location.search; S.av.open = true; S.av.agentId = "tg-aviator"; }
      html = await pageTgoInsights();
    }
    else if (p === "/tgo/access") { S.deploy = await api("/api/deployments"); S.audit = await api("/api/audit"); S.meta.clientStatus = (await api("/api/meta")).clientStatus; html = pageTgoAccess(); }
    else if (p === "/studio") html = pageStudioAgents();
    else if (p.startsWith("/studio/agents/")) { const [, , , id, tab] = p.split("/"); if (tab === "deployments") S.deploy = await api("/api/deployments"); html = pageStudioAgent(id, tab); }
    else if (p === "/studio/use-cases") html = pageStudioUseCases();
    else if (p === "/studio/mcp") html = pageStudioMcp();
    else if (p === "/cs") { S.audit = await api("/api/audit"); html = pageCsOverview(); }
    else if (p === "/cs/tools") html = pageCsTools();
    else if (p === "/cs/agents") { S.deploy = await api("/api/deployments"); html = pageCsAgents(); }
    else if (p === "/boundaries") html = pageBoundaries();
    else if (p === "/cs/clients") { S.meta.clientStatus = (await api("/api/meta")).clientStatus; html = pageCsClients(); }
    else if (p === "/cs/access") { S.audit = await api("/api/audit"); html = pageCsAccess(); }
    else if (p === "/cs/approvals") { S.plans = await api("/api/plans"); html = pageCsApprovals(); }
    else if (p.startsWith("/approve/")) { S.plans = await api("/api/plans"); html = await pageApprove(p.split("/")[2]); }
    else if (p === "/ext") { S.deploy = await api("/api/deployments"); S.meta.clientStatus = (await api("/api/meta")).clientStatus; html = pageExt(); }
    else html = shellCs(`<div class="content"><div class="empty">Page not found. Return to the demo journey.</div></div>`);
    app.innerHTML = html;
    if (qs().get("open") === "1" && p === "/tgo/insights" && S.tgo?.rows?.length && !S.txOpen && S.lastOpen !== location.search) { S.lastOpen = location.search; S.txOpen = S.tgo.rows[0].transactionId; S.txTab = "details"; return render(); }
    if (p === "/cs" || p === "/cs/access") poll = setTimeout(() => { if (location.pathname === p && !document.querySelector(".drawer")) render(); }, 4000);
  }
  const go = (href) => { history.pushState({}, "", href); window.scrollTo(0, 0); render(); };
  window.addEventListener("popstate", render);
  const keyOf = (el) => el.closest("[data-conv]")?.dataset.conv ?? null;


  app.addEventListener("click", async (ev) => {
    const t = ev.target.closest("[data-href],[data-prompt],[data-runuc],[data-publish],[data-blockagent],[data-demoreset],[data-step],[data-approve],[data-reject],[data-newconv],[data-tool],[data-copy],[data-reload],[data-domain],[data-avopen],[data-avclose],[data-avmax],[data-chatmax],[data-avnew],[data-avask],[data-togglesteps],[data-txtab],[data-tx],[data-closetx],[data-analyze],[data-askpayload],[data-facet],[data-unf],[data-clearf],[data-suspend],[data-restore]");
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.copy) { navigator.clipboard?.writeText(d.copy); const o = t.textContent; t.textContent = "Copied"; setTimeout(() => (t.textContent = o), 1200); return; }
    if (d.reload != null) return render();
    if (d.domain) { S.toolDomain = d.domain; return go("/cs/tools"); }
    if (d.tool) return toolDrawer(d.tool);
    if (d.avopen) { if (S.av.open && S.av.agentId === d.avopen) { S.av.open = false; return render(); } S.av = { ...S.av, open: true, agentId: d.avopen }; return render(); }
    if (d.avclose != null) { S.av.open = false; S.av.max = false; return render(); }
    if (d.avmax != null) { S.av.max = !S.av.max; return render(); }
    if (d.chatmax) { S.max[d.chatmax] = !S.max[d.chatmax]; return refreshConv(d.chatmax); }
    if (d.avnew != null) { delete S.convs[avKey()]; return render(); }
    if (d.avask) return send(avKey(), d.avask);
    if (d.togglesteps) { const key = keyOf(t); const m = S.convs[key].items[Number(d.togglesteps)]; m.showSteps = !m.showSteps; return refreshConv(key); }
    if (d.txtab) { S.txTab = d.txtab; return render(); }
    if (d.tx) { if (!location.pathname.startsWith("/tgo/insights")) { S.txOpen = d.tx; S.txTab = "details"; return go("/tgo/insights"); } S.txOpen = d.tx; S.txTab = "details"; return render(); }
    if (d.closetx != null) { S.txOpen = null; return render(); }
    if (d.analyze) return openAviator("error-resolution", `Analyze failed transaction ${d.analyze}. Explain the likely cause, which side of the exchange owns it, what you checked, and the numbered next steps.`, d.analyze);
    if (d.askpayload) { S.av = { open: true, agentId: "payload-analysis", txId: d.askpayload }; delete S.convs["tgo:payload-analysis"]; return render(); }
    if (d.facet) { S.tgoFilters[d.facet] = S.tgoFilters[d.facet] === d.val ? "" : d.val; return render(); }
    if (d.unf) { S.tgoFilters[d.unf] = ""; return render(); }
    if (d.clearf != null) { S.tgoFilters = { days: S.tgoFilters.days }; return render(); }
    if (d.suspend || d.restore) { await api(`/api/clients/${d.suspend || d.restore}/status`, { method: "POST", body: { active: !!d.restore } }); return render(); }
    if (d.newconv) { delete S.convs[d.newconv]; return render(); }
    if (d.step) { const key = keyOf(t); const [mi, si] = d.step.split(":").map(Number); const s = S.convs[key].items[mi].steps[si]; s.open = !s.open; return refreshConv(key); }
    if (d.approve) { t.disabled = true; return decide(d.approve, true, keyOf(t)); }
    if (d.reject) return decide(d.reject, false, keyOf(t));
    if (d.prompt) { const key = keyOf(t); return send(key, d.prompt); }
    if (d.publish) { const [agentId, host] = d.publish.split("|"); S.deploy = await api("/api/deployments", { method: "POST", body: { agentId, host, published: t.dataset.on === "1" } }); return render(); }
    if (d.blockagent) { const [host, agentId] = d.blockagent.split("|"); await api(`/api/clients/${host}/agents/${agentId}`, { method: "POST", body: { blocked: t.dataset.on === "1" } }); return render(); }
    if (d.demoreset != null) { if (!confirm("Reset demo data? Approvals, changes, suspensions, conversations and the audit log will be cleared.")) return; await api("/api/demo/reset", { method: "POST" }); S.convs = {}; S.plans = []; S.av.open = false; S.txOpen = null; t.textContent = "Demo reset"; setTimeout(render, 600); return; }
    if (d.runuc) { const u = uc(Number(d.runuc)); go(`/studio/agents/${u.agent === "tg-aviator" ? "context-assistant" : u.agent}/simulate`); return setTimeout(() => send(`studio:${u.agent}`, u.prompt), 0); }
    if (d.href) return go(d.href);
  });
  app.addEventListener("submit", (ev) => {
    if (ev.target.matches("[data-compose]")) { ev.preventDefault(); const ta = ev.target.querySelector("textarea"); const v = ta.value; ta.value = ""; return send(keyOf(ev.target), v); }
    if (ev.target.matches("[data-txsearch]")) { ev.preventDefault(); S.tgoFilters.q = ev.target.q.value.trim(); return render(); }
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    if (S.av.max) { S.av.max = false; render(); }
    for (const k of Object.keys(S.max)) if (S.max[k]) { S.max[k] = false; refreshConv(k); }
  });
  app.addEventListener("keydown", (ev) => {
    if (ev.target.matches("[data-compose] textarea") && ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); ev.target.form.requestSubmit(); }
  });
  app.addEventListener("change", (ev) => {
    const d = ev.target.dataset;
    if (d.ucarea != null) { S.ucFilter = ev.target.value; render(); }
    if (d.tooldomain != null) { S.toolDomain = ev.target.value; render(); }
    if (d.days != null) { S.tgoFilters.days = ev.target.value; render(); }
    if (d.extagent != null) { const u = new URLSearchParams(location.search); u.set("agent", ev.target.value); go(`/ext?${u}`); }
  });
  app.addEventListener("input", (ev) => {
    if (ev.target.dataset.toolq != null) { S.toolQ = ev.target.value; const pos = ev.target.selectionStart; render().then(() => { const el = $("[data-toolq]"); el.focus(); el.setSelectionRange(pos, pos); }); }
  });

  (async () => {
    [S.meta, S.tools, S.plans] = await Promise.all([api("/api/meta"), api("/api/tools"), api("/api/plans")]);
    render();
  })();
})();
