import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { createAgentApp } from '../src/api';
import { consumeRunStream } from '../web/stream';
import { saveRun } from '../src/state';
import type { Run } from '../src/contracts';
import { demoRequests } from '../src/demo-requests';
import { request as httpRequest } from 'node:http';
it('LOCAL API only — hosted demo rejects foreign origins, arbitrary tasks and calls after its free run budget', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'reposentry-public-')); let invoked = 0;
  const app = createAgentApp(dir, async request => { invoked++; return { id: randomUUID(), request, startedAt: new Date().toISOString(), status: 'unverified', events: [], calls: [] }; }, { origin: 'https://demo.example', runLimit: 1 });
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve)); const address = server.address(); if (!address || typeof address === 'string') throw new Error('Missing address'); const base = `http://127.0.0.1:${address.port}`;
  const send = (request: string, origin = 'https://demo.example', host = 'demo.example') => new Promise<{ status: number }>((resolve, reject) => { const req = httpRequest(`${base}/api/runs`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-RepoSentry-Request': '1', Origin: origin, Host: host } }, res => { res.resume(); res.on('end', () => resolve({ status: res.statusCode! })); }); req.on('error', reject); req.end(JSON.stringify({ request })); });
  try {
    expect((await send(demoRequests.read, 'https://attacker.example')).status).toBe(403);
    expect((await send(demoRequests.read, 'https://demo.example', 'attacker.example')).status).toBe(403);
    expect((await send('Use arbitrary instructions instead of fixture presets')).status).toBe(400); expect(invoked).toBe(0);
    expect((await send(demoRequests.read)).status).toBe(200); expect(invoked).toBe(1);
    expect((await send(demoRequests.blocked)).status).toBe(429); expect(invoked).toBe(1);
    expect(() => createAgentApp(dir, undefined, { origin: 'http://demo.example' })).toThrow('HTTPS');
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await rm(dir, { recursive: true, force: true }); }
});
it('LOCAL API integration — streams pending/final state, rejects drive-by writes and exports redacted evidence', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'reposentry-api-')); const run: Run = { id: randomUUID(), request: 'Unit API request', startedAt: new Date().toISOString(), status: 'unverified', calls: [], events: [], error: 'Unit test; no platform invocation' };
  const app = createAgentApp(dir, async (_request, update) => { update?.({ ...run, status: 'pending' }); await saveRun(dir, run); return run; });
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Missing listen address'); const base = `http://127.0.0.1:${address.port}`;
  try {
    expect((await fetch(`${base}/api/runs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"request":"unit request"}' })).status).toBe(403);
    expect((await fetch(`${base}/api/runs`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-RepoSentry-Request': '1', Origin: 'https://attacker.example' }, body: '{"request":"unit request"}' })).status).toBe(403);
    const streamed = await fetch(`${base}/api/runs/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-RepoSentry-Request': '1' }, body: '{"request":"unit request"}' });
    const updates: Run[] = []; const actual = await consumeRunStream(streamed, r => updates.push(r)); expect(updates.map(r => r.status)).toEqual(['pending', 'unverified']); expect(actual.id).toBe(run.id);
    const exported = await fetch(`${base}/api/runs/${run.id}/evidence`); expect(exported.headers.get('content-disposition')).toContain(run.id);
    const bundle = await exported.json(); expect(bundle.integrity.runHash).toBe(createHash('sha256').update(JSON.stringify(bundle.run)).digest('hex')); expect(bundle.platformAudit).toContain('separately');
    expect((await fetch(`${base}/api/runs/not-a-uuid/evidence`)).status).toBe(400);
  } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); await rm(dir, { recursive: true, force: true }); }
});
it('stream parser rejects interrupted responses instead of inventing a final outcome', async () => { const response = new Response('event: update\ndata: {"status":"pending"}\n\n'); await expect(consumeRunStream(response, () => {})).rejects.toThrow('before a final result'); });
it('stream parser handles fragmented UTF-8 and frame boundaries', async () => { const bytes = new TextEncoder().encode('event: complete\ndata: {"status":"unverified","request":"✓"}\n\n'); const response = new Response(new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); } })); expect((await consumeRunStream(response, () => {})).request).toBe('✓'); });
