// Cost Kitna Hoga — deterministic, range-preserving budget engine.
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
   * @param {object} ans { tasks_per_day, minutes_per_task, current_handling: "me"|"staff"|"nobody" }
   */
  function estimate(a, cfg, ans) {
    const days = cfg.working_days_per_month;
    const tasks = ans.tasks_per_day;
    const minutes = ans.minutes_per_task;

    // Setup (one time) = hours × hourly rate, interval × interval.
    const setup = range(
      a.setup_hours[0] * cfg.setup_hourly_rate_inr[0],
      a.setup_hours[1] * cfg.setup_hourly_rate_inr[1]
    );

    // Monthly run = tasks × days × steps × tokens × price, input/output kept separate.
    const perStepLow = tokenCostInrPerStep(
      { input: a.tokens_per_step.input[0], output: a.tokens_per_step.output[0] },
      cfg.run_model, cfg.usd_to_inr
    );
    const perStepHigh = tokenCostInrPerStep(
      { input: a.tokens_per_step.input[1], output: a.tokens_per_step.output[1] },
      cfg.run_model, cfg.usd_to_inr
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

    return {
      setup, run, oversight, oversightHours, baseline, baselineHours,
      tokensPerMonth, net: [netLow, netHigh], breakEven, payback, verdict,
      assumptions: {
        working_days_per_month: days,
        usd_to_inr: cfg.usd_to_inr,
        run_model: cfg.run_model,
        owner_hourly_value_inr: cfg.owner_hourly_value_inr,
        setup_hourly_rate_inr: cfg.setup_hourly_rate_inr,
        wage_used_inr_per_hour: wage,
      },
    };
  }

  return { estimate, WORTH_IT_MAX_MONTHS };
});
