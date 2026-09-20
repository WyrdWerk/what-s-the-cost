# AGENTS.md — Operating guide for AI agents in this repository

Read this before touching anything. Then read `README.md` in full: it is the product spec, math
reference, and deployment record. This file adds the rules and the reasons behind them.

## What this is

**Cost Kitna Hoga? / What's the cost?** — a static Cloudflare Pages site plus exactly one Pages
Function that gives Indian MSME owners an honest, range-only estimate of what an AI agent would
cost for one repetitive job. Owner: Yash Jain, WyrdWerk LLP (Indore). The founder is a
non-engineer; explain changes in product terms, not framework terms.

Live: https://agentcost.wyrdwerk.com · https://what-s-the-cost.pages.dev
Repo: https://github.com/WyrdWerk/what-s-the-cost (public — no secrets, no client details, ever).

## Non-negotiables

1. **Ranges, never point estimates.** Every rupee figure on the receipt is `[low, high]`. Do not
   add midpoints, averages, or single numbers to the UI.
2. **Interval arithmetic stays conservative.** `Net.lo = B.lo − R.hi − O.hi`, `Net.hi = B.hi − R.lo − O.lo`.
   Payback only when both net bounds are positive. Verdicts on the interval, not the midpoint.
   Change these only with the founder's explicit sign-off and updated tests.
3. **Manual mode must always work with the model completely unavailable.** Chips are visible
   immediately; nothing waits on `/api/estimate`. Any classifier failure returns `null` and the
   UI continues.
4. **One Pages Function.** `functions/api/estimate.js` does classification only. Do not add
   endpoints, do not move math to the server, do not return model prose to the browser.
5. **No database, accounts, analytics, cookies, PDF, WhatsApp, or voice.** These are out of scope
   by design, not by omission.
6. **Secrets never in code or the browser.** `ANTHROPIC_API_KEY` is a Pages secret read from
   `context.env`. `.dev.vars` is git-ignored. Never commit tokens; never log them.
7. **Every assumption disclosed on the receipt.** If you add a constant that affects a number,
   surface it in the assumptions line or a footnote.
8. **Do not invent founder numbers.** `public/data/*.json` values are the founder's. Draft values
   are labelled in each file's `_status`. If you must change one, keep the `_status` honest and
   tell the founder what changed and why.
9. **No frameworks, no build step, no dependencies.** Vanilla HTML/JS/CSS. `package.json` holds
   scripts only. Adding a dependency is a founder decision.
10. **Render all user- or model-derived text via `textContent`.** Never `innerHTML` with dynamic
    strings; share links carry arbitrary Unicode.

## Repository map

| Path | Owns | Touch it when |
|---|---|---|
| `public/engine.js` | all cost math, pure functions, UMD | changing a formula (update `test/engine.test.js` in the same commit) |
| `public/app.js` | UI state, i18n strings, chips/taps, receipt render, share-link encode/decode, SW registration | UI or copy changes |
| `public/index.html` | three screens, `data-i18n` hooks | adding a UI element (add its string to both `STR.en` and `STR.hi`) |
| `public/style.css` | receipt-as-bill look, ≥44 px tap targets | styling |
| `public/sw.js` | offline precache list and strategy | adding a static file the app needs offline (add to `SHELL`, bump `VERSION`) |
| `public/data/config.json` | constants, three pinned model tiers (the "Other…" search in `app.js` makes the only live price calls: TokenWatch `?search=&limit=10`, or the public OpenRouter `/api/v1/models` catalog fetched once on explicit source pick) (`run_models`, `default_tier`), FX | founder tunes numbers; tier prices come from TokenWatch, USD per million |
| `public/data/archetypes.json` | six job types | founder tunes numbers; adding an id also requires the enum in `estimate.js` |
| `public/data/scenarios.json` | five demo presets + keyword fallback | changing demos |
| `functions/api/estimate.js` | classifier Function | prompt, schema, validation, timeout |
| `test/engine.test.js` | hand-verified engine cases | any math change |
| `public/_headers` | static-asset response headers (CSP, frame-ancestors, cache) | adding an external origin the client fetches (update `connect-src`) |
| `wrangler.jsonc` | `pages_build_output_dir` | almost never |

## Invariants that are easy to break

- **Token prices are USD per million.** Divide by 1e6 exactly once, in `tokenCostInrPerStep`.
  The unit test "1M input tokens at $1/M = ₹usd_to_inr" guards this. Never add a second division.
- **Tap grids are duplicated by design** in `app.js` (`TAPS`) and `estimate.js`
  (`TASKS_OPTIONS`, `MINUTES_OPTIONS`) because the Function cannot import browser code. Change both.
- **Archetype ids are duplicated by design** in `archetypes.json`, `scenarios.json`, and the
  `ARCHETYPE_IDS` enum in `estimate.js`. Change all three.
- **Anthropic structured-output schema dialect** rejects `minimum`/`maximum` on integers (HTTP 400).
  Numeric bounds live in `validateModelOutput`, not the schema.
