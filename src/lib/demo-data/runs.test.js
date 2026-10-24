import { describe, expect, it } from "vitest";
import { demoRuns } from "./runs";
import { analyzeRun } from "../analysis/failureAnalysis";

describe("demo data fixtures & integrity", () => {
  it("contains valid seeded run objects with mandatory metadata", () => {
    expect(demoRuns.length).toBeGreaterThanOrEqual(4);

    demoRuns.forEach((run) => {
      expect(run.id).toMatch(/^run-\d+$/);
      expect(typeof run.repository).toBe("string");
      expect(typeof run.workflow).toBe("string");
      expect(typeof run.branch).toBe("string");
      expect(typeof run.commit).toBe("string");
      expect(run.status).toBe("failed");
      expect(Array.isArray(run.jobs)).toBe(true);
      expect(run.jobs.length).toBeGreaterThan(0);
      expect(typeof run.log).toBe("string");
      expect(run.log.length).toBeGreaterThan(10);
      expect(run.jobs.some((j) => j.conclusion === "failure")).toBe(true);
    });
  });

  it("generates deterministic and consistent fingerprints for each run", () => {
    demoRuns.forEach((run) => {
      const firstAnalysis = analyzeRun(run);
      const secondAnalysis = analyzeRun(run);

      expect(firstAnalysis.fingerprint).toBe(secondAnalysis.fingerprint);
      expect(firstAnalysis.fingerprint).toMatch(/^fp-[a-f0-9]{8}$/);
    });
  });

  it("ensures all runs produce structured hypotheses citing evidence IDs", () => {
    demoRuns.forEach((run) => {
      const result = analyzeRun(run);
      expect(result.diagnosis).toBeDefined();
      expect(result.diagnosis.observedFacts.length).toBeGreaterThanOrEqual(1);

      result.diagnosis.observedFacts.forEach((fact) => {
        expect(fact.evidenceIds.length).toBeGreaterThanOrEqual(1);
        fact.evidenceIds.forEach((id) => {
          expect(result.evidence.some((e) => e.id === id)).toBe(true);
        });
      });
    });
  });
});
