import { Schema, model, models, type Model } from "mongoose";

/**
 * Convention for every schema below:
 * - The domain's own `id` field is the Mongo `_id` (String) — one id, not
 *   two. No separate ObjectId.
 * - `timestamps: true` is given custom field names (`_createdAt`/
 *   `_updatedAt`) because almost every domain type already has its own
 *   `createdAt: string` (a different thing — set by application logic, not
 *   Mongo) — colliding with Mongoose's managed Date field would silently
 *   corrupt it. The underscore-prefixed pair is pure Mongo bookkeeping,
 *   stripped out by the repository layer before returning a domain object.
 * - Every other date-ish field (createdAt, approvedAt, paidAt, ...) is
 *   stored as a plain String, matching the domain type exactly — no
 *   Date<->string conversion, so there's nothing to get subtly wrong.
 * - `strict: true` (Mongoose default) + `toObject`/`toJSON` transforms drop
 *   `_id`/`__v`/`_createdAt`/`_updatedAt` so a lean/plain read already looks
 *   exactly like the domain type without the repository re-shaping it.
 */

const TIMESTAMPS = { createdAt: "_createdAt", updatedAt: "_updatedAt" } as const;

function baseOptions() {
  return {
    _id: false as const,
    timestamps: TIMESTAMPS,
    toObject: { virtuals: false, transform: stripInternalFields },
    toJSON: { virtuals: false, transform: stripInternalFields },
  };
}

function stripInternalFields(_doc: unknown, ret: Record<string, unknown>) {
  delete ret._id;
  delete ret.__v;
  delete ret._createdAt;
  delete ret._updatedAt;
  return ret;
}

function idField() {
  return { _id: { type: String, required: true } };
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------
const userSchema = new Schema(
  {
    ...idField(),
    role: { type: String, enum: ["agency", "client"], required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    agencyRole: { type: String, enum: ["owner", "admin", "member"] },
    clientRole: { type: String, enum: ["participant", "viewer"] },
    clientId: { type: String, index: true },
  },
  baseOptions(),
);
export const UserModel: Model<Record<string, unknown>> = models.User ?? model("User", userSchema);

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------
const projectSchema = new Schema(
  {
    ...idField(),
    name: String,
    description: String,
    projectType: String,
    createdAt: String,
    clientId: { type: String, index: true },
    clientName: String,
    contactName: String,
    stage: { type: String, index: true },
    statusLabel: String,
    clientStatusLabel: String,
    waitingOn: String,
    assigneeId: { type: String, index: true },
    assigneeName: String,
    dueDate: String,
    openRevisions: Number,
    nextMilestone: { label: String, date: String, waitingOn: String },
    launchChecklist: {
      clientApproval: Boolean,
      finalPayment: Boolean,
      domainHosting: Boolean,
      qualityChecks: Boolean,
    },
    launchDate: String,
    liveUrl: String,
    handoverAt: String,
    forcedAdvances: [{ _id: false, stage: String, byUserId: String, byUserName: String, at: String }],
  },
  baseOptions(),
);
export const ProjectModel: Model<Record<string, unknown>> = models.Project ?? model("Project", projectSchema);

// ---------------------------------------------------------------------------
// Activity feed / attention tasks — seeded, never mutated by the app.
// ---------------------------------------------------------------------------
const activityItemSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    title: String,
    description: String,
    occurredLabel: String,
  },
  baseOptions(),
);
export const ActivityItemModel: Model<Record<string, unknown>> = models.ActivityItem ?? model("ActivityItem", activityItemSchema);

const attentionTaskSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    title: String,
    subtitle: String,
    badgeLabel: String,
    ctaLabel: String,
  },
  baseOptions(),
);
export const AttentionTaskModel: Model<Record<string, unknown>> = models.AttentionTask ?? model("AttentionTask", attentionTaskSchema);

// ---------------------------------------------------------------------------
// Brief / Proposal / Acceptance records
// ---------------------------------------------------------------------------
const briefFieldsSchema = { objective: String, audience: String, pages: String, features: String, deliverables: String };

const briefVersionSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    versionNumber: Number,
    fields: briefFieldsSchema,
    status: { type: String, index: true },
    createdByName: String,
    createdAt: String,
    approvedByUserId: String,
    approvedByName: String,
    approvedAt: String,
    revisionRequestedText: String,
    revisionRequestedAttachmentUrl: String,
    revisionRequestedAt: String,
    skippedByUserId: String,
    skippedByName: String,
    skippedAt: String,
  },
  baseOptions(),
);
export const BriefVersionModel: Model<Record<string, unknown>> = models.BriefVersion ?? model("BriefVersion", briefVersionSchema);

const proposalFieldsSchema = { scope: String, timeline: String, revisions: String, exclusions: String };

const proposalVersionSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    versionNumber: Number,
    fields: proposalFieldsSchema,
    fee: Number,
    paymentSchedule: [{ _id: false, label: String, amount: Number }],
    includedRevisionRounds: Number,
    status: { type: String, index: true },
    createdByName: String,
    createdAt: String,
    changesRequestedText: String,
    changesRequestedAttachmentUrl: String,
    changesRequestedAt: String,
  },
  baseOptions(),
);
export const ProposalVersionModel: Model<Record<string, unknown>> = models.ProposalVersion ?? model("ProposalVersion", proposalVersionSchema);

const acceptanceRecordSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    proposalVersionId: String,
    proposalVersionNumber: Number,
    amount: Number,
    userId: String,
    userName: String,
    acceptedAt: String,
  },
  baseOptions(),
);
export const AcceptanceRecordModel: Model<Record<string, unknown>> = models.AcceptanceRecord ?? model("AcceptanceRecord", acceptanceRecordSchema);

// ---------------------------------------------------------------------------
// Invoice — id is already the dedup key (`inv-{projectId}-{type}`,
// invoice-service.ts), so Mongo's default unique _id index already prevents
// duplicates under concurrent writes; invoiceNumber gets its own unique
// index per the spec.
// ---------------------------------------------------------------------------
const invoiceSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    type: String,
    invoiceNumber: { type: String, unique: true },
    amount: Number,
    status: { type: String, index: true },
    dueDate: String,
    promisedDate: String,
    paidAt: String,
    paymentMethod: String,
    lastFailureReason: String,
    verifiedByUserId: String,
    verifiedByName: String,
    verifiedAt: String,
    reportedAt: String,
    reportedTransferDate: String,
    reportedNote: String,
  },
  baseOptions(),
);
export const InvoiceModel: Model<Record<string, unknown>> = models.Invoice ?? model("Invoice", invoiceSchema);

// ---------------------------------------------------------------------------
// Comment
// ---------------------------------------------------------------------------
const commentSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    targetType: String,
    targetVersionId: String,
    authorId: String,
    authorName: String,
    body: String,
    createdAt: String,
  },
  baseOptions(),
);
export const CommentModel: Model<Record<string, unknown>> = models.Comment ?? model("Comment", commentSchema);

// ---------------------------------------------------------------------------
// Content checklist + submissions
// ---------------------------------------------------------------------------
const contentChecklistItemSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    label: String,
    required: Boolean,
    status: { type: String, index: true },
  },
  baseOptions(),
);
export const ContentChecklistItemModel: Model<Record<string, unknown>> =
  models.ContentChecklistItem ?? model("ContentChecklistItem", contentChecklistItemSchema);

const contentSubmissionSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    checklistItemId: { type: String, index: true },
    fileIds: [String],
    sharedLink: String,
    notes: String,
    submittedByName: String,
    submittedAt: String,
    reviewedByName: String,
    reviewedAt: String,
    reviewNote: String,
  },
  baseOptions(),
);
export const ContentSubmissionModel: Model<Record<string, unknown>> = models.ContentSubmission ?? model("ContentSubmission", contentSubmissionSchema);

// ---------------------------------------------------------------------------
// Share link
// ---------------------------------------------------------------------------
const shareLinkSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    projectId: { type: String, index: true },
    createdAt: String,
    expiresAt: String,
  },
  { ...baseOptions(), _id: true },
);
export const ShareLinkModel: Model<Record<string, unknown>> = models.ShareLink ?? model("ShareLink", shareLinkSchema);

// ---------------------------------------------------------------------------
// Design versions / pins / revision rounds
// ---------------------------------------------------------------------------
const designVersionSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    kind: { type: String, index: true },
    versionNumber: Number,
    figmaLink: String,
    screenshotFileIds: [String],
    message: String,
    whatChanged: String,
    respondsToRoundId: String,
    createdByName: String,
    createdAt: String,
    status: { type: String, index: true },
    approvedByUserId: String,
    approvedByName: String,
    approvedAt: String,
  },
  baseOptions(),
);
export const DesignVersionModel: Model<Record<string, unknown>> = models.DesignVersion ?? model("DesignVersion", designVersionSchema);

const designPinCommentSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    designVersionId: { type: String, index: true },
    number: Number,
    xPercent: Number,
    yPercent: Number,
    title: String,
    body: String,
    isDraft: Boolean,
    authorId: String,
    authorName: String,
    createdAt: String,
    status: String,
  },
  baseOptions(),
);
export const DesignPinCommentModel: Model<Record<string, unknown>> = models.DesignPinComment ?? model("DesignPinComment", designPinCommentSchema);

const revisionRoundSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    kind: { type: String, index: true },
    designVersionId: { type: String, index: true },
    roundNumber: Number,
    commentIds: [String],
    submittedByName: String,
    submittedAt: String,
    workflowStatus: String,
    assigneeId: { type: String, index: true },
    assigneeName: String,
    targetDate: String,
    overAllowance: Boolean,
    scopeFlaggedAt: String,
  },
  baseOptions(),
);
export const RevisionRoundModel: Model<Record<string, unknown>> = models.RevisionRound ?? model("RevisionRound", revisionRoundSchema);

// ---------------------------------------------------------------------------
// Messages / conversation reads
// ---------------------------------------------------------------------------
const projectMessageSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    authorId: String,
    authorName: String,
    authorRole: String,
    body: String,
    createdAt: String,
  },
  baseOptions(),
);
export const ProjectMessageModel: Model<Record<string, unknown>> = models.ProjectMessage ?? model("ProjectMessage", projectMessageSchema);

const conversationReadSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    userId: { type: String, index: true },
    lastReadAt: String,
  },
  baseOptions(),
);
export const ConversationReadModel: Model<Record<string, unknown>> = models.ConversationRead ?? model("ConversationRead", conversationReadSchema);

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
const notificationSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    type: String,
    recipientRole: String,
    recipientUserId: { type: String, index: true },
    title: String,
    body: String,
    createdAt: String,
    readAt: String,
  },
  baseOptions(),
);
export const NotificationModel: Model<Record<string, unknown>> = models.Notification ?? model("Notification", notificationSchema);

// ---------------------------------------------------------------------------
// Uploaded files
// ---------------------------------------------------------------------------
const uploadedFileSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    scope: String,
    storageId: String,
    originalName: String,
    sanitizedName: String,
    mimeType: String,
    size: Number,
    uploadedByUserId: String,
    uploadedByName: String,
    createdAt: String,
  },
  baseOptions(),
);
export const UploadedFileModel: Model<Record<string, unknown>> = models.UploadedFile ?? model("UploadedFile", uploadedFileSchema);

// ---------------------------------------------------------------------------
// Scope changes / handover resources
// ---------------------------------------------------------------------------
const scopeChangeSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    title: String,
    description: String,
    additionalFee: Number,
    timelineImpact: String,
    status: { type: String, index: true },
    flaggedFromRoundId: String,
    createdByName: String,
    createdAt: String,
    decidedByUserId: String,
    decidedByName: String,
    decidedAt: String,
    additionalInvoiceId: String,
  },
  baseOptions(),
);
export const ScopeChangeModel: Model<Record<string, unknown>> = models.ScopeChange ?? model("ScopeChange", scopeChangeSchema);

const handoverResourceSchema = new Schema(
  {
    ...idField(),
    projectId: { type: String, index: true },
    title: String,
    type: String,
    fileId: String,
    url: String,
    addedByName: String,
    addedAt: String,
  },
  baseOptions(),
);
export const HandoverResourceModel: Model<Record<string, unknown>> = models.HandoverResource ?? model("HandoverResource", handoverResourceSchema);

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------
const contactStageSchema = new Schema(
  {
    ...idField(),
    name: String,
    order: Number,
    color: String,
  },
  baseOptions(),
);
export const ContactStageModel: Model<Record<string, unknown>> = models.ContactStage ?? model("ContactStage", contactStageSchema);

const contactSchema = new Schema(
  {
    ...idField(),
    name: String,
    email: String,
    phone: String,
    company: String,
    stageId: { type: String, index: true },
    ownerId: { type: String, index: true },
    ownerName: String,
    nextFollowUpAt: String,
    notes: String,
    proposalProjectId: String,
    createdAt: String,
  },
  baseOptions(),
);
export const ContactModel: Model<Record<string, unknown>> = models.Contact ?? model("Contact", contactSchema);

const contactActivitySchema = new Schema(
  {
    ...idField(),
    contactId: { type: String, index: true },
    type: String,
    body: String,
    createdAt: String,
  },
  baseOptions(),
);
export const ContactActivityModel: Model<Record<string, unknown>> = models.ContactActivity ?? model("ContactActivity", contactActivitySchema);

// ---------------------------------------------------------------------------
// Agency settings — one singleton document, fixed _id.
// ---------------------------------------------------------------------------
export const AGENCY_SETTINGS_SINGLETON_ID = "singleton";

const agencySettingsSchema = new Schema(
  {
    ...idField(),
    agencyName: String,
    defaultCurrency: String,
    paymentInstructions: String,
    ownerName: String,
    ownerPhone: String,
    ownerWhatsapp: String,
    notifications: {
      emailAlerts: Boolean,
      inAppAlerts: Boolean,
      paymentDateReminders: Boolean,
    },
  },
  baseOptions(),
);
export const AgencySettingsModel: Model<Record<string, unknown>> = models.AgencySettings ?? model("AgencySettings", agencySettingsSchema);

// ---------------------------------------------------------------------------
// Invite / password reset — tokens are stored hashed; raw token never persisted.
// ---------------------------------------------------------------------------
const inviteSchema = new Schema(
  {
    ...idField(),
    tokenHash: { type: String, required: true, unique: true },
    kind: String,
    email: String,
    name: String,
    agencyRole: String,
    clientId: String,
    clientRole: String,
    invitedByUserId: String,
    invitedByName: String,
    createdAt: String,
    expiresAt: String,
    acceptedAt: String,
  },
  baseOptions(),
);
export const InviteModel: Model<Record<string, unknown>> = models.Invite ?? model("Invite", inviteSchema);

const passwordResetTokenSchema = new Schema(
  {
    ...idField(),
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: String, index: true },
    createdAt: String,
    expiresAt: String,
    usedAt: String,
  },
  baseOptions(),
);
export const PasswordResetTokenModel: Model<Record<string, unknown>> =
  models.PasswordResetToken ?? model("PasswordResetToken", passwordResetTokenSchema);
