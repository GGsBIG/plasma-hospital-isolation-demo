import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Check, Clock, Lightbulb, ListOrdered, MonitorPlay, Pause, Play, RotateCcw, TriangleAlert } from "lucide-react"
import logo from "@/assets/brobridge-logo.png"
import { Canvas, CAMS } from "./Canvas"
import { LESSON, METRICS, PAINS } from "./steps"
import "./lesson.css"

type Box = [number, number, number, number]
const toVb = (c: Box): Box => [c[0], c[1], c[2] - c[0], c[3] - c[1]]
const lerp = (a: Box, b: Box, k: number): Box => a.map((v, i) => v + (b[i] - v) * k) as Box

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

/** 換步驟時鏡頭平移縮放過去 */
function useCamera(step: number) {
  const [vb, setVb] = useState<Box>(() => toVb(CAMS[step]))
  const cur = useRef(vb)
  useEffect(() => {
    const from = cur.current
    const to = toVb(CAMS[step])
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 900)
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
      cur.current = lerp(from, to, e)
      setVb(cur.current)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [step])
  return vb
}

export function Lesson({ step, go }: { step: number; go: (i: number) => void }) {
  const [paused, setPaused] = useState(false)
  const [epoch, setEpoch] = useState(0)
  const t = useClock(`${step}-${epoch}`, paused)
  const vb = useCamera(step)
  const L = LESSON[step]
  const N = LESSON.length
  const replay = () => { setPaused(false); setEpoch((e) => e + 1) }

  useEffect(() => { setPaused(false) }, [step])
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

  const tagClass = { 現況: "t-now", 問題: "t-bad", 做法: "t-how", 結果: "t-good", 回顧: "t-recap" }[L.tag]

  return (
    <div className="ln">
      <header className="ln-top">
        <a href="../#sentinel" target="_top" aria-label="回到 Demo 首頁"><img src={logo} alt="Brobridge" className="ln-logo" /></a>
        <span className="ln-brand">K8s Sentinel</span>
        <span className="ln-flex" />
        <a className="ln-btn" href={`#/ui/${L.ui + 1}`}><MonitorPlay size={15} />實際操作畫面</a>
      </header>

      <div className="ln-body">
        <main className="ln-main">
          <div className="ln-head">
            <div>
              <p className="ln-crumb">K8s Sentinel　/　步驟 {step + 1} / {N}</p>
              <h1>容器裡的異常，當下就擋</h1>
              <p className="ln-lead">一家線上購物平台的 K8s 叢集：從看不到，到擋得住、查得到。</p>
            </div>
            <div className="ln-chips">
              <span className="chip c-yellow"><Clock size={13} />約 10 分鐘</span>
              <span className="chip c-violet"><ListOrdered size={13} />{N} 個步驟</span>
            </div>
          </div>

          <section className="ln-stage">
            <div className="ln-metrics">
              {METRICS.map((name, i) => (
                <div key={name} className={`metric m-${L.m[i].tone}`}>
                  <span>{name}</span>
                  <b key={`${step}-${L.m[i].v}`}>{L.m[i].v}</b>
                </div>
              ))}
              <span className="ln-flex" />
              <div className="ln-ctl">
                <button onClick={replay}><RotateCcw size={14} />重播</button>
                <button onClick={() => setPaused((p) => !p)}>{paused ? <Play size={14} /> : <Pause size={14} />}{paused ? "繼續" : "暫停"}</button>
              </div>
            </div>
            <div className="ln-canvas">
              <Canvas step={step} t={t} vb={vb} />
            </div>
            <div className="ln-legend">
              <span><i className="lg-req" />一般請求</span>
              <span><i className="lg-res" />回應</span>
              <span><i className="lg-bad" />攻擊 / 異常</span>
              <span><i className="lg-alert" />Sentinel 告警</span>
              <span><i className="lg-x" />被擋下</span>
            </div>
          </section>

          <nav className="ln-steps" aria-label="步驟">
            <div className="ln-steps-head"><span>這個情境</span><span>步驟 {step + 1} / {N}</span></div>
            <ol>
              {LESSON.map((x, i) => (
                <li key={i} className={i < step ? "done" : i === step ? "cur" : ""}>
                  <button onClick={() => go(i)} aria-current={i === step ? "step" : undefined}>
                    <span className="dot">{i + 1}</span>
                    <span className="lbl">{x.short}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </main>

        <aside className="ln-side">
          <div className="ln-card ln-explain" key={step}>
            <div className="ln-step-row">
              <span>步驟 {step + 1} / {N}</span>
              <span className={`tag ${tagClass}`}>{L.tag}</span>
            </div>
            <h2>{L.title}</h2>
            {L.body.map((p) => <p key={p}>{p}</p>)}
            <div className={`note ${L.note.kind === "watch" ? "watch" : ""}`}>
              {L.note.kind === "watch" ? <TriangleAlert size={18} /> : <Lightbulb size={18} />}
              <div><b>{L.note.kind === "watch" ? "要注意" : "重點"}</b><p>{L.note.text}</p></div>
            </div>
            <p className="ln-sub">這一步改變了什麼</p>
            <ul className="changed">
              {L.changed.map(([k, v]) => <li key={v}><span className={k === "+" ? "add" : k === "~" ? "chg" : "del"}>{k}</span>{v}</li>)}
            </ul>
            <span className="ln-flex" />
            <div className="ln-nav">
              <button onClick={() => go(step - 1)} disabled={step === 0}><ArrowLeft size={15} />上一步</button>
              {step < N - 1
                ? <button className="next" onClick={() => go(step + 1)}>下一步：{LESSON[step + 1].short}<ArrowRight size={15} /></button>
                : <a className="next" href={`#/ui/1`}>看實際操作畫面<MonitorPlay size={15} /></a>}
            </div>
            <p className="ln-keys"><kbd>←</kbd><kbd>→</kbd> 換步驟　<kbd>R</kbd> 重播　<kbd>Space</kbd> 暫停</p>
          </div>

          <div className="ln-card ln-pains">
            <p className="ln-sub">這套方案解決</p>
            <ul>
              {PAINS.map((p) => (
                <li key={p.text} className={step >= p.at ? "ok" : ""}>
                  <span className="box">{step >= p.at && <Check size={12} strokeWidth={3} />}</span>{p.text}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
