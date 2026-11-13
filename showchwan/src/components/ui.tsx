import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

/* 這裡的元件與真正的 Plasma 前端（plasma-frontend src/components/ui）用同一組 class，畫面才會一模一樣 */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,text-decoration-color,fill,stroke,transform] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/80",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        brand: "bg-sidebar-ring text-white shadow hover:bg-sidebar-ring/80",
        ghost: "text-accent-foreground hover:bg-accent",
        link: "text-primary underline-offset-4 hover:underline",
        ghostBrand: "text-sidebar-ring hover:bg-accent hover:text-sidebar-ring [&_svg]:text-sidebar-ring",
        ghostDestructive: "text-destructive hover:bg-accent hover:text-destructive [&_svg]:text-destructive",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9 [&_svg]:w-5 [&_svg]:h-5",
        headerToolBarIcon: "h-8 w-8 [&_svg]:w-5 [&_svg]:h-5",
        iconText: "[&_svg]:w-4 [&_svg]:h-4 pr-3 pl-3 gap-1.5 h-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
))
Button.displayName = "Button"

// 表格列上的圖示按鈕（真前端 IconButtonWithTooltip：size icon + p-2）
export function IconButton({ variant = "ghost", className, ...props }: ButtonProps) {
  return <Button variant={variant} size="icon" className={cn("p-2", className)} {...props} />
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70 md:text-sm",
      className
    )}
    {...props}
  />
))
Input.displayName = "Input"

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      className
    )}
    {...props}
  />
))
Textarea.displayName = "Textarea"

export function Label({ className, children, required }: { className?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  )
}

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

// 真前端 Select 觸發按鈕的外觀
export function FakeSelect({ value, placeholder, className }: { value?: string; placeholder?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
        className
      )}
    >
      <span className={value ? "" : "text-muted-foreground"}>{value || placeholder}</span>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </div>
  )
}

// 真前端 SearchForm：左側放大鏡、無陰影、聚焦時藍框
export function SearchBox({ className, value }: { className?: string; value?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none opacity-50" />
      <input
        readOnly
        value={value ?? ""}
        placeholder="Search"
        className="flex rounded-md border border-input px-3 py-1 text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-none md:text-sm w-full bg-background shadow-none pl-8 h-9"
      />
    </div>
  )
}

/* ---------- Table（真前端 table.tsx + BorderBaseTable 的樣式） ---------- */
export const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="relative w-full">
    <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
)
export const TableHeader = ({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) => <thead className={cn("[&_tr]:border-b", className)} {...p} />
export const TableBody = ({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody className={cn("[&_tr:last-child]:border-0", className)} {...p} />
export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b h-12 transition-colors hover:bg-muted/50", className)} {...props} />
)
export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("h-10 px-2 first:pl-6 last:pr-6 text-left align-middle font-medium text-muted-foreground", className)} {...props} />
)
export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("p-2 align-middle first:pl-6", className)} {...props} />
)

// BorderBaseTable：圓角外框、表頭灰底、列高 h-14
export function DataTable({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg overflow-hidden flex flex-col relative border", className)}>
      <div className="min-w-full overflow-auto flex-1">
        <div className="relative w-full">
          <table className="w-full caption-bottom text-sm bg-background">{children}</table>
        </div>
      </div>
    </div>
  )
}
export const DTHeadRow = ({ children }: { children: React.ReactNode }) => (
  <thead className="[&_tr]:border-b">
    <tr className="border-b transition-colors h-14 hover:bg-transparent">{children}</tr>
  </thead>
)
export const DTHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("h-10 px-2 first:pl-6 last:pr-6 text-left align-middle font-medium text-muted-foreground bg-sidebar", className)} {...props} />
)
export const DTRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b transition-colors h-14 group hover:bg-transparent", className)} {...props} />
)
export const DTCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("p-2 align-middle first:pl-6 bg-background transition-colors group-hover:bg-muted/80", className)} {...props} />
)
export const DTEmpty = ({ cols }: { cols: number }) => (
  <tbody>
    <tr className="border-b h-12">
      <td colSpan={cols} className="p-2 align-middle h-24 text-center">No data available</td>
    </tr>
  </tbody>
)

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-lg border bg-background", className)} {...props} />
)

export const Separator = ({ className, vertical }: { className?: string; vertical?: boolean }) => (
  <div className={cn("shrink-0 bg-border", vertical ? "h-full w-[1px]" : "h-[1px] w-full", className)} />
)

/* ---------- 狀態（真前端 status-config.ts 的莫蘭迪配色） ---------- */
const STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  ready: { bg: "bg-[#e2f5ea]", text: "text-[#1a9e50]", dot: "bg-[#1a9e50]" },
  active: { bg: "bg-[#e2f5ea]", text: "text-[#1a9e50]", dot: "bg-[#1a9e50]" },
  preparing: { bg: "bg-[#eaeefc]", text: "text-[rgb(37,78,210)]", dot: "bg-[rgb(37,78,210)]" },
  syncing: { bg: "bg-[#eaeefc]", text: "text-[rgb(37,78,210)]", dot: "bg-[rgb(37,78,210)]" },
  failed: { bg: "bg-[#faeaea]", text: "text-[rgb(185,28,28)]", dot: "bg-[rgb(185,28,28)]" },
  none: { bg: "bg-[#ebebeb]", text: "text-[#6b6b6b]", dot: "bg-[#9a9a9a]" },
}
const statusOf = (s: string) => STATUS[s] ?? STATUS.none

export function StatusDot({ status, size = 6, label }: { status: string; size?: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("inline-block rounded-full", statusOf(status).dot)} style={{ width: size, height: size }} />
      {label}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const c = statusOf(status)
  const text = status.charAt(0).toUpperCase() + status.slice(1)
  return <span className={cn("inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full", c.bg, c.text)}>{text}</span>
}

/* ---------- Dialog（真前端 dialog.tsx：黑色 80% 遮罩、圓角白框、標題左側圖示） ---------- */
export function DialogShell({ open, className, children, closeT, closeTop = "top-7" }: { open: boolean; className?: string; children: React.ReactNode; closeT?: string; closeTop?: string }) {
  if (!open) return null
  return (
    <>
      <div className="absolute inset-0 z-40 bg-black/80 animate-in fade-in-0" />
      <div
        className={cn(
          "absolute left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 rounded-lg",
          className
        )}
      >
        {children}
        <button data-t={closeT} className={cn("absolute right-6 rounded-sm opacity-70 transition-opacity hover:opacity-100", closeTop)}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}

export function DialogHeaderRow({ title, icon: Icon }: { title: string; icon?: React.ComponentType<{ className?: string }> }) {
  if (!Icon) return <h2 className="text-lg font-semibold leading-none tracking-tight break-words">{title}</h2>
  return (
    <>
      <div className="flex flex-row items-center gap-4 p-0">
        <div className="bg-sidebar-ring/10 p-2.5 rounded-lg">
          <Icon className="h-[18px] w-[18px] text-sidebar-ring shrink-0" />
        </div>
        <h2 className="text-lg font-semibold leading-none tracking-tight break-words !m-0">{title}</h2>
      </div>
      <div className="border-t -mx-6" />
    </>
  )
}

export function DialogFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>{children}</div>
}
