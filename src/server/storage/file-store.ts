import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Project } from "../domain/project";
import type { BriefVersion } from "../domain/brief";
import type { ProposalVersion, AcceptanceRecord } from "../domain/proposal";
import type { Invoice } from "../domain/invoice";
import type { Comment } from "../domain/comment";
import type { ShareLink } from "../domain/share-link";
import type { ContentChecklistItem, ContentSubmission } from "../domain/content";
import type { DesignVersion, DesignPinComment, RevisionRound } from "../domain/design";
import type { ProjectMessage } from "../domain/message";
import type { Notification } from "../domain/notification";
import type { UploadedFile } from "../domain/upload";
import { SEED_PROJECTS } from "../repositories/in-memory/seed-data";
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
} from "../repositories/in-memory/seed-data-phase2a";

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
}

const STORE_PATH = join(process.cwd(), ".data", "phase2a-store.json");

function seedStore(): StoreShape {
  // Deep-cloned so the file store never shares array/object references with
  // the seed constants — mutating the store must not mutate the seed data.
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
    }),
  );
}

/** Fills in any collection missing from a store file written before this phase, so a stale on-disk store doesn't crash. */
function withMissingCollectionsFilled(store: StoreShape): StoreShape {
  return { ...seedStore(), ...store };
}

/**
 * Next.js compiles Route Handlers and page Server Components into separate
 * module/VM contexts — even `globalThis` isn't shared between them — so a
 * mutation made by a POST handler is invisible to the very next page render
 * unless it's persisted somewhere outside the JS process's module graph.
 * This is that: a plain JSON file on disk, read fresh and written back on
 * every call. Fine for a demo's write volume; a real database is the
 * intended replacement (see repositories/container.ts).
 */
export function readStore(): StoreShape {
  if (!existsSync(STORE_PATH)) {
    const seeded = seedStore();
    writeStore(seeded);
    return seeded;
  }
  const raw = readFileSync(STORE_PATH, "utf-8");
  return withMissingCollectionsFilled(JSON.parse(raw) as StoreShape);
}

/**
 * Atomic: writes to a temp file in the same directory, then renames it over
 * the real path. `rename` is a single filesystem operation (on the same
 * volume), so a reader never sees a half-written file — worst case it reads
 * the old version or the new one, never a torn one.
 */
export function writeStore(store: StoreShape): void {
  const dir = dirname(STORE_PATH);
  mkdirSync(dir, { recursive: true });
  const tmpPath = join(dir, `.phase2a-store.${randomUUID()}.tmp`);
  writeFileSync(tmpPath, JSON.stringify(store, null, 2), "utf-8");
  renameSync(tmpPath, STORE_PATH);
}

export function resetStore(): void {
  writeStore(seedStore());
}
