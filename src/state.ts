import { mkdir, readFile, writeFile, access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { actions, type Action, type Run } from './contracts.js';
import { issues, files } from './fixtures.js';
import { schemas } from './contracts.js';
const idSchema = z.string().uuid();
export function paths(dir: string, id: string, action: Action) { idSchema.parse(id); z.enum(actions).parse(action); return { receipt: join(dir, 'receipts', `${id}-${action}.json`), marker: join(dir, 'markers', `${id}.txt`) }; }
export async function snapshot(dir: string, id: string, action: Action) {
  const p = paths(dir, id, action);
  let receipt: Record<string, unknown> | null = null;
  try { receipt = JSON.parse(await readFile(p.receipt, 'utf8')); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  let marker = false; try { await access(p.marker); marker = true; } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  return { receipt, marker };
}
// Called only inside the authenticated MCP transport. Unit tests exercise this boundary explicitly.
export async function executeFixture(dir: string, action: Action, raw: unknown) {
  const envelope = z.object({ runId: idSchema, input: schemas[action] }).strict().parse(raw);
  const p = paths(dir, envelope.runId, action);
  await mkdir(join(dir, 'receipts'), { recursive: true }); await mkdir(join(dir, 'markers'), { recursive: true });
  const lock = join(dir, 'receipts', `${envelope.runId}-${action}.lock`);
  try { await writeFile(lock, '', { flag: 'wx' }); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('Duplicate invocation refused; inspect prior receipt.', { cause: e }); throw e; }
  const input = envelope.input as Record<string, string>;
  let output: unknown;
  if (action === 'read_test_issue') output = issues[input.issueId as keyof typeof issues];
  else if (action === 'inspect_test_repository') output = { filename: input.filename, content: files[input.filename as keyof typeof files] };
  else { await writeFile(p.marker, 'Restricted test side effect occurred\n', { flag: 'wx' }); output = { markerCreated: true }; }
  const receipt = { runId: envelope.runId, action, executedAt: new Date().toISOString(), inputHash: createHash('sha256').update(JSON.stringify(envelope)).digest('hex'), output };
  await writeFile(p.receipt, JSON.stringify(receipt), { flag: 'wx' });
  return receipt;
}
export async function saveRun(dir: string, run: Run) { await mkdir(join(dir, 'runs'), { recursive: true }); await writeFile(join(dir, 'runs', `${idSchema.parse(run.id)}.json`), JSON.stringify(run, null, 2)); }
export async function history(dir: string): Promise<Run[]> {
  let names: string[]; try { names = await readdir(join(dir, 'runs')); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []; throw e; }
  const runs = await Promise.all(names.filter(n => /^[a-f0-9-]+\.json$/.test(n)).map(async n => JSON.parse(await readFile(join(dir, 'runs', n), 'utf8')) as Run));
  return runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 100);
}
