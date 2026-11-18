import { useEffect, useState } from "react"
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react"
import type { Card, DemoState } from "./store"
import { STEPS } from "@/sc/steps"

// 假游標:畫在 Sentinel 畫面框裡(座標是框的座標系)
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

/** 聚光燈:圈住正在操作的元素,其他地方變暗,旁邊一句說明(在 Sentinel 畫面框裡) */
export function Spotlight({ s }: { s: DemoState }) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  useEffect(() => {
    if (!s.spot) { setBox(null); return }
    // 剛出現的 0.8 秒逐格追蹤(對話框還在進場動畫),之後每 0.25 秒量一次就好:
    // 每格都量會一直強迫瀏覽器重算版面,手機會卡
    let raf = 0
    let to = 0
    const t0 = performance.now()
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
      if (performance.now() - t0 < 800) raf = requestAnimationFrame(tick)
      else to = window.setTimeout(() => (raf = requestAnimationFrame(tick)), 250)
    }
    tick()
    return () => { cancelAnimationFrame(raf); window.clearTimeout(to) }
  }, [s.spot])
  if (!s.spot || !box) return null
  const pad = 8
  // 下方放不下,或會落在右下角的小畫面上,就改放上方
  const below = box.y + box.h + 70 < 800 && !(box.x + box.w / 2 > 820 && box.y + box.h > 470)
  return (
    <div className="spot-layer" aria-live="polite">
      <div className="spot-ring" style={{ left: box.x - pad, top: box.y - pad, width: box.w + pad * 2, height: box.h + pad * 2 }} />
      <div className={`spot-tip ${below ? "below" : "above"}`}
        style={{ left: Math.min(Math.max(box.x + box.w / 2, 160), below && box.y + box.h > 470 ? 600 : 1120), top: below ? box.y + box.h + pad + 12 : box.y - pad - 12 }}>
        {s.spot.text}
      </div>
    </div>
  )
}

/** 畫面中央的說明卡:用故事帶出這一段要解決的問題 */
const CARDS: Record<Card, { title: string; kicker?: string; items: [string, string][]; end: string }> = {
  ebpf: {
    title: "Sentinel 怎麼看見容器裡的動作？",
    items: [["在每台主機的 kernel 裡觀察", "每支程式啟動、每次讀檔都看得到，應用程式不用改"], ["先觀察，不攔截", "Monitoring 模式只記錄，服務完全不受影響"], ["學到的，就是白名單", "服務平常跑哪些程式，Sentinel 自動列出來"]],
    end: "不用寫 YAML，也不用懂 kernel。",
  },
  attack: {
    kicker: "凌晨 2:13",
    title: "payment-api 被放進了挖礦程式",
    items: [["攻擊者利用已知弱點進到容器", "下載並執行挖礦程式 xmrig"], ["防火牆、權限設定都沒有變", "只檢查設定的工具，看不出異狀"], ["Sentinel 看的是實際行為", "xmrig 不在白名單，Protect 模式下當場終止"]],
    end: "程式一啟動就被擋下，值班人員同時收到通知。",
  },
  forensic: {
    title: "為什麼不直接刪掉 Pod？",
    items: [["刪掉 Pod，證據跟著消失", "記憶體、程序、開著的檔案全都不見"], ["Quarantine 只切斷網路", "容器繼續執行，資安人員可以進去蒐證"], ["隔離狀態記在叢集上", "Sentinel 重啟也不會失效，查完一鍵解除"]],
    end: "先止血，再調查。",
  },
  vuln: {
    title: "弱點報告修不完？",
    items: [["掃描報告動輒上千筆 CVE", "全部標紅，等於不知道先修哪個"], ["對外暴露的 Critical 排最前面", "再勾「有修補版本」，就是交給開發的清單"], ["弱點門檻變成部署規則", "超過門檻的映像檔，部署時直接拒絕"]],
    end: "從「看報告」，變成「擋得住」。",
  },
}
export function InfoCard({ s }: { s: DemoState }) {
  if (!s.card) return null
  const c = CARDS[s.card]
  return (
    <div key={s.card} className="why-card" role="status">
      {c.kicker && <p className="why-card-kicker">{c.kicker}</p>}
      <h2>{c.title}</h2>
      <ol>
        {c.items.map(([a, b], i) => <li key={a}><span>{i + 1}</span><p>{a}<small>{b}</small></p></li>)}
      </ol>
      <p className="why-card-end">{c.end}</p>
    </div>
  )
}

/** 情境播完:這一步完成了什麼,以及重播／下一個情境 */
export function DoneCard({ s, onReplay, onNext }: { s: DemoState; onReplay: () => void; onNext: () => void }) {
  if (!s.done) return null
  const last = s.scn === STEPS.length - 1
  return (
    <div className="done-card" role="status">
      <p className="done-card-text">{STEPS[s.scn].done}</p>
      <div className="done-card-actions">
        <button className="sc-bar-btn" onClick={onReplay}><RotateCcw className="h-4 w-4" />重播</button>
        {!last && <button className="sc-bar-btn primary" onClick={onNext}>下一步<ArrowRight className="h-4 w-4" /></button>}
      </div>
    </div>
  )
}

/** 下方控制列:七個情境(點了就播那一個)、重播、暫停、上一個／下一個 */
export function ChapterBar({ cur, paused, done, onPlay, onToggle }: { cur: number; paused: boolean; done: boolean; onPlay: (i: number) => void; onToggle: () => void }) {
  return (
    <div className="sc-bar">
      <div className="sc-bar-row">
        <button className="sc-bar-btn" onClick={() => onPlay(cur)}><RotateCcw className="h-4 w-4" /><span>重播</span></button>
        <button className="sc-bar-btn" onClick={onToggle} disabled={done} aria-label={paused ? "繼續" : "暫停"}>
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}<span>{paused ? "繼續" : "暫停"}</span>
        </button>
        <button className="sc-bar-btn" onClick={() => onPlay(cur - 1)} aria-label="上一個情境" disabled={cur === 0}><ChevronLeft className="h-4 w-4" /></button>
        <div className="sc-bar-steps">
          {STEPS.map((st, i) => (
            <button key={i} onClick={() => onPlay(i)} className={i === cur ? "on" : ""} aria-current={i === cur ? "step" : undefined}>
              <span className="tabular-nums">{i + 1}</span>{st.short}
            </button>
          ))}
        </div>
        <button className="sc-bar-btn" onClick={() => onPlay(cur + 1)} aria-label="下一個情境" disabled={cur === STEPS.length - 1}><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  )
}
