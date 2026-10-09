import * as React from "react"

import { cn } from "@/lib/utils"

// The outline badge only, the one this theme draws. shadcn's ships five more
// variants and `asChild`, all unused, and every variant's classes would land in
// the stylesheet.
function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-border px-2 py-0.5 text-xs font-medium whitespace-nowrap text-foreground [&>svg]:pointer-events-none [&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export { Badge }
