#!/usr/bin/env python3
"""Minimal circuit-breaker evaluator."""
import json
import sys


def should_trip(budgets, attempts, identical_failures=0, progress=True):
    if attempts > budgets["max_stage_retries"]:
        return True
    if identical_failures >= budgets["max_identical_failures"]:
        return True
    if not progress:
        return True
    return False


def main():
    budgets = json.load(open("harness/state/budgets.json", encoding="utf-8"))
    attempts = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    return 1 if should_trip(budgets, attempts) else 0


if __name__ == "__main__":
    raise SystemExit(main())
