# Improvement.md — Brolens Enhancement Tracker

> AGY-native · Claude Sonnet 4.6 (thinking) → Gemini 2.0 Flash High migration path · 2026-10-24

---

## Quick Summary

Brolens is a CI/CD failure intelligence web app that converts failed GitHub Actions pipeline runs into evidence-backed diagnoses and structured Failure Reproduction Packs. The project was originally scaffolded under an OpenAI Codex CLI harness and has been migrated to the Google Antigravity (AGY) multi-agent runtime, unlocking parallel subagent execution, branched workspaces, and MCP tool composability. Sprint 1 (T-0001 through T-0004) targets a polished offline demo using a liquid-glass dashboard UI, deterministic log analysis, and seeded fixture data — without any live GitHub dependency — before expanding to AI diagnosis (Sprint 2) and GitHub + Solana integrations (Sprint 3).

---

## 1. Agent Runtime Upgrade (Codex → AGY)

### What Changed

| Dimension | Previous (Codex CLI) | Current (Google AGY) |
|---|---|---|
| Orchestration | Single-threaded, sequential | Parallel subagents with branched workspaces |
| Model (planning) | GPT-4o / Codex | Claude Sonnet 4.6 with thinking mode |
| Model (code gen) | Codex edit model | Claude Sonnet 4.6 standard |
| Model (future target) | — | Gemini 2.0 Flash High (cost-optimal at scale) |
| Context continuity | In-process session | Disk-first: `harness/state/state.json`, logs, artifacts |
| Tool surface | Shell + file ops | Shell + file ops + 15 MCP servers (tiered) |
| Workspace isolation | None | Branched workspace per lane (UI, harness, curator) |
| State recovery | Manual | Boot sequence re-derives from `AGENTS.md` + `state.json` |

### AGY Harness Enhancements

- **Parallel lanes**: UI lane (designer → builder → QA) and harness lane (orchestrator → scribe → librarian) run concurrently without merge conflicts via branched workspaces
- **MCP server mesh**: 15 catalogued servers tiered by role (`fullstack-web` preset active — context7, github, semgrep, playwright, chrome-devtools, shadcn, magicui, next-devtools)
- **Skills system**: AGY customization skills can inject harness-aware context into any subagent without repeating the boot sequence
- **Work.md monitoring**: Orchestrator writes a `Work.md` surface for in-session progress so any restarted subagent can resume mid-task without context loss
- **Circuit breakers**: `harness/state/state.json` carries `breaker.tripped` — any gate failure parks the session and reports rather than silently retrying
- **Artifact auto-config**: When a task file is created, `harness/artifacts/<TASK-ID>/` is scaffolded with skeleton files `01-spec.md … 08-docs.md`, each with front-matter `status: pending, owner: <role>`
- **Reconcile idempotency**: Boot step 1A converges the repo to the desired harness manifest on every session, detecting MISSING / UNCONFIGURED / STALE / DRIFTED files
- **Guard paths**: `scripts/guard_paths.py` enforces per-role write allow-lists; violations are blocked, not warned
- **Session log**: `harness/logs/session.log.md` records every session entry with timestamp, mode, task, and reconcile summary

### Model Migration Path

```
Current:  Claude Sonnet 4.6 (thinking) for planning + spec
          Claude Sonnet 4.6 (standard) for code gen and docs
Target:   Gemini 2.0 Flash High for all non-planning tasks
          (lower cost per token at high parallelism)
Trigger:  After Sprint 2 gates pass; validate with harness self-test
```

---

## 2. UI/UX Overhaul — Liquid Glass Design System

### From → To

