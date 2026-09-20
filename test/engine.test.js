// Hand-verifiable engine tests. Numbers here are SYNTHETIC test fixtures chosen so the arithmetic
// can be checked on paper; they are not the founder's archetype numbers.
// Run: node test/engine.test.js
const assert = require("node:assert/strict");
const Engine = require("../public/engine.js");
const productConfig = require("../public/data/config.json");
const { archetypes } = require("../public/data/archetypes.json");

// Config fixture. Pairs are stored [low, high]; the engine uses midpoints: owner ₹750/hr, setup ₹1500/hr.
const cfg = {
  working_days_per_month: 26,
  owner_hourly_value_inr: [500, 1000],
  setup_hourly_rate_inr: [1000, 2000],
  usd_to_inr: 84,
  run_model: { id: "test-model", display_name: "Test Model", input_usd_per_million: 1.0, output_usd_per_million: 5.0 },
};

// Archetype fixture: 10 setup hours; 2 steps; 1000 in / 200 out tokens per step; 10 min review/day; staff ₹150/hr.
const arch = {
  id: "fixture",
  setup_hours: [10, 10],
  steps_per_task: [2, 2],
  tokens_per_step: { input: [1000, 1000], output: [200, 200] },
  review_min_per_day: 10,
  baseline_wage_assumption: { inr_per_hour: [150, 150] },
};
const near = (x, y, msg) => assert.ok(Math.abs(x - y) < 0.01, (msg || "") + " expected " + y + " got " + x);

// Paper: per step = (1000/1e6×1 + 200/1e6×5) USD = 0.002 USD = ₹0.168
//   setup = 10 h × ₹1500 = ₹15,000 ; oversight hours = 10/60×26 = 4.3333 ; oversight ₹ = 4.3333×750 = ₹3,250
// Case A (worth it within a quarter): 20 tasks/day, 20 min each, staff.
//   run = 20×26×2×0.168 = ₹174.72 ; baseline hours = 20×(20/60)×26 = 173.333 ; baseline = 173.333×150 = ₹26,000
//   net = 26000 − 174.72 − 3250 = ₹22,575.28/mo ; break-even = ceil(15000/22575.28) = month 1
//   horizon 3: costToday = 78,000 ; costWithAgent = 15000 + 3×3424.72 = 25,274.16 ; saving = 52,725.84
{
  const r = Engine.estimate(arch, cfg, { tasks_per_day: 20, minutes_per_task: 20, current_handling: "staff" });
  near(r.setup, 15000, "setup"); near(r.run, 174.72, "run"); near(r.oversightHours, 4.3333, "ovh"); near(r.oversight, 3250, "oversight");
  near(r.baseline, 26000, "baseline"); near(r.net, 22575.28, "net");
  assert.equal(r.horizon, 3); assert.equal(r.breakEvenMonth, 1); assert.equal(r.breakEven, "within");
  near(r.costToday, 78000, "costToday"); near(r.costWithAgent, 25274.16, "costWithAgent"); near(r.saving, 52725.84, "saving");
  assert.equal(r.verdict, "worth_it");
  console.log("A worth_it ✓ net", r.net.toFixed(2), "BE month", r.breakEvenMonth);
}

