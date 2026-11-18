import type { User } from "../domain/user";
import type { Project, ActivityItem, AttentionTask } from "../domain/project";
import type { AgencyOverview } from "../domain/dashboard";
import type { BriefVersion } from "../domain/brief";
import type { ProposalVersion, AcceptanceRecord } from "../domain/proposal";
import type { Invoice } from "../domain/invoice";
import type { Comment, CommentTargetType } from "../domain/comment";
import type { ContentChecklistItem } from "../domain/content";
import type { ShareLink } from "../domain/share-link";

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
}

export interface ShareLinkRepository {
  findByToken(token: string): Promise<ShareLink | null>;
  findByProjectId(projectId: string): Promise<ShareLink | null>;
  create(link: ShareLink): Promise<void>;
}
