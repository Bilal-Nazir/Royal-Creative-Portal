import { projectRepository, invoiceRepository, proposalRepository } from "../repositories/container";
import { computePaymentMetrics } from "./invoice-service";
import { PROJECT_TYPES, type Project } from "../domain/project";
import type { Invoice } from "../domain/invoice";
import type { AgencyOverview, MetricCard, ComparisonPanel } from "../domain/dashboard";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface MonthBounds {
  year: number;
  month: number; // 0-indexed
}

function monthOf(iso: string): MonthBounds {
  const d = new Date(iso);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

function sameMonth(iso: string, bounds: MonthBounds): boolean {
  const m = monthOf(iso);
  return m.year === bounds.year && m.month === bounds.month;
}

function previousMonth(bounds: MonthBounds): MonthBounds {
  return bounds.month === 0 ? { year: bounds.year - 1, month: 11 } : { year: bounds.year, month: bounds.month - 1 };
}

function deltaLabel(current: number, previous: number, noun: string): { label: string; tone: MetricCard["tone"] } {
  const diff = current - previous;
  if (diff === 0) return { label: `No change vs last month (${noun})`, tone: "neutral" };
  const sign = diff > 0 ? "+" : "";
  return { label: `${sign}${diff} ${noun} vs last month`, tone: diff > 0 ? "success" : "warning" };
}

/**
 * Phase 3: every figure below is computed from real Project/Invoice/
 * ProposalVersion records — the illustrative hardcoded AgencyOverview this
 * used to return is gone (see DESIGN_NOTES). Month-vs-previous-month deltas
 * use each record's own timestamp: Project.createdAt for "new" counts,
 * Project.handoverAt for completions, Invoice.paidAt for collections,
 * Invoice.dueDate for overdue bucketing — there's no stage-change history to
 * draw on, so snapshot metrics (e.g. "Running with team") compare how many
 * of today's matching projects were *created* this month vs last, not a
 * true historical snapshot delta.
 */
export async function getAgencyOverview(): Promise<AgencyOverview> {
  const now = new Date();
  const current: MonthBounds = { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  const previous = previousMonth(current);

  const [allProjects, allInvoices, allProposals] = await Promise.all([
    projectRepository.listAll(),
    invoiceRepository.listAll(),
    proposalRepository.listAll(),
  ]);

  const active = allProjects.filter((p) => p.stage !== "handover");
  const createdThisMonth = (ps: Project[]) => ps.filter((p) => sameMonth(p.createdAt, current)).length;
  const createdLastMonth = (ps: Project[]) => ps.filter((p) => sameMonth(p.createdAt, previous)).length;

  const runningWithTeam = active.filter((p) => p.waitingOn === "agency");
  const waitingOnClients = active.filter((p) => p.waitingOn === "client");
  const awaitingProposal = active.filter((p) => p.stage === "proposal");
  const outstandingStatuses: Invoice["status"][] = ["unpaid", "promised", "unverified", "partially_paid", "overdue"];
  const awaitingPaymentProjectIds = new Set(allInvoices.filter((i) => outstandingStatuses.includes(i.status)).map((i) => i.projectId));
  const completedThisMonth = allProjects.filter((p) => p.handoverAt && sameMonth(p.handoverAt, current));
  const completedLastMonth = allProjects.filter((p) => p.handoverAt && sameMonth(p.handoverAt, previous));

  const activeDelta = deltaLabel(createdThisMonth(active), createdLastMonth(active), "new");
  const teamDelta = deltaLabel(createdThisMonth(runningWithTeam), createdLastMonth(runningWithTeam), "new");
  const clientsDelta = deltaLabel(createdThisMonth(waitingOnClients), createdLastMonth(waitingOnClients), "new");
  const proposalDelta = deltaLabel(createdThisMonth(awaitingProposal), createdLastMonth(awaitingProposal), "new");
  const completedDelta = deltaLabel(completedThisMonth.length, completedLastMonth.length, "vs");

  const metricCards: MetricCard[] = [
    { label: "Active projects", value: String(active.length), deltaLabel: activeDelta.label, tone: activeDelta.tone },
    { label: "Running with team", value: String(runningWithTeam.length), deltaLabel: teamDelta.label, tone: teamDelta.tone },
    { label: "Waiting on clients", value: String(waitingOnClients.length), deltaLabel: clientsDelta.label, tone: clientsDelta.tone },
    { label: "Awaiting proposal", value: String(awaitingProposal.length), deltaLabel: proposalDelta.label, tone: proposalDelta.tone },
    { label: "Awaiting payment", value: String(awaitingPaymentProjectIds.size), deltaLabel: "Outstanding invoices, any status", tone: "neutral" },
    {
      label: "Completed this month",
      value: String(completedThisMonth.length),
      deltaLabel: `${completedDelta.label.replace("vs", String(completedLastMonth.length))} last month`,
      tone: completedDelta.tone,
    },
  ];

  const newCount = (bounds: MonthBounds) => allProjects.filter((p) => sameMonth(p.createdAt, bounds)).length;
  const completedCount = (bounds: MonthBounds) => allProjects.filter((p) => p.handoverAt && sameMonth(p.handoverAt, bounds)).length;
  const overdueCount = (bounds: MonthBounds) => allInvoices.filter((i) => i.status === "overdue" && sameMonth(i.dueDate, bounds)).length;

  const deliveryComparison: ComparisonPanel = {
    title: "Delivery comparison",
    subtitle: `${MONTH_NAMES[current.month]} vs ${MONTH_NAMES[previous.month]} ${current.year}`,
    footnote: `White = ${MONTH_NAMES[current.month]} · Grey = ${MONTH_NAMES[previous.month]}`,
    series: [
      { label: "New", previous: newCount(previous), current: newCount(current), formatValue: (v) => String(v) },
      { label: "Completed", previous: completedCount(previous), current: completedCount(current), formatValue: (v) => String(v) },
      { label: "Overdue", previous: overdueCount(previous), current: overdueCount(current), formatValue: (v) => String(v) },
    ],
  };

  const paidSumByType = (type: Invoice["type"], bounds: MonthBounds) =>
    allInvoices
      .filter((i) => i.type === type && i.status === "paid" && i.paidAt && sameMonth(i.paidAt, bounds))
      .reduce((sum, i) => sum + i.amount, 0);

  const collectionsByMilestone: ComparisonPanel = {
    title: "Collections by milestone",
    subtitle: `${MONTH_NAMES[current.month]} vs ${MONTH_NAMES[previous.month]} ${current.year}`,
    footnote: `White = ${MONTH_NAMES[current.month]} · Grey = ${MONTH_NAMES[previous.month]}`,
    series: [
      {
        label: "Deposit",
        previous: paidSumByType("deposit", previous),
        current: paidSumByType("deposit", current),
        formatValue: (v) => `£${v.toLocaleString("en-GB")}`,
      },
      {
        label: "Progress",
        previous: paidSumByType("progress", previous),
        current: paidSumByType("progress", current),
        formatValue: (v) => `£${v.toLocaleString("en-GB")}`,
      },
      {
        label: "Final",
        previous: paidSumByType("final", previous),
        current: paidSumByType("final", current),
        formatValue: (v) => `£${v.toLocaleString("en-GB")}`,
      },
    ],
  };

  const activeProjectsByType = PROJECT_TYPES.map((type) => ({
    label: type,
    count: active.filter((p) => p.projectType === type).length,
  })).filter((row) => row.count > 0);

  const decidedProposals = allProposals.filter((p) => p.status !== "draft");
  const acceptedProposals = allProposals.filter((p) => p.status === "accepted");
  const acceptanceRate = decidedProposals.length === 0 ? 0 : Math.round((acceptedProposals.length / decidedProposals.length) * 100);

  const paymentMetrics = computePaymentMetrics(allInvoices);
  const completedProjects = allProjects.filter((p) => p.handoverAt);
  const onTimeCompleted = completedProjects.filter((p) => p.handoverAt! <= p.dueDate);
  const onTimeRate = completedProjects.length === 0 ? 0 : Math.round((onTimeCompleted.length / completedProjects.length) * 100);

  return {
    periodLabel: `${MONTH_NAMES[current.month]} ${current.year} · Compared with ${MONTH_NAMES[previous.month]}`,
    metricCards,
    deliveryComparison,
    collectionsByMilestone,
    activeProjectsByType,
    activeProjectsByTypeFootnote: `${active.length} active project${active.length === 1 ? "" : "s"} · One primary type per project`,
    commercialSnapshot: [
      {
        label: "Proposal acceptance",
        sublabel: `${acceptedProposals.length} accepted / ${decidedProposals.length} sent proposals`,
        valueLabel: `${acceptanceRate}%`,
        tone: acceptanceRate >= 50 ? "success" : "warning",
      },
      {
        label: "Outstanding invoices",
        sublabel: paymentMetrics.overdue > 0 ? `Includes £${paymentMetrics.overdue.toLocaleString("en-GB")} overdue` : "None overdue",
        valueLabel: `£${paymentMetrics.outstanding.toLocaleString("en-GB")}`,
        tone: paymentMetrics.overdue > 0 ? "warning" : "success",
      },
      {
        label: "On-time completion",
        sublabel: `${onTimeCompleted.length} of ${completedProjects.length} completed projects`,
        valueLabel: `${onTimeRate}%`,
        tone: onTimeRate >= 75 ? "success" : "warning",
      },
    ],
  };
}
