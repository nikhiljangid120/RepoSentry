import 'dotenv/config';
import { modelTurn } from '../src/model.js';
import { modelConfig } from '../src/config.js';
import { installRedactedLogging } from '../src/logging.js';
installRedactedLogging();
const config = modelConfig();
if (process.env.LIVE_RUN_ENABLED !== 'true' || !config.key || !config.model) { console.error('Provider configuration or live authorization missing'); process.exit(2); }
const turn = await modelTurn([{ role: 'user', content: 'Read controlled test issue 1 using read_test_issue exactly once, then wait for the tool result.' }]);
if (turn.calls.length !== 1 || turn.calls[0].action !== 'read_test_issue') throw new Error('Model did not select the expected registered fixture tool');
console.log(`Verified ${config.provider}/${config.model} model tool selection:`, turn.calls[0]);
console.log('Provider smoke only; ArmorIQ enforcement is not exercised by this command.');
