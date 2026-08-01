import { TestHarness, TestSuiteSummary } from "./harness";
import { describe, it, expect } from "vitest";

export const globalTestStats = {
  total: 0,
  passed: 0,
  failed: 0,
  record: (tier: string, testId: string, passed: boolean, durationMs: number, errorMsg?: string) => {
    globalTestStats.total++;
    if (passed) globalTestStats.passed++;
    else globalTestStats.failed++;
  },
};

export async function runE2ETests(suiteTitle: string = "TechTrust Kenya E2E Suite"): Promise<TestSuiteSummary> {
  const summary = await TestHarness.runSuite(suiteTitle);

  console.log("\n==========================================================");
  console.log(`  ${suiteTitle.toUpperCase()} - TEST SUMMARY`);
  console.log("==========================================================");
  console.log(`Total Tests Run : ${summary.totalTests}`);
  console.log(`Passed          : ${summary.passedCount}`);
  console.log(`Failed          : ${summary.failedCount}`);
  console.log(`Duration        : ${summary.durationMs}ms`);
  console.log("----------------------------------------------------------");
  console.log("FEATURE BREAKDOWN:");
  console.log("----------------------------------------------------------");

  for (const f of summary.features) {
    const status = f.failed === 0 ? "PASS" : "FAIL";
    const featNum = String(f.featureId).padStart(2, " ");
    const passCount = String(f.passed).padStart(3, " ");
    const totCount = String(f.total).padStart(3, " ");
    console.log(
      `[Feature ${featNum}] ${status} | ${passCount}/${totCount} passed | ${f.featureName}`
    );
  }

  console.log("==========================================================\n");

  return summary;
}

// Integration block for Vitest runner execution
describe("E2E Test Runner Infrastructure", () => {
  it("executes registered test harness suites with 100% pass rate", async () => {
    const summary = await TestHarness.runSuite("Registered Tests");
    if (summary.totalTests > 0) {
      expect(summary.failedCount).toBe(0);
      expect(summary.passedCount).toBe(summary.totalTests);
    } else {
      expect(summary.totalTests).toBe(0);
    }
  });
});
