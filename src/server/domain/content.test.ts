import { describe, expect, it } from "vitest";
import { requiredItemsAllAccepted, type ContentChecklistItem } from "./content";

function item(overrides: Partial<ContentChecklistItem>): ContentChecklistItem {
  return {
    id: "item-1",
    projectId: "proj-1",
    label: "Logo",
    required: true,
    status: "accepted",
    ...overrides,
  };
}

describe("requiredItemsAllAccepted", () => {
  it("is true when every required item is accepted, ignoring optional ones", () => {
    const items = [item({ id: "a", required: true, status: "accepted" }), item({ id: "b", required: false, status: "not_started" })];
    expect(requiredItemsAllAccepted(items)).toBe(true);
  });

  it("is false when any required item is not accepted", () => {
    const items = [item({ id: "a", required: true, status: "accepted" }), item({ id: "b", required: true, status: "not_started" })];
    expect(requiredItemsAllAccepted(items)).toBe(false);
  });

  it("is false for a required item stuck at 'submitted' or 'changes_requested' — only 'accepted' counts", () => {
    expect(requiredItemsAllAccepted([item({ required: true, status: "submitted" })])).toBe(false);
    expect(requiredItemsAllAccepted([item({ required: true, status: "changes_requested" })])).toBe(false);
  });

  it("is true for an empty list", () => {
    expect(requiredItemsAllAccepted([])).toBe(true);
  });

  it("matches the Royal Trendsy seed data: 3 of 4 required items accepted", () => {
    const items = [
      item({ id: "a", required: true, status: "accepted" }),
      item({ id: "b", required: true, status: "accepted" }),
      item({ id: "c", required: true, status: "accepted" }),
      item({ id: "d", required: true, status: "not_started" }),
    ];
    expect(requiredItemsAllAccepted(items)).toBe(false);
  });
});
