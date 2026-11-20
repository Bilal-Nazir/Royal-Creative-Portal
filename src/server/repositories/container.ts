import {
  FileStoreUserRepository,
  FileStoreProjectRepository,
  InMemoryActivityRepository,
  InMemoryAttentionRepository,
  FileStoreBriefRepository,
  FileStoreProposalRepository,
  FileStoreAcceptanceRecordRepository,
  FileStoreInvoiceRepository,
  FileStoreCommentRepository,
  FileStoreContentChecklistRepository,
  FileStoreContentSubmissionRepository,
  FileStoreShareLinkRepository,
  FileStoreDesignVersionRepository,
  FileStoreDesignPinCommentRepository,
  FileStoreRevisionRoundRepository,
  FileStoreProjectMessageRepository,
  FileStoreConversationReadRepository,
  FileStoreNotificationRepository,
  FileStoreUploadedFileRepository,
  FileStoreScopeChangeRepository,
  FileStoreHandoverResourceRepository,
  FileStoreContactStageRepository,
  FileStoreContactRepository,
  FileStoreContactActivityRepository,
  FileStoreAgencySettingsRepository,
} from "./in-memory/in-memory-repositories";

/**
 * Single place services import repositories from. Swapping these
 * implementations for real (e.g. database-backed) ones is the only change
 * needed to plug in persistence later — nothing in server/services or the
 * UI references a concrete repository class directly.
 *
 * Everything except User/Activity/Attention/AgencyStats is file-backed (see
 * storage/file-store.ts) because it's mutated by route handlers and read by
 * page Server Components, which Next.js does not share module state
 * between. Those four are never mutated, so a plain in-memory array is fine.
 */
export const userRepository = new FileStoreUserRepository();
export const projectRepository = new FileStoreProjectRepository();
export const activityRepository = new InMemoryActivityRepository();
export const attentionRepository = new InMemoryAttentionRepository();
export const briefRepository = new FileStoreBriefRepository();
export const proposalRepository = new FileStoreProposalRepository();
export const acceptanceRecordRepository = new FileStoreAcceptanceRecordRepository();
export const invoiceRepository = new FileStoreInvoiceRepository();
export const commentRepository = new FileStoreCommentRepository();
export const contentChecklistRepository = new FileStoreContentChecklistRepository();
export const contentSubmissionRepository = new FileStoreContentSubmissionRepository();
export const shareLinkRepository = new FileStoreShareLinkRepository();
export const designVersionRepository = new FileStoreDesignVersionRepository();
export const designPinCommentRepository = new FileStoreDesignPinCommentRepository();
export const revisionRoundRepository = new FileStoreRevisionRoundRepository();
export const projectMessageRepository = new FileStoreProjectMessageRepository();
export const conversationReadRepository = new FileStoreConversationReadRepository();
export const notificationRepository = new FileStoreNotificationRepository();
export const uploadedFileRepository = new FileStoreUploadedFileRepository();
export const scopeChangeRepository = new FileStoreScopeChangeRepository();
export const handoverResourceRepository = new FileStoreHandoverResourceRepository();
export const contactStageRepository = new FileStoreContactStageRepository();
export const contactRepository = new FileStoreContactRepository();
export const contactActivityRepository = new FileStoreContactActivityRepository();
export const agencySettingsRepository = new FileStoreAgencySettingsRepository();
