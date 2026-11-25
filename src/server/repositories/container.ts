import { env } from "../env";
import * as memory from "./in-memory/in-memory-repositories";
import * as dynamo from "./dynamo/dynamo-repositories";
import type {
  UserRepository,
  ProjectRepository,
  ActivityRepository,
  AttentionRepository,
  BriefRepository,
  ProposalRepository,
  AcceptanceRecordRepository,
  InvoiceRepository,
  CommentRepository,
  ContentChecklistRepository,
  ContentSubmissionRepository,
  ShareLinkRepository,
  DesignVersionRepository,
  DesignPinCommentRepository,
  RevisionRoundRepository,
  ScopeChangeRepository,
  HandoverResourceRepository,
  ProjectMessageRepository,
  ConversationReadRepository,
  NotificationRepository,
  ProjectBoardColumnRepository,
  ContactStageRepository,
  ContactRepository,
  ContactActivityRepository,
  AgencySettingsRepository,
  UploadedFileRepository,
  InviteRepository,
  PasswordResetTokenRepository,
} from "./interfaces";

/**
 * Single place services import repositories from. Nothing in server/services
 * or the UI references a concrete repository class directly, so swapping
 * drivers here is the only change needed.
 *
 * REPOSITORY_DRIVER=dynamo is the real app (DynamoDB). REPOSITORY_DRIVER=
 * memory (unit tests — see vitest.config.ts) uses plain in-process
 * repositories seeded from the same fixtures, with zero behaviour change.
 *
 * Every export below is explicitly typed as its shared interface (not left
 * to be inferred from the ternary) — inferring from `dynamo.X | memory.Y`
 * would pick up each concrete class's own method signatures, which breaks
 * call sites that pass a `Tx` if either class's signature narrows it.
 */
function pick<T>(dynamoImpl: () => T, memoryImpl: () => T): T {
  return env.REPOSITORY_DRIVER === "dynamo" ? dynamoImpl() : memoryImpl();
}

export const userRepository: UserRepository = pick(
  () => new dynamo.DynamoUserRepository(),
  () => new memory.InMemoryUserRepository(),
);
export const projectRepository: ProjectRepository = pick(
  () => new dynamo.DynamoProjectRepository(),
  () => new memory.InMemoryProjectRepository(),
);
export const activityRepository: ActivityRepository = pick(
  () => new dynamo.DynamoActivityRepository(),
  () => new memory.InMemoryActivityRepository(),
);
export const attentionRepository: AttentionRepository = pick(
  () => new dynamo.DynamoAttentionRepository(),
  () => new memory.InMemoryAttentionRepository(),
);
export const briefRepository: BriefRepository = pick(
  () => new dynamo.DynamoBriefRepository(),
  () => new memory.InMemoryBriefRepository(),
);
export const proposalRepository: ProposalRepository = pick(
  () => new dynamo.DynamoProposalRepository(),
  () => new memory.InMemoryProposalRepository(),
);
export const acceptanceRecordRepository: AcceptanceRecordRepository = pick(
  () => new dynamo.DynamoAcceptanceRecordRepository(),
  () => new memory.InMemoryAcceptanceRecordRepository(),
);
export const invoiceRepository: InvoiceRepository = pick(
  () => new dynamo.DynamoInvoiceRepository(),
  () => new memory.InMemoryInvoiceRepository(),
);
export const commentRepository: CommentRepository = pick(
  () => new dynamo.DynamoCommentRepository(),
  () => new memory.InMemoryCommentRepository(),
);
export const contentChecklistRepository: ContentChecklistRepository = pick(
  () => new dynamo.DynamoContentChecklistRepository(),
  () => new memory.InMemoryContentChecklistRepository(),
);
export const contentSubmissionRepository: ContentSubmissionRepository = pick(
  () => new dynamo.DynamoContentSubmissionRepository(),
  () => new memory.InMemoryContentSubmissionRepository(),
);
export const shareLinkRepository: ShareLinkRepository = pick(
  () => new dynamo.DynamoShareLinkRepository(),
  () => new memory.InMemoryShareLinkRepository(),
);
export const designVersionRepository: DesignVersionRepository = pick(
  () => new dynamo.DynamoDesignVersionRepository(),
  () => new memory.InMemoryDesignVersionRepository(),
);
export const designPinCommentRepository: DesignPinCommentRepository = pick(
  () => new dynamo.DynamoDesignPinCommentRepository(),
  () => new memory.InMemoryDesignPinCommentRepository(),
);
export const revisionRoundRepository: RevisionRoundRepository = pick(
  () => new dynamo.DynamoRevisionRoundRepository(),
  () => new memory.InMemoryRevisionRoundRepository(),
);
export const projectMessageRepository: ProjectMessageRepository = pick(
  () => new dynamo.DynamoProjectMessageRepository(),
  () => new memory.InMemoryProjectMessageRepository(),
);
export const conversationReadRepository: ConversationReadRepository = pick(
  () => new dynamo.DynamoConversationReadRepository(),
  () => new memory.InMemoryConversationReadRepository(),
);
export const notificationRepository: NotificationRepository = pick(
  () => new dynamo.DynamoNotificationRepository(),
  () => new memory.InMemoryNotificationRepository(),
);
export const uploadedFileRepository: UploadedFileRepository = pick(
  () => new dynamo.DynamoUploadedFileRepository(),
  () => new memory.InMemoryUploadedFileRepository(),
);
export const scopeChangeRepository: ScopeChangeRepository = pick(
  () => new dynamo.DynamoScopeChangeRepository(),
  () => new memory.InMemoryScopeChangeRepository(),
);
export const handoverResourceRepository: HandoverResourceRepository = pick(
  () => new dynamo.DynamoHandoverResourceRepository(),
  () => new memory.InMemoryHandoverResourceRepository(),
);
export const projectBoardColumnRepository: ProjectBoardColumnRepository = pick(
  () => new dynamo.DynamoProjectBoardColumnRepository(),
  () => new memory.InMemoryProjectBoardColumnRepository(),
);
export const contactStageRepository: ContactStageRepository = pick(
  () => new dynamo.DynamoContactStageRepository(),
  () => new memory.InMemoryContactStageRepository(),
);
export const contactRepository: ContactRepository = pick(
  () => new dynamo.DynamoContactRepository(),
  () => new memory.InMemoryContactRepository(),
);
export const contactActivityRepository: ContactActivityRepository = pick(
  () => new dynamo.DynamoContactActivityRepository(),
  () => new memory.InMemoryContactActivityRepository(),
);
export const agencySettingsRepository: AgencySettingsRepository = pick(
  () => new dynamo.DynamoAgencySettingsRepository(),
  () => new memory.InMemoryAgencySettingsRepository(),
);
export const inviteRepository: InviteRepository = pick(
  () => new dynamo.DynamoInviteRepository(),
  () => new memory.InMemoryInviteRepository(),
);
export const passwordResetTokenRepository: PasswordResetTokenRepository = pick(
  () => new dynamo.DynamoPasswordResetTokenRepository(),
  () => new memory.InMemoryPasswordResetTokenRepository(),
);
