import {
  projectRepository,
  briefRepository,
  proposalRepository,
  invoiceRepository,
  contentChecklistRepository,
  contentSubmissionRepository,
  designVersionRepository,
  designPinCommentRepository,
  revisionRoundRepository,
  handoverResourceRepository,
  scopeChangeRepository,
} from "../repositories/container";
import { createInvoicesFromPaymentSchedule } from "./invoice-service";
import { env } from "../env";
import { deleteItem } from "../db/dynamo";
import { getStore } from "../repositories/in-memory/memory-store";
import type { Stage } from "../domain/stage";
import type { BriefStatus } from "../domain/brief";
import type { ProposalStatus } from "../domain/proposal";
import type { InvoiceStatus } from "../domain/invoice";
import type { ContentSubmission } from "../domain/content";
import type { DesignVersion, DesignPinComment, RevisionRound, ReviewKind } from "../domain/design";
import type { HandoverResource } from "../domain/handover-resource";
import type { ScopeChange, ScopeChangeStatus } from "../domain/scope-change";

export type ContentScenario = "baseline" | "images_submitted" | "images_changes_requested";
export type ReviewScenario = "none" | "v1_shared" | "v1_feedback_draft" | "round1_submitted" | "v2_ready" | "approved";
export type LaunchScenario = "not_started" | "checklist_in_progress" | "checklist_complete";
export type HandoverScenario = "none" | "resources_added";
export type ScopeChangeScenario = "none" | "pending" | "accepted" | "declined";

export interface DemoStatePatch {
  projectId: string;
  stage?: Stage;
  briefStatus?: BriefStatus;
  proposalStatus?: ProposalStatus;
  invoiceStatus?: InvoiceStatus;
  contentScenario?: ContentScenario;
  designScenario?: ReviewScenario;
  developmentScenario?: ReviewScenario;
  launchScenario?: LaunchScenario;
  /** Creates the final invoice (via the proposal's payment schedule) if missing, then puts it directly into this status. */
  finalInvoiceStatus?: InvoiceStatus;
  handoverScenario?: HandoverScenario;
  scopeChangeScenario?: ScopeChangeScenario;
}

const IMAGES_ITEM_ID = "content-royal-trendsy-images";
const isDynamo = env.REPOSITORY_DRIVER === "dynamo";

/**
 * Dev-only convenience for reaching every screen state without replaying the
 * full flow. Bypasses the normal permission/gate services on purpose — it's
 * a test fixture control, not a user-facing action — which is why the route
 * handler on top of this additionally checks NODE_ENV === "development".
 *
 * A handful of "clear this project's existing X, then rebuild" operations
 * below go around the repository interfaces (same as before this phase,
 * when they went around the file store directly) because no repository
 * method exists for "delete every X matching this filter" — nothing else in
 * the real app needs bulk delete, so one wasn't added to the shared
 * interfaces for this dev-only tool alone. Branches on the same
 * REPOSITORY_DRIVER switch as container.ts.
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
  if (patch.designScenario) await applyReviewScenario(patch.projectId, "design", patch.designScenario);
  if (patch.developmentScenario) await applyReviewScenario(patch.projectId, "development", patch.developmentScenario);
  if (patch.launchScenario) await applyLaunchScenario(patch.projectId, patch.launchScenario);
  if (patch.finalInvoiceStatus) await applyFinalInvoiceStatus(patch.projectId, patch.finalInvoiceStatus);
  if (patch.handoverScenario) await applyHandoverScenario(patch.projectId, patch.handoverScenario);
  if (patch.scopeChangeScenario) await applyScopeChangeScenario(patch.projectId, patch.scopeChangeScenario);
}

async function clearContentSubmissionsForItem(projectId: string, checklistItemId: string): Promise<void> {
  if (isDynamo) {
    const submissions = await contentSubmissionRepository.listByProjectId(projectId);
    await Promise.all(
      submissions.filter((s) => s.checklistItemId === checklistItemId).map((s) => deleteItem("contentSubmissions", s.id)),
    );
    return;
  }
  const store = getStore();
  store.contentSubmissions = store.contentSubmissions.filter((s) => s.checklistItemId !== checklistItemId);
}

async function clearReviewData(projectId: string, kind: ReviewKind): Promise<void> {
  if (isDynamo) {
    const versions = await designVersionRepository.listByProjectId(projectId, kind);
    for (const version of versions) {
      const pins = await designPinCommentRepository.listByVersionId(version.id);
      await Promise.all(pins.map((pin) => deleteItem("designPinComments", pin.id)));
      await deleteItem("designVersions", version.id);
    }
    const rounds = await revisionRoundRepository.listByProjectId(projectId, kind);
    await Promise.all(rounds.map((round) => deleteItem("revisionRounds", round.id)));
    return;
  }
  const store = getStore();
  store.designPinComments = store.designPinComments.filter(
    (c) => !store.designVersions.some((v) => v.id === c.designVersionId && v.projectId === projectId && v.kind === kind),
  );
  store.designVersions = store.designVersions.filter((v) => !(v.projectId === projectId && v.kind === kind));
  store.revisionRounds = store.revisionRounds.filter((r) => !(r.projectId === projectId && r.kind === kind));
}

async function clearHandoverResources(projectId: string): Promise<void> {
  if (isDynamo) {
    const resources = await handoverResourceRepository.listByProjectId(projectId);
    await Promise.all(resources.map((r) => handoverResourceRepository.delete(r.id)));
    return;
  }
  const store = getStore();
  store.handoverResources = store.handoverResources.filter((r) => r.projectId !== projectId);
}

async function clearScopeChanges(projectId: string): Promise<void> {
  if (isDynamo) {
    const changes = await scopeChangeRepository.listByProjectId(projectId);
    await Promise.all(changes.map((c) => deleteItem("scopeChanges", c.id)));
    return;
  }
  const store = getStore();
  store.scopeChanges = store.scopeChanges.filter((s) => s.projectId !== projectId);
}

/**
 * Puts the "Images and videos" checklist item into one of C11/A09's three
 * reachable states. Clears any prior submission for the item first so
 * switching scenarios repeatedly doesn't pile up stale submissions.
 */
