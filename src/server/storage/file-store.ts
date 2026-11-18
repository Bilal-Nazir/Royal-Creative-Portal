import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Project } from "../domain/project";
import type { BriefVersion } from "../domain/brief";
import type { ProposalVersion, AcceptanceRecord } from "../domain/proposal";
import type { Invoice } from "../domain/invoice";
import type { Comment } from "../domain/comment";
import { SEED_PROJECTS } from "../repositories/in-memory/seed-data";
import {
  SEED_BRIEF_VERSIONS,
  SEED_PROPOSAL_VERSIONS,
  SEED_ACCEPTANCE_RECORDS,
  SEED_INVOICES,
  SEED_COMMENTS,
} from "../repositories/in-memory/seed-data-phase2a";

export interface StoreShape {
  projects: Project[];
  briefVersions: BriefVersion[];
  proposalVersions: ProposalVersion[];
  acceptanceRecords: AcceptanceRecord[];
  invoices: Invoice[];
  comments: Comment[];
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

export function writeStore(store: StoreShape): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export function resetStore(): void {
  writeStore(seedStore());
}
