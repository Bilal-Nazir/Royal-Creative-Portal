import { hashPassword } from "../../auth/password";
import type { User } from "../../domain/user";
import type { Project, ActivityItem, AttentionTask } from "../../domain/project";
import type { AgencyOverview } from "../../domain/dashboard";

/**
 * Phase 1 seed content, mirrored from the Figma sample data (Royal Trendsy,
 * Ashworth Chambers, Linden Surveyors, Jerry Royal, Jordan Hale, Alex Morgan).
 * All seeded users share the password below — this is throwaway demo auth,
 * not meant to survive past Phase 1.
 */
export const SEED_PASSWORD = "password123";
const seedHash = hashPassword(SEED_PASSWORD);

export const SEED_USERS: User[] = [
  {
    id: "u-jerry",
    role: "agency",
    agencyRole: "owner",
    name: "Jerry Royal",
    email: "jerry@royalcreative.co",
    passwordHash: seedHash,
  },
  {
    id: "u-mara",
    role: "agency",
    agencyRole: "admin",
    name: "Mara Islam",
    email: "mara@royalcreative.co",
    passwordHash: seedHash,
  },
  {
    id: "u-jordan",
    role: "agency",
    agencyRole: "member",
    name: "Jordan Hale",
    email: "jordan@royalcreative.co",
    passwordHash: seedHash,
  },
  {
    id: "u-alexmorgan",
    role: "agency",
    agencyRole: "member",
    name: "Alex Morgan",
    email: "alex.morgan@royalcreative.co",
    passwordHash: seedHash,
  },
  {
    id: "u-alex",
    role: "client",
    clientRole: "participant",
    clientId: "royal-trendsy",
    name: "Alex",
    email: "alex@royaltrendsy.com",
    passwordHash: seedHash,
  },
  {
    id: "u-priya",
    role: "client",
    clientRole: "viewer",
    clientId: "royal-trendsy",
    name: "Priya Shah",
    email: "priya@royaltrendsy.com",
    passwordHash: seedHash,
  },
  {
    id: "u-clara",
    role: "client",
    clientRole: "participant",
    clientId: "ashworth-chambers",
    name: "Clara Ashworth",
    email: "clara@ashworthchambers.com",
    passwordHash: seedHash,
  },
  {
    id: "u-tom",
    role: "client",
    clientRole: "participant",
    clientId: "linden-surveyors",
    name: "Tom Linden",
    email: "tom@lindensurveyors.com",
    passwordHash: seedHash,
  },
];

export const SEED_PROJECTS: Project[] = [
  {
    id: "proj-royal-trendsy",
    name: "Royal Trendsy website",
    description:
      "Design and build an ecommerce website for Royal Trendsy, including a product catalogue, checkout and responsive layouts.",
    projectType: "Website development",
    clientId: "royal-trendsy",
    clientName: "Royal Trendsy",
    contactName: "Jerry Royal",
    stage: "design",
    statusLabel: "Revision in progress",
    clientStatusLabel: "In progress",
    waitingOn: "agency",
    assigneeId: "u-jordan",
    assigneeName: "Jordan Hale",
    dueDate: "2026-11-04",
    openRevisions: 2,
    nextMilestone: { label: "Homepage approval", date: "2026-11-04", waitingOn: "client" },
    launchChecklist: { clientApproval: false, finalPayment: false, domainHosting: false, qualityChecks: false },
    forcedAdvances: [
      {
        stage: "design",
        byUserId: "u-jerry",
        byUserName: "Jerry Royal",
        at: "2026-10-29T10:00:00.000Z",
      },
    ],
  },
  {
    id: "proj-ashworth",
    name: "Ashworth Chambers website",
    description: "A modern, professional website for Ashworth Chambers with a people directory and case studies.",
    projectType: "Website development",
    clientId: "ashworth-chambers",
    clientName: "Ashworth Chambers",
    contactName: "Jerry Royal",
    stage: "proposal",
    statusLabel: "Awaiting proposal approval",
    clientStatusLabel: "Awaiting your approval",
    waitingOn: "client",
    assigneeId: "u-jordan",
    assigneeName: "Jordan Hale",
    dueDate: "2026-11-05",
    openRevisions: 0,
    nextMilestone: { label: "Proposal decision", date: "2026-11-05", waitingOn: "client" },
    launchChecklist: { clientApproval: false, finalPayment: false, domainHosting: false, qualityChecks: false },
    forcedAdvances: [],
  },
  {
    id: "proj-linden",
    name: "Linden Surveyors website",
    description: "A lead-generating website for Linden Surveyors with an instant quote form and service area map.",
    projectType: "Website development",
    clientId: "linden-surveyors",
    clientName: "Linden Surveyors",
    contactName: "Jerry Royal",
    stage: "development",
    statusLabel: "Awaiting build review",
    clientStatusLabel: "In progress",
    waitingOn: "client",
    assigneeId: "u-alexmorgan",
    assigneeName: "Alex Morgan",
    dueDate: "2026-11-06",
    openRevisions: 1,
    nextMilestone: { label: "Build review", date: "2026-11-06", waitingOn: "client" },
    launchChecklist: { clientApproval: false, finalPayment: false, domainHosting: false, qualityChecks: false },
    forcedAdvances: [],
  },
];

