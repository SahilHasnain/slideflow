# Slideflow AI Gateway

This Cloudflare Worker keeps Gemini and Groq API keys off the mobile app. It tries Gemini first, falls back to Groq on temporary provider failures, and returns a controlled error so the app can use its local fallback.

## Deploy

From the project root:

```bash
npx wrangler login
npx wrangler secret put GEMINI_API_KEY --config worker/wrangler.toml
npx wrangler secret put GROQ_API_KEY --config worker/wrangler.toml
npx wrangler deploy --config worker/wrangler.toml
```

Optional provider model overrides:

Defaults: `gemini-2.5-flash-lite` and `llama-3.1-8b-instant`.

```bash
npx wrangler secret put GEMINI_MODEL --config worker/wrangler.toml
npx wrangler secret put GROQ_MODEL --config worker/wrangler.toml
```

Set the deployed URL in the Expo app's local environment file:

```text
EXPO_PUBLIC_AI_ENDPOINT=https://slideflow-ai.decklysahil.workers.dev
```

Restart Expo after changing environment variables. Never put provider API keys in `EXPO_PUBLIC_*` variables.
