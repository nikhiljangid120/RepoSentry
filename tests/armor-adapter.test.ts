import { beforeEach, describe, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ capturePlan: vi.fn(), getIntentToken: vi.fn(), invoke: vi.fn(), options: vi.fn() }));
vi.mock('@armoriq/sdk', async original => {
  const actual = await original<Record<string, unknown>>();
  return { ...actual, ArmorIQClient: class {
    constructor(options: unknown) { sdk.options(options); }
    capturePlan(...args: unknown[]) { return sdk.capturePlan(...args); }
    getIntentToken(...args: unknown[]) { return sdk.getIntentToken(...args); }
    invoke(...args: unknown[]) { return sdk.invoke(...args); }
  } };
});
import { ArmorGateway, Denial } from '../src/armor';
import { PolicyBlockedException } from '@armoriq/sdk';
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('ARMORIQ_MCP_NAME', 'unit-mcp'); vi.stubEnv('OPENAI_MODEL', 'unit-model'); vi.stubEnv('LLM_PROVIDER', 'openai'); vi.stubEnv('LLM_MODEL', 'unit-model'); vi.stubEnv('ARMORIQ_USER_EMAIL', '');
  sdk.capturePlan.mockReturnValue({ plan: 'unit' }); sdk.getIntentToken.mockResolvedValue({ tokenId: 'unit-token', planId: 'unit-plan', planHash: 'unit-hash', expiresAt: 1 });
  sdk.invoke.mockResolvedValue({ status: 'success', verified: true, result: { content: [] } });
});
describe('UNIT ONLY — official SDK adapter with mocked SDK calls', () => {
  it('captures exact arguments, mints token and invokes proxy with no local executor', async () => {
    const params = { runId: 'unit', input: { issueId: '1' } };
    const evidence = await new ArmorGateway().invoke('Read issue', 'read_test_issue', params, vi.fn());
    expect(sdk.capturePlan).toHaveBeenCalledWith('unit-model', 'Read issue', { goal: 'Read issue', steps: [{ mcp: 'unit-mcp', action: 'read_test_issue', params }] });
    expect(sdk.getIntentToken).toHaveBeenCalledWith({ plan: 'unit' }, undefined, 300);
    expect(sdk.invoke).toHaveBeenCalledWith('unit-mcp', 'read_test_issue', expect.objectContaining({ tokenId: 'unit-token' }), params, undefined, undefined);
    expect(evidence.phase).toBe('proxy'); expect(sdk.options.mock.calls[0][0].maxRetries).toBe(0);
  });
  it('recognizes SDK structured proxy denial and preserves correlation data', async () => {
    sdk.invoke.mockRejectedValue(Object.assign(new Error('Unit block'), { name: 'PolicyBlockedException', response: { status: 403, data: { enforcement: { action: 'block', reason: 'Unit explicit deny', matched_policy: 'unit-policy' } } } }));
    try { await new ArmorGateway().invoke('Test marker', 'perform_restricted_test_action', {}, vi.fn()); throw new Error('Expected unit denial'); } catch (e) { expect(e).toBeInstanceOf(Denial); expect((e as Denial).evidence).toMatchObject({ phase: 'proxy', httpStatus: 403, tokenId: 'unit-token', enforcement: { action: 'block' } }); }
  });
  it('separates token-stage SDK denial from proxy denial', async () => { sdk.getIntentToken.mockRejectedValue(new PolicyBlockedException('Unit token denial', 'block', 'unit')); try { await new ArmorGateway().invoke('Test marker', 'perform_restricted_test_action', {}, vi.fn()); } catch (e) { expect((e as Denial).evidence.phase).toBe('token'); } expect(sdk.invoke).not.toHaveBeenCalled(); });
  it.each(['InvalidTokenException', 'PolicyHoldException', 'MCPInvocationException', 'PolicyBlockedException'])('does not infer denial from bare error name %s', async name => { sdk.invoke.mockRejectedValue(Object.assign(new Error('Unit technical failure'), { name })); await expect(new ArmorGateway().invoke('Read issue', 'read_test_issue', {}, vi.fn())).rejects.not.toBeInstanceOf(Denial); });
  it('rejects tool error payloads even with SDK verification', async () => { sdk.invoke.mockResolvedValue({ status: 'error', verified: true }); await expect(new ArmorGateway().invoke('Read issue', 'read_test_issue', {}, vi.fn())).rejects.toThrow('verified success'); });
});
