import { describe, expect, it } from "vitest";
import { requiredItemsAllAccepted, type ContentChecklistItem } from "./content";

function item(overrides: Partial<ContentChecklistItem>): ContentChecklistItem {
  return {
    id: "item-1",
    projectId: "proj-1",
    label: "Logo",
    required: true,
    accepted: true,
    ...overrides,
  };
}

describe("requiredItemsAllAccepted", () => {
  it("is true when every required item is accepted, ignoring optional ones", () => {
    const items = [item({ id: "a", required: true, accepted: true }), item({ id: "b", required: false, accepted: false })];
    expect(requiredItemsAllAccepted(items)).toBe(true);
  });

  it("is false when any required item is not accepted", () => {
    const items = [item({ id: "a", required: true, accepted: true }), item({ id: "b", required: true, accepted: false })];
    expect(requiredItemsAllAccepted(items)).toBe(false);
  });

  it("is true for an empty list", () => {
    expect(requiredItemsAllAccepted([])).toBe(true);
  });

  it("matches the Royal Trendsy seed data: 3 of 4 required items accepted", () => {
    const items = [
      item({ id: "a", required: true, accepted: true }),
      item({ id: "b", required: true, accepted: true }),
      item({ id: "c", required: true, accepted: true }),
      item({ id: "d", required: true, accepted: false }),
    ];
    expect(requiredItemsAllAccepted(items)).toBe(false);
  });
});
