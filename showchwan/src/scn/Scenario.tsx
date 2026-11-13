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

interface N { id: string; kind: NodeKind; variant?: string; pos: Pos; label?: string; sub?: ReactNode; tone?: "ok" | "danger"; brand?: string; grow?: boolean; bare?: boolean; dim?: boolean; hot?: boolean }
interface E { from: string; to: string; tone: "red" | "ok" }

const PLASMA = { x: 430, y: 335 }
const KB_DY = 86

// 情境 k、子步驟 sub、正在發生的 hot,決定圖上有哪些節點與連線
function scene(k: number, sub: number, hot: string | null) {
  const allIn = k >= 5 // 情境 6 才四家都接上
  const nodes: N[] = BRANCHES.map((b, i) => {
    const off = k >= 1 && i > 0 && !allIn
    const linked = (k === 1 && i === 0 && sub >= 3) || (k >= 2 && i === 0) || allIn
    return {
      id: `db${i}`, kind: "db" as const, pos: { x: 110, y: 85 + i * 160 }, label: b.ws, brand: BRAND[i], dim: off,
      hot: (k === 0 && (hot === "dbs" || hot === "schema")) || (k === 5 && sub === 0 && i > 0),
      sub: k === 0 ? <code className="scn-code">{b.schema}</code> : linked ? "唯讀" : undefined,
      tone: linked ? ("ok" as const) : undefined,
    }
  })
  const edges: E[] = []
  if (k === 0) {
    nodes.push({ id: "hq", kind: "app", variant: "receipt", pos: { x: 780, y: 335 }, label: "總院", sub: "？", tone: "danger", hot: hot === "hq" })
    BRANCHES.forEach((_, i) => edges.push({ from: `db${i}`, to: "hq", tone: "red" }))
    return { nodes, edges }
  }
  if (k >= 2 || sub >= 1) {
    const ps = k === 1 ? (sub >= 3 ? "已接上" : "") : k === 2 && sub < 4 ? "讀文件中" : allIn ? "四家已整理" : "已讀懂欄位"
    nodes.push({ id: "plasma", kind: "plasma", pos: PLASMA, sub: ps, tone: "ok", hot: hot === "plasma" })
  }
  if ((k === 2 && sub >= 3) || k >= 3) nodes.push({ id: "kb", kind: "kb", pos: { x: PLASMA.x, y: PLASMA.y - KB_DY }, bare: true, grow: k === 2, hot: hot === "kb" })
  if ((k === 1 && sub >= 3) || k >= 2) edges.push({ from: "db0", to: "plasma", tone: "ok" })
  if (allIn) BRANCHES.slice(1).forEach((_, i) => edges.push({ from: `db${i + 1}`, to: "plasma", tone: "ok" }))
  if (k === 3) {
    nodes.push({ id: "ai", kind: "app", pos: { x: 780, y: 335 }, label: "AI Agent", sub: sub >= 3 ? "名冊完成" : undefined, tone: "ok", hot: hot === "ai" })
    edges.push({ from: "plasma", to: "ai", tone: "ok" })
  }
  if (k === 4 && sub >= 1) {
    nodes.push({ id: "prod", kind: "app", variant: "package", pos: { x: 730, y: 335 }, label: "護理人員名冊", sub: "資料產品", tone: "ok", hot: hot === "prod" })
    edges.push({ from: "plasma", to: "prod", tone: "ok" })
  }
  if (k === 5) {
    nodes.push({ id: "prod", kind: "app", variant: "package", pos: { x: 700, y: 335 }, label: "四家名冊", sub: "資料產品", tone: "ok" })
    edges.push({ from: "plasma", to: "prod", tone: "ok" })
    if (sub >= 1) {
      nodes.push({ id: "hq", kind: "app", variant: "receipt", pos: { x: 900, y: 335 }, label: "總院", sub: sub >= 4 ? "812 人" : undefined, tone: "ok", hot: hot === "hq" })
      edges.push({ from: "prod", to: "hq", tone: "ok" })
    }
  }
  return { nodes, edges }
}

// 圖上的說明條(紅底是問題,墨底是解決);依情境與子步驟出現
function noteOf(k: number, sub: number): { at: Pos; text: string; tone: "red" | "ink" } | null {
  if (k === 0) return sub >= 1 ? { at: { x: 470, y: 150 }, text: "寫法都不同", tone: "red" } : null
  if (k === 1) return sub >= 3 ? { at: { x: 430, y: 175 }, text: "唯讀接上", tone: "ink" } : null
  if (k === 2) return sub >= 4 ? { at: { x: 700, y: 150 }, text: "N02 = 護理師", tone: "ink" } : null
  if (k === 3) return sub >= 3 ? { at: { x: 780, y: 225 }, text: "248 位護理師", tone: "ink" } : null
  if (k === 4) return sub >= 3 ? { at: { x: 730, y: 225 }, text: "已上架", tone: "ink" } : null
  if (k === 5) return sub === 0 ? { at: { x: 430, y: 150 }, text: "B、C、D 照做", tone: "ink" } : sub >= 4 ? { at: { x: 880, y: 225 }, text: "合計 812 人", tone: "ink" } : null
  return null
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
    <div className={`scn-node ${n.dim ? "dim" : ""} ${n.hot ? "hot" : ""}`} style={{ left: n.pos.x, top: n.pos.y }}>
      {n.hot && <span className="scn-pulse" aria-hidden="true" />}
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

export function Scenario({ step, sub, hot }: { step: number; sub: number; hot: string | null }) {
  const { ref, k } = useFit()
  // 登入(1)與接上(2)共用同一張圖:登入後 Plasma 出現;接上的兩個子步驟對應原本的第 2、3 格
  const dk = step <= 1 ? step : step - 1
  const ds = step === 1 ? Math.min(sub, 1) : step === 2 ? sub + 1 : sub
  const { nodes, edges } = scene(dk, ds, hot)
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const note = noteOf(dk, ds)
  const st = STEPS[step]
  return (
    <div className="scn">
      <div className="scn-caption">
        <span className="scn-step">{step + 1}</span>
        <div>
          <p className="scn-title">{st.title}</p>
          <ol className="scn-checks">
            {st.subs.map((t, i) => <li key={i} className={i < sub ? "ok" : i === sub ? "now" : ""}>{t}</li>)}
          </ol>
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
          {note && <div key={`${step}-${note.text}`} className={`scn-note ${note.tone}`} style={{ left: note.at.x, top: note.at.y }}>{note.text}</div>}
          {dk === 2 && hot === "docs" && KB_FILES.map((name, i) => (
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
