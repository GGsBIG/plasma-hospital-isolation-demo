import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { Bot, Brain, ClipboardList, FileText, Package, Table, Users, type LucideIcon } from "lucide-react"
import { CAMS, type Look } from "./steps"
import plasmaLogo from "./assets/plasma-logo.webp"
import oracleLogo from "./assets/oracle.svg"
import pgLogo from "./assets/postgresql.svg"
import msLogo from "./assets/mssql.svg"
import { BrainNet, BRAIN_RATIO } from "./brainGraph"

/* ================= 效能架構(跟 Oracle 減壓圖解相同) =================
   1. 靜態層(SVG):資料庫、方塊、標籤。只有換步驟時才變,平常不重畫。
   2. 鏡頭:移動、縮放包住整個場景的 HTML 圖層,交給 GPU 縮放,過場不重畫 SVG。
   3. 動態層(HTML):流動的小點、Oracle 的紅光,只用 transform/opacity。 */

/* ================= 等角投影 =================
   地面座標 (x, y, z):x 往右下、y 往左下、z 往上。畫面座標 = (x − y, (x + y) / 2 − z) */
type Pt = [number, number]
type G = [number, number] // 地面座標
const P = (x: number, y: number, z = 0): Pt => [x - y, (x + y) / 2 - z]
const pts = (a: Pt[]) => a.map((p) => p.join(",")).join(" ")
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
const toD = (a: Pt[]) => "M" + a.map((p) => p.join(" ")).join(" L")
/** 配置用的投影:整個配置在地面上轉 90°,連線改走「／」(服務在左下、資料庫在右上那個方向)。
 *  只有位置用 L;方塊、圓柱本身照舊用 P 畫,看起來的角度不變。 */
const L = (x: number, y: number, z = 0): Pt => P(y, -x, z)
const path = (g: G[], z = 0) => g.map(([x, y]) => L(x, y, z))

const INK = "#211e1b"
const ORANGE = "#d9722b"
const GREEN = "#2f7d4f"
const RED = "#b42622"
// 每種方塊的頂面/左面/右面顏色
const C = {
  glass: ["#effbfd", "#c6e9f0", "#abdae5"],
  bad: ["#fdf1ef", "#f4cfc8", "#ebb9b0"],
  ok: ["#f1faef", "#cfead0", "#b5dcb8"],
  agent: ["#f3f6ff", "#d3ddf8", "#bccbf0"],
  product: ["#fff8ea", "#f6e2b5", "#eccf8f"],
  unit: ["#f7f4ee", "#e6dfd2", "#d6cdbd"],
  plasma: ["#ffffff", "#f6e3e1", "#ecc9c5"],
  brain: ["#fcf2fe", "#ecd3f2", "#dfbde8"],
  sheet: ["#ffffff", "#ece6da", "#ddd4c4"],
}

/** 整個場景的範圍(畫面座標) */
const WORLD = { x: -900, y: -720, w: 2900, h: 1240 }

/* ================= 場景配置(地面座標) ================= */
const DB_YS = [0, 210, 420] // 三套資料庫排成一列
const BUS_X = 200 // 資料庫的線在這裡匯合
const PLASMA: G = [400, 210]
const SPLIT_X = 580 // Plasma 出去的線在這裡分岔
const SQL_AT: G = [760, 30]
const AGENT_AT: G = [760, 210]
const ROSTER_AT: G = [760, 420]
const PERSON_AT: G = [980, 210]
const UNITS: { at: G; name: string }[] = [{ at: [960, 420], name: "護理部" }, { at: [760, 610], name: "人事室" }]
const DOCS_AT: G = [250, -300]
const REP_AT: G = [0, -340] // PostgreSQL 副本
const DB = { r: 64, h: 96 }
const ORA_BIG = { r: 76, h: 116 }
const ORA_SMALL = { r: 50, h: 74 }
const PIPE_Z = 22
const PL = 48 // Plasma 方塊半寬
const PL_H = 64
const CUBE = 74
const CUBE_H = 56

const DBS = [
  { name: "HIS 門診", type: "Oracle", logo: oracleLogo, grad: "gOra", top: "#fbe4e1", dialect: "ROWNUM <= 10" },
  { name: "護理系統", type: "PostgreSQL", logo: pgLogo, grad: "gPg", top: "#e8f0fa", dialect: "LIMIT 10" },
  { name: "人事系統", type: "MS SQL", logo: msLogo, grad: "gMs", top: "#f3eeea", dialect: "SELECT TOP 10" },
]

/* ---------- 連線(地面折線) ---------- */
const dbToPerson = (i: number): G[] => dedupe([[0, DB_YS[i]], [BUS_X, DB_YS[i]], [BUS_X, PLASMA[1]], PERSON_AT])
const dbToPlasma = (i: number): G[] => dedupe([[0, DB_YS[i]], [BUS_X, DB_YS[i]], [BUS_X, PLASMA[1]], PLASMA])
const personToRoster: G[] = [PERSON_AT, [PERSON_AT[0], ROSTER_AT[1]], ROSTER_AT]
const plasmaToPerson: G[] = [PLASMA, PERSON_AT]
const plasmaTo = (to: G): G[] => dedupe([PLASMA, [SPLIT_X, PLASMA[1]], [SPLIT_X, to[1]], to])
const productTo = (to: G): G[] => dedupe([ROSTER_AT, [to[0], ROSTER_AT[1]], to])
const repToPlasma: G[] = [REP_AT, [PLASMA[0], REP_AT[1]], PLASMA]
function dedupe(a: G[]) {
  return a.filter((p, i) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1])
}

