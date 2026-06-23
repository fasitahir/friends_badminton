import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EloTrendProps {
  elo: number;
}

export function EloTrend({ elo }: EloTrendProps) {
  const delta = Math.round(elo - 600);

  if (delta > 0) {
    return (
      <div className="flex items-center gap-1">
        <TrendingUp className="size-3.5 text-foreground" />
        <span className="text-[10px] font-mono tabular-nums text-muted-foreground">+{delta}</span>
      </div>
    );
  }

  if (delta < 0) {
    return (
      <div className="flex items-center gap-1">
        <TrendingDown className="size-3.5 text-aviation-red" />
        <span className="text-[10px] font-mono tabular-nums text-aviation-red">{delta}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Minus className="size-3.5 text-muted-foreground" />
      <span className="text-[10px] font-mono tabular-nums text-muted-foreground">0</span>
    </div>
  );
}
