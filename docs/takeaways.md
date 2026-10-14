# Takeaways

The model's decision and actual tool execution are different boundaries. A model refusal does not prove enforcement; a generic HTTP error does not prove a policy block. RepoSentry requires structured platform denial plus independent absence of the protected side effect and execution receipt.

Two integration lessons emerged from real testing. A development tunnel expired during an overnight offline period, so connectivity needed re-registration. The proxy injected top-level IAM metadata that strict MCP JSON-RPC validation rejected; transport normalization now removes only that metadata after bearer authentication, without trusting it for authorization.

The allowed operation produced a matching MCP receipt. The restricted operation returned an actual proxy HTTP 403 with enforcement action block, and the marker and receipt remained absent. Both plan IDs appear in the platform Event Log. Its separate invocation Audit Log is currently empty, so that export is not claimed.

The permanent public deployment was separately verified: both read tools executed through ArmorIQ, the restricted action was blocked, and persisted public evidence exports matched their checksums. Clearly labeled archived proof remains available after the free service restarts. Fresh investigations are limited to fixture presets and a capped run budget.

Production work would use durable hosting, ingress restricted to the ArmorIQ proxy, independently protected evidence storage and reliable platform audit retention. The current app is a controlled fixture lab on a trusted host. It establishes one tested allow/block boundary, not universal resistance to prompt injection.
