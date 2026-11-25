/** A30 — agency-defined pipeline stages for the contacts board (A17). Order is display order, left to right. */
export interface ContactStage {
  id: string;
  name: string;
  order: number;
  /** Hex dot colour shown on the board column header (A17). */
  color: string;
}

/** Matches the plain card background (see ContactsBoard.tsx) — the "no colour" default so a new stage looks like every other card until the agency picks something else. */
export const DEFAULT_CONTACT_STAGE_COLOR = "#1e1e24";

/** Palette offered by the colour picker when adding a stage — first entry (and the default) is "no colour". */
export const CONTACT_STAGE_COLORS = [
  DEFAULT_CONTACT_STAGE_COLOR,
  "#8b8fa3",
  "#7aa3f7",
  "#a78bfa",
  "#4ade80",
  "#f87171",
  "#f2b84b",
  "#4fd1c5",
];

/** A17/A18/A28 — a lead or client contact tracked from first enquiry to a decision. */
export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  stageId: string;
  /** Unset for a brand-new enquiry nobody has picked up yet (A17's "Unassigned"). */
  ownerId?: string;
  ownerName?: string;
  nextFollowUpAt?: string;
  notes?: string;
  /** Links a won contact to the proposal/project it led to (A18's "Open linked project"). */
  proposalProjectId?: string;
  createdAt: string;
}

export type ContactActivityType =
  | "enquiry_received"
  | "stage_change"
  | "follow_up_logged"
  | "note"
  | "proposal_sent"
  | "proposal_accepted"
  | "proposal_declined";

/** A18's "Recent activity" log — append-only, one entry per logged event. */
export interface ContactActivity {
  id: string;
  contactId: string;
  type: ContactActivityType;
  body: string;
  createdAt: string;
}