/* ---------- 數字補間:只讓用到的小元件重畫 ---------- */
function useTween(target: number, ms = 1100) {
  const [v, setV] = useState(target)
  const cur = useRef(target)
  useEffect(() => {
    const from = cur.current
    if (from === target) return
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
      cur.current = from + (target - from) * e
      setV(cur.current)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

/** 標籤放大倍率:畫面縮得很小(手機)時,標籤放大一點 */
const UI = createContext(1)
const Layer = createContext({ R: 1, paused: false, lite: false })

/* ================= 場景 ================= */
export function Scene({ l, paused, lite = false, insetTop = 0, insetBottom = 0 }: { l: Look; paused: boolean; lite?: boolean; insetTop?: number; insetBottom?: number }) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const hot = l.load > 60
  let body: ReactNode = null
  if (size && size.w > 0 && size.h > 0) {
    const pad = Math.min(size.w, size.h) * 0.04
    const availH = Math.max(120, size.h - insetTop - insetBottom - pad * 2)
    const portrait = size.h > size.w * 1.15
    const fit = (b: (typeof CAMS)[keyof typeof CAMS]) => Math.min(((size.w - pad * 2) / (b.x1 - b.x0)) * (portrait ? (b.m ?? 1.4) : 1), availH / (b.y1 - b.y0))
    const b = CAMS[l.cam]
    const s = fit(b)
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const R = Math.max(0.2, Math.min(4096 / (WORLD.w * dpr), Math.max(...Object.values(CAMS).map(fit))))
    const cx = portrait && b.mc !== undefined ? b.mc : (b.x0 + b.x1) / 2
    const cy = (b.y0 + b.y1) / 2
    const tx = size.w / 2 - s * (cx - WORLD.x)
    const ty = size.h / 2 + (insetTop - insetBottom) / 2 - s * (cy - WORLD.y)
    const ui = Math.min(2.2, Math.max(1, 0.6 / s))
    body = (
      <UI.Provider value={ui}>
        <Layer.Provider value={{ R, paused, lite }}>
          <div className={`scene-box${ui > 1.5 ? " tiny" : ""}`}>
            <div className="cam" style={{ width: WORLD.w * R, height: WORLD.h * R, transform: `translate3d(${tx}px, ${ty}px, 0) scale(${s / R})` }}>
              {l.dbs && hot && <Heat at={L(0, DB_YS[0])} r={ORA_BIG.r} />}
              <svg className="still" width={WORLD.w * R} height={WORLD.h * R} viewBox={`${WORLD.x} ${WORLD.y} ${WORLD.w} ${WORLD.h}`} aria-label="架構示意圖">
                <Still l={l} />
              </svg>
              <Moving l={l} hot={hot} />
              {l.docs && <PlasmaBrain l={l} ui={ui} R={R} paused={paused} lite={lite} />}
            </div>
          </div>
        </Layer.Provider>
      </UI.Provider>
    )
  }
  return <div ref={box} className={`scene${paused ? " paused" : ""}${lite ? " lite" : ""}`}>{body}</div>
}

/* ---------- Plasma 大腦:知識庫上方的 graph ---------- */
function PlasmaBrain({ l, ui, R, paused, lite }: { l: Look; ui: number; R: number; paused: boolean; lite: boolean }) {
  const pl = L(...PLASMA)
  const base: Pt = [pl[0], pl[1] - PL_H - 60]
  const w = 400 * Math.min(1.45, Math.sqrt(ui))
  const h = w * BRAIN_RATIO
  const box = { x0: pl[0] + 90 - w, y0: base[1] - 30 - h, w, h }
  // 上傳文件那一步:等文件飛進知識庫後才長出來;AI 問答那一步:答案送到 AI Agent
  const grow = !l.brain && !l.agent
  const ag = L(...AGENT_AT)
  const target: Pt | null = l.agent && !l.product ? [ag[0], ag[1] - CUBE_H * 0.6] : null
  return <BrainNet box={box} base={base} grow={grow} start={grow ? 3.2 : 0} target={target} world={WORLD} R={R} paused={paused} lite={lite} />
}

/* ================= 靜態層 ================= */
function Still({ l }: { l: Look }) {
  const roster = l.product ? "product" : l.agent ? "done" : l.confused ? "bad" : null
  const pl = L(...PLASMA)
  return (
    <>
      <defs>
        <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 0 L40 20 M40 0 L0 20" stroke="#ddd2c0" strokeWidth="1" />
        </pattern>
        <radialGradient id="fade" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="#fff" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <mask id="gridMask"><rect x={WORLD.x} y={WORLD.y} width={WORLD.w} height={WORLD.h} fill="url(#fade)" /></mask>
        <radialGradient id="gShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#6b5236" stopOpacity="0.26" />
          <stop offset="1" stopColor="#6b5236" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gOra" x1="0" x2="1"><stop offset="0" stopColor="#efbab3" /><stop offset=".26" stopColor="#fbe3df" /><stop offset=".5" stopColor="#eab1aa" /><stop offset="1" stopColor="#d4877f" /></linearGradient>
        <linearGradient id="gPg" x1="0" x2="1"><stop offset="0" stopColor="#c0d4ee" /><stop offset=".26" stopColor="#eaf1fb" /><stop offset=".5" stopColor="#b5cae8" /><stop offset="1" stopColor="#8ca7cf" /></linearGradient>
        <linearGradient id="gMs" x1="0" x2="1"><stop offset="0" stopColor="#ddd5cf" /><stop offset=".26" stopColor="#f6f2ee" /><stop offset=".5" stopColor="#d6ccc4" /><stop offset="1" stopColor="#b7a99e" /></linearGradient>
        <linearGradient id="gBody" x1="0" x2="1"><stop offset="0" stopColor="#9fb4dc" /><stop offset=".3" stopColor="#d6e0f3" /><stop offset=".55" stopColor="#94aad6" /><stop offset="1" stopColor="#6f87ba" /></linearGradient>
      </defs>
      <rect x={WORLD.x} y={WORLD.y} width={WORLD.w} height={WORLD.h} fill="url(#grid)" mask="url(#gridMask)" />
      {/* 機房地板 */}
      <polygon points={pts([L(-140, -320), L(1100, -320), L(1100, 700), L(-140, 700)])} fill="#f6ead2" fillOpacity={0.55} stroke="#e6d2a3" strokeWidth={1.2} />

      {/* ---------- 地面連線(流動的小點在動態層) ---------- */}
      {l.it && !l.plasma && DB_YS.map((_, i) => <Cable key={`p${i}`} g={dbToPerson(i)} tone="bad" />)}
      {l.plasma && DB_YS.map((_, i) => <Cable key={`l${i}`} g={dbToPlasma(i)} dim={i === 0 && l.toPg} />)}
      {l.plasma && <Cable g={plasmaToPerson} />}
      {roster === "bad" && <Cable g={personToRoster} tone="bad" />}
      {l.sql && <Cable g={plasmaTo(SQL_AT)} />}
      {l.agent && <Cable g={plasmaTo(ROSTER_AT)} />}
      {l.product && UNITS.map((u) => <Cable key={u.name} g={productTo(u.at)} />)}
      {l.toPg && <Cable g={repToPlasma} />}
      {l.pg && (
        <g className="fadein">
          <polyline points={pts(path([[0, DB_YS[0]], REP_AT], PIPE_Z))} stroke="#c98a83" strokeWidth={15} strokeLinecap="round" fill="none" />
          <polyline points={pts(path([[0, DB_YS[0]], REP_AT], PIPE_Z))} stroke="#f9e3df" strokeWidth={8} strokeLinecap="round" fill="none" />
        </g>
      )}

      {/* ---------- 由後往前畫(轉向後是 y − x 小的在後面) ---------- */}
      {l.it && <Person />}
      {l.sql && <Block at={SQL_AT} c={C.ok} icon={Table} label="查詢結果" delay={0.6} />}
      {l.docs && !l.agent && <Docs flying={!l.brain} />}
      {l.agent && <Block at={AGENT_AT} c={C.agent} icon={Bot} iconColor="#2a55b8" label="AI Agent" delay={0.3} />}
      {l.product && <Block at={UNITS[0].at} s={46} h={36} c={C.unit} icon={Users} iconColor="#6b6359" label={UNITS[0].name} delay={0.5} fs={12} />}
      {l.pg && <ReplicaDb />}
      {roster && (
        <Block key={roster} at={ROSTER_AT} c={roster === "bad" ? C.bad : roster === "done" ? C.ok : C.product}
          icon={roster === "product" ? Package : ClipboardList} iconColor={roster === "bad" ? "#b4382a" : roster === "done" ? GREEN : "#a86a12"}
          label={roster === "product" ? "資料產品" : "名冊"} delay={roster === "bad" ? 0.6 : 0.2} />
      )}
      {l.plasma && <PlasmaBox brain={l.docs} lit={l.brain} />}
      {l.product && <Block at={UNITS[1].at} s={46} h={36} c={C.unit} icon={Users} iconColor="#6b6359" label={UNITS[1].name} delay={0.65} fs={12} />}
      {l.dbs && <OracleDb small={l.oraSmall} />}
      {l.dbs && [1, 2].map((i) => <Db key={i} i={i} />)}

      {/* ---------- 標籤、對話(最上層,不被擋住) ---------- */}
      {l.dbs && <DbLabels l={l} />}
      {l.pg && <Tag x={L(...REP_AT)[0]} y={L(...REP_AT)[1] + DB.r * 0.7 + 30} text="PostgreSQL 副本" sub="即時同步" size={19} />}
      {l.plasma && !l.sql && DB_YS.map((y, i) => { const p = L(BUS_X - 50, y); return <Pill key={i} x={p[0]} y={p[1] - 36} text="唯讀" tone="green" size={13} /> })}
      {l.sql && !l.docs && <Pill x={pl[0] + 190} y={pl[1] - PL_H - 84} text="SELECT … FROM a_his JOIN a_nursing JOIN a_hr" tone="ink" size={14} mono />}
      {l.brain && !l.agent && (
        <>
          <Pill x={pl[0] + 230} y={pl[1] - PL_H - 120} text="N02 = 護理師" tone="ink" size={15} />
          <Pill x={pl[0] + 250} y={pl[1] - PL_H - 76} text="TITLE_CD = 職稱代碼" tone="ink" size={15} />
        </>
      )}
      {l.agent && !l.product && <Pill x={L(620, PLASMA[1])[0]} y={L(620, PLASMA[1])[1] - 52} text="MCP" tone="ink" size={14} mono />}
      <PersonTalk l={l} />
      {roster === "bad" && <Pill x={L(...ROSTER_AT)[0]} y={L(...ROSTER_AT)[1] - CUBE_H - 70} text="整理 5 天" tone="red" size={14} />}
      {roster === "done" && <Pill x={L(...ROSTER_AT)[0]} y={L(...ROSTER_AT)[1] - CUBE_H - 70} text="248 位護理師" tone="green" size={14} />}
      {roster === "product" && !l.reads && !l.pg && <Pill x={L(...ROSTER_AT)[0]} y={L(...ROSTER_AT)[1] - CUBE_H - 70} text="來源更新，跟著更新" tone="green" size={14} />}
      {l.toPg && !l.oraSmall && <Pill x={L(PLASMA[0], -120)[0] + 90} y={L(PLASMA[0], -120)[1]} text="讀取改走這裡" tone="green" size={14} />}
    </>
  )
}

/* ---------- 人:IT 人員 ---------- */
function Person() {
  const [x, y] = L(...PERSON_AT)
  return (
    <g transform={`translate(${x} ${y})`}>
      <Drop delay={0.2}>
        <ellipse cx={0} cy={6} rx={46} ry={22} fill="url(#gShadow)" />
        <Cyl r={24} h={52} grad="gBody" top="#dfe6f5" />
        <circle cx={0} cy={-52 - 34} r={20} fill="#f5dcc2" stroke={INK} strokeWidth={1.2} />
        <ellipse cx={-6} cy={-93} rx={8} ry={4.5} fill="#fff" opacity={0.45} />
      </Drop>
      <Tag x={0} y={60} text="IT 人員" size={17} />
    </g>
  )
}
function PersonTalk({ l }: { l: Look }) {
  const [x, y] = L(...PERSON_AT)
  const at = { x: x - 80, y: y - 136 }
  if (l.it && l.dialect) return <Pill x={at.x} y={at.y} text="三套資料庫，三種語法…" tone="red" size={14} />
  if (l.confused && !l.plasma && l.load === 0) return <Pill x={at.x} y={at.y} text="TITLE_CD、N02 是什麼？" tone="red" size={14} />
  if (l.agent && !l.product) return <Pill x={x - 10} y={y - 142} text="「整理護理人員名冊」" tone="paper" size={14} />
  return null
}

/* ---------- 資料庫 ---------- */
function Db({ i }: { i: number }) {
  const [x, y] = L(0, DB_YS[i])
  const d = DBS[i]
  return (
    <g transform={`translate(${x} ${y})`}>
      <Drop delay={i * 0.12}>
        <ellipse cx={0} cy={12} rx={DB.r * 1.7} ry={DB.r * 0.85} fill="url(#gShadow)" />
        <Cyl r={DB.r} h={DB.h} grad={d.grad} top={d.top} bands={2} leds />
        <TopLogo href={d.logo} r={DB.r} h={DB.h} />
      </Drop>
    </g>
  )
}
function ReplicaDb() {
  const [x, y] = L(...REP_AT)
  return (
    <g transform={`translate(${x} ${y})`}>
      <Drop>
        <ellipse cx={0} cy={12} rx={DB.r * 1.7} ry={DB.r * 0.85} fill="url(#gShadow)" />
        <Cyl r={DB.r} h={DB.h} grad="gPg" top="#e8f0fa" bands={2} leds />
        <TopLogo href={pgLogo} r={DB.r} h={DB.h} />
      </Drop>
    </g>
  )
}
function OracleDb({ small }: { small: boolean }) {
  const r = useTween(small ? ORA_SMALL.r : ORA_BIG.r)
  const h = useTween(small ? ORA_SMALL.h : ORA_BIG.h)
  const [x, y] = L(0, DB_YS[0])
  return (
    <g transform={`translate(${x} ${y})`}>
      {small && <g className="ghost-g"><Cyl r={ORA_BIG.r} h={ORA_BIG.h} grad="gOra" top="none" dash /></g>}
      <Drop>
        <ellipse cx={0} cy={12} rx={r * 1.7} ry={r * 0.85} fill="url(#gShadow)" />
        <Cyl r={r} h={h} grad="gOra" top="#fbe4e1" bands={2} leds />
        <TopLogo href={oracleLogo} r={r} h={h} />
      </Drop>
    </g>
  )
}
/** logo 平貼在圓柱頂面上 */
function TopLogo({ href, r, h }: { href: string; r: number; h: number }) {
  const s = r * 0.95
  return <image href={href} x={-s / 2} y={-s / 2} width={s} height={s} transform={`matrix(0.75 0.375 -0.75 0.375 0 ${-h})`} />
}
function DbLabels({ l }: { l: Look }) {
  const r = useTween(l.oraSmall ? ORA_SMALL.r : ORA_BIG.r)
  const h = useTween(l.oraSmall ? ORA_SMALL.h : ORA_BIG.h)
  const v = Math.round(useTween(l.load, 1400))
  return (
    <>
      {DBS.map((d, i) => {
        const [x, y] = L(0, DB_YS[i])
        const rr = i === 0 ? r : DB.r
        const hh = i === 0 ? h : DB.h
        return (
          <g key={i}>
            <Tag x={x} y={y + rr * 0.7 + 30} text={d.name} sub={d.type} size={19} />
            {l.dialect && <Pill x={x - 150} y={y - hh * 0.5} text={d.dialect} tone="red" size={13} mono />}
          </g>
        )
      })}
      {l.load > 0 && <LoadPill x={L(0, 0)[0]} y={L(0, 0)[1] - h - r * 0.7 - 34} v={v} />}
    </>
  )
}

/* ---------- Plasma 方塊(上面可以長出知識庫) ---------- */
function PlasmaBox({ brain, lit }: { brain: boolean; lit: boolean }) {
  const [x, y] = L(...PLASMA)
  const k = 26
  const bh = 34
  return (
    <g transform={`translate(${x} ${y})`}>
      <Drop delay={0.1}>
        <Shadow poly={[P(-PL, -PL), P(PL, -PL), P(PL, PL), P(-PL, PL)]} />
        <Box x={-PL} y={-PL} w={PL * 2} d={PL * 2} h={PL_H} c={C.plasma} stroke={RED} sw={1.4} />
        <PlasmaFace />
      </Drop>
      {brain && (
        <g key="brain">
          <Drop delay={0.9}>
            {lit && <ellipse className="glow" cx={0} cy={-PL_H - bh} rx={70} ry={36} fill="#c67ad8" />}
            <Box x={-k} y={-k} z={PL_H} w={k * 2} d={k * 2} h={bh} c={C.brain} stroke="#7a3d8c" />
            <Brain x={-13} y={-PL_H - bh - 46} width={26} height={26} strokeWidth={1.8} color="#7a3d8c" />
            <text className="cube-label" x={0} y={-PL_H - bh + 8} textAnchor="middle" fontSize={12} fontWeight={800} fill={INK}>知識庫</text>
          </Drop>
        </g>
      )}
    </g>
  )
}
function PlasmaFace() {
  const [X, Y] = P(-PL, PL, PL_H)
  const S = (u: number, v: number) => P(PL, -PL + u, v)
  return (
    <g>
      <g transform={`matrix(1 0.5 0 1 ${X} ${Y})`}>
        <image href={plasmaLogo} x={8} y={12} width={80} height={17.2} />
        {[14, 23, 32, 41, 50, 59, 68, 77].map((u) => <line key={u} x1={u} y1={40} x2={u} y2={54} stroke="#e0aaa4" strokeWidth={1.4} strokeLinecap="round" />)}
      </g>
      <ellipse cx={S(70, 46)[0]} cy={S(70, 46)[1]} rx={3.4} ry={2.8} fill="#e0452f" stroke={INK} strokeWidth={0.6} />
    </g>
  )
}

/* ---------- 系統文件:一疊紙,飛進知識庫 ---------- */
const DOC_NAMES = ["規格書", "資料字典", "職稱代碼表"]
function Docs({ flying }: { flying: boolean }) {
  const [x, y] = L(...DOCS_AT)
  const brain = add(L(...PLASMA, PL_H + 34), [0, 0])
  const dx = brain[0] - x
  const dy = brain[1] - y
  const sheet = (z: number) => <Box x={-20} y={-26} z={z} w={40} d={52} h={3} c={C.sheet} sw={0.9} />
  return (
    <g transform={`translate(${x} ${y})`}>
      <Drop delay={0.1}>
        <Shadow poly={[P(-20, -26), P(20, -26), P(20, 26), P(-20, 26)]} faint />
        {[0, 5, 10, 15, 20].map((z) => <g key={z}>{sheet(z)}</g>)}
        <FileText x={-12} y={-23 - 44} width={24} height={24} strokeWidth={1.8} color="#6b6359" />
      </Drop>
      {flying && [0, 1, 2, 3, 4].map((i) => (
        <g key={i} className="fly" style={{ "--dx": `${dx}px`, "--dy": `${dy}px`, animationDelay: `${0.9 + i * 0.45}s` } as CSSProperties}>
          {sheet(24)}
        </g>
      ))}
      <Tag x={40} y={62} text="系統文件" size={16} />
      {flying && DOC_NAMES.map((n, i) => <Pill key={n} x={140 + i * 8} y={-110 + i * 36} text={n} size={13} />)}
    </g>
  )
}

/* ---------- 一般方塊:圖示 + 頂面文字 ---------- */
function Block({ at, s = CUBE, h = CUBE_H, c, icon: Icon, iconColor = "#1f6f86", label, delay = 0, fs = 14 }: { at: G; s?: number; h?: number; c: string[]; icon: LucideIcon; iconColor?: string; label: string; delay?: number; fs?: number }) {
  const [x, y] = L(...at)
  const k = s / 2
  return (
    <g transform={`translate(${x} ${y})`}>
      <Drop delay={delay}>
        <Shadow poly={[P(-k, -k), P(k, -k), P(k, k), P(-k, k)]} />
        <Box x={-k} y={-k} w={s} d={s} h={h} c={c} op={0.94} />
        <polygon points={pts([P(-k + 6, k, h - 6), P(-k + 20, k, h - 6), P(-k + 8, k, 8), P(-k + 6, k, 8)])} fill="#fff" opacity={0.55} />
        <Icon x={-12} y={-h - k - 4} width={24} height={24} strokeWidth={1.8} color={iconColor} />
        <text className="cube-label" x={0} y={-h + 12} textAnchor="middle" fontSize={fs} fontWeight={800} fill={INK}>{label}</text>
      </Drop>
    </g>
  )
}

/* ================= 動態層:只用 transform / opacity ================= */
function Moving({ l, hot }: { l: Look; hot: boolean }) {
  if (!l.dbs) return null
  const ora = l.oraSmall ? ORA_SMALL : ORA_BIG
  const occ: Occluder[] = [cylOcc(L(0, 0), ora.r, ora.h), cylOcc(L(0, DB_YS[1]), DB.r, DB.h), cylOcc(L(0, DB_YS[2]), DB.r, DB.h)]
  if (l.pg) occ.push(cylOcc(L(...REP_AT), DB.r, DB.h))
  if (l.plasma) occ.push(boxOcc(PLASMA, PL, PL_H + (l.docs ? 34 : 0)))
  if (l.agent) occ.push(boxOcc(AGENT_AT, CUBE / 2, CUBE_H))
  if (l.sql) occ.push(boxOcc(SQL_AT, CUBE / 2, CUBE_H))
  if (l.confused) occ.push(boxOcc(ROSTER_AT, CUBE / 2, CUBE_H))
  if (l.product) UNITS.forEach((u) => occ.push(boxOcc(u.at, 23, 36)))
  if (l.it) occ.push(cylOcc(L(...PERSON_AT), 24, 106))
  const k = `${l.oraSmall}-${l.pg}-${l.agent}-${l.product}-${l.docs}-${hot}`
  const busy = hot || l.reads
  return (
    <>
      {l.it && !l.plasma && DB_YS.map((_, i) => <Dots key={`p${i}-${k}`} path={path(dbToPerson(i))} occ={occ} color={ORANGE} heavy />)}
      {l.plasma && DB_YS.map((_, i) => (i === 0 && l.toPg ? null : <Dots key={`l${i}-${k}`} path={path(dbToPlasma(i))} occ={occ} color={i === 0 && busy ? ORANGE : GREEN} heavy={i === 0 && busy} />))}
      {l.plasma && <Dots key={`pp-${k}`} path={path(plasmaToPerson)} occ={occ} color={GREEN} />}
      {l.confused && !l.agent && <Dots key={`r-${k}`} path={path(personToRoster)} occ={occ} color={ORANGE} heavy />}
      {l.sql && <Dots key={`s-${k}`} path={path(plasmaTo(SQL_AT))} occ={occ} color={GREEN} />}
      {l.agent && <Dots key={`a-${k}`} path={path(plasmaTo(ROSTER_AT))} occ={occ} color={GREEN} />}
      {l.product && UNITS.map((u) => <Dots key={`u${u.name}-${k}`} path={path(productTo(u.at))} occ={occ} color={GREEN} />)}
      {l.pg && <Dots key={`sync-${k}`} path={path([[0, 0], REP_AT], PIPE_Z)} occ={occ} color={RED} square />}
      {l.toPg && <Dots key={`rep-${k}`} path={path(repToPlasma)} occ={occ} color={GREEN} />}
    </>
  )
}

type Occluder = (p: Pt) => boolean
function cylOcc(c: Pt, r: number, h: number): Occluder {
  const rx = r * Math.SQRT2
  const ry = rx / 2
  return ([x, y]) => {
    const dx = x - c[0]
    if (Math.abs(dx) > rx) return false
    const k = Math.sqrt(1 - (dx / rx) ** 2) * ry
    return y >= c[1] - h - k && y <= c[1] + k
  }
}
/** 方塊的輪廓(地面中心 at、半寬 k、高 h) */
function boxOcc(at: G, k: number, h: number): Occluder {
  const c = L(...at)
  return polyOcc([P(-k, -k, h), P(k, -k, h), P(k, -k, 0), P(k, k, 0), P(-k, k, 0), P(-k, k, h)].map((q) => add(q, c)))
}
function polyOcc(poly: Pt[]): Occluder {
  return ([x, y]) => {
    let inside = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i]
      const [xj, yj] = poly[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
}

function along(p: Pt[], cum: number[], d: number): Pt {
  let i = 1
  while (i < cum.length - 1 && cum[i] < d) i++
  const seg = cum[i] - cum[i - 1] || 1
  const t = Math.max(0, Math.min(1, (d - cum[i - 1]) / seg))
  return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t]
}

function visibleRuns(p: Pt[], occ: Occluder[]) {
  const cum = [0]
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]))
  const total = cum[cum.length - 1]
  const runs: [number, number][] = []
  let start = -1
  const STEP = 4
  for (let d = 0; d <= total; d += STEP) {
    const vis = !occ.some((o) => o(along(p, cum, d)))
    if (vis && start < 0) start = d
    if (!vis && start >= 0) { runs.push([start, d - STEP]); start = -1 }
  }
  if (start >= 0) runs.push([start, total])
  return { cum, runs: runs.filter(([a, b]) => b - a > 24) }
}

