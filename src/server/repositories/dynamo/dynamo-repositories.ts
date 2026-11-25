import { getItem, putItem, deleteItem, queryGsi, scanAll, type TransactionContext } from "../../db/dynamo";
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
  Tx,
} from "../interfaces";
import type { User } from "../../domain/user";
import type { Project, ActivityItem, AttentionTask } from "../../domain/project";
import type { ProjectBoardColumn } from "../../domain/project-board";
import type { BriefVersion } from "../../domain/brief";
import type { ProposalVersion, AcceptanceRecord } from "../../domain/proposal";
import type { Invoice } from "../../domain/invoice";
import type { Comment, CommentTargetType } from "../../domain/comment";
import type { ContentChecklistItem, ContentSubmission } from "../../domain/content";
import type { ShareLink } from "../../domain/share-link";
import type { DesignVersion, DesignPinComment, RevisionRound, ReviewKind } from "../../domain/design";
import type { ProjectMessage, ConversationRead } from "../../domain/message";
import type { Notification } from "../../domain/notification";
import type { UploadedFile } from "../../domain/upload";
import type { ScopeChange } from "../../domain/scope-change";
import type { HandoverResource } from "../../domain/handover-resource";
import type { Contact, ContactStage, ContactActivity } from "../../domain/contact";
import type { AgencySettings } from "../../domain/settings";
import type { Invite } from "../../domain/invite";
import type { PasswordResetToken } from "../../domain/password-reset";

/** Same singleton id Mongo used (db/models.ts) — kept identical so a Mongo->Dynamo data migration script could reuse it verbatim. */
export const AGENCY_SETTINGS_SINGLETON_ID = "singleton";

function asTx(tx?: Tx): TransactionContext | null | undefined {
  return tx as TransactionContext | null | undefined;
}

/** Zero-padded so string comparison sorts numerically — used for the kindVersionKey/kindRoundKey GSI-sort-key tricks (6 digits is comfortably more than any project will ever need). */
function pad(n: number): string {
  return String(n).padStart(6, "0");
}

function byCreatedAtAsc<T extends { createdAt: string }>(items: T[]): T[] {
  return items.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function byCreatedAtDesc<T extends { createdAt: string }>(items: T[]): T[] {
  return items.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export class DynamoUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const matches = await queryGsi<User>("users", "byEmail", email.trim().toLowerCase());
    return matches[0] ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return getItem<User>("users", id);
  }

  async listAgencyUsers(): Promise<User[]> {
    return scanAll<User>("users", { attr: "role", value: "agency" });
  }

  async listClientUsers(): Promise<User[]> {
    return scanAll<User>("users", { attr: "role", value: "client" });
  }

  async create(user: User): Promise<void> {
    await putItem("users", { ...user, email: user.email.trim().toLowerCase() });
  }

  async update(user: User): Promise<void> {
    await putItem("users", { ...user, email: user.email.trim().toLowerCase() });
  }

  async remove(id: string): Promise<void> {
    await deleteItem("users", id);
  }
}

export class DynamoProjectRepository implements ProjectRepository {
  async listAll(): Promise<Project[]> {
    return scanAll<Project>("projects");
  }

  async listByClientId(clientId: string): Promise<Project[]> {
    return queryGsi<Project>("projects", "byClientId", clientId);
  }

  async listByAssigneeId(assigneeId: string): Promise<Project[]> {
    return queryGsi<Project>("projects", "byAssigneeId", assigneeId);
  }

  async findById(id: string): Promise<Project | null> {
    return getItem<Project>("projects", id);
  }

  async update(project: Project, tx?: Tx): Promise<void> {
    await putItem("projects", project, asTx(tx));
  }

  async create(project: Project): Promise<void> {
    await putItem("projects", project);
  }
}

export class DynamoActivityRepository implements ActivityRepository {
  async listByClientId(clientId: string): Promise<ActivityItem[]> {
    return queryGsi<ActivityItem>("activityItems", "byClientId", clientId);
  }
}

export class DynamoAttentionRepository implements AttentionRepository {
  async listByClientId(clientId: string): Promise<AttentionTask[]> {
    return queryGsi<AttentionTask>("attentionTasks", "byClientId", clientId);
  }
}

export class DynamoBriefRepository implements BriefRepository {
  async getCurrentVersion(projectId: string): Promise<BriefVersion | null> {
    const matches = await queryGsi<BriefVersion>("briefVersions", "byProjectId", projectId, { scanIndexForward: false, limit: 1 });
    return matches[0] ?? null;
  }

  async update(version: BriefVersion): Promise<void> {
    await putItem("briefVersions", version);
  }

  async create(version: BriefVersion): Promise<void> {
    await putItem("briefVersions", version);
  }
}

