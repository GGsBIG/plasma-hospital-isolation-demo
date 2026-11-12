import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { ArrowDown, FileText, Pause, Play } from "lucide-react"
import { Platform } from "../components/Iso"
import { AgentChat } from "../components/AgentChat"
import { edgePath, sizeOf } from "../geometry"
import { useLayoutMode } from "../layout"
import type { NodeKind, Pos } from "../types"
import logo from "../assets/brobridge-logo.png"
import oracleLogo from "../assets/db/oracle.svg"
import postgresLogo from "../assets/db/postgresql.svg"
import mssqlLogo from "../assets/db/mssql.svg"
import mysqlLogo from "../assets/db/mysql.svg"
import { BRANCHES, DOCS, PAINS, RESULT_ROWS, ROSTER, STEPS } from "./content"
import "./story.css"

// 捲動敘事的段落:前四段講痛點(圖上畫面 0),後五段講 Plasma 的步驟(畫面 1),最後是成果
const BEATS = [...PAINS.map((_, k) => ({ screen: 0, step: k })), ...STEPS.map((_, k) => ({ screen: 1, step: k }))]
// 自動播放:每一段停留的毫秒數(上傳文件、AI 對話兩段動畫較長),最後停在成果
const DWELL = [4600, 4600, 4600, 4600, 5000, 7000, 12500, 5000, 5600]
const CONTACT = "mailto:contact@brobridge.com"
const AGENT_MS = 10500 // AI 對話動畫播完的時間
const BRAND: Record<string, string> = { a: oracleLogo, b: postgresLogo, c: mssqlLogo, d: mysqlLogo }

type Compact = boolean
// 舞台座標系(桌機橫向、手機直向)
// 手機版的積木會放大(layout.ts 的 iconScale),所以舞台座標系比較大,看板高度跟著比例走
const STAGE = (c: Compact, screen: number) =>
  c ? (screen === 0 ? { w: 900, h: 1100 } : { w: 900, h: 1150 }) : screen === 0 ? { w: 960, h: 680 } : { w: 1000, h: 640 }

// ---- 節點位置 ----
// 畫面 0 的分院資料庫下方多一行 schema,上下間距拉大;畫面 1 收緊,舞台矮一點、圖可以放大
function dbPos(i: number, c: Compact, screen: number): Pos {
  if (c) return { x: 112 + i * 225, y: 130 }
  return screen === 0 ? { x: 110, y: 100 + i * 160 } : { x: 110, y: 75 + i * 155 }
}
const P = (c: Compact) => ({
  manual: c ? { x: 220, y: 500 } : { x: 480, y: 320 },
  it: c ? { x: 680, y: 500 } : { x: 480, y: 565 },
  hqBefore: c ? { x: 450, y: 820 } : { x: 840, y: 320 },
  plasma: c ? { x: 300, y: 560 } : { x: 430, y: 310 },
  kbDy: c ? 124 : 86, // 知識庫疊在 Plasma 核心立方體頂面
  prod1: c ? { x: 740, y: 470 } : { x: 730, y: 185 },
  prod2: c ? { x: 740, y: 730 } : { x: 730, y: 435 },
  hq: c ? { x: 300, y: 970 } : { x: 900, y: 310 },
})
// 痛點標記的位置(畫面 0)與說明泡泡放哪一側
const MARK = (c: Compact): { p: Pos; side: "l" | "r" }[] =>
  c
    ? [{ p: { x: 330, y: 400 }, side: "r" }, { p: { x: 40, y: 40 }, side: "r" }, { p: { x: 790, y: 400 }, side: "l" }, { p: { x: 570, y: 720 }, side: "r" }]
    : [{ p: { x: 535, y: 220 }, side: "r" }, { p: { x: 250, y: 30 }, side: "r" }, { p: { x: 535, y: 470 }, side: "r" }, { p: { x: 895, y: 220 }, side: "l" }]

