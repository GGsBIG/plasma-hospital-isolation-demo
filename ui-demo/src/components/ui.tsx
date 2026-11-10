// 輕量 presentational 版 shadcn 原件 —— className 與 Plasma 真前端一致，無 radix/API
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* ---------------- Button ---------------- */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[transform,colors] active:scale-[0.97] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/80",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "text-accent-foreground hover:bg-accent",
        brand: "bg-sidebar-ring text-white shadow hover:bg-sidebar-ring/80",
        ghostBrand: "text-sidebar-ring hover:bg-accent hover:text-sidebar-ring [&_svg]:text-sidebar-ring",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        icon: "h-9 w-9",
        iconSm: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
)
Button.displayName = "Button"

/* ---------------- Input ---------------- */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
)
Input.displayName = "Input"

/* ---------------- Textarea ---------------- */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

/* ---------------- Badge ---------------- */
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)
export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

/* ---------------- Select (presentational) ---------------- */
export function FakeSelect({ value, placeholder, className }: { value?: string; placeholder?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
        !value && "text-muted-foreground",
        className
      )}
    >
      <span>{value || placeholder}</span>
      <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}

/* ---------------- Table ---------------- */
export const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
)
export const TableHeader = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <thead {...p} />
export const TableBody = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />
export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b transition-colors hover:bg-muted/50", className)} {...props} />
)
export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("h-10 px-2 text-left align-middle font-medium text-muted-foreground", className)} {...props} />
)
export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("p-2 align-middle", className)} {...props} />
)

/* ---------------- Card ---------------- */
export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-xl border bg-card text-card-foreground shadow", className)} {...props} />
)

/* ---------------- Separator ---------------- */
export const Separator = ({ className }: { className?: string }) => (
  <div className={cn("shrink-0 bg-border h-px w-full", className)} />
)

/* ---------------- StatusDot ---------------- */
const dotColor: Record<string, string> = {
  void: "bg-muted-foreground/50",
  ready: "bg-emerald-500",
  failed: "bg-destructive",
  preparing: "bg-amber-500",
}
export function StatusDot({ status, size = 8, label }: { status: string; size?: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("inline-block rounded-full", dotColor[status] ?? dotColor.void)} style={{ width: size, height: size }} />
      {label}
    </div>
  )
}

/* ---------------- StatusBadge (列表狀態) ---------------- */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; t: string }> = {
    ready: { c: "text-emerald-600 bg-emerald-50 border-emerald-200", t: "Ready" },
    failed: { c: "text-destructive bg-red-50 border-red-200", t: "Failed" },
    preparing: { c: "text-amber-600 bg-amber-50 border-amber-200", t: "Preparing" },
  }
  const s = map[status] ?? map.preparing
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", s.c)}>
      <span className={cn("inline-block h-1.5 w-1.5 rounded-full", dotColor[status] ?? dotColor.preparing)} />
      {s.t}
    </span>
  )
}

/* ---------------- Dialog (presentational modal) ---------------- */
export function DialogShell({ open, className, children }: { open: boolean; className?: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center">
      <div className="absolute inset-0 bg-black/50 animate-in fade-in-0" />
      <div
        className={cn(
          "relative z-50 mt-[7vh] grid w-full gap-4 border bg-background p-6 shadow-lg rounded-lg animate-in fade-in-0 zoom-in-95",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
export function DialogHeaderRow({ title }: { title: string }) {
  return (
    <>
      <div className="flex flex-row items-center gap-4 p-0">
        <div className="bg-sidebar-ring/10 p-2.5 rounded-lg">
          <DatabaseIcon className="h-[18px] w-[18px] text-sidebar-ring shrink-0" />
        </div>
        <h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2>
      </div>
      <div className="border-t -mx-6" />
    </>
  )
}

/* small inline db icon to avoid extra import churn */
function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  )
}
