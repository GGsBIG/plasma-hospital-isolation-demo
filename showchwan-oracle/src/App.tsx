import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, FastForward } from "lucide-react"
import { EMPTY, STEPS, type Look, type Step } from "./steps"
import { Scene } from "./Scene"
import logo from "./assets/brobridge-logo.webp"

// 放在秀傳網站裡:logo 回秀傳入口頁;單獨上傳成一頁(VITE_STANDALONE=1):logo 回官網首頁
const HOME = import.meta.env.VITE_STANDALONE === "1" ? { href: "/", label: "回到 Brobridge 首頁" } : { href: "../#oracle", label: "回到 Plasma Demo 首頁" }
const AUTO_MS = 8000 // 自動播放時每一步停留多久
const clampStep = (n: number) => Math.max(0, Math.min(STEPS.length - 1, n))

export function App() {
  // 網址可以直接指定從第幾步開始,例如 #step=5
  const [step, setStep] = useState(() => clampStep((Number(new URLSearchParams(location.hash.slice(1)).get("step")) || 1) - 1))
  const [look, setLook] = useState<Look>(STEPS[step].look)
  const [paused, setPaused] = useState(false)
  const [auto, setAuto] = useState(false)
  const replayT = useRef(0)

  const go = useCallback((n: number) => {
    const k = clampStep(n)
    window.clearTimeout(replayT.current)
    setStep(k)
    setLook(STEPS[k].look)
    setPaused(false)
    history.replaceState(null, "", `#step=${k + 1}`)
  }, [])
  // 重播:先退回上一步的畫面,再播一次這一步
  const replay = useCallback(() => {
    window.clearTimeout(replayT.current)
    setLook(step === 0 ? EMPTY : STEPS[step - 1].look)
    setPaused(false)
    replayT.current = window.setTimeout(() => setLook(STEPS[step].look), 450)
  }, [step])

  useEffect(() => {
    if (!auto || paused) return
    const t = window.setTimeout(() => (step < STEPS.length - 1 ? go(step + 1) : setAuto(false)), AUTO_MS)
    return () => window.clearTimeout(t)
  }, [auto, paused, step, go])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(step + 1)
      else if (e.key === "ArrowLeft") go(step - 1)
      else if (e.key === " ") { e.preventDefault(); setPaused((p) => !p) }
      else if (e.key === "r" || e.key === "R") replay()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [step, go, replay])

  const s = STEPS[step]
  const next = STEPS[step + 1]
  // 桌機:數字晶片疊在場景上方,鏡頭要往下讓;手機:晶片在場景外面
  const narrow = useNarrow()
  const hidden = useHidden()
  const lite = useLite()
  return (
    <div className="app">
      <header className="top">
        <a href={HOME.href} target="_top" aria-label={HOME.label}><img src={logo} alt="Brobridge" className="top-logo" /></a>
        <span className="top-title">秀傳醫院・Oracle 減壓</span>
      </header>

      <div className="body">
        <section className="stage-card">
          <div className="stage-head">
            <Chips l={look} />
            <div className="tools">
              <button className="tool" onClick={replay} aria-label="重播"><RotateCcw className="i" /><span>重播</span></button>
              <button className="tool" onClick={() => setPaused((p) => !p)} aria-label={paused ? "繼續" : "暫停"}>
                {paused ? <Play className="i" /> : <Pause className="i" />}<span>{paused ? "繼續" : "暫停"}</span>
              </button>
              <button className={`tool${auto ? " on" : ""}`} onClick={() => setAuto((a) => !a)} aria-pressed={auto} aria-label="自動播放"><FastForward className="i" /><span>自動播放</span></button>
            </div>
          </div>
          <div className="stage">
            <Scene l={look} paused={paused || hidden} lite={lite} insetTop={narrow ? 0 : 76} insetBottom={narrow ? 40 : 0} />
          </div>
        </section>

        <aside className="panel">
          <h1 key={`t${step}`} className="panel-title"><span className="panel-n">{step + 1}</span>{s.title}</h1>
          <ul key={`c${step}`} className="changes">
            {s.changes.map(([sign, t], i) => (
              <li key={t} className={`chg chg-${sign === "+" ? "add" : sign === "−" ? "down" : sign === "!" ? "warn" : "move"}`} style={{ animationDelay: `${0.3 + i * 0.25}s` }}>
                <b>{sign}</b>{t}
              </li>
            ))}
          </ul>
          <div className="panel-nav">
            <button className="btn" onClick={() => go(step - 1)} disabled={step === 0} aria-label="上一步"><ArrowLeft className="i" /><span className="btn-text">上一步</span></button>
            {next ? (
              <button className="btn primary" onClick={() => go(step + 1)}><span>{next.short}</span><ArrowRight className="i" /></button>
            ) : (
              <button className="btn primary" onClick={() => go(0)}><span>從頭再看一次</span><RotateCcw className="i" /></button>
            )}
          </div>
        </aside>
      </div>

      <Timeline step={step} onGo={go} />
    </div>
  )
}

