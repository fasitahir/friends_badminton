import Link from "next/link";
import { Flame, Snowflake } from "lucide-react";
import type { StreakRecord } from "@/lib/supabase/types";

export function StreakRecords({
  longestWin,
  longestLoss,
}: {
  longestWin: StreakRecord | null;
  longestLoss: StreakRecord | null;
}) {
  if (!longestWin && !longestLoss) return null;

  return (
    <div className="flex flex-col mt-10">
      <div className="pb-4 mb-2 border-b border-border">
        <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-foreground font-semibold">
          Streak Records
        </h2>
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1">
          Longest runs, all-time
        </p>
      </div>

      {longestWin && (
        <RecordRow
          href={`/players/${longestWin.player.id}`}
          label="Win streak"
          name={longestWin.player.name}
          streak={longestWin.streak}
          kind="win"
        />
      )}
      {longestLoss && (
        <RecordRow
          href={`/players/${longestLoss.player.id}`}
          label="Loss streak"
          name={longestLoss.player.name}
          streak={longestLoss.streak}
          kind="loss"
        />
      )}
    </div>
  );
}

function RecordRow({
  href,
  label,
  name,
  streak,
  kind,
}: {
  href: string;
  label: string;
  name: string;
  streak: number;
  kind: "win" | "loss";
}) {
  const isWin = kind === "win";

  return (
    <Link
      href={href}
      className="flex flex-row items-center justify-between py-4 border-b border-border group hover:bg-muted/30 transition-colors"
    >
      <div className="min-w-0 flex flex-col gap-0.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-sm font-medium truncate group-hover:text-foreground/80">
          {name}
        </span>
      </div>
      <span
        className="inline-flex items-center gap-1 font-mono text-sm tabular-nums shrink-0"
        style={isWin ? undefined : { color: "var(--cold-stripe)" }}
      >
        {isWin ? (
          <Flame className="size-3.5 text-aviation-red fill-aviation-red" />
        ) : (
          <Snowflake className="size-3.5" />
        )}
        <span className={isWin ? "text-aviation-red" : undefined}>{streak}</span>
      </span>
    </Link>
  );
}
