import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Bell, BrickWall, CreditCard, Database, FileText, Laptop, Lock, Package, Pickaxe, Search, ShieldCheck, ShoppingCart } from "lucide-react"

/* ================= 圖解場景 =================
   全部用畫面座標(等角 2:1)。整個畫面是 (step, t) 的純函式:
   step 是第幾步(0 起算),t 是這一步開始後經過的秒數,暫停就是 t 不動。 */

type V = [number, number]
const INK = "#1d1b18"
const MUTED = "#a69d90"
const RED = "#c8412f"
const GREEN = "#4f8a3c"
const VIOLET = "#7b5fb4"
const FONT = '"JetBrains Mono", "Noto Sans TC", ui-monospace, monospace'

// 頂面、左面、右面、底邊
const TONE = {
  blue: ["#e6eef9", "#c3d5ef", "#a9c0e4", "#8096bd"],
  violet: ["#f1eafb", "#dccdf2", "#c8b4e8", "#9a85c2"],
  orange: ["#fde8d2", "#f8c89d", "#f0b07c", "#c98a55"],
  green: ["#ebf3de", "#d2e5b6", "#bbd59a", "#8fac6d"],
  red: ["#fae3df", "#f1bfb7", "#e6a397", "#b86a5d"],
  gray: ["#efe9e0", "#dbd3c6", "#cbc1b2", "#a0968a"],
} as const
type ToneName = keyof typeof TONE

const DR: V = [1, 0.5]
const UR: V = [1, -0.5]
const UP: V = [0, -1]

/** 從 a 先沿 d1 再沿 d2 走到 b(等角折線);解不出來就直線 */
function elbow(a: V, b: V, d1: V = UR, d2: V = DR): V[] {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const det = d1[0] * d2[1] - d1[1] * d2[0]
  if (Math.abs(det) < 1e-6) return [a, b]
  const u = (dx * d2[1] - dy * d2[0]) / det
  const v = (d1[0] * dy - d1[1] * dx) / det
  if (u < -0.5 || v < -0.5) return [a, b]
  const c: V = [a[0] + d1[0] * u, a[1] + d1[1] * u]
  return [a, c, b]
}
const len = (a: V, b: V) => Math.hypot(b[0] - a[0], b[1] - a[1])
const total = (p: V[]) => p.slice(1).reduce((s, q, i) => s + len(p[i], q), 0)
/** 折線上走到 f(0~1)的位置 */
function along(p: V[], f: number): V {
  let d = Math.max(0, Math.min(1, f)) * total(p)
  for (let i = 1; i < p.length; i++) {
    const l = len(p[i - 1], p[i])
    if (d <= l || i === p.length - 1) {
      const k = l === 0 ? 0 : Math.min(1, d / l)
      return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k]
    }
    d -= l
  }
  return p[p.length - 1]
}
/** 折線兩端各剪掉一段(線鑽進方塊底下,箭頭要露出來) */
function trim(p: V[], s: number, e: number): V[] {
  const T = total(p)
  if (T <= s + e) return p
  const out: V[] = [along(p, s / T)]
  let acc = 0
  for (let i = 1; i < p.length - 1; i++) {
    acc += len(p[i - 1], p[i])
    if (acc > s && acc < T - e) out.push(p[i])
  }
  out.push(along(p, (T - e) / T))
  return out
}
/** 折線從起點走到 f 為止 */
function upto(p: V[], f: number): V[] {
  const T = total(p)
  const out: V[] = [p[0]]
  let acc = 0
  for (let i = 1; i < p.length; i++) {
    acc += len(p[i - 1], p[i])
    if (acc >= f * T) break
    out.push(p[i])
  }
  out.push(along(p, f))
  return out
}
const d = (p: V[]) => "M" + p.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" L")
const poly = (...p: V[]) => p.map((q) => q.join(",")).join(" ")
const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const ease = (x: number) => { const k = clamp01(x); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2 }
/** 在 [a, b] 秒之間從 0 走到 1 */
const ramp = (t: number, a: number, b: number) => ease((t - a) / (b - a))
/** 文字寬度估算:中日韓字一格,英數 0.6 格(等寬字) */
const tw = (s: string, fs: number) => [...s].reduce((w, ch) => w + (/[⺀-￯]/.test(ch) ? fs : fs * 0.62), 0)

/* ================= 場景配置 ================= */
const AT = {
  cust: [150, 470] as V,
  fw: [270, 410] as V,
  store: [420, 350] as V,
  pay1: [620, 250] as V,
  pay2: [620, 450] as V,
  db: [820, 350] as V,
  sus: [1040, 300] as V,
  sen: [620, 590] as V,
  oncall: [850, 600] as V,
  inv: [470, 175] as V,
  gate: [330, 600] as V,
  dev: [120, 690] as V,
  audit: [1040, 540] as V,
}
const BLOCK_H = 62
const BLOCK_A = 58

const P = {
  custStore: elbow(AT.cust, AT.store),
  storePay1: [AT.store, AT.pay1] as V[],
  storePay2: [AT.store, AT.pay2] as V[],
  pay1Db: [AT.pay1, AT.db] as V[],
  pay2Db: [AT.pay2, AT.db] as V[],
  pay1Sus: elbow(AT.pay1, AT.sus, UR, DR),
  pay2Sus: elbow(AT.pay2, AT.sus, DR, UR),
  senOncall: elbow(AT.sen, AT.oncall, DR, UR),
  senAudit: elbow(AT.sen, AT.audit, UR, DR),
  devGate: elbow(AT.dev, AT.gate, UR, DR),
  gateStore: elbow(AT.gate, AT.store, UR, UP),
}
// 攻擊者那一個人的位置(混在顧客平台上)
const ATTACKER: V = [AT.cust[0] + 46, AT.cust[1] - 4]
const attackPath: V[] = [ATTACKER, ...elbow(ATTACKER, AT.store).slice(1), AT.pay1]