// Case B (assist first: saves monthly but pays back after the quarter): 4 tasks × 20 min, staff.
//   run = 4×26×2×0.168 = 34.944 ; baseline hours = 4×(20/60)×26 = 34.667 ; baseline = ₹5,200
//   net = 5200 − 34.944 − 3250 = ₹1,915.056/mo ; break-even = ceil(15000/1915.056) = ceil(7.83) = month 8
//   horizon 3 → "later", assist_first ; saving(3) = 15600 − (15000 + 3×3284.944) = 15600 − 24854.83 = −9,254.83
//   horizon 12 → "within", worth_it ; saving(12) = 62400 − (15000 + 12×3284.944) = 62400 − 54419.33 = 7,980.67
{
  const ans = { tasks_per_day: 4, minutes_per_task: 20, current_handling: "staff" };
  const q = Engine.estimate(arch, cfg, ans);
  near(q.net, 1915.056, "net"); assert.equal(q.breakEvenMonth, 8); assert.equal(q.breakEven, "later"); assert.equal(q.verdict, "assist_first");
  near(q.saving, -9254.83, "saving q");
  const y = Engine.estimate(arch, cfg, { ...ans, horizon: 12 });
  assert.equal(y.breakEvenMonth, 8); assert.equal(y.breakEven, "within"); assert.equal(y.verdict, "worth_it"); near(y.saving, 7980.67, "saving y");
  const h = Engine.estimate(arch, cfg, { ...ans, horizon: 6 });
  assert.equal(h.verdict, "assist_first"); // month 8 > 6
  console.log("B assist_first@3, worth_it@12 ✓ BE month", q.breakEvenMonth);
}

// Case C (leave it alone / never): 5 tasks × 5 min, staff.
//   run = 5×26×2×0.168 = 43.68 ; baseline hours = 5×(5/60)×26 = 10.833 ; baseline = ₹1,625
//   net = 1625 − 43.68 − 3250 = −1,668.68 → never
{
  const r = Engine.estimate(arch, cfg, { tasks_per_day: 5, minutes_per_task: 5, current_handling: "staff" });
  near(r.net, -1668.68, "net"); assert.equal(r.breakEven, "never"); assert.equal(r.breakEvenMonth, null); assert.equal(r.verdict, "leave_it");
  near(r.saving, 3 * 1625 - (15000 + 3 * (43.68 + 3250)), "saving");
  console.log("C leave_it ✓ net", r.net.toFixed(2));
}

// Case D ("nobody" does it today → baseline 0, so an agent can only add cost).
{
  const r = Engine.estimate(arch, cfg, { tasks_per_day: 20, minutes_per_task: 20, current_handling: "nobody" });
  assert.equal(r.baseline, 0); assert.equal(r.assumptions.wage_used_inr_per_hour, 0); assert.equal(r.verdict, "leave_it");
  console.log("D nobody ✓");
}

// Case E (midpoints): unequal pairs use the average, order-independent. setup_hours [5,6] → 5.5 h; rate [1200,800] → ₹1000.
{
  const r = Engine.estimate({ ...arch, setup_hours: [5, 6] }, { ...cfg, setup_hourly_rate_inr: [1200, 800] },
    { tasks_per_day: 20, minutes_per_task: 20, current_handling: "staff" });
  near(r.setup, 5500, "setup"); near(r.assumptions.setup_hours, 5.5); near(r.assumptions.setup_hourly_rate_inr, 1000);
  // Bare numbers are accepted wherever a pair is (Advanced-panel overrides).
  const p = Engine.estimate({ ...arch, setup_hours: 4 }, { ...cfg, setup_hourly_rate_inr: 900 }, { tasks_per_day: 20, minutes_per_task: 20, current_handling: "staff" });
  near(p.setup, 3600, "setup point");
  console.log("E midpoints ✓");
}

// Unit sanity: pricing is per-million; 1M input tokens at $1 must cost exactly $1 = ₹84.
{
  const a = { ...arch, steps_per_task: [1, 1], tokens_per_step: { input: [1e6, 1e6], output: [0, 0] }, review_min_per_day: 0 };
  const r = Engine.estimate(a, { ...cfg, working_days_per_month: 1 }, { tasks_per_day: 1, minutes_per_task: 1, current_handling: "nobody" });
  assert.equal(r.run, 84);
  console.log("per-million unit check ✓");
}

