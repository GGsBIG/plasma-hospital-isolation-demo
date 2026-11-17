// 秀傳 demo 用到、原本操作 demo 沒有的 Plasma 畫面:工作區、知識庫、AI Agent、資料產品、SQL Playground。
// 版型沿用 Shell.tsx 的 ListPage(與真正 Plasma 前端相同)
import { Plus, BookOpenText, ArrowLeft, Upload, Package, Bot, User, Wrench, CheckCircle2, Play, FileText, Loader2, Database, Search, Save, EllipsisVertical, Grid2X2, X, Radio, RotateCw, RotateCcw, Info, Pencil, ArrowDownToLine } from "lucide-react"
import {
  Button, IconButton, Input, Textarea, Label, StatusBadge, Card,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  DataTable, DTHeadRow, DTHead, DTRow, DTCell, DTEmpty,
  DialogShell, DialogHeaderRow, DialogFooter, FakeSelect, SearchBox,
} from "@/components/ui"
import { ListPage, Pagination, SortIcon } from "@/app/Shell"
import type { DemoState } from "@/demo/store"
import { HQ_SQL, ROSTER_SAMPLE, A_DBS, CROSS_ROWS, UNIT_COUNTS } from "@/demo/data"

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="space-y-1"><Label required={required}>{label}</Label>{children}</div>
}

