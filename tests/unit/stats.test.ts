import { describe, expect, it } from "vitest";
import { getConfidence } from "../../lib/utils";

describe("getConfidence", () => {
  it("returns 0 for zero visits", () => {
    expect(getConfidence(0, 0, 0, 0)).toBe(0);
  });

  it("returns approximately 50 for identical conversion rates", () => {
    const confidence = getConfidence(1000, 100, 1000, 100);

    expect(confidence).toBeGreaterThanOrEqual(45);
    expect(confidence).toBeLessThanOrEqual(55);
  });

  it("returns greater than 95 for a clear winner", () => {
    expect(getConfidence(1000, 50, 1000, 150)).toBeGreaterThan(95);
  });

  it("returns less than 95 for too few samples", () => {
    expect(getConfidence(10, 1, 10, 3)).toBeLessThan(95);
  });
});
