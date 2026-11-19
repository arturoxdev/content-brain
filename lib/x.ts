import "server-only"

const HOSTS = new Set(["x.com", "twitter.com", "mobile.x.com", "mobile.twitter.com"])
const STATUS_ID = /^\d{1,20}$/
const USERNAME = /^[A-Za-z0-9_]{1,15}$/

export type XPostRef = { statusId: string; username: string | null }

/** Extracts the post id from x.com / twitter.com status URLs (incl. /i/web/status/…). */
export function parseXPostUrl(input: string): XPostRef | null {
  const value = input.trim()
  let url: URL
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value}`)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, "")
  if (!HOSTS.has(host)) return null

  const parts = url.pathname.split("/").filter(Boolean)
  const statusIndex = parts.indexOf("status")
  if (statusIndex < 1) return null

  const statusId = parts[statusIndex + 1]
  if (!statusId || !STATUS_ID.test(statusId)) return null

  const user = parts[0]
  return { statusId, username: user !== "i" && USERNAME.test(user) ? user : null }
}

export function xPostUrl({ statusId, username }: XPostRef) {
  return `https://x.com/${username ?? "i"}/status/${statusId}`
}

export type XPost = {
  statusId: string
  url: string
  text: string
  authorName: string
  authorUrl: string | null
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
}

function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const point = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : Number(code.slice(1))
      return Number.isFinite(point) ? String.fromCodePoint(point) : match
    }
    return ENTITIES[code.toLowerCase()] ?? match
  })
}

/** The oEmbed HTML is `<blockquote><p>TEXT</p>— Name (@handle) <a>date</a></blockquote>`. */
function extractText(html: string) {
  const paragraph = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? ""
  return decodeEntities(paragraph.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/\s*(pic\.twitter\.com|https?:\/\/t\.co)\/\S+/g, "")
    .trim()
}

/**
 * Reads a public post through X's oEmbed endpoint (no API key needed).
 * Returns null when the post does not exist or is not public.
 */
export async function fetchXPost(ref: XPostRef): Promise<XPost | null> {
  const endpoint = new URL("https://publish.x.com/oembed")
  endpoint.searchParams.set("url", xPostUrl(ref))
  endpoint.searchParams.set("omit_script", "1")
  endpoint.searchParams.set("dnt", "true")

  const response = await fetch(endpoint, { cache: "no-store" })
  if (response.status === 404 || response.status === 403) return null
  if (!response.ok) throw new Error(`X oEmbed respondió ${response.status}`)

  const data = (await response.json()) as {
    url?: string
    author_name?: string
    author_url?: string
    html?: string
  }

  // author_url carries the real handle even when the pasted link was /i/status/….
  const handle = data.author_url?.split("/").filter(Boolean).pop()
  const username = handle && USERNAME.test(handle) ? handle : ref.username

  return {
    statusId: ref.statusId,
    url: xPostUrl({ statusId: ref.statusId, username }),
    text: extractText(data.html ?? ""),
    authorName: data.author_name || (username ? `@${username}` : "X"),
    authorUrl: username ? `https://x.com/${username}` : null,
  }
}