/* ================= 基本圖形 ================= */
function Block({ at, tone, label, sub, icon: Icon, a = BLOCK_A, h = BLOCK_H, dim = false, glow }: {
  at: V; tone: ToneName; label: string; sub?: string; icon?: LucideIcon; a?: number; h?: number; dim?: boolean; glow?: string
}) {
  const [x, y] = at
  const [top, left, right, lip] = TONE[tone]
  const b = a / 2
  const sil = poly([x, y - h - b], [x + a, y - h], [x + a, y], [x, y + b], [x - a, y], [x - a, y - h])
  return (
    <g opacity={dim ? 0.55 : 1}>
      {glow && <ellipse cx={x} cy={y + 4} rx={a * 1.7} ry={a * 0.9} fill={`url(#${glow})`} />}
      {/* 底下一圈較深的邊,做出厚度 */}
      <polygon points={poly([x + a, y], [x + a, y + 6], [x, y + b + 6], [x - a, y + 6], [x - a, y], [x, y + b])} fill={lip} stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
      <polygon points={poly([x - a, y - h], [x, y - h + b], [x, y + b], [x - a, y])} fill={left} />
      <polygon points={poly([x, y - h + b], [x + a, y - h], [x + a, y], [x, y + b])} fill={right} />
      <polygon points={poly([x, y - h - b], [x + a, y - h], [x, y - h + b], [x - a, y - h])} fill={top} />
      <path d={`M${x - a} ${y - h} L${x} ${y - h + b} L${x + a} ${y - h} M${x} ${y - h + b} L${x} ${y + b}`} stroke={INK} strokeOpacity={0.35} strokeWidth={1.2} fill="none" />
      <BlockDetail x={x} y={y} a={a} h={h} />
      <polygon points={sil} fill="none" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      {Icon && <Icon x={x - 13} y={y - h - 14} width={26} height={26} stroke={INK} strokeWidth={1.7} />}
      <text x={x} y={y - h / 2 + 12} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={label.length > 10 ? 15 : 17} fill={INK}>{label}</text>
      {sub && <text x={x} y={y - h / 2 + 30} textAnchor="middle" fontFamily={FONT} fontSize={12.5} fill={INK} opacity={0.75}>{sub}</text>}
    </g>
  )
}

/** Pod 方塊的細節:前面板(左側面)下方散熱槽與燈號、右側面通風條、頂面前緣高光 */
function BlockDetail({ x, y, a, h }: { x: number; y: number; a: number; h: number }) {
  const b = a / 2
  const L = (f: number, v: number): V => [x - a + a * f, y - h + b * f + v] // 左側面:f 沿上緣,v 往下
  const R = (f: number, v: number): V => [x + a * f, y - h + b - b * f + v] // 右側面
  return (
    <g>
      <path d={`M${x - a} ${y - h + 1.2} L${x} ${y - h + b + 1.2} L${x + a} ${y - h + 1.2}`} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.2} />
      {[h - 16, h - 11].map((v) => <path key={v} d={d([L(0.14, v), L(0.62, v)])} stroke={INK} strokeOpacity={0.3} strokeWidth={1.1} strokeLinecap="round" />)}
      <circle cx={L(0.82, h - 13)[0]} cy={L(0.82, h - 13)[1]} r={2.2} fill="#4f8a3c" stroke={INK} strokeWidth={0.6} />
      {[0.2, 0.35, 0.5, 0.65, 0.8].map((f) => <path key={f} d={d([R(f, h * 0.62), R(f, h - 8)])} stroke={INK} strokeOpacity={0.18} strokeWidth={1} />)}
    </g>
  )
}

/** 資料庫圓柱的細節:左側高光、右側陰影、狀態燈 */
function CylDetail({ x, y, r, h }: { x: number; y: number; r: number; h: number }) {
  const ry = r / 2
  const yAt = (dx: number) => ry * Math.sqrt(Math.max(0, 1 - (dx / r) ** 2))
  const strip = (k1: number, k2: number) => {
    const x1 = x + r * k1
    const x2 = x + r * k2
    return `M${x1} ${y - h + yAt(r * k1)} L${x2} ${y - h + yAt(r * k2)} L${x2} ${y + yAt(r * k2)} L${x1} ${y + yAt(r * k1)} Z`
  }
  return (
    <g>
      <path d={strip(-0.62, -0.32)} fill="#fff" opacity={0.5} />
      <path d={strip(0.5, 0.98)} fill={INK} opacity={0.07} />
      {[-0.55, -0.4, -0.25].map((k, i) => <circle key={k} cx={x + r * k} cy={y - h * 0.22 + yAt(r * k)} r={2.2} fill={i === 2 ? "#e6a23c" : "#4f8a3c"} stroke={INK} strokeWidth={0.6} />)}
    </g>
  )
}

