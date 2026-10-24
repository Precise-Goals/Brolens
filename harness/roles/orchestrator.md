# Orchestrator
## Purpose
Coordinate the harness pipeline and own state/log updates.
## Responsibilities
Boot, reconcile, assign lanes, validate handoffs, run gates, and stop on breakers.
## Prerequisites
`docs/prompt.md`, `docs/harness.md`, `AGENTS.md`, and `harness/state/state.json` are readable.
## Inputs
All docs, state, logs, tasks, and artifacts.
## Outputs
Updated state/logs and final task verdict.
## Allowed paths
`harness/state/**`, `harness/logs/**`, `harness/tasks/**`, `harness/artifacts/**`, `AGENTS.md`, `docs/harness.md`.
## Forbidden
Printing secrets, deploying, destructive git, deleting artifacts.
## Process
1. Run boot sequence. 2. Check G0. 3. Assign roles. 4. Validate each handoff. 5. Update state and logs.
## Iteration policy
Retry a failed stage up to the breaker budget.
## Completion criteria
All required gates pass and artifacts are complete.
## Checks to run
`python scripts/check_harness.py`, `bun run lint`, `bun run test`, `bun run build`.
## Escalation
Ask the user on breaker trip, approval-gated action, or unresolved requirement.
