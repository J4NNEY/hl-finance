import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 overflow-hidden">
      <div className="bg-stone-50/80 dark:bg-stone-800/60 p-4 border-b border-stone-200/80 dark:border-stone-800/80">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1 bg-stone-200 dark:bg-stone-700" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border-b border-stone-100 dark:border-stone-800 last:border-0">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton
                key={j}
                className="h-4 flex-1 bg-stone-100 dark:bg-stone-800"
                style={{ animationDelay: `${(i * columns + j) * 30}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div
      className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 p-5"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 bg-stone-200 dark:bg-stone-700" />
          <Skeleton className="h-8 w-16 bg-stone-200 dark:bg-stone-700" />
        </div>
        <Skeleton className="h-11 w-11 rounded-xl bg-stone-100 dark:bg-stone-800" />
      </div>
    </div>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg bg-stone-200 dark:bg-stone-700" />
        <div>
          <Skeleton className="h-7 w-48 bg-stone-200 dark:bg-stone-700" />
          <Skeleton className="h-4 w-32 mt-2 bg-stone-100 dark:bg-stone-800" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div
        className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 p-5"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <Skeleton className="h-5 w-40 mb-4 bg-stone-200 dark:bg-stone-700" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full bg-stone-100 dark:bg-stone-800" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <Skeleton className="h-7 w-32 bg-stone-200 dark:bg-stone-700" />
          <Skeleton className="h-4 w-48 mt-2 bg-stone-100 dark:bg-stone-800" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg bg-stone-200 dark:bg-stone-700" />
      </div>

      <StatsSkeleton count={4} />

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div
          className="lg:col-span-3 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 p-5"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <Skeleton className="h-4 w-48 mb-4 bg-stone-200 dark:bg-stone-700" />
          <Skeleton className="h-[260px] w-full rounded-lg bg-stone-100 dark:bg-stone-800" />
        </div>
        <div
          className="lg:col-span-2 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="px-5 pt-5 pb-3">
            <Skeleton className="h-4 w-36 bg-stone-200 dark:bg-stone-700" />
          </div>
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28 bg-stone-200 dark:bg-stone-700" />
                  <Skeleton className="h-3 w-20 bg-stone-100 dark:bg-stone-800" />
                </div>
                <div className="text-right space-y-1.5">
                  <Skeleton className="h-4 w-24 bg-stone-200 dark:bg-stone-700" />
                  <Skeleton className="h-5 w-14 rounded-full bg-stone-100 dark:bg-stone-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
