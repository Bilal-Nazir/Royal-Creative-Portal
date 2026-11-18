import type { Stage } from "./stage";

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
  projectType: string;
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