function Dots({ path: p, occ, color, heavy = false, square = false }: { path: Pt[]; occ: Occluder[]; color: string; heavy?: boolean; square?: boolean }) {
  const { R, paused, lite } = useContext(Layer)
  const host = useRef<HTMLDivElement>(null)
  const { cum, runs } = visibleRuns(p, occ)
  const spacing = (heavy ? 46 : square ? 52 : 72) * (lite ? 1.7 : 1)
  const speed = heavy ? 120 : square ? 210 : 230
  const plan = runs.map(([a, b]) => ({ a, b, n: Math.max(1, Math.floor((b - a) / spacing)) }))
  const key = `${R}|${plan.map((x) => `${x.a.toFixed(0)}-${x.b.toFixed(0)}-${x.n}`).join(",")}`

  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const anims: Animation[] = []
    let k = 0
    for (const { a, b, n } of plan) {
      const len = b - a
      const fade = Math.min(0.12, 18 / len)
      const ds = new Set([a, a + len * fade, b - len * fade, b])
      for (const c of cum) if (c > a && c < b) ds.add(c)
      const frames = [...ds].sort((x, y) => x - y).map((d) => {
        const [x, y] = along(p, cum, d)
        const off = (d - a) / len
        return { offset: off, opacity: off < fade ? off / fade : off > 1 - fade ? (1 - off) / fade : 1, transform: `translate3d(${(x - WORLD.x) * R}px, ${(y - WORLD.y) * R}px, 0)` }
      })
      const dur = (len / speed) * 1000
      for (let i = 0; i < n; i++) {
        const dot = el.children[k++] as HTMLElement | undefined
        if (!dot) continue
        anims.push(dot.animate(frames, { duration: dur, iterations: Infinity, delay: -(dur * i) / n, easing: "linear" }))
      }
    }
    return () => anims.forEach((x) => x.cancel())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    host.current?.getAnimations({ subtree: true }).forEach((x) => (paused ? x.pause() : x.play()))
  }, [paused, key])

  const total = plan.reduce((n, x) => n + x.n, 0)
  const size = (square ? 11 : 13) * R
  return (
    <div ref={host} className="fx">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={`dot${square ? " sq" : ""}`} style={{ width: size, height: square ? size * 0.8 : size, marginLeft: -size / 2, marginTop: -size / 2, background: color, borderWidth: 1.5 * R }} />
      ))}
    </div>
  )
}

