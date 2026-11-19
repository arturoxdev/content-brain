import "server-only"

import { getDb } from "@/lib/db"

export type ResourcePlatform = "youtube" | "x"

export type SavedResource = {
  id: number
  platform: ResourcePlatform
  externalId: string
  url: string
  title: string
  description: string | null
  imageUrl: string | null
  authorName: string | null
  authorUrl: string | null
  seen: boolean
  createdAt: string
}

export type NewResource = Omit<SavedResource, "id" | "createdAt">

type Row = Record<string, unknown>

function toStringOrNull(value: unknown): string | null {
  return value === null || value === undefined || value === "" ? null : String(value)
}

function toResource(row: Row): SavedResource {
  return {
    id: Number(row.id),
    platform: String(row.platform) as ResourcePlatform,
    externalId: String(row.external_id),
    url: String(row.url),
    title: String(row.title),
    description: toStringOrNull(row.description),
    imageUrl: toStringOrNull(row.image_url),
    authorName: toStringOrNull(row.author_name),
    authorUrl: toStringOrNull(row.author_url),
    seen: Number(row.seen) === 1,
    createdAt: String(row.created_at),
  }
}

export async function listResources(): Promise<SavedResource[]> {
  const db = await getDb()
  const result = await db.execute("SELECT * FROM resources ORDER BY created_at DESC, id DESC")
  return result.rows.map((row) => toResource(row as Row))
}

export async function resourceExists(platform: ResourcePlatform, externalId: string) {
  const db = await getDb()
  const result = await db.execute({
    sql: "SELECT 1 FROM resources WHERE platform = ? AND external_id = ?",
    args: [platform, externalId],
  })
  return result.rows.length > 0
}

/** Returns false when the link was already saved. */
export async function insertResource(resource: NewResource): Promise<boolean> {
  const db = await getDb()
  const result = await db.execute({
    sql: `INSERT INTO resources
            (platform, external_id, url, title, description, image_url, author_name, author_url, seen)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(platform, external_id) DO NOTHING`,
    args: [
      resource.platform,
      resource.externalId,
      resource.url,
      resource.title,
      resource.description,
      resource.imageUrl,
      resource.authorName,
      resource.authorUrl,
      resource.seen ? 1 : 0,
    ],
  })
  return result.rowsAffected > 0
}

export async function updateResourceDescription(id: number, description: string | null) {
  const db = await getDb()
  await db.execute({
    sql: "UPDATE resources SET description = ? WHERE id = ?",
    args: [description, id],
  })
}

export async function updateResourceSeen(id: number, seen: boolean) {
  const db = await getDb()
  await db.execute({ sql: "UPDATE resources SET seen = ? WHERE id = ?", args: [seen ? 1 : 0, id] })
}

export async function deleteResource(id: number) {
  const db = await getDb()
  await db.execute({ sql: "DELETE FROM resources WHERE id = ?", args: [id] })
}
