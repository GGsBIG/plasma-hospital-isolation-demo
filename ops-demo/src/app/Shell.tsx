import {
  LayoutDashboard, LibraryBig, Database, SquareTerminal, Package,
  Workflow, FileText, Layers, Boxes, CalendarClock, Bot, ChevronDown, Plus, Filter, Search,
  Server, MoreHorizontal, Pencil, FileUp, RefreshCcw, Trash2, ArrowLeft, Info, Table2,
} from "lucide-react"
import logo from "@/assets/plasma-logo-light.svg"
import brandLogo from "@/assets/brobridge-logo.png"
import { cn } from "@/lib/utils"
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  StatusBadge, Button, Card, Badge,
} from "@/components/ui"
import type { DemoState } from "@/demo/store"
import { TABLE_NAME } from "@/demo/data"

const NAV: { group: string; items: { label: string; path: string; icon: any }[] }[] = [
  { group: "OVERVIEW", items: [{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard }] },
  {
    group: "GENERAL",
    items: [
      { label: "Data Catalog", path: "/data-catalog", icon: LibraryBig },
      { label: "Database", path: "/database", icon: Database },
      { label: "SQL Playground", path: "/sql-playground", icon: SquareTerminal },
      { label: "Data Product", path: "/data-product", icon: Package },
    ],
  },
  { group: "STREAMING", items: [{ label: "Streaming Pipeline", path: "/cdc", icon: Workflow }] },
  {
    group: "VIEW",
    items: [
      { label: "View", path: "/view", icon: FileText },
      { label: "Materialized View", path: "/materialized-view", icon: Layers },
    ],
  },
  {
    group: "BLUEPRINT",
    items: [{ label: "Data Blueprint", path: "/data-blueprint", icon: Boxes }],
  },
  { group: "SCHEDULER", items: [{ label: "Scheduler", path: "/scheduler", icon: CalendarClock }] },
  { group: "MCP", items: [{ label: "MCP", path: "/mcp", icon: Bot }] },
]

