import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { ArrowDown, ArrowRight, Pause, Play } from "lucide-react"
import { Platform } from "../components/Iso"
import { edgePath, sizeOf } from "../geometry"
import { useLayoutMode } from "../layout"
import logo from "../assets/brobridge-logo.png"
import { GAP, INTROS, OUTCOMES, beats, nodePos, type Beat, type BeatNode, type IntroKey } from "./content"
import "./story.css"

// 同一份程式三個版本:<div id="root" data-intro="exec|general|hospital">
const KEY = (document.getElementById("root")?.dataset.intro ?? "exec") as IntroKey
const C = INTROS[KEY]
const CONTACT = "mailto:contact@brobridge.com"
const DWELL = 5200 // 自動播放每段停留

const STAGE = (c: boolean) => (c ? { w: 900, h: 1320 } : { w: 1000, h: 620 })

const POC = [
  { title: "挑一份最痛的報表", body: "從現在最花時間、最常被催的那一份開始。" },
  { title: "唯讀接上一到兩套系統", body: "不改系統、不搬資料，只在外面讀。" },
  { title: "兩週內看到成果", body: "用你們自己的資料，看報表從等好幾天變成馬上出來。" },
]

function useFit(w: number, h: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [k, setK] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setK(Math.min(el.clientWidth / w, el.clientHeight / h)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [w, h])
  return { ref, k }
}

function IsoNode({ n, x, y }: { n: BeatNode; x: number; y: number }) {
  const { a, t } = sizeOf(n.kind)
  return (
    <div className="sc-node" style={{ left: x, top: y }}>
      <div className="absolute"><Platform kind={n.kind} variant={n.variant} /></div>
      {(n.label || n.sub) && (
        <div className="sc-label" style={{ top: a / 2 + t + 6 }}>
          {n.label && <div className="sc-pill font-semibold text-foreground">{n.label}</div>}
          {n.sub && <div className={`sc-pill sc-sub ${n.tone ? `tone-${n.tone}` : ""}`}>{n.sub}</div>}
        </div>
      )}
    </div>
  )
}

