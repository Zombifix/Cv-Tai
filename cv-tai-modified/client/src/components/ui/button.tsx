import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/*
  Button — Linear/Raycast grade
  ──────────────────────────────
  Primary   : accent bg, strong visual weight, action shadow
  Secondary : surface bg, subtle border
  Outline   : transparent bg, visible border
  Ghost     : no bg, no border — tertiary actions only
  Destructive: red bg for irreversible actions
*/
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-semibold",
    "transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",
    "select-none",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "active:scale-[0.975]",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Primary — the single most important CTA on screen */
        default: [
          "bg-primary text-primary-foreground",
          "shadow-[0_2px_8px_hsl(27_58%_44%_/_0.30),0_1px_2px_rgba(0,0,0,0.08)]",
          "hover:bg-[hsl(27,58%,40%)]",
          "hover:shadow-[0_4px_12px_hsl(27_58%_44%_/_0.35),0_1px_3px_rgba(0,0,0,0.10)]",
        ].join(" "),

        /* Destructive */
        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-[0_1px_3px_rgba(0,0,0,0.10)]",
          "hover:bg-[hsl(0,68%,44%)]",
        ].join(" "),

        /* Outline — secondary action, clear but lighter than primary */
        outline: [
          "border border-border bg-card text-foreground",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
          "hover:bg-muted hover:border-[hsl(38,14%,82%)]",
        ].join(" "),

        /* Secondary — blends into surfaces */
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:bg-[hsl(38,12%,88%)]",
        ].join(" "),

        /* Ghost — for tertiary actions in lists, tables, etc. */
        ghost: [
          "text-muted-foreground",
          "hover:bg-muted hover:text-foreground",
        ].join(" "),

        /* Link — inline text actions */
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 px-4 rounded-[10px]",
        sm:      "h-8 px-3 rounded-[8px] text-xs",
        lg:      "h-10 px-5 rounded-[10px] text-[0.9375rem]",
        xl:      "h-11 px-6 rounded-[10px] text-[0.9375rem] font-bold",
        icon:    "h-9 w-9 rounded-[10px]",
        "icon-sm": "h-8 w-8 rounded-[8px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