export class DynamoProposalRepository implements ProposalRepository {
  async listVersions(projectId: string): Promise<ProposalVersion[]> {
    return queryGsi<ProposalVersion>("proposalVersions", "byProjectId", projectId, { scanIndexForward: true });
  }

  async listAll(): Promise<ProposalVersion[]> {
    return scanAll<ProposalVersion>("proposalVersions");
  }

  async getCurrentVersion(projectId: string): Promise<ProposalVersion | null> {
    const matches = await queryGsi<ProposalVersion>("proposalVersions", "byProjectId", projectId, { scanIndexForward: false, limit: 1 });
    return matches[0] ?? null;
  }

  async findVersionById(id: string): Promise<ProposalVersion | null> {
    return getItem<ProposalVersion>("proposalVersions", id);
  }

  async update(version: ProposalVersion, tx?: Tx): Promise<void> {
    await putItem("proposalVersions", version, asTx(tx));
  }

  async create(version: ProposalVersion): Promise<void> {
    await putItem("proposalVersions", version);
  }
}

export class DynamoAcceptanceRecordRepository implements AcceptanceRecordRepository {
  async listByProjectId(projectId: string): Promise<AcceptanceRecord[]> {
    return queryGsi<AcceptanceRecord>("acceptanceRecords", "byProjectId", projectId);
  }

  async create(record: AcceptanceRecord, tx?: Tx): Promise<void> {
    await putItem("acceptanceRecords", record, asTx(tx));
  }
}

export class DynamoInvoiceRepository implements InvoiceRepository {
  async listAll(): Promise<Invoice[]> {
    return scanAll<Invoice>("invoices");
  }

  async listByProjectId(projectId: string): Promise<Invoice[]> {
    return queryGsi<Invoice>("invoices", "byProjectId", projectId);
  }

  async getDepositInvoice(projectId: string): Promise<Invoice | null> {
    const invoices = await queryGsi<Invoice>("invoices", "byProjectId", projectId);
    return invoices.find((i) => i.type === "deposit") ?? null;
  }

  async findById(id: string): Promise<Invoice | null> {
    return getItem<Invoice>("invoices", id);
  }

  async update(invoice: Invoice, tx?: Tx): Promise<void> {
    await putItem("invoices", invoice, asTx(tx));
  }
}

export class DynamoCommentRepository implements CommentRepository {
  async listByTarget(_projectId: string, targetType: CommentTargetType, targetVersionId: string): Promise<Comment[]> {
    const matches = await queryGsi<Comment>("comments", "byTargetKey", `${targetType}#${targetVersionId}`);
    return byCreatedAtAsc(matches);
  }

  async create(comment: Comment): Promise<void> {
    await putItem("comments", { ...comment, targetKey: `${comment.targetType}#${comment.targetVersionId}` });
  }
}

export class DynamoContentChecklistRepository implements ContentChecklistRepository {
  async listByProjectId(projectId: string): Promise<ContentChecklistItem[]> {
    return queryGsi<ContentChecklistItem>("contentChecklistItems", "byProjectId", projectId);
  }

  async findById(id: string): Promise<ContentChecklistItem | null> {
    return getItem<ContentChecklistItem>("contentChecklistItems", id);
  }

  async update(item: ContentChecklistItem): Promise<void> {
    await putItem("contentChecklistItems", item);
  }
}

export class DynamoContentSubmissionRepository implements ContentSubmissionRepository {
  async listByProjectId(projectId: string): Promise<ContentSubmission[]> {
    return queryGsi<ContentSubmission>("contentSubmissions", "byProjectId", projectId);
  }

  async findById(id: string): Promise<ContentSubmission | null> {
    return getItem<ContentSubmission>("contentSubmissions", id);
  }

  async create(submission: ContentSubmission): Promise<void> {
    await putItem("contentSubmissions", submission);
  }

  async update(submission: ContentSubmission): Promise<void> {
    await putItem("contentSubmissions", submission);
  }
}

export class DynamoShareLinkRepository implements ShareLinkRepository {
  async findByToken(token: string): Promise<ShareLink | null> {
    return getItem<ShareLink>("shareLinks", token);
  }

  async findByProjectId(projectId: string): Promise<ShareLink | null> {
    const matches = await queryGsi<ShareLink>("shareLinks", "byProjectId", projectId);
    return matches[0] ?? null;
  }

  async create(link: ShareLink): Promise<void> {
    await putItem("shareLinks", link);
  }
}

export class DynamoDesignVersionRepository implements DesignVersionRepository {
  async listByProjectId(projectId: string, kind: ReviewKind): Promise<DesignVersion[]> {
    return queryGsi<DesignVersion>("designVersions", "byProjectId", projectId, { skBeginsWith: `${kind}#`, scanIndexForward: true });
  }

