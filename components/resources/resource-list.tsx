"use client"

import Image from "next/image"
import { useActionState, useState, useTransition } from "react"
import {
  CheckIcon,
  CircleIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  LinkIcon,
  Loader2Icon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  editResourceDescription,
  removeResource,
  setResourceSeen,
  type ResourceFormState,
} from "@/app/(app)/resources/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { SavedResource } from "@/lib/resources"
import { PLATFORMS } from "./platform-icons"

export function ResourceList({ resources }: { resources: SavedResource[] }) {
  const [editing, setEditing] = useState<SavedResource | null>(null)
  const [deleting, setDeleting] = useState<SavedResource | null>(null)

  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <LinkIcon className="size-6 text-muted-foreground" />
        </div>
        <h2 className="font-semibold">Todavía no tienes recursos</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Usa el botón <span className="font-medium text-foreground">Agregar</span> y pega el link
          de un video de YouTube o de un post de X.
        </p>
      </div>
    )
  }

  return (
    <>
      <ul className="grid gap-3">
        {resources.map((resource, index) => (
          <ResourceRow
            key={resource.id}
            resource={resource}
            priority={index < 4}
            onEdit={() => setEditing(resource)}
            onDelete={() => setDeleting(resource)}
          />
        ))}
      </ul>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <EditDescriptionForm
            key={editing.id}
            resource={editing}
            onSaved={() => setEditing(null)}
          />
        )}
      </Dialog>

      <DeleteResourceDialog resource={deleting} onClose={() => setDeleting(null)} />
    </>
  )
}

function ResourceMedia({ resource, priority }: { resource: SavedResource; priority: boolean }) {
  const { label, Icon } = PLATFORMS[resource.platform]

  if (resource.imageUrl) {
    return (
      <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-40">
        <Image
          src={resource.imageUrl}
          alt=""
          fill
          sizes="160px"
          className="object-cover"
          priority={priority}
        />
        <span className="absolute bottom-1 left-1 flex size-5 items-center justify-center rounded bg-black/70 text-white">
          <Icon className="size-3" />
          <span className="sr-only">{label}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="flex aspect-video w-28 shrink-0 items-center justify-center rounded-lg bg-foreground text-background sm:w-40">
      <Icon className="size-7 sm:size-8" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

function ResourceRow({
  resource,
  priority,
  onEdit,
  onDelete,
}: {
  resource: SavedResource
  priority: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { label } = PLATFORMS[resource.platform]
  const [toggling, startToggle] = useTransition()

  function handleToggleSeen() {
    const seen = !resource.seen
    startToggle(async () => {
      await setResourceSeen(resource.id, seen)
      toast.success(seen ? "Marcado como visto" : "Marcado como no visto")
    })
  }

  return (
    <li className="group relative flex gap-4 rounded-xl border p-3 transition-colors hover:bg-muted/50 has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring/50">
      <ResourceMedia resource={resource} priority={priority} />

      <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
        <h3 className="line-clamp-2 font-medium leading-snug">
          {/* Stretched link: the whole row opens the resource. */}
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="outline-none after:absolute after:inset-0 after:rounded-xl"
          >
            {resource.title}
          </a>
        </h3>
        {resource.description ? (
          <p className="line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">
            {resource.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">Sin descripción</p>
        )}
        <div className="mt-auto flex min-w-0 items-center gap-2 pt-1 text-xs text-muted-foreground">
          <SeenBadge seen={resource.seen} />
          <p className="truncate" suppressHydrationWarning>
            {label}
            {resource.authorName && <> · {resource.authorName}</>} · Agregado{" "}
            {formatRelative(resource.createdAt)}
          </p>
        </div>
      </div>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative z-10 shrink-0 self-start"
            aria-label={`Opciones de ${resource.title}`}
          >
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={resource.url} target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              Abrir en {label}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleToggleSeen} disabled={toggling}>
            {resource.seen ? <EyeOffIcon /> : <EyeIcon />}
            {resource.seen ? "Marcar como no visto" : "Marcar como visto"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onEdit}>
            <PencilIcon />
            Editar descripción
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2Icon />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

function SeenBadge({ seen }: { seen: boolean }) {
  const Icon = seen ? CheckIcon : CircleIcon
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
        seen
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-border bg-muted text-muted-foreground"
      )}
    >
      <Icon className="size-3" />
      {seen ? "Visto" : "No visto"}
    </span>
  )
}

function EditDescriptionForm({
  resource,
  onSaved,
}: {
  resource: SavedResource
  onSaved: () => void
}) {
  const [state, formAction, pending] = useActionState<ResourceFormState, FormData>(
    async (prev, formData) => {
      const next = await editResourceDescription(prev, formData)
      if (next.status === "success") {
        onSaved()
        toast.success("Descripción actualizada")
      }
      return next
    },
    { status: "idle" }
  )

  return (
    <DialogContent className="sm:max-w-md">
      <form action={formAction} className="grid gap-4">
        <DialogHeader>
          <DialogTitle>Editar descripción</DialogTitle>
          <DialogDescription className="line-clamp-2">{resource.title}</DialogDescription>
        </DialogHeader>
        <input type="hidden" name="id" value={resource.id} />
        <div className="grid gap-2">
          <Label htmlFor="edit-description" className="sr-only">
            Descripción
          </Label>
          <Textarea
            id="edit-description"
            name="description"
            placeholder="¿De qué se trata? ¿Por qué lo guardas?"
            defaultValue={
              state.status === "error" ? state.description : (resource.description ?? "")
            }
            maxLength={1000}
            className="max-h-64"
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
            Guardar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function DeleteResourceDialog({
  resource,
  onClose,
}: {
  resource: SavedResource | null
  onClose: () => void
}) {
  const [pending, startDelete] = useTransition()

  function handleDelete(event: React.MouseEvent) {
    if (!resource) return
    // Keep the dialog open (with the spinner) until the server confirms.
    event.preventDefault()
    startDelete(async () => {
      await removeResource(resource.id)
      onClose()
      toast.success("Recurso eliminado")
    })
  }

  return (
    <AlertDialog open={resource !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este recurso?</AlertDialogTitle>
          <AlertDialogDescription className="line-clamp-3">
            {resource?.title}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending && <Loader2Icon className="animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