export const SEED_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-design-submitted",
    projectId: "proj-royal-trendsy",
    title: "Design submitted",
    description: "Jerry shared the first homepage design",
    occurredLabel: "Today",
  },
  {
    id: "act-content-received",
    projectId: "proj-royal-trendsy",
    title: "Content received",
    description: "Your logo and company details were accepted",
    occurredLabel: "Yesterday",
  },
];

export const SEED_ATTENTION_TASKS: AttentionTask[] = [
  {
    id: "attn-review-homepage",
    projectId: "proj-royal-trendsy",
    title: "Review your homepage design",
    subtitle: "Royal Trendsy · Version 1 · Sent 30 October",
    badgeLabel: "Ready for review",
    ctaLabel: "Review design",
  },
];

// Figma labels this panel "Illustrative sample data" — these aggregate
// figures intentionally don't reconcile with SEED_PROJECTS above. A real
// implementation would replace this repository with one that aggregates
// the full project set from a database.
export const SEED_AGENCY_OVERVIEW: AgencyOverview = {
  periodLabel: "October 2026 · Compared with September · Illustrative sample data",
  metricCards: [
    { label: "Active projects", value: "24", deltaLabel: "+4 vs September", tone: "success" },
    { label: "Running with team", value: "8", deltaLabel: "+2 vs September", tone: "success" },
    { label: "Waiting on clients", value: "5", deltaLabel: "−1 vs September", tone: "success" },
    { label: "Awaiting proposal", value: "4", deltaLabel: "+1 vs September", tone: "warning" },
    { label: "Awaiting payment", value: "3", deltaLabel: "−1 vs September", tone: "success" },
    { label: "Completed this month", value: "8", deltaLabel: "+2 vs September", tone: "success" },
  ],
  deliveryComparison: {
    title: "Delivery comparison",
    subtitle: "October vs September 2026 · Illustrative sample data",
    footnote: "White = October · Grey = September",
    series: [
      { label: "New", previous: 8, current: 10, formatValue: (v) => String(v) },
      { label: "Completed", previous: 6, current: 8, formatValue: (v) => String(v) },
      { label: "Overdue", previous: 5, current: 3, formatValue: (v) => String(v) },
    ],
  },
  collectionsByMilestone: {
    title: "Collections by milestone",
    subtitle: "October vs September 2026 · Illustrative sample data",
    footnote: "White = October · Grey = September",
    series: [
      { label: "Deposit", previous: 7100, current: 8400, formatValue: (v) => `£${v.toLocaleString("en-GB")}` },
      { label: "Progress", previous: 2100, current: 2400, formatValue: (v) => `£${v.toLocaleString("en-GB")}` },
      { label: "Final", previous: 5000, current: 6000, formatValue: (v) => `£${v.toLocaleString("en-GB")}` },
    ],
  },
  activeProjectsByType: [
    { label: "Website development", count: 8 },
    { label: "SEO", count: 5 },
    { label: "Digital marketing", count: 4 },
    { label: "Video production", count: 3 },
    { label: "Branding", count: 2 },
    { label: "Website maintenance", count: 2 },
  ],
  activeProjectsByTypeFootnote: "24 active projects · One primary type per project · Sample data",
  commercialSnapshot: [
    {
      label: "Proposal acceptance",
      sublabel: "8 accepted / 12 decided proposals",
      valueLabel: "67%",
      tone: "success",
    },
    {
      label: "Outstanding invoices",
      sublabel: "Includes £2,800 overdue",
      valueLabel: "£7,200",
      tone: "warning",
    },
    {
      label: "On-time completion",
      sublabel: "7 of 8 completed projects",
      valueLabel: "88%",
      tone: "success",
    },
  ],
};
