import { describe, expect, it } from "vitest";
import { approveBrief, requestBriefRevisions, postBriefComment } from "./brief-service";
import { requestProposalChanges, acceptProposal } from "./proposal-service";
import { payDeposit, choosePaymentDate } from "./invoice-service";
import { forceAdvanceContentToDesign } from "./content-service";
import type { SessionPayload } from "../auth/session";

/**
 * Spec: "Enforce all permissions in services, not just the UI. A viewer gets
 * 403 on every action." These exercise the real services against the real
 * seeded Royal Trendsy project — every case here is denied before any write,
 * so it's safe to run without resetting seed state between tests.
 */

const ROYAL_TRENDSY_PROJECT_ID = "proj-royal-trendsy";

const royalTrendsyViewer: SessionPayload = {
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

const agencyOwner: SessionPayload = { userId: "u-jerry", role: "agency", name: "Jerry Royal", agencyRole: "owner" };

const unassignedAgencyMember: SessionPayload = {
  userId: "u-alexmorgan",
  role: "agency",
  name: "Alex Morgan",
  agencyRole: "member",
};

function expect403(result: { ok: boolean; status?: number }) {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.status).toBe(403);
}

describe("brief actions reject viewers and agency sessions", () => {
  it("approveBrief", async () => {
    expect403(await approveBrief(royalTrendsyViewer, ROYAL_TRENDSY_PROJECT_ID));
    expect403(await approveBrief(agencyOwner, ROYAL_TRENDSY_PROJECT_ID));
  });

  it("requestBriefRevisions", async () => {
    expect403(await requestBriefRevisions(royalTrendsyViewer, ROYAL_TRENDSY_PROJECT_ID, "please change X"));
  });

  it("postBriefComment", async () => {
    expect403(await postBriefComment(royalTrendsyViewer, ROYAL_TRENDSY_PROJECT_ID, "a comment"));
  });

  it("rejects a participant on someone else's project", async () => {
    expect403(await approveBrief(otherClientParticipant, ROYAL_TRENDSY_PROJECT_ID));
  });
});

describe("proposal actions reject viewers", () => {
  it("requestProposalChanges", async () => {
    expect403(await requestProposalChanges(royalTrendsyViewer, ROYAL_TRENDSY_PROJECT_ID, "change this"));
  });

  it("acceptProposal", async () => {
    expect403(await acceptProposal(royalTrendsyViewer, ROYAL_TRENDSY_PROJECT_ID));
  });
});

describe("invoice actions reject viewers", () => {
  it("payDeposit", async () => {
    expect403(await payDeposit(royalTrendsyViewer, ROYAL_TRENDSY_PROJECT_ID, "success"));
  });

  it("choosePaymentDate", async () => {
    expect403(await choosePaymentDate(royalTrendsyViewer, ROYAL_TRENDSY_PROJECT_ID, "2026-11-10"));
  });
});

describe("forceAdvanceContentToDesign", () => {
  it("rejects a client session entirely", async () => {
    expect403(await forceAdvanceContentToDesign(royalTrendsyViewer, ROYAL_TRENDSY_PROJECT_ID));
  });

  it("rejects an agency member not assigned to the project", async () => {
    expect403(await forceAdvanceContentToDesign(unassignedAgencyMember, ROYAL_TRENDSY_PROJECT_ID));
  });
});
