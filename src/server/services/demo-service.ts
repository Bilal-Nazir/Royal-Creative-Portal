import { projectRepository, briefRepository, proposalRepository, invoiceRepository, contentChecklistRepository } from "../repositories/container";
import { readStore, writeStore } from "../storage/file-store";
import type { Stage } from "../domain/stage";
import type { BriefStatus } from "../domain/brief";
import type { ProposalStatus } from "../domain/proposal";
import type { InvoiceStatus } from "../domain/invoice";
import type { ContentSubmission } from "../domain/content";
import type { DesignVersion, DesignPinComment, RevisionRound } from "../domain/design";

export type ContentScenario = "baseline" | "images_submitted" | "images_changes_requested";
export type DesignScenario = "none" | "v1_shared" | "v1_feedback_draft" | "round1_submitted" | "v2_ready" | "approved";

export interface DemoStatePatch {
  projectId: string;
  stage?: Stage;
  briefStatus?: BriefStatus;
  proposalStatus?: ProposalStatus;
  invoiceStatus?: InvoiceStatus;
  contentScenario?: ContentScenario;
  designScenario?: DesignScenario;
}

const IMAGES_ITEM_ID = "content-royal-trendsy-images";

/**
 * Dev-only convenience for reaching every screen state without replaying the
 * full flow. Bypasses the normal permission/gate services on purpose — it's
 * a test fixture control, not a user-facing action — which is why the route
 * handler on top of this additionally checks NODE_ENV === "development".
 */
export async function setDemoState(patch: DemoStatePatch): Promise<void> {
  const project = await projectRepository.findById(patch.projectId);
  if (!project) throw new Error("Project not found.");

  if (patch.stage) {
    await projectRepository.update({ ...project, stage: patch.stage });
  }
  if (patch.briefStatus) {
    const brief = await briefRepository.getCurrentVersion(patch.projectId);
    if (brief) await briefRepository.update({ ...brief, status: patch.briefStatus });
  }
  if (patch.proposalStatus) {
    const proposal = await proposalRepository.getCurrentVersion(patch.projectId);
    if (proposal) await proposalRepository.update({ ...proposal, status: patch.proposalStatus });
  }
  if (patch.invoiceStatus) {
    const invoice = await invoiceRepository.getDepositInvoice(patch.projectId);
    // Setting a status via the switcher means "put the invoice cleanly into
    // this state" — a stale failure/promise/verification left over from a
    // previous state shouldn't leak into it.
    if (invoice) {
      await invoiceRepository.update({
        ...invoice,
        status: patch.invoiceStatus,
        lastFailureReason: undefined,
        promisedDate: undefined,
        paidAt: patch.invoiceStatus === "paid" ? (invoice.paidAt ?? new Date().toISOString()) : undefined,
      });
    }
  }
  if (patch.contentScenario) await applyContentScenario(patch.projectId, patch.contentScenario);
  if (patch.designScenario) await applyDesignScenario(patch.projectId, patch.designScenario);
}

/**
 * Puts the "Images and videos" checklist item into one of C11/A09's three
 * reachable states. Clears any prior submission for the item first so
 * switching scenarios repeatedly doesn't pile up stale submissions.
 */
async function applyContentScenario(projectId: string, scenario: ContentScenario): Promise<void> {
  const item = await contentChecklistRepository.findById(IMAGES_ITEM_ID);
  if (!item || item.projectId !== projectId) return;

  const store = readStore();
  store.contentSubmissions = store.contentSubmissions.filter((s) => s.checklistItemId !== IMAGES_ITEM_ID);
  writeStore(store);

  if (scenario === "baseline") {
    await contentChecklistRepository.update({ ...item, status: "not_started" });
    return;
  }

  const submission: ContentSubmission = {
    id: `content-submission-${IMAGES_ITEM_ID}-demo`,
    projectId,
    checklistItemId: IMAGES_ITEM_ID,
    fileIds: [],
    notes: "Product photos are in the shared folder.",
    submittedByName: "Alex",
    submittedAt: new Date().toISOString(),
    sharedLink: "Google Drive · Product photos",
  };
  const store2 = readStore();
  store2.contentSubmissions.push(submission);
  writeStore(store2);

  if (scenario === "images_submitted") {
    await contentChecklistRepository.update({ ...item, status: "submitted" });
  } else {
    await contentChecklistRepository.update({ ...item, status: "changes_requested" });
  }
}