| Aspect | Before (Starter) | After (Liquid Glass) |
|---|---|---|
| Layout | Next.js default starter page | Bento grid with collapsible sidebar + hero metric panel |
| Background | Plain white or default gray | Paper white `#ffffff` with warm orange accent gradient underlayer |
| Widgets | None | Glassmorphism cards: `bg-opacity-65`, `backdrop-blur(24px)`, `1px solid rgba(255,255,255,0.4)` |
| Typography | Default | Ink black `#17191c` for data readouts; tabular numerals for metrics |
| Navigation | None | Floating icon sidebar with Lucide React icons, icon-nudge hover micro-interaction |
| Animations | None | Framer Motion spring physics; slot-machine counters; liquid-expand card morphing |
| Responsiveness | None | Fluid Bento grid; stable sidebar/table/counter dimensions at desktop + tablet + mobile |
| Data display | None | Bento metric tiles, twin analytical tracking cards, real-time activity stream |

### Design Tokens

```css
/* Color palette */
--color-bg-base:        #ffffff;                        /* paper white */
--color-text-primary:   #17191c;                        /* ink black */
--color-accent-orange:  #f97316;                        /* orange-500 */
--color-accent-glow:    rgba(249, 115, 22, 0.35);       /* orange glow halo */
--color-glass-bg:       rgba(255, 255, 255, 0.65);      /* widget fill */
--color-glass-border:   rgba(255, 255, 255, 0.4);       /* 1px border */
--color-glass-inner:    rgba(255, 255, 255, 0.15);      /* top-left reflection */

/* Glass effect */
--glass-blur:           24px;
--glass-opacity:        0.65;
--glass-border-width:   1px;

/* Motion — high-spring, low-friction physics */
--spring-mass:          0.6;
--spring-stiffness:     120;
--spring-damping:       14;

/* Sizing */
--sidebar-width:        240px;
--sidebar-collapsed:    64px;
```

### Component Inventory

| Component | Path (planned) | Purpose |
|---|---|---|
| `DashboardShell` | `src/components/layout/DashboardShell.jsx` | Root layout: sidebar + main content area |
| `CollapsibleSidebar` | `src/components/layout/CollapsibleSidebar.jsx` | Floating icon nav with Lucide icons; collapses to icon-only |
| `BentoGrid` | `src/components/dashboard/BentoGrid.jsx` | Dynamic flex/grid container for metric tiles and cards |
| `MetricTile` | `src/components/dashboard/MetricTile.jsx` | Glass widget with slot-machine counter for a single KPI |
| `RunCard` | `src/components/dashboard/RunCard.jsx` | Summary card for a recent failed run; liquid-expands to detail |
| `ActivityStream` | `src/components/dashboard/ActivityStream.jsx` | Real-time (demo-seeded) event feed |
| `AnalyticsCard` | `src/components/dashboard/AnalyticsCard.jsx` | Twin analytical tracking cards for category trends |
| `RunDetailView` | `src/components/runs/RunDetailView.jsx` | Full run detail: evidence timeline, log excerpt, diagnosis |
| `ReproductionPack` | `src/components/runs/ReproductionPack.jsx` | Structured Failure Reproduction Pack with commands + caveats |
| `EvidenceBlock` | `src/components/runs/EvidenceBlock.jsx` | Highlighted log excerpt with evidence ID citation |
| `DemoLabel` | `src/components/ui/DemoLabel.jsx` | Pill badge that marks seeded/estimated data throughout UI |
| `SlotCounter` | `src/components/ui/SlotCounter.jsx` | Reusable rolling slot-machine number animation |

### Animation Spec

| Interaction | Framer Motion Config | Notes |
|---|---|---|
| Spring default | `{ type: "spring", mass: 0.6, stiffness: 120, damping: 14 }` | Applied to all card / counter transitions |
| Slot-machine counter | `useSpring` on numeric value; digit columns animate independently | Scales up on value update; eases back to 1x |
| Icon nudge (hover) | `whileHover: { y: -2, scale: 1.08 }` | Sidebar and button icons |
| Input ring glow | `whileFocus: { boxShadow: "0 0 0 3px var(--color-accent-glow)" }` | Scale-in on focus |
| Card liquid-expand | `AnimatePresence` + `layout` prop; height animates from summary to table | Never exceeds 600 ms |
| Sidebar collapse | Width animates between `240px` and `64px` with icon label fade | Spring physics |
| Reduced motion | All animations respect `prefers-reduced-motion: reduce` via `useReducedMotion()` | Required for a11y |