/** Oracle 太忙時底下的紅光 */
function Heat({ at, r }: { at: Pt; r: number }) {
  const { R } = useContext(Layer)
  const w = r * 4.6 * R
  const h = r * 2.3 * R
  return <div className="heat" style={{ left: (at[0] - WORLD.x) * R - w / 2, top: (at[1] + 6 - WORLD.y) * R - h / 2, width: w, height: h }} />
}

/* ================= 基本形狀 ================= */
function Box({ x, y, z = 0, w, d, h, c, stroke = INK, sw = 1.2, op = 1 }: { x: number; y: number; z?: number; w: number; d: number; h: number; c: string[]; stroke?: string; sw?: number; op?: number }) {
  const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]
  const left = [P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)]
  const right = [P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)]
  return (
    <g strokeLinejoin="round">
      <polygon points={pts(left)} fill={c[1]} fillOpacity={op} />
      <polygon points={pts(right)} fill={c[2]} fillOpacity={op} />
      <polygon points={pts(top)} fill={c[0]} fillOpacity={op} />
      <polyline points={pts([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y, z + h)].map((p) => add(p, [0, 1.6])))} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.2} />
      <polygon points={pts([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z), P(x, y + d, z + h)])} fill="none" stroke={stroke} strokeWidth={sw} />
      <polyline points={pts([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y, z + h)])} fill="none" stroke={stroke} strokeWidth={sw * 0.7} />
      <line x1={P(x + w, y + d, z + h)[0]} y1={P(x + w, y + d, z + h)[1]} x2={P(x + w, y + d, z)[0]} y2={P(x + w, y + d, z)[1]} stroke={stroke} strokeWidth={sw * 0.7} />
    </g>
  )
}

