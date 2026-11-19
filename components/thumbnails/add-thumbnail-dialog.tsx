"use client"

import { useActionState, useState } from "react"
import { Loader2Icon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { addThumbnail, type AddThumbnailState } from "@/app/(app)/thumbnails/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AddThumbnailDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<AddThumbnailState, FormData>(
    async (prev, formData) => {
      const next = await addThumbnail(prev, formData)
      if (next.status === "success") {
        setOpen(false)
        toast.success("Thumbnail agregado", { description: next.title })
      }
      return next
    },
    { status: "idle" }
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          Agregar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Agregar thumbnail</DialogTitle>
            <DialogDescription>
              Pega el link de un video de YouTube para guardarlo en tu colección.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="url">Link del video</Label>
            <Input
              id="url"
              name="url"
              placeholder="https://www.youtube.com/watch?v=…"
              defaultValue={state.status === "error" ? state.url : ""}
              key={state.status === "success" ? state.at : "form"}
              autoComplete="off"
              required
              autoFocus
            />
            {state.status === "error" && (
              <p role="alert" className="text-sm text-destructive">
                {state.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              Agregar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
