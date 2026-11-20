import type { BriefVersion } from "../../domain/brief";
import type { ProposalVersion, AcceptanceRecord } from "../../domain/proposal";
import type { Invoice } from "../../domain/invoice";
import type { Comment } from "../../domain/comment";
import type { ContentChecklistItem, ContentSubmission } from "../../domain/content";
import type { ShareLink } from "../../domain/share-link";
import type { DesignVersion, DesignPinComment, RevisionRound } from "../../domain/design";
import type { ProjectMessage, ConversationRead } from "../../domain/message";
import type { Notification } from "../../domain/notification";
import type { UploadedFile } from "../../domain/upload";
import type { ContactStage, Contact, ContactActivity } from "../../domain/contact";
import type { AgencySettings } from "../../domain/settings";

const ROYAL_TRENDSY_BRIEF_FIELDS = {
  objective: "launch a polished ecommerce website for Royal Trendsy.",
  audience: "UK customers looking for modern lifestyle products.",
  pages: "Home, Shop, About, Contact and FAQs.",
  features: "catalogue, checkout, enquiry form and mobile layouts.",
  deliverables: "approved design, developed website and handover.",
};

export const SEED_BRIEF_VERSIONS: BriefVersion[] = [
  {
    id: "brief-royal-trendsy-v1",
    projectId: "proj-royal-trendsy",
    versionNumber: 1,
    fields: ROYAL_TRENDSY_BRIEF_FIELDS,
    status: "approved",
    createdByName: "Jerry Royal",
    createdAt: "2026-10-30T09:00:00.000Z",
    approvedByUserId: "u-alex",
    approvedByName: "Alex",
    approvedAt: "2026-10-31T14:00:00.000Z",
  },
  {
    id: "brief-ashworth-v1",
    projectId: "proj-ashworth",
    versionNumber: 1,
    fields: {
      objective: "a modern, professional website for Ashworth Chambers.",
      audience: "UK businesses seeking legal counsel.",
      pages: "Home, Practice areas, People, Insights and Contact.",
      features: "enquiry form, people directory and case study listings.",
      deliverables: "approved design, developed website and handover.",
    },
    status: "approved",
    createdByName: "Jerry Royal",
    createdAt: "2026-10-20T09:00:00.000Z",
    approvedByUserId: "u-clara",
    approvedByName: "Clara Ashworth",
    approvedAt: "2026-10-21T11:00:00.000Z",
  },
  {
    id: "brief-linden-v1",
    projectId: "proj-linden",
    versionNumber: 1,
    fields: {
      objective: "a lead-generating website for Linden Surveyors.",
      audience: "UK homeowners needing property surveys.",
      pages: "Home, Services, Coverage area, Reviews and Contact.",
      features: "instant quote form and service area map.",
      deliverables: "approved design, developed website and handover.",
    },
    status: "approved",
    createdByName: "Jerry Royal",
    createdAt: "2026-10-10T09:00:00.000Z",
    approvedByUserId: "u-tom",
    approvedByName: "Tom Linden",
    approvedAt: "2026-10-11T11:00:00.000Z",
  },
];

