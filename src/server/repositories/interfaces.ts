import type { User } from "../domain/user";
import type { Project, ActivityItem, AttentionTask } from "../domain/project";
import type { AgencyOverview } from "../domain/dashboard";
import type { BriefVersion } from "../domain/brief";
import type { ProposalVersion, AcceptanceRecord } from "../domain/proposal";
import type { Invoice } from "../domain/invoice";
import type { Comment, CommentTargetType } from "../domain/comment";
import type { ContentChecklistItem, ContentSubmission } from "../domain/content";
import type { ShareLink } from "../domain/share-link";
import type { DesignVersion, DesignPinComment, RevisionRound } from "../domain/design";
import type { ProjectMessage } from "../domain/message";
import type { Notification } from "../domain/notification";
import type { UploadedFile } from "../domain/upload";

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
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

export interface AgencyStatsRepository {
  getOverview(): Promise<AgencyOverview>;
}

export interface BriefRepository {
  getCurrentVersion(projectId: string): Promise<BriefVersion | null>;
  update(version: BriefVersion): Promise<void>;
  create(version: BriefVersion): Promise<void>;
}

export interface ProposalRepository {
  listVersions(projectId: string): Promise<ProposalVersion[]>;
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
  listByProjectId(projectId: string): Promise<DesignVersion[]>;
  getCurrentVersion(projectId: string): Promise<DesignVersion | null>;
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
  listByProjectId(projectId: string): Promise<RevisionRound[]>;
  findById(id: string): Promise<RevisionRound | null>;
  create(round: RevisionRound): Promise<void>;
  update(round: RevisionRound): Promise<void>;
}

export interface ProjectMessageRepository {
  listByProjectId(projectId: string): Promise<ProjectMessage[]>;
  create(message: ProjectMessage): Promise<void>;
}

export interface NotificationRepository {
  create(notification: Notification): Promise<void>;
  listByProjectId(projectId: string): Promise<Notification[]>;
}

export interface UploadedFileRepository {
  findById(id: string): Promise<UploadedFile | null>;
  create(file: UploadedFile): Promise<void>;
}
