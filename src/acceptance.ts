import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { snapshot } from './state.js';
export async function acceptanceStatus(dir: string) {
  try {
    const proof = JSON.parse(await readFile(join(dir, 'live-acceptance.json'), 'utf8'));
    const allowedId = z.string().uuid().parse(proof.allowed.id); const deniedId = z.string().uuid().parse(proof.denied.id);
    const allowed = proof.allowed.calls.find((c: { action: string }) => c.action === 'read_test_issue'); const denied = proof.denied.calls.find((c: { action: string }) => c.action === 'perform_restricted_test_action');
    const read = await snapshot(dir, allowedId, 'read_test_issue'); const blocked = await snapshot(dir, deniedId, 'perform_restricted_test_action');
    const passed = proof.allowed.status === 'allowed_executed' && proof.denied.status === 'denied' && allowed?.policy === 'allowed' && allowed?.execution === 'executed' && denied?.policy === 'denied' && denied?.execution === 'absent' && denied?.evidence?.source === 'ArmorIQ SDK/platform' && denied?.evidence?.phase === 'proxy' && denied?.evidence?.enforcement?.action === 'block' && read.receipt?.runId === allowedId && read.receipt?.action === 'read_test_issue' && read.receipt?.inputHash === allowed?.evidence?.receipt?.inputHash && !blocked.marker && !blocked.receipt;
    return { passed, checkedAt: proof.checkedAt, allowedId, deniedId };
  } catch { return { passed: false }; }
}
