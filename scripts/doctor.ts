import 'dotenv/config';
import { ArmorIQClient } from '@armoriq/sdk';
import { installRedactedLogging } from '../src/logging.js';
import { redact, dataDir } from '../src/config.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
installRedactedLogging();
if (!process.env.ARMORIQ_API_KEY) { console.error('Missing ARMORIQ_API_KEY; no platform request sent'); process.exit(2); }
const client = new ArmorIQClient({ apiKey: process.env.ARMORIQ_API_KEY, userId: process.env.ARMORIQ_USER_ID || 'reposentry-service', agentId: process.env.ARMORIQ_AGENT_ID || 'reposentry-agent', timeout: 15000 });
try {
  const bootstrap = await client.bootstrap();
  const safe = redact(bootstrap);
  await mkdir(dataDir, { recursive: true });
  await writeFile(join(dataDir, 'platform-bootstrap.json'), JSON.stringify(safe, null, 2));
  console.log('Platform bootstrap completed:', safe);
  if (process.env.ARMORIQ_USER_EMAIL) { const identity = redact(await client.resolveUser(process.env.ARMORIQ_USER_EMAIL)); await writeFile(join(dataDir, 'platform-identity.json'), JSON.stringify(identity, null, 2)); console.log('Platform identity resolved:', identity); }
} catch (error) { console.error('Platform bootstrap failed:', error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
