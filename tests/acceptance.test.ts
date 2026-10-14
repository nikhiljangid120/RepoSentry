import { expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { executeFixture, paths } from '../src/state';
import { acceptanceStatus } from '../src/acceptance';
it('UNIT ONLY — recorded proof indicator requires receipts, proxy denial and an unchanged sandbox', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'reposentry-indicator-')); const allowedId = randomUUID(); const deniedId = randomUUID();
  try {
    expect((await acceptanceStatus(dir)).passed).toBe(false);
    const receipt = await executeFixture(dir, 'read_test_issue', { runId: allowedId, input: { issueId: '1' } });
    const proof = { checkedAt: new Date().toISOString(), allowed: { id: allowedId, status: 'allowed_executed', calls: [{ action: 'read_test_issue', policy: 'allowed', execution: 'executed', evidence: { receipt } }] }, denied: { id: deniedId, status: 'denied', calls: [{ action: 'perform_restricted_test_action', policy: 'denied', execution: 'absent', evidence: { source: 'ArmorIQ SDK/platform', phase: 'proxy', enforcement: { action: 'block' } } }] } };
    await writeFile(join(dir, 'live-acceptance.json'), JSON.stringify(proof)); expect((await acceptanceStatus(dir)).passed).toBe(true);
    proof.denied.calls[0].evidence.phase = 'token'; await writeFile(join(dir, 'live-acceptance.json'), JSON.stringify(proof)); expect((await acceptanceStatus(dir)).passed).toBe(false);
    proof.denied.calls[0].evidence.phase = 'proxy'; await writeFile(join(dir, 'live-acceptance.json'), JSON.stringify(proof));
    await writeFile(paths(dir, deniedId, 'perform_restricted_test_action').marker, 'Unexpected side effect'); expect((await acceptanceStatus(dir)).passed).toBe(false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