  async getCurrentVersion(projectId: string, kind: ReviewKind): Promise<DesignVersion | null> {
    const matches = await queryGsi<DesignVersion>("designVersions", "byProjectId", projectId, {
      skBeginsWith: `${kind}#`,
      scanIndexForward: false,
      limit: 1,
    });
    return matches[0] ?? null;
  }

  async findById(id: string): Promise<DesignVersion | null> {
    return getItem<DesignVersion>("designVersions", id);
  }

  async create(version: DesignVersion): Promise<void> {
    await putItem("designVersions", { ...version, kindVersionKey: `${version.kind}#${pad(version.versionNumber)}` });
  }

  async update(version: DesignVersion): Promise<void> {
    await putItem("designVersions", { ...version, kindVersionKey: `${version.kind}#${pad(version.versionNumber)}` });
  }
}

export class DynamoDesignPinCommentRepository implements DesignPinCommentRepository {
  async listByVersionId(versionId: string): Promise<DesignPinComment[]> {
    const matches = await queryGsi<DesignPinComment>("designPinComments", "byVersionId", versionId);
    return matches.slice().sort((a, b) => a.number - b.number);
  }

  async findById(id: string): Promise<DesignPinComment | null> {
    return getItem<DesignPinComment>("designPinComments", id);
  }

  async create(comment: DesignPinComment): Promise<void> {
    await putItem("designPinComments", comment);
  }

  async update(comment: DesignPinComment): Promise<void> {
    await putItem("designPinComments", comment);
  }
}

export class DynamoRevisionRoundRepository implements RevisionRoundRepository {
  async listByProjectId(projectId: string, kind: ReviewKind): Promise<RevisionRound[]> {
    return queryGsi<RevisionRound>("revisionRounds", "byProjectId", projectId, { skBeginsWith: `${kind}#`, scanIndexForward: true });
  }

  async findById(id: string): Promise<RevisionRound | null> {
    return getItem<RevisionRound>("revisionRounds", id);
  }

  async create(round: RevisionRound): Promise<void> {
    await putItem("revisionRounds", { ...round, kindRoundKey: `${round.kind}#${pad(round.roundNumber)}` });
  }

  async update(round: RevisionRound): Promise<void> {
    await putItem("revisionRounds", { ...round, kindRoundKey: `${round.kind}#${pad(round.roundNumber)}` });
  }
}

export class DynamoScopeChangeRepository implements ScopeChangeRepository {
  async listByProjectId(projectId: string): Promise<ScopeChange[]> {
    const matches = await queryGsi<ScopeChange>("scopeChanges", "byProjectId", projectId);
    return byCreatedAtAsc(matches);
  }

  async findById(id: string): Promise<ScopeChange | null> {
    return getItem<ScopeChange>("scopeChanges", id);
  }

  async create(scopeChange: ScopeChange): Promise<void> {
    await putItem("scopeChanges", scopeChange);
  }

  async update(scopeChange: ScopeChange, tx?: Tx): Promise<void> {
    await putItem("scopeChanges", scopeChange, asTx(tx));
  }
}

export class DynamoHandoverResourceRepository implements HandoverResourceRepository {
  async listByProjectId(projectId: string): Promise<HandoverResource[]> {
    const matches = await queryGsi<HandoverResource>("handoverResources", "byProjectId", projectId);
    return matches.slice().sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
  }

  async findById(id: string): Promise<HandoverResource | null> {
    return getItem<HandoverResource>("handoverResources", id);
  }

  async create(resource: HandoverResource): Promise<void> {
    await putItem("handoverResources", resource);
  }

  async delete(id: string): Promise<void> {
    await deleteItem("handoverResources", id);
  }
}

export class DynamoProjectMessageRepository implements ProjectMessageRepository {
  async listByProjectId(projectId: string): Promise<ProjectMessage[]> {
    return queryGsi<ProjectMessage>("projectMessages", "byProjectId", projectId, { scanIndexForward: true });
  }

  async listAll(): Promise<ProjectMessage[]> {
    return scanAll<ProjectMessage>("projectMessages");
  }

  async create(message: ProjectMessage): Promise<void> {
    await putItem("projectMessages", message);
  }
}

export class DynamoConversationReadRepository implements ConversationReadRepository {
  async find(projectId: string, userId: string): Promise<ConversationRead | null> {
    return getItem<ConversationRead>("conversationReads", `${projectId}#${userId}`);
  }

  async upsert(read: ConversationRead): Promise<void> {
    await putItem("conversationReads", { ...read, id: `${read.projectId}#${read.userId}` });
  }
}

