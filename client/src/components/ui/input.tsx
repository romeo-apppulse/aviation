import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2 text-[14px] font-medium text-[#1C1C1E] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#A2A2A7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF40] focus-visible:border-[#007AFF] disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm",
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
