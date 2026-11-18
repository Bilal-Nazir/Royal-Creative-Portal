import type {
  UserRepository,
  ProjectRepository,
  ActivityRepository,
  AttentionRepository,
  AgencyStatsRepository,
  BriefRepository,
  ProposalRepository,
  AcceptanceRecordRepository,
  InvoiceRepository,
  CommentRepository,
  ContentChecklistRepository,
  ShareLinkRepository,
} from "../interfaces";
import type { User } from "../../domain/user";
import type { Project, ActivityItem, AttentionTask } from "../../domain/project";
import type { AgencyOverview } from "../../domain/dashboard";
import type { BriefVersion } from "../../domain/brief";
import type { ProposalVersion, AcceptanceRecord } from "../../domain/proposal";
import type { Invoice } from "../../domain/invoice";
import type { Comment, CommentTargetType } from "../../domain/comment";
import type { ContentChecklistItem } from "../../domain/content";
import type { ShareLink } from "../../domain/share-link";
import { SEED_USERS, SEED_PROJECTS, SEED_ACTIVITIES, SEED_ATTENTION_TASKS, SEED_AGENCY_OVERVIEW } from "./seed-data";
import { SEED_CONTENT_CHECKLIST_ITEMS, SEED_SHARE_LINKS } from "./seed-data-phase2a";
import { readStore, writeStore } from "../../storage/file-store";

export class InMemoryUserRepository implements UserRepository {
  constructor(private readonly users: User[] = SEED_USERS) {}

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    return this.users.find((u) => u.email.toLowerCase() === normalized) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
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

export class InMemoryAgencyStatsRepository implements AgencyStatsRepository {
  constructor(private readonly overview: AgencyOverview = SEED_AGENCY_OVERVIEW) {}

  async getOverview(): Promise<AgencyOverview> {
    return this.overview;
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

export class InMemoryContentChecklistRepository implements ContentChecklistRepository {
  constructor(private readonly items: ContentChecklistItem[] = SEED_CONTENT_CHECKLIST_ITEMS) {}

  async listByProjectId(projectId: string): Promise<ContentChecklistItem[]> {
    return this.items.filter((i) => i.projectId === projectId);
  }
}

export class InMemoryShareLinkRepository implements ShareLinkRepository {
  constructor(private readonly links: ShareLink[] = SEED_SHARE_LINKS) {}

  async findByToken(token: string): Promise<ShareLink | null> {
    return this.links.find((l) => l.token === token) ?? null;
  }

  async findByProjectId(projectId: string): Promise<ShareLink | null> {
    return this.links.find((l) => l.projectId === projectId) ?? null;
  }
}
