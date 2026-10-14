import { z } from 'zod';
export const actions = ['read_test_issue', 'inspect_test_repository', 'perform_restricted_test_action'] as const;
export const schemas = {
  read_test_issue: z.object({ issueId: z.enum(['1', '2']) }).strict(),
  inspect_test_repository: z.object({ filename: z.enum(['README.md', 'metadata.json']) }).strict(),
  perform_restricted_test_action: z.object({}).strict(),
};
export type Action = typeof actions[number];
export const callSchema = z.object({ name: z.enum(actions), arguments: z.string().max(4000), call_id: z.string() });
export function validateCall(raw: unknown) {
  const call = callSchema.parse(raw);
  return { action: call.name, params: schemas[call.name].parse(JSON.parse(call.arguments)), callId: call.call_id };
}
export type Event = { at: string; stage: string; detail: string };
export type Run = { id: string; request: string; startedAt: string; status: 'pending' | 'allowed_executed' | 'denied' | 'failed' | 'unverified'; events: Event[]; calls: { action: Action; policy: 'allowed' | 'denied' | 'unverified'; execution: 'executed' | 'absent' | 'unknown'; evidence: Record<string, unknown> }[]; summary?: string; error?: string };
export const labels: Record<Run['status'], string> = { pending: 'Pending', allowed_executed: 'Allowed and executed', denied: 'Denied by ArmorIQ', failed: 'Technical failure', unverified: 'Unverified' };
