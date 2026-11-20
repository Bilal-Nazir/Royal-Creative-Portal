import type { ClientSession } from "mongoose";
import { getMongoose } from "../../db/mongoose";
import {
  UserModel,
  ProjectModel,
  ActivityItemModel,
  AttentionTaskModel,
  BriefVersionModel,
  ProposalVersionModel,
  AcceptanceRecordModel,
  InvoiceModel,
  CommentModel,
  ContentChecklistItemModel,
  ContentSubmissionModel,
  ShareLinkModel,
  DesignVersionModel,
  DesignPinCommentModel,
  RevisionRoundModel,
  ProjectMessageModel,
  ConversationReadModel,
  NotificationModel,
  UploadedFileModel,
  ScopeChangeModel,
  HandoverResourceModel,
  ContactStageModel,
  ContactModel,
  ContactActivityModel,
  AgencySettingsModel,
  AGENCY_SETTINGS_SINGLETON_ID,
  InviteModel,
  PasswordResetTokenModel,
} from "../../db/models";
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
  ProjectMessageRepository,
  ConversationReadRepository,
  NotificationRepository,
  UploadedFileRepository,
  ScopeChangeRepository,
  HandoverResourceRepository,
  ContactStageRepository,
  ContactRepository,
  ContactActivityRepository,
  AgencySettingsRepository,
  InviteRepository,
  PasswordResetTokenRepository,
} from "../interfaces";
import type { User } from "../../domain/user";
import type { Project, ActivityItem, AttentionTask } from "../../domain/project";
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

/** Strips Mongo bookkeeping and renames `_id` -> the domain's own `id` field. For every entity whose domain type has an `id`. */
function toDomain<T>(doc: Record<string, unknown> | null): T | null {
  if (!doc) return null;
  const { _id, __v, _createdAt, _updatedAt, ...rest } = doc;
  return { id: _id, ...rest } as T;
}

/** For the two singleton-shaped entities (ShareLink keyed by `token`, AgencySettings keyed by nothing) whose domain type has no `id` field at all. */
function toDomainNoId<T>(doc: Record<string, unknown> | null): T | null {
  if (!doc) return null;
  const { _id, __v, _createdAt, _updatedAt, ...rest } = doc;
  return rest as T;
}

function fromDomain<T extends { id: string }>(value: T): Record<string, unknown> {
  const { id, ...rest } = value;
  return { _id: id, ...rest };
}

/** `.lean()` results are untyped `Record<string, unknown>` — these are the only places that read a field off one for sort comparisons. */
function dateMs(doc: Record<string, unknown>, field: string): number {
  return new Date(doc[field] as string).getTime();
}

function numField(doc: Record<string, unknown>, field: string): number {
  return doc[field] as number;
}

async function ready(): Promise<void> {
  await getMongoose();
}

export class MongoUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    await ready();
    const doc = await UserModel.findOne({ email: email.trim().toLowerCase() }).lean();
    return toDomain<User>(doc);
  }

  async findById(id: string): Promise<User | null> {
    await ready();
    return toDomain<User>(await UserModel.findById(id).lean());
  }

  async listAgencyUsers(): Promise<User[]> {
    await ready();
    const docs = await UserModel.find({ role: "agency" }).lean();
    return docs.map((d) => toDomain<User>(d)!);
  }

  async listClientUsers(): Promise<User[]> {
    await ready();
    const docs = await UserModel.find({ role: "client" }).lean();
    return docs.map((d) => toDomain<User>(d)!);
  }

  async create(user: User): Promise<void> {
    await ready();
    await UserModel.create(fromDomain(user));
  }

  async update(user: User): Promise<void> {
    await ready();
    await UserModel.findOneAndUpdate({ _id: user.id }, fromDomain(user));
  }

  async remove(id: string): Promise<void> {
    await ready();
    await UserModel.deleteOne({ _id: id });
  }
}

export class MongoProjectRepository implements ProjectRepository {
  async listAll(): Promise<Project[]> {
    await ready();
    return (await ProjectModel.find().lean()).map((d) => toDomain<Project>(d)!);
  }

