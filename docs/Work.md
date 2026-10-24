# Work.md — AGY Subagent Operations Manual
> Brolens · Last updated: 2026-10-24 · Runtime: AGY (Antigravity)

## Purpose
This document is read by every AGY subagent at session boot. It contains:
- Active task queue and lane assignments
- Background task registry (what's running, who owns it)
- Blocking issues and escalation queue
- Continuous monitoring checklist
- Subagent communication protocol

## 1. Active Sprint
[Sprint 1 — Offline demo walking skeleton]

### Current Task: T-0001 (UI Redesign — Liquid Glass)
- Status: IN_PROGRESS
- Owner lanes: ui-lane (designer+builder), analysis-lane, auth-env-lane
- Exit gate: bun run lint && bun run build pass; visual QA desktop/mobile

## 2. Lane Registry
| Lane | Subagent Role | Workspace | Status | Files Owned |
|------|--------------|-----------|--------|-------------|
| ui-lane | designer + builder | branch | in_progress | src/app/**, src/components/** |
| analysis-lane | test-author + builder | branch | pending | src/lib/demo-data/**, src/lib/analysis/** |
| auth-env-lane | builder + security | branch | pending | src/lib/firebase/**, .env.example |
| harness-lane | orchestrator + scribe | inherit | in_progress | harness/**, docs/** |

## 3. Background Task Registry
Subagents register background tasks here. Format: task-id | description | started_at | status | owner

| Task ID | Description | Started | Status | Owner |
|---------|-------------|---------|--------|-------|
| BGT-001 | UI redesign build verification | 2026-10-24T15:20 | running | ui-lane |
| BGT-002 | Harness.md + Work.md update | 2026-10-24T15:20 | running | harness-lane |

## 4. Continuous Monitoring Checklist
Every subagent must check on wakeup:
- [ ] Read harness/state/state.json for current mode/task
- [ ] Check harness/logs/session.log.md for last session summary
- [ ] Verify bun run lint passes before writing any code
- [ ] Check harness/state/budgets.json — respect circuit breaker limits
- [ ] Update this file's Lane Registry with current status before sleeping

## 5. Escalation Queue
Issues that block progress and need user input:
(none currently)

## 6. Subagent Communication Protocol
- Parent orchestrator uses send_message(conversationId) to direct subagents
- Subagents report back via send_message to parent when task completes or blocked
- State updates go to harness/state/state.json (Orchestrator only)
- Logs append to harness/logs/events.jsonl

## 7. Model Routing
| Task Type | Model | Rationale |
|-----------|-------|-----------|
| Planning, architecture | Claude Sonnet 4.6 (thinking) | Deep reasoning |
| UI generation, code | Claude Sonnet 4.6 | Fast, creative |
| Future: all tasks | Gemini 2.0 Flash High | Cost-optimal at scale |

## 8. MCP Servers Available in AGY
| Server | Purpose | Auto-approved roles |
|--------|---------|-------------------|
| playwright | E2E tests, browser QA | qa, builder |
| shadcn | Component registry | designer, builder |
| magicuidesign-mcp | Motion/glow UI references | designer |
| next-devtools | Next.js route/build diagnostics | builder, qa |
| sequential-thinking | Complex planning chains | tech-lead, orchestrator |
| linear | Issue tracking | orchestrator, scribe |

## 9. Never-Do List (append lessons here)
- Never create root-level app/ — use src/app/
- Never put OPENAI_API_KEY in NEXT_PUBLIC_* vars
- Never print secrets in logs or UI
- Never skip/disable tests to make gates pass
- Never deploy without explicit user approval