/** 分頁切走、畫面捲出視窗(例如嵌在首頁的 iframe 被關掉)時暫停所有動畫,省電也不佔手機資源 */
function useHidden() {
  const [hidden, setHidden] = useState(() => document.hidden)
  useEffect(() => {
    let tab = document.hidden
    let off = false
    const sync = () => setHidden(tab || off)
    const onVis = () => { tab = document.hidden; sync() }
    document.addEventListener("visibilitychange", onVis)
    const io = new IntersectionObserver(([e]) => { off = !e.isIntersecting; sync() })
    io.observe(document.body)
    return () => { document.removeEventListener("visibilitychange", onVis); io.disconnect() }
  }, [])
  return hidden
}

/** 輕量模式:開場量 1 秒的畫面更新率,太低(舊手機、省電模式)就減少動畫;
 *  系統設定「減少動態效果」也算;網址加 #lite=1 可以強制開啟方便測試 */
function useLite() {
  const forced = new URLSearchParams(location.hash.slice(1)).get("lite")
  const [lite, setLite] = useState(() => forced === "1" || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  useEffect(() => {
    if (forced) return
    let frames = 0
    let raf = 0
    let t0 = 0
    const tick = (t: number) => {
      if (!t0) t0 = t
      frames++
      if (t - t0 < 1000) raf = requestAnimationFrame(tick)
      else if ((frames * 1000) / (t - t0) < 45) setLite(true)
    }
    // 等開場的掉落動畫開始後再量,量到的才是真的負擔
    const start = window.setTimeout(() => (raf = requestAnimationFrame(tick)), 300)
    return () => { window.clearTimeout(start); cancelAnimationFrame(raf) }
  }, [forced])
  return lite
}

function useNarrow() {
  const q = "(max-width: 760px)"
  const [n, setN] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setN(m.matches)
    m.addEventListener("change", on)
    return () => m.removeEventListener("change", on)
  }, [])
  return n
}

/** 上方的數字:VMware 與 Oracle 的使用量,降下來時轉綠、太忙時轉紅 */
function Chips({ l }: { l: Look }) {
  const onVm = l.moved ? 2 : 8
  const onOra = l.toPg ? 2 : 8
  const items: { k: string; v: string; tone: "" | "down" | "warn" }[] = [
    { k: "VMware 上的應用", v: l.vm ? `${onVm} 支` : "—", tone: l.vm && l.moved ? "down" : "" },
    { k: "連 Oracle 的應用", v: l.oracle ? `${onOra} 支` : "—", tone: l.oracle && l.toPg ? "down" : "" },
    { k: "Oracle 負載", v: l.oracle ? `${l.load}%` : "—", tone: l.oracle ? (l.load > 60 ? "warn" : "down") : "" },
  ]
  return (
    <div className="chips">
      {items.map((c) => (
        <div key={c.k} className={`chip ${c.tone}`}>
          <span className="chip-k">{c.k}</span>
          <span key={c.v} className="chip-v">{c.v}</span>
        </div>
      ))}
    </div>
  )
}

/** 下方步驟軸:十個點,依階段分組 */
function Timeline({ step, onGo }: { step: number; onGo: (n: number) => void }) {
  const phases = STEPS.reduce<{ name: Step["phase"]; from: number; n: number }[]>((a, s, i) => {
    const last = a[a.length - 1]
    if (last && last.name === s.phase) last.n++
    else a.push({ name: s.phase, from: i, n: 1 })
    return a
  }, [])
  return (
    <nav className="timeline" aria-label="步驟">
      {phases.map((p) => (
        <div key={p.name} className={`phase${step >= p.from && step < p.from + p.n ? " cur" : ""}`} style={{ flexGrow: p.n }}>
          <p className="phase-k">{p.name}</p>
          <div className="phase-steps">
            {STEPS.slice(p.from, p.from + p.n).map((s, j) => {
              const i = p.from + j
              return (
                <button key={i} onClick={() => onGo(i)} className={`tl${i === step ? " on" : i < step ? " done" : ""}`} aria-current={i === step ? "step" : undefined}>
                  <span className="tl-dot">{i + 1}</span>
                  <span className="tl-label">{s.short}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
