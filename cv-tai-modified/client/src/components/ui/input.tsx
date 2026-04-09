import * as React from "react"
import { cn } from "@/lib/utils"

/*
  Input — Linear/Raycast grade
  ──────────────────────────────
  Default: muted bg, no border (clean, reduces visual noise)
  Focus:   ring accent + subtle border emerges
  Error:   destructive ring
*/
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base
          "flex h-9 w-full rounded-[10px] px-3 py-2",
          "text-[0.9375rem] md:text-sm font-medium",
          "bg-muted border border-transparent",
          "text-foreground placeholder:text-muted-foreground placeholder:font-normal",
          // Transition
          "transition-all duration-150",
          // Focus — accent ring, border appears
          "focus-visible:outline-none",
          "focus-visible:border-primary/50",
          "focus-visible:bg-card",
          "focus-visible:ring-2 focus-visible:ring-ring/20",
          // File
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-40",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
