import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { NODES, STEPS } from "./steps"
import type { Brain as BrainOpt, Flow, Kind, Link, Look, Note, Put, Tone } from "./model"
import { BRAIN_LINES, BRAIN_NODES } from "./brainNet"
import plasmaLogo from "./assets/plasma-logo.webp"

/* ================= 效能架構(與 Oracle 減壓同一套) =================
   1. 靜態層(SVG):地板、物件、連線。只有換步驟時才變,平常不重畫。
   2. 鏡頭:移動、縮放包住整個場景的 HTML 圖層,交給 GPU,過場時不重畫 SVG。
   3. 動態層(HTML):流動的小點、過載的紅光,只用 transform / opacity。
   4. 標籤層(SVG):名稱、狀態標籤、小卡,疊在小點上面,小點不會蓋住字。
   Plasma 大腦是自己一小張 SVG(只有大腦那麼大),放在動態層;訊號光點是 HTML,只動 transform / opacity。 */

/* ================= 等角投影 =================
   地面座標 (x, y, z):x 往右下、y 往左下、z 往上。畫面座標 = (x − y, (x + y) / 2 − z) */
type Pt = [number, number]
const P = (x: number, y: number, z = 0): Pt => [x - y, (x + y) / 2 - z]
/** 版面的地面座標 → 畫面座標:整個版面在地面上轉 90°((x, y) → (y, −x)),鏡頭不動。
   steps.ts 的 x 欄(既有系統 → 資料庫 → Plasma → 應用)因此由左下往右上排,應用接到資料庫的線是右上 → 左下;
   物件本身(方塊、圓柱、Plasma 的 logo 面)仍用 P 畫,外觀與光影不變 */
const L = (x: number, y: number, z = 0): Pt => P(y, -x, z)
const pts = (a: Pt[]) => a.map((p) => p.join(",")).join(" ")
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]

const INK = "#211e1b"
const ORANGE = "#d9722b"
const GREEN = "#2f7d4f"
const RED = "#b42622"
const WARN = "#c8402c"

/* ---------- 各種物件的尺寸(地面單位) ---------- */
const DB = { r: 46, h: 62 }
const CUBE = { s: 34, h: 50 }
const SITE = { s: 46, h: 74 }
const PLASMA = { s: 50, h: 62 }
const KB = { s: 30, h: 26 }
const MAN = { r: 23, h: 44 }

// 每種東西的頂面/左面/右面顏色
const C: Record<string, string[]> = {
  sys: ["#fffaf0", "#f1e4cc", "#e6d3b3"], // 既有系統:米色
  app: ["#effbfd", "#c6e9f0", "#abdae5"], // 新應用:玻璃
  ext: ["#f0f8ec", "#d3e9c9", "#bcdcb0"], // 外部單位
  site: ["#f6f7f9", "#e0e4e9", "#c7ced6"], // 據點/部門大樓
  plasma: ["#ffffff", "#f6e3e1", "#ecc9c5"],
  kb: ["#eef0ff", "#cfd5f7", "#b7bff0"],
  down: ["#e2ded8", "#c8c3bc", "#b4aea6"],
}
const ICON_COLOR: Partial<Record<Kind, string>> = { sys: "#8a5a1c", app: "#1f6f86", ext: GREEN, site: "#4b5563", kb: "#3b4cc0", ghost: "#8b8378" }

/** 畫面上的範圍:物件頂端離地面中心多高、底下多低、左右多寬(畫面座標) */
function ext(k: Kind) {
  const cyl = (r: number, h: number) => ({ top: h + r * 0.71, bottom: r * 0.71, half: r * 1.42 })
  const box = (s: number, h: number) => ({ top: s + h, bottom: s, half: 2 * s })
  switch (k) {
    case "db": return cyl(DB.r, DB.h)
    case "person": return { top: MAN.h + 43, bottom: MAN.r * 0.71, half: MAN.r * 1.42 }
    case "site": return box(SITE.s, SITE.h)
    case "plasma": return box(PLASMA.s, PLASMA.h)
    case "kb": return { top: KB.s + KB.h + PLASMA.h, bottom: KB.s, half: 2 * KB.s }
    default: return box(CUBE.s, CUBE.h)
  }
}

/* ---------- 文字寬度(估計,中文一格、英數 0.6 格) ---------- */
const textW = (t: string, size: number, mono = false) => [...t].reduce((n, ch) => n + (ch.charCodeAt(0) > 255 ? size : size * (mono ? 0.62 : 0.6)), 0)
const NOTE_FS = 13
function noteSize(n: Note) {
  const w = Math.max(textW(n.title, 14), ...(n.lines ?? []).map((l) => textW(l, NOTE_FS))) + 30
  const h = 34 + (n.lines?.length ?? 0) * 20 + (n.lines?.length ? 6 : 0)
  return { w, h }
}
const nameOf = (id: string) => (NODES[id].kind === "plasma" || NODES[id].kind === "kb" ? "" : NODES[id].label)

/** 物件的畫面中心(知識庫疊在 Plasma 上面) */
function centerOf(id: string, p: Put): Pt {
  return L(p.at[0], p.at[1])
}

/** 物件頭上的東西由下往上疊:負載表 → 狀態標籤 → 小卡。回傳各自的 y(相對物件中心,未乘 ui) */
function stack(id: string, p: Put, ui: number) {
  const e = ext(NODES[id].kind)
  let y = -e.top - 12
  const out: { load?: number; tag?: number; note?: number; top: number } = { top: 0 }
  if (p.load !== undefined && !p.down) { out.load = y - 16 * ui; y -= 38 * ui }
  if (p.tag) { out.tag = y - 16 * ui; y -= 38 * ui }
  if (p.note) { out.note = y - 4; y -= (noteSize(p.note).h + 14) * ui }
  out.top = y
  return out
}

