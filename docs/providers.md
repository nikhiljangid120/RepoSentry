# Model providers

Set LLM_PROVIDER to groq, gemini, openrouter or openai. Set LLM_MODEL to a tool-capable model available in your account. Add only that provider's key to the ignored .env: GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY or OPENAI_API_KEY. Legacy OPENAI_MODEL remains a fallback. Endpoints are fixed to official provider domains; the model cannot change them.

Groq, Gemini and OpenRouter use their documented OpenAI-compatible chat APIs. OpenAI uses Responses. All outputs are schema-validated before any platform/tool invocation. Tool results are correlated with the model's call ID and returned for subsequent turns. Multiple parallel calls, repeated tools, malformed output and truncated completion are rejected. No provider executes RepoSentry tools directly.

The original llama-3.3-70b-versatile choice returned model-not-found for the supplied account. GET Groq's authenticated model catalog confirmed openai/gpt-oss-20b is available; the local account now uses that model on the user's explicitly authorized free tier. This is a Groq-hosted model and does not require an OpenAI API key. Account model catalogs can change; scripts/provider-models.ts lists actual IDs without printing credentials.

Live runs remain an explicit opt-in via LIVE_RUN_ENABLED. Never upgrade billing or use paid inference without an authorized limit. Free-tier rate limits can produce technical failures; these are not policy denials. Provider failures include only a bounded redacted error message.

Official references:

- https://console.groq.com/docs/tool-use/overview
- https://console.groq.com/docs/openai
- https://ai.google.dev/gemini-api/docs/openai
- https://openrouter.ai/docs/guides/features/tool-calling
- https://developers.openai.com/api/docs/guides/function-calling
