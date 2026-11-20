import type { User } from "../domain/user";
import type { Project, ActivityItem, AttentionTask } from "../domain/project";
import type { BriefVersion } from "../domain/brief";
import type { ProposalVersion, AcceptanceRecord } from "../domain/proposal";
import type { Invoice } from "../domain/invoice";
import type { Comment, CommentTargetType } from "../domain/comment";
import type { ContentChecklistItem, ContentSubmission } from "../domain/content";
import type { ShareLink } from "../domain/share-link";
import type { DesignVersion, DesignPinComment, RevisionRound, ReviewKind } from "../domain/design";
import type { ProjectMessage, ConversationRead } from "../domain/message";
import type { Notification } from "../domain/notification";
import type { UploadedFile } from "../domain/upload";
import type { ScopeChange } from "../domain/scope-change";
import type { HandoverResource } from "../domain/handover-resource";
import type { Contact, ContactStage, ContactActivity } from "../domain/contact";
import type { AgencySettings } from "../domain/settings";

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  /** A20 Team & access — agency users only, owner/admin-managed (Phase 3). */
  listAgencyUsers(): Promise<User[]>;
  /** A04's client directory (Phase 3) — real client users, not a hardcoded map. */
  listClientUsers(): Promise<User[]>;
  create(user: User): Promise<void>;
  update(user: User): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface ProjectRepository {
  listAll(): Promise<Project[]>;
  listByClientId(clientId: string): Promise<Project[]>;
  listByAssigneeId(assigneeId: string): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  update(project: Project): Promise<void>;
  create(project: Project): Promise<void>;
}

export interface ActivityRepository {
  listByClientId(clientId: string): Promise<ActivityItem[]>;
}

export interface AttentionRepository {
  listByClientId(clientId: string): Promise<AttentionTask[]>;
}

export interface BriefRepository {
  getCurrentVersion(projectId: string): Promise<BriefVersion | null>;
  update(version: BriefVersion): Promise<void>;
  create(version: BriefVersion): Promise<void>;
}

export interface ProposalRepository {
  listVersions(projectId: string): Promise<ProposalVersion[]>;
  /** A00's "Proposal acceptance" commercial metric (Phase 3) — every version across every project. */
  listAll(): Promise<ProposalVersion[]>;
  getCurrentVersion(projectId: string): Promise<ProposalVersion | null>;
  findVersionById(id: string): Promise<ProposalVersion | null>;
  update(version: ProposalVersion): Promise<void>;
  create(version: ProposalVersion): Promise<void>;
}

export interface AcceptanceRecordRepository {
  listByProjectId(projectId: string): Promise<AcceptanceRecord[]>;
  create(record: AcceptanceRecord): Promise<void>;
}

export interface InvoiceRepository {
  listAll(): Promise<Invoice[]>;
  listByProjectId(projectId: string): Promise<Invoice[]>;
  getDepositInvoice(projectId: string): Promise<Invoice | null>;
  findById(id: string): Promise<Invoice | null>;
  update(invoice: Invoice): Promise<void>;
}

export interface CommentRepository {
  listByTarget(projectId: string, targetType: CommentTargetType, targetVersionId: string): Promise<Comment[]>;
  create(comment: Comment): Promise<void>;
}

export interface ContentChecklistRepository {
  listByProjectId(projectId: string): Promise<ContentChecklistItem[]>;
  findById(id: string): Promise<ContentChecklistItem | null>;
  update(item: ContentChecklistItem): Promise<void>;
}

export interface ContentSubmissionRepository {
  listByProjectId(projectId: string): Promise<ContentSubmission[]>;
  findById(id: string): Promise<ContentSubmission | null>;
  create(submission: ContentSubmission): Promise<void>;
  update(submission: ContentSubmission): Promise<void>;
}

export interface ShareLinkRepository {
  findByToken(token: string): Promise<ShareLink | null>;
  findByProjectId(projectId: string): Promise<ShareLink | null>;
  create(link: ShareLink): Promise<void>;
}

export interface DesignVersionRepository {
  listByProjectId(projectId: string, kind: ReviewKind): Promise<DesignVersion[]>;
  getCurrentVersion(projectId: string, kind: ReviewKind): Promise<DesignVersion | null>;
  findById(id: string): Promise<DesignVersion | null>;
  create(version: DesignVersion): Promise<void>;
  update(version: DesignVersion): Promise<void>;
}

export interface DesignPinCommentRepository {
  listByVersionId(versionId: string): Promise<DesignPinComment[]>;
  findById(id: string): Promise<DesignPinComment | null>;
  create(comment: DesignPinComment): Promise<void>;
  update(comment: DesignPinComment): Promise<void>;
}

export interface RevisionRoundRepository {
  listByProjectId(projectId: string, kind: ReviewKind): Promise<RevisionRound[]>;
  findById(id: string): Promise<RevisionRound | null>;
  create(round: RevisionRound): Promise<void>;
  update(round: RevisionRound): Promise<void>;
}

export interface ScopeChangeRepository {
  listByProjectId(projectId: string): Promise<ScopeChange[]>;
  findById(id: string): Promise<ScopeChange | null>;
  create(scopeChange: ScopeChange): Promise<void>;
  update(scopeChange: ScopeChange): Promise<void>;
}

export interface HandoverResourceRepository {
  listByProjectId(projectId: string): Promise<HandoverResource[]>;
  findById(id: string): Promise<HandoverResource | null>;
  create(resource: HandoverResource): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ProjectMessageRepository {
  listByProjectId(projectId: string): Promise<ProjectMessage[]>;
  listAll(): Promise<ProjectMessage[]>;
  create(message: ProjectMessage): Promise<void>;
}

export interface ConversationReadRepository {
  find(projectId: string, userId: string): Promise<ConversationRead | null>;
  upsert(read: ConversationRead): Promise<void>;
}

export interface NotificationRepository {
  create(notification: Notification): Promise<void>;
  listByProjectId(projectId: string): Promise<Notification[]>;
  listAll(): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  update(notification: Notification): Promise<void>;
}

export interface ContactStageRepository {
  listAll(): Promise<ContactStage[]>;
  findById(id: string): Promise<ContactStage | null>;
  create(stage: ContactStage): Promise<void>;
  update(stage: ContactStage): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ContactRepository {
  listAll(): Promise<Contact[]>;
  findById(id: string): Promise<Contact | null>;
  create(contact: Contact): Promise<void>;
  update(contact: Contact): Promise<void>;
}

export interface ContactActivityRepository {
  listByContactId(contactId: string): Promise<ContactActivity[]>;
  create(activity: ContactActivity): Promise<void>;
}

export interface AgencySettingsRepository {
  get(): Promise<AgencySettings>;
  update(settings: AgencySettings): Promise<void>;
}

export interface UploadedFileRepository {
  findById(id: string): Promise<UploadedFile | null>;
  /** Client/agency "Files" nav pages (Phase 3) — every file shared on a project, both directions. */
  listByProjectId(projectId: string): Promise<UploadedFile[]>;
  create(file: UploadedFile): Promise<void>;
}
