export function getEloTier(elo: number | null | undefined) {
  const currentElo = elo ?? 600;

  if (currentElo >= 1500) return { label: "Legend", emoji: "🔥", color: "text-red-500", bg: "bg-red-500/15 border-red-500/30" };
  if (currentElo >= 1300) return { label: "Grandmaster", emoji: "👑", color: "text-yellow-500", bg: "bg-yellow-500/15 border-yellow-500/30" };
  if (currentElo >= 1050) return { label: "Master", emoji: "💎", color: "text-cyan-400", bg: "bg-cyan-500/15 border-cyan-500/30" };
  if (currentElo >= 850) return { label: "Expert", emoji: "⚡", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" };
  if (currentElo >= 700) return { label: "Club Player", emoji: "🌟", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" };
  if (currentElo >= 600) return { label: "Beginner", emoji: "🎯", color: "text-green-400", bg: "bg-green-500/15 border-green-500/30" };
  if (currentElo >= 500) return { label: "Rookie", emoji: "🏸", color: "text-muted-foreground", bg: "bg-muted/30 border-border/50" };
  
  return { label: "Backyard Player", emoji: "🍃", color: "text-stone-500", bg: "bg-stone-500/10 border-border/50" };
}

export function getNextTierProgress(elo: number | null | undefined) {
  const currentElo = elo ?? 600;

  if (currentElo >= 1500) return null; // Max tier
  if (currentElo >= 1300) return { nextLabel: "Legend", nextElo: 1500, prevElo: 1300, current: currentElo };
  if (currentElo >= 1050) return { nextLabel: "Grandmaster", nextElo: 1300, prevElo: 1050, current: currentElo };
  if (currentElo >= 850) return { nextLabel: "Master", nextElo: 1050, prevElo: 850, current: currentElo };
  if (currentElo >= 700) return { nextLabel: "Expert", nextElo: 850, prevElo: 700, current: currentElo };
  if (currentElo >= 600) return { nextLabel: "Club Player", nextElo: 700, prevElo: 600, current: currentElo };
  if (currentElo >= 500) return { nextLabel: "Beginner", nextElo: 600, prevElo: 500, current: currentElo };
  
  return { nextLabel: "Rookie", nextElo: 500, prevElo: 400, current: currentElo };
}
