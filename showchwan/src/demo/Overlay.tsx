import { useEffect, useState } from "react"
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react"
import type { DemoState } from "./store"
import { STEPS } from "@/sc/steps"

// 假游標:畫在 Plasma 畫面框裡(座標是框的座標系)
export function Cursor({ s }: { s: DemoState }) {
  return (
    <>
      <div className="demo-cursor" style={{ transform: `translate(${s.cursor.x}px, ${s.cursor.y}px)` }}>
        <svg viewBox="0 0 24 24" width="30" height="30">
          <path d="M4 2l6 15 2.2-5.8L18 9z" fill="#fff" stroke="#111111" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </div>
      <div className={`demo-ripple ${s.cursor.clicking ? "on" : ""}`} style={{ left: s.cursor.x, top: s.cursor.y }} />
    </>
  )
}

/** 聚光燈:圈住正在操作的元素,其他地方變暗,旁邊一句說明(在 Plasma 畫面框裡) */
export function Spotlight({ s }: { s: DemoState }) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  useEffect(() => {
    if (!s.spot) { setBox(null); return }
    let raf = 0
    const tick = () => {
      const el = document.querySelector<HTMLElement>(`[data-t="${s.spot!.sel}"]`)
      const frame = document.querySelector<HTMLElement>("[data-plasma-frame]")
      if (el && frame) {
        const r = el.getBoundingClientRect()
        const fr = frame.getBoundingClientRect()
        const k = fr.width / frame.offsetWidth || 1
        const next = { x: (r.left - fr.left) / k, y: (r.top - fr.top) / k, w: r.width / k, h: r.height / k }
        setBox((b) => (b && Math.abs(b.x - next.x) < 0.5 && Math.abs(b.y - next.y) < 0.5 && Math.abs(b.w - next.w) < 0.5 ? b : next))
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [s.spot])
  if (!s.spot || !box) return null
  const pad = 8
  const below = box.y + box.h + 70 < 800
  return (
    <div className="spot-layer" aria-live="polite">
      <div className="spot-ring" style={{ left: box.x - pad, top: box.y - pad, width: box.w + pad * 2, height: box.h + pad * 2 }} />
      <div className={`spot-tip ${below ? "below" : "above"}`}
        style={{ left: Math.min(Math.max(box.x + box.w / 2, 160), 1120), top: below ? box.y + box.h + pad + 12 : box.y - pad - 12 }}>
        {s.spot.text}
      </div>
    </div>
  )
}

/** 情境開場標題卡:蓋在兩個畫面上 2 秒多 */
export function TitleCard({ s }: { s: DemoState }) {
  if (!s.titleCard) return null
  const st = STEPS[s.scn]
  return (
    <div className="title-card" role="status">
      <div className="title-card-box">
        <p className="title-card-n">情境 {s.scn + 1}／{STEPS.length}</p>
        <h2>{st.title}</h2>
        <p className="title-card-goal">{st.goal}</p>
      </div>
    </div>
  )
}

/** 情境播完:這一步完成了什麼,以及重播／下一個情境 */
export function DoneCard({ s, onReplay, onNext }: { s: DemoState; onReplay: () => void; onNext: () => void }) {
  if (!s.done) return null
  const last = s.scn === STEPS.length - 1
  return (
    <div className="done-card" role="status">
      <p className="done-card-k">情境 {s.scn + 1} 完成</p>
      <p className="done-card-text">{STEPS[s.scn].done}</p>
      <div className="done-card-actions">
        <button className="sc-bar-btn" onClick={onReplay}><RotateCcw className="h-4 w-4" />重播這個情境</button>
        {!last && <button className="sc-bar-btn primary" onClick={onNext}>下一個情境<ArrowRight className="h-4 w-4" /></button>}
      </div>
    </div>
  )
}

/** 下方控制列:六個情境(點了就播那一個)、重播、暫停、上一個／下一個 */
export function ChapterBar({ cur, paused, done, onPlay, onToggle }: { cur: number; paused: boolean; done: boolean; onPlay: (i: number) => void; onToggle: () => void }) {
  return (
    <div className="sc-bar">
      <div className="sc-bar-caption">
        <span className="sc-bar-n">情境 {cur + 1}／{STEPS.length}</span>
        <b>{STEPS[cur].title}</b>
        <span className="sc-bar-line">{STEPS[cur].goal}</span>
      </div>
      <div className="sc-bar-row">
        <button className="sc-bar-btn" onClick={() => onPlay(cur)}><RotateCcw className="h-4 w-4" /><span>重播</span></button>
        <button className="sc-bar-btn" onClick={onToggle} disabled={done} aria-label={paused ? "繼續" : "暫停"}>
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}<span>{paused ? "繼續" : "暫停"}</span>
        </button>
        <button className="sc-bar-btn" onClick={() => onPlay(cur - 1)} aria-label="上一個情境" disabled={cur === 0}><ChevronLeft className="h-4 w-4" /></button>
        <div className="sc-bar-steps">
          {STEPS.map((st, i) => (
            <button key={i} onClick={() => onPlay(i)} className={i === cur ? "on" : ""} aria-current={i === cur ? "step" : undefined}>
              <span className="tabular-nums">{i + 1}</span>{st.title}
            </button>
          ))}
        </div>
        <button className="sc-bar-btn" onClick={() => onPlay(cur + 1)} aria-label="下一個情境" disabled={cur === STEPS.length - 1}><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  )
}
