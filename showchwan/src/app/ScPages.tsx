// 秀傳 demo 用到、原本操作 demo 沒有的 Plasma 畫面:工作區、知識庫、AI Agent、資料產品、SQL Playground。
// 版型沿用 Shell.tsx 的 ListPage(與真正 Plasma 前端相同)
import { Plus, Users, BookOpenText, Upload, Package, Bot, User, Wrench, CheckCircle2, Play, FileText, Loader2 } from "lucide-react"
import {
  Button, Input, Textarea, Label, StatusBadge, Card,
  DataTable, DTHeadRow, DTHead, DTRow, DTCell, DTEmpty,
  DialogShell, DialogHeaderRow, DialogFooter,
} from "@/components/ui"
import { ListPage, Pagination, SortIcon } from "@/app/Shell"
import type { DemoState } from "@/demo/store"
import { HQ_SQL, PRODUCT_KEY, ROSTER_COUNTS, ROSTER_SAMPLE, ROSTER_VIEW } from "@/demo/data"

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="space-y-1"><Label required={required}>{label}</Label>{children}</div>
}

/* ---------- Workspace ---------- */
export function WorkspacePage({ s }: { s: DemoState }) {
  return (
    <ListPage title="Workspace" action={<Button data-t="btn-add-ws" variant="brand" size="iconText"><Plus /> New Workspace</Button>}
      footer={s.workspaces.length > 0 ? <Pagination total={s.workspaces.length} /> : null}>
      <DataTable className="rounded-none border-0">
        <DTHeadRow>
          <DTHead><div className="flex items-center gap-1">Name <SortIcon asc /></div></DTHead>
          <DTHead>Description</DTHead><DTHead>Members</DTHead><DTHead>Created</DTHead>
        </DTHeadRow>
        {s.workspaces.length === 0 ? <DTEmpty cols={4} /> : (
          <tbody className="[&_tr:last-child]:border-0">
            {s.workspaces.map((w) => (
              <DTRow key={w} className="fadeup on">
                <DTCell><span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />{w}</span></DTCell>
                <DTCell><span className="text-muted-foreground">{w === "總院" ? "跨院彙整" : `${w}自己的連線、知識與資料產品`}</span></DTCell>
                <DTCell>3</DTCell>
                <DTCell className="whitespace-nowrap">2026/11/13 09:00:00</DTCell>
              </DTRow>
            ))}
          </tbody>
        )}
      </DataTable>
    </ListPage>
  )
}

export function NewWorkspaceDialog({ s }: { s: DemoState }) {
  return (
    <DialogShell open={s.wsOpen} className="sm:max-w-[480px] px-6 pb-6 pt-4">
      <DialogHeaderRow title="New Workspace" icon={Users} />
      <Field label="Name" required><Input data-t="f-ws-name" value={s.wsName} readOnly /></Field>
      <Field label="Description"><Textarea className="resize-none" value={s.wsName ? `${s.wsName}自己的連線、知識與資料產品` : ""} readOnly /></Field>
      <DialogFooter><Button variant="outline">Cancel</Button><Button data-t="btn-ws-save" variant="brand" disabled={!s.wsName}>Create</Button></DialogFooter>
    </DialogShell>
  )
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
    </ListPage>
  )
}

/* ---------- AI Agent(透過 Plasma MCP 問答整理資料) ---------- */
export function AgentScreen({ s }: { s: DemoState }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background">
      <div className="h-14 shrink-0 flex items-center gap-3 border-b px-6">
        <span className="h-8 w-8 rounded-md bg-foreground text-background grid place-items-center"><Bot className="h-4 w-4" /></span>
        <span className="font-medium">AI Agent</span>
        <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-ring))]" />已透過 Plasma MCP 連線 · {s.ws}
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
              <div className="flex-1 rounded-lg border bg-background px-4 py-3 text-sm leading-relaxed">
                <p>{m.text}</p>
                {m.table && (
                  <div className="mt-3 overflow-hidden rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="bg-sidebar text-muted-foreground"><tr>{["員工編號", "姓名", "職稱", "單位", "分院"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
                      <tbody>{ROSTER_SAMPLE.map((r) => <tr key={r[0]} className="border-t">{r.map((c, j) => <td key={j} className="px-3 py-1.5">{c}</td>)}</tr>)}</tbody>
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
        <DTHeadRow><DTHead>Name</DTHead><DTHead>Key</DTHead><DTHead>Source</DTHead><DTHead>Status</DTHead></DTHeadRow>
        {s.products.length === 0 ? <DTEmpty cols={4} /> : (
          <tbody className="[&_tr:last-child]:border-0">
            {s.products.map((p) => (
              <DTRow key={p} className="fadeup on">
                <DTCell><span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />{p}</span></DTCell>
                <DTCell><span className="font-mono text-[13px]">{PRODUCT_KEY}</span></DTCell>
                <DTCell>View · {ROSTER_VIEW}</DTCell>
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
      <Field label="Key" required><Input value={s.form.display_name ? "nurse_roster" : ""} readOnly className="font-mono" /></Field>
      <Field label="Source"><Input value={s.form.display_name ? `View · ${ROSTER_VIEW}` : ""} readOnly /></Field>
      <DialogFooter><Button variant="outline">Cancel</Button><Button data-t="btn-product-save" variant="brand" disabled={!s.form.display_name}>Publish</Button></DialogFooter>
    </DialogShell>
  )
}

/* ---------- SQL Playground(總院查詢資料產品) ---------- */
export function SqlPage({ s }: { s: DemoState }) {
  const total = ROSTER_COUNTS.reduce((a, [, n]) => a + n, 0)
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b pl-8 pr-6 pt-6 pb-4 bg-background">
        <div className="font-medium text-2xl">SQL Playground</div>
        <div className="ml-auto"><Button data-t="btn-run-sql" variant="brand" size="iconText"><Play /> Run</Button></div>
      </div>
      <div className="flex-1 min-h-0 bg-sidebar p-6 flex flex-col gap-4">
        <Card className="p-0 overflow-hidden">
          <pre data-t="sql-editor" className="min-h-[120px] p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">{s.sqlText}<span className="inline-block w-[7px] h-4 align-middle bg-foreground/60 animate-pulse" /></pre>
        </Card>
        {s.sqlRan && (
          <Card className="p-0 overflow-hidden fadeup on">
            <div className="px-4 py-2.5 border-b text-xs text-muted-foreground">4 rows · 來源 {PRODUCT_KEY}（示意數字）</div>
            <table className="w-full text-sm">
              <thead className="bg-sidebar text-muted-foreground"><tr><th className="px-4 py-2 text-left font-medium">branch</th><th className="px-4 py-2 text-left font-medium">nurses</th></tr></thead>
              <tbody>
                {ROSTER_COUNTS.map(([b, n]) => <tr key={b} className="border-t"><td className="px-4 py-2">{b}</td><td className="px-4 py-2 tabular-nums">{n}</td></tr>)}
                <tr className="border-t bg-sidebar font-medium"><td className="px-4 py-2">合計</td><td className="px-4 py-2 tabular-nums">{total}</td></tr>
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  )
}

export const KB_ICON = BookOpenText
export { HQ_SQL }