/* ---------- Knowledge(AI 知識庫) ---------- */
export function KnowledgePage({ s }: { s: DemoState }) {
  return (
    <ListPage title="Knowledge" action={<Button data-t="btn-kb-upload" variant="brand" size="iconText"><Upload /> Upload</Button>}
      footer={s.kbDocs.length > 0 ? <Pagination total={s.kbDocs.length} /> : null}>
      <DataTable className="rounded-none border-0">
        <DTHeadRow><DTHead>Document</DTHead><DTHead>Kind</DTHead><DTHead>Status</DTHead><DTHead>Uploaded</DTHead></DTHeadRow>
        {s.kbDocs.length === 0 ? <DTEmpty cols={4} /> : (
          <tbody className="[&_tr:last-child]:border-0">
            {s.kbDocs.map((d) => (
              <DTRow key={d.name} className="fadeup on">
                <DTCell><span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{d.name}</span></DTCell>
                <DTCell><span className="text-muted-foreground">System document</span></DTCell>
                <DTCell>{d.status === "processing"
                  ? <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Processing</span>
                  : <StatusBadge status="ready" />}</DTCell>
                <DTCell className="whitespace-nowrap">2026/11/13 09:20:00</DTCell>
              </DTRow>
            ))}
          </tbody>
        )}
      </DataTable>
      {false && s.columns.length > 0 && (
        <div data-t="col-panel" className="border-t bg-background px-4 py-4 fadeup on">
          <div className="text-sm font-medium mb-2">{s.kbDone ? "AI 看懂的欄位" : "A 分院的 Schema（還看不懂）"}</div>
          <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-1.5 text-sm">
            {s.columns.map((c) => (
              <div key={c.name} className="contents">
                <span className="font-mono text-[13px] text-muted-foreground">{c.name}</span>
                <span className={c.desc && c.desc !== "？" ? "text-foreground" : "text-[#b42622] font-medium"}>{c.desc || "…"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ListPage>
  )
}

/* ---------- Data Access 詳情:A 分院 HIS 門診的資料表與欄位 ---------- */
const A_TABLES: [string, number][] = [["NURSE_MST", 5], ["DEPT_M", 6], ["OPD_REG", 12]]
export function DbDetailPage({ s }: { s: DemoState }) {
  return (
    <div className="flex flex-col h-full mx-8 py-4">
      <Button variant="ghost" size="iconText" className="h-9 w-fit -ml-2 text-muted-foreground gap-2"><ArrowLeft /> Back</Button>
      <div className="flex items-center gap-4"><span className="font-medium text-2xl">a_his</span><StatusBadge status="ready" /><span className="text-sm text-muted-foreground">Oracle · HIS 門診</span></div>
      <div className="flex items-end border-b gap-8 mt-3">
        {["General", "Tables"].map((t) => (
          <div key={t} data-t={`tab-${t.toLowerCase()}`} className={`py-2 text-sm font-medium border-b-2 -mb-px ${t === "Tables" ? "text-sidebar-ring border-sidebar-ring" : "text-muted-foreground border-transparent"}`}>{t}</div>
        ))}
      </div>
      <div className="my-4">
        <DataTable>
          <DTHeadRow><DTHead>Table Name</DTHead><DTHead>Columns</DTHead><DTHead>Last Synced Time</DTHead><DTHead>Actions</DTHead></DTHeadRow>
          <tbody className="[&_tr:last-child]:border-0">
            {A_TABLES.map(([t, n], i) => (
              <DTRow key={t}>
                <DTCell className="font-mono text-[13px]">{t}</DTCell><DTCell>{n}</DTCell><DTCell>2026/11/13 09:10:00</DTCell>
                <DTCell><IconButton data-t={i === 0 ? "btn-view-schema" : undefined}><FileText /></IconButton></DTCell>
              </DTRow>
            ))}
          </tbody>
        </DataTable>
      </div>
    </div>
  )
}

export function ColumnsDialog({ s }: { s: DemoState }) {
  return (
    <DialogShell open={s.schemaOpen} className="max-w-[640px] px-6 pb-6 pt-4">
      <DialogHeaderRow title="Table Schema - NURSE_MST" icon={FileText} />
      <div data-t="schema-table" className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sidebar text-muted-foreground"><tr><th className="px-3 py-2 text-left font-medium">Column Name</th><th className="px-3 py-2 text-left font-medium">Data Type</th><th className="px-3 py-2 text-left font-medium">Description</th></tr></thead>
          <tbody>
            {s.columns.map((c) => (
              <tr key={c.name} className="border-t">
                <td className="px-3 py-2 font-mono text-[13px]">{c.name}</td>
                <td className="px-3 py-2 text-muted-foreground font-mono text-[12px]">{c.type}</td>
                <td className={`px-3 py-2 ${c.desc ? "text-foreground" : "text-[#b42622] font-medium"}`}>{c.desc || "？"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DialogShell>
  )
}

/* ---------- AI Agent(透過 Plasma MCP 問答整理資料) ---------- */
export function AgentScreen({ s }: { s: DemoState }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background">
      <div className="h-14 shrink-0 flex items-center gap-3 border-b px-6">
        <span className="h-8 w-8 rounded-md bg-foreground text-background grid place-items-center"><Bot className="h-4 w-4" /></span>
        <span className="font-medium">AI Agent</span>
        <span data-t="agent-mcp" className="ml-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-ring))]" />Plasma MCP
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden bg-sidebar">
        <div className="ml-[10%] mr-auto max-w-2xl h-full flex flex-col justify-end gap-3 px-6 py-6">
          {s.agentMsgs.map((m, i) => m.role === "user" ? (
            <div key={i} className="flex justify-end gap-2 fadeup on">
              <div className="max-w-[80%] rounded-lg bg-foreground text-background px-4 py-2.5 text-sm leading-relaxed">{m.text}</div>
              <span className="h-7 w-7 rounded-md border bg-background grid place-items-center"><User className="h-4 w-4" /></span>
            </div>
          ) : m.role === "tool" ? (
            <div key={i} className="flex gap-2 fadeup on">
              <span className="h-7 w-7 rounded-md border bg-background grid place-items-center"><Wrench className="h-3.5 w-3.5" /></span>
              <div className="rounded-lg border bg-background px-3 py-2 text-xs font-mono text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--sidebar-ring))]" />{m.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-2 fadeup on">
              <span className="h-7 w-7 rounded-md bg-foreground text-background grid place-items-center"><Bot className="h-4 w-4" /></span>
              <div data-t={m.table ? "agent-answer" : undefined} className="flex-1 rounded-lg border bg-background px-4 py-3 text-sm leading-relaxed">
                <p>{m.text}</p>
                {m.table && (
                  <div className="mt-3 overflow-hidden rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="bg-sidebar text-muted-foreground"><tr>{["員工編號", "姓名", "職稱", "單位"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
                      <tbody>{ROSTER_SAMPLE.map((r, i) => <tr key={r[0]} className="border-t">{["A0" + (123 + i * 111), r[1], r[2], r[3]].map((c, j) => <td key={j} className="px-3 py-1.5">{c}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div className="mt-2 flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
            <input data-t="agent-input" readOnly value={s.agentInput} placeholder="問 AI Agent…" className="flex-1 bg-transparent text-sm outline-none" />
            <Button data-t="agent-send" variant="brand" size="iconText">送出</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Data Product ---------- */
export function ProductPage({ s }: { s: DemoState }) {
  return (
    <ListPage title="Data Product" action={<Button data-t="btn-add-product" variant="brand" size="iconText"><Plus /> New Data Product</Button>}
      footer={s.products.length > 0 ? <Pagination total={s.products.length} /> : null}>
      <DataTable className="rounded-none border-0">
        <DTHeadRow><DTHead>Name</DTHead><DTHead>Key</DTHead><DTHead>Branch</DTHead><DTHead>Status</DTHead></DTHeadRow>
        {s.products.length === 0 ? <DTEmpty cols={4} /> : (
          <tbody data-t="product-table" className="[&_tr:last-child]:border-0">
            {s.products.map((p) => (
              <DTRow key={p} className="fadeup on">
                <DTCell><span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />{p}</span></DTCell>
                <DTCell><span className="font-mono text-[13px]">data_product.{p[0].toLowerCase()}.nurse_roster</span></DTCell>
                <DTCell>{p[0]} 分院</DTCell>
                <DTCell><StatusBadge status="active" /></DTCell>
              </DTRow>
            ))}
          </tbody>
        )}
      </DataTable>
    </ListPage>
  )
}

export function NewProductDialog({ s }: { s: DemoState }) {
  return (
    <DialogShell open={s.productOpen} className="sm:max-w-[520px] px-6 pb-6 pt-4">
      <DialogHeaderRow title="New Data Product" icon={Package} />
      <Field label="Name" required><Input data-t="f-product-name" value={s.form.display_name} readOnly /></Field>
      <Field label="Key" required><Input value={s.form.display_name ? "data_product.a.nurse_roster" : ""} readOnly className="font-mono" /></Field>
      <Field label="Source"><Input value={s.form.display_name ? "View · a_nurse_roster" : ""} readOnly /></Field>
      <DialogFooter><Button variant="outline">Cancel</Button><Button data-t="btn-product-save" variant="brand" disabled={!s.form.display_name}>Publish</Button></DialogFooter>
    </DialogShell>
  )
}

/* ---------- SQL Playground(跨資料庫查詢) ---------- */
/* ---------- SQL Playground:照最新 Plasma 前端(SQLPlaygroundContainer + SQLPlaygroundContent)----------
   上方:分頁列 + Monaco 編輯器(淺色模式用 vs-dark);中間:拖拉把手;下方:執行結果。
   紅框與紅色標籤是 demo 的標注,不是 Plasma 介面的一部分 */
const KW = new Set(["SELECT", "FROM", "JOIN", "ON", "LIMIT", "WHERE", "AS", "GROUP", "BY", "ORDER", "COUNT"])
const REFS: Record<string, string> = { a_his: "HIS 門診 · Oracle", a_nursing: "護理系統 · PostgreSQL", a_hr: "人事系統 · MS SQL" }
const REF_ORDER = ["a_his", "a_nursing", "a_hr"]
const RES_COLS: [string, string][] = [["NRS_NAME", "HIS 門診"], ["DEPT_NAME", "人事系統"], ["shift", "護理系統"]]

function SqlTokens({ text }: { text: string }) {
  const parts = text.split(/(\s+|[A-Za-z_]\w*|\d+|[^\s\w])/).filter(Boolean)
  return (
    <>
      {parts.map((t, i) => (
        <span key={i} style={{ color: KW.has(t.toUpperCase()) ? "#569cd6" : /^\d+$/.test(t) ? "#b5cea8" : "#d4d4d4" }}>{t}</span>
      ))}
    </>
  )
}

function SqlLine({ line, marks }: { line: string; marks: number }) {
  const m = line.match(/\b(a_his|a_nursing|a_hr)\.\w+/)
  if (!m || m.index === undefined) return <SqlTokens text={line} />
  const k = REF_ORDER.indexOf(m[1])
  const on = marks > k
  return (
    <>
      <SqlTokens text={line.slice(0, m.index)} />
      <span data-t={`ref-${m[1]}`} className={on ? "sql-mark on" : "sql-mark"}><SqlTokens text={m[0]} /></span>
      <SqlTokens text={line.slice(m.index + m[0].length)} />
      {on && <span className="sql-mark-tag">{REFS[m[1]]}</span>}
    </>
  )
}

export function SqlPage({ s }: { s: DemoState }) {
  const lines = s.sqlText.split("\n")
  return (
    <div className="h-full flex flex-col mx-8 py-6 overflow-hidden">
      <div className="flex items-center">
        <div className="font-medium text-2xl">SQL Playground</div>
        <div className="ml-auto flex gap-2">
          <Button size="iconText" variant="outline"><Database />Explore</Button>
          <Button size="iconText" variant="outline"><Search />Search</Button>
          <Button data-t="btn-run-sql" size="iconText" variant="brand" disabled={!s.sqlText.trim() || s.sqlRunning}><Play />Run</Button>
          <Button size="iconText" variant="brand" disabled={!s.sqlText.trim()}><Save />Save as View</Button>
          <Button size="icon" variant="outline" className="h-9 w-9"><EllipsisVertical /></Button>
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden py-4">
        {/* 分頁列 */}
        <div className="flex h-12 shrink-0 items-center rounded-t-lg bg-[#525252] pr-4 text-neutral-300">
          <div className="sql-tab-active relative flex h-12 items-center text-sm font-medium text-white">
            <div className="ml-2 mr-2 flex h-10 items-center py-2 pl-2 pr-1">
              <Grid2X2 className="mr-2 h-4 w-4" />
              <span className="mr-1">A 分院護理人員</span>
              <span className="rounded-sm p-0.5"><X className="h-4 w-4" /></span>
            </div>
          </div>
          <span className="h-5 w-[2px] bg-neutral-500" />
          <span className="ml-2 grid h-9 w-9 place-items-center text-white"><Plus className="h-4 w-4" /></span>
        </div>
        {/* 編輯器(Monaco vs-dark) */}
        <div data-t="sql-editor" className="h-[34%] shrink-0 overflow-hidden rounded-b-lg bg-[#1e1e1e] py-4 pr-4">
          <div className="font-mono text-[14px] leading-[19px]" style={{ fontFamily: 'Menlo, Monaco, "Courier New", monospace' }}>
            {lines.map((ln, i) => (
              <div key={i} className="relative flex whitespace-pre">
                <span className="w-[52px] shrink-0 pr-[26px] text-right" style={{ color: i === lines.length - 1 ? "#c6c6c6" : "#858585" }}>{i + 1}</span>
                <span className="relative">
                  <SqlLine line={ln} marks={s.marks} />
                  {i === lines.length - 1 && !s.sqlRan && <span className="absolute -right-[2px] top-0 h-[19px] w-[2px] bg-[#aeafad] animate-pulse" />}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* 拖拉把手 */}
        <div className="flex items-center justify-center px-2"><div className="my-4 flex h-1 w-10 items-center justify-center rounded-full bg-border" /></div>
        {/* 執行結果 */}
        <div data-t="sql-result" className="min-h-0 flex-1 overflow-hidden rounded-lg border p-4">
          {s.sqlRunning ? (
            <div className="flex h-full flex-col items-center justify-center gap-8">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <Button variant="outline" size="iconText">Cancel</Button>
            </div>
          ) : s.sqlRan ? (
            // 表格寬度留在右下角情境圖的左邊,三個欄位都看得到
            <Table className="max-w-[600px]">
              <TableHeader>
                <TableRow className="bg-muted">
                  {RES_COLS.map(([c, src], k) => (
                    <TableHead key={c}>
                      <span className={s.marks > 3 + k ? "sql-mark on" : "sql-mark"}>{c}</span>
                      {s.marks > 3 + k && <span className="sql-mark-tag ml-2">{src}</span>}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {CROSS_ROWS.map((r) => <TableRow key={r[0]}>{r.map((c, i) => <TableCell key={i}>{c}</TableCell>)}</TableRow>)}
              </TableBody>
            </Table>
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">No data available</div>
          )}
        </div>
      </div>
    </div>
  )
}

export const KB_ICON = BookOpenText
export { HQ_SQL }

/* ---------- Streaming Pipeline:照最新 Plasma 前端 CDCPage(左邊 Sources 清單、右邊選到的 Source 與它的 Sinks)----------
   HIS 門診(Oracle)開了 CDC Source;新增 Sink 把資料表逐筆同步到 PostgreSQL 副本,查詢、報表、AI 改讀副本 */
export function CdcPage({ s }: { s: DemoState }) {
  const n = s.sinks.length
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center border-b pl-8 pr-6 pt-6 pb-4 bg-background">
        <div className="font-medium text-2xl">Streaming Pipeline</div>
      </div>
      <div className="py-6 px-6 flex-1 min-h-0 bg-sidebar">
        <div className="flex h-full min-h-0 rounded-lg border border-border bg-background overflow-hidden">
          {/* master list */}
          <div className="w-80 shrink-0 border-r border-border flex flex-col min-h-0">
            <div className="py-3 pl-3 pr-2 border-b border-border shrink-0 flex items-center gap-1">
              <SearchBox className="flex-1" />
              <span className="h-8 w-8 grid place-items-center opacity-50"><RotateCw className="h-5 w-5" /></span>
            </div>
            <div className="px-3 pt-2 pb-4 space-y-2">
              <div className="pt-1 text-[10px] px-1 font-semibold tracking-[0.12em] text-muted-foreground/70 uppercase">Sources</div>
              {[["his_opd_cdc", n], ["nis_shift_cdc", 0]].map(([name, c], i) => (
                <Card key={name as string} data-t={i === 0 ? "cdc-source" : undefined}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 shadow-sm ${i === 0 ? "bg-sidebar-ring/10 border-sidebar-ring/25" : "border-border"}`}>
                  <span className="h-2 w-2 rounded-full shrink-0 bg-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <div className={`font-medium text-sm truncate ${i === 0 ? "text-sidebar-ring" : ""}`}>{name}</div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">Upsert · {c} sink</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          {/* detail panel */}
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 py-2">
                  <Radio className="h-6 w-6 text-sidebar-ring" />
                  <h2 className="text-xl font-semibold">his_opd_cdc</h2>
                  <StatusBadge status="active" />
                </div>
                <div className="text-sm text-muted-foreground mt-1.5 font-mono">a_his · Upsert</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="iconText"><Info />Detail</Button>
                <Button variant="outline" size="iconText"><RotateCcw />Reset</Button>
              </div>
            </div>
            <div className="flex items-end justify-between mt-4 mb-3">
              <h3 className="font-semibold">Sinks ({n})</h3>
              <Button data-t="btn-add-sink" variant="brand" size="iconText"><Plus />Add Sink</Button>
            </div>
            {n === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8 border border-dashed border-border rounded-lg">No sinks yet</div>
            ) : (
              <div data-t="sink-list" className="flex flex-col gap-2 max-w-[560px]">
                {s.sinks.map((k) => (
                  <Card key={k.name} className="w-full flex items-center gap-3 rounded-lg border-border px-4 py-3 fadeup on">
                    <div className="bg-muted rounded-lg p-2 shrink-0"><ArrowDownToLine className="h-4 w-4 text-sidebar-ring" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{k.name}</span>
                        {k.status === "loading"
                          ? <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Initial load</span>
                          : <StatusBadge status="active" />}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5 font-mono">{k.table} → {k.target}</div>
                    </div>
                    <div className="flex gap-1 shrink-0 text-muted-foreground">
                      <IconButton><Info /></IconButton><IconButton><Pencil /></IconButton><IconButton><RotateCw /></IconButton>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Create Sink(照前端 AddSinkDialog 的欄位) */
export function AddSinkDialog({ s }: { s: DemoState }) {
  const f = s.sinkForm
  return (
    <DialogShell open={s.sinkOpen} className="sm:max-w-[520px] px-6 pb-6 pt-4">
      <DialogHeaderRow title="Create Sink" icon={ArrowDownToLine} />
      <Field label="Name" required><Input data-t="f-sink-name" value={f.name} readOnly placeholder="Enter sink name" /></Field>
      <Field label="Source Table" required><FakeSelect value={f.table} placeholder="Select a source table" /></Field>
      <div data-t="f-sink-conn"><Field label="Database Connection" required><FakeSelect value={f.conn} placeholder="Select a database connection" /></Field></div>
      <Field label="Target Table Name" required><Input value={f.target} readOnly placeholder="e.g. orders" className="font-mono" /></Field>
      <div className="space-y-2">
        <Label required>Initial Load Mode</Label>
        <div className="flex gap-6 text-sm">
          <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full border border-primary grid place-items-center"><span className="h-2 w-2 rounded-full bg-primary" /></span>Truncate</span>
          <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full border border-primary" />Overwrite</span>
        </div>
      </div>
      <DialogFooter><Button variant="outline">Cancel</Button><Button data-t="btn-sink-create" variant="brand" disabled={!f.target}>Create</Button></DialogFooter>
    </DialogShell>
  )
}
