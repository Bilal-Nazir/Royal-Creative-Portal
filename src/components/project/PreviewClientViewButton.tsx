"use client";

import { useState } from "react";
import { Button } from "../ui/Button";

/** Figma's "Preview client view" (5:366 / 5:445) — opens the real guest share link (C01) in a new tab. */
export function PreviewClientViewButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(`/api/projects/${projectId}/share-link`);
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(true);
        return;
      }
      window.open(data.path, "_blank", "noopener,noreferrer");
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="secondary" onClick={handleClick} disabled={loading} className="w-[196px]">
        {loading ? "Opening…" : "Preview client view"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          Couldn&apos;t open the preview.
        </p>
      ) : null}
    </div>
  );
}
