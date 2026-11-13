import {
  LayoutDashboard, LibraryBig, Database, SquareTerminal, Package, Workflow, FilePen, FileBox, FileCode2,
  GitCompareArrows, FileSliders, Layers, Calendar, Bot, BookOpenText, Users, SlidersHorizontal, Box, UserRound,
  Award, ScrollText, PanelLeft, ChevronDown, ChevronRight, Moon, User, Plus, Filter, RefreshCcw, Clock,
  Info, Table2, Pencil, Trash2, ArrowLeft, FileUp, Server, FileText, MoreHorizontal, ArrowUp, ArrowUpDown,
  ChevronLeft, Link2, Copy, Check, Grid2X2,
} from "lucide-react"
import logo from "@/assets/plasma-logo-light.svg"
import { cn } from "@/lib/utils"
import {
  Button, IconButton, SearchBox, StatusBadge, Card, Separator,
  DataTable, DTHeadRow, DTHead, DTRow, DTCell, DTEmpty,
} from "@/components/ui"
import type { DemoState } from "@/demo/store"
import { TABLE_NAME, MVIEW_NAME, API_URL, BRANCHES, A_DBS } from "@/demo/data"

/* 側欄：與真正 Plasma 前端的路由清單、圖示、樣式相同（app-sidebar.tsx + ui/sidebar.tsx） */
const NAV: { group: string; sep?: boolean; items: { label: string; path: string; icon: any }[] }[] = [
  { group: "OVERVIEW", items: [{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard }] },
  {
    group: "GENERAL",
    items: [
      { label: "Data Catalog", path: "/data-catalog", icon: LibraryBig },
      { label: "Data Access", path: "/database", icon: Database },
      { label: "SQL Playground", path: "/sql-playground", icon: SquareTerminal },
      { label: "Data Product", path: "/data-product", icon: Package },
    ],
  },
  { group: "STREAMING", items: [{ label: "Streaming Pipeline", path: "/cdc", icon: Workflow }] },
  {
    group: "VIEW",
    items: [
      { label: "View", path: "/view", icon: FilePen },
      { label: "Materialized View", path: "/materialized-view", icon: FileBox },
      { label: "Parameterized View", path: "/parameterized-view", icon: FileCode2 },
    ],
  },
  {
    group: "ATOMIC",
    items: [
      { label: "Atomic Program", path: "/atomic-program", icon: GitCompareArrows },
      { label: "Atomic Config", path: "/atomic-config", icon: FileSliders },
    ],
  },
  {
    group: "BLUEPRINT",
    items: [
      { label: "Data Blueprint", path: "/data-blueprint", icon: Layers },
      { label: "Atomic Blueprint", path: "/atomic-blueprint", icon: Layers },
    ],
  },
  { group: "SCHEDULER", items: [{ label: "Scheduler", path: "/scheduler", icon: Calendar }] },
  {
    group: "AI",
    items: [
      { label: "MCP", path: "/mcp", icon: Bot },
      { label: "Knowledge", path: "/knowledge", icon: BookOpenText },
    ],
  },
  {
    group: "WORKSPACE", sep: true,
    items: [
      { label: "Workspace", path: "/workspace", icon: Users },
      { label: "Package Library", path: "/workspace-package", icon: Package },
      { label: "AI Model", path: "/workspace-ai", icon: SlidersHorizontal },
    ],
  },
  { group: "MANAGE", sep: true, items: [{ label: "Manage Packages", path: "/manage-package", icon: Box }] },
  {
    group: "SYSTEM", sep: true,
    items: [
      { label: "Manage Users", path: "/manage-users", icon: UserRound },
      { label: "Manage Workspace", path: "/manage-workspace", icon: Award },
      { label: "AI Connections", path: "/ai-connections", icon: SlidersHorizontal },
      { label: "Audit Log", path: "/audit-log", icon: ScrollText },
    ],
  },
]

