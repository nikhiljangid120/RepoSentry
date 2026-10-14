import 'dotenv/config';
import { ArmorIQClient } from '@armoriq/sdk';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDir, modelConfig, redact } from '../src/config.js';
import { installRedactedLogging } from '../src/logging.js';
installRedactedLogging();
const mcp = process.env.ARMORIQ_MCP_NAME!;
const client = new ArmorIQClient({ apiKey: process.env.ARMORIQ_API_KEY, userId: process.env.ARMORIQ_USER_ID, agentId: process.env.ARMORIQ_AGENT_ID, timeout: 30000, mcpCredentials: { [mcp]: { authType: 'bearer', token: process.env.MCP_TRANSPORT_SECRET! } } });
// Passive debugging only. Published 0.6.10 declares this internal accessor.
// All execution still uses the official capture/token/invoke flow.
client._sessionInternals().httpClient.interceptors.response.use(async response => {
  if (response.config.url?.endsWith('/invoke')) {
    const safe = redact({ status: response.status, data: response.data });
    await mkdir(dataDir, { recursive: true }); await writeFile(join(dataDir, 'proxy-diagnostic.json'), JSON.stringify(safe, null, 2)); console.log('Actual proxy response:', safe);
  }
  return response;
});
const params = { runId: randomUUID(), input: { issueId: '1' } };
const plan = client.capturePlan(modelConfig().model!, 'Read the controlled test issue', { goal: 'Read controlled fixture', steps: [{ mcp, action: 'read_test_issue', params }] });
const token = await client.getIntentToken(plan, undefined, 300);
try { await client.invoke(mcp, 'read_test_issue', token, params, undefined, process.env.ARMORIQ_USER_EMAIL); } catch (e) { console.error('Diagnostic invocation:', e instanceof Error ? e.message : String(e)); process.exitCode = 1; }
