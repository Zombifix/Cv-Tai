import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-[10px] px-3 py-2.5",
        "text-[0.9375rem] md:text-sm font-medium leading-relaxed",
        "bg-muted border border-transparent",
        "text-foreground placeholder:text-muted-foreground placeholder:font-normal",
        "transition-all duration-150",
        "focus-visible:outline-none",
        "focus-visible:border-primary/50 focus-visible:bg-card",
        "focus-visible:ring-2 focus-visible:ring-ring/20",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
