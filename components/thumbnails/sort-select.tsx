"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { ArrowUpDownIcon } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DEFAULT_SORT, SORT_GROUPS, parseSort } from "@/lib/sort"

const TRIGGER_CLASSES = "w-[220px]"

export function SortSelect() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const sort = parseSort(searchParams.get("sort"))

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams)
    if (value === DEFAULT_SORT) params.delete("sort")
    else params.set("sort", value)
    const query = params.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  return (
    <Select value={sort} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className={TRIGGER_CLASSES} aria-label="Ordenar thumbnails">
        <ArrowUpDownIcon className="text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {SORT_GROUPS.map((group, index) => (
          <SelectGroup key={group.label}>
            {index > 0 && <SelectSeparator />}
            <SelectLabel>{group.label}</SelectLabel>
            {group.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Same footprint as the select while search params are not available yet. */
export function SortSelectFallback() {
  return (
    <div
      className={`${TRIGGER_CLASSES} flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-sm text-muted-foreground`}
    >
      <ArrowUpDownIcon className="size-4" />
      {SORT_GROUPS[0].options[0].label}
    </div>
  )
}
