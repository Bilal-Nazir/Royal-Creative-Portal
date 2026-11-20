import { describe, expect, it } from "vitest";
import { assertClientCanActOnProject, assertAgencyCanManageProject, canAct, filterProjectsForAgencyUser } from "./permissions";
import type { SessionPayload } from "../auth/session";
import type { Project } from "../domain/project";

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-royal-trendsy",
    name: "Royal Trendsy website",
    description: "Test fixture project.",
    projectType: "Website development",
    createdAt: "2026-10-15T09:00:00.000Z",
    clientId: "royal-trendsy",
    clientName: "Royal Trendsy",
    contactName: "Jerry Royal",
    stage: "content",
    statusLabel: "In progress",
    clientStatusLabel: "In progress",
    waitingOn: "agency",
    assigneeId: "u-jordan",
    assigneeName: "Jordan Hale",
    dueDate: "2026-11-04",
    openRevisions: 0,
    nextMilestone: { label: "x", date: "2026-11-04", waitingOn: "client" },
    launchChecklist: { clientApproval: false, finalPayment: false, domainHosting: false, qualityChecks: false },
    forcedAdvances: [],
    ...overrides,
  };
}

const participant: SessionPayload = {
  userId: "u-alex",
  role: "client",
  name: "Alex",
  clientRole: "participant",
  clientId: "royal-trendsy",
};

const viewer: SessionPayload = { ...participant, userId: "u-priya", name: "Priya Shah", clientRole: "viewer" };

const wrongClientParticipant: SessionPayload = { ...participant, userId: "u-clara", clientId: "ashworth-chambers" };

const agencyOwner: SessionPayload = { userId: "u-jerry", role: "agency", name: "Jerry Royal", agencyRole: "owner" };
const agencyMemberAssigned: SessionPayload = {
  userId: "u-jordan",
  role: "agency",
  name: "Jordan Hale",
  agencyRole: "member",
};
const agencyMemberUnassigned: SessionPayload = {
  userId: "u-alexmorgan",
  role: "agency",
  name: "Alex Morgan",
  agencyRole: "member",
};

describe("canAct", () => {
  it("is true for a client participant and false for a viewer", () => {
    expect(canAct(participant)).toBe(true);
    expect(canAct(viewer)).toBe(false);
  });

  it("is true for any agency role", () => {
    expect(canAct(agencyOwner)).toBe(true);
    expect(canAct(agencyMemberAssigned)).toBe(true);
  });
});

describe("assertClientCanActOnProject", () => {
  it("allows the project's own client participant", () => {
    expect(assertClientCanActOnProject(participant, project())).toBeNull();
  });

  // Spec: "A viewer gets 403 on every action."
  it("returns 403 for a viewer, even on their own project", () => {
    const result = assertClientCanActOnProject(viewer, project());
    expect(result).not.toBeNull();
    expect(result?.ok).toBe(false);
    if (!result?.ok) expect(result?.status).toBe(403);
  });

  it("returns 403 for a client participant on a different client's project", () => {
    const result = assertClientCanActOnProject(wrongClientParticipant, project());
    expect(result?.ok).toBe(false);
  });

  it("returns 403 for an agency session", () => {
    const result = assertClientCanActOnProject(agencyOwner, project());
    expect(result?.ok).toBe(false);
  });
});

describe("assertAgencyCanManageProject", () => {
  it("allows the owner regardless of assignment", () => {
    expect(assertAgencyCanManageProject(agencyOwner, project())).toBeNull();
  });

  it("allows the assigned member", () => {
    expect(assertAgencyCanManageProject(agencyMemberAssigned, project())).toBeNull();
  });

  it("returns 403 for a member not assigned to the project", () => {
    const result = assertAgencyCanManageProject(agencyMemberUnassigned, project());
    expect(result?.ok).toBe(false);
  });

  it("returns 403 for a client session", () => {
    const result = assertAgencyCanManageProject(participant, project());
    expect(result?.ok).toBe(false);
  });
});

describe("filterProjectsForAgencyUser", () => {
  const projects = [project({ id: "a", assigneeId: "u-jordan" }), project({ id: "b", assigneeId: "u-alexmorgan" })];

  it("gives owners and admins every project", () => {
    expect(filterProjectsForAgencyUser(agencyOwner, projects)).toHaveLength(2);
  });

  it("restricts members to their own assigned projects", () => {
    const result = filterProjectsForAgencyUser(agencyMemberAssigned, projects);
    expect(result.map((p) => p.id)).toEqual(["a"]);
  });

  it("gives clients nothing", () => {
    expect(filterProjectsForAgencyUser(participant, projects)).toEqual([]);
  });
});
