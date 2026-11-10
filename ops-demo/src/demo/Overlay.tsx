import type { DemoState } from "./store"
import type { Mode } from "./engine"

// 片段選單：label + 從第幾步開始播（點了會跳到該片段開頭）
export const CHAPTERS: { label: string; from: number }[] = [
  { label: "空面板目標", from: 0 },
  { label: "登入", from: 2 },
  { label: "連接資料庫", from: 4 },
  { label: "看表", from: 8 },
  { label: "看資料", from: 10 },
  { label: "看欄位", from: 11 },
  { label: "上傳文件", from: 12 },
  { label: "AI 理解欄位", from: 14 },
  { label: "AI Agent 接 MCP", from: 16 },
  { label: "截圖→SQL→MView", from: 17 },
  { label: "接回 BI", from: 21 },
]

export function ChapterBar({ idx, onJump }: { mode: Mode; idx: number; onJump: (from: number) => void }) {
  // 隱藏列（錄影時）：?nobar
  if (new URLSearchParams(location.search).has("nobar")) return null

  const currentFrom = [...CHAPTERS].reverse().find((c) => idx >= c.from)?.from ?? -1
  const jump = (from: number) => onJump(from)

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-[70] h-11 flex flex-nowrap items-stretch justify-start lg:justify-center gap-0 overflow-x-auto whitespace-nowrap bg-paper px-3 border-t-[3px] border-ink">
      {CHAPTERS.map((c) => (
        <button
          key={c.from}
          onClick={() => jump(c.from)}
          className={
            "shrink-0 px-3 text-[12px] font-bold tracking-[0.02em] border-r border-hair first:border-l transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red " +
            (c.from === currentFrom
              ? "bg-red text-paper shadow-[inset_0_-4px_0_#8f1d1a]"
              : "bg-paper text-ink hover:bg-sheet")
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
          <path d="M4 2l6 15 2.2-5.8L18 9z" fill="#fff" stroke="#111111" strokeWidth="1.4" strokeLinejoin="round" />
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
