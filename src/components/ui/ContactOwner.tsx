import { cn } from "@/lib/utils";

export interface ContactOwnerProps {
  ownerName?: string;
  ownerRole?: string;
  /** TODO(product): no verified owner phone/WhatsApp destination exists yet — Figma's
   * component description explicitly says "no phone number is assumed". These are
   * placeholders until the agency supplies real numbers. */
  phoneHref?: string;
  whatsappHref?: string;
  variant?: "compact" | "full";
  className?: string;
}

const iconButtonBase =
  "inline-flex items-center justify-center gap-2 rounded-rc-control border border-line bg-surface text-ink";

export function ContactOwner({
  ownerName = "Jerry Royal",
  ownerRole = "Owner",
  phoneHref = "tel:+440000000000",
  whatsappHref = "https://wa.me/440000000000",
  variant = "compact",
  className,
}: ContactOwnerProps) {
  if (variant === "full") {
    return (
      <div
        className={cn(
          "flex w-full flex-col gap-3 rounded-rc border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        <p className="text-[13px] font-medium text-ink">
          {ownerName} · {ownerRole}
        </p>
        <div className="flex gap-2.5">
          <a href={phoneHref} className={cn(iconButtonBase, "h-11 w-[154px]")}>
            <img src="/icons/call-owner.svg" alt="" width={20} height={20} />
            <span className="text-[13px] font-medium">Call owner</span>
          </a>
          <a href={whatsappHref} target="_blank" rel="noreferrer" className={cn(iconButtonBase, "h-11 w-[154px]")}>
            <img src="/icons/whatsapp.svg" alt="" width={20} height={20} />
            <span className="text-[13px] font-medium">WhatsApp</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <p className="text-xs font-medium text-ink-secondary">Contact owner</p>
      <div className="flex gap-3">
        <a href={phoneHref} aria-label={`Call ${ownerName}`} className={cn(iconButtonBase, "size-11")}>
          <img src="/icons/call-owner.svg" alt="" width={20} height={20} />
        </a>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          aria-label={`Message ${ownerName} on WhatsApp`}
          className={cn(iconButtonBase, "size-11")}
        >
          <img src="/icons/whatsapp.svg" alt="" width={20} height={20} />
        </a>
      </div>
    </div>
  );
}
