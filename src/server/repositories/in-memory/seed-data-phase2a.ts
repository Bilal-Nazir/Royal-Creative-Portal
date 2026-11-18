import type { BriefVersion } from "../../domain/brief";
import type { ProposalVersion, AcceptanceRecord } from "../../domain/proposal";
import type { Invoice } from "../../domain/invoice";
import type { Comment } from "../../domain/comment";
import type { ContentChecklistItem } from "../../domain/content";
import type { ShareLink } from "../../domain/share-link";

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

/**
 * A04's client/contact selector (not in Figma — see DESIGN_NOTES). Every
 * existing clientId needs an entry so "Create project" can target a real
 * client. Keyed by the same clientId used throughout Project/User.
 */
export interface ClientDirectoryEntry {
  clientId: string;
  clientName: string;
  contactName: string;
}

export const CLIENT_DIRECTORY: ClientDirectoryEntry[] = [
  { clientId: "royal-trendsy", clientName: "Royal Trendsy", contactName: "Alex" },
  { clientId: "ashworth-chambers", clientName: "Ashworth Chambers", contactName: "Clara Ashworth" },
  { clientId: "linden-surveyors", clientName: "Linden Surveyors", contactName: "Tom Linden" },
];

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
    accepted: true,
  },
  {
    id: "content-royal-trendsy-company",
    projectId: "proj-royal-trendsy",
    label: "Company details",
    required: true,
    accepted: true,
  },
  {
    id: "content-royal-trendsy-copy",
    projectId: "proj-royal-trendsy",
    label: "Services and website copy",
    required: true,
    accepted: true,
  },
  {
    id: "content-royal-trendsy-images",
    projectId: "proj-royal-trendsy",
    label: "Images and videos",
    required: true,
    accepted: false,
  },
];

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
