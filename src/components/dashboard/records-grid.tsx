import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecordEntry, Records } from "@/lib/supabase/types";

const recordCards: Array<{
  key: keyof Records;
  title: string;
  description: string;
  suffix: string;
}> = [
  {
    key: "longestWinStreak",
    title: "Longest streak",
    description: "Most consecutive games won",
    suffix: "games",
  },
  {
    key: "lowestPointWin",
    title: "Lowest point win",
    description: "Fewest points conceded in a win",
    suffix: "points",
  },
  {
    key: "highestPointWin",
    title: "Highest point win",
    description: "Most points scored in a win",
    suffix: "points",
  },
  {
    key: "closestWin",
    title: "Closest win",
    description: "Smallest winning margin",
    suffix: "point margin",
  },
  {
    key: "biggestWin",
    title: "Biggest win",
    description: "Largest winning margin",
    suffix: "point margin",
  },
  {
    key: "longestLossStreak",
    title: "Longest loss streak",
    description: "Most consecutive games lost",
    suffix: "games",
  },
];

function RecordCard({
  title,
  description,
  suffix,
  entries,
}: {
  title: string;
  description: string;
  suffix: string;
  entries: RecordEntry[];
}) {
  return (
    <Card className="rounded-none bg-muted/10 shadow-none">
      <CardHeader className="border-b border-border/70">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="p-0">
        {entries.length > 0 ? (
          <ol>
            {entries.map((entry, index) => {
              const content = (
                <div className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
                  <span className="w-5 font-mono text-xs text-muted-foreground tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{entry.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {entry.detail}
                    </span>
                  </span>
                  <span className="shrink-0 text-right font-mono tabular-nums">
                    <span className="block text-lg leading-none">{entry.value}</span>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {suffix}
                    </span>
                  </span>
                </div>
              );

              return (
                <li key={entry.id} className="border-b border-border/60 last:border-b-0">
                  {entry.href ? <Link href={entry.href}>{content}</Link> : content}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="px-4 py-8 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            No completed games
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function RecordsGrid({ records }: { records: Records }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {recordCards.map((card) => (
        <RecordCard
          key={card.key}
          title={card.title}
          description={card.description}
          suffix={card.suffix}
          entries={records[card.key]}
        />
      ))}
    </div>
  );
}
