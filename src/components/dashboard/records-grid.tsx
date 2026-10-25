"use client";

import Link from "next/link";
import {
  Trophy,
  Zap,
  TrendingUp,
  Star,
  Swords,
  Users,
  Activity,
  TrendingDown,
} from "lucide-react";
import type { RecordEntry, Records } from "@/lib/supabase/types";

const recordCards: Array<{
  key: keyof Records;
  title: string;
  description: string;
  suffix: string;
  Icon: React.ElementType;
  accentVar: string | null;
}> = [
  {
    key: "mostSetsWon",
    title: "Most Sets Won",
    description: "All-time wins leader",
    suffix: "wins",
    Icon: Trophy,
    accentVar: "--color-elo",
  },
  {
    key: "longestWinStreak",
    title: "Win Streak",
    description: "Consecutive sets won",
    suffix: "sets",
    Icon: Zap,
    accentVar: "var(--color-aviation-red, hsl(0 72% 51%))",
  },
  {
    key: "bestWinRate",
    title: "Best Win Rate",
    description: "Min 10 sets played",
    suffix: "%",
    Icon: TrendingUp,
    accentVar: null,
  },
  {
    key: "highestElo",
    title: "Highest ELO",
    description: "Current rating leaders",
    suffix: "pts",
    Icon: Star,
    accentVar: "--color-elo",
  },
  {
    key: "biggestMarginWin",
    title: "Biggest Margin",
    description: "Largest winning margin",
    suffix: "pts",
    Icon: Swords,
    accentVar: null,
  },
  {
    key: "bestDuo",
    title: "Best Duo",
    description: "Top pair win rate · min 5 sets",
    suffix: "%",
    Icon: Users,
    accentVar: null,
  },
  {
    key: "mostSetsPlayed",
    title: "Most Active",
    description: "Iron man — most sets played",
    suffix: "sets",
    Icon: Activity,
    accentVar: null,
  },
  {
    key: "longestLossStreak",
    title: "Longest Slump",
    description: "Consecutive sets lost",
    suffix: "sets",
    Icon: TrendingDown,
    accentVar: null,
  },
];

function RecordCard({
  title,
  description,
  suffix,
  Icon,
  entries,
}: {
  title: string;
  description: string;
  suffix: string;
  Icon: React.ElementType;
  entries: RecordEntry[];
}) {
  return (
    <div className="flex flex-col border border-border bg-muted/5">
      {/* Card header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/70">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <div className="min-w-0">
          <p className="text-xs font-mono uppercase tracking-[0.15em] font-semibold text-foreground leading-none">
            {title}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{description}</p>
        </div>
      </div>

      {/* Entries */}
      <div className="flex flex-col">
        {entries.length > 0 ? (
          entries.map((entry, index) => {
            const row = (
              <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 group">
                {/* Rank */}
                <span className="w-5 font-mono text-[10px] text-muted-foreground/50 tabular-nums shrink-0">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {/* Name + detail */}
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground group-hover:text-foreground/80">
                    {entry.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground font-mono">
                    {entry.detail}
                  </span>
                </div>
                {/* Value */}
                <div className="shrink-0 text-right tabular-nums">
                  <span className="block font-mono text-lg leading-none text-foreground">
                    {entry.value}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
                    {suffix}
                  </span>
                </div>
              </div>
            );

            return (
              <div key={entry.id} className="border-b border-border/40 last:border-b-0">
                {entry.href ? (
                  <Link href={entry.href}>{row}</Link>
                ) : (
                  row
                )}
              </div>
            );
          })
        ) : (
          <p className="px-4 py-6 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            [ No data yet ]
          </p>
        )}
      </div>
    </div>
  );
}

export function RecordsGrid({ records }: { records: Records }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {recordCards.map((card) => (
        <RecordCard
          key={card.key}
          title={card.title}
          description={card.description}
          suffix={card.suffix}
          Icon={card.Icon}
          entries={records[card.key]}
        />
      ))}
    </div>
  );
}
