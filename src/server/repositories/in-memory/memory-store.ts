import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Project } from "../../domain/project";
import type { ProjectBoardColumn } from "../../domain/project-board";
import type { BriefVersion } from "../../domain/brief";
import type { ProposalVersion, AcceptanceRecord } from "../../domain/proposal";
import type { Invoice } from "../../domain/invoice";
import type { Comment } from "../../domain/comment";
import type { ShareLink } from "../../domain/share-link";
import type { ContentChecklistItem, ContentSubmission } from "../../domain/content";
import type { DesignVersion, DesignPinComment, RevisionRound } from "../../domain/design";
import type { ProjectMessage, ConversationRead } from "../../domain/message";
import type { Notification } from "../../domain/notification";
import type { UploadedFile } from "../../domain/upload";
import type { ScopeChange } from "../../domain/scope-change";
import type { HandoverResource } from "../../domain/handover-resource";
import type { User } from "../../domain/user";
import type { Contact, ContactStage, ContactActivity } from "../../domain/contact";
import type { AgencySettings } from "../../domain/settings";
import type { Invite } from "../../domain/invite";
import type { PasswordResetToken } from "../../domain/password-reset";
import { SEED_PROJECTS, SEED_USERS } from "./seed-data";
import {
  SEED_BRIEF_VERSIONS,
  SEED_PROPOSAL_VERSIONS,
  SEED_ACCEPTANCE_RECORDS,
  SEED_INVOICES,
  SEED_COMMENTS,
  SEED_SHARE_LINKS,
  SEED_CONTENT_CHECKLIST_ITEMS,
  SEED_CONTENT_SUBMISSIONS,
  SEED_DESIGN_VERSIONS,
  SEED_DESIGN_PIN_COMMENTS,
  SEED_REVISION_ROUNDS,
  SEED_PROJECT_MESSAGES,
  SEED_NOTIFICATIONS,
  SEED_UPLOADED_FILES,
  SEED_CONVERSATION_READS,
  SEED_CONTACT_STAGES,
  SEED_CONTACTS,
  SEED_CONTACT_ACTIVITIES,
  SEED_AGENCY_SETTINGS,
  SEED_PROJECT_BOARD_COLUMNS,
} from "./seed-data-phase2a";

export interface StoreShape {
  projects: Project[];
  briefVersions: BriefVersion[];
  proposalVersions: ProposalVersion[];
  acceptanceRecords: AcceptanceRecord[];
  invoices: Invoice[];
  comments: Comment[];
  shareLinks: ShareLink[];
  contentChecklistItems: ContentChecklistItem[];
  contentSubmissions: ContentSubmission[];
  designVersions: DesignVersion[];
  designPinComments: DesignPinComment[];
  revisionRounds: RevisionRound[];
  projectMessages: ProjectMessage[];
  notifications: Notification[];
  uploadedFiles: UploadedFile[];
  scopeChanges: ScopeChange[];
  handoverResources: HandoverResource[];
  users: User[];
  conversationReads: ConversationRead[];
  contactStages: ContactStage[];
  contacts: Contact[];
  contactActivities: ContactActivity[];
  agencySettings: AgencySettings;
  invites: Invite[];
  passwordResetTokens: PasswordResetToken[];
  projectBoardColumns: ProjectBoardColumn[];
}

const UPLOAD_DIR = join(process.cwd(), ".data", "uploads");

/** Same rationale as before: seeded metadata needs real bytes on disk for the download route to serve something genuine. Memory-driver (test) only. */
function ensureSeedUploadedFileBytes(): void {
  mkdirSync(UPLOAD_DIR, { recursive: true });
  for (const file of SEED_UPLOADED_FILES) {
    const path = join(UPLOAD_DIR, file.storageId);
    if (!existsSync(path)) {
      writeFileSync(path, `${file.originalName}\n\nSeed demo content — not a real upload.\n`, "utf-8");
    }
  }
}

function seedStore(): StoreShape {
  ensureSeedUploadedFileBytes();
  // Deep-cloned so the in-memory store never shares array/object references
  // with the seed constants — mutating the store must not mutate the seed data.
  return JSON.parse(
    JSON.stringify({
      projects: SEED_PROJECTS,
      briefVersions: SEED_BRIEF_VERSIONS,
      proposalVersions: SEED_PROPOSAL_VERSIONS,
      acceptanceRecords: SEED_ACCEPTANCE_RECORDS,
      invoices: SEED_INVOICES,
      comments: SEED_COMMENTS,
      shareLinks: SEED_SHARE_LINKS,
      contentChecklistItems: SEED_CONTENT_CHECKLIST_ITEMS,
      contentSubmissions: SEED_CONTENT_SUBMISSIONS,
      designVersions: SEED_DESIGN_VERSIONS,
      designPinComments: SEED_DESIGN_PIN_COMMENTS,
      revisionRounds: SEED_REVISION_ROUNDS,
      projectMessages: SEED_PROJECT_MESSAGES,
      notifications: SEED_NOTIFICATIONS,
      uploadedFiles: SEED_UPLOADED_FILES,
      scopeChanges: [],
      handoverResources: [],
      users: SEED_USERS,
      conversationReads: SEED_CONVERSATION_READS,
      contactStages: SEED_CONTACT_STAGES,
      contacts: SEED_CONTACTS,
      contactActivities: SEED_CONTACT_ACTIVITIES,
      agencySettings: SEED_AGENCY_SETTINGS,
      invites: [],
      passwordResetTokens: [],
      projectBoardColumns: SEED_PROJECT_BOARD_COLUMNS,
    }),
  );
}

/**
 * The memory driver's entire persistence layer: one process-local object.
 * Previously file-backed (see git history) because route handlers and page
 * Server Components ran in separate Next.js module/VM contexts that didn't
 * share `globalThis` — that boundary doesn't exist in a single-process
 * vitest run, so a plain in-process object is enough for the memory driver,
 * which is test-only now that Mongo is the real app's persistence.
 */
let store: StoreShape = seedStore();

export function getStore(): StoreShape {
  return store;
}

export function resetStore(): void {
  store = seedStore();
}
