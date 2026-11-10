// 輕量 presentational 版 shadcn 原件 —— className 與 Plasma 真前端一致，無 radix/API
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* ---------------- Button ---------------- */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold tracking-[0.02em] transition-[transform,colors] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red disabled:pointer-events-none disabled:border-dashed disabled:border-ink/60 disabled:bg-paper disabled:text-ink-soft [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-2 border-ink bg-ink text-paper hover:bg-paper hover:text-ink",
        destructive: "border-2 border-ink bg-paper text-red hover:bg-ink hover:text-paper",
        outline: "border-2 border-ink bg-paper text-ink hover:bg-ink hover:text-paper",
        secondary: "bg-sheet text-ink hover:bg-sheet-deep",
        ghost: "text-ink hover:bg-sheet",
        brand: "border-2 border-red bg-red text-paper hover:border-red-deep hover:bg-red-deep",
        ghostBrand: "text-red hover:bg-sheet [&_svg]:text-red",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
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
        "flex h-9 w-full border border-ink bg-paper px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-red disabled:cursor-not-allowed disabled:opacity-50",
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
        "flex min-h-[60px] w-full border border-ink bg-paper px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-red",
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

/* ---------------- Badge ---------------- */
const badgeVariants = cva(
  "inline-flex items-center border px-2 py-0.5 text-xs font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "border-ink bg-ink text-paper",
        secondary: "border-transparent bg-sheet text-ink",
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
        "flex h-9 w-full items-center justify-between border border-ink bg-paper px-3 py-2 text-sm",
        !value && "text-muted-foreground",
        className
      )}
    >
      <span>{value || placeholder}</span>
      <svg className="h-4 w-4 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}

/* ---------------- Table ---------------- */
export const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
)
export const TableHeader = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <thead className="[&_tr]:border-b-2 [&_tr]:border-ink [&_tr:hover]:bg-transparent" {...p} />
export const TableBody = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />
export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b border-hair transition-colors hover:bg-sheet/60", className)} {...props} />
)
export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("h-10 px-2 text-left align-middle t-label text-ink", className)} {...props} />
)
export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("p-2 align-middle", className)} {...props} />
)

/* ---------------- Card ---------------- */
export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("border border-ink border-t-4 bg-card text-card-foreground", className)} {...props} />
)

/* ---------------- Separator ---------------- */
export const Separator = ({ className }: { className?: string }) => (
  <div className={cn("shrink-0 bg-border h-px w-full", className)} />
)

/* ---------------- StatusDot ---------------- */
const dotColor: Record<string, string> = {
  void: "bg-[#8a8a8a]",
  ready: "bg-ink",
  failed: "bg-red",
  preparing: "bg-red animate-pulse",
}
export function StatusDot({ status, size = 8, label }: { status: string; size?: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("inline-block", dotColor[status] ?? dotColor.void)} style={{ width: size, height: size }} />
      {label}
    </div>
  )
}

/* ---------------- StatusBadge (列表狀態) ---------------- */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; t: string }> = {
    ready: { c: "text-ink bg-paper border-ink", t: "Ready" },
    failed: { c: "text-paper bg-red border-red", t: "Failed" },
    preparing: { c: "text-red bg-paper border-red", t: "Preparing" },
  }
  const s = map[status] ?? map.preparing
  return (
    <span className={cn("inline-flex items-center gap-1.5 border px-2 py-0.5 t-label", s.c)}>
      <span className={cn("inline-block h-1.5 w-1.5", status === "failed" ? "bg-paper" : (dotColor[status] ?? dotColor.preparing))} />
      {s.t}
    </span>
  )
}

/* ---------------- Dialog (presentational modal) ---------------- */
export function DialogShell({ open, className, children }: { open: boolean; className?: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center">
      <div className="absolute inset-0 bg-ink/55 animate-in fade-in-0" />
      <div
        className={cn(
          "relative z-50 mt-[7vh] grid w-full gap-4 border-2 border-ink border-t-[6px] border-t-red bg-paper p-6 shadow-[0_16px_40px_rgb(17_17_17/0.22)] animate-in fade-in-0 zoom-in-95",
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
        <div className="bg-red p-2.5">
          <DatabaseIcon className="h-[18px] w-[18px] text-paper shrink-0" />
        </div>
        <h2 className="text-xl font-black leading-none tracking-[-0.01em]">{title}</h2>
      </div>
      <div className="border-t-2 border-ink -mx-6" />
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
