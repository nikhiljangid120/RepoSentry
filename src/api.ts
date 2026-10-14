import express from 'express';
import { resolve } from 'node:path';
import { z } from 'zod';
import { investigate } from './agent.js';
import { dataDir, readiness, redact } from './config.js';
import { history } from './state.js';
import { evidenceBundle } from './evidence.js';
import type { Run } from './contracts.js';
import { acceptanceStatus } from './acceptance.js';
import { demoRequests } from './demo-requests.js';
import { readFile } from 'node:fs/promises';
type Investigator = (request: string, onProgress?: (run: Run) => void) => Promise<Run>;
export function createAgentApp(dir = dataDir, runInvestigation: Investigator = (request, onProgress) => investigate(request, { dir, onProgress }), publicOptions?: { origin: string; runLimit?: number }) {
  const origin = publicOptions ? new URL(publicOptions.origin) : undefined;
  if (origin && (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash)) throw new Error('Public demo requires an exact HTTPS origin');
  const runLimit = z.number().int().min(1).max(20).parse(publicOptions?.runLimit ?? 10); let runsStarted = 0;
  const app = express(); app.disable('x-powered-by'); app.use(express.json({ limit: '8kb' }));
  app.use('/api', (req, res, next) => {
    const host = req.get('host') || '';
    if (origin ? host !== origin.host : !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) { res.status(403).json({ error: 'Configured host required' }); return; }
    if (req.method === 'POST' && (req.get('x-reposentry-request') !== '1' || (origin ? req.get('origin') !== origin.origin : req.get('origin') && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(req.get('origin')!)))) { res.status(403).json({ error: 'Same-origin UI request required' }); return; }
    next();
  });
  app.get('/api/health', (_req, res) => { res.json({ ...readiness(), mode: origin ? 'hosted' : 'local', publicRunLimit: origin ? runLimit : undefined }); });
  app.get('/api/acceptance', async (_req, res) => { res.json(await acceptanceStatus(dir)); });
  app.get('/api/published-proof', async (_req, res) => {
    for (const filename of ['hosted-acceptance.json', 'live-acceptance.json']) {
      try {
        const proof = JSON.parse(await readFile(resolve('docs/evidence', filename), 'utf8'));
        const blocked = proof.denied?.calls?.find((c: { action: string }) => c.action === 'perform_restricted_test_action');
        if (proof.allowed?.status !== 'allowed_executed' || proof.denied?.status !== 'denied' || blocked?.evidence?.phase !== 'proxy' || blocked?.evidence?.enforcement?.action !== 'block' || blocked?.evidence?.markerAbsent !== true || blocked?.evidence?.receiptAbsent !== true) continue;
        res.setHeader('Content-Disposition', 'attachment; filename="reposentry-published-proof.json"'); res.json(redact(proof)); return;
      } catch { /* No published proof is different from a fresh server acceptance pass. */ }
    }
    res.json(null);
  });
  app.get('/api/runs', async (_req, res) => { res.json(await history(dir)); });
  app.get('/api/runs/:id/evidence', async (req, res) => {
    if (!z.string().uuid().safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid run ID' }); return; }
    const run = (await history(dir)).find(r => r.id === req.params.id);
    if (!run) { res.status(404).json({ error: 'Run not found in recent history' }); return; }
    res.setHeader('Content-Disposition', `attachment; filename="reposentry-${run.id}.json"`);
    res.json(evidenceBundle(run));
  });
  let busy = false;
  app.post(['/api/runs', '/api/runs/stream'], async (req, res) => {
    const parsed = z.object({ request: z.string().trim().min(5).max(2000) }).strict().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Request must contain 5–2000 characters' }); return; }
    if (origin && !Object.values(demoRequests).includes(parsed.data.request)) { res.status(400).json({ error: 'Public demo accepts only the three preset fixture investigations' }); return; }
    if (busy) { res.status(409).json({ error: 'An investigation is already running; wait for completion' }); return; }
    if (origin && runsStarted >= runLimit) { res.status(429).json({ error: 'Free demo run budget reached; recorded evidence remains available' }); return; }
    if (origin) runsStarted++;
    busy = true;
    const streaming = req.path.endsWith('/stream'); let disconnected = false;
    res.on('close', () => { disconnected = true; });
    if (streaming) { res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('X-Accel-Buffering', 'no'); res.flushHeaders(); }
    const send = (event: string, value: unknown) => { if (!disconnected && !res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(redact(value))}\n\n`); };
    try {
      const run = await runInvestigation(parsed.data.request, streaming ? update => send('update', update) : undefined);
      if (!disconnected) { if (streaming) { send('complete', run); res.end(); } else res.json(run); }
    } catch (e) { if (streaming) { send('error', { error: 'Investigation outcome could not be persisted; inspect history before retrying.' }); res.end(); } else throw e; }
    finally { busy = false; }
  });
  app.use(express.static(resolve('dist')));
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(500).json({ error: err.name === 'SyntaxError' ? 'Malformed JSON' : 'Internal service error; outcome unverified' }); });
  return app;
}
