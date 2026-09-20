// What's the cost? — deterministic budget engine with horizon projection.
// Pure functions only. No IO. Every rupee output is a single number (INR) unless noted.
// Data files still store [low, high] pairs (kept for provenance and so older share links decode);
// the engine uses the midpoint of each pair. A plain number is accepted wherever a pair is.
// Loaded both in the browser (window.Engine) and in Node tests (module.exports).

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const MILLION = 1e6;
  const HORIZONS = [3, 6, 12]; // months the receipt can project over; 3 = one quarter (default)
  const DEFAULT_HORIZON = 3;

  // tokens_per_step prices are USD *per million tokens*. Divide by 1e6 exactly once, here.
  function tokenCostInrPerStep(tokens, model, usdToInr) {
    const inUsd = (tokens.input / MILLION) * model.input_usd_per_million;
    const outUsd = (tokens.output / MILLION) * model.output_usd_per_million;
    return (inUsd + outUsd) * usdToInr;
  }

  function resolveModel(cfg, tier) {
    const tiers = cfg.run_models || {};
    return tiers[tier] || tiers[cfg.default_tier] || cfg.run_model;
  }

  // ---- Input contract (throws RangeError). Share links and tests can feed arbitrary JSON; the engine must never
  // return NaN/Infinity/negative rupees with a verdict attached. Bounds are generous sanity caps, not tuning.
  const MAX_SCALAR = 1e9;
  const isNum = (x, max) => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= (max || MAX_SCALAR);
  function num(x, what, max) { if (!isNum(x, max)) throw new RangeError("engine: " + what + " must be a finite number in [0, " + (max || MAX_SCALAR) + "]"); return x; }
  // A [low, high] pair → its midpoint; a bare number passes through. Order of the pair does not matter.
  function mid(r, what, max) {
    if (typeof r === "number") return num(r, what, max);
    if (!Array.isArray(r) || r.length !== 2) throw new RangeError("engine: " + what + " must be a number or a [low, high] pair");
    return (num(r[0], what + "[0]", max) + num(r[1], what + "[1]", max)) / 2;
  }
  function pricedModel(m, what) {
    if (!m || typeof m !== "object") throw new RangeError("engine: " + what + " missing");
    num(m.input_usd_per_million, what + ".input_usd_per_million", 1e5); num(m.output_usd_per_million, what + ".output_usd_per_million", 1e5);
    return m;
  }
  const HANDLING = ["me", "staff", "nobody"];

  /**
   * @param {object} a0   archetype entry from archetypes.json
   * @param {object} cfg0 config.json
   * @param {object} ans  { tasks_per_day, minutes_per_task, current_handling: "me"|"staff"|"nobody",
   *                        model_tier?: "cheap"|"balanced"|"frontier"|"custom", horizon?: 3|6|12 }
   */
  function estimate(a0, cfg0, ans) {
    if (!a0 || !cfg0 || !ans) throw new RangeError("engine: archetype, config and answers are required");
    const setupHours = mid(a0.setup_hours, "setup_hours", 1e5);
    const steps = mid(a0.steps_per_task, "steps_per_task", 1e4);
    const tokensIn = mid(a0.tokens_per_step && a0.tokens_per_step.input, "tokens_per_step.input", 1e7);
    const tokensOut = mid(a0.tokens_per_step && a0.tokens_per_step.output, "tokens_per_step.output", 1e7);
    const reviewMin = num(a0.review_min_per_day, "review_min_per_day", 1440);
    const staffWage = mid(a0.baseline_wage_assumption && a0.baseline_wage_assumption.inr_per_hour, "baseline_wage_assumption.inr_per_hour", 1e6);
    const days = num(cfg0.working_days_per_month, "working_days_per_month", 31);
    const usdToInr = num(cfg0.usd_to_inr, "usd_to_inr", 1e4);
    const ownerValue = mid(cfg0.owner_hourly_value_inr, "owner_hourly_value_inr", 1e6);
    const setupRate = mid(cfg0.setup_hourly_rate_inr, "setup_hourly_rate_inr", 1e6);
    const tasks = num(ans.tasks_per_day, "tasks_per_day", 1e4);
    const minutes = num(ans.minutes_per_task, "minutes_per_task", 1440);
    if (!HANDLING.includes(ans.current_handling)) throw new RangeError("engine: current_handling must be me|staff|nobody");
    const horizon = ans.horizon == null ? DEFAULT_HORIZON : ans.horizon;
    if (!HORIZONS.includes(horizon)) throw new RangeError("engine: horizon must be one of " + HORIZONS.join("|"));
    const model = pricedModel(resolveModel(cfg0, ans.model_tier), "run model");

    // Setup (one time) = hours × hourly rate.
    const setup = setupHours * setupRate;

    // Monthly run = tasks × days × steps × token cost per step.
    const perStep = tokenCostInrPerStep({ input: tokensIn, output: tokensOut }, model, usdToInr);
    const stepsPerMonth = tasks * days * steps;
    const run = stepsPerMonth * perStep;
    const tokensPerMonth = { input: stepsPerMonth * tokensIn, output: stepsPerMonth * tokensOut };

    // Owner oversight: minutes/day → hours/month → rupees at the owner's hourly value.
    const oversightHours = (reviewMin / 60) * days;
    const oversight = oversightHours * ownerValue;

    // Baseline = value of the time this task eats today, not a whole salary.
    // "nobody" does it today → no time is being spent, so baseline is zero (the job is currently undone).
    const wage = ans.current_handling === "nobody" ? 0 : ans.current_handling === "me" ? ownerValue : staffWage;
    const baselineHours = tasks * (minutes / 60) * days;
    const baseline = baselineHours * wage;

    // Monthly saving once the agent is running (setup excluded; it is one-time and amortised below).
    const net = baseline - run - oversight;

    // Break-even month = first month in which cumulative monthly savings have covered the one-time setup.
    // net ≤ 0 → never. setup 0 with positive net → month 1.
    const breakEvenMonth = net > 0 ? Math.max(1, Math.ceil(setup / net)) : null;
    const breakEven = breakEvenMonth === null ? "never" : breakEvenMonth <= horizon ? "within" : "later";

    // Horizon projection: what the job costs today over the period vs. with the agent (setup + monthly × months).
    const costToday = baseline * horizon;
    const costWithAgent = setup + (run + oversight) * horizon;
    const saving = costToday - costWithAgent;

    // "worth_it" = pays for itself inside the chosen horizon; "assist_first" = saves monthly but pays back later;
    // "leave_it" = no monthly saving at these numbers.
    const verdict = breakEven === "never" ? "leave_it" : breakEven === "within" ? "worth_it" : "assist_first";

    // Output contract: every rupee figure finite.
    [setup, run, oversight, baseline, net, costToday, costWithAgent, saving].forEach((x) => {
      if (!Number.isFinite(x)) throw new RangeError("engine: produced a non-finite value");
    });

    return {
      setup, run, oversight, oversightHours, baseline, baselineHours, tokensPerMonth, net,
      horizon, costToday, costWithAgent, saving, breakEven, breakEvenMonth, verdict,
      assumptions: {
        working_days_per_month: days, usd_to_inr: usdToInr, run_model: model,
        model_tier: ans.model_tier || cfg0.default_tier || null,
        setup_hours: setupHours, steps_per_task: steps, tokens_per_step: { input: tokensIn, output: tokensOut },
        owner_hourly_value_inr: ownerValue, setup_hourly_rate_inr: setupRate, wage_used_inr_per_hour: wage,
      },
    };
  }

  return { estimate, resolveModel, HORIZONS, DEFAULT_HORIZON };
});
