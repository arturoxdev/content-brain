"use server"

import { redirect } from "next/navigation"

import { checkCredentials, endSession, startSession } from "@/lib/auth/session"

export type LoginState = { error?: string; username?: string }

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!username || !password) {
    return { error: "Ingresa usuario y contraseña.", username }
  }
  if (!checkCredentials(username, password)) {
    return { error: "Usuario o contraseña incorrectos.", username }
  }

  await startSession(username)
  redirect("/thumbnails")
}

export async function logout() {
  await endSession()
  redirect("/login")
}