function Cyl({ r, h, grad, top, bands = 0, sw = 1.2, dash, leds }: { r: number; h: number; grad: string; top: string; bands?: number; sw?: number; dash?: boolean; leds?: boolean }) {
  const rx = r * Math.SQRT2
  const ry = rx / 2
  const side = `M${-rx} ${-h} L${-rx} 0 A${rx} ${ry} 0 0 0 ${rx} 0 L${rx} ${-h} A${rx} ${ry} 0 0 1 ${-rx} ${-h} Z`
  const st = { stroke: INK, strokeWidth: sw, strokeDasharray: dash ? "7 6" : undefined }
  return (
    <g>
      <path d={side} fill={dash ? "none" : `url(#${grad})`} {...st} />
      {Array.from({ length: bands }, (_, i) => {
        const hb = (h * (i + 1)) / (bands + 1)
        return <path key={i} d={`M${-rx} ${-hb} A${rx} ${ry} 0 0 0 ${rx} ${-hb}`} fill="none" stroke={INK} strokeWidth={sw * 0.6} strokeOpacity={0.55} />
      })}
      {leds && !dash && [-0.62, -0.5, -0.38].map((k, i) => {
        const x = rx * k
        const y = -h * 0.42 + ry * Math.sqrt(1 - k * k)
        return <circle key={i} cx={x} cy={y} r={3.2} fill={i === 2 ? "#f0b43c" : "#4fb06d"} stroke={INK} strokeWidth={0.6} />
      })}
      <ellipse cx={0} cy={-h} rx={rx} ry={ry} fill={dash ? "none" : top} {...st} />
      {!dash && <ellipse cx={0} cy={-h} rx={rx * 0.88} ry={ry * 0.88} fill="none" stroke={INK} strokeOpacity={0.3} strokeWidth={sw * 0.6} />}
    </g>
  )
}