interface NodeSpec {
  id: string
  kind: NodeKind
  variant?: string
  pos: Pos
  label?: string
  sub?: ReactNode
  tone?: "ok" | "danger" | "idle"
  brand?: string
  dim?: boolean
  grow?: boolean // 知識庫:在 Plasma 上方長出來再疊上去
  bare?: boolean
}
interface EdgeSpec { from: string; to: string; tone: "red" | "ok" }

// 依目前的畫面與步驟,算出舞台上有哪些節點與連線
function scene(screen: number, step: number, c: Compact) {
  const p = P(c)
  const nodes: NodeSpec[] = BRANCHES.map((b, i) => ({
    id: `db-${b.id}`, kind: "db", pos: dbPos(i, c, screen), label: b.label, brand: BRAND[b.id],
    sub: screen === 0 && !c ? <code className="sc-code">{b.schema}</code> : undefined,
  }))
  const edges: EdgeSpec[] = []
  if (screen === 0) {
    nodes.push(
      { id: "manual", kind: "person", variant: "person-clock", pos: p.manual, label: "總院人工彙整", sub: "收集 4 份 Excel", tone: "danger" },
      { id: "it", kind: "person", pos: p.it, label: "各分院 IT", sub: "各寫各的 SQL", tone: "danger" },
      { id: "hq", kind: "app", variant: "receipt", pos: p.hqBefore, label: "總院彙整報表", sub: "人數兜不攏", tone: "danger" },
    )
    BRANCHES.forEach((b) => edges.push({ from: `db-${b.id}`, to: "manual", tone: "red" }))
    edges.push({ from: "manual", to: "hq", tone: "red" }, { from: "it", to: "hq", tone: "red" })
  } else {
    const s = screen === 2 ? 4 : step
    nodes.push({
      id: "plasma", kind: "plasma", pos: p.plasma,
      sub: s >= 1 ? "已讀懂四家欄位" : "唯讀接入 · 各分院工作區", tone: "ok",
    })
    if (s >= 1) nodes.push({ id: "kb", kind: "kb", pos: { x: p.plasma.x, y: p.plasma.y - p.kbDy }, bare: true, grow: s === 1 })
    BRANCHES.forEach((b) => edges.push({ from: `db-${b.id}`, to: "plasma", tone: "ok" }))
    if (s >= 3) {
      nodes.push(
        { id: "prod1", kind: "app", variant: "package", pos: p.prod1, label: "護理人員名冊", sub: "資料產品", tone: "ok" },
        { id: "prod2", kind: "app", variant: "package", pos: p.prod2, label: "護理排班表", sub: "資料產品", tone: "ok" },
      )
      edges.push({ from: "plasma", to: "prod1", tone: "ok" }, { from: "plasma", to: "prod2", tone: "ok" })
    }
    if (s >= 4) {
      nodes.push({ id: "hq", kind: "app", variant: "receipt", pos: p.hq, label: "總院彙整報表", sub: "四家合計 812 人", tone: "ok" })
      edges.push({ from: "prod1", to: "hq", tone: "ok" }, { from: "prod2", to: "hq", tone: "ok" })
    }
  }
  return { nodes, edges }
}

// ---- 舞台:固定座標系,等比縮放放進容器 ----
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

function IsoNode({ n }: { n: NodeSpec }) {
  const { a, t } = sizeOf(n.kind)
  return (
    <div className="sc-node" style={{ left: n.pos.x, top: n.pos.y, opacity: n.dim ? 0.3 : 1 }}>
      <div className={n.grow ? "kb-grow absolute" : "absolute"} style={n.grow ? { animationDelay: "2.3s" } : undefined}>
        <Platform kind={n.kind} variant={n.variant} bare={n.bare} />
      </div>
      {(n.label || n.sub) && (
        <div className="sc-label" style={{ top: a / 2 + t + 6 }}>
          {n.label && (
            <div className="sc-pill flex items-center justify-center gap-[0.35em] font-semibold text-foreground">
              {n.brand && <img src={n.brand} alt="" className="h-[1.15em] w-auto" />}
              {n.label}
            </div>
          )}
          {n.sub && <div className={`sc-pill sc-sub ${n.tone ? `tone-${n.tone}` : ""}`}>{n.sub}</div>}
        </div>
      )}
    </div>
  )
}

