import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import check_harness as ch
import breaker


def test_harness_headings_are_configured():
    assert ch.check_harness_md() == []


def test_agents_and_roles_match():
    assert ch.check_agents_and_roles() == []


def test_state_and_budgets_are_valid():
    assert ch.check_state() == []
    assert ch.check_budgets() == []


def test_agents_index_links_resolve():
    assert ch.check_agents_md() == []


def test_secret_scan_does_not_flag_harness_docs():
    assert ch.check_secrets() == []


def test_json_gap_classification(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(ch, "CHECKS", [lambda: ["missing: AGENTS.md"]])
    assert ch.main(["--json"]) == 1
    payload = json.loads(capsys.readouterr().out)
    assert payload == [{"status": "MISSING", "detail": "missing: AGENTS.md"}]


def test_breaker_trips_after_retry_budget():
    budgets = {key: 3 for key in ch.BREAKER_KEYS}
    budgets["max_identical_failures"] = 2
    assert breaker.should_trip(budgets, attempts=4)
    assert breaker.should_trip(budgets, attempts=1, identical_failures=2)
    assert breaker.should_trip(budgets, attempts=1, progress=False)
