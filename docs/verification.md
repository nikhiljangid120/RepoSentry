# Actual verification report — October 13, 2026

## VERIFIED locally

The previously empty workspace now contains a TypeScript agent API, official ArmorIQ adapter, real three-tool MCP server, controlled repository fixtures, a React dashboard, strict schemas, bearer transport authentication, duplicate execution locks, sandbox receipts/marker checks, secret redaction, JSON run history, and setup/demo/submission documentation.

Execution flow: user request → model-selected function → captured exact intent → platform token → ArmorIQ proxy invocation → authenticated MCP execution → independent receipt/state inspection → model findings and recorded evidence. The agent never calls the MCP executor directly.

Commands executed:

- Environment inspection: `git status --short`, `node --version`, `npm --version`, `python --version`; credential environment variable names and credential-file presence only. Initial workspace was empty, not a Git repository. Node 22.13.1, npm 11.12.1, Python 3.13.4.
- `npm view @armoriq/sdk version engines dist.tarball`; checked official docs and installed declarations/source. ArmorIQ 0.6.10 supports Node >=18.
- Dependency installation with exact versions. An initial dev-dependency install failed with ENETUNREACH; the retry succeeded. No credentials were generated or fabricated.
- `npm run typecheck`: passed after correcting test literal types and stylesheet declarations.
- `npm test`: **30 tests passed in 3 suites**. Unit tests explicitly mock model/SDK/gateway behavior. A real local MCP HTTP client/server test verifies transport authentication, tool discovery, input rejection, fixture execution receipt and duplicate-call rejection. These do not prove ArmorIQ platform behavior.
- `npm run lint`: passed after correcting caught-error causes and Express error-handler argument conventions.
- `npm run build`: passed. Production HTML/CSS/JS produced in dist. Initial build failed because an unrelated parent PostCSS configuration was inherited; a local empty configuration fixed it without modifying the parent.
- `npm audit --omit=dev`: returned zero vulnerabilities at verification time. This is a dependency audit result, not a security guarantee.
- `npm start`: served production dashboard. GET `/` returned HTTP 200; GET `/api/health` correctly reported missing prerequisites.
- Browser QA: actual request submission with missing credentials yielded Unverified, configuration event, history entry and no execution/policy proof. Observed desktop and mobile layouts. Genuine screenshots are in docs/screenshots and explicitly show integration unverified.
- `git init -b main`: initialized local repository. No commit, push, remote publication or history rewrite performed.

Files: src contains agent, ArmorIQ adapter, contracts, configuration/redaction, logging, model API, MCP transport/entrypoint, fixture state and API server. web contains the responsive UI. tests contains unit, mocked SDK-adapter and real local MCP protocol suites. scripts/live-acceptance.ts is the real acceptance runner. docs contains architecture, platform setup, verification, demo, submission checklist, description and actual UI screenshots. Root files configure dependencies, TypeScript, Vite, Vitest, lint, PostCSS and secret ignores.

## PARTIALLY VERIFIED

The official SDK adapter compiles against installed SDK 0.6.10. Unit tests check exact positional capture/token/invoke parameters, structured denial attribution, token versus proxy phase, rejection of generic error names and tool failures. Real network behavior, platform policies and forwarding interoperability have not been verified.

The supported OpenAI Responses API flow is implemented with registered function schemas, validated selections, returned tool results and bounded turns. Live model selection is unverified because no model key, model choice or spend authorization was available.

The sandbox tool really reads fixture data and writes receipts in local MCP tests. Absence after mocked unit denial is verified only for the unit-test boundary. This does not establish protected-marker absence after a real ArmorIQ denial.

## BLOCKED / UNVERIFIED

`npm run test:live` was executed and reported BLOCKED, exiting 2. Missing: ARMORIQ_API_KEY, ARMORIQ_USER_ID, ARMORIQ_AGENT_ID, ARMORIQ_MCP_NAME, OPENAI_API_KEY, OPENAI_MODEL, MCP_TRANSPORT_SECRET and LIVE_RUN_ENABLED=true. This is not a pass or silently skipped test.

No ArmorIQ agent/MCP registration or onboarding is confirmed. No policy was created or assigned. No genuine allowed platform invocation, proxy-stage denied invocation, audit trace/export, or real-denial side-effect absence is claimed. Hosted proxy access to the locally bound MCP and supported custom-agent registration must be resolved during authorized setup.

No GitHub repository was published and no actual demo video was recorded/uploaded. Those remain manual account-authorized submission tasks. The brief's hackathon dates and official eligibility requirements have not been verified against an organizer source.

## Continue

Use README and docs/platform-setup.md to configure authorized development resources. Fill `.env` privately, start `npm start` and `npm run mcp`, then run `npm run test:live`. Review its actual evidence and the matching platform audit export. Record the <=90-second demo using docs/demo-script.md only after acceptance passes. Publish the reviewed source and sanitized evidence using your authorized GitHub account, then complete the submission checklist.