async function applyContentScenario(projectId: string, scenario: ContentScenario): Promise<void> {
  const item = await contentChecklistRepository.findById(IMAGES_ITEM_ID);
  if (!item || item.projectId !== projectId) return;

  await clearContentSubmissionsForItem(projectId, IMAGES_ITEM_ID);

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
  await contentSubmissionRepository.create(submission);

  if (scenario === "images_submitted") {
    await contentChecklistRepository.update({ ...item, status: "submitted" });
  } else {
    await contentChecklistRepository.update({ ...item, status: "changes_requested" });
  }
}

/**
 * Resets every version/pin/revision-round of the given kind for the
 * project, then rebuilds the ones needed for the requested scenario — so
 * each selection is a clean, idempotent snapshot rather than an
 * accumulation of whatever was clicked before it. Shared by the design and
 * development demo switchers since both tracks use the same ReviewKind
 * discriminator (see domain/design.ts).
 */
async function applyReviewScenario(projectId: string, kind: ReviewKind, scenario: ReviewScenario): Promise<void> {
  await clearReviewData(projectId, kind);

  if (scenario === "none") return;

  const isDev = kind === "development";
  const link = isDev ? "https://royal-trendsy-preview.example" : "https://figma.com/design/demo-homepage-v1";
  const linkV2 = isDev ? "https://royal-trendsy-preview.example/v2" : "https://figma.com/design/demo-homepage-v2";

  const v1: DesignVersion = {
    id: `${kind}-${projectId}-v1`,
    projectId,
    kind,
    versionNumber: 1,
    figmaLink: link,
    screenshotFileIds: [],
    message: isDev ? "First build of the homepage — let me know what to adjust." : "First pass at the homepage — let me know what you think.",
    createdByName: "Jerry Royal",
    createdAt: new Date().toISOString(),
    status: scenario === "approved" || scenario === "v2_ready" ? "superseded" : "shared",
  };
  await designVersionRepository.create(v1);

  const pin1: DesignPinComment = {
    id: `pin-${kind}-${projectId}-v1-1`,
    projectId,
    designVersionId: v1.id,
    number: 1,
    xPercent: 25,
    yPercent: 35,
    title: isDev ? "Hero heading" : "Hero heading",
    body: "Can we make this heading smaller?",
    isDraft: scenario === "v1_feedback_draft",
    authorId: "u-alex",
    authorName: "Alex",
    createdAt: new Date().toISOString(),
    status: "open",
  };
  const pin2: DesignPinComment = {
    id: `pin-${kind}-${projectId}-v1-2`,
    projectId,
    designVersionId: v1.id,
    number: 2,
    xPercent: 70,
    yPercent: 55,
    title: isDev ? "Company description" : "Company description",
    body: isDev ? "Please update the company description." : "Please update the company description.",
    isDraft: scenario === "v1_feedback_draft",
    authorId: "u-alex",
    authorName: "Alex",
    createdAt: new Date().toISOString(),
    status: "open",
  };

  if (scenario !== "v1_shared") {
    await designPinCommentRepository.create(pin1);
    await designPinCommentRepository.create(pin2);
  }

  if (scenario === "round1_submitted" || scenario === "v2_ready" || scenario === "approved") {
    const round: RevisionRound = {
      id: `revision-round-${kind}-${projectId}-1`,
      projectId,
      kind,
      designVersionId: v1.id,
      roundNumber: 1,
      commentIds: [pin1.id, pin2.id],
      submittedByName: "Alex",
      submittedAt: new Date().toISOString(),
      workflowStatus: scenario === "round1_submitted" ? "submitted" : "completed",
      overAllowance: false,
    };
    await revisionRoundRepository.create(round);
  }

  if (scenario === "v2_ready" || scenario === "approved") {
    const round1Id = `revision-round-${kind}-${projectId}-1`;
    const v2: DesignVersion = {
      id: `${kind}-${projectId}-v2`,
      projectId,
      kind,
      versionNumber: 2,
      figmaLink: linkV2,
      screenshotFileIds: [],
      message: undefined,
      whatChanged: isDev
        ? "Contact form validation and mobile navigation have been updated."
        : "Reduced the hero heading and replaced the company description.",
      respondsToRoundId: round1Id,
      createdByName: "Jerry Royal",
      createdAt: new Date().toISOString(),
      status: scenario === "approved" ? "approved" : "shared",
      approvedByUserId: scenario === "approved" ? "u-alex" : undefined,
      approvedByName: scenario === "approved" ? "Alex" : undefined,
      approvedAt: scenario === "approved" ? new Date().toISOString() : undefined,
    };
    await designVersionRepository.create(v2);
  }
}

