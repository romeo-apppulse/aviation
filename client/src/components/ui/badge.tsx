import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors focus:outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#007AFF] text-white",
        secondary:
          "border-transparent bg-black/[0.04] text-[#1C1C1E]",
        destructive:
          "border-transparent bg-[#FF3B30] text-white",
        outline: "border-black/[0.08] text-[#8E8E93]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
