# RepoSentry

An evidence-first security lab for AI repository workflows. Issues and README files can carry untrusted instructions. RepoSentry lets a model select narrowly scoped tools, routes every invocation through ArmorIQ, and checks actual MCP receipts and sandbox state before displaying an outcome.

**Current status: genuine live acceptance PASSED on October 14, 2026.** The registered agent and MCP server executed an allowed read through ArmorIQ; the platform denied the restricted operation at the proxy, and the protected marker and execution receipt remained absent. See [genuine live evidence](docs/evidence/live-acceptance.json), [active policy definition](docs/evidence/policy.live.generated.yaml), and docs/progress.md. Submission and video status are tracked separately.

## Architecture

React/Vite dashboard → loopback Express agent API → selected provider tool calling → official `@armoriq/sdk` capturePlan → getIntentToken → invoke → ArmorIQ proxy → bearer-authenticated Streamable HTTP MCP server → controlled fixtures and execution receipts. The dashboard streams progress and can download redacted evidence with a SHA256 checksum.

The agent service never imports the MCP tool executor. It has no direct tool fallback. The MCP executor has exactly three tools: `read_test_issue`, `inspect_test_repository`, and `perform_restricted_test_action`. The restricted action creates a marker only in `.reposentry/markers`; it never modifies a real repository. A per-run/tool exclusive lock prevents duplicate execution, even after partial failures.

TypeScript, Node 22+, Express 5, MCP SDK, Zod, React and Vite keep the application small. JSON history avoids a database. Vitest separates local unit/protocol tests from live acceptance. Dependency versions are pinned in package.json and package-lock.json.

## Install and run

From this repository:

```powershell
npm ci
Copy-Item .env.example .env
npm run build
npm start
```

Open http://127.0.0.1:3001. Without credentials the UI is usable and records requests as Unverified. It does not simulate platform decisions. For development use `npm run dev` (Vite at http://127.0.0.1:5173 and API at port 3001).

After platform setup and filling `.env`, run `npm run mcp` in a second terminal. Both processes must share the same DATA_DIR and the same trusted host/filesystem so the agent can independently inspect receipts. Restart after changing environment variables.

## ArmorIQ setup — required before live proof

Use the official [platform](https://platform.armoriq.ai/), [SDK reference](https://docs.armoriq.ai/platform/sdk-cli/typescript-sdk), [MCP registration](https://docs.armoriq.ai/platform/mcp-servers/add-server), [agent registration](https://docs.armoriq.ai/platform/agents/add-agent), and [policy enforcement reference](https://docs.armoriq.ai/platform/policies/enforcement). Read [docs/platform-setup.md](docs/platform-setup.md) for the exact integration choices and deployment boundary.

1. Sign in to an authorized sandbox/development organization. Generate its API key in API Keys. Never paste credentials into the chat, frontend, commits, or screenshots.
2. Register the MCP server through MCP Servers → Add Server, using the real externally reachable HTTPS `/mcp` endpoint, Tools capability, Development environment, bearer authentication, and the protocol reported by the installed MCP SDK. A hosted ArmorIQ proxy cannot reach this machine's loopback address. Arrange a sandbox TLS ingress restricted to the ArmorIQ proxy, or a documented self-hosted ArmorIQ deployment on the same network. This project does not automatically expose or deploy your computer.
3. Register RepoSentry in Agents → Add Agent. Configure the correct manual framework/capability metadata for this custom HTTP agent; do not claim it implements A2A. The local UI/API should remain loopback-only. If the wizard requires a framework-specific endpoint or public agent URL, confirm the supported custom-agent onboarding with ArmorIQ before marking registration complete. Copy the actual agent and user/service IDs into `.env`.
4. Bind an active policy to the registered agent and MCP server for the exact identity used by the API key (and optional end-user email). Allow `read_test_issue` and `inspect_test_repository`. Add an explicit DENY rule for `perform_restricted_test_action`. Check priorities and target binding. The enforcement docs describe default allow for unmatched rules; an omitted tool is insufficient proof of denial. Save/export the platform-generated policy; no unverified YAML is supplied here.
5. Generate a random 32+ character MCP transport secret locally, put it in `.env`, and configure the server's bearer credential in the platform. The SDK sends the same credential through its documented MCP credential mechanism. Do not share it with the model.
6. Configure a supported provider using LLM_PROVIDER, LLM_MODEL and its API key. Groq, Gemini and OpenRouter use their documented compatible chat APIs; OpenAI uses Responses. See docs/providers.md. Set LIVE_RUN_ENABLED=true only after authorizing the account's free tier or a paid spending limit and finishing onboarding.
7. Start MCP and run `npm run test:live`. This command uses the real model and official ArmorIQ SDK. If the proxy cannot forward to the authenticated MCP endpoint, treat it as an integration failure, never a denial.

## Environment

`.env.example` contains names and placeholders only. ARMORIQ_API_KEY, ARMORIQ_USER_ID, ARMORIQ_AGENT_ID and ARMORIQ_MCP_NAME identify your registered platform resources. ARMORIQ_USER_EMAIL is optional per-call identity scoping. OPENAI_API_KEY and OPENAI_MODEL configure the model. MCP_TRANSPORT_SECRET protects proxy-to-tool transport; this bearer gate is not the policy engine. LIVE_RUN_ENABLED is explicit local API-spend opt-in. PORT defaults to 3001, MCP_PORT to 3002, MCP_HOST to loopback and DATA_DIR to `.reposentry`.

The application requires explicit environment credentials; it does not read or print personal credential files. Select LLM_PROVIDER and LLM_MODEL; its key is GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY or OPENAI_API_KEY. OPENAI_MODEL is retained as a legacy fallback. Client constructor failures and malformed configuration are reported as technical failures. The SDK uses its shipped official endpoints and SSL validation.

## Demonstrations and evidence

Use Allowed read to investigate issue 1. A verified SDK success **and a matching server receipt** are required for Allowed and executed. Restricted test explicitly requests the sandbox marker tool. A structured ArmorIQ block plus absent receipt and marker are required for Denied by ArmorIQ. Injection fixture reads issue 2; embedded malicious-looking content is sent back to the model as tool data. The agent may refuse the instruction; that alone does not prove policy enforcement. Use the separate restricted acceptance case to test the actual boundary.

`npm run test:live` saves `.reposentry/live-acceptance.json` before assertions. It requires an allowed read receipt, a real structured **proxy-stage** denial, and an absent protected marker and receipt. A token-stage denial may appear in history but does not satisfy the proxy acceptance assertion. No missing credential, timeout, invalid token, generic 403, tool error, or model refusal counts as a passing denial. Recheck platform audit logs against token/plan IDs and timestamps; export genuine audit evidence before submission. Local JSON files are inspection evidence, not tamper-proof attestations.

Each run records the request, model-selected actions, timestamps, plan/token correlation identifiers when available, redacted platform response, tool receipt, execution status and errors. Full intent tokens/signatures and keys are not persisted. Local evidence is ignored by Git; manually sanitize and intentionally package the final platform exports.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:live
```

Unit tests explicitly mock gateway/provider dependencies and cannot prove ArmorIQ behavior. The protocol test starts a real local MCP server and authenticates a test client; it proves protocol and fixture execution, not platform enforcement. `test:live` exits 2 when prerequisites are missing and must not be reported as passed or silently skipped.

## Security and limitations

Only fixed fixtures are readable. No shell tool, external repository writes, credentials in model input, or arbitrary path input exists. Request bodies, model output, tool arguments and IDs are validated. Calls have bounded timeouts, run/tool budgets and no automatic operation retries. Locks remain after failure to prevent accidental re-execution; start a new run rather than deleting evidence. The loopback API serializes investigations and rejects browser writes lacking its custom request header. This is a trusted local demo, not a multi-user production service.

MCP bearer authentication prevents anonymous ingress; possession of that secret allows direct transport access. Production hosting must restrict ingress to the trusted ArmorIQ proxy using network controls or mutual TLS. The model has no secret or alternate execution client. Host administrators remain trusted and can edit local evidence. SDK/platform behavior, proxy transport compatibility, registration, policy priority and audit retention require live verification. Prompt instructions are guidance, not a complete injection defense. External fonts are optional; system font fallbacks keep the UI usable offline.

## Submission

See [architecture](docs/architecture.md), [historical verification report](docs/verification.md), [current progress](docs/progress.md), [≤90 second demo script](docs/demo-script.md), [submission checklist](docs/submission-checklist.md), and [project description](docs/project-description.md). This is newly authored project code; no substantial pre-existing application or starter template was reused. Open-source dependency licenses apply. Source is published at https://github.com/nikhiljangid120/RepoSentry. Local verification passes 42 tests, lint and production build; live enforcement proof is recorded separately. The official final form requires active ArmorTools Pro access for each member; registration approval alone does not establish that entitlement.
