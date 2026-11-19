import { Skeleton } from "@/components/ui/skeleton"

export const GRID_CLASSES =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"

export function ThumbnailGridSkeleton() {
  return (
    <div className={GRID_CLASSES}>
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="aspect-video w-full rounded-xl" />
      ))}
    </div>
  )
}
