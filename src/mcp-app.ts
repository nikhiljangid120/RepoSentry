import express from 'express';
import { hasBearer } from './auth.js';
import { attachAgentEndpoint } from './agent-http.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { actions, schemas } from './contracts.js';
import { executeFixture } from './state.js';
import { redact } from './config.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
export function protocolMessage(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const message: Record<string, unknown> = { ...body };
  // ArmorIQ adds this transport metadata after proxy authorization. It is not
  // part of JSON-RPC and is never used here as an authorization decision.
  delete message._iam_context;
  return message;
}
export function createMcpApp(dir: string, secret: string) {
  if (secret.length < 32) throw new Error('MCP_TRANSPORT_SECRET must have at least 32 characters');
  const app = express(); app.disable('x-powered-by'); app.use(express.json({ limit: '16kb' }));
  attachAgentEndpoint(app, dir, secret);
  app.post('/mcp', async (req, res) => {
    if (!hasBearer(req.get('authorization'), secret)) { res.status(401).json({ error: 'Transport authentication required' }); return; }
    if (process.env.MCP_DIAGNOSTICS === 'true') { await mkdir(dir, { recursive: true }); await writeFile(join(dir, 'mcp-last-request.json'), JSON.stringify(redact({ contentType: req.get('content-type'), accept: req.get('accept'), body: req.body }), null, 2)); }
    // Bearer key is proxy transport authentication, not a substitute for ArmorIQ policy.
    const server = new McpServer({ name: 'reposentry-mcp', version: '0.1.0' });
    for (const action of actions) server.registerTool(action, { description: action === 'perform_restricted_test_action' ? 'Restricted sandbox marker operation; policy must explicitly deny this tool.' : 'Read controlled repository fixture.', inputSchema: z.object({ runId: z.string().uuid(), input: schemas[action] }).strict() }, async args => {
      const result = await executeFixture(dir, action, args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { void transport.close(); void server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, protocolMessage(req.body));
  });
  app.all('/mcp', (_req, res) => { res.status(405).end(); });
  return app;
}
