import { afterEach, describe, expect, it, vi } from 'vitest';
import { modelTurn, chatMessages } from '../src/model';
import { modelConfig, readiness, redact } from '../src/config';
afterEach(() => vi.unstubAllEnvs());
describe('UNIT ONLY — mocked provider responses', () => {
  it.each(['groq', 'gemini', 'openrouter'] as const)('uses %s official endpoint and normalizes real tool-call shape', async provider => {
    vi.stubEnv('LLM_PROVIDER', provider); vi.stubEnv('LLM_MODEL', 'unit-model');
    const request = vi.fn().mockResolvedValue(Response.json({ id: 'unit', choices: [{ finish_reason: 'tool_calls', message: { content: null, tool_calls: [{ id: 'unit-call', type: 'function', function: { name: 'read_test_issue', arguments: '{"issueId":"1"}' } }] } }] }));
    const turn = await modelTurn([{ role: 'user', content: 'Read issue 1' }], request);
    expect(turn.calls[0]).toEqual({ action: 'read_test_issue', callId: 'unit-call', params: { issueId: '1' } });
    const url = request.mock.calls[0][0]; expect(url).toBe({ groq: 'https://api.groq.com/openai/v1/chat/completions', gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', openrouter: 'https://openrouter.ai/api/v1/chat/completions' }[provider]);
    const body = JSON.parse(request.mock.calls[0][1].body); expect(body.tools).toHaveLength(3); expect(body.parallel_tool_calls).toBe(false); expect(body.max_tokens).toBe(1200);
  });
  it('sends assistant tool calls followed by correlated tool output', () => {
    expect(chatMessages([{ type: 'function_call', call_id: 'x', name: 'read_test_issue', arguments: '{}' }, { type: 'function_call_output', call_id: 'x', output: '{"id":"1"}' }])).toEqual([{ role: 'assistant', content: null, tool_calls: [{ id: 'x', type: 'function', function: { name: 'read_test_issue', arguments: '{}' } }] }, { role: 'tool', tool_call_id: 'x', content: '{"id":"1"}' }]);
  });
  it('rejects malformed and truncated chat output', async () => { vi.stubEnv('LLM_PROVIDER', 'groq'); const request = vi.fn().mockResolvedValue(Response.json({ id: 'x', choices: [{ finish_reason: 'length', message: { content: 'Incomplete' } }] })); await expect(modelTurn([], request)).rejects.toThrow(); });
  it('rejects unsupported providers before any credential is transmitted', () => { expect(() => modelConfig({ LLM_PROVIDER: 'evil' })).toThrow(); expect(readiness({ LLM_PROVIDER: 'evil' }).ready).toBe(false); });
  it('redacts selected provider credentials even when their prefix is unrecognized', () => { vi.stubEnv('GEMINI_API_KEY', 'unit-gemini-secret'); expect(redact('unit-gemini-secret and gsk_example')).toBe('[REDACTED] and [REDACTED]'); });
});
