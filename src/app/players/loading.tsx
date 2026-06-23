import { Skeleton } from "@/components/ui/skeleton";

export default function PlayersLoading() {
  return (
    <div className="flex flex-col gap-10 animate-pulse">
      {/* Header Panel */}
      <div className="flex flex-col">
        <Skeleton className="h-9 w-36 rounded-none bg-muted" />
        <div className="flex items-center gap-4 mt-2">
          <Skeleton className="h-4 w-48 rounded-none bg-muted" />
          <div className="flex-1 h-px bg-border hidden sm:block" />
        </div>
      </div>

      {/* Players List Skeleton */}
      <div className="flex flex-col">
        {/* Table Header Row Skeleton */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
          <div className="w-8 h-3 bg-muted shrink-0" />
          <div className="flex-1 h-3 bg-muted" />
          <div className="hidden sm:block w-36 h-3 bg-muted shrink-0" />
          <div className="hidden md:block w-32 h-3 bg-muted shrink-0" />
          <div className="hidden sm:block w-24 h-3 bg-muted shrink-0" />
          <div className="w-20 h-3 bg-muted shrink-0" />
        </div>

        {/* Rows Skeleton */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 py-4 px-4 border-b border-border"
          >
            {/* Rank */}
            <div className="w-8 shrink-0 flex justify-end">
              <Skeleton className="h-4 w-4 rounded-none bg-muted" />
            </div>

            {/* Name, Nickname & Status */}
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <Skeleton className="h-5 w-32 rounded-none bg-muted" />
              <Skeleton className="h-3.5 w-24 rounded-none bg-muted" />
            </div>

            {/* Sparkline */}
            <div className="hidden sm:block w-36 shrink-0 flex justify-center">
              <Skeleton className="h-6 w-28 rounded-none bg-muted" />
            </div>

            {/* Sets Record */}
            <div className="hidden md:flex flex-col items-end w-32 shrink-0 gap-1.5">
              <Skeleton className="h-4 w-16 rounded-none bg-muted" />
              <Skeleton className="h-3 w-12 rounded-none bg-muted" />
            </div>

            {/* Win Rate */}
            <div className="hidden sm:block w-24 shrink-0 flex justify-end">
              <Skeleton className="h-4 w-12 rounded-none bg-muted" />
            </div>

            {/* ELO Rating */}
            <div className="w-20 shrink-0 flex flex-col items-end gap-1.5">
              <Skeleton className="h-5 w-10 rounded-none bg-muted" />
              <Skeleton className="h-3 w-8 rounded-none bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
