import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 sm:p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard skeleton */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-6 pb-4">
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="px-6 pb-6 flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-7 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28 mb-1.5" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions skeleton */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-6 pb-4">
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="px-6 pb-6 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <Skeleton className="h-4 w-36 mb-1.5" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="size-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
