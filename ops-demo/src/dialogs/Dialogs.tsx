import { useEffect, useRef } from "react"
import { UploadCloud, FileText, X, CheckCircle2, Check, Search } from "lucide-react"
import {
  Button, Input, Textarea, Badge, FakeSelect, StatusDot,
  DialogShell, DialogHeaderRow,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui"
import type { DemoState } from "@/demo/store"
import { T_ORD_M_ROWS, MCP_TOOLS } from "@/demo/data"

/* ---------- 1. Add Database ---------- */
export function AddDatabaseDialog({ s }: { s: DemoState }) {
  const f = s.form
  const statusLabel =
    s.connStatus === "ready" ? "Connected"
    : s.connStatus === "failed" ? "Connection failed"
    : s.connStatus === "preparing" ? "Testing connection…"
    : "Not Connected"
  return (
    <DialogShell open={s.addOpen} className="sm:max-w-[600px]">
      <DialogHeaderRow title="Add Database" />
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name"><Input data-t="f-name" value={f.display_name} readOnly /></Field>
          <Field label="Database Type"><FakeSelect value={f.db_type} placeholder=" " /></Field>
        </div>
        <Field label="Description"><Textarea rows={2} className="resize-none" value={f.description} readOnly /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Host"><Input data-t="f-host" value={f.host} readOnly /></Field>
          <Field label="Port"><Input value={f.port} readOnly /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Database Name"><Input value={f.db_name} readOnly /></Field>
          <div />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Username"><Input value={f.username} readOnly /></Field>
          <Field label="Password"><Input type="password" value={f.password} readOnly /></Field>
        </div>
        <div className="t-label flex items-center gap-2">
          <StatusDot status={s.connStatus} size={6} label={statusLabel} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button data-t="btn-verify" variant="default" className={s.connStatus === "preparing" ? "opacity-80" : ""}>
            Verify Connection
          </Button>
          <Button data-t="btn-save" variant="brand" disabled={s.connStatus !== "ready"}>
            Save
          </Button>
        </div>
      </div>
    </DialogShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="t-label">{label}</label>
      {children}
    </div>
  )
}

/* ---------- 2. Upload Documentation ---------- */
export function UploadDocDialog({ s }: { s: DemoState }) {
  const listRef = useRef<HTMLDivElement>(null)
  // 檔案上傳完，過一秒再捲到底，露出被擋住的檔案
  useEffect(() => {
    if (s.files.length === 0) return
    const t = setTimeout(() => {
      const el = listRef.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    }, 1000)
    return () => clearTimeout(t)
  }, [s.files.length])
  return (
    <DialogShell open={s.uploadOpen} className="sm:max-w-[480px]">
      <DialogHeaderRow title="Upload Documentation" />
      <div
        data-t="dropzone"
        className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink bg-sheet p-8 transition-colors data-[drag=on]:border-red"
      >
        <UploadCloud className="h-10 w-10 text-red" strokeWidth={1.75} />
        <p className="text-sm text-center">
          <span className="font-bold text-red underline decoration-2 underline-offset-4">Click to upload</span> or drag files here
        </p>
        <p className="t-label text-ink-soft">.txt, .md</p>
      </div>
      {s.files.length > 0 && (
        <div ref={listRef} className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
          {s.files.map((name) => (
            <div key={name} className="flex items-center gap-2.5 border border-ink border-l-4 border-l-red px-3 py-2 fadeup on">
              <FileText className="h-4 w-4 shrink-0 text-ink" />
              <span className="text-sm font-medium truncate flex-1">{name}</span>
              <X className="h-4 w-4 shrink-0 text-ink" />
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button data-t="btn-upload" variant="brand" disabled={s.files.length === 0}>Upload</Button>
      </div>
    </DialogShell>
  )
}

/* ---------- 2.5 View Schema（對齊真前端 ViewTableSchemaDialog） ---------- */
export function ViewSchemaDialog({ s }: { s: DemoState }) {
  return (
    <DialogShell open={s.schemaOpen} className="max-w-[520px] h-[80vh] flex flex-col">
      <DialogHeaderRow title={`Table Schema - ${"T_ORD_M"}`} />
      <div className="flex items-center gap-2 h-9 border border-ink px-3 text-sm text-ink-soft">
        <Search className="h-4 w-4" /> Search
      </div>
      <div className="flex-1 overflow-auto border border-ink">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-3">Column Name</TableHead>
              <TableHead>Data Type</TableHead>
              <TableHead className="w-28 text-center">Primary Key</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.columns.map((col) => (
              <TableRow key={col.name}>
                <TableCell className="pl-3 font-mono font-bold">{col.name}</TableCell>
                <TableCell className="text-ink-soft font-mono text-xs">{col.type}</TableCell>
                <TableCell className="text-center">
                  {col.name === "ORD_NO" && <Check className="h-5 w-5 mx-auto text-red" strokeWidth={3} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end">
        <Button data-t="btn-schema-close" variant="outline">Close</Button>
      </div>
    </DialogShell>
  )
}

/* ---------- 2.6 View Data（對齊真前端 ViewDataDialog：SELECT * 結果） ---------- */
export function ViewDataDialog({ s }: { s: DemoState }) {
  const cols = T_ORD_M_ROWS.length ? Object.keys(T_ORD_M_ROWS[0]) : []
  return (
    <DialogShell open={s.viewDataOpen} className="max-w-[90vw] w-[1000px] h-[80vh] flex flex-col">
      <DialogHeaderRow title={"T_ORD_M"} />
      <div className="flex-1 overflow-auto border border-ink">
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map((c) => (
                <TableHead key={c} className="pl-3 whitespace-nowrap">{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {T_ORD_M_ROWS.map((row) => (
              <TableRow key={row.ORD_NO}>
                {cols.map((c) => (
                  <TableCell key={c} className="pl-3 font-mono text-xs whitespace-nowrap">{row[c]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end">
        <Button data-t="btn-viewdata-close" variant="outline">Close</Button>
      </div>
    </DialogShell>
  )
}

/* ---------- 2.7 Add MCP（在 Plasma 註冊對外 MCP，接給 ChatGPT agent） ---------- */
export function AddMcpDialog({ s }: { s: DemoState }) {
  const f = s.mcpForm
  return (
    <DialogShell open={s.mcpAddOpen} className="sm:max-w-[560px]">
      <DialogHeaderRow title="Add MCP" />
      <div className="space-y-4">
        <Field label="Name"><Input data-t="f-mcp-name" value={f.name} readOnly /></Field>
        <Field label="Endpoint"><Input data-t="f-mcp-endpoint" value={f.endpoint} readOnly /></Field>
        <Field label="Target Agent"><FakeSelect value={f.target} placeholder="Select an MCP-capable agent" /></Field>
        <div className="flex flex-col gap-2">
          <span className="t-label">Exposed Tools</span>
          <div className="flex flex-wrap gap-1.5">
            {MCP_TOOLS.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 border border-ink bg-paper px-2 py-1 text-[11px] font-mono text-ink">
                <CheckCircle2 className="h-3 w-3 text-red" /> {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline">Cancel</Button>
          <Button data-t="btn-mcp-create" variant="brand">Create &amp; Connect</Button>
        </div>
      </div>
    </DialogShell>
  )
}

/* ---------- 3. Edit Table Description (Auto-Describe) ---------- */
export function EditTableDescriptionDialog({ s }: { s: DemoState }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const total = s.columns.length
  const filled = s.columns.filter((c) => c.desc).length
  const allFilled = total > 0 && filled === total
  // 全部欄位都填完描述後，才慢慢往下捲，讓觀看者看到每個欄位都有描述
  useEffect(() => {
    if (!allFilled) return
    const el = scrollRef.current
    if (!el) return
    const target = el.scrollHeight - el.clientHeight
    if (target <= 0) return
    const DURATION = 2500 // ms，捲動放慢
    const step = target / (DURATION / 16)
    const id = setInterval(() => {
      if (!scrollRef.current) return clearInterval(id)
      const e = scrollRef.current
      e.scrollTop = Math.min(e.scrollTop + step, target)
      if (e.scrollTop >= target) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [allFilled])
  return (
    <DialogShell open={s.editOpen} className="max-w-[600px]">
      <DialogHeaderRow title={`Edit Table Description - ${"T_ORD_M"}`} />
      <div ref={scrollRef} className="max-h-[64vh] overflow-y-auto flex flex-col gap-4 pr-1">
        <div className="flex flex-col gap-2">
          <span className="t-label">Table Description</span>
          <Textarea rows={2} readOnly value="訂單主檔：記錄每一筆會員訂單的金額、數量、商品與狀態。" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="t-label">Column Descriptions</span>
          <div className="flex flex-col gap-2">
            {s.columns.map((col) => (
              <div key={col.name} className={"flex flex-col gap-1.5 border p-3 transition-colors " + (col.desc ? "border-ink border-l-4 border-l-red" : "border-hair")}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono">{col.name}</span>
                  <Badge variant="secondary" className="font-mono text-xs">{col.type}</Badge>
                  {col.desc && <CheckCircle2 className="h-3.5 w-3.5 text-red ml-auto" />}
                </div>
                <Input className="h-8 text-sm" value={col.desc} readOnly placeholder="(no description yet)" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button data-t="btn-save-desc" variant="brand">Save</Button>
      </div>
    </DialogShell>
  )
}
