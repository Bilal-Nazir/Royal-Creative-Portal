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
import { SEED_PROJECTS, SEED_ACTIVITIES, SEED_ATTENTION_TASKS } from "./seed-data";
import { readStore, writeStore } from "../../storage/file-store";

/**
 * File-backed (Phase 3): A20's team management (invite/change role/remove)
 * mutates users via a route handler, read back by page Server Components —
 * the same cross-layer boundary as everywhere else in this store. Previously
 * a static in-memory array since nothing mutated it.
 */
export class FileStoreUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    return readStore().users.find((u) => u.email.toLowerCase() === normalized) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return readStore().users.find((u) => u.id === id) ?? null;
  }

  async listAgencyUsers(): Promise<User[]> {
    return readStore().users.filter((u) => u.role === "agency");
  }

  async listClientUsers(): Promise<User[]> {
    return readStore().users.filter((u) => u.role === "client");
  }

  async create(user: User): Promise<void> {
    const store = readStore();
    store.users.push(user);
    writeStore(store);
  }

  async update(user: User): Promise<void> {
    const store = readStore();
    const index = store.users.findIndex((u) => u.id === user.id);
    if (index === -1) return;
    store.users[index] = user;
    writeStore(store);
  }

  async remove(id: string): Promise<void> {
    const store = readStore();
    store.users = store.users.filter((u) => u.id !== id);
    writeStore(store);
  }
}

/**
 * Project is mutated (stage transitions, forced advances, demo-state
 * overrides) by route handlers and read by page Server Components — two
 * Next.js layers that don't share module/`globalThis` state. Backed by the
 * JSON file store (see server/storage/file-store.ts) so writes are actually
 * visible across that boundary. clientId/assigneeId are treated as
 * immutable, so cross-referencing by them against the static seed list
 * elsewhere (Activity/Attention repos) stays correct.
 */
export class FileStoreProjectRepository implements ProjectRepository {
  async listAll(): Promise<Project[]> {
    return readStore().projects;
  }

  async listByClientId(clientId: string): Promise<Project[]> {
    return readStore().projects.filter((p) => p.clientId === clientId);
  }

  async listByAssigneeId(assigneeId: string): Promise<Project[]> {
    return readStore().projects.filter((p) => p.assigneeId === assigneeId);
  }

  async findById(id: string): Promise<Project | null> {
    return readStore().projects.find((p) => p.id === id) ?? null;
  }

  async update(project: Project): Promise<void> {
    const store = readStore();
    const index = store.projects.findIndex((p) => p.id === project.id);
    if (index === -1) return;
    store.projects[index] = project;
    writeStore(store);
  }