function Cylinder({ at, tone, label, icon: Icon, r = 56, h = 62 }: { at: V; tone: ToneName; label: string; icon?: LucideIcon; r?: number; h?: number }) {
  const [x, y] = at
  const [top, left, , lip] = TONE[tone]
  const ry = r / 2
  return (
    <g>
      <path d={`M${x - r} ${y} L${x - r} ${y + 6} A${r} ${ry} 0 0 0 ${x + r} ${y + 6} L${x + r} ${y} Z`} fill={lip} stroke={INK} strokeWidth={1.3} />
      <path d={`M${x - r} ${y - h} L${x - r} ${y} A${r} ${ry} 0 0 0 ${x + r} ${y} L${x + r} ${y - h} Z`} fill={left} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      <CylDetail x={x} y={y} r={r} h={h} />
      <path d={`M${x - r} ${y - h / 2} A${r} ${ry} 0 0 0 ${x + r} ${y - h / 2}`} fill="none" stroke={INK} strokeOpacity={0.3} strokeWidth={1.2} />
      <ellipse cx={x} cy={y - h} rx={r} ry={ry} fill={top} stroke={INK} strokeWidth={1.4} />
      <ellipse cx={x} cy={y - h} rx={r * 0.8} ry={ry * 0.8} fill="none" stroke={INK} strokeOpacity={0.25} strokeWidth={1} />
      {Icon && <Icon x={x - 12} y={y - h - 12} width={24} height={24} stroke={INK} strokeWidth={1.7} />}
      <text x={x} y={y - h / 2 + 18} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={16} fill={INK}>{label}</text>
    </g>
  )
}

/** 平台(放人或筆電的薄板) */
function Slab({ at, a, tone = "gray", children }: { at: V; a: number; tone?: ToneName; children?: ReactNode }) {
  const [x, y] = at
  const b = a / 2
  const th = 10
  const [top, left, right] = TONE[tone]
  return (
    <g>
      <polygon points={poly([x - a, y], [x, y + b], [x, y + b + th], [x - a, y + th])} fill={left} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      <polygon points={poly([x, y + b], [x + a, y], [x + a, y + th], [x, y + b + th])} fill={right} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      <polygon points={poly([x, y - b], [x + a, y], [x, y + b], [x - a, y])} fill={top} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      <polygon points={poly([x, y - b * 0.84], [x + a * 0.84, y], [x, y + b * 0.84], [x - a * 0.84, y])} fill="none" stroke={INK} strokeOpacity={0.2} strokeWidth={1} />
      {[0.12, 0.2, 0.28].map((f) => <path key={f} d={`M${x - a + a * f} ${y + b * f + th * 0.5} l${a * 0.05} ${b * 0.05}`} stroke={INK} strokeOpacity={0.4} strokeWidth={1.4} strokeLinecap="round" />)}
      <circle cx={x - a * 0.14} cy={y + b * 0.86 + th * 0.5} r={1.8} fill="#4f8a3c" />
      {children}
    </g>
  )
}

const PEOPLE = ["#f3b98c", "#c3d5ef", "#d2e5b6", "#dccdf2", "#f5d98d"]
function Person({ at, fill, s = 1, bad = false }: { at: V; fill: string; s?: number; bad?: boolean }) {
  const [x, y] = at
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={0} rx={9} ry={4} fill={INK} opacity={0.12} />
      <rect x={-7.5} y={-24} width={15} height={24} rx={7.5} fill={bad ? "#e06650" : fill} stroke={INK} strokeWidth={1.15} />
      <circle cx={0} cy={-31} r={6.5} fill={bad ? "#e06650" : "#fffaf2"} stroke={INK} strokeWidth={1.15} />
      {bad && <path d="M-3.2 -32.5 l2 1.2 M3.2 -32.5 l-2 1.2" stroke={INK} strokeWidth={1} strokeLinecap="round" />}
    </g>
  )
}

function LaptopShape({ at, screen = "#dccdf2" }: { at: V; screen?: string }) {
  const [x, y] = at
  return (
    <g strokeLinejoin="round">
      <polygon points={poly([x - 30, y - 4], [x, y + 11], [x + 30, y - 4], [x, y - 19])} fill="#f6f1ea" stroke={INK} strokeWidth={1.2} />
      <polygon points={poly([x - 30, y - 4], [x, y - 19], [x, y - 61], [x - 30, y - 46])} fill="#fffaf2" stroke={INK} strokeWidth={1.2} />
      <polygon points={poly([x - 25, y - 10], [x - 4, y - 21], [x - 4, y - 55], [x - 25, y - 44])} fill={screen} />
      {/* 鍵盤紋路與觸控板 */}
      {[0, 1, 2].map((i) => <path key={i} d={`M${x - 18 + i * 4} ${y - 4 + i * 2} L${x + 4 + i * 4} ${y - 15 + i * 2}`} stroke={INK} strokeOpacity={0.3} strokeWidth={1} />)}
      <polygon points={poly([x + 6, y + 2], [x + 14, y - 2], [x + 20, y + 1], [x + 12, y + 5])} fill="none" stroke={INK} strokeOpacity={0.35} strokeWidth={0.9} />
    </g>
  )
}

/** 圓角標籤:等寬字,粗框 */
function Pill({ at, text, icon: Icon, tone = "paper", fs = 13, anchor = "middle", opacity = 1 }: {
  at: V; text: string; icon?: LucideIcon; tone?: "paper" | "red" | "green" | "violet" | "ink"; fs?: number; anchor?: "middle" | "start"; opacity?: number
}) {
  fs = fs * 1.12
  const fill = { paper: "#fbf6ee", red: "#f8d9d3", green: "#dcedc8", violet: "#e9def8", ink: INK }[tone]
  const color = { paper: INK, red: "#8f2a1f", green: "#2f5a22", violet: "#4a347a", ink: "#fbf6ee" }[tone]
  const iw = Icon ? fs + 6 : 0
  const w = tw(text, fs) + iw + 22
  const h = fs + 14
  const x0 = anchor === "middle" ? at[0] - w / 2 : at[0]
  const y0 = at[1] - h / 2
  if (opacity <= 0) return null
  return (
    <g opacity={opacity}>
      <rect x={x0 + 2} y={y0 + 3} width={w} height={h} rx={h / 2} fill={INK} />
      <rect x={x0} y={y0} width={w} height={h} rx={h / 2} fill={fill} stroke={INK} strokeWidth={1.15} />
      {Icon && <Icon x={x0 + 10} y={at[1] - fs / 2 - 1} width={fs + 2} height={fs + 2} stroke={color} strokeWidth={1.7} />}
      <text x={x0 + 11 + iw} y={at[1] + fs * 0.36} fontFamily={FONT} fontSize={fs} fontWeight={600} fill={color}>{text}</text>
    </g>
  )
}

