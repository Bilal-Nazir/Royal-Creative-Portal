import { describe, expect, it } from "vitest";
import {
  STAGE_ORDER,
  STAGE_TRANSITIONS,
  getNextStage,
  isTerminalStage,
  canAdvance,
  progressFraction,
  completedStageCount,
  stageIndex,
  type ProjectGateState,
} from "./stage";

const ALL_GATES_TRUE: ProjectGateState = {
  briefApproved: true,
  proposalAccepted: true,
  depositConfirmed: true,
  requiredContentAccepted: true,
  designApproved: true,
  developmentApproved: true,
  launchChecklistComplete: true,
};

const ALL_GATES_FALSE: ProjectGateState = {
  briefApproved: false,
  proposalAccepted: false,
  depositConfirmed: false,
  requiredContentAccepted: false,
  designApproved: false,
  developmentApproved: false,
  launchChecklistComplete: false,
};

describe("STAGE_ORDER", () => {
  it("has exactly the 8 stages in the spec, in order", () => {
    expect(STAGE_ORDER).toEqual([
      "brief",
      "proposal",
      "deposit",
      "content",
      "design",
      "development",
      "launch",
      "handover",
    ]);
  });
});

describe("getNextStage", () => {
  it("returns the immediate next stage for every non-terminal stage", () => {
    expect(getNextStage("brief")).toBe("proposal");
    expect(getNextStage("proposal")).toBe("deposit");
    expect(getNextStage("deposit")).toBe("content");
    expect(getNextStage("content")).toBe("design");
    expect(getNextStage("design")).toBe("development");
    expect(getNextStage("development")).toBe("launch");
    expect(getNextStage("launch")).toBe("handover");
  });

  it("returns null after the terminal stage", () => {
    expect(getNextStage("handover")).toBeNull();
  });
});

describe("isTerminalStage", () => {
  it("is true only for handover", () => {
    for (const stage of STAGE_ORDER) {
      expect(isTerminalStage(stage)).toBe(stage === "handover");
    }
  });
});

describe("canAdvance", () => {
  it("blocks the transition when its gate is not satisfied", () => {
    const result = canAdvance("brief", ALL_GATES_FALSE);
    expect(result.allowed).toBe(false);
    expect(result.nextStage).toBe("proposal");
    expect(result.reason).toMatch(/briefApproved/);
  });

  it("allows the transition when its gate is satisfied", () => {
    const result = canAdvance("brief", ALL_GATES_TRUE);
    expect(result.allowed).toBe(true);
    expect(result.nextStage).toBe("proposal");
  });

  it("never skips a stage even when every gate is satisfied", () => {
    const result = canAdvance("brief", ALL_GATES_TRUE);
    expect(result.nextStage).toBe("proposal");
    expect(result.nextStage).not.toBe("design");
  });

  it("checks only the gate for the current transition, not later ones", () => {
    const onlyBriefApproved: ProjectGateState = { ...ALL_GATES_FALSE, briefApproved: true };
    expect(canAdvance("brief", onlyBriefApproved).allowed).toBe(true);
    expect(canAdvance("proposal", onlyBriefApproved).allowed).toBe(false);
  });

  it("refuses to advance past the terminal stage", () => {
    const result = canAdvance("handover", ALL_GATES_TRUE);
    expect(result.allowed).toBe(false);
    expect(result.nextStage).toBeNull();
  });

  // Decision 1: deposit -> content requires the deposit CONFIRMED (Stripe
  // success or admin-verified) specifically — a client-reported ("unverified")
  // transfer must not satisfy this gate.
  it("gates deposit -> content on depositConfirmed specifically", () => {
    const unverifiedTransfer: ProjectGateState = { ...ALL_GATES_TRUE, depositConfirmed: false };
    expect(canAdvance("deposit", unverifiedTransfer).allowed).toBe(false);
  });

  // Decision 2: content -> design requires every required checklist item —
  // not just some of them.
  it("gates content -> design on requiredContentAccepted, and marks it forceable", () => {
    const partialContent: ProjectGateState = { ...ALL_GATES_TRUE, requiredContentAccepted: false };
    const result = canAdvance("content", partialContent);
    expect(result.allowed).toBe(false);
    expect(result.forceable).toBe(true);
  });

  it("gates design -> development on designApproved specifically", () => {
    const contentDoneDesignPending: ProjectGateState = { ...ALL_GATES_TRUE, designApproved: false };
    expect(canAdvance("design", contentDoneDesignPending).allowed).toBe(false);
  });

  // Decision 3: development -> launch only needs the client's build approval —
  // final payment / domain & hosting / QA live on the launch checklist instead
  // and gate launch -> handover.
  it("gates development -> launch on developmentApproved alone", () => {
    const approvedButChecklistIncomplete: ProjectGateState = {
      ...ALL_GATES_TRUE,
      developmentApproved: true,
      launchChecklistComplete: false,
    };
    expect(canAdvance("development", approvedButChecklistIncomplete).allowed).toBe(true);
  });

  it("gates launch -> handover on the full launch checklist", () => {
    const checklistIncomplete: ProjectGateState = { ...ALL_GATES_TRUE, launchChecklistComplete: false };
    expect(canAdvance("launch", checklistIncomplete).allowed).toBe(false);
  });

  it("only the content -> design transition is forceable", () => {
    for (const transition of STAGE_TRANSITIONS) {
      expect(transition.forceable).toBe(transition.from === "content");
    }
  });
});

describe("progressFraction and completedStageCount", () => {
  // Decision 4: progress is COMPLETED stages / 8 — the current stage itself
  // doesn't count as complete. Design (index 4) is 4/8 = 50%, not 5/8.
  it("is stageIndex / 8 for every stage", () => {
    for (const stage of STAGE_ORDER) {
      expect(progressFraction(stage)).toBeCloseTo(stageIndex(stage) / 8);
      expect(completedStageCount(stage)).toBe(stageIndex(stage));
    }
  });

  it("is 0 for the first stage (nothing completed yet) and 4/8 for design", () => {
    expect(progressFraction("brief")).toBe(0);
    expect(completedStageCount("brief")).toBe(0);
    expect(progressFraction("design")).toBeCloseTo(0.5);
    expect(completedStageCount("design")).toBe(4);
  });
});
