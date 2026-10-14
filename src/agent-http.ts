import type { Express } from 'express';
import { z } from 'zod';
import { hasBearer } from './auth.js';
import { investigate } from './agent.js';
import { actions } from './contracts.js';
export function attachAgentEndpoint(app: Express, dir: string, secret: string) {
  app.get('/agent', (_req, res) => res.json({ name: 'RepoSentry', version: '0.1.0', framework: 'custom-http', description: 'Repository fixture investigation with ArmorIQ-enforced MCP tools', tools: actions, taskEndpoint: '/agent', authentication: 'Bearer' }));
  let busy = false;
  app.post('/agent', async (req, res) => {
    if (!hasBearer(req.get('authorization'), secret) && !hasBearer(`Bearer ${req.get('x-api-key') || ''}`, secret)) { res.status(401).json({ error: 'Transport authentication required' }); return; }
    const parsed = z.object({ request: z.string().trim().min(5).max(2000) }).strict().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid investigation request' }); return; }
    if (busy) { res.status(409).json({ error: 'An investigation is already running' }); return; }
    busy = true;
    try { res.json(await investigate(parsed.data.request, { dir })); } finally { busy = false; }
  });
}
