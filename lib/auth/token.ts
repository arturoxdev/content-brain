// Signed session token (HMAC-SHA256) built on Web Crypto so it runs in both
// proxy.ts and server code. Format: base64url(payload).base64url(signature)

export const SESSION_COOKIE = "cb_session"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

type SessionPayload = { sub: string; exp: number }

const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function getKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )
}

export async function createSessionToken(username: string, secret: string) {
  const payload: SessionPayload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  }
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign("HMAC", await getKey(secret), encoder.encode(body))
  return `${body}.${toBase64Url(new Uint8Array(signature))}`
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined
): Promise<SessionPayload | null> {
  if (!token || !secret) return null
  const [body, signature] = token.split(".")
  if (!body || !signature) return null

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getKey(secret),
      fromBase64Url(signature),
      encoder.encode(body)
    )
    if (!valid) return null

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null
    return payload
  } catch {
    return null
  }
}
