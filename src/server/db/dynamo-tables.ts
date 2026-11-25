/**
 * Single source of truth for every DynamoDB table this app uses — one table
 * per Mongo collection it replaces, plus `sessions`/`rateLimits` (replacing
 * Redis). Used by both the table-creation script (scripts/create-dynamo-tables.ts)
 * and the repository layer (db/dynamo.ts's table-name resolver).
 *
 * Deliberately NOT single-table design: this app's access patterns (~25
 * distinct entities, each queried a handful of specific ways) map far more
 * directly onto "one table per entity + a GSI per listByX access pattern"
 * than onto an overloaded single table. On-demand billing means more tables
 * costs nothing extra, and the straightforward mapping matters more than
 * DynamoDB best-practice purity for a small internal app.
 */
export interface GsiDef {
  name: string;
  /** Partition key attribute name on the base table item. */
  pk: string;
  /** Optional sort key attribute name — enables ordered/ranged queries within a partition. */
  sk?: string;
}

export interface TableDef {
  /** Suffixed with DYNAMO_TABLE_PREFIX at runtime (see db/dynamo.ts's tableName()). */
  name: string;
  pk: string;
  sk?: string;
  gsis?: GsiDef[];
  /** Attribute (epoch seconds) DynamoDB's TTL feature deletes by — only set on sessions/rateLimits. */
  ttlAttribute?: string;
}

export const TABLES = {
  users: { name: "users", pk: "id", gsis: [{ name: "byEmail", pk: "email" }] },
  projects: {
    name: "projects",
    pk: "id",
    gsis: [
      { name: "byClientId", pk: "clientId" },
      { name: "byAssigneeId", pk: "assigneeId" },
    ],
  },
  activityItems: { name: "activity-items", pk: "id", gsis: [{ name: "byClientId", pk: "clientId" }] },
  attentionTasks: { name: "attention-tasks", pk: "id", gsis: [{ name: "byClientId", pk: "clientId" }] },
  briefVersions: { name: "brief-versions", pk: "id", gsis: [{ name: "byProjectId", pk: "projectId", sk: "versionNumber" }] },
  proposalVersions: { name: "proposal-versions", pk: "id", gsis: [{ name: "byProjectId", pk: "projectId", sk: "versionNumber" }] },
  acceptanceRecords: { name: "acceptance-records", pk: "id", gsis: [{ name: "byProjectId", pk: "projectId" }] },
  invoices: { name: "invoices", pk: "id", gsis: [{ name: "byProjectId", pk: "projectId" }] },
  // targetKey = `${targetType}#${targetVersionId}` — denormalized at write time, see CommentRepository.
  comments: { name: "comments", pk: "id", gsis: [{ name: "byTargetKey", pk: "targetKey" }] },
  contentChecklistItems: { name: "content-checklist-items", pk: "id", gsis: [{ name: "byProjectId", pk: "projectId" }] },
  contentSubmissions: { name: "content-submissions", pk: "id", gsis: [{ name: "byProjectId", pk: "projectId" }] },
  shareLinks: { name: "share-links", pk: "token", gsis: [{ name: "byProjectId", pk: "projectId" }] },
  // kindVersionKey = `${kind}#${versionNumber padded}` — lets "current version for this kind" be a single sorted Query, see DesignVersionRepository.
  designVersions: { name: "design-versions", pk: "id", gsis: [{ name: "byProjectId", pk: "projectId", sk: "kindVersionKey" }] },
  designPinComments: { name: "design-pin-comments", pk: "id", gsis: [{ name: "byVersionId", pk: "designVersionId" }] },
  // kindRoundKey = `${kind}#${roundNumber padded}` — same trick as designVersions.
  revisionRounds: { name: "revision-rounds", pk: "id", gsis: [{ name: "byProjectId", pk: "projectId", sk: "kindRoundKey" }] },
  scopeChanges: { name: "scope-changes", pk: "id", gsis: [{ name: "byProjectId", pk: "projectId" }] },
  handoverResources: { name: "handover-resources", pk: "id", gsis: [{ name: "byProjectId", pk: "projectId" }] },
  projectMessages: { name: "project-messages", pk: "id", gsis: [{ name: "byProjectId", pk: "projectId", sk: "createdAt" }] },
  // id = `${projectId}#${userId}` — one row per (project, reader), direct GetItem, no GSI needed.
  conversationReads: { name: "conversation-reads", pk: "id" },
  notifications: { name: "notifications", pk: "id", gsis: [{ name: "byProjectId", pk: "projectId" }] },
  projectBoardColumns: { name: "project-board-columns", pk: "id" },
  contactStages: { name: "contact-stages", pk: "id" },
  contacts: { name: "contacts", pk: "id" },
  contactActivities: { name: "contact-activities", pk: "id", gsis: [{ name: "byContactId", pk: "contactId" }] },
  // Singleton row — always id = AGENCY_SETTINGS_SINGLETON_ID.
  agencySettings: { name: "agency-settings", pk: "id" },
  uploadedFiles: { name: "uploaded-files", pk: "id", gsis: [{ name: "byProjectId", pk: "projectId" }] },
  invites: { name: "invites", pk: "id", gsis: [{ name: "byTokenHash", pk: "tokenHash" }] },
  passwordResetTokens: { name: "password-reset-tokens", pk: "id", gsis: [{ name: "byTokenHash", pk: "tokenHash" }] },

  // Replace Redis — TTL attribute auto-deletes expired rows; verify()/checkRateLimit() still double-check expiry on read since TTL cleanup isn't instant.
  sessions: { name: "sessions", pk: "token", gsis: [{ name: "byUserId", pk: "userId" }], ttlAttribute: "expiresAt" },
  rateLimits: { name: "rate-limits", pk: "key", ttlAttribute: "expiresAt" },
} as const satisfies Record<string, TableDef>;

export type TableKey = keyof typeof TABLES;
