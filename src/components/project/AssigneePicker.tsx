"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "../ui/Avatar";
import { cn } from "@/lib/utils";

export interface AssigneeOption {
  id: string;
  name: string;
}

export interface AssigneePickerProps {
  assignees: AssigneeOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

/** Click-the-avatar-to-reassign control used by the Jira-style quick-create card and the project details editor. */
export function AssigneePicker({ assignees, value, onChange, className }: AssigneePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = assignees.find((a) => a.id === value);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={selected ? `Assignee: ${selected.name}` : "Pick an assignee"}
        className="flex items-center justify-center rounded-full ring-offset-2 ring-offset-surface-2 hover:ring-2 hover:ring-line"
      >
        {selected ? (
          <Avatar name={selected.name} />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full border border-dashed border-line text-xs text-ink-secondary">?</span>
        )}
      </button>
      {open ? (
        <div className="absolute z-20 mt-1 flex max-h-[240px] w-[220px] flex-col gap-0.5 overflow-y-auto rounded-rc-control border border-line bg-surface-2 p-1 shadow-lg">
          {assignees.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                onChange(a.id);
                setOpen(false);
              }}
              className={cn("flex w-full items-center gap-2 rounded-md p-2 text-left text-sm text-ink hover:bg-line", a.id === value && "bg-line")}
            >
              <Avatar name={a.name} size={22} />
              {a.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
