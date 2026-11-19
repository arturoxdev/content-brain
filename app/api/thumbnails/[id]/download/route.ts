import { requireSession } from "@/lib/auth/session"
import { getThumbnail } from "@/lib/thumbnails"

function toFileName(title: string) {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80)
  return slug || "thumbnail"
}

// Proxies the image so the browser downloads it instead of opening i.ytimg.com.
export async function GET(_request: Request, ctx: RouteContext<"/api/thumbnails/[id]/download">) {
  await requireSession()

  const { id } = await ctx.params
  const thumbnail = await getThumbnail(Number(id))
  if (!thumbnail) {
    return Response.json({ error: "Thumbnail no encontrado" }, { status: 404 })
  }

  const image = await fetch(thumbnail.thumbnailUrl, { cache: "no-store" })
  if (!image.ok || !image.body) {
    return Response.json({ error: "No se pudo descargar la imagen" }, { status: 502 })
  }

  const contentType = image.headers.get("content-type") ?? "image/jpeg"
  const extension = contentType.includes("webp") ? "webp" : contentType.includes("png") ? "png" : "jpg"
  const fileName = `${toFileName(thumbnail.title)}-${thumbnail.videoId}.${extension}`

  return new Response(image.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
