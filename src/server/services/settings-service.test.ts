import { afterEach, describe, expect, it } from "vitest";
import { changeTeamMemberRole } from "./settings-service";
import { resetStore } from "../storage/file-store";
import type { SessionPayload } from "../auth/session";

const agencyOwner: SessionPayload = { userId: "u-jerry", role: "agency", name: "Jerry Royal", agencyRole: "owner" };
const agencyAdmin: SessionPayload = { userId: "u-mara", role: "agency", name: "Mara Islam", agencyRole: "admin" };

describe("settings-service: team role changes", () => {
  afterEach(() => resetStore());

  it("lets the owner change a team member's role", async () => {
    const result = await changeTeamMemberRole(agencyOwner, "u-jordan", "admin");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.agencyRole).toBe("admin");
  });

  it("forbids an admin from changing roles — only the owner can", async () => {
    const result = await changeTeamMemberRole(agencyAdmin, "u-jordan", "admin");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });
});
