"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { PinCommentStatus } from "@/server/domain/design";

export interface OverlayPin {
  id: string;
  number: number;
  xPercent: number;
  yPercent: number;
  isDraft: boolean;
  status: PinCommentStatus;
}

export interface PinOverlayProps {
  screenshotUrl: string;
  alt: string;
  pins: OverlayPin[];
  activePinId?: string | null;
  /** When true, clicking/tapping the screenshot drops a new pin at that position (C12/R01). When false, the overlay is read-only (R17, or no version yet). */
  placing: boolean;
  onPlacePin?: (xPercent: number, yPercent: number) => void;
  onPinClick?: (pinId: string) => void;
}

const PIN_TONE: Record<PinCommentStatus, string> = {
  open: "bg-surface-2 text-ink",
  in_progress: "bg-info text-ink",
  resolved: "bg-success text-ink",
};

/**
 * Renders the design screenshot with numbered pin markers positioned by
 * percentage (not pixels) so they stay correctly placed at any viewport
 * width — including the 390px mobile breakpoint, where the same `onClick`
 * handler on the image container fires for a tap as it does for a desktop
 * click, so "drop a pin" works identically on both.
 */
export function PinOverlay({ screenshotUrl, alt, pins, activePinId, placing, onPlacePin, onPinClick }: PinOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  function handleContainerClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!placing || !onPlacePin || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
    onPlacePin(Math.min(100, Math.max(0, xPercent)), Math.min(100, Math.max(0, yPercent)));
  }

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className={cn("relative w-full overflow-hidden rounded-rc-control bg-white", placing && "cursor-crosshair")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- screenshot bytes come from an authorized API route, not next/image's remote-pattern allowlist */}
      <img src={screenshotUrl} alt={alt} className="block w-full select-none" draggable={false} />
      {pins.map((pin) => (
        <button
          key={pin.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPinClick?.(pin.id);
          }}
          style={{ left: `${pin.xPercent}%`, top: `${pin.yPercent}%` }}
          className={cn(
            "absolute flex size-[26px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[12px] font-semibold ring-2",
            PIN_TONE[pin.status],
            pin.id === activePinId ? "ring-brand-amber" : "ring-white/70",
            pin.isDraft && "border-2 border-dashed border-white",
          )}
          aria-label={`Comment ${pin.number}`}
        >
          {pin.number}
        </button>
      ))}
    </div>
  );
}
