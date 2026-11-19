import "server-only"

import { getDb } from "@/lib/db"
import type { SortOption } from "@/lib/sort"
import type { VideoStats, YouTubeVideo } from "@/lib/youtube"

export type SavedThumbnail = {
  id: number
  videoId: string
  title: string
  thumbnailUrl: string
  channelId: string
  channelTitle: string
  channelAvatarUrl: string | null
  publishedAt: string | null
  viewCount: number | null
  likeCount: number | null
  commentCount: number | null
  statsUpdatedAt: string | null
  createdAt: string
}

type Row = Record<string, unknown>

function toNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value)
}

function toThumbnail(row: Row): SavedThumbnail {
  return {
    id: Number(row.id),
    videoId: String(row.video_id),
    title: String(row.title),
    thumbnailUrl: String(row.thumbnail_url),
    channelId: String(row.channel_id),
    channelTitle: String(row.channel_title),
    channelAvatarUrl: row.channel_avatar_url ? String(row.channel_avatar_url) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    viewCount: toNumber(row.view_count),
    likeCount: toNumber(row.like_count),
    commentCount: toNumber(row.comment_count),
    statsUpdatedAt: row.stats_updated_at ? String(row.stats_updated_at) : null,
    createdAt: String(row.created_at),
  }
}

// Whitelisted ORDER BY clauses: the sort value never reaches the SQL directly.
// Videos without stats (null) always go last; ties fall back to most recently added.
const ORDER_BY: Record<SortOption, string> = {
  "added-desc": "created_at DESC, id DESC",
  "added-asc": "created_at ASC, id ASC",
  "views-desc": "view_count DESC NULLS LAST, id DESC",
  "views-asc": "view_count ASC NULLS LAST, id DESC",
  "likes-desc": "like_count DESC NULLS LAST, id DESC",
  "likes-asc": "like_count ASC NULLS LAST, id DESC",
  "comments-desc": "comment_count DESC NULLS LAST, id DESC",
  "comments-asc": "comment_count ASC NULLS LAST, id DESC",
  "published-desc": "published_at DESC NULLS LAST, id DESC",
  "published-asc": "published_at ASC NULLS LAST, id DESC",
}

export async function listThumbnails(sort: SortOption): Promise<SavedThumbnail[]> {
  const db = await getDb()
  const result = await db.execute(`SELECT * FROM thumbnails ORDER BY ${ORDER_BY[sort]}`)
  return result.rows.map((row) => toThumbnail(row as Row))
}

export async function getThumbnail(id: number): Promise<SavedThumbnail | null> {
  const db = await getDb()
  const result = await db.execute({ sql: "SELECT * FROM thumbnails WHERE id = ?", args: [id] })
  const row = result.rows[0]
  return row ? toThumbnail(row as Row) : null
}

export async function thumbnailExists(videoId: string): Promise<boolean> {
  const db = await getDb()
  const result = await db.execute({
    sql: "SELECT 1 FROM thumbnails WHERE video_id = ?",
    args: [videoId],
  })
  return result.rows.length > 0
}

/** Returns false when the video was already in the collection. */
export async function insertThumbnail(video: YouTubeVideo): Promise<boolean> {
  const db = await getDb()
  const result = await db.execute({
    sql: `INSERT INTO thumbnails
            (video_id, title, thumbnail_url, channel_id, channel_title, channel_avatar_url,
             published_at, view_count, like_count, comment_count, stats_updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(video_id) DO NOTHING`,
    args: [
      video.videoId,
      video.title,
      video.thumbnailUrl,
      video.channelId,
      video.channelTitle,
      video.channelAvatarUrl,
      video.publishedAt,
      video.viewCount,
      video.likeCount,
      video.commentCount,
      new Date().toISOString(),
    ],
  })
  return result.rowsAffected > 0
}

export async function listVideoIds(): Promise<string[]> {
  const db = await getDb()
  const result = await db.execute("SELECT video_id FROM thumbnails")
  return result.rows.map((row) => String(row.video_id))
}

export async function updateStats(stats: Map<string, VideoStats>) {
  if (stats.size === 0) return
  const db = await getDb()
  const updatedAt = new Date().toISOString()
  await db.batch(
    [...stats].map(([videoId, s]) => ({
      sql: `UPDATE thumbnails
            SET view_count = ?, like_count = ?, comment_count = ?, stats_updated_at = ?
            WHERE video_id = ?`,
      args: [s.viewCount, s.likeCount, s.commentCount, updatedAt, videoId],
    })),
    "write"
  )
}

export async function deleteThumbnail(id: number) {
  const db = await getDb()
  await db.execute({ sql: "DELETE FROM thumbnails WHERE id = ?", args: [id] })
}
