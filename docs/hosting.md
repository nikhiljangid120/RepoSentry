# Free hosted judge demo — prepared, not yet deployed

The hosted entrypoint serves the UI/API, authenticated MCP and custom HTTP agent on one origin and shared filesystem. This preserves independent receipt verification. Register its actual HTTPS `/mcp` and `/agent` endpoints in ArmorIQ, bind the explicit allow/block policy and rerun real acceptance against the new resources before claiming it works.

The default `npm start` remains loopback-only. `npx tsx src/hosted.ts` explicitly binds public hosting and requires PUBLIC_DEMO_ORIGIN or Render's actual RENDER_EXTERNAL_URL. API writes require the exact HTTPS Host/Origin and custom request header. Public requests are restricted to the three fixed sandbox presets and ten investigations per process. Evidence remains readable when the budget is exhausted. The model keys and transport secret stay server-side. The MCP and agent task endpoints require the private transport secret.

Render blueprint uses the Free compute plan and starts with live inference disabled. Do not add a payment method or authorize upgrades. Render Free suspends services or builds when included usage is exhausted without a payment method; with a card, some overage categories can incur charges. Account billing state must therefore be checked before deployment. No Render credentials or API keys have been transmitted yet.

Free services sleep after fifteen idle minutes and may take about one minute to start. Filesystem data is ephemeral on restart or sleep; the per-process run budget and current history reset. Publish sanitized acceptance exports separately. This is a hackathon demonstration, not production uptime or a durable audit store. Keep the service available October 17–21 and explain cold startup to judges.

Reference: https://render.com/docs/free and https://render.com/docs/deploy-node-express-app (checked October 14, 2026).
