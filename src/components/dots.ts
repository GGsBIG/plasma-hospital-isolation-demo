import type { EdgeState } from "../types"

// 連線上流動的光點:全部畫在同一張 canvas 上(每秒 30 格),連線本身是靜態 SVG,不必每格重畫整張連線圖。
// 速度、密度、過載的卡頓節奏與原本 SMIL 版本相同

// 每秒移動的 px:過載時資料流明顯更急
export const SPEED: Record<EdgeState, number> = {
  normal: 110, overload: 320, isolated: 150, risk: 110, slow: 70, dead: 0, attack: 260, raw: 150,
}

// 每 px 的光點密度(有風險的直連常常一次很多條,光點要稀;slow 只有一顆,另外畫)
export const DENSITY: Record<EdgeState, number> = {
  normal: 1 / 170, overload: 1 / 55, isolated: 1 / 140, risk: 1 / 320, slow: 0, dead: 0, attack: 0, raw: 1 / 140,
}

// 過載:衝一段、卡住、再衝(時間比例 → 路徑比例),看起來像傳輸不穩
const STUTTER_T = [0, 0.18, 0.42, 0.56, 0.8, 1]
const STUTTER_P = [0, 0.3, 0.33, 0.62, 0.65, 1]

// slow:光點走完全程佔一輪的 75%,抵達後消失;終點在抵達前轉圈、抵達後打勾
const ARRIVE = 0.75

// 原始資料:各來源資料庫格式不同,光點各自一色;經過 Plasma 整理後才統一(isolated)
const RAW: Record<string, string> = {
  "db-oracle": "#f59e0b", "db-postgres": "#8b5cf6", "db-mssql": "#0ea5e9", "db-mysql": "#ec4899", "db-informix": "#14b8a6",
}

// 光點長度單位:連線長度取 40 的倍數(過場中不變),與原本 SMIL 版本一致
export const dotLen = (length: number) => Math.max(40, Math.round(length / 40) * 40)

// 三次貝茲曲線(edgePath 產生的 "M x y C ...")→ 依弧長取點的查表
export interface Lut { xs: Float32Array; ys: Float32Array; acc: Float32Array; total: number }
const N = 28
export function lutOf(d: string): Lut | null {
  const v = d.match(/-?\d+(\.\d+)?(e-?\d+)?/g)?.map(Number)
  if (!v || v.length < 8) return null
  const [x0, y0, x1, y1, x2, y2, x3, y3] = v
  const xs = new Float32Array(N + 1)
  const ys = new Float32Array(N + 1)
  const acc = new Float32Array(N + 1)
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const u = 1 - t
    xs[i] = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3
    ys[i] = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
    if (i) acc[i] = acc[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1])
  }
  return { xs, ys, acc, total: acc[N] }
}
function at(l: Lut, f: number): [number, number] {
  const s = Math.min(1, Math.max(0, f)) * l.total
  let i = 1
  while (i < N && l.acc[i] < s) i++
  const seg = l.acc[i] - l.acc[i - 1] || 1
  const k = (s - l.acc[i - 1]) / seg
  return [l.xs[i - 1] + (l.xs[i] - l.xs[i - 1]) * k, l.ys[i - 1] + (l.ys[i] - l.ys[i - 1]) * k]
}
function stutter(u: number) {
  let i = 1
  while (i < STUTTER_T.length - 1 && STUTTER_T[i] < u) i++
  const k = (u - STUTTER_T[i - 1]) / (STUTTER_T[i] - STUTTER_T[i - 1])
  return STUTTER_P[i - 1] + (STUTTER_P[i] - STUTTER_P[i - 1]) * k
}

// 主題色:從 CSS 變數讀,切換深淺色時重讀
let palette: { dark: boolean; normal: string; overload: string; isolated: string; track: string; ok: string } | null = null
function colors() {
  const dark = document.documentElement.classList.contains("dark")
  if (!palette || palette.dark !== dark) {
    const cs = getComputedStyle(document.documentElement)
    const v = (n: string) => cs.getPropertyValue(n).trim()
    palette = { dark, normal: v("--dot-normal"), overload: v("--dot-overload"), isolated: v("--dot-isolated"), track: v("--iso-ring-track"), ok: `hsl(${v("--ok")})` }
  }
  return palette
}

export interface DotEdge {
  state: EdgeState
  from: string
  len: number            // dotLen(連線長度)
  lut: Lut | null
  opacity: number        // 這一格的連線透明度
  faded: boolean         // 滑鼠停在別的節點上
  reveal?: number        // 逐步畫出的延遲(ms);undefined = 不逐步畫出
  revealStart: number    // 開始畫出的時間(performance.now)
}

const REVEAL_MS = 900
// 與連線逐步畫出的 CSS 曲線 cubic-bezier(0.22, 1, 0.36, 1) 相近
const easeOut = (x: number) => 1 - Math.pow(1 - x, 4)

export function drawDots(ctx: CanvasRenderingContext2D, edges: Iterable<DotEdge>, now: number, dr: number, compact: boolean) {
  const c = colors()
  const sec = now / 1000
  for (const e of edges) {
    const op = e.opacity * (e.faded ? 0.2 : 1)
    if (op < 0.01 || !e.lut || !SPEED[e.state]) continue
    const dur = e.len / SPEED[e.state]
    // 逐步畫出中:只畫已經畫出那段上的光點
    let shown = 1
    if (e.reveal !== undefined) shown = easeOut(Math.min(1, Math.max(0, (now - e.revealStart - e.reveal) / REVEAL_MS)))
    if (shown <= 0) continue
    ctx.globalAlpha = op
    const fill = e.state === "raw" ? RAW[e.from] ?? c.isolated : e.state === "overload" || e.state === "risk" || e.state === "attack" ? c.overload : e.state === "isolated" ? c.isolated : c.normal
    ctx.fillStyle = fill

    if (e.state === "slow") {
      const u = (sec / dur) % 1
      if (u < ARRIVE) {
        const [x, y] = at(e.lut, u / ARRIVE)
        ctx.beginPath()
        ctx.arc(x, y, 3.7 * dr, 0, Math.PI * 2)
        ctx.fill()
      }
      // 終點(工作站旁):等待中轉圈,資料抵達後打勾
      const [ex, ey0] = at(e.lut, 1)
      const ey = ey0 - 26 * dr
      ctx.lineWidth = 2.5 * dr
      if (u < ARRIVE) {
        ctx.strokeStyle = c.track
        ctx.beginPath()
        ctx.arc(ex, ey, 9 * dr, 0, Math.PI * 2)
        ctx.stroke()
        const a0 = ((now / 900) % 1) * Math.PI * 2
        ctx.strokeStyle = c.overload
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.arc(ex, ey, 9 * dr, a0, a0 + 2)
        ctx.stroke()
      } else {
        ctx.strokeStyle = c.ok
        ctx.lineWidth = 2.8 * dr
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.beginPath()
        ctx.moveTo(ex - 5 * dr, ey)
        ctx.lineTo(ex - 1 * dr, ey + 4 * dr)
        ctx.lineTo(ex + 6 * dr, ey - 4 * dr)
        ctx.stroke()
      }
      continue
    }

    // 手機上光點較大、數量減半,畫面不會太擠
    const count = Math.max(2, Math.round(e.len * DENSITY[e.state] * (compact ? 0.5 : 1)))
    const r = (e.state === "overload" ? 3.3 : 3.7) * dr
    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      const u = (sec / dur + i / count) % 1
      const f = e.state === "overload" ? stutter(u) : u
      if (f > shown) continue
      const [x, y] = at(e.lut, f)
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
