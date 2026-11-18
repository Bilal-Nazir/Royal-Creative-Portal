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
 * Agency-wide figures shown on the A00 dashboard. In Figma these are
 * explicitly labelled "Illustrative sample data" and don't need to
 * reconcile with the handful of seeded projects in the in-memory
 * repository — a real implementation would aggregate this from the
 * full project set once there's a database behind it.
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
