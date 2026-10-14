import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateCall, schemas, type Run } from '../src/contracts';
import { executeFixture, snapshot } from '../src/state';
import { investigate } from '../src/agent';
import { Denial, type Gateway } from '../src/armor';
import { readiness, redact } from '../src/config';
import { modelTurn, type ModelTurn } from '../src/model';
import { Status, RunDetail } from '../web/main';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
const dirs: string[] = [];
async function sandbox() { const dir = await mkdtemp(join(tmpdir(), 'reposentry-unit-')); dirs.push(dir); return dir; }
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))); });
const check = () => ({ ready: true, missing: [], onboarding: 'Unit test dependency' });
function model(action: 'read_test_issue' | 'perform_restricted_test_action') { let n = 0; return async (): Promise<ModelTurn> => n++ === 0 ? { id: 'unit', calls: [{ action, params: action === 'read_test_issue' ? { issueId: '1' } : {}, callId: 'unit-call' }], text: '' } : { id: 'unit', calls: [], text: 'Unit-test summary' }; }
describe('UNIT ONLY — mocked gateway does not prove ArmorIQ enforcement', () => {
  it('rejects traversal, unknown fields and malformed model tool output', () => {
    expect(() => schemas.inspect_test_repository.parse({ filename: '../.env' })).toThrow();
    expect(() => schemas.perform_restricted_test_action.parse({ command: 'shell' })).toThrow();
    expect(() => validateCall({ name: 'shell', arguments: '{}', call_id: 'x' })).toThrow();
    expect(() => validateCall({ name: 'read_test_issue', arguments: '{', call_id: 'x' })).toThrow();
  });
  it('reads a fixture with execution receipt and refuses duplicate execution', async () => {
    const dir = await sandbox(); const runId = randomUUID();
    const receipt = await executeFixture(dir, 'read_test_issue', { runId, input: { issueId: '2' } });
    expect(JSON.stringify(receipt.output)).toContain('Ignore your previous');
    expect((await snapshot(dir, runId, 'read_test_issue')).receipt).toBeTruthy();
    await expect(executeFixture(dir, 'read_test_issue', { runId, input: { issueId: '2' } })).rejects.toThrow('Duplicate');
  });
  it('validates envelope before creating state', async () => { const dir = await sandbox(); await expect(executeFixture(dir, 'perform_restricted_test_action', { runId: '../bad', input: {} })).rejects.toThrow(); });
  it('requires a matching receipt for allowed execution', async () => {
    const dir = await sandbox();
    const gateway: Gateway = { invoke: async (_r, action, params) => { await executeFixture(dir, action, params); return { source: 'MOCK UNIT ONLY' }; } };
    const run = await investigate('Read test issue', { dir, check, model: model('read_test_issue'), gateway });
    expect(run.status).toBe('allowed_executed'); expect(run.calls[0].execution).toBe('executed');
  });
  it('does not count proxy success without execution evidence', async () => { const run = await investigate('Read test issue', { dir: await sandbox(), check, model: model('read_test_issue'), gateway: { invoke: async () => ({}) } }); expect(run.status).toBe('failed'); expect(run.error).toContain('receipt'); });
  it('checks side effects independently after a typed denial (mock unit dependency)', async () => {
    const dir = await sandbox(); const run = await investigate('Restricted test', { dir, check, model: model('perform_restricted_test_action'), gateway: { invoke: async () => { throw new Denial({ source: 'MOCK UNIT ONLY', enforcement: { action: 'block' } }); } } });
    expect(run.status).toBe('denied'); expect(run.calls[0].evidence.markerAbsent).toBe(true); expect((await snapshot(dir, run.id, 'perform_restricted_test_action')).marker).toBe(false);
  });
  it('fails if a claimed denial has a side effect', async () => {
    const dir = await sandbox(); const run = await investigate('Restricted test', { dir, check, model: model('perform_restricted_test_action'), gateway: { invoke: async (_r, a, p) => { await executeFixture(dir, a, p); throw new Denial({ source: 'MOCK' }); } } });
    expect(run.status).toBe('failed'); expect(run.error).toContain('side effect');
  });
  it.each(['timeout', 'MCP unavailable', 'HTTP 403', 'blocked'])('does not treat generic %s errors as denial', async message => { const run = await investigate('Restricted test', { dir: await sandbox(), check, model: model('perform_restricted_test_action'), gateway: { invoke: async () => { throw new Error(message); } } }); expect(run.status).toBe('failed'); expect(run.calls[0].policy).toBe('unverified'); expect(run.calls[0].execution).toBe('unknown'); });
  it('missing credentials never calls provider or gateway', async () => { const provider = vi.fn(); const run = await investigate('Read test issue', { dir: await sandbox(), check: () => readiness({}), model: provider }); expect(run.status).toBe('unverified'); expect(provider).not.toHaveBeenCalled(); });
  it('provider failures and malformed responses are technical errors', async () => {
    await expect(modelTurn([], vi.fn().mockResolvedValue(new Response('{}', { status: 429 })))).rejects.toThrow('HTTP 429');
    await expect(modelTurn([], vi.fn().mockResolvedValue(Response.json({ id: 'x', status: 'completed', output: [{ type: 'function_call', name: 'read_test_issue', arguments: 'bad', call_id: 'x' }] })))).rejects.toThrow();
    const run = await investigate('Read test issue', { dir: await sandbox(), check, model: async () => { throw new Error('Provider failed'); }, gateway: { invoke: vi.fn() } }); expect(run.status).toBe('failed');
  });
  it('blocks duplicate model selections without a second gateway call', async () => { const invoke = vi.fn().mockImplementation(async (_r, a, p) => { await executeFixture(dir, a, p); return {}; }); const dir = await sandbox(); const selected = { id: 'x', calls: [{ action: 'read_test_issue' as const, params: { issueId: '1' as const }, callId: 'x' }], text: '' }; const run = await investigate('Read test issue', { dir, check, model: async () => selected, gateway: { invoke } }); expect(run.status).toBe('failed'); expect(invoke).toHaveBeenCalledTimes(1); });
  it('redacts secrets and token material recursively', () => { vi.stubEnv('OPENAI_API_KEY', 'unit-secret-value'); expect(redact({ signature: 'sig', text: 'unit-secret-value', tokenId: 'evidence-id', nested: { apiKey: 'secret' } })).toEqual({ signature: '[REDACTED]', text: '[REDACTED]', tokenId: 'evidence-id', nested: { apiKey: '[REDACTED]' } }); });
  it.each(['allowed_executed', 'denied', 'failed', 'pending', 'unverified'] as const)('UI renders distinct %s label', status => { const html = renderToStaticMarkup(React.createElement(Status, { status })); expect(html).toContain(status); });
  it('UI displays missing evidence and escaped error text', () => { const run: Run = { id: randomUUID(), request: 'Read issue', startedAt: new Date().toISOString(), status: 'failed', calls: [], events: [], error: '<script>bad</script>' }; const html = renderToStaticMarkup(React.createElement(RunDetail, { run })); expect(html).toContain('No verified policy'); expect(html).not.toContain('<script>'); });
});