function Stage({ screen, step, compact, agent }: { screen: number; step: number; compact: boolean; agent: number }) {
  const S = STAGE(compact, screen)
  const { ref, k } = useFit(S.w, S.h)
  const { nodes, edges } = scene(screen, step, compact)
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const marks = MARK(compact)
  const p = P(compact)
  const showDocs = screen === 1 && step === 1
  const showAgent = screen === 1 && step === 2
  return (
    <div ref={ref} className={`relative h-full w-full ${compact ? "sc-compact" : ""} ${screen === 1 ? "sc-s1" : ""} ${showAgent ? "sc-agent-on" : ""}`}>
      <div className="sc-stage" style={{ width: S.w, height: S.h, transform: `${showAgent && !compact ? "translateX(-100px) " : ""}translate(-50%, -50%) scale(${showAgent && !compact ? k * 0.8 : k})` }}>
        <svg className="absolute inset-0 overflow-visible" width={S.w} height={S.h}>
          <defs>
            <radialGradient id="plasma-glow">
              <stop offset="0" style={{ stopColor: "var(--iso-glow)", stopOpacity: "var(--iso-glow-opacity)" }} />
              <stop offset="1" style={{ stopColor: "var(--iso-glow)", stopOpacity: 0 }} />
            </radialGradient>
          </defs>
          {edges.map((e) => {
            const f = byId[e.from]
            const t = byId[e.to]
            const d = edgePath(f.pos, f.kind, t.pos, t.kind, compact)
            return (
              <g key={`${screen}-${e.from}-${e.to}`} className="sc-fade">
                {e.tone === "red" ? (
                  <path d={d} className="sc-edge red" />
                ) : (
                  <>
                    <path d={d} className="sc-edge ok-base" />
                    <path d={d} className="sc-edge ok-flow" />
                  </>
                )}
              </g>
            )
          })}
        </svg>
        {nodes.map((n) => <IsoNode key={n.id + (n.grow ? "-grow" : "")} n={n} />)}

        {/* 畫面 0:痛點編號標在問題發生的位置,目前講到的那個放大並跳出一句說明 */}
        {screen === 0 &&
          marks.map((m, i) => (
            <div key={i} className={`sc-mark ${i === step ? "on" : ""}`} style={{ left: m.p.x, top: m.p.y }}>
              <span className="sc-mark-dot">{i + 1}</span>
              {i === step && !compact && <span className={`sc-bubble ${m.side === "l" ? "left" : ""}`}>{PAINS[i].bubble}</span>}
            </div>
          ))}

        {/* 手機:說明泡泡固定在圖的下方置中,不會蓋到其他標記 */}
        {screen === 0 && compact && (
          <div key={step} className="sc-bubble sc-bubble-c" style={{ left: S.w / 2, top: S.h - 70 }}>
            <b className="mr-2">{step + 1}</b>{PAINS[step].bubble}
          </div>
        )}

        {/* 步驟 2:文件飛進 Plasma */}
        {showDocs &&
          DOCS.map((name, i) => {
            const x0 = compact ? 120 : 250
            const y0 = compact ? -285 + i * 60 : -170 + i * 46
            return (
              <div key={name} className="sc-doc-anchor" style={{ left: p.plasma.x, top: p.plasma.y - p.kbDy }}>
                <div className="sc-doc" style={{ "--x0": `${x0}px`, "--y0": `${y0}px`, animationDelay: `${0.15 * i}s` } as CSSProperties}>
                  <FileText className="h-[1.2em] w-[1.2em] text-muted-foreground" />
                  {name}
                </div>
              </div>
            )
          })}
      </div>

      {/* 步驟 3:AI Agent 對話 */}
      {showAgent && (
        <div className={`sc-agent absolute ${compact ? "inset-0" : "bottom-6 right-0 top-6 w-[420px]"}`}>
          <AgentChat progress={agent} />
        </div>
      )}
    </div>
  )
}

