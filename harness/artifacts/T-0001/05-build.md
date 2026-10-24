---
status: complete
owner: builder
task: T-0001
inputs: [03-plan.md, 04-tests.md]
---
# Build

Implemented the Brolens walking skeleton:

- Replaced the starter page with a dashboard-first Brolens interface in `src/app/page.js`.
- Added animated black/white/orange UI in `src/components/BrolensDashboard.js`.
- Added seeded CI failure fixtures in `src/lib/demo-data/runs.js`.
- Added deterministic redaction, parser, classifier, evidence, fingerprint, and reproduction-pack logic in `src/lib/analysis/failureAnalysis.js`.
- Added server-only OpenAI client helper in `src/lib/ai/openai.js`.
- Added Firebase client/admin helpers and `.env.example`.
- Added Vitest tests and package scripts.
- Added Sprint 0 harness scaffold.

Checks:

- `python scripts/check_harness.py` -> pass.
- `pytest tests/harness` -> 7 passed.
- `bun run test` -> 4 passed.
- `bun run lint` -> pass.
- `bun run build` -> pass.
- HTTP check `http://127.0.0.1:3000` -> 200.
