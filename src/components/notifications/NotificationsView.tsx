"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NotificationWithLink } from "@/server/services/notification-service";

export interface NotificationsViewProps {
  initialNotifications: NotificationWithLink[];
}

export function NotificationsView({ initialNotifications }: NotificationsViewProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const visible = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => !n.readAt) : notifications),
    [notifications, filter],
  );

  function handleRowClick(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)));
    void fetch(`/api/notifications/${id}/read`, { method: "POST" });
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Button
            variant={filter === "all" ? "primary" : "secondary"}
            className="w-[180px]"
            onClick={() => setFilter("all")}
          >
            All notifications
          </Button>
          <Button
            variant={filter === "unread" ? "primary" : "secondary"}
            className="w-[140px]"
            onClick={() => setFilter("unread")}
          >
            Unread · {unreadCount}
          </Button>
        </div>
        <Button variant="secondary" className="w-[180px]" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
          Mark all as read
        </Button>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Recent notifications</h2>
        {visible.length === 0 ? (
          <p className="text-sm text-ink-secondary">
            {filter === "unread" ? "You're all caught up." : "No notifications yet."}
          </p>
        ) : (
          visible.map((notification) => (
            <Link
              key={notification.id}
              href={notification.href}
              onClick={() => handleRowClick(notification.id)}
              className="flex w-full flex-col items-start gap-1 rounded-rc-control bg-surface-2 p-4 hover:bg-line sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <p className="text-[13px] font-medium text-ink">{notification.title}</p>
                <p className="text-xs text-ink-secondary">
                  {notification.body} · {relativeTime(notification.createdAt)}
                </p>
              </div>
              <span className={cn("text-xs font-medium", notification.readAt ? "text-ink-secondary" : "text-brand-rose")}>
                {notification.readAt ? "Read" : "Unread"}
              </span>
            </Link>
          ))
        )}
      </Card>

      <Button
        variant="secondary"
        className="w-[220px]"
        onClick={() => setFilter("all")}
        title="Notification preferences are managed on the Settings page"
      >
        Notification preferences
      </Button>
    </>
  );
}
