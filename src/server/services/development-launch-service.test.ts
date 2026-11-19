import { afterEach, describe, expect, it } from "vitest";
import { shareDesignVersion, createPinComment, submitRevisionRound, approveDesignVersion, getRevisionRounds } from "./design-service";
import { updateLaunchChecklistItem, setLaunchDetails, goLive } from "./launch-service";
import { payFinalInvoice, markFinalInvoicePaidManually, getFinalInvoice, setInvoiceStatus, createInvoicesFromPaymentSchedule } from "./invoice-service";
import { createScopeChange, acceptScopeChange, declineScopeChange } from "./scope-change-service";
import { computeGateState, activateScheduledInvoices } from "./stage-service";
import { projectRepository, proposalRepository, invoiceRepository, notificationRepository } from "../repositories/container";
import { resetStore } from "../storage/file-store";
import type { SessionPayload } from "../auth/session";
import type { Project } from "../domain/project";

const PROJECT_ID = "proj-royal-trendsy";

const agencyOwner: SessionPayload = { userId: "u-jerry", role: "agency", name: "Jerry Royal", agencyRole: "owner" };
const clientParticipant: SessionPayload = { userId: "u-alex", role: "client", name: "Alex", clientRole: "participant", clientId: "royal-trendsy" };
const clientViewer: SessionPayload = { userId: "u-priya", role: "client", name: "Priya Shah", clientRole: "viewer", clientId: "royal-trendsy" };

function expect403(result: { ok: boolean; status?: number }) {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.status).toBe(403);
}

function expect400(result: { ok: boolean; status?: number }) {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.status).toBe(400);
}

/** Puts the project directly into the given stage — a test-only bypass, same rationale as the demo-state switcher. */
async function setStage(stage: Project["stage"]): Promise<Project> {
  const project = await projectRepository.findById(PROJECT_ID);
  if (!project) throw new Error("fixture project missing");
  const updated = { ...project, stage };
  await projectRepository.update(updated);
  return updated;
}

describe("development revision rounds (kind reuse, no allowance)", () => {
  afterEach(() => resetStore());

  it("is a separate track from design rounds, with no revision allowance concept", async () => {
    await setStage("development");

    const v1 = await shareDesignVersion(agencyOwner, PROJECT_ID, {
      kind: "development",
      figmaLink: "https://staging.example/v1",
      screenshotFileIds: ["file-1"],
    });
    expect(v1.ok).toBe(true);
    if (!v1.ok) return;
    expect(v1.data.kind).toBe("development");
    expect(v1.data.versionNumber).toBe(1);

    // Submit far more development rounds than the proposal's 2-round design allowance.
    for (let i = 0; i < 4; i++) {
      const pin = await createPinComment(clientParticipant, PROJECT_ID, v1.data.id, { xPercent: 1, yPercent: 1, body: `Round ${i + 1} feedback` });
      expect(pin.ok).toBe(true);
      const round = await submitRevisionRound(clientParticipant, PROJECT_ID, v1.data.id);
      expect(round.ok).toBe(true);
      if (!round.ok) continue;
      expect(round.data.kind).toBe("development");
      expect(round.data.overAllowance).toBe(false);
    }

    const developmentRounds = await getRevisionRounds(PROJECT_ID, "development");
    const designRounds = await getRevisionRounds(PROJECT_ID, "design");
    expect(developmentRounds).toHaveLength(4);
    expect(designRounds).toHaveLength(0);
  });

  it("approving a development version ticks the launch checklist's client approval and advances to launch", async () => {
    await setStage("development");
    const v1 = await shareDesignVersion(agencyOwner, PROJECT_ID, { kind: "development", figmaLink: "https://staging.example/v1", screenshotFileIds: ["f1"] });
    expect(v1.ok).toBe(true);
    if (!v1.ok) return;

    const projectBefore = await projectRepository.findById(PROJECT_ID);
    expect(projectBefore?.launchChecklist.clientApproval).toBe(false);

    expect403(await approveDesignVersion(clientViewer, PROJECT_ID, v1.data.id));

    const gatesBefore = await computeGateState(projectBefore!);
    expect(gatesBefore.developmentApproved).toBe(false);

    const approved = await approveDesignVersion(clientParticipant, PROJECT_ID, v1.data.id);
    expect(approved.ok).toBe(true);

    const projectAfter = await projectRepository.findById(PROJECT_ID);
    expect(projectAfter?.launchChecklist.clientApproval).toBe(true);
    expect(projectAfter?.stage).toBe("launch");

    const gatesAfter = await computeGateState(projectAfter!);
    expect(gatesAfter.developmentApproved).toBe(true);
  });
});

