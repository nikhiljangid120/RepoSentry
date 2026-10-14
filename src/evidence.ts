import { createHash } from 'node:crypto';
import type { Run } from './contracts.js';
import { redact } from './config.js';
export function evidenceBundle(run: Run) {
  const safe = redact(run) as Run;
  return { format: 'reposentry-evidence-v1', exportedAt: new Date().toISOString(), integrity: { algorithm: 'sha256', runHash: createHash('sha256').update(JSON.stringify(safe)).digest('hex'), scope: 'run JSON only; checksum detects changes but is not a platform signature' }, platformAudit: 'Attach the real ArmorIQ audit export separately and correlate plan/token IDs.', run: safe };
}
