"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildMonthGrid(year: number, monthIndex: number): Array<number | null> {
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  // getUTCDay(): 0=Sun..6=Sat. We want a Mon-first offset (0=Mon..6=Sun).
  const mondayFirstOffset = (firstOfMonth.getUTCDay() + 6) % 7;

  const cells: Array<number | null> = Array.from({ length: mondayFirstOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toISODate(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

export interface DatePickerFormProps {
  projectId: string;
  year: number;
  monthIndex: number;
  monthLabel: string;
  initialDay: number;
}

export function DatePickerForm({ projectId, year, monthIndex, monthLabel, initialDay }: DatePickerFormProps) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cells = buildMonthGrid(year, monthIndex);
  const selectedIso = toISODate(year, monthIndex, selectedDay);
  const selectedLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(selectedIso),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/deposit/choose-date`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedIso }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't save that date.");
        setSubmitting(false);
        return;
      }
      router.push(`/projects/${projectId}/deposit`);
      router.refresh();
    } catch {
      setError("Couldn't save that date.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold text-ink">{monthLabel}</h2>
      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="flex h-10 items-center justify-center text-[13px] text-ink">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, index) => (
            <button
              type="button"
              key={index}
              disabled={day === null}
              onClick={() => day && setSelectedDay(day)}
              aria-pressed={day === selectedDay}
              className={cn(
                "flex h-10 items-center justify-center rounded-[8px] text-[13px] text-ink",
                day === selectedDay && "bg-brand-primary",
              )}
            >
              {day ?? ""}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[13px] font-medium text-ink">Selected date</p>
      <Field label="Selected date" hideLabel id="selectedDate" value={selectedLabel} readOnly inputClassName="w-full sm:w-[1096px]" />

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={submitting} className="w-[196px]">
          {submitting ? "Saving…" : "Confirm payment date"}
        </Button>
        <Button href={`/projects/${projectId}/deposit`} variant="secondary" className="w-[196px]">
          Cancel
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
