import { useEffect, useRef } from "react"
import {
  Plus, Search, MessageSquare, Paperclip, ArrowUp, ImageIcon,
  Loader2, ChevronDown, Wrench, CheckCircle2, Database, Zap, Bot,
} from "lucide-react"
import type { DemoState } from "@/demo/store"
import { DASHBOARD_METRICS, GENERATED_SQL, MVIEW_NAME } from "@/demo/data"
import { DashboardMock } from "@/opencode/DashboardMock"

// 外部 Agent 示範：AI Agent 透過「Plasma MCP」接上 Plasma。任何支援 MCP 的 agent 都能這樣接。
export function ChatGPTAgent({ s }: { s: DemoState }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [s.chat.length, s.aiTyping, s.mcpConnected])

  const empty = s.chat.length === 0

  return (
    <div className="absolute inset-0 z-30 flex bg-paper text-ink border-t-[6px] border-ink">
      {/* 左側細窄側欄（AI Agent 風） */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sheet border-r-2 border-ink">
        <div className="flex items-center gap-2 px-3 h-14 border-b border-hair">
          <div className="h-7 w-7 bg-ink flex items-center justify-center">
            <Bot className="h-4 w-4 text-paper" />
          </div>
          <span className="text-sm font-black">AI Agent</span>
        </div>
        <div className="px-2 pt-2 flex flex-col gap-1">
          <SideItem icon={<Plus className="h-4 w-4" />} label="New chat" />
          <SideItem icon={<Search className="h-4 w-4" />} label="Search chats" />
        </div>
        <div className="px-4 pt-5 pb-1 t-label text-ink-soft">Chats</div>
        <div className="px-2 flex flex-col gap-1">
          <SideItem icon={<MessageSquare className="h-4 w-4" />} label="BI dashboard API" active />
          <SideItem icon={<MessageSquare className="h-4 w-4" />} label="Weekly sales summary" muted />
        </div>
      </aside>

      {/* 主區 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 頂列：model 選擇器 */}
        <div className="h-14 shrink-0 flex items-center px-4 border-b-2 border-ink">
          <button className="flex items-center gap-1 px-2.5 py-1.5 text-[15px] font-black hover:bg-sheet">
            AI Agent <ChevronDown className="h-4 w-4 text-ink" />
          </button>
        </div>

        {/* 對話區 */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-5 pt-5 pb-6 flex flex-col gap-6">
            {/* Plasma MCP connector（接 MCP 的視覺重點） */}
            <McpConnector connected={s.mcpConnected} />

            {empty && s.mcpConnected && (
              <div className="text-center text-ink-soft text-sm py-10">
                已在 Plasma 新增 MCP 並授權 —— AI Agent 現在能存取你在 Plasma 整理好的表、欄位與描述。
              </div>
            )}

            {s.chat.map((m, i) => (
              m.role === "user" ? (
                <div key={i} className="flex flex-col items-end gap-2">
                  {m.block === "screenshot" && (
                    <div className="border-2 border-ink bg-paper p-2">
                      <DashboardMock filled={false} />
                    </div>
                  )}
                  {m.text && (
                    <div className="max-w-[80%] bg-sheet border-r-4 border-red px-4 py-2.5 text-[15px] leading-relaxed">
                      {m.text}
                    </div>
                  )}
                </div>
              ) : (
                <div key={i} className="flex gap-3">
                  <div className="h-7 w-7 shrink-0 bg-ink flex items-center justify-center mt-0.5">
                    <Bot className="h-4 w-4 text-paper" />
                  </div>
                  <div className="flex-1 min-w-0 text-[15px] leading-relaxed">
                    {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                    {m.block === "toolcall" && <ToolCallCard />}
                    {m.block === "metrics" && <MetricsBlock />}
                    {m.block === "sql" && <SqlBlock />}
                    {m.block === "mview" && <MviewBlock />}
                  </div>
                </div>
              )
            ))}

            {s.aiTyping && (
              <div className="flex gap-3">
                <div className="h-7 w-7 shrink-0 bg-ink flex items-center justify-center">
                  <Bot className="h-4 w-4 text-paper" />
                </div>
                <div className="flex items-center gap-2 text-sm text-ink-soft mt-1">
                  <Loader2 className="h-4 w-4 animate-spin text-red" /> 透過 Plasma MCP 查詢資料結構中…
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 px-5 pb-5">
          <div className="mx-auto max-w-3xl">
            {s.chatAttachment && (
              <div data-t="agent-attachment" className="mb-2 inline-flex items-center gap-2 border border-ink bg-paper pl-2 pr-3 py-1.5">
                <span className="inline-flex items-center justify-center h-7 w-7 bg-sheet">
                  <ImageIcon className="h-4 w-4 text-ink" />
                </span>
                <span className="text-xs font-bold font-mono">bi-dashboard.png</span>
              </div>
            )}
            <div className="flex items-center gap-2 border-2 border-ink bg-paper px-2 py-2">
              <button data-t="agent-upload" className="inline-flex items-center justify-center h-9 w-9 text-ink hover:bg-sheet shrink-0">
                <Paperclip className="h-5 w-5" />
              </button>
              {s.chatInput ? (
                <span className="flex-1 text-[15px] truncate">{s.chatInput}<span className="inline-block w-0.5 h-4 align-middle bg-red animate-pulse ml-0.5" /></span>
              ) : (
                <span className="flex-1 text-[15px] text-ink-soft">Message AI Agent</span>
              )}
              <button data-t="agent-send" className="inline-flex items-center justify-center h-9 w-9 bg-red text-paper shrink-0">
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
            <div className="text-center text-[11px] text-ink-soft mt-2">
              AI Agent 透過 Plasma MCP 存取你的資料。任何支援 MCP 的 agent 都能這樣接。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SideItem({ icon, label, active, muted }: { icon: React.ReactNode; label: string; active?: boolean; muted?: boolean }) {
  return (
    <div className={
      "relative flex items-center gap-2.5 px-2.5 h-9 text-sm " +
      (active ? "bg-paper font-bold text-red shadow-[inset_4px_0_0_#b42622]" : muted ? "text-ink-soft hover:bg-sheet-deep" : "text-ink hover:bg-sheet-deep")
    }>
      {icon}<span className="truncate">{label}</span>
    </div>
  )
}

function McpConnector({ connected }: { connected: boolean }) {
  return (
    <div className="border-2 border-ink border-t-[6px] border-t-red bg-paper p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 bg-red flex items-center justify-center">
          <Zap className="h-5 w-5 text-paper" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black">Plasma MCP</div>
          <div className="text-xs text-ink-soft">Model Context Protocol · Plasma 專屬資料語意 server</div>
        </div>
        {connected ? (
          <span className="flex items-center gap-1.5 bg-ink text-paper text-xs font-bold px-3 py-1.5">
            <CheckCircle2 className="h-4 w-4" /> Connected · Authorized in Plasma · 3 tools
          </span>
        ) : (
          <button data-t="mcp-connect" className="bg-red text-paper text-sm font-bold px-4 py-1.5">
            Connect
          </button>
        )}
      </div>
      {connected && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["list_tables", "describe_columns", "create_materialized_view"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1 border border-ink bg-paper px-2 py-1 text-[11px] font-mono text-ink">
              <Wrench className="h-3 w-3 text-red" /> {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ToolCallCard() {
  const calls = [
    "list_tables()  →  T_ORD_M, T_PRD_M, members …",
    "describe_columns(T_ORD_M)  →  AMT1=含稅金額, FLG_X=訂單狀態 …",
    "describe_columns(members)  →  region=地區, tier=會員等級 …",
  ]
  return (
    <div className="mt-3 border border-ink border-l-4 border-l-red bg-sheet p-3">
      <div className="flex items-center gap-1.5 t-label text-ink mb-2">
        <Wrench className="h-3.5 w-3.5" /> Used Plasma MCP
      </div>
      <div className="flex flex-col gap-1">
        {calls.map((c) => (
          <div key={c} className="font-mono text-[11px] text-ink truncate">{c}</div>
        ))}
      </div>
    </div>
  )
}

function MetricsBlock() {
  return (
    <div className="mt-3 overflow-hidden border border-ink border-t-4">
      <table className="w-full text-xs">
        <thead className="bg-sheet text-ink border-b-2 border-ink">
          <tr>
            <th className="text-left px-3 py-2 t-label">指標</th>
            <th className="text-left px-3 py-2 t-label">對應資料來源</th>
            <th className="text-left px-3 py-2 t-label">計算方式</th>
          </tr>
        </thead>
        <tbody>
          {DASHBOARD_METRICS.map((m) => (
            <tr key={m.label} className="border-t border-hair">
              <td className="px-3 py-2 font-bold">{m.label}</td>
              <td className="px-3 py-2 font-mono text-[11px] text-red">{m.source}</td>
              <td className="px-3 py-2 text-ink-soft">{m.logic}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SqlBlock() {
  return (
    <pre className="mt-3 overflow-x-auto border-t-4 border-red bg-ink p-4 font-mono text-[12px] leading-relaxed text-paper">
      <code>{GENERATED_SQL}</code>
    </pre>
  )
}

function MviewBlock() {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-ink font-bold text-sm">
        <CheckCircle2 className="h-4 w-4 text-red" /> 已透過 Plasma MCP 建立 Materialized View：<span className="font-mono">{MVIEW_NAME}</span>
      </div>
      <div className="flex items-center gap-2 border border-ink border-l-4 border-l-red bg-sheet px-3 py-2 text-sm text-ink">
        <Database className="h-4 w-4 text-red shrink-0" />
        它已經建在你的 Plasma 上 —— 回 Plasma 的 Materialized View 頁面就能取得對外 Data API。
      </div>
    </div>
  )
}

