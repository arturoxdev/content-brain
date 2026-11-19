"use client"

import { useActionState, useState } from "react"
import { EyeIcon, EyeOffIcon, Loader2Icon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { addResource, type ResourceFormState } from "@/app/(app)/resources/actions"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export function AddResourceDialog() {
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<"seen" | "unseen">("unseen")
  const [state, formAction, pending] = useActionState<ResourceFormState, FormData>(
    async (prev, formData) => {
      const next = await addResource(prev, formData)
      if (next.status === "success") {
        setOpen(false)
        setSeen("unseen")
        toast.success("Recurso agregado", { description: next.title })
      }
      return next
    },
    { status: "idle" }
  )
  const formKey = state.status === "success" ? state.at : "form"

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
            <DialogTitle>Agregar recurso</DialogTitle>
            <DialogDescription>
              Pega el link de un video de YouTube o de un post de X.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="resource-url">Link</Label>
            <Input
              id="resource-url"
              name="url"
              placeholder="https://x.com/… o https://youtube.com/watch?v=…"
              defaultValue={state.status === "error" ? state.url : ""}
              key={`url-${formKey}`}
              autoComplete="off"
              required
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="resource-seen">Estado</Label>
            <Select
              name="seen"
              value={seen}
              onValueChange={(value) => setSeen(value as "seen" | "unseen")}
            >
              <SelectTrigger id="resource-seen" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unseen">
                  <EyeOffIcon />
                  No visto
                </SelectItem>
                <SelectItem value="seen">
                  <EyeIcon />
                  Visto
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="resource-description">
              Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="resource-description"
              name="description"
              placeholder="¿De qué se trata? ¿Por qué lo guardas?"
              defaultValue={state.status === "error" ? state.description : ""}
              key={`description-${formKey}`}
              maxLength={1000}
              className="max-h-48"
            />
          </div>
          {state.status === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
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
