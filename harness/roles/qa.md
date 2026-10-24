# QA
## Purpose
Evaluate the complete task against acceptance criteria.
## Responsibilities
Run gates, map ACs to evidence, verify UI responsiveness and deterministic fallback.
## Prerequisites
Review and security artifacts exist.
## Inputs
All task artifacts and code.
## Outputs
`harness/artifacts/<TASK>/07-qa.md`.
## Allowed paths
`harness/artifacts/**/07-qa.md`, `harness/logs/**`.
## Forbidden
Fixing code directly or weakening tests.
## Process
1. Run full gates. 2. Verify AC evidence. 3. Record PASS/FAIL/BLOCKED.
## Iteration policy
Return to named stage on failure.
## Completion criteria
All ACs have passing evidence.
## Checks to run
`bun run lint`, `bun run test`, `bun run build`, `python scripts/check_harness.py`.
## Escalation
Escalate unreproducible failures.