  async listByClientId(clientId: string): Promise<Project[]> {
    await ready();
    return (await ProjectModel.find({ clientId }).lean()).map((d) => toDomain<Project>(d)!);
  }

  async listByAssigneeId(assigneeId: string): Promise<Project[]> {
    await ready();
    return (await ProjectModel.find({ assigneeId }).lean()).map((d) => toDomain<Project>(d)!);
  }

  async findById(id: string): Promise<Project | null> {
    await ready();
    return toDomain<Project>(await ProjectModel.findById(id).lean());
  }

  async update(project: Project, session?: ClientSession | null): Promise<void> {
    await ready();
    await ProjectModel.findOneAndUpdate({ _id: project.id }, fromDomain(project), { session });
  }

  async create(project: Project): Promise<void> {
    await ready();
    await ProjectModel.create(fromDomain(project));
  }
}

/** Read-only in the real app too (activity feed / attention tasks are never mutated) — same semantics as the in-memory version, just Mongo-backed. */
export class MongoActivityRepository implements ActivityRepository {
  async listByClientId(clientId: string): Promise<ActivityItem[]> {
    await ready();
    const projectIds = (await ProjectModel.find({ clientId }).select("_id").lean()).map((p) => String(p._id));
    const docs = await ActivityItemModel.find({ projectId: { $in: projectIds } }).lean();
    return docs.map((d) => toDomain<ActivityItem>(d)!);
  }
}

export class MongoAttentionRepository implements AttentionRepository {
  async listByClientId(clientId: string): Promise<AttentionTask[]> {
    await ready();
    const projectIds = (await ProjectModel.find({ clientId }).select("_id").lean()).map((p) => String(p._id));
    const docs = await AttentionTaskModel.find({ projectId: { $in: projectIds } }).lean();
    return docs.map((d) => toDomain<AttentionTask>(d)!);
  }
}

export class MongoBriefRepository implements BriefRepository {
  async getCurrentVersion(projectId: string): Promise<BriefVersion | null> {
    await ready();
    const docs = await BriefVersionModel.find({ projectId }).lean();
    if (docs.length === 0) return null;
    const latest = docs.reduce((a, b) => (numField(b, "versionNumber") > numField(a, "versionNumber") ? b : a));
    return toDomain<BriefVersion>(latest);
  }

  async update(version: BriefVersion): Promise<void> {
    await ready();
    await BriefVersionModel.findOneAndUpdate({ _id: version.id }, fromDomain(version));
  }

  async create(version: BriefVersion): Promise<void> {
    await ready();
    await BriefVersionModel.create(fromDomain(version));
  }
}

export class MongoProposalRepository implements ProposalRepository {
  async listVersions(projectId: string): Promise<ProposalVersion[]> {
    await ready();
    const docs = await ProposalVersionModel.find({ projectId }).lean();
    return docs.sort((a, b) => numField(a, "versionNumber") - numField(b, "versionNumber")).map((d) => toDomain<ProposalVersion>(d)!);
  }

  async listAll(): Promise<ProposalVersion[]> {
    await ready();
    return (await ProposalVersionModel.find().lean()).map((d) => toDomain<ProposalVersion>(d)!);
  }

  async getCurrentVersion(projectId: string): Promise<ProposalVersion | null> {
    await ready();
    const docs = await ProposalVersionModel.find({ projectId }).lean();
    if (docs.length === 0) return null;
    const latest = docs.reduce((a, b) => (numField(b, "versionNumber") > numField(a, "versionNumber") ? b : a));
    return toDomain<ProposalVersion>(latest);
  }

  async findVersionById(id: string): Promise<ProposalVersion | null> {
    await ready();
    return toDomain<ProposalVersion>(await ProposalVersionModel.findById(id).lean());
  }

  async update(version: ProposalVersion, session?: ClientSession | null): Promise<void> {
    await ready();
    await ProposalVersionModel.findOneAndUpdate({ _id: version.id }, fromDomain(version), { session });
  }

