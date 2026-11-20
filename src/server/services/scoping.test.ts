import { afterEach, describe, expect, it } from "vitest";
import { getConversationsForSession } from "./message-service";
import { getNotificationsForSession } from "./notification-service";
import { resetStore } from "../storage/file-store";
import type { SessionPayload } from "../auth/session";

const agencyOwner: SessionPayload = { userId: "u-jerry", role: "agency", name: "Jerry Royal", agencyRole: "owner" };
// u-jordan is assigned to proj-royal-trendsy and proj-ashworth, not proj-linden (see seed-data.ts).
const assignedMember: SessionPayload = { userId: "u-jordan", role: "agency", name: "Jordan Hale", agencyRole: "member" };
const unassignedMember: SessionPayload = { userId: "u-alexmorgan", role: "agency", name: "Alex Morgan", agencyRole: "member" };
const alex: SessionPayload = { userId: "u-alex", role: "client", name: "Alex", clientRole: "participant", clientId: "royal-trendsy" };
const tom: SessionPayload = { userId: "u-tom", role: "client", name: "Tom Linden", clientRole: "participant", clientId: "linden-surveyors" };

describe("message-service: scoping", () => {
  afterEach(() => resetStore());

  it("a member only sees conversations for projects they're assigned to", async () => {
    const conversations = await getConversationsForSession(assignedMember);
    const projectIds = conversations.map((c) => c.project.id);
    expect(projectIds).toContain("proj-royal-trendsy");
    expect(projectIds).toContain("proj-ashworth");
    expect(projectIds).not.toContain("proj-linden");
  });

  it("a client only sees their own project's conversation, not another client's", async () => {
    const asAlex = await getConversationsForSession(alex);
    expect(asAlex.map((c) => c.project.id)).toEqual(["proj-royal-trendsy"]);

    const asTom = await getConversationsForSession(tom);
    expect(asTom.map((c) => c.project.id)).toEqual(["proj-linden"]);
  });
});

describe("notification-service: scoping", () => {
  afterEach(() => resetStore());

  it("a member-targeted notification is visible to that member and the owner, not an unrelated member", async () => {
    const forTargetMember = await getNotificationsForSession(assignedMember);
    expect(forTargetMember.some((n) => n.id === "notif-5")).toBe(true);

    const forOwner = await getNotificationsForSession(agencyOwner);
    expect(forOwner.some((n) => n.id === "notif-5")).toBe(true);

    const forOtherMember = await getNotificationsForSession(unassignedMember);
    expect(forOtherMember.some((n) => n.id === "notif-5")).toBe(false);
  });

  it("a client only sees client-facing notifications for their own projects", async () => {
    const notifications = await getNotificationsForSession(alex);
    expect(notifications.every((n) => n.projectId === "proj-royal-trendsy")).toBe(true);
    expect(notifications.some((n) => n.id === "notif-9")).toBe(false); // notif-9 is Hart & Co's, not Royal Trendsy's.
  });
});
