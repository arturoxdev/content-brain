const compactFormatter = new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 })
const fullFormatter = new Intl.NumberFormat("es")
const dateFormatter = new Intl.DateTimeFormat("es", { dateStyle: "medium" })
const relativeFormatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" })

/** 1234567 → "1,2 M" */
export function formatCompact(value: number) {
  return compactFormatter.format(value)
}

/** 1234567 → "1.234.567" */
export function formatFull(value: number) {
  return fullFormatter.format(value)
}

export function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
]

/** "hace 3 años", "hace 5 minutos", "ahora" */
export function formatRelative(value: string, now = Date.now()) {
  const seconds = (new Date(value).getTime() - now) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relativeFormatter.format(Math.round(seconds / size), unit)
  }
  return relativeFormatter.format(0, "second")
}
