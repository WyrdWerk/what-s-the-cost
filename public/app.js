/* Cost Kitna Hoga — client. Vanilla JS, no build step.
   Manual mode is the product; the AI classifier (POST /api/estimate) is layered on top and may return null. */
(function () {
  "use strict";

  // ---------- i18n ----------
  const STR = {
    en: {
      title: "Cost Kitna Hoga?",
      lead: "Describe one repetitive job in your business. Hindi or English.",
      descPlaceholder: "e.g. Every day I send 20 quotations on WhatsApp and then chase replies",
      chipsHint: "Or tap the closest match:",
      next: "Next →", back: "← Back", showReceipt: "Show receipt", startOver: "Start over", copyLink: "Copy share link", copied: "Link copied",
      qVolume: "How many times a day?", qWho: "Who does it now?", qMinutes: "Minutes per task?",
      who: { me: "Me", staff: "Staff", nobody: "Nobody yet" },
      closest: "Closest match: {name} — your real numbers may differ.",
      picked: "Job type: {name}",
      receiptTitle: "Estimate receipt", receiptSub: "All figures are ranges in ₹. Not a quote.",
      setup: "Agent setup (one time)", run: "Monthly run cost", runSub: "model usage on {model}",
      oversight: "Your oversight time", oversightSub: "{hours} hrs/month checking the agent's work",
      baseline: "What this job costs you today", baselineSub: "{hours} hrs/month × {wage}/hr",
      net: "Monthly saving", breakEven: "Break-even",
      be_never: "No break-even at these numbers.", be_possible: "Possible, not assured.", be_assured: "Month {lo} to {hi}",
      verdict: { worth_it: "Worth an agent", assist_first: "Assist first — try a simpler tool", leave_it: "Leave it alone" },
      drivers: "What moves the price", notWorth: "When it is not worth it",
      assumptions: "Assumptions: {days} working days/month · $1 = ₹{fx} · pricing snapshot {date}",
      foot1: "Estimate, not a quote. Real price depends on the factors above.",
      foot2: "We do not save your workflow in an application database. AI mode sends it to Anthropic; their retention policies apply.",
      cta: "Talk to WyrdWerk → contact@wyrdwerk.com",
      perMonth: "/mo",
      aiThinking: "Reading your description…", aiNone: "",
    },
    hi: {
      title: "Cost Kitna Hoga?",
      lead: "अपने बिज़नेस का एक बार-बार होने वाला काम बताइए। हिन्दी या English।",
      descPlaceholder: "जैसे: रोज़ 20 कोटेशन WhatsApp पर भेजता हूँ, फिर जवाब के लिए फॉलो-अप",
      chipsHint: "या सबसे नज़दीकी काम चुनिए:",
      next: "आगे →", back: "← पीछे", showReceipt: "रसीद दिखाओ", startOver: "फिर से", copyLink: "लिंक कॉपी करो", copied: "लिंक कॉपी हो गया",
      qVolume: "दिन में कितनी बार?", qWho: "अभी कौन करता है?", qMinutes: "एक बार में कितने मिनट?",
      who: { me: "मैं", staff: "स्टाफ", nobody: "अभी कोई नहीं" },
      closest: "नज़दीकी मिलान: {name} — आपके असली नंबर अलग हो सकते हैं।",
      picked: "काम: {name}",
      receiptTitle: "अनुमान रसीद", receiptSub: "सब आँकड़े ₹ में रेंज हैं। कोटेशन नहीं।",
      setup: "एजेंट सेटअप (एक बार)", run: "मासिक चलाने का खर्च", runSub: "{model} पर मॉडल उपयोग",
      oversight: "आपका निगरानी समय", oversightSub: "{hours} घंटे/महीना एजेंट का काम जाँचने में",
      baseline: "आज यह काम आपको कितना पड़ता है", baselineSub: "{hours} घंटे/महीना × {wage}/घंटा",
      net: "मासिक बचत", breakEven: "ब्रेक-ईवन",
      be_never: "इन नंबरों पर ब्रेक-ईवन नहीं।", be_possible: "संभव है, पक्का नहीं।", be_assured: "महीना {lo} से {hi}",
      verdict: { worth_it: "एजेंट लायक है", assist_first: "पहले सहायक टूल आज़माएँ", leave_it: "इसे छोड़ दें" },
      drivers: "कीमत किससे बदलती है", notWorth: "कब लायक नहीं",
      assumptions: "मान्यताएँ: {days} कार्य-दिवस/महीना · $1 = ₹{fx} · मूल्य स्नैपशॉट {date}",
      foot1: "यह अनुमान है, कोटेशन नहीं। असली कीमत ऊपर के कारकों पर निर्भर है।",
      foot2: "हम आपका वर्कफ़्लो किसी एप्लिकेशन डेटाबेस में नहीं रखते। AI मोड इसे Anthropic को भेजता है; उनकी रिटेंशन नीतियाँ लागू होती हैं।",
      cta: "WyrdWerk से बात करें → contact@wyrdwerk.com",
      perMonth: "/महीना",
      aiThinking: "आपका विवरण पढ़ रहे हैं…", aiNone: "",
    },
  };
  const TAPS = {
    tasks_per_day: [5, 10, 20, 50, 100],
    minutes_per_task: [2, 5, 10, 20, 30],
    current_handling: ["me", "staff", "nobody"],
  };
  const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? vars[k] : ""));
  const inr = (n) => (n < 0 ? "−" : "") + "₹" + Math.abs(Math.round(n)).toLocaleString("en-IN");
  const rangeInr = ([lo, hi]) => (Math.round(lo) === Math.round(hi) ? inr(lo) : inr(lo) + " – " + inr(hi));
  const r1 = (n) => (Math.round(n * 10) / 10).toString();

  // ---------- state ----------
  const state = {
    language: "en",
    description: "",
    archetype_id: null,
    source: "manual", // "manual" | "ai" | "shared"
    answers: { tasks_per_day: null, current_handling: null, minutes_per_task: null },
    frozen: null, // { archetype, config } snapshot embedded in share links
  };
  let DATA = { archetypes: [], config: null };

  const $ = (sel) => document.querySelector(sel);
  const t = () => STR[state.language];

  // ---------- data ----------
  async function loadData() {
    const [a, c] = await Promise.all([
      fetch("/data/archetypes.json").then((r) => r.json()),
      fetch("/data/config.json").then((r) => r.json()),
    ]);
    DATA = { archetypes: a.archetypes, config: c };
  }
  const archetypeById = (id) => DATA.archetypes.find((x) => x.id === id) || null;
  const archName = (a) => (state.language === "hi" ? a.name_hi : a.name_en);

  // ---------- render helpers ----------
  function applyI18n() {
    document.documentElement.lang = state.language;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t()[el.dataset.i18n]; });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t()[el.dataset.i18nPlaceholder]; });
    document.querySelectorAll(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === state.language)));
    renderChips();
    renderTaps();
    renderMatchLabel();
    if (!$("#screen-receipt").classList.contains("hidden")) renderReceipt();
  }

  function renderChips() {
    const box = $("#chips");
    box.replaceChildren();
    DATA.archetypes.forEach((a) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.setAttribute("role", "listitem");
      b.textContent = archName(a);
      b.setAttribute("aria-pressed", String(state.archetype_id === a.id));
      b.onclick = () => { state.archetype_id = a.id; state.source = "manual"; renderChips(); $("#toQuestions").disabled = false; };
      box.appendChild(b);
    });
    $("#toQuestions").disabled = !state.archetype_id;
  }

  function renderTaps() {
    document.querySelectorAll(".taps").forEach((box) => {
      const q = box.dataset.q;
      box.replaceChildren();
      TAPS[q].forEach((val) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "tap";
        b.textContent = q === "current_handling" ? t().who[val] : String(val);
        b.setAttribute("aria-pressed", String(state.answers[q] === val));
        b.onclick = () => { state.answers[q] = val; renderTaps(); };
        box.appendChild(b);
      });
    });
    const done = Object.values(state.answers).every((v) => v !== null);
    $("#toReceipt").disabled = !done;
  }

  function renderMatchLabel() {
    const a = archetypeById(state.archetype_id);
    if (!a) return;
    const key = state.source === "ai" ? "closest" : "picked";
    $("#matchLabel").textContent = fmt(t()[key], { name: archName(a) });
  }

  function line(k, v, sub, cls) {
    const d = document.createElement("div"); d.className = "line" + (cls ? " " + cls : "");
    const kk = document.createElement("span"); kk.className = "k"; kk.textContent = k;
    if (sub) { const s = document.createElement("small"); s.textContent = sub; kk.appendChild(s); }
    const vv = document.createElement("span"); vv.className = "v"; vv.textContent = v;
    d.append(kk, vv); return d;
  }

  function renderReceipt() {
    const a = state.frozen ? state.frozen.archetype : archetypeById(state.archetype_id);
    const cfg = state.frozen ? state.frozen.config : DATA.config;
    const res = Engine.estimate(a, cfg, state.answers);
    const s = t();
    const box = $("#receipt");
    box.replaceChildren();

    const h = document.createElement("h2"); h.textContent = s.receiptTitle;
    const sub = document.createElement("p"); sub.className = "sub";
    sub.textContent = fmt(s[state.source === "ai" ? "closest" : "picked"], { name: archName(a) }) + " · " + s.receiptSub;
    box.append(h, sub);

    box.appendChild(line(s.setup, rangeInr(res.setup)));
    box.appendChild(line(s.run, rangeInr(res.run) + s.perMonth, fmt(s.runSub, { model: cfg.run_model.display_name || cfg.run_model.id })));
    box.appendChild(line(s.oversight, rangeInr(res.oversight) + s.perMonth, fmt(s.oversightSub, { hours: r1(res.oversightHours) })));
    box.appendChild(line(s.baseline, rangeInr(res.baseline) + s.perMonth,
      fmt(s.baselineSub, { hours: r1(res.baselineHours), wage: rangeInr(res.assumptions.wage_used_inr_per_hour) })));
    box.appendChild(line(s.net, rangeInr(res.net) + s.perMonth, null, "total"));

    let be;
    if (res.breakEven === "never") be = s.be_never;
    else if (res.breakEven === "possible") be = s.be_possible;
    else be = fmt(s.be_assured, { lo: Math.ceil(res.payback[0]), hi: Math.ceil(res.payback[1]) });
    box.appendChild(line(s.breakEven, be));

    const v = document.createElement("div"); v.className = "verdict " + res.verdict; v.textContent = s.verdict[res.verdict];
    box.appendChild(v);

    const h3 = document.createElement("h3"); h3.textContent = s.drivers;
    const ul = document.createElement("ul");
    a.price_drivers.forEach((d) => { const li = document.createElement("li"); li.textContent = d; ul.appendChild(li); });
    box.append(h3, ul);
    if (a.when_not_worth_it) {
      const h4 = document.createElement("h3"); h4.textContent = s.notWorth;
      const p = document.createElement("p"); p.textContent = a.when_not_worth_it;
      box.append(h4, p);
    }

    const foot = document.createElement("div"); foot.className = "foot";
    const p0 = document.createElement("p");
    p0.textContent = fmt(s.assumptions, { days: cfg.working_days_per_month, fx: cfg.usd_to_inr, date: cfg.run_model.pricing_snapshot_date || "—" });
    const p1 = document.createElement("p"); p1.textContent = s.foot1;
    const p2 = document.createElement("p"); p2.textContent = s.foot2;
    const cta = document.createElement("a"); cta.className = "cta"; cta.href = "mailto:contact@wyrdwerk.com"; cta.textContent = s.cta;
    foot.append(p0, p1, p2, cta);
    box.appendChild(foot);
  }

  // ---------- screens ----------
  function show(id) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
    $(id).classList.remove("hidden");
    window.scrollTo(0, 0);
  }

  // ---------- share link: full state in URL fragment, Unicode-safe ----------
  function encodeState() {
    const a = archetypeById(state.archetype_id);
    const payload = {
      v: 1, language: state.language, description: state.description.slice(0, 500),
      archetype_id: state.archetype_id, source: state.source, answers: state.answers,
      frozen: state.frozen || { archetype: a, config: DATA.config },
    };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decodeState(frag) {
    try {
      const b64 = frag.replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(b64);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const p = JSON.parse(new TextDecoder().decode(bytes));
      if (p.v !== 1) return null;
      if (!["en", "hi"].includes(p.language)) return null;
      if (!TAPS.tasks_per_day.includes(p.answers?.tasks_per_day)) return null;
      if (!TAPS.minutes_per_task.includes(p.answers?.minutes_per_task)) return null;
      if (!TAPS.current_handling.includes(p.answers?.current_handling)) return null;
      const fa = p.frozen?.archetype, fc = p.frozen?.config;
      if (!fa || !fc || typeof fa.id !== "string" || !isFiniteRange(fa.setup_hours) || !isFiniteRange(fa.steps_per_task)
        || !isFiniteRange(fa.tokens_per_step?.input) || !isFiniteRange(fa.tokens_per_step?.output)
        || !Number.isFinite(fa.review_min_per_day) || !isFiniteRange(fa.baseline_wage_assumption?.inr_per_hour)
        || !Number.isFinite(fc.working_days_per_month) || !Number.isFinite(fc.usd_to_inr)
        || !isFiniteRange(fc.owner_hourly_value_inr) || !isFiniteRange(fc.setup_hourly_rate_inr)
        || !fc.run_model || !Number.isFinite(fc.run_model.input_usd_per_million) || !Number.isFinite(fc.run_model.output_usd_per_million)) return null;
      fa.name_en = String(fa.name_en || ""); fa.name_hi = String(fa.name_hi || "");
      fa.price_drivers = Array.isArray(fa.price_drivers) ? fa.price_drivers.slice(0, 3).map(String) : [];
      fa.when_not_worth_it = String(fa.when_not_worth_it || "");
      return p;
    } catch { return null; }
  }
  const isFiniteRange = (r) => Array.isArray(r) && r.length === 2 && r.every(Number.isFinite);

  // ---------- AI classification (layer 2; null = silently stay manual) ----------
  async function classify() {
    const description = $("#description").value.trim();
    if (description.length < 8) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const r = await fetch("/api/estimate", {
        method: "POST", headers: { "content-type": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({ description, language: state.language, answers: state.answers }),
      });
      if (!r.ok) return null;
      const j = await r.json();
      return j && typeof j.archetype_id === "string" && archetypeById(j.archetype_id) ? j : null;
    } catch { return null; }
    finally { clearTimeout(timer); }
  }

  // ---------- wiring ----------
  async function init() {
    await loadData();
    document.querySelectorAll(".lang button").forEach((b) => { b.onclick = () => { state.language = b.dataset.lang; applyI18n(); }; });
    $("#description").oninput = (e) => { state.description = e.target.value; };

    $("#toQuestions").onclick = async () => {
      state.description = $("#description").value;
      if (!state.archetype_id) return;
      show("#screen-questions"); renderTaps(); renderMatchLabel();
    };
    $("#backToDescribe").onclick = () => show("#screen-describe");
    $("#toReceipt").onclick = () => { state.frozen = null; renderReceipt(); show("#screen-receipt"); location.hash = encodeState(); };
    $("#startOver").onclick = () => {
      history.replaceState(null, "", location.pathname);
      state.archetype_id = null; state.frozen = null; state.source = "manual";
      state.answers = { tasks_per_day: null, current_handling: null, minutes_per_task: null };
      $("#description").value = ""; applyI18n(); show("#screen-describe");
    };
    $("#copyLink").onclick = async () => {
      location.hash = encodeState();
      try { await navigator.clipboard.writeText(location.href); $("#copyLink").textContent = t().copied; setTimeout(applyI18n, 1500); } catch {}
    };

    const shared = location.hash.length > 1 ? decodeState(location.hash.slice(1)) : null;
    if (shared) {
      Object.assign(state, { language: shared.language, description: shared.description, archetype_id: shared.frozen.archetype.id,
        source: shared.source === "ai" ? "ai" : "shared", answers: shared.answers, frozen: shared.frozen });
      applyI18n(); renderReceipt(); show("#screen-receipt");
    } else {
      applyI18n(); show("#screen-describe");
    }
  }
  // Exposed for the AI layer to hook in (layer 2 wires the describe → classify flow).
  window.CKH = { state, classify, renderChips, renderMatchLabel };
  init();
})();
