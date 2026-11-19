import "server-only"

type EnvName =
  | "AUTH_USERNAME"
  | "AUTH_PASSWORD"
  | "AUTH_SECRET"
  | "TURSO_DATABASE_URL"
  | "TURSO_AUTH_TOKEN"
  | "YOUTUBE_API_KEY"

export function requireEnv(name: EnvName): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Agrégala a .env.local (ver .env.example).`
    )
  }
  return value
}

export function optionalEnv(name: EnvName): string | undefined {
  return process.env[name] || undefined
}