/** 釘住的流程圖:依目前段落畫出節點、連線、標記;換段時節點滑到新位置、新的連線淡入 */
function Stage({ beat, b, compact }: { beat: number; b: Beat; compact: boolean }) {
  const S = STAGE(compact)
  const { ref, k } = useFit(S.w, S.h)
  const pos = (id: string) => nodePos(id, beat, compact)
  const kindOf = Object.fromEntries(b.nodes.map((n) => [n.id, n.kind]))
  // 各系統的外框(「為什麼放心」那段的框線)
  const sysPts = ["s0", "s1", "s2", "s3"].map(pos)
  const zone = compact
    ? { x: 0, y: 20, w: 900, h: 250 }
    : { x: Math.min(...sysPts.map((p) => p.x)) - 105, y: Math.min(...sysPts.map((p) => p.y)) - 70, w: 210, h: Math.max(...sysPts.map((p) => p.y)) - Math.min(...sysPts.map((p) => p.y)) + 180 }
  return (
    <div ref={ref} className={`relative h-full w-full ${compact ? "sc-compact" : ""}`}>
      <div className="sc-stage" style={{ width: S.w, height: S.h, transform: `translate(-50%, -50%) scale(${k})` }}>
        <svg className="absolute inset-0 overflow-visible" width={S.w} height={S.h}>
          <defs>
            <radialGradient id="plasma-glow">
              <stop offset="0" style={{ stopColor: "var(--iso-glow)", stopOpacity: "var(--iso-glow-opacity)" }} />
              <stop offset="1" style={{ stopColor: "var(--iso-glow)", stopOpacity: 0 }} />
            </radialGradient>
          </defs>
          {b.zone && (
            <g className="sc-fade">
              <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} className="ip-zone" />
            </g>
          )}
          {b.edges.map((e) => {
            const d = edgePath(pos(e.from), kindOf[e.from], pos(e.to), kindOf[e.to], compact)
            return (
              <g key={`${beat}-${e.from}-${e.to}`} className="sc-fade">
                {e.tone === "red" ? <path d={d} className="sc-edge red" />
                  : e.tone === "plain" ? <path d={d} className="sc-edge plain" />
                  : <><path d={d} className="sc-edge ok-base" /><path d={d} className="sc-edge ok-flow" /></>}
              </g>
            )
          })}
        </svg>
        {b.nodes.map((n) => { const p = pos(n.id); return <IsoNode key={n.id} n={n} x={p.x} y={p.y} /> })}
        {b.zone && <div className="ip-zone-label sc-fade" style={{ left: zone.x + zone.w / 2, top: zone.y + zone.h + 8 }}>{b.zone}</div>}
        {b.marks?.map((m) => {
          const p = m.at === "gap" ? GAP(compact) : pos(m.at)
          const dy = m.at === "gap" ? 0 : -(sizeOf(kindOf[m.at]).a / 2 + 70)
          return (
            <div key={`${beat}-${m.at}`} className={`sc-callout ${m.tone} ${m.side === "l" ? "left" : ""}`} style={{ left: p.x, top: p.y + dy }}>
              {m.text}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Results({ si }: { si: number }) {
  const s = C.scenarios[si]
  const outcomes = [OUTCOMES[s.outcome], ...OUTCOMES.filter((_, i) => i !== s.outcome)]
  const [copied, setCopied] = useState(false)
  const boss = C.boss(s)
  const copy = async () => {
    try { await navigator.clipboard.writeText(boss); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* 不支援就讓使用者自己選取 */ }
  }
  return (
    <section id="results" className="sc-results">
      <div className="sc-results-inner">
        <h2 className="sc-h-chapter">其他企業接上之後</h2>
        <ul className="ip-outcomes">
          {outcomes.map((o) => (
            <li key={o.industry}>
              <p className="ip-o-what">{o.industry} · {o.what}</p>
              <p className="ip-o-nums"><s>{o.before}</s><ArrowRight className="h-6 w-6" /><b className="t-num">{o.after}</b></p>
            </li>
          ))}
        </ul>
        <p className="sc-note">依產業匿名呈現，數字來自實際導入成效。</p>

        <h2 className="sc-h-chapter mt-24">兩週，用你們自己的資料試一次</h2>
        <ol className="ip-poc">
          {POC.map((p, i) => <li key={p.title}><span className="t-num">{i + 1}</span><h3>{p.title}</h3><p>{p.body}</p></li>)}
        </ol>
        <div className="sc-close">
          <p>想看 Plasma 接上你們的系統會是什麼樣子？</p>
          <div className="flex flex-wrap gap-3">
            <a className="btn-bar primary" href={CONTACT}>預約專人諮詢</a>
            <button className="btn-bar" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>從頭再看一次</button>
          </div>
        </div>
      </div>
      <div className="ip-boss">
        <div className="sc-results-inner">
          <h2 className="sr-only">帶回去跟老闆說的一句話</h2>
          <blockquote>{boss}</blockquote>
          <button className="btn-bar small" onClick={copy}>{copied ? "已複製" : "複製這句話，帶回去跟老闆說"}</button>
        </div>
      </div>
    </section>
  )
}

export function Story() {
  const compact = useLayoutMode() !== "desktop"
  const [si, setSi] = useState(0)
  const s = C.scenarios[si]
  const BEATS = beats(s)
  const firstFix = BEATS.findIndex((b) => b.chapter === 1)
  const [beat, setBeat] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [inResults, setInResults] = useState(false)

  useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      const els = [...document.querySelectorAll<HTMLElement>("[data-beat]")]
      const pin = document.querySelector<HTMLElement>(".sc-pin")
      const top = compact && pin ? pin.getBoundingClientRect().bottom : 71
      const line = top + (window.innerHeight - top) * 0.45
      let cur = 0
      els.forEach((el, i) => { if (el.getBoundingClientRect().top <= line) cur = i })
      setBeat(cur)
      const res = document.getElementById("results")
      setInResults(!!res && res.getBoundingClientRect().top < window.innerHeight * 0.6)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(measure) }
    measure()
    window.addEventListener("scroll", on, { passive: true })
    window.addEventListener("resize", on)
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf) }
  }, [compact])

  const goBeat = useCallback((i: number) => {
    if (i >= BEATS.length) { document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }); return }
    const el = document.querySelector<HTMLElement>(`[data-beat="${Math.max(0, i)}"]`)
    if (!el) return
    const pin = document.querySelector<HTMLElement>(".sc-pin")
    const top = compact && pin ? 71 + pin.offsetHeight : 71
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - top - 24), behavior: "smooth" })
  }, [compact, BEATS.length])
  const cur = inResults ? BEATS.length : beat
  const next = useCallback(() => goBeat(cur + 1), [goBeat, cur])
  const prev = useCallback(() => goBeat(cur - 1), [goBeat, cur])

  useEffect(() => {
    if (!playing) return
    if (inResults) { setPlaying(false); return }
    const t = setTimeout(next, DWELL)
    return () => clearTimeout(t)
  }, [playing, beat, inResults, next])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); setPlaying(false); next() }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); setPlaying(false); prev() }
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev])

  const chapter = inResults ? 2 : BEATS[beat].chapter
  const jump = (c: number) => { setPlaying(false); goBeat(c === 0 ? 0 : c === 1 ? firstFix : BEATS.length) }

  return (
    <div className="sc-page">
      <h1 className="sr-only">認識 Plasma</h1>
      <header className="sc-header">
        <a href={`../../#intro-${KEY}`} target="_top" aria-label="回到 Plasma Demo 首頁" className="shrink-0">
          <img src={logo} alt="Brobridge" className="h-[16px] w-auto md:h-[18px]" />
        </a>
        <span className="sc-crumb">{C.crumb}</span>
        <nav className="sc-chapters" aria-label="章節">
          {[["現在的問題", "問題"], ["Plasma 怎麼解", "解法"], ["成果與下一步", "成果"]].map(([t, short], i) => (
            <button key={t} onClick={() => jump(i)} className={chapter === i ? "on" : ""} aria-current={chapter === i ? "true" : undefined}><span className="sc-hide-sm">{t}</span><span className="sc-show-sm">{short}</span></button>
          ))}
        </nav>
        <span className="flex-1" />
        <button onClick={() => setPlaying((p) => !p)} className="btn-bar small" aria-pressed={playing}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          <span className="sc-hide-sm">{playing ? "暫停" : "自動播放"}</span>
        </button>
        <a className="btn-bar small primary sc-hide-md" href={CONTACT}>預約專人諮詢</a>
      </header>

      <div className="sc-story">
        <div className="sc-pin">
          <div className="sc-pin-inner">
            <Stage beat={inResults ? BEATS.length - 1 : beat} b={BEATS[inResults ? BEATS.length - 1 : beat]} compact={compact} />
            <ol className="sc-rail" aria-hidden="true">
              {BEATS.map((_, i) => <li key={i} className={i === beat && !inResults ? "on" : i < beat || inResults ? "past" : ""} />)}
            </ol>
          </div>
        </div>

        <div className="sc-narr">
          <header className="sc-chapter-head">
            <h2 className="sc-h-chapter">{C.headline.split("，").map((l, i, a) => <span key={i} className="block">{l}{i < a.length - 1 ? "，" : ""}</span>)}</h2>
            <p className="sc-lead">{C.lead(s)}</p>
            {C.scenarios.length > 1 && (
              <div className="ip-switch" role="group" aria-label="選擇產業">
                <span>看你的產業</span>
                {C.scenarios.map((x, i) => (
                  <button key={x.label} className={i === si ? "on" : ""} aria-pressed={i === si} onClick={() => setSi(i)}>{x.label}</button>
                ))}
              </div>
            )}
          </header>
          {BEATS.map((b, i) => (
            <div key={i}>
              {i === firstFix && (
                <header className="sc-chapter-head second">
                  <h2 className="sc-h-chapter">Plasma 怎麼解</h2>
                  <p className="sc-lead ip-one">{C.oneLiner(s)}</p>
                </header>
              )}
              <section data-beat={i} className={`sc-beat ${beat === i && !inResults ? "on" : ""}`}>
                <div className="sc-beat-body">
                  <div className={`sc-num-big ${b.chapter === 1 ? "ink" : ""}`}>{i < firstFix ? i + 1 : i - firstFix + 1}</div>
                  <h3 className="sc-beat-title">{b.title}</h3>
                  <p className="sc-beat-text">{b.text}</p>
                  {b.solves && <p className="sc-solves"><span className="sc-sq" aria-hidden="true" />解決：{b.solves}</p>}
                </div>
              </section>
            </div>
          ))}
          <p className="sc-more"><ArrowDown className="h-4 w-4" />往下看成果與下一步</p>
        </div>
      </div>

      <Results si={si} />
      <p className="sc-keys">← → 換段落　空白鍵自動播放</p>
    </div>
  )
}