---

## 3. Firebase Integration Status

### Browser Config (Configured ✅)

The following `NEXT_PUBLIC_*` variables are set in `.env` and safe to expose client-side:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Identifies the Firebase project for client SDK |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | OAuth redirect domain for Google sign-in |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project identifier |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket (future file uploads) |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App identifier |

> [!NOTE]
> These are **not secrets**. Firebase browser config is intentionally public — security is enforced by Firebase Auth Rules, not by hiding these values. Do not confuse them with server credentials.

### Server/Admin (Pending ⏳)

Firebase Admin SDK credentials are required for server-side ID-token verification (`REQ-005`). These are **server-only** and must never be in `NEXT_PUBLIC_*` or client bundles.

Pending tasks:
- [ ] Obtain `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` from Firebase console → Service Accounts
- [ ] Add to `.env` (unprefixed, server-only)
- [ ] Implement `src/lib/firebase/admin.js` with token verification helper
- [ ] Create protected route handler pattern in `src/app/api/` that calls `verifyIdToken()`
- [ ] Unit test: unauthenticated request returns 401; authorized user without workspace access returns 403

### Auth Flow (Planned 🔲)

Sprint 1 (T-0005) implementation plan:

```
User → src/app/(auth)/sign-in/page.jsx
     → Firebase client SDK: signInWithEmailAndPassword | signInWithPopup(GoogleAuthProvider)
     → Firebase returns ID token
     → Client includes token in Authorization header
     → Next.js Route Handler → Firebase Admin verifyIdToken()
     → Workspace membership check (in-memory for Sprint 1; DB for Sprint 2)
     → 200 with session / 401 / 403
```

---

## 4. OpenAI API Integration

### Status: Key Configured ✅

`OPENAI_API_KEY` is set in `.env` as a server-only variable. It is **never** exposed via `NEXT_PUBLIC_*` or bundled client-side (enforced by AGY Rule 4 + `REQ-006`).

### AI Diagnosis Pipeline (Sprint 2 🔲)

Planned implementation: `src/lib/analysis/ai-diagnosis.js`

```
Evidence Packet (from deterministic parser)
  │
  ▼
[Redactor]  ← strips secret-like values before AI sees any data (REQ-017)
  │
  ▼
[Prompt builder]  ← bounded evidence only; never raw log; evidence IDs cited
  │
  ▼
[OpenAI server-side call]  ← gpt-4o or gpt-4o-mini with JSON schema output
  │
  ▼
[Schema validator]  ← validates JSON shape + that every cited evidence ID exists in packet
  │          ← if invalid → deterministic fallback kicks in (AC-012-a, AC-014-a)
  ▼
[Diagnosis output]  → UI, Reproduction Pack
```

Key design rules:
- AI output that cites an unknown evidence ID or log line is **rejected**, not shown
- Deterministic fallback always renders useful output when AI fails or is disabled (`REQ-014`)
- All AI calls are server-side only; client never sees raw API key or raw log data
- Schema output must include: `classification`, `confidence`, `observed_facts[]`, `hypotheses[]`, `evidence_ids[]`, `uncertainty_statement`

---

## 5. MCP Server Optimization

### Active Preset: `fullstack-web`

Active servers for Brolens (derived from `harness/profile.yaml` + `docs/Mcp.md`):

