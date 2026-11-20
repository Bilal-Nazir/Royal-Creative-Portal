import { afterEach, describe, expect, it } from "vitest";
import { submitContentForItem, reviewContentSubmission, getContentChecklist } from "./content-service";
import {
  shareDesignVersion,
  createPinComment,
  submitRevisionRound,
  approveDesignVersion,
  updateRevisionRoundTracking,
  getCurrentDesignVersion,
  getRevisionRounds,
} from "./design-service";
import { computeGateState } from "./stage-service";
import { projectRepository, proposalRepository, notificationRepository } from "../repositories/container";
import { resetStore } from "../repositories/in-memory/memory-store";
import type { SessionPayload } from "../auth/session";

const PROJECT_ID = "proj-royal-trendsy";
const IMAGES_ITEM_ID = "content-royal-trendsy-images";

const agencyOwner: SessionPayload = { userId: "u-jerry", role: "agency", name: "Jerry Royal", agencyRole: "owner" };
const assignedAgencyMember: SessionPayload = { userId: "u-jordan", role: "agency", name: "Jordan Hale", agencyRole: "member" };
const unassignedAgencyMember: SessionPayload = { userId: "u-alexmorgan", role: "agency", name: "Alex Morgan", agencyRole: "member" };

const clientParticipant: SessionPayload = {
  userId: "u-alex",
  role: "client",
  name: "Alex",
  clientRole: "participant",
  clientId: "royal-trendsy",
};
const clientViewer: SessionPayload = {
  userId: "u-priya",
  role: "client",
  name: "Priya Shah",
  clientRole: "viewer",
  clientId: "royal-trendsy",
};
const otherClientParticipant: SessionPayload = {
  userId: "u-clara",
  role: "client",
  name: "Clara Ashworth",
  clientRole: "participant",
  clientId: "ashworth-chambers",
};

function expect403(result: { ok: boolean; status?: number }) {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.status).toBe(403);
}

