import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
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
// 情境 → 圖的狀態編號:現況 0、接上資料庫 2、跨資料庫查詢 4、AI 看懂欄位 3、問答 5、資料產品 6、Oracle 減壓 7
// (狀態 1 是已拿掉的登入;跨資料庫查詢排在上傳文件之前,所以那張圖沒有大腦)
const DK = [0, 2, 4, 3, 5, 6, 7]
const DIALECT = ["WHERE ROWNUM <= 10", "LIMIT 10", "SELECT TOP 10"]

interface N { id: string; kind: NodeKind; variant?: string; pos: Pos; label?: string; sub?: ReactNode; tone?: "ok" | "danger"; brand?: string; grow?: boolean; bare?: boolean; hot?: boolean; small?: boolean }
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
      : k === 0 && i === 0 && t >= 3 ? "授權稽核"
      : k === 7 && i === 0 ? (t >= 2 ? "只跑門診交易" : "負載高 · 授權稽核")
      : k === 2 ? (t > i ? "唯讀" : undefined) : k >= 3 ? "唯讀" : undefined,
    tone: k === 0 && i === 0 && t >= 3 ? ("danger" as const) : k === 7 && i === 0 && t < 2 ? ("danger" as const) : k >= 2 ? ("ok" as const) : undefined,
    hot: (k === 0 && t === 1) || (k === 0 && i === 0 && t >= 3) || (k === 2 && t === i) || (k === 4 && t >= 1) || (k === 7 && i === 0 && t === 0),
    // Oracle 減壓:讀取移走之後,Oracle 變小
    small: k === 7 && i === 0 && t >= 2,
  }))
  const edges: E[] = []
  let note: Note | null = null

  if (k === 0) {
    nodes.push({ id: "it", kind: "person", variant: "person-clock", pos: PLASMA, label: "IT", sub: t >= 1 ? "寫三種語法" : undefined, tone: "danger", hot: t === 1 })
    nodes.push({ id: "out", kind: "app", variant: "receipt", pos: RIGHT, label: "護理人員名冊", sub: t >= 2 ? "整理不出來" : undefined, tone: "danger", hot: t >= 2 })
    A_DBS.forEach((_, i) => edges.push({ from: db(i), to: "it", tone: "red" }))
    if (t >= 2) edges.push({ from: "it", to: "out", tone: "red" })
    note = t >= 3 ? { at: { x: 330, y: 70 }, text: "Oracle 授權稽核，費用高", tone: "red" } : t >= 2 ? { at: { x: 430, y: 170 }, text: "TITLE_CD、NRS_NAME 是什麼？", tone: "red" } : t >= 1 ? { at: { x: 430, y: 170 }, text: "三套資料庫，三種語法", tone: "red" } : null
    return { nodes, edges, note }
  }

  const ps = k === 1 ? "已登入" : k === 2 ? "唯讀接上" : k === 3 ? (t >= 1 ? "長出大腦" : "讀文件") : undefined
  nodes.push({ id: "plasma", kind: "plasma", pos: PLASMA, sub: ps, tone: "ok", hot: k === 1 || (k === 4 && t >= 1) })
  // 知識庫(大腦上方)在上傳文件(3)之後才出現;跨資料庫查詢(4)排在上傳之前,還沒有
  if (k === 3 || k >= 5) nodes.push({ id: "kb", kind: "kb", pos: { x: PLASMA.x, y: PLASMA.y - KB_DY }, bare: true, grow: k === 3 })
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
    nodes.push({ id: "ai", kind: "app", pos: RIGHT, label: "AI Agent", sub: t === 0 ? "GPT · Claude · 地端 · OpenCode" : t === 1 ? "問答整理" : "名冊完成", tone: "ok", hot: t < 2 })
    edges.push({ from: "plasma", to: "ai", tone: "ok" })
    if (t < 2) note = { at: { x: 640, y: 300 }, text: "透過 MCP 接上", tone: "ink" }
    if (t >= 2) note = { at: { x: 800, y: 250 }, text: "248 位護理師", tone: "ink" }
  }
  if (k === 7) {
    // 讀取原本都經 Plasma 打到 Oracle;Streaming 把 Oracle 的資料表同步到 PostgreSQL 副本,讀取改走副本
    const PG = { x: 800, y: 170 }
    const APP = { x: 800, y: 540 }
    if (t >= 1) nodes.push({ id: "pg", kind: "db", pos: PG, label: "PostgreSQL 副本", brand: postgresLogo, sub: "Streaming 同步", tone: "ok", hot: t === 1 })
    nodes.push({ id: "use", kind: "app", pos: APP, label: "報表 · AI · 資料產品", sub: t >= 2 ? "改讀 PostgreSQL" : "都在讀 Oracle", tone: t >= 2 ? "ok" : "danger", hot: t >= 2 })
    if (t >= 1) edges.push({ from: "plasma", to: "pg", tone: "ok" })
    edges.push(t >= 2 ? { from: "pg", to: "use", tone: "ok" } : { from: "plasma", to: "use", tone: "ok" })
    note = t === 0 ? { at: { x: 300, y: 60 }, text: "讀取都壓在 Oracle", tone: "red" }
      : t === 1 ? { at: { x: 620, y: 60 }, text: "Oracle 逐筆同步到 PostgreSQL", tone: "ink" }
      : { at: { x: 300, y: 60 }, text: "Oracle 縮小，授權負擔減輕", tone: "ink" }
  }
  if (k === 6) {
    nodes.push({ id: "prod", kind: "app", variant: "package", pos: RIGHT, label: "護理人員名冊", sub: "資料產品", tone: "ok", hot: t === 0 })
    edges.push({ from: "plasma", to: "prod", tone: "ok" })
    if (t >= 1) note = { at: { x: 800, y: 250 }, text: "來源更新，自動更新", tone: "ink" }
  }
  return { nodes, edges, note }
}

