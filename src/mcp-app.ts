import express from 'express';
import { hasBearer } from './auth.js';
import { attachAgentEndpoint } from './agent-http.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { actions, schemas } from './contracts.js';
import { executeFixture } from './state.js';
export function createMcpApp(dir: string, secret: string) {
  if (secret.length < 32) throw new Error('MCP_TRANSPORT_SECRET must have at least 32 characters');
  const app = express(); app.disable('x-powered-by'); app.use(express.json({ limit: '16kb' }));
  attachAgentEndpoint(app, dir, secret);
  app.post('/mcp', async (req, res) => {
    if (!hasBearer(req.get('authorization'), secret)) { res.status(401).json({ error: 'Transport authentication required' }); return; }
    // Bearer key is proxy transport authentication, not a substitute for ArmorIQ policy.
    const server = new McpServer({ name: 'reposentry-mcp', version: '0.1.0' });
    for (const action of actions) server.registerTool(action, { description: action === 'perform_restricted_test_action' ? 'Restricted sandbox marker operation; policy must explicitly deny this tool.' : 'Read controlled repository fixture.', inputSchema: z.object({ runId: z.string().uuid(), input: schemas[action] }).strict() }, async args => {
      const result = await executeFixture(dir, action, args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { void transport.close(); void server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  app.all('/mcp', (_req, res) => { res.status(405).end(); });
  return app;
}
