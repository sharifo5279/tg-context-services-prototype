/* Trading Grid agent journey prototype: Trading Grid Online, Aviator Studio, Context Services, external ecosystems */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const qs = () => new URLSearchParams(location.search);

  const I = {
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 13.8c2.1.8 3.5 3 3.5 6.2"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    tasks: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    paperclip: '<path d="m21 11-8.6 8.6a5 5 0 0 1-7-7L14 4a3.3 3.3 0 0 1 4.7 4.7L10 17.4a1.7 1.7 0 0 1-2.4-2.4l8-8"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
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
    grid: '<path d="M5 5h2v2H5zM11 5h2v2h-2zM17 5h2v2h-2zM5 11h2v2H5zM11 11h2v2h-2zM17 11h2v2h-2zM5 17h2v2H5zM11 17h2v2h-2zM17 17h2v2h-2z"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    thumbup: '<path d="M7 11v9H4v-9zM7 11l4-7a2 2 0 0 1 3 2l-1 4h5a2 2 0 0 1 2 2l-2 6a2 2 0 0 1-2 2H7"/>',
    thumbdown: '<path d="M17 13V4h3v9zM17 13l-4 7a2 2 0 0 1-3-2l1-4H6a2 2 0 0 1-2-2l2-6a2 2 0 0 1 2-2h9"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    more: '<circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/>',
    chev: '<path d="M7 10l5 5 5-5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    speaker: '<path d="M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6"/>',
    share: '<path d="M12 3v12M8 7l4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    chat: '<path d="M4 12a8 8 0 1 1 3.5 6.6L4 20l1.2-3.6A8 8 0 0 1 4 12z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
    route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    wave: '<path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4"/>',
    side: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
    compose: '<path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M18.5 3.5a2.1 2.1 0 0 1 3 3L13 15l-4 1 1-4z"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
    format: '<path d="M4 19 9 5l5 14M6 14h6"/><path d="M15 19l5-5-2-2-5 5v2z"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m20.5 16-5-5-9 8.5"/>',
    folder: '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    popout: '<path d="M14 4h6v6M20 4l-8 8"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><path d="M16.75 13.5v6.5M13.5 16.75H20"/>',
    book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
    code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    inbox: '<path d="M4 13.5 6.5 5h11l2.5 8.5V19H4z"/><path d="M4 13.5h5a3 3 0 0 0 6 0h5"/>',
    minus: '<path d="M5 12h14"/>',
    drag: '<path d="M7 9h10M7 15h10"/>',
    chats: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 4v-4h0A2.5 2.5 0 0 1 4 13.5z"/>',
    callbell: '<path d="M4 18h16M6 18a6 6 0 0 1 12 0M12 9V7M10 7h4"/>',
    pin: '<path d="M9 4h6l-1 5 3 3H7l3-3zM12 12v8"/>',
    teams: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.2"/><path d="M3.5 19c0-3.2 2.4-5.5 5.5-5.5s5.5 2.3 5.5 5.5zM15 14c2.9-.5 5.5 1.3 5.5 4.5H15"/>',
    notebook: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5v17M12 8h4M12 11.5h4"/>',
    task: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    sparkle: '<path d="M12 3c.5 4.5 2.5 6.5 7 7-4.5.5-6.5 2.5-7 7-.5-4.5-2.5-6.5-7-7 4.5-.5 6.5-2.5 7-7z"/>',
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
  const STATUS_CLS = { "Live today": "ok", "On the roadmap": "info", Incubating: "warn", Custom: "neutral" };
  const statusTag = (a) => `<span class="pill ${STATUS_CLS[a.status] ?? "neutral"}">${esc(a.status)}</span>`;
  const uc = (n) => S.meta.useCases.find((u) => u.n === n);
  const promptOf = (n) => (typeof n === "number" ? uc(n).prompt : n);
  const ucLabel = (n) => (typeof n === "number" ? `UC${n}` : "");
  const EXT = ["copilot-studio", "gemini-enterprise", "sap-joule", "servicenow", "chatgpt-enterprise", "claude-ui"];

  // ---------- markdown ----------
  const inline = (s) => s.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // Visual blocks the agent can emit as fenced blocks: kpi, status, chart bar, chart line. One row per line, cells split by "|".
  // Copyable content (drafted emails, messages, notes, entries) gets a card with a Copy button.
  const cpBtn = (text, label = "Copy") => `<button class="rv-cpb" data-copy="${text}" title="Copy to clipboard">${ic("copy")}<span class="cp-l">${label}</span></button>`;
  function copyBlock(kind, b) {
    const text = b.replace(/\n+$/, "");
    if (kind === "email") {
      const lines = text.split("\n"); const hdr = []; let k = 0;
      while (k < lines.length && /^(to|cc|subject):/i.test(lines[k])) hdr.push(lines[k++].match(/^(\w+):\s*(.*)$/));
      const body = lines.slice(k).join("\n").replace(/^\n+/, "");
      return `<div class="rv-copy mail"><div class="rv-cph"><span>${ic("mail")}Email draft</span>${cpBtn(text)}</div>${hdr.length ? `<div class="rv-mh">${hdr.map((m) => `<div><span>${m[1]}</span><b>${m[2]}</b></div>`).join("")}</div>` : ""}<div class="rv-mb">${body}</div></div>`;
    }
    const label = { message: "Message draft", note: "Work note", text: "Text", copy: "Text" }[kind] ?? (kind ? kind.toUpperCase() : "Text");
    return `<div class="rv-copy"><div class="rv-cph"><span>${esc(label)}</span>${cpBtn(text)}</div><pre>${text}</pre></div>`;
  }
  function visual(kind, rows) {
    const cells = rows.map((r) => r.split("|").map((c) => c.trim())).filter((c) => c[0]);
    const title = cells.find((c) => /^title:/i.test(c[0]))?.[0].replace(/^title:\s*/i, "");
    const data = cells.filter((c) => !/^title:/i.test(c[0]));
    const num = (v) => parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
    const head = title ? `<div class="rv-title">${inline(title)}</div>` : "";
    const SER = ["var(--rv-accent)", "#9aa5b4", "#e8a10a", "#1e8e3e", "#d93025", "#6f3cdc"];
    const tone = (v = "") => /\b(bad|fail|failed|failing|error|red|blocked|denied|critical|missing|expired|rejected|overdue)\b/i.test(v) ? "bad" : /\b(warn|risk|at risk|pending|amber|hold|on hold|progress|in progress|open|degraded|test|late|waiting)\b/i.test(v) ? "warn" : /\b(ok|done|complete|completed|healthy|green|active|live|delivered|passed|received|accepted|sent|confirmed)\b/i.test(v) ? "ok" : "info";
    const spark = (vals) => { const ys = vals.map(num).filter((x) => !isNaN(x)); if (ys.length < 2) return ""; const lo = Math.min(...ys), sp = Math.max(...ys) - lo || 1; return `<svg class="rv-spark" viewBox="0 0 100 24" preserveAspectRatio="none"><polyline points="${ys.map((y, k) => `${(k * 100) / (ys.length - 1)},${22 - ((y - lo) / sp) * 20}`).join(" ")}"/></svg>`; };
    const meta = (key) => cells.find((c) => new RegExp(`^${key}:`, "i").test(c[0]))?.[0].replace(new RegExp(`^${key}:\\s*`, "i"), "").split(/\s*,\s*/);
    const rowsOf = data.filter((c) => !/^(series|cols|status):/i.test(c[0]));
    if (kind === "kpi") return `<div class="rv">${head}<div class="rv-kpis">${data.map(([l, v, n, t]) => `<div class="rv-kpi"><span>${inline(l)}</span><b>${inline(v ?? "")}</b>${n ? `<em>${inline(n)}</em>` : ""}${t ? spark(t.split(/\s*,\s*/)) : ""}</div>`).join("")}</div></div>`;
    if (kind === "gauge") return `<div class="rv">${head}<div class="rv-gauges">${data.map(([l, v, t]) => { const x = Math.max(0, Math.min(100, num(v))), tg = t ? Math.max(0, Math.min(100, num(t))) : null; const r = 34, C = Math.PI * r; return `<div class="rv-gauge"><svg viewBox="0 0 84 48"><path d="M8 44 A34 34 0 0 1 76 44" class="bg"/><path d="M8 44 A34 34 0 0 1 76 44" class="fg ${tg != null && x < tg ? "warn" : ""}" style="stroke-dasharray:${(C * x) / 100} ${C}"/>${tg != null ? `<line x1="${42 - 38 * Math.cos(Math.PI * tg / 100)}" y1="${44 - 38 * Math.sin(Math.PI * tg / 100)}" x2="${42 - 28 * Math.cos(Math.PI * tg / 100)}" y2="${44 - 28 * Math.sin(Math.PI * tg / 100)}" class="tg"/>` : ""}</svg><b>${inline(v ?? "")}</b><span>${inline(l)}</span>${t ? `<em>Target ${inline(t)}</em>` : ""}</div>`; }).join("")}</div></div>`;
    if (kind === "donut" || kind === "pie") { const vals = data.map((c) => Math.max(0, num(c[1]) || 0)), tot = vals.reduce((a, b) => a + b, 0) || 1; let acc = 0; const r = 15.915; return `<div class="rv">${head}<div class="rv-donut"><svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="${r}" class="bg"/>${vals.map((v, k) => { const seg = `<circle cx="21" cy="21" r="${r}" style="stroke:${SER[k % SER.length]};stroke-dasharray:${(v / tot) * 100} ${100 - (v / tot) * 100};stroke-dashoffset:${25 - acc}"/>`; acc += (v / tot) * 100; return seg; }).join("")}<text x="21" y="23.5">${Math.round(tot)}</text></svg><div class="rv-legend">${data.map(([l, v], k) => `<div><i style="background:${SER[k % SER.length]}"></i><span>${inline(l)}</span><b>${inline(v ?? "")}</b></div>`).join("")}</div></div></div>`; }
    if (kind === "compare" || kind === "chart grouped") { const ser = meta("series") ?? []; const max = Math.max(...rowsOf.flatMap((c) => c.slice(1).map(num)).filter((x) => !isNaN(x)), 0) || 1; return `<div class="rv">${head}${ser.length ? `<div class="rv-legend row">${ser.map((n, k) => `<div><i style="background:${SER[k % SER.length]}"></i><span>${inline(n)}</span></div>`).join("")}</div>` : ""}<div class="rv-groups">${rowsOf.map(([l, ...vs]) => `<div class="rv-group"><span>${inline(l)}</span><div>${vs.map((v, k) => `<div class="rv-gb"><i style="width:${Math.max(1, (num(v) / max) * 100).toFixed(1)}%;background:${SER[k % SER.length]}"></i><b>${inline(v)}</b></div>`).join("")}</div></div>`).join("")}</div></div>`; }
    if (kind === "heatmap") { const cols = meta("cols") ?? []; const all = rowsOf.flatMap((c) => c.slice(1).map(num)).filter((x) => !isNaN(x)); const lo = Math.min(...all), sp = Math.max(...all) - lo || 1; return `<div class="rv">${head}<div class="rv-heat" style="grid-template-columns:minmax(64px,auto) repeat(${Math.max(cols.length, (rowsOf[0]?.length ?? 1) - 1)},1fr)"><span></span>${cols.map((c) => `<em>${inline(c)}</em>`).join("")}${rowsOf.map(([l, ...vs]) => `<span>${inline(l)}</span>${vs.map((v) => `<i style="--a:${(0.12 + 0.88 * ((num(v) - lo) / sp)).toFixed(2)}">${inline(v)}</i>`).join("")}`).join("")}</div></div>`; }
    if (kind === "timeline") return `<div class="rv">${head}<div class="rv-tl">${data.map(([t, e, st]) => `<div class="rv-te ${tone(st ?? e)}"><i></i><div><em>${inline(t)}</em><b>${inline(e ?? "")}</b>${st ? `<span>${inline(st)}</span>` : ""}</div></div>`).join("")}</div></div>`;
    if (kind === "steps" || kind === "progress") return `<div class="rv">${head}<div class="rv-steps">${data.map(([l, st, d]) => `<div class="rv-sp ${tone(st)}"><i></i><b>${inline(l)}</b>${st ? `<em>${inline(st)}</em>` : ""}${d ? `<span>${inline(d)}</span>` : ""}</div>`).join("")}</div></div>`;
    if (kind === "flow") return `<div class="rv">${head}<div class="rv-flow">${data.map(([l, st, d], k) => `${k ? `<div class="rv-arrow">›</div>` : ""}<div class="rv-node ${tone(st)}"><b>${inline(l)}</b>${st ? `<em>${inline(st)}</em>` : ""}${d ? `<span>${inline(d)}</span>` : ""}</div>`).join("")}</div></div>`;
    if (kind === "record" || kind === "card") { const st = meta("status")?.join(", "); return `<div class="rv"><div class="rv-record"><div class="rv-rh">${title ? `<b>${inline(title)}</b>` : ""}${st ? `<em class="${tone(st)}">${inline(st)}</em>` : ""}</div><div class="rv-kv">${rowsOf.map(([k, v]) => `<span>${inline(k)}</span><b>${inline(v ?? "")}</b>`).join("")}</div></div></div>`; }
    if (kind === "cards") return `<div class="rv">${head}<div class="rv-cards">${data.map(([n, d, t]) => `<div class="rv-card"><div class="rv-ci">${esc(initials(n.replace(/&[a-z]+;/g, "")) || "TG")}</div><div><b>${inline(n)}</b>${d ? `<span>${inline(d)}</span>` : ""}${t ? `<em>${inline(t)}</em>` : ""}</div></div>`).join("")}</div></div>`;
    if (kind === "contact") return `<div class="rv">${head}<div class="rv-contacts">${data.map(([n, r, e, ph]) => `<div class="rv-contact"><i>${esc(initials(n.replace(/&[a-z]+;/g, "")))}</i><div><b>${inline(n)}</b>${r ? `<span>${inline(r)}</span>` : ""}${e ? `<a>${inline(e)}</a>` : ""}${ph ? `<span>${inline(ph)}</span>` : ""}</div></div>`).join("")}</div></div>`;
    if (kind === "alert" || kind === "callout") return data.map(([sev, t, d]) => `<div class="rv-alert ${tone(sev)}"><b>${inline(t ?? sev)}</b>${d ? `<span>${inline(d)}</span>` : ""}</div>`).join("");
    if (kind === "actions") return `<div class="rv-actions">${data.map(([l, pr]) => `<button class="rv-act" data-prompt="${pr || l}">${inline(l)}</button>`).join("")}</div>`;
    if (kind === "status") return `<div class="rv">${head}<div class="rv-status">${data.map(([l, st, d]) => { const k = tone(st); return `<div class="rv-st ${k}"><i></i><div><b>${inline(l)}</b>${d ? `<span>${inline(d)}</span>` : ""}</div><em>${inline(st ?? "")}</em></div>`; }).join("")}</div></div>`;
    if (kind === "chart bar" || kind === "chart") {
      const max = Math.max(...data.map((c) => num(c[1])).filter((x) => !isNaN(x)), 0) || 1;
      return `<div class="rv">${head}<div class="rv-bars">${data.map(([l, v]) => `<div class="rv-bar"><span>${inline(l)}</span><div><i style="width:${Math.max(2, (num(v) / max) * 100).toFixed(1)}%"></i></div><b>${inline(v ?? "")}</b></div>`).join("")}</div></div>`;
    }
    if (kind === "chart line") {
      const pts = data.map(([l, v]) => [l, num(v), v]).filter((p) => !isNaN(p[1])); if (pts.length < 2) return null;
      const ys = pts.map((p) => p[1]), lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
      const xy = pts.map((p, k) => [8 + (k * 284) / (pts.length - 1), 8 + (1 - (p[1] - lo) / span) * 64]);
      return `<div class="rv">${head}<svg class="rv-line" viewBox="0 0 300 80" width="100%" height="96"><polyline points="${xy.map((q) => q.join(",")).join(" ")}"/>${xy.map((q) => `<circle cx="${q[0]}" cy="${q[1]}" r="2.6"/>`).join("")}</svg><div class="rv-axis">${pts.map((p) => `<span><b>${inline(p[2])}</b>${inline(p[0])}</span>`).join("")}</div></div>`;
    }
    return null;
  }
  function md(src) {
    const lines = esc(src).split("\n");
    let out = "", i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (/^```/.test(l)) { const kind = l.slice(3).trim().toLowerCase(); let b = ""; const rows = []; i++; while (i < lines.length && !/^```/.test(lines[i])) { rows.push(lines[i]); b += lines[i++] + "\n"; } i++; out += visual(kind, rows) ?? copyBlock(kind, b); continue; }
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
  const ORCH_TITLES = { engage_subagent: "Engage sub-agent", list_subagents: "List sub-agents" };
  const toolTitle = (n) => ORCH_TITLES[n] ?? S.tools?.find((t) => t.name === n)?.title ?? n.replace(/_/g, " ");
  // Trading Grid Agent attribution: which sub-agents are helping on this answer.
  const subLine = (m, short) => m.agentId !== "tg-aviator" || !(m.subs?.length || m.steps?.length) || (short && !m.subs?.length) ? "" : `<div class="sub-by">${short ? "" : `${ic("sparkle")}<b>Trading Grid Agent</b>`}${m.subs?.length ? `<span>${short ? "With" : "with"} ${m.subs.map(esc).join(", ")}</span>` : ""}</div>`;
  function renderStep(s, si, mi) {
    const flag = !s.done ? "" : s.status === "DENIED" ? `<span class="af bad">Denied</span>` : s.status === "ERROR" ? `<span class="af warn">${esc(s.envelope?.error?.code ?? "Error")}</span>` : s.status === "APPROVAL_REQUIRED" ? `<span class="af info">Approval required</span>` : "";
    return `<div class="astep${s.open ? " open" : ""}"><div class="ar" data-step="${mi}:${si}"><span class="ad ${!s.done ? "run" : s.status === "OK" ? "" : "x"}"></span><span class="an">${esc(toolTitle(s.name))}</span>${s.by ? `<span class="aby">${esc(s.by)}</span>` : ""}${flag}<span class="as">${esc(s.summary ?? "")}</span>${s.done ? `<span class="ams">${s.ms} ms</span>` : ""}</div>
      ${s.open ? `<div class="adetail">
        <div class="kv"><span class="k">Tool</span><span class="mono">${esc(s.name)}</span><span class="k">Source</span><span>${esc((s.product ?? "").replace("Trading Grid ", ""))} · <span class="mono">${esc(s.binding ?? "")}</span></span><span class="k">Basis</span><span>${esc(s.basis ?? "")}</span>${s.envelope?.access ? `<span class="k">Access</span><span>${esc(s.envelope.access.decision)} · ${esc(s.envelope.access.operation)} · ${esc(s.envelope.access.executionPrincipal)}</span>` : ""}${s.completeness ? `<span class="k">Completeness</span><span>${esc(s.completeness)}</span>` : ""}</div>
        <details><summary>Input</summary><pre class="json">${esc(JSON.stringify(s.input, null, 2))}</pre></details>
        ${s.envelope ? `<details><summary>Response</summary><pre class="json">${esc(JSON.stringify(s.envelope, null, 2))}</pre></details>` : ""}
      </div>` : ""}</div>`;
  }
  /** One quiet activity line per answer; expands to the tool calls and route. */
  // Each client shows work in progress the way the real product does. Claude and Trading Grid Aviator keep the step trace.
  const NATIVE = { teams: "dots", joule: "dots", servicenow: "Now Assist is thinking", copilot: "Generating response", copilotstudio: "Generating response", chatgpt: "Thinking", gemini: "Thinking" };
  function nativeActivity(id, m, mi) {
    const kind = NATIVE[id];
    if (!kind) return activity(m, mi, m.route);
    const busy = m.thinking || m.steps.some((x) => !x.done);
    if (busy) return kind === "dots" ? `<div class="na-dots"><i></i><i></i><i></i></div>` : `<div class="activity busy na"><span class="al">${esc(kind)}</span></div>`;
    if (!m.steps.length || (id !== "chatgpt" && id !== "gemini")) return "";
    const secs = m.elapsed ? Math.max(1, Math.round(m.elapsed / 1000)) : null;
    const label = id === "chatgpt" ? `Thought for ${secs ?? m.steps.length} ${secs ? "s" : "steps"}` : "Show thinking";
    const list = m.showSteps ? `<div class="na-list">${m.steps.map((x) => `<div>${esc(x.name === "engage_subagent" ? `Engaged ${x.summary ?? "sub-agent"}` : `Trading Grid: ${toolTitle(x.name)}`)}${x.by ? `<span> · ${esc(x.by)}</span>` : ""}</div>`).join("")}</div>` : "";
    return `<div class="na na-${id}"><button class="na-t" data-togglesteps="${mi}">${esc(label)}<span class="chev">${id === "gemini" ? (m.showSteps ? "⌃" : "⌄") : "›"}</span></button>${list}</div>`;
  }
  // Stage: suggestion cards offer related questions, not the scripted turns.
  function stagePrompts(sid) {
    return STAGE && SCN[sid]?.sugg ? SCN[sid].sugg : null;
  }
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
      const find = () => el.querySelector(".chatframe.max .chatscroll") ?? el.querySelector(".cop-msgs") ?? el.querySelector(".cl-msgs") ?? el.closest("[data-scroll]") ?? document.scrollingElement;
      const old = find();
      const near = old.scrollTop + old.clientHeight >= old.scrollHeight - 160, top = old.scrollTop;
      const focused = document.activeElement === el.querySelector("textarea");
      const draft = el.querySelector("textarea")?.value ?? "";
      el.innerHTML = mounts[key](S.convs[key]);
      if (fromRemote.has(key)) fromRemote.delete(key); else mirror({ conv: S.convs[key], plans: S.plans });
      const ta = el.querySelector("textarea"); if (ta) { ta.value = draft; if (focused) ta.focus(); }
      document.querySelectorAll(`[data-side="${key}"]`).forEach((s) => (s.innerHTML = sideMounts[key]?.(S.convs[key]) ?? ""));
      const cnt = String(S.convs[key]?.items.length ?? 0); const grew = el.dataset.n !== cnt; el.dataset.n = cnt;
      // Keep the reader at the start of the latest exchange: the last question sits at the top while the answer streams below it.
      // Following stops once the reader scrolls.
      const sc = find();
      const follow = grew || el._set == null || Math.abs(top - el._set) < 2;
      const us = el.querySelectorAll(".msg.user, .avmsg.user, .cop-u, .cl-u, .cl-b.other");
      const u = us[us.length - 1];
      if (follow && u) sc.scrollTop = sc.scrollTop + u.getBoundingClientRect().top - (sc === document.scrollingElement ? 0 : sc.getBoundingClientRect().top) - 12;
      else sc.scrollTop = top;
      el._set = sc.scrollTop;
    });
  }
  const sideMounts = {};

  // ---------- Stage mirroring: phone and desktop frames show one conversation ----------
  const STAGE = qs().get("stage");
  const bc = STAGE && "BroadcastChannel" in window ? new BroadcastChannel("tg-stage:" + location.pathname) : null;
  let remote = false;
  const fromRemote = new Set();
  if (STAGE) {
    const curKey = () => Object.keys(mounts).find((k) => document.querySelector(`[data-conv="${k}"]`));
    /** True while the open conversation is empty and idle. */
    window.__stageEmpty = () => { const c = S.convs[curKey()]; return !c || (!c.items.length && !c.busy); };
    window.__stageBusy = () => !!S.convs[curKey()]?.busy;
    /** Clicks Approve on the newest pending approval card. */
    window.__stageS4Open = () => { const u = new URLSearchParams(location.search); u.delete("po"); S.s4View = "po"; S.jouleOpen = true; history.replaceState(null, "", `${location.pathname}?${u}`); render(); return true; };
    window.__stageApprove = () => { const b = [...document.querySelectorAll("[data-approve]")].pop(); if (b) b.click(); return !!b; };
    /** Types text at reading pace into the composer (or another field), then sends it (or clicks a button). */
    window.__stageType = (text, o = {}) => {
      const key = curKey(); const el = key && document.querySelector(`[data-conv="${key}"]`);
      const ta = o.into ? document.querySelector(o.into) : el?.querySelector("[data-compose] textarea");
      if (!ta || (!o.into && S.convs[key]?.busy)) return false;
      // Touch screens: type without focusing, so the on-screen keyboard stays closed.
      if (!matchMedia("(pointer: coarse)").matches) ta.focus(); else ta.blur();
      ta.value = ""; let i = 0; window.__stageTyping = true;
      const step = () => {
        if (i < text.length) { ta.value += text[i++]; ta.dispatchEvent(new Event("input", { bubbles: true })); return setTimeout(step, 38 + Math.random() * 45 + (text[i - 1] === " " ? 30 : 0)); }
        setTimeout(() => { window.__stageTyping = false; if (o.then) document.querySelector(o.then)?.click(); else { S.nextAs = o.as ?? null; ta.closest("form").requestSubmit(); } }, 450);
      };
      step();
      return true;
    };
  }
  const mirror = (msg) => { if (bc && !remote) bc.postMessage({ from: STAGE, ...msg }); };
  if (bc) bc.onmessage = (ev) => {
    const m = ev.data; if (m.from === STAGE) return;
    remote = true;
    try {
      if (m.conv) { S.convs[m.conv.key] = m.conv; fromRemote.add(m.conv.key); if (m.plans) S.plans = m.plans; refreshConv(m.conv.key); }
      if (m.reset) { delete S.convs[m.reset]; render(); }
      if (m.snNotes) { S.snNotes = m.snNotes; render(); }
      if (m.nav) { const u = new URL(m.nav, location.origin); u.searchParams.set("stage", STAGE); const nav = u.pathname + u.search; if (nav !== location.pathname + location.search) { history.replaceState({}, "", nav); render(); } }
    } finally { setTimeout(() => (remote = false), 0); }
  };

  /** Now Assist action in ServiceNow: summarizes the last answer into a work note on the open incident. */
  function addWorkNote(key, text) {
    const c = S.convs[key];
    const last = [...c.items].reverse().find((m) => m.role === "agent" && m.text);
    // Lead sentence plus the facts from the answer's blocks, as a 2 to 3 line note.
    const lines = (last?.text ?? "").split("\n").map((l) => l.trim());
    const lead = lines.find((l) => l && !/^(```|\||title:|status:|sources?:|next step)/i.test(l) && !l.includes(" | ")) ?? "";
    const facts = lines.filter((l) => l.includes(" | ") && !/^\|/.test(l)).map((l) => l.split("|").map((x) => x.trim()).filter(Boolean)).filter((c) => c.length >= 2).slice(0, 4).map((c) => `${c[0]}: ${c.slice(1).join(", ")}`);
    const next = lines.find((l) => /^next step/i.test(l)) ?? "";
    const note = [lead.replace(/[*`]/g, ""), facts.join("; "), next.replace(/[*`]/g, "")].filter(Boolean).join("\n");
    (S.snNotes ??= []).unshift({ who: "Jordan Lee", kind: "Work notes", at: new Date().toISOString(), text: `Now Assist summary: ${note}` });
    c.items.push({ role: "user", text, t: Date.now() });
    c.items.push({ role: "agent", agentId: c.agentId, steps: [], text: `Added a work note to ${S.scene.servicenow?.number ?? "the incident"}.\n\n\`\`\`note\n${note}\n\`\`\``, plans: [], thinking: false, t0: Date.now() });
    mirror({ snNotes: S.snNotes });
    render();
  }
  // Gemini Enterprise Agent Designer: draft and publish run in the client; the published agent's run goes to the Trading Grid Agent.
  const GEM_AGENT = { name: "Supplier failure analyst", schedule: "Every day at 8:00 AM ET", identity: "agent-hrg-supplier-ops (grant GRT-HRG-2026-014)", table: "harborview-ops.hrg_b2b.tg_error_analysis",
    steps: ["Get yesterday's failed inbound transactions from the Trading Grid Insights failure report (Transaction Finder)", "Send each failure to the Trading Grid Error Analysis agent", "Write cause, owner and next action per transaction to BigQuery", "Post a summary to the Supplier Operations space"],
    tools: ["Trading Grid Agent Connectors: Trading Grid Agent (Transaction Finder, Error Analysis)", "BigQuery: insert rows", "Google Chat: post message"] };
  function gemLocal(key, text, kind) {
    const c = S.convs[key];
    c.items.push({ role: "user", text, t: Date.now() });
    let html;
    if (kind === "draft") {
      S.gem = { draft: GEM_AGENT };
      const g = GEM_AGENT;
      html = `<div class="gm-card"><div class="gm-h"><span class="gm-ic">${ic("sparkle")}</span><div><b>${esc(g.name)}</b><span>Agent draft · Agent Designer</span></div></div>
        <div class="gm-kv"><span>Trigger</span><b>${esc(g.schedule)}</b><span>Runs as</span><b>${esc(g.identity)}</b><span>Output</span><b class="mono">${esc(g.table)}</b></div>
        <div class="gm-sec">Steps</div><ol class="gm-steps">${g.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
        <div class="gm-sec">Tools</div><div class="gm-tools">${g.tools.map((x) => `<span>${esc(x)}</span>`).join("")}</div>
        <div class="gm-sec">BigQuery table schema</div><div class="gm-schema">${["run_date DATE", "transaction_id STRING", "partner STRING", "document STRING", "error_code STRING", "cause STRING", "owner STRING", "next_action STRING"].map((x) => `<code>${esc(x)}</code>`).join("")}</div></div>`;
      c.items.push({ role: "agent", agentId: c.agentId, steps: [], text: "I drafted the agent in Agent Designer. Review the trigger, steps and output table, then publish it.", html, plans: [], thinking: false, t0: Date.now() });
    } else {
      S.gem.published = true;
      html = `<div class="gm-card pub"><div class="gm-h"><span class="gm-ic ok">${ic("check")}</span><div><b>${esc(GEM_AGENT.name)} is live</b><span>Published to Gemini Enterprise</span></div></div>
        <div class="gm-kv"><span>Available to</span><b>Supplier Operations, Harborview Retail Group</b><span>Schedule</span><b>${esc(GEM_AGENT.schedule)}, next run tomorrow</b><span>Connections</span><b>Trading Grid Agent Connectors · BigQuery · Google Chat</b><span>Version</span><b>1.0</b></div></div>`;
      c.items.push({ role: "agent", agentId: c.agentId, steps: [], text: "Published. The agent runs every morning at 8:00 AM and is available to the Supplier Operations team.", html, plans: [], thinking: false, t0: Date.now() });
    }
    render();
  }
  async function send(key, text) {
    const c = S.convs[key];
    if (!c || c.busy || !text.trim()) return;
    const as = S.nextAs; S.nextAs = null; S.lastAs = as ?? S.meta.persona.name;
    if (c.host === "servicenow" && /\bwork note\b/i.test(text)) return addWorkNote(key, text);
    if (c.host === "gemini-enterprise" && /^build a gemini agent/i.test(text)) return gemLocal(key, text, "draft");
    if (c.host === "gemini-enterprise" && /^publish/i.test(text) && S.gem?.draft) return gemLocal(key, text, "publish");
    c.busy = true;
    c.items.push({ role: "user", text, t: Date.now(), ...(as ? { as } : {}) });
    const m = { role: "agent", agentId: c.agentId, steps: [], text: "", plans: [], thinking: true, t0: Date.now() };
    c.items.push(m);
    refreshConv(key);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: c.id, host: c.host, agentId: c.agentId, message: text, context: S.ctxFor[key]?.(), connector: S.conFor?.[key] }) });
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
          if (e.type === "subagent") { (m.subs ??= []).push(e.name); }
          if (e.type === "tool_call") { m.thinking = false; m.steps.push({ id: e.id, name: e.name, input: e.input, by: e.by, done: false }); c.live = e.name; if (m.text && !/\n$/.test(m.text)) m.text += "\n\n"; }
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
      <div class="layout"><nav class="sidenav">${nav}</nav><main class="main">${inner}</main></div>`;
  }

  // ---------- Demo journey ----------
  const SCENES = [
    { n: 1, where: "Trading Grid Online", title: "Find a failed ASN", text: "Open Transactions, filter to failed deliveries and select a failed ASN.", href: "/tgo" },
    { n: 2, where: "Trading Grid Online", title: "Analyze with Aviator", text: "Analyze with Aviator runs the Error Analysis Agent. Payloads runs the Payload Analysis Agent.", href: () => `/tgo/insights?q=${encodeURIComponent(S.meta.examples?.openXrefAsn?.shipmentId ?? S.meta.examples?.failedAsn?.shipmentId ?? "")}&open=1` },
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
    return `<header class="topbar"><div class="brand"><img src="/assets/opentext-logo.svg" alt="OpenText"><span class="divider"></span><span class="name">Simulation boundaries</span></div><div class="spacer"></div>${journeyBtn}${avatar()}</header>
    <div class="journey"><h1>Implemented and simulated components</h1><p class="sub">Seeded retail data. Not connected to production Trading Grid.</p>
    <div class="section-title">Implemented</div><table class="t"><tbody>
      ${row("Tool runtime", `${S.tools.length} tools run against seeded data and return evidence envelopes.`, `95 from the incubation brief; ${S.tools.length - 95} application tools modeled on the Innovation Guide. CMS fields follow Swagger v2 to v5.`)}
      ${row("Entitlements", "Organization, BUID, solution, operation, client suspension and agent blocks enforced on every call.", "Fail closed.")}
      ${row("Approvals", "Changes follow prepare, approve, recheck and submit. Plans are single use and expire.", "")}
      ${row("Agents", "Agents run on Claude models with their assigned tools.", "Answers use seeded data only.")}
      ${row("MCP endpoint", "Streamable HTTP endpoint for tools and agents. Claude connects live.", "Client tokens. OAuth not implemented.")}
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
    return `<header class="topbar"><div class="brand"><img src="/assets/opentext-logo.svg" alt="OpenText"><span class="divider"></span><span class="name">Trading Grid agent journey</span></div><div class="spacer"></div><button class="btn ghost sm" data-href="/boundaries">${ic("shield")}Simulation boundaries</button><button class="btn ghost sm" data-demoreset>${ic("refresh")}Reset demo</button>${avatar()}</header>
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
      <div class="scenes">${SCENES.map((s, i) => ({ ...s, n: i + 1 })).map((s) => `<div class="scene"><div class="sn">${s.n}</div><div class="sb"><div class="sw">${esc(s.where)}</div><div class="st">${esc(s.title)}</div><div class="sd">${esc(s.text)}</div></div><button class="btn sm" data-href="${typeof s.href === "function" ? s.href() : s.href}">${ic("play")}Open</button></div>`).join("")}</div>
      
    </div>`;
  }

  // ---------- Trading Grid Online ----------
  const AV_LOGO = `<img class="avlogo" src="/assets/aviator-logo.png" alt="">`;
  const AV_AVATAR = `<img class="avavatar" src="/assets/aviator-avatar.png" alt="">`;
  const avKey = () => `tgo:${S.av.agentId}`;
  S.av = { open: false, agentId: "tg-aviator", txId: null };

  function aviatorItem(c, m, mi) {
    if (m.role === "user") return `<div class="avmsg user">${esc(m.text)}</div>`;
    const steps = subLine(m) + activity(m, mi, m.route);
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
      intro = `<div class="avmsg bot">${AV_AVATAR}<div class="avbody"><p style="margin:2px 0 8px">Hi! I'm Aviator. How can I help you today?</p>${!c.items.length && a.starters?.length ? `<div class="avsugg">${(stagePrompts("tgo") ?? a.starters.map(promptOf)).map((p) => `<button data-prompt="${esc(p)}">${esc(p)}</button>`).join("")}</div>` : ""}</div></div>`;
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
        <div style="overflow:auto"><table class="t"><thead><tr><th>Application</th><th>Connectors</th><th>Exposure</th><th>Execution principal</th><th>Operations</th><th>Last used</th><th>Status</th><th></th></tr></thead><tbody>
        ${ext.map((h) => { const st = S.meta.clientStatus[h.key] ?? "ACTIVE"; return `<tr><td><strong>${esc(h.name)}</strong><div class="small muted">${esc(h.authPattern)}</div></td><td class="small">${(h.connectors ?? []).map((c) => c === "agents" ? "Agent Connectors" : "Context Connectors").join("<br>") || "-"}</td><td class="small">${esc(h.exposure)}${h.exposure === "External" ? "<div class=\"muted\">via Aviator AKS gateway</div>" : ""}</td><td class="mono small">${esc(h.principal)}<div class="muted">${esc(h.principalType.replace("_", " ").toLowerCase())}</div></td><td>${h.operations.length} of ${Math.max(...S.meta.hosts.map((x) => x.operations.length))}</td><td class="small">${last[h.key] ? esc(new Date(last[h.key]).toLocaleTimeString()) : '<span class="muted">Not used</span>'}</td><td><span class="pill ${st === "ACTIVE" ? "ok" : "bad"}">${st === "ACTIVE" ? "Active" : "Suspended"}</span></td><td>${st === "ACTIVE" ? `<button class="btn sm danger" data-suspend="${h.key}">Suspend access</button>` : `<button class="btn sm" data-restore="${h.key}">Restore access</button>`}</td></tr>`; }).join("")}
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
  const pageStudioAgents = () => shellStudio(`<div class="pagehead"><div class="titlerow"><h1>Agents</h1></div><p class="sub">Aviator agents on Trading Grid Context Services. Status follows the Aviator portfolio. Custom agents are built in Aviator Studio.</p></div><div class="content">${["Live today", "On the roadmap", "Incubating", "Prototype"].map((st) => { const list = studioAgents().filter((a) => a.status === st); return list.length ? `<div class="section-title">${st} <span class="muted small">${list.length}</span></div><div class="agentgrid">${list.map(agentCard).join("")}</div>` : ""; }).join("")}</div>`);

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
  const csNav = (p) => navList([{ g: null, items: [["home", "/cs", "Overview"]] }, { g: "Service", items: [["wrench", "/cs/tools", "Tools", S.meta.toolCount], ["agent", "/cs/agents", "Published agents"], ["server", "/cs/clients", "Clients and endpoint", S.meta.hosts.length - 1], ["shield", "/cs/access", "Access and audit"], ["check", "/cs/approvals", "Approvals", S.plans.filter((x) => x.status === "PENDING_APPROVAL").length || ""]] }, { g: "Testing", items: [["list", "/cs/scenarios", "Test scenarios", S.sc.catalog?.length || ""]] }], p);
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

  S.sc = { catalog: null, coverage: null, results: {}, open: {}, q: "", domain: "", kind: "", result: "", running: false };
  async function pageCsScenarios() {
    if (!S.sc.catalog) { const r = await api("/api/scenarios"); S.sc.catalog = r.scenarios; S.sc.coverage = r.coverage; }
    const sc = S.sc, q = sc.q.toLowerCase();
    const res = (x) => sc.results[x.id];
    const rows = sc.catalog.filter((x) => (!sc.domain || x.domain === sc.domain) && (!sc.kind || x.kind === sc.kind) && (!q || `${x.id} ${x.title} ${x.tools.join(" ")}`.toLowerCase().includes(q))
      && (!sc.result || (sc.result === "Not run" ? !res(x) : sc.result === "Passed" ? res(x)?.pass : res(x) && !res(x).pass)));
    const ran = Object.values(sc.results), passed = ran.filter((r) => r.pass).length;
    const domains = [...new Set(sc.catalog.map((x) => x.domain))], kinds = [...new Set(sc.catalog.map((x) => x.kind))];
    const opt = (list, v) => list.map((x) => `<option ${x === v ? "selected" : ""}>${esc(x)}</option>`).join("");
    const pill = (r) => !r ? `<span class="pill neutral">Not run</span>` : r.pass ? `<span class="pill ok">Passed</span>` : `<span class="pill bad">Failed</span>`;
    const detail = (x) => { const r = res(x); return `<tr class="scdetail"><td colspan="7"><div class="scd">
      ${x.prompt ? `<div class="scprompt"><span class="small muted">Agent prompt</span><span>${esc(x.prompt)}</span><button class="btn sm ghost" data-copy="${esc(x.prompt)}">Copy</button></div>` : ""}
      ${x.steps.map((st, i) => { const rs = r?.steps?.[i]; return `<div class="scstep"><div class="sch"><span class="mono"><strong>${i + 1}. ${esc(st.tool)}</strong></span><span class="small muted">Expected ${esc(st.expect)}${st.code ? ` ${esc(st.code)}` : ""}${st.check ? ` · ${esc(st.check)}` : ""}</span>${rs ? `<span class="pill ${rs.pass ? "ok" : "bad"}">${esc(rs.status)}${rs.code ? ` ${esc(rs.code)}` : ""}</span><span class="small muted">${rs.ms} ms</span>` : ""}</div>
        ${rs?.note ? `<div class="alert bad small">${esc(rs.note)}</div>` : ""}
        <details><summary>Arguments</summary><pre class="json">${esc(JSON.stringify(rs?.args ?? st.args, null, 2))}</pre></details>
        ${rs?.out ? `<details><summary>Response</summary><pre class="json">${esc(JSON.stringify(rs.out, null, 2))}</pre></details>` : ""}</div>`; }).join("")}</div></td></tr>`; };
    return shellCs(`<div class="pagehead"><div class="titlerow"><h1>Test scenarios</h1><div class="actions"><button class="btn primary" data-scall ${sc.running ? "disabled" : ""}>${ic("play")}${sc.running ? "Running" : "Run all"}</button></div></div>
      <p class="sub">Executable scenarios for every tool against current Trading Grid data, with expected status and result checks.</p></div>
      <div class="content">
        <div class="kv scsum"><span class="k">Scenarios</span><span>${sc.catalog.length}</span><span class="k">Tools covered</span><span>${sc.coverage.covered} of ${sc.coverage.tools}</span><span class="k">Last run</span><span>${ran.length ? `${passed} passed, ${ran.length - passed} failed, ${sc.catalog.length - ran.length} not run` : "Not run"}</span></div>
        <div class="filters"><input class="input" data-scq placeholder="Search scenario, ID or tool" value="${esc(sc.q)}"><select class="select" data-scdomain><option value="">All domains</option>${opt(domains, sc.domain)}</select><select class="select" data-sckind><option value="">All types</option>${opt(kinds, sc.kind)}</select><select class="select" data-scresult><option value="">All results</option>${opt(["Passed", "Failed", "Not run"], sc.result)}</select><span class="small muted" style="align-self:center">${rows.length} shown</span></div>
        <div style="overflow:auto"><table class="t sct"><thead><tr><th>ID</th><th>Scenario</th><th>Type</th><th>Client</th><th>Expected</th><th>Result</th><th></th></tr></thead><tbody>
        ${rows.map((x) => `<tr class="click" data-scrow="${x.id}"><td class="mono small">${esc(x.id)}</td><td><strong>${esc(x.title)}</strong><div class="mono small muted">${esc(x.tools.join(", "))}</div></td><td class="small">${esc(x.kind)}</td><td class="small">${esc(hostBy(x.host)?.shortName ?? x.host)}</td><td class="mono small">${esc(x.steps.map((st) => st.expect).join(" › "))}</td><td>${pill(res(x))}</td><td><button class="btn sm" data-scrun="${x.id}">Run</button></td></tr>${sc.open[x.id] ? detail(x) : ""}`).join("")}
        </tbody></table></div>
        <p class="small muted">Run all resets demo data before each scenario and restores it afterwards. Single runs use the current state.</p>
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
    const ex = { partner: "Brightwell Home Goods", company: "Brightwell Home Goods", key_value: S.meta.examples?.failedAsn?.shipmentId ?? "", transaction_id: "", trading_address: "ZZ:BRIGHTWELLHG", map: "BWHG_856_4010_IN", entity: "STORE_TO_GLN", key: "0388", product_id: "tgdp.transaction_activity", mailbox_id: "MB-HRG-PROD-01", bpr_id: "BPR-4104", tpr_id: "TPR-70041", solution_id: "SOL-HRG-RETAIL-01", poc_id: "POC-BWHG-01", legal_entity_id: "LE-HRG-US-01", invitation_id: 7702, request_id: 55120, pi_unique_id: 900304, workflow_template_id: 3101, status_id: "ST-10421", work_order_id: "WO-5521", tracking_id: "TRK-PGH-0091", operation_ref: "ST-10421", name: "search_transactions", file_id: "SPEC-1001-A", search_token: "Store", schedule_id: "SCH-0007", template_name: "HRG_SUPPLIER_STD", po_number: "4500018832" };
    const o = {};
    for (const r of t.inputSchema.required ?? []) o[r] = ex[r] ?? "";
    if (!Object.keys(o).length && t.name === "search_transactions") o.key_value = S.meta.examples?.failedAsn?.shipmentId ?? "";
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
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_transactions","arguments":{"document_type":"856","status":"FAILED","from":"7d"}}}'</pre>
        <p class="small muted">Client tokens are issued per application. OAuth with PKCE through the Aviator AKS gateway is the target pattern.</p>
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

  // ---------- Copilot style client (simulated) ----------
  S.cps = { side: false };
  const CPS_AGENT = "Harborview B2B Operations";
  function cpsCard(p) {
    const st = S.plans.find((x) => x.planId === p.planId)?.status ?? p.planStatus ?? p.status;
    const cks = p.validation?.checks ?? [];
    const pending = st === "PENDING_APPROVAL";
    const fact = (k, v) => `<div class="k">${esc(k)}</div><div class="v">${v}</div>`;
    return `<div class="cop-card"><div class="cop-card-h"><span>Approval required</span><span class="cop-st ${pending ? "p" : st === "REJECTED" ? "r" : "a"}">${pending ? "Pending" : esc(String(st).replace("_", " ").toLowerCase())}</span></div>
      <div class="cop-card-t">${esc(p.summary)}</div>
      <div class="cop-facts">${fact("Target", `<span class="mono">${esc(p.target)}</span>`)}${cks.length ? fact("Checks", `${cks.filter((c) => c.result === "PASS").length} of ${cks.length} passed`) : ""}${fact("Plan", `<span class="mono">${esc(p.planId)}</span>`)}${fact("Expires", esc(new Date(p.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })))}</div>
      ${pending ? `<div class="cop-card-a"><button class="cop-btn dark" data-approve="${p.planId}">Approve</button><button class="cop-btn" data-reject="${p.planId}">Reject</button></div>` : ""}</div>`;
  }
  function cpsItem(c, m, mi) {
    if (m.role === "user") return `<div class="cop-u"><div class="cop-ub">${esc(m.text)}</div></div>`;
    const done = !m.thinking && (m.text || m.error);
    const last = mi === c.items.length - 1;
    const prevUser = [...c.items.slice(0, mi)].reverse().find((x) => x.role === "user")?.text ?? "";
    return `<div class="cop-b">${nativeActivity("copilot", m, mi)}
      ${m.error ? `<div class="cop-err">${esc(m.error)}</div>` : ""}
      ${m.text ? `<div class="cop-md md">${md(m.text)}</div>` : ""}
      ${m.plans.map(cpsCard).join("")}
      ${done ? `<div class="cop-acts"><button title="Copy" data-copy="${esc(m.text)}">${ic("copy")}</button><button title="Like">${ic("thumbup")}</button><button title="Dislike">${ic("thumbdown")}</button><button title="Regenerate" data-prompt="${esc(prevUser)}">${ic("refresh")}</button><button title="Share">${ic("share")}</button>${last ? `<span class="cop-disc">AI-generated content may be incorrect</span>` : ""}</div>` : ""}</div>`;
  }
  function cpsChat(c, agentId, avail, blocked) {
    const a = agent(agentId);
    const first = (S.meta.persona.name || "").split(" ")[0];
    const label = c.label ?? (agentId === "context-assistant" ? "Copilot" : a?.name ?? "Copilot");
    const empty = !c.items.length ? (c.label ? `<div class="cop-hello"><div class="cop-agav">${esc(initials(c.label))}</div><h1>${esc(c.label)}</h1><p class="cop-agd">Built in Copilot Studio · Trading Grid Context Connectors</p></div>` : `<div class="cop-hello"><h1>Hi ${esc(first)}, how can I help?</h1></div>`) : "";
    const starters = !c.items.length ? `<div class="cop-starters">${(c.label ? ["Which stores were affected by short shipments this week?", "Show Crestline orders still waiting for a 945"] : stagePrompts("copilot") ?? (a?.starters ?? []).slice(0, 4).map(promptOf)).map((p) => `<button class="cop-starter" data-prompt="${esc(p)}">${esc(p)}</button>`).join("")}</div>` : "";
    const dis = c.busy ? "disabled" : "";
    return `<header class="cop-top"><button class="cop-round cop-menu" data-copside="1" title="Menu">${ic("menu")}</button>
        <label class="cop-pick"><select data-cpsagent>${avail.map((x) => `<option value="${x.id}" ${x.id === agentId ? "selected" : ""}>${esc(x.id === "context-assistant" ? "Copilot" : x.name)}</option>`).join("")}</select><span>${esc(label)}</span>${ic("chev")}</label>
        <span class="cop-sp"></span><span class="cop-iq" title="Work IQ">Work IQ <i>Auto</i>${ic("chev")}</span>
        <button class="cop-round" data-newconv="${c.key}" title="New chat">${ic("compose")}</button></header>
      ${blocked ? `<div class="cop-warn">Trading Grid access for this client is suspended by the Harborview administrator.</div>` : ""}
      <div class="cop-msgs"><div class="cop-col">${empty}${c.items.map((m, mi) => cpsItem(c, m, mi)).join("")}</div></div>
      <div class="cop-foot">${starters}<form class="cop-comp" data-compose><textarea rows="1" placeholder="Message Copilot" ${dis}></textarea>
          <div class="cop-crow"><button type="button" class="cop-plus" title="Add content">${ic("plus")}</button><button type="button" class="cop-tool" title="Tools">${ic("sliders")}<span>Tools</span></button><span class="cop-sp"></span><button type="button" class="cop-mic" title="Dictate">${ic("mic")}</button><button class="cop-send" ${dis} title="Send">${ic("up")}</button></div></form>
        <div class="cop-sim">Simulated client · Trading Grid Context Connectors</div></div>`;
  }
  function pageCopilot() {
    const eco = "copilot-studio";
    const avail = studioAgents().filter((a) => S.deploy?.agents.find((x) => x.agentId === a.id)?.clients[eco]?.published && !S.deploy.agents.find((x) => x.agentId === a.id).clients[eco].blocked);
    const agentId = "context-assistant";
    let pub = null; try { pub = JSON.parse(sessionStorage.getItem("tg-cps-agent") || "null"); } catch {}
    const custom = pub && qs().get("agent") === "cps-custom";
    const key = custom ? `ext:${eco}:cps-custom` : `ext:${eco}:${agentId}`;
    const c = conv(key, agentId, eco);
    if (custom) { c.label = pub.name; S.ctxFor[key] = () => [`Application: Microsoft 365 Copilot. The user is chatting with "${pub.name}", an agent Harborview built in Copilot Studio and published to Copilot and Teams.`, `Agent instructions: ${pub.instructions.join(" ")}`, "Answer as this agent. Show results directly; do not draft or post a channel message.", `Today: ${new Date().toISOString().slice(0, 10)}.`].join("\n"); }
    const blocked = (S.meta.clientStatus[eco] ?? "ACTIVE") !== "ACTIVE";
    mounts[key] = (cc) => cpsChat(cc, agentId, avail, blocked);
    (S.conFor ??= {})[key] = "context";
    const chats = Object.values(S.convs).filter((x) => x.host === eco && x.items.length).map((x) => [x.agentId, x.items.find((i) => i.role === "user")?.text ?? ""]);
    const nav = [["compose", "New chat", `data-newconv="${key}"`], ["search", "Search", ""], ["apps", "Agents", ""], ["notebook", "Notebooks", ""], ["task", "Tasks", ""]];
    return `<div class="cop ${S.cps.side ? "side-open" : ""}">
      <aside class="cop-side"><div class="cop-brand"><span>Copilot</span><span class="cop-tiny">simulated</span><span class="cop-sp"></span><button class="cop-ib" title="Apps">${ic("grid")}</button><button class="cop-ib cop-x" data-copside="0" title="Close">${ic("x")}</button></div>
        ${nav.map(([i, l, h]) => `<button class="cop-nav" ${h}>${ic(i)}<span>${l}</span></button>`).join("")}
        <div class="cop-sec">Pinned</div><div class="cop-agents"><button class="cop-chatlink ${!custom ? "on" : ""}" data-cpsuse="context-assistant">${ic("sparkle")}<span>Copilot</span></button></div>
        ${pub ? `<div class="cop-sec">Agents</div><div class="cop-agents"><button class="cop-chatlink ${custom ? "on" : ""}" data-cpsuse="cps-custom"><i>${esc(initials(pub.name))}</i><span>${esc(pub.name)}</span></button></div>` : ""}
        ${chats.length ? `<div class="cop-sec">Chats</div>${chats.map(([id, t]) => `<button class="cop-chatlink" data-cpsuse="${id}"><span>${esc(t.slice(0, 48))}</span></button>`).join("")}` : ""}
        <div class="cop-prof"><div class="avatar sm">JL</div><div><div class="n">${esc(S.meta.persona.name)}</div><div class="s">Harborview Retail Group</div></div></div></aside>
      <div class="cop-scrim" data-copside="0"></div>
      <main class="cop-main" data-conv="${key}">${mounts[key](c)}</main></div>`;
  }

  // ---------- Ecosystem clients (simulated), one renderer with a skin per ecosystem ----------
  // Stage scenarios (OTW 2026). Clients without an entry show "Scenario pending" on the stage.
  const SCN = {
    teams: { n: 1, sugg: ["Which partners go live this month?", "Show open onboarding requests by owner", "Which suppliers have test traffic but no production traffic?"], connector: "agents", title: "Colleagues onboarding a trading partner", setup: "Jordan Lee and Morgan Chen track Cedar Valley Furniture's onboarding, due to go live Oct 29, with the Trading Grid Agent in Teams.", env: ["Microsoft Teams group chat", "Trading Grid Agent via Copilot Studio", "Delegated users"],
      turns: [{ text: "How is onboarding progressing for Cedar Valley Furniture?", as: "Jordan Lee" }, { text: "Raise a change request for Cedar Valley's inbound 810 invoice map, using the spec on file.", as: "Morgan Chen" }, { approve: true }] },
    servicenow: { n: 2, sugg: ["Summarize inbound failures in the last 24 hours", "Which partner certificates expire this quarter?", "Show other open incidents for Northfield Foods"], connector: "agents", title: "AS2 certificate failure for one partner", setup: "Northfield Foods' AS2 signing certificate expired and inbound 855, 856 and 810 files are being rejected. Jordan tracks the fix from incident INC0041873 in Service Operations Workspace, with Now Assist calling the Trading Grid Agent.", env: ["ServiceNow Service Operations Workspace", "Now Assist", "Jordan Lee, delegated"],
      turns: [{ text: "What is the status of the AS2 certificate fix for Northfield Foods?" }, { text: "Add a work note to this incident summarizing the failure, the fix in progress under ST-10500 and WO-5600, and who owns it." }, { text: "Is there an estimate for when the new certificate will go live?" }] },
    copilot: { n: 5, sugg: ["Which 940s have no 945 yet?", "Show Crestline shipment volume by day", "Summarize Crestline 214 delays this week"], connector: "context", title: "From Copilot to a published Copilot Studio agent", setup: "Crestline Logistics, Harborview's 3PL, ships store orders from the distribution center. Distribution operations checks Crestline's shipment confirmations in Copilot, builds a daily short-shipment monitor in Copilot Studio, tests and publishes it, then uses it back in Copilot.", env: ["Microsoft Copilot and Copilot Studio", "Trading Grid connector", "Jordan Lee, delegated"],
      turns: [{ text: "Crestline Logistics ships our store orders from the distribution center. Show yesterday's shipment confirmations (945s) against the warehouse shipping orders (940s) we sent them." }, { src: "/c/copilotstudio", into: "[data-studiodesc]", then: "[data-studiocreate]", text: "Every morning, compare Crestline 945s to their 940s and post short shipments by order to the Distribution Ops channel." }, { click: "[data-studiotest]" }, { text: "Run the monitor for yesterday: match each Crestline 945 to its 940 and list the orders that shipped short, with ordered and shipped quantities by store." }, { click: "[data-studiopublish]" }, { src: "/copilot?agent=cps-custom", text: "Which orders shipped short from Crestline this week, and which stores did they affect?" }] },
    joule: { n: 4, sugg: ["Which Pinegate POs ship this week?", "Compare Pinegate's 855 rate with similar suppliers", "Show Pinegate's 997 acknowledgment history"], connector: "agents", title: "Supplier compliance: missing PO acknowledgments", setup: "Pinegate Home went live on Trading Grid 65 days ago. Compliance reviews Pinegate's purchase orders in S/4HANA, opens an unconfirmed PO and asks Joule, which calls the Trading Grid Agent and combines its evidence with SAP order values and the supplier agreement.", env: ["SAP S/4HANA, Monitor Supplier Confirmations", "Joule", "SAP service identity: status and references only"],
      turns: [{ s4open: true }, { text: "Pinegate hasn't confirmed this purchase order. Is this a one-off, or has Pinegate been missing PO acknowledgments since it went live?" }, { text: "Which Pinegate POs already have an ASN in Trading Grid but never received the mandatory PO acknowledgment (855)? Show the evidence.", on: "phone" }, { text: "Our agreement requires an 855 within 24 hours of each PO. For the POs on this list, which breached it, what order value is affected, and what compliance fee applies?" }] },
    gemini: { n: 6, sugg: ["What can the Error Analysis agent return for a failed 810?", "Show the access grant for our agent identity", "Which agents help with mapping questions?"], connector: "agents", title: "Gemini agents that call Trading Grid agents", setup: "Priya Raman, Harborview's AI transformation lead, builds a Gemini Enterprise agent that calls Trading Grid agents every morning, analyzes failed transactions and stores the results in BigQuery for the supplier operations team.", env: ["Gemini Enterprise", "Priya Raman, AI transformation lead", "Agent service identity under GRT-HRG-2026-014"],
      turns: [{ text: "Which Trading Grid agents do we have access to, and what can each one do?" }, { text: "Build a Gemini agent that runs every morning at 8 AM, takes the failed transaction report from Trading Grid Insights, sends each failure to the Trading Grid Error Analysis agent, and stores the analysis in BigQuery for further analysis." }, { text: "Publish the agent to Gemini Enterprise for the supplier operations team." }, { text: "Run the agent now on the latest failed Northfield Foods 856." }] },
    chatgpt: { n: 3, sugg: ["Which change requests were completed this week?", "List partners with missing 997s yesterday", "Summarize Trading Grid activity for the last 7 days"], connector: "context", title: "Recurring follow-up task", setup: "B2B operations runs a scheduled ChatGPT task each weekday morning to review work orders on hold, then follows up with the suppliers who owe a test file.", env: ["ChatGPT Enterprise", "Trading Grid connector", "Jordan Lee, delegated"],
      turns: [{ text: "Every weekday at 8 AM, check Trading Grid for work orders on hold and tell me who owns the next action on each." }, { text: "Draft an email to Sunfield's EDI contact asking for the 945 test file our mapping team needs to finish the unit of measure change." }, { text: "Who is the contact at Rocky Coast for their test file?" }] },
    claude: { n: 7, sugg: ["Which Meridian invoices exceed the shipped quantity?", "Chart Meridian's fill rate by week", "Compare Meridian with our other personal care suppliers"], connector: "context", title: "Accounts payable reconciliation built in Claude", setup: "Harborview's accounts payable team reconciles Meridian Personal Care's EDI documents by hand and keeps finding quantity discrepancies. Priya Raman builds a live reconciliation dashboard in Claude on Trading Grid data, publishes it to the team, adds a daily invoice check and a weekly reconciliation agent.", env: ["Claude", "Trading Grid Context Connectors", "Priya Raman, delegated"],
      turns: [{ text: "Our accounts payable team reconciles Meridian Personal Care's EDI documents by hand and keeps finding quantity discrepancies. Build an accounts payable dashboard for Meridian covering the last 90 days: ordered (850), shipped (856) and invoiced (810) quantities by purchase order, with the exceptions highlighted." }, { click: "[data-artpub]" }, { click: "[data-artpubgo]" }, { text: "Every day at 7 AM, check Meridian's new invoices for any that have no shipment (ASN) matching their purchase order, and flag them in the dashboard for manual review." }, { text: "Create an agent that runs a weekly reconciliation roll-up for Meridian every Monday, monitors the health of their B2B transactions and sends the accounts payable team a summary." }] },
    tgo: { n: 8, sugg: ["Which maps changed in the last 30 days?", "Find failed ASNs from yesterday", "Which cross-references do the most maps use?"], connector: "native", title: "Mapping intelligence", setup: "A new store opens next week. STORE_TO_GLN must include it before the store's first ASN arrives.", env: ["Trading Grid Online, TG Insights", "TG Aviator", "Jordan Lee, signed in"],
      turns: [{ text: "Which maps and partners use STORE_TO_GLN, and what happens to an ASN for a store that isn't in it?" }, { text: "Prepare the STORE_TO_GLN entry for store 0844 Lynchburg, GLN 0614141084470." }, { approve: true }] },
  };
  const CLIENTS = {
    teams: { connector: "agents", name: "Microsoft Teams", host: "copilot-studio", ph: "Type a message", auto: "Supplier Onboarding", bot: "TG",
      hello: () => "Ask Trading Grid about partners, onboarding and transactions.", sim: "Simulated client · Trading Grid Agent Connectors, published to Teams through Copilot Studio" },
    joule: { connector: "agents", name: "SAP S/4HANA", host: "sap-joule", ph: "Message Joule", auto: "Joule", ws: "s4",
      hello: (n) => `Hello ${n}, how can I help you?`, sim: "Simulated client · Trading Grid Agent Connectors via SAP BTP destination",
      starters: (d, sel) => sel ? [`When will purchase order ${sel.po} from ${sel.supplier} arrive?`, `Has ${sel.supplier} confirmed purchase order ${sel.po}?`, `Show every document exchanged for purchase order ${sel.po}.`] : [] },
    gemini: { connector: "agents", name: "Gemini Enterprise", host: "gemini-enterprise", ph: "Ask Gemini", auto: "Gemini", who: "Priya Raman",
      hello: (n) => `Hi ${n}`, sub: "Where should we start?", sim: "Simulated client · Trading Grid Agent Connectors" },
    servicenow: { connector: "agents", name: "ServiceNow", host: "servicenow", ph: "Ask Now Assist", auto: "Now Assist", ws: "servicenow",
      tabs: [["home", "Home"], ["inbox", "My work"], ["sparkle", "Now Assist", 1], ["agent", "Profile"]],
      hello: (n) => `Hi ${n}, how can I help?`, sim: "Simulated client · Trading Grid Agent Connectors via AI Agent Fabric",
      starters: (d) => d ? [`Summarize incident ${d.number} with Trading Grid evidence.`, `Which ${d.partner.replace(/ Inc$/, "")} documents failed, and what business is affected?`, `What is the status of certificate renewal ${d.changeRequest}?`] : [] },
    copilotstudio: { connector: "context", name: "Copilot Studio", host: "copilot-studio", ph: "Type your message", auto: "Test your agent", ws: "studio",
      hello: () => "Test your agent", noStarters: true, sim: "Simulated client · Trading Grid Context Connectors" },
    chatgpt: { connector: "context", name: "ChatGPT Enterprise", host: "chatgpt-enterprise", ph: "Ask anything", auto: "ChatGPT",
      hello: () => "What can I help with?", sim: "Simulated client · Trading Grid Context Connectors" },
    claude: { connector: "context", name: "Claude", host: "claude-ui", ph: "Reply to Claude", ph0: "How can I help you today?", auto: "Claude", who: "Priya Raman",
      hello: (n) => `${new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, ${n}`, sim: "Simulated client · Trading Grid Context Connectors" },
  };
  function clCard(p) {
    const st = S.plans.find((x) => x.planId === p.planId)?.status ?? p.planStatus ?? p.status;
    const pending = st === "PENDING_APPROVAL";
    const cks = p.validation?.checks ?? [];
    const f = (k, v) => `<div class="k">${esc(k)}</div><div class="v">${v}</div>`;
    return `<div class="cl-card"><div class="cl-card-h"><span>Approval required</span><span class="cl-st ${pending ? "p" : st === "REJECTED" ? "r" : "a"}">${pending ? "Pending" : esc(String(st).replace("_", " ").toLowerCase())}</span></div>
      <div class="cl-card-t">${esc(p.summary)}</div><div class="cl-facts">${f("Target", `<span class="mono">${esc(p.target)}</span>`)}${cks.length ? f("Checks", `${cks.filter((c) => c.result === "PASS").length} of ${cks.length} passed`) : ""}${f("Plan", `<span class="mono">${esc(p.planId)}</span>`)}</div>
      ${pending ? `<div class="cl-card-a"><button class="cl-btn pri" data-approve="${p.planId}">Approve</button><button class="cl-btn" data-reject="${p.planId}">Reject</button></div>` : ""}</div>`;
  }
  const hhmm = (t) => new Date(t ?? Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const initials = (n) => String(n).replace(/,.*$/, "").split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("") || "AG";
  const CL_ACTS = { chatgpt: [["copy", "Copy"], ["thumbup", "Good response"], ["thumbdown", "Bad response"], ["speaker", "Read aloud"], ["share", "Share"], ["refresh", "Try again"]],
    claude: [["copy", "Copy"], ["thumbup", "Give positive feedback"], ["thumbdown", "Give negative feedback"], ["refresh", "Retry"]],
    gemini: [["thumbup", "Good response"], ["thumbdown", "Bad response"], ["refresh", "Redo"], ["share", "Share"], ["copy", "Copy"], ["more", "More"]],
    joule: [["copy", "Copy"], ["thumbup", "Helpful"], ["thumbdown", "Not helpful"]],
    servicenow: [["copy", "Copy"], ["thumbup", "Helpful"], ["thumbdown", "Not helpful"]] };
  const nextWeekday8 = () => { const d = new Date(); d.setHours(8, 0, 0, 0); do d.setDate(d.getDate() + 1); while (d.getDay() === 0 || d.getDay() === 6); return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + ", 8:00 AM"; };
  // ChatGPT scheduled task details, opened from the task card.
  // BigQuery confirmation after the published Gemini agent runs: the row it wrote, from the answer's record block.
  function bqCard(id, c, m, mi) {
    if (id !== "gemini" || !S.gem?.published || m.thinking || !m.text) return "";
    const prev = [...c.items.slice(0, mi)].reverse().find((x) => x.role === "user")?.text ?? "";
    if (!/^(run|test)/i.test(prev)) return "";
    const rec = m.text.match(/```record\n([\s\S]*?)```/)?.[1] ?? "";
    const rows = rec.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((r) => r.length >= 2 && r[0] && !/^(title|status):/i.test(r[0]));
    if (!rows.length) return "";
    return `<div class="bq-card"><div class="bq-h"><span class="bq-ic">${ic("chart")}</span><div><b>BigQuery</b><span>1 row inserted into <code>${esc(GEM_AGENT.table)}</code></span></div><em>Succeeded</em></div>
      <div class="bq-t"><table><thead><tr>${rows.map((r) => `<th>${esc(r[0].toLowerCase().replace(/[^a-z0-9]+/g, "_"))}</th>`).join("")}</tr></thead><tbody><tr>${rows.map((r) => `<td>${esc(r.slice(1).join(", "))}</td>`).join("")}</tr></tbody></table></div></div>`;
  }
  function cgTaskModal(prompt) {
    const runs = [0, 1, 2].map((k) => { const d = new Date(); d.setHours(8, 0, 0, 0); let n = 0; while (n <= k) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n++; } return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + ", 8:00 AM"; });
    return `<div class="cg-ov" data-cgtask="0"><div class="cg-modal" data-stop="1"><div class="cg-mh"><b>Scheduled task</b><button class="cg-x" data-cgtask="0" title="Close">${ic("x")}</button></div>
      <div class="cg-f"><span>Name</span><b>Work orders on hold</b></div>
      <div class="cg-f"><span>Schedule</span><b>Weekdays at 8:00 AM (ET)</b></div>
      <div class="cg-f"><span>Instructions</span><b>${esc(prompt)}</b></div>
      <div class="cg-f"><span>Apps</span><b>Trading Grid</b></div>
      <div class="cg-f"><span>Notify</span><b>Push and email</b></div>
      <div class="cg-f"><span>Next runs</span><b>${runs.map(esc).join("<br>")}</b></div>
      <div class="cg-ma"><button class="cg-btn" data-cgtask="0">Pause</button><button class="cg-btn pri" data-cgtask="0">Done</button></div></div></div>`;
  }
  function clItem(id, K, c, m, mi) {
    if (m.role === "user" && id === "teams" && m.as && m.as !== S.meta.persona.name) return `<div class="cl-b other"><div class="cl-av round o">${esc(initials(m.as))}</div><div class="cl-bb"><div class="cl-meta">${esc(m.as)} <span>${hhmm(m.t)}</span></div><div class="cl-md">${esc(m.text)}</div></div></div>`;
    if (m.role === "user") return `<div class="cl-u">${id === "teams" ? `<div class="cl-meta r">${hhmm(m.t)}</div>` : ""}<div class="cl-ub">${esc(m.text)}</div></div>`;
    const done = !m.thinking && (m.text || m.error);
    const last = mi === c.items.length - 1;
    const prevUser = [...c.items.slice(0, mi)].reverse().find((x) => x.role === "user")?.text ?? "";
    const acts = (CL_ACTS[id] ?? []).map(([i, t]) => `<button title="${t}" ${i === "copy" ? `data-copy="${esc(m.text)}"` : i === "refresh" ? `data-prompt="${esc(prevUser)}"` : ""}>${ic(i)}</button>`).join("");
    const task = id === "chatgpt" && /^every (weekday|day|week)/i.test(prevUser) ? `<div class="cl-task">${ic("calendar")}<div><b>Task scheduled</b><span>Weekdays at 8:00 AM · next run ${nextWeekday8()}</span></div><button class="cl-taskbtn" data-cgtask="1">View task</button></div>${S.cgTask ? cgTaskModal(prevUser) : ""}` : "";
    const artCard = (id === "claude" && m.steps?.some((x) => x.name === "tgi_get_quantity_reconciliation" && x.done) ? `<button class="cl-artcard" data-artopen="1">${ic("chart")}<div><b>Meridian accounts payable reconciliation</b><span>Interactive artifact</span></div></button>` : "")
      + (id === "claude" && done && /^every day/i.test(prevUser) ? `<div class="cl-sched">${ic("clock")}<div><b>Daily check scheduled</b><span>Every day at 7:00 AM · flags Meridian invoices with no matching ASN in the dashboard</span></div></div>` : "")
      + (id === "claude" && done && /^create an agent/i.test(prevUser) ? `<div class="cl-sched">${ic("agent")}<div><b>Agent created: Meridian weekly reconciliation</b><span>Mondays 7:00 AM · roll-up and B2B health summary to accounts-payable@harborviewretail.com</span></div></div>` : "");
    const body = `${task}${subLine(m, id === "teams")}${nativeActivity(id, m, mi)}${m.error ? `<div class="cl-err">${esc(m.error)}</div>` : ""}${m.text ? `<div class="cl-md md">${md(m.text)}</div>` : ""}${m.html ?? ""}${m.plans.map(clCard).join("")}${artCard}${bqCard(id, c, m, mi)}`;
    if (id === "teams") return `<div class="cl-b"><div class="cl-av sq">${esc(initials(c.botName))}</div><div class="cl-bb"><div class="cl-meta">${esc(c.botName)} <span>${hhmm(m.t0)}</span></div>${body}${done ? `<div class="cl-aig">AI generated</div>` : ""}</div></div>`;
    const disc = id === "claude" && last && done ? `<span class="cl-sp"></span><span class="cl-disc">Claude can make mistakes. Please double-check responses.</span>` : "";
    return `<div class="cl-b">${id === "servicenow" ? `<div class="cl-bh">${ic("sparkle")}<b>Now Assist</b></div>` : ""}<div class="cl-bb">${body}${done && acts ? `<div class="cl-acts">${acts}${disc}</div>` : ""}</div></div>`;
  }
  function clComposer(id, K, c) {
    const dis = c.busy ? "disabled" : "";
    const ph = !c.items.length && K.ph0 ? K.ph0 : K.ph;
    const ta = `<textarea rows="1" placeholder="${esc(ph)}" ${dis}></textarea>`;
    const b = (i, t, cls = "") => `<button type="button" class="cl-ib ${cls}" title="${t}">${ic(i)}</button>`;
    const send = (i) => `<button class="cl-send" ${dis} title="Send">${ic(i)}</button>`;
    const parts = {
      teams: `${b("plus", "Actions and apps", "cl-lead")}${ta}${b("smile", "Emoji", "dt")}${b("plus", "Actions and apps", "dt")}${b("format", "Format", "dt")}${b("mic", "Record audio", "ph")}<span class="cl-vsep dt"></span>${send("send")}`,
      chatgpt: `${b("plus", "Add files and more", "cl-lead")}${ta}${b("mic", "Dictate")}<button type="button" class="cl-voice" title="Use voice mode">${ic("wave")}</button>${send("up")}`,
      claude: `${ta}<div class="cl-crow">${b("plus", "Add files")}${b("sliders", "Search and tools")}${b("clock", "Extended thinking")}<span class="cl-sp"></span><span class="cl-model">Opus 5.5 ${ic("chev")}</span>${send("up")}</div>`,
      gemini: `${ta}<div class="cl-crow">${b("plus", "Upload files")}<button type="button" class="cl-chip" title="Tools">${ic("sliders")}<span>Tools</span></button><span class="cl-sp"></span><span class="cl-model">Fast ${ic("chev")}</span>${b("mic", "Use microphone")}${send("up")}</div>`,
      joule: `${b("plus", "Add attachment", "cl-lead")}${ta}${send("send")}`,
      servicenow: `${b("plus", "Attach", "cl-lead")}${ta}${send("send")}`,
    };
    return `<form class="cl-comp" data-compose>${parts[id] ?? parts.servicenow}</form>`;
  }
  function clHeader(id, K, c, title, a) {
    const nc = `data-newconv="${c.key}" title="New chat"`;
    const titled = c.items.find((x) => x.role === "user")?.text ?? "";
    switch (id) {
      case "teams": return `<header class="cl-top"><button class="cl-ib cl-menu" data-copside="1" title="Back">${ic("back")}</button><div class="cl-av sq">${esc(initials(title))}</div>
        <div class="cl-title"><span>${esc(title)}</span><nav class="cl-ttabs"><b>Chat</b><span>About</span></nav></div><span class="cl-sp"></span><button class="cl-ib dt" title="Pop out chat">${ic("popout")}</button><button class="cl-ib" ${nc}>${ic("more")}</button></header>`;
      case "chatgpt": return `<header class="cl-top"><button class="cl-ib cl-menu" data-copside="1" title="Open sidebar">${ic("menu")}</button><div class="cl-title"><span>${esc(title)}</span>${ic("chev")}</div><span class="cl-sp"></span>
        ${c.items.length ? `<button class="cl-pill dt" title="Share">${ic("share")}<span>Share</span></button>` : ""}<button class="cl-ib dt" title="More">${ic("more")}</button><button class="cl-ib ph" ${nc}>${ic("compose")}</button></header>`;
      case "claude": return `<header class="cl-top"><button class="cl-ib cl-menu" data-copside="1" title="Open sidebar">${ic("menu")}</button><div class="cl-title">${titled ? `<span>${esc(titled.length > 46 ? titled.slice(0, 46) + "..." : titled)}</span>${ic("chev")}` : `<span class="ph">${esc(title)}</span>`}</div><span class="cl-sp"></span>
        ${c.items.length ? `<button class="cl-pill dt" title="Share">${ic("share")}<span>Share</span></button>` : ""}<button class="cl-ib ph" ${nc}>${ic("compose")}</button></header>`;
      case "gemini": return `<header class="cl-top"><button class="cl-ib cl-menu" data-copside="1" title="Main menu">${ic("menu")}</button><div class="cl-title"><span>${esc(title)}</span></div><span class="cl-sp"></span>
        <button class="cl-ib ph" ${nc}>${ic("compose")}</button><div class="cl-av round">J</div></header>`;
      case "joule": return `<header class="cl-top"><button class="cl-ib ph" title="Close">${ic("x")}</button><div class="cl-title"><span>${esc(title)}</span></div><span class="cl-sp"></span><button class="cl-ib" ${nc}>${ic("compose")}</button><button class="cl-ib dt" title="History">${ic("clock")}</button><button class="cl-ib dt" title="Expand">${ic("expand")}</button><button class="cl-ib dt" title="Close">${ic("x")}</button></header>`;
      default: return `<header class="cl-top"><div class="cl-title">${ic("sparkle")}<span>${esc(title)}</span></div><span class="cl-sp"></span><button class="cl-ib" ${nc}>${ic("compose")}</button><button class="cl-ib dt" title="Conversation history">${ic("clock")}</button><button class="cl-ib dt" title="More">${ic("more")}</button><button class="cl-ib dt" title="Close">${ic("x")}</button></header>`;
    }
  }
  // ---------- Claude artifact: AP quantity variance built from the Trading Grid reconciliation tool ----------
  S.art = { supplier: "", open: {} };
  function artData(c) {
    for (let i = c.items.length - 1; i >= 0; i--) { const m = c.items[i]; const st = m.steps?.filter((x) => x.name === "tgi_get_quantity_reconciliation" && x.done && x.envelope?.result).pop(); if (st) return st.envelope.result; }
    return null;
  }
  const n0 = (v) => (v == null ? "-" : Number(v).toLocaleString());
  function artView(d, c) {
    S.art.made = true;
    const said = (re) => c.items.some((m) => m.role === "user" && re.test(m.text));
    const flagOn = said(/no (matching )?shipment|without .*(asn|shipment)|flag them/i), weeklyOn = said(/weekly/i);
    const su = d.suppliers[0] ?? { supplier: "Meridian Personal Care", purchaseOrders: 0, ordered: 0, shipped: 0, invoiced: 0, shortShipped: 0, overInvoiced: 0, invoiceBeforeAsn: 0, invoiceWithoutAsn: 0 };
    const kpi = (l, v, n, cls = "") => `<div class="ak ${cls}"><span>${l}</span><b>${n0(v)}</b>${n ? `<em>${n}</em>` : ""}</div>`;
    const wk = d.weekly ?? [];
    const mx = Math.max(1, ...wk.map((w) => w.ordered));
    const bars = wk.map((w) => `<div class="aw"><div class="awb"><i style="height:${(w.ordered / mx) * 100}%"></i><i class="s" style="height:${(w.shipped / mx) * 100}%"></i><i class="v" style="height:${(w.invoiced / mx) * 100}%"></i></div><span>${esc(w.weekOf.slice(5))}</span></div>`).join("");
    const flagged = d.rows.filter((r) => r.invoiceWithoutAsn);
    const tab = S.art.tab ?? "ex";
    const doc = (t, id, stt) => `<div class="ad"><b>${t}</b><span class="mono">${esc(id ?? "Not received")}</span><i>${esc(stt ?? "")}</i></div>`;
    const rows = tab === "fl" ? flagged : d.rows;
    const exTable = `<table class="art-tb"><thead><tr><th>PO</th><th>Ordered</th><th>Shipped</th><th>Invoiced</th><th>Issue</th></tr></thead><tbody>
        ${rows.slice(0, 40).map((r) => `<tr class="art-row ${r.invoiceWithoutAsn ? "fl" : ""}" data-artrow="${r.po}"><td class="mono">${r.po}</td><td>${n0(r.ordered)}</td><td>${n0(r.shipped)}</td><td>${n0(r.invoiced)}</td><td>${r.invoiceWithoutAsn ? `<span class="art-flag">Invoice, no ASN</span>` : r.invoiceBeforeAsn ? `<span class="art-tag">Invoice before ASN</span>` : (r.shipVariance ?? 0) < 0 ? `<span class="art-tag">Short ${-r.shipVariance}</span>` : (r.invoiceVariance ?? 0) > 0 ? `<span class="art-tag">Over-invoiced ${r.invoiceVariance}</span>` : ""}</td></tr>
          ${S.art.open[r.po] ? `<tr class="art-drill"><td colspan="5"><div class="ads">${doc("850 Purchase order", r.documents["850"], "Sent")}${doc("856 Ship notice", r.documents["856"], r.status["856"])}${doc("810 Invoice", r.documents["810"], r.status["810"])}</div></td></tr>` : ""}`).join("")}</tbody></table>`;
    const roll = weeklyOn && wk.length ? (() => { const last = wk[wk.length - 1], avg = wk.reduce((a, w) => a + w.shortShipped + w.overInvoiced + w.invoiceBeforeAsn + w.invoiceWithoutAsn, 0) / wk.length, ex = last.shortShipped + last.overInvoiced + last.invoiceBeforeAsn + last.invoiceWithoutAsn; const st = (l, ok) => `<div class="ah2 ${ok ? "ok" : "warn"}"><i></i><span>${l}</span><em>${ok ? "Healthy" : "Watch"}</em></div>`;
      return `<h3>Weekly roll-up <span>Agent runs Mondays 7:00 AM</span></h3><div class="art-roll">${kpi("Exceptions this week", ex, `13-week average ${avg.toFixed(1)}`, ex > avg ? "hl" : "")}${kpi("Fill rate", Math.round((last.shipped / Math.max(1, last.ordered)) * 100) + "%", "shipped vs ordered")}<div class="ahs">${st("ASN before invoice", last.invoiceBeforeAsn + last.invoiceWithoutAsn === 0)}${st("Shipped matches ordered", last.shortShipped <= 1)}${st("Invoiced matches shipped", last.overInvoiced === 0)}</div></div>`; })() : "";
    return `<div class="art-h"><span class="art-t">Meridian accounts payable reconciliation</span><span class="art-v">${S.art.published ? "Published" : "Interactive artifact"}</span><span class="cl-sp"></span><span class="art-seg"><b>Preview</b><span>Code</span></span><button class="art-pubbtn" data-artpub="1">${S.art.published ? "Share" : "Publish"}</button><button class="art-x" data-artclose="1" title="Close">${ic("x")}</button></div>
      <div class="art-b"><h2>Meridian Personal Care</h2><div class="art-sub">Accounts payable reconciliation · last ${d.window.days} days · ${n0(su.purchaseOrders)} purchase orders · Trading Grid 850, 856, 810</div>
        <div class="art-k">${kpi("Ordered units", su.ordered)}${kpi("Shipped units", su.shipped, `${((su.shipped / Math.max(1, su.ordered)) * 100).toFixed(1)}% of ordered`)}${kpi("Invoiced units", su.invoiced, `${n0(su.invoiced - su.shipped)} above shipped`, su.invoiced > su.shipped ? "hl" : "")}${kpi("Invoices with no ASN", su.invoiceWithoutAsn, "need manual review", flagOn ? "hl" : "")}</div>
        <h3>Units by week <span class="art-lg"><i></i>Ordered <i class="s"></i>Shipped <i class="v"></i>Invoiced</span></h3><div class="art-w">${bars}</div>
        ${roll}
        <div class="art-tabs"><button class="${tab === "ex" ? "on" : ""}" data-arttab="ex">Exceptions by PO <span>${n0(d.exceptions)}</span></button>${flagOn ? `<button class="${tab === "fl" ? "on" : ""}" data-arttab="fl">Flagged for review <span class="red">${n0(su.invoiceWithoutAsn)}</span></button>` : ""}</div>
        ${exTable}</div>
      ${S.art.share ? `<div class="art-ov"><div class="art-modal" data-stop="1"><div class="art-mh"><b>${S.art.published ? "Published and shared" : "Publish artifact"}</b><button class="art-x" data-artshareclose="1">${ic("x")}</button></div>
        <p>${S.art.published ? "The accounts payable team can open the live dashboard. It refreshes from Trading Grid each time it opens." : "Publish the dashboard so colleagues can open it. Data refreshes from Trading Grid each time it opens."}</p>
        <div class="art-link">${ic("link")}<span>claude.ai/public/artifacts/harborview-meridian-ap</span>${S.art.published ? `<button class="rv-cpb" data-copy="https://claude.ai/public/artifacts/harborview-meridian-ap">${ic("copy")}<span class="cp-l">Copy link</span></button>` : ""}</div>
        <div class="art-ppl"><div class="art-p"><i>AP</i><div><b>Accounts Payable team</b><span>accounts-payable@harborviewretail.com</span></div><em>Can view</em></div><div class="art-p"><i>DW</i><div><b>Dana Whitfield</b><span>Accounts payable manager</span></div><em>Can view</em></div><div class="art-p"><i>JL</i><div><b>Jordan Lee</b><span>B2B operations</span></div><em>Can view</em></div></div>
        <div class="art-ma">${S.art.published ? `<button class="cg-btn pri" data-artshareclose="1">Done</button>` : `<button class="cg-btn" data-artshareclose="1">Cancel</button><button class="cg-btn pri" data-artpubgo="1">Publish and share</button>`}</div></div></div>` : ""}`;
  }
  function clChat(id, K, c, agentId, avail, blocked) {
    const a = agent(agentId);
    const first = (K.who ?? S.meta.persona.name ?? "").split(" ")[0];
    const title = agentId === "context-assistant" || agentId === "tg-aviator" ? K.auto : a?.name ?? K.auto;
    c.botName = id === "teams" ? (agentId === "tg-aviator" ? "Trading Grid Agent" : agentId === "context-assistant" ? "Trading Grid" : title) : K.auto;
    const custom = K.starters ? K.starters(S.scene?.[K.ws], wsSelected(K)) : null;
    const prompts = K.noStarters ? [] : stagePrompts(id) ?? (custom?.length ? custom : (a?.starters ?? []).slice(0, 4).map(promptOf));
    const starters = !c.items.length && prompts.length ? `<div class="cl-starters">${prompts.map((p) => `<button class="cl-starter" data-prompt="${esc(p)}">${esc(p)}</button>`).join("")}</div>` : "";
    const hello = !c.items.length ? `<div class="cl-hello">${id === "teams" ? `<div class="cl-av sq lg">${esc(initials(title))}</div><h2>${esc(title)}</h2>` : ""}<h1>${esc(K.hello(first))}</h1>${K.sub ? `<div class="cl-sub">${esc(K.sub)}</div>` : ""}</div>` : "";
    const disc = { chatgpt: "ChatGPT can make mistakes. Check important info.", gemini: "Gemini can make mistakes, so double-check it" }[id];
    const art = id === "claude" ? artData(c) : null;
    if (art && !S.art.hidden) return `<div class="art-split"><div class="art-chat">${clChatBody(id, K, c, title, a, hello, starters, disc)}</div><aside class="art">${artView(art, c)}</aside></div>`;
    return clChatBody(id, K, c, title, a, hello, starters, disc);
  }
  function clChatBody(id, K, c, title, a, hello, starters, disc) {
    const blocked = (S.meta.clientStatus[K.host] ?? "ACTIVE") !== "ACTIVE";
    return `${clHeader(id, K, c, title, a)}
      ${blocked ? `<div class="cl-warn">Trading Grid access for this client is suspended by the Harborview administrator.</div>` : ""}
      <div class="cl-msgs"><div class="cl-col">${hello}${c.items.map((m, mi) => clItem(id, K, c, m, mi)).join("")}</div></div>
      <div class="cl-foot">${starters}${clComposer(id, K, c)}${disc ? `<div class="cl-disc">${disc}</div>` : ""}
        ${K.tabs ? `<nav class="cl-tabs">${K.tabs.map(([i, l, on]) => `<button class="${on ? "on" : ""}">${ic(i)}<span>${esc(l)}</span></button>`).join("")}</nav>` : ""}
        <div class="cl-sim">${esc(K.sim)}</div></div>`;
  }
  S.scene = {}; S.ctxFor = {};
  const fdate = (iso) => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  const ago = (iso) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); const h = Math.floor(m / 60); return m < 60 ? `${m} min ago` : `${h} hr ${m % 60} min ago`; };
  function wsSelected(K) {
    if (K.ws !== "s4") return null;
    const d = S.scene.s4; if (!d) return null;
    return d.rows.find((r) => r.po === qs().get("po")) ?? d.rows.find((r) => r.po === d.selected) ?? d.rows[0];
  }
  const S4_ST = { "Not confirmed": "warn", Confirmed: "info", Shipped: "ok", Invoiced: "neutral" };
  const S4_IC = { warn: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.2h.01"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.8h.01"/>', ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12.2 2.8 2.8L16 9.5"/>', neutral: "" };
  const s4St = (st) => { const k = S4_ST[st] ?? "neutral"; return `<span class="s4-st ${k}">${S4_IC[k] ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${S4_IC[k]}</svg>` : ""}${esc(st)}</span>`; };
  /** Copilot Studio drafts an agent from the description (simulated generator). */
  function studioDraft(desc) {
    const partner = (desc.match(/\b(Crestline|Northfield|Pinegate|Meridian|Sunfield|Coastline|Summit)\b/i)?.[1] ?? "Crestline");
    const docs = desc.match(/\b(\d{3})s?\b.*?\b(\d{3})s?\b/);
    const [a, b] = docs ? [docs[1], docs[2]] : ["945", "940"];
    const channel = desc.match(/to the ([A-Z][\w ]+?) channel/)?.[1] ?? "Distribution Ops";
    const when = /every morning|daily|every day/i.test(desc) ? "Every day at 7:00 AM" : /weekday/i.test(desc) ? "Weekdays at 7:00 AM" : "Every day at 7:00 AM";
    return { name: `${partner} short shipment monitor`, description: desc,
      instructions: [`Get yesterday's ${partner} Logistics ${a} shipment confirmations from Trading Grid.`, `Match each ${a} to its ${b} shipping order and compare ordered and shipped quantities.`, `Post a short message to the ${channel} channel listing each short-shipped order with ordered, shipped and short quantities.`, "If nothing was short shipped, post that all orders shipped complete."],
      tools: ["Trading Grid Context Connectors (MCP): search_transactions", "Trading Grid Context Connectors (MCP): get_related_transactions", "Microsoft Teams: Post message in a channel"], trigger: `Recurrence: ${when}`, channel: `Microsoft Teams: ${channel}` };
  }
  function wsArea(K) {
    if (K.ws === "studio") {
      const st = S.studio, d = st?.draft;
      const navs = [["home", "Home"], ["plus", "Create", !d], ["agent", "Agents", !!d], ["route", "Flows"], ["tool", "Tools"], ["book", "Library"], ["more", "More"]];
      const head = `<header class="cs-top"><span class="cs-waffle">${ic("apps")}</span><b>Copilot Studio</b><span class="cl-tiny">simulated</span><span class="cl-sp"></span><span class="cs-env">${ic("globe")}<span>Environment</span><b>Harborview (default)</b></span>${ic("settings")}<span class="cl-av round sm">JL</span></header>`;
      const rail = `<nav class="cs-rail">${navs.map(([i, l, on]) => `<span class="${on ? "on" : ""}">${ic(i)}<i>${esc(l)}</i></span>`).join("")}</nav>`;
      if (!d) return `<div class="ws-area cs">${head}<div class="cs-body">${rail}<div class="cs-main"><div class="cs-create"><h1>Create an agent</h1><p>Describe what your agent should do. Copilot Studio drafts the instructions, tools, trigger and channel.</p>
        <div class="cs-desc"><textarea data-studiodesc rows="4" placeholder="Describe your agent"></textarea><div class="cs-desc-f"><span>${ic("paperclip")}</span><span class="cl-sp"></span><button class="cs-btn pri" data-studiocreate="1">Create</button></div></div>
        <div class="cs-sugg"><span>Templates</span><button>Website Q&amp;A</button><button>IT helpdesk</button><button>Sales order status</button></div></div></div></div></div>`;
      const card = (t, body, act = "Edit") => `<section class="cs-card"><div class="cs-ch"><b>${esc(t)}</b><span class="cl-sp"></span><button class="cs-link">${act}</button></div>${body}</section>`;
      return `<div class="ws-area cs">${head}<div class="cs-body">${rail}<div class="cs-main">
        <div class="cs-ah"><div class="cl-av sq">${esc(initials(d.name))}</div><div><h1>${esc(d.name)}</h1><span class="cs-sub">Draft · Last saved just now</span></div><span class="cl-sp"></span><button class="cs-btn" data-studiotest="1">${ic("chat")}Test</button><button class="cs-btn">Settings</button><button class="cs-btn pri" data-studiopublish="1">${st.published ? "Published" : "Publish"}</button></div>
        ${st.publishing ? `<div class="cs-pub"><div class="cs-pubm"><b>${st.published ? "Agent published" : "Publishing agent"}</b>${st.published ? `<p>${esc(d.name)} is live in Microsoft 365 Copilot and Microsoft Teams for Harborview Distribution Operations.</p><div class="cs-pubc">${["Microsoft 365 Copilot", "Microsoft Teams", "Daily trigger, 7:00 AM"].map((x) => `<span>${ic("check")}${esc(x)}</span>`).join("")}</div><button class="cs-btn pri" data-studiopubclose="1">Done</button>` : `<p>Validating tools, knowledge and channels...</p><div class="cs-prog"><i></i></div>`}</div></div>` : ""}
        <nav class="cs-tabs">${["Overview", "Knowledge", "Tools", "Agents", "Topics", "Activity", "Analytics", "Channels"].map((t, i) => `<span class="${i === 0 ? "on" : ""}">${t}</span>`).join("")}</nav>
        <div class="cs-grid">${card("Details", `<div class="cs-kv"><span>Name</span><b>${esc(d.name)}</b><span>Description</span><div>${esc(d.description)}</div></div>`)}
          ${card("Instructions", `<ol class="cs-ins">${d.instructions.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`)}
          ${card("Tools", `<ul class="cs-list">${d.tools.map((x) => `<li>${ic("wrench")}<span>${esc(x)}</span><i>On</i></li>`).join("")}</ul>`, "Add tool")}
          ${card("Triggers", `<ul class="cs-list"><li>${ic("clock")}<span>${esc(d.trigger)}</span><i>On</i></li></ul>`, "Add trigger")}
          ${card("Channels", `<ul class="cs-list"><li>${ic("teams")}<span>${esc(d.channel)}</span><i>Ready to publish</i></li></ul>`)}</div></div></div></div>`;
    }
    if (K.ws === "s4") {
      const d = S.scene.s4, sel = wsSelected(K);
      if (!d) return `<div class="ws-area"></div>`;
      const usd = (v) => "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const f = (l, v, i = "vh") => `<label class="s4-f"><span>${esc(l)}:</span><div><span>${esc(v)}</span>${i === "dd" ? ic("chev") : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 12h8M8 15h5"/></svg>`}</div></label>`;
      const shell = (title) => `<header class="s4-shell">${S.s4View === "po" ? `<button class="s4-back" data-s4back="1" title="Back">${ic("left")}</button>` : ""}<span class="s4-logo">SAP</span><span class="s4-app">${esc(title)} ${ic("chev")}</span><span class="cl-sp"></span><span class="s4-search">${ic("search")}<span>Search in: Apps</span></span><button class="s4-joule ${S.jouleOpen ? "on" : ""}" data-s4joule="1" title="Joule">${ic("sparkle")}</button><span class="s4-ib">${ic("bell")}</span><span class="cl-av round sm">JL</span></header>`;
      const mcard = sel ? `<div class="s4-mcard"><div class="k">Purchase order</div><div class="t">${sel.po}</div><div class="s">${esc(sel.supplier)} · ordered ${fdate(sel.orderedAt)}</div>${s4St(sel.status)}</div>` : "";
      if (S.s4View === "po" && sel) {
        const ag = d.agreement;
        return `<div class="ws-area s4">${shell("Purchase Order")}
          <div class="s4-page s4-obj">
            <div class="s4-oh"><div><div class="s4-ot">Standard PO <b>${sel.po}</b></div><div class="s4-os">${esc(sel.supplier)} (${esc(ag.vendor)})</div></div><span class="cl-sp"></span><button class="s4-btn">Edit</button><button class="s4-btn">Send Reminder</button></div>
            <div class="s4-hf"><div><span>Confirmation Status</span>${s4St(sel.status)}</div><div><span>Net Value</span><b>${usd(sel.netValue)}</b></div><div><span>Order Date</span><b>${fdate(sel.orderedAt)}</b></div><div><span>Requested Delivery</span><b>${fdate(sel.requestedDelivery + "T12:00:00Z")}</b></div><div><span>Plant</span><b>${esc(d.plant)}</b></div><div><span>Purchasing Group</span><b>${esc(d.purchasingGroup)}</b></div></div>
            <nav class="s4-otabs"><span class="on">Items</span><span>Confirmations</span><span>Inbound Deliveries</span><span>Supplier Agreement</span></nav>
            <div class="s4-sec"><b>Items (${sel.items.length})</b><table><thead><tr><th>Item</th><th>Material</th><th>Description</th><th>Quantity</th><th>Net Price</th><th>Delivery Date</th></tr></thead><tbody>${sel.items.map((i) => `<tr><td>${i.item}</td><td class="lnk">${esc(i.material)}</td><td>${esc(i.description)}</td><td>${i.quantity} ${esc(i.unit)}</td><td>${usd(i.netPrice)}</td><td>${fdate(sel.requestedDelivery + "T12:00:00Z")}</td></tr>`).join("")}</tbody></table></div>
            <div class="s4-cols"><div class="s4-sec"><b>Confirmations</b><div class="s4-kv"><span>Confirmation control</span><span>${esc(ag.confirmationControl)}</span><span>Order acknowledgment</span><span>${sel.confirmedAt ? `Received ${fdate(sel.confirmedAt)}` : "Not received"}</span></div></div>
            <div class="s4-sec"><b>Inbound Deliveries</b><div class="s4-kv"><span>Inbound shipment</span><span>${esc(sel.shipmentId ?? "None")}</span><span>Planned ship date</span><span>${fdate(sel.plannedShipDate + "T12:00:00Z")}</span></div></div></div>
          </div>${mcard}</div>`;
      }
      return `<div class="ws-area s4">${shell("Monitor Supplier Confirmations")}
        <div class="s4-page">
          <div class="s4-head"><h1>Standard ${ic("chev")}</h1>
            <div class="s4-filters">${f("Supplier", d.supplierFilter ?? "All")}${f("Plant", d.plant)}${f("Order Date", "Last 14 days", "dd")}${f("Confirmation Status", "All", "dd")}<span class="cl-sp"></span><button class="s4-go">Go</button><button class="s4-lnk">Adapt Filters (4)</button></div></div>
          <div class="s4-table"><div class="s4-tbar"><b>Purchase Orders (${d.rows.length})</b><span class="cl-sp"></span><button>Send Reminder</button><button>Export ${ic("chev")}</button><span class="s4-ib">${ic("gear")}</span></div>
            <table><thead><tr><th class="cb"><i></i></th><th>Purchase Order</th><th>Supplier</th><th>Order Date</th><th>Req. Delivery</th><th>Net Value</th><th>Confirmation Status</th><th>Inbound Shipment</th></tr></thead><tbody>
            ${d.rows.map((r) => `<tr class="${sel && r.po === sel.po ? "sel" : ""}" data-s4po="${r.po}"><td class="cb"><i></i></td><td class="lnk">${r.po}</td><td>${esc(r.supplier)}</td><td>${fdate(r.orderedAt)}</td><td>${fdate(r.requestedDelivery + "T12:00:00Z")}</td><td class="num">${usd(r.netValue)}</td><td>${s4St(r.status)}</td><td>${esc(r.shipmentId ?? "")}</td></tr>`).join("")}
            </tbody></table></div></div>
        ${mcard}</div>`;
    }
    const d = S.scene.servicenow;
    if (!d) return `<div class="ws-area"></div>`;
    const fld = (l, v, req) => `<div class="sn-f"><label>${req ? "<i>*</i>" : ""}${esc(l)}</label><div class="sn-in">${esc(v)}</div></div>`;
    const fails = Object.entries(d.byDoc).map(([k, v]) => `${k} × ${v}`).join(", ");
    const notes = [
      ...(S.snNotes ?? []).map((n) => [n.who, n.kind, n.at, n.text]),
      ["Jordan Lee", "Work notes", new Date(Date.parse(d.openedAt) + 35 * 60000).toISOString(), `Raised certificate renewal ${d.changeRequest} in Trading Grid Community Projects. BN Support Operations assigned; partner's new signing certificate attached.`],
      ["Jordan Lee", "Work notes", new Date(Date.parse(d.openedAt) + 6 * 60000).toISOString(), `Trading Grid shows inbound files from ${d.partner} failing AS2 signature verification since ${new Date(d.certificateExpired).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Outbound POs are unaffected.`],
      ["System", "Field changes", d.openedAt, `Incident created from Trading Grid alert. Priority 2 - High. Assignment group ${d.assignmentGroup}.`],
    ];
    return `<div class="ws-area sn">
      <header class="sn-top"><span class="sn-logo">servicenow</span><nav class="sn-menus">${["All", "Favorites", "Workspaces"].map((x) => `<span>${x}${ic("chev")}</span>`).join("")}</nav><span class="cl-sp"></span><span class="sn-pill">Service Operations Workspace ${ic("star")}</span><span class="cl-sp"></span><span class="sn-ib" title="Search">${ic("search")}</span><span class="sn-ib on" title="Now Assist">${ic("sparkle")}</span><span class="sn-ib">${ic("help")}</span><span class="sn-ib">${ic("bell")}</span><span class="cl-av round sm">JL</span></header>
      <div class="sn-body"><nav class="sn-rail">${["home", "list", "inbox", "chart"].map((i, n) => `<span class="${n === 1 ? "on" : ""}">${ic(i)}</span>`).join("")}</nav>
        <div class="sn-main"><div class="sn-tabs"><span>Home</span><span class="on">${esc(d.number)} ${ic("x")}</span></div>
          <div class="sn-rec"><div class="sn-rh"><div><div class="sn-type">Incident</div><h1>${esc(d.number)}</h1><div class="sn-sd">${esc(d.shortDescription)}</div></div><span class="cl-sp"></span><button class="sn-b">Update</button><button class="sn-b pri">Resolve</button></div>
            <div class="sn-hl"><div><span>Priority</span><b class="p2">${esc(d.priority)}</b></div><div><span>State</span><b>${esc(d.state)}</b></div><div><span>Assignment group</span><b>${esc(d.assignmentGroup)}</b></div><div><span>Opened</span><b>${ago(d.openedAt)}</b></div></div>
            <div class="sn-cols"><div class="sn-form"><div class="sn-ftabs"><b>Details</b><span>Notes</span><span>Related records</span><span>Resolution information</span></div>
              <div class="sn-grid">${fld("Caller", d.caller, 1)}${fld("Category", d.category)}${fld("Service", d.service)}${fld("Subcategory", d.subcategory)}${fld("Configuration item", d.ci)}${fld("Impact", d.impact)}${fld("Assigned to", d.assignedTo)}${fld("Urgency", d.urgency)}</div>
              ${fld("Short description", d.shortDescription, 1)}
              <div class="sn-f"><label>Description</label><div class="sn-in ta">${esc(`Inbound EDI from ${d.partner} is rejected at AS2 receipt. ${d.failed} documents failed so far (${fails}). Partner signing certificate expired.`)}</div></div></div>
              <div class="sn-act"><div class="sn-acth">Activity</div>${notes.map(([who, kind, at, txt]) => `<div class="sn-note ${kind === "Work notes" ? "wn" : ""}"><div class="sn-nh"><b>${esc(who)}</b><span>${esc(kind)} · ${ago(at)}</span></div><div>${esc(txt)}</div></div>`).join("")}</div></div></div></div></div></div>`;
  }
  function wsContext(K) {
    if (K.ws === "studio") { const d = S.studio?.draft; return d ? [`Application: Microsoft Copilot Studio, test pane for the draft agent "${d.name}".`, `Agent instructions: ${d.instructions.join(" ")}`, `Trigger: ${d.trigger}. Channel: ${d.channel}. In the test pane, show the results directly as the agent's answer. Do not draft or describe a channel message.`, `Today: ${new Date().toISOString().slice(0, 10)}.`].join("\n") : ""; }
    if (K.ws === "s4") {
      const sel = wsSelected(K); const d = S.scene.s4; if (!sel || !d) return "";
      const ag = d.agreement;
      return [`Application: SAP S/4HANA, ${S.s4View === "po" ? `purchase order ${sel.po} open` : "Monitor Supplier Confirmations"}. Plant ${d.plant}. List filter: supplier ${d.supplierFilter}, order date last 14 days.`,
        `Selected purchase order: ${sel.po}, ${sel.supplier} (Trading Grid company ${sel.supplierId}). Ordered ${sel.orderedAt.slice(0, 10)}, requested delivery ${sel.requestedDelivery}, net value ${sel.netValue} USD, SAP confirmation status ${sel.status}.`,
        `SAP supplier agreement (vendor ${ag.vendor}): ${ag.confirmationControl}. Target: ${ag.complianceTarget}. Compliance fee: ${ag.feeText}. ${ag.escalation}.`,
        `SAP route transit time for this supplier: ${sel.transitDays} days.`,
        `Purchase orders on the list (PO, order date, net value USD, SAP confirmation status): ${d.rows.map((r) => `${r.po} ${r.orderedAt.slice(0, 10)} ${r.netValue} ${r.status === "Confirmed" ? "C" : "N"}`).join("; ")}. C = confirmed, N = not confirmed.`].join("\n");
    }
    const d = S.scene.servicenow; if (!d) return "";
    return [`Application: ServiceNow Service Operations Workspace.`, `Open record: incident ${d.number}, "${d.shortDescription}". State ${d.state}, priority ${d.priority}, opened ${d.openedAt}.`, `Configuration item: ${d.ci} (Trading Grid company ${d.partnerCompanyId}, ${d.partner}). Service: ${d.service}.`, `Related Trading Grid change request in work notes: ${d.changeRequest}.`].join("\n");
  }
  function clSide(id, K, key, agentId, list, chats) {
    const name = esc(S.meta.persona.name), org = "Harborview Retail Group";
    const link = (aid, n, extra = "") => `<button class="cl-link ${aid === agentId ? "on" : ""}" data-cpsuse="${aid}">${extra}<span>${esc(n)}</span></button>`;
    const nav = (i, l, attrs = "") => `<button class="cl-new" ${attrs}>${ic(i)}<span>${esc(l)}</span></button>`;
    const close = `<button class="cl-ib cl-x" data-copside="0" title="Close">${ic("x")}</button>`;
    const hist = chats.length ? `<div class="cl-sec">${id === "claude" ? "Recents" : id === "gemini" ? "Recent" : "Chats"}</div><div class="cl-list">${chats.map(([aid, t]) => `<button class="cl-link" data-cpsuse="${aid}"><span>${esc(t.slice(0, 60))}</span></button>`).join("")}</div>` : "";
    const pn = K.who ?? S.meta.persona.name;
    const prof = (sub) => `<div class="cl-prof"><div class="cl-av round">${esc(initials(pn))}</div><div><div class="n">${esc(pn)}</div><div class="s">${esc(sub)}</div></div></div>`;
    if (id === "teams") {
      const prev = (aid) => { const cc = S.convs[`cl:teams:${aid}`]; const lastU = cc?.items.filter((x) => x.role === "agent" && x.text).pop(); return lastU ? lastU.text.replace(/[*#|`]/g, "").replace(/\s+/g, " ").trim() : agent(aid)?.role ?? "Trading Grid agent"; };
      const when = (aid) => { const cc = S.convs[`cl:teams:${aid}`]; const t = cc?.items.at(-1)?.t0 ?? cc?.items.at(-1)?.t; return t ? hhmm(t) : ""; };
      return `<aside class="cl-side"><div class="tm-lh"><h2>Chat</h2><span class="cl-sp"></span><button class="cl-ib dt" title="Filter">${ic("filter")}</button><button class="cl-ib dt" title="Meet now">${ic("video")}</button><button class="cl-ib" data-newconv="${key}" title="New chat">${ic("compose")}</button>${close}</div>
        <div class="tm-chips"><span>Unread</span><span>Channels</span><span>Chats</span></div>
        <div class="cl-sec">${ic("chev")}Chats</div>
        <div class="cl-list">${list.map(([aid, n]) => `<button class="cl-link ${aid === agentId ? "on" : ""}" data-cpsuse="${aid}"><span class="cl-av sq sm">${esc(initials(n))}</span><span class="tm-li"><span class="tm-n"><b>${esc(n)}</b><i>${when(aid)}</i></span><span class="tm-p">${esc(prev(aid))}</span></span></button>`).join("")}</div></aside>`;
    }
    if (id === "chatgpt") return `<aside class="cl-side"><div class="cl-brand"><span class="cl-brandtx">ChatGPT Enterprise</span><span class="cl-sp"></span><button class="cl-ib dt" title="Close sidebar">${ic("side")}</button>${close}</div>
      ${nav("compose", "New chat", `data-newconv="${key}"`)}${nav("search", "Search chats")}${nav("image", "Library")}
      <div class="cl-sec">GPTs</div><div class="cl-list">${list.map(([aid, n]) => link(aid, n, `<span class="cl-gi">${esc(initials(n).slice(0, 1))}</span>`)).join("")}</div>${hist}
      ${prof(org)}</aside>`;
    if (id === "claude") return `<aside class="cl-side"><div class="cl-brand"><span class="cl-wm">Claude</span><span class="cl-tiny">simulated</span><span class="cl-sp"></span><button class="cl-ib dt" title="Close sidebar">${ic("side")}</button>${close}</div>
      <button class="cl-new cl-newc" data-newconv="${key}"><span class="cl-plus">${ic("plus")}</span><span>New chat</span></button>${nav("chats", "Chats")}${nav("folder", "Projects")}${nav("code", "Artifacts")}
      ${S.art?.made ? `<div class="cl-sec">Artifacts</div><button class="cl-link cl-artlink ${!S.art.hidden ? "on" : ""}" data-artopen="1">${ic("chart")}<span>Meridian accounts payable reconciliation</span></button>` : ""}
      ${hist}
      ${prof("Enterprise plan")}</aside>`;
    if (id === "gemini") return `<aside class="cl-side"><div class="cl-brand"><button class="cl-ib dt" title="Collapse menu">${ic("menu")}</button><span class="cl-wm">Gemini Enterprise</span><span class="cl-tiny">simulated</span><span class="cl-sp"></span>${close}</div>
      ${nav("compose", "New chat", `data-newconv="${key}"`)}${nav("apps", "Agents")}${nav("inbox", "Inbox")}
      <div class="cl-sec">Agents</div><div class="cl-list">${list.map(([aid, n]) => link(aid, n)).join("")}</div>${hist}
      <div class="cl-foot2">${nav("gear", "Settings and help")}</div></aside>`;
    return "";
  }
  function pageClient(id) {
    const K = CLIENTS[id];
    if (!K) return shellCs(`<div class="content"><div class="empty">Client not found.</div></div>`);
    const avail = studioAgents().filter((a) => S.deploy?.agents.find((x) => x.agentId === a.id)?.clients[K.host]?.published && !S.deploy.agents.find((x) => x.agentId === a.id).clients[K.host].blocked);
    // Agent Connectors clients talk to the Trading Grid Agent; Context Connectors clients use their own assistant with Trading Grid tools.
    const agentId = K.connector === "agents" ? "tg-aviator" : "context-assistant";
    const key = `cl:${id}:${agentId}`;
    const c = conv(key, agentId, K.host);
    if (id === "claude" && artData(c)) S.art.made = true;
    const blocked = (S.meta.clientStatus[K.host] ?? "ACTIVE") !== "ACTIVE";
    mounts[key] = (cc) => clChat(id, K, cc, agentId, avail, blocked);
    const list = [[agentId, K.auto]];
    (S.conFor ??= {})[key] = K.connector;
    if (K.ws) S.ctxFor[key] = () => wsContext(K);
    if (id === "gemini") S.ctxFor[key] = () => S.gem?.published ? [`Application: Gemini Enterprise. The published agent "${GEM_AGENT.name}" is running now (manual run).`, `Agent steps: ${GEM_AGENT.steps.join(" ")}`, `Runs as ${GEM_AGENT.identity}. Output table: ${GEM_AGENT.table}.`, `Today: ${new Date().toISOString().slice(0, 10)}.`].join("\n") : "";
    if (id === "teams") S.ctxFor[key] = () => `Application: Microsoft Teams group chat "Supplier Onboarding". Members: Jordan Lee (jordan.lee), Morgan Chen (m.chen) and the Trading Grid Agent. Latest message from: ${S.lastAs ?? "Jordan Lee"}.`;
    if (K.ws) return `<div class="cl cl-${id} ws${K.ws === "s4" && !S.jouleOpen ? " jclosed" : ""}${K.ws === "studio" && !S.studio?.test ? " tclosed" : ""}">${wsArea(K)}<main class="cl-main ws-panel" data-conv="${key}">${mounts[key](c)}</main></div>`;
    const chats = Object.values(S.convs).filter((x) => x.key.startsWith(`cl:${id}:`) && x.items.length).map((x) => [x.agentId, x.items.find((i) => i.role === "user")?.text ?? ""]);
    const rail = id === "teams" ? `<header class="tm-bar"><span class="tm-l"><span class="cl-brandtx">Microsoft Teams</span><span class="tm-nav">${ic("left")}${ic("right")}</span></span><span class="tm-search">${ic("search")}<span>Search</span></span><span class="tm-r"><button class="cl-ib" title="Settings and more">${ic("more")}</button><span class="cl-av round sm pres">JL</span></span></header>
      <nav class="cl-rail">${[["bell", "Activity"], ["chats", "Chat", 1], ["teams", "Teams"], ["calendar", "Calendar"], ["phone", "Calls"], ["sparkle", "Copilot"], ["apps", "Apps", 0, 1]].map(([i, l, on, end]) => `<button class="${on ? "on" : ""}${end ? " end" : ""}">${ic(i)}<span>${esc(l)}</span></button>`).join("")}</nav>` : "";
    return `<div class="cl cl-${id} ${S.cps.side ? "side-open" : ""}">${rail}
      ${clSide(id, K, key, agentId, list, chats)}
      <div class="cl-scrim" data-copside="0"></div>
      <main class="cl-main" data-conv="${key}">${mounts[key](c)}</main></div>`;
  }

  // ---------- Stage: each client on iPhone and laptop, one conversation per client ----------
  const STAGE_CLIENTS = [
    { id: "intro", name: "", intro: true },
    { id: "teams", name: "Microsoft Teams", src: "/c/teams", bg: "#ffffff" },
    { id: "servicenow", name: "ServiceNow", src: "/c/servicenow", bg: "#032d42", foot: "#ffffff", dark: 1 },
    { id: "chatgpt", name: "ChatGPT Enterprise", src: "/c/chatgpt", bg: "#ffffff" },
    { id: "joule", name: "SAP S/4HANA with Joule", src: "/c/joule", bg: "#f5f6f7", foot: "#ffffff" },
    { id: "copilot", name: "Microsoft Copilot", src: "/copilot", bg: "#ffffff" },
    { id: "gemini", name: "Gemini Enterprise", src: "/c/gemini", bg: "#ffffff" },
    { id: "claude", name: "Claude", src: "/c/claude", bg: "#faf9f5" },
    { id: "tgo", name: "Trading Grid Aviator", src: "/tgo/insights?aviator=1", bg: "#ffffff", laptopOnly: true, zoom: 0.72 },
  ];
  const PHONE = { w: 393, h: 852 }, LAPTOP = { w: 1200, h: 750 };
  function pageStage() {
    return `<div class="stage${STAGE_MOBILE() ? " mob" : ""}"><div class="stage-row"></div>
      <footer class="stage-foot"${STAGE_MOBILE() ? ' data-stageplay="1"' : ""}><button class="stage-play" data-stageplay="1" aria-label="Continue"></button><button class="stage-fs" data-stagefs="1" aria-label="Full screen">${ic("expand")}</button><div class="stage-scn"></div><button class="stage-nav" data-stagemove="-1" title="Previous client" aria-label="Previous client">${ic("chev")}</button><div class="stage-dots">${STAGE_CLIENTS.map((x) => `<button data-stagego="${x.id}" title="${esc(x.name)}"></button>`).join("")}</div><button class="stage-nav nx" data-stagemove="1" title="Next client" aria-label="Next client">${ic("chev")}</button><div class="stage-name" data-stageplay="1"></div></footer></div>`;
  }
  function stageScenario(id) {
    const sc = SCN[id];
    const con = { agents: "Trading Grid Agent Connectors", context: "Trading Grid Context Connectors", native: "Trading Grid Aviator" }[sc?.connector];
    return sc ? `<b>${sc.n}</b><div class="scn-t"><div><span>${esc(sc.title)}</span>${con ? `<em>${esc(con)}</em>` : ""}</div><p>${esc(sc.setup)}</p></div>` : "";
  }
  // Scenario playback: a discreet control types the next turn into the right device, then sends it.
  // On a phone-sized screen the stage shows only the iPhone version of each client.
  const STAGE_MOBILE = () => matchMedia("(max-width: 820px)").matches;
  const stageFrame = (id, dev) => document.querySelector(`.stage-pair[data-sg="${id}"] .dev-${dev === "phone" ? "phone" : "laptop"} iframe`);
  S.stageStep = {};
  function stagePlay() {
    stageDot(); if (document.querySelector(".stage")?.classList.contains("noplay")) return;
    const id = qs().get("client") ?? STAGE_CLIENTS[0].id;
    const cur = STAGE_CLIENTS.find((x) => x.id === id); const sc = SCN[id]; if (!sc || !cur) return;
    const mob = !stageFrame(id, "desktop");
    const lap = stageFrame(id, mob ? "phone" : "desktop");
    const w = lap?.contentWindow; if (!w) return;
    if (w.__stageBusy?.()) return;
    let step = S.stageStep[id] ?? 0;
    if (step > 0 && sc.turns.slice(0, step).some((x) => x.text) && w.__stageEmpty?.() && (mob || w.location.pathname === cur.src.split("?")[0])) step = 0;
    const t = sc.turns[step]; if (!t) return;
    S.stageStep[id] = step + 1;
    if (t.s4open) { if (mob) return stagePlay(); w.__stageS4Open?.(); return; }
    if (t.click) { if (mob) return stagePlay(); w.document.querySelector(t.click)?.click(); return; }
    if (mob && t.into) return stagePlay();
    if (t.approve) { w.__stageApprove?.(); return; }
    const go = () => (mob || t.on === "phone" ? stageFrame(id, "phone") : stageFrame(id, "desktop"))?.contentWindow?.__stageType?.(t.text, mob ? { ...t, into: undefined, then: undefined } : t);
    if (mob) return go();
    if (t.src && w.location.pathname + w.location.search.replace(/[?&]stage=desktop/, "") !== t.src) { lap.addEventListener("load", () => setTimeout(go, 1800), { once: true }); lap.src = `${t.src}${t.src.includes("?") ? "&" : "?"}stage=desktop`; return; }
    go();
  }
  // The play dot shows only when a scenario turn is ready to play: hidden on the intro, while an answer runs,
  // while an approval card waits for the presenter, and after the last turn. A manual approval advances the script.
  S.stageApproveSeen = {};
  S.jouleOpen = STAGE !== "desktop";
  function stageDot() {
    const btns = document.querySelectorAll("[data-stageplay]"); if (!btns.length) return;
    const id = qs().get("client") ?? STAGE_CLIENTS[0].id; const sc = SCN[id];
    const frames = [stageFrame(id, "desktop"), stageFrame(id, "phone")].filter(Boolean).map((f) => f.contentWindow).filter(Boolean);
    let ready = false;
    try {
      const busy = frames.some((w) => w.__stageBusy?.() || w.document.querySelector("[data-compose] textarea")?.value || w.__stageTyping);
      const step = S.stageStep[id] ?? 0;
      const t = sc?.turns[step];
      if (t?.approve && !busy) {
        const pending = frames.some((w) => w.document.querySelector("[data-approve]"));
        if (pending) S.stageApproveSeen[id] = true;
        else if (S.stageApproveSeen[id]) { S.stageStep[id] = step + 1; S.stageApproveSeen[id] = false; }
      }
      const nt = sc?.turns[S.stageStep[id] ?? 0];
      ready = !!nt && !nt.approve && !busy && frames.length > 0;
    } catch { ready = false; }
    document.querySelector(".stage")?.classList.toggle("noplay", !ready);
  }
  setInterval(() => { if (location.pathname === "/stage") stageDot(); }, 400);
  function stageIntro() {
    const live = S.meta.agents.filter((a) => a.id !== "tg-aviator" && a.id !== "context-assistant").length;
    const kv = (k, v, n) => `<div class="si-kv"><span>${esc(k)}</span><b>${esc(v)}</b>${n ? `<em>${esc(n)}</em>` : ""}</div>`;
    const mix = [["Suppliers, X12", 27], ["Supplier, EDIFACT", 1], ["Suppliers, Web EDI", 2], ["3PL and carrier", 2]];
    const tot = mix.reduce((a, [, n]) => a + n, 0);
    return `<div class="stage-pair intro" data-sg="intro"><div class="si">
      <header class="si-head"><h1>Trading Grid Agent Connectors and Trading Grid Context Connectors</h1><p>Powered by Trading Grid Context Services</p></header>
      <div class="si-grid">
        <section class="si-co">
          <div class="si-eye">Customer</div>
          <h2>Harborview Retail Group</h2>
          <p class="si-lead">US retailer headquartered in Charlotte, NC. Onboarded to OpenText Trading Grid 8 months ago and is moving its in-house EDI to Trading Grid under Business Network managed services.</p>
          <div class="si-mig"><div class="si-mig-h"><b>EDI migration to Trading Grid</b><span>On target</span></div><div class="si-bar"><i style="width:57%"></i></div><div class="si-mig-f"><span>Started Feb 2026</span><span>Completes Apr 2027</span></div></div>
          <div class="si-kvs">${kv("EDI volume", "17,000 to 18,000", "documents a day")}${kv("Stores", "40", "Southeast and Mid-Atlantic")}${kv("Distribution", "1 DC", "Charlotte, plus 3PL Crestline Logistics")}${kv("Connectivity", "AS2, SFTP, VAN", "Web EDI for small suppliers")}</div>
          <div class="si-sub">Trading partners, ${tot}</div>
          <div class="si-mix">${mix.map(([l, n]) => `<div class="si-mx"><span>${esc(l)}</span><div><i style="width:${(n / mix[0][1]) * 100}%"></i></div><b>${n}</b></div>`).join("")}</div>
          <div class="si-sub">Documents exchanged</div>
          <div class="si-docs"><div><span>Suppliers</span><b>850 PO, 855 PO acknowledgment, 856 ASN, 810 invoice, 860 PO change, 820 remittance, 997</b></div><div><span>Logistics</span><b>940 shipping order, 945 shipment confirmation, 214 carrier status</b></div></div>
        </section>
        <section class="si-cons">
          <div class="si-con"><h3>Trading Grid Agent Connectors</h3><p>The Trading Grid Agent, the agent behind Trading Grid Aviator, inside Microsoft Teams, ServiceNow, SAP Joule and Gemini Enterprise. It works through ${live} specialist sub-agents and includes the Trading Grid tools they use.</p><div class="si-apps">Microsoft Teams · ServiceNow · SAP Joule · Gemini Enterprise</div></div>
          <div class="si-con alt"><h3>Trading Grid Context Connectors</h3><p>Trading Grid data and actions as MCP tools. Customers build their own agents on the same data the Trading Grid Agent uses.</p><div class="si-apps">Microsoft Copilot Studio · ChatGPT Enterprise · Claude</div></div>
          <div class="si-foot">Access is granted in Trading Grid Online. Changes require approval. Every answer cites its Trading Grid source.</div>
        </section>
      </div></div></div>`;
  }
  function stageFrames(cur) {
    const row = document.querySelector(".stage-row");
    let g = row.querySelector(`[data-sg="${cur.id}"]`);
    if (!g && cur.intro) { row.insertAdjacentHTML("beforeend", stageIntro()); g = row.lastElementChild; }
    if (!g) {
      const src = (d) => `${cur.src}${cur.src.includes("?") ? "&" : "?"}stage=${d}`;
      row.insertAdjacentHTML("beforeend", `<div class="stage-pair" data-sg="${cur.id}">
        ${cur.laptopOnly && !STAGE_MOBILE() ? "" : `<div class="dev-phone"><div class="dev-phone-screen" style="background:${cur.bg};--foot:${cur.foot ?? cur.bg}"><div class="dev-status${cur.dark ? " dark" : ""}"><span>9:41</span><span><i class="dev-bars"></i><i class="dev-batt"></i></span></div><div class="dev-app"><iframe allow="clipboard-write" title="${esc(cur.name)} on iPhone" src="${src("phone")}" style="width:${PHONE.w}px;height:${PHONE.h - 84}px"></iframe></div><div class="dev-home"></div></div><div class="dev-island"></div></div>`}
        ${STAGE_MOBILE() ? "" : `<div class="dev-laptop"><div class="dev-laptop-lid"><div class="dev-laptop-screen"><iframe allow="clipboard-write" title="${esc(cur.name)} on laptop" src="${src("desktop")}" style="width:${LAPTOP.w / (cur.zoom ?? 1)}px;height:${LAPTOP.h / (cur.zoom ?? 1)}px${cur.zoom ? `;transform:scale(calc(var(--sl, .5) * ${cur.zoom}))` : ""}"></iframe></div></div><div class="dev-laptop-base"></div></div>`}</div>`);
      g = row.lastElementChild;
    }
    row.querySelectorAll(".stage-pair").forEach((x) => x.classList.toggle("on", x === g));
    document.querySelectorAll("[data-stagego]").forEach((b) => b.classList.toggle("on", b.dataset.stagego === cur.id));
    document.querySelector(".stage-name").textContent = cur.name;
    document.querySelector(".stage-scn").innerHTML = stageScenario(cur.id);
  }
  function stageShow(id) {
    const cur = STAGE_CLIENTS.find((x) => x.id === id) ?? STAGE_CLIENTS[0];
    history.replaceState({}, "", `/stage?client=${cur.id}`);
    stageFrames(cur); stageFit();
  }
  function stageMove(d) {
    const i = STAGE_CLIENTS.findIndex((x) => x.id === (qs().get("client") ?? STAGE_CLIENTS[0].id));
    stageShow(STAGE_CLIENTS[(i + d + STAGE_CLIENTS.length) % STAGE_CLIENTS.length].id);
  }
  function stageFit() {
    const st = document.querySelector(".stage"); if (!st) return;
    const W = st.clientWidth - 72, H = st.clientHeight * 0.9;
    const lw = (LAPTOP.w + 32) * 1.114, lh = LAPTOP.h + 32 + 22, pw = PHONE.w + 28, ph = PHONE.h + 28;
    const cur = STAGE_CLIENTS.find((x) => x.id === qs().get("client"));
    if (cur?.intro) return;
    if (STAGE_MOBILE()) { const rowH = st.querySelector(".stage-row")?.clientHeight ?? H; const sP = Math.min(st.clientWidth / PHONE.w, rowH / (PHONE.h - 84)); st.style.setProperty("--sp", sP); st.style.setProperty("--pb", "0px"); return; }
    if (cur?.laptopOnly) { const sl = Math.min(W / lw, (H - 20) / lh); st.style.setProperty("--sl", sl); st.style.setProperty("--pb", `${Math.max(8, ((st.querySelector(".stage-row")?.clientHeight ?? H) - lh * sl) / 2)}px`); return; }
    // Phone and laptop share one visual height; the scenario card sits above the laptop.
    const Hc = Math.min(H - 20, (W - 56) / (pw / ph + lw / lh));
    const sP = Hc / ph, sL = Hc / lh;
    const rowH = st.querySelector(".stage-row")?.clientHeight ?? H;
    st.style.setProperty("--pb", `${Math.max(8, (rowH - Hc) / 2)}px`);
    st.style.setProperty("--sl", sL); st.style.setProperty("--sp", sP);
  }
  window.addEventListener("resize", () => { if (location.pathname === "/stage") stageFit(); });
  // Stage: hide the pointer after 0.5 seconds without movement.
  let curT = 0;
  const wake = () => { if (location.pathname !== "/stage" && !STAGE) return; document.documentElement.classList.remove("nocur"); clearTimeout(curT); curT = setTimeout(() => document.documentElement.classList.add("nocur"), 500); };
  ["mousemove", "mousedown", "wheel"].forEach((e) => document.addEventListener(e, wake, { passive: true }));
  const arrowOk = (ev) => (ev.key === "ArrowLeft" || ev.key === "ArrowRight") && !ev.target.closest?.("textarea,input,select,[contenteditable]");
  document.addEventListener("keydown", (ev) => {
    if (!arrowOk(ev)) return;
    if (location.pathname === "/stage") { ev.preventDefault(); stageMove(ev.key === "ArrowRight" ? 1 : -1); }
    else if (STAGE && window.parent !== window) { ev.preventDefault(); window.parent.postMessage({ stageKey: ev.key }, location.origin); }
  });
  window.addEventListener("message", (ev) => { if (ev.origin === location.origin && ev.data?.stageKey && location.pathname === "/stage") stageMove(ev.data.stageKey === "ArrowRight" ? 1 : -1); });
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
    else if (p === "/cs/scenarios") html = await pageCsScenarios();
    else if (p === "/cs/agents") { S.deploy = await api("/api/deployments"); html = pageCsAgents(); }
    else if (p === "/boundaries") html = pageBoundaries();
    else if (p === "/cs/clients") { S.meta.clientStatus = (await api("/api/meta")).clientStatus; html = pageCsClients(); }
    else if (p === "/cs/access") { S.audit = await api("/api/audit"); html = pageCsAccess(); }
    else if (p === "/cs/approvals") { S.plans = await api("/api/plans"); html = pageCsApprovals(); }
    else if (p.startsWith("/approve/")) { S.plans = await api("/api/plans"); html = await pageApprove(p.split("/")[2]); }
    else if (p === "/copilot") { S.deploy = await api("/api/deployments"); S.meta.clientStatus = (await api("/api/meta")).clientStatus; html = pageCopilot(); }
    else if (p === "/ext") { S.deploy = await api("/api/deployments"); S.meta.clientStatus = (await api("/api/meta")).clientStatus; if ((qs().get("eco") ?? "copilot-studio") === "copilot-studio") { S.audit = await api("/api/audit"); html = pageCopilot(); } else html = pageExt(); }
    else if (p === "/stage") html = pageStage();
    else if (p.startsWith("/c/")) { S.deploy = await api("/api/deployments"); S.meta.clientStatus = (await api("/api/meta")).clientStatus; const K = CLIENTS[p.slice(3)]; if (K?.ws && K.ws !== "studio") S.scene[K.ws] = await api(`/api/scene/${K.ws}`); html = pageClient(p.slice(3)); }
    else html = shellCs(`<div class="content"><div class="empty">Page not found. Return to the demo journey.</div></div>`);
    app.innerHTML = html;
    if (STAGE) mirror({ nav: location.pathname + location.search });
    if (p === "/stage") stageShow(qs().get("client"));
    if (qs().get("open") === "1" && p === "/tgo/insights" && S.tgo?.rows?.length && !S.txOpen && S.lastOpen !== location.search) { S.lastOpen = location.search; S.txOpen = S.tgo.rows[0].transactionId; S.txTab = "details"; return render(); }
    if (p === "/cs" || p === "/cs/access") poll = setTimeout(() => { if (location.pathname === p && !document.querySelector(".drawer")) render(); }, 4000);
  }
  const go = (href) => { history.pushState({}, "", href); window.scrollTo(0, 0); render(); };
  window.addEventListener("popstate", render);
  const keyOf = (el) => el.closest("[data-conv]")?.dataset.conv ?? null;


  app.addEventListener("click", async (ev) => {
    const t = ev.target.closest("[data-artpub],[data-artpubgo],[data-artshareclose],[data-artclose],[data-artopen],[data-arttab],[data-studiotest],[data-studiopublish],[data-studiopubclose],[data-s4back],[data-s4joule],[data-stop],[data-cgtask],[data-href],[data-prompt],[data-runuc],[data-publish],[data-blockagent],[data-demoreset],[data-step],[data-approve],[data-reject],[data-newconv],[data-tool],[data-copy],[data-reload],[data-domain],[data-avopen],[data-avclose],[data-avmax],[data-chatmax],[data-avnew],[data-avask],[data-togglesteps],[data-txtab],[data-tx],[data-closetx],[data-analyze],[data-askpayload],[data-facet],[data-unf],[data-clearf],[data-suspend],[data-restore],[data-scrow],[data-scrun],[data-scall],[data-copside],[data-cpsuse],[data-stagego],[data-stagemove],[data-stageplay],[data-stagefs],[data-studiocreate],[data-artrow],[data-artflag],[data-s4po]");
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.stagego) return stageShow(d.stagego);
    if (d.stagemove) return stageMove(Number(d.stagemove));
    if (d.stageplay) return stagePlay();
    if (d.stagefs) { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.(); return; }
    if (d.artpub) { S.art.share = true; return refreshConv(keyOf(t)); }
    if (d.artpubgo) { S.art.published = true; return refreshConv(keyOf(t)); }
    if (d.artshareclose) { S.art.share = false; return refreshConv(keyOf(t)); }
    if (d.artclose) { S.art.hidden = true; return render(); }
    if (d.artopen) { S.art.hidden = false; return render(); }
    if (d.arttab) { S.art.tab = d.arttab; return refreshConv(keyOf(t)); }
    if (d.artrow) { S.art.open[d.artrow] = !S.art.open[d.artrow]; return refreshConv(keyOf(t)); }
    if (d.artflag) { S.art.flagOnly = S.art.flagOnly === false; return refreshConv(keyOf(t)); }
    if (d.studiotest) { if (S.studio) S.studio.test = !S.studio.test; return render(); }
    if (d.studiopublish) { if (!S.studio?.draft) return; S.studio.publishing = true; render(); setTimeout(() => { S.studio.published = true; try { sessionStorage.setItem("tg-cps-agent", JSON.stringify(S.studio.draft)); } catch {} render(); }, 1800); return; }
    if (d.studiopubclose) { S.studio.publishing = false; return render(); }
    if (d.studiocreate) { const v = document.querySelector("[data-studiodesc]")?.value.trim(); if (!v) return; S.studio = { draft: studioDraft(v) }; return render(); }
    if (d.s4po) { const u = new URLSearchParams(location.search); u.set("po", d.s4po); S.s4View = "po"; return go(`${location.pathname}?${u}`); }
    if (d.s4back) { S.s4View = null; return render(); }
    if (d.s4joule) { S.jouleOpen = !S.jouleOpen; return render(); }
    if (d.copside) { S.cps.side = d.copside === "1"; return render(); }
    if (d.cpsuse) { S.cps.side = false; const u = new URLSearchParams(location.search); u.set("agent", d.cpsuse); return go(`${location.pathname}?${u}`); }
    if (d.scrun) { ev.stopPropagation(); t.disabled = true; t.textContent = "Running"; const r = await api("/api/scenarios/run", { method: "POST", body: { ids: [d.scrun] } }); for (const x of r.results ?? []) S.sc.results[x.id] = x; S.sc.open[d.scrun] = true; S.plans = await api("/api/plans"); return render(); }
    if (d.scall != null) { if (!confirm(`Run all ${S.sc.catalog.length} scenarios? Demo data is reset before each scenario and restored afterwards.`)) return; S.sc.running = true; render(); const r = await api("/api/scenarios/run", { method: "POST", body: { all: true } }); S.sc.running = false; for (const x of r.results ?? []) S.sc.results[x.id] = x; S.plans = await api("/api/plans"); return render(); }
    if (d.scrow) { S.sc.open[d.scrow] = !S.sc.open[d.scrow]; return render(); }
    if (d.cgtask != null) { S.cgTask = d.cgtask === "1"; return render(); }
    if (d.stop) return;
    if (d.copy) {
      const done = () => { const lab = t.querySelector(".cp-l"); const el = lab ?? t; const o = el.textContent; el.textContent = "Copied"; t.classList.add("ok"); setTimeout(() => { el.textContent = o; t.classList.remove("ok"); }, 1400); };
      const fallback = () => { const ta = document.createElement("textarea"); ta.value = d.copy; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0;top:0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} ta.remove(); };
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(d.copy).catch(fallback); else fallback();
      done(); return;
    }
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
    if (d.newconv) { delete S.convs[d.newconv]; mirror({ reset: d.newconv }); return render(); }
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
    if (d.artsup != null) { S.art.supplier = ev.target.value; return refreshConv(keyOf(ev.target)); }
    if (d.ucarea != null) { S.ucFilter = ev.target.value; render(); }
    if (d.tooldomain != null) { S.toolDomain = ev.target.value; render(); }
    if (d.scdomain != null) { S.sc.domain = ev.target.value; render(); }
    if (d.sckind != null) { S.sc.kind = ev.target.value; render(); }
    if (d.scresult != null) { S.sc.result = ev.target.value; render(); }
    if (d.days != null) { S.tgoFilters.days = ev.target.value; render(); }
    if (d.cpsagent != null) { const u = new URLSearchParams(location.search); if (location.pathname === "/ext") u.set("eco", "copilot-studio"); u.set("agent", ev.target.value); go(`${location.pathname}?${u}`); }
    if (d.extagent != null) { const u = new URLSearchParams(location.search); u.set("agent", ev.target.value); go(`/ext?${u}`); }
  });
  app.addEventListener("input", (ev) => {
    // Composer grows with its text so every typed line stays visible.
    if (ev.target.matches?.("[data-compose] textarea")) { const ta = ev.target; ta.style.height = "auto"; ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`; ta.style.overflowY = ta.scrollHeight > 200 ? "auto" : "hidden"; ta.scrollTop = ta.scrollHeight; }
    if (ev.target.dataset.scq != null) { S.sc.q = ev.target.value; const pos = ev.target.selectionStart; render().then(() => { const el = $("[data-scq]"); el.focus(); el.setSelectionRange(pos, pos); }); }
    if (ev.target.dataset.toolq != null) { S.toolQ = ev.target.value; const pos = ev.target.selectionStart; render().then(() => { const el = $("[data-toolq]"); el.focus(); el.setSelectionRange(pos, pos); }); }
  });

  (async () => {
    [S.meta, S.tools, S.plans] = await Promise.all([api("/api/meta"), api("/api/tools"), api("/api/plans")]);
    render();
  })();
})();
