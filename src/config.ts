import 'dotenv/config';
import { resolve } from 'node:path';
import { z } from 'zod';
export const dataDir = resolve(process.env.DATA_DIR || '.reposentry');
export const providers = ['openai', 'groq', 'gemini', 'openrouter'] as const;
export function modelConfig(env = process.env) {
  const provider = z.enum(providers).parse(env.LLM_PROVIDER || 'openai');
  const keyName = { openai: 'OPENAI_API_KEY', groq: 'GROQ_API_KEY', gemini: 'GEMINI_API_KEY', openrouter: 'OPENROUTER_API_KEY' }[provider];
  return { provider, keyName, key: env[keyName], model: env.LLM_MODEL || env.OPENAI_MODEL };
}
export function readiness(env = process.env) {
  let model: ReturnType<typeof modelConfig>;
  try { model = modelConfig(env); } catch { return { ready: false, missing: ['LLM_PROVIDER must be openai, groq, gemini or openrouter'], onboarding: 'Provider configuration invalid' }; }
  const required = ['ARMORIQ_API_KEY', 'ARMORIQ_USER_ID', 'ARMORIQ_AGENT_ID', 'ARMORIQ_MCP_NAME', model.keyName, 'MCP_TRANSPORT_SECRET'];
  const missing = required.filter(k => !env[k]?.trim());
  if (!model.model?.trim()) missing.push('LLM_MODEL (or OPENAI_MODEL)');
  if ((env.MCP_TRANSPORT_SECRET?.length || 0) < 32 && !missing.includes('MCP_TRANSPORT_SECRET')) missing.push('MCP_TRANSPORT_SECRET (minimum 32 characters)');
  if (env.LIVE_RUN_ENABLED !== 'true') missing.push('LIVE_RUN_ENABLED=true (API spend authorization)');
  return { ready: missing.length === 0, missing, onboarding: 'Must be confirmed in ArmorIQ platform; credentials alone do not prove registration.' };
}
export function port(value: string | undefined, fallback: number) { return z.coerce.number().int().min(1024).max(65535).parse(value || fallback); }
export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    let safe = value.replace(/\b(?:sk-|ak_live_|ak_test_|gsk_)[A-Za-z0-9_-]+/g, '[REDACTED]').replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
    for (const key of ['ARMORIQ_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY', 'GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'MCP_TRANSPORT_SECRET']) { const secret = process.env[key]; if (secret) safe = safe.split(secret).join('[REDACTED]'); }
    return safe;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, /token|signature|credential|secret|authorization|api.?key/i.test(k) && !/tokenId/i.test(k) ? '[REDACTED]' : redact(v)]));
  return value;
}