/** 一個畫面狀態的範圍(畫面座標),鏡頭依它取景 */
type Box = { x0: number; y0: number; x1: number; y1: number }
function bounds(l: Look, ui = 1): Box | null {
  let b: Box | null = null
  const grow = (x0: number, y0: number, x1: number, y1: number) => {
    b = b ? { x0: Math.min(b.x0, x0), y0: Math.min(b.y0, y0), x1: Math.max(b.x1, x1), y1: Math.max(b.y1, y1) } : { x0, y0, x1, y1 }
  }
  for (const [id, p] of Object.entries(l.put)) {
    const k = NODES[id].kind
    const [cx, cy] = centerOf(id, p)
    const e = ext(k)
    const s = stack(id, p, ui)
    const name = nameOf(id)
    const nameW = name ? (textW(name, 16) + (NODES[id].logo ? 26 : 0)) * ui : 0
    const tagW = p.tag ? (textW(p.tag[1], 14) + 24) * ui : 0
    const half = Math.max(e.half, nameW / 2, tagW / 2) + 10
    grow(cx - half, cy + s.top, cx + half, cy + e.bottom + (name ? 26 + 16 * ui : 10))
    if (p.note) {
      const w = noteSize(p.note).w * ui
      const dx = (p.note.dx ?? 0) * ui
      grow(cx + dx - w / 2 - 10, cy + s.top, cx + dx + w / 2 + 10, cy)
    }
  }
  if (l.zone) {
    const z = zoneRect(l)
    if (z) for (const p of z.poly) grow(p[0] - 10, p[1] - 10, p[0] + 10, p[1] + 30 * ui)
  }
  const br = brainBox(l, ui)
  if (br) grow(br.x0 - 10, br.y0 - 10, br.x0 + br.w + 10, br.y0 + br.h)
  return b
}

/** 防護框:圍住一組物件的地面範圍 */
function zoneRect(l: Look) {
  if (!l.zone) return null
  const ps = l.zone.ids.map((id) => l.put[id]?.at).filter(Boolean) as [number, number][]
  if (!ps.length) return null
  const m = 92
  const x0 = Math.min(...ps.map((p) => p[0])) - m
  const x1 = Math.max(...ps.map((p) => p[0])) + m
  const y0 = Math.min(...ps.map((p) => p[1])) - m
  const y1 = Math.max(...ps.map((p) => p[1])) + m
  return { x0, x1, y0, y1, poly: [L(x0, y0), L(x1, y0), L(x1, y1), L(x0, y1)] }
}

/* ================= Plasma 大腦:浮在 Plasma 上方的神經網路圖 =================
   正面朝向觀眾的平面圖(不跟著等角傾斜),節點 + 連線的資料在 brainNet.ts(原圖座標 0–100)。
   長出來(grow):節點從知識庫那一端往外一顆顆亮起、連線跟著畫出,接著訊號光點沿連線流動;
   有回答(to)時,一道訊號從大腦沿連線走到最靠近對象的節點,再跑到對象身上。
   已長好(idle):直接淡入,偶爾一顆訊號。精簡模式(lite)不跑循環的效果,暫停時全部停住。 */
const BSQ = 0.72 // 垂直壓扁一點,看起來比較像浮在場景上
const BX0 = 4
const BY0 = 8 * BSQ
const BVW = 92
const BVH = (92 - 8) * BSQ
const BRAIN_W = 400 // 大腦寬度(畫面座標)
// 節點的顏色:知識庫的藍紫色系,深淺交錯
const BRAIN_TONES = ["#8f9be0", "#6f63d9", "#b7bff0", "#9b7fe0", "#5b6fd6", "#c9b8f2"]
const BN = BRAIN_NODES.map(([x, y, r], i) => ({ x, y: y * BSQ, r: r * 0.72, c: BRAIN_TONES[(i * 7) % BRAIN_TONES.length] }))
const BL = BRAIN_LINES.map(([x1, y1, x2, y2]) => ({ x1, y1: y1 * BSQ, x2, y2: y2 * BSQ }))
type XY = { x: number; y: number }
const bdist = (a: XY, b: XY) => Math.hypot(a.x - b.x, a.y - b.y)
function bnear(p: XY) {
  let i = 0
  let d = Infinity
  BN.forEach((n, k) => {
    const e = bdist(n, p)
    if (e < d) { d = e; i = k }
  })
  return { i, d }
}
// 連線兩端對到最近的節點,建成圖(回答訊號要沿著連線走)
const BEDGE = BL.map((l) => [bnear({ x: l.x1, y: l.y1 }), bnear({ x: l.x2, y: l.y2 })] as const)
const BADJ = BN.map(() => [] as number[])
BEDGE.forEach(([a, b]) => {
  if (a.d < 2.5 && b.d < 2.5 && a.i !== b.i) { BADJ[a.i].push(b.i); BADJ[b.i].push(a.i) }
})
function bpath(from: number, to: number): number[] {
  const prev = new Map<number, number>([[from, -1]])
  const q = [from]
  while (q.length) {
    const u = q.shift()!
    if (u === to) break
    for (const v of BADJ[u]) if (!prev.has(v)) { prev.set(v, u); q.push(v) }
  }
  if (!prev.has(to)) return [from]
  const out: number[] = []
  for (let u = to; u !== -1; u = prev.get(u)!) out.unshift(u)
  return out
}
// 知識庫在大腦底下:長出動畫從腦幹底部(最接近知識庫的地方)開始
const B_ORIGIN = bnear({ x: 56, y: 89 * BSQ }).i
const B_MAXD = Math.max(...BN.map((n) => bdist(n, BN[B_ORIGIN])))
const B_SPREAD = 1.3 // 最遠的節點晚多少秒亮起
const B_LINE_DELAY = BL.map((l) => Math.min(bdist({ x: l.x1, y: l.y1 }, BN[B_ORIGIN]), bdist({ x: l.x2, y: l.y2 }, BN[B_ORIGIN])) / B_MAXD * B_SPREAD)
const B_NODE_DELAY = BN.map((n) => (bdist(n, BN[B_ORIGIN]) / B_MAXD) * B_SPREAD)

const brainOpt = (l: Look): BrainOpt | null => (l.brain ? (l.brain === true ? {} : l.brain) : null)

/** 大腦的位置(畫面座標):底邊在 Plasma(與知識庫)頭上的標籤之上,往右挪開一點;手機上放大一些 */
function brainBox(l: Look, ui = 1) {
  const o = brainOpt(l)
  const host = l.put.kb ? "kb" : "plasma"
  const p = l.put[host]
  if (!o || !p) return null
  const [cx, cy] = centerOf(host, p)
  const top = Math.min(stack(host, p, ui).top, l.put.plasma ? stack("plasma", l.put.plasma, ui).top : 0)
  const w = BRAIN_W * Math.min(1.45, Math.sqrt(ui))
  const h = (w * BVH) / BVW
  const bottom = cy + top + 4
  // 手機上放大時往左長(右邊通常是應用與小卡),右緣維持在桌機的位置
  return { x0: cx + (o.dx ?? 0) + BRAIN_W / 2 - w, y0: bottom - h, w, h, base: [cx, cy - ext(NODES[host].kind).top] as Pt }
}

