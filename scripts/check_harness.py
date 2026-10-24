#!/usr/bin/env python3
"""Deterministic linter for the Brolens harness. Exit 0 means healthy."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

REQUIRED = [
    "AGENTS.md",
    "docs/raw.md",
    "docs/harness.md",
    "docs/prompt.md",
    "docs/Mcp.md",
    "docs/Mcpguide.md",
    "docs/McpCheck.md",
    "harness/profile.yaml",
    "harness/state/state.json",
    "harness/state/state.schema.json",
    "harness/state/budgets.json",
    "harness/tools/registry.yaml",
    "harness/tools/sandbox.md",
    "harness/workflows/pipeline.md",
    "harness/standards/handoff-contract.md",
    "harness/standards/definition-of-done.md",
    "harness/logs/events.jsonl",
]

HARNESS_HEADINGS = [
    "Problem Statement",
    "Goals & Non-Goals",
    "Users & Use Cases",
    "Requirements",
    "Acceptance Criteria",
    "Architecture & Tech Stack",
    "Project Structure",
    "Commands",
    "Coding & Testing Standards",
    "Tools, APIs & MCP Servers",
    "Autonomy & Approval Matrix",
    "Sprint Plan",
    "Risks & Mitigations",
    "Assumptions",
    "Open Questions",
    "Definition of Done",
    "Glossary",
]

ROLE_SECTIONS = [
    "Purpose",
    "Responsibilities",
    "Prerequisites",
    "Inputs",
    "Outputs",
    "Allowed paths",
    "Forbidden",
    "Process",
    "Iteration policy",
    "Completion criteria",
    "Checks to run",
    "Escalation",
]

BREAKER_KEYS = [
    "max_stage_retries",
    "max_identical_failures",
    "max_diff_lines_per_lane",
    "max_files_per_lane",
    "max_parallel_agents",
    "max_session_minutes",
    "max_tool_calls_per_stage",
    "no_progress_window",
]

STATE_KEYS = ["harness_version", "mode", "sprint", "current_stage", "attempts", "breaker", "updated_at"]
SECRET_RE = re.compile(
    r"(sk-proj-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)"
)
PLACEHOLDER_RE = re.compile(r"\b(TODO|TBD|FIXME)\b|<describe here>|\{\{[^}]*\}\}")


def check_required_files(root=ROOT):
    return [f"missing: {path}" for path in REQUIRED if not (root / path).exists()]


def check_harness_md(root=ROOT):
    path = root / "docs/harness.md"
    if not path.exists():
        return ["missing: docs/harness.md"]
    text = path.read_text(encoding="utf-8")
    errors = [
        f"harness.md missing heading: {heading}"
        for heading in HARNESS_HEADINGS
        if not re.search(rf"^##\s+\d+\.\s+{re.escape(heading)}", text, re.M)
    ]
    if len(text.splitlines()) > 600:
        errors.append("harness.md exceeds 600 lines")
    return errors


def check_agents_and_roles(root=ROOT):
    errors = []
    agents = root / "harness/agents"
    roles = root / "harness/roles"
    agent_names = {path.stem for path in agents.glob("*.md")} if agents.exists() else set()
    role_names = {path.stem for path in roles.glob("*.md")} if roles.exists() else set()
    errors.extend(f"agent without role: {name}" for name in sorted(agent_names - role_names))
    errors.extend(f"role without agent: {name}" for name in sorted(role_names - agent_names))
    for name in sorted(agent_names & role_names):
        agent_text = (agents / f"{name}.md").read_text(encoding="utf-8")
        if len(agent_text.splitlines()) > 40:
            errors.append(f"agent too long: {name}")
        if f"role_file: harness/roles/{name}.md" not in agent_text:
            errors.append(f"agent missing role_file: {name}")
        role_text = (roles / f"{name}.md").read_text(encoding="utf-8")
        for section in ROLE_SECTIONS:
            if not re.search(rf"^##\s+{re.escape(section)}", role_text, re.M | re.I):
                errors.append(f"role {name} missing section: {section}")
    return errors


def check_agents_md(root=ROOT):
    path = root / "AGENTS.md"
    if not path.exists():
        return ["missing: AGENTS.md"]
    text = path.read_text(encoding="utf-8")
    errors = []
    if len(text.splitlines()) > 150:
        errors.append("AGENTS.md exceeds 150 lines")
    for link in re.findall(r"\]\((?!https?://|#|mailto:)([^)\s]+)\)", text):
        if not (root / link.split("#")[0]).exists():
            errors.append(f"AGENTS.md broken link: {link}")
    return errors


def check_state(root=ROOT):
    state = load_json(root / "harness/state/state.json")
    if not state:
        return ["state.json missing or invalid JSON"]
    errors = [f"state.json missing key: {key}" for key in STATE_KEYS if key not in state]
    if state.get("mode") not in {"DISCOVERY", "CURATION", "SCAFFOLD", "EXECUTE", "RETRO"}:
        errors.append("state.json invalid mode")
    return errors


def check_budgets(root=ROOT):
    budgets = load_json(root / "harness/state/budgets.json")
    return [
        f"budgets.json bad/missing: {key}"
        for key in BREAKER_KEYS
        if not isinstance(budgets.get(key), int) or budgets[key] <= 0
    ]


def check_secrets(root=ROOT):
    errors = []
    for base in ("AGENTS.md", "docs", "harness", ".mcp.json", ".env.example"):
      path = root / base
      files = [path] if path.is_file() else list(path.rglob("*")) if path.exists() else []
      for file in files:
          if file.is_file() and file.suffix.lower() in {".md", ".json", ".yaml", ".yml", ".jsonl", ".example", ""}:
              text = file.read_text(encoding="utf-8", errors="ignore")
              if SECRET_RE.search(text):
                  errors.append(f"possible secret in {file.relative_to(root)}")
    return errors


def check_unconfigured(root=ROOT):
    errors = []
    for path in [root / "AGENTS.md", *(root / "harness/agents").glob("*.md"), *(root / "harness/roles").glob("*.md")]:
        text = path.read_text(encoding="utf-8", errors="ignore")
        if not text.strip():
            errors.append(f"unconfigured: {path.relative_to(root)} is blank")
        elif PLACEHOLDER_RE.search(text):
            errors.append(f"unconfigured: {path.relative_to(root)} contains placeholders")
    return errors


def load_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


CHECKS = [
    check_required_files,
    check_harness_md,
    check_agents_and_roles,
    check_agents_md,
    check_state,
    check_budgets,
    check_secrets,
    check_unconfigured,
]


def classify(message):
    head = message.split(":", 1)[0].lower()
    if head in {"missing", "unconfigured"}:
        return head.upper()
    return "INVALID"


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    failures = [error for check in CHECKS for error in check()]
    if "--json" in argv:
        print(json.dumps([{"status": classify(error), "detail": error} for error in failures], indent=2))
        return 1 if failures else 0
    for failure in failures:
        print(f"FAIL  {failure}")
    print(f"{'OK' if not failures else 'HARNESS UNHEALTHY'} - {len(failures)} problem(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
