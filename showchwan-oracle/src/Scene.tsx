import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { ChartColumn, ChartPie, ClipboardList, FileText, FlaskConical, HeartPulse, Pill as PillIcon, Stethoscope, type LucideIcon } from "lucide-react"
import { APPS, CAMS, CORE, type Look } from "./steps"
import plasmaLogo from "./assets/plasma-logo.webp"

/* ================= 效能架構 =================
   手機會卡的原因是「每一格都重畫整張 SVG」。這裡分成三層,讓每一格的工作量降到最低:
   1. 靜態層(SVG):平台、方塊、資料庫、標籤。只有換步驟時才變,平常不重畫。
   2. 鏡頭:移動、縮放的是包住整個場景的 HTML 圖層(will-change: transform),
      交給 GPU 直接縮放已經畫好的圖,過場時不重畫 SVG。
   3. 動態層(HTML):流動的小點、Oracle 的紅光。只用 transform/opacity 做動畫,
      瀏覽器在合成層處理,主程式忙的時候也照樣順。
   另外:不用 SVG 模糊濾鏡(陰影改用疊色、紅光用漸層);大小變化只重畫那一個物件。 */

/* ================= 等角投影 =================
   地面座標 (x, y, z):x 往右下、y 往左下、z 往上。畫面座標 = (x − y, (x + y) / 2 − z) */
type Pt = [number, number]
const P = (x: number, y: number, z = 0): Pt => [x - y, (x + y) / 2 - z]
const pts = (a: Pt[]) => a.map((p) => p.join(",")).join(" ")
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]

const INK = "#211e1b"
const ORANGE = "#d9722b"
const GREEN = "#2f7d4f"
// 每種東西的頂面/左面/右面顏色
const C = {
  vm: ["#eef1f5", "#d3dbe4", "#bfcad6"],
  k8s: ["#e6eefc", "#c6d6f4", "#adc2ea"],
  app: ["#fffdf8", "#efe7d8", "#e0d4bf"],
  appK: ["#f7f9ff", "#dde6f7", "#c9d6ef"],
  plasma: ["#ffffff", "#f6e3e1", "#ecc9c5"],
}

/** 整個場景的範圍(畫面座標)。靜態層就畫這麼大 */
const WORLD = { x: -660, y: -200, w: 1780, h: 1000 }

/* ================= 場景配置(地面座標) ================= */
const SLAB_D = 160 // 平台深度
const SLAB_H = 14
const VM_BIG = 520
const VM_SMALL = 140
const K8S = { x: 600, w: 360 }
const DB_Y = 500 // 資料層
const ORA_X = 260
const PG_X = 780
const PLASMA_X = 520
const ORA_BIG = { r: 118, h: 150 }
const ORA_SMALL = { r: 72, h: 100 }
const PG = { r: 90, h: 118 }
const PIPE_Z = 26
const CUBE = 56
const CUBE_H = 44
const ICONS: LucideIcon[] = [ClipboardList, Stethoscope, HeartPulse, FlaskConical, PillIcon, FileText, ChartColumn, ChartPie]

/** 第 i 支應用程式的位置 */
function appAt(i: number, moved: boolean): [number, number] {
  if (i < CORE) return [70, 45 + i * 70]
  const j = i - CORE
  return moved ? [K8S.x + 60 + Math.floor(j / 2) * 120, 45 + (j % 2) * 70] : [190 + Math.floor(j / 2) * 120, 45 + (j % 2) * 70]
}

/** 應用層 → 資料層的地面連線(畫面座標的折線) */
function linkPts(fromX: number, toX: number, midY: number): Pt[] {
  return [P(fromX, SLAB_D), P(fromX, midY), P(toX, midY), P(toX, DB_Y)]
}
const vmLink = (vmW: number, oraR: number) => {
  // VMware 的線在 Oracle 的底面範圍內才轉彎,轉角藏在圓柱後面
  const cx = vmW / 2
  return linkPts(cx, Math.max(ORA_X - oraR * 0.6, Math.min(ORA_X + oraR * 0.6, cx)), DB_Y - oraR * 0.6)
}
const k8sLink = (toPg: boolean) => (toPg ? linkPts(K8S.x + K8S.w / 2, PG_X, 340) : linkPts(K8S.x + K8S.w / 2, ORA_X, 262))
const toD = (a: Pt[]) => "M" + a.map((p) => p.join(" ")).join(" L")

