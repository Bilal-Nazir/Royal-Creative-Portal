import {
  InMemoryUserRepository,
  FileStoreProjectRepository,
  InMemoryActivityRepository,
  InMemoryAttentionRepository,
  InMemoryAgencyStatsRepository,
  FileStoreBriefRepository,
  FileStoreProposalRepository,
  FileStoreAcceptanceRecordRepository,
  FileStoreInvoiceRepository,
  FileStoreCommentRepository,
  InMemoryContentChecklistRepository,
  FileStoreShareLinkRepository,
} from "./in-memory/in-memory-repositories";

/**
 * Single place services import repositories from. Swapping these
 * implementations for real (e.g. database-backed) ones is the only change
 * needed to plug in persistence later — nothing in server/services or the
 * UI references a concrete repository class directly.
 *
 * Project/Brief/Proposal/Invoice/Comment/AcceptanceRecord/ShareLink are
 * file-backed (see storage/file-store.ts) because they're mutated by route
 * handlers and read by page Server Components, which Next.js does not share
 * module state between. The rest are never mutated, so a plain in-memory
 * array is fine.
 */
export const userRepository = new InMemoryUserRepository();
export const projectRepository = new FileStoreProjectRepository();
export const activityRepository = new InMemoryActivityRepository();
export const attentionRepository = new InMemoryAttentionRepository();
export const agencyStatsRepository = new InMemoryAgencyStatsRepository();
export const briefRepository = new FileStoreBriefRepository();
export const proposalRepository = new FileStoreProposalRepository();
export const acceptanceRecordRepository = new FileStoreAcceptanceRecordRepository();
export const invoiceRepository = new FileStoreInvoiceRepository();
export const commentRepository = new FileStoreCommentRepository();
export const contentChecklistRepository = new InMemoryContentChecklistRepository();
export const shareLinkRepository = new FileStoreShareLinkRepository();
