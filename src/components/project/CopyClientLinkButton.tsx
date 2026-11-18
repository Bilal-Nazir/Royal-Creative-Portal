"use client";

import { useState } from "react";
import { Button } from "../ui/Button";

/** A05's "Copy client link" — fetches (and lazily creates) the project's guest share link, then copies the full URL. */
export function CopyClientLinkButton({ projectId }: { projectId: string }) {
  const [state, setState] = useState<"idle" | "copying" | "copied" | "error">("idle");

  async function handleClick() {
    setState("copying");
    try {
      const response = await fetch(`/api/projects/${projectId}/share-link`);
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setState("error");
        return;
      }
      await navigator.clipboard.writeText(`${window.location.origin}${data.path}`);
      setState("copied");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="secondary" onClick={handleClick} className="w-[196px]">
        {state === "copying" ? "Copying…" : state === "copied" ? "Link copied!" : "Copy client link"}
      </Button>
      {state === "error" ? (
        <p role="alert" className="text-xs text-danger">
          Couldn&apos;t copy the link.
        </p>
      ) : null}
    </div>
  );
}
