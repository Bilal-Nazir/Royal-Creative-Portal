"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

export function ChecklistToggle({
  projectId,
  item,
  initialValue,
}: {
  projectId: string;
  item: "domainHosting" | "qualityChecks";
  initialValue: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);

  async function handleToggle() {
    const next = !value;
    setValue(next);
    setSubmitting(true);
    try {
      await fetch(`/api/projects/${projectId}/launch/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, value: next }),
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button type="button" onClick={handleToggle} disabled={submitting}>
      <Badge tone={value ? "success" : "neutral"}>{value ? "Complete" : "Mark complete"}</Badge>
    </button>
  );
}
