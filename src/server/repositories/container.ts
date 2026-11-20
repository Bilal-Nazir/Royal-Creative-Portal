import { env } from "../env";
import * as memory from "./in-memory/in-memory-repositories";
import * as mongo from "./mongo/mongo-repositories";

/**
 * Single place services import repositories from. Nothing in server/services
 * or the UI references a concrete repository class directly, so swapping
 * drivers here is the only change needed.
 *
 * REPOSITORY_DRIVER=mongo (the real app, Phase 4a) uses MongoDB-backed
 * repositories. REPOSITORY_DRIVER=memory (unit tests — see vitest.config.ts)
 * uses plain in-process repositories seeded from the same fixtures, with
 * zero behaviour change from before this phase.
 */
const useMongo = env.REPOSITORY_DRIVER === "mongo";

export const userRepository = useMongo ? new mongo.MongoUserRepository() : new memory.InMemoryUserRepository();
export const projectRepository = useMongo ? new mongo.MongoProjectRepository() : new memory.InMemoryProjectRepository();
export const activityRepository = useMongo ? new mongo.MongoActivityRepository() : new memory.InMemoryActivityRepository();
export const attentionRepository = useMongo ? new mongo.MongoAttentionRepository() : new memory.InMemoryAttentionRepository();
export const briefRepository = useMongo ? new mongo.MongoBriefRepository() : new memory.InMemoryBriefRepository();
export const proposalRepository = useMongo ? new mongo.MongoProposalRepository() : new memory.InMemoryProposalRepository();
export const acceptanceRecordRepository = useMongo
  ? new mongo.MongoAcceptanceRecordRepository()
  : new memory.InMemoryAcceptanceRecordRepository();
export const invoiceRepository = useMongo ? new mongo.MongoInvoiceRepository() : new memory.InMemoryInvoiceRepository();
export const commentRepository = useMongo ? new mongo.MongoCommentRepository() : new memory.InMemoryCommentRepository();
export const contentChecklistRepository = useMongo
  ? new mongo.MongoContentChecklistRepository()
  : new memory.InMemoryContentChecklistRepository();
export const contentSubmissionRepository = useMongo
  ? new mongo.MongoContentSubmissionRepository()
  : new memory.InMemoryContentSubmissionRepository();
export const shareLinkRepository = useMongo ? new mongo.MongoShareLinkRepository() : new memory.InMemoryShareLinkRepository();
export const designVersionRepository = useMongo
  ? new mongo.MongoDesignVersionRepository()
  : new memory.InMemoryDesignVersionRepository();
export const designPinCommentRepository = useMongo
  ? new mongo.MongoDesignPinCommentRepository()
  : new memory.InMemoryDesignPinCommentRepository();
export const revisionRoundRepository = useMongo
  ? new mongo.MongoRevisionRoundRepository()
  : new memory.InMemoryRevisionRoundRepository();
export const projectMessageRepository = useMongo
  ? new mongo.MongoProjectMessageRepository()
  : new memory.InMemoryProjectMessageRepository();
export const conversationReadRepository = useMongo
  ? new mongo.MongoConversationReadRepository()
  : new memory.InMemoryConversationReadRepository();
export const notificationRepository = useMongo
  ? new mongo.MongoNotificationRepository()
  : new memory.InMemoryNotificationRepository();
export const uploadedFileRepository = useMongo
  ? new mongo.MongoUploadedFileRepository()
  : new memory.InMemoryUploadedFileRepository();
export const scopeChangeRepository = useMongo
  ? new mongo.MongoScopeChangeRepository()
  : new memory.InMemoryScopeChangeRepository();
export const handoverResourceRepository = useMongo
  ? new mongo.MongoHandoverResourceRepository()
  : new memory.InMemoryHandoverResourceRepository();
export const contactStageRepository = useMongo
  ? new mongo.MongoContactStageRepository()
  : new memory.InMemoryContactStageRepository();
export const contactRepository = useMongo ? new mongo.MongoContactRepository() : new memory.InMemoryContactRepository();
export const contactActivityRepository = useMongo
  ? new mongo.MongoContactActivityRepository()
  : new memory.InMemoryContactActivityRepository();
export const agencySettingsRepository = useMongo
  ? new mongo.MongoAgencySettingsRepository()
  : new memory.InMemoryAgencySettingsRepository();
export const inviteRepository = useMongo ? new mongo.MongoInviteRepository() : new memory.InMemoryInviteRepository();
export const passwordResetTokenRepository = useMongo
  ? new mongo.MongoPasswordResetTokenRepository()
  : new memory.InMemoryPasswordResetTokenRepository();
