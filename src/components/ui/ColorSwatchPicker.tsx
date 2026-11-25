import { cn } from "@/lib/utils";

export interface ColorSwatchPickerProps {
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorSwatchPicker({ colors, value, onChange, label = "Colour" }: ColorSwatchPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-secondary">{label}</p>
      <div className="flex flex-wrap gap-2">
        {colors.map((color, index) => (
          <button
            key={color}
            type="button"
            aria-label={index === 0 ? "No colour" : `Use colour ${color}`}
            aria-pressed={value === color}
            onClick={() => onChange(color)}
            title={index === 0 ? "No colour" : undefined}
            className={cn(
              "flex size-7 items-center justify-center rounded-full border border-line ring-offset-2 ring-offset-surface-2",
              value === color && "ring-2 ring-ink",
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}
