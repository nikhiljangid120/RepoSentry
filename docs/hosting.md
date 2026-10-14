# Free hosted judge demo — live and verified

Public app: https://reposentry-8c31.onrender.com. Render service uses Free compute. The registered agent now points to its `/agent` endpoint, and MCP `reposentry-hosted` (df2539a5-3fe7-4e15-a6cb-310257305011) points to `/mcp`. Active policy b21086aa-569a-43b7-ba1a-3ef772d03ee2 explicitly allows both reads and blocks the restricted action and unlisted tools.

`npx tsx scripts/hosted-acceptance.ts` passed against the actual public API: both permitted reads executed; the restricted action was denied at the ArmorIQ proxy with absent marker/receipt. Receipt hashes and persisted evidence exports were verified. See docs/evidence/hosted-acceptance.json. This is separate from local test/CI results.

The UI offers published genuine proof after server restarts, labeled archived rather than a fresh current-server snapshot. New preset investigations still use real model/SDK/proxy calls. Original local services and temporary tunnel were stopped; local `.env` live runs are disabled because the active policy now governs the permanent hosted MCP.

The hosted entrypoint serves the UI/API, authenticated MCP and custom HTTP agent on one origin and shared filesystem. This preserves independent receipt verification. Register its actual HTTPS `/mcp` and `/agent` endpoints in ArmorIQ, bind the explicit allow/block policy and rerun real acceptance against the new resources before claiming it works.

The default `npm start` remains loopback-only. `npx tsx src/hosted.ts` explicitly binds public hosting and requires PUBLIC_DEMO_ORIGIN or Render's actual RENDER_EXTERNAL_URL. API writes require the exact HTTPS Host/Origin and custom request header. Public requests are restricted to the three fixed sandbox presets and ten investigations per process. Evidence remains readable when the budget is exhausted. The model keys and transport secret stay server-side. The MCP and agent task endpoints require the private transport secret.

Render blueprint uses the Free compute plan and initially disables live inference. Deployment and private server-side key storage were explicitly authorized. Live inference was enabled only after hosted registration and policy activation. Do not add a payment method or authorize upgrades. Render Free suspends services or builds when included usage is exhausted without a payment method; with a card, some overage categories can incur charges. Account billing state was checked before deployment.

Free services sleep after fifteen idle minutes and may take about one minute to start. Filesystem data is ephemeral on restart or sleep; the per-process run budget and current history reset. Publish sanitized acceptance exports separately. This is a hackathon demonstration, not production uptime or a durable audit store. Keep the service available October 17–21 and explain cold startup to judges.

Reference: https://render.com/docs/free and https://render.com/docs/deploy-node-express-app (checked October 14, 2026).
