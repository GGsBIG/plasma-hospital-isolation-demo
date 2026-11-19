import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, FastForward, MonitorPlay, Pause, Play, RotateCcw } from "lucide-react"
import { EMPTY, STEPS, type Look, type Step } from "./steps"
import { Scene } from "./Scene"
import logo from "./assets/brobridge-logo.webp"
import "./lesson.css"

const AUTO_MS = 8000 // 自動播放時每一步停留多久

/** 圖解版:秀傳醫院的七個情境,拆成一步一步的等角積木圖 */
export function Lesson({ step, go }: { step: number; go: (n: number) => void }) {
  const [look, setLook] = useState<Look>(STEPS[step].look)
  const [paused, setPaused] = useState(false)
  const [auto, setAuto] = useState(false)
  const replayT = useRef(0)

  // 換步驟(按鈕、鍵盤、網址)時,場景切到那一步
  useEffect(() => {
    window.clearTimeout(replayT.current)
    setLook(STEPS[step].look)
    setPaused(false)
  }, [step])

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
  const narrow = useNarrow()
  const hidden = useHidden()
  const lite = useLite()
  return (
    <div className="ill">
      <header className="top">
        <a href="../#showchwan" target="_top" aria-label="回到 Plasma Demo 首頁"><img src={logo} alt="Brobridge" className="top-logo" /></a>
        <span className="top-title">秀傳醫院・Plasma 資料整合</span>
        <a className="top-ui" href={`#/ui/${s.sc + 1}`} aria-label="看實際操作畫面"><MonitorPlay className="i" /><span>實際操作畫面</span></a>
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
            {look.docs && <span className="brain-credit">Brain by Clockwise from the Noun Project</span>}
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

/** 分頁切走、畫面捲出視窗時暫停所有動畫 */
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

/** 輕量模式:開場量 1 秒的畫面更新率,太低就減少動畫;系統「減少動態效果」也算;網址加 ?lite=1 強制開啟 */
function useLite() {
  const forced = new URLSearchParams(location.search).get("lite")
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

/** 上方的數字:變好時轉綠、太差時轉紅 */
function Chips({ l }: { l: Look }) {
  const items: { k: string; v: string; tone: "" | "down" | "warn" }[] = [
    { k: "要寫幾種 SQL", v: l.sqlN ? `${l.sqlN} 種` : "—", tone: l.sqlN > 1 ? "warn" : l.sqlN ? "down" : "" },
    { k: "整理名冊要多久", v: l.days || "—", tone: l.days ? (l.daysBad ? "warn" : "down") : "" },
    { k: "Oracle 負載", v: l.load ? `${l.load}%` : "—", tone: l.load ? (l.load > 60 ? "warn" : "down") : "" },
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

/** 下方步驟軸:依階段分組 */
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
                <button key={i} onClick={() => onGo(i)} className={`tl${i === step ? " on" : i < step ? " done" : ""}`} aria-current={i === step ? "step" : undefined} aria-label={`${i + 1}. ${s.short}`}>
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