describe("launch checklist gate and go-live", () => {
  afterEach(() => resetStore());

  it("only the two manual checks can be toggled, and only by agency", async () => {
    await setStage("launch");
    expect403(await updateLaunchChecklistItem(clientParticipant, PROJECT_ID, "domainHosting", true));

    const toggled = await updateLaunchChecklistItem(agencyOwner, PROJECT_ID, "domainHosting", true);
    expect(toggled.ok).toBe(true);
    if (toggled.ok) expect(toggled.data.launchChecklist.domainHosting).toBe(true);

    // @ts-expect-error -- exercising the runtime guard against a non-manual item, not just the type system
    const rejected = await updateLaunchChecklistItem(agencyOwner, PROJECT_ID, "clientApproval", true);
    expect400(rejected);
  });

  it("go-live fails until all 4 checks and launch details are set, then moves the project to handover", async () => {
    await setStage("launch");
    const blocked = await goLive(agencyOwner, PROJECT_ID);
    expect400(blocked);

    await updateLaunchChecklistItem(agencyOwner, PROJECT_ID, "domainHosting", true);
    await updateLaunchChecklistItem(agencyOwner, PROJECT_ID, "qualityChecks", true);
    const project = await projectRepository.findById(PROJECT_ID);
    await projectRepository.update({ ...project!, launchChecklist: { ...project!.launchChecklist, clientApproval: true, finalPayment: true } });

    const blockedOnDetails = await goLive(agencyOwner, PROJECT_ID);
    expect400(blockedOnDetails);

    const details = await setLaunchDetails(agencyOwner, PROJECT_ID, { launchDate: "2026-11-12", liveUrl: "https://royaltrendsy.example" });
    expect(details.ok).toBe(true);

    const live = await goLive(agencyOwner, PROJECT_ID);
    expect(live.ok).toBe(true);
    if (!live.ok) return;
    expect(live.data.stage).toBe("handover");

    const notifications = await notificationRepository.listByProjectId(PROJECT_ID);
    expect(notifications.some((n) => n.type === "website_live")).toBe(true);
  });
});

describe("final invoice activation and payment", () => {
  afterEach(() => resetStore());

  it("activates the scheduled final invoice once the project reaches launch, and notifies the client", async () => {
    const proposal = await proposalRepository.getCurrentVersion(PROJECT_ID);
    await createInvoicesFromPaymentSchedule(PROJECT_ID, proposal!.paymentSchedule);

    const beforeInvoice = await getFinalInvoice(PROJECT_ID);
    expect(beforeInvoice?.status).toBe("scheduled");

    await activateScheduledInvoices(PROJECT_ID);

    const afterInvoice = await getFinalInvoice(PROJECT_ID);
    expect(afterInvoice?.status).toBe("unpaid");

    const notifications = await notificationRepository.listByProjectId(PROJECT_ID);
    expect(notifications.some((n) => n.type === "final_invoice_due")).toBe(true);
  });

  it("paying the final invoice ticks the launch checklist's final payment and advances if the gate is now satisfied", async () => {
    const proposal = await proposalRepository.getCurrentVersion(PROJECT_ID);
    await createInvoicesFromPaymentSchedule(PROJECT_ID, proposal!.paymentSchedule);
    await activateScheduledInvoices(PROJECT_ID);
    await setStage("launch");

    const project = await projectRepository.findById(PROJECT_ID);
    await projectRepository.update({ ...project!, launchChecklist: { ...project!.launchChecklist, clientApproval: true, domainHosting: true, qualityChecks: true } });

    const failed = await payFinalInvoice(clientParticipant, PROJECT_ID, "failure");
    expect(failed.ok).toBe(true);
    if (failed.ok) {
      expect(failed.data.charged).toBe(false);
      expect(failed.data.invoice.status).not.toBe("paid");
    }
    const projectAfterFailure = await projectRepository.findById(PROJECT_ID);
    expect(projectAfterFailure?.launchChecklist.finalPayment).toBe(false);

    const paid = await payFinalInvoice(clientParticipant, PROJECT_ID, "success");
    expect(paid.ok).toBe(true);
    if (paid.ok) expect(paid.data.charged).toBe(true);

    const projectAfterPaid = await projectRepository.findById(PROJECT_ID);
    expect(projectAfterPaid?.launchChecklist.finalPayment).toBe(true);
    expect(projectAfterPaid?.stage).toBe("handover");
  });

  it("marking the final invoice paid manually, and the generic setInvoiceStatus path, both tick final payment", async () => {
    const proposal = await proposalRepository.getCurrentVersion(PROJECT_ID);
    await createInvoicesFromPaymentSchedule(PROJECT_ID, proposal!.paymentSchedule);
    await activateScheduledInvoices(PROJECT_ID);

    const manual = await markFinalInvoicePaidManually(agencyOwner, PROJECT_ID);
    expect(manual.ok).toBe(true);
    const projectAfterManual = await projectRepository.findById(PROJECT_ID);
    expect(projectAfterManual?.launchChecklist.finalPayment).toBe(true);

    // Reset and exercise the other path: A07's generic quick-menu status override.
    await resetStore();
    const proposal2 = await proposalRepository.getCurrentVersion(PROJECT_ID);
    await createInvoicesFromPaymentSchedule(PROJECT_ID, proposal2!.paymentSchedule);
    await activateScheduledInvoices(PROJECT_ID);
    const invoice = await getFinalInvoice(PROJECT_ID);
    expect(invoice).not.toBeNull();
    const viaQuickMenu = await setInvoiceStatus(agencyOwner, invoice!.id, "paid");
    expect(viaQuickMenu.ok).toBe(true);
    const projectAfterQuickMenu = await projectRepository.findById(PROJECT_ID);
    expect(projectAfterQuickMenu?.launchChecklist.finalPayment).toBe(true);
  });
});

