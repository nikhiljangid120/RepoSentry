import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { demoRequests } from '../src/demo-requests.js';
import { redact } from '../src/config.js';
import { installRedactedLogging } from '../src/logging.js';
import type { Run } from '../src/contracts.js';
installRedactedLogging();
const url = new URL(process.argv[2] || 'https://reposentry-8c31.onrender.com');
assert.equal(url.protocol, 'https:'); const origin = url.origin;
const healthResponse = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(90000) }); assert(healthResponse.ok);
const health = await healthResponse.json(); assert.equal(health.ready, true, 'Hosted inference must be configured before live tests'); assert.equal(health.mode, 'hosted');
async function run(request: string): Promise<Run> {
  const response = await fetch(`${origin}/api/runs`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'X-RepoSentry-Request': '1' }, body: JSON.stringify({ request }), signal: AbortSignal.timeout(120000) });
  assert(response.ok, `Hosted request failed with HTTP ${response.status}`); return await response.json();
}
const allowed = await run(demoRequests.read); console.log(`Hosted allowed case: ${allowed.status}`);
const denied = await run(demoRequests.blocked); console.log(`Hosted restricted case: ${denied.status}`);
const proof = redact({ kind: 'genuine-hosted-acceptance', origin, checkedAt: new Date().toISOString(), scope: 'Actual public app runs. Receipt and marker checks performed on the deployed shared host; this export is not a platform signature.', allowed, denied });
await mkdir('.reposentry', { recursive: true }); await writeFile('.reposentry/hosted-acceptance.json', JSON.stringify(proof, null, 2));
assert.equal(allowed.status, 'allowed_executed');
const read = allowed.calls.find(c => c.action === 'read_test_issue'); assert(read && read.policy === 'allowed' && read.execution === 'executed');
const receipt = read.evidence.receipt as { runId: string; action: string; inputHash: string }; assert.equal(receipt.runId, allowed.id); assert.equal(receipt.action, 'read_test_issue');
assert.equal(receipt.inputHash, createHash('sha256').update(JSON.stringify({ runId: allowed.id, input: { issueId: '1' } })).digest('hex'));
assert.equal(denied.status, 'denied'); const block = denied.calls.find(c => c.action === 'perform_restricted_test_action'); assert(block && block.policy === 'denied' && block.execution === 'absent');
assert.equal(block.evidence.source, 'ArmorIQ SDK/platform'); assert.equal(block.evidence.phase, 'proxy'); assert.equal(block.evidence.httpStatus, 403);
assert.equal((block.evidence.enforcement as { action: string }).action, 'block'); assert.equal(block.evidence.receiptAbsent, true); assert.equal(block.evidence.markerAbsent, true);
for (const result of [allowed, denied]) {
  const response = await fetch(`${origin}/api/runs/${result.id}/evidence`); assert(response.ok); const persisted = await response.json(); assert.equal(persisted.run.id, result.id);
  assert.equal(persisted.integrity.runHash, createHash('sha256').update(JSON.stringify(persisted.run)).digest('hex'));
}
await mkdir('docs/evidence', { recursive: true }); await writeFile('docs/evidence/hosted-acceptance.json', JSON.stringify(proof, null, 2));
console.log('VERIFIED hosted allow, real ArmorIQ proxy denial, matching receipt hash, protected side-effect absence and persisted evidence exports.');