/* ---------- 數字補間:只讓用到的那個小元件重畫,不牽動整個場景 ---------- */
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

/** 標籤放大倍率:畫面縮得很小(手機)時,標籤放大一點才看得清楚 */
const UI = createContext(1)
/** 動態層:靜態層的畫面座標 → 圖層像素 */
const Layer = createContext({ R: 1, paused: false, lite: false })

/* ================= 場景 ================= */
export function Scene({ l, paused, lite = false, insetTop = 0, insetBottom = 0 }: { l: Look; paused: boolean; lite?: boolean; insetTop?: number; insetBottom?: number }) {
  const box = useRef<HTMLDivElement>(null)
  // 量到畫面大小之後才畫:第一格就取景正確,不會先放大再縮回來
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
  const ora = l.oraSmall ? ORA_SMALL : ORA_BIG

  let body: ReactNode = null
  if (size && size.w > 0 && size.h > 0) {
    const pad = Math.min(size.w, size.h) * 0.04
    const availH = Math.max(120, size.h - insetTop - insetBottom - pad * 2)
    // 手機直放時圖是寬的、畫面是高的:放大一點,左右只切掉邊緣的留白
    const portrait = size.h > size.w * 1.15
    const fit = (b: (typeof CAMS)[keyof typeof CAMS]) => Math.min(((size.w - pad * 2) / (b.x1 - b.x0)) * (portrait ? 1.06 : 1), availH / (b.y1 - b.y0))
    const b = CAMS[l.cam]
    const s = fit(b)
    // 靜態層的解析度:取所有鏡頭裡最大的倍率,鏡頭推近時也不會糊;再限制圖層別大到手機 GPU 吃不消
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const R = Math.max(0.2, Math.min(4096 / (WORLD.w * dpr), Math.max(...Object.values(CAMS).map(fit))))
    const cx = (b.x0 + b.x1) / 2
    const cy = (b.y0 + b.y1) / 2
    const tx = size.w / 2 - s * (cx - WORLD.x)
    const ty = size.h / 2 + (insetTop - insetBottom) / 2 - s * (cy - WORLD.y)
    const ui = Math.min(2.2, Math.max(1, 0.6 / s))
    body = (
      <UI.Provider value={ui}>
        <Layer.Provider value={{ R, paused, lite }}>
          <div className={`scene-box${ui > 1.5 ? " tiny" : ""}`}>
            <div className="cam" style={{ width: WORLD.w * R, height: WORLD.h * R, transform: `translate3d(${tx}px, ${ty}px, 0) scale(${s / R})` }}>
              {l.oracle && hot && <Heat at={P(ORA_X, DB_Y)} r={ORA_BIG.r} />}
              <svg className="still" width={WORLD.w * R} height={WORLD.h * R} viewBox={`${WORLD.x} ${WORLD.y} ${WORLD.w} ${WORLD.h}`} aria-label="架構示意圖">
                <Still l={l} />
              </svg>
              <Moving l={l} ora={ora} hot={hot} />
            </div>
          </div>
        </Layer.Provider>
      </UI.Provider>
    )
  }
  return <div ref={box} className={`scene${paused ? " paused" : ""}${lite ? " lite" : ""}`}>{body}</div>
}

