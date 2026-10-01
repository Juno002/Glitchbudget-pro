"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor
const PopoverClose = PopoverPrimitive.Close

type PopoverContentProps = React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
  showCloseButton?: boolean
  closeLabel?: string
}

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, align = "center", sideOffset = 8, collisionPadding = 12, children, showCloseButton = false, closeLabel = "Cerrar ayuda", ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={cn(
        "relative z-50 w-72 max-w-[calc(100vw-2rem)] rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[hsl(var(--surface-elevated))] p-4 text-popover-foreground shadow-[var(--shadow-popover)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 duration-[var(--motion-menu)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        showCloseButton && "pr-12",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton ? (
        <PopoverPrimitive.Close
          type="button"
          aria-label={closeLabel}
          data-popover-close="true"
          className="absolute right-1.5 top-1.5 inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-interactive)] text-muted-foreground transition-colors duration-[var(--motion-control)] hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </PopoverPrimitive.Close>
      ) : null}
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverAnchor, PopoverClose, PopoverTrigger, PopoverContent }
