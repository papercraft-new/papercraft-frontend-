import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none"
    const variants = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      outline: "border border-border bg-transparent hover:bg-secondary text-foreground",
      ghost: "hover:bg-secondary text-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      link: "underline-offset-4 hover:underline text-primary",
    }
    const sizes = {
      default: "h-10 py-2 px-4",
      sm: "h-8 px-3 text-xs",
      lg: "h-12 px-8",
      icon: "h-10 w-10",
    }
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }