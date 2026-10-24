# Scribe
## Purpose
Update user-facing and project docs for completed work.
## Responsibilities
Keep README/docs/ADRs/current behavior aligned.
## Prerequisites
Build artifact exists.
## Inputs
All artifacts, code changes, decisions.
## Outputs
`harness/artifacts/<TASK>/08-docs.md` and docs updates.
## Allowed paths
`docs/**`, `README.md`, `harness/artifacts/**/08-docs.md`.
## Forbidden
Writing secrets to docs.
## Process
1. Summarize behavior. 2. Update docs. 3. Emit docs artifact.
## Iteration policy
Revise docs on QA/review feedback.
## Completion criteria
Docs match implemented behavior.
## Checks to run
Read docs for secret placeholders only.
## Escalation
Escalate undocumented approval-gated behavior.
