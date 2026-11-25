"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import type { NotificationWithLink } from "@/server/services/notification-service";

export interface NotificationsButtonProps {
  href: string;
  unreadCount: number;
  notifications?: NotificationWithLink[];
  className?: string;
  /** Compact square bell icon (with a dropdown preview) instead of the "Notifications" text pill. */
  iconOnly?: boolean;
}

/** A14 — the TopBar notification bell, everywhere it appears. iconOnly mode opens a preview dropdown with a "View all" link into the full notifications page. */
export function NotificationsButton({ href, unreadCount: initialUnreadCount, notifications: initialNotifications = [], className, iconOnly }: NotificationsButtonProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleItemClick(id: string) {
    if (notifications.find((n) => n.id === id)?.readAt) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    void fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setOpen(false);
  }

  if (!iconOnly) {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-rc-control bg-surface-2 px-6 text-sm font-medium text-ink hover:bg-line",
          className,
        )}
      >
        Notifications
        {unreadCount > 0 ? (
          <span
            aria-label={`${unreadCount} unread`}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-rose px-1.5 text-[11px] font-semibold text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className={cn(
          "relative inline-flex h-11 w-11 items-center justify-center rounded-rc-control bg-surface-2 text-ink hover:bg-line",
          className,
        )}
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-rose px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 flex w-[320px] flex-col overflow-hidden rounded-rc-control border border-line bg-surface-2 shadow-lg">
          <div className="flex flex-col gap-2 overflow-y-auto p-2" style={{ maxHeight: 360 }}>
            {notifications.length === 0 ? (
              <p className="p-3 text-sm text-ink-secondary">No notifications yet.</p>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  onClick={() => handleItemClick(notification.id)}
                  className={cn("flex flex-col gap-0.5 rounded-md p-2.5 hover:bg-line", !notification.readAt && "bg-[#232329]")}
                >
                  <p className="text-[13px] font-medium text-ink">{notification.title}</p>
                  <p className="truncate text-xs text-ink-secondary">{notification.body}</p>
                  <p className="text-[11px] text-ink-secondary/70">{relativeTime(notification.createdAt)}</p>
                </Link>
              ))
            )}
          </div>
          <Link
            href={href}
            onClick={() => setOpen(false)}
            className="flex h-10 shrink-0 items-center justify-center border-t border-line text-sm font-medium text-ink hover:bg-line"
          >
            View all
          </Link>
        </div>
      ) : null}
    </div>
  );
}
