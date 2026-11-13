import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { FileText } from "lucide-react"
import { Platform } from "./components/Iso"
import { BrainNet, brainVisibility } from "./components/BrainNet"
import { edgePath, sizeOf } from "./geometry"
import type { NodeKind, Pos } from "./types"
import oracleLogo from "./assets/db/oracle.svg"
import postgresLogo from "./assets/db/postgresql.svg"
import mssqlLogo from "./assets/db/mssql.svg"
import { A_DBS, KB_FILES } from "@/demo/data"
import { STEPS } from "@/sc/steps"
import "./scn.css"

// 情境圖:A 分院的三套資料庫 → Plasma → 名冊／資料產品。
// 每個情境的圖自己依時間播放(不等左邊的操作),換情境或按重播就從頭播
const W = 1000
const H = 680
const BRAND = [oracleLogo, postgresLogo, mssqlLogo]
const TICK = 1500 // 子步驟間隔
const DIALECT = ["WHERE ROWNUM <= 10", "LIMIT 10", "SELECT TOP 10"]

interface N { id: string; kind: NodeKind; variant?: string; pos: Pos; label?: string; sub?: ReactNode; tone?: "ok" | "danger"; brand?: string; grow?: boolean; bare?: boolean; hot?: boolean }
interface E { from: string; to: string; tone: "red" | "ok" }
interface Note { at: Pos; text: string; tone: "red" | "ink" }

const PLASMA = { x: 430, y: 360 }
const KB_DY = 86
const RIGHT = { x: 800, y: 360 }
const db = (i: number) => `db${i}`

function scene(k: number, t: number) {
  const nodes: N[] = A_DBS.map((d, i) => ({
    id: db(i), kind: "db" as const, pos: { x: 110, y: 170 + i * 175 }, label: d.name, brand: BRAND[i],
    sub: k === 0 ? (t >= 1 ? <code className="scn-code">{DIALECT[i]}</code> : undefined)
      : k === 4 && t === 0 ? <code className="scn-code">{DIALECT[i]}</code>
      : k === 2 ? (t > i ? "唯讀" : undefined) : k >= 3 ? "唯讀" : undefined,
    tone: k >= 2 ? ("ok" as const) : undefined,
    hot: (k === 0 && t === 1) || (k === 2 && t === i) || (k === 4 && t >= 1),
  }))
  const edges: E[] = []
  let note: Note | null = null

  if (k === 0) {
    nodes.push({ id: "it", kind: "person", variant: "person-clock", pos: PLASMA, label: "IT", sub: t >= 1 ? "寫三種語法" : undefined, tone: "danger", hot: t === 1 })
    nodes.push({ id: "out", kind: "app", variant: "receipt", pos: RIGHT, label: "護理人員名冊", sub: t >= 2 ? "整理不出來" : undefined, tone: "danger", hot: t >= 2 })
    A_DBS.forEach((_, i) => edges.push({ from: db(i), to: "it", tone: "red" }))
    if (t >= 2) edges.push({ from: "it", to: "out", tone: "red" })
    note = t >= 2 ? { at: { x: 430, y: 170 }, text: "TITLE_CD、NRS_NAME 是什麼？", tone: "red" } : t >= 1 ? { at: { x: 430, y: 170 }, text: "三套資料庫，三種語法", tone: "red" } : null
    return { nodes, edges, note }
  }

  const ps = k === 1 ? "已登入" : k === 2 ? "唯讀接上" : k === 3 ? (t >= 1 ? "長出大腦" : "讀文件") : undefined
  nodes.push({ id: "plasma", kind: "plasma", pos: PLASMA, sub: ps, tone: "ok", hot: k === 1 || (k === 4 && t >= 1) })
  if (k >= 3) nodes.push({ id: "kb", kind: "kb", pos: { x: PLASMA.x, y: PLASMA.y - KB_DY }, bare: true, grow: k === 3 })
  const linked = k === 2 ? t : k >= 3 ? 3 : 0
  A_DBS.slice(0, Math.min(linked, 3)).forEach((_, i) => edges.push({ from: db(i), to: "plasma", tone: "ok" }))
  if (k === 2 && t >= 3) note = { at: { x: 430, y: 170 }, text: "唯讀接上，不動原系統", tone: "ink" }
  if (k === 3 && t >= 2) note = { at: { x: 780, y: 200 }, text: "N02 = 護理師", tone: "ink" }

  if (k === 4) {
    if (t === 0) note = { at: { x: 430, y: 150 }, text: "以前：三套資料庫，三種語法", tone: "red" }
    else {
      nodes.push({ id: "out", kind: "app", variant: "receipt", pos: RIGHT, label: "查詢結果", sub: "姓名 · 單位 · 班別", tone: "ok", hot: true })
      edges.push({ from: "plasma", to: "out", tone: "ok" })
      note = { at: { x: 430, y: 150 }, text: "現在：一句 SQL 查三套", tone: "ink" }
    }
  }
  if (k === 5) {
    nodes.push({ id: "ai", kind: "app", pos: RIGHT, label: "AI Agent", sub: t >= 2 ? "名冊完成" : "問答整理", tone: "ok", hot: t < 2 })
    edges.push({ from: "plasma", to: "ai", tone: "ok" })
    if (t >= 2) note = { at: { x: 800, y: 250 }, text: "248 位護理師", tone: "ink" }
  }
  if (k === 6) {
    nodes.push({ id: "prod", kind: "app", variant: "package", pos: RIGHT, label: "護理人員名冊", sub: "資料產品", tone: "ok", hot: t === 0 })
    edges.push({ from: "plasma", to: "prod", tone: "ok" })
    if (t >= 1) note = { at: { x: 800, y: 250 }, text: "來源更新，自動更新", tone: "ink" }
  }
  return { nodes, edges, note }
}

