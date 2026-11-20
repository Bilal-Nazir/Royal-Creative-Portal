import type { Stage } from "./stage";

/** A04's project type selector (Phase 3) — also the grouping key for A00's "Active projects by type". */
export const PROJECT_TYPES = [
  "Website development",
  "SEO",
  "Digital marketing",
  "Video production",
  "Branding",
  "Website maintenance",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export type WaitingOn = "client" | "agency";

export interface NextMilestone {
  label: string;
  date: string;
  waitingOn: WaitingOn;
}

export interface ForcedAdvance {
  stage: Stage;
  byUserId: string;
  byUserName: string;
  at: string;
}

export interface LaunchChecklistState {
  clientApproval: boolean;
  finalPayment: boolean;
  domainHosting: boolean;
  qualityChecks: boolean;
}

export function isLaunchChecklistComplete(checklist: LaunchChecklistState): boolean {
  return checklist.clientApproval && checklist.finalPayment && checklist.domainHosting && checklist.qualityChecks;
}

export interface Project {
  id: string;
  name: string;
  /** Set at creation (A04) — what the project is about. Shown read-only on A16. */
  description: string;
  projectType: ProjectType;
  /** Set at creation — the source for A00's month-vs-previous-month comparisons (see dashboard-service.ts). */
  createdAt: string;
  clientId: string;
  clientName: string;
  contactName: string;
  stage: Stage;
  /** Internal, agency-facing status (shown on the agency dashboard project cards). */
  statusLabel: string;
  /** Friendly, client-facing status (shown on the client dashboard). */
  clientStatusLabel: string;
  waitingOn: WaitingOn;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
  openRevisions: number;
  nextMilestone: NextMilestone;
  launchChecklist: LaunchChecklistState;
  /** A13 — agreed launch date and live URL, set by the agency when scheduling launch. */
  launchDate?: string;
  liveUrl?: string;
  /** Set by tryAdvanceStageIfGated when the project reaches handover — the only real "completed" timestamp, used by A00's "Completed this month" metric. */
  handoverAt?: string;
  forcedAdvances: ForcedAdvance[];
}

export interface ActivityItem {
  id: string;
  projectId: string;
  title: string;
  description: string;
  occurredLabel: string;
}

export interface AttentionTask {
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
  badgeLabel: string;
  ctaLabel: string;
}
