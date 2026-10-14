import { expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMcpApp } from '../src/mcp-app';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { snapshot } from '../src/state';
it('LOCAL MCP protocol integration — auth, discovery, schema, real fixture execution; not ArmorIQ acceptance', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'reposentry-mcp-')); const secret = 'unit-only-transport-secret-32-characters';
  const server = createMcpApp(dir, secret).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const addr = server.address(); if (!addr || typeof addr === 'string') throw new Error('Missing listen address');
  const url = new URL(`http://127.0.0.1:${addr.port}/mcp`); const client = new Client({ name: 'unit-protocol-client', version: '1' });
  try {
    const unauthorized = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); expect(unauthorized.status).toBe(401);
    await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: `Bearer ${secret}` } } }));
    expect((await client.listTools()).tools.map(t => t.name)).toHaveLength(3);
    const runId = randomUUID();
    const result = await client.callTool({ name: 'read_test_issue', arguments: { runId, input: { issueId: '1' } } }); expect(result.isError).not.toBe(true);
    expect((await snapshot(dir, runId, 'read_test_issue')).receipt).toBeTruthy();
    const bad = await client.callTool({ name: 'inspect_test_repository', arguments: { runId, input: { filename: '../../.env' } } }); expect(bad.isError).toBe(true);
    const duplicate = await client.callTool({ name: 'read_test_issue', arguments: { runId, input: { issueId: '1' } } }); expect(duplicate.isError).toBe(true);
  } finally { await client.close(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); await rm(dir, { recursive: true, force: true }); }
});