/** 小計量條(CPU) */
function Gauge({ at, pct }: { at: V; pct: number }) {
  const [x, y] = at
  const hot = pct > 70
  return (
    <g>
      <rect x={x - 54} y={y - 12} width={110} height={26} rx={13} fill={INK} />
      <rect x={x - 56} y={y - 15} width={110} height={26} rx={13} fill="#fbf6ee" stroke={INK} strokeWidth={1.15} />
      <text x={x - 44} y={y + 3} fontFamily={FONT} fontSize={10} fontWeight={700} fill={INK}>CPU</text>
      <rect x={x - 18} y={y - 6} width={36} height={8} rx={4} fill="#e6ddd0" />
      <rect x={x - 18} y={y - 6} width={36 * pct / 100} height={8} rx={4} fill={hot ? RED : GREEN} />
      <text x={x + 46} y={y + 3} textAnchor="end" fontFamily={FONT} fontSize={12} fontWeight={700} fill={hot ? RED : INK}>{Math.round(pct)}%</text>
    </g>
  )
}

type EdgeTone = "ink" | "muted" | "red" | "violet"
const EDGE_COLOR: Record<EdgeTone, string> = { ink: INK, muted: MUTED, red: RED, violet: VIOLET }
function Edge({ p, tone = "ink", dash, arrow = true, s = 46, e = 52, w = 1.6, opacity = 1 }: { p: V[]; tone?: EdgeTone; dash?: string; arrow?: boolean; s?: number; e?: number; w?: number; opacity?: number }) {
  return <path d={d(trim(p, s, e))} fill="none" stroke={EDGE_COLOR[tone]} strokeWidth={w} strokeDasharray={dash} strokeLinejoin="round" strokeLinecap="round" markerEnd={arrow ? `url(#arrow-${tone})` : undefined} opacity={opacity} />
}

type DotKind = "req" | "res" | "bad" | "alert"
const DOT: Record<DotKind, [string, string]> = { req: ["#f0a466", INK], res: ["#fbf6ee", GREEN], bad: ["#e2553f", INK], alert: ["#c8b4e8", INK] }
/** 沿線流動的小點。stop:走到這個比例就消失(被擋下) */
function Dots({ p, t, n = 3, period = 2.4, kind = "req", s = 46, e = 52, stop, phase = 0 }: {
  p: V[]; t: number; n?: number; period?: number; kind?: DotKind; s?: number; e?: number; stop?: number; phase?: number
}) {
  const path = trim(p, s, e)
  const [fill, stroke] = DOT[kind]
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const f = (((t + phase) / period + i / n) % 1 + 1) % 1
        if (stop !== undefined && f > stop) return null
        const [x, y] = along(path, f)
        return <circle key={i} cx={x} cy={y} r={kind === "res" ? 5 : 6} fill={fill} stroke={stroke} strokeWidth={kind === "res" ? 2.2 : 1.8} />
      })}
    </g>
  )
}

function XMark({ at, r = 11, opacity = 1 }: { at: V; r?: number; opacity?: number }) {
  const [x, y] = at
  return (
    <g opacity={opacity}>
      <circle cx={x} cy={y} r={r} fill={RED} stroke={INK} strokeWidth={1.15} />
      <path d={`M${x - r * 0.4} ${y - r * 0.4} L${x + r * 0.4} ${y + r * 0.4} M${x + r * 0.4} ${y - r * 0.4} L${x - r * 0.4} ${y + r * 0.4}`} stroke="#fff" strokeWidth={1.3} strokeLinecap="round" />
    </g>
  )
}

/** 放在地上、沿等角方向斜排的虛線框字(像 USER · 8 TOKENS) */
function GroundTag({ at, text, angle = -26.57, color = INK }: { at: V; text: string; angle?: number; color?: string }) {
  const fs = 12
  const w = tw(text, fs) + 26
  return (
    <g transform={`translate(${at[0]} ${at[1]}) rotate(${angle}) skewX(${angle < 0 ? 0 : 0})`}>
      <rect x={-w / 2} y={-13} width={w} height={26} fill="none" stroke={color} strokeWidth={1} strokeDasharray="5 4" rx={3} />
      <text x={0} y={4.5} textAnchor="middle" fontFamily={FONT} fontSize={fs} fontWeight={700} letterSpacing={2} fill={color}>{text}</text>
    </g>
  )
}