// 三次貝茲曲線(edgePath 產生的 "M x y C ...")依弧長等距取樣:每一點的位置與切線角度
const SAMPLES = 48
function samplePath(d: string) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
  const at = (t: number) => {
    const u = 1 - t
    return {
      x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
      y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      dx: 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2),
      dy: 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2),
    }
  }
  const FINE = 240
  const acc = [0]
  let p = at(0)
  for (let i = 1; i <= FINE; i++) {
    const q = at(i / FINE)
    acc.push(acc[i - 1] + Math.hypot(q.x - p.x, q.y - p.y))
    p = q
  }
  const len = acc[FINE]
  const pts: { x: number; y: number; a: number }[] = []
  let j = 1
  let prev = 0
  for (let k = 0; k <= SAMPLES; k++) {
    const target = (k / SAMPLES) * len
    while (j < FINE && acc[j] < target) j++
    const seg = acc[j] - acc[j - 1] || 1
    const q = at((j - 1 + (target - acc[j - 1]) / seg) / FINE)
    // 角度接續前一點(不跨 ±180° 跳動),中間才不會多轉一圈
    let a = (Math.atan2(q.dy, q.dx) * 180) / Math.PI
    if (k) a += Math.round((prev - a) / 360) * 360
    prev = a
    pts.push({ x: q.x, y: q.y, a })
  }
  return { len, pts }
}

// 連線上流動的點/虛線:每一段是一個沿路徑移動的小方塊。路徑先取樣成 transform 關鍵影格
// (位移 + 沿切線旋轉),整段動畫交給 GPU 合成,主執行緒每格不必做任何事。
// 原本用 offset-path:瀏覽器不會把它交給 GPU,幾十個方塊每格都要重算樣式,手機會卡
const RIDE_SIZE = { dot: [5.1, 5], dash: [7, 2] } as const
function Ride({ d, gap, speed, cls }: { d: string; gap: number; speed: number; cls: "dot" | "dash" }) {
  const ref = useRef<HTMLDivElement>(null)
  const { len, frames } = useMemo(() => {
    const { len, pts } = samplePath(d)
    const [w, h] = RIDE_SIZE[cls]
    return { len, frames: pts.map((q) => ({ transform: `translate(${(q.x - w / 2).toFixed(2)}px, ${(q.y - h / 2).toFixed(2)}px) rotate(${q.a.toFixed(2)}deg)` })) }
  }, [d, cls])
  const n = Math.max(1, Math.round(len / gap))
  const dur = len / speed
  useLayoutEffect(() => {
    const box = ref.current
    if (!box) return
    // 減少動態:停在各自的位置,看起來是靜止的虛線
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const anims = Array.from(box.children, (el, i) => {
      const a = el.animate(frames, { duration: dur * 1000, iterations: Infinity, delay: (-i * dur * 1000) / n })
      if (still) a.pause()
      return a
    })
    return () => anims.forEach((a) => a.cancel())
  }, [frames, n, dur])
  return (
    <div ref={ref} className="scn-fade absolute left-0 top-0">
      {Array.from({ length: n }, (_, i) => <span key={i} className={`scn-ride ${cls}`} style={{ transform: frames[0].transform }} />)}
    </div>
  )
}