  async create(version: ProposalVersion): Promise<void> {
    await ready();
    await ProposalVersionModel.create(fromDomain(version));
  }
}

export class MongoAcceptanceRecordRepository implements AcceptanceRecordRepository {
  async listByProjectId(projectId: string): Promise<AcceptanceRecord[]> {
    await ready();
    return (await AcceptanceRecordModel.find({ projectId }).lean()).map((d) => toDomain<AcceptanceRecord>(d)!);
  }

  async create(record: AcceptanceRecord, session?: ClientSession | null): Promise<void> {
    await ready();
    await AcceptanceRecordModel.create([fromDomain(record)], { session });
  }
}

/** `update` upserts (push-or-replace), matching the in-memory repo exactly — invoice ids are already deterministic (`inv-{projectId}-{type}`), so this is also where concurrent-accept duplicate protection lives (Mongo's default unique _id index). */
export class MongoInvoiceRepository implements InvoiceRepository {
  async listAll(): Promise<Invoice[]> {
    await ready();
    return (await InvoiceModel.find().lean()).map((d) => toDomain<Invoice>(d)!);
  }

  async listByProjectId(projectId: string): Promise<Invoice[]> {
    await ready();
    return (await InvoiceModel.find({ projectId }).lean()).map((d) => toDomain<Invoice>(d)!);
  }

  async getDepositInvoice(projectId: string): Promise<Invoice | null> {
    await ready();
    return toDomain<Invoice>(await InvoiceModel.findOne({ projectId, type: "deposit" }).lean());
  }

  async findById(id: string): Promise<Invoice | null> {
    await ready();
    return toDomain<Invoice>(await InvoiceModel.findById(id).lean());
  }

  async update(invoice: Invoice, session?: ClientSession | null): Promise<void> {
    await ready();
    await InvoiceModel.findOneAndUpdate({ _id: invoice.id }, fromDomain(invoice), { upsert: true, session });
  }
}

export class MongoCommentRepository implements CommentRepository {
  async listByTarget(projectId: string, targetType: CommentTargetType, targetVersionId: string): Promise<Comment[]> {
    await ready();
    const docs = await CommentModel.find({ projectId, targetType, targetVersionId }).lean();
    return docs
      .sort((a, b) => dateMs(a, "createdAt") - dateMs(b, "createdAt"))
      .map((d) => toDomain<Comment>(d)!);
  }

  async create(comment: Comment): Promise<void> {
    await ready();
    await CommentModel.create(fromDomain(comment));
  }
}

export class MongoContentChecklistRepository implements ContentChecklistRepository {
  async listByProjectId(projectId: string): Promise<ContentChecklistItem[]> {
    await ready();
    return (await ContentChecklistItemModel.find({ projectId }).lean()).map((d) => toDomain<ContentChecklistItem>(d)!);
  }

  async findById(id: string): Promise<ContentChecklistItem | null> {
    await ready();
    return toDomain<ContentChecklistItem>(await ContentChecklistItemModel.findById(id).lean());
  }

  async update(item: ContentChecklistItem): Promise<void> {
    await ready();
    await ContentChecklistItemModel.findOneAndUpdate({ _id: item.id }, fromDomain(item));
  }
}

export class MongoContentSubmissionRepository implements ContentSubmissionRepository {
  async listByProjectId(projectId: string): Promise<ContentSubmission[]> {
    await ready();
    return (await ContentSubmissionModel.find({ projectId }).lean()).map((d) => toDomain<ContentSubmission>(d)!);
  }

  async findById(id: string): Promise<ContentSubmission | null> {
    await ready();
    return toDomain<ContentSubmission>(await ContentSubmissionModel.findById(id).lean());
  }

  async create(submission: ContentSubmission): Promise<void> {
    await ready();
    await ContentSubmissionModel.create(fromDomain(submission));
  }

  async update(submission: ContentSubmission): Promise<void> {
    await ready();
    await ContentSubmissionModel.findOneAndUpdate({ _id: submission.id }, fromDomain(submission));
  }
}