/** 直立的小標籤(中心在 x,y) */
function Pill({ x, y, text, tone = "paper", size = 15, mono = false }: { x: number; y: number; text: string; tone?: "paper" | "ink" | "red" | "green"; size?: number; mono?: boolean }) {
  const w = [...text].reduce((n, ch) => n + (ch.charCodeAt(0) > 255 ? size : size * (mono ? 0.62 : 0.6)), 0) + size * 1.5
  const h = size * 2
  const fill = { paper: "#fffdf8", ink: INK, red: RED, green: GREEN }[tone]
  const color = tone === "paper" ? INK : "#fff"
  const ui = useContext(UI)
  return (
    <g className="pill pop-in" transform={`translate(${x} ${y}) scale(${ui})`}>
      <rect x={-w / 2} y={-h / 2 + 1.6} width={w} height={h} rx={h / 2} fill={INK} opacity={0.75} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={fill} stroke={INK} strokeWidth={1.1} />
      <text x={0} y={size * 0.36} textAnchor="middle" fontSize={size} fontWeight={800} fill={color} className={mono ? "mono" : undefined}>{text}</text>
    </g>
  )
}

function Shadow({ poly, faint = false }: { poly: Pt[]; faint?: boolean }) {
  return (
    <g fill="#6b5236" opacity={faint ? 0.6 : 1}>
      <polygon points={pts(poly.map((p) => add(p, [0, 16])))} opacity={0.06} />
      <polygon points={pts(poly.map((p) => add(p, [0, 8])))} opacity={0.08} />
    </g>
  )
}

