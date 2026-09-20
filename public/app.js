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
      perMonth: "/mo", examples: "Try an example:",
      tierLabel: "Which model runs the agent?", tierSub: "{model} · intelligence {iq} · ${pin}/{pout} per M tokens",
      tiers: { cheap: "Cheap", balanced: "Balanced", frontier: "Frontier", custom: "Other…" },
      searchPlaceholder: "Search TokenWatch: e.g. deepseek, gemini, llama", searchHint: "Prices from TokenWatch, USD per million tokens. Pick a row.",
      searchNone: "No match. Try another name.", searchFail: "TokenWatch unreachable — use the three tiers.", customLive: "live TokenWatch price, {date}",
      aiThinking: "Reading your description…", aiFallback: "Couldn't read that automatically — tap the closest match below.",
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
      perMonth: "/महीना", examples: "उदाहरण देखें:",
      tierLabel: "एजेंट कौन-सा मॉडल चलाएगा?", tierSub: "{model} · इंटेलिजेंस {iq} · ${pin}/{pout} प्रति M टोकन",
      tiers: { cheap: "सस्ता", balanced: "संतुलित", frontier: "सबसे तेज़", custom: "और…" },
      searchPlaceholder: "TokenWatch में खोजें: जैसे deepseek, gemini, llama", searchHint: "कीमतें TokenWatch से, USD प्रति मिलियन टोकन। एक चुनिए।",
      searchNone: "कुछ नहीं मिला। दूसरा नाम आज़माएँ।", searchFail: "TokenWatch नहीं मिला — तीन टियर इस्तेमाल करें।", customLive: "TokenWatch लाइव कीमत, {date}",
      aiThinking: "आपका विवरण पढ़ रहे हैं…", aiFallback: "अपने आप समझ नहीं आया — नीचे सबसे नज़दीकी काम चुनिए।",
    },
  };
  const TIERS = ["cheap", "balanced", "frontier", "custom"];
  const TOKENWATCH_SEARCH = "https://tokenwatch.wyrdwerk.com/api/v1/models?limit=10&search=";
  const TAPS = {
    tasks_per_day: [1, 5, 10, 20, 50, 100],
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
    model_tier: null, // "cheap" | "balanced" | "frontier" | "custom"; null → config.default_tier
    custom_model: null, // priced model object picked from TokenWatch search (tier "custom")
    searchOpen: false,
    frozen: null, // { archetype, config } snapshot embedded in share links
  };
  let DATA = { archetypes: [], config: null };

  const $ = (sel) => document.querySelector(sel);
  const t = () => STR[state.language];

  // ---------- data ----------
  async function loadData() {
    const [a, c, sc] = await Promise.all([
      fetch("/data/archetypes.json").then((r) => r.json()),
      fetch("/data/config.json").then((r) => r.json()),
      fetch("/data/scenarios.json").then((r) => r.json()).catch(() => ({ scenarios: [] })),
    ]);
    DATA = { archetypes: a.archetypes, config: c, scenarios: sc.scenarios || [] };
  }
  const archetypeById = (id) => DATA.archetypes.find((x) => x.id === id) || null;
  const archName = (a) => (state.language === "hi" ? a.name_hi : a.name_en);

  // ---------- render helpers ----------
  function applyI18n() {
    document.documentElement.lang = state.language;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t()[el.dataset.i18n]; });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t()[el.dataset.i18nPlaceholder]; });
    document.querySelectorAll(".lang button").forEach((b) => setChecked(b, b.dataset.lang === state.language));
    renderChips();
    renderExamples();
    renderTaps();
    renderMatchLabel();
    if (!$("#screen-receipt").classList.contains("hidden")) renderReceipt();
  }

  // Single-choice groups follow the ARIA radio pattern: role=radiogroup > role=radio[aria-checked], roving tabindex,
  // arrow keys move + select. Buttons stay <button> so click/tap behaviour is unchanged.
  const focusChecked = (group) => group?.querySelector('[role="radio"][aria-checked="true"]')?.focus({ preventScroll: true });
  function setChecked(b, on) { b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; }
  function radioKeys(group) {
    const radios = () => [...group.querySelectorAll('[role="radio"]')];
    if (!radios().some((r) => r.getAttribute("aria-checked") === "true")) radios().forEach((r, i) => { r.tabIndex = i === 0 ? 0 : -1; });
    group.onkeydown = (e) => {
      const list = radios(); const i = list.indexOf(document.activeElement); if (i < 0) return;
      let j = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % list.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + list.length) % list.length;
      else if (e.key === "Home") j = 0; else if (e.key === "End") j = list.length - 1;
      if (j === null) return;
      e.preventDefault(); list[j].click(); list[j].focus();
    };
  }

  function renderChips() {
    const box = $("#chips");
    box.replaceChildren();
    DATA.archetypes.forEach((a) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.setAttribute("role", "radio");
      b.textContent = archName(a);
      setChecked(b, state.archetype_id === a.id);
      b.onclick = () => { state.archetype_id = a.id; state.source = "manual"; renderChips(); $("#toQuestions").disabled = false; focusChecked(box); };
      box.appendChild(b);
    });
    radioKeys(box);
    updateNext();
  }
  const updateNext = () => { $("#toQuestions").disabled = !state.archetype_id && $("#description").value.trim().length < 8; };

  function renderExamples() {
    const box = $("#examples");
    box.replaceChildren();
    DATA.scenarios.forEach((sc) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip example";
      b.textContent = state.language === "hi" ? sc.title_hi : sc.title_en;
      b.onclick = () => {
        $("#description").value = state.description = state.language === "hi" ? sc.description_hi : sc.description_en;
        applyScenario(sc, "canned");
        show("#screen-questions"); renderTaps(); renderMatchLabel();
      };
      box.appendChild(b);
    });
  }
  function applyScenario(sc, source) {
    state.archetype_id = sc.archetype_id; state.source = source;
    state.answers = { ...sc.answers };
    renderChips();
  }
  // Keyword fallback when the classifier is unavailable. Longest keyword hit wins; null if nothing matches.
  function matchScenario(text) {
    const hay = " " + text.toLowerCase() + " ";
    let best = null, bestLen = 0;
    DATA.scenarios.forEach((sc) => sc.keywords.forEach((k) => {
      if (k.length > bestLen && hay.includes(k.toLowerCase())) { best = sc; bestLen = k.length; }
    }));
    return best;
  }

  function renderTaps() {
    document.querySelectorAll(".taps").forEach((box) => {
      const q = box.dataset.q;
      box.replaceChildren();
      TAPS[q].forEach((val) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "tap"; b.setAttribute("role", "radio");
        b.textContent = q === "current_handling" ? t().who[val] : String(val);
        setChecked(b, state.answers[q] === val);
        b.onclick = () => { state.answers[q] = val; renderTaps(); focusChecked($(`.taps[data-q="${q}"]`)); };
        box.appendChild(b);
      });
      radioKeys(box);
    });
    const done = Object.values(state.answers).every((v) => v !== null);
    $("#toReceipt").disabled = !done;
  }

  function renderMatchLabel() {
    const a = archetypeById(state.archetype_id);
    if (!a) return;
    const key = state.source === "manual" ? "picked" : "closest";
    $("#matchLabel").textContent = fmt(t()[key], { name: archName(a) });
  }

  function line(k, v, sub, cls) {
    const d = document.createElement("div"); d.className = "line" + (cls ? " " + cls : "");
    const kk = document.createElement("span"); kk.className = "k"; kk.textContent = k;
    if (sub) { const s = document.createElement("small"); s.textContent = sub; kk.appendChild(s); }
    const vv = document.createElement("span"); vv.className = "v"; vv.textContent = v;
    d.append(kk, vv); return d;
  }

  // Model tier: three pinned models from TokenWatch; switching recomputes the receipt live.
  function tierSwitch(cfg, tier, s) {
    const wrap = document.createElement("div"); wrap.className = "tier";
    const lab = document.createElement("div"); lab.className = "k"; lab.textContent = s.tierLabel;
    const seg = document.createElement("div"); seg.className = "seg"; seg.setAttribute("role", "radiogroup"); seg.setAttribute("aria-label", s.tierLabel);
    TIERS.filter((k) => k === "custom" || (cfg.run_models && cfg.run_models[k])).forEach((k) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = s.tiers[k]; b.setAttribute("role", "radio");
      setChecked(b, state.searchOpen ? k === "custom" : k === tier);
      b.onclick = () => {
        if (k === "custom") { state.searchOpen = true; renderReceipt(); $("#twSearch")?.focus(); return; }
        state.model_tier = k; state.searchOpen = false; renderReceipt(); location.hash = encodeState(); focusChecked($(".tier .seg"));
      };
      seg.appendChild(b);
    });
    radioKeys(seg);
    wrap.append(lab, seg);
    if (state.searchOpen) wrap.appendChild(searchPanel(s));
    const m = Engine.resolveModel(cfg, tier);
    const sub = document.createElement("small");
    sub.textContent = fmt(s.tierSub, { model: m.display_name || m.id, iq: m.intelligence_index ?? "—", pin: m.input_usd_per_million, pout: m.output_usd_per_million })
      + (tier === "custom" ? " · " + fmt(s.customLive, { date: m.pricing_snapshot_date }) : "");
    wrap.appendChild(sub); return wrap;
  }

  // "Other…" — one small TokenWatch search (limit 10, never the catalog). Picked row is frozen into state + share link.
  function searchPanel(s) {
    const box = document.createElement("div"); box.className = "twsearch";
    const inp = document.createElement("input"); inp.type = "search"; inp.id = "twSearch"; inp.placeholder = s.searchPlaceholder; inp.autocomplete = "off";
    const hint = document.createElement("small"); hint.textContent = s.searchHint;
    const list = document.createElement("div"); list.className = "twlist";
    let timer = null, seq = 0;
    inp.oninput = () => {
      clearTimeout(timer);
      const q = inp.value.trim();
      if (q.length < 2) { list.replaceChildren(); return; }
      timer = setTimeout(async () => {
        const my = ++seq;
        try {
          const r = await fetch(TOKENWATCH_SEARCH + encodeURIComponent(q), { signal: AbortSignal.timeout(6000) });
          if (!r.ok) throw new Error(String(r.status));
          const j = await r.json();
          if (my !== seq) return;
          renderRows(Array.isArray(j.models) ? j.models : []);
        } catch { if (my === seq) { list.replaceChildren(); const e = document.createElement("small"); e.textContent = s.searchFail; list.appendChild(e); } }
      }, 300);
    };
    function renderRows(rows) {
      list.replaceChildren();
      const usable = rows.filter((m) => m && typeof m.id === "string" && !/:batch$/.test(m.id) && m.pricing
        && Number.isFinite(m.pricing.input) && Number.isFinite(m.pricing.output));
      if (!usable.length) { const e = document.createElement("small"); e.textContent = s.searchNone; list.appendChild(e); return; }
      usable.forEach((m) => {
        const b = document.createElement("button"); b.type = "button"; b.className = "twrow";
        const name = document.createElement("span"); name.textContent = String(m.name || m.id).slice(0, 60) + " · " + String(m.provider_display || m.provider || "").slice(0, 24);
        const price = document.createElement("span"); price.className = "price";
        price.textContent = "$" + m.pricing.input + "/" + m.pricing.output + (m.benchmarks?.intelligence_index != null ? " · iq " + m.benchmarks.intelligence_index : "");
        b.append(name, price);
        b.onclick = () => {
          state.custom_model = {
            id: String(m.id).slice(0, 80), display_name: String(m.name || m.id).slice(0, 60), provider: String(m.provider || "").slice(0, 40),
            input_usd_per_million: m.pricing.input, output_usd_per_million: m.pricing.output,
            intelligence_index: Number.isFinite(m.benchmarks?.intelligence_index) ? m.benchmarks.intelligence_index : null,
            pricing_snapshot_date: new Date().toISOString().slice(0, 10), pricing_source: "TokenWatch search (live)",
          };
          state.model_tier = "custom"; state.searchOpen = false; renderReceipt(); location.hash = encodeState();
        };
        list.appendChild(b);
      });
    }
    box.append(inp, hint, list); return box;
  }

  function renderReceipt() {
    const a = state.frozen ? state.frozen.archetype : archetypeById(state.archetype_id);
    const cfg = state.frozen ? state.frozen.config : DATA.config;
    let tier = TIERS.includes(state.model_tier) ? state.model_tier : cfg.default_tier;
    if (tier === "custom" && !isPricedModel(state.custom_model)) tier = cfg.default_tier;
    const cfgUsed = tier === "custom" ? { ...cfg, run_models: { ...cfg.run_models, custom: state.custom_model } } : cfg;
    const model = Engine.resolveModel(cfgUsed, tier);
    const res = Engine.estimate(a, cfgUsed, { ...state.answers, model_tier: tier });
    const s = t();
    const box = $("#receipt");
    box.replaceChildren();

    const h = document.createElement("h2"); h.textContent = s.receiptTitle;
    const sub = document.createElement("p"); sub.className = "sub";
    sub.textContent = fmt(s[state.source === "manual" ? "picked" : "closest"], { name: archName(a) }) + " · " + s.receiptSub;
    box.append(h, sub);

    box.appendChild(line(s.setup, rangeInr(res.setup)));
    box.appendChild(tierSwitch(cfgUsed, tier, s));
    box.appendChild(line(s.run, rangeInr(res.run) + s.perMonth, fmt(s.runSub, { model: model.display_name || model.id })));
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
    (state.language === "hi" && a.price_drivers_hi ? a.price_drivers_hi : a.price_drivers).forEach((d) => { const li = document.createElement("li"); li.textContent = d; ul.appendChild(li); });
    box.append(h3, ul);
    const notWorth = (state.language === "hi" && a.when_not_worth_it_hi) || a.when_not_worth_it;
    if (notWorth) {
      const h4 = document.createElement("h3"); h4.textContent = s.notWorth;
      const p = document.createElement("p"); p.textContent = notWorth;
      box.append(h4, p);
    }

    const foot = document.createElement("div"); foot.className = "foot";
    const p0 = document.createElement("p");
    p0.textContent = fmt(s.assumptions, { days: cfg.working_days_per_month, fx: cfg.usd_to_inr, date: model.pricing_snapshot_date || "—" });
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
      model_tier: state.model_tier, custom_model: state.model_tier === "custom" ? state.custom_model : null,
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
        || !isPricedModelSet(fc)) return null;
      if (p.model_tier != null && !TIERS.includes(p.model_tier)) return null;
      if (p.model_tier === "custom") {
        const cm = p.custom_model;
        if (!isPricedModel(cm) || typeof cm.id !== "string") return null;
        p.custom_model = { id: cm.id.slice(0, 80), display_name: String(cm.display_name || cm.id).slice(0, 60), provider: String(cm.provider || "").slice(0, 40),
          input_usd_per_million: cm.input_usd_per_million, output_usd_per_million: cm.output_usd_per_million,
          intelligence_index: Number.isFinite(cm.intelligence_index) ? cm.intelligence_index : null,
          pricing_snapshot_date: String(cm.pricing_snapshot_date || "").slice(0, 10), pricing_source: "TokenWatch search (shared)" };
      } else p.custom_model = null;
      fa.name_en = String(fa.name_en || ""); fa.name_hi = String(fa.name_hi || "");
      fa.price_drivers = Array.isArray(fa.price_drivers) ? fa.price_drivers.slice(0, 3).map(String) : [];
      fa.when_not_worth_it = String(fa.when_not_worth_it || ""); fa.when_not_worth_it_hi = String(fa.when_not_worth_it_hi || "");
      fa.price_drivers_hi = Array.isArray(fa.price_drivers_hi) ? fa.price_drivers_hi.slice(0, 3).map(String) : null;
      return p;
    } catch { return null; }
  }
  const isPricedModel = (m) => m && Number.isFinite(m.input_usd_per_million) && Number.isFinite(m.output_usd_per_million);
  // Accepts current {run_models, default_tier} or the legacy single run_model shape (v1 links from before tiers).
  const isPricedModelSet = (fc) => fc.run_models
    ? Object.values(fc.run_models).length > 0 && Object.values(fc.run_models).every(isPricedModel) && ["cheap", "balanced", "frontier"].includes(fc.default_tier)
    : isPricedModel(fc.run_model);
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
    $("#description").oninput = (e) => { state.description = e.target.value; $("#aiStatus").textContent = ""; updateNext(); };

    $("#toQuestions").onclick = async () => {
      state.description = $("#description").value.trim();
      const btn = $("#toQuestions");
      // A tapped chip is an explicit choice: no model call. Otherwise ask the classifier, with manual as fallback.
      if (!state.archetype_id && state.description.length >= 8) {
        btn.disabled = true; $("#aiStatus").textContent = t().aiThinking;
        const ai = await classify();
        btn.disabled = false; $("#aiStatus").textContent = "";
        if (ai) {
          state.archetype_id = ai.archetype_id; state.source = "ai";
          state.answers = { tasks_per_day: ai.tasks_per_day, current_handling: ai.current_handling, minutes_per_task: ai.minutes_per_task };
          renderChips();
        } else {
          const sc = matchScenario(state.description);
          if (sc) applyScenario(sc, "canned");
          else { $("#aiStatus").textContent = t().aiFallback; return; }
        }
      }
      if (!state.archetype_id) return;
      show("#screen-questions"); renderTaps(); renderMatchLabel();
    };
    $("#backToDescribe").onclick = () => show("#screen-describe");
    $("#toReceipt").onclick = () => { state.frozen = null; renderReceipt(); show("#screen-receipt"); location.hash = encodeState(); };
    $("#startOver").onclick = () => {
      history.replaceState(null, "", location.pathname);
      state.archetype_id = null; state.frozen = null; state.source = "manual"; state.model_tier = null; state.custom_model = null; state.searchOpen = false;
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
        source: ["ai", "canned", "manual"].includes(shared.source) ? shared.source : "shared", answers: shared.answers, frozen: shared.frozen,
        model_tier: shared.model_tier || null, custom_model: shared.custom_model || null });
      applyI18n(); renderReceipt(); show("#screen-receipt");
    } else {
      applyI18n(); show("#screen-describe");
    }
  }
  // Exposed for the AI layer to hook in (layer 2 wires the describe → classify flow).
  window.CKH = { state, classify, renderChips, renderMatchLabel };
  init();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
})();
