# Cost Kitna Hoga? — What's the cost?

**An honest AI-agent cost estimator for Indian MSME owners.**
Describe one repetitive job in Hindi or English, answer three tap-questions, and get a one-page
"receipt" — styled like a bill — showing what an AI agent would cost to set up and run, what your
oversight time is worth, when it breaks even against doing the job by hand, and a plain verdict.

Every figure is a **rupee range, never a point estimate**. The footer says what it is:
*"Estimate, not a quote. Real price depends on the factors above."*

- **Live:** https://agentcost.wyrdwerk.com (also https://what-s-the-cost.pages.dev)
- **Source:** https://github.com/WyrdWerk/what-s-the-cost
- **Built by:** [WyrdWerk LLP](https://wyrdwerk.com), Indore — SME AI advisory and deployment. Contact: contact@wyrdwerk.com
- **Origin:** Claude Code Build Day hackathon, 20 September 2026.

---

## Contents

1. [What the user sees](#1-what-the-user-sees)
2. [Design principles](#2-design-principles)
3. [Architecture](#3-architecture)
4. [The math](#4-the-math)
5. [Data files (the founder's edit surface)](#5-data-files-the-founders-edit-surface)
6. [The classifier Function](#6-the-classifier-function)
7. [Fallback stack](#7-fallback-stack)
8. [Share links](#8-share-links)
9. [Privacy](#9-privacy)
10. [Local development](#10-local-development)
11. [Testing](#11-testing)
12. [Deployment](#12-deployment)
13. [Repository layout](#13-repository-layout)
14. [Known limitations and roadmap](#14-known-limitations-and-roadmap)
15. [Decision log](#15-decision-log)

---

## 1. What the user sees

Three screens, mobile-first, with an English / हिन्दी toggle in the header.

**Screen 1 — Describe.**
A free-text box ("Every day I send 20 quotations on WhatsApp and then chase replies"), six
always-visible **archetype chips** (the manual path), and five dashed **example chips** (canned
demo scenarios). Tapping an archetype chip is an explicit choice and skips the model. Typing text
and pressing *Next* sends the description to the classifier; if that fails for any reason the app
falls back to keyword matching, then to asking the user to tap a chip.

**Screen 2 — Three tap-questions.**
- How many times a day? `1 · 5 · 10 · 20 · 50 · 100`
- Who does it now? `Me · Staff · Nobody yet`
- Minutes per task? `2 · 5 · 10 · 20 · 30`

When the archetype came from the model or a keyword match, the screen is headed
*"Closest match: X — your real numbers may differ."* A hand-tapped chip shows *"Job type: X"*.
A weak match is never dressed up as a confident verdict.

**Screen 3 — The receipt.**

| Line | What it is |
|---|---|
| Agent setup (one time) | Range in ₹ |
| Which model runs the agent? | Three-way switch **Cheap / Balanced / Frontier**; each is one pinned TokenWatch model. Switching recomputes the receipt live and is saved in the share link |
| Monthly run cost | Model usage on the selected tier's model |
| Your oversight time | Hours/month **and** ₹/month, shown separately |
| What this job costs you today | Baseline: hours/month × imputed wage |
| Monthly saving | Conservative interval (see §4) |
| Break-even | "Month a to b" / "Possible, not assured." / "No break-even at these numbers." |
| **Verdict** | *Worth an agent* / *Assist first — try a simpler tool* / *Leave it alone* |
| What moves the price | Three honest bullets per archetype |
| When it is not worth it | One paragraph per archetype |
| Assumptions | Working days, USD→INR rate, pricing snapshot date |
| Footer | "Estimate, not a quote…" · privacy statement · contact CTA |

Buttons: *Start over* and *Copy share link*.

## 2. Design principles

1. **Ranges, not points.** Every cost is an interval and interval arithmetic is conservative:
   the "saving" range's low end assumes every cost at its high end and every benefit at its low end.
2. **Verdicts on the interval, not the midpoint.** "Worth an agent" requires break-even ≤ 9 months
   *even in the worst case*.
3. **Baseline is time, not salary.** The job's current cost is the minutes it eats × an imputed
   wage — never a whole salary unless the whole job disappears.
4. **Manual mode is the product, not the rescue feature.** Chips are visible immediately; the model
   only ever adds convenience. Nothing waits on the model.
5. **Disclose every assumption on the receipt.** Working days, FX rate, pinned model and its
   snapshot date, wage used.
6. **No database, no accounts, no analytics.** State lives in the URL fragment and nowhere else.
7. **Offline-capable.** A new estimate can be completed with the network off.

## 3. Architecture

```diagram
┌──────────────────────────────┐        ┌──────────────────────────────────┐
│ Browser (public/)            │        │ Cloudflare Pages                  │
│                              │        │                                  │
│ index.html · style.css       │◀──────▶│ static assets from public/       │
│ app.js   — UI, i18n, share   │        │                                  │
│ engine.js — deterministic    │  POST  │ functions/api/estimate.js        │
│             range math       │───────▶│  ONE Pages Function              │──▶ Anthropic Messages API
│ sw.js    — offline cache     │◀───────│  validates → strict JSON | null  │    claude-fable-5-1
│ data/*.json — assumptions    │        │  ANTHROPIC_API_KEY (secret)      │    structured output
└──────────────────────────────┘        └──────────────────────────────────┘
```

- **Static site**, vanilla HTML/JS/CSS, no framework, no build step. `public/` is deployed as-is.
- **Exactly one Pages Function**, `functions/api/estimate.js`, mounted at `POST /api/estimate`.
  Its only job is classification: description → `{archetype_id, tasks_per_day, minutes_per_task,
  current_handling, language}`. It never returns model prose.
- **All cost math runs client-side** in `public/engine.js` from `data/*.json`. The server never
  sees or computes a price.
- `functions/` lives at the repo root (Pages convention), **not** inside `public/`.

## 4. The math

All formulas live in [`public/engine.js`](public/engine.js). Notation: `[lo, hi]` is a range; `D` is
`working_days_per_month` (26, disclosed on the receipt).

**Setup (one time)**
`S = [setup_hours.lo × setup_rate.lo, setup_hours.hi × setup_rate.hi]`

**Monthly run cost (model usage)** — input and output tokens priced separately; prices are USD
**per million** tokens and are divided by 1e6 exactly once:

```
per_step_inr(lo|hi) = (tokens_in/1e6 × price_in + tokens_out/1e6 × price_out) × usd_to_inr
R = [tasks × D × steps.lo × per_step_inr(lo),  tasks × D × steps.hi × per_step_inr(hi)]
```

**Owner oversight**
```
oversight_hours = review_min_per_day / 60 × D
O = [oversight_hours × owner_rate.lo, oversight_hours × owner_rate.hi]
```
Shown as hours **and** rupees.

**Baseline (what the job costs today)**
```
baseline_hours = tasks × minutes / 60 × D
wage = owner_hourly_value      if current_handling = "me"
     = archetype staff wage    if current_handling = "staff"
     = [0, 0]                  if current_handling = "nobody"   (no time is spent today)
B = [baseline_hours × wage.lo, baseline_hours × wage.hi]
```

**Conservative net saving**
```
Net.lo = B.lo − R.hi − O.hi
Net.hi = B.hi − R.lo − O.lo
```

**Break-even and payback**
- `Net.hi ≤ 0` → **never**. No payback range is shown.
- `Net.lo ≤ 0 < Net.hi` → **possible, not assured**. No payback range is shown.
- `Net.lo > 0` → **assured**; `payback = [S.lo / Net.hi, S.hi / Net.lo]` months.

**Verdict** (thresholds on the interval, never the midpoint)
- assured **and** `payback.hi ≤ 9` → **Worth an agent**
- never → **Leave it alone**
- everything else (possible, or assured but slower than 9 months worst-case) → **Assist first**

Five hand-verified cases in [`test/engine.test.js`](test/engine.test.js) cover each verdict, the
"possible" case, and a unit check that 1M input tokens at $1/M costs exactly $1.

## 5. Data files (the founder's edit surface)

All numbers the receipt uses live in three JSON files under `public/data/`. **Editing them requires
no code change**; push to `main` and Pages redeploys. Each file carries a `_status` field that says
how trustworthy its numbers are.

### `config.json` — global constants

| Field | Meaning | Current value |
|---|---|---|
| `working_days_per_month` | `D` above | 26 |
| `owner_hourly_value_inr` | `[lo, hi]` ₹/hr for the owner's time (oversight, and baseline when "me") | [500, 1000] *(draft)* |
| `setup_hourly_rate_inr` | `[lo, hi]` ₹/hr for build labour | [1200, 2500] *(draft)* |
| `usd_to_inr` | pinned FX rate | 96 (frankfurter/er-api, 2026-09-20) |
| `default_tier` | tier used until the user taps another | `balanced` |
| `run_models.<tier>.id` / `display_name` | one pinned model per tier (`cheap`, `balanced`, `frontier`) | see below |
| `run_models.<tier>.input_usd_per_million` / `output_usd_per_million` | USD per **million** tokens | see below |
| `run_models.<tier>.intelligence_index` / `agentic_index` | TokenWatch benchmark indices, shown under the switch | see below |
| `run_models.<tier>.pricing_snapshot_date` / `pricing_source` | shown on the receipt / the TokenWatch lookup used | 2026-09-20 |

Tiers pinned on 2026-09-20 from TokenWatch first-party provider rows:

| Tier | Model | $/M in | $/M out | Intelligence | Agentic |
|---|---|---|---|---|---|
| cheap | `google/gemini-3.8-flash` | 0.375 | 1.875 | 40.9 | 40.2 |
| balanced | `anthropic/claude-sonnet-5` | 2 | 10 | 38.2 | 43.6 |
| frontier | `anthropic/claude-fable-5.1` | 10 | 50 | 53.4 | 57.9 |

> The tier models are a **founder decision** (2026-09-20: dynamic choice, three fixed tiers sourced
> from TokenWatch). The run model is not the classifier model. Editing a tier's prices is a two-line
> edit here and materially changes verdicts; keep `pricing_snapshot_date` honest when you do.
> The engine still accepts the legacy single `run_model` shape so old share links keep working.

### `archetypes.json` — the six job types

One entry per archetype. All ranges are `[min, max]`.

| Field | Meaning |
|---|---|
| `id` | stable key used by the Function's enum, scenarios, and share links |
| `name_en`, `name_hi` | chip and receipt labels |
| `does` | one-line description of what the agent would do |
| `setup_hours` | build effort in hours |
| `steps_per_task` | model calls per task instance |
| `tokens_per_step.input` / `.output` | tokens per single model call |
| `review_min_per_day` | owner minutes per day checking the agent's work |
| `baseline_wage_assumption.inr_per_hour` | staff wage used when `current_handling = "staff"` |
| `price_drivers`, `price_drivers_hi` | three bullets: what moves the price |
| `when_not_worth_it`, `when_not_worth_it_hi` | one honest paragraph |

The six ids: `quotation_followup`, `invoice_po_entry`, `billing_inventory`, `catalog_support`,
`report_generation`, `content_pipeline`. **If you add or rename an id you must also update the enum
in `functions/api/estimate.js`.**

Current numbers are marked `_status: DRAFT` — implementer estimates awaiting founder review.

### `scenarios.json` — five canned presets

Each has bilingual `title` and `description`, a `keywords` list (lowercase substrings, including
romanised Hindi), an `archetype_id`, and preset `answers`. They serve two purposes: the dashed
"Try an example" chips (deterministic demos), and the keyword fallback when the classifier is
unavailable. Longest matching keyword wins.

## 6. The classifier Function

[`functions/api/estimate.js`](functions/api/estimate.js), `POST /api/estimate`.

**Request** `{ description: string, language: "en"|"hi", answers: { tasks_per_day?, minutes_per_task?, current_handling? } }`

**Response** — either strict JSON or the literal `null`:
```json
{"archetype_id":"invoice_po_entry","tasks_per_day":10,"minutes_per_task":10,"current_handling":"staff","language":"en"}
```

**Behaviour**
- One call to Anthropic `claude-fable-5-1` with `output_config.format = {type: "json_schema", …}`
  (native structured output, no beta header) and `output_config.effort = "low"`. `max_tokens: 4096`
  because it caps thinking **plus** response.
- Reads the content block whose `type === "text"`, not the first block.
- Server-side validation regardless of the schema: exactly the five keys, enum membership, finite
  bounded numbers. Anthropic's schema dialect rejects `minimum`/`maximum` on integers, so bounds
  are enforced here.
- **Explicit user answers override inferred values.** Inferred counts snap to the nearest tap option.
- 12-second deadline via `AbortController`. On timeout, non-2xx, refusal, `max_tokens` stop,
  parse failure, or validation failure → returns `null`. **No retries.**
- `ANTHROPIC_API_KEY` comes from `context.env` (Pages secret binding). It is never in code or the
  browser. Missing key → `null`.
- `GET` → 405. Empty/short body → 400 with `null`.

Verified live 2026-09-20: ~3.5–4 s per call; Hinglish, Devanagari and English inputs classified
correctly; explicit `current_handling` override honoured; 401 and timeout paths return `null`.

## 7. Fallback stack

Built and deployed in this order; each layer works without the ones after it.

1. **Manual mode** — chips + tap-questions + receipt. Fully functional with JavaScript and JSON only.
2. **Model classification** — layered on the same flow. Any failure is silent to the user.
3. **Canned scenarios** — keyword match on the description when the model returns `null`; also the
   demo chips.
4. **Service worker** — `public/sw.js` precaches the shell and data files (`ckh-v1`), cache-first
   for same-origin GETs, never caches `/api/*`. **Acceptance test passed:** a *new* estimate was
   completed with the network off (page from cache → typed description → API unreachable → keyword
   match → receipt).

If nothing matches, the UI says *"Couldn't read that automatically — tap the closest match below."*

## 8. Share links

*Copy share link* puts the **entire input state** in the URL fragment (`#…`): language, description,
archetype id, source, answers, and a **frozen snapshot** of the archetype and config used. Reopening
a link therefore:

- never calls the model,
- reproduces the same numbers even if `data/*.json` has since changed,
- is Unicode-safe (UTF-8 → base64url) so Hindi survives,
- is validated on decode (version, enums, finite ranges); anything malformed is ignored and the app
  starts fresh,
- renders every string via `textContent`, never `innerHTML`.

The fragment is never sent to the server.

## 9. Privacy

- **No application database, no accounts, no analytics, no cookies.** The server stores nothing.
- **AI mode sends the description to Anthropic**; their retention policies apply. This is stated on
  every receipt. Manual mode and offline mode send nothing anywhere.
- The Function receives only `description`, `language`, and the three answers.
- `.dev.vars` (local secrets) is git-ignored. The repository contains no credentials.

## 10. Local development

Requirements: Node 20+ (tested on 26), npm. No install step; wrangler runs via `npx`.

```bash
# 1. local secret for the Function (git-ignored)
echo 'ANTHROPIC_API_KEY=sk-ant-…' > .dev.vars

# 2. run Pages + Function locally
npm run dev            # = npx wrangler pages dev  → http://127.0.0.1:8788

# 3. engine tests
npm test               # = node test/engine.test.js
```

`wrangler.jsonc` sets `pages_build_output_dir: "./public"`, so `wrangler pages dev` needs no
arguments. Edits to `public/` are served live; edits to `functions/` hot-reload.

Manual smoke test of the Function:
```bash
curl -s -X POST http://127.0.0.1:8788/api/estimate -H 'content-type: application/json' \
  -d '{"description":"Roz 20 quotation WhatsApp pe bhejta hu, phir follow up","language":"hi","answers":{}}'
```

## 11. Testing

| What | How | Status (2026-09-20) |
|---|---|---|
| Engine math | `npm test` — 5 paper-verified cases | pass |
| Manual flow, EN/HI, phone width | browser run-through, screenshots | pass |
| Classifier happy path | live POSTs: Hinglish, Devanagari, English, out-of-scope | pass |
| Explicit answer override | POST with `answers.current_handling` | pass |
| 401 (bad key) | `.dev.vars` with invalid key → `null`, UI falls back | pass |
| Timeout | `DEADLINE_MS=1` → `null` in ~30 ms | pass |
| Offline new estimate | agent-browser offline mode after first load | pass |
| Live deploy serves page **and** Function | `GET /` 200, `POST /api/estimate` 200 on both domains | pass |
| Share link round-trip on live URL | — | pending |
| 429 / 5xx from Anthropic | code path identical to 401 (`!res.ok → null`); not forced on prod | reasoned, not exercised |

## 12. Deployment

**Primary: Git-connected Cloudflare Pages.** Project `what-s-the-cost` is connected to this
repository. Every push to `main` builds (no build command; output dir `public`) and deploys to
production. Secrets are set in the dashboard: *Settings → Variables and Secrets →
`ANTHROPIC_API_KEY` (Secret, Production)*. Changing a secret requires *Deployments → Retry
deployment* to take effect.

**Custom domain:** `agentcost.wyrdwerk.com` is attached via *Custom domains* (Pages-managed, not a
bare DNS CNAME) with a proxied CNAME `agentcost → what-s-the-cost.pages.dev` in the `wyrdwerk.com`
zone. Certificate by Google Trust Services, auto-renewed.

**Backup (Plan A, CLI):** with an API token holding *Account → Cloudflare Pages: Edit* and
*Account Settings: Read*:
```bash
export CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=…
npx wrangler pages deploy public --project-name what-s-the-cost --branch main
npx wrangler pages deployment list --project-name what-s-the-cost
```

**Emergency (Plan C):** `npm run dev` locally, then `cloudflared tunnel --url http://localhost:8788`.
The `trycloudflare.com` URL is random per run and dies with the process — a demo bridge, never a
submission URL.

**Verify any deploy** with both checks; a loaded homepage alone does not prove the Function shipped:
```bash
curl -s -o /dev/null -w '%{http_code}\n' https://agentcost.wyrdwerk.com/
curl -s -X POST https://agentcost.wyrdwerk.com/api/estimate -H 'content-type: application/json' \
  -d '{"description":"my accountant types 10 invoices into Tally daily","language":"en","answers":{}}'
```

## 13. Repository layout

```
.
├── AGENTS.md                  # rules for AI agents working in this repo
├── README.md                  # this file
├── package.json               # scripts only: dev, test, deploy (no dependencies)
├── wrangler.jsonc             # pages_build_output_dir: ./public
├── .gitignore                 # .wrangler/, .dev.vars, node_modules/, .amp/
├── functions/
│   └── api/
│       └── estimate.js        # the ONE Pages Function (classifier)
├── public/                    # deployed as-is
│   ├── index.html             # three screens, i18n hooks
│   ├── style.css              # receipt-as-bill styling, 44px+ tap targets
│   ├── app.js                 # UI state, i18n, chips/taps, receipt render, share link, SW registration
│   ├── engine.js              # pure range math (UMD: browser global + Node require)
│   ├── sw.js                  # offline cache
│   └── data/
│       ├── archetypes.json    # six job types — founder's numbers
│       ├── config.json        # constants, three pinned model tiers, FX
│       └── scenarios.json     # five canned presets / demo cases
└── test/
    └── engine.test.js         # hand-verified engine cases
```

## 14. Known limitations and roadmap

- **Numbers are drafts.** `archetypes.json` and the owner/setup rates in `config.json` are
  implementer estimates pending founder review.
- **Model choice is three fixed tiers**, not a benchmark-driven suggestion per archetype. TokenWatch
  supports `GET /api/v1/models?benchmarked=true&min_intelligence=N&sort=input&limit=10`, so a
  "suggested cheapest model that clears this archetype's benchmark floor" is a natural next step
  (skip `:batch` rows and quantized third-party offers).
- **Live TokenWatch refresh is not implemented.** The receipt shows a dated pricing snapshot. If
  added, use the fixed per-model lookup `GET https://tokenwatch.wyrdwerk.com/api/v1/models/<id>/providers`
  for the three tier ids only, never the full catalog, and keep the snapshot as fallback labelled
  "saved pricing snapshot".
- **Model-inferred counts snap to the tap grid**; a user who says "30 a day" sees 20 preselected
  and can change it.
- **`language` from the classifier is informational**; the UI language follows the toggle.
- No PDF export, WhatsApp integration, or voice — deliberately out of scope.
- The service worker version string (`ckh-v2` in `sw.js`) must be bumped when cached files change
  in ways that matter offline.

## 15. Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-09-20 | Cloudflare Pages + one Function, vanilla JS, no build | Hackathon speed; zero-dependency deploy |
| 2026-09-20 | Run model pinned to `claude-fable-5.1` from TokenWatch | Founder instruction; "modify later" |
| 2026-09-20 | Superseded: three model tiers (Gemini 3.8 Flash / Sonnet 5 / Fable 5.1) chosen on the receipt, default `balanced` | Founder chose "fixed tiers" over benchmark-suggested model; ~130× price spread made a single pinned model misleading |
| 2026-09-20 | FX pinned ₹96/$ | frankfurter 95.88 (09-18), er-api 95.94 (09-20), rounded |
| 2026-09-20 | `current_handling = "nobody"` ⇒ baseline ₹0 | No time is currently spent; agent cannot "save" it |
| 2026-09-20 | Setup cost = hours × config hourly rate | One constant to tune instead of six ranges |
| 2026-09-20 | Tap grid `1·5·10·20·50·100` / `2·5·10·20·30` | Added `1` after "once a day report" snapped to 5 |
| 2026-09-20 | Chip tap skips model; typed text with no chip calls it | Explicit beats inferred |
| 2026-09-20 | Schema `minimum`/`maximum` removed; bounds in validator | Anthropic structured-output dialect rejects them |
| 2026-09-20 | Git-connected Pages over CLI deploy | No token needed; auto-deploy on push |
| 2026-09-20 | Subdomain `agentcost.wyrdwerk.com` | Founder choice over `kitna`/`cost`/`estimate` |
