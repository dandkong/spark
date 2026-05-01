"use client"

import { Toggle, ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react"
import { cn } from "@/lib/utils"

function ToggleGroup({
  className,
  orientation = "horizontal",
  ...props
}: ToggleGroupPrimitive.Props & { className?: string }) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-lg border border-border bg-background p-1 dark:border-input dark:bg-input/30",
        className,
      )}
      {...props}
    />
  )
}

function ToggleGroupItem({
  className,
  ...props
}: Toggle.Props & { className?: string }) {
  return (
    <Toggle
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-md opacity-45 grayscale transition hover:opacity-75 data-[pressed]:opacity-100 data-[pressed]:grayscale-0 [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