export const SEED_PROPOSAL_VERSIONS: ProposalVersion[] = [
  {
    id: "proposal-royal-trendsy-v1",
    projectId: "proj-royal-trendsy",
    versionNumber: 1,
    fields: {
      scope: "four core pages, product catalogue and checkout.",
      timeline: "four weeks after deposit and required content.",
      revisions: "one design round included.",
      exclusions: "ongoing copywriting and paid third-party services.",
    },
    fee: 2000,
    paymentSchedule: [
      { label: "Before design", amount: 1000 },
      { label: "Before launch", amount: 1000 },
    ],
    includedRevisionRounds: 1,
    status: "changes_requested",
    createdByName: "Jerry Royal",
    createdAt: "2026-10-31T16:00:00.000Z",
    changesRequestedText: "Can we add a wholesale page and split the final payment into two milestones?",
    changesRequestedAt: "2026-11-01T09:30:00.000Z",
  },
  {
    id: "proposal-royal-trendsy-v2",
    projectId: "proj-royal-trendsy",
    versionNumber: 2,
    fields: {
      scope: "five core pages, product catalogue, checkout and responsive development.",
      timeline: "four weeks after deposit and required content.",
      revisions: "two design rounds included.",
      exclusions: "ongoing copywriting and paid third-party services.",
    },
    fee: 2400,
    paymentSchedule: [
      { label: "Before design", amount: 1200 },
      { label: "Before launch", amount: 1200 },
    ],
    includedRevisionRounds: 2,
    status: "accepted",
    createdByName: "Jerry Royal",
    createdAt: "2026-11-01T12:00:00.000Z",
  },
  {
    id: "proposal-ashworth-v1",
    projectId: "proj-ashworth",
    versionNumber: 1,
    fields: {
      scope: "five core pages and a people directory.",
      timeline: "five weeks after deposit and required content.",
      revisions: "two design rounds included.",
      exclusions: "ongoing copywriting and paid third-party services.",
    },
    fee: 3200,
    paymentSchedule: [
      { label: "Before design", amount: 1600 },
      { label: "Before launch", amount: 1600 },
    ],
    includedRevisionRounds: 2,
    status: "sent",
    createdByName: "Jerry Royal",
    createdAt: "2026-10-28T09:00:00.000Z",
  },
  {
    id: "proposal-linden-v1",
    projectId: "proj-linden",
    versionNumber: 1,
    fields: {
      scope: "five core pages, quote form and map integration.",
      timeline: "four weeks after deposit and required content.",
      revisions: "two design rounds included.",
      exclusions: "ongoing copywriting and paid third-party services.",
    },
    fee: 2800,
    paymentSchedule: [
      { label: "Before design", amount: 1400 },
      { label: "Before launch", amount: 1400 },
    ],
    includedRevisionRounds: 2,
    status: "accepted",
    createdByName: "Jerry Royal",
    createdAt: "2026-10-12T09:00:00.000Z",
  },
];

export const SEED_ACCEPTANCE_RECORDS: AcceptanceRecord[] = [
  {
    id: "accept-royal-trendsy-v2",
    projectId: "proj-royal-trendsy",
    proposalVersionId: "proposal-royal-trendsy-v2",
    proposalVersionNumber: 2,
    amount: 2400,
    userId: "u-alex",
    userName: "Alex",
    acceptedAt: "2026-11-02T10:00:00.000Z",
  },
  {
    id: "accept-linden-v1",
    projectId: "proj-linden",
    proposalVersionId: "proposal-linden-v1",
    proposalVersionNumber: 1,
    amount: 2800,
    userId: "u-tom",
    userName: "Tom Linden",
    acceptedAt: "2026-10-13T10:00:00.000Z",
  },
];

