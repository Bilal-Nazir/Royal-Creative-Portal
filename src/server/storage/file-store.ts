import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Project } from "../domain/project";
import type { BriefVersion } from "../domain/brief";
import type { ProposalVersion, AcceptanceRecord } from "../domain/proposal";
import type { Invoice } from "../domain/invoice";
import type { Comment } from "../domain/comment";
import type { ShareLink } from "../domain/share-link";
import { SEED_PROJECTS } from "../repositories/in-memory/seed-data";
import {
  SEED_BRIEF_VERSIONS,
  SEED_PROPOSAL_VERSIONS,
  SEED_ACCEPTANCE_RECORDS,
  SEED_INVOICES,
  SEED_COMMENTS,
  SEED_SHARE_LINKS,
} from "../repositories/in-memory/seed-data-phase2a";

export interface StoreShape {
  projects: Project[];
  briefVersions: BriefVersion[];
  proposalVersions: ProposalVersion[];
  acceptanceRecords: AcceptanceRecord[];
  invoices: Invoice[];
  comments: Comment[];
  shareLinks: ShareLink[];
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
    }),
  );
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
  return JSON.parse(raw) as StoreShape;
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
