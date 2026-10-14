# Project description

RepoSentry is a reproducible security-testing agent for AI repository workflows. A model investigates controlled issues and chooses narrowly scoped MCP tools. Tool calls pass through ArmorIQ intent and policy enforcement, while execution receipts and sandbox marker checks distinguish authorized execution, genuine policy denial, and technical failure. Benign prompt-injection fixtures show why repository content cannot be trusted as instructions. The dashboard exposes tool timelines and redacted evidence instead of relying on the agent's claims.

Live ArmorIQ acceptance passed on October 14, 2026: a permitted fixture read executed through the proxy, an explicitly prohibited marker action was denied, and its protected side effect remained absent. Genuine redacted evidence and the platform-generated policy are included in the repository.
