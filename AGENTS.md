# AGENTS.md - Brolens
> Map, not manual. Deep detail lives in linked files.

## What This Is
Brolens is a Next.js CI/CD failure intelligence app that turns failed workflow logs into evidence-backed diagnoses and Failure Reproduction Packs. Source of truth: [docs/harness.md](docs/harness.md).

## Start Here
1. Read this file.
2. Read [harness/state/state.json](harness/state/state.json).
3. Read [docs/prompt.md](docs/prompt.md) Section 1 Boot Sequence.

## Commands
| purpose | command |
|---|---|
| install | `bun install` |
| dev | `bun run dev` |
| lint | `bun run lint` |
| unit test | `bun run test` |
| build | `bun run build` |
| harness self-test | `python scripts/check_harness.py && pytest tests/harness` |

## Layout
| path | purpose |
|---|---|
| `src/app` | Existing Next.js App Router root; do not create root `app/`. |
| `src/components` | Dashboard UI components. |
| `src/lib` | Demo data, analysis, Firebase, OpenAI server helpers. |
| `docs` | Problem, plan, MCP references, memory, ADRs. |
| `harness` | Agents, roles, standards, artifacts, state, logs. |
| `scripts` | Harness verification and guards. |

## Roles
| agent | role file | artifact |
|---|---|---|
| orchestrator | [harness/roles/orchestrator.md](harness/roles/orchestrator.md) | state/logs |
| po-spec | [harness/roles/po-spec.md](harness/roles/po-spec.md) | `01-spec.md` |
| designer | [harness/roles/designer.md](harness/roles/designer.md) | `02-design.md` |
| tech-lead | [harness/roles/tech-lead.md](harness/roles/tech-lead.md) | `03-plan.md` |
| test-author | [harness/roles/test-author.md](harness/roles/test-author.md) | `04-tests.md` |
| builder | [harness/roles/builder.md](harness/roles/builder.md) | `05-build.md` |
| reviewer | [harness/roles/reviewer.md](harness/roles/reviewer.md) | `06-review.md` |
| security | [harness/roles/security.md](harness/roles/security.md) | `06b-security.md` |
| qa | [harness/roles/qa.md](harness/roles/qa.md) | `07-qa.md` |
| scribe | [harness/roles/scribe.md](harness/roles/scribe.md) | `08-docs.md` |
| librarian | [harness/roles/librarian.md](harness/roles/librarian.md) | memory updates |

## Rules
1. Use `src/app`; never add a redundant root `app/`.
2. Evidence before explanation; cited evidence IDs only.
3. Redact secrets before UI, logs, AI, export, or persistence.
4. OpenAI keys are server-only `OPENAI_API_KEY`, never `NEXT_PUBLIC_*`.
5. Firebase browser config may be public; Admin credentials are server-only.
6. No arbitrary repo-code execution by Brolens.
7. No deploys, pushes, DB destructive actions, or wallet transactions without explicit approval.
8. Preserve black/white/orange dashboard theme and responsive UI.
9. Run deterministic gates before declaring done.
10. State lives on disk in `harness/state` and logs.

## Gates & Breakers
See [docs/prompt.md](docs/prompt.md) Section 9 and [harness/standards/definition-of-done.md](harness/standards/definition-of-done.md).

## Memory Map
Decisions: `docs/adr/`. Lessons and assumptions: `docs/memory/`. Task artifacts: `harness/artifacts/`.

## Do-Not List
Do not print secrets, weaken tests, add skipped tests, create root `app/`, deploy, or store wallet private keys/seed phrases.
