import { useEffect, useRef } from "react"
import { UploadCloud, FileText, X, Check, Database, Bot } from "lucide-react"
import {
  Button, Input, Textarea, Badge, FakeSelect, StatusDot, Label, SearchBox,
  DialogShell, DialogHeaderRow, DialogFooter,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  DataTable, DTHeadRow, DTHead, DTRow, DTCell,
} from "@/components/ui"
import type { DemoState } from "@/demo/store"
import { T_ORD_M_ROWS } from "@/demo/data"

/* ---------- 1. Add Data Access（真前端 AddDataAccessDialog + DynamicConnectorForm） ---------- */
export function AddDatabaseDialog({ s }: { s: DemoState }) {
  const f = s.form
  const statusLabel =
    s.connStatus === "ready" ? "Connected"
    : s.connStatus === "failed" ? "Connection failed"
    : s.connStatus === "preparing" ? "Testing connection…"
    : "Not Connected"
  return (
    <DialogShell open={s.addOpen} className="sm:max-w-[600px] max-h-[90%] overflow-auto px-6 pb-6 pt-4">
      <DialogHeaderRow title="Add Data Access" icon={Database} />
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" required><Input data-t="f-name" value={f.display_name} readOnly /></Field>
          <Field label="Data Type" required><FakeSelect value={f.db_type} placeholder=" " /></Field>
        </div>
        <Field label="Description"><Textarea className="resize-none" value={f.description} readOnly /></Field>
        {f.db_type && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Host" required><Input data-t="f-host" value={f.host} readOnly /></Field>
              <Field label="Port" required><Input value={f.port} readOnly /></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Database Name" required><Input value={f.db_name} readOnly /></Field>
              <div />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Username" required><Input value={f.username} readOnly /></Field>
              <Field label="Password" required><Input type="password" value={f.password} readOnly /></Field>
            </div>
          </>
        )}
        <div className="font-light text-xs flex items-center gap-2">
          <StatusDot status={s.connStatus} size={6} label={statusLabel} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button data-t="btn-verify" variant="default" disabled={!f.db_type} className={s.connStatus === "preparing" ? "opacity-80" : ""}>
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label required={required}>{label}</Label>
      {children}
    </div>
  )
}

/* ---------- 2. Upload Documentation（真前端 UploadDocumentationDialog） ---------- */
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
    <DialogShell open={s.uploadOpen} className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto px-6 pb-6 pt-4">
      <DialogHeaderRow title="Upload Documentation" icon={Database} />
      <div
        data-t="dropzone"
        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors border-border data-[drag=on]:border-primary/50 data-[drag=on]:bg-muted/40"
      >
        <UploadCloud className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-center">
          <span className="font-medium text-primary">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-muted-foreground">.txt, .md</p>
      </div>
      {s.files.length > 0 && (
        <div ref={listRef} className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
          {s.files.map((name) => (
            <div key={name} className="flex items-center gap-2.5 rounded-md border px-3 py-2 fadeup on">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm truncate flex-1">{name}</span>
              <X className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline">Cancel</Button>
        <Button data-t="btn-upload" variant="brand" disabled={s.files.length === 0}>Upload</Button>
      </DialogFooter>
    </DialogShell>
  )
}

/* ---------- 2.5 View Schema（真前端 ViewTableSchemaDialog） ---------- */
export function ViewSchemaDialog({ s }: { s: DemoState }) {
  return (
    <DialogShell open={s.schemaOpen} closeT="btn-schema-close" className="max-w-[520px] max-h-[90vh] h-[80vh] flex flex-col px-6 pb-6 pt-4">
      <DialogHeaderRow title={`Table Schema - ${"T_ORD_M"}`} icon={Database} />
      <SearchBox />
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Column Name</TableHead>
              <TableHead>Data Type</TableHead>
              <TableHead className="w-28 text-center">Primary Key</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.columns.map((col) => (
              <TableRow key={col.name}>
                <TableCell>{col.name}</TableCell>
                <TableCell className="text-muted-foreground">{col.type}</TableCell>
                <TableCell className="text-center">
                  {col.name === "ORD_NO" && <Check className="h-4 w-4 mx-auto text-sidebar-ring" />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DialogShell>
  )
}

/* ---------- 2.6 View Data（真前端 ViewDataDialog） ---------- */
export function ViewDataDialog({ s }: { s: DemoState }) {
  const cols = T_ORD_M_ROWS.length ? Object.keys(T_ORD_M_ROWS[0]) : []
  return (
    <DialogShell open={s.viewDataOpen} closeT="btn-viewdata-close" closeTop="top-6" className="max-w-[90vw] max-h-[90vh] w-[1000px] flex flex-col">
      <DialogHeaderRow title={`View Table Data - ${"T_ORD_M"}`} />
      <div className="flex-1 min-h-0 flex flex-col">
        <DataTable className="flex-1 min-h-0">
          <DTHeadRow>
            {cols.map((c) => (
              <DTHead key={c} className="whitespace-nowrap">{c}</DTHead>
            ))}
          </DTHeadRow>
          <tbody className="[&_tr:last-child]:border-0">
            {T_ORD_M_ROWS.map((row) => (
              <DTRow key={row.ORD_NO}>
                {cols.map((c) => (
                  <DTCell key={c} className="whitespace-nowrap">{row[c]}</DTCell>
                ))}
              </DTRow>
            ))}
          </tbody>
        </DataTable>
      </div>
    </DialogShell>
  )
}

/* ---------- 2.7 Add Group（真前端 MCP AddGroupDialog） ---------- */
export function AddMcpDialog({ s }: { s: DemoState }) {
  const f = s.mcpForm
  return (
    <DialogShell open={s.mcpAddOpen} className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto px-6 pb-6 pt-4">
      <DialogHeaderRow title="Add Group" icon={Bot} />
      <div className="space-y-4">
        <Field label="Name" required><Input data-t="f-mcp-name" value={f.name} readOnly /></Field>
        <Field label="Description"><Textarea data-t="f-mcp-endpoint" value={f.endpoint} readOnly /></Field>
        <DialogFooter>
          <Button data-t="btn-mcp-create" className="w-full">Save</Button>
        </DialogFooter>
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
    <DialogShell open={s.editOpen} className="max-w-[600px] max-h-[90vh] h-[80vh] flex flex-col px-6 pb-6 pt-4">
      <DialogHeaderRow title={`Edit Description - ${"T_ORD_M"}`} icon={Database} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Table Description</span>
          <Textarea rows={3} readOnly value="訂單主檔：記錄每一筆會員訂單的金額、數量、商品與狀態。" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Column Descriptions</span>
          <SearchBox />
          <div className="flex flex-col gap-2">
            {s.columns.map((col) => (
              <div key={col.name} className="flex flex-col gap-1.5 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{col.name}</span>
                  <Badge variant="secondary" className="font-mono text-xs">{col.type}</Badge>
                </div>
                <Input className="h-8 text-sm" value={col.desc} readOnly />
              </div>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancel</Button>
        <Button data-t="btn-save-desc">Save</Button>
      </DialogFooter>
    </DialogShell>
  )
}
