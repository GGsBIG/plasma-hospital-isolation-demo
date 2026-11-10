import { useEffect, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { useDemo } from "@/demo/engine"
import { initVoices, speak, stopSpeaking, pauseSpeaking, resumeSpeaking } from "@/demo/voice"
import {
  Sidebar, TopBar, DatabaseListPage, DatabaseDetailPage,
  MaterializedViewPage, DataApiPage, MCPPage,
} from "@/app/Shell"
import { LoginPage } from "@/app/Login"
import { AddDatabaseDialog, UploadDocDialog, EditTableDescriptionDialog, ViewSchemaDialog, ViewDataDialog, AddMcpDialog } from "@/dialogs/Dialogs"
import { ChatGPTAgent } from "@/agent/ChatGPTAgent"
import { PowerBIImport } from "@/agent/PowerBIImport"
import { PowerBIDashboard } from "@/opencode/PowerBIDashboard"
import { Cursor, Subtitle, ChapterBar } from "@/demo/Overlay"

// 下方片段列高度（h-11）；讓整個舞台停在片段列上方，畫面不被蓋住
const BAR_H = 44

export function App() {
  const { s, idx, total, mode, paused, jump } = useDemo()
  const barVisible = !new URLSearchParams(location.search).has("nobar")
  const offset = barVisible ? BAR_H : 0

  // 配音版：?voice 開啟（無聲版為預設）；播放中按 V 可切換開/關
  const [voiceOn, setVoiceOn] = useState(() => new URLSearchParams(location.search).has("voice"))
  useEffect(() => { initVoices() }, [])
  useEffect(() => {
    if (!voiceOn) { stopSpeaking(); return }
    speak(s.subtitle)
  }, [s.subtitle, voiceOn])
  useEffect(() => {
    if (!voiceOn) return
    paused ? pauseSpeaking() : resumeSpeaking() // 空白鍵暫停時，旁白一起停
  }, [paused, voiceOn])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "v" || e.key === "V") setVoiceOn((p) => { if (p) stopSpeaking(); return !p })
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const crumb =
    s.page === "detail" ? "Database / oracle_erp"
    : s.page === "mview" ? "Materialized View"
    : s.page === "api" ? "Data Product / Data API"
    : s.page === "mcp" ? "MCP"
    : "Database"

  const page =
    s.page === "detail" ? <DatabaseDetailPage s={s} />
    : s.page === "mview" ? <MaterializedViewPage s={s} />
    : s.page === "api" ? <DataApiPage s={s} />
    : s.page === "mcp" ? <MCPPage s={s} />
    : <DatabaseListPage s={s} />

  return (
    <>
      {/* 舞台：固定於視窗，底部保留片段列高度，內部所有畫面都被裁切在片段列上方 */}
      <div
        className="fixed inset-x-0 top-0 overflow-hidden bg-background text-foreground"
        style={{ bottom: offset }}
      >
        {s.screen === "login" ? (
          <LoginPage s={s} />
        ) : s.screen === "chatgpt" ? (
          <ChatGPTAgent s={s} />
        ) : (
          <div className="h-full w-full flex border-t-[6px] border-red">
            <Sidebar s={s} />
            <div className="flex-1 min-w-0 flex flex-col">
              <TopBar crumb={crumb} />
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{page}</div>
            </div>

            {/* dialogs */}
            <AddDatabaseDialog s={s} />
            <ViewDataDialog s={s} />
            <ViewSchemaDialog s={s} />
            <UploadDocDialog s={s} />
            <EditTableDescriptionDialog s={s} />
            <AddMcpDialog s={s} />

            {/* AI 分析中 toast */}
            {s.analyzing && (
              <div className="absolute bottom-8 right-8 z-50 flex items-center gap-2 border-2 border-ink border-l-[6px] border-l-red bg-paper px-4 py-3 shadow-[0_12px_32px_rgb(17_17_17/0.18)] fadeup on">
                <Sparkles className="h-4 w-4 text-red" />
                <span className="text-sm font-bold">AI 正在分析文件…</span>
                <Loader2 className="h-4 w-4 animate-spin text-ink" />
              </div>
            )}
          </div>
        )}

        {/* Act 2 結尾：Power BI 匯入 API → 精美儀表板（覆蓋舞台，仍在片段列上方） */}
        <PowerBIImport s={s} />
        <PowerBIDashboard s={s} />
      </div>

      {/* 呈現用 overlay（固定於視窗；片段列在最底、實心底） */}
      <Cursor s={s} />
      <Subtitle s={s} idx={idx} total={total} mode={mode} paused={paused} voiceOn={voiceOn} />
      <ChapterBar mode={mode} idx={idx} onJump={jump} />
    </>
  )
}
