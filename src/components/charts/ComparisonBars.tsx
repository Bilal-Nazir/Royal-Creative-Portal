import type { ComparisonPanel } from "@/server/domain/dashboard";

export interface ComparisonBarsProps {
  panel: ComparisonPanel;
}

/**
 * Plain CSS bar chart (no chart library) matching the two comparison panels
 * on the A00 agency dashboard. The grey/near-white bar colours are literal
 * Figma values — they aren't part of the Foundations palette, see
 * DESIGN_NOTES.md.
 */
export function ComparisonBars({ panel }: ComparisonBarsProps) {
  const max = Math.max(...panel.series.flatMap((s) => [s.previous, s.current]), 1);

  return (
    <div className="flex flex-col gap-3.5 rounded-rc border border-line bg-surface p-5">
      <h3 className="font-heading text-xl font-semibold text-ink">{panel.title}</h3>
      <p className="text-xs text-ink-secondary">{panel.subtitle}</p>
      <div className="flex items-end gap-4">
        {panel.series.map((series) => (
          <div key={series.label} className="flex w-[164px] flex-col gap-2">
            <div className="flex h-[145px] items-end gap-1.5" aria-hidden="true">
              <div
                className="w-full rounded-[4px] bg-[#595963]"
                style={{ height: `${(series.previous / max) * 100}%` }}
              />
              <div
                className="w-full rounded-[4px] bg-[#ebebf0]"
                style={{ height: `${(series.current / max) * 100}%` }}
              />
            </div>
            <p className="text-xs text-ink-secondary">{series.label}</p>
            <p className="text-xs text-ink">
              {series.formatValue(series.current)} / {series.formatValue(series.previous)}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-secondary">{panel.footnote}</p>
    </div>
  );
}
