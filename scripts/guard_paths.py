#!/usr/bin/env python3
"""Minimal role path guard."""
import sys

ALLOW = {
    "builder": ("src/", "package.json", "bun.lock", ".env.example", "harness/artifacts/"),
    "test-author": ("src/", "tests/", "harness/artifacts/"),
    "security": ("harness/artifacts/",),
    "qa": ("harness/artifacts/", "harness/logs/"),
    "orchestrator": ("harness/", "docs/harness.md", "AGENTS.md"),
}


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) < 2:
        print("usage: guard_paths.py ROLE PATH...", file=sys.stderr)
        return 2
    role, paths = argv[0], argv[1:]
    allowed = ALLOW.get(role, ())
    bad = [path for path in paths if not path.startswith(allowed)]
    if bad:
        print("\n".join(bad), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
