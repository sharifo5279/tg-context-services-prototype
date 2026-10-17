/* Backlog footer: epics and features for prioritization */
(() => {
  const root = document.getElementById("backlog");
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const ST = { Done: "ok", "In progress": "info", Ready: "warn", Proposed: "neutral" };
  const RC = { Shipped: "ok", Roadmap: "info", Incubating: "warn", Proposed: "neutral", "Demo construct": "neutral", "Guide scenario": "info" };
  const B = { tab: "backlog", data: null, open: new URLSearchParams(location.search).get("backlog") === "1", epic: "", status: "", q: "", expanded: {} };

  function counts(items) {
    const c = { total: items.length, Done: 0, "In progress": 0, Ready: 0, Proposed: 0 };
    items.forEach((i) => (c[i.status] = (c[i.status] ?? 0) + 1));
    return c;
  }
  function render() {
    if (!B.data) return;
    const all = B.data.epics.flatMap((e) => e.items.map((i) => ({ ...i, epic: e.key })));
    const c = counts(all);
    const bar = `<div class="bl-bar"><button class="bl-toggle" data-bl="toggle"><strong>Backlog</strong><span>${c.total} items</span><span><span class="pill ok">${c.Done} done</span></span><span><span class="pill info">${c["In progress"]} in progress</span></span><span><span class="pill warn">${c.Ready} ready</span></span><span><span class="pill neutral">${c.Proposed} proposed</span></span><span class="bl-upd">Updated ${esc(B.data.updated)}</span><span class="bl-chev">${B.open ? "Close" : "Open"}</span></button></div>`;
    if (!B.open) { root.innerHTML = bar; return; }
    const q = B.q.toLowerCase();
    const epics = B.data.epics.filter((e) => !B.epic || e.key === B.epic).map((e) => ({ ...e, items: e.items.filter((i) => (!B.status || i.status === B.status) && (!q || `${i.key} ${i.title} ${i.desc} ${i.source}`.toLowerCase().includes(q))) })).filter((e) => e.items.length);
    const sheet = `<div class="bl-sheet"><div class="bl-head"><h2>Backlog</h2><div class="bl-tabs"><button class="${B.tab === "backlog" ? "active" : ""}" data-bl="tab" data-tab="backlog">Items</button><button class="${B.tab === "plan" ? "active" : ""}" data-bl="tab" data-tab="plan">Plan of attack</button><button class="${B.tab === "legend" ? "active" : ""}" data-bl="tab" data-tab="legend">Reality legend</button></div><span class="small muted">Priority is set by Omar. Unset items wait for prioritization.</span>
        <div class="bl-filters"><input class="input" data-bl="q" placeholder="Search key, title or source" value="${esc(B.q)}"><select class="select" data-bl="epic"><option value="">All epics</option>${B.data.epics.map((e) => `<option value="${e.key}" ${B.epic === e.key ? "selected" : ""}>${esc(e.key)} ${esc(e.title)}</option>`).join("")}</select><select class="select" data-bl="status"><option value="">All statuses</option>${Object.keys(ST).map((s) => `<option ${B.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div></div>
      <div class="bl-body">${B.tab === "plan" ? planView(all) : B.tab === "legend" ? legendView() : epics.map((e) => { const ec = counts(B.data.epics.find((x) => x.key === e.key).items); return `<section class="bl-epic"><div class="bl-eh"><span class="mono">${esc(e.key)}</span><strong>${esc(e.title)}</strong><span class="small muted">${esc(e.goal)}</span><span class="bl-ec">${ec.Done}/${ec.total} done</span></div>${e.note ? `<div class="bl-note">${esc(e.note)}</div>` : ""}
        <table class="t bl-t"><thead><tr><th>Key</th><th>Feature</th><th>Status</th><th>Reality</th><th>Priority</th><th>Size</th><th>Source</th></tr></thead><tbody>
        ${e.items.map((i) => `<tr class="click" data-bl-row="${i.key}"><td class="mono">${esc(i.key)}</td><td><strong>${esc(i.title)}</strong>${B.expanded[i.key] ? `<div class="bl-desc">${esc(i.desc)}<div><span class="muted">Acceptance:</span> ${esc(i.accept)}</div>${i.note ? `<div><span class="muted">Progress:</span> ${esc(i.note)}</div>` : ""}</div>` : ""}</td><td><span class="pill ${ST[i.status]}">${esc(i.status)}</span></td><td><span class="pill ${RC[i.reality] ?? "neutral"}">${esc(i.reality)}</span></td><td>${esc(i.priority ?? "Unset")}</td><td>${esc(i.size)}</td><td class="small muted">${esc(i.source)}</td></tr>`).join("")}
        </tbody></table></section>`; }).join("") || `<div class="empty">No items match the filters.</div>`}</div></div>`;
    root.innerHTML = `<div class="bl-bg" data-bl="toggle"></div>${sheet}${bar}`;
  }
  function planView(all) {
    const byKey = Object.fromEntries(all.map((i) => [i.key, i]));
    return B.data.plan.map((p) => { const items = p.items.map((k) => byKey[k]).filter(Boolean); const done = items.filter((i) => i.status === "Done").length; return `<section class="bl-epic"><div class="bl-eh"><strong>${esc(p.phase)}</strong><span class="small muted">${esc(p.outcome)}</span><span class="bl-ec">${done}/${items.length} done</span></div>
      <table class="t bl-t"><tbody>${items.map((i) => `<tr class="click" data-bl-row="${i.key}"><td class="mono">${esc(i.key)}</td><td><strong>${esc(i.title)}</strong>${B.expanded[i.key] ? `<div class="bl-desc">${esc(i.desc)}</div>` : ""}</td><td><span class="pill ${ST[i.status]}">${esc(i.status)}</span></td><td><span class="pill ${RC[i.reality] ?? "neutral"}">${esc(i.reality)}</span></td><td>${esc(i.size)}</td></tr>`).join("")}</tbody></table></section>`; }).join("");
  }
  function legendView() {
    return `<table class="t bl-t" style="margin-top:12px"><tbody>${Object.entries(B.data.legend.reality).map(([k, v]) => `<tr><td style="width:180px"><span class="pill ${RC[k] ?? "neutral"}">${esc(k)}</span></td><td>${esc(v)}</td></tr>`).join("")}</tbody></table><p class="small muted">Statuses: ${B.data.legend.status.join(", ")}. Sizes: ${esc(B.data.legend.size)}</p>`;
  }
  root.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-bl],[data-bl-row]");
    if (!t) return;
    if (t.dataset.bl === "toggle") { B.open = !B.open; return render(); }
    if (t.dataset.bl === "tab") { B.tab = t.dataset.tab; return render(); }
    if (t.dataset.blRow) { B.expanded[t.dataset.blRow] = !B.expanded[t.dataset.blRow]; return render(); }
  });
  root.addEventListener("change", (ev) => { const k = ev.target.dataset.bl; if (k === "epic" || k === "status") { B[k] = ev.target.value; render(); } });
  root.addEventListener("input", (ev) => { if (ev.target.dataset.bl === "q") { B.q = ev.target.value; const pos = ev.target.selectionStart; render(); const el = root.querySelector('[data-bl="q"]'); el.focus(); el.setSelectionRange(pos, pos); } });
  fetch("/api/backlog").then((r) => (r.ok ? r.json() : null)).then((d) => { B.data = d; render(); });
})();
