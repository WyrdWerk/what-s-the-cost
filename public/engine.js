// What's the cost? — deterministic, range-preserving budget engine.
// Pure functions only. No IO. Every output is a [low, high] pair in INR unless noted.
// Loaded both in the browser (window.Engine) and in Node tests (module.exports).

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const MILLION = 1e6;
  const WORTH_IT_MAX_MONTHS = 9;

  function range(lo, hi) {
    return [Math.min(lo, hi), Math.max(lo, hi)];
  }

  // tokens_per_step prices are USD *per million tokens*. Divide by 1e6 exactly once, here.
  function tokenCostInrPerStep(tokens, model, usdToInr) {
    const inUsd = (tokens.input / MILLION) * model.input_usd_per_million;
    const outUsd = (tokens.output / MILLION) * model.output_usd_per_million;
    return (inUsd + outUsd) * usdToInr;
  }

  /**
   * @param {object} a   archetype entry from archetypes.json
   * @param {object} cfg config.json
   * @param {object} ans { tasks_per_day, minutes_per_task, current_handling: "me"|"staff"|"nobody", model_tier?: "cheap"|"balanced"|"frontier" }
   */
  function resolveModel(cfg, tier) {
    const tiers = cfg.run_models || {};
    return tiers[tier] || tiers[cfg.default_tier] || cfg.run_model;
  }

  // ---- Input contract (throws RangeError). Share links and tests can feed arbitrary JSON; the engine must never
  // return NaN/Infinity/negative rupees with a verdict attached. Bounds are generous sanity caps, not tuning.
  const MAX_SCALAR = 1e9;
  const isNum = (x, max) => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= (max || MAX_SCALAR);
  function num(x, what, max) { if (!isNum(x, max)) throw new RangeError("engine: " + what + " must be a finite number in [0, " + (max || MAX_SCALAR) + "]"); return x; }
  function rng(r, what, max) {
    if (!Array.isArray(r) || r.length !== 2) throw new RangeError("engine: " + what + " must be a [low, high] pair");
    return range(num(r[0], what + "[0]", max), num(r[1], what + "[1]", max));
  }
  function pricedModel(m, what) {
    if (!m || typeof m !== "object") throw new RangeError("engine: " + what + " missing");
    num(m.input_usd_per_million, what + ".input_usd_per_million", 1e5); num(m.output_usd_per_million, what + ".output_usd_per_million", 1e5);
    return m;
  }
  const HANDLING = ["me", "staff", "nobody"];

  function estimate(a0, cfg0, ans) {
    if (!a0 || !cfg0 || !ans) throw new RangeError("engine: archetype, config and answers are required");
    // Normalised copies: every interval sorted, every scalar finite and non-negative.
    const a = {
      ...a0,
      setup_hours: rng(a0.setup_hours, "setup_hours", 1e5),
      steps_per_task: rng(a0.steps_per_task, "steps_per_task", 1e4),
      tokens_per_step: { input: rng(a0.tokens_per_step && a0.tokens_per_step.input, "tokens_per_step.input", 1e7),
                         output: rng(a0.tokens_per_step && a0.tokens_per_step.output, "tokens_per_step.output", 1e7) },
      review_min_per_day: num(a0.review_min_per_day, "review_min_per_day", 1440),
      baseline_wage_assumption: { inr_per_hour: rng(a0.baseline_wage_assumption && a0.baseline_wage_assumption.inr_per_hour, "baseline_wage_assumption.inr_per_hour", 1e6) },
    };
    const cfg = {
      ...cfg0,
      working_days_per_month: num(cfg0.working_days_per_month, "working_days_per_month", 31),
      usd_to_inr: num(cfg0.usd_to_inr, "usd_to_inr", 1e4),
      owner_hourly_value_inr: rng(cfg0.owner_hourly_value_inr, "owner_hourly_value_inr", 1e6),
      setup_hourly_rate_inr: rng(cfg0.setup_hourly_rate_inr, "setup_hourly_rate_inr", 1e6),
    };
    const days = cfg.working_days_per_month;
    const tasks = num(ans.tasks_per_day, "tasks_per_day", 1e4);
    const minutes = num(ans.minutes_per_task, "minutes_per_task", 1440);
    if (!HANDLING.includes(ans.current_handling)) throw new RangeError("engine: current_handling must be me|staff|nobody");
    const model = pricedModel(resolveModel(cfg, ans.model_tier), "run model");

    // Setup (one time) = hours × hourly rate, interval × interval.
    const setup = range(
      a.setup_hours[0] * cfg.setup_hourly_rate_inr[0],
      a.setup_hours[1] * cfg.setup_hourly_rate_inr[1]
    );

    // Monthly run = tasks × days × steps × tokens × price, input/output kept separate.
    const perStepLow = tokenCostInrPerStep(
      { input: a.tokens_per_step.input[0], output: a.tokens_per_step.output[0] },
      model, cfg.usd_to_inr
    );
    const perStepHigh = tokenCostInrPerStep(
      { input: a.tokens_per_step.input[1], output: a.tokens_per_step.output[1] },
      model, cfg.usd_to_inr
    );
    const run = range(
      tasks * days * a.steps_per_task[0] * perStepLow,
      tasks * days * a.steps_per_task[1] * perStepHigh
    );
    const tokensPerMonth = {
      input: range(tasks * days * a.steps_per_task[0] * a.tokens_per_step.input[0],
                   tasks * days * a.steps_per_task[1] * a.tokens_per_step.input[1]),
      output: range(tasks * days * a.steps_per_task[0] * a.tokens_per_step.output[0],
                    tasks * days * a.steps_per_task[1] * a.tokens_per_step.output[1]),
    };

    // Owner oversight: minutes/day → hours/month → rupees at owner's hourly value.
    const oversightHours = (a.review_min_per_day / 60) * days;
    const oversight = range(
      oversightHours * cfg.owner_hourly_value_inr[0],
      oversightHours * cfg.owner_hourly_value_inr[1]
    );

    // Baseline = value of the time this task eats today, not a whole salary.
    // "nobody" does it today → no time is being spent, so baseline is zero (the job is currently undone).
    const wage = ans.current_handling === "nobody"
      ? [0, 0]
      : ans.current_handling === "me"
        ? cfg.owner_hourly_value_inr
        : a.baseline_wage_assumption.inr_per_hour;
    const baselineHours = tasks * (minutes / 60) * days;
    const baseline = range(baselineHours * wage[0], baselineHours * wage[1]);

    // Conservative interval arithmetic.
    const netLow = baseline[0] - run[1] - oversight[1];
    const netHigh = baseline[1] - run[0] - oversight[0];

    let breakEven; // "never" | "possible" | "assured"
    let payback = null; // [months_low, months_high] only when both net bounds > 0
    if (netHigh <= 0) breakEven = "never";
    else if (netLow <= 0) breakEven = "possible";
    else {
      breakEven = "assured";
      payback = [setup[0] / netHigh, setup[1] / netLow];
    }

    let verdict; // "worth_it" | "assist_first" | "leave_it"
    if (breakEven === "never") verdict = "leave_it";
    else if (breakEven === "assured" && payback[1] <= WORTH_IT_MAX_MONTHS) verdict = "worth_it";
    else verdict = "assist_first";

    // Output contract: every interval finite and ordered.
    [setup, run, oversight, baseline, [netLow, netHigh], payback || [0, 0]].forEach((r) => {
      if (!r.every(Number.isFinite) || r[0] > r[1]) throw new RangeError("engine: produced a non-finite or unordered range");
    });

    return {
      setup, run, oversight, oversightHours, baseline, baselineHours,
      tokensPerMonth, net: [netLow, netHigh], breakEven, payback, verdict,
      assumptions: {
        working_days_per_month: days,
        usd_to_inr: cfg.usd_to_inr,
        run_model: model,
        model_tier: ans.model_tier || cfg.default_tier || null,
        owner_hourly_value_inr: cfg.owner_hourly_value_inr,
        setup_hourly_rate_inr: cfg.setup_hourly_rate_inr,
        wage_used_inr_per_hour: wage,
      },
    };
  }

  return { estimate, resolveModel, WORTH_IT_MAX_MONTHS };
});
