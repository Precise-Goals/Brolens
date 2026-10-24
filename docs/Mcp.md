# MCP Configuration Reference (v2)

> Machine-consumed by the harness: the **reconcile** step in `docs/prompt.md` §1A reads this file to generate `.mcp.json`
> and `harness/tools/registry.yaml`. Architecture, policy and rationale live in `docs/mcpguide.md`.
> Verify after every edit with `docs/mcpcheck.md` Part A (checks C-01…C-21; no scripts — uses `rg` + `jq`). `ci`/`release` modes require exact version pins (C-05).

## 1. Server catalog (names are canonical — registry keys must match)

| Name | Tier | What it is for | Transport | Needs |
|---|---|---|---|---|
| `context7` | **core** | Current, version-specific library docs (Next.js, FalkorDB client, Sarvam…) — kills hallucinated APIs | stdio / HTTP | optional `CONTEXT7_API_KEY` |
| `github` | **core** | PRs, issues, CI check status for gates G2–G4 | HTTP | `GITHUB_PAT` (fine-grained, least privilege) |
| `semgrep` | **core (backend verification)** | SAST + secrets + supply-chain scan of agent-written code | stdio | `semgrep` CLI installed + `semgrep login` |
| `playwright` | frontend | Drive the app: E2E, ARIA snapshots, screenshots | stdio | Node 18+ |
| `chrome-devtools` | frontend | *Measure* the app: perf traces (LCP/CLS/INP), network, source-mapped console errors | stdio | Chrome stable |
| `shadcn` | frontend | Component registry (incl. `@react-bits`) | stdio | `components.json` |
| `magicui` | frontend | Motion / glow primitives (use sparingly — see guide §5) | stdio | — |
| `next-devtools` | framework | Route/compile/runtime diagnostics for Next.js | stdio | Next.js project |
| `falkordb` | data (write) | OpenCypher execution, **dev only** | stdio | FalkorDB reachable |
| `falkordb-readonly` | data (read) | Same server, forced `GRAPH.RO_QUERY` — **default for agents** | stdio | FalkorDB reachable |
| `sengra-mcp` | project | SENGRA's 15 fraud tools (JSON-RPC) | HTTP | dev server running on :3000 |
| `sentry` | ops | Production errors, traces, release health | HTTP (OAuth) | Sentry org access |
| `linear` | ops | Incident / compliance ticketing | HTTP (OAuth) | Linear workspace |
| `firecrawl` | intel (**untrusted input**) | OSINT scrape/search | HTTP (OAuth) | Firecrawl account |
| `mem0` | memory (**cloud, optional**) | Cross-session dev memory — never case data | HTTP | `MEM0_API_KEY` |
| `sequential-thinking` | reasoning (**optional**) | Explicit stepwise reasoning scratchpad | stdio | — |

### Presets (reconcile picks one from `harness/profile.yaml`, then adds/removes by signal)

| Preset | Servers |
|---|---|
| `minimal` | context7, github, semgrep |
| `fullstack-web` | minimal + playwright, chrome-devtools, shadcn, magicui, next-devtools |
| `graph-backend` | minimal + falkordb-readonly (+ falkordb on the Builder lane only), next-devtools |
| `sengra` (this project) | fullstack-web + graph-backend + sengra-mcp, sentry, linear |
| `sengra+intel` | sengra + firecrawl (quarantined, see guide §8) |

Do **not** enable everything by default: each server adds tool definitions to the context window of every agent that loads it.

---

