/* What's the cost? — client. Vanilla JS, no build step.
   Manual mode is the product; the AI classifier (POST /api/estimate) is layered on top and may return null. */
(function () {
  "use strict";

  // ---------- i18n ----------
  const STR = {
    en: {
      title: "What's the cost?",
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
      cta: "Talk to WyrdWerk → connect@wyrdwerk.com",
      savePdf: "Save as PDF", saveImage: "Save as image", saving: "Preparing…", printLink: "Open this estimate again:", tapToReopen: "tap this link to reopen with the same numbers", madeWith: "agentcost.wyrdwerk.com · {date}",
      perMonth: "/mo", examples: "Try an example:",
      tierLabel: "Which model runs the agent?", tierSub: "{model} · intelligence {iq} · ${pin}/{pout} per M tokens",
      tiers: { cheap: "Cheap", balanced: "Balanced", frontier: "Frontier", custom: "Other…" },
      searchPlaceholder: "Search TokenWatch: e.g. deepseek, gemini, llama", searchHint: "Prices from TokenWatch, USD per million tokens. Pick a row.",
      searchNone: "No match. Try another name.", searchFail: "{source} unreachable — use the three tiers.", customLive: "live {source} price, {date}",
      sources: { tokenwatch: "TokenWatch", openrouter: "OpenRouter" }, sourceLabel: "Price source", orLoading: "Loading OpenRouter list (once)…",
      orHint: "OpenRouter prices are what OpenRouter charges (may differ from the maker's own price). USD per million tokens.",
      aiThinking: "Reading your description…", aiFallback: "Couldn't read that automatically — tap the closest match below.",
    },
    hi: {
      title: "What's the cost?",
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
      cta: "WyrdWerk से बात करें → connect@wyrdwerk.com",
      savePdf: "PDF सेव करें", saveImage: "इमेज सेव करें", saving: "बना रहे हैं…", printLink: "यह अनुमान फिर खोलें:", tapToReopen: "इसी आँकड़ों के साथ खोलने के लिए यह लिंक दबाएँ", madeWith: "agentcost.wyrdwerk.com · {date}",
      perMonth: "/महीना", examples: "उदाहरण देखें:",
      tierLabel: "एजेंट कौन-सा मॉडल चलाएगा?", tierSub: "{model} · इंटेलिजेंस {iq} · ${pin}/{pout} प्रति M टोकन",
      tiers: { cheap: "सस्ता", balanced: "संतुलित", frontier: "सबसे तेज़", custom: "और…" },
      searchPlaceholder: "TokenWatch में खोजें: जैसे deepseek, gemini, llama", searchHint: "कीमतें TokenWatch से, USD प्रति मिलियन टोकन। एक चुनिए।",
      searchNone: "कुछ नहीं मिला। दूसरा नाम आज़माएँ।", searchFail: "{source} नहीं मिला — तीन टियर इस्तेमाल करें।", customLive: "{source} लाइव कीमत, {date}",
      sources: { tokenwatch: "TokenWatch", openrouter: "OpenRouter" }, sourceLabel: "कीमत का स्रोत", orLoading: "OpenRouter सूची लोड हो रही है (एक बार)…",
      orHint: "OpenRouter की कीमत वह है जो OpenRouter लेता है (मूल कंपनी की कीमत से अलग हो सकती है)। USD प्रति मिलियन टोकन।",
      aiThinking: "आपका विवरण पढ़ रहे हैं…", aiFallback: "अपने आप समझ नहीं आया — नीचे सबसे नज़दीकी काम चुनिए।",
    },
  };
  const TIERS = ["cheap", "balanced", "frontier", "custom"];
  const TOKENWATCH_SEARCH = "https://tokenwatch.wyrdwerk.com/api/v1/models?limit=10&search=";
  // OpenRouter catalog is public (no key), CORS *, ~450 rows. Fetched at most once per page load, only after the user picks the OpenRouter source.
  const OPENROUTER_MODELS = "https://openrouter.ai/api/v1/models";
  const SOURCES = ["tokenwatch", "openrouter"];
  let openrouterCatalog = null; // Promise<Array<normalised row>> once requested
  const TAPS = {
    tasks_per_day: [1, 5, 10, 20, 50, 100],
    minutes_per_task: [2, 5, 10, 20, 30],
    current_handling: ["me", "staff", "nobody"],
  };
  const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? vars[k] : ""));
  const inr = (n) => (n < 0 ? "−" : "") + "₹" + Math.abs(Math.round(n)).toLocaleString("en-IN");
  // Always both bounds, even when equal (₹0 – ₹0): the product promise is "ranges, never point estimates".
  const rangeInr = ([lo, hi]) => inr(lo) + " – " + inr(hi);
  const r1 = (n) => (Math.round(n * 10) / 10).toString();

  // ---------- state ----------
  const state = {
    language: "en",
    description: "",
    archetype_id: null,
    source: "manual", // "manual" | "ai" | "shared"
    answers: { tasks_per_day: null, current_handling: null, minutes_per_task: null },
    model_tier: null, // "cheap" | "balanced" | "frontier" | "custom"; null → config.default_tier
    custom_model: null, // priced model object picked from TokenWatch/OpenRouter search (tier "custom")
    searchOpen: false,
    searchSource: "tokenwatch", // "tokenwatch" | "openrouter" (UI-only, not part of the share link)
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
    if (!$("#screen-receipt").classList.contains("hidden") && (state.frozen || state.archetype_id)) renderReceipt();
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
  function tierSwitch(cfg, tier, s, modelLine) {
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
    const sub = document.createElement("small"); sub.className = "modelline"; sub.textContent = modelLine;
    wrap.appendChild(sub); return wrap;
  }

  // "Other…" — pick a model from one of two live price sources. Never fetched at receipt render; only after the user opens this panel.
  //  • TokenWatch: one small search per keystroke (limit 10, first-party prices).
  //  • OpenRouter: public catalog (~450 rows, no key) fetched ONCE per page load when the source is chosen, then filtered client-side.
  // Picked row is normalised to the same priced-model shape and frozen into state + share link.
  function loadOpenRouter() {
    if (!openrouterCatalog) {
      openrouterCatalog = fetch(OPENROUTER_MODELS, { signal: AbortSignal.timeout(10000) })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then((j) => (Array.isArray(j.data) ? j.data.slice(0, 5000) : []).filter((m) => m && typeof m.id === "string" && m.pricing).map((m) => {
          // OpenRouter prices are USD PER TOKEN as strings; convert to USD per million once, here.
          const pin = Number(m?.pricing?.prompt) * 1e6, pout = Number(m?.pricing?.completion) * 1e6;
          return { id: m.id, name: m.name, provider: "openrouter", provider_display: "OpenRouter",
            pricing: { input: Math.round(pin * 1000) / 1000, output: Math.round(pout * 1000) / 1000 }, benchmarks: null };
        }))
        .catch((e) => { openrouterCatalog = null; throw e; }); // allow a retry on the next keystroke
    }
    return openrouterCatalog;
  }
  const norm = (x) => String(x || "").toLowerCase();

  function searchPanel(s) {
    const box = document.createElement("div"); box.className = "twsearch";
    const srcRow = document.createElement("div"); srcRow.className = "seg src"; srcRow.setAttribute("role", "radiogroup"); srcRow.setAttribute("aria-label", s.sourceLabel);
    SOURCES.forEach((k) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = s.sources[k]; b.setAttribute("role", "radio"); b.dataset.src = k;
      setChecked(b, state.searchSource === k);
      b.onclick = () => { state.searchSource = k; renderReceipt(); $("#twSearch")?.focus(); };
      srcRow.appendChild(b);
    });
    radioKeys(srcRow);
    const src = state.searchSource;
    const inp = document.createElement("input"); inp.type = "search"; inp.id = "twSearch"; inp.autocomplete = "off";
    inp.placeholder = s.searchPlaceholder.replace("TokenWatch", s.sources[src]);
    const hint = document.createElement("small"); hint.textContent = src === "openrouter" ? s.orHint : s.searchHint;
    const list = document.createElement("div"); list.className = "twlist";
    const note = (txt) => { list.replaceChildren(); const e = document.createElement("small"); e.textContent = txt; list.appendChild(e); };
    let timer = null, seq = 0, inflight = null;
    inp.oninput = () => {
      clearTimeout(timer);
      inflight?.abort(); inflight = null;
      const q = inp.value.trim();
      if (q.length < 2) { list.replaceChildren(); return; }
      timer = setTimeout(async () => {
        const my = ++seq;
        try {
          let rows;
          if (src === "openrouter") {
            if (!openrouterCatalog) note(s.orLoading);
            const all = await loadOpenRouter();
            if (my !== seq) return;
            const nq = norm(q);
            rows = all.filter((m) => norm(m.id).includes(nq) || norm(m.name).includes(nq)).slice(0, 10);
          } else {
            inflight = new AbortController();
            const kill = setTimeout(() => inflight?.abort(), 6000);
            const r = await fetch(TOKENWATCH_SEARCH + encodeURIComponent(q), { signal: inflight.signal }).finally(() => clearTimeout(kill));
            if (!r.ok) throw new Error(String(r.status));
            const j = await r.json();
            if (my !== seq) return;
            rows = (Array.isArray(j.models) ? j.models : []).slice(0, 10);
          }
          renderRows(rows);
        } catch (err) { if (my === seq && err?.name !== "AbortError") note(fmt(s.searchFail, { source: s.sources[src] })); }
      }, 300);
    };
    function renderRows(rows) {
      list.replaceChildren();
      const usable = rows.filter((m) => m && typeof m.id === "string" && !/:batch$/.test(m.id) && m.pricing
        && Number.isFinite(m.pricing.input) && Number.isFinite(m.pricing.output) && m.pricing.input >= 0 && m.pricing.output >= 0);
      if (!usable.length) { note(s.searchNone); return; }
      usable.forEach((m) => {
        const b = document.createElement("button"); b.type = "button"; b.className = "twrow";
        const name = document.createElement("span"); name.textContent = String(m.name || m.id).slice(0, 60) + " · via " + String(m.provider_display || m.provider || "?").slice(0, 24);
        const price = document.createElement("span"); price.className = "price";
        price.textContent = "$" + m.pricing.input + "/" + m.pricing.output + (m.benchmarks?.intelligence_index != null ? " · iq " + m.benchmarks.intelligence_index : "");
        b.append(name, price);
        b.onclick = () => {
          state.custom_model = {
            id: String(m.id).slice(0, 80), display_name: String(m.name || m.id).slice(0, 60), provider: String(m.provider || "").slice(0, 40),
            input_usd_per_million: m.pricing.input, output_usd_per_million: m.pricing.output,
            intelligence_index: Number.isFinite(m.benchmarks?.intelligence_index) ? m.benchmarks.intelligence_index : null,
            pricing_snapshot_date: new Date().toISOString().slice(0, 10), pricing_source: src,
          };
          state.model_tier = "custom"; state.searchOpen = false; renderReceipt(); location.hash = encodeState();
        };
        list.appendChild(b);
      });
    }
    box.append(srcRow, inp, hint, list); return box;
  }

  // Everything the receipt says, as plain data. Rendered three ways: DOM (below), print CSS, and the PNG canvas.
  function receiptModel() {
    const a = state.frozen ? state.frozen.archetype : archetypeById(state.archetype_id);
    const cfg = state.frozen ? state.frozen.config : DATA.config;
    let tier = TIERS.includes(state.model_tier) ? state.model_tier : cfg.default_tier;
    if (tier === "custom" && !isPricedModel(state.custom_model)) tier = cfg.default_tier;
    const cfgUsed = tier === "custom" ? { ...cfg, run_models: { ...cfg.run_models, custom: state.custom_model } } : cfg;
    const model = Engine.resolveModel(cfgUsed, tier);
    const res = Engine.estimate(a, cfgUsed, { ...state.answers, model_tier: tier });
    const s = t();
    let be;
    if (res.breakEven === "never") be = s.be_never;
    else if (res.breakEven === "possible") be = s.be_possible;
    else be = fmt(s.be_assured, { lo: Math.ceil(res.payback[0]), hi: Math.ceil(res.payback[1]) });
    const via = tier === "custom" && model.provider && model.provider !== "openrouter" ? " via " + model.provider : "";
    return {
      a, cfg, cfgUsed, tier, model, res, s,
      title: s.receiptTitle,
      sub: fmt(s[state.source === "manual" ? "picked" : "closest"], { name: archName(a) }) + " · " + s.receiptSub,
      modelLine: fmt(s.tierSub, { model: (model.display_name || model.id) + via, iq: model.intelligence_index ?? "—", pin: model.input_usd_per_million, pout: model.output_usd_per_million })
        + (tier === "custom" ? " · " + fmt(s.customLive, { date: model.pricing_snapshot_date, source: s.sources[model.pricing_source] || s.sources.tokenwatch }) : ""),
      lines: [
        { k: s.setup, v: rangeInr(res.setup) },
        { k: s.run, v: rangeInr(res.run) + s.perMonth, sub: fmt(s.runSub, { model: model.display_name || model.id }) },
        { k: s.oversight, v: rangeInr(res.oversight) + s.perMonth, sub: fmt(s.oversightSub, { hours: r1(res.oversightHours) }) },
        { k: s.baseline, v: rangeInr(res.baseline) + s.perMonth, sub: fmt(s.baselineSub, { hours: r1(res.baselineHours), wage: rangeInr(res.assumptions.wage_used_inr_per_hour) }) },
        { k: s.net, v: rangeInr(res.net) + s.perMonth, total: true },
        { k: s.breakEven, v: be },
      ],
      verdict: res.verdict, verdictText: s.verdict[res.verdict],
      drivers: state.language === "hi" && a.price_drivers_hi ? a.price_drivers_hi : a.price_drivers,
      notWorth: (state.language === "hi" && a.when_not_worth_it_hi) || a.when_not_worth_it,
      assumptions: fmt(s.assumptions, { days: cfg.working_days_per_month, fx: cfg.usd_to_inr, date: model.pricing_snapshot_date || "—" }),
      foot1: s.foot1, foot2: s.foot2, cta: s.cta,
      madeWith: fmt(s.madeWith, { date: new Date().toISOString().slice(0, 10) }),
    };
  }

  function renderReceipt() {
    const R = receiptModel();
    const { a, cfg, cfgUsed, tier, model, res, s } = R;
    const box = $("#receipt");
    box.replaceChildren();

    const h = document.createElement("h2"); h.textContent = R.title;
    const sub = document.createElement("p"); sub.className = "sub"; sub.textContent = R.sub;
    box.append(h, sub);

    R.lines.forEach((L, i) => {
      box.appendChild(line(L.k, L.v, L.sub || null, L.total ? "total" : undefined));
      if (i === 0) box.appendChild(tierSwitch(cfgUsed, tier, s, R.modelLine));
    });

    const v = document.createElement("div"); v.className = "verdict " + R.verdict; v.textContent = R.verdictText;
    box.appendChild(v);

    const h3 = document.createElement("h3"); h3.textContent = s.drivers;
    const ul = document.createElement("ul");
    R.drivers.forEach((d) => { const li = document.createElement("li"); li.textContent = d; ul.appendChild(li); });
    box.append(h3, ul);
    if (R.notWorth) {
      const h4 = document.createElement("h3"); h4.textContent = s.notWorth;
      const p = document.createElement("p"); p.textContent = R.notWorth;
      box.append(h4, p);
    }

    const foot = document.createElement("div"); foot.className = "foot";
    const p0 = document.createElement("p"); p0.textContent = R.assumptions;
    const p1 = document.createElement("p"); p1.textContent = R.foot1;
    const p2 = document.createElement("p"); p2.textContent = R.foot2;
    const cta = document.createElement("a"); cta.className = "cta"; cta.href = "mailto:connect@wyrdwerk.com"; cta.textContent = R.cta;
    // Print-only: the share link, so a PDF can be reopened. Hidden on screen via CSS.
    const pl = document.createElement("p"); pl.className = "print-only";
    const plA = document.createElement("a"); plA.href = location.origin + location.pathname + "#" + encodeState();
    plA.textContent = location.host + " → " + s.tapToReopen; // full state stays in the href; PDF viewers keep the link
    pl.append(s.printLink + " ", plA, " · " + R.madeWith);
    foot.append(p0, p1, p2, cta, pl);
    box.appendChild(foot);
  }

  // ---------- Save as PDF (browser print) / Save as image (hand-drawn canvas, no libraries) ----------
  function wrapText(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/), lines = []; let cur = "";
    words.forEach((w) => { const test = cur ? cur + " " + w : w; if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; } else cur = test; });
    if (cur) lines.push(cur); return lines;
  }
  function drawReceiptPng() {
    const R = receiptModel();
    const W = 1080, PAD = 64, scale = 1; // 1080 px wide: crisp on phones, forwards well on WhatsApp
    const cv = document.createElement("canvas"); cv.width = W; cv.height = 400; // resized after measuring
    const ctx = cv.getContext("2d");
    const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
    const f = (px, weight) => { ctx.font = (weight || 400) + " " + px + "px " + FONT; };
    const ink = "#1b1b1b", muted = "#6b665c", lineC = "#d9d2c3", paper = "#fbf8f1";
    const VERDICT = { worth_it: ["#e6f4ea", "#1e6b3a"], assist_first: ["#fff4e0", "#8a5a00"], leave_it: ["#fbe4e0", "#a32a12"] };
    // Two passes: measure, then draw. `draw` is false on the first pass.
    function pass(draw) {
      let y = PAD;
      const text = (str, x, size, weight, color, maxW, align, lh) => {
        f(size, weight); ctx.fillStyle = color || ink; ctx.textAlign = align || "left";
        const ls = maxW ? wrapText(ctx, str, maxW) : [String(str)];
        ls.forEach((l) => { y += size * (lh || 1.15); if (draw) ctx.fillText(l, x, y); });
        return ls.length;
      };
      const rule = (dashed) => { y += 18; if (draw) { ctx.strokeStyle = dashed ? lineC : ink; ctx.lineWidth = dashed ? 2 : 3; ctx.setLineDash(dashed ? [6, 6] : []); ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke(); ctx.setLineDash([]); } y += 6; };
      text(R.title.toUpperCase(), PAD, 44, 700); y += 8;
      text(R.sub, PAD, 26, 400, muted, W - 2 * PAD); y += 10; rule(true);
      R.lines.forEach((L, i) => {
        y += 14;
        const yTop = y;
        // value right-aligned first to know its width, key wraps in the remaining space
        f(L.total ? 34 : 32, 700); const vw = ctx.measureText(L.v).width;
        const keyW = Math.max(240, W - 2 * PAD - vw - 30);
        const yKey = y; const n = text(L.k, PAD, L.total ? 32 : 30, L.total ? 700 : 400, ink, keyW);
        const yAfterKey = y; y = yKey; text(L.v, W - PAD, L.total ? 34 : 32, 700, ink, null, "right"); y = Math.max(y, yAfterKey);
        if (L.sub) { y += 2; text(L.sub, PAD, 24, 400, muted, W - 2 * PAD); }
        if (i === 0) { y += 6; text(R.modelLine, PAD, 24, 400, muted, W - 2 * PAD); }
        void yTop; void n;
        rule(L.total || i === R.lines.length - 1 ? false : true);
      });
      // verdict pill
      y += 20; const [bg, fg] = VERDICT[R.verdict] || ["#eee", ink];
      if (draw) { ctx.fillStyle = bg; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(PAD, y, W - 2 * PAD, 92, 16); else ctx.rect(PAD, y, W - 2 * PAD, 92); ctx.fill(); }
      y += 14; text(R.verdictText, W / 2, 38, 700, fg, null, "center"); y += 40;
      y += 26; text(R.s.drivers.toUpperCase(), PAD, 26, 700, muted); y += 6;
      R.drivers.forEach((d) => { y += 6; text("•  " + d, PAD, 26, 400, ink, W - 2 * PAD, "left", 1.25); });
      if (R.notWorth) { y += 22; text(R.s.notWorth.toUpperCase(), PAD, 26, 700, muted); y += 6; text(R.notWorth, PAD, 26, 400, ink, W - 2 * PAD, "left", 1.25); }
      y += 22; rule(true); y += 6;
      [R.assumptions, R.foot1, R.foot2, R.cta, R.madeWith].forEach((p) => { y += 8; text(p, PAD, 22, 400, muted, W - 2 * PAD, "left", 1.25); });
      return y + PAD;
    }
    const H = pass(false);
    cv.height = Math.ceil(H * scale);
    ctx.fillStyle = paper; ctx.fillRect(0, 0, W, cv.height);
    pass(true);
    return cv;
  }
  async function saveImage() {
    const btn = $("#saveImage"); const label = btn.textContent; btn.disabled = true; btn.textContent = t().saving;
    try {
      const cv = drawReceiptPng();
      const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
      const name = "whats-the-cost-" + new Date().toISOString().slice(0, 10) + ".png";
      const file = new File([blob], name, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: t().title }); return; } catch (e) { if (e?.name === "AbortError") return; }
      }
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } finally { btn.disabled = false; btn.textContent = label; }
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
  const MAX_FRAGMENT_CHARS = 16000; // ours are ~4–5 KB; reject before atob/JSON.parse
  function decodeState(frag) {
    try {
      if (typeof frag !== "string" || frag.length > MAX_FRAGMENT_CHARS || !/^[A-Za-z0-9_-]+$/.test(frag)) return null;
      const b64 = frag.replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(b64);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const p = JSON.parse(new TextDecoder().decode(bytes));
      if (!p || typeof p !== "object" || p.v !== 1) return null;
      p.description = String(p.description || "").slice(0, 500);
      if (!["en", "hi"].includes(p.language)) return null;
      if (!TAPS.tasks_per_day.includes(p.answers?.tasks_per_day)) return null;
      if (!TAPS.minutes_per_task.includes(p.answers?.minutes_per_task)) return null;
      if (!TAPS.current_handling.includes(p.answers?.current_handling)) return null;
      const fa = p.frozen?.archetype, fc = p.frozen?.config;
      if (!fa || !fc || typeof fa.id !== "string" || fa.id.length > 60 || !isFiniteRange(fa.setup_hours) || !isFiniteRange(fa.steps_per_task)
        || !isFiniteRange(fa.tokens_per_step?.input) || !isFiniteRange(fa.tokens_per_step?.output)
        || !isNonNeg(fa.review_min_per_day) || !isFiniteRange(fa.baseline_wage_assumption?.inr_per_hour)
        || !isNonNeg(fc.working_days_per_month) || !isNonNeg(fc.usd_to_inr)
        || !isFiniteRange(fc.owner_hourly_value_inr) || !isFiniteRange(fc.setup_hourly_rate_inr)
        || !isPricedModelSet(fc)) return null;
      // Rebuild frozen objects with known keys only (drops __proto__/constructor/etc. and unknown fields).
      p.frozen = {
        archetype: { id: fa.id, name_en: fa.name_en, name_hi: fa.name_hi, setup_hours: fa.setup_hours, steps_per_task: fa.steps_per_task,
          tokens_per_step: { input: fa.tokens_per_step.input, output: fa.tokens_per_step.output }, review_min_per_day: fa.review_min_per_day,
          baseline_wage_assumption: { inr_per_hour: fa.baseline_wage_assumption.inr_per_hour },
          price_drivers: fa.price_drivers, price_drivers_hi: fa.price_drivers_hi, when_not_worth_it: fa.when_not_worth_it, when_not_worth_it_hi: fa.when_not_worth_it_hi },
        config: { working_days_per_month: fc.working_days_per_month, usd_to_inr: fc.usd_to_inr, owner_hourly_value_inr: fc.owner_hourly_value_inr,
          setup_hourly_rate_inr: fc.setup_hourly_rate_inr, default_tier: fc.default_tier,
          run_models: fc.run_models ? Object.fromEntries(["cheap", "balanced", "frontier"].map((k) => [k, pickModel(fc.run_models[k])])) : undefined,
          run_model: fc.run_models ? undefined : pickModel(fc.run_model) },
      };
      if (p.model_tier != null && !TIERS.includes(p.model_tier)) return null;
      if (p.model_tier === "custom") {
        const cm = p.custom_model;
        if (!isPricedModel(cm) || typeof cm.id !== "string") return null;
        p.custom_model = { ...pickModel(cm), pricing_snapshot_date: String(cm.pricing_snapshot_date || "").slice(0, 10),
          pricing_source: SOURCES.includes(cm.pricing_source) ? cm.pricing_source : "tokenwatch" };
      } else p.custom_model = null;
      const A = p.frozen.archetype, str = (x, n) => String(x || "").slice(0, n);
      A.name_en = str(A.name_en, 80); A.name_hi = str(A.name_hi, 80);
      A.price_drivers = Array.isArray(A.price_drivers) ? A.price_drivers.slice(0, 3).map((x) => str(x, 200)) : [];
      A.when_not_worth_it = str(A.when_not_worth_it, 300); A.when_not_worth_it_hi = str(A.when_not_worth_it_hi, 300);
      A.price_drivers_hi = Array.isArray(A.price_drivers_hi) ? A.price_drivers_hi.slice(0, 3).map((x) => str(x, 200)) : null;
      // Final gate: the engine itself must accept the frozen numbers (throws RangeError otherwise).
      const cfgUsed = p.model_tier === "custom" ? { ...p.frozen.config, run_models: { ...p.frozen.config.run_models, custom: p.custom_model } } : p.frozen.config;
      Engine.estimate(A, cfgUsed, { ...p.answers, model_tier: p.model_tier || undefined });
      p.answers = { tasks_per_day: p.answers.tasks_per_day, minutes_per_task: p.answers.minutes_per_task, current_handling: p.answers.current_handling };
      return p;
    } catch { return null; }
  }
  const isNonNeg = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0;
  const isPricedModel = (m) => !!m && typeof m === "object" && typeof m.id === "string" && isNonNeg(m.input_usd_per_million) && isNonNeg(m.output_usd_per_million);
  const pickModel = (m) => ({ id: m.id.slice(0, 80), display_name: String(m.display_name || m.id).slice(0, 60), provider: String(m.provider || "").slice(0, 40),
    input_usd_per_million: m.input_usd_per_million, output_usd_per_million: m.output_usd_per_million,
    intelligence_index: Number.isFinite(m.intelligence_index) ? m.intelligence_index : null,
    pricing_snapshot_date: String(m.pricing_snapshot_date || "").slice(0, 10), pricing_source: String(m.pricing_source || "").slice(0, 40) });
  // Accepts current {run_models, default_tier} (all three tiers required) or the legacy single run_model shape (v1 links from before tiers).
  const isPricedModelSet = (fc) => fc.run_models
    ? typeof fc.run_models === "object" && ["cheap", "balanced", "frontier"].every((k) => isPricedModel(fc.run_models[k])) && ["cheap", "balanced", "frontier"].includes(fc.default_tier)
    : isPricedModel(fc.run_model);
  const isFiniteRange = (r) => Array.isArray(r) && r.length === 2 && r.every(isNonNeg) && r[0] <= r[1];

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
    document.querySelectorAll(".lang button").forEach((b) => { b.onclick = () => { state.language = b.dataset.lang; applyI18n(); focusChecked($(".lang")); }; });
    radioKeys($(".lang"));
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
      $("#description").value = ""; show("#screen-describe"); applyI18n();
    };
    // Optional chaining: during a service-worker upgrade the cached index.html may predate these buttons.
    const pdfBtn = $("#savePdf"); if (pdfBtn) pdfBtn.onclick = () => window.print();
    const imgBtn = $("#saveImage"); if (imgBtn) imgBtn.onclick = () => saveImage().catch(() => {});
    $("#copyLink").onclick = async () => {
      location.hash = encodeState();
      try { await navigator.clipboard.writeText(location.href); $("#copyLink").textContent = t().copied; setTimeout(applyI18n, 1500); } catch {}
    };

    let shared = null;
    try { shared = location.hash.length > 1 ? decodeState(location.hash.slice(1)) : null; } catch { shared = null; }
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
