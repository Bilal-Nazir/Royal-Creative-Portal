import { cn } from "@/lib/utils";

const AVATAR_COLORS = ["#f2b84b", "#7aa3f7", "#4ade80", "#a78bfa", "#eb878f", "#4fd1c5", "#f87171"];

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Deterministic so the same person always gets the same colour across the app, with no per-user colour stored anywhere. */
function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, size = 28, className }: AvatarProps) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, backgroundColor: colorForName(name), fontSize: Math.max(10, size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}
