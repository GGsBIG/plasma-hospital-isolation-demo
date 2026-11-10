import { useEffect, useRef } from "react"
import {
  Plus, Search, MessageSquare, Paperclip, ArrowUp,
  Loader2, ChevronDown, Wrench, CheckCircle2, FileText, Zap, Bot,
} from "lucide-react"
import type { DemoState } from "@/demo/store"
import { MCP_TOOLS } from "@/demo/data"
import { ContributionDashboard } from "@/opencode/DashboardMock"

// 外部 Agent 示範：AI Agent 透過「Plasma MCP」接上 Plasma。任何支援 MCP 的 agent 都能這樣接。
export function ChatGPTAgent({ s }: { s: DemoState }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [s.chat.length, s.aiTyping, s.mcpConnected])

  const empty = s.chat.length === 0

  return (
    <div className="absolute inset-0 z-30 flex bg-white text-slate-900">
      {/* 左側細窄側欄（AI Agent 風） */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-[#f9f9f9] border-r border-slate-200">
        <div className="flex items-center gap-2 px-3 h-14">
          <div className="h-7 w-7 rounded-full bg-black flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold">AI Agent</span>
        </div>
        <div className="px-2 flex flex-col gap-1">
          <SideItem icon={<Plus className="h-4 w-4" />} label="New chat" />
          <SideItem icon={<Search className="h-4 w-4" />} label="Search chats" />
        </div>
        <div className="px-4 pt-5 pb-1 text-[11px] font-medium text-slate-400">Chats</div>
        <div className="px-2 flex flex-col gap-1">
          <SideItem icon={<MessageSquare className="h-4 w-4" />} label="病史整合 API" active />
          <SideItem icon={<MessageSquare className="h-4 w-4" />} label="門診病人摘要" muted />
        </div>
      </aside>

      {/* 主區 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 頂列：model 選擇器 */}
        <div className="h-14 shrink-0 flex items-center px-4">
          <button className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[15px] font-medium hover:bg-slate-100">
            AI Agent <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* 對話區 */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-5 pt-2 pb-6 flex flex-col gap-6">
            {/* Plasma MCP connector（接 MCP 的視覺重點） */}
            <McpConnector connected={s.mcpConnected} />

            {empty && s.mcpConnected && (
              <div className="text-center text-slate-400 text-sm py-10">
                已在 Plasma 新增 MCP 並授權 —— AI Agent 現在能存取你在 Plasma 整理好的表、欄位與描述。
              </div>
            )}

            {s.chat.map((m, i) => (
              m.role === "user" ? (
                <div key={i} className="flex flex-col items-end gap-2">
                  {m.text && (
                    <div className="max-w-[80%] rounded-3xl bg-[#f4f4f4] px-4 py-2.5 text-[15px] leading-relaxed">
                      {m.text}
                    </div>
                  )}
                </div>
              ) : (
                <div key={i} className="flex gap-3">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-black flex items-center justify-center mt-0.5">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-[15px] leading-relaxed">
                    {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                    {m.block === "toolcall" && <ToolCallCard />}
                    {m.block === "report" && <ReportBlock />}
                  </div>
                </div>
              )
            ))}

            {s.aiTyping && (
              <div className="flex gap-3">
                <div className="h-7 w-7 shrink-0 rounded-full bg-black flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                  <Loader2 className="h-4 w-4 animate-spin" /> 透過 Plasma MCP 查詢病人跨系統資料中…
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 px-5 pb-5">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-2 shadow-sm">
              <button data-t="agent-upload" className="inline-flex items-center justify-center h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 shrink-0">
                <Paperclip className="h-5 w-5" />
              </button>
              {s.chatInput ? (
                <span className="flex-1 text-[15px] truncate">{s.chatInput}<span className="inline-block w-px h-4 align-middle bg-slate-700 animate-pulse ml-0.5" /></span>
              ) : (
                <span className="flex-1 text-[15px] text-slate-400">Message AI Agent</span>
              )}
              <button data-t="agent-send" className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-black text-white shrink-0">
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
            <div className="text-center text-[11px] text-slate-400 mt-2">
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
      "flex items-center gap-2.5 rounded-lg px-2.5 h-9 text-sm " +
      (active ? "bg-slate-200/70 font-medium" : muted ? "text-slate-400 hover:bg-slate-100" : "hover:bg-slate-100")
    }>
      {icon}<span className="truncate">{label}</span>
    </div>
  )
}

function McpConnector({ connected }: { connected: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#fafafa] p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-sidebar-ring/10 flex items-center justify-center">
          <Zap className="h-5 w-5 text-sidebar-ring" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Plasma MCP</div>
          <div className="text-xs text-slate-500">Model Context Protocol · Plasma 專屬資料語意 server</div>
        </div>
        {connected ? (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium px-3 py-1.5">
            <CheckCircle2 className="h-4 w-4" /> Connected · Authorized in Plasma · 3 tools
          </span>
        ) : (
          <button data-t="mcp-connect" className="rounded-full bg-black text-white text-sm font-medium px-4 py-1.5">
            Connect
          </button>
        )}
      </div>
      {connected && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {MCP_TOOLS.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono text-slate-600">
              <Wrench className="h-3 w-3 text-slate-400" /> {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ToolCallCard() {
  const calls = [
    "list_tables()  →  PT_VST_M, RX_ORDER, lab_result …",
    "describe_columns(PT_VST_M)  →  DX_CD=主診斷碼, RX_FLG=用藥旗標 …",
    "describe_columns(lab_result)  →  test_cd=檢驗項目, result_val=檢驗值 …",
  ]
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
        <Wrench className="h-3.5 w-3.5" /> Used Plasma MCP
      </div>
      <div className="flex flex-col gap-1">
        {calls.map((c) => (
          <div key={c} className="font-mono text-[11px] text-slate-600 truncate">{c}</div>
        ))}
      </div>
    </div>
  )
}

// AI 產出的病史摘要報告：直接把整合好的病史算成一份報告，渲染在對話裡（不需要另外的 BI 面板）。
function ReportBlock() {
  return (
    <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <FileText className="h-4 w-4 text-sidebar-ring" /> 病史摘要報告
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> 由 Plasma MCP 整合 HIS × LIS 產生
        </span>
      </div>
      <div className="p-3">
        <ContributionDashboard filled />
      </div>
    </div>
  )
}

