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
  ProjectBoardColumnRepository,
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
import { SEED_PROJECTS, SEED_ACTIVITIES, SEED_ATTENTION_TASKS } from "./seed-data";
import { getStore } from "./memory-store";

export class InMemoryUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    return getStore().users.find((u) => u.email.toLowerCase() === normalized) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return getStore().users.find((u) => u.id === id) ?? null;
  }

  async listAgencyUsers(): Promise<User[]> {
    return getStore().users.filter((u) => u.role === "agency");
  }

  async listClientUsers(): Promise<User[]> {
    return getStore().users.filter((u) => u.role === "client");
  }

  async create(user: User): Promise<void> {
    getStore().users.push(user);
  }

  async update(user: User): Promise<void> {
    const store = getStore();
    const index = store.users.findIndex((u) => u.id === user.id);
    if (index === -1) return;
    store.users[index] = user;
  }

  async remove(id: string): Promise<void> {
    const store = getStore();
    store.users = store.users.filter((u) => u.id !== id);
  }
}

export class InMemoryProjectRepository implements ProjectRepository {
  async listAll(): Promise<Project[]> {
    return getStore().projects;
  }

  async listByClientId(clientId: string): Promise<Project[]> {
    return getStore().projects.filter((p) => p.clientId === clientId);
  }

  async listByAssigneeId(assigneeId: string): Promise<Project[]> {
    return getStore().projects.filter((p) => p.assigneeId === assigneeId);
  }

  async findById(id: string): Promise<Project | null> {
    return getStore().projects.find((p) => p.id === id) ?? null;
  }

  async update(project: Project): Promise<void> {
    const store = getStore();
    const index = store.projects.findIndex((p) => p.id === project.id);
    if (index === -1) return;
    store.projects[index] = project;
  }

  async create(project: Project): Promise<void> {
    getStore().projects.push(project);
  }
}

export class InMemoryActivityRepository implements ActivityRepository {
  constructor(
    private readonly activities: ActivityItem[] = SEED_ACTIVITIES,
    private readonly projects: Project[] = SEED_PROJECTS,
  ) {}

  async listByClientId(clientId: string): Promise<ActivityItem[]> {
    const projectIds = new Set(this.projects.filter((p) => p.clientId === clientId).map((p) => p.id));
    return this.activities.filter((a) => projectIds.has(a.projectId));
  }
}

export class InMemoryAttentionRepository implements AttentionRepository {
  constructor(
    private readonly tasks: AttentionTask[] = SEED_ATTENTION_TASKS,
    private readonly projects: Project[] = SEED_PROJECTS,
  ) {}

  async listByClientId(clientId: string): Promise<AttentionTask[]> {
    const projectIds = new Set(this.projects.filter((p) => p.clientId === clientId).map((p) => p.id));
    return this.tasks.filter((t) => projectIds.has(t.projectId));
  }
}

export class InMemoryBriefRepository implements BriefRepository {
  async getCurrentVersion(projectId: string): Promise<BriefVersion | null> {
    const versions = getStore().briefVersions.filter((v) => v.projectId === projectId);
    if (versions.length === 0) return null;
    return versions.reduce((latest, v) => (v.versionNumber > latest.versionNumber ? v : latest));
  }

  async update(version: BriefVersion): Promise<void> {
    const store = getStore();
    const index = store.briefVersions.findIndex((v) => v.id === version.id);
    if (index === -1) return;
    store.briefVersions[index] = version;
  }

  async create(version: BriefVersion): Promise<void> {
    getStore().briefVersions.push(version);
  }
}

export class InMemoryProposalRepository implements ProposalRepository {
  async listVersions(projectId: string): Promise<ProposalVersion[]> {
    return getStore()
      .proposalVersions.filter((v) => v.projectId === projectId)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }

  async listAll(): Promise<ProposalVersion[]> {
    return getStore().proposalVersions;
  }

  async getCurrentVersion(projectId: string): Promise<ProposalVersion | null> {
    const versions = getStore().proposalVersions.filter((v) => v.projectId === projectId);
    if (versions.length === 0) return null;
    return versions.reduce((latest, v) => (v.versionNumber > latest.versionNumber ? v : latest));
  }

  async findVersionById(id: string): Promise<ProposalVersion | null> {
    return getStore().proposalVersions.find((v) => v.id === id) ?? null;
  }

  async update(version: ProposalVersion): Promise<void> {
    const store = getStore();
    const index = store.proposalVersions.findIndex((v) => v.id === version.id);
    if (index === -1) return;
    store.proposalVersions[index] = version;
  }