// Case F (model tiers): same inputs as Case A, but pricing comes from run_models + tier.
// cheap = ×1 of the legacy price, frontier = ×10. Paper: run(frontier) = 10 × 174.72 = ₹1747.20.
{
  const tiered = {
    ...cfg, run_model: undefined, default_tier: "cheap",
    run_models: {
      cheap: { id: "cheap-m", input_usd_per_million: 1.0, output_usd_per_million: 5.0 },
      frontier: { id: "frontier-m", input_usd_per_million: 10.0, output_usd_per_million: 50.0 },
    },
  };
  const ans = { tasks_per_day: 20, minutes_per_task: 20, current_handling: "staff" };
  near(Engine.estimate(arch, tiered, { ...ans, model_tier: "frontier" }).run, 1747.2);
  near(Engine.estimate(arch, tiered, { ...ans, model_tier: "cheap" }).run, 174.72);
  assert.equal(Engine.estimate(arch, tiered, ans).assumptions.run_model.id, "cheap-m");
  assert.equal(Engine.estimate(arch, tiered, { ...ans, model_tier: "nope" }).assumptions.run_model.id, "cheap-m");
  assert.equal(Engine.estimate(arch, cfg, ans).assumptions.run_model.id, "test-model");
  console.log("Case F ok: tiers");
}

// Case G: engine input contract — malformed inputs throw instead of returning NaN/Infinity with a verdict attached.
{
  const ans = { tasks_per_day: 20, minutes_per_task: 20, current_handling: "staff" };
  assert.throws(() => Engine.estimate(arch, cfg, { ...ans, tasks_per_day: NaN }), RangeError);
  assert.throws(() => Engine.estimate(arch, cfg, { ...ans, tasks_per_day: Number.MAX_VALUE }), RangeError);
  assert.throws(() => Engine.estimate(arch, cfg, { ...ans, current_handling: "aliens" }), RangeError);
  assert.throws(() => Engine.estimate(arch, cfg, { ...ans, horizon: 4 }), RangeError);
  assert.throws(() => Engine.estimate(arch, { ...cfg, run_model: { id: "x", input_usd_per_million: -1e9, output_usd_per_million: 1 } }, ans), RangeError);
  assert.throws(() => Engine.estimate(arch, { ...cfg, run_model: undefined, run_models: { evil: cfg.run_model }, default_tier: "balanced" }, ans), RangeError);
  assert.throws(() => Engine.estimate({ ...arch, tokens_per_step: { input: [1, "2"], output: [1, 2] } }, cfg, ans), RangeError);
  assert.throws(() => Engine.estimate({ ...arch, setup_hours: [-1, 5] }, cfg, ans), RangeError);
  // $0 model is legal (free tier) → zero run cost. Zero setup with positive net → break-even month 1.
  const free = Engine.estimate({ ...arch, setup_hours: 0 }, { ...cfg, run_model: { id: "free", input_usd_per_million: 0, output_usd_per_million: 0 } }, ans);
  assert.equal(free.run, 0); assert.equal(free.setup, 0); assert.equal(free.breakEvenMonth, 1);
  console.log("Case G ok: input contract");
}

// Case H: founder defaults shown in Advanced are the values used by every fresh estimate.
// GLM 5.3 Flash pricing is the median across the 36 TokenWatch provider rows on 2026-09-20:
// the two middle input prices are $0.15/M and the two middle output prices are $0.50/M.
{
  near((productConfig.setup_hourly_rate_inr[0] + productConfig.setup_hourly_rate_inr[1]) / 2, 1000, "default setup rate");
  near((productConfig.owner_hourly_value_inr[0] + productConfig.owner_hourly_value_inr[1]) / 2, 600, "default owner value");
  archetypes.forEach((a) => {
    near((a.setup_hours[0] + a.setup_hours[1]) / 2, 5.5, a.id + " setup hours");
    near((a.baseline_wage_assumption.inr_per_hour[0] + a.baseline_wage_assumption.inr_per_hour[1]) / 2, 200, a.id + " staff wage");
    assert.equal(a.review_min_per_day, 10, a.id + " review minutes");
  });
  const model = productConfig.run_models[productConfig.default_tier];
  assert.equal(model.id, "z-ai/glm-5.3-flash");
  near(model.input_usd_per_million, 0.15, "GLM median input price");
  near(model.output_usd_per_million, 0.5, "GLM median output price");
  console.log("Case H ok: founder defaults and GLM median pricing");
}
console.log("all engine tests passed");