/** A13/C14 — sets the launch checklist and launch details directly (dev-only bypass, same rationale as setDemoState above). */
async function applyLaunchScenario(projectId: string, scenario: LaunchScenario): Promise<void> {
  const project = await projectRepository.findById(projectId);
  if (!project) return;

  if (scenario === "not_started") {
    await projectRepository.update({
      ...project,
      launchChecklist: { clientApproval: false, finalPayment: false, domainHosting: false, qualityChecks: false },
      launchDate: undefined,
      liveUrl: undefined,
    });
    return;
  }

  const complete = scenario === "checklist_complete";
  await projectRepository.update({
    ...project,
    launchChecklist: {
      clientApproval: true,
      finalPayment: true,
      domainHosting: complete,
      qualityChecks: true,
    },
    launchDate: "2026-11-12",
    liveUrl: "https://royaltrendsy.example",
  });
}

/** Final balance checkout demo states — creates the final invoice from the payment schedule if it doesn't exist yet, then sets its status. */
async function applyFinalInvoiceStatus(projectId: string, status: InvoiceStatus): Promise<void> {
  let invoices = await invoiceRepository.listByProjectId(projectId);
  if (!invoices.some((i) => i.type === "final")) {
    const proposal = await proposalRepository.getCurrentVersion(projectId);
    if (proposal) await createInvoicesFromPaymentSchedule(projectId, proposal.paymentSchedule);
    invoices = await invoiceRepository.listByProjectId(projectId);
  }
  const invoice = invoices.find((i) => i.type === "final");
  if (!invoice) return;

  await invoiceRepository.update({
    ...invoice,
    status,
    dueDate: status === "scheduled" ? invoice.dueDate : new Date().toISOString().slice(0, 10),
    lastFailureReason: undefined,
    paidAt: status === "paid" ? (invoice.paidAt ?? new Date().toISOString()) : undefined,
  });

  if (status === "paid") {
    const project = await projectRepository.findById(projectId);
    if (project) await projectRepository.update({ ...project, launchChecklist: { ...project.launchChecklist, finalPayment: true } });
  }
}

/** C15/A13 — seeds the handover resources list so C15 has something to show without going through the real upload flow. */
async function applyHandoverScenario(projectId: string, scenario: HandoverScenario): Promise<void> {
  await clearHandoverResources(projectId);

  if (scenario === "resources_added") {
    const guide: HandoverResource = {
      id: `handover-${projectId}-guide`,
      projectId,
      title: "Website guide",
      type: "pdf",
      url: "https://royaltrendsy.example/guide.pdf",
      addedByName: "Jerry Royal",
      addedAt: new Date().toISOString(),
    };
    const training: HandoverResource = {
      id: `handover-${projectId}-training`,
      projectId,
      title: "Training walkthrough",
      type: "video",
      url: "https://royaltrendsy.example/training",
      addedByName: "Jerry Royal",
      addedAt: new Date().toISOString(),
    };
    await handoverResourceRepository.create(guide);
    await handoverResourceRepository.create(training);
  }
}

/** R09/A16 — seeds a single demo scope change in the requested decision state. */
async function applyScopeChangeScenario(projectId: string, scenario: ScopeChangeScenario): Promise<void> {
  await clearScopeChanges(projectId);

  if (scenario !== "none") {
    const status: ScopeChangeStatus = scenario;
    const scopeChange: ScopeChange = {
      id: `scope-change-${projectId}-demo`,
      projectId,
      title: "A request beyond the agreed scope",
      description: "Client requested wholesale accounts, price lists and bulk ordering. This was not included in the accepted proposal.",
      additionalFee: 650,
      timelineImpact: "+5 days",
      status,
      createdByName: "Jerry Royal",
      createdAt: new Date().toISOString(),
      decidedByUserId: status !== "pending" ? "u-alex" : undefined,
      decidedByName: status !== "pending" ? "Alex" : undefined,
      decidedAt: status !== "pending" ? new Date().toISOString() : undefined,
    };
    await scopeChangeRepository.create(scopeChange);
  }
}
