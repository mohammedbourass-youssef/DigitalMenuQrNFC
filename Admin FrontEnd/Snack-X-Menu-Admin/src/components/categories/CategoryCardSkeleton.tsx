import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoryCardSkeleton() {
  return <Card className="overflow-hidden border-slate-200 bg-white shadow-sm"><Skeleton className="h-40 w-full rounded-none" /><CardContent className="space-y-3 p-4"><div className="flex items-center justify-between gap-3"><div className="flex flex-1 items-center gap-2"><Skeleton className="h-3 w-3 rounded-full" /><Skeleton className="h-5 w-2/3" /></div><Skeleton className="h-6 w-16 rounded-full" /></div><div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div><Skeleton className="h-3 w-28" /></CardContent></Card>;
}