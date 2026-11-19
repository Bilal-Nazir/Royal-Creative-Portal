"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function LaunchDetailsForm({
  projectId,
  initialLaunchDate,
  initialLiveUrl,
  allChecksComplete,
}: {
  projectId: string;
  initialLaunchDate?: string;
  initialLiveUrl?: string;
  allChecksComplete: boolean;
}) {
  const router = useRouter();
  const [launchDate, setLaunchDate] = useState(initialLaunchDate ?? "");
  const [liveUrl, setLiveUrl] = useState(initialLiveUrl ?? "");
  const [savingDetails, setSavingDetails] = useState(false);
  const [goingLive, setGoingLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveDetails() {
    setSavingDetails(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/launch/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ launchDate, liveUrl }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't save launch details.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't save launch details.");
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleGoLive() {
    setGoingLive(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/launch/go-live`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't go live.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't go live.");
    } finally {
      setGoingLive(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Agreed launch date" type="date" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} />
      <Field label="Live website URL" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://royaltrendsy.example" />
      <div className="flex items-start gap-3">
        <Button type="button" variant="secondary" disabled={savingDetails} onClick={handleSaveDetails} className="w-[196px]">
          {savingDetails ? "Saving…" : "Save launch details"}
        </Button>
        <Button type="button" variant="primary" disabled={!allChecksComplete || goingLive} onClick={handleGoLive} className="w-[196px]">
          {goingLive ? "Launching…" : "Launch website"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