describe("scope change accept/decline", () => {
  afterEach(() => resetStore());

  it("accepting creates exactly one additional invoice, and a second accept attempt does not duplicate it", async () => {
    expect403(await createScopeChange(clientParticipant, PROJECT_ID, { title: "Wholesale portal", description: "Bulk ordering.", additionalFee: 650, timelineImpact: "+5 days" }));

    const created = await createScopeChange(agencyOwner, PROJECT_ID, { title: "Wholesale portal", description: "Bulk ordering.", additionalFee: 650, timelineImpact: "+5 days" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const invoicesBefore = await invoiceRepository.listByProjectId(PROJECT_ID);
    const additionalBefore = invoicesBefore.filter((i) => i.type === "additional");
    expect(additionalBefore).toHaveLength(0);

    expect403(await acceptScopeChange(clientViewer, PROJECT_ID, created.data.id));

    const accepted = await acceptScopeChange(clientParticipant, PROJECT_ID, created.data.id);
    expect(accepted.ok).toBe(true);
    if (accepted.ok) {
      expect(accepted.data.status).toBe("accepted");
      expect(accepted.data.decidedByName).toBe("Alex");
      expect(accepted.data.additionalInvoiceId).toBeTruthy();
    }

    const invoicesAfterFirstAccept = await invoiceRepository.listByProjectId(PROJECT_ID);
    expect(invoicesAfterFirstAccept.filter((i) => i.type === "additional")).toHaveLength(1);

    // Accepting an already-decided scope change is rejected and creates no second invoice.
    const secondAccept = await acceptScopeChange(clientParticipant, PROJECT_ID, created.data.id);
    expect400(secondAccept);
    const invoicesAfterSecondAttempt = await invoiceRepository.listByProjectId(PROJECT_ID);
    expect(invoicesAfterSecondAttempt.filter((i) => i.type === "additional")).toHaveLength(1);
  });

  it("declining records the decision, creates no invoice, and does not block the current stage", async () => {
    const stageBefore = (await projectRepository.findById(PROJECT_ID))!.stage;

    const created = await createScopeChange(agencyOwner, PROJECT_ID, { title: "Wholesale portal", description: "Bulk ordering.", additionalFee: 650, timelineImpact: "+5 days" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const declined = await declineScopeChange(clientParticipant, PROJECT_ID, created.data.id);
    expect(declined.ok).toBe(true);
    if (declined.ok) {
      expect(declined.data.status).toBe("declined");
      expect(declined.data.additionalInvoiceId).toBeUndefined();
    }

    const invoices = await invoiceRepository.listByProjectId(PROJECT_ID);
    expect(invoices.filter((i) => i.type === "additional")).toHaveLength(0);

    const stageAfter = (await projectRepository.findById(PROJECT_ID))!.stage;
    expect(stageAfter).toBe(stageBefore);
  });
});
