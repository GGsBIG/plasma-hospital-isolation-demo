import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, FastForward, MonitorPlay, Pause, Play, RotateCcw } from "lucide-react"
import logo from "@/assets/brobridge-logo.webp"
import { Canvas, CAMS } from "./Canvas"
import { LESSON, METRICS, type LessonStep } from "./steps"
import "./lesson.css"

// 跟 Oracle 減壓同一套版面:紅線頁首、場景上的數字晶片、右側只列變化、下方分階段的步驟軸
type Box = [number, number, number, number]
const lerp = (a: Box, b: Box, k: number): Box => a.map((v, i) => v + (b[i] - v) * k) as Box
const AUTO_MS = 9000 // 自動播放時每一步停留多久

/** 這一步開始後經過的秒數;暫停時不走 */
function useClock(key: string, paused: boolean) {
  const [t, setT] = useState(0)
  const acc = useRef(0)
  useEffect(() => { acc.current = 0; setT(0) }, [key])
  useEffect(() => {
    if (paused) return
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      acc.current += Math.min(0.1, (now - last) / 1000)
      last = now
      setT(acc.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paused, key])
  return t
}

/** 換步驟時鏡頭平移縮放過去(補間的是要框進畫面的範圍) */
function useCamera(step: number) {
  const [box, setBox] = useState<Box>(() => CAMS[step])
  const cur = useRef(box)
  useEffect(() => {
    const from = cur.current
    const to = CAMS[step]
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 1100)
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
      cur.current = lerp(from, to, e)
      setBox(cur.current)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [step])
  return box
}

/** 場景容器的大小 */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const on = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    on()
    const ro = new ResizeObserver(on)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

/** 把要框的範圍放進「扣掉上方晶片、下方按鈕」的區域,回傳整張 SVG 的 viewBox */
function fit([x0, y0, x1, y1]: Box, W: number, H: number, top: number, bottom: number): Box {
  const w = x1 - x0, h = y1 - y0
  if (!W || !H) return [x0, y0, w, h]
  const pad = 14
  const aw = W - pad * 2, ah = Math.max(80, H - top - bottom - pad * 2)
  const s = Math.min(aw / w, ah / h)
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  return [cx - W / 2 / s, cy - (top + pad + ah / 2) / s, W / s, H / s]
}

function useMedia(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [q])
  return m
}

/** 分頁切走、畫面捲出視窗(例如首頁的 iframe 關掉)時暫停動畫 */
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

export function Lesson({ step, go }: { step: number; go: (i: number) => void }) {
  const [paused, setPaused] = useState(false)
  const [auto, setAuto] = useState(false)
  const [epoch, setEpoch] = useState(0)
  const hidden = useHidden()
  const t = useClock(`${step}-${epoch}`, paused || hidden)
  const box = useCamera(step)
  const narrow = useMedia("(max-width: 760px)")
  const [stageRef, size] = useSize<HTMLDivElement>()
  const vb = fit(box, size.w, size.h, narrow ? 0 : 76, narrow ? 40 : 0)
  const L = LESSON[step]
  const next = LESSON[step + 1]
  const N = LESSON.length
  const replay = () => { setPaused(false); setEpoch((e) => e + 1) }

  useEffect(() => { setPaused(false) }, [step])
  useEffect(() => {
    if (!auto || paused || hidden) return
    const id = window.setTimeout(() => (step < N - 1 ? go(step + 1) : setAuto(false)), AUTO_MS)
    return () => window.clearTimeout(id)
  }, [auto, paused, hidden, step, go, N])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(Math.min(N - 1, step + 1)) }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(Math.max(0, step - 1)) }
      else if (e.key === " ") { e.preventDefault(); setPaused((p) => !p) }
      else if (e.key === "r" || e.key === "R") replay()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [step, go, N])

  return (
    <div className="ln">
      <header className="top">
        <a href="../#sentinel" target="_top" aria-label="回到 Demo 首頁"><img src={logo} alt="Brobridge" className="top-logo" /></a>
        <span className="top-title">K8s Sentinel・容器防護</span>
        <span className="ln-flex" />
        <a className="top-link" href={`#/ui/${L.ui + 1}`}><MonitorPlay className="i" /><span>實際操作畫面</span></a>
      </header>

      <div className="body">
        <section className="stage-card">
          <div className="stage-head">
            <div className="chips">
              {METRICS.map((name, i) => {
                const m = L.m[i]
                return (
                  <div key={name} className={`chip ${m.tone === "good" ? "down" : m.tone === "bad" ? "warn" : ""}`}>
                    <span className="chip-k">{name}</span>
                    <span key={m.v} className="chip-v">{m.v}</span>
                  </div>
                )
              })}
            </div>
            <div className="tools">
              <button className="tool" onClick={replay} aria-label="重播"><RotateCcw className="i" /><span>重播</span></button>
              <button className="tool" onClick={() => setPaused((p) => !p)} aria-label={paused ? "繼續" : "暫停"}>
                {paused ? <Play className="i" /> : <Pause className="i" />}<span>{paused ? "繼續" : "暫停"}</span>
              </button>
              <button className={`tool${auto ? " on" : ""}`} onClick={() => setAuto((a) => !a)} aria-pressed={auto} aria-label="自動播放"><FastForward className="i" /><span>自動播放</span></button>
            </div>
          </div>
          <div className="stage" ref={stageRef}>
            <Canvas step={step} t={t} vb={vb} />
          </div>
        </section>

        <aside className="panel">
          <h1 key={`t${step}`} className="panel-title"><span className="panel-n">{step + 1}</span>{L.title}</h1>
          <ul key={`c${step}`} className="changes">
            {L.changed.map(([sign, text], i) => (
              <li key={text} className={`chg chg-${sign === "+" ? "add" : sign === "−" ? "down" : sign === "!" ? "warn" : "move"}`} style={{ animationDelay: `${0.3 + i * 0.25}s` }}>
                <b>{sign}</b>{text}
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

/** 下方步驟軸:十個點,依階段分組 */
function Timeline({ step, onGo }: { step: number; onGo: (n: number) => void }) {
  const phases = LESSON.reduce<{ name: LessonStep["phase"]; from: number; n: number }[]>((a, s, i) => {
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
            {LESSON.slice(p.from, p.from + p.n).map((s, j) => {
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