| Server | Tier | Purpose | Status |
|---|---|---|---|
| `context7` | core | Version-specific docs for Next.js, Firebase, React — prevents hallucinated APIs | Active ✅ |
| `github` | core | PR/issue/CI check status for gates G2–G4; read-only PAT | Active ✅ |
| `semgrep` | core | SAST + secrets scan of agent-written code; runs at G1 and G3 | Active ✅ |
| `playwright` | frontend | E2E flows, ARIA snapshots, visual regression screenshots | Active ✅ |
| `chrome-devtools` | frontend | LCP/CLS/INP traces; console error source maps; performance evidence | Active ✅ |
| `shadcn` | frontend | Component registry primitives + `@react-bits` | Active ✅ |
| `magicui` | frontend | Motion/glow primitives (used sparingly — ≤2 focal areas per screen) | Active ✅ |
| `next-devtools` | framework | Route compile / runtime diagnostics for Next.js | Active ✅ |
| `sequential-thinking` | optional | Stepwise reasoning scratchpad for planning-heavy tasks | Optional |
| `linear` | ops | Incident/ticket workflow for Sprint 2+ | Deferred ⏳ |
| `sentry` | ops | Production errors and release health | Deferred ⏳ |
| `falkordb` / `falkordb-readonly` | data | Not needed — no graph DB in Brolens stack | Disabled ❌ |
| `sengra-mcp` | project | SENGRA-specific fraud tools — not applicable to Brolens | Disabled ❌ |
| `firecrawl` | intel | OSINT scraping — Sprint 3 stretch only if needed | Disabled ❌ |
| `mem0` | memory | Dev-workflow memory mirror — optional | Disabled ❌ |

> [!CAUTION]
> Never enable `falkordb` (write), `firecrawl`, or `mem0` by default. Each adds prompt-injection surface and context bloat. Enable per-lane, per-session only.

### Recommended Usage per Role

| Role | Key MCP Servers | Rationale |
|---|---|---|
| Orchestrator | `github`, `linear` (Sprint 2+), `sequential-thinking` | Gate status, ticket management, planning |
| PO-Spec | `context7` | Requirements grounded in actual library capabilities |
| Designer | `context7`, `shadcn`, `magicui`, `playwright` (inspect) | Component selection, design token grounding |
| Tech Lead | `context7`, `github` | Architecture decisions, dependency research |
| Test Author | `context7`, `playwright` | Write E2E specs grounded in real APIs |
| Builder (UI lane) | `context7`, `shadcn`, `magicui`, `playwright`, `chrome-devtools`, `semgrep` | Implement + verify UI components |
| Builder (analysis lane) | `context7`, `semgrep` | Library modules: parser, classifier, redactor, fingerprints |
| Reviewer | `context7`, `github`, `semgrep` | Code review + SAST evidence |
| Security | `context7`, `github`, `semgrep` | Secret scan, redaction audit, auth review |
| QA / Evaluator | `playwright`, `chrome-devtools`, `github`, `semgrep` | Full verification evidence for `07-qa.md` |
| Scribe | `context7`, `github`, `linear` (Sprint 2+) | Docs and changelog grounded in actual state |
| Librarian | `context7` | Memory updates, lessons, ADR recording |

### Frontend Verification Gates (Performance Targets)

| Check | Tool | Threshold |
|---|---|---|
| Functional E2E flows | `playwright` | 100% of AC flows pass |
| Accessibility | `@axe-core/playwright` + ARIA snapshot | 0 serious/critical violations; full keyboard nav |
| Visual regression | Playwright screenshots @ 375/768/1280/1920 px | No unreviewed diffs; baselines committed |
| LCP | `chrome-devtools` trace | ≤ 2.5 s (mobile throttle) |
| CLS | `chrome-devtools` trace | ≤ 0.1 |
| INP | `chrome-devtools` trace | ≤ 200 ms |
| Console cleanliness | `chrome-devtools` | 0 errors, 0 unhandled rejections |
| Bundle/route health | `next-devtools` | No compile warnings; `maxDuration` set on AI routes |
| Design-token conformance | grep/lint | 0 raw hex/px colors in components |

---

## 6. Sprint Backlog — Prioritized Improvements

### Sprint 1 (Current — UI + Demo Offline Journey)