/* ================= 靜態層 ================= */
function Still({ l }: { l: Look }) {
  const [gX, gY] = P(PG_X, DB_Y)
  const order = APPS.map((_, i) => i).sort((a, b) => {
    const pa = appAt(a, l.moved)
    const pb = appAt(b, l.moved)
    return pa[0] + pa[1] - (pb[0] + pb[1])
  })
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
        <linearGradient id="gOra" x1="0" x2="1"><stop offset="0" stopColor="#f2c3bd" /><stop offset="1" stopColor="#d99088" /></linearGradient>
        <linearGradient id="gPg" x1="0" x2="1"><stop offset="0" stopColor="#c9daf0" /><stop offset="1" stopColor="#93aed3" /></linearGradient>
      </defs>
      <rect x={WORLD.x} y={WORLD.y} width={WORLD.w} height={WORLD.h} fill="url(#grid)" mask="url(#gridMask)" />

      {/* ---------- 應用層:VMware、K8s ---------- */}
      {l.vm && <VmSlab moved={l.moved} />}
      {l.k8s && (
        <Drop>
          <Shadow poly={[P(K8S.x, 0), P(K8S.x + K8S.w, 0), P(K8S.x + K8S.w, SLAB_D), P(K8S.x, SLAB_D)]} />
          <Box x={K8S.x} y={0} w={K8S.w} d={SLAB_D} h={SLAB_H} c={C.k8s} />
        </Drop>
      )}

      {/* ---------- 地面連線(流動的小點在動態層) ---------- */}
      {l.oracle && <VmLinkLine moved={l.moved} small={l.oraSmall} />}
      {l.oracle && l.k8s && l.moved && <path key={l.toPg ? "pg" : "ora"} className="link" d={toD(k8sLink(l.toPg))} pathLength={1} />}

      {/* ---------- 應用程式 ---------- */}
      {l.vm && order.map((i) => {
        const [ax, ay] = appAt(i, l.moved)
        return <App key={APPS[i]} i={i} at={P(ax, ay, SLAB_H)} inK8s={l.moved && i >= CORE} />
      })}

      {/* ---------- 資料層 ---------- */}
      {l.pg && (
        <g className="fade-in">
          <line x1={P(ORA_X, DB_Y, PIPE_Z)[0]} y1={P(ORA_X, DB_Y, PIPE_Z)[1]} x2={P(PG_X, DB_Y, PIPE_Z)[0]} y2={P(PG_X, DB_Y, PIPE_Z)[1]} stroke={INK} strokeWidth={16} strokeLinecap="round" />
          <line x1={P(ORA_X, DB_Y, PIPE_Z)[0]} y1={P(ORA_X, DB_Y, PIPE_Z)[1]} x2={P(PG_X, DB_Y, PIPE_Z)[0]} y2={P(PG_X, DB_Y, PIPE_Z)[1]} stroke="#fff4f2" strokeWidth={11} strokeLinecap="round" />
        </g>
      )}

      {l.oracle && <OracleDb small={l.oraSmall} />}

      {l.pg && (
        <g transform={`translate(${P(PLASMA_X, DB_Y)[0]} ${P(PLASMA_X, DB_Y)[1]})`}>
          <Drop delay={0.25}>
            <Shadow poly={[P(-42, -42), P(42, -42), P(42, 42), P(-42, 42)]} />
            <Box x={-42} y={-42} w={84} d={84} h={58} c={C.plasma} stroke="#b42622" sw={2.2} />
            <image href={plasmaLogo} x={-55} y={-146} width={110} height={24} />
          </Drop>
        </g>
      )}

      {l.pg && (
        <g transform={`translate(${gX} ${gY})`}>
          <Drop delay={0.1}>
            <ellipse cx={0} cy={12} rx={PG.r * 1.7} ry={PG.r * 0.85} fill="url(#gShadow)" />
            <Cyl r={PG.r} h={PG.h} grad="gPg" top="#e8f0fa" bands={2} />
            <PgMark y={-PG.h} />
          </Drop>
        </g>
      )}

      {/* ---------- 標籤(最上層,不被擋住) ---------- */}
      {l.k8s && <Pill x={P(K8S.x + K8S.w, SLAB_D)[0] + 74} y={P(K8S.x + K8S.w, SLAB_D)[1] - 4} text="Kubernetes" />}
      {l.vm && <VmLabel moved={l.moved} />}
      {l.oracle && <OracleLabels small={l.oraSmall} load={l.load} />}
      {l.pg && <Pill x={gX} y={gY + PG.r * 0.7 + 30} text="PostgreSQL" />}
    </>
  )
}

