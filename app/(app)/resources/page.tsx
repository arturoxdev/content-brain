import type { Metadata } from "next"
import { connection } from "next/server"
import { Suspense } from "react"

import { AddResourceDialog } from "@/components/resources/add-resource-dialog"
import { ResourceList } from "@/components/resources/resource-list"
import { ResourceListSkeleton } from "@/components/resources/resource-list-skeleton"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { listResources } from "@/lib/resources"

export const metadata: Metadata = { title: "Recursos · Content Brain" }

export default function ResourcesPage() {
  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-semibold">Recursos</h1>
        <div className="ml-auto flex items-center gap-2">
          <AddResourceDialog />
        </div>
      </header>

      <div className="flex-1 p-4 md:p-6">
        <div className="mx-auto w-full max-w-4xl">
          <Suspense fallback={<ResourceListSkeleton />}>
            <ResourceCollection />
          </Suspense>
        </div>
      </div>
    </>
  )
}

async function ResourceCollection() {
  // The list lives in Turso and changes on every add/edit/delete, so read it per request.
  await connection()
  const resources = await listResources()
  return <ResourceList resources={resources} />
}
