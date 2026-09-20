// Hand-verifiable engine tests. Numbers here are SYNTHETIC test fixtures chosen so the arithmetic
// can be checked on paper; they are not the founder's archetype numbers.
// Run: node test/engine.test.js
const assert = require("node:assert/strict");
const Engine = require("../public/engine.js");

const cfg = {
  working_days_per_month: 26,
  owner_hourly_value_inr: [500, 1000],
  setup_hourly_rate_inr: [1000, 2000],
  usd_to_inr: 84,
  run_model: { id: "test-model", display_name: "Test Model", input_usd_per_million: 1.0, output_usd_per_million: 5.0 },
};

// Archetype fixture: 10 setup hours; 2 steps; 1000 in / 200 out tokens per step; 10 min review/day.
const arch = {
  id: "fixture",
  setup_hours: [10, 10],
  steps_per_task: [2, 2],
  tokens_per_step: { input: [1000, 1000], output: [200, 200] },
  review_min_per_day: 10,
  baseline_wage_assumption: { inr_per_hour: [150, 150] },
};

// Paper: per step = (1000/1e6×1 + 200/1e6×5) USD = 0.001 + 0.001 = 0.002 USD = ₹0.168
// Case A (worth it): 20 tasks/day, 20 min each, staff.
//   run   = 20×26×2×0.168 = ₹174.72 (both bounds)
//   oversight hours = 10/60×26 = 4.333; ₹ = [2166.67, 4333.33]
//   baseline hours = 20×(20/60)×26 = 173.33; ₹ = 26000 (both bounds at ₹150)
//   netLow = 26000 − 174.72 − 4333.33 = 21491.95 ; netHigh = 26000 − 174.72 − 2166.67 = 23658.61
//   setup = [10000, 20000]; payback = [10000/23658.61, 20000/21491.95] = [0.4227, 0.9306] → worth_it
{
  const r = Engine.estimate(arch, cfg, { tasks_per_day: 20, minutes_per_task: 20, current_handling: "staff" });
  assert.equal(r.run[0].toFixed(2), "174.72"); assert.equal(r.run[1].toFixed(2), "174.72");
  assert.equal(r.oversightHours.toFixed(3), "4.333");
  assert.equal(r.oversight[0].toFixed(2), "2166.67"); assert.equal(r.oversight[1].toFixed(2), "4333.33");
  assert.equal(r.baseline[0].toFixed(2), "26000.00");
  assert.equal(r.net[0].toFixed(2), "21491.95"); assert.equal(r.net[1].toFixed(2), "23658.61");
  assert.equal(r.breakEven, "assured");
  assert.equal(r.payback[0].toFixed(4), "0.4227"); assert.equal(r.payback[1].toFixed(4), "0.9306");
  assert.equal(r.verdict, "worth_it");
  console.log("A worth_it ✓", r.net.map((n) => n.toFixed(2)), r.payback.map((n) => n.toFixed(2)));
}

// Case B (assist first): 5 tasks/day, 5 min each, staff.
//   run = 5×26×2×0.168 = 43.68 ; oversight same [2166.67, 4333.33]
//   baseline hours = 5×(5/60)×26 = 10.833; ₹ = 1625
//   netLow = 1625 − 43.68 − 4333.33 = −2752.01 ≤ 0 ; netHigh = 1625 − 43.68 − 2166.67 = −585.35 ≤ 0 → never?
//   That's "never". Raise volume to 10 tasks × 10 min: baseline hours = 43.33; ₹ = 6500
//   netLow = 6500 − 87.36 − 4333.33 = 2079.31 > 0 → assured; payback high = 20000/2079.31 = 9.62 > 9 → assist_first
{
  const r = Engine.estimate(arch, cfg, { tasks_per_day: 10, minutes_per_task: 10, current_handling: "staff" });
  assert.equal(r.net[0].toFixed(2), "2079.31");
  assert.equal(r.breakEven, "assured");
  assert.equal(r.payback[1].toFixed(2), "9.62");
  assert.equal(r.verdict, "assist_first");
  console.log("B assist_first (assured but >9mo) ✓", r.payback.map((n) => n.toFixed(2)));
}

// Case B2 (assist first via "possible"): owner does it, 5 tasks × 10 min.
//   baseline hours = 5×(10/60)×26 = 21.667; ₹ = [10833.33, 21666.67] at owner [500,1000]
//   netLow = 10833.33 − 43.68 − 4333.33 = 6456.32 → hmm positive. Use 2 tasks × 5 min: hours 4.333; ₹ [2166.67, 4333.33]
//   run = 2×26×2×0.168 = 17.47
//   netLow = 2166.6667 − 17.472 − 4333.3333 = −2184.1387 ≤ 0 ; netHigh = 4333.3333 − 17.472 − 2166.6667 = 2149.1947 > 0 → possible
{
  const r = Engine.estimate(arch, cfg, { tasks_per_day: 2, minutes_per_task: 5, current_handling: "me" });
  assert.equal(r.net[0].toFixed(2), "-2184.14"); assert.equal(r.net[1].toFixed(2), "2149.19");
  assert.equal(r.breakEven, "possible"); assert.equal(r.payback, null);
  assert.equal(r.verdict, "assist_first");
  console.log("B2 assist_first (possible) ✓", r.net.map((n) => n.toFixed(2)));
}

