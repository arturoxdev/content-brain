import type { Metadata } from "next"
import { connection } from "next/server"
import { Suspense } from "react"

import { AddThumbnailDialog } from "@/components/thumbnails/add-thumbnail-dialog"
import { RefreshStatsButton } from "@/components/thumbnails/refresh-stats-button"
import { SortSelect, SortSelectFallback } from "@/components/thumbnails/sort-select"
import { ThumbnailGallery } from "@/components/thumbnails/thumbnail-gallery"
import { ThumbnailGridSkeleton } from "@/components/thumbnails/thumbnail-grid-skeleton"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { parseSort } from "@/lib/sort"
import { listThumbnails } from "@/lib/thumbnails"

export const metadata: Metadata = { title: "Thumbnails · Content Brain" }

export default function ThumbnailsPage({ searchParams }: PageProps<"/thumbnails">) {
  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-semibold">Thumbnails</h1>
        <div className="ml-auto flex items-center gap-2">
          <Suspense fallback={<SortSelectFallback />}>
            <SortSelect />
          </Suspense>
          <RefreshStatsButton />
          <AddThumbnailDialog />
        </div>
      </header>

      <div className="flex-1 p-4 md:p-6">
        <Suspense fallback={<ThumbnailGridSkeleton />}>
          <ThumbnailCollection searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  )
}

async function ThumbnailCollection({
  searchParams,
}: {
  searchParams: PageProps<"/thumbnails">["searchParams"]
}) {
  // The collection lives in Turso and changes on every add/delete, so read it per request.
  await connection()
  const sort = parseSort((await searchParams).sort)
  const thumbnails = await listThumbnails(sort)
  return <ThumbnailGallery thumbnails={thumbnails} />
}
