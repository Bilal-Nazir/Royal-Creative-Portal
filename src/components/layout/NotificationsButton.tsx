import Link from "next/link";
import { cn } from "@/lib/utils";

export interface NotificationsButtonProps {
  href: string;
  unreadCount: number;
  className?: string;
}

/** A14 — the "Notifications" TopBar action, everywhere it appears, now with a real unread badge. */
export function NotificationsButton({ href, unreadCount, className }: NotificationsButtonProps) {
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
