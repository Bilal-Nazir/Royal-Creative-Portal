import { describe, expect, it } from "vitest";
import { isOverRevisionAllowance, pinLabel } from "./design";

describe("isOverRevisionAllowance", () => {
  it("is false while the round number is within the included allowance", () => {
    expect(isOverRevisionAllowance(1, 2)).toBe(false);
    expect(isOverRevisionAllowance(2, 2)).toBe(false);
  });

  it("is true once the round number exceeds the included allowance", () => {
    expect(isOverRevisionAllowance(3, 2)).toBe(true);
  });

  it("is true for any round when the proposal includes zero revision rounds", () => {
    expect(isOverRevisionAllowance(1, 0)).toBe(true);
  });
});

describe("pinLabel", () => {
  it("formats as \"{n} · {title}\" when a title is present", () => {
    expect(pinLabel({ number: 1, title: "Hero heading" })).toBe("1 · Hero heading");
  });

  it("falls back to \"Pin {n}\" when there's no title", () => {
    expect(pinLabel({ number: 3 })).toBe("Pin 3");
    expect(pinLabel({ number: 3, title: "" })).toBe("Pin 3");
  });
});
