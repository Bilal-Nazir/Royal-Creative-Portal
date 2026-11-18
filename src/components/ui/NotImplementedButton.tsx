"use client";

import { useState } from "react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export interface NotImplementedButtonProps {
  label: string;
  message?: string;
  className?: string;
}

/** For buttons whose real behaviour (e.g. PDF generation) isn't built yet — keeps the UI, says so clearly on click. */
export function NotImplementedButton({
  label,
  message = "PDF export isn't available yet — it's coming in a later phase.",
  className,
}: NotImplementedButtonProps) {
  const [showMessage, setShowMessage] = useState(false);

  return (
    <div className={cn("flex flex-col items-end gap-2", className)}>
      <Button variant="secondary" onClick={() => setShowMessage(true)} className="w-[196px]">
        {label}
      </Button>
      {showMessage ? (
        <p role="status" className="text-xs text-ink-secondary">
          {message}
        </p>
      ) : null}
    </div>
  );
}
