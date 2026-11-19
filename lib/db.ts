import "server-only"

import { createClient, type Client } from "@libsql/client"

import { optionalEnv, requireEnv } from "@/lib/env"

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS thumbnails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    channel_title TEXT NOT NULL,
    channel_avatar_url TEXT,
    published_at TEXT,
    view_count INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    stats_updated_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE INDEX IF NOT EXISTS thumbnails_created_at_idx ON thumbnails (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    external_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    author_name TEXT,
    author_url TEXT,
    seen INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (platform, external_id)
  )`,
  `CREATE INDEX IF NOT EXISTS resources_created_at_idx ON resources (created_at DESC)`,
]

// Columns added after the first version of each table. SQLite has no
// "ADD COLUMN IF NOT EXISTS", so existing databases get them through PRAGMA table_info.
const ADDED_COLUMNS: Record<string, Record<string, string>> = {
  thumbnails: {
    view_count: "INTEGER",
    like_count: "INTEGER",
    comment_count: "INTEGER",
    stats_updated_at: "TEXT",
  },
  resources: {
    seen: "INTEGER NOT NULL DEFAULT 0",
  },
}

async function migrate(client: Client) {
  for (const [table, columns] of Object.entries(ADDED_COLUMNS)) {
    const info = await client.execute(`PRAGMA table_info(${table})`)
    const existing = new Set(info.rows.map((row) => String(row.name)))
    const missing = Object.entries(columns).filter(([name]) => !existing.has(name))
    if (missing.length === 0) continue
    await client.batch(
      missing.map(([name, type]) => `ALTER TABLE ${table} ADD COLUMN ${name} ${type}`),
      "write"
    )
  }
}

const globalForDb = globalThis as unknown as { db?: Promise<Client> }

async function connect() {
  const client = createClient({
    url: requireEnv("TURSO_DATABASE_URL"),
    authToken: optionalEnv("TURSO_AUTH_TOKEN"),
  })
  // Idempotent: creates the tables the first time the app talks to the database.
  await client.batch(SCHEMA, "write")
  await migrate(client)
  return client
}

export function getDb(): Promise<Client> {
  if (!globalForDb.db) {
    globalForDb.db = connect().catch((error) => {
      globalForDb.db = undefined
      throw error
    })
  }
  return globalForDb.db
}