describe("content service", () => {
  afterEach(() => resetStore());

  it("rejects a viewer and a participant on a different project", async () => {
    expect403(await submitContentForItem(clientViewer, PROJECT_ID, IMAGES_ITEM_ID, { fileIds: [] }));
    expect403(await submitContentForItem(otherClientParticipant, PROJECT_ID, IMAGES_ITEM_ID, { fileIds: [] }));
  });

  it("rejects an agency session trying to submit, and a client trying to review", async () => {
    expect403(await submitContentForItem(agencyOwner, PROJECT_ID, IMAGES_ITEM_ID, { fileIds: [], notes: "x" }));

    const submitted = await submitContentForItem(clientParticipant, PROJECT_ID, IMAGES_ITEM_ID, { notes: "here are the photos", fileIds: [] });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect403(await reviewContentSubmission(clientParticipant, PROJECT_ID, submitted.data.id, "accept"));
    expect403(await reviewContentSubmission(unassignedAgencyMember, PROJECT_ID, submitted.data.id, "accept"));
  });

  it("the full submit -> accept flow moves the item to accepted and leaves others untouched", async () => {
    const before = await getContentChecklist(PROJECT_ID);
    const imagesBefore = before.find((i) => i.id === IMAGES_ITEM_ID);
    expect(imagesBefore?.status).toBe("not_started");

    const submitted = await submitContentForItem(clientParticipant, PROJECT_ID, IMAGES_ITEM_ID, {
      notes: "Product photos are in the shared folder.",
      sharedLink: "https://drive.example/photos",
      fileIds: [],
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const afterSubmit = await getContentChecklist(PROJECT_ID);
    expect(afterSubmit.find((i) => i.id === IMAGES_ITEM_ID)?.status).toBe("submitted");

    const reviewed = await reviewContentSubmission(assignedAgencyMember, PROJECT_ID, submitted.data.id, "accept");
    expect(reviewed.ok).toBe(true);

    const afterAccept = await getContentChecklist(PROJECT_ID);
    expect(afterAccept.find((i) => i.id === IMAGES_ITEM_ID)?.status).toBe("accepted");
    // The three already-accepted seed items are untouched by this one item's review.
    expect(afterAccept.filter((i) => i.status === "accepted")).toHaveLength(4);
  });

  it("request_changes moves the item to changes_requested and records the note", async () => {
    const submitted = await submitContentForItem(clientParticipant, PROJECT_ID, IMAGES_ITEM_ID, { notes: "draft", fileIds: [] });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const reviewed = await reviewContentSubmission(agencyOwner, PROJECT_ID, submitted.data.id, "request_changes", "Please resend at full resolution.");
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.data.reviewNote).toBe("Please resend at full resolution.");

    const items = await getContentChecklist(PROJECT_ID);
    expect(items.find((i) => i.id === IMAGES_ITEM_ID)?.status).toBe("changes_requested");
  });

  it("rejects an empty submission with nothing attached", async () => {
    const result = await submitContentForItem(clientParticipant, PROJECT_ID, IMAGES_ITEM_ID, { fileIds: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });
});

describe("design service", () => {
  afterEach(() => resetStore());

  it("rejects a client sharing a version, and a non-owner-assigned agency member", async () => {
    expect403(await shareDesignVersion(clientParticipant, PROJECT_ID, { figmaLink: "https://figma.com/x", screenshotFileIds: ["f1"] }));
    expect403(
      await shareDesignVersion(unassignedAgencyMember, PROJECT_ID, { figmaLink: "https://figma.com/x", screenshotFileIds: ["f1"] }),
    );
  });

  it("requires at least one screenshot", async () => {
    const result = await shareDesignVersion(assignedAgencyMember, PROJECT_ID, { figmaLink: "https://figma.com/x", screenshotFileIds: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("the full version -> pin -> round -> resubmit -> approve flow advances designApproved and supersedes version 1", async () => {
    const v1 = await shareDesignVersion(assignedAgencyMember, PROJECT_ID, {
      figmaLink: "https://figma.com/design/v1",
      screenshotFileIds: ["file-1"],
      message: "First pass.",
    });
    expect(v1.ok).toBe(true);
    if (!v1.ok) return;
    expect(v1.data.versionNumber).toBe(1);

    const pin1 = await createPinComment(clientParticipant, PROJECT_ID, v1.data.id, { xPercent: 10, yPercent: 20, body: "Smaller heading please." });
    const pin2 = await createPinComment(clientParticipant, PROJECT_ID, v1.data.id, { xPercent: 50, yPercent: 60, body: "Update this copy." });
    expect(pin1.ok).toBe(true);
    expect(pin2.ok).toBe(true);
    if (!pin1.ok || !pin2.ok) return;
    expect(pin1.data.number).toBe(1);
    expect(pin2.data.number).toBe(2);
    expect(pin1.data.isDraft).toBe(true);

    expect403(await submitRevisionRound(clientViewer, PROJECT_ID, v1.data.id));

    const round = await submitRevisionRound(clientParticipant, PROJECT_ID, v1.data.id);
    expect(round.ok).toBe(true);
    if (!round.ok) return;
    expect(round.data.roundNumber).toBe(1);
    expect(round.data.commentIds).toHaveLength(2);

    const proposal = await proposalRepository.getCurrentVersion(PROJECT_ID);
    expect(round.data.overAllowance).toBe(round.data.roundNumber > (proposal?.includedRevisionRounds ?? 0));

    const v2 = await shareDesignVersion(assignedAgencyMember, PROJECT_ID, {
      figmaLink: "https://figma.com/design/v2",
      screenshotFileIds: ["file-2"],
      whatChanged: "Reduced the heading, updated the copy.",
      respondsToRoundId: round.data.id,
    });
    expect(v2.ok).toBe(true);
    if (!v2.ok) return;
    expect(v2.data.versionNumber).toBe(2);

    const v1AfterSuperseded = await (async () => {
      const current = await getCurrentDesignVersion(PROJECT_ID);
      return current;
    })();
    expect(v1AfterSuperseded?.id).toBe(v2.data.id);

    const project = await projectRepository.findById(PROJECT_ID);
    expect(project).not.toBeNull();
    const gatesBeforeApproval = await computeGateState(project!);
    expect(gatesBeforeApproval.designApproved).toBe(false);

    expect403(await approveDesignVersion(clientViewer, PROJECT_ID, v2.data.id));

    const approved = await approveDesignVersion(clientParticipant, PROJECT_ID, v2.data.id);
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.data.approvedByName).toBe("Alex");

    const gatesAfterApproval = await computeGateState(project!);
    expect(gatesAfterApproval.designApproved).toBe(true);
  });

  it("round numbers increment and overAllowance flags once rounds exceed the proposal's included allowance", async () => {
    const version = await shareDesignVersion(assignedAgencyMember, PROJECT_ID, { figmaLink: "https://figma.com/x", screenshotFileIds: ["f1"] });
    expect(version.ok).toBe(true);
    if (!version.ok) return;

    const proposal = await proposalRepository.getCurrentVersion(PROJECT_ID);
    const allowance = proposal?.includedRevisionRounds ?? 2;

    for (let i = 0; i < allowance + 1; i++) {
      const pin = await createPinComment(clientParticipant, PROJECT_ID, version.data.id, { xPercent: 1, yPercent: 1, body: `Round ${i + 1} feedback` });
      expect(pin.ok).toBe(true);
      const round = await submitRevisionRound(clientParticipant, PROJECT_ID, version.data.id);
      expect(round.ok).toBe(true);
      if (!round.ok) continue;
      expect(round.data.roundNumber).toBe(i + 1);
      expect(round.data.overAllowance).toBe(i + 1 > allowance);
    }

    const rounds = await getRevisionRounds(PROJECT_ID);
    expect(rounds).toHaveLength(allowance + 1);
    expect(rounds.at(-1)?.overAllowance).toBe(true);
  });

  it("stores an optional pin title and rejects one over the max length", async () => {
    const version = await shareDesignVersion(assignedAgencyMember, PROJECT_ID, { figmaLink: "https://figma.com/x", screenshotFileIds: ["f1"] });
    expect(version.ok).toBe(true);
    if (!version.ok) return;

    const withTitle = await createPinComment(clientParticipant, PROJECT_ID, version.data.id, {
      xPercent: 10,
      yPercent: 10,
      title: "Hero heading",
      body: "Make it smaller.",
    });
    expect(withTitle.ok).toBe(true);
    if (withTitle.ok) expect(withTitle.data.title).toBe("Hero heading");

    const withoutTitle = await createPinComment(clientParticipant, PROJECT_ID, version.data.id, { xPercent: 20, yPercent: 20, body: "No title here." });
    expect(withoutTitle.ok).toBe(true);
    if (withoutTitle.ok) expect(withoutTitle.data.title).toBeUndefined();

    const tooLong = await createPinComment(clientParticipant, PROJECT_ID, version.data.id, {
      xPercent: 30,
      yPercent: 30,
      title: "x".repeat(61),
      body: "Still a valid comment.",
    });
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) expect(tooLong.status).toBe(400);
  });

  it("assigning a round notifies that assignee once, and not again when the assignee is unchanged", async () => {
    const version = await shareDesignVersion(assignedAgencyMember, PROJECT_ID, { figmaLink: "https://figma.com/x", screenshotFileIds: ["f1"] });
    expect(version.ok).toBe(true);
    if (!version.ok) return;
    await createPinComment(clientParticipant, PROJECT_ID, version.data.id, { xPercent: 1, yPercent: 1, body: "Feedback." });
    const round = await submitRevisionRound(clientParticipant, PROJECT_ID, version.data.id);
    expect(round.ok).toBe(true);
    if (!round.ok) return;

    const assigned = await updateRevisionRoundTracking(agencyOwner, PROJECT_ID, round.data.id, {
      assigneeId: "u-jordan",
      assigneeName: "Jordan Hale",
    });
    expect(assigned.ok).toBe(true);

    const notificationsAfterFirstAssign = await notificationRepository.listByProjectId(PROJECT_ID);
    const assignmentNotifications = notificationsAfterFirstAssign.filter((n) => n.type === "revision_round_assigned");
    expect(assignmentNotifications).toHaveLength(1);
    expect(assignmentNotifications[0].recipientUserId).toBe("u-jordan");
    expect(assignmentNotifications[0].recipientRole).toBe("agency");

    // Updating other tracking fields without changing the assignee doesn't re-notify.
    await updateRevisionRoundTracking(agencyOwner, PROJECT_ID, round.data.id, { workflowStatus: "in_progress" });
    const notificationsAfterStatusChange = await notificationRepository.listByProjectId(PROJECT_ID);
    expect(notificationsAfterStatusChange.filter((n) => n.type === "revision_round_assigned")).toHaveLength(1);

    // Re-assigning to someone else does notify again.
    await updateRevisionRoundTracking(agencyOwner, PROJECT_ID, round.data.id, { assigneeId: "u-alexmorgan", assigneeName: "Alex Morgan" });
    const notificationsAfterReassign = await notificationRepository.listByProjectId(PROJECT_ID);
    expect(notificationsAfterReassign.filter((n) => n.type === "revision_round_assigned")).toHaveLength(2);
  });
});
