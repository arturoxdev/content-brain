// Shared between the sort <Select> (client) and the SQL query (server).

export const SORT_GROUPS = [
  {
    label: "Agregados",
    options: [
      { value: "added-desc", label: "Agregados recientemente" },
      { value: "added-asc", label: "Agregados primero" },
    ],
  },
  {
    label: "Vistas",
    options: [
      { value: "views-desc", label: "Más vistos" },
      { value: "views-asc", label: "Menos vistos" },
    ],
  },
  {
    label: "Likes",
    options: [
      { value: "likes-desc", label: "Más likes" },
      { value: "likes-asc", label: "Menos likes" },
    ],
  },
  {
    label: "Comentarios",
    options: [
      { value: "comments-desc", label: "Más comentarios" },
      { value: "comments-asc", label: "Menos comentarios" },
    ],
  },
  {
    label: "Publicación",
    options: [
      { value: "published-desc", label: "Publicados recientemente" },
      { value: "published-asc", label: "Publicados hace más tiempo" },
    ],
  },
] as const

export type SortOption = (typeof SORT_GROUPS)[number]["options"][number]["value"]

export const DEFAULT_SORT: SortOption = "added-desc"

const SORT_VALUES = new Set<string>(SORT_GROUPS.flatMap((group) => group.options.map((o) => o.value)))

export function parseSort(value: unknown): SortOption {
  return typeof value === "string" && SORT_VALUES.has(value) ? (value as SortOption) : DEFAULT_SORT
}
