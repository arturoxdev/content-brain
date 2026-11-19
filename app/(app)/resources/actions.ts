"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/auth/session"
import {
  deleteResource,
  insertResource,
  resourceExists,
  updateResourceDescription,
  updateResourceSeen,
  type NewResource,
} from "@/lib/resources"
import { fetchXPost, parseXPostUrl } from "@/lib/x"
import { fetchYouTubeVideo, parseYouTubeVideoId } from "@/lib/youtube"

const MAX_DESCRIPTION = 1000
const MAX_X_TITLE = 140

export type ResourceFormState =
  | { status: "idle" }
  | { status: "error"; message: string; url: string; description: string; seen: boolean }
  | { status: "success"; title: string; at: number }

function readDescription(formData: FormData) {
  return String(formData.get("description") ?? "").trim().slice(0, MAX_DESCRIPTION)
}

function readSeen(formData: FormData) {
  return formData.get("seen") === "seen"
}

function truncate(text: string, max: number) {
  const singleLine = text.replace(/\s+/g, " ").trim()
  return singleLine.length > max ? `${singleLine.slice(0, max - 1).trimEnd()}…` : singleLine
}

type Lookup = { resource: Omit<NewResource, "seen"> } | { error: string }

async function lookupYouTube(videoId: string, description: string | null): Promise<Lookup> {
  let video
  try {
    video = await fetchYouTubeVideo(videoId)
  } catch (error) {
    console.error("[addResource] YouTube API", error)
    return { error: "No se pudo consultar la API de YouTube. Revisa tu YOUTUBE_API_KEY." }
  }
  if (!video) return { error: "No encontramos ese video (¿es privado o fue borrado?)." }

  return {
    resource: {
      platform: "youtube",
      externalId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: video.title,
      description,
      imageUrl: video.thumbnailUrl,
      authorName: video.channelTitle,
      authorUrl: `https://www.youtube.com/channel/${video.channelId}`,
    },
  }
}

async function lookupX(
  ref: NonNullable<ReturnType<typeof parseXPostUrl>>,
  description: string | null
): Promise<Lookup> {
  let post
  try {
    post = await fetchXPost(ref)
  } catch (error) {
    console.error("[addResource] X oEmbed", error)
    return { error: "No se pudo consultar X. Intenta de nuevo en un momento." }
  }
  if (!post) return { error: "No encontramos ese post (¿es privado o fue borrado?)." }

  return {
    resource: {
      platform: "x",
      externalId: post.statusId,
      url: post.url,
      title: post.text ? truncate(post.text, MAX_X_TITLE) : `Post de ${post.authorName}`,
      description,
      imageUrl: null,
      authorName: post.authorName,
      authorUrl: post.authorUrl,
    },
  }
}

export async function addResource(
  _prev: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  await requireSession()

  const url = String(formData.get("url") ?? "").trim()
  const description = readDescription(formData)
  const seen = readSeen(formData)
  const fail = (message: string): ResourceFormState => ({
    status: "error",
    message,
    url,
    description,
    seen,
  })

  const videoId = parseYouTubeVideoId(url)
  const xPost = videoId ? null : parseXPostUrl(url)
  if (!videoId && !xPost) {
    return fail("Por ahora solo se aceptan links de videos de YouTube o posts de X.")
  }

  const platform = videoId ? "youtube" : "x"
  const externalId = videoId ?? xPost!.statusId
  if (await resourceExists(platform, externalId)) {
    return fail("Este link ya está en tus recursos.")
  }

  const lookup = videoId
    ? await lookupYouTube(videoId, description || null)
    : await lookupX(xPost!, description || null)
  if ("error" in lookup) return fail(lookup.error)

  await insertResource({ ...lookup.resource, seen })
  revalidatePath("/resources")
  return { status: "success", title: lookup.resource.title, at: Date.now() }
}

export async function editResourceDescription(
  _prev: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  await requireSession()

  const id = Number(formData.get("id"))
  const description = readDescription(formData)
  if (!Number.isInteger(id)) {
    return { status: "error", message: "Recurso inválido.", url: "", description, seen: false }
  }

  await updateResourceDescription(id, description || null)
  revalidatePath("/resources")
  return { status: "success", title: "", at: Date.now() }
}

export async function setResourceSeen(id: number, seen: boolean) {
  await requireSession()
  await updateResourceSeen(id, seen)
  revalidatePath("/resources")
}

export async function removeResource(id: number) {
  await requireSession()
  await deleteResource(id)
  revalidatePath("/resources")
}