/* ---------- 會變大小的物件:各自補間,只重畫自己 ---------- */
function VmSlab({ moved }: { moved: boolean }) {
  const w = useTween(moved ? VM_SMALL : VM_BIG)
  return (
    <>
      {moved && <polygon className="ghost" points={pts([P(0, 0, SLAB_H), P(VM_BIG, 0, SLAB_H), P(VM_BIG, SLAB_D, SLAB_H), P(0, SLAB_D, SLAB_H)])} />}
      <Drop>
        <Shadow poly={[P(0, 0), P(w, 0), P(w, SLAB_D), P(0, SLAB_D)]} />
        <Box x={0} y={0} w={w} d={SLAB_D} h={SLAB_H} c={C.vm} />
      </Drop>
    </>
  )
}
function VmLabel({ moved }: { moved: boolean }) {
  const w = useTween(moved ? VM_SMALL : VM_BIG)
  return <Pill x={P(w, SLAB_D)[0] + 48} y={P(w, SLAB_D)[1] + 6} text="VMware" />
}
function VmLinkLine({ moved, small }: { moved: boolean; small: boolean }) {
  const w = useTween(moved ? VM_SMALL : VM_BIG)
  const r = useTween(small ? ORA_SMALL.r : ORA_BIG.r)
  return <path className="link" d={toD(vmLink(w, r))} pathLength={1} />
}
function OracleDb({ small }: { small: boolean }) {
  const r = useTween(small ? ORA_SMALL.r : ORA_BIG.r)
  const h = useTween(small ? ORA_SMALL.h : ORA_BIG.h)
  const [oX, oY] = P(ORA_X, DB_Y)
  return (
    <g transform={`translate(${oX} ${oY})`}>
      {small && <g className="ghost-g"><Cyl r={ORA_BIG.r} h={ORA_BIG.h} grad="gOra" top="none" dash /></g>}
      <Drop>
        <ellipse cx={0} cy={12} rx={r * 1.7} ry={r * 0.85} fill="url(#gShadow)" />
        <Cyl r={r} h={h} grad="gOra" top="#fbe4e1" bands={2} />
        <OracleMark y={-h} />
      </Drop>
    </g>
  )
}
function OracleLabels({ small, load }: { small: boolean; load: number }) {
  const r = useTween(small ? ORA_SMALL.r : ORA_BIG.r)
  const h = useTween(small ? ORA_SMALL.h : ORA_BIG.h)
  const v = Math.round(useTween(load, 1400))
  const [oX, oY] = P(ORA_X, DB_Y)
  return (
    <>
      <Pill x={oX} y={oY + r * 0.7 + 30} text="Oracle" />
      <LoadPill x={oX} y={oY - h - r * 0.7 - 34} v={v} />
    </>
  )
}

