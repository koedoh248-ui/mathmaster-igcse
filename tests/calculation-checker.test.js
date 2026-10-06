import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCalculation, checkCalculationLines } from "../src/calculation-checker.js";

test("local arithmetic respects brackets, powers, fractions and mathematical symbols", () => {
  assert.equal(evaluateCalculation("2 × (8 + 5)"), 26);
  assert.equal(evaluateCalculation("3/4 + 1/2"), 1.25);
  assert.equal(evaluateCalculation("sqrt(6² + 8²)"), 10);
  assert.equal(evaluateCalculation("-2^2"), -4);
  assert.equal(evaluateCalculation("(-2)^2"), 4);
  assert.equal(evaluateCalculation("2^3^2"), 512);
  assert.equal(evaluateCalculation("1.2e3 ÷ 100"), 12);
});

test("working feedback identifies arithmetic errors and distinguishes rounded answers", () => {
  const result = checkCalculationLines("Area = 8 × 5 = 45\n8 × 5 = 40\n2/3 = 0.667\n2x+5 = 15\nA clear explanation");
  assert.deepEqual(result.map(line => line.status), ["incorrect", "correct", "approximate", "unverified"]);
  assert.match(result[0].message, /evaluates to 40/);
  assert.match(result[2].message, /3 significant figures/);
  assert.equal(checkCalculationLines("8 × 5 = 41")[0].status, "incorrect");
});

test("unsupported expressions cannot execute code and invalid calculations are left for review", () => {
  assert.throws(() => evaluateCalculation("process.exit()"));
  assert.throws(() => evaluateCalculation("1/0"));
  assert.throws(() => evaluateCalculation("sqrt(-4)"));
  assert.throws(() => evaluateCalculation("2*(4+3"));
  assert.throws(() => evaluateCalculation("1".repeat(501)));
  assert.equal(checkCalculationLines("20 cm / 5 cm = 4")[0].status, "unverified");
});
