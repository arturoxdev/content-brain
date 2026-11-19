"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/auth/session"
import {
  deleteThumbnail,
  insertThumbnail,
  listVideoIds,
  thumbnailExists,
  updateStats,
} from "@/lib/thumbnails"
import { fetchVideoStats, fetchYouTubeVideo, parseYouTubeVideoId } from "@/lib/youtube"

export type AddThumbnailState =
  | { status: "idle" }
  | { status: "error"; message: string; url: string }
  | { status: "success"; title: string; at: number }

export async function addThumbnail(
  _prev: AddThumbnailState,
  formData: FormData
): Promise<AddThumbnailState> {
  await requireSession()

  const url = String(formData.get("url") ?? "").trim()
  const videoId = parseYouTubeVideoId(url)
  if (!videoId) {
    return { status: "error", message: "Ese link no parece ser un video de YouTube.", url }
  }

  if (await thumbnailExists(videoId)) {
    return { status: "error", message: "Este video ya está en tu colección.", url }
  }

  let video
  try {
    video = await fetchYouTubeVideo(videoId)
  } catch (error) {
    console.error("[addThumbnail] YouTube API", error)
    return {
      status: "error",
      message: "No se pudo consultar la API de YouTube. Revisa tu YOUTUBE_API_KEY.",
      url,
    }
  }
  if (!video) {
    return { status: "error", message: "No encontramos ese video (¿es privado o fue borrado?).", url }
  }

  await insertThumbnail(video)
  revalidatePath("/thumbnails")
  return { status: "success", title: video.title, at: Date.now() }
}

export async function removeThumbnail(id: number) {
  await requireSession()
  await deleteThumbnail(id)
  revalidatePath("/thumbnails")
}

export type RefreshStatsResult = { ok: true; updated: number } | { ok: false; message: string }

export async function refreshStats(): Promise<RefreshStatsResult> {
  await requireSession()

  const videoIds = await listVideoIds()
  let stats
  try {
    stats = await fetchVideoStats(videoIds)
  } catch (error) {
    console.error("[refreshStats] YouTube API", error)
    return { ok: false, message: "No se pudo consultar la API de YouTube." }
  }

  await updateStats(stats)
  revalidatePath("/thumbnails")
  return { ok: true, updated: stats.size }
}