| ID | Improvement | Req Refs | Status | Impact |
|----|-------------|----------|--------|--------|
| IMP-001 | Liquid glass UI redesign: glassmorphism widgets, orange glow system, paper-white base | REQ-002, REQ-003 | in_progress | High |
| IMP-002 | Centered Bento layout with floating icon sidebar navigation | REQ-002, REQ-003 | in_progress | High |
| IMP-003 | Slot-machine counter animations for metric tiles (Framer Motion spring physics) | REQ-003 | in_progress | Medium |
| IMP-004 | AGY harness documentation: `harness.md §18`, `Work.md`, `Improvement.md` | — | in_progress | High |
| IMP-005 | `.env` populated with real Firebase (`NEXT_PUBLIC_*`) + OpenAI keys | REQ-006 | done ✅ | High |
| IMP-006 | Seeded CI failure demo fixtures for 4 categories (test, lint, dep, secret) | REQ-007, REQ-010 | planned | High |
| IMP-007 | Deterministic log parser + evidence extractor (`src/lib/analysis/`) | REQ-010, REQ-011 | planned | High |
| IMP-008 | Failure category classifier with confidence scoring | REQ-010, REQ-011 | planned | High |
| IMP-009 | Secret redaction layer (pre-UI, pre-AI, pre-export) | REQ-017 | planned | High |
| IMP-010 | Stable fingerprinting for failure grouping (`src/lib/fingerprints/`) | REQ-015 | planned | Medium |
| IMP-011 | Failed-run detail view with evidence timeline + highlighted log excerpt | REQ-009 | planned | High |
| IMP-012 | Failure Reproduction Pack component (commands, prerequisites, caveats, next checks) | REQ-013 | planned | High |
| IMP-013 | Firebase Auth client foundation + protected workspace route pattern | REQ-004, REQ-005 | planned | High |
| IMP-014 | Unit tests: parser, classifier, redaction, fingerprints, evidence IDs (Vitest) | REQ-018 | planned | High |
| IMP-015 | Playwright smoke: dashboard → run detail → reproduction pack | REQ-018 | planned | Medium |

### Sprint 2 (AI + Auth Depth)

| ID | Improvement | Req Refs | Status | Impact |
|----|-------------|----------|--------|--------|
| IMP-020 | Firebase Admin SDK server-side token verification | REQ-005 | planned | High |
| IMP-021 | Email/password + Google sign-in auth flows | REQ-004 | planned | High |
| IMP-022 | AI diagnosis wrapper with OpenAI structured output + schema validation | REQ-012, REQ-014 | planned | High |
| IMP-023 | Evidence ID validation gate (reject AI output that cites unknown IDs) | REQ-012 | planned | High |
| IMP-024 | Deterministic fallback path when AI is disabled or fails | REQ-014 | planned | High |
| IMP-025 | Diagnosis feedback (helpful / not helpful) scoped to workspace | REQ-020 | planned | Medium |
| IMP-026 | Markdown diagnosis export (sanitized, no secrets) | REQ-020 | planned | Medium |
| IMP-027 | History view: incidents grouped by fingerprint | REQ-015 | planned | Medium |
| IMP-028 | Impact analytics polish: metric definitions + demo labels | REQ-016 | planned | Medium |
| IMP-029 | TypeScript migration for domain modules (analysis, fingerprints, redaction) | ASM-004 | planned | Medium |

### Sprint 3 (Integrations + Stretch)

| ID | Improvement | Req Refs | Status | Impact |
|----|-------------|----------|--------|--------|
| IMP-030 | Read-only GitHub Actions ingestion (webhook + REST) | REQ-019 | planned | High |
| IMP-031 | Webhook signature verification + idempotency | REQ-019 | planned | High |
| IMP-032 | Optional MetaMask Solana wallet linking (public address only) | REQ-021 | stretch | Low |
| IMP-033 | Optional Solana Devnet audit proof (salted commitment, no report content) | REQ-022 | stretch | Low |
| IMP-034 | PostgreSQL database for workspace, run, and feedback persistence | ADR-0005 | planned | High |
| IMP-035 | Model migration: Gemini 2.0 Flash High for non-planning AGY subagents | — | planned | Medium |

---

## 7. Technical Debt Register

