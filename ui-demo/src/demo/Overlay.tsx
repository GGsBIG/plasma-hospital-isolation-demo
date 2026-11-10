import type { DemoState } from "./store"
import type { Mode } from "./engine"

// 片段選單：label + 從第幾步開始播（點了會跳到該片段開頭）
export const CHAPTERS: { label: string; from: number }[] = [
  { label: "今天的目標", from: 0 },
  { label: "登入", from: 2 },
  { label: "連接院內系統", from: 4 },
  { label: "看表", from: 8 },
  { label: "看資料", from: 10 },
  { label: "看欄位", from: 11 },
  { label: "上傳文件", from: 12 },
  { label: "AI 理解欄位", from: 14 },
  { label: "AI Agent 接 MCP", from: 16 },
  { label: "醫師問答＋報告", from: 17 },
]

export function ChapterBar({ idx, onJump }: { mode: Mode; idx: number; onJump: (from: number) => void }) {
  // 隱藏列（錄影時）：?nobar
  if (new URLSearchParams(location.search).has("nobar")) return null

  const currentFrom = [...CHAPTERS].reverse().find((c) => idx >= c.from)?.from ?? -1
  const jump = (from: number) => onJump(from)

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-[70] h-11 flex flex-nowrap items-center justify-start lg:justify-center gap-1.5 overflow-x-auto whitespace-nowrap bg-neutral-900 px-3 border-t border-white/10">
      {CHAPTERS.map((c) => (
        <button
          key={c.from}
          onClick={() => jump(c.from)}
          className={
            "shrink-0 px-2.5 py-1 text-[11px] transition-colors " +
            (c.from === currentFrom
              ? "bg-sky-500 text-white font-medium"
              : "bg-white/10 text-white/80 hover:bg-white/20")
          }
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

export function Cursor({ s }: { s: DemoState }) {
  return (
    <>
      <div
        className="demo-cursor"
        style={{ transform: `translate(${s.cursor.x}px, ${s.cursor.y}px)` }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path d="M4 2l6 15 2.2-5.8L18 9z" fill="#fff" stroke="#1f2937" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </div>
      <div
        className={`demo-ripple ${s.cursor.clicking ? "on" : ""}`}
        style={{ left: s.cursor.x, top: s.cursor.y }}
      />
    </>
  )
}

// ponytail: 字幕與狀態列已移除，保留空元件避免動到呼叫端
export function Subtitle(_: { s: DemoState; idx: number; total: number; mode: Mode; paused: boolean; voiceOn?: boolean }) {
  return null
}