  async create(version: ProposalVersion): Promise<void> {
    getStore().proposalVersions.push(version);
  }
}

export class InMemoryAcceptanceRecordRepository implements AcceptanceRecordRepository {
  async listByProjectId(projectId: string): Promise<AcceptanceRecord[]> {
    return getStore().acceptanceRecords.filter((r) => r.projectId === projectId);
  }

  async create(record: AcceptanceRecord): Promise<void> {
    getStore().acceptanceRecords.push(record);
  }
}

export class InMemoryInvoiceRepository implements InvoiceRepository {
  async listAll(): Promise<Invoice[]> {
    return getStore().invoices;
  }

  async listByProjectId(projectId: string): Promise<Invoice[]> {
    return getStore().invoices.filter((i) => i.projectId === projectId);
  }

  async getDepositInvoice(projectId: string): Promise<Invoice | null> {
    return getStore().invoices.find((i) => i.projectId === projectId && i.type === "deposit") ?? null;
  }

  async findById(id: string): Promise<Invoice | null> {
    return getStore().invoices.find((i) => i.id === id) ?? null;
  }

  async update(invoice: Invoice): Promise<void> {
    const store = getStore();
    const index = store.invoices.findIndex((i) => i.id === invoice.id);
    if (index === -1) {
      store.invoices.push(invoice);
    } else {
      store.invoices[index] = invoice;
    }
  }
}

