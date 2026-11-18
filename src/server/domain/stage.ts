export const STAGE_ORDER = [
  "brief",
  "proposal",
  "deposit",
  "content",
  "design",
  "development",
  "launch",
  "handover",
] as const;

export type Stage = (typeof STAGE_ORDER)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  brief: "Brief",
  proposal: "Proposal",
  deposit: "Deposit",
  content: "Content",
  design: "Design",
  development: "Development",
  launch: "Launch",
  handover: "Handover",
};

/**
 * Real-world conditions a project can satisfy. The stage machine gates
 * each forward transition on one of these flags. Services compute this from
 * project/brief/proposal/invoice/checklist data; the machine itself holds no
 * state. See LaunchChecklist (project.ts) for the 4-item breakdown behind
 * `launchChecklistComplete`.
 */
export interface ProjectGateState {
  briefApproved: boolean;
  proposalAccepted: boolean;
  depositConfirmed: boolean;
  requiredContentAccepted: boolean;
  designApproved: boolean;
  developmentApproved: boolean;
  launchChecklistComplete: boolean;
}

interface StageTransition {
  from: Stage;
  to: Stage;
  gate: keyof ProjectGateState;
  description: string;
  /** Whether an agency admin/owner can bypass this gate (recorded as a ForcedAdvance on the project). */
  forceable: boolean;
}

export const STAGE_TRANSITIONS: StageTransition[] = [
  {
    from: "brief",
    to: "proposal",
    gate: "briefApproved",
    description: "Client approved the brief",
    forceable: false,
  },
  {
    from: "proposal",
    to: "deposit",
    gate: "proposalAccepted",
    description: "Client accepted the proposal",
    forceable: false,
  },
  {
    from: "deposit",
    to: "content",
    gate: "depositConfirmed",
    // Decision: the deposit invoice must be in the "paid" status specifically —
    // confirmed by Stripe (mock provider for now) or an admin marking it
    // verified. A client self-reporting a bank transfer sets the invoice to
    // "unverified", which does NOT satisfy this gate.
    description: "Deposit payment confirmed (Stripe success or admin-verified) — an unverified transfer does not count",
    forceable: false,
  },
  {
    from: "content",
    to: "design",
    gate: "requiredContentAccepted",
    // Decision: every checklist item flagged "required" must be accepted —
    // not just some of them. An admin/owner can force this transition anyway;
    // the force is recorded on the project (see ForcedAdvance) with who/when.
    description: "All required content checklist items accepted",
    forceable: true,
  },
  {
    from: "design",
    to: "development",
    gate: "designApproved",
    description: "Design version approved, no open revisions",
    forceable: false,
  },
  {
    from: "development",
    to: "launch",
    gate: "developmentApproved",
    // Decision: this gate is just the client's build approval. Final payment,
    // domain/hosting and QA are tracked separately as the launch checklist
    // (see LaunchChecklist) and gate launch -> handover instead.
    description: "Client approved the development build",
    forceable: false,
  },
  {
    from: "launch",
    to: "handover",
    gate: "launchChecklistComplete",
    description: "All 4 launch checklist items complete (client approval, final payment, domain & hosting, quality checks)",
    forceable: false,
  },
];

export function getNextStage(stage: Stage): Stage | null {
  const index = STAGE_ORDER.indexOf(stage);
  if (index === -1 || index === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[index + 1];
}

export function isTerminalStage(stage: Stage): boolean {
  return stage === STAGE_ORDER[STAGE_ORDER.length - 1];
}

export function stageIndex(stage: Stage): number {
  return STAGE_ORDER.indexOf(stage);
}

export interface AdvanceResult {
  allowed: boolean;
  nextStage: Stage | null;
  reason?: string;
  forceable?: boolean;
}

/**
 * Determines whether a project can move from its current stage to the next
 * one, given the gate flags computed for it. Transitions are strictly
 * sequential — stages cannot be skipped.
 */
export function canAdvance(current: Stage, gates: ProjectGateState): AdvanceResult {
  if (isTerminalStage(current)) {
    return { allowed: false, nextStage: null, reason: "Project has already reached handover." };
  }

  const transition = STAGE_TRANSITIONS.find((t) => t.from === current);
  if (!transition) {
    return { allowed: false, nextStage: null, reason: `No transition defined from stage "${current}".` };
  }

  const satisfied = gates[transition.gate];
  if (!satisfied) {
    return {
      allowed: false,
      nextStage: transition.to,
      reason: `Blocked: ${transition.description} (gate "${transition.gate}" not satisfied).`,
      forceable: transition.forceable,
    };
  }

  return { allowed: true, nextStage: transition.to };
}

/**
 * Decision: progress is COMPLETED stages / 8 — the current stage itself is
 * still in progress, not complete. Design (index 4) is therefore 4/8 = 50%,
 * not 5/8.
 */
export function progressFraction(stage: Stage): number {
  return stageIndex(stage) / STAGE_ORDER.length;
}

export function completedStageCount(stage: Stage): number {
  return stageIndex(stage);
}