/**
 * Resets every design version/pin/revision-round for the project, then
 * rebuilds the ones needed for the requested scenario — so each selection
 * is a clean, idempotent snapshot rather than an accumulation of whatever
 * was clicked before it.
 */
async function applyDesignScenario(projectId: string, scenario: DesignScenario): Promise<void> {
  const store = readStore();
  store.designVersions = store.designVersions.filter((v) => v.projectId !== projectId);
  store.designPinComments = store.designPinComments.filter((c) => c.projectId !== projectId);
  store.revisionRounds = store.revisionRounds.filter((r) => r.projectId !== projectId);
  writeStore(store);

  if (scenario === "none") return;

  const v1: DesignVersion = {
    id: `design-${projectId}-v1`,
    projectId,
    versionNumber: 1,
    figmaLink: "https://figma.com/design/demo-homepage-v1",
    screenshotFileIds: [],
    message: "First pass at the homepage — let me know what you think.",
    createdByName: "Jerry Royal",
    createdAt: new Date().toISOString(),
    status: scenario === "approved" || scenario === "v2_ready" ? "superseded" : "shared",
  };

  const pin1: DesignPinComment = {
    id: `pin-${projectId}-v1-1`,
    projectId,
    designVersionId: v1.id,
    number: 1,
    xPercent: 25,
    yPercent: 35,
    title: "Hero heading",
    body: "Can we make this heading smaller?",
    isDraft: scenario === "v1_feedback_draft",
    authorId: "u-alex",
    authorName: "Alex",
    createdAt: new Date().toISOString(),
    status: "open",
  };
  const pin2: DesignPinComment = {
    id: `pin-${projectId}-v1-2`,
    projectId,
    designVersionId: v1.id,
    number: 2,
    xPercent: 70,
    yPercent: 55,
    title: "Company description",
    body: "Please update the company description.",
    isDraft: scenario === "v1_feedback_draft",
    authorId: "u-alex",
    authorName: "Alex",
    createdAt: new Date().toISOString(),
    status: "open",
  };

  const store2 = readStore();
  store2.designVersions.push(v1);
  if (scenario !== "v1_shared") {
    store2.designPinComments.push(pin1, pin2);
  }

  if (scenario === "round1_submitted" || scenario === "v2_ready" || scenario === "approved") {
    const round: RevisionRound = {
      id: `revision-round-${projectId}-1`,
      projectId,
      designVersionId: v1.id,
      roundNumber: 1,
      commentIds: [pin1.id, pin2.id],
      submittedByName: "Alex",
      submittedAt: new Date().toISOString(),
      workflowStatus: scenario === "round1_submitted" ? "submitted" : "completed",
      overAllowance: false,
    };
    store2.revisionRounds.push(round);
  }

  if (scenario === "v2_ready" || scenario === "approved") {
    const round1Id = `revision-round-${projectId}-1`;
    const v2: DesignVersion = {
      id: `design-${projectId}-v2`,
      projectId,
      versionNumber: 2,
      figmaLink: "https://figma.com/design/demo-homepage-v2",
      screenshotFileIds: [],
      message: undefined,
      whatChanged: "Reduced the hero heading and replaced the company description.",
      respondsToRoundId: round1Id,
      createdByName: "Jerry Royal",
      createdAt: new Date().toISOString(),
      status: scenario === "approved" ? "approved" : "shared",
      approvedByUserId: scenario === "approved" ? "u-alex" : undefined,
      approvedByName: scenario === "approved" ? "Alex" : undefined,
      approvedAt: scenario === "approved" ? new Date().toISOString() : undefined,
    };
    store2.designVersions.push(v2);
  }

  writeStore(store2);
}