// ---- 左側敘事段落 ----
function Beat({ i, active, children }: { i: number; active: boolean; children: ReactNode }) {
  return (
    <section data-beat={i} className={`sc-beat ${active ? "on" : ""}`}>
      <div className="sc-beat-body">{children}</div>
    </section>
  )
}

function PainBeat({ k }: { k: number }) {
  const p = PAINS[k]
  return (
    <>
      <div className="sc-num-big">{k + 1}</div>
      <h3 className="sc-beat-title">{p.title}</h3>
      <p className="sc-beat-text">{p.desc}</p>
      {k === 1 && (
        <dl className="sc-schema">
          {BRANCHES.map((b) => (
            <div key={b.id}>
              <dt>{b.label}</dt>
              <dd><code>{b.schema}</code></dd>
            </div>
          ))}
        </dl>
      )}
    </>
  )
}

function StepBeat({ k }: { k: number }) {
  const s = STEPS[k]
  const solves = k < PAINS.length
  return (
    <>
      <div className="sc-num-big ink">{k + 1}</div>
      <h3 className="sc-beat-title">{s.title}</h3>
      <p className="sc-beat-text">{s.desc}</p>
      {k === 1 && (
        <ul className="sc-docs">
          {DOCS.map((d) => <li key={d}><FileText className="h-4 w-4" strokeWidth={1.75} />{d}</li>)}
        </ul>
      )}
      {k === 2 && <blockquote className="sc-quote">「把四家分院的護理人員整理成同一張表：員工編號、姓名、職稱、單位、分院。」</blockquote>}
      {k === 4 && (
        <p className="sc-total"><span className="t-num">812</span> 人<small>四家分院護理人員合計（示意數字）</small></p>
      )}
      {solves && (
        <p className="sc-solves"><span className="sc-sq">{k + 1}</span>解決：{PAINS[k].title}</p>
      )}
    </>
  )
}