const MENU_BTN =
  "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none transition-[width,height,padding,background-color,color,transform] [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm py-5 h-8"

export function Sidebar({ s }: { s: DemoState }) {
  const onDetail = s.page === "detail"
  return (
    <aside className="w-56 shrink-0 h-full bg-sidebar text-sidebar-foreground border-r flex flex-col select-none">
      <div className="flex flex-row gap-2 p-2 pl-6 pr-4 pt-6 font-bold">
        <div className="flex grow items-end gap-4 w-full">
          <img src={logo} alt="Plasma" className="h-9" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-2 pb-6 overflow-hidden">
        {NAV.map((sec) => (
          <div key={sec.group} className="relative flex w-full min-w-0 flex-col p-2">
            {sec.sep && (
              <div className="px-2">
                <Separator className="mb-3" />
              </div>
            )}
            <div className="flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70">{sec.group}</div>
            <ul className="flex w-full min-w-0 flex-col gap-2 text-sm">
              {sec.items.map((it) => {
                // 詳情頁時，側欄的 Data Access 不亮，底下多一個子項目 Detail（與真前端相同）
                const active = s.navActive === it.path && !onDetail
                const Icon = it.icon
                return (
                  <li key={it.path} data-t={`nav-${it.path.slice(1)}`} className="relative">
                    {active && (
                      <span
                        className="absolute -left-4 top-1/2 w-[5px] h-7 bg-sidebar-ring rounded-r-full"
                        style={{ transformOrigin: "left center", animation: "sidebar-indicator-in 180ms cubic-bezier(0.23,1,0.32,1) both" }}
                      />
                    )}
                    <div
                      className={cn(
                        MENU_BTN,
                        "gap-2.5",
                        active && "!bg-sidebar-ring/10 !text-sidebar-ring font-medium"
                      )}
                    >
                      <Icon />
                      <span className="flex flex-col">
                        <span className="text-md">{it.label}</span>
                      </span>
                    </div>
                    {onDetail && it.path === "/database" && (
                      <ul className="mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5 ml-[19px]">
                        <li className="ml-1.5 mt-1">
                          <div className="flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sm !bg-sidebar-ring/10 !text-sidebar-ring">
                            Detail
                          </div>
                        </li>
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  )
}

/* 頁首：側欄開關、麵包屑、Workspace 選單、深色模式、使用者（header-toolbar.tsx） */
export function TopBar({ crumbs, ws = "Default Workspace" }: { crumbs: string[]; ws?: string }) {
  return (
    <header className="flex shrink-0 gap-2 border-b h-14">
      <div className="flex items-center gap-2 flex-1 pr-4 pl-3">
        <Button variant="ghost" size="headerToolBarIcon">
          <PanelLeft />
        </Button>
        <Separator vertical className="data-[orientation=vertical]:h-5 mr-1 !h-5" />
        <nav>
          <ol className="flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5">
            {crumbs.map((c, i) => (
              <li key={c} className="inline-flex items-center gap-1.5 sm:gap-2.5">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
                <span className={i === crumbs.length - 1 ? "font-normal text-foreground" : "transition-colors hover:text-foreground"}>{c}</span>
              </li>
            ))}
          </ol>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="border rounded-md pl-2 pr-1 mr-1 shadow-sm">
            <div className="flex h-9 items-center justify-between whitespace-nowrap px-1 py-2 text-sm gap-1">
              <span data-t="ws-switch" key={ws} className="fadeup on">{ws}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </div>
          <Button variant="ghost" size="headerToolBarIcon">
            <Moon />
          </Button>
          <Button variant="ghost" size="headerToolBarIcon">
            <User />
          </Button>
        </div>
      </div>
    </header>
  )
}

/* 列表頁共用版型（page-table-layout.tsx）：白底標題列 + 灰底內容區 */
function UpdatedAt({ time = "12:00:00" }: { time?: string }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground leading-none whitespace-nowrap">Updated {time}</span>
    </div>
  )
}

export function ListPage({ title, updated = true, action, filter = true, children, footer }: {
  title: string; updated?: boolean; action?: React.ReactNode; filter?: boolean; children: React.ReactNode; footer?: React.ReactNode
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col border-b pl-8 pr-6 pt-6 pb-4 bg-background">
        <div className="flex items-center">
          <div className="font-medium text-2xl">{title}</div>
          {updated && (
            <div className="pt-1">
              <div className="ml-3"><UpdatedAt /></div>
            </div>
          )}
          <div className="ml-auto">{action}</div>
        </div>
      </div>
      <div className="py-6 px-6 flex-1 min-h-0 overflow-y-auto bg-sidebar">
        <div className="rounded-lg overflow-hidden flex flex-col relative border">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-background">
            <SearchBox className="w-[200px]" />
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="iconText" className="pr-2 pl-3 gap-1 font-normal">
                10 rows <ChevronDown className="opacity-50" />
              </Button>
              {filter && (
                <Button variant="outline" size="iconText">
                  <Filter /> Filter
                </Button>
              )}
              <Button variant="outline" size="iconText">
                <RefreshCcw /> Refresh
              </Button>
            </div>
          </div>
          {children}
          {footer}
        </div>
      </div>
    </div>
  )
}

export function SortIcon({ asc }: { asc?: boolean }) {
  return <span className="ml-1">{asc ? <ArrowUp className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4" />}</span>
}

export function Pagination({ total }: { total: number }) {
  return (
    <div className="py-4 px-6 border-t bg-background">
      <div className="flex flex-row items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          Showing <span className="text-foreground font-medium">1–{total}</span> of <span className="text-foreground font-medium">{total}</span> records
        </span>
        <ul className="flex flex-row items-center gap-1">
          <li><Button variant="ghost" className="h-9 py-2 gap-1 px-2.5 opacity-50"><ChevronLeft /></Button></li>
          <li><Button variant="outline" className="h-9 px-3 py-2">1</Button></li>
          <li><Button variant="ghost" className="h-9 py-2 gap-1 px-2.5 opacity-50"><ChevronRight /></Button></li>
        </ul>
      </div>
    </div>
  )
}

/* ---------- Data Access 列表頁 ---------- */
const DA_ROWS: Record<string, { desc: string; host: string; port: string }> = Object.fromEntries(
  [...BRANCHES, ...A_DBS].map((b) => [b.conn, { desc: b.desc, host: b.host, port: b.port }]),
)

export function DatabaseListPage({ s }: { s: DemoState }) {
  return (
    <ListPage
      title="Data Access"
      action={
        <Button data-t="btn-add-db" variant="brand" size="iconText">
          <Plus /> Add Data Access
        </Button>
      }
      footer={s.connections.length > 0 ? <Pagination total={s.connections.length} /> : null}
    >
      <DataTable className="rounded-none border-0">
        <DTHeadRow>
          <DTHead><div className="flex items-center gap-1">Name <SortIcon asc /></div></DTHead>
          <DTHead>Description</DTHead>
          <DTHead>Status</DTHead>
          <DTHead><div className="flex items-center gap-1">Type <SortIcon /></div></DTHead>
          <DTHead>Host</DTHead>
          <DTHead>Port</DTHead>
          <DTHead><div className="flex items-center gap-1">Update Time <SortIcon /></div></DTHead>
          <DTHead>Actions</DTHead>
        </DTHeadRow>
        {s.connections.length === 0 ? (
          <DTEmpty cols={8} />
        ) : (
          <tbody className="[&_tr:last-child]:border-0">
            {s.connections.map((c) => {
              const r = DA_ROWS[c.name] ?? { desc: "Export target: clean database", host: "pg-sink.starbridge-sink.svc.cluster.local", port: "5432" }
              const main = true
              return (
                <DTRow key={c.name} data-t={`row-${c.name}`} className={main ? "fadeup on" : ""}>
                  <DTCell>{c.name}</DTCell>
                  <DTCell><span className="text-muted-foreground">{r.desc}</span></DTCell>
                  <DTCell><StatusBadge status={c.status} /></DTCell>
                  <DTCell>{c.type}</DTCell>
                  <DTCell className="max-w-[180px] break-words">{r.host}</DTCell>
                  <DTCell>{r.port}</DTCell>
                  <DTCell className="whitespace-nowrap">2026/09/01 12:00:00</DTCell>
                  <DTCell>
                    <div className="flex gap-2">
                      <IconButton data-t={main ? "row-detail" : undefined} variant="ghostBrand"><Info /></IconButton>
                      <IconButton data-t={main ? "row-tables" : undefined}><Table2 /></IconButton>
                      <IconButton><Pencil /></IconButton>
                      <IconButton><RefreshCcw /></IconButton>
                      <IconButton variant="ghostDestructive"><Trash2 /></IconButton>
                    </div>
                  </DTCell>
                </DTRow>
              )
            })}
          </tbody>
        )}
      </DataTable>
    </ListPage>
  )
}

/* ---------- Data Access 詳情頁（DataAccessDetailPage + General / Tables 分頁） ---------- */
export function DatabaseDetailPage({ s }: { s: DemoState }) {
  return (
    <div className="flex flex-col h-full mx-8 py-4">
      <div className="flex flex-col gap-1 shrink-0">
        <Button variant="ghost" size="iconText" className="h-9 w-fit -ml-2 text-muted-foreground gap-2 hover:bg-accent">
          <ArrowLeft /> Back
        </Button>
        <div className="flex items-center justify-between pr-2">
          <div className="flex items-center gap-4">
            <span className="font-medium text-2xl">oracle_erp</span>
            <StatusBadge status="ready" />
          </div>
        </div>
      </div>
      <div className="flex flex-col flex-1 min-h-0 mt-2">
        <div className="flex items-end border-b border-border gap-8 shrink-0">
          {(["general", "tables", "mcp"] as const).map((tab) => (
            <div
              key={tab}
              data-t={`tab-${tab}`}
              className={cn(
                "px-0 py-2 text-sm font-medium tracking-wider border-b-2 -mb-px transition-colors cursor-default",
                s.detailTab === tab ? "text-sidebar-ring border-sidebar-ring" : "text-muted-foreground border-transparent"
              )}
            >
              {tab === "general" ? "General" : tab === "tables" ? "Tables" : "MCP"}
            </div>
          ))}
        </div>

        <div className="mt-2 flex-1 min-h-0">
          {s.detailTab === "general" ? (
            <div className="flex flex-col gap-2 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold">Information</h2>
                </div>
                <div className="flex gap-2">
                  <Button data-t="btn-upload-doc" size="iconText" variant="brand"><FileUp /> Upload</Button>
                  <Button size="iconText" variant="brand"><Pencil /> Edit</Button>
                  <Button size="iconText" variant="brand"><RefreshCcw /> Sync</Button>
                  <Button size="iconText" variant="destructive"><Trash2 /> Delete</Button>
                </div>
              </div>
              <div className="relative px-0">
                <div className="absolute top-[10px] right-0"><UpdatedAt /></div>
                <div className="space-y-0.5">
                  <DetailRow label="Type" value="Oracle" />
                  <DetailRow label="Description" value="ERP order system database" />
                  <DetailRow label="Host" value="oracle-erp.starbridge-erp.svc.cluster.local" />
                  <DetailRow label="Port" value="1521" />
                  <DetailRow label="Data Name" value="FREEPDB1" />
                  <DetailRow label="Create Time" value="2026/09/01 12:00:00" />
                  <DetailRow label="Updated At" value="2026/09/01 12:00:00" />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative flex flex-col">
              <div className="flex items-center justify-between pt-4 pb-1">
                <h2 className="text-base font-semibold">Tables</h2>
                <div className="flex gap-2 items-center">
                  <SearchBox className="w-[200px]" />
                  <Button variant="outline" size="iconText"><RefreshCcw /> Refresh</Button>
                </div>
              </div>
              <div className="my-4">
                <DataTable>
                  <DTHeadRow>
                    <DTHead>Table Name</DTHead>
                    <DTHead>Columns</DTHead>
                    <DTHead>Last Synced Time</DTHead>
                    <DTHead>Actions</DTHead>
                  </DTHeadRow>
                  <tbody className="[&_tr:last-child]:border-0">
                    <DTRow data-t="row-tord">
                      <DTCell>{TABLE_NAME}</DTCell>
                      <DTCell>8</DTCell>
                      <DTCell>2026/09/01 12:00:00</DTCell>
                      <DTCell>
                        <div className="flex gap-2">
                          <IconButton data-t="btn-view-data"><Server /></IconButton>
                          <IconButton data-t="btn-view-schema"><FileText /></IconButton>
                          <IconButton><MoreHorizontal /></IconButton>
                          <IconButton data-t="btn-edit-desc"><Pencil /></IconButton>
                        </div>
                      </DTCell>
                    </DTRow>
                    <DTRow>
                      <DTCell>T_PRD_M</DTCell>
                      <DTCell>4</DTCell>
                      <DTCell>2026/09/01 12:00:00</DTCell>
                      <DTCell>
                        <div className="flex gap-2">
                          <IconButton><Server /></IconButton>
                          <IconButton><FileText /></IconButton>
                          <IconButton><MoreHorizontal /></IconButton>
                          <IconButton><Pencil /></IconButton>
                        </div>
                      </DTCell>
                    </DTRow>
                  </tbody>
                </DataTable>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground shrink-0 pt-0.5 text-sm w-60">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  )
}

/* ---------- Materialized View 列表頁（Agent 建好的 bi_dashboard 出現在這裡） ---------- */
export function MaterializedViewPage({ s }: { s: DemoState }) {
  return (
    <ListPage
      title="Materialized View"
      action={
        <Button variant="brand" size="iconText">
          <Plus /> Add View
        </Button>
      }
      footer={
        s.mviewCreated ? (
          <>
            <Pagination total={1} />
            {/* Data API：在這裡直接複製對外網址給 BI 用 */}
            <div className="px-6 py-4 border-t bg-background flex flex-col gap-3 fadeup on">
              <div className="flex items-center gap-3">
                <div className="bg-sidebar-ring/10 p-2.5 rounded-lg">
                  <Link2 className="h-[18px] w-[18px] text-sidebar-ring" />
                </div>
                <div>
                  <div className="text-base font-semibold">Data API</div>
                  <div className="text-sm text-muted-foreground">Backed by {MVIEW_NAME} (Oracle ERP × MySQL CRM)</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md border bg-sidebar px-3 py-2">
                <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-[#eaeefc] text-[rgb(37,78,210)]">GET</span>
                <span className="font-mono text-[13px] truncate flex-1">{API_URL}</span>
                <Button data-t="btn-copy-api" variant={s.apiCopied ? "outline" : "brand"} size="iconText" className="shrink-0">
                  {s.apiCopied ? <><Check /> Copied</> : <><Copy /> Copy</>}
                </Button>
              </div>
            </div>
          </>
        ) : null
      }
    >
      <DataTable className="rounded-none border-0">
        <DTHeadRow>
          <DTHead><div className="flex items-center gap-1">Name <SortIcon /></div></DTHead>
          <DTHead>Description</DTHead>
          <DTHead>Status</DTHead>
          <DTHead>Sync Status</DTHead>
          <DTHead><div className="flex items-center gap-1">Last Successful Sync <SortIcon /></div></DTHead>
          <DTHead><div className="flex items-center gap-1">Last Modified <SortIcon /></div></DTHead>
          <DTHead>Actions</DTHead>
        </DTHeadRow>
        {!s.mviewCreated ? (
          <DTEmpty cols={7} />
        ) : (
          <tbody className="[&_tr:last-child]:border-0">
            <DTRow data-t="row-mview" className="fadeup on">
              <DTCell>{MVIEW_NAME}</DTCell>
              <DTCell><span className="text-muted-foreground">Auto-created from BI dashboard metrics</span></DTCell>
              <DTCell><StatusBadge status="active" /></DTCell>
              <DTCell><StatusBadge status="ready" /></DTCell>
              <DTCell className="whitespace-nowrap">2026/09/01 12:00:00</DTCell>
              <DTCell className="whitespace-nowrap">2026/09/01 12:00:00</DTCell>
              <DTCell>
                <div className="flex gap-2">
                  <IconButton variant="ghostBrand"><Info /></IconButton>
                  <IconButton><Pencil /></IconButton>
                  <IconButton><RefreshCcw /></IconButton>
                  <IconButton><Grid2X2 /></IconButton>
                  <IconButton variant="ghostDestructive"><Trash2 /></IconButton>
                </div>
              </DTCell>
            </DTRow>
          </tbody>
        )}
      </DataTable>
    </ListPage>
  )
}

/* ---------- MCP 頁（MCPPage：Group 列表） ---------- */
export function MCPPage({ s }: { s: DemoState }) {
  return (
    <ListPage
      title="MCP"
      updated={false}
      filter={false}
      action={
        <Button data-t="btn-add-mcp" variant="brand" size="iconText">
          <Plus /> Add Group
        </Button>
      }
    >
      <DataTable className="rounded-none border-0">
        <DTHeadRow>
          <DTHead><div className="flex items-center gap-1">Name <SortIcon asc /></div></DTHead>
          <DTHead>Description</DTHead>
          <DTHead><div className="flex items-center gap-1">Last Modified <SortIcon /></div></DTHead>
          <DTHead>Actions</DTHead>
        </DTHeadRow>
        {s.mcpServers.length === 0 ? (
          <DTEmpty cols={4} />
        ) : (
          <tbody className="[&_tr:last-child]:border-0">
            {s.mcpServers.map((m) => (
              <DTRow key={m.name} data-t={`row-mcp-${m.name}`} className="fadeup on">
                <DTCell>{m.name}</DTCell>
                <DTCell><span className="text-muted-foreground">{m.endpoint}</span></DTCell>
                <DTCell>2026/09/01 12:00:00</DTCell>
                <DTCell>
                  <div className="flex gap-2">
                    <IconButton variant="ghostBrand"><Info /></IconButton>
                    <IconButton><Pencil /></IconButton>
                    <IconButton variant="ghostDestructive"><Trash2 /></IconButton>
                  </div>
                </DTCell>
              </DTRow>
            ))}
          </tbody>
        )}
      </DataTable>
    </ListPage>
  )
}

/* ---------- Data Product 頁 ---------- */
export function DataApiPage(_: { s: DemoState }) {
  return (
    <div className="flex flex-col mx-8 py-6 gap-4 flex-1 min-h-0">
      <div className="flex items-center justify-between max-w-3xl">
        <h1 className="font-medium text-2xl">Data Product</h1>
        <Button data-t="btn-export-api" variant="brand" size="iconText"><Link2 /> Export API</Button>
      </div>
      <Card className="p-6 flex flex-col gap-4 max-w-3xl">
        <div>
          <div className="text-base font-semibold mb-1">{MVIEW_NAME}</div>
          <div className="text-sm text-muted-foreground">Backed by Materialized View {MVIEW_NAME} (Oracle ERP × MySQL CRM)</div>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-sidebar px-3 py-2.5">
          <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-[#eaeefc] text-[rgb(37,78,210)]">GET</span>
          <span className="font-mono text-[13px] truncate">{API_URL}</span>
        </div>
      </Card>
    </div>
  )
}