export const SEED_INVOICES: Invoice[] = [
  {
    id: "inv-royal-trendsy-deposit",
    projectId: "proj-royal-trendsy",
    type: "deposit",
    invoiceNumber: "RC-1024",
    amount: 1200,
    status: "paid",
    dueDate: "2026-11-05",
    paidAt: "2026-11-02T15:00:00.000Z",
    paymentMethod: "card",
  },
  {
    id: "inv-linden-deposit",
    projectId: "proj-linden",
    type: "deposit",
    invoiceNumber: "RC-1011",
    amount: 1400,
    status: "paid",
    dueDate: "2026-10-18",
    paidAt: "2026-10-15T12:00:00.000Z",
    paymentMethod: "card",
  },
  // Phase 3 additions — give A00's "Collections by milestone" and A07's
  // outstanding/overdue metrics real current-vs-previous-month data.
  {
    id: "inv-hart-co-deposit",
    projectId: "proj-hart-co",
    type: "deposit",
    invoiceNumber: "RC-1031",
    amount: 1800,
    status: "paid",
    dueDate: "2026-10-10",
    paidAt: "2026-10-10T12:00:00.000Z",
    paymentMethod: "card",
  },
  {
    id: "inv-hart-co-final",
    projectId: "proj-hart-co",
    type: "final",
    invoiceNumber: "RC-1032",
    amount: 1800,
    status: "paid",
    dueDate: "2026-11-08",
    paidAt: "2026-11-08T12:00:00.000Z",
    paymentMethod: "card",
  },
  {
    id: "inv-the-downsman-deposit",
    projectId: "proj-the-downsman",
    type: "deposit",
    invoiceNumber: "RC-1018",
    amount: 900,
    status: "paid",
    dueDate: "2026-09-28",
    paidAt: "2026-09-28T12:00:00.000Z",
    paymentMethod: "card",
  },
  {
    id: "inv-the-downsman-final",
    projectId: "proj-the-downsman",
    type: "final",
    invoiceNumber: "RC-1019",
    amount: 900,
    status: "paid",
    dueDate: "2026-10-20",
    paidAt: "2026-10-20T12:00:00.000Z",
    paymentMethod: "card",
  },
  {
    id: "inv-marlow-finch-deposit",
    projectId: "proj-marlow-finch",
    type: "deposit",
    invoiceNumber: "RC-1041",
    amount: 600,
    status: "unpaid",
    dueDate: "2026-11-20",
  },
  {
    id: "inv-enigma-plates-deposit",
    projectId: "proj-enigma-plates",
    type: "deposit",
    invoiceNumber: "RC-1042",
    amount: 2000,
    status: "overdue",
    dueDate: "2026-11-10",
  },
];

export const SEED_COMMENTS: Comment[] = [
  {
    id: "comment-royal-trendsy-brief-1",
    projectId: "proj-royal-trendsy",
    targetType: "brief",
    targetVersionId: "brief-royal-trendsy-v1",
    authorId: "u-alex",
    authorName: "Alex",
    body: "Can we make sure the FAQ page covers returns and sizing?",
    createdAt: "2026-10-30T15:00:00.000Z",
  },
  // Internal (agency-only) notes use targetVersionId = projectId — there's one
  // internal thread per project, not one per brief/proposal version.
  {
    id: "comment-royal-trendsy-internal-1",
    projectId: "proj-royal-trendsy",
    targetType: "internal",
    targetVersionId: "proj-royal-trendsy",
    authorId: "u-jerry",
    authorName: "Jerry Royal",
    body: "Discuss wholesale scope with Jerry before confirming.",
    createdAt: "2026-10-29T09:00:00.000Z",
  },
];

// Phase 3: the hardcoded CLIENT_DIRECTORY that used to live here is gone —
// A04's client selector is now built from real ClientUser + Project records
// (see getClientDirectory() in project-service.ts).

// Decision: content -> design requires every required item accepted. Royal
// Trendsy only has 3 of 4 required items accepted — Jerry force-advanced the
// project into Design anyway (see Project.forcedAdvances), which is why this
// list intentionally doesn't satisfy requiredItemsAllAccepted().
export const SEED_CONTENT_CHECKLIST_ITEMS: ContentChecklistItem[] = [
  {
    id: "content-royal-trendsy-logo",
    projectId: "proj-royal-trendsy",
    label: "Logo and brand guidelines",
    required: true,
    status: "accepted",
  },
  {
    id: "content-royal-trendsy-company",
    projectId: "proj-royal-trendsy",
    label: "Company details",
    required: true,
    status: "accepted",
  },
  {
    id: "content-royal-trendsy-copy",
    projectId: "proj-royal-trendsy",
    label: "Services and website copy",
    required: true,
    status: "accepted",
  },
  {
    id: "content-royal-trendsy-images",
    projectId: "proj-royal-trendsy",
    label: "Images and videos",
    required: true,
    status: "not_started",
  },
];

