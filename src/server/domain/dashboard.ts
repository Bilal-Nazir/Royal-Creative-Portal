export interface MetricCard {
  label: string;
  value: string;
  deltaLabel: string;
  tone: "success" | "warning" | "neutral";
}

export interface ComparisonSeries {
  label: string;
  previous: number;
  current: number;
  formatValue: (value: number) => string;
}

export interface ComparisonPanel {
  title: string;
  subtitle: string;
  footnote: string;
  series: ComparisonSeries[];
}

export interface ProjectTypeBreakdown {
  label: string;
  count: number;
}

export interface CommercialMetric {
  label: string;
  sublabel: string;
  valueLabel: string;
  tone: "success" | "warning" | "neutral";
}

/**
 * Agency-wide figures shown on the A00 dashboard. Phase 3: computed live
 * from real Project/Invoice/ProposalVersion records by dashboard-service.ts
 * — no longer the illustrative hardcoded data Figma's own mock used.
 */
export interface AgencyOverview {
  periodLabel: string;
  metricCards: MetricCard[];
  deliveryComparison: ComparisonPanel;
  collectionsByMilestone: ComparisonPanel;
  activeProjectsByType: ProjectTypeBreakdown[];
  activeProjectsByTypeFootnote: string;
  commercialSnapshot: CommercialMetric[];
}
