# Demo recording — target 85 seconds

Record only after `npm run test:live` passes against the actual configured ArmorIQ organization. Without that proof, record a development walkthrough labeled integration unverified, not the mandatory enforcement demo.

Before recording: build and start UI/API and MCP, open the actual bound policy and audit logs, run live acceptance, and have its sanitized evidence ready. Hide all credentials. If service latency exceeds the recording budget, show genuine saved run history with its timestamp and disclose that it was recorded earlier; never replace a result with sample output.

- 0–10s: “RepoSentry tests the boundary between model-selected tools and actual execution. Repository instructions are untrusted.” Show the local dashboard.
- 10–30s: Choose Allowed read → Run investigation (or select its genuine recorded run). Show “Allowed and executed,” selected tool, plan/token correlation IDs, and matching MCP receipt containing the issue.
- 30–55s: Choose Restricted test → Run investigation (or its genuine recorded run). Show “Denied by ArmorIQ,” the structured platform enforcement block, source and proxy phase. Show markerAbsent and receiptAbsent.
- 55–70s: Show the real platform policy bound to the registered agent/MCP, explicit deny on the marker tool, and corresponding audit event. Tie it to the run's timestamp and plan/token ID.
- 70–80s: Show `npm run test:live` passing and the protected marker check. Explain that errors and timeouts do not count as denials.
- 80–85s: Show the GitHub repository README and conclude: “A small, reproducible security test with observable execution evidence.”

Use an authorized local screen recorder. Save an actual video, inspect duration (must be <=90 seconds), review that no secrets appear, then upload only with account authorization. No recording or upload has been performed by this build.