export const SEED_CONTENT_SUBMISSIONS: ContentSubmission[] = [];
export const SEED_DESIGN_VERSIONS: DesignVersion[] = [];
export const SEED_DESIGN_PIN_COMMENTS: DesignPinComment[] = [];
export const SEED_REVISION_ROUNDS: RevisionRound[] = [];
// Phase 3 — client/agency "Files" nav pages. storageId doubles as the seed
// file's name on disk (see file-store.ts's ensureSeedUploadedFileBytes) —
// deterministic, not a real randomUUID(), since these never go through
// StorageProvider.save().
export const SEED_UPLOADED_FILES: UploadedFile[] = [
  {
    id: "file-royal-trendsy-1",
    projectId: "proj-royal-trendsy",
    scope: "content",
    storageId: "seed-royal-trendsy-brand-guidelines",
    originalName: "logo-and-brand-guidelines.txt",
    sanitizedName: "logo-and-brand-guidelines.txt",
    mimeType: "text/plain",
    size: 64,
    uploadedByUserId: "u-alex",
    uploadedByName: "Alex",
    createdAt: "2026-10-30T10:00:00.000Z",
  },
  {
    id: "file-royal-trendsy-2",
    projectId: "proj-royal-trendsy",
    scope: "design-screenshot",
    storageId: "seed-royal-trendsy-homepage-notes",
    originalName: "homepage-feedback-notes.txt",
    sanitizedName: "homepage-feedback-notes.txt",
    mimeType: "text/plain",
    size: 64,
    uploadedByUserId: "u-jerry",
    uploadedByName: "Jerry Royal",
    createdAt: "2026-11-18T09:30:00.000Z",
  },
  {
    id: "file-ashworth-1",
    projectId: "proj-ashworth",
    scope: "content",
    storageId: "seed-ashworth-people-directory-copy",
    originalName: "people-directory-copy.txt",
    sanitizedName: "people-directory-copy.txt",
    mimeType: "text/plain",
    size: 64,
    uploadedByUserId: "u-clara",
    uploadedByName: "Clara Ashworth",
    createdAt: "2026-10-29T09:00:00.000Z",
  },
  {
    id: "file-linden-1",
    projectId: "proj-linden",
    scope: "content",
    storageId: "seed-linden-service-area-map-notes",
    originalName: "service-area-map-notes.txt",
    sanitizedName: "service-area-map-notes.txt",
    mimeType: "text/plain",
    size: 64,
    uploadedByUserId: "u-tom",
    uploadedByName: "Tom Linden",
    createdAt: "2026-10-16T09:00:00.000Z",
  },
];

// Phase 3 — A29/A15 messages inbox. Royal Trendsy's thread is written so the
// agency has exactly 2 unread (ConversationRead below sits between messages
// 3 and 4) and Ashworth Chambers has exactly 1 — chosen to match the "Unread
// · 3" total across the inbox.
export const SEED_PROJECT_MESSAGES: ProjectMessage[] = [
  {
    id: "msg-royal-trendsy-1",
    projectId: "proj-royal-trendsy",
    authorId: "u-jerry",
    authorName: "Jerry Royal",
    authorRole: "agency",
    body: "Hi Alex, I've shared the homepage design for review.",
    createdAt: "2026-11-18T09:00:00.000Z",
  },
  {
    id: "msg-royal-trendsy-2",
    projectId: "proj-royal-trendsy",
    authorId: "u-alex",
    authorName: "Alex",
    authorRole: "client",
    body: "Great, I'll take a look today.",
    createdAt: "2026-11-18T09:30:00.000Z",
  },
  {
    id: "msg-royal-trendsy-3",
    projectId: "proj-royal-trendsy",
    authorId: "u-jerry",
    authorName: "Jerry Royal",
    authorRole: "agency",
    body: "Just following up — were you able to review it?",
    createdAt: "2026-11-19T10:30:00.000Z",
  },
  {
    id: "msg-royal-trendsy-4",
    projectId: "proj-royal-trendsy",
    authorId: "u-alex",
    authorName: "Alex",
    authorRole: "client",
    body: "Yes! Can you make the hero title smaller?",
    createdAt: "2026-11-19T10:35:00.000Z",
  },
  {
    id: "msg-royal-trendsy-5",
    projectId: "proj-royal-trendsy",
    authorId: "u-alex",
    authorName: "Alex",
    authorRole: "client",
    body: "Also, I've added comments to the footer in the design review.",
    createdAt: "2026-11-19T10:42:00.000Z",
  },
  {
    id: "msg-ashworth-1",
    projectId: "proj-ashworth",
    authorId: "u-jerry",
    authorName: "Jerry Royal",
    authorRole: "agency",
    body: "Hi Clara, sharing the proposal for review.",
    createdAt: "2026-11-18T09:50:00.000Z",
  },
  {
    id: "msg-ashworth-2",
    projectId: "proj-ashworth",
    authorId: "u-clara",
    authorName: "Clara Ashworth",
    authorRole: "client",
    body: "Thanks, I'll review the proposal.",
    createdAt: "2026-11-18T09:55:00.000Z",
  },
  {
    id: "msg-linden-1",
    projectId: "proj-linden",
    authorId: "u-tom",
    authorName: "Tom Linden",
    authorRole: "client",
    body: "The mobile preview looks good.",
    createdAt: "2026-11-18T14:00:00.000Z",
  },
];

