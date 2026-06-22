import { Skeleton } from "@/components/ui/skeleton";

export default function SessionDetailLoading() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-56" />
        <div className="flex items-center gap-3 mt-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>

      {/* Tab List */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-muted/50">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 rounded-md" />
        ))}
      </div>

      {/* Match Cards */}
      <div className="flex flex-col gap-3 sm:gap-4 mt-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>

        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-7 w-14" />
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div
                  key={j}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                >
                  <Skeleton className="h-3 w-6" />
                  <Skeleton className="h-3.5 w-28 flex-1" />
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-3.5 w-28 flex-1" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