function BrainNet({ l }: { l: Look }) {
  const ui = useContext(UI)
  const { R, paused, lite } = useContext(Layer)
  const o = brainOpt(l)!
  const b = brainBox(l, ui)!
  const fx = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const g = b.w / BVW // 大腦座標 → 畫面座標
  const grow = !!o.grow
  const start = grow ? 1.7 : 0 // 長出來的那一步:等知識庫落到 Plasma 上再開始
  // 大腦座標 → 這張圖層的 px
  const px = (p: XY): Pt => [(p.x - BX0) * g * R, (p.y - BY0) * g * R]
  // 回答的對象(畫面座標 → 圖層 px)
  const tp = o.to && l.put[o.to] ? centerOf(o.to, l.put[o.to]) : null
  const target: Pt | null = tp ? [(tp[0] - b.x0) * R, (tp[1] - ext(NODES[o.to!].kind).top * 0.6 - b.y0) * R] : null
  // 知識庫頂面 → 腦幹:一條虛線,看得出大腦是從知識庫長出來的
  const stem = { x: BX0 + (b.base[0] - b.x0) / g, y: BY0 + (b.base[1] - b.y0) / g }
  const key = `${grow}|${o.to ?? ""}|${R}|${b.w.toFixed(1)}|${target?.map((v) => v.toFixed(0)).join(",") ?? ""}`

  useEffect(() => {
    const host = fx.current
    if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const add = (cls: string, size: number) => {
      const e = document.createElement("i")
      e.className = cls
      e.style.width = e.style.height = `${size}px`
      e.style.marginLeft = e.style.marginTop = `${-size / 2}px`
      host.appendChild(e)
      return e
    }
    const run = (e: HTMLElement, frames: Keyframe[], ms: number) => {
      const a = e.animate(frames, { duration: ms, easing: "linear", fill: "forwards" })
      a.finished.then(() => e.remove()).catch(() => e.remove())
      return a
    }
    const at = ([x, y]: Pt) => `translate3d(${x}px, ${y}px, 0)`
    // 一顆訊號沿一條隨機連線走
    const spark = () => {
      const k = Math.floor(Math.random() * BL.length)
      const ln = BL[k]
      const fwd = Math.random() < 0.5
      const a = px(fwd ? { x: ln.x1, y: ln.y1 } : { x: ln.x2, y: ln.y2 })
      const z = px(fwd ? { x: ln.x2, y: ln.y2 } : { x: ln.x1, y: ln.y1 })
      run(add("bn-spark", 8 * R), [{ transform: at(a), opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { transform: at(z), opacity: 0 }], 800 + Math.random() * 500)
    }
    // 漣漪:隨機一個節點往外擴散一圈
    const ripple = () => {
      const n = BN[Math.floor(Math.random() * BN.length)]
      const e = add("bn-ring", 150 * R)
      run(e, [{ transform: `${at(px(n))} scale(.05)`, opacity: 0.8 }, { transform: `${at(px(n))} scale(1)`, opacity: 0 }], 1100)
    }
    // 回答:從腦幹沿連線走到最靠近對象的節點,再跑到對象身上,抵達時閃一圈
    const answer = () => {
      if (!target) return
      const local = { x: BX0 + target[0] / R / g, y: BY0 + target[1] / R / g }
      const route = bpath(B_ORIGIN, bnear(local).i).map((i) => px(BN[i]))
      route.push(target)
      const cum = [0]
      for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]))
      const total = cum[cum.length - 1] || 1
      const ms = Math.min(2600, 900 + (total / R) * 2.2)
      run(add("bn-answer", 15 * R), route.map((p, i) => ({ transform: at(p), offset: cum[i] / total, opacity: i === 0 ? 0 : 1 })), ms)
        .finished.then(() => {
          const e = add("bn-hit", 90 * R)
          run(e, [{ transform: `${at(target)} scale(.1)`, opacity: 0.9 }, { transform: `${at(target)} scale(1)`, opacity: 0 }], 700)
        }).catch(() => {})
    }
    // 時鐘只在沒暫停、分頁看得到時走,事件依時鐘觸發:暫停時不會再冒出新的光點
    let t = 0
    // 精簡模式:不跑循環的訊號與漣漪,回答訊號只跑一次
    let nextSpark = lite ? Infinity : (start + B_SPREAD + 0.6) * 1000
    let nextRipple = nextSpark + 2500
    let nextAnswer = target ? (grow ? (start + B_SPREAD + 1) * 1000 : 1400) : Infinity
    const id = window.setInterval(() => {
      if (pausedRef.current || document.hidden) return
      t += 100
      if (t >= nextSpark) { spark(); nextSpark = t + (grow ? 450 : 1600) + Math.random() * (grow ? 300 : 1400) }
      if (t >= nextRipple) { ripple(); nextRipple = t + (grow ? 3500 : 7000) + Math.random() * 3000 }
      if (t >= nextAnswer) { answer(); nextAnswer = grow && !lite ? t + 9000 : Infinity }
      if (nextSpark === Infinity && nextAnswer === Infinity) window.clearInterval(id)
    }, 100)
    return () => {
      window.clearInterval(id)
      host.getAnimations({ subtree: true }).forEach((a) => a.cancel())
      host.replaceChildren()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lite])

  useEffect(() => {
    fx.current?.getAnimations({ subtree: true }).forEach((a) => (paused ? a.pause() : a.play()))
  }, [paused])

  const W = b.w * R
  const H = b.h * R
  return (
    <div className={`brain${grow ? " grow" : ""}`} style={{ width: W, height: H, transform: `translate3d(${(b.x0 - WORLD.x) * R}px, ${(b.y0 - WORLD.y) * R}px, 0)`, ["--bd" as string]: `${start}s` }}>
      <div className="brain-glow" />
      <svg className="brain-svg" width={W} height={H} viewBox={`${BX0} ${BY0} ${BVW} ${BVH}`} aria-hidden>
        <line className="bn-stem" x1={stem.x} y1={stem.y} x2={BN[B_ORIGIN].x} y2={BN[B_ORIGIN].y} />
        <g className="bn-lines">
          {BL.map((ln, i) => (
            <line key={i} className="bn-line" x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} pathLength={1} style={{ animationDelay: `${(start + B_LINE_DELAY[i]).toFixed(2)}s` }} />
          ))}
        </g>
        {BN.map((n, i) => (
          <circle key={i} className="bn-node" cx={n.x} cy={n.y} r={n.r} fill={n.c} style={{ animationDelay: `${(start + B_NODE_DELAY[i]).toFixed(2)}s` }} />
        ))}
      </svg>
      <div ref={fx} className="brain-fx" />
    </div>
  )
}