export const SEED_CONVERSATION_READS: ConversationRead[] = [
  { id: "read-royal-trendsy-jerry", projectId: "proj-royal-trendsy", userId: "u-jerry", lastReadAt: "2026-11-19T10:30:00.000Z" },
  { id: "read-royal-trendsy-alex", projectId: "proj-royal-trendsy", userId: "u-alex", lastReadAt: "2026-11-19T10:42:00.000Z" },
  { id: "read-ashworth-jerry", projectId: "proj-ashworth", userId: "u-jerry", lastReadAt: "2026-11-18T09:50:00.000Z" },
  { id: "read-ashworth-clara", projectId: "proj-ashworth", userId: "u-clara", lastReadAt: "2026-11-18T09:55:00.000Z" },
  { id: "read-linden-jerry", projectId: "proj-linden", userId: "u-jerry", lastReadAt: "2026-11-18T14:00:00.000Z" },
  { id: "read-linden-tom", projectId: "proj-linden", userId: "u-tom", lastReadAt: "2026-11-18T14:00:00.000Z" },
];

// Phase 3 — A14 notifications. One of every NotificationType (14), plus 6
// repeats on different projects — 20 total, 8 unread, matching the Figma
// mock's "20 updates · 8 unread" exactly by construction.
export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-1",
    projectId: "proj-marlow-finch",
    type: "content_submitted",
    recipientRole: "agency",
    title: "Content submitted",
    body: "Marlow & Finch · Copy for About page",
    createdAt: "2026-11-19T11:58:00.000Z",
  },
  {
    id: "notif-2",
    projectId: "proj-royal-trendsy",
    type: "design_shared",
    recipientRole: "client",
    title: "Design shared for review",
    body: "Royal Trendsy · Homepage v1",
    createdAt: "2026-11-19T11:30:00.000Z",
  },
  {
    id: "notif-3",
    projectId: "proj-royal-trendsy",
    type: "revision_round_submitted",
    recipientRole: "agency",
    title: "Revision round submitted",
    body: "Royal Trendsy · Design round 1",
    createdAt: "2026-11-19T11:52:00.000Z",
  },
  {
    id: "notif-4",
    projectId: "proj-the-downsman",
    type: "design_approved",
    recipientRole: "agency",
    title: "Design approved",
    body: "The Downsman · Homepage v2",
    createdAt: "2026-11-19T09:00:00.000Z",
    readAt: "2026-11-19T09:30:00.000Z",
  },
  {
    id: "notif-5",
    projectId: "proj-marlow-finch",
    type: "revision_round_assigned",
    recipientRole: "agency",
    recipientUserId: "u-jordan",
    title: "Revision assigned to you",
    body: "Marlow & Finch · Round 1",
    createdAt: "2026-11-19T07:00:00.000Z",
    readAt: "2026-11-19T07:10:00.000Z",
  },
  {
    id: "notif-6",
    projectId: "proj-enigma-plates",
    type: "development_shared",
    recipientRole: "client",
    title: "Build shared for review",
    body: "Enigma Plates · Edit v1",
    createdAt: "2026-11-19T11:00:00.000Z",
  },
  {
    id: "notif-7",
    projectId: "proj-linden",
    type: "development_round_submitted",
    recipientRole: "agency",
    title: "Build feedback submitted",
    body: "Linden Surveyors · Round 1",
    createdAt: "2026-11-18T15:00:00.000Z",
    readAt: "2026-11-18T16:00:00.000Z",
  },
  {
    id: "notif-8",
    projectId: "proj-linden",
    type: "build_approved",
    recipientRole: "agency",
    title: "Build approved",
    body: "Linden Surveyors",
    createdAt: "2026-11-18T12:00:00.000Z",
    readAt: "2026-11-18T13:00:00.000Z",
  },
  {
    id: "notif-9",
    projectId: "proj-hart-co",
    type: "final_invoice_due",
    recipientRole: "client",
    title: "Final invoice due",
    body: "Hart & Co · £1,800",
    createdAt: "2026-11-19T08:00:00.000Z",
  },
  {
    id: "notif-10",
    projectId: "proj-the-downsman",
    type: "launch_scheduled",
    recipientRole: "agency",
    title: "Launch scheduled",
    body: "The Downsman · 20 October",
    createdAt: "2026-11-17T10:00:00.000Z",
    readAt: "2026-11-17T11:00:00.000Z",
  },
  {
    id: "notif-11",
    projectId: "proj-gatwick-commercials",
    type: "website_live",
    recipientRole: "agency",
    title: "Website launched",
    body: "Gatwick Commercials · Handover ready",
    createdAt: "2026-11-16T10:00:00.000Z",
    readAt: "2026-11-16T12:00:00.000Z",
  },
  {
    id: "notif-12",
    projectId: "proj-royal-trendsy",
    type: "scope_change_sent",
    recipientRole: "client",
    title: "Scope change awaiting approval",
    body: "Royal Trendsy · Wholesale portal",
    createdAt: "2026-11-19T10:00:00.000Z",
  },
  {
    id: "notif-13",
    projectId: "proj-ashworth",
    type: "scope_change_accepted",
    recipientRole: "agency",
    title: "Scope change accepted",
    body: "Ashworth Chambers",
    createdAt: "2026-11-18T09:00:00.000Z",
    readAt: "2026-11-18T10:00:00.000Z",
  },
  {
    id: "notif-14",
    projectId: "proj-linden",
    type: "scope_change_declined",
    recipientRole: "agency",
    title: "Scope change declined",
    body: "Linden Surveyors",
    createdAt: "2026-11-17T09:00:00.000Z",
    readAt: "2026-11-17T10:00:00.000Z",
  },
  {
    id: "notif-15",
    projectId: "proj-royal-trendsy",
    type: "content_submitted",
    recipientRole: "agency",
    title: "Content submitted",
    body: "Royal Trendsy · Logo and brand guidelines",
    createdAt: "2026-11-18T08:00:00.000Z",
    readAt: "2026-11-18T09:00:00.000Z",
  },
  {
    id: "notif-16",
    projectId: "proj-enigma-plates",
    type: "design_shared",
    recipientRole: "agency",
    title: "Design shared for review",
    body: "Enigma Plates",
    createdAt: "2026-11-19T11:05:00.000Z",
  },
  {
    id: "notif-17",
    projectId: "proj-the-downsman",
    type: "final_invoice_due",
    recipientRole: "agency",
    title: "Final invoice due",
    body: "The Downsman · reminder sent",
    createdAt: "2026-11-17T08:00:00.000Z",
    readAt: "2026-11-17T09:00:00.000Z",
  },
  {
    id: "notif-18",
    projectId: "proj-priory-architects",
    type: "scope_change_sent",
    recipientRole: "agency",
    title: "Scope change awaiting approval",
    body: "Priory Architects",
    createdAt: "2026-11-17T07:00:00.000Z",
    readAt: "2026-11-17T08:00:00.000Z",
  },
  {
    id: "notif-19",
    projectId: "proj-enigma-plates",
    type: "revision_round_assigned",
    recipientRole: "agency",
    recipientUserId: "u-alexmorgan",
    title: "Revision assigned to you",
    body: "Enigma Plates",
    createdAt: "2026-11-19T11:30:00.000Z",
  },
  {
    id: "notif-20",
    projectId: "proj-hart-co",
    type: "development_shared",
    recipientRole: "client",
    title: "Build shared for review",
    body: "Hart & Co",
    createdAt: "2026-11-16T08:00:00.000Z",
    readAt: "2026-11-16T09:00:00.000Z",
  },
];

