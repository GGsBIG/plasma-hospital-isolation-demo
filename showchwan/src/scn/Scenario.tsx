import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { FileText } from "lucide-react"
import { Platform } from "./components/Iso"
import { edgePath, sizeOf } from "./geometry"
import type { NodeKind, Pos } from "./types"
import oracleLogo from "./assets/db/oracle.svg"
import postgresLogo from "./assets/db/postgresql.svg"
import mssqlLogo from "./assets/db/mssql.svg"
import mysqlLogo from "./assets/db/mysql.svg"
import { BRANCHES, KB_FILES } from "@/demo/data"
import { STEPS } from "@/sc/steps"
import "./scn.css"

// 情境圖:秀傳四家分院 → Plasma → 資料產品 → 總院。step 對應左邊 Plasma 操作的第幾步(0~6)
const W = 1000
const H = 680
const BRAND = [oracleLogo, postgresLogo, mssqlLogo, mysqlLogo]

interface N { id: string; kind: NodeKind; variant?: string; pos: Pos; label?: string; sub?: ReactNode; tone?: "ok" | "danger"; brand?: string; grow?: boolean; bare?: boolean }
interface E { from: string; to: string; tone: "red" | "ok" }

const PLASMA = { x: 430, y: 335 }
const KB_DY = 86

function scene(k: number) {
  const nodes: N[] = BRANCHES.map((b, i) => ({
    id: `db${i}`, kind: "db", pos: { x: 110, y: 85 + i * 160 }, label: b.ws, brand: BRAND[i],
    sub: k <= 1 ? <code className="scn-code">{b.schema}</code> : k >= 2 ? "唯讀接上" : undefined, tone: k >= 2 ? "ok" : undefined,
  }))
  const edges: E[] = []
  const db = BRANCHES.map((_, i) => `db${i}`)
  if (k === 0) {
    nodes.push({ id: "hq", kind: "app", variant: "receipt", pos: { x: 780, y: 335 }, label: "總院", sub: "統計不出來", tone: "danger" })
    db.forEach((id) => edges.push({ from: id, to: "hq", tone: "red" }))
    return { nodes, edges }
  }
  const sub = k === 1 ? "A～D 分院各一個工作區" : k === 2 ? "唯讀接上四家資料庫" : "已讀懂四家欄位"
  nodes.push({ id: "plasma", kind: "plasma", pos: PLASMA, sub, tone: "ok" })
  if (k >= 3) nodes.push({ id: "kb", kind: "kb", pos: { x: PLASMA.x, y: PLASMA.y - KB_DY }, bare: true, grow: k === 3 })
  if (k >= 2) db.forEach((id) => edges.push({ from: id, to: "plasma", tone: "ok" }))
  if (k === 4) {
    nodes.push({ id: "ai", kind: "app", pos: { x: 780, y: 335 }, label: "AI Agent", sub: "透過 MCP 問答整理", tone: "ok" })
    edges.push({ from: "plasma", to: "ai", tone: "ok" })
  }
  if (k >= 5) {
    nodes.push({ id: "prod", kind: "app", variant: "package", pos: { x: 730, y: 335 }, label: "護理人員名冊", sub: "資料產品", tone: "ok" })
    edges.push({ from: "plasma", to: "prod", tone: "ok" })
  }
  if (k >= 6) {
    nodes.push({ id: "hq", kind: "app", variant: "receipt", pos: { x: 900, y: 335 }, label: "總院", sub: "四家合計 812 人", tone: "ok" })
    edges.push({ from: "prod", to: "hq", tone: "ok" })
  }
  return { nodes, edges }
}

// 圖上的說明條:問題是紅底,解決是墨底
const NOTE: Record<number, { at: Pos; text: string; tone: "red" | "ink" }> = {
  0: { at: { x: 560, y: 170 }, text: "四家寫法都不同，對不起來", tone: "red" },
  1: { at: { x: 430, y: 150 }, text: "每家分院一個工作區", tone: "ink" },
  2: { at: { x: 430, y: 150 }, text: "不搬資料、不動原系統", tone: "ink" },
  4: { at: { x: 780, y: 225 }, text: "四種寫法 → 同一張名冊", tone: "ink" },
  5: { at: { x: 730, y: 225 }, text: "來源更新，名冊跟著更新", tone: "ink" },
  6: { at: { x: 880, y: 225 }, text: "隨時看得到最新人數", tone: "ink" },
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
    <div className="scn-node" style={{ left: n.pos.x, top: n.pos.y }}>
      <div className={n.grow ? "kb-grow absolute" : "absolute"} style={n.grow ? { animationDelay: "2.3s" } : undefined}>
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

export function Scenario({ step }: { step: number }) {
  const { ref, k } = useFit()
  const { nodes, edges } = scene(step)
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const note = NOTE[step]
  const st = STEPS[step]
  return (
    <div className="scn">
      <div className="scn-caption">
        <span className="scn-step">{step + 1}</span>
        <div>
          <p className="scn-title">{st.title}</p>
          <p className="scn-line">{st.line}</p>
        </div>
      </div>
      <div ref={ref} className="scn-board">
        <div className="scn-stage" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${k})` }}>
          <svg className="absolute inset-0 overflow-visible" width={W} height={H}>
            <defs>
              <radialGradient id="plasma-glow">
                <stop offset="0" style={{ stopColor: "var(--iso-glow)", stopOpacity: "var(--iso-glow-opacity)" }} />
                <stop offset="1" style={{ stopColor: "var(--iso-glow)", stopOpacity: 0 }} />
              </radialGradient>
            </defs>
            {edges.map((e) => {
              const f = byId[e.from]
              const t = byId[e.to]
              const d = edgePath(f.pos, f.kind, t.pos, t.kind)
              return (
                <g key={`${step}-${e.from}-${e.to}`} className="scn-fade">
                  {e.tone === "red" ? <path d={d} className="scn-edge red" /> : <><path d={d} className="scn-edge base" /><path d={d} className="scn-edge flow" /></>}
                </g>
              )
            })}
          </svg>
          {nodes.map((n) => <IsoNode key={n.id + (n.grow ? "-grow" : "")} n={n} />)}
          {note && <div key={step} className={`scn-note ${note.tone}`} style={{ left: note.at.x, top: note.at.y }}>{note.text}</div>}
          {step === 3 && KB_FILES.map((name, i) => (
            <div key={name} className="scn-doc-anchor" style={{ left: PLASMA.x, top: PLASMA.y - KB_DY }}>
              <div className="scn-doc" style={{ "--x0": "260px", "--y0": `${-170 + i * 46}px`, animationDelay: `${0.15 * i}s` } as CSSProperties}>
                <FileText className="h-4 w-4" />{name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
