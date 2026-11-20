import { afterEach, describe, expect, it } from "vitest";
import { createStage, deleteStage } from "./contact-service";
import { resetStore } from "../repositories/in-memory/memory-store";
import type { SessionPayload } from "../auth/session";

const agencyOwner: SessionPayload = { userId: "u-jerry", role: "agency", name: "Jerry Royal", agencyRole: "owner" };

describe("contact-service: pipeline stage deletion", () => {
  afterEach(() => resetStore());

  it("blocks deleting a stage that still has contacts", async () => {
    const result = await deleteStage(agencyOwner, "stage-won");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("allows deleting a stage once it's empty", async () => {
    const created = await createStage(agencyOwner, "Nurture");
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const deleted = await deleteStage(agencyOwner, created.data.id);
    expect(deleted.ok).toBe(true);
  });
});