// Phase 3 — A30/A17 contacts pipeline. Every stage has at least one contact.
export const SEED_CONTACT_STAGES: ContactStage[] = [
  { id: "stage-new", name: "New", order: 0, color: "#8b8fa3" },
  { id: "stage-contacted", name: "Contacted", order: 1, color: "#7aa3f7" },
  { id: "stage-responded", name: "Responded", order: 2, color: "#a78bfa" },
  { id: "stage-won", name: "Won", order: 3, color: "#4ade80" },
  { id: "stage-lost", name: "Lost", order: 4, color: "#f87171" },
];

export const SEED_CONTACTS: Contact[] = [
  {
    id: "contact-mina",
    name: "Mina",
    email: "mina@oakandstone.example.com",
    company: "Oak & Stone",
    stageId: "stage-new",
    createdAt: "2026-11-19T08:00:00.000Z",
  },
  {
    id: "contact-dev-patel",
    name: "Dev Patel",
    email: "dev@southviewhotels.example.com",
    company: "Southview Hotels",
    stageId: "stage-contacted",
    ownerId: "u-jordan",
    ownerName: "Jordan Hale",
    nextFollowUpAt: "2026-11-22",
    notes: "Requested a quote for a booking site.",
    createdAt: "2026-11-15T09:00:00.000Z",
  },
  {
    id: "contact-clara",
    name: "Clara Ashworth",
    email: "clara@ashworthchambers.com",
    company: "Ashworth Chambers",
    stageId: "stage-responded",
    ownerId: "u-jordan",
    ownerName: "Jordan Hale",
    nextFollowUpAt: "2026-11-20",
    proposalProjectId: "proj-ashworth",
    createdAt: "2026-10-27T09:00:00.000Z",
  },
  {
    id: "contact-alex",
    name: "Alex",
    email: "alex@royaltrendsy.com",
    company: "Royal Trendsy",
    stageId: "stage-won",
    ownerId: "u-jerry",
    ownerName: "Jerry Royal",
    proposalProjectId: "proj-royal-trendsy",
    createdAt: "2026-10-14T09:00:00.000Z",
  },
  {
    id: "contact-tom",
    name: "Tom Linden",
    email: "tom@lindensurveyors.com",
    company: "Linden Surveyors",
    stageId: "stage-won",
    ownerId: "u-alexmorgan",
    ownerName: "Alex Morgan",
    proposalProjectId: "proj-linden",
    createdAt: "2026-09-19T09:00:00.000Z",
  },
  {
    id: "contact-jane",
    name: "Jane Hart",
    email: "jane@hartandco.com",
    company: "Hart & Co",
    stageId: "stage-won",
    ownerId: "u-jerry",
    ownerName: "Jerry Royal",
    proposalProjectId: "proj-hart-co",
    createdAt: "2026-10-04T09:00:00.000Z",
  },
  {
    id: "contact-sam",
    name: "Sam Okafor",
    email: "sam@marlowfinch.com",
    company: "Marlow & Finch",
    stageId: "stage-won",
    ownerId: "u-jordan",
    ownerName: "Jordan Hale",
    proposalProjectId: "proj-marlow-finch",
    createdAt: "2026-11-09T09:00:00.000Z",
  },
  {
    id: "contact-isla",
    name: "Isla Finch",
    email: "isla@priory-architects.com",
    company: "Priory Architects",
    stageId: "stage-won",
    ownerId: "u-mara",
    ownerName: "Mara Islam",
    proposalProjectId: "proj-priory-architects",
    createdAt: "2026-11-04T09:00:00.000Z",
  },
  {
    id: "contact-robin",
    name: "Robin Oduya",
    email: "robin@enigmaplates.com",
    company: "Enigma Plates",
    stageId: "stage-won",
    ownerId: "u-alexmorgan",
    ownerName: "Alex Morgan",
    proposalProjectId: "proj-enigma-plates",
    createdAt: "2026-11-13T09:00:00.000Z",
  },
  {
    id: "contact-noah",
    name: "Noah Clarke",
    email: "noah@clarkeandpike.example.com",
    company: "Clarke & Pike",
    stageId: "stage-lost",
    ownerId: "u-jerry",
    ownerName: "Jerry Royal",
    notes: "Proposal declined — budget didn't fit this quarter.",
    createdAt: "2026-10-01T09:00:00.000Z",
  },
];