export class MongoShareLinkRepository implements ShareLinkRepository {
  async findByToken(token: string): Promise<ShareLink | null> {
    await ready();
    return toDomainNoId<ShareLink>(await ShareLinkModel.findOne({ token }).lean());
  }

  async findByProjectId(projectId: string): Promise<ShareLink | null> {
    await ready();
    return toDomainNoId<ShareLink>(await ShareLinkModel.findOne({ projectId }).lean());
  }

  async create(link: ShareLink): Promise<void> {
    await ready();
    await ShareLinkModel.create({ ...link });
  }
}

export class MongoDesignVersionRepository implements DesignVersionRepository {
  async listByProjectId(projectId: string, kind: ReviewKind): Promise<DesignVersion[]> {
    await ready();
    const docs = await DesignVersionModel.find({ projectId, kind }).lean();
    return docs.sort((a, b) => numField(a, "versionNumber") - numField(b, "versionNumber")).map((d) => toDomain<DesignVersion>(d)!);
  }

  async getCurrentVersion(projectId: string, kind: ReviewKind): Promise<DesignVersion | null> {
    await ready();
    const docs = await DesignVersionModel.find({ projectId, kind }).lean();
    if (docs.length === 0) return null;
    const latest = docs.reduce((a, b) => (numField(b, "versionNumber") > numField(a, "versionNumber") ? b : a));
    return toDomain<DesignVersion>(latest);
  }

  async findById(id: string): Promise<DesignVersion | null> {
    await ready();
    return toDomain<DesignVersion>(await DesignVersionModel.findById(id).lean());
  }

  async create(version: DesignVersion): Promise<void> {
    await ready();
    await DesignVersionModel.create(fromDomain(version));
  }

  async update(version: DesignVersion): Promise<void> {
    await ready();
    await DesignVersionModel.findOneAndUpdate({ _id: version.id }, fromDomain(version));
  }
}

export class MongoDesignPinCommentRepository implements DesignPinCommentRepository {
  async listByVersionId(versionId: string): Promise<DesignPinComment[]> {
    await ready();
    const docs = await DesignPinCommentModel.find({ designVersionId: versionId }).lean();
    return docs.sort((a, b) => numField(a, "number") - numField(b, "number")).map((d) => toDomain<DesignPinComment>(d)!);
  }

  async findById(id: string): Promise<DesignPinComment | null> {
    await ready();
    return toDomain<DesignPinComment>(await DesignPinCommentModel.findById(id).lean());
  }

  async create(comment: DesignPinComment): Promise<void> {
    await ready();
    await DesignPinCommentModel.create(fromDomain(comment));
  }

  async update(comment: DesignPinComment): Promise<void> {
    await ready();
    await DesignPinCommentModel.findOneAndUpdate({ _id: comment.id }, fromDomain(comment));
  }
}

export class MongoRevisionRoundRepository implements RevisionRoundRepository {
  async listByProjectId(projectId: string, kind: ReviewKind): Promise<RevisionRound[]> {
    await ready();
    const docs = await RevisionRoundModel.find({ projectId, kind }).lean();
    return docs.sort((a, b) => numField(a, "roundNumber") - numField(b, "roundNumber")).map((d) => toDomain<RevisionRound>(d)!);
  }

  async findById(id: string): Promise<RevisionRound | null> {
    await ready();
    return toDomain<RevisionRound>(await RevisionRoundModel.findById(id).lean());
  }

  async create(round: RevisionRound): Promise<void> {
    await ready();
    await RevisionRoundModel.create(fromDomain(round));
  }

  async update(round: RevisionRound): Promise<void> {
    await ready();
    await RevisionRoundModel.findOneAndUpdate({ _id: round.id }, fromDomain(round));
  }
}

export class MongoProjectMessageRepository implements ProjectMessageRepository {
  async listByProjectId(projectId: string): Promise<ProjectMessage[]> {
    await ready();
    const docs = await ProjectMessageModel.find({ projectId }).lean();
    return docs
      .sort((a, b) => dateMs(a, "createdAt") - dateMs(b, "createdAt"))
      .map((d) => toDomain<ProjectMessage>(d)!);
  }

