import "server-only"

import { createHash, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { requireEnv } from "@/lib/env"
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth/token"

function safeEqual(a: string, b: string) {
  // Hash first so both buffers have the same length.
  const hashA = createHash("sha256").update(a).digest()
  const hashB = createHash("sha256").update(b).digest()
  return timingSafeEqual(hashA, hashB)
}

export function checkCredentials(username: string, password: string) {
  const validUser = safeEqual(username, requireEnv("AUTH_USERNAME"))
  const validPassword = safeEqual(password, requireEnv("AUTH_PASSWORD"))
  return validUser && validPassword
}

export async function startSession(username: string) {
  const token = await createSessionToken(username, requireEnv("AUTH_SECRET"))
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
}

export async function endSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/** Re-verifies the session close to the data (Server Actions, Route Handlers). */
export async function requireSession() {
  const cookieStore = await cookies()
  const session = await verifySessionToken(
    cookieStore.get(SESSION_COOKIE)?.value,
    requireEnv("AUTH_SECRET")
  )
  if (!session) redirect("/login")
  return session
}