| ID | Debt Item | Severity | Owner | Sprint Target |
|----|-----------|----------|-------|---------------|
| TD-001 | Entire app is JavaScript; TypeScript migration needed before domain logic expands (`ASM-004`) | Medium | Tech Lead | Sprint 2 |
| TD-002 | No unit tests exist yet (`bun run test` not yet configured) | High | Test Author | Sprint 1 |
| TD-003 | No Playwright E2E suite (`bun run test:e2e` not yet configured) | High | Test Author | Sprint 1 |
| TD-004 | No `bun run format` / `bun run format:check` configured | Low | Tech Lead | Sprint 0 cleanup |
| TD-005 | No `bun run typecheck` (blocked by TD-001) | Medium | Tech Lead | Sprint 2 |
| TD-006 | `harness/state/state.json` `derived_from` SHAs are `"pending"` — not linked to actual file hashes | Low | Orchestrator | Sprint 0 cleanup |
| TD-007 | This folder is not a Git repo (`ASM-007`); GitHub/CI gates are planned, not executable | Medium | User action | Before Sprint 2 |
| TD-008 | `bun.lock` present but no `bun run harness:check` CI integration | Low | Tech Lead | Sprint 0 cleanup |
| TD-009 | No `src/lib/` analysis modules exist yet — only `src/app/` starter shell | High | Builder | Sprint 1 |
| TD-010 | MCP version pins all use `@latest` — must be pinned before CI/release (mcpcheck C-05) | Medium | Tech Lead | Before Sprint 2 CI |

---

## 8. Performance Targets

| Metric | Target | Measurement Tool | Status |
|---|---|---|---|
| LCP (Largest Contentful Paint) | ≤ 2.5 s (mobile throttle) | `chrome-devtools` trace | Not yet measured |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | `chrome-devtools` trace | Not yet measured |
| INP (Interaction to Next Paint) | ≤ 200 ms | `chrome-devtools` trace | Not yet measured |
| JS bundle (initial load) | ≤ 150 kB gzipped (target) | `next-devtools` build output | Not yet measured |
| Dashboard render (demo data) | ≤ 1 s from navigation | Playwright timing | Not yet measured |
| Animation frame rate | 60 fps on desktop; ≥ 30 fps on mobile | `chrome-devtools` | Not yet measured |
| Build time (`bun run build`) | ≤ 45 s | CI timing | Not yet measured |
| Lint (`bun run lint`) | ≤ 10 s | CI timing | Not yet measured |

> [!TIP]
> Use `next-devtools` route health checks and `chrome-devtools` perf traces as evidence in `07-qa.md`. Gate G4 requires deterministic evidence — not an agent's opinion that "it feels fast."

---

## 9. Security Checklist

| Check | Status | Notes |
|---|---|---|
| `OPENAI_API_KEY` server-only (no `NEXT_PUBLIC_` prefix) | ✅ Done | Confirmed in `.env` |
| Firebase browser config in `NEXT_PUBLIC_*` only | ✅ Done | Public values; not secrets |
| Firebase Admin credentials server-only | ⏳ Pending | Admin SDK not yet implemented |
| No secrets in `docs/`, `harness/`, or committed files | ✅ Verified | MCP guide §2 audited; Sarvam key removed |
| Secret redaction before UI/AI/export (`REQ-017`) | 🔲 Planned | `src/lib/redaction/` Sprint 1 |
| Semgrep SAST scan on agent-written code (G1/G3) | 🔲 Planned | Requires `bun run test` infra |
| `bun run lint` clean | ✅ Passes | Current (starter shell) |
| `bun run build` clean | ✅ Passes | Current (starter shell) |
| Unauthenticated routes return 401 | 🔲 Planned | Firebase Admin Sprint 1 T-0005 |
| AI output evidence ID validation | 🔲 Planned | Sprint 2 IMP-023 |
| No fixture secrets in UI / AI packets / exports | 🔲 Planned | Unit tests Sprint 1 |
| CSP headers configured in `next.config.mjs` | 🔲 Planned | Sprint 1 / Sprint 2 |
| Firebase Security Rules scoped to workspace | 🔲 Planned | Sprint 2 |
| MCP `@latest` → pinned versions before CI | 🔲 Planned | Sprint 0 cleanup (TD-010) |
| Supply-chain audit (`npm audit --omit=dev`) | 🔲 Planned | G3 gate Sprint 2 |
| No wallet private keys / seed phrases in any path | ✅ By design | Stretch only; never held by agent |
| No AI prompt with raw unredacted log data | 🔲 Planned | Redactor runs before AI call |