/* ---------- 整個故事用到的地面範圍:地板與靜態層的大小,一開始就算好,換步驟不會變 ---------- */
const ALL_AT = STEPS.flatMap((s) => Object.values(s.look.put).map((p) => p.at))
const FLOOR = {
  x0: Math.min(...ALL_AT.map((a) => a[0])) - 170,
  x1: Math.max(...ALL_AT.map((a) => a[0])) + 170,
  y0: Math.min(...ALL_AT.map((a) => a[1])) - 170,
  y1: Math.max(...ALL_AT.map((a) => a[1])) + 170,
}
const CAMS = STEPS.map((s) => bounds(s.look)!).filter(Boolean)
const WORLD = (() => {
  const fl = [L(FLOOR.x0, FLOOR.y0), L(FLOOR.x1, FLOOR.y0), L(FLOOR.x1, FLOOR.y1), L(FLOOR.x0, FLOOR.y1)]
  const x0 = Math.min(...fl.map((p) => p[0]), ...CAMS.map((c) => c.x0)) - 260
  const x1 = Math.max(...fl.map((p) => p[0]), ...CAMS.map((c) => c.x1)) + 260
  const y0 = Math.min(...fl.map((p) => p[1]), ...CAMS.map((c) => c.y0)) - 260
  const y1 = Math.max(...fl.map((p) => p[1]), ...CAMS.map((c) => c.y1)) + 200
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
})()

/* ---------- 連線的路線(地面座標折線 → 畫面座標) ---------- */
function route(l: Look, k: Link): Pt[] | null {
  const a = l.put[k.from]?.at
  const b = l.put[k.to]?.at
  if (!a || !b) return null
  if (k.straight || a[0] === b[0] || a[1] === b[1]) {
    let [ax, ay] = a
    let [bx, by] = b
    if (k.lane) {
      const len = Math.hypot(bx - ax, by - ay) || 1
      const nx = (-(by - ay) / len) * k.lane
      const ny = ((bx - ax) / len) * k.lane
      ax += nx; ay += ny; bx += nx; by += ny
    }
    return [L(ax, ay), L(bx, by)]
  }
  const mx = k.mx ?? (a[0] + b[0]) / 2
  return [L(a[0], a[1]), L(mx, a[1]), L(mx, b[1]), L(b[0], b[1])]
}
const toD = (a: Pt[]) => "M" + a.map((p) => p.join(" ")).join(" L")
const linkKey = (k: Link) => `${k.from}>${k.to}:${k.flow}:${k.mx ?? ""}:${k.lane ?? ""}`

/** 標籤放大倍率:畫面縮得很小(手機)時,標籤放大一點才看得清楚 */
const UI = createContext(1)
/** 動態層:靜態層的畫面座標 → 圖層像素 */
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

  let body: ReactNode = null
  if (size && size.w > 0 && size.h > 0) {
    const pad = Math.min(size.w, size.h) * 0.04
    const availH = Math.max(120, size.h - insetTop - insetBottom - pad * 2)
    // 手機直放時圖是寬的、畫面是高的:放大一點,左右只切掉邊緣的留白
    const portrait = size.h > size.w * 1.15
    const fit = (b: Box) => Math.min(((size.w - pad * 2) / (b.x1 - b.x0)) * (portrait ? 1.04 : 1), availH / (b.y1 - b.y0))
    const uiOf = (s: number) => Math.min(2.8, Math.max(1, 0.85 / s))
    // 先用原尺寸的標籤取景,再依縮放倍率把標籤放大後重新取景一次
    const b0 = bounds(l) ?? CAMS[0]
    const ui = uiOf(fit(b0))
    const b = bounds(l, ui) ?? b0
    const s = Math.min(fit(b), 1.15)
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const R = Math.max(0.2, Math.min(4096 / (WORLD.w * dpr), Math.min(1.15, Math.max(...CAMS.map(fit)))))
    const cx = (b.x0 + b.x1) / 2
    const cy = (b.y0 + b.y1) / 2
    const tx = size.w / 2 - s * (cx - WORLD.x)
    const ty = size.h / 2 + (insetTop - insetBottom) / 2 - s * (cy - WORLD.y)
    const svg = (cls: string, child: ReactNode) => (
      <svg className={cls} width={WORLD.w * R} height={WORLD.h * R} viewBox={`${WORLD.x} ${WORLD.y} ${WORLD.w} ${WORLD.h}`} aria-hidden={cls !== "still"}>
        {child}
      </svg>
    )
    body = (
      <UI.Provider value={ui}>
        <Layer.Provider value={{ R, paused, lite }}>
          <div className={`scene-box${ui > 1.45 ? " tiny" : ""}`}>
            <div className="cam" style={{ width: WORLD.w * R, height: WORLD.h * R, transform: `translate3d(${tx}px, ${ty}px, 0) scale(${s / R})` }}>
              {Object.entries(l.put).map(([id, p]) => NODES[id].kind === "db" && !p.down && (p.load ?? 0) > 60 && !p.dim && <Heat key={id} at={centerOf(id, p)} />)}
              {svg("still", <Still l={l} />)}
              <Moving l={l} />
              {brainBox(l, ui) && <BrainNet l={l} />}
              {svg("still labels", <Labels l={l} />)}
            </div>
          </div>
        </Layer.Provider>
      </UI.Provider>
    )
  }
  return (
    <div ref={box} className={`scene${paused ? " paused" : ""}${lite ? " lite" : ""}`}>
      {body}
      {/* 大腦網路圖取自 Noun Project 的免費圖示,須標註作者 */}
      {l.brain && <span className="brain-credit">Brain by Clockwise from the Noun Project</span>}
    </div>
  )
}