// ---- 成果:捲到最後的收尾 ----
function Results() {
  const max = Math.max(...ROSTER.map((r) => r.n))
  const total = ROSTER.reduce((a, r) => a + r.n, 0)
  return (
    <section id="results" className="sc-results">
      <div className="sc-results-inner">
        <h2 className="sc-h-chapter sc-results-title"><span>四家分院，一份資料，</span><span>總院隨時彙整。</span></h2>
        <div className="sc-results-grid">
          <div>
            <h3 className="sc-h-block">導入前後對照</h3>
            <table className="sc-compare">
              <thead><tr><th scope="col"><span className="sr-only">項目</span></th><th scope="col">現在</th><th scope="col" className="red">導入 Plasma 後</th></tr></thead>
              <tbody>
                {RESULT_ROWS.map(([k, a, b]) => (
                  <tr key={k}><th scope="row">{k}</th><td className="muted" data-label="現在">{a}</td><td data-label="導入後">{b}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="sc-h-block">總院彙整：各分院護理師人數</h3>
            <div className="sc-roster">
              {ROSTER.map((r) => (
                <div key={r.label} className="sc-roster-row">
                  <span>{r.label}</span>
                  <span className="bar"><i style={{ width: `${(r.n / max) * 100}%` }} /></span>
                  <span className="t-num">{r.n}</span>
                </div>
              ))}
              <div className="sc-roster-total"><span>合計</span><span className="t-num">{total}</span></div>
            </div>
            <p className="sc-note">來源：資料產品「護理人員名冊」。人數為示意數字。</p>
          </div>
        </div>
        <div className="sc-close">
          <p>想看 Plasma 接上貴院的資料庫會是什麼樣子？</p>
          <div className="flex flex-wrap gap-3">
            <a className="btn-bar primary" href={CONTACT}>預約專人諮詢</a>
            <button className="btn-bar" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>從頭再看一次</button>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Story() {
  const compact = useLayoutMode() !== "desktop"
  const [beat, setBeat] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [agent, setAgent] = useState(0)
  const [inResults, setInResults] = useState(false)
  const { screen, step } = BEATS[beat]

  // 目前的段落:跨過「判定線」的那一段(桌機在畫面中間,手機在釘住的圖下方那塊的中間)
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
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure) }
    measure()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf) }
  }, [compact])

  const goBeat = useCallback((i: number) => {
    if (i >= BEATS.length) { document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }); return }
    const el = document.querySelector<HTMLElement>(`[data-beat="${Math.max(0, i)}"]`)
    if (!el) return
    const pin = document.querySelector<HTMLElement>(".sc-pin")
    const top = compact && pin ? 71 + pin.offsetHeight : 71
    const y = el.getBoundingClientRect().top + window.scrollY - top - 24
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" })
  }, [compact])
  const cur = inResults ? BEATS.length : beat
  const next = useCallback(() => goBeat(cur + 1), [goBeat, cur])
  const prev = useCallback(() => goBeat(cur - 1), [goBeat, cur])

  // 自動播放:每段停留固定時間再往下,捲到成果就停
  useEffect(() => {
    if (!playing) return
    if (inResults) { setPlaying(false); return }
    const t = setTimeout(next, DWELL[beat])
    return () => clearTimeout(t)
  }, [playing, beat, inResults, next])

  // AI 對話:進到步驟 3 時從頭播
  useEffect(() => {
    if (!(screen === 1 && step === 2)) return
    setAgent(0)
    const t0 = performance.now() + 300
    let raf = 0
    const tick = (now: number) => {
      const v = Math.min(1, Math.max(0, (now - t0) / AGENT_MS))
      setAgent(v)
      if (v < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [screen, step])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); setPlaying(false); next() }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); setPlaying(false); prev() }
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev])

  const chapter = inResults ? 2 : screen
  const jump = (c: number) => { setPlaying(false); c === 2 ? goBeat(BEATS.length) : goBeat(c === 0 ? 0 : PAINS.length) }

  return (
    <div className={`sc-page ${screen === 1 && step === 2 && !inResults ? "agenting" : ""}`}>
      <h1 className="sr-only">Plasma × 秀傳醫院 跨院資料整合</h1>
      <header className="sc-header">
        <a href="../#showchwan" target="_top" aria-label="回到 Plasma Demo 首頁" className="shrink-0">
          <img src={logo} alt="Brobridge" className="h-[16px] w-auto md:h-[18px]" />
        </a>
        <span className="sc-crumb">Plasma × 秀傳醫院</span>
        <nav className="sc-chapters" aria-label="章節">
          {["現在的問題", "解決流程", "成果"].map((t, i) => (
            <button key={t} onClick={() => jump(i)} className={chapter === i ? "on" : ""} aria-current={chapter === i ? "true" : undefined}>{t}</button>
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
            <Stage screen={screen} step={step} compact={compact} agent={agent} />
            <ol className="sc-rail" aria-hidden="true">
              {BEATS.map((_, i) => <li key={i} className={i === beat && !inResults ? "on" : i < beat || inResults ? "past" : ""} />)}
            </ol>
          </div>
        </div>

        <div className="sc-narr">
          <header className="sc-chapter-head">
            <h2 className="sc-h-chapter">總院統計不出來</h2>
            <p className="sc-lead">秀傳有四家分院，各有一套 HIS 資料庫，資料表與欄位寫法都不同。總院想知道「各分院的護理師有誰」，到現在還兜不起來。</p>
          </header>
          {PAINS.map((_, k) => (
            <Beat key={`p${k}`} i={k} active={beat === k && !inResults}><PainBeat k={k} /></Beat>
          ))}

          <header className="sc-chapter-head second">
            <h2 className="sc-h-chapter">Plasma 怎麼解決</h2>
            <p className="sc-lead">四個步驟，各解決一個痛點，最後總院直接取用整理好的資料。</p>
          </header>
          {STEPS.map((_, k) => (
            <Beat key={`s${k}`} i={PAINS.length + k} active={beat === PAINS.length + k && !inResults}><StepBeat k={k} /></Beat>
          ))}
          <p className="sc-more"><ArrowDown className="h-4 w-4" />往下看成果</p>
        </div>
      </div>

      <Results />
      <p className="sc-keys">← → 換段落　空白鍵自動播放</p>
    </div>
  )
}
