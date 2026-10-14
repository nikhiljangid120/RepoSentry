# Platform integration notes

Documentation consulted on October 13, 2026:

- https://docs.armoriq.ai/platform/sdk-cli/quickstart
- https://docs.armoriq.ai/platform/sdk-cli/typescript-sdk
- https://docs.armoriq.ai/platform/sdk-cli/installation
- https://docs.armoriq.ai/platform/mcp-servers/add-server
- https://docs.armoriq.ai/platform/agents/add-agent
- https://docs.armoriq.ai/platform/policies/policy-builder
- https://docs.armoriq.ai/platform/policies/enforcement
- https://docs.armoriq.ai/platform/audit-logs
- https://developers.openai.com/api/docs/guides/function-calling

Installed ArmorIQ npm SDK: 0.6.10 (Node >=18); runtime here: Node 22.13.1. Its published TypeScript declarations and implementation are the concrete compatibility reference. The quickstart uses an object capturePlan argument but the installed SDK accepts `capturePlan(llm, prompt, plan, metadata?)`. `getIntentToken(plan, policy?, validitySeconds?)` takes 300 as its third argument, rather than the options object shown in parts of the documentation. Result payload is `result.result`, not `result.data`. The app preserves the full redacted SDK result.

We use the documented `invoke(mcp, action, token, params, undefined, userEmail)` proxy method. `invokeWithPolicy` in 0.6.10 appends `_policy_context` to parameters; that would violate the narrow strict tool envelope. Both route through the proxy; no local policy substitute is used. The SDK implementation recognizes explicit platform enforcement blocks; arbitrary auth failures are not blocks. The adapter conservatively accepts only explicit `enforcement.action=block` or the SDK's typed PolicyBlockedException with enforcementAction=block. It stores phase so token issuance blocks cannot be confused with tool-call proxy blocks.

The installed implementation accepts `maxRetries:0` though its SDKConfig declaration omits that field. The adapter passes a structurally compatible options object using that observed runtime option. Proxy invoke itself sends a single POST. We do not retry tool operations. On token/model/network failure the run fails; exclusive MCP locks guard accidental duplicate delivery. Timeouts are 30 seconds per network operation. A model run has at most five turns and never repeats a tool.

The hosted platform needs a real MCP URL reachable from its proxy. Default local binding is 127.0.0.1:3002, intended for local protocol QA. Set MCP_HOST only within a sandbox host protected by TLS ingress and proxy-only network controls. Keep the MCP bearer credential private; configure the actual `/mcp` route and credential in the registration wizard. Standard Streamable HTTP interoperability with the platform remains unverified until a live call succeeds. If ArmorIQ's proxy does not support this transport, use its documented supported deployment/transport after verifying with the platform; do not add a direct backend-to-MCP bypass.

Custom-agent registration details also remain unverified. This app exposes an HTTP task API, not A2A discovery. Register using manual custom-agent metadata if supported. If URL validation requires an unsupported discovery protocol, obtain the platform's correct custom-agent onboarding instructions; do not falsely select a protocol.

Policy configuration is a platform action, not performed by this build. Use the registered server's discovered tool names, correct service/user/email scope and explicit deny for the marker tool. Assign and activate the policy on the actual target. Policy docs differ on deny precedence/default behavior, so verify the deployed rule through actual acceptance and audit exports rather than relying on a prose assumption. Capture policy ID/version/priority, registered IDs and an audit export in the final evidence package. Do not include API keys or bearer secrets.