/* ================= 靜態層 ================= */
function Still({ l }: { l: Look }) {
  const order = Object.keys(l.put).sort((a, b) => depth(a, l.put[a]) - depth(b, l.put[b]))
  const z = zoneRect(l)
  const plasma = l.put.plasma
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
        <radialGradient id="gBrain" cx="50%" cy="50%" r="50%">
          <stop offset="0.55" stopColor="#e0452f" stopOpacity="0.16" />
          <stop offset="1" stopColor="#e0452f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gDb" x1="0" x2="1"><stop offset="0" stopColor="#c9d6e6" /><stop offset=".26" stopColor="#eef3f9" /><stop offset=".5" stopColor="#c0cee0" /><stop offset="1" stopColor="#97abc4" /></linearGradient>
        <linearGradient id="gHot" x1="0" x2="1"><stop offset="0" stopColor="#efbab3" /><stop offset=".26" stopColor="#fbe3df" /><stop offset=".5" stopColor="#eab1aa" /><stop offset="1" stopColor="#d4877f" /></linearGradient>
        <linearGradient id="gDown" x1="0" x2="1"><stop offset="0" stopColor="#b9b4ad" /><stop offset=".26" stopColor="#d6d2cc" /><stop offset=".5" stopColor="#aaa49c" /><stop offset="1" stopColor="#8d877f" /></linearGradient>
        <linearGradient id="gMan" x1="0" x2="1"><stop offset="0" stopColor="#f2cf9a" /><stop offset=".3" stopColor="#fbe8c8" /><stop offset=".55" stopColor="#efc78c" /><stop offset="1" stopColor="#d9a35c" /></linearGradient>
      </defs>
      <rect x={WORLD.x} y={WORLD.y} width={WORLD.w} height={WORLD.h} fill="url(#grid)" mask="url(#gridMask)" />
      {/* 地板 */}
      <polygon points={pts([L(FLOOR.x0, FLOOR.y0), L(FLOOR.x1, FLOOR.y0), L(FLOOR.x1, FLOOR.y1), L(FLOOR.x0, FLOOR.y1)])} fill="#f6ead2" fillOpacity={0.55} stroke="#e6d2a3" strokeWidth={1.2} />

      {/* 防護框 */}
      {z && (
        <g className="fade-in" key={`zone-${l.zone!.label}`}>
          <polygon points={pts(z.poly)} fill="#dcefd9" fillOpacity={0.55} stroke={GREEN} strokeWidth={2.2} strokeDasharray="12 8" strokeLinejoin="round" />
        </g>
      )}
      {/* Plasma 大腦的光圈 */}
      {l.brain && plasma && (
        <g className="fade-in brain" transform={`translate(${L(...plasma.at)[0]} ${L(...plasma.at)[1]})`}>
          <ellipse cx={0} cy={0} rx={190 * Math.SQRT2} ry={95 * Math.SQRT2} fill="url(#gBrain)" />
          <ellipse className="brain-ring" cx={0} cy={0} rx={150 * Math.SQRT2} ry={75 * Math.SQRT2} fill="none" stroke={RED} strokeWidth={2} strokeDasharray="10 8" strokeOpacity={0.7} />
        </g>
      )}

      {/* 地面連線(流動的小點在動態層) */}
      {l.links.map((k) => {
        const r = route(l, k)
        return r && <Cable key={linkKey(k)} d={toD(r)} flow={k.flow} />
      })}

      {/* 物件:由後往前畫 */}
      {order.map((id, i) => <Obj key={id} id={id} p={l.put[id]} i={i} />)}
    </>
  )
}

const depth = (id: string, p: Put) => p.at[1] - p.at[0] + (NODES[id].kind === "kb" ? 1 : 0)

/** 換位置時,物件與它的標籤用同一段弧線跳過去 */
function Mover({ at, children, className, style }: { at: Pt; children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<SVGGElement>(null)
  const prev = useRef<Pt | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const p = prev.current
    el.style.transform = `translate(${at[0]}px, ${at[1]}px)`
    if (p && (p[0] !== at[0] || p[1] !== at[1])) {
      const mid: Pt = [(p[0] + at[0]) / 2, Math.min(p[1], at[1]) - 90]
      el.animate(
        [{ transform: `translate(${p[0]}px, ${p[1]}px)` }, { transform: `translate(${mid[0]}px, ${mid[1]}px)` }, { transform: `translate(${at[0]}px, ${at[1]}px)` }],
        { duration: 1000, easing: "cubic-bezier(.45,0,.3,1)", fill: "backwards" },
      )
    }
    prev.current = at
  }, [at[0], at[1]])
  return <g ref={ref} className={className} style={style}>{children}</g>
}

function Obj({ id, p, i }: { id: string; p: Put; i: number }) {
  const n = NODES[id]
  const at = centerOf(id, p)
  let body: ReactNode
  switch (n.kind) {
    case "db": body = <DbShape p={p} />; break
    case "person": body = <Person down={p.down} />; break
    case "site": body = <Site icon={n.icon} />; break
    case "plasma": body = <PlasmaBox />; break
    case "kb": body = <Kb icon={n.icon} />; break
    default: body = <Cube kind={n.kind} icon={n.icon} down={p.down} />
  }
  return (
    <Mover at={at} className={`obj${p.dim ? " dim" : ""}`}>
      <Drop delay={n.kind === "kb" ? 0.9 : Math.min(0.6, 0.1 + i * 0.04)}>{body}</Drop>
    </Mover>
  )
}

/* ================= 標籤層 ================= */
function Labels({ l }: { l: Look }) {
  const ui = useContext(UI)
  const z = zoneRect(l)
  const ids = Object.keys(l.put).sort((a, b) => depth(a, l.put[a]) - depth(b, l.put[b]))
  return (
    <>
      {z && (
        <g className="fade-in" key={`zl-${l.zone!.label}`}>
          <Tag x={L((z.x0 + z.x1) / 2, z.y1)[0]} y={L((z.x0 + z.x1) / 2, z.y1)[1] + 26} text={l.zone!.label} color={GREEN} size={15} />
        </g>
      )}
      {ids.map((id) => {
        const p = l.put[id]
        const n = NODES[id]
        const e = ext(n.kind)
        const s = stack(id, p, ui)
        const name = nameOf(id)
        return (
          <Mover key={id} at={centerOf(id, p)} className={`lbl${p.dim ? " dim" : ""}`}>
            {name && <Tag x={0} y={e.bottom + 24} text={name} logo={n.logo} size={16} muted={n.kind === "ghost"} />}
            {s.load !== undefined && <LoadPill y={s.load} v={p.load!} />}
            {p.tag && <g key={p.tag[1]} className="pop-in"><Pill y={s.tag!} text={p.tag[1]} tone={p.tag[0]} /></g>}
            {p.note && <g key={p.note.title} className="pop-in note-in"><NoteCard y={s.note!} note={p.note} /></g>}
          </Mover>
        )
      })}
    </>
  )
}

/* ================= 動態層:只用 transform / opacity ================= */
function Moving({ l }: { l: Look }) {
  const occ: Occluder[] = Object.entries(l.put).map(([id, p]) => occOf(id, p))
  return (
    <>
      {l.links.map((k) => {
        if (k.flow === "dead") return null
        const r = route(l, k)
        return r && <Dots key={linkKey(k)} path={r} occ={occ} flow={k.flow} color={k.color} />
      })}
    </>
  )
}

type Occluder = (p: Pt) => boolean
function occOf(id: string, p: Put): Occluder {
  const c = centerOf(id, p)
  const k = NODES[id].kind
  if (k === "db") return cylOcc(c, DB.r, DB.h)
  if (k === "person") return cylOcc(c, MAN.r, MAN.h + 30)
  const { s, h } = k === "site" ? SITE : k === "plasma" ? PLASMA : k === "kb" ? { s: KB.s, h: KB.h + PLASMA.h } : CUBE
  return polyOcc([P(-s, -s, h), P(s, -s, h), P(s, -s, 0), P(s, s, 0), P(-s, s, 0), P(-s, s, h)].map((q) => add(q, c)))
}
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

