import express from 'express';
import { resolve } from 'node:path';
import { z } from 'zod';
import { investigate } from './agent.js';
import { dataDir, readiness, redact } from './config.js';
import { history } from './state.js';
import { evidenceBundle } from './evidence.js';
import type { Run } from './contracts.js';
import { acceptanceStatus } from './acceptance.js';
type Investigator = (request: string, onProgress?: (run: Run) => void) => Promise<Run>;
export function createAgentApp(dir = dataDir, runInvestigation: Investigator = (request, onProgress) => investigate(request, { dir, onProgress })) {
  const app = express(); app.disable('x-powered-by'); app.use(express.json({ limit: '8kb' }));
  app.use('/api', (req, res, next) => {
    const host = req.get('host') || '';
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) { res.status(403).json({ error: 'Local host required' }); return; }
    if (req.method === 'POST' && (req.get('x-reposentry-request') !== '1' || (req.get('origin') && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(req.get('origin')!)))) { res.status(403).json({ error: 'Same-origin UI request required' }); return; }
    next();
  });
  app.get('/api/health', (_req, res) => { res.json(readiness()); });
  app.get('/api/acceptance', async (_req, res) => { res.json(await acceptanceStatus(dir)); });
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
    if (busy) { res.status(409).json({ error: 'An investigation is already running; wait for completion' }); return; }
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
