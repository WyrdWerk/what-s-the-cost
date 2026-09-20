// Cloudflare Pages Function: POST /api/estimate
// Layer 2 (Anthropic classification) is added here. Until then this stub proves the Function deploys
// and returns a clean null, which the client treats as "stay in manual mode".
export async function onRequestPost() {
  return new Response("null", { headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export async function onRequest() {
  return new Response("Method not allowed", { status: 405 });
}
