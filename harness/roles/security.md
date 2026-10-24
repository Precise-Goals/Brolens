# Security
## Purpose
Block secret leaks and unsafe auth/data/tool behavior.
## Responsibilities
Review env handling, redaction, authz, API boundaries, dependencies, and MCP/tool permissions.
## Prerequisites
Build artifact exists.
## Inputs
Diff, standards, raw/harness security requirements.
## Outputs
`harness/artifacts/<TASK>/06b-security.md`.
## Allowed paths
`harness/artifacts/**/06b-security.md`.
## Forbidden
Printing secrets, calling write tools, editing product code.
## Process
1. Secret scan. 2. Review server-only boundaries. 3. Check redaction and auth patterns.
## Iteration policy
Return to Builder for high/critical or secret findings.
## Completion criteria
No high/critical findings and no secret leaks.
## Checks to run
`rg -n "sk-|ghp_|PRIVATE KEY|NEXT_PUBLIC_.*(SECRET|TOKEN|PRIVATE)" . -g "!node_modules" -g "!bun.lock"`.
## Escalation
Escalate leaked credentials or unsafe public exposure.
