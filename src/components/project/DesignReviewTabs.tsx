"use client";

import { useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { PinOverlay } from "./PinOverlay";
import { DesignReviewWorkspace, type WorkspacePin } from "./DesignReviewWorkspace";
import { ChatPanel, type ChatMessageView } from "./ChatPanel";

export interface DesignReviewTabsProps {
  projectId: string;
  versionId: string;
  versionLabel: string;
  screenshotUrl: string;
  figmaLink: string;
  pins: WorkspacePin[];
  draftCount: number;
  initialMessages: ChatMessageView[];
  viewerUserId: string;
  readOnly?: boolean;
}

/**
 * R12 — the same review screenshot, with a tab to swap the sidebar between
 * feedback (C12/R01/R06's default) and the project conversation. Figma
 * models this as a separate frame; here it's a toggle on the one review
 * page so the screenshot/pins never have to be duplicated between them.
 */
export function DesignReviewTabs(props: DesignReviewTabsProps) {
  const [tab, setTab] = useState<"feedback" | "conversation">("feedback");

  if (tab === "feedback") {
    return (
      <div className="flex flex-col gap-3">
        <TabSwitch tab={tab} onChange={setTab} />
        <DesignReviewWorkspace {...props} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <TabSwitch tab={tab} onChange={setTab} />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <Card className="flex flex-1 flex-col gap-4 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">{props.versionLabel}</h2>
          <PinOverlay
            screenshotUrl={props.screenshotUrl}
            alt={`${props.versionLabel} screenshot`}
            pins={props.pins.map((p) => ({ id: p.id, number: p.number, xPercent: p.xPercent, yPercent: p.yPercent, isDraft: p.isDraft, status: p.status }))}
            placing={false}
          />
        </Card>
        <ChatPanel
          projectId={props.projectId}
          initialMessages={props.initialMessages}
          viewerUserId={props.viewerUserId}
          readOnly={props.readOnly}
          compact
        />
      </div>
    </div>
  );
}

function TabSwitch({ tab, onChange }: { tab: "feedback" | "conversation"; onChange: (tab: "feedback" | "conversation") => void }) {
  return (
    <div className="flex gap-2">
      <Button variant={tab === "feedback" ? "primary" : "secondary"} onClick={() => onChange("feedback")} className="w-[160px]">
        Feedback
      </Button>
      <Button variant={tab === "conversation" ? "primary" : "secondary"} onClick={() => onChange("conversation")} className="w-[160px]">
        Conversation
      </Button>
    </div>
  );
}
