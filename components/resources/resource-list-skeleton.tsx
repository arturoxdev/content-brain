import { Skeleton } from "@/components/ui/skeleton"

export function ResourceListSkeleton() {
  return (
    <ul className="grid gap-3">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex gap-4 rounded-xl border p-3">
          <Skeleton className="aspect-video w-28 shrink-0 rounded-lg sm:w-40" />
          <div className="grid flex-1 content-start gap-2 py-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  )
}
