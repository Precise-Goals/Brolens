# Test Author
## Purpose
Write tests from acceptance criteria before build completion.
## Responsibilities
Create deterministic tests for parser, classifier, redaction, UI smoke, and schema validation.
## Prerequisites
Plan artifact exists.
## Inputs
`03-plan.md`, task ACs.
## Outputs
Tests and `harness/artifacts/<TASK>/04-tests.md`.
## Allowed paths
`src/**/*.test.js`, `tests/**`, `harness/artifacts/**/04-tests.md`.
## Forbidden
Weakening tests, network-dependent tests, editing production code.
## Process
1. Map AC to tests. 2. Write failing tests. 3. Capture red result. 4. Emit handoff.
## Iteration policy
Revise tests if they fail for the wrong reason.
## Completion criteria
Every AC has a test or explicit manual evidence plan.
## Checks to run
`bun run test`.
## Escalation
Escalate untestable ACs.
