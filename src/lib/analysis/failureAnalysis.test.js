import { describe, expect, it } from "vitest";
import { demoRuns } from "../demo-data/runs";
import { analyzeRun, redactSecrets } from "./failureAnalysis";

describe("failure analysis", () => {
  it("classifies the four baseline fixture categories", () => {
    const categories = demoRuns.map((run) => analyzeRun(run).diagnosis.primaryCategory);

    expect(categories).toContain("test_failure");
    expect(categories).toContain("typecheck_or_lint_failure");
    expect(categories).toContain("dependency_resolution_failure");
    expect(categories).toContain("configuration_or_missing_secret");
  });

  it("creates evidence references with stable ids and line numbers", () => {
    const result = analyzeRun(demoRuns[0]);

    expect(result.evidence[0]).toMatchObject({ id: "E1", line: 3 });
    expect(result.diagnosis.observedFacts[0].evidenceIds).toEqual(["E1"]);
  });

  it("redacts secret-looking values before analysis output", () => {
    const redacted = redactSecrets("TOKEN=fakeSecretValueThatShouldBeRedacted1234567890");

    expect(redacted).not.toContain("fakeSecretValueThatShouldBeRedacted");
    expect(redacted).toContain("TOKEN=<redacted>");
  });

  it("produces a reproduction pack without claiming commands were executed", () => {
    const result = analyzeRun(demoRuns[2]);

    expect(result.diagnosis.reproduction.commands).toContain("pnpm install --frozen-lockfile");
    expect(result.diagnosis.reproduction.notes.join(" ")).toContain("has not executed");
  });
});
