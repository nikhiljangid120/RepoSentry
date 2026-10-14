import 'dotenv/config';
import { modelConfig, redact } from '../src/config.js';
import { installRedactedLogging } from '../src/logging.js';
installRedactedLogging();
const config = modelConfig();
const endpoint = { openai: 'https://api.openai.com/v1/models', groq: 'https://api.groq.com/openai/v1/models', gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/models', openrouter: 'https://openrouter.ai/api/v1/models' }[config.provider];
const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${config.key}` }, signal: AbortSignal.timeout(20000) });
if (!response.ok) { const body = await response.text(); console.error('Provider model catalog failed:', response.status, String(redact(body)).slice(0, 500)); process.exit(1); }
const body = await response.json();
console.log('Available model IDs:', body.data?.map((m: { id: string }) => m.id));