export class InMemoryCommentRepository implements CommentRepository {
  async listByTarget(projectId: string, targetType: CommentTargetType, targetVersionId: string): Promise<Comment[]> {
    return getStore()
      .comments.filter((c) => c.projectId === projectId && c.targetType === targetType && c.targetVersionId === targetVersionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async create(comment: Comment): Promise<void> {
    getStore().comments.push(comment);
  }
}

export class InMemoryContentChecklistRepository implements ContentChecklistRepository {
  async listByProjectId(projectId: string): Promise<ContentChecklistItem[]> {
    return getStore().contentChecklistItems.filter((i) => i.projectId === projectId);
  }

  async findById(id: string): Promise<ContentChecklistItem | null> {
    return getStore().contentChecklistItems.find((i) => i.id === id) ?? null;
  }

  async update(item: ContentChecklistItem): Promise<void> {
    const store = getStore();
    const index = store.contentChecklistItems.findIndex((i) => i.id === item.id);
    if (index === -1) return;
    store.contentChecklistItems[index] = item;
  }
}

export class InMemoryContentSubmissionRepository implements ContentSubmissionRepository {
  async listByProjectId(projectId: string): Promise<ContentSubmission[]> {
    return getStore().contentSubmissions.filter((s) => s.projectId === projectId);
  }

  async findById(id: string): Promise<ContentSubmission | null> {
    return getStore().contentSubmissions.find((s) => s.id === id) ?? null;
  }

  async create(submission: ContentSubmission): Promise<void> {
    getStore().contentSubmissions.push(submission);
  }

  async update(submission: ContentSubmission): Promise<void> {
    const store = getStore();
    const index = store.contentSubmissions.findIndex((s) => s.id === submission.id);
    if (index === -1) return;
    store.contentSubmissions[index] = submission;
  }
}

export class InMemoryDesignVersionRepository implements DesignVersionRepository {
  async listByProjectId(projectId: string, kind: ReviewKind): Promise<DesignVersion[]> {
    return getStore()
      .designVersions.filter((v) => v.projectId === projectId && v.kind === kind)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }

  async getCurrentVersion(projectId: string, kind: ReviewKind): Promise<DesignVersion | null> {
    const versions = getStore().designVersions.filter((v) => v.projectId === projectId && v.kind === kind);
    if (versions.length === 0) return null;
    return versions.reduce((latest, v) => (v.versionNumber > latest.versionNumber ? v : latest));
  }

  async findById(id: string): Promise<DesignVersion | null> {
    return getStore().designVersions.find((v) => v.id === id) ?? null;
  }

  async create(version: DesignVersion): Promise<void> {
    getStore().designVersions.push(version);
  }

  async update(version: DesignVersion): Promise<void> {
    const store = getStore();
    const index = store.designVersions.findIndex((v) => v.id === version.id);
    if (index === -1) return;
    store.designVersions[index] = version;
  }
}

export class InMemoryDesignPinCommentRepository implements DesignPinCommentRepository {
  async listByVersionId(versionId: string): Promise<DesignPinComment[]> {
    return getStore()
      .designPinComments.filter((c) => c.designVersionId === versionId)
      .sort((a, b) => a.number - b.number);
  }

  async findById(id: string): Promise<DesignPinComment | null> {
    return getStore().designPinComments.find((c) => c.id === id) ?? null;
  }

  async create(comment: DesignPinComment): Promise<void> {
    getStore().designPinComments.push(comment);
  }

  async update(comment: DesignPinComment): Promise<void> {
    const store = getStore();
    const index = store.designPinComments.findIndex((c) => c.id === comment.id);
    if (index === -1) return;
    store.designPinComments[index] = comment;
  }
}

export class InMemoryRevisionRoundRepository implements RevisionRoundRepository {
  async listByProjectId(projectId: string, kind: ReviewKind): Promise<RevisionRound[]> {
    return getStore()
      .revisionRounds.filter((r) => r.projectId === projectId && r.kind === kind)
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }

  async findById(id: string): Promise<RevisionRound | null> {
    return getStore().revisionRounds.find((r) => r.id === id) ?? null;
  }

  async create(round: RevisionRound): Promise<void> {
    getStore().revisionRounds.push(round);
  }

  async update(round: RevisionRound): Promise<void> {
    const store = getStore();
    const index = store.revisionRounds.findIndex((r) => r.id === round.id);
    if (index === -1) return;
    store.revisionRounds[index] = round;
  }
}

export class InMemoryProjectMessageRepository implements ProjectMessageRepository {
  async listByProjectId(projectId: string): Promise<ProjectMessage[]> {
    return getStore()
      .projectMessages.filter((m) => m.projectId === projectId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async listAll(): Promise<ProjectMessage[]> {
    return getStore().projectMessages;
  }

  async create(message: ProjectMessage): Promise<void> {
    getStore().projectMessages.push(message);
  }
}

export class InMemoryConversationReadRepository implements ConversationReadRepository {
  async find(projectId: string, userId: string): Promise<ConversationRead | null> {
    return getStore().conversationReads.find((r) => r.projectId === projectId && r.userId === userId) ?? null;
  }

  async upsert(read: ConversationRead): Promise<void> {
    const store = getStore();
    const index = store.conversationReads.findIndex((r) => r.projectId === read.projectId && r.userId === read.userId);
    if (index === -1) {
      store.conversationReads.push(read);
    } else {
      store.conversationReads[index] = read;
    }
  }
}

export class InMemoryNotificationRepository implements NotificationRepository {
  async create(notification: Notification): Promise<void> {
    getStore().notifications.push(notification);
  }

  async listByProjectId(projectId: string): Promise<Notification[]> {
    return getStore().notifications.filter((n) => n.projectId === projectId);
  }

  async listAll(): Promise<Notification[]> {
    return getStore().notifications;
  }

  async findById(id: string): Promise<Notification | null> {
    return getStore().notifications.find((n) => n.id === id) ?? null;
  }

  async update(notification: Notification): Promise<void> {
    const store = getStore();
    const index = store.notifications.findIndex((n) => n.id === notification.id);
    if (index === -1) return;
    store.notifications[index] = notification;
  }
}

export class InMemoryProjectBoardColumnRepository implements ProjectBoardColumnRepository {
  async listAll(): Promise<ProjectBoardColumn[]> {
    return getStore().projectBoardColumns.slice().sort((a, b) => a.order - b.order);
  }

  async findById(id: string): Promise<ProjectBoardColumn | null> {
    return getStore().projectBoardColumns.find((c) => c.id === id) ?? null;
  }

  async create(column: ProjectBoardColumn): Promise<void> {
    getStore().projectBoardColumns.push(column);
  }

  async update(column: ProjectBoardColumn): Promise<void> {
    const store = getStore();
    const index = store.projectBoardColumns.findIndex((c) => c.id === column.id);
    if (index === -1) return;
    store.projectBoardColumns[index] = column;
  }

  async delete(id: string): Promise<void> {
    const store = getStore();
    store.projectBoardColumns = store.projectBoardColumns.filter((c) => c.id !== id);
  }
}

export class InMemoryContactStageRepository implements ContactStageRepository {
  async listAll(): Promise<ContactStage[]> {
    return getStore().contactStages.slice().sort((a, b) => a.order - b.order);
  }

  async findById(id: string): Promise<ContactStage | null> {
    return getStore().contactStages.find((s) => s.id === id) ?? null;
  }

  async create(stage: ContactStage): Promise<void> {
    getStore().contactStages.push(stage);
  }

  async update(stage: ContactStage): Promise<void> {
    const store = getStore();
    const index = store.contactStages.findIndex((s) => s.id === stage.id);
    if (index === -1) return;
    store.contactStages[index] = stage;
  }

  async delete(id: string): Promise<void> {
    const store = getStore();
    store.contactStages = store.contactStages.filter((s) => s.id !== id);
  }
}

export class InMemoryContactRepository implements ContactRepository {
  async listAll(): Promise<Contact[]> {
    return getStore().contacts;
  }

  async findById(id: string): Promise<Contact | null> {
    return getStore().contacts.find((c) => c.id === id) ?? null;
  }

  async create(contact: Contact): Promise<void> {
    getStore().contacts.push(contact);
  }

  async update(contact: Contact): Promise<void> {
    const store = getStore();
    const index = store.contacts.findIndex((c) => c.id === contact.id);
    if (index === -1) return;
    store.contacts[index] = contact;
  }
}

export class InMemoryContactActivityRepository implements ContactActivityRepository {
  async listByContactId(contactId: string): Promise<ContactActivity[]> {
    return getStore()
      .contactActivities.filter((a) => a.contactId === contactId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async create(activity: ContactActivity): Promise<void> {
    getStore().contactActivities.push(activity);
  }
}

export class InMemoryAgencySettingsRepository implements AgencySettingsRepository {
  async get(): Promise<AgencySettings> {
    return getStore().agencySettings;
  }

  async update(settings: AgencySettings): Promise<void> {
    getStore().agencySettings = settings;
  }
}

export class InMemoryUploadedFileRepository implements UploadedFileRepository {
  async findById(id: string): Promise<UploadedFile | null> {
    return getStore().uploadedFiles.find((f) => f.id === id) ?? null;
  }

  async listByProjectId(projectId: string): Promise<UploadedFile[]> {
    return getStore()
      .uploadedFiles.filter((f) => f.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async create(file: UploadedFile): Promise<void> {
    getStore().uploadedFiles.push(file);
  }
}

export class InMemoryScopeChangeRepository implements ScopeChangeRepository {
  async listByProjectId(projectId: string): Promise<ScopeChange[]> {
    return getStore()
      .scopeChanges.filter((s) => s.projectId === projectId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async findById(id: string): Promise<ScopeChange | null> {
    return getStore().scopeChanges.find((s) => s.id === id) ?? null;
  }

  async create(scopeChange: ScopeChange): Promise<void> {
    getStore().scopeChanges.push(scopeChange);
  }

  async update(scopeChange: ScopeChange): Promise<void> {
    const store = getStore();
    const index = store.scopeChanges.findIndex((s) => s.id === scopeChange.id);
    if (index === -1) return;
    store.scopeChanges[index] = scopeChange;
  }
}

export class InMemoryHandoverResourceRepository implements HandoverResourceRepository {
  async listByProjectId(projectId: string): Promise<HandoverResource[]> {
    return getStore()
      .handoverResources.filter((r) => r.projectId === projectId)
      .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
  }

  async findById(id: string): Promise<HandoverResource | null> {
    return getStore().handoverResources.find((r) => r.id === id) ?? null;
  }

  async create(resource: HandoverResource): Promise<void> {
    getStore().handoverResources.push(resource);
  }

  async delete(id: string): Promise<void> {
    const store = getStore();
    store.handoverResources = store.handoverResources.filter((r) => r.id !== id);
  }
}

export class InMemoryShareLinkRepository implements ShareLinkRepository {
  async findByToken(token: string): Promise<ShareLink | null> {
    return getStore().shareLinks.find((l) => l.token === token) ?? null;
  }

  async findByProjectId(projectId: string): Promise<ShareLink | null> {
    return getStore().shareLinks.find((l) => l.projectId === projectId) ?? null;
  }

  async create(link: ShareLink): Promise<void> {
    getStore().shareLinks.push(link);
  }
}

export class InMemoryInviteRepository implements InviteRepository {
  async findByTokenHash(tokenHash: string): Promise<Invite | null> {
    return getStore().invites.find((i) => i.tokenHash === tokenHash) ?? null;
  }

  async create(invite: Invite): Promise<void> {
    getStore().invites.push(invite);
  }

  async update(invite: Invite): Promise<void> {
    const store = getStore();
    const index = store.invites.findIndex((i) => i.id === invite.id);
    if (index === -1) return;
    store.invites[index] = invite;
  }
}

export class InMemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {
  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return getStore().passwordResetTokens.find((t) => t.tokenHash === tokenHash) ?? null;
  }

  async create(token: PasswordResetToken): Promise<void> {
    getStore().passwordResetTokens.push(token);
  }

  async update(token: PasswordResetToken): Promise<void> {
    const store = getStore();
    const index = store.passwordResetTokens.findIndex((t) => t.id === token.id);
    if (index === -1) return;
    store.passwordResetTokens[index] = token;
  }
}
