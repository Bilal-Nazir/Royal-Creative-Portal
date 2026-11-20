import { afterEach, describe, expect, it } from "vitest";
import { skipBrief } from "./brief-service";
import { createProject } from "./project-service";
import { computeGateState } from "./stage-service";
import { getShareLinkForProject, getGuestProjectView } from "./share-service";
import { projectRepository, briefRepository, proposalRepository } from "../repositories/container";
import { resetStore } from "../storage/file-store";
import { completedStageCount } from "../domain/stage";
import type { SessionPayload } from "../auth/session";
import type { Project } from "../domain/project";

/**
 * Spec: skipping is agency owner/admin only, and only before the brief has
 * been sent/approved; a skipped brief satisfies the brief -> proposal gate
 * and counts toward progress like an approved one.
 */

const PRIORY_PROJECT_ID = "proj-priory-architects"; // stage: brief, no brief version seeded yet, assigned to u-mara (admin)
const ROYAL_TRENDSY_PROJECT_ID = "proj-royal-trendsy"; // brief already approved in the seed

const agencyOwner: SessionPayload = { userId: "u-jerry", role: "agency", name: "Jerry Royal", agencyRole: "owner" };
const agencyAdmin: SessionPayload = { userId: "u-mara", role: "agency", name: "Mara Islam", agencyRole: "admin" };
const agencyMember: SessionPayload = { userId: "u-jordan", role: "agency", name: "Jordan Hale", agencyRole: "member" };
const clientParticipant: SessionPayload = {
  userId: "u-alex",
  role: "client",
  name: "Alex",
  clientRole: "participant",
  clientId: "royal-trendsy",
};

function expect403(result: { ok: boolean; status?: number }) {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.status).toBe(403);
}

function expect400(result: { ok: boolean; status?: number }) {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.status).toBe(400);
}

async function assignTo(projectId: string, userId: string): Promise<Project> {
  const project = await projectRepository.findById(projectId);
  if (!project) throw new Error("fixture project missing");
  const updated = { ...project, assigneeId: userId };
  await projectRepository.update(updated);
  return updated;
}

describe("skipBrief permissions", () => {
  afterEach(() => resetStore());

  it("rejects a client session", async () => {
    expect403(await skipBrief(clientParticipant, PRIORY_PROJECT_ID));
  });

  it("rejects an agency member even when assigned to the project", async () => {
    await assignTo(PRIORY_PROJECT_ID, agencyMember.userId);
    expect403(await skipBrief(agencyMember, PRIORY_PROJECT_ID));
  });

  it("allows an owner who isn't assigned to the project", async () => {
    const result = await skipBrief(agencyOwner, PRIORY_PROJECT_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("skipped");
    expect(result.data.skippedByUserId).toBe("u-jerry");
    expect(result.data.skippedByName).toBe("Jerry Royal");
    expect(result.data.skippedAt).toBeTruthy();

    const project = await projectRepository.findById(PRIORY_PROJECT_ID);
    expect(project?.stage).toBe("proposal");
  });

  it("allows an admin (already assigned)", async () => {
    const result = await skipBrief(agencyAdmin, PRIORY_PROJECT_ID);
    expect(result.ok).toBe(true);
  });
});

describe("skipBrief state guards", () => {
  afterEach(() => resetStore());

  it("rejects skipping a brief that's already approved", async () => {
    expect400(await skipBrief(agencyOwner, ROYAL_TRENDSY_PROJECT_ID));
  });

  it("rejects skipping once the project has already moved past the brief stage", async () => {
    const first = await skipBrief(agencyOwner, PRIORY_PROJECT_ID);
    expect(first.ok).toBe(true);
    expect400(await skipBrief(agencyOwner, PRIORY_PROJECT_ID));
  });
});

describe("a skipped brief satisfies the brief -> proposal gate and counts toward progress", () => {
  afterEach(() => resetStore());

  it("computeGateState().briefApproved is true once skipped", async () => {
    await skipBrief(agencyOwner, PRIORY_PROJECT_ID);
    const project = await projectRepository.findById(PRIORY_PROJECT_ID);
    const gates = await computeGateState(project!);
    expect(gates.briefApproved).toBe(true);
  });

  it("the project lands on proposal, which counts the brief as 1 completed stage", async () => {
    await skipBrief(agencyOwner, PRIORY_PROJECT_ID);
    const project = await projectRepository.findById(PRIORY_PROJECT_ID);
    expect(project?.stage).toBe("proposal");
    expect(completedStageCount(project!.stage)).toBe(1);
  });
});

describe("createProject with startFrom: proposal (A04)", () => {
  afterEach(() => resetStore());

  it("creates the project with the brief skipped and an empty proposal draft", async () => {
    const result = await createProject(agencyOwner, {
      name: "New client site",
      description: "",
      projectType: "Website development",
      clientId: "ashworth-chambers",
      assigneeId: "u-jordan",
      dueDate: "2026-12-01",
      startFrom: "proposal",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.stage).toBe("proposal");

    const brief = await briefRepository.getCurrentVersion(result.data.id);
    expect(brief?.status).toBe("skipped");

    const proposal = await proposalRepository.getCurrentVersion(result.data.id);
    expect(proposal?.status).toBe("draft");
    expect(proposal?.fields.scope).toBe("");
  });

  it("defaults to startFrom: brief when omitted — no behaviour change", async () => {
    const result = await createProject(agencyOwner, {
      name: "Another client site",
      description: "",
      projectType: "Website development",
      clientId: "ashworth-chambers",
      assigneeId: "u-jordan",
      dueDate: "2026-12-01",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.stage).toBe("brief");
    const brief = await briefRepository.getCurrentVersion(result.data.id);
    expect(brief).toBeNull();
  });
});

describe("guest link (getGuestProjectView) shows brief or proposal depending on stage", () => {
  afterEach(() => resetStore());

  it("shows the brief while the project is still at the brief stage", async () => {
    const project = await projectRepository.findById(ROYAL_TRENDSY_PROJECT_ID);
    await projectRepository.update({ ...project!, stage: "brief" });

    const link = await getShareLinkForProject(agencyOwner, ROYAL_TRENDSY_PROJECT_ID);
    expect(link.ok).toBe(true);
    if (!link.ok) return;

    const view = await getGuestProjectView(link.data.token);
    expect(view?.kind).toBe("brief");
  });

  it("shows the proposal once the brief has been skipped", async () => {
    const created = await createProject(agencyOwner, {
      name: "Proposal-first site",
      description: "",
      projectType: "Website development",
      clientId: "ashworth-chambers",
      assigneeId: "u-jordan",
      dueDate: "2026-12-01",
      startFrom: "proposal",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const link = await getShareLinkForProject(agencyOwner, created.data.id);
    expect(link.ok).toBe(true);
    if (!link.ok) return;

    const view = await getGuestProjectView(link.data.token);
    expect(view?.kind).toBe("proposal");
  });
});
