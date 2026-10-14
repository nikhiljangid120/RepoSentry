import { createAgentApp } from './api.js';
import { port } from './config.js';
import { installRedactedLogging } from './logging.js';
installRedactedLogging();
createAgentApp().listen(port(process.env.PORT, 3001), '127.0.0.1', () => console.log('RepoSentry UI/API: http://127.0.0.1:3001'));