/* ================= 動態層:只用 transform / opacity ================= */
function Moving({ l, ora, hot }: { l: Look; ora: { r: number; h: number }; hot: boolean }) {
  if (!l.oracle) return null
  // 遮擋物:小點經過資料庫、Plasma 方塊後面時要藏起來(用最終大小算)
  const occ: Occluder[] = [cylOcc(P(ORA_X, DB_Y), ora.r, ora.h)]
  if (l.pg) {
    occ.push(cylOcc(P(PG_X, DB_Y), PG.r, PG.h))
    const c = P(PLASMA_X, DB_Y)
    occ.push(polyOcc([P(-42, -42, 58), P(42, -42, 58), P(42, -42, 0), P(42, 42, 0), P(-42, 42, 0), P(-42, 42, 58)].map((p) => add(p, c))))
  }
  const vm = vmLink(l.moved ? VM_SMALL : VM_BIG, ora.r)
  const k8s = k8sLink(l.toPg)
  const pipe = [P(ORA_X, DB_Y, PIPE_Z), P(PG_X, DB_Y, PIPE_Z)]
  return (
    <>
      {/* key 換了就重建:路線改變時重新排小點 */}
      <Dots key={`vm-${l.moved}-${l.oraSmall}-${l.pg}-${hot}`} path={vm} occ={occ} color={hot ? ORANGE : GREEN} heavy={hot} />
      {l.k8s && l.moved && <Dots key={`k8s-${l.toPg}-${l.oraSmall}-${l.pg}`} path={k8s} occ={occ} color={l.toPg ? GREEN : ORANGE} heavy={!l.toPg} />}
      {l.pg && <Dots key={`sync-${l.oraSmall}`} path={pipe} occ={occ} color="#b42622" square />}
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

function Dots({ path, occ, color, heavy = false, square = false }: { path: Pt[]; occ: Occluder[]; color: string; heavy?: boolean; square?: boolean }) {
  const { R, paused, lite } = useContext(Layer)
  const host = useRef<HTMLDivElement>(null)
  const { cum, runs } = visibleRuns(path, occ)
  // 塞車的線點比較密、跑比較慢;輕量模式點數少一些
  const spacing = (heavy ? 46 : square ? 52 : 72) * (lite ? 1.7 : 1)
  const speed = heavy ? 120 : square ? 210 : 230
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
      // 關鍵影格:兩端淡入淡出 + 每個轉角
      const ds = new Set([a, a + len * fade, b - len * fade, b])
      for (const c of cum) if (c > a && c < b) ds.add(c)
      const frames = [...ds].sort((x, y) => x - y).map((d) => {
        const [x, y] = along(path, cum, d)
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

  const total = plan.reduce((n, p) => n + p.n, 0)
  const size = (square ? 11 : 13) * R
  return (
    <div ref={host} className="fx">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={`dot${square ? " sq" : ""}`} style={{ width: size, height: square ? size * 0.8 : size, marginLeft: -size / 2, marginTop: -size / 2, background: color, borderWidth: 1.5 * R }} />
      ))}
    </div>
  )
}

/** Oracle 太忙時底下的紅光:CSS 漸層,只動透明度與縮放 */
function Heat({ at, r }: { at: Pt; r: number }) {
  const { R } = useContext(Layer)
  const w = r * 4.6 * R
  const h = r * 2.3 * R
  return <div className="heat" style={{ left: (at[0] - WORLD.x) * R - w / 2, top: (at[1] + 6 - WORLD.y) * R - h / 2, width: w, height: h }} />
}

/* ================= 基本形狀 ================= */
function Box({ x, y, z = 0, w, d, h, c, stroke = INK, sw = 1.9 }: { x: number; y: number; z?: number; w: number; d: number; h: number; c: string[]; stroke?: string; sw?: number }) {
  const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]
  const left = [P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)]
  const right = [P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)]
  return (
    <g strokeLinejoin="round">
      <polygon points={pts(left)} fill={c[1]} />
      <polygon points={pts(right)} fill={c[2]} />
      <polygon points={pts(top)} fill={c[0]} />
      {/* 頂面前緣的高光 */}
      <polyline points={pts([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y, z + h)].map((p) => add(p, [0, 1.6])))} fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={1.6} />
      <polygon points={pts([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z), P(x, y + d, z + h)])} fill="none" stroke={stroke} strokeWidth={sw} />
      <polyline points={pts([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y, z + h)])} fill="none" stroke={stroke} strokeWidth={sw * 0.7} />
      <line x1={P(x + w, y + d, z + h)[0]} y1={P(x + w, y + d, z + h)[1]} x2={P(x + w, y + d, z)[0]} y2={P(x + w, y + d, z)[1]} stroke={stroke} strokeWidth={sw * 0.7} />
    </g>
  )
}

/** 圓柱(資料庫、金幣):中心在地面 (0,0),半徑 r、高 h */
function Cyl({ r, h, grad, top, bands = 0, sw = 1.9, dash }: { r: number; h: number; grad: string; top: string; bands?: number; sw?: number; dash?: boolean }) {
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
      <ellipse cx={0} cy={-h} rx={rx} ry={ry} fill={dash ? "none" : top} {...st} />
      {!dash && <ellipse cx={0} cy={-h + 2} rx={rx * 0.8} ry={ry * 0.62} fill="#fff" opacity={0.28} />}
    </g>
  )
}

/** 直立的小標籤(中心在 x,y) */
function Pill({ x, y, text, tone = "paper", size = 15 }: { x: number; y: number; text: string; tone?: "paper" | "ink" | "red" | "green"; size?: number }) {
  const w = [...text].reduce((n, ch) => n + (ch.charCodeAt(0) > 255 ? size : size * 0.62), 0) + size * 1.5
  const h = size * 2
  const fill = { paper: "#fffdf8", ink: INK, red: "#b42622", green: GREEN }[tone]
  const color = tone === "paper" ? INK : "#fff"
  const ui = useContext(UI)
  return (
    <g className="pill" transform={`translate(${x} ${y}) scale(${ui})`}>
      <rect x={-w / 2} y={-h / 2 + 2.5} width={w} height={h} rx={h / 2} fill={INK} opacity={0.9} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={fill} stroke={INK} strokeWidth={1.8} />
      <text x={0} y={size * 0.36} textAnchor="middle" fontSize={size} fontWeight={800} fill={color}>{text}</text>
    </g>
  )
}

