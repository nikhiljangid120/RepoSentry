import { createMcpApp } from './mcp-app.js';
import { dataDir, port } from './config.js';
import { installRedactedLogging } from './logging.js';
installRedactedLogging();
const host = process.env.MCP_HOST || '127.0.0.1';
createMcpApp(dataDir, process.env.MCP_TRANSPORT_SECRET || '').listen(port(process.env.MCP_PORT, 3002), host, () => console.log(`RepoSentry MCP listening on ${host}; POST /mcp`));