  async create(project: Project): Promise<void> {
    const store = readStore();
    store.projects.push(project);
    writeStore(store);
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

export class FileStoreBriefRepository implements BriefRepository {
  async getCurrentVersion(projectId: string): Promise<BriefVersion | null> {
    const versions = readStore().briefVersions.filter((v) => v.projectId === projectId);
    if (versions.length === 0) return null;
    return versions.reduce((latest, v) => (v.versionNumber > latest.versionNumber ? v : latest));
  }

  async update(version: BriefVersion): Promise<void> {
    const store = readStore();
    const index = store.briefVersions.findIndex((v) => v.id === version.id);
    if (index === -1) return;
    store.briefVersions[index] = version;
    writeStore(store);
  }

  async create(version: BriefVersion): Promise<void> {
    const store = readStore();
    store.briefVersions.push(version);
    writeStore(store);
  }
}

export class FileStoreProposalRepository implements ProposalRepository {
  async listVersions(projectId: string): Promise<ProposalVersion[]> {
    return readStore()
      .proposalVersions.filter((v) => v.projectId === projectId)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }

  async listAll(): Promise<ProposalVersion[]> {
    return readStore().proposalVersions;
  }

  async getCurrentVersion(projectId: string): Promise<ProposalVersion | null> {
    const versions = readStore().proposalVersions.filter((v) => v.projectId === projectId);
    if (versions.length === 0) return null;
    return versions.reduce((latest, v) => (v.versionNumber > latest.versionNumber ? v : latest));
  }

  async findVersionById(id: string): Promise<ProposalVersion | null> {
    return readStore().proposalVersions.find((v) => v.id === id) ?? null;
  }

  async update(version: ProposalVersion): Promise<void> {
    const store = readStore();
    const index = store.proposalVersions.findIndex((v) => v.id === version.id);
    if (index === -1) return;
    store.proposalVersions[index] = version;
    writeStore(store);
  }

  async create(version: ProposalVersion): Promise<void> {
    const store = readStore();
    store.proposalVersions.push(version);
    writeStore(store);
  }
}

export class FileStoreAcceptanceRecordRepository implements AcceptanceRecordRepository {
  async listByProjectId(projectId: string): Promise<AcceptanceRecord[]> {
    return readStore().acceptanceRecords.filter((r) => r.projectId === projectId);
  }

  async create(record: AcceptanceRecord): Promise<void> {
    const store = readStore();
    store.acceptanceRecords.push(record);
    writeStore(store);
  }
}

export class FileStoreInvoiceRepository implements InvoiceRepository {
  async listAll(): Promise<Invoice[]> {
    return readStore().invoices;
  }

  async listByProjectId(projectId: string): Promise<Invoice[]> {
    return readStore().invoices.filter((i) => i.projectId === projectId);
  }

  async getDepositInvoice(projectId: string): Promise<Invoice | null> {
    return readStore().invoices.find((i) => i.projectId === projectId && i.type === "deposit") ?? null;
  }

  async findById(id: string): Promise<Invoice | null> {
    return readStore().invoices.find((i) => i.id === id) ?? null;
  }

  async update(invoice: Invoice): Promise<void> {
    const store = readStore();
    const index = store.invoices.findIndex((i) => i.id === invoice.id);
    if (index === -1) {
      store.invoices.push(invoice);
    } else {
      store.invoices[index] = invoice;
    }
    writeStore(store);
  }
}

export class FileStoreCommentRepository implements CommentRepository {
  async listByTarget(projectId: string, targetType: CommentTargetType, targetVersionId: string): Promise<Comment[]> {
    return readStore()
      .comments.filter((c) => c.projectId === projectId && c.targetType === targetType && c.targetVersionId === targetVersionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async create(comment: Comment): Promise<void> {
    const store = readStore();
    store.comments.push(comment);
    writeStore(store);
  }
}

/**
 * File-backed because A09/A08-style review actions (accept/request changes,
 * and the client's own submissions) flip an item's status via a route
 * handler, and the client-side checklist page reads it back via a page
 * Server Component — the same cross-layer boundary as everywhere else in
 * this store.
 */
export class FileStoreContentChecklistRepository implements ContentChecklistRepository {
  async listByProjectId(projectId: string): Promise<ContentChecklistItem[]> {
    return readStore().contentChecklistItems.filter((i) => i.projectId === projectId);
  }

  async findById(id: string): Promise<ContentChecklistItem | null> {
    return readStore().contentChecklistItems.find((i) => i.id === id) ?? null;
  }

  async update(item: ContentChecklistItem): Promise<void> {
    const store = readStore();
    const index = store.contentChecklistItems.findIndex((i) => i.id === item.id);
    if (index === -1) return;
    store.contentChecklistItems[index] = item;
    writeStore(store);
  }
}

export class FileStoreContentSubmissionRepository implements ContentSubmissionRepository {
  async listByProjectId(projectId: string): Promise<ContentSubmission[]> {
    return readStore().contentSubmissions.filter((s) => s.projectId === projectId);
  }

  async findById(id: string): Promise<ContentSubmission | null> {
    return readStore().contentSubmissions.find((s) => s.id === id) ?? null;
  }

  async create(submission: ContentSubmission): Promise<void> {
    const store = readStore();
    store.contentSubmissions.push(submission);
    writeStore(store);
  }

  async update(submission: ContentSubmission): Promise<void> {
    const store = readStore();
    const index = store.contentSubmissions.findIndex((s) => s.id === submission.id);
    if (index === -1) return;
    store.contentSubmissions[index] = submission;
    writeStore(store);
  }
}

export class FileStoreDesignVersionRepository implements DesignVersionRepository {
  async listByProjectId(projectId: string, kind: ReviewKind): Promise<DesignVersion[]> {
    return readStore()
      .designVersions.filter((v) => v.projectId === projectId && v.kind === kind)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }

  async getCurrentVersion(projectId: string, kind: ReviewKind): Promise<DesignVersion | null> {
    const versions = readStore().designVersions.filter((v) => v.projectId === projectId && v.kind === kind);
    if (versions.length === 0) return null;
    return versions.reduce((latest, v) => (v.versionNumber > latest.versionNumber ? v : latest));
  }

  async findById(id: string): Promise<DesignVersion | null> {
    return readStore().designVersions.find((v) => v.id === id) ?? null;
  }

  async create(version: DesignVersion): Promise<void> {
    const store = readStore();
    store.designVersions.push(version);
    writeStore(store);
  }

  async update(version: DesignVersion): Promise<void> {
    const store = readStore();
    const index = store.designVersions.findIndex((v) => v.id === version.id);
    if (index === -1) return;
    store.designVersions[index] = version;
    writeStore(store);
  }
}

export class FileStoreDesignPinCommentRepository implements DesignPinCommentRepository {
  async listByVersionId(versionId: string): Promise<DesignPinComment[]> {
    return readStore()
      .designPinComments.filter((c) => c.designVersionId === versionId)
      .sort((a, b) => a.number - b.number);
  }

  async findById(id: string): Promise<DesignPinComment | null> {
    return readStore().designPinComments.find((c) => c.id === id) ?? null;
  }

  async create(comment: DesignPinComment): Promise<void> {
    const store = readStore();
    store.designPinComments.push(comment);
    writeStore(store);
  }

  async update(comment: DesignPinComment): Promise<void> {
    const store = readStore();
    const index = store.designPinComments.findIndex((c) => c.id === comment.id);
    if (index === -1) return;
    store.designPinComments[index] = comment;
    writeStore(store);
  }
}

export class FileStoreRevisionRoundRepository implements RevisionRoundRepository {
  async listByProjectId(projectId: string, kind: ReviewKind): Promise<RevisionRound[]> {
    return readStore()
      .revisionRounds.filter((r) => r.projectId === projectId && r.kind === kind)
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }

  async findById(id: string): Promise<RevisionRound | null> {
    return readStore().revisionRounds.find((r) => r.id === id) ?? null;
  }

  async create(round: RevisionRound): Promise<void> {
    const store = readStore();
    store.revisionRounds.push(round);
    writeStore(store);
  }

  async update(round: RevisionRound): Promise<void> {
    const store = readStore();
    const index = store.revisionRounds.findIndex((r) => r.id === round.id);
    if (index === -1) return;
    store.revisionRounds[index] = round;
    writeStore(store);
  }
}

export class FileStoreProjectMessageRepository implements ProjectMessageRepository {
  async listByProjectId(projectId: string): Promise<ProjectMessage[]> {
    return readStore()
      .projectMessages.filter((m) => m.projectId === projectId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async listAll(): Promise<ProjectMessage[]> {
    return readStore().projectMessages;
  }

  async create(message: ProjectMessage): Promise<void> {
    const store = readStore();
    store.projectMessages.push(message);
    writeStore(store);
  }
}

export class FileStoreConversationReadRepository implements ConversationReadRepository {
  async find(projectId: string, userId: string): Promise<ConversationRead | null> {
    return readStore().conversationReads.find((r) => r.projectId === projectId && r.userId === userId) ?? null;
  }

  async upsert(read: ConversationRead): Promise<void> {
    const store = readStore();
    const index = store.conversationReads.findIndex((r) => r.projectId === read.projectId && r.userId === read.userId);
    if (index === -1) {
      store.conversationReads.push(read);
    } else {
      store.conversationReads[index] = read;
    }
    writeStore(store);
  }
}

export class FileStoreNotificationRepository implements NotificationRepository {
  async create(notification: Notification): Promise<void> {
    const store = readStore();
    store.notifications.push(notification);
    writeStore(store);
  }

  async listByProjectId(projectId: string): Promise<Notification[]> {
    return readStore().notifications.filter((n) => n.projectId === projectId);
  }

  async listAll(): Promise<Notification[]> {
    return readStore().notifications;
  }

  async findById(id: string): Promise<Notification | null> {
    return readStore().notifications.find((n) => n.id === id) ?? null;
  }

  async update(notification: Notification): Promise<void> {
    const store = readStore();
    const index = store.notifications.findIndex((n) => n.id === notification.id);
    if (index === -1) return;
    store.notifications[index] = notification;
    writeStore(store);
  }
}

export class FileStoreContactStageRepository implements ContactStageRepository {
  async listAll(): Promise<ContactStage[]> {
    return readStore().contactStages.slice().sort((a, b) => a.order - b.order);
  }

  async findById(id: string): Promise<ContactStage | null> {
    return readStore().contactStages.find((s) => s.id === id) ?? null;
  }

  async create(stage: ContactStage): Promise<void> {
    const store = readStore();
    store.contactStages.push(stage);
    writeStore(store);
  }

  async update(stage: ContactStage): Promise<void> {
    const store = readStore();
    const index = store.contactStages.findIndex((s) => s.id === stage.id);
    if (index === -1) return;
    store.contactStages[index] = stage;
    writeStore(store);
  }

  async delete(id: string): Promise<void> {
    const store = readStore();
    store.contactStages = store.contactStages.filter((s) => s.id !== id);
    writeStore(store);
  }
}

export class FileStoreContactRepository implements ContactRepository {
  async listAll(): Promise<Contact[]> {
    return readStore().contacts;
  }

  async findById(id: string): Promise<Contact | null> {
    return readStore().contacts.find((c) => c.id === id) ?? null;
  }

  async create(contact: Contact): Promise<void> {
    const store = readStore();
    store.contacts.push(contact);
    writeStore(store);
  }

  async update(contact: Contact): Promise<void> {
    const store = readStore();
    const index = store.contacts.findIndex((c) => c.id === contact.id);
    if (index === -1) return;
    store.contacts[index] = contact;
    writeStore(store);
  }
}

export class FileStoreContactActivityRepository implements ContactActivityRepository {
  async listByContactId(contactId: string): Promise<ContactActivity[]> {
    return readStore()
      .contactActivities.filter((a) => a.contactId === contactId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async create(activity: ContactActivity): Promise<void> {
    const store = readStore();
    store.contactActivities.push(activity);
    writeStore(store);
  }
}

export class FileStoreAgencySettingsRepository implements AgencySettingsRepository {
  async get(): Promise<AgencySettings> {
    return readStore().agencySettings;
  }

  async update(settings: AgencySettings): Promise<void> {
    const store = readStore();
    store.agencySettings = settings;
    writeStore(store);
  }
}

export class FileStoreUploadedFileRepository implements UploadedFileRepository {
  async findById(id: string): Promise<UploadedFile | null> {
    return readStore().uploadedFiles.find((f) => f.id === id) ?? null;
  }

  async listByProjectId(projectId: string): Promise<UploadedFile[]> {
    return readStore()
      .uploadedFiles.filter((f) => f.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async create(file: UploadedFile): Promise<void> {
    const store = readStore();
    store.uploadedFiles.push(file);
    writeStore(store);
  }
}

export class FileStoreScopeChangeRepository implements ScopeChangeRepository {
  async listByProjectId(projectId: string): Promise<ScopeChange[]> {
    return readStore()
      .scopeChanges.filter((s) => s.projectId === projectId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async findById(id: string): Promise<ScopeChange | null> {
    return readStore().scopeChanges.find((s) => s.id === id) ?? null;
  }

  async create(scopeChange: ScopeChange): Promise<void> {
    const store = readStore();
    store.scopeChanges.push(scopeChange);
    writeStore(store);
  }

  async update(scopeChange: ScopeChange): Promise<void> {
    const store = readStore();
    const index = store.scopeChanges.findIndex((s) => s.id === scopeChange.id);
    if (index === -1) return;
    store.scopeChanges[index] = scopeChange;
    writeStore(store);
  }
}

export class FileStoreHandoverResourceRepository implements HandoverResourceRepository {
  async listByProjectId(projectId: string): Promise<HandoverResource[]> {
    return readStore()
      .handoverResources.filter((r) => r.projectId === projectId)
      .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
  }

  async findById(id: string): Promise<HandoverResource | null> {
    return readStore().handoverResources.find((r) => r.id === id) ?? null;
  }

  async create(resource: HandoverResource): Promise<void> {
    const store = readStore();
    store.handoverResources.push(resource);
    writeStore(store);
  }

  async delete(id: string): Promise<void> {
    const store = readStore();
    store.handoverResources = store.handoverResources.filter((r) => r.id !== id);
    writeStore(store);
  }
}

/**
 * File-backed (not static in-memory) because A05's "Copy client link" lazily
 * creates a link the first time an agency user asks for one (see
 * share-service.ts) — that write must be visible to the page render that
 * displays it, which crosses the same route-handler/page-component boundary
 * described on FileStoreProjectRepository above.
 */
export class FileStoreShareLinkRepository implements ShareLinkRepository {
  async findByToken(token: string): Promise<ShareLink | null> {
    return readStore().shareLinks.find((l) => l.token === token) ?? null;
  }

  async findByProjectId(projectId: string): Promise<ShareLink | null> {
    return readStore().shareLinks.find((l) => l.projectId === projectId) ?? null;
  }

  async create(link: ShareLink): Promise<void> {
    const store = readStore();
    store.shareLinks.push(link);
    writeStore(store);
  }
}
