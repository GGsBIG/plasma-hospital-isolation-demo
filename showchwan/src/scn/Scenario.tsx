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

// 三次貝茲曲線長度(edgePath 產生的 "M x y C ...")
function bezLen(d: string) {
  const v = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
  const [x0, y0, x1, y1, x2, y2, x3, y3] = v
  let len = 0, px = x0, py = y0
  for (let i = 1; i <= 40; i++) {
    const t = i / 40, u = 1 - t
    const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3
    const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
    len += Math.hypot(x - px, y - py); px = x; py = y
  }
  return len
}

// 連線上流動的點/虛線:每一段是一個沿路徑移動的小方塊(offset-path),只改位置不重畫;
// 原本用 SVG stroke-dashoffset 動畫,整張情境圖每格都要重畫,手機會卡
function Ride({ d, gap, speed, cls }: { d: string; gap: number; speed: number; cls: string }) {
  const len = bezLen(d)
  const n = Math.max(1, Math.round(len / gap))
  const dur = len / speed
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`scn-ride ${cls}`} style={{ offsetPath: `path("${d}")`, animationDuration: `${dur}s`, animationDelay: `${(-i * dur) / n}s` }} />
      ))}
    </>
  )
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
export function Scenario({ step, epoch, isMain }: { step: number; epoch: number; isMain: boolean }) {
  const { ref, k } = useFit()
  const [t, setT] = useState(0)
  const intro = step === 0 // 現況:右側列出痛點,再一步步帶出「在 Plasma 裡怎麼做」
  const ROAD = STEPS.slice(1)
  const total = STEPS[step].subs.length + (intro ? ROAD.length : 0)
  useEffect(() => {
    setT(0)
    let n = 0
    const id = setInterval(() => {
      n++
      setT(n)
      if (n >= total) clearInterval(id)
    }, step === 2 ? 2400 : TICK) // 上傳文件那一步:文件飛進去要久一點
    return () => clearInterval(id)
  }, [step, epoch, total])

  const tt = Math.min(t, total)
  const ts = Math.min(tt, STEPS[step].subs.length) // 圖與子步驟用
  const dk = step === 0 ? 0 : step + 1 // 圖的狀態編號:登入那張(1)已拿掉
  const { nodes, edges, note } = scene(dk, ts)
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const brain = dk > 3 || (dk === 3 && ts >= 1)
  brainVisibility.shown = brain
  const st = STEPS[step]
  return (
    <div className="scn">
      <div className="scn-caption">
        <span className="scn-step">{step + 1}</span>
        <div>
          <p className="scn-title">{st.title}</p>
          <ol className="scn-checks">
            {st.subs.map((s, i) => <li key={i} className={i < ts ? "ok" : i === ts ? "now" : ""}>{s}</li>)}
          </ol>
        </div>
      </div>
      {/* 情境 2 起:情境圖放大時,痛點列在標題下 */}
      {!intro && isMain && (
        <ul className="scn-pains inline">{st.pains.map((p) => <li key={p}>{p}</li>)}</ul>
      )}
      <div className={intro ? "scn-row" : "contents"}>
      <div ref={ref} className="scn-board">
        <div className="scn-stage" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${k})` }}>
          {brain && (
            <div key={`brain-${step}-${epoch}`} className="absolute" style={{ left: PLASMA.x, top: PLASMA.y - 40 }}>
              <div className="brain-aura absolute rounded-full" style={{ width: 620, height: 500, left: -310, top: -250 }} />
              <BrainNet width={640} delay={dk === 3 ? 0.3 : 0} mode={dk === 3 ? "full" : "idle"} />
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
                  {e.tone !== "red" && <path d={d} className="scn-edge base" />}
                </g>
              )
            })}
          </svg>
          {edges.map((e) => {
            const f = byId[e.from]
            const to = byId[e.to]
            const d = edgePath(f.pos, f.kind, to.pos, to.kind)
            return (
              <div key={`ride-${step}-${epoch}-${e.from}-${e.to}`} className="scn-fade absolute left-0 top-0">
                {e.tone === "red" ? <Ride d={d} gap={14} speed={14} cls="dash" /> : <Ride d={d} gap={26} speed={26 / 1.2} cls="dot" />}
              </div>
            )
          })}
          {nodes.map((n) => <IsoNode key={`${n.id}-${n.grow ? `grow-${epoch}` : ""}`} n={n} />)}
          {note && <div key={`${step}-${epoch}-${note.text}`} className={`scn-note ${note.tone}`} style={{ left: note.at.x, top: note.at.y }}>{note.text}</div>}
          {dk === 3 && ts === 0 && KB_FILES.map((name, i) => (
            <div key={`${name}-${epoch}`} className="scn-doc-anchor" style={{ left: PLASMA.x, top: PLASMA.y - KB_DY }}>
              <div className="scn-doc" style={{ "--x0": "260px", "--y0": `${-170 + i * 46}px`, animationDelay: `${0.12 * i}s` } as CSSProperties}>
                <FileText className="h-4 w-4" />{name}
              </div>
            </div>
          ))}
        </div>
      </div>
      {intro && (
        <aside className="scn-side">
          <p className="scn-side-h red">痛點</p>
          <ul className="scn-pains">{st.pains.map((p, i) => <li key={p} className={ts > i ? "on" : ""}>{p}</li>)}</ul>
          <p className="scn-side-h">在 Plasma 裡這樣做</p>
          <ol className="scn-road">
            {ROAD.map((r, i) => {
              const on = tt >= st.subs.length + i + 1
              return (
                <li key={r.title} className={on ? "on" : ""}>
                  <span className="n">{i + 2}</span>
                  <span><b>{r.title}</b><small>{r.how}</small></span>
                </li>
              )
            })}
          </ol>
        </aside>
      )}
      </div>
    </div>
  )
}