## 2. `.mcp.json` (full catalog — reconcile copies the subset for the active preset)

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": { "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}" }
    },
    "github": {
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": { "Authorization": "Bearer ${GITHUB_PAT}" }
    },
    "semgrep": {
      "command": "semgrep",
      "args": ["mcp"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--headless"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--slim", "--headless", "--no-usage-statistics"]
    },
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    },
    "magicui": {
      "command": "npx",
      "args": ["-y", "@magicuidesign/mcp@latest"]
    },
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    },
    "falkordb": {
      "command": "npx",
      "args": ["-y", "@falkordb/mcpserver@latest"],
      "env": {
        "FALKORDB_HOST": "localhost",
        "FALKORDB_PORT": "6379",
        "FALKORDB_PASSWORD": "${FALKORDB_PASSWORD}",
        "FALKORDB_DEFAULT_READONLY": "false"
      }
    },
    "falkordb-readonly": {
      "command": "npx",
      "args": ["-y", "@falkordb/mcpserver@latest"],
      "env": {
        "FALKORDB_HOST": "localhost",
        "FALKORDB_PORT": "6379",
        "FALKORDB_PASSWORD": "${FALKORDB_PASSWORD}",
        "FALKORDB_DEFAULT_READONLY": "true"
      }
    },
    "sengra-mcp": {
      "url": "http://localhost:3000/api/mcp"
    },
    "sentry": {
      "url": "https://mcp.sentry.dev/mcp"
    },
    "linear": {
      "url": "https://mcp.linear.app/mcp"
    },
    "firecrawl": {
      "url": "https://mcp.firecrawl.dev/v2/mcp-oauth"
    },
    "mem0": {
      "url": "https://mcp.mem0.ai/mcp",
      "headers": { "Authorization": "Bearer ${MEM0_API_KEY}" }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

**Notes on this file**
- `@latest` is for first install and local dev only. Before CI/release run the pin procedure (§5); mcpcheck C-05 enforces it (FAIL in `ci`/`release`).
- `${VAR}` expansion works in Claude Code. If your client doesn't expand it, `export` the variable in the shell that launches the client (stdio servers inherit it) and delete the `env` entry; for HTTP servers use the client's secret/header UI. **Never paste real keys into this file.**
- **Windows:** if a stdio server fails to spawn `npx`, wrap it: `"command": "cmd", "args": ["/c", "npx", "-y", "<package>"]`. (Your v1 file hard-coded this for `sequential-thinking` only, which breaks macOS/Linux and CI.)
- `linear` uses direct remote HTTP. Only fall back to `"command": "npx", "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"]` for clients that support stdio only.
- `sengra-mcp` is reachable only while the Next.js dev server runs; agents must treat "connection refused" as "start dev server", not as a failure of the harness.
- VS Code uses the key `"servers"` (not `"mcpServers"`) in `.vscode/mcp.json`; every mcpcheck command accepts both.

---

## 3. Client setup

### Claude Code (recommended — project-scoped, committed `.mcp.json`)
```bash
# local stdio servers
claude mcp add --scope project context7 -- npx -y @upstash/context7-mcp@latest
claude mcp add --scope project semgrep -- semgrep mcp
claude mcp add --scope project playwright -- npx -y @playwright/mcp@latest --headless
claude mcp add --scope project chrome-devtools -- npx -y chrome-devtools-mcp@latest --slim --headless --no-usage-statistics
claude mcp add --scope project shadcn -- npx shadcn@latest mcp
claude mcp add --scope project magicui -- npx -y @magicuidesign/mcp@latest
claude mcp add --scope project next-devtools -- npx -y next-devtools-mcp@latest
claude mcp add --scope project falkordb-readonly -e FALKORDB_HOST=localhost -e FALKORDB_PORT=6379 -e FALKORDB_DEFAULT_READONLY=true -- npx -y @falkordb/mcpserver@latest
# remote HTTP servers (OAuth in-client where supported)
claude mcp add --scope project --transport http sentry https://mcp.sentry.dev/mcp
claude mcp add --scope project --transport http linear https://mcp.linear.app/mcp
claude mcp add --scope project --transport http github https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer $GITHUB_PAT"
claude mcp add --scope project --transport http sengra-mcp http://localhost:3000/api/mcp
# optional / quarantined
claude mcp add --scope user --transport http firecrawl https://mcp.firecrawl.dev/v2/mcp-oauth
claude mcp add --scope user --transport http mem0 https://mcp.mem0.ai/mcp --header "Authorization: Bearer $MEM0_API_KEY"
```
Use `--scope user` for anything that must **not** be committed. Write-capable `falkordb` is deliberately absent from the project scope — add it per-lane (guide §6).

### Cursor — Settings → MCP → paste the matching entries from §2 (same names).
### VS Code / Copilot — `.vscode/mcp.json` with the §2 entries under `"servers"`.
### Codex — `~/.codex/config.toml`
```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp@latest"]

[mcp_servers.semgrep]
command = "semgrep"
args = ["mcp"]

[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp@latest", "--headless"]

[mcp_servers.falkordb-readonly]
command = "npx"
args = ["-y", "@falkordb/mcpserver@latest"]
[mcp_servers.falkordb-readonly.env]
FALKORDB_HOST = "localhost"
FALKORDB_PORT = "6379"
FALKORDB_DEFAULT_READONLY = "true"

[mcp_servers.mem0]
url = "https://mcp.mem0.ai/mcp"
bearer_token_env_var = "MEM0_API_KEY"

[mcp_servers.linear]
url = "https://mcp.linear.app/mcp"

[mcp_servers.sentry]
url = "https://mcp.sentry.dev/mcp"
```
### Windsurf / Cline / Antigravity — use the §2 JSON. Config file locations (`.windsurf/mcp.json`, `.agents/mcp_config.json`, `~/.gemini/config/mcp_config.json`) are carried over from your v1 and were not re-verified; confirm in each client's docs.

---

## 4. Environment variables (`.env.mcp.example` — commit this; never commit `.env.mcp`)

| Variable | Used by | Notes |
|---|---|---|
| `CONTEXT7_API_KEY` | context7 | optional; raises rate limits |
| `GITHUB_PAT` | github | fine-grained token: contents/PRs/checks **read**, issues write only if needed |
| `FALKORDB_HOST` / `FALKORDB_PORT` | falkordb* | default `localhost` / `6379` |
| `FALKORDB_USERNAME` / `FALKORDB_PASSWORD` | falkordb* | optional |
| `FALKORDB_DEFAULT_READONLY` | falkordb* | `true` for the readonly server; the server also accepts a per-query `readOnly` flag |
| `MEM0_API_KEY` | mem0 | starts with `m0-` |
| `SENTRY_*`, `LINEAR_*` | — | not needed; both use OAuth in the client |
| `SARVAM_API_KEY` | app runtime (**not an MCP var**) | keep in the app's own `.env`, not here |
| `SARVAM_BASE_URL` | app runtime | `https://api.sarvam.ai` |
| `SARVAM_MODEL` | app runtime | `sarvam-105b-conversations` |

> ⚠️ **Your v1 `mcp.md` contained what looks like a real `SARVAM_API_KEY` prefix (`sk_mhp6zj2k…`) as a "default".** Treat it as exposed: rotate it in the Sarvam dashboard, and never put key material (even partial) in docs.

---

## 5. Pin procedure (supply-chain control; required before CI/release)

```bash
for p in @upstash/context7-mcp @playwright/mcp chrome-devtools-mcp @magicuidesign/mcp next-devtools-mcp @falkordb/mcpserver @modelcontextprotocol/server-sequential-thinking; do
  echo "$p"; npm view "$p" time --json | tail -n 6   # pick a version published ≥ 14 days ago
done
# then replace @latest with @x.y.z in .mcp.json and run:
# then run mcpcheck C-05 in ci mode (docs/mcpcheck.md) — it must print nothing
```
`shadcn@latest` is pinned the same way (`shadcn@x.y.z`). Record chosen versions and dates in `docs/memory/assumptions.md`.

## 6. Smoke test (per server)
```bash
npx -y @modelcontextprotocol/inspector npx -y @upstash/context7-mcp@latest   # swap in any stdio server
```
Then run `/mcp` (Claude Code) or your client's equivalent and confirm each expected server is **connected** and lists tools. A server that is configured but not connected counts as a G0 failure for roles that depend on it.