// 舞台以固定大小繪製,再等比縮放放進窗格。縮放倍率直接寫進 DOM,不經過 React:
// 對調畫面時窗格大小每格都在變,每格重畫整張情境圖手機會卡
function useFit() {
  const ref = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      if (stageRef.current) stageRef.current.style.transform = `translate(-50%, -50%) scale(${Math.min(el.clientWidth / W, el.clientHeight / H)})`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, stageRef }
}

function IsoNode({ n }: { n: N }) {
  const { a, t } = sizeOf(n.kind)
  const z = n.small ? 0.6 : 1 // 縮小的節點(Oracle 減壓後)
  return (
    <div className={`scn-node ${n.hot ? "hot" : ""}`} style={{ left: n.pos.x, top: n.pos.y }}>
      {n.hot && <span className="scn-pulse" aria-hidden="true" />}
      <div className="scn-zoom absolute" style={{ transform: `scale(${z})` }}>
        <div className={n.grow ? "kb-grow absolute" : "absolute"} style={n.grow ? { animationDelay: "1.6s" } : undefined}>
          <Platform kind={n.kind} variant={n.variant} bare={n.bare} />
        </div>
      </div>
      {(n.label || n.sub) && (
        <div className="scn-label" style={{ top: (a / 2 + t) * z + 6, transition: "top 0.8s var(--ease)" }}>
          {n.label && <div className="scn-pill scn-name">{n.brand && <img src={n.brand} alt="" />}{n.label}</div>}
          {n.sub && <div className={`scn-pill scn-sub ${n.tone ? `tone-${n.tone}` : ""}`}>{n.sub}</div>}
        </div>
      )}
    </div>
  )
}

/** 情境圖:step 換了或 epoch(重播)變了,就從第 0 個子步驟開始,依時間自己往下播 */
export const Scenario = memo(function Scenario({ step, epoch, isMain }: { step: number; epoch: number; isMain: boolean }) {
  const { ref, stageRef } = useFit()
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
    }, DK[step] === 3 ? 2400 : DK[step] === 5 ? 4500 : DK[step] === 7 ? 11000 : TICK) // 上傳文件:文件飛進去要久一點;MCP 問答、Oracle 減壓:配合左邊的說明卡
    return () => clearInterval(id)
  }, [step, epoch, total])

  const tt = Math.min(t, total)
  const ts = Math.min(tt, STEPS[step].subs.length) // 圖與子步驟用
  const dk = DK[step]
  const { nodes, edges, note } = scene(dk, ts)
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const brain = dk >= 5 || (dk === 3 && ts >= 1)
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
        <div ref={stageRef} className="scn-stage" style={{ width: W, height: H }}>
          {brain && (
            <div key={`brain-${step}-${epoch}`} className="absolute" style={{ left: PLASMA.x, top: PLASMA.y - 40 }}>
              {/* 光暈是一大片柔和的漸層:用 1/4 大小畫、外層放大 4 倍。Safari 的圖層照排版尺寸配記憶體,
              這樣這張圖層只要原本的 1/16;漸層沒有銳利邊緣,放大後看不出差別(Chrome 會照實際大小重畫,本來就沒差) */}
              <div className="absolute left-0 top-0 h-0 w-0" style={{ transform: "scale(4)" }}>
                <div className="brain-aura absolute rounded-full" style={{ width: 155, height: 125, left: -77.5, top: -62.5 }} />
              </div>
              <BrainNet width={640} delay={dk === 3 ? 0.3 : 0} mode={dk === 3 ? "full" : "idle"} />
            </div>
          )}
          {/* 連線層只佔 1×1,內容照樣畫在外面(overflow-visible):Safari 的圖層只會配到連線實際經過的範圍,不是整個舞台 */}
          <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1}>
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
            const key = `ride-${step}-${epoch}-${e.from}-${e.to}`
            return e.tone === "red" ? <Ride key={key} d={d} gap={14} speed={14} cls="dash" /> : <Ride key={key} d={d} gap={26} speed={26 / 1.2} cls="dot" />
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
})