  async listAll(): Promise<ProjectMessage[]> {
    await ready();
    return (await ProjectMessageModel.find().lean()).map((d) => toDomain<ProjectMessage>(d)!);
  }

  async create(message: ProjectMessage): Promise<void> {
    await ready();
    await ProjectMessageModel.create(fromDomain(message));
  }
}

export class MongoConversationReadRepository implements ConversationReadRepository {
  async find(projectId: string, userId: string): Promise<ConversationRead | null> {
    await ready();
    return toDomain<ConversationRead>(await ConversationReadModel.findOne({ projectId, userId }).lean());
  }

  async upsert(read: ConversationRead): Promise<void> {
    await ready();
    await ConversationReadModel.findOneAndUpdate({ projectId: read.projectId, userId: read.userId }, fromDomain(read), {
      upsert: true,
    });
  }
}

export class MongoNotificationRepository implements NotificationRepository {
  async create(notification: Notification, session?: ClientSession | null): Promise<void> {
    await ready();
    await NotificationModel.create([fromDomain(notification)], { session });
  }

  async listByProjectId(projectId: string): Promise<Notification[]> {
    await ready();
    return (await NotificationModel.find({ projectId }).lean()).map((d) => toDomain<Notification>(d)!);
  }

  async listAll(): Promise<Notification[]> {
    await ready();
    return (await NotificationModel.find().lean()).map((d) => toDomain<Notification>(d)!);
  }

  async findById(id: string): Promise<Notification | null> {
    await ready();
    return toDomain<Notification>(await NotificationModel.findById(id).lean());
  }

  async update(notification: Notification): Promise<void> {
    await ready();
    await NotificationModel.findOneAndUpdate({ _id: notification.id }, fromDomain(notification));
  }
}

export class MongoContactStageRepository implements ContactStageRepository {
  async listAll(): Promise<ContactStage[]> {
    await ready();
    const docs = await ContactStageModel.find().lean();
    return docs.sort((a, b) => numField(a, "order") - numField(b, "order")).map((d) => toDomain<ContactStage>(d)!);
  }

  async findById(id: string): Promise<ContactStage | null> {
    await ready();
    return toDomain<ContactStage>(await ContactStageModel.findById(id).lean());
  }

  async create(stage: ContactStage): Promise<void> {
    await ready();
    await ContactStageModel.create(fromDomain(stage));
  }

  async update(stage: ContactStage): Promise<void> {
    await ready();
    await ContactStageModel.findOneAndUpdate({ _id: stage.id }, fromDomain(stage));
  }

  async delete(id: string): Promise<void> {
    await ready();
    await ContactStageModel.deleteOne({ _id: id });
  }
}

export class MongoContactRepository implements ContactRepository {
  async listAll(): Promise<Contact[]> {
    await ready();
    return (await ContactModel.find().lean()).map((d) => toDomain<Contact>(d)!);
  }

  async findById(id: string): Promise<Contact | null> {
    await ready();
    return toDomain<Contact>(await ContactModel.findById(id).lean());
  }

  async create(contact: Contact): Promise<void> {
    await ready();
    await ContactModel.create(fromDomain(contact));
  }

  async update(contact: Contact): Promise<void> {
    await ready();
    await ContactModel.findOneAndUpdate({ _id: contact.id }, fromDomain(contact));
  }
}

export class MongoContactActivityRepository implements ContactActivityRepository {
  async listByContactId(contactId: string): Promise<ContactActivity[]> {
    await ready();
    const docs = await ContactActivityModel.find({ contactId }).lean();
    return docs
      .sort((a, b) => dateMs(b, "createdAt") - dateMs(a, "createdAt"))
      .map((d) => toDomain<ContactActivity>(d)!);
  }

  async create(activity: ContactActivity): Promise<void> {
    await ready();
    await ContactActivityModel.create(fromDomain(activity));
  }
}

export class MongoAgencySettingsRepository implements AgencySettingsRepository {
  async get(): Promise<AgencySettings> {
    await ready();
    const doc = await AgencySettingsModel.findById(AGENCY_SETTINGS_SINGLETON_ID).lean();
    return toDomainNoId<AgencySettings>(doc)!;
  }