- **`max_tokens` covers thinking plus output** on `claude-fable-5-1`. Keep it generous (4096);
  a `stop_reason: "max_tokens"` is treated as failure.
- **Select the content block with `type === "text"`**, not `content[0]`.
- **`source` semantics:** `manual` = user tapped a chip (confident label "Job type"); `ai`,
  `canned`, `shared` = "Closest match — your real numbers may differ". Do not upgrade a weak match.
- **Share-link decode must validate** version, enums, and finite ranges, and fall back to a fresh
  start on any failure. It must never trigger a model call.
- **`/api/*` is never cached** by the service worker.

## Workflow

1. **Before editing math:** write or adjust the paper-verifiable case in `test/engine.test.js`
   first, with the arithmetic in comments. Run `npm test`.
2. **Before editing UI copy:** add both `en` and `hi` strings. Hindi drafts are acceptable if
   labelled for founder review in your summary.
3. **Local run:** `echo 'ANTHROPIC_API_KEY=…' > .dev.vars && npm run dev`, then exercise
   `http://127.0.0.1:8788` and `POST /api/estimate`.
4. **Before pushing:** `npm test` passes; manual flow completes with `.dev.vars` removed or
   invalid (proves fallback); if you touched `sw.js` or the precache list, bump `VERSION`.
5. **Push to `main` deploys production automatically** (Git-connected Pages). Verify **both**:
   `GET /` → 200 and `POST /api/estimate` → JSON. A loaded homepage alone proves nothing about
   the Function.
6. **Do not push unless the founder asked for that change to ship.** Local commits are fine.
7. **Secrets changed in the dashboard** need *Deployments → Retry deployment* to apply.

## Deployment facts (so you don't rediscover them)

- Cloudflare account `0467…c18`; Pages project `what-s-the-cost`; production branch `main`;
  build command empty; output dir `public`.
- Custom domain `agentcost.wyrdwerk.com` via Pages *Custom domains*, CNAME proxied to
  `what-s-the-cost.pages.dev`. Zone `wyrdwerk.com` id `35fe…9fa`. Certificate: Google Trust Services.
- The `WRANGLER_API_TOKEN` in the founder's Amp secrets has *Pages: Edit* + *Account Settings: Read*
  but **no DNS permission**. DNS changes are done by the founder in the dashboard.
- Sandboxes without IPv6 or with stale resolver caches show intermittent `curl` failures against
  the new domain; test with `--resolve` or `@1.1.1.1` before assuming a server problem.

## Founder's vocabulary and positioning

- Product name in UI: **What's the cost?** (was "Cost Kitna Hoga?" until 2026-09-20; the Hindi UI keeps the English name). Repo/domain: *what-s-the-cost* / *agentcost*.
- Verdicts are exactly: *Worth an agent* · *Assist first — try a simpler tool* · *Leave it alone*.
- Footer lines are fixed copy: *"Estimate, not a quote. Real price depends on the factors above."*
  and *"We do not save your workflow in an application database. AI mode sends it to Anthropic;
  their retention policies apply."* Do not paraphrase.
- Contact: **contact@wyrdwerk.com** (never yash@).
- TokenWatch (tokenwatch.wyrdwerk.com) is WyrdWerk's own pricing comparator and the source of the
  pinned model price. Fixed lookup: `/api/v1/models/<canonical-id>/providers`. Never fetch the
  full catalog at receipt time.
- OpenRouter is a second, optional price source in "Other…". Its `/api/v1/models` is public (no
  key) and prices are USD per **token** — convert ×1e6 once (`loadOpenRouter()`). Any new fetch
  origin must be added to `connect-src` in `public/_headers` and the SW `VERSION` bumped.

## Engine and share-link contract (added after the 2026-09-20 red team)

- `Engine.estimate` validates its inputs and throws `RangeError`; never catch-and-continue with a
  partial result. Ranges are sorted on entry, so `[hi, lo]` inputs are legal.
- `decodeState` in `app.js` rebuilds the frozen objects with known keys only and dry-runs the engine.
  When adding a field to the share payload, add it to that allow-list or it will be dropped.
- Every rupee figure renders through `rangeInr`, which always prints two bounds. Do not "tidy" equal
  bounds into one number.
- `/api/estimate` returns 413 above `MAX_BODY_BYTES` (8 KB) before parsing.
- Open Cloudflare-side items owned by the founder: WAF rate-limiting rule on `POST /api/estimate`
  (see README §14), zone Browser Cache TTL → Respect Existing Headers.

## When to stop and ask the founder

- Changing any formula, threshold (9 months), or the conservative-interval rule.
- Changing the run model, FX rate, working days, or any `data/*.json` number.
- Adding a dependency, a build step, a second Function, or any storage.
- Anything that sends user text anywhere other than Anthropic via `/api/estimate`.
- Renaming archetype ids (breaks old share links).
- Custom-domain or DNS changes.

## Related repositories

- `WyrdWerk/Wyrdwerk_Co` — the firm's curated knowledge base (canonical facts, entities, positioning).
  Consult it for company facts; do not copy client-identifying details into this public repo.
- `WyrdWerk/tokenwatch` — pricing data source.