---

## 10. Definition of Done (Task-Level)

Derived from `docs/harness.md §16` + AGY-specific additions:

### Global DoD (every implementation task)

- [ ] Required task artifacts exist under `harness/artifacts/<TASK-ID>/` (all stages 01–08)
- [ ] Acceptance criteria mapped to the task have automated tests or recorded manual evidence
- [ ] `bun run lint` passes (zero errors, zero warnings on changed files)
- [ ] `bun run build` passes (no type errors, no compile warnings on changed routes)
- [ ] Unit tests pass (`bun run test`) — once Vitest is configured (Sprint 1)
- [ ] Playwright smoke passes (`bun run test:e2e`) — once configured (Sprint 1)
- [ ] No new secrets, private keys, seed phrases, tokens, raw logs, or server credentials in client bundles, docs, logs, or exports
- [ ] UI verified at desktop (1280 px) + tablet (768 px) + mobile (375 px): no overlaps, no unreadable cards
- [ ] Facts, hypotheses, confidence, and uncertainty are visibly separated in the UI
- [ ] No skipped or disabled tests were added to make gates pass
- [ ] Reviewer `06-review.md` reports zero blocker/major issues
- [ ] Security `06b-security.md` reports zero high/critical findings
- [ ] `harness/state/state.json` updated; `harness/logs/session.log.md` appended

### AGY-Specific DoD Additions

- [ ] Subagent lane work committed to its branched workspace and merged cleanly
- [ ] `Work.md` in-session progress file updated at task close
- [ ] MCP tool evidence (screenshots, traces, SAST results) attached to `07-qa.md`
- [ ] No gate passed solely on agent assertion — all gates have deterministic evidence
- [ ] Circuit breaker (`breaker.tripped`) is `false` at task close
- [ ] Artifact skeletons for the next task created if sprint planning advances

### Task-Specific MVP DoD

- [ ] A seeded failed run opens from the dashboard without a network connection
- [ ] The parser highlights the relevant error block in the correct job/step
- [ ] The diagnosis cites real evidence IDs or log line ranges (no invented references)
- [ ] The Failure Reproduction Pack shows: prerequisites, suggested commands, caveats, next checks, uncertainty, timestamp, and analyzer version
- [ ] All four baseline categories have passing fixture unit tests
- [ ] AI failure (or AI disabled) still leaves useful deterministic output rendered in the UI
- [ ] No fixture secret is visible in UI, logs, AI prompt, or export

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-10-24 | Initial `Improvement.md` created by AGY scribe/librarian subagent | AGY/Scribe |
| 2026-10-24 | `.env` populated with real Firebase (`NEXT_PUBLIC_*`) + `OPENAI_API_KEY` | AGY/Orchestrator |
| 2026-10-24 | UI redesign to liquid glass + orange glow system (Dashboardui.md spec) | AGY/Designer+Builder |
| 2026-10-24 | `harness.md §18` + `Work.md` created for AGY subagent session continuity | AGY/Scribe |
| 2026-10-24 | AGY runtime takeover: Codex → AGY parallel subagents, branched workspaces | AGY/Orchestrator |
| 2026-10-24 | Harness scaffold completed (state, roles, agents, standards, tools, logs) | AGY/Orchestrator |
| 2026-10-24 | Sprint 1 task T-0001 all stages (curation→qa→docs) marked done in state.json | AGY/Orchestrator |