function Drop({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return <g className="drop" style={{ animationDelay: `${delay}s` }}>{children}</g>
}

function LoadPill({ x, y, v }: { x: number; y: number; v: number }) {
  const hot = v > 60
  const col = hot ? "#c8402c" : GREEN
  const ui = useContext(UI)
  return (
    <g transform={`translate(${x} ${y}) scale(${ui})`} className="pill">
      <rect x={-70} y={-16 + 1.6} width={140} height={32} rx={16} fill={INK} opacity={0.75} />
      <rect x={-70} y={-16} width={140} height={32} rx={16} fill="#fffdf8" stroke={INK} strokeWidth={1.1} />
      <circle cx={-52} cy={0} r={6} fill={col} />
      <rect x={-40} y={-5} width={50} height={10} rx={5} fill="#ebe3d4" />
      <rect x={-40} y={-5} width={(50 * v) / 100} height={10} rx={5} fill={col} />
      <text x={44} y={6} textAnchor="middle" fontSize={17} fontWeight={800} fill={col} className="mono">{v}%</text>
    </g>
  )
}

/** 網路管線:外層較深、中間一條亮線;dim = 還接著但沒有資料在跑 */
function Cable({ g, tone = "ok", dim = false }: { g: G[]; tone?: "ok" | "bad"; dim?: boolean }) {
  const d = toD(path(g))
  return (
    <g opacity={dim ? 0.45 : 1}>
      <path className={`cable${tone === "bad" ? " bad" : ""}`} d={d} pathLength={1} />
      <path className="cable-core" d={d} pathLength={1} />
    </g>
  )
}

/** 沒有底框的標籤:logo + 字,字外圍一圈紙色描邊;sub 是下面一行小字 */
function Tag({ x, y, text, logo, size = 16, sub }: { x: number; y: number; text: string; logo?: string; size?: number; sub?: string }) {
  const ui = useContext(UI)
  const tw = [...text].reduce((n, ch) => n + (ch.charCodeAt(0) > 255 ? size : size * 0.6), 0)
  const lw = logo ? size * 1.25 : 0
  const gap = logo ? size * 0.35 : 0
  const x0 = -(lw + gap + tw) / 2
  const halo = { stroke: "#fbf8f2", strokeWidth: 4, paintOrder: "stroke" as const, strokeLinejoin: "round" as const }
  return (
    <g transform={`translate(${x} ${y}) scale(${ui})`}>
      {logo && <image href={logo} x={x0} y={-lw / 2} width={lw} height={lw} />}
      <text x={x0 + lw + gap} y={size * 0.36} fontSize={size} fontWeight={800} fill={INK} {...halo}>{text}</text>
      {sub && <text className="tag-sub" x={0} y={size * 0.36 + size * 1.05} textAnchor="middle" fontSize={size * 0.72} fontWeight={700} fill="#6b6359" {...halo}>{sub}</text>}
    </g>
  )
}
