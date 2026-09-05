import { describe, expect, it } from "vitest";
import { createFindItScenarios, runFindItEvaluation } from "@/lib/evaluation/findItScenarios";

describe("Find-it scenario evaluation", () => {
  it("generates exactly 500 synthetic scenarios", () => {
    const scenarios = createFindItScenarios();

    expect(scenarios).toHaveLength(500);
    expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(500);
  });

  it("passes the current deterministic commerce engine contract", () => {
    const report = runFindItEvaluation();

    expect(report.total).toBe(500);
    expect(report.passed).toBe(500);
    expect(report.failed).toBe(0);
    expect(report.categories).toHaveLength(7);
    expect(report.categories.every((category) => category.passRate === 1)).toBe(true);
  });

  it("keeps review-only deal requests away from the buyer path", () => {
    const report = runFindItEvaluation();
    const reviewOnly = report.results.find((result) => result.category === "review_only");

    expect(reviewOnly).toBeTruthy();
    expect(reviewOnly?.passed).toBe(true);
    expect(reviewOnly?.actual).toMatch(/withheld/i);
    expect(reviewOnly?.evidence.join(" ")).toContain("mode=review_only");
  });
});
