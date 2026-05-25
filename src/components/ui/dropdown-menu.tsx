import * as React from "react"
import { cn } from "@/lib/utils"

const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div ref={ref} className="relative inline-block">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ onToggle?: () => void; open?: boolean }>, { onToggle: () => setOpen(!open), open })
        }
        return child
      })}
    </div>
  )
}

const DropdownMenuTrigger = ({ children, asChild, onToggle }: { children: React.ReactNode; asChild?: boolean; onToggle?: () => void }) => {
  return <div onClick={onToggle} className="cursor-pointer">{children}</div>
}

const DropdownMenuContent = ({ children, className, align = 'start', open }: { children?: React.ReactNode; className?: string; align?: string; open?: boolean }) => {
  if (!open) return null
  return (
    <div className={cn(
      "absolute z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg",
      align === 'end' ? 'right-0' : 'left-0',
      "top-full mt-1",
      className
    )}>
      {children}
    </div>
  )
}

const DropdownMenuItem = ({ children, className, onClick }: { children?: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={cn("flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-secondary outline-none", className)}
  >
    {children}
  </div>
)

const DropdownMenuSeparator = ({ className }: { className?: string }) => (
  <div className={cn("-mx-1 my-1 h-px bg-border", className)} />
)

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator }