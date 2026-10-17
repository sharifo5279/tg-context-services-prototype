/* Trading Grid Context Services console */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const store = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

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
    plus: '<path d="M12 5v14M5 12h14"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    text: '<path d="M5 6h14M12 6v13M9 19h6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    book: '<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>',
    send: '<path d="m4 12 16-8-6 16-2-7z"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  };
  const ic = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${I[n] ?? ""}</svg>`;

  const S = { meta: null, tools: [], host: store.get("tgcs.host", "copilot-studio"), convs: {}, plans: [], usage: {} };
  const app = $("#app");

  // ---------- data ----------
  async function api(path, opts = {}) {
    const r = await fetch(path, { headers: { "content-type": "application/json" }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
    if (r.status === 401) { location.href = "/login"; throw new Error("auth"); }
    return r.json();
  }
  const host = () => S.meta.hosts.find((h) => h.key === S.host) ?? S.meta.hosts[0];
  const agent = (id) => S.meta.agents.find((a) => a.id === id);
  const uc = (n) => S.meta.useCases.find((u) => u.n === n);
  const conv = (agentId) => (S.convs[agentId] ??= { id: `${agentId}-${S.host}-${Math.random().toString(36).slice(2, 8)}`, items: [], busy: false, usage: {} });

  // ---------- markdown ----------
  function inline(s) {
    return s.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  }
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
        out += `<table><thead><tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`; continue;
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

  // ---------- shell ----------
  const NAV = [
    { g: null, items: [["home", "/", "Home"]] },
    { g: "Solutions", items: [["agent", "/agents", "Agents"], ["list", "/use-cases", "Use cases"]] },
    { g: "Manage", items: [["check", "/approvals", "Approvals"]] },
    { g: "Registries", items: [["wrench", "/tools", "Tools"], ["server", "/mcp", "MCP management"], ["shield", "/security", "Security and controls"]] },
  ];
  function shell(inner) {
    const p = location.pathname;
    const pending = S.plans.filter((x) => x.status === "PENDING_APPROVAL").length;
    const nav = NAV.map((sec) => `${sec.g ? `<div class="group">${sec.g}</div>` : ""}${sec.items.map(([icn, href, label]) => {
      const active = href === "/" ? p === "/" : p.startsWith(href) || (href === "/approvals" && p.startsWith("/approve"));
      const count = href === "/agents" ? S.meta.agents.length : href === "/use-cases" ? S.meta.useCases.length : href === "/tools" ? S.meta.toolCount : href === "/approvals" && pending ? pending : "";
      return `<button class="navlink ${active ? "active" : ""}" data-href="${href}">${ic(icn)}<span>${label}</span><span class="count">${count}</span></button>`;
    }).join("")}`).join("");
    return `
    <header class="topbar">
      <div class="brand"><img src="/assets/opentext-logo.svg" alt="OpenText"><span class="divider"></span><span class="name">Trading Grid Context Services</span><span class="tag">Prototype</span></div>
      <div class="spacer"></div>
      <div class="platform"><label for="hostSel">Agent platform</label>
        <select id="hostSel" class="select">${S.meta.hosts.map((h) => `<option value="${h.key}" ${h.key === S.host ? "selected" : ""}>${esc(h.name)}</option>`).join("")}</select></div>
      <div class="avatar" title="${esc(S.meta.persona.name)}, ${esc(S.meta.persona.title)}">JL</div>
    </header>
    <div class="layout">
      <nav class="sidenav">${nav}<div class="foot">Seeded data. Not connected to production Trading Grid.</div></nav>
      <main class="main">${inner}</main>
    </div>`;
  }

  // ---------- pages ----------
  function pageHome() {
    const h = host();
    return `<div class="pagehead"><div class="titlerow"><h1>Trading Grid Context Services</h1></div>
      <p class="sub">Trading Grid context exposed as governed MCP tools for customer agents in SAP Joule, Microsoft Copilot Studio, Google Gemini Enterprise and Claude.</p></div>
      <div class="content">
        <div class="kpis">
          <div class="kpi"><div class="v">${S.meta.toolCount}</div><div class="k">MCP tools across 6 Trading Grid products</div></div>
          <div class="kpi"><div class="v">${S.meta.agents.length}</div><div class="k">Candidate agents</div></div>
          <div class="kpi"><div class="v">${S.meta.useCases.length}</div><div class="k">Retail use cases</div></div>
          <div class="kpi"><div class="v">${S.meta.hosts.length}</div><div class="k">Agent platforms</div></div>
        </div>
        <div class="section-title">How a request flows</div>
        <div class="flow">
          <div class="box"><h4>Customer agent platform</h4><strong>${esc(h.name)}</strong><div class="small muted">${esc(h.authPattern)}</div><div class="small" style="margin-top:6px">Principal: <span class="mono">${esc(h.principal)}</span></div></div>
          <div class="arrow">&rarr;</div>
          <div class="box emph"><h4>Trading Grid Context Services</h4><ul class="small"><li>Authenticate and resolve grant</li><li>Evaluate org, BUID, solution and operation</li><li>Invoke scoped source operation</li><li>Return evidence envelope and audit</li></ul></div>
          <div class="arrow">&rarr;</div>
          <div class="box"><h4>Trading Grid sources</h4><ul class="small"><li>Community Management (CMS v2 to v5)</li><li>TG Insights transactions and acknowledgments</li><li>Cartographer maps and cross-references</li><li>Community Projects and Provisioning</li><li>Data Explorer over Trading Grid Data Platform</li></ul></div>
        </div>
        <div class="section-title">Agents</div>
        <div class="agentgrid">${S.meta.agents.map(agentCard).join("")}</div>
        <div class="section-title">Grant in effect</div>
        <table class="t"><tbody>
          <tr><td class="muted">Organization and BUID</td><td>${esc(S.meta.grant.organization)} / ${esc(S.meta.grant.buids.join(", "))}</td></tr>
          <tr><td class="muted">Solutions</td><td class="mono">${esc(S.meta.grant.solutions.join(", "))}</td></tr>
          <tr><td class="muted">Approval required for</td><td class="mono">${esc(S.meta.grant.approvalRequiredFor.join(", "))}</td></tr>
          <tr><td class="muted">Granted by</td><td>${esc(S.meta.grant.grantedBy)} on ${esc(S.meta.grant.grantedAt.slice(0, 10))}; expires ${esc(S.meta.grant.expiresAt.slice(0, 10))}</td></tr>
        </tbody></table>
        ${S.meta.apiKeyConfigured ? "" : `<div class="alert bad" style="margin-top:16px">Agent runtime unavailable: ANTHROPIC_API_KEY is not set on the server. Tools and MCP remain available.</div>`}
      </div>`;
  }

  function agentCard(a) {
    const n = a.tools === "ALL" ? S.meta.toolCount : a.tools.length;
    return `<div class="agentcard" data-href="/agents/${a.id}">
      <div class="h"><div class="aico">${ic("agent")}</div><div><div class="nm">${esc(a.name)}</div><div class="small muted">${esc(a.persona)}</div></div></div>
      <div class="role">${esc(a.role)}</div>
      <div class="meta"><span>${n} tools</span><span>Inspired by ${esc(a.inspiredBy[0].name)}</span></div>
    </div>`;
  }

  function pageAgents() {
    return `<div class="pagehead"><div class="titlerow"><h1>Agents</h1></div><p class="sub">Candidate customer agents built on Trading Grid Context Services tools. Each lists the Aviator agent or Innovation Guide scenario it is based on.</p></div>
      <div class="content"><div class="agentgrid">${S.meta.agents.map(agentCard).join("")}</div></div>`;
  }

  function resources(a, c) {
    const h = host();
    const tools = a.tools === "ALL" ? S.tools.map((t) => t.name) : a.tools;
    const used = c?.usage ?? {};
    const live = c?.live;
    return `<div class="res"><h3>Resources</h3>
      <div class="sect"><div class="shead">Agent platform</div>
        <div class="rescard"><div class="ico">${ic("bolt")}</div><div><div class="t">${esc(h.name)}</div><div class="d">${esc(h.authPattern)}</div><div class="d mono">${esc(h.principal)}</div></div></div></div>
      <div class="sect"><div class="shead">Input <span class="num">${a.inputs.length}</span></div><div class="chipset">${a.inputs.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></div>
      <div class="sect"><div class="shead">Knowledge <span class="num">${a.knowledge.length}</span></div><div class="chipset">${a.knowledge.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></div>
      <div class="sect"><div class="shead">Tools <span class="num">${tools.length}</span></div>
        <div class="rescard"><div class="ico">${ic("server")}</div><div><div class="t">Trading Grid Context Services</div><div class="d">${tools.length} tools: partner configuration, exchange evidence, maps, requests and data products</div></div><span class="kind">MCP</span></div>
        <ul class="toollist">${tools.map((t) => `<li class="${live === t ? "live" : used[t] ? "used" : ""}"><span class="pip"></span>${esc(t)}${used[t] ? `<span class="n">${used[t]}</span>` : ""}</li>`).join("")}</ul></div>
      <div class="sect"><div class="shead">Output <span class="num">${a.outputs.length}</span></div>${a.outputs.map((o) => `<div class="outrow">${ic(o.type === "Table" ? "table" : "text")}<div><div class="t">${esc(o.name)}</div><div class="d">${esc(o.type)}</div></div></div>`).join("")}</div>
    </div>`;
  }

  function pageAgent(id, tab) {
    const a = agent(id);
    if (!a) return `<div class="content"><div class="empty">Agent not found.</div></div>`;
    const c = conv(id);
    const def = `
      <div class="rolebox">${esc(a.role)}</div>
      <div class="label"><span>Task instructions</span><span class="small muted">Scenario: ${esc(a.scenario)}</span></div>
      ${a.instructions.map((ins, i) => `<details class="acc" ${i === 0 ? "open" : ""}><summary><span class="grip">⠿</span>${esc(ins.title)}<span class="chev">›</span></summary><div class="body">${esc(ins.body).replace(/^## (.*)$/gm, "<h4>## $1</h4>")}</div></details>`).join("")}
      <div class="label"><span>Based on</span></div>
      <table class="t"><tbody>${a.inspiredBy.map((x) => `<tr><td><strong>${esc(x.name)}</strong></td><td class="muted">${esc(x.where)}</td></tr>`).join("")}</tbody></table>
      <div class="label"><span>Suggested runs</span></div>
      <div class="starters">${a.starters.map((n) => `<button class="starter" data-run="${n}"><span class="ucn">UC${n}</span><span>${esc(uc(n).prompt)}</span></button>`).join("")}</div>`;
    return `<div class="pagehead"><div class="crumbs"><a data-href="/agents">Agents</a> / ${esc(a.name)}</div>
      <div class="titlerow"><h1>${esc(a.name)}</h1><span class="badge"><span class="dot"></span>Prototype</span>
        <div class="actions"><button class="btn" data-href="/mcp">${ic("link")}Connect via MCP</button><button class="btn" data-newconv="${a.id}">${ic("refresh")}New conversation</button><button class="btn primary" data-href="/agents/${a.id}/run">${ic("play")}Run agent</button></div></div>
      <div class="tabs"><button class="tab ${tab !== "run" ? "active" : ""}" data-href="/agents/${a.id}">${ic("doc")}Agent definition</button><button class="tab ${tab === "run" ? "active" : ""}" data-href="/agents/${a.id}/run">${ic("play")}Run</button></div></div>
      <div class="grid2"><div class="leftcol" id="leftcol">${tab === "run" ? runView(a, c) : def}</div><div class="rightcol" id="rightcol">${resources(a, c)}</div></div>`;
  }

  function runView(a, c) {
    const items = c.items.map(renderItem).join("");
    const starters = !c.items.length ? `<div class="label" style="margin-top:0"><span>Start with a use case</span><span class="small muted">Platform: ${esc(host().shortName)}</span></div><div class="starters">${a.starters.map((n) => `<button class="starter" data-run="${n}"><span class="ucn">UC${n}</span><span>${esc(uc(n).prompt)}</span></button>`).join("")}</div>` : "";
    return `<div class="chat" id="chat">${starters}${items}</div>
      <div style="height:14px"></div>
      <form class="composer" id="composer"><textarea id="prompt" rows="1" placeholder="Ask ${esc(a.name)}" ${c.busy ? "disabled" : ""}></textarea><button class="btn primary" ${c.busy ? "disabled" : ""}>${ic("send")}Send</button></form>`;
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
  function renderStep(s, idx, mi) {
    const prod = (s.product ?? "").replace("Trading Grid ", "");
    return `<div class="step"><div class="summary" data-step="${mi}:${idx}" style="cursor:pointer;display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 0">
        ${stepIcon(s)}<div class="sn"><b>${esc(s.name)}</b><span class="p">${esc(prod)}${s.summary ? ` · ${esc(s.summary)}` : ""}</span></div>
        <div class="sr">${s.done && s.completeness && s.completeness !== "COMPLETE" ? `<span class="pill warn">${esc(s.completeness)}</span>` : ""}${statusPill(s)}${s.done ? `<span>${s.ms} ms</span>` : ""}</div></div>
      ${s.open ? `<div class="detail">
        <div class="kv"><span class="k">Source binding</span><span class="mono">${esc(s.binding ?? "")}</span><span class="k">Contract basis</span><span>${esc(s.basis ?? "")}</span>${s.envelope?.access ? `<span class="k">Access</span><span>${esc(s.envelope.access.decision)} · ${esc(s.envelope.access.operation)} · ${esc(s.envelope.access.executionPrincipal)} · ${esc(s.envelope.access.organization)}/${esc(s.envelope.access.buid)}</span>` : ""}</div>
        <div class="small muted">Input</div><pre class="json">${esc(JSON.stringify(s.input, null, 2))}</pre>
        ${s.envelope ? `<div class="small muted">Response envelope</div><pre class="json">${esc(JSON.stringify(s.envelope, null, 2))}</pre>` : ""}
      </div>` : ""}</div>`;
  }
  function renderPlan(p, mi) {
    const st = S.plans.find((x) => x.planId === p.planId)?.status ?? p.planStatus;
    const checks = (p.validation?.checks ?? []).map((c) => `<tr><td>${esc(c.check)}</td><td><span class="pill ${c.result === "PASS" ? "ok" : c.result === "WARNING" ? "warn" : "bad"}">${esc(c.result)}</span></td><td class="small muted">${esc(c.detail ?? "")}</td></tr>`).join("");
    return `<div class="approval"><div class="ah">${ic("check")}Approval required<span class="pill ${st === "PENDING_APPROVAL" ? "info" : st === "APPROVED" || st === "EXECUTED" ? "ok" : "bad"}" style="margin-left:auto">${esc(st.replace("_", " "))}</span></div>
      <div class="kv"><span class="k">Plan</span><span class="mono">${esc(p.planId)}</span><span class="k">Action</span><span>${esc(p.summary)}</span><span class="k">Target</span><span class="mono">${esc(p.target)}</span><span class="k">Submit with</span><span class="mono">${esc(p.submitWith?.tool)}</span><span class="k">Expires</span><span>${esc(new Date(p.expiresAt).toLocaleTimeString())}</span></div>
      ${checks ? `<table class="t" style="margin-top:8px"><tbody>${checks}</tbody></table>` : ""}
      <details style="margin-top:8px"><summary class="small muted" style="cursor:pointer">Parameters bound to this approval</summary><pre class="json">${esc(JSON.stringify(p.parameters, null, 2))}</pre></details>
      ${st === "PENDING_APPROVAL" ? `<div class="acts"><button class="btn primary" data-approve="${p.planId}" data-mi="${mi}">${ic("check")}Approve and submit</button><button class="btn danger" data-reject="${p.planId}">Reject</button></div>` : ""}
    </div>`;
  }
  function renderItem(m, mi) {
    if (m.role === "user") return `<div class="msg user">${esc(m.text)}</div>`;
    const a = agent(m.agentId);
    return `<div class="msg agent"><div class="mh"><div class="aico" style="width:26px;height:26px">${ic("agent")}</div>${esc(a?.name ?? "Agent")}<span class="meta">${esc(m.hostName)} · ${m.steps.length} tool call${m.steps.length === 1 ? "" : "s"}${m.elapsed ? ` · ${(m.elapsed / 1000).toFixed(1)} s` : ""}</span></div>
      <div class="steps">${m.steps.map((s, i) => renderStep(s, i, mi)).join("")}</div>
      ${m.thinking ? `<div class="thinking"><span class="dots"><span></span><span></span><span></span></span>${m.steps.length ? "Reviewing evidence" : "Planning tool calls"}</div>` : ""}
      ${m.error ? `<div class="md"><div class="alert bad">${esc(m.error)}</div></div>` : ""}
      <div class="md">${md(m.text)}</div>
      ${m.plans.map((p) => renderPlan(p, mi)).join("")}
    </div>`;
  }

  // ---------- chat runtime ----------
  let raf = 0;
  function refreshChat(agentId) {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const a = agent(agentId); const c = conv(agentId);
      const left = $("#leftcol"), right = $("#rightcol");
      if (!left || !location.pathname.startsWith(`/agents/${agentId}/run`)) return;
      const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 160;
      const draft = $("#prompt")?.value ?? "";
      left.innerHTML = runView(a, c);
      if ($("#prompt")) $("#prompt").value = draft;
      right.innerHTML = resources(a, c);
      if (nearBottom) window.scrollTo(0, document.body.scrollHeight);
    });
  }

  async function send(agentId, text) {
    const c = conv(agentId);
    if (c.busy || !text.trim()) return;
    c.busy = true;
    c.items.push({ role: "user", text });
    const m = { role: "agent", agentId, hostName: host().shortName, steps: [], text: "", plans: [], thinking: true, t0: Date.now() };
    c.items.push(m);
    refreshChat(agentId);
    window.scrollTo(0, document.body.scrollHeight);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: c.id, host: S.host, agentId, message: text }) });
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
          if (e.type === "tool_result") { const s = m.steps.find((x) => x.id === e.id); Object.assign(s, { done: true, status: e.status, ms: e.ms, product: e.product, binding: e.binding, basis: e.basis, completeness: e.completeness, summary: e.summary, envelope: e.envelope }); c.usage[e.name] = (c.usage[e.name] ?? 0) + 1; c.live = null; }
          if (e.type === "approval") { m.plans.push(e.plan); S.plans.unshift({ planId: e.plan.planId, status: "PENDING_APPROVAL" }); }
          if (e.type === "error") { m.error = e.message; m.thinking = false; }
          if (e.type === "done") m.thinking = false;
          refreshChat(agentId);
        }
      }
    } catch (err) { m.error = `Connection interrupted: ${err.message}`; }
    m.thinking = false; m.elapsed = Date.now() - m.t0; c.busy = false; c.live = null;
    refreshChat(agentId);
    loadPlans();
  }

  async function decide(planId, approve, agentId) {
    const p = await api(`/api/plans/${planId}/decision`, { method: "POST", body: { approve } });
    const i = S.plans.findIndex((x) => x.planId === planId);
    if (i >= 0) S.plans[i] = p; else S.plans.unshift(p);
    if (agentId) refreshChat(agentId); else render();
    if (approve && agentId && p.status === "APPROVED") send(agentId, `Plan ${planId} is approved. Submit it.`);
  }

  async function loadPlans() { S.plans = await api("/api/plans"); }

  // ---------- other pages ----------
  function pageUseCases() {
    const areas = [...new Set(S.meta.useCases.map((u) => u.area))];
    const f = S.ucFilter ?? "";
    const rows = S.meta.useCases.filter((u) => !f || u.area === f);
    return `<div class="pagehead"><div class="titlerow"><h1>Use cases</h1></div><p class="sub">Forty retail B2B scenarios, each mapped to the agent that runs it.</p></div>
      <div class="content"><div class="filters"><select class="select" id="ucArea"><option value="">All areas</option>${areas.map((a) => `<option ${a === f ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></div>
      <div style="overflow:auto"><table class="t"><thead><tr><th>#</th><th>Use case</th><th>Prompt</th><th>Area</th><th>Agent</th><th></th></tr></thead><tbody>
      ${rows.map((u) => `<tr><td class="mono">UC${u.n}</td><td><strong>${esc(u.title)}</strong></td><td class="small">${esc(u.prompt)}</td><td class="small">${esc(u.area)}</td><td class="small">${esc(agent(u.agent).name)}</td><td><button class="btn sm" data-run="${u.n}" data-agent="${u.agent}">${ic("play")}Run</button></td></tr>`).join("")}
      </tbody></table></div></div>`;
  }

  function planRow(p) {
    const cls = p.status === "PENDING_APPROVAL" ? "info" : p.status === "APPROVED" || p.status === "EXECUTED" ? "ok" : "bad";
    return `<tr><td class="mono">${esc(p.planId)}</td><td>${esc(p.summary)}</td><td class="mono small">${esc(p.submitTool)}</td><td class="small">${esc(S.meta.hosts.find((h) => h.key === p.host)?.shortName ?? p.host)}</td><td><span class="pill ${cls}">${esc(p.status.replace("_", " "))}</span></td><td class="small muted">${esc(new Date(p.createdAt).toLocaleString())}</td>
      <td>${p.status === "PENDING_APPROVAL" ? `<button class="btn sm primary" data-approve="${p.planId}">Approve</button> <button class="btn sm danger" data-reject="${p.planId}">Reject</button>` : ""}</td></tr>`;
  }
  function pageApprovals() {
    return `<div class="pagehead"><div class="titlerow"><h1>Approvals</h1><div class="actions"><button class="btn ghost" data-reload>${ic("refresh")}Refresh</button></div></div><p class="sub">Prepared changes awaiting an authorized user. Approval binds to the exact target and parameters and expires after 30 minutes.</p></div>
      <div class="content">${S.plans.length ? `<table class="t"><thead><tr><th>Plan</th><th>Action</th><th>Submit tool</th><th>Platform</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>${S.plans.map(planRow).join("")}</tbody></table>` : `<div class="empty">No plans prepared yet. Run UC17, UC18 or UC19 to prepare a change.</div>`}</div>`;
  }
  async function pageApprove(id) {
    const p = await api(`/api/plans/${id}`);
    if (p.error) return `<div class="content"><div class="empty">Plan ${esc(id)} not found.</div></div>`;
    return `<div class="pagehead"><div class="crumbs"><a data-href="/approvals">Approvals</a> / ${esc(id)}</div><div class="titlerow"><h1>Review plan</h1></div><p class="sub">Prepared by ${esc(p.principal)} in ${esc(S.meta.hosts.find((h) => h.key === p.host)?.name)}. The agent submits after approval.</p></div>
      <div class="content">${renderPlan({ ...p, planStatus: p.status, submitWith: { tool: p.submitTool } }, -1)}</div>`;
  }

  function pageTools() {
    const q = (S.toolQ ?? "").toLowerCase(), d = S.toolDomain ?? "";
    const domains = [...new Set(S.tools.map((t) => t.domain))];
    const rows = S.tools.filter((t) => (!d || t.domain === d) && (!q || `${t.name} ${t.description} ${t.binding}`.toLowerCase().includes(q)));
    return `<div class="pagehead"><div class="titlerow"><h1>Tools</h1></div><p class="sub">${S.tools.length} candidate MCP tools from the incubation brief. Select a tool to test it as the current agent platform.</p></div>
      <div class="content"><div class="filters"><input class="input" id="toolQ" placeholder="Search tools or source paths" value="${esc(S.toolQ ?? "")}"><select class="select" id="toolDomain"><option value="">All domains</option>${domains.map((x) => `<option ${x === d ? "selected" : ""}>${esc(x)}</option>`).join("")}</select><span class="small muted" style="align-self:center">${rows.length} shown</span></div>
      <div style="overflow:auto"><table class="t"><thead><tr><th>Tool</th><th>Domain</th><th>Product</th><th>Action</th><th>Source binding</th></tr></thead><tbody>
      ${rows.map((t) => `<tr class="click" data-tool="${t.name}"><td><span class="mono"><strong>${esc(t.name)}</strong></span><div class="small muted">${esc(t.title)}</div></td><td class="small">${esc(t.domain)}</td><td class="small">${esc(t.product.replace("Trading Grid ", ""))}</td><td><span class="pill ${t.kind === "write" ? "warn" : t.kind === "prepare" ? "info" : "neutral"}">${esc(t.kind)}</span></td><td class="mono small" style="max-width:360px;word-break:break-word">${esc(t.binding)}</td></tr>`).join("")}
      </tbody></table></div></div>`;
  }

  function sampleArgs(t) {
    const ex = { partner: "Brightwell Home Goods", company: "Brightwell Home Goods", key_value: "SH-77155", transaction_id: "", trading_address: "ZZ:BRIGHTWELLHG", map: "BWHG_856_4010_IN", entity: "STORE_TO_GLN", key: "0388", product_id: "tgdp.transaction_activity", mailbox_id: "MB-HRG-PROD-01", bpr_id: "BPR-4104", tpr_id: "TPR-70041", solution_id: "SOL-HRG-RETAIL-01", poc_id: "POC-BWHG-01", legal_entity_id: "LE-HRG-US-01", invitation_id: 7702, request_id: 55120, pi_unique_id: 900304, workflow_template_id: 3101, status_id: "ST-10421", work_order_id: "WO-5521", tracking_id: "TRK-PGH-0091", operation_ref: "ST-10421", name: "search_transactions", file_id: "SPEC-1001-A", search_token: "Store", schedule_id: "SCH-0007", template_name: "HRG_SUPPLIER_STD", po_number: "4500018832" };
    const o = {};
    for (const r of t.inputSchema.required ?? []) o[r] = ex[r] ?? "";
    if (!Object.keys(o).length) { if (t.inputSchema.properties?.partner) o.partner = ex.partner; if (t.name === "search_transactions") { o.key_value = "SH-77155"; delete o.partner; } }
    return JSON.stringify(o, null, 2);
  }
  function toolDrawer(name) {
    const t = S.tools.find((x) => x.name === name);
    const el = document.createElement("div");
    el.innerHTML = `<div class="drawer-bg" data-close></div><div class="drawer"><div class="dh"><div><div class="mono"><strong>${esc(t.name)}</strong></div><div class="small muted">${esc(t.domain)} · ${esc(t.product)}</div></div><button class="btn ghost sm" style="margin-left:auto" data-close>Close</button></div>
      <div class="db"><p>${esc(t.description)}</p>
      <div class="kv"><span class="k">Source binding</span><span class="mono">${esc(t.binding)}</span><span class="k">Contract basis</span><span>${esc(t.basis)}</span><span class="k">Operation</span><span class="mono">${esc(t.operation)}</span><span class="k">Action class</span><span>${esc(t.kind)}</span><span class="k">Executes as</span><span>${esc(host().name)} · <span class="mono">${esc(host().principal)}</span></span></div>
      <div class="label"><span>Arguments (JSON)</span></div><textarea id="tryArgs">${esc(sampleArgs(t))}</textarea>
      <div style="margin:10px 0"><button class="btn primary" id="tryRun">${ic("play")}Invoke tool</button></div>
      <div id="tryOut"></div>
      <details style="margin-top:12px"><summary class="small muted" style="cursor:pointer">Input schema</summary><pre class="json">${esc(JSON.stringify(t.inputSchema, null, 2))}</pre></details></div></div>`;
    document.body.appendChild(el);
    el.addEventListener("click", async (ev) => {
      if (ev.target.closest("[data-close]")) el.remove();
      if (ev.target.closest("#tryRun")) {
        let args; try { args = JSON.parse($("#tryArgs", el).value || "{}"); } catch { $("#tryOut", el).innerHTML = `<div class="alert bad">Arguments are not valid JSON.</div>`; return; }
        $("#tryOut", el).innerHTML = `<div class="thinking"><span class="dots"><span></span><span></span><span></span></span>Invoking</div>`;
        const r = await api(`/api/tools/${t.name}/invoke`, { method: "POST", body: { host: S.host, args } });
        const st = r.envelope.status;
        $("#tryOut", el).innerHTML = `<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">${statusPill({ done: true, status: st, envelope: r.envelope })}${r.envelope.evidence ? `<span class="pill ${r.envelope.evidence.completeness === "COMPLETE" ? "ok" : "warn"}">${esc(r.envelope.evidence.completeness)}</span>` : ""}<span class="small muted">${r.ms} ms</span></div><pre class="json">${esc(JSON.stringify(r.envelope, null, 2))}</pre>`;
      }
    });
  }

  function pageMcp() {
    const m = S.meta.mcp;
    return `<div class="pagehead"><div class="titlerow"><h1>MCP management</h1></div><p class="sub">Remote MCP endpoint (Streamable HTTP, stateless). Each agent platform authenticates with its own token, which selects its execution principal and grant.</p></div>
      <div class="content">
        <table class="t"><tbody><tr><td class="muted" style="width:200px">Endpoint</td><td class="mono">${esc(m.url)}</td><td><button class="btn sm ghost copy" data-copy="${esc(m.url)}">Copy</button></td></tr>
        <tr><td class="muted">Transport</td><td colspan="2">Streamable HTTP, JSON responses, POST only</td></tr>
        <tr><td class="muted">Authentication</td><td colspan="2"><span class="mono">Authorization: Bearer &lt;token&gt;</span>, or the token in the connector URL path for clients without custom headers</td></tr>
        <tr><td class="muted">Server capabilities</td><td colspan="2">Tools (filtered to the caller's grant) and prompts (one per agent)</td></tr></tbody></table>
        <div class="section-title">Platform credentials</div>
        <table class="t"><thead><tr><th>Platform</th><th>Principal</th><th>Bearer token</th><th>Connector URL</th></tr></thead><tbody>
        ${S.meta.hosts.map((h) => { const k = m.tokens[h.key]; return `<tr><td><strong>${esc(h.name)}</strong><div class="small muted">${esc(h.authPattern)}</div></td><td class="mono small">${esc(h.principal)}<div class="muted">${esc(h.principalType.replace("_", " ").toLowerCase())}</div></td>
          <td><button class="btn sm ghost copy" data-copy="${esc(k.token)}">Copy token</button></td><td><button class="btn sm ghost copy" data-copy="${esc(k.pathUrl)}">Copy URL</button></td></tr>`; }).join("")}
        </tbody></table>
        <div class="section-title">Test from a terminal</div>
        <pre class="json">curl -s ${esc(m.url)} \\
  -H "Authorization: Bearer ${esc(m.tokens["claude-connector"].token)}" \\
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_transaction","arguments":{"key_value":"SH-77155"}}}'</pre>
        <p class="small muted">Prototype credentials. Production would use OAuth with PKCE, registered callbacks and audience-bound tokens per the incubation brief.</p>
      </div>`;
  }

  function pageSecurity(auditRows) {
    const ops = [...new Set(S.meta.hosts.flatMap((h) => h.operations).concat(["billing.read"]))];
    return `<div class="pagehead"><div class="titlerow"><h1>Security and controls</h1><div class="actions"><button class="btn ghost" data-reload>${ic("refresh")}Refresh</button></div></div><p class="sub">Effective access is the intersection of identity, active grant, organization, BUID, solution, operation scope and approval. Explicit denial wins.</p></div>
      <div class="content">
        <div class="section-title" style="margin-top:0">Operation grants by platform</div>
        <div style="overflow:auto"><table class="t"><thead><tr><th>Operation</th>${S.meta.hosts.map((h) => `<th>${esc(h.shortName)}</th>`).join("")}</tr></thead><tbody>
        ${ops.map((o) => `<tr><td class="mono small">${esc(o)}${S.meta.grant.approvalRequiredFor.includes(o) ? ' <span class="pill info">Approval</span>' : ""}</td>${S.meta.hosts.map((h) => `<td>${h.operations.includes(o) ? '<span class="pill ok">Granted</span>' : '<span class="pill bad">Not granted</span>'}</td>`).join("")}</tr>`).join("")}
        </tbody></table></div>
        <div class="section-title">Audit log</div>
        ${auditRows.length ? `<div style="overflow:auto"><table class="t"><thead><tr><th>Time</th><th>Platform</th><th>Principal</th><th>Channel</th><th>Tool</th><th>Decision</th><th>Result</th><th>ms</th></tr></thead><tbody>
        ${auditRows.map((a) => `<tr><td class="small">${esc(new Date(a.at).toLocaleTimeString())}</td><td class="small">${esc(S.meta.hosts.find((h) => h.key === a.host)?.shortName)}</td><td class="mono small">${esc(a.principal)}</td><td class="small">${esc(a.channel)}</td><td class="mono small">${esc(a.tool)}</td><td><span class="pill ${a.decision === "PERMIT" ? "ok" : "bad"}">${esc(a.decision)}</span></td><td class="small">${esc(a.status)}</td><td class="small">${a.ms}</td></tr>`).join("")}
        </tbody></table></div>` : `<div class="empty">No tool calls recorded since the server started.</div>`}
      </div>`;
  }

  // ---------- router ----------
  async function render() {
    const p = location.pathname;
    let inner;
    if (p === "/") inner = pageHome();
    else if (p === "/agents") inner = pageAgents();
    else if (p.startsWith("/agents/")) { const [, , id, tab] = p.split("/"); inner = pageAgent(id, tab); }
    else if (p === "/use-cases") inner = pageUseCases();
    else if (p === "/approvals") { await loadPlans(); inner = pageApprovals(); }
    else if (p.startsWith("/approve/")) { await loadPlans(); inner = await pageApprove(p.split("/")[2]); }
    else if (p === "/tools") inner = pageTools();
    else if (p === "/mcp") inner = pageMcp();
    else if (p === "/security") inner = pageSecurity(await api("/api/audit"));
    else inner = `<div class="content"><div class="empty">Page not found.</div></div>`;
    app.innerHTML = shell(inner);
    if (p.endsWith("/run")) $("#prompt")?.focus();
  }
  const go = (href) => { history.pushState({}, "", href); window.scrollTo(0, 0); render(); };
  window.addEventListener("popstate", render);

  app.addEventListener("click", async (ev) => {
    const t = ev.target.closest("[data-href],[data-run],[data-step],[data-approve],[data-reject],[data-newconv],[data-tool],[data-copy],[data-reload]");
    if (!t) return;
    if (t.dataset.copy) { navigator.clipboard?.writeText(t.dataset.copy); const o = t.textContent; t.textContent = "Copied"; setTimeout(() => (t.textContent = o), 1200); return; }
    if (t.dataset.reload != null) return render();
    if (t.dataset.tool) return toolDrawer(t.dataset.tool);
    if (t.dataset.newconv) { delete S.convs[t.dataset.newconv]; return go(`/agents/${t.dataset.newconv}/run`); }
    if (t.dataset.step) { const [mi, si] = t.dataset.step.split(":").map(Number); const agentId = location.pathname.split("/")[2]; const s = conv(agentId).items[mi].steps[si]; s.open = !s.open; return refreshChat(agentId); }
    if (t.dataset.approve) { const agentId = location.pathname.startsWith("/agents/") ? location.pathname.split("/")[2] : null; t.disabled = true; await decide(t.dataset.approve, true, agentId); if (!agentId) render(); return; }
    if (t.dataset.reject) { const agentId = location.pathname.startsWith("/agents/") ? location.pathname.split("/")[2] : null; await decide(t.dataset.reject, false, agentId); if (!agentId) render(); return; }
    if (t.dataset.run) {
      const n = Number(t.dataset.run); const u = uc(n);
      const agentId = t.dataset.agent ?? (location.pathname.startsWith("/agents/") ? location.pathname.split("/")[2] : u.agent);
      if (!location.pathname.startsWith(`/agents/${agentId}/run`)) go(`/agents/${agentId}/run`);
      return send(agentId, u.prompt);
    }
    if (t.dataset.href) return go(t.dataset.href);
  });
  app.addEventListener("submit", (ev) => {
    if (ev.target.id !== "composer") return;
    ev.preventDefault();
    const agentId = location.pathname.split("/")[2];
    const v = $("#prompt").value; $("#prompt").value = "";
    send(agentId, v);
  });
  app.addEventListener("keydown", (ev) => {
    if (ev.target.id === "prompt" && ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); $("#composer").requestSubmit(); }
  });
  app.addEventListener("change", (ev) => {
    if (ev.target.id === "hostSel") { S.host = ev.target.value; store.set("tgcs.host", S.host); S.convs = {}; render(); }
    if (ev.target.id === "ucArea") { S.ucFilter = ev.target.value; render(); }
    if (ev.target.id === "toolDomain") { S.toolDomain = ev.target.value; render(); }
  });
  app.addEventListener("input", (ev) => {
    if (ev.target.id === "toolQ") { S.toolQ = ev.target.value; const pos = ev.target.selectionStart; render().then(() => { const el = $("#toolQ"); el.focus(); el.setSelectionRange(pos, pos); }); }
  });

  (async () => {
    [S.meta, S.tools] = await Promise.all([api("/api/meta"), api("/api/tools")]);
    if (!S.meta.hosts.some((h) => h.key === S.host)) S.host = S.meta.hosts[0].key;
    await loadPlans();
    render();
  })();
})();