/** 折線上距離 d 的點 */
function along(path: Pt[], cum: number[], d: number): Pt {
  let i = 1
  while (i < cum.length - 1 && cum[i] < d) i++
  const seg = cum[i] - cum[i - 1] || 1
  const t = Math.max(0, Math.min(1, (d - cum[i - 1]) / seg))
  return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t]
}

/** 把折線切成「看得到」的幾段,每段各自有小點跑 */
function visibleRuns(path: Pt[], occ: Occluder[]) {
  const cum = [0]
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]))
  const total = cum[cum.length - 1]
  const runs: [number, number][] = []
  let start = -1
  const STEP = 4
  for (let d = 0; d <= total; d += STEP) {
    const vis = !occ.some((o) => o(along(path, cum, d)))
    if (vis && start < 0) start = d
    if (!vis && start >= 0) { runs.push([start, d - STEP]); start = -1 }
  }
  if (start >= 0) runs.push([start, total])
  return { cum, runs: runs.filter(([a, b]) => b - a > 24) }
}

// 每種連線的小點:顏色、間距、速度、形狀
const FLOW: Record<Exclude<Flow, "dead">, { color: string; spacing: number; speed: number; square?: boolean; size?: number }> = {
  ok: { color: GREEN, spacing: 72, speed: 230 },
  sync: { color: RED, spacing: 54, speed: 210, square: true },
  hot: { color: ORANGE, spacing: 46, speed: 120 },
  slow: { color: "#a39a8c", spacing: 400, speed: 45 },
  risk: { color: WARN, spacing: 110, speed: 170 },
  attack: { color: RED, spacing: 70, speed: 330, square: true, size: 14 },
  raw: { color: GREEN, spacing: 58, speed: 200 },
}

function Dots({ path, occ, flow, color }: { path: Pt[]; occ: Occluder[]; flow: Exclude<Flow, "dead">; color?: string }) {
  const { R, paused, lite } = useContext(Layer)
  const host = useRef<HTMLDivElement>(null)
  const f = FLOW[flow]
  const { cum, runs } = visibleRuns(path, occ)
  const spacing = f.spacing * (lite ? 1.7 : 1)
  const plan = runs.map(([a, b]) => ({ a, b, n: Math.max(1, Math.floor((b - a) / spacing)) }))
  const key = `${R}|${plan.map((p) => `${p.a.toFixed(0)}-${p.b.toFixed(0)}-${p.n}`).join(",")}`

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
        const [x, y] = along(path, cum, d)
        const off = (d - a) / len
        return { offset: off, opacity: off < fade ? off / fade : off > 1 - fade ? (1 - off) / fade : 1, transform: `translate3d(${(x - WORLD.x) * R}px, ${(y - WORLD.y) * R}px, 0)` }
      })
      const dur = (len / f.speed) * 1000
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

  const total = plan.reduce((n, p) => n + p.n, 0)
  const size = (f.size ?? (f.square ? 11 : 13)) * R
  return (
    <div ref={host} className="fx">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={`dot${f.square ? " sq" : ""}`} style={{ width: size, height: f.square ? size * 0.8 : size, marginLeft: -size / 2, marginTop: -size / 2, background: color ?? f.color, borderWidth: 1.5 * R }} />
      ))}
    </div>
  )
}

/** 資料庫太忙時底下的紅光:CSS 漸層,只動透明度與縮放 */
function Heat({ at }: { at: Pt }) {
  const { R } = useContext(Layer)
  const r = DB.r
  const w = r * 4.2 * R
  const h = r * 2.1 * R
  return <div className="heat" style={{ left: (at[0] - WORLD.x) * R - w / 2, top: (at[1] + 6 - WORLD.y) * R - h / 2, width: w, height: h }} />
}

/* ================= 基本形狀 ================= */
function BoxShape({ x, y, z = 0, w, d, h, c, stroke = INK, sw = 1.2, op = 1, dash }: { x: number; y: number; z?: number; w: number; d: number; h: number; c: string[]; stroke?: string; sw?: number; op?: number; dash?: boolean }) {
  const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]
  const left = [P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)]
  const right = [P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)]
  const da = dash ? "7 5" : undefined
  return (
    <g strokeLinejoin="round">
      <polygon points={pts(left)} fill={c[1]} fillOpacity={op} />
      <polygon points={pts(right)} fill={c[2]} fillOpacity={op} />
      <polygon points={pts(top)} fill={c[0]} fillOpacity={op} />
      {!dash && <polyline points={pts([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y, z + h)].map((p) => add(p, [0, 1.6])))} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.2} />}
      <polygon points={pts([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z), P(x, y + d, z + h)])} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={da} />
      <polyline points={pts([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y, z + h)])} fill="none" stroke={stroke} strokeWidth={sw * 0.7} strokeDasharray={da} />
      <line x1={P(x + w, y + d, z + h)[0]} y1={P(x + w, y + d, z + h)[1]} x2={P(x + w, y + d, z)[0]} y2={P(x + w, y + d, z)[1]} stroke={stroke} strokeWidth={sw * 0.7} strokeDasharray={da} />
    </g>
  )
}

/** 圓柱:中心在地面 (0,0),半徑 r、高 h */
function Cyl({ r, h, grad, top, bands = 0, sw = 1.2, leds }: { r: number; h: number; grad: string; top: string; bands?: number; sw?: number; leds?: string[] }) {
  const rx = r * Math.SQRT2
  const ry = rx / 2
  const side = `M${-rx} ${-h} L${-rx} 0 A${rx} ${ry} 0 0 0 ${rx} 0 L${rx} ${-h} A${rx} ${ry} 0 0 1 ${-rx} ${-h} Z`
  return (
    <g>
      <path d={side} fill={`url(#${grad})`} stroke={INK} strokeWidth={sw} />
      {Array.from({ length: bands }, (_, i) => {
        const hb = (h * (i + 1)) / (bands + 1)
        return <path key={i} d={`M${-rx} ${-hb} A${rx} ${ry} 0 0 0 ${rx} ${-hb}`} fill="none" stroke={INK} strokeWidth={sw * 0.6} strokeOpacity={0.55} />
      })}
      {leds && [-0.62, -0.5, -0.38].map((k, i) => {
        const x = rx * k
        const y = -h * 0.42 + ry * Math.sqrt(1 - k * k)
        return <circle key={i} cx={x} cy={y} r={3} fill={leds[i]} stroke={INK} strokeWidth={0.6} />
      })}
      <ellipse cx={0} cy={-h} rx={rx} ry={ry} fill={top} stroke={INK} strokeWidth={sw} />
      <ellipse cx={0} cy={-h} rx={rx * 0.88} ry={ry * 0.88} fill="none" stroke={INK} strokeOpacity={0.3} strokeWidth={sw * 0.6} />
      <ellipse cx={-rx * 0.12} cy={-h - ry * 0.1} rx={rx * 0.6} ry={ry * 0.45} fill="#fff" opacity={0.32} />
    </g>
  )
}

