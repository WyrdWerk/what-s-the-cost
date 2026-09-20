# Cost Kitna Hoga?

Honest AI-agent cost estimator for Indian MSME owners. Rupee ranges, never point estimates. Estimate, not a quote.

- `public/` static site (vanilla HTML/JS/CSS, no build)
- `functions/api/estimate.js` the single Pages Function (Anthropic classification)
- `test/engine.test.js` hand-verified engine tests: `npm test`
- Deploy: `npx wrangler pages deploy public --project-name cost-kitna-hoga --branch main`
