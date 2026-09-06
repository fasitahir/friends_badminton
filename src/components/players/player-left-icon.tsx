import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerLeftIconProps {
  className?: string;
  showText?: boolean;
  leftAt?: string | null;
  size?: "sm" | "md" | "lg";
}

export function PlayerLeftIcon({
  className,
  showText = false,
  leftAt,
  size = "md",
}: PlayerLeftIconProps) {
  let dateLabel = "";
  if (leftAt) {
    try {
      const ym = leftAt.slice(0, 7);
      const [y, m] = ym.split("-");
      if (y && m) {
        dateLabel = ` (${new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })})`;
      }
    } catch {
      dateLabel = ` (${leftAt})`;
    }
  }

  const tooltip = `Player has left${dateLabel}`;
  const iconSizeClass = size === "sm" ? "size-3" : size === "lg" ? "size-4" : "size-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-destructive/80 shrink-0 select-none align-middle",
        className
      )}
      title={tooltip}
      aria-label={tooltip}
    >
      <LogOut className={cn(iconSizeClass, "stroke-[2]")} />
      {showText && (
        <span className="text-[9px] font-mono tracking-wider uppercase border border-destructive/40 text-destructive bg-destructive/10 px-1 py-0.5 rounded-[var(--radius)]">
          LEFT{dateLabel}
        </span>
      )}
    </span>
  );
}