export function Sidebar({ s }: { s: DemoState }) {
  return (
    <aside className="w-64 shrink-0 h-full bg-sidebar border-r-2 border-ink flex flex-col">
      <div className="pl-6 pr-4 pt-5 pb-4 flex flex-col gap-2.5 border-b border-hair mx-0">
        <img src={brandLogo} alt="Brobridge" className="h-5 w-auto self-start" />
        <img src={logo} alt="Plasma" className="h-6 self-start brightness-0" />
      </div>
      <div className="px-2 pt-3 pb-6 overflow-y-auto flex flex-col gap-3">
        {NAV.map((sec) => (
          <div key={sec.group}>
            <div className="px-3 py-1 t-label text-ink-soft">{sec.group}</div>
            <div className="flex flex-col gap-0.5">
              {sec.items.map((it) => {
                const active = s.navActive === it.path
                const Icon = it.icon
                return (
                  <div key={it.path} data-t={`nav-${it.path.slice(1)}`} className="relative px-1">
                    {active && (
                      <span
                        className="absolute left-1 top-1/2 w-[5px] h-9 bg-red"
                        style={{ transformOrigin: "left center", animation: "sidebar-indicator-in 180ms cubic-bezier(0.23,1,0.32,1) both" }}
                      />
                    )}
                    <div
                      className={cn(
                        "flex items-center gap-2.5 px-3 h-9 text-sm transition-colors",
                        active ? "bg-paper text-red font-bold" : "text-ink hover:bg-sidebar-accent"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{it.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

export function TopBar({ crumb }: { crumb: string }) {
  return (
    <div className="h-14 shrink-0 border-b-2 border-ink flex items-center justify-between px-6">
      <div className="t-label text-ink">{crumb}</div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm font-bold border border-ink px-2.5 h-8">
          user_admin <ChevronDown className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  )
}

/* ---------- Database 列表頁 ---------- */
export function DatabaseListPage({ s }: { s: DemoState }) {
  return (
    <div className="flex flex-col mx-8 py-6 gap-4 flex-1 min-h-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-[-0.01em]">Database Connections</h1>
          <p className="text-sm text-ink-soft mt-1">Configure and maintain database connections</p>
        </div>
        <Button data-t="btn-add-db" variant="brand"><Plus className="h-4 w-4" /> Add Database</Button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 h-9 w-72 border border-ink px-3 text-sm text-ink-soft">
          <Search className="h-4 w-4" /> Search
        </div>
        <Button variant="outline" size="sm" className="h-9"><Filter className="h-4 w-4" /> Filter</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Port</TableHead>
              <TableHead>Update Time</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.connections.length === 0 ? (
              <TableRow>
                <TableCell className="text-center text-muted-foreground py-10" {...({ colSpan: 8 } as any)}>
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              s.connections.map((c) => (
                <TableRow key={c.name} data-t={`row-${c.name}`} className={c.name === "oracle_erp" ? "fadeup on" : ""}>
                  <TableCell className="pl-4 font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.name === "oracle_erp" ? "ERP order system database" : c.name === "mysql_crm" ? "CRM member database" : "Export target: clean database"}
                  </TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell>{c.type}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {c.name === "oracle_erp" ? "oracle-erp.starbridge-erp…" : c.name === "mysql_crm" ? "mysql-crm.starbridge-crm…" : "pg-sink.starbridge-sink…"}
                  </TableCell>
                  <TableCell>{c.name === "oracle_erp" ? "1521" : c.name === "mysql_crm" ? "3306" : "5432"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">2026/09/01 12:00:00</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <IconAction dataT={c.name === "oracle_erp" ? "row-detail" : undefined} title="Detail" variant="brand"><Info className="h-4 w-4" /></IconAction>
                      <IconAction dataT={c.name === "oracle_erp" ? "row-tables" : undefined} title="Tables"><Table2 className="h-4 w-4" /></IconAction>
                      <IconAction title="Edit"><Pencil className="h-4 w-4" /></IconAction>
                      <IconAction title="Sync Tables"><RefreshCcw className="h-4 w-4" /></IconAction>
                      <IconAction title="Delete" variant="destructive"><Trash2 className="h-4 w-4" /></IconAction>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

/* ---------- Database 詳情頁 ---------- */
export function DatabaseDetailPage({ s }: { s: DemoState }) {
  return (
    <div className="flex flex-col mx-8 py-6 gap-4 flex-1 min-h-0">
      <div className="flex items-center gap-2">
        <button className="inline-flex items-center justify-center h-8 w-8 border border-ink text-ink hover:bg-sheet">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-2xl font-black">oracle_erp</span>
        <StatusBadge status="ready" />
      </div>
      <div className="flex gap-6 border-b-2 border-ink">
        {["general", "tables"].map((tab) => (
          <div
            key={tab}
            data-t={`tab-${tab}`}
            className={cn(
              "pb-2 text-sm cursor-default -mb-[2px] border-b-4",
              s.detailTab === tab ? "border-red text-red font-bold" : "border-transparent text-ink-soft font-medium"
            )}
          >
            {tab === "general" ? "General" : "Tables"}
          </div>
        ))}
      </div>

      {s.detailTab === "general" ? (
        <div className="flex flex-col gap-2 py-2">
          <div className="flex items-center justify-between">
            <h2 className="t-label text-ink text-[12px]">Information</h2>
            <div className="flex gap-2">
              <Button data-t="btn-upload-doc" size="sm" variant="brand" className="h-9 px-3 gap-1"><FileUp className="h-4 w-4" /> Upload</Button>
              <Button size="sm" variant="brand" className="h-9 px-3 gap-1"><Pencil className="h-4 w-4" /> Edit</Button>
              <Button size="sm" variant="brand" className="h-9 px-3 gap-1"><RefreshCcw className="h-4 w-4" /> Sync</Button>
              <Button size="sm" variant="destructive" className="h-9 px-3 gap-1"><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
          </div>
          <div className="border-t-4 border-ink">
            <DetailRow label="Type" value="Oracle" />
            <DetailRow label="Description" value="ERP order system database" />
            <DetailRow label="Host" value="oracle-erp.starbridge-erp.svc.cluster.local" />
            <DetailRow label="Port" value="1521" />
            <DetailRow label="Database Name" value="FREEPDB1" />
            <DetailRow label="Create Time" value="2026/09/01 12:00:00" />
            <DetailRow label="Updated At" value="2026/09/01 12:00:00" />
          </div>
        </div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Table Name</TableHead>
                <TableHead>Columns</TableHead>
                <TableHead>Last Synced Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow data-t="row-tord">
                <TableCell className="pl-4 font-medium">{TABLE_NAME}</TableCell>
                <TableCell>8</TableCell>
                <TableCell className="text-muted-foreground text-xs">2026/09/01 12:00:00</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <IconAction dataT="btn-view-data" title="View Data"><Server className="h-4 w-4" /></IconAction>
                    <IconAction dataT="btn-view-schema" title="View Schema"><FileText className="h-4 w-4" /></IconAction>
                    <IconAction title="More Actions"><MoreHorizontal className="h-4 w-4" /></IconAction>
                    <IconAction dataT="btn-edit-desc" title="Edit Description"><Pencil className="h-4 w-4" /></IconAction>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-4 font-medium">T_PRD_M</TableCell>
                <TableCell>4</TableCell>
                <TableCell className="text-muted-foreground text-xs">2026/09/01 12:00:00</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <IconAction title="View Data"><Server className="h-4 w-4" /></IconAction>
                    <IconAction title="View Schema"><FileText className="h-4 w-4" /></IconAction>
                    <IconAction title="More Actions"><MoreHorizontal className="h-4 w-4" /></IconAction>
                    <IconAction title="Edit Description"><Pencil className="h-4 w-4" /></IconAction>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="w-40 text-muted-foreground">{label}</span>
      <span className="font-mono text-[13px]">{value}</span>
    </div>
  )
}

// 對齊真前端 DetailRow
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2 text-sm border-b border-hair">
      <span className="w-60 shrink-0 t-label text-ink-soft pt-0.5">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  )
}

// action icon 按鈕（對齊真前端 IconButtonWithTooltip：ghost / ghostBrand / ghostDestructive）
function IconAction({ dataT, title, variant, children }: { dataT?: string; title: string; variant?: "brand" | "destructive"; children: React.ReactNode }) {
  const color =
    variant === "brand" ? "text-red hover:bg-sheet"
    : variant === "destructive" ? "text-red hover:bg-sheet"
    : "text-ink hover:bg-sheet"
  return (
    <button data-t={dataT} title={title} className={cn("inline-flex items-center justify-center h-8 w-8 transition-colors focus-visible:outline-2 focus-visible:outline-red", color)}>
      {children}
    </button>
  )
}

/* ---------- Materialized View 列表頁（第二幕成果） ---------- */
import { MVIEW_NAME, API_URL } from "@/demo/data"
import { Link2, ArrowRight, Copy, Check } from "lucide-react"

export function MaterializedViewPage({ s }: { s: DemoState }) {
  return (
    <div className="flex flex-col mx-8 py-6 gap-4 flex-1 min-h-0">
      <h1 className="text-2xl font-black tracking-[-0.01em]">Materialized View</h1>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Sync Status</TableHead>
              <TableHead>Sync Progress</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.mviewCreated && (
              <TableRow data-t="row-mview" className="fadeup on">
                <TableCell className="pl-4 font-medium">{MVIEW_NAME}</TableCell>
                <TableCell className="text-muted-foreground">Auto-created from BI dashboard metrics</TableCell>
                <TableCell><StatusBadge status="ready" /></TableCell>
                <TableCell className="text-muted-foreground">100%</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <IconAction title="View API"><Link2 className="h-4 w-4" /></IconAction>
                    <IconAction title="More Actions"><MoreHorizontal className="h-4 w-4" /></IconAction>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Data API：agent 建好後，直接在這裡複製對外 API 給 BI 用 */}
      {s.mviewCreated && (
        <Card className="p-5 flex flex-col gap-3 fadeup on">
          <div>
            <div className="t-label text-[12px]">Data API</div>
            <div className="text-xs text-ink-soft mt-1">Public data API, backed by {MVIEW_NAME} (Oracle ERP × MySQL CRM)</div>
          </div>
          <div className="flex items-center gap-2 border border-ink bg-sheet px-3 py-2.5">
            <span className="bg-ink text-paper t-label px-2 py-0.5">GET</span>
            <span className="font-mono text-[13px] truncate flex-1">{API_URL}</span>
            <button
              data-t="btn-copy-api"
              className={cn(
                "inline-flex items-center gap-1.5 px-3 h-8 text-xs font-bold shrink-0",
                s.apiCopied ? "bg-ink text-paper" : "bg-red text-paper"
              )}
            >
              {s.apiCopied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Link2 className="h-4 w-4" /> Paste this API into your BI tool to load the dashboard —— no SQL, no schema knowledge needed. <ArrowRight className="h-4 w-4" />
          </div>
        </Card>
      )}
    </div>
  )
}

/* ---------- MCP 頁：在 Plasma 註冊對外 MCP，讓外部 agent 接上 ---------- */
import { MCP_TOOLS } from "@/demo/data"

export function MCPPage({ s }: { s: DemoState }) {
  return (
    <div className="flex flex-col mx-8 py-6 gap-4 flex-1 min-h-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-[-0.01em]">MCP Servers</h1>
          <p className="text-sm text-ink-soft mt-1">Expose your Plasma data semantics to external agents over Model Context Protocol</p>
        </div>
        <Button data-t="btn-add-mcp" variant="brand"><Plus className="h-4 w-4" /> Add MCP</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Name</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Target Agent</TableHead>
              <TableHead>Tools</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.mcpServers.length === 0 ? (
              <TableRow>
                <TableCell className="text-center text-muted-foreground py-10" {...({ colSpan: 5 } as any)}>
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              s.mcpServers.map((m) => (
                <TableRow key={m.name} data-t={`row-mcp-${m.name}`} className="fadeup on">
                  <TableCell className="pl-4 font-medium">{m.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{m.endpoint}</TableCell>
                  <TableCell>{m.target}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{MCP_TOOLS.length} tools</TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

/* ---------- Data API 頁（Data Product） ---------- */
export function DataApiPage({ s }: { s: DemoState }) {
  return (
    <div className="flex flex-col mx-8 py-6 gap-4 flex-1 min-h-0">
      <div className="flex items-center justify-between max-w-3xl">
        <h1 className="text-2xl font-black tracking-[-0.01em]">Data API</h1>
        <Button data-t="btn-export-api" variant="brand" className="h-9 px-3 gap-1"><Link2 className="h-4 w-4" /> Export API</Button>
      </div>
      <Card className="p-6 flex flex-col gap-4 max-w-3xl">
        <div>
          <div className="text-sm font-bold mb-1">bi_dashboard</div>
          <div className="text-xs text-ink-soft">Public data API, backed by Materialized View bi_dashboard (Oracle ERP × MySQL CRM)</div>
        </div>
        <div className="flex items-center gap-2 border border-ink bg-sheet px-3 py-2.5">
          <span className="bg-ink text-paper t-label px-2 py-0.5">GET</span>
          <span className="font-mono text-[13px] truncate">{API_URL}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Link2 className="h-4 w-4" /> Use this API to connect your BI tool —— no SQL, no schema knowledge needed. <ArrowRight className="h-4 w-4" />
        </div>
      </Card>
    </div>
  )
}
