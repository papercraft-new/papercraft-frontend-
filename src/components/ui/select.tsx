import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
  disabled?: boolean
}

const SelectContext = React.createContext<{
  value: string
  onChange: (v: string) => void
  open: boolean
  setOpen: (o: boolean) => void
}>({ value: '', onChange: () => {}, open: false, setOpen: () => {} })

function Select({ value, defaultValue = '', onValueChange, children }: SelectProps) {
  const [internal, setInternal] = React.useState(defaultValue)
  const [open, setOpen] = React.useState(false)
  const actual = value !== undefined ? value : internal
  const onChange = (v: string) => {
    setInternal(v)
    onValueChange?.(v)
    setOpen(false)
  }
  return (
    <SelectContext.Provider value={{ value: actual, onChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(SelectContext)
    return (
      <button
        ref={ref}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectContext)
  return <span className="text-sm">{value || <span className="text-muted-foreground">{placeholder}</span>}</span>
}

function SelectContent({ children, className }: { children?: React.ReactNode; className?: string }) {
  const { open } = React.useContext(SelectContext)
  if (!open) return null
  return (
    <div className={cn("absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-popover shadow-lg", className)}>
      {children}
    </div>
  )
}

function SelectItem({ value, children, className }: { value: string; children?: React.ReactNode; className?: string }) {
  const { onChange, value: selected } = React.useContext(SelectContext)
  return (
    <div
      onClick={() => onChange(value)}
      className={cn(
        "relative flex cursor-pointer select-none items-center px-3 py-2 text-sm text-foreground hover:bg-secondary",
        selected === value && "bg-primary/10 text-primary font-medium",
        className
      )}
    >
      {children}
    </div>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }