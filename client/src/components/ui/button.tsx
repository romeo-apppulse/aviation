import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all active:scale-[0.98] outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#007AFF] text-white hover:bg-[#007AFFee] shadow-[0_4px_12px_rgba(0,122,255,0.2)] hover:shadow-[0_6px_16px_rgba(0,122,255,0.3)]",
        destructive:
          "bg-[#FF3B30] text-white hover:bg-[#FF3B30ee] shadow-[0_4px_12px_rgba(255,59,48,0.2)]",
        outline:
          "border border-black/[0.08] bg-white text-[#1C1C1E] hover:bg-black/[0.02] shadow-sm",
        secondary:
          "bg-black/[0.04] text-[#1C1C1E] hover:bg-black/[0.06]",
        ghost: "text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-black/[0.04]",
        link: "text-[#007AFF] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 rounded-xl px-4 text-xs",
        lg: "h-12 rounded-[14px] px-10 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
