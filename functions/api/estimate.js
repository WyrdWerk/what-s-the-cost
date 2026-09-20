// Cloudflare Pages Function: POST /api/estimate
// ONE job: classify a plain-language job description into an archetype + inferred answers, using
// one Anthropic call with native structured output. Returns strict, server-validated JSON, or `null`
// on any failure so the client silently stays in manual mode. No retries. Never returns raw model text.

const MODEL = "claude-fable-5-1";
const DEADLINE_MS = 12000;
const MAX_DESCRIPTION_CHARS = 1000;

const ARCHETYPE_IDS = [
  "quotation_followup", "invoice_po_entry", "billing_inventory",
  "catalog_support", "report_generation", "content_pipeline",
];
const HANDLING = ["me", "staff", "nobody"];
const LANGUAGES = ["en", "hi"];
// Client tap options; inferred values are snapped to the nearest one so the receipt stays on-grid.
const TASKS_OPTIONS = [1, 5, 10, 20, 50, 100];
const MINUTES_OPTIONS = [2, 5, 10, 20, 30];

const SCHEMA = {
  type: "object",
  properties: {
    archetype_id: { type: "string", enum: ARCHETYPE_IDS },
    // Anthropic structured outputs reject minimum/maximum on integers; bounds are enforced in validateModelOutput.
    tasks_per_day: { type: "integer" },
    minutes_per_task: { type: "integer" },
    current_handling: { type: "string", enum: HANDLING },
    language: { type: "string", enum: LANGUAGES },
  },
  required: ["archetype_id", "tasks_per_day", "minutes_per_task", "current_handling", "language"],
  additionalProperties: false,
};

const SYSTEM = `You classify a small-business owner's description of a repetitive job (Hindi, English, or Hinglish) into exactly one archetype and infer three numbers.
Archetypes:
- quotation_followup: chasing sent quotations / leads on WhatsApp or phone
- invoice_po_entry: reading invoices or purchase orders and typing them into accounts/ERP
- billing_inventory: making bills and updating stock counts
- catalog_support: answering customer questions about products, prices, availability
- report_generation: compiling daily/weekly sales, stock or ledger summaries
- content_pipeline: drafting social posts, captions, product descriptions
If the job fits none, choose the closest one anyway.
tasks_per_day: how many times a day the job happens (if unstated, a modest typical guess).
minutes_per_task: minutes a human spends on one instance (if unstated, a typical guess).
current_handling: "me" if the owner does it, "staff" if an employee does, "nobody" if it is not being done.
language: "hi" if the description is mostly Hindi (Devanagari or romanised), else "en".`;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const nearest = (n, options) => options.reduce((best, o) => (Math.abs(o - n) < Math.abs(best - n) ? o : best), options[0]);

function validateModelOutput(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const keys = Object.keys(o);
  if (keys.length !== 5 || keys.some((k) => !(k in SCHEMA.properties))) return null;
  if (!ARCHETYPE_IDS.includes(o.archetype_id)) return null;
  if (!HANDLING.includes(o.current_handling)) return null;
  if (!LANGUAGES.includes(o.language)) return null;
  if (!Number.isFinite(o.tasks_per_day) || o.tasks_per_day < 1 || o.tasks_per_day > 1000) return null;
  if (!Number.isFinite(o.minutes_per_task) || o.minutes_per_task < 1 || o.minutes_per_task > 240) return null;
  return o;
}

export async function onRequestPost(context) {
  const apiKey = context.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(null);

  let body;
  try { body = await context.request.json(); } catch { return json(null, 400); }
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, MAX_DESCRIPTION_CHARS) : "";
  if (description.length < 3) return json(null, 400);
  const language = LANGUAGES.includes(body?.language) ? body.language : "en";
  const answers = body?.answers && typeof body.answers === "object" ? body.answers : {};

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DEADLINE_MS);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096, // hard cap on thinking + response; the JSON itself is ~40 tokens
        system: SYSTEM,
        messages: [{ role: "user", content: `UI language: ${language}\nDescription:\n${description}` }],
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      }),
    });
    if (!res.ok) return json(null);
    const data = await res.json();
    if (data?.stop_reason === "max_tokens" || data?.stop_reason === "refusal") return json(null);
    const textBlock = Array.isArray(data?.content) ? data.content.find((b) => b?.type === "text") : null;
    if (!textBlock || typeof textBlock.text !== "string") return json(null);

    let parsed;
    try { parsed = JSON.parse(textBlock.text); } catch { return json(null); }
    const out = validateModelOutput(parsed);
    if (!out) return json(null);

    // Explicit user answers override inferred values; inferred numbers snap to the tap grid.
    return json({
      archetype_id: out.archetype_id,
      tasks_per_day: TASKS_OPTIONS.includes(answers.tasks_per_day) ? answers.tasks_per_day : nearest(out.tasks_per_day, TASKS_OPTIONS),
      minutes_per_task: MINUTES_OPTIONS.includes(answers.minutes_per_task) ? answers.minutes_per_task : nearest(out.minutes_per_task, MINUTES_OPTIONS),
      current_handling: HANDLING.includes(answers.current_handling) ? answers.current_handling : out.current_handling,
      language: out.language,
    });
  } catch {
    return json(null); // timeout, network, or unexpected shape → clean null, no retry
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequest() {
  return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
}
