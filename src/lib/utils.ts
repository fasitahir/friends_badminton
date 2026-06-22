import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getEloBadge(elo: number) {
  if (elo >= 1200) return { label: "Advanced", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  if (elo >= 800) return { label: "Competitive", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
  return { label: "Developing", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
}