export class DynamoNotificationRepository implements NotificationRepository {
  async create(notification: Notification, tx?: Tx): Promise<void> {
    await putItem("notifications", notification, asTx(tx));
  }

  async listByProjectId(projectId: string): Promise<Notification[]> {
    return queryGsi<Notification>("notifications", "byProjectId", projectId);
  }

  async listAll(): Promise<Notification[]> {
    return scanAll<Notification>("notifications");
  }

  async findById(id: string): Promise<Notification | null> {
    return getItem<Notification>("notifications", id);
  }

  async update(notification: Notification): Promise<void> {
    await putItem("notifications", notification);
  }
}

export class DynamoProjectBoardColumnRepository implements ProjectBoardColumnRepository {
  async listAll(): Promise<ProjectBoardColumn[]> {
    const items = await scanAll<ProjectBoardColumn>("projectBoardColumns");
    return items.slice().sort((a, b) => a.order - b.order);
  }

  async findById(id: string): Promise<ProjectBoardColumn | null> {
    return getItem<ProjectBoardColumn>("projectBoardColumns", id);
  }

  async create(column: ProjectBoardColumn): Promise<void> {
    await putItem("projectBoardColumns", column);
  }

  async update(column: ProjectBoardColumn): Promise<void> {
    await putItem("projectBoardColumns", column);
  }

  async delete(id: string): Promise<void> {
    await deleteItem("projectBoardColumns", id);
  }
}

export class DynamoContactStageRepository implements ContactStageRepository {
  async listAll(): Promise<ContactStage[]> {
    const items = await scanAll<ContactStage>("contactStages");
    return items.slice().sort((a, b) => a.order - b.order);
  }

  async findById(id: string): Promise<ContactStage | null> {
    return getItem<ContactStage>("contactStages", id);
  }

  async create(stage: ContactStage): Promise<void> {
    await putItem("contactStages", stage);
  }

  async update(stage: ContactStage): Promise<void> {
    await putItem("contactStages", stage);
  }

  async delete(id: string): Promise<void> {
    await deleteItem("contactStages", id);
  }
}

export class DynamoContactRepository implements ContactRepository {
  async listAll(): Promise<Contact[]> {
    return scanAll<Contact>("contacts");
  }

  async findById(id: string): Promise<Contact | null> {
    return getItem<Contact>("contacts", id);
  }

  async create(contact: Contact): Promise<void> {
    await putItem("contacts", contact);
  }

  async update(contact: Contact): Promise<void> {
    await putItem("contacts", contact);
  }
}

export class DynamoContactActivityRepository implements ContactActivityRepository {
  async listByContactId(contactId: string): Promise<ContactActivity[]> {
    const matches = await queryGsi<ContactActivity>("contactActivities", "byContactId", contactId);
    return byCreatedAtDesc(matches);
  }

  async create(activity: ContactActivity): Promise<void> {
    await putItem("contactActivities", activity);
  }
}

export class DynamoAgencySettingsRepository implements AgencySettingsRepository {
  async get(): Promise<AgencySettings> {
    const record = await getItem<AgencySettings>("agencySettings", AGENCY_SETTINGS_SINGLETON_ID);
    return record as AgencySettings;
  }

  async update(settings: AgencySettings): Promise<void> {
    await putItem("agencySettings", { ...settings, id: AGENCY_SETTINGS_SINGLETON_ID });
  }
}

export class DynamoUploadedFileRepository implements UploadedFileRepository {
  async findById(id: string): Promise<UploadedFile | null> {
    return getItem<UploadedFile>("uploadedFiles", id);
  }

  async listByProjectId(projectId: string): Promise<UploadedFile[]> {
    const matches = await queryGsi<UploadedFile>("uploadedFiles", "byProjectId", projectId);
    return byCreatedAtDesc(matches);
  }

  async create(file: UploadedFile): Promise<void> {
    await putItem("uploadedFiles", file);
  }
}

export class DynamoInviteRepository implements InviteRepository {
  async findByTokenHash(tokenHash: string): Promise<Invite | null> {
    const matches = await queryGsi<Invite>("invites", "byTokenHash", tokenHash);
    return matches[0] ?? null;
  }

  async create(invite: Invite): Promise<void> {
    await putItem("invites", invite);
  }

  async update(invite: Invite): Promise<void> {
    await putItem("invites", invite);
  }
}

export class DynamoPasswordResetTokenRepository implements PasswordResetTokenRepository {
  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const matches = await queryGsi<PasswordResetToken>("passwordResetTokens", "byTokenHash", tokenHash);
    return matches[0] ?? null;
  }

  async create(token: PasswordResetToken): Promise<void> {
    await putItem("passwordResetTokens", token);
  }

  async update(token: PasswordResetToken): Promise<void> {
    await putItem("passwordResetTokens", token);
  }
}
