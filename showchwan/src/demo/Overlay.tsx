import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import type { DemoState } from "./store"
import { CHAPTER_FROM } from "./scenes"
import { STEPS } from "@/sc/steps"

// 假游標:畫在 Plasma 畫面框裡(座標是框的座標系)
export function Cursor({ s }: { s: DemoState }) {
  return (
    <>
      <div className="demo-cursor" style={{ transform: `translate(${s.cursor.x}px, ${s.cursor.y}px)` }}>
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path d="M4 2l6 15 2.2-5.8L18 9z" fill="#fff" stroke="#111111" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </div>
      <div className={`demo-ripple ${s.cursor.clicking ? "on" : ""}`} style={{ left: s.cursor.x, top: s.cursor.y }} />
    </>
  )
}

/** 下方控制列:播放／暫停、上一步／下一步、七個步驟(目前這步紅底),以及這一步在做什麼 */
export function ChapterBar({ step, paused, onJump, onToggle }: { step: number; paused: boolean; onJump: (from: number) => void; onToggle: () => void }) {
  const cur = step // 跟情境圖同一步
  const go = (c: number) => onJump(CHAPTER_FROM[Math.max(0, Math.min(CHAPTER_FROM.length - 1, c))])
  return (
    <div className="sc-bar">
      <div className="sc-bar-caption">
        <span className="sc-bar-n">{cur + 1}／{STEPS.length}</span>
        <b>{STEPS[cur].title}</b>
        <span className="sc-bar-line">{STEPS[cur].line}</span>
      </div>
      <div className="sc-bar-row">
        <button className="sc-bar-btn" onClick={onToggle} aria-label={paused ? "繼續播放" : "暫停"}>
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          <span>{paused ? "播放" : "暫停"}</span>
        </button>
        <button className="sc-bar-btn" onClick={() => go(cur - 1)} aria-label="上一步" disabled={cur === 0}><ChevronLeft className="h-4 w-4" /></button>
        <div className="sc-bar-steps">
          {STEPS.map((st, i) => (
            <button key={i} onClick={() => go(i)} className={i === cur ? "on" : i < cur ? "past" : ""} aria-current={i === cur ? "step" : undefined}>
              <span className="tabular-nums">{i + 1}</span>{st.title}
            </button>
          ))}
        </div>
        <button className="sc-bar-btn" onClick={() => go(cur + 1)} aria-label="下一步" disabled={cur === STEPS.length - 1}><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  )
}