/** 物件下方的陰影:兩層疊色,看起來柔和,但不用模糊濾鏡 */
function Shadow({ poly }: { poly: Pt[] }) {
  return (
    <g fill="#6b5236">
      <polygon points={pts(poly.map((p) => add(p, [0, 16])))} opacity={0.06} />
      <polygon points={pts(poly.map((p) => add(p, [0, 8])))} opacity={0.08} />
    </g>
  )
}

/** 出現時從上方掉下來 */
function Drop({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return <g className="drop" style={{ animationDelay: `${delay}s` }}>{children}</g>
}

/* ---------- 應用程式小方塊:換位置時跳過去 ---------- */
function App({ i, at, inK8s }: { i: number; at: Pt; inK8s: boolean }) {
  const ref = useRef<SVGGElement>(null)
  const prev = useRef<Pt | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const p = prev.current
    el.style.transform = `translate(${at[0]}px, ${at[1]}px)`
    if (p && (p[0] !== at[0] || p[1] !== at[1])) {
      const mid: Pt = [(p[0] + at[0]) / 2, Math.min(p[1], at[1]) - 120]
      el.animate(
        [{ transform: `translate(${p[0]}px, ${p[1]}px)` }, { transform: `translate(${mid[0]}px, ${mid[1]}px)` }, { transform: `translate(${at[0]}px, ${at[1]}px)` }],
        { duration: 1000, delay: i >= CORE ? (i - CORE) * 260 : 0, easing: "cubic-bezier(.45,0,.3,1)", fill: "backwards" },
      )
    }
    prev.current = at
  }, [at[0], at[1], i])
  const Icon = ICONS[i]
  const h = CUBE / 2
  return (
    <g ref={ref}>
      <Drop delay={0.35 + i * 0.07}>
        <Shadow poly={[P(-h, -h), P(h, -h), P(h, h), P(-h, h)]} />
        <Box x={-h} y={-h} w={CUBE} d={CUBE} h={CUBE_H} c={inK8s ? C.appK : C.app} />
        <Icon x={-11} y={-CUBE_H - 30} width={22} height={22} strokeWidth={2.2} color={inK8s ? "#2a55b8" : INK} />
        <text className="cube-label" x={0} y={-CUBE_H + 12} textAnchor="middle" fontSize={12} fontWeight={800} fill={INK}>{APPS[i]}</text>
      </Drop>
    </g>
  )
}

/* ---------- 負載表 ---------- */
function LoadPill({ x, y, v }: { x: number; y: number; v: number }) {
  const hot = v > 60
  const col = hot ? "#c8402c" : GREEN
  const ui = useContext(UI)
  return (
    <g transform={`translate(${x} ${y}) scale(${ui})`} className="pill">
      <rect x={-70} y={-16 + 2.5} width={140} height={32} rx={16} fill={INK} opacity={0.9} />
      <rect x={-70} y={-16} width={140} height={32} rx={16} fill="#fffdf8" stroke={INK} strokeWidth={1.8} />
      <circle cx={-52} cy={0} r={6} fill={col} />
      <rect x={-40} y={-5} width={50} height={10} rx={5} fill="#ebe3d4" />
      <rect x={-40} y={-5} width={(50 * v) / 100} height={10} rx={5} fill={col} />
      <text x={44} y={6} textAnchor="middle" fontSize={17} fontWeight={800} fill={col} className="mono">{v}%</text>
    </g>
  )
}

/* ---------- 資料庫頂面的標誌 ---------- */
function OracleMark({ y }: { y: number }) {
  return <rect x={-26} y={y - 9} width={52} height={18} rx={9} fill="none" stroke="#c74634" strokeWidth={5} transform={`translate(0 ${-2}) scale(1 0.9)`} />
}
function PgMark({ y }: { y: number }) {
  return (
    <g transform={`translate(0 ${y - 2})`} fill="none" stroke="#336791" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M-18 6 C-26 -10 -16 -20 -4 -14 C2 -20 16 -20 18 -6 C20 6 10 10 4 6 L4 18" />
      <circle cx={-6} cy={-5} r={1.5} fill="#336791" />
    </g>
  )
}