// Case C (leave it alone / no break-even): 5 tasks × 5 min, staff (computed above: netHigh = −585.35).
{
  const r = Engine.estimate(arch, cfg, { tasks_per_day: 5, minutes_per_task: 5, current_handling: "staff" });
  assert.equal(r.net[1].toFixed(2), "-585.35");
  assert.equal(r.breakEven, "never"); assert.equal(r.payback, null);
  assert.equal(r.verdict, "leave_it");
  console.log("C leave_it ✓", r.net.map((n) => n.toFixed(2)));
}

// Unit sanity: pricing is per-million; 1M input tokens at $1 must cost exactly $1 = ₹84.
{
  const a = { ...arch, steps_per_task: [1, 1], tokens_per_step: { input: [1e6, 1e6], output: [0, 0] }, review_min_per_day: 0 };
  const r = Engine.estimate(a, { ...cfg, working_days_per_month: 1 }, { tasks_per_day: 1, minutes_per_task: 1, current_handling: "nobody" });
  assert.equal(r.run[0], 84);
  console.log("per-million unit check ✓");
}
console.log("all engine tests passed");

// Case F (model tiers): same inputs as Case A, but pricing comes from run_models + tier.
// cheap = ×1 of the legacy price, frontier = ×10. Paper: run(frontier) = 10 × 174.72 = ₹1747.20.
// Unknown tier → default_tier; missing run_models → legacy run_model.
{
  const tiered = {
    ...cfg, run_model: undefined, default_tier: "cheap",
    run_models: {
      cheap: { id: "cheap-m", input_usd_per_million: 1.0, output_usd_per_million: 5.0 },
      frontier: { id: "frontier-m", input_usd_per_million: 10.0, output_usd_per_million: 50.0 },
    },
  };
  const ans = { tasks_per_day: 20, minutes_per_task: 20, current_handling: "staff" };
  assert.equal(Engine.estimate(arch, tiered, { ...ans, model_tier: "frontier" }).run[1].toFixed(2), "1747.20");
  assert.equal(Engine.estimate(arch, tiered, { ...ans, model_tier: "cheap" }).run[1].toFixed(2), "174.72");
  assert.equal(Engine.estimate(arch, tiered, ans).assumptions.run_model.id, "cheap-m");           // default tier
  assert.equal(Engine.estimate(arch, tiered, { ...ans, model_tier: "nope" }).assumptions.run_model.id, "cheap-m");
  assert.equal(Engine.estimate(arch, cfg, ans).assumptions.run_model.id, "test-model");           // legacy shape
  console.log("Case F ok: tiers");
}

// Case G (red-team 2026-09-20): engine input contract.
// Unordered input ranges must be normalised before pairing (conservative product = [lo·lo, hi·hi]).
{
  const flipped = { ...arch, setup_hours: [20, 10] };
  const c = { ...cfg, setup_hourly_rate_inr: [1000, 2000] };
  const ans = { tasks_per_day: 20, minutes_per_task: 20, current_handling: "staff" };
  assert.deepEqual(Engine.estimate(flipped, c, ans).setup, [10000, 40000]);
  // Malformed inputs throw instead of returning NaN/Infinity/negative rupees with a verdict attached.
  assert.throws(() => Engine.estimate(arch, cfg, { ...ans, tasks_per_day: NaN }), RangeError);
  assert.throws(() => Engine.estimate(arch, cfg, { ...ans, tasks_per_day: Number.MAX_VALUE }), RangeError);
  assert.throws(() => Engine.estimate(arch, cfg, { ...ans, current_handling: "aliens" }), RangeError);
  assert.throws(() => Engine.estimate(arch, { ...cfg, run_model: { id: "x", input_usd_per_million: -1e9, output_usd_per_million: 1 } }, ans), RangeError);
  assert.throws(() => Engine.estimate(arch, { ...cfg, run_model: undefined, run_models: { evil: cfg.run_model }, default_tier: "balanced" }, ans), RangeError);
  assert.throws(() => Engine.estimate({ ...arch, tokens_per_step: { input: [1, "2"], output: [1, 2] } }, cfg, ans), RangeError);
  // $0 model is legal (free tier) and yields a zero run range, still ordered.
  const free = Engine.estimate(arch, { ...cfg, run_model: { id: "free", input_usd_per_million: 0, output_usd_per_million: 0 } }, ans);
  assert.deepEqual(free.run, [0, 0]);
  console.log("Case G ok: input contract");
}
