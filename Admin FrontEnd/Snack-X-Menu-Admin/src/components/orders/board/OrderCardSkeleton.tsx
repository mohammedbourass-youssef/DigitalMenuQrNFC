import { Skeleton } from "@/components/ui/skeleton";

/** First-load placeholder for a single order card. */
export function OrderCardSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export default OrderCardSkeleton;