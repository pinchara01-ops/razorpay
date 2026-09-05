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
    expect(report.categories).toHaveLength(8);
    expect(report.categories.every((category) => category.passRate === 1)).toBe(true);
  });

  it("includes 20 critical adversarial financial scenarios with inspectable guardrail evidence", () => {
    const report = runFindItEvaluation();
    const adversarial = report.results.filter((result) => result.category === "financial_adversarial");
    const attackTypes = new Set(adversarial.map((result) => result.attackType));

    expect(adversarial).toHaveLength(20);
    expect(attackTypes.size).toBe(10);
    expect(adversarial.every((result) => result.risk === "critical")).toBe(true);
    expect(adversarial.every((result) => result.auditActions.length > 0)).toBe(true);
    expect(adversarial.some((result) => result.guardrailChecks.some((check) => check.includes("fail")))).toBe(true);
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
