import { ArmorIQClient, PolicyBlockedException } from '@armoriq/sdk';
import type { Action } from './contracts.js';
import { redact, modelConfig } from './config.js';
export class Denial extends Error { constructor(public evidence: Record<string, unknown>) { super('ArmorIQ returned structured policy denial'); } }
export interface Gateway { invoke(request: string, action: Action, params: Record<string, unknown>, event: (stage: string, detail: string) => void): Promise<Record<string, unknown>> }
export class ArmorGateway implements Gateway {
  private client: ArmorIQClient;
  constructor() {
    // 0.6.10 implementation supports maxRetries but omits it from SDKConfig.
    const options = { apiKey: process.env.ARMORIQ_API_KEY, userId: process.env.ARMORIQ_USER_ID, agentId: process.env.ARMORIQ_AGENT_ID, timeout: 30000, maxRetries: 0, mcpCredentials: { [process.env.ARMORIQ_MCP_NAME!]: { authType: 'bearer' as const, token: process.env.MCP_TRANSPORT_SECRET! } } };
    this.client = new ArmorIQClient(options);
  }
  async invoke(request: string, action: Action, params: Record<string, unknown>, event: (stage: string, detail: string) => void) {
    const mcp = process.env.ARMORIQ_MCP_NAME!;
    let phase = 'token';
    let tokenEvidence: Record<string, unknown> = {};
    try {
      const plan = this.client.capturePlan(modelConfig().model!, request, { goal: request, steps: [{ action, mcp, params }] });
      event('intent', 'Exact selected tool and arguments captured by official SDK');
      const token = await this.client.getIntentToken(plan, undefined, 300);
      tokenEvidence = { tokenId: token.tokenId, planId: token.planId, planHash: token.planHash, expiresAt: token.expiresAt };
      event('token', 'ArmorIQ intent token issued'); phase = 'proxy';
      // invoke is the documented proxy enforcement method. invokeWithPolicy adds
      // _policy_context to arguments, conflicting with the strict MCP envelope.
      const result = await this.client.invoke(mcp, action, token, params, undefined, process.env.ARMORIQ_USER_EMAIL || undefined);
      if (result.status !== 'success' || result.verified !== true) throw new Error('ArmorIQ/MCP response did not confirm verified success');
      return redact({ phase, ...tokenEvidence, sdkResult: result }) as Record<string, unknown>;
    } catch (error) {
      const e = error as Error & { response?: { status?: number; data?: { enforcement?: Record<string, unknown> } } };
      const enforcement = e.response?.data?.enforcement;
      if ((error instanceof PolicyBlockedException && error.enforcementAction === 'block') || (e.name === 'PolicyBlockedException' && enforcement?.action === 'block')) {
        const typed = error instanceof PolicyBlockedException ? { action: error.enforcementAction, reason: error.reason, matchedPolicy: error.matchedPolicy, metadata: error.metadata } : enforcement;
        throw new Denial(redact({ source: 'ArmorIQ SDK/platform', phase, ...tokenEvidence, httpStatus: e.response?.status, enforcement: typed }) as Record<string, unknown>);
      }
      throw error;
    }
  }
}