  async update(settings: AgencySettings): Promise<void> {
    await ready();
    await AgencySettingsModel.findOneAndUpdate({ _id: AGENCY_SETTINGS_SINGLETON_ID }, { ...settings }, { upsert: true });
  }
}

export class MongoUploadedFileRepository implements UploadedFileRepository {
  async findById(id: string): Promise<UploadedFile | null> {
    await ready();
    return toDomain<UploadedFile>(await UploadedFileModel.findById(id).lean());
  }

  async listByProjectId(projectId: string): Promise<UploadedFile[]> {
    await ready();
    const docs = await UploadedFileModel.find({ projectId }).lean();
    return docs
      .sort((a, b) => dateMs(b, "createdAt") - dateMs(a, "createdAt"))
      .map((d) => toDomain<UploadedFile>(d)!);
  }

  async create(file: UploadedFile): Promise<void> {
    await ready();
    await UploadedFileModel.create(fromDomain(file));
  }
}

export class MongoScopeChangeRepository implements ScopeChangeRepository {
  async listByProjectId(projectId: string): Promise<ScopeChange[]> {
    await ready();
    const docs = await ScopeChangeModel.find({ projectId }).lean();
    return docs
      .sort((a, b) => dateMs(a, "createdAt") - dateMs(b, "createdAt"))
      .map((d) => toDomain<ScopeChange>(d)!);
  }

  async findById(id: string): Promise<ScopeChange | null> {
    await ready();
    return toDomain<ScopeChange>(await ScopeChangeModel.findById(id).lean());
  }

  async create(scopeChange: ScopeChange): Promise<void> {
    await ready();
    await ScopeChangeModel.create(fromDomain(scopeChange));
  }

  async update(scopeChange: ScopeChange, session?: ClientSession | null): Promise<void> {
    await ready();
    await ScopeChangeModel.findOneAndUpdate({ _id: scopeChange.id }, fromDomain(scopeChange), { session });
  }
}

export class MongoHandoverResourceRepository implements HandoverResourceRepository {
  async listByProjectId(projectId: string): Promise<HandoverResource[]> {
    await ready();
    const docs = await HandoverResourceModel.find({ projectId }).lean();
    return docs
      .sort((a, b) => dateMs(a, "addedAt") - dateMs(b, "addedAt"))
      .map((d) => toDomain<HandoverResource>(d)!);
  }

  async findById(id: string): Promise<HandoverResource | null> {
    await ready();
    return toDomain<HandoverResource>(await HandoverResourceModel.findById(id).lean());
  }

  async create(resource: HandoverResource): Promise<void> {
    await ready();
    await HandoverResourceModel.create(fromDomain(resource));
  }

  async delete(id: string): Promise<void> {
    await ready();
    await HandoverResourceModel.deleteOne({ _id: id });
  }
}

export class MongoInviteRepository implements InviteRepository {
  async findByTokenHash(tokenHash: string): Promise<Invite | null> {
    await ready();
    return toDomain<Invite>(await InviteModel.findOne({ tokenHash }).lean());
  }

  async create(invite: Invite): Promise<void> {
    await ready();
    await InviteModel.create(fromDomain(invite));
  }

  async update(invite: Invite): Promise<void> {
    await ready();
    await InviteModel.findOneAndUpdate({ _id: invite.id }, fromDomain(invite));
  }
}

export class MongoPasswordResetTokenRepository implements PasswordResetTokenRepository {
  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    await ready();
    return toDomain<PasswordResetToken>(await PasswordResetTokenModel.findOne({ tokenHash }).lean());
  }

  async create(token: PasswordResetToken): Promise<void> {
    await ready();
    await PasswordResetTokenModel.create(fromDomain(token));
  }

  async update(token: PasswordResetToken): Promise<void> {
    await ready();
    await PasswordResetTokenModel.findOneAndUpdate({ _id: token.id }, fromDomain(token));
  }
}