function Shadow({ poly }: { poly: Pt[] }) {
  return (
    <g fill="#6b5236">
      <polygon points={pts(poly.map((p) => add(p, [0, 16])))} opacity={0.06} />
      <polygon points={pts(poly.map((p) => add(p, [0, 8])))} opacity={0.08} />
    </g>
  )
}
const square = (s: number) => [P(-s, -s), P(s, -s), P(s, s), P(-s, s)]

function Drop({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return <g className="drop" style={{ animationDelay: `${delay}s` }}>{children}</g>
}

/** 資料庫:負載高時變成暖色,停機時變灰、出現裂痕 */
function DbShape({ p }: { p: Put }) {
  const hot = !p.down && (p.load ?? 0) > 60
  const leds = p.down ? ["#c8402c", "#7d766d", "#7d766d"] : hot ? ["#4fb06d", "#f0b43c", "#e0452f"] : ["#4fb06d", "#4fb06d", "#f0b43c"]
  return (
    <g>
      <ellipse cx={0} cy={10} rx={DB.r * 1.7} ry={DB.r * 0.85} fill="url(#gShadow)" />
      <Cyl r={DB.r} h={DB.h} grad={p.down ? "gDown" : hot ? "gHot" : "gDb"} top={p.down ? "#cfcac3" : hot ? "#fbe4e1" : "#eef3f9"} bands={2} leds={leds} />
      {p.down && <Crack y={-DB.h * 0.55} />}
    </g>
  )
}

function Crack({ y }: { y: number }) {
  return <polyline points={`-22,${y - 22} -8,${y - 6} -16,${y + 2} 4,${y + 20} -2,${y + 28} 14,${y + 40}`} fill="none" stroke={RED} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
}

/** 方塊:既有系統、新應用、外部單位、停用系統 */
function Cube({ kind, icon: Icon, down }: { kind: Kind; icon?: NodeDef["icon"]; down?: boolean }) {
  const { s, h } = CUBE
  const ghost = kind === "ghost"
  const c = down ? C.down : ghost ? ["#f3eee6", "#e7e0d4", "#ddd4c6"] : C[kind] ?? C.app
  return (
    <g opacity={ghost ? 0.75 : 1}>
      {!ghost && <Shadow poly={square(s)} />}
      <BoxShape x={-s} y={-s} w={2 * s} d={2 * s} h={h} c={c} op={kind === "app" && !down ? 0.92 : 1} dash={ghost} stroke={ghost ? "#8b8378" : INK} />
      {/* 玻璃的反光 */}
      {kind === "app" && !down && <polygon points={pts([P(-s + 6, s, h - 6), P(-s + 20, s, h - 6), P(-s + 8, s, 8), P(-s + 6, s, 8)])} fill="#fff" opacity={0.55} />}
      {/* 既有系統:前面一排螢幕 */}
      {kind === "sys" && !down && <polygon points={pts([P(-s + 10, s, h - 12), P(s - 10, s, h - 12), P(s - 10, s, 14), P(-s + 10, s, 14)])} fill="#fffdf8" stroke="#b89a6a" strokeWidth={0.9} />}
      {Icon && <Icon x={-13} y={-h - 13} width={26} height={26} strokeWidth={1.8} color={down ? "#7d766d" : ICON_COLOR[kind] ?? INK} />}
      {down && <Crack y={-h * 0.5 + 10} />}
    </g>
  )
}
type NodeDef = import("./model").NodeDef

/** 大樓:據點、部門 */
function Site({ icon: Icon }: { icon?: NodeDef["icon"] }) {
  const { s, h } = SITE
  const F = (u: number, v: number) => P(-s + u, s, v) // 前左面
  const S = (u: number, v: number) => P(s, -s + u, v) // 前右面
  const rows = [h - 18, h - 38, h - 58]
  const cols = [14, 34, 54, 74]
  return (
    <g>
      <Shadow poly={square(s)} />
      <BoxShape x={-s} y={-s} w={2 * s} d={2 * s} h={h} c={C.site} />
      {rows.map((v) => cols.map((u) => <polygon key={`f${v}-${u}`} points={pts([F(u, v), F(u + 10, v), F(u + 10, v - 10), F(u, v - 10)])} fill="#bcd7ea" stroke="#7e95a8" strokeWidth={0.6} />))}
      {rows.map((v) => cols.map((u) => <polygon key={`s${v}-${u}`} points={pts([S(u, v), S(u + 10, v), S(u + 10, v - 10), S(u, v - 10)])} fill="#a9c6dc" stroke="#7e95a8" strokeWidth={0.6} />))}
      {Icon && <Icon x={-14} y={-h - 14} width={28} height={28} strokeWidth={1.8} color={ICON_COLOR.site} />}
    </g>
  )
}

/** 人員:圓柱身體 + 圓頭 */
function Person({ down }: { down?: boolean }) {
  return (
    <g>
      <ellipse cx={0} cy={6} rx={MAN.r * 1.9} ry={MAN.r * 0.95} fill="url(#gShadow)" />
      <Cyl r={MAN.r} h={MAN.h} grad={down ? "gDown" : "gMan"} top={down ? "#cfcac3" : "#fbe8c8"} />
      <circle cx={0} cy={-MAN.h - 25} r={18} fill={down ? "#d6d2cc" : "#f8dcc0"} stroke={INK} strokeWidth={1.2} />
      <ellipse cx={-5} cy={-MAN.h - 31} rx={7} ry={4.5} fill="#fff" opacity={0.5} />
    </g>
  )
}

/** Plasma 方塊:logo 貼在前側面上,下面一排散熱格柵,側面一顆燈 */
function PlasmaBox() {
  const { s, h } = PLASMA
  const [X, Y] = P(-s, s, h)
  const S = (u: number, v: number) => P(s, -s + u, v)
  return (
    <g>
      <Shadow poly={square(s)} />
      <BoxShape x={-s} y={-s} w={2 * s} d={2 * s} h={h} c={C.plasma} stroke={RED} sw={1.5} />
      <g transform={`matrix(1 0.5 0 1 ${X} ${Y})`}>
        <image href={plasmaLogo} x={8} y={12} width={84} height={18} />
        {[14, 24, 34, 44, 54, 64, 74, 84].map((u) => <line key={u} x1={u} y1={40} x2={u} y2={52} stroke="#e0aaa4" strokeWidth={1.4} strokeLinecap="round" />)}
      </g>
      <ellipse cx={S(80, 46)[0]} cy={S(80, 46)[1]} rx={3.4} ry={2.8} fill="#e0452f" stroke={INK} strokeWidth={0.6} />
    </g>
  )
}

/** 知識庫:疊在 Plasma 頂面上的一塊 */
function Kb({ icon: Icon }: { icon?: NodeDef["icon"] }) {
  const { s, h } = KB
  const z = PLASMA.h
  return (
    <g>
      <BoxShape x={-s} y={-s} z={z} w={2 * s} d={2 * s} h={h} c={C.kb} stroke="#3b4cc0" sw={1.3} />
      {[0.3, 0.55, 0.8].map((f) => <polyline key={f} points={pts([P(-s + 6, s, z + h * f), P(s - 6, s, z + h * f)])} stroke="#8f9be0" strokeWidth={1} fill="none" />)}
      {Icon && <Icon x={-12} y={-z - h - 12} width={24} height={24} strokeWidth={1.9} color={ICON_COLOR.kb} />}
    </g>
  )
}

/** 網路管線:正常的線有外層與亮線;雜亂的直連是紅色虛線;沒人用的是灰色虛線 */
function Cable({ d, flow }: { d: string; flow: Flow }) {
  if (flow === "risk") return <path className="cable-dash" d={d} stroke="#e39b8f" strokeWidth={4} strokeDasharray="10 8" />
  if (flow === "dead") return <path className="cable-dash" d={d} stroke="#b9b0a2" strokeWidth={3.5} strokeDasharray="5 7" />
  const hot = flow === "hot" || flow === "attack"
  return (
    <g>
      <path className="cable" d={d} pathLength={1} style={hot ? { stroke: "#d9a78f" } : flow === "sync" ? { stroke: "#d9aaa4" } : undefined} />
      <path className="cable-core" d={d} pathLength={1} />
    </g>
  )
}

/* ---------- 標籤 ---------- */
/** 沒有底框的名稱:logo + 字,字外圍一圈紙色描邊 */
function Tag({ x, y, text, logo, size = 16, color = INK, muted }: { x: number; y: number; text: string; logo?: string; size?: number; color?: string; muted?: boolean }) {
  const ui = useContext(UI)
  const tw = textW(text, size)
  const lw = logo ? size * 1.2 : 0
  const gap = logo ? size * 0.35 : 0
  const x0 = -(lw + gap + tw) / 2
  return (
    <g transform={`translate(${x} ${y}) scale(${ui})`}>
      {logo && <image href={logo} x={x0} y={-lw / 2} width={lw} height={lw} />}
      <text x={x0 + lw + gap} y={size * 0.36} fontSize={size} fontWeight={800} fill={muted ? "#8b8378" : color} stroke="#fbf8f2" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">{text}</text>
    </g>
  )
}

const TONE: Record<Tone, { fill: string; color: string }> = {
  ok: { fill: GREEN, color: "#fff" },
  warn: { fill: "#f6c35b", color: INK },
  bad: { fill: WARN, color: "#fff" },
  idle: { fill: "#fffdf8", color: INK },
}

/** 頭上的狀態標籤 */
function Pill({ y, text, tone }: { y: number; text: string; tone: Tone }) {
  const size = 14
  const ui = useContext(UI)
  const w = textW(text, size) + size * 1.6
  const h = size * 2.1
  const t = TONE[tone]
  return (
    <g transform={`translate(0 ${y}) scale(${ui})`}>
      <rect x={-w / 2} y={-h / 2 + 2} width={w} height={h} rx={h / 2} fill={INK} opacity={0.75} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={t.fill} stroke={INK} strokeWidth={1.1} />
      <text x={0} y={size * 0.36} textAnchor="middle" fontSize={size} fontWeight={800} fill={t.color}>{text}</text>
    </g>
  )
}

/** 負載表 */
function LoadPill({ y, v }: { y: number; v: number }) {
  const hot = v > 60
  const col = hot ? WARN : GREEN
  const ui = useContext(UI)
  return (
    <g transform={`translate(0 ${y}) scale(${ui})`}>
      <rect x={-58} y={-14 + 1.6} width={116} height={28} rx={14} fill={INK} opacity={0.75} />
      <rect x={-58} y={-14} width={116} height={28} rx={14} fill="#fffdf8" stroke={INK} strokeWidth={1.1} />
      <circle cx={-43} cy={0} r={5} fill={col} />
      <rect x={-33} y={-4.5} width={42} height={9} rx={4.5} fill="#ebe3d4" />
      <rect x={-33} y={-4.5} width={(42 * v) / 100} height={9} rx={4.5} fill={col} />
      <text x={34} y={5.5} textAnchor="middle" fontSize={15} fontWeight={800} fill={col} className="mono">{v}%</text>
    </g>
  )
}

/** 小卡:底邊中央有尖角指向物件 */
function NoteCard({ y, note }: { y: number; note: Note }) {
  const ui = useContext(UI)
  const { w, h } = noteSize(note)
  const dx = note.dx ?? 0
  const px = Math.max(22, Math.min(w - 22, w / 2 - dx)) // 尖角在小卡上的位置
  const accent = { ok: GREEN, warn: ORANGE, bad: WARN, idle: INK }[note.tone]
  const bg = { ok: "#f1f8ee", warn: "#fff6e6", bad: "#fdf0ec", idle: "#fffdf8" }[note.tone]
  return (
    <g transform={`translate(0 ${y}) scale(${ui})`}>
      <g transform={`translate(${-w / 2 + dx} ${-h - 8})`}>
        <rect x={0} y={2.5} width={w} height={h} rx={10} fill={INK} opacity={0.75} />
        <path d={`M${px - 9} ${h - 1} L${px} ${h + 10.5} L${px + 9} ${h - 1}`} fill={INK} opacity={0.75} />
        <rect x={0} y={0} width={w} height={h} rx={10} fill={bg} stroke={INK} strokeWidth={1.1} />
        <path d={`M${px - 9} ${h - 0.6} L${px} ${h + 8} L${px + 9} ${h - 0.6}`} fill={bg} stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
        <rect x={px - 8.4} y={h - 2.2} width={16.8} height={2.6} fill={bg} />
        <rect x={0} y={0} width={5} height={h} rx={2.5} fill={accent} />
        <text x={16} y={22} fontSize={14} fontWeight={800} fill={note.tone === "idle" ? INK : accent}>{note.title}</text>
        {note.lines?.map((t, i) => (
          <text key={i} x={16} y={44 + i * 20} fontSize={NOTE_FS} fontWeight={600} fill={INK}>{t}</text>
        ))}
      </g>
    </g>
  )
}