export const SEED_CONTACT_ACTIVITIES: ContactActivity[] = [
  { id: "activity-mina-1", contactId: "contact-mina", type: "enquiry_received", body: "Enquiry received", createdAt: "2026-11-19T08:00:00.000Z" },
  { id: "activity-clara-1", contactId: "contact-clara", type: "enquiry_received", body: "Enquiry received", createdAt: "2026-10-27T09:00:00.000Z" },
  { id: "activity-clara-2", contactId: "contact-clara", type: "note", body: "Discovery call completed", createdAt: "2026-10-28T09:00:00.000Z" },
  { id: "activity-clara-3", contactId: "contact-clara", type: "proposal_sent", body: "Proposal sent", createdAt: "2026-10-30T09:00:00.000Z" },
  { id: "activity-alex-1", contactId: "contact-alex", type: "proposal_accepted", body: "Proposal accepted", createdAt: "2026-11-02T10:00:00.000Z" },
  { id: "activity-noah-1", contactId: "contact-noah", type: "proposal_declined", body: "Proposal declined", createdAt: "2026-10-01T09:00:00.000Z" },
];

export const SEED_AGENCY_SETTINGS: AgencySettings = {
  agencyName: "Royal Creative",
  defaultCurrency: "GBP",
  paymentInstructions: "Bank transfer to Royal Creative Ltd, sort code 12-34-56, account 12345678 — or pay by card via the link on your invoice.",
  ownerName: "Jerry Royal",
  ownerPhone: "+44 7700 900123",
  ownerWhatsapp: "+44 7700 900123",
  notifications: { emailAlerts: true, inAppAlerts: true, paymentDateReminders: true },
};

// Fixed, not randomly generated: seed data must be deterministic across
// separate module realms (e.g. Next.js dev mode evaluates route handlers and
// page renders in distinct Turbopack realms, so a `generateShareToken()` call
// here would produce a different value in each realm and never match itself).
// generateShareToken() is still used when a real share link is created at
// request time, where generation and consumption happen in the same request.
export const ROYAL_TRENDSY_SHARE_TOKEN = "seed-royal-trendsy-brief-k7f2m9qzsc1h4wxbrpg6nue8";

export const SEED_SHARE_LINKS: ShareLink[] = [
  {
    token: ROYAL_TRENDSY_SHARE_TOKEN,
    projectId: "proj-royal-trendsy",
    createdAt: "2026-10-30T09:00:00.000Z",
    expiresAt: "2026-12-31T23:59:59.000Z",
  },
];
