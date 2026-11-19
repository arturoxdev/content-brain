"use client"

import Image, { getImageProps } from "next/image"
import { useState, useTransition } from "react"
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  ImagesIcon,
  Loader2Icon,
  MessageSquareIcon,
  ThumbsUpIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { removeThumbnail } from "@/app/(app)/thumbnails/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCompact, formatDate, formatFull, formatRelative } from "@/lib/format"
import type { SavedThumbnail } from "@/lib/thumbnails"
import { GRID_CLASSES } from "./thumbnail-grid-skeleton"

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | null }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border px-3 py-2">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span
        className="text-base font-semibold tabular-nums"
        title={value !== null ? formatFull(value) : "Oculto por el canal"}
      >
        {value !== null ? formatCompact(value) : "—"}
      </span>
    </div>
  )
}

function ChannelAvatar({ thumbnail, className }: { thumbnail: SavedThumbnail; className?: string }) {
  // yt3.ggpht.com rate-limits hotlinked avatars (429), so serve them through the
  // Next.js image optimizer, which caches them on the server.
  const src = thumbnail.channelAvatarUrl
    ? getImageProps({ src: thumbnail.channelAvatarUrl, alt: "", width: 40, height: 40 }).props.src
    : null
  return (
    <Avatar className={className}>
      {src && <AvatarImage src={src} alt={thumbnail.channelTitle} />}
      <AvatarFallback>{thumbnail.channelTitle.slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  )
}

export function ThumbnailGallery({ thumbnails }: { thumbnails: SavedThumbnail[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = thumbnails.find((t) => t.id === selectedId) ?? null

  if (thumbnails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <ImagesIcon className="size-6 text-muted-foreground" />
        </div>
        <h2 className="font-semibold">Tu colección está vacía</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Usa el botón <span className="font-medium text-foreground">Agregar</span> y pega el link
          de un video de YouTube cuyo thumbnail te inspire.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className={GRID_CLASSES}>
        {thumbnails.map((thumbnail, index) => (
          <button
            key={thumbnail.id}
            type="button"
            onClick={() => setSelectedId(thumbnail.id)}
            aria-label={`${thumbnail.title} — ${thumbnail.channelTitle}`}
            className="group rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
              <Image
                src={thumbnail.thumbnailUrl}
                alt={thumbnail.title}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                priority={index < 4}
              />
            </div>
          </button>
        ))}
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        {selected && (
          <ThumbnailDetail thumbnail={selected} onDeleted={() => setSelectedId(null)} />
        )}
      </Dialog>
    </>
  )
}

/** Clipboard only accepts PNG reliably, so the JPEG thumbnail is re-encoded in a canvas. */
async function fetchAsPng(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const bitmap = await createImageBitmap(await response.blob())
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png")
  )
}

function CopyImageButton({ thumbnailId }: { thumbnailId: number }) {
  const [status, setStatus] = useState<"idle" | "copying" | "copied">("idle")

  function handleCopy() {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      toast.error("Tu navegador no permite copiar imágenes al portapapeles")
      return
    }
    setStatus("copying")
    // The ClipboardItem must be created synchronously inside the click (Safari),
    // so it receives the promise of the PNG instead of the finished blob.
    const item = new ClipboardItem({
      "image/png": fetchAsPng(`/api/thumbnails/${thumbnailId}/download`),
    })
    navigator.clipboard
      .write([item])
      .then(() => {
        setStatus("copied")
        toast.success("Thumbnail copiado al portapapeles")
        setTimeout(() => setStatus("idle"), 2000)
      })
      .catch((error) => {
        console.error("[copy thumbnail]", error)
        setStatus("idle")
        toast.error("No se pudo copiar el thumbnail")
      })
  }

  return (
    <Button variant="outline" onClick={handleCopy} disabled={status === "copying"}>
      {status === "copying" ? (
        <Loader2Icon className="animate-spin" />
      ) : status === "copied" ? (
        <CheckIcon />
      ) : (
        <CopyIcon />
      )}
      {status === "copied" ? "Copiado" : "Copiar"}
    </Button>
  )
}

function ThumbnailDetail({
  thumbnail,
  onDeleted,
}: {
  thumbnail: SavedThumbnail
  onDeleted: () => void
}) {
  const [deleting, startDelete] = useTransition()

  function handleDelete() {
    startDelete(async () => {
      await removeThumbnail(thumbnail.id)
      onDeleted()
      toast.success("Thumbnail eliminado")
    })
  }

  return (
    <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
      <div className="relative aspect-video w-full bg-muted">
        <Image
          src={thumbnail.thumbnailUrl}
          alt={thumbnail.title}
          fill
          sizes="(min-width: 768px) 768px, 100vw"
          className="object-cover"
        />
      </div>
      <div className="grid gap-4 p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg leading-snug">{thumbnail.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center gap-3 pt-2">
              <ChannelAvatar thumbnail={thumbnail} className="size-10" />
              <div>
                <a
                  href={`https://www.youtube.com/channel/${thumbnail.channelId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground hover:underline"
                >
                  {thumbnail.channelTitle}
                </a>
                {thumbnail.publishedAt && (
                  <p className="text-xs" suppressHydrationWarning>
                    Publicado el {formatDate(thumbnail.publishedAt)} ·{" "}
                    {formatRelative(thumbnail.publishedAt)}
                  </p>
                )}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={EyeIcon} label="Vistas" value={thumbnail.viewCount} />
            <Stat icon={ThumbsUpIcon} label="Likes" value={thumbnail.likeCount} />
            <Stat icon={MessageSquareIcon} label="Comentarios" value={thumbnail.commentCount} />
          </div>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            {thumbnail.statsUpdatedAt
              ? `Actualizado ${formatRelative(thumbnail.statsUpdatedAt)}`
              : "Sin estadísticas todavía: usa el botón de actualizar."}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-destructive hover:text-destructive">
                <Trash2Icon />
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar este thumbnail?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se quitará de tu colección. Siempre puedes volver a agregarlo con su link.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting && <Loader2Icon className="animate-spin" />}
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" asChild>
              <a
                href={`https://www.youtube.com/watch?v=${thumbnail.videoId}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLinkIcon />
                Ver en YouTube
              </a>
            </Button>
            <Button asChild>
              <a href={`/api/thumbnails/${thumbnail.id}/download`} download>
                <DownloadIcon />
                Descargar thumbnail
              </a>
            </Button>
            <CopyImageButton thumbnailId={thumbnail.id} />
          </div>
        </DialogFooter>
      </div>
    </DialogContent>
  )
}