function useFit() {
  const ref = useRef<HTMLDivElement>(null)
  const [k, setK] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setK(Math.min(el.clientWidth / W, el.clientHeight / H)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, k }
}

function IsoNode({ n }: { n: N }) {
  const { a, t } = sizeOf(n.kind)
  return (
    <div className={`scn-node ${n.hot ? "hot" : ""}`} style={{ left: n.pos.x, top: n.pos.y }}>
      {n.hot && <span className="scn-pulse" aria-hidden="true" />}
      <div className={n.grow ? "kb-grow absolute" : "absolute"} style={n.grow ? { animationDelay: "1.6s" } : undefined}>
        <Platform kind={n.kind} variant={n.variant} bare={n.bare} />
      </div>
      {(n.label || n.sub) && (
        <div className="scn-label" style={{ top: a / 2 + t + 6 }}>
          {n.label && <div className="scn-pill scn-name">{n.brand && <img src={n.brand} alt="" />}{n.label}</div>}
          {n.sub && <div className={`scn-pill scn-sub ${n.tone ? `tone-${n.tone}` : ""}`}>{n.sub}</div>}
        </div>
      )}
    </div>
  )
}

/** 情境圖:step 換了或 epoch(重播)變了,就從第 0 個子步驟開始,依時間自己往下播 */
export function Scenario({ step, epoch }: { step: number; epoch: number }) {
  const { ref, k } = useFit()
  const [t, setT] = useState(0)
  const total = STEPS[step].subs.length
  useEffect(() => {
    setT(0)
    let n = 0
    const id = setInterval(() => {
      n++
      setT(n)
      if (n >= total) clearInterval(id)
    }, step === 3 ? 2400 : TICK) // 上傳文件那一步:文件飛進去要久一點
    return () => clearInterval(id)
  }, [step, epoch, total])

  const tt = Math.min(t, total)
  const { nodes, edges, note } = scene(step, tt)
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const brain = step > 3 || (step === 3 && tt >= 1)
  brainVisibility.shown = brain
  const st = STEPS[step]
  return (
    <div className="scn">
      <div className="scn-caption">
        <span className="scn-step">{step + 1}</span>
        <div>
          <p className="scn-title">{st.title}</p>
          <ol className="scn-checks">
            {st.subs.map((s, i) => <li key={i} className={i < tt ? "ok" : i === tt ? "now" : ""}>{s}</li>)}
          </ol>
        </div>
      </div>
      <div ref={ref} className="scn-board">
        <div className="scn-stage" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${k})` }}>
          {brain && (
            <div key={`brain-${step}-${epoch}`} className="absolute" style={{ left: PLASMA.x, top: PLASMA.y - 40 }}>
              <div className="brain-aura absolute rounded-full" style={{ width: 620, height: 500, left: -310, top: -250 }} />
              <BrainNet width={640} delay={step === 3 ? 0.3 : 0} mode={step === 3 ? "full" : "idle"} />
            </div>
          )}
          <svg className="absolute inset-0 overflow-visible" width={W} height={H}>
            <defs>
              <radialGradient id="plasma-glow">
                <stop offset="0" style={{ stopColor: "var(--iso-glow)", stopOpacity: "var(--iso-glow-opacity)" }} />
                <stop offset="1" style={{ stopColor: "var(--iso-glow)", stopOpacity: 0 }} />
              </radialGradient>
            </defs>
            {edges.map((e) => {
              const f = byId[e.from]
              const to = byId[e.to]
              const d = edgePath(f.pos, f.kind, to.pos, to.kind)
              return (
                <g key={`${step}-${epoch}-${e.from}-${e.to}`} className="scn-fade">
                  {e.tone === "red" ? <path d={d} className="scn-edge red" /> : <><path d={d} className="scn-edge base" /><path d={d} className="scn-edge flow" /></>}
                </g>
              )
            })}
          </svg>
          {nodes.map((n) => <IsoNode key={`${n.id}-${n.grow ? `grow-${epoch}` : ""}`} n={n} />)}
          {note && <div key={`${step}-${epoch}-${note.text}`} className={`scn-note ${note.tone}`} style={{ left: note.at.x, top: note.at.y }}>{note.text}</div>}
          {step === 3 && tt === 0 && KB_FILES.map((name, i) => (
            <div key={`${name}-${epoch}`} className="scn-doc-anchor" style={{ left: PLASMA.x, top: PLASMA.y - KB_DY }}>
              <div className="scn-doc" style={{ "--x0": "260px", "--y0": `${-170 + i * 46}px`, animationDelay: `${0.12 * i}s` } as CSSProperties}>
                <FileText className="h-4 w-4" />{name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
