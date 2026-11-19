"use client"

import { useTransition } from "react"
import { RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import { refreshStats } from "@/app/(app)/thumbnails/actions"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function RefreshStatsButton() {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await refreshStats()
      if (!result.ok) {
        toast.error(result.message)
      } else if (result.updated === 0) {
        toast.info("No hay videos para actualizar")
      } else {
        toast.success("Estadísticas actualizadas", {
          description: `${result.updated} ${result.updated === 1 ? "video" : "videos"}`,
        })
      }
    })
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={handleClick}
          disabled={pending}
          aria-label="Actualizar vistas, likes y comentarios"
        >
          <RefreshCwIcon className={cn(pending && "animate-spin")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Actualizar vistas, likes y comentarios</TooltipContent>
    </Tooltip>
  )
}
