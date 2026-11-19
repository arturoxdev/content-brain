import "server-only"

import { requireEnv } from "@/lib/env"

const API_BASE = "https://www.googleapis.com/youtube/v3"
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

/** Extracts the video id from any common YouTube URL (watch, youtu.be, shorts, live, embed). */
export function parseYouTubeVideoId(input: string): string | null {
  const value = input.trim()
  if (VIDEO_ID.test(value)) return value

  let url: URL
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value}`)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "")
  let candidate: string | null = null

  if (host === "youtu.be") {
    candidate = url.pathname.split("/")[1] ?? null
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      candidate = url.searchParams.get("v")
    } else {
      const [, kind, id] = url.pathname.split("/")
      if (["shorts", "live", "embed", "v"].includes(kind)) candidate = id ?? null
    }
  }

  return candidate && VIDEO_ID.test(candidate) ? candidate : null
}

type Thumbnail = { url: string; width?: number; height?: number }
type Thumbnails = Partial<Record<"default" | "medium" | "high" | "standard" | "maxres", Thumbnail>>

function bestThumbnail(thumbnails: Thumbnails): string | null {
  return (
    thumbnails.maxres?.url ??
    thumbnails.standard?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    null
  )
}

async function youtubeGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  url.searchParams.set("key", requireEnv("YOUTUBE_API_KEY"))

  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string }
    } | null
    throw new Error(body?.error?.message ?? `YouTube API respondió ${response.status}`)
  }
  return response.json() as Promise<T>
}

export type VideoStats = {
  viewCount: number | null
  likeCount: number | null
  commentCount: number | null
}

export type YouTubeVideo = VideoStats & {
  videoId: string
  title: string
  thumbnailUrl: string
  channelId: string
  channelTitle: string
  channelAvatarUrl: string | null
  publishedAt: string | null
}

// Counts arrive as strings and are omitted when the channel hides them.
type RawStatistics = { viewCount?: string; likeCount?: string; commentCount?: string }

function toCount(value: string | undefined): number | null {
  if (value === undefined) return null
  const count = Number(value)
  return Number.isFinite(count) ? count : null
}

function parseStats(statistics: RawStatistics | undefined): VideoStats {
  return {
    viewCount: toCount(statistics?.viewCount),
    likeCount: toCount(statistics?.likeCount),
    commentCount: toCount(statistics?.commentCount),
  }
}

const MAX_IDS_PER_REQUEST = 50

/** Fetches current statistics for many videos (1 quota unit per 50 videos). */
export async function fetchVideoStats(videoIds: string[]): Promise<Map<string, VideoStats>> {
  const stats = new Map<string, VideoStats>()
  for (let i = 0; i < videoIds.length; i += MAX_IDS_PER_REQUEST) {
    const ids = videoIds.slice(i, i + MAX_IDS_PER_REQUEST)
    const response = await youtubeGet<{
      items?: { id: string; statistics?: RawStatistics }[]
    }>("videos", { part: "statistics", id: ids.join(","), maxResults: String(ids.length) })
    for (const item of response.items ?? []) stats.set(item.id, parseStats(item.statistics))
  }
  return stats
}

export async function fetchYouTubeVideo(videoId: string): Promise<YouTubeVideo | null> {
  const videos = await youtubeGet<{
    items?: {
      snippet: {
        title: string
        channelId: string
        channelTitle: string
        publishedAt?: string
        thumbnails: Thumbnails
      }
      statistics?: RawStatistics
    }[]
  }>("videos", { part: "snippet,statistics", id: videoId })

  const video = videos.items?.[0]
  const snippet = video?.snippet
  if (!snippet) return null

  const channels = await youtubeGet<{
    items?: { snippet: { thumbnails: Thumbnails } }[]
  }>("channels", { part: "snippet", id: snippet.channelId }).catch(() => null)

  const channelThumbs = channels?.items?.[0]?.snippet.thumbnails
  const channelAvatarUrl = channelThumbs
    ? (channelThumbs.medium?.url ?? channelThumbs.default?.url ?? null)
    : null

  return {
    videoId,
    title: snippet.title,
    thumbnailUrl:
      bestThumbnail(snippet.thumbnails) ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    channelId: snippet.channelId,
    channelTitle: snippet.channelTitle,
    channelAvatarUrl,
    publishedAt: snippet.publishedAt ?? null,
    ...parseStats(video.statistics),
  }
}