/** 映像檔小方塊 */
function ImageBox({ at, label, bad }: { at: V; label: string; bad: boolean }) {
  const [x, y] = at
  const a = 18
  const h = 20
  const [top, left, right] = TONE[bad ? "red" : "green"]
  return (
    <g>
      <polygon points={poly([x - a, y - h], [x, y - h + a / 2], [x, y + a / 2], [x - a, y])} fill={left} stroke={INK} strokeWidth={1.15} strokeLinejoin="round" />
      <polygon points={poly([x, y - h + a / 2], [x + a, y - h], [x + a, y], [x, y + a / 2])} fill={right} stroke={INK} strokeWidth={1.15} strokeLinejoin="round" />
      <polygon points={poly([x, y - h - a / 2], [x + a, y - h], [x, y - h + a / 2], [x - a, y - h])} fill={top} stroke={INK} strokeWidth={1.15} strokeLinejoin="round" />
      <Pill at={[x, y - h - 26]} text={label} tone={bad ? "red" : "green"} fs={11} />
    </g>
  )
}

/* ================= 場景 ================= */
export function Canvas({ step, t, vb }: { step: number; t: number; vb: [number, number, number, number] }) {
  const s = step
  const sentinel = s >= 2
  const learned = s >= 3
  const protect = s >= 4
  const quarantine = s >= 5
  const netpol = s >= 6
  const vulnBadges = s >= 7
  const gate = s >= 8
  const audit = s === 9
  const showInv = s === 5 || s === 6 || s === 9
  const showOncall = (s === 4 && t > 1.4 + 3.2) || s === 5 || s === 6 || s === 9

  // 第 2 步:攻擊者進來 → xmrig 啟動 → CPU 飆高 → 往外連礦池
  const s1Miner = s === 1 && t > 2.4
  const s1Cpu = s === 1 ? 30 + 67 * ramp(t, 2.4, 3.6) : 30
  // 第 5 步:攻擊再來一次 → 一啟動就被終止 → Slack
  const s4Start = 1.4
  const s4Miner = s === 4 && t > s4Start + 2.2
  const s4Kill = s === 4 && t > s4Start + 2.7
  const s4Alert = s === 4 && t > s4Start + 3.2
  const attackT = s === 1 ? t : s === 4 ? t - s4Start : -1
  const attackOn = attackT >= 0 && attackT < 2.3

  const pay1Hot = s1Miner
  const pay1Locked = quarantine
  const lockK = s === 5 ? ramp(t, 0.3, 1.2) : quarantine ? 1 : 0

  // 第 8 步:弱點標記一個一個跳出來
  const badgeK = (i: number) => (s === 7 ? ramp(t, 0.4 + i * 0.35, 0.7 + i * 0.35) : vulnBadges ? 1 : 0)
  const counter = s === 7 ? Math.round(1284 * ramp(t, 0.3, 1.8)) : 1284
  const firstK = s === 7 ? ramp(t, 2.4, 2.9) : 0

  // 第 9 步:壞映像檔被擋、好映像檔通過
  const badF = s === 8 ? clamp01(t / 1.8) : 0
  const goodF = s === 8 ? clamp01((t - 3.4) / 2.6) : 0

  const storeTone: ToneName = s === 7 && firstK > 0 ? "red" : "blue"

  // 每一層用同一個 viewBox,鏡頭在外面補間
  return (
    <svg className="ln-svg" viewBox={vb.join(" ")} preserveAspectRatio="xMidYMid meet" role="img" aria-label="K8s Sentinel 情境圖">
      <defs>
        {(Object.keys(EDGE_COLOR) as EdgeTone[]).map((k) => (
          <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 Z" fill={EDGE_COLOR[k]} />
          </marker>
        ))}
        <radialGradient id="glow-red"><stop offset="0" stopColor="#e2553f" stopOpacity={0.45} /><stop offset="1" stopColor="#e2553f" stopOpacity={0} /></radialGradient>
        <radialGradient id="glow-violet"><stop offset="0" stopColor="#9a7fd1" stopOpacity={0.4} /><stop offset="1" stopColor="#9a7fd1" stopOpacity={0} /></radialGradient>
        <radialGradient id="glow-green"><stop offset="0" stopColor="#7fb35f" stopOpacity={0.4} /><stop offset="1" stopColor="#7fb35f" stopOpacity={0} /></radialGradient>
        <pattern id="iso-grid" width="40" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 10 L20 0 L40 10 L20 20 Z" fill="none" stroke="#e3d9cb" strokeWidth={0.8} />
        </pattern>
      </defs>
      <rect x={-400} y={-300} width={2000} height={1400} fill="url(#iso-grid)" />

      {/* K8s 叢集範圍;Sentinel 上線後地板染一點紫 */}
      <polygon points={poly([300, 350], [620, 190], [940, 350], [620, 510])} fill={sentinel ? "#efe6fb" : "#f6efe4"} fillOpacity={sentinel ? 0.7 : 0.6} stroke={INK} strokeOpacity={0.55} strokeWidth={1.1} strokeDasharray="7 6" />
      <GroundTag at={[440, 468]} text="K8S 叢集 · SHOP" angle={26.57} />
      {sentinel && <GroundTag at={[812, 470]} text="KERNEL · eBPF" angle={-26.57} color={VIOLET} />}

      {/* ---------- 連線 ---------- */}
      <Edge p={P.custStore} s={60} e={50} />
      <Edge p={P.storePay1} tone={pay1Locked ? "muted" : "ink"} dash={pay1Locked ? "6 6" : undefined} />
      <Edge p={P.storePay2} />
      <Edge p={P.pay1Db} tone={pay1Locked ? "muted" : "ink"} dash={pay1Locked ? "6 6" : undefined} s={52} e={60} />
      <Edge p={P.pay2Db} s={52} e={60} />
      {(s1Miner || (s === 1 && t > 3)) && <Edge p={P.pay1Sus} tone="red" dash="7 5" e={56} />}
      {s === 6 && <Edge p={upto(trim(P.pay2Sus, 46, 56), 0.55)} tone="red" dash="7 5" s={0} e={14} arrow={false} />}
      {sentinel && (["store", "pay1", "pay2", "db"] as const).map((k) => (
        <path key={k} d={d(trim([AT.sen, AT[k]], 50, 40))} stroke={VIOLET} strokeWidth={1.1} strokeDasharray="3 6" strokeLinecap="round" fill="none" opacity={s === 2 ? ramp(t, 0.6, 1.4) : 0.75} />
      ))}
      {showOncall && <Edge p={P.senOncall} tone="violet" e={40} />}
      {gate && <Edge p={P.devGate} s={50} e={50} />}
      {gate && <Edge p={P.gateStore} s={50} e={56} />}
      {audit && <Edge p={P.senAudit} tone="violet" e={48} />}
      {showInv && <path d={d([AT.inv, AT.pay1])} stroke={VIOLET} strokeWidth={1.15} strokeDasharray="4 5" fill="none" opacity={s === 5 ? ramp(t, 1.6, 2.2) : 1} />}

      {/* ---------- 流動的小點 ---------- */}
      <Dots p={P.custStore} t={t} n={3} s={60} e={50} />
      {!pay1Locked && <Dots p={P.storePay1} t={t} n={2} phase={0.4} />}
      <Dots p={P.storePay2} t={t} n={2} phase={1.1} />
      {!pay1Locked && <Dots p={P.pay1Db} t={t} n={2} s={52} e={60} phase={0.9} />}
      <Dots p={P.pay2Db} t={t} n={2} s={52} e={60} phase={0.2} />
      <Dots p={[...P.pay2Db].reverse()} t={t} n={1} kind="res" s={60} e={52} phase={1.6} />
      {s === 1 && t > 3.6 && <Dots p={P.pay1Sus} t={t} n={4} period={1.4} kind="bad" e={56} />}
      {attackOn && (() => { const [x, y] = along(trim(attackPath, 14, 52), attackT / 2.3); return <circle cx={x} cy={y} r={7.5} fill="#e2553f" stroke={INK} strokeWidth={1.15} /> })()}
      {s === 6 && <Dots p={P.pay2Sus} t={t} n={3} period={1.8} kind="bad" e={56} stop={0.55} />}
      {s4Alert && <Dots p={P.senOncall} t={t} n={1} period={1.6} kind="alert" e={40} />}
      {audit && <Dots p={P.senAudit} t={t} n={2} period={2} kind="alert" e={48} />}

      {/* ---------- 物件(由後往前畫) ---------- */}
      {[1, 5, 6, 9].includes(s) && <Block at={AT.sus} tone="red" label="可疑主機" sub="礦池" icon={Pickaxe} a={50} h={52} dim={s !== 1 && s !== 6} />}
      {showInv && (
        <g opacity={s === 5 ? ramp(t, 1.6, 2.2) : 1}>
          <Person at={AT.inv} fill="#dccdf2" s={1.25} />
          <Search x={AT.inv[0] + 8} y={AT.inv[1] - 58} width={22} height={22} stroke={INK} strokeWidth={1.7} />
          <Pill at={[AT.inv[0] - 6, AT.inv[1] - 78]} text="資安人員蒐證" tone="violet" fs={12} />
        </g>
      )}
      <Block at={AT.pay1} tone={pay1Hot ? "red" : pay1Locked ? "gray" : "blue"} label="payment-api" sub="Pod 1" icon={CreditCard} glow={pay1Hot ? "glow-red" : undefined} dim={pay1Locked} />
      {pay1Locked && (
        <g opacity={lockK} transform={`translate(${AT.pay1[0] + 46} ${AT.pay1[1] - 92})`}>
          <circle r={19} fill="#fbf6ee" stroke={INK} strokeWidth={1.3} />
          <Lock x={-11} y={-12} width={22} height={22} stroke={INK} strokeWidth={1.7} />
        </g>
      )}
      <Block at={AT.store} tone={storeTone} label="storefront" sub="網站前台" icon={ShoppingCart} glow={firstK > 0 ? "glow-red" : undefined} />
      <Cylinder at={AT.db} tone="green" label="orders-db" icon={Database} />

      {/* 防火牆 */}
      <g>
        <polygon points={poly([AT.fw[0] - 42, AT.fw[1] - 21 - 56], [AT.fw[0] + 42, AT.fw[1] + 21 - 56], [AT.fw[0] + 42, AT.fw[1] + 21], [AT.fw[0] - 42, AT.fw[1] - 21])} fill="#f0b07c" stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
        <polygon points={poly([AT.fw[0] - 42, AT.fw[1] - 77], [AT.fw[0] - 34, AT.fw[1] - 81], [AT.fw[0] + 50, AT.fw[1] - 39], [AT.fw[0] + 42, AT.fw[1] - 35])} fill="#fde8d2" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
        {[0, 1, 2].map((i) => <path key={i} d={`M${AT.fw[0] - 42} ${AT.fw[1] - 21 - 14 * (i + 1)} l84 42`} stroke={INK} strokeOpacity={0.35} strokeWidth={1.2} />)}
        <Pill at={[AT.fw[0] - 10, AT.fw[1] - 104]} text="防火牆 ✓" icon={BrickWall} fs={12} />
      </g>

      <Block at={AT.pay2} tone="blue" label="payment-api" sub="Pod 2" icon={CreditCard} />

      {/* 顧客(攻擊者混在裡面) */}
      <Slab at={AT.cust} a={100}>
        {[[-46, -4], [-18, -18], [10, -4], [-18, 12], [16, 22], [-48, 22], [42, 10]].map(([dx, dy], i) => (
          <Person key={i} at={[AT.cust[0] + dx, AT.cust[1] + dy]} fill={PEOPLE[i % PEOPLE.length]} />
        ))}
        <Person at={ATTACKER} fill="#fff" bad={s === 1 || s === 4} />
      </Slab>
      <Pill at={[AT.cust[0] - 60, AT.cust[1] - 62]} text="顧客" fs={13} />

      {/* Sentinel 與值班人員 */}
      {sentinel && (
        <g opacity={s === 2 ? ramp(t, 0, 0.6) : 1}>
          <Block at={AT.sen} tone="violet" label="Sentinel" sub={protect ? "Protect" : "Monitoring"} icon={ShieldCheck} glow="glow-violet" a={60} h={54} />
        </g>
      )}
      {showOncall && (
        <g>
          <Person at={AT.oncall} fill="#c3d5ef" s={1.25} />
          <Pill at={[AT.oncall[0] + 4, AT.oncall[1] + 26]} text="值班人員" fs={12} />
        </g>
      )}

      {/* 部署門檻:開發者 → 門檻 → 叢集 */}
      {gate && (
        <g>
          <Slab at={AT.dev} a={56}><LaptopShape at={[AT.dev[0] + 4, AT.dev[1] + 2]} /></Slab>
          <Pill at={[AT.dev[0], AT.dev[1] + 50]} text="開發團隊" fs={12} />
          <Block at={AT.gate} tone="orange" label="部署門檻" sub="Critical=0" icon={ShieldCheck} a={56} h={54} />
        </g>
      )}
      {s === 8 && (() => {
        const stopAt = along(trim(P.devGate, 30, 132), badF)
        const hit = t > 1.85
        return (
          <g opacity={1 - ramp(t, 2.9, 3.3)}>
            <ImageBox at={stopAt} label="2 Critical" bad />
            {hit && <XMark at={[stopAt[0] + 40, stopAt[1] - 20]} r={13} />}
            {hit && <Pill at={[stopAt[0] + 70, stopAt[1] + 26]} anchor="start" text="拒絕部署" tone="red" fs={12} />}
          </g>
        )
      })()}
      {s === 8 && t > 3.4 && (() => {
        const gp = [...trim(P.devGate, 30, 0), ...trim(P.gateStore, 0, 60).slice(1)]
        return <ImageBox at={along(gp, goodF)} label="0 Critical" bad={false} />
      })()}

      {/* ---------- 疊在最上面的標籤 ---------- */}
      {/* 行程清單:Sentinel 看得到每個 Pod 在跑什麼 */}
      {sentinel && !pay1Locked && s < 7 && (
        <g opacity={s === 2 ? ramp(t, 1.2, 1.8) : 1}>
          <Pill at={[AT.pay1[0] - 132, AT.pay1[1] - 92]} text={learned ? "✓ payment-server" : "payment-server"} tone={learned ? "green" : "paper"} fs={11} />
          <Pill at={[AT.pay1[0] - 132, AT.pay1[1] - 62]} text={learned ? "✓ healthcheck" : "healthcheck"} tone={learned ? "green" : "paper"} fs={11} />
        </g>
      )}
      {s === 3 && (
        <g>
          <Pill at={[AT.pay1[0] + 4, AT.pay1[1] - 120]} text="白名單" icon={ShieldCheck} tone="green" fs={13} opacity={ramp(t, 1.2, 1.8)} />
          {/* 觀察 48 小時的時鐘 */}
          <g transform={`translate(${AT.sen[0] + 108} ${AT.sen[1] - 70})`}>
            <circle r={24} fill="#fbf6ee" stroke={INK} strokeWidth={1.3} />
            <path d={`M0 0 L0 -15`} stroke={INK} strokeWidth={1.3} strokeLinecap="round" transform={`rotate(${Math.min(t, 2.4) * 600})`} />
            <path d={`M0 0 L10 0`} stroke={INK} strokeWidth={1.3} strokeLinecap="round" transform={`rotate(${Math.min(t, 2.4) * 50})`} />
            <circle r={2.6} fill={INK} />
            <Pill at={[0, 40]} text={`觀察 ${Math.round(48 * clamp01(t / 2.4))} 小時`} fs={11} />
          </g>
        </g>
      )}
      {s1Miner && (
        <g>
          <Pill at={[AT.pay1[0] + 4, AT.pay1[1] - 120]} text="xmrig" icon={Pickaxe} tone="red" fs={14} />
          <Gauge at={[AT.pay1[0] + 120, AT.pay1[1] - 112]} pct={s1Cpu} />
        </g>
      )}
      {s === 1 && t > 3.6 && <Pill at={[AT.sus[0], AT.sus[1] + 58]} text="203.0.113.50" tone="red" fs={12} />}
      {s === 1 && (
        <Pill at={[AT.fw[0] - 10, AT.fw[1] - 136]} text="看起來是一般請求" fs={11} opacity={ramp(t, 0.4, 0.9) * (1 - ramp(t, 3.2, 3.8))} />
      )}
      {s4Miner && (
        <g>
          <Pill at={[AT.pay1[0] + 4, AT.pay1[1] - 120]} text="xmrig" icon={Pickaxe} tone={s4Kill ? "paper" : "red"} fs={14} opacity={s4Kill ? 0.55 : 1} />
          {s4Kill && <path d={`M${AT.pay1[0] - 38} ${AT.pay1[1] - 120} l84 0`} stroke={RED} strokeWidth={3} />}
          {s4Kill && <XMark at={[AT.pay1[0] + 56, AT.pay1[1] - 120]} r={13} />}
          {s4Kill && <Pill at={[AT.pay1[0] + 4, AT.pay1[1] - 152]} text="kernel 終止 · SIGKILL" tone="ink" fs={12} opacity={ramp(t, s4Start + 2.7, s4Start + 3.1)} />}
          {s4Kill && <circle cx={AT.pay1[0]} cy={AT.pay1[1] - 40} r={50 + 60 * ramp(t, s4Start + 2.7, s4Start + 3.5)} fill="none" stroke={RED} strokeWidth={3} opacity={1 - ramp(t, s4Start + 2.7, s4Start + 3.5)} />}
        </g>
      )}
      {s === 4 && <Pill at={[AT.sen[0] - 150, AT.sen[1] + 14]} text="Monitoring → Protect" tone="green" fs={12} opacity={ramp(t, 0.2, 0.8)} />}
      {showOncall && (
        <Pill at={[AT.oncall[0] + 4, AT.oncall[1] - 72]} text={s === 4 ? "Slack：xmrig 已終止" : "Slack 告警"} icon={Bell} tone="violet" fs={12} opacity={s === 4 ? ramp(t, s4Start + 4, s4Start + 4.5) : 1} />
      )}
      {s === 5 && <Pill at={[AT.pay1[0] + 4, AT.pay1[1] - 140]} text="隔離中 · 網路全斷" tone="ink" fs={12} opacity={ramp(t, 0.8, 1.4)} />}
      {s === 5 && <Pill at={[AT.pay2[0] + 4, AT.pay2[1] + 54]} text="繼續服務顧客" tone="green" fs={12} opacity={ramp(t, 1.2, 1.8)} />}
      {s === 6 && (() => {
        const [x, y] = along(trim(P.pay2Sus, 46, 56), 0.55)
        return (
          <g>
            <XMark at={[x, y]} r={13} />
            <Pill at={[x + 20, y]} anchor="start" text="Denied · 不在白名單" tone="red" fs={12} opacity={ramp(t, 0.6, 1.1)} />
            <Pill at={[AT.pay2[0], AT.pay2[1] - 116]} text="payment-api-allow" icon={ShieldCheck} tone="green" fs={12} opacity={ramp(t, 0.2, 0.7)} />
          </g>
        )
      })()}

      {/* 弱點標記 */}
      {vulnBadges && (
        <g>
          <Pill at={[AT.store[0] - 4, AT.store[1] - 106]} text="3 Critical" tone="red" fs={12} opacity={badgeK(0)} />
          <Pill at={[AT.pay2[0] + 76, AT.pay2[1] - 66]} text="1 High" fs={12} opacity={badgeK(1)} />
          <Pill at={[AT.db[0] + 4, AT.db[1] - 104]} text="2 Medium" fs={12} opacity={badgeK(2)} />
          {s === 7 && <Pill at={[AT.store[0] - 4, AT.store[1] - 138]} text="#1 先修：對外暴露" tone="ink" fs={12} opacity={firstK} />}
          {s === 7 && <Pill at={[860, 170]} text={`掃描結果 ${counter.toLocaleString()} 筆弱點`} icon={Package} fs={14} />}
          {s === 7 && <Pill at={[AT.fw[0] + 30, AT.fw[1] + 26]} anchor="start" text="對外暴露" tone="red" fs={11} opacity={firstK} />}
        </g>
      )}

      {/* 稽核紀錄 */}
      {audit && (
        <g transform={`translate(${AT.audit[0]} ${AT.audit[1]})`}>
          {[2, 1, 0].map((k) => <rect key={k} x={-58 + k * 6} y={-96 - k * 6} width={116} height={132} rx={6} fill="#fbf6ee" stroke={INK} strokeWidth={1.2} />)}
          <FileText x={-50} y={-90} width={20} height={20} stroke={INK} strokeWidth={1.7} />
          <text x={-26} y={-74} fontFamily={FONT} fontSize={12} fontWeight={700} fill={INK}>Audit Log</text>
          {["建立政策", "切換 Protect", "隔離 Pod", "網路白名單", "部署門檻"].map((r, i) => (
            <g key={r} opacity={ramp(t, 0.4 + i * 0.4, 0.7 + i * 0.4)}>
              <circle cx={-44} cy={-50 + i * 19} r={3.5} fill={GREEN} />
              <text x={-34} y={-46 + i * 19} fontFamily={FONT} fontSize={11} fill={INK}>{r}</text>
            </g>
          ))}
          <Pill at={[0, 66]} text="匯出 CSV" icon={FileText} tone="green" fs={12} opacity={ramp(t, 2.6, 3.1)} />
        </g>
      )}

      {/* 第 1 步的提示:門口有人顧,裡面沒人看 */}
      {s === 0 && <Pill at={[620, 150]} text="容器裡在跑什麼？" icon={Laptop} fs={13} opacity={ramp(t, 1.2, 1.8)} />}
    </svg>
  )
}

/** 各步驟的鏡頭範圍 [x0, y0, x1, y1] */
export const CAMS: [number, number, number, number][] = [
  [40, 130, 990, 560],
  [40, 110, 1110, 560],
  [40, 100, 1000, 660],
  [40, 100, 1000, 660],
  [40, 74, 1000, 660],
  [40, 76, 1000, 660],
  [40, 76, 1110, 660],
  [40, 130, 1000, 640],
  [40, 140, 1000, 760],
  [40, 76, 1110, 760],
]
