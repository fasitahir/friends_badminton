import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-muted/50">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-8 rounded-md"
            style={{ width: `${60 + Math.random() * 40}px` }}
          />
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5"
          >
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-8 w-14" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card">
        <div className="p-6 pb-3">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="px-6 pb-6">
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="p-6 pb-3">
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="px-6 pb-6">
          <div className="flex flex-col gap-0">
            {/* Header row */}
            <div className="flex items-center gap-4 py-3 border-b border-border">
              <Skeleton className="h-3.5 w-6" />
              <Skeleton className="h-3.5 w-28 flex-1" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-16" />
            </div>
            {/* Data rows */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-3 border-b border-border/50"
              >
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-4 w-32 flex-1" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-8" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-1.5 w-16 rounded-full" />
                  <Skeleton className="h-3.5 w-10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
