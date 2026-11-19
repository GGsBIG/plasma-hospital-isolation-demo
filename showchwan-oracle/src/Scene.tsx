import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { ChartColumn, ChartPie, ClipboardList, FileText, FlaskConical, HeartPulse, Pill as PillIcon, Stethoscope, type LucideIcon } from "lucide-react"
import { APPS, CAMS, CORE, type Look } from "./steps"
import plasmaLogo from "./assets/plasma-logo.svg"

/* ================= 等角投影 =================
   地面座標 (x, y, z):x 往右下、y 往左下、z 往上。畫面座標 = (x − y, (x + y) / 2 − z) */
type Pt = [number, number]
const P = (x: number, y: number, z = 0): Pt => [x - y, (x + y) / 2 - z]
const pts = (a: Pt[]) => a.map((p) => p.join(",")).join(" ")
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]

const INK = "#211e1b"
// 每種東西的頂面/左面/右面顏色
const C = {
  vm: ["#eef1f5", "#d3dbe4", "#bfcad6"],
  k8s: ["#e6eefc", "#c6d6f4", "#adc2ea"],
  app: ["#fffdf8", "#efe7d8", "#e0d4bf"],
  appK: ["#f7f9ff", "#dde6f7", "#c9d6ef"],
  plasma: ["#ffffff", "#f6e3e1", "#ecc9c5"],
}

/* ---------- 基本形狀 ---------- */
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
  const fill = { paper: "#fffdf8", ink: INK, red: "#b42622", green: "#2f7d4f" }[tone]
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

/** 標籤放大倍率:畫面縮得很小(手機)時,標籤放大一點才看得清楚 */
const UI = createContext(1)

/** 物件下方的柔和陰影 */
function Shadow({ poly }: { poly: Pt[] }) {
  return <polygon points={pts(poly.map((p) => add(p, [0, 14])))} fill="#6b5236" opacity={0.16} filter="url(#blur)" />
}

/** 出現時從上方掉下來 */
function Drop({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return <g className="drop" style={{ animationDelay: `${delay}s` }}>{children}</g>
}

/* ---------- 數字補間:大小改變時平滑變過去 ---------- */
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
const CUBE = 56
const CUBE_H = 44
const ICONS: LucideIcon[] = [ClipboardList, Stethoscope, HeartPulse, FlaskConical, PillIcon, FileText, ChartColumn, ChartPie]

/** 第 i 支應用程式的位置 */
function appAt(i: number, moved: boolean): [number, number] {
  if (i < CORE) return [70, 45 + i * 70]
  const j = i - CORE
  return moved ? [K8S.x + 60 + Math.floor(j / 2) * 120, 45 + (j % 2) * 70] : [190 + Math.floor(j / 2) * 120, 45 + (j % 2) * 70]
}

/** 應用層 → 資料層的地面連線 */
function linkPath(fromX: number, toX: number, midY: number) {
  const a = [P(fromX, SLAB_D), P(fromX, midY), P(toX, midY), P(toX, DB_Y)]
  return "M" + a.map((p) => p.join(" ")).join(" L")
}

/* ================= 場景 ================= */
export function Scene({ l, paused, insetTop = 0, insetBottom = 0 }: { l: Look; paused: boolean; insetTop?: number; insetBottom?: number }) {
  const svg = useRef<SVGSVGElement>(null)
  // 量 SVG 的實際大小:viewBox 與畫面 1:1,鏡頭倍率依可用空間算,手機、桌機都框得剛好
  const [measured, setSize] = useState<{ w: number; h: number } | null>(null)
  const size = measured ?? { w: 1600, h: 900 }
  useLayoutEffect(() => {
    const el = svg.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth || 1600, h: el.clientHeight || 900 })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const s = svg.current
    if (!s) return
    if (paused) s.pauseAnimations()
    else s.unpauseAnimations()
  }, [paused])

  const vmW = useTween(l.moved ? VM_SMALL : VM_BIG)
  const oraR = useTween(l.oraSmall ? 72 : 118)
  const oraH = useTween(l.oraSmall ? 100 : 150)
  const load = Math.round(useTween(l.load, 1400))
  const b = CAMS[l.cam]
  const pad = Math.min(size.w, size.h) * 0.04
  const availH = Math.max(120, size.h - insetTop - insetBottom - pad * 2)
  // 手機直放時圖是寬的、畫面是高的:放大一點,左右只切掉邊緣的留白
  const portrait = size.h > size.w * 1.15
  const scale = Math.min(((size.w - pad * 2) / (b.x1 - b.x0)) * (portrait ? 1.06 : 1), availH / (b.y1 - b.y0))
  const cam = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, s: scale, dy: (insetTop - insetBottom) / 2 }
  const ui = Math.min(2.2, Math.max(1, 0.6 / scale))
  const hot = l.load > 60

  const vmCx = vmW / 2
  const k8sCx = K8S.x + K8S.w / 2
  const [oX, oY] = P(ORA_X, DB_Y)
  const [gX, gY] = P(PG_X, DB_Y)
  // VMware 的線在 Oracle 的底面範圍內才轉彎,轉角藏在圓柱後面
  const vmPath = linkPath(vmCx, Math.max(ORA_X - oraR * 0.6, Math.min(ORA_X + oraR * 0.6, vmCx)), DB_Y - oraR * 0.6)
  const k8sPath = l.toPg ? linkPath(k8sCx, PG_X, 340) : linkPath(k8sCx, ORA_X, 262)
  const syncPath = `M${P(ORA_X, DB_Y, 26).join(" ")} L${P(PG_X, DB_Y, 26).join(" ")}`
  const vmApps = l.moved ? CORE : APPS.length

  // 應用程式依前後順序畫(後面的先畫)
  const order = APPS.map((_, i) => i).sort((a, b) => {
    const pa = appAt(a, l.moved)
    const pb = appAt(b, l.moved)
    return pa[0] + pa[1] - (pb[0] + pb[1])
  })

  return (
    <UI.Provider value={ui}>
    <svg ref={svg} className={`scene${paused ? " paused" : ""}${ui > 1.5 ? " tiny" : ""}`} viewBox={`${-size.w / 2} ${-size.h / 2} ${size.w} ${size.h}`} aria-label="架構示意圖">
      <defs>
        <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 0 L40 20 M40 0 L0 20" stroke="#ddd2c0" strokeWidth="1" />
        </pattern>
        <radialGradient id="fade" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="#fff" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <mask id="gridMask"><rect x="-1600" y="-1000" width="3200" height="2000" fill="url(#fade)" /></mask>
        <filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9" /></filter>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16" /></filter>
        <linearGradient id="gOra" x1="0" x2="1"><stop offset="0" stopColor="#f2c3bd" /><stop offset="1" stopColor="#d99088" /></linearGradient>
        <linearGradient id="gPg" x1="0" x2="1"><stop offset="0" stopColor="#c9daf0" /><stop offset="1" stopColor="#93aed3" /></linearGradient>
        <linearGradient id="gCoin" x1="0" x2="1"><stop offset="0" stopColor="#f3cf6e" /><stop offset="1" stopColor="#d6a032" /></linearGradient>
        <linearGradient id="gFine" x1="0" x2="1"><stop offset="0" stopColor="#f0a49c" /><stop offset="1" stopColor="#cf5c52" /></linearGradient>
      </defs>

      {/* 鏡頭:把要看的地方移到畫面中央並放大(量到畫面大小之後才畫,第一格就取景正確) */}
      {measured && <g className="cam" style={{ transform: `translate(0px, ${cam.dy}px) scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)` }}>
        <rect x="-1400" y="-900" width="3400" height="2200" fill="url(#grid)" mask="url(#gridMask)" transform={`translate(${cam.x} ${cam.y})`} />

        {/* ---------- 應用層:VMware、K8s ---------- */}
        {l.vm && l.moved && (
          <polygon className="ghost" points={pts([P(0, 0, SLAB_H), P(VM_BIG, 0, SLAB_H), P(VM_BIG, SLAB_D, SLAB_H), P(0, SLAB_D, SLAB_H)])} />
        )}
        {l.vm && (
          <Drop>
            <Shadow poly={[P(0, 0), P(vmW, 0), P(vmW, SLAB_D), P(0, SLAB_D)]} />
            <Box x={0} y={0} w={vmW} d={SLAB_D} h={SLAB_H} c={C.vm} />
          </Drop>
        )}
        {l.k8s && (
          <Drop>
            <Shadow poly={[P(K8S.x, 0), P(K8S.x + K8S.w, 0), P(K8S.x + K8S.w, SLAB_D), P(K8S.x, SLAB_D)]} />
            <Box x={K8S.x} y={0} w={K8S.w} d={SLAB_D} h={SLAB_H} c={C.k8s} />
          </Drop>
        )}

        {/* ---------- 地面連線與流動的請求 ---------- */}
        {l.oracle && (
          <g>
            <Flow key="vm" d={vmPath} n={vmApps} color={hot ? "#d9722b" : "#2f7d4f"} slow={hot} />
            {l.k8s && l.moved && <Flow key={l.toPg ? "k8s-pg" : "k8s-ora"} d={k8sPath} n={6} color={l.toPg ? "#2f7d4f" : "#d9722b"} slow={!l.toPg} />}
          </g>
        )}

        {/* ---------- 應用程式 ---------- */}
        {l.vm && order.map((i) => {
          const [ax, ay] = appAt(i, l.moved)
          return <App key={APPS[i]} i={i} at={P(ax, ay, SLAB_H)} inK8s={l.moved && i >= CORE} />
        })}

        {/* ---------- 資料層 ---------- */}
        {l.pg && (
          <g className="fade-in">
            <line x1={P(ORA_X, DB_Y, 26)[0]} y1={P(ORA_X, DB_Y, 26)[1]} x2={P(PG_X, DB_Y, 26)[0]} y2={P(PG_X, DB_Y, 26)[1]} stroke={INK} strokeWidth={16} strokeLinecap="round" />
            <line x1={P(ORA_X, DB_Y, 26)[0]} y1={P(ORA_X, DB_Y, 26)[1]} x2={P(PG_X, DB_Y, 26)[0]} y2={P(PG_X, DB_Y, 26)[1]} stroke="#fff4f2" strokeWidth={11} strokeLinecap="round" />
            {Array.from({ length: 7 }, (_, k) => (
              <rect key={k} x={-5} y={-4} width={10} height={8} rx={2} fill="#b42622">
                <animateMotion dur="2.4s" repeatCount="indefinite" begin={`${-k * (2.4 / 7)}s`} path={syncPath} />
              </rect>
            ))}
          </g>
        )}

        {l.oracle && (
          <g transform={`translate(${oX} ${oY})`}>
            {l.oraSmall && <g className="ghost-g"><Cyl r={118} h={150} grad="gOra" top="none" dash /></g>}
            <Drop>
              {hot && <ellipse className="heat" cx={0} cy={6} rx={oraR * 1.9} ry={oraR * 0.95} fill="#e0452f" filter="url(#glow)" />}
              <ellipse cx={0} cy={14} rx={oraR * Math.SQRT2} ry={oraR * 0.7} fill="#6b5236" opacity={0.18} filter="url(#blur)" />
              <Cyl r={oraR} h={oraH} grad="gOra" top="#fbe4e1" bands={2} />
              <OracleMark y={-oraH} />
            </Drop>
          </g>
        )}

        {l.pg && (
          <g transform={`translate(${P(PLASMA_X, DB_Y)[0]} ${P(PLASMA_X, DB_Y)[1]})`}>
            <Drop delay={0.25}>
              <Shadow poly={[P(-42, -42), P(42, -42), P(42, 42), P(-42, 42)]} />
              <Box x={-42} y={-42} w={84} d={84} h={58} c={C.plasma} stroke="#b42622" sw={2.2} />
              <image href={plasmaLogo} x={-55} y={-146} width={110} height={32} />
            </Drop>
          </g>
        )}

        {l.pg && (
          <g transform={`translate(${gX} ${gY})`}>
            <Drop delay={0.1}>
              <ellipse cx={0} cy={14} rx={90 * Math.SQRT2} ry={90 * 0.7} fill="#6b5236" opacity={0.18} filter="url(#blur)" />
              <Cyl r={90} h={118} grad="gPg" top="#e8f0fa" bands={2} />
              <PgMark y={-118} />
            </Drop>
          </g>
        )}

        {/* ---------- 授權費:金幣堆 ---------- */}
        {l.vm && <Coins at={P(-80, 70)} n={l.vmCoins} fine={l.audit} />}
        {l.oracle && <Coins at={P(100, DB_Y + 100)} n={l.oraCoins} fine={l.audit} />}
        {l.pg && <Coins at={P(905, DB_Y - 80)} n={0} free />}

        {/* ---------- 稽核:放大鏡掃過 ---------- */}
        {l.audit && <Audit vm={add(P(-80, 70), [0, -110])} ora={add(P(100, DB_Y + 100), [0, -110])} db={[oX, oY - oraH - 40]} />}

        {/* ---------- 標籤(最上層,不被擋住) ---------- */}
        {l.vm && <Pill x={P(vmW, SLAB_D)[0] + 48} y={P(vmW, SLAB_D)[1] + 6} text="VMware" />}
        {l.k8s && <Pill x={P(K8S.x + K8S.w, SLAB_D)[0] + 74} y={P(K8S.x + K8S.w, SLAB_D)[1] - 4} text="Kubernetes" />}
        {l.oracle && <Pill x={oX} y={oY + oraR * 0.7 + 30} text="Oracle" />}
        {l.oracle && <LoadPill x={oX} y={oY - oraH - oraR * 0.7 - 34} v={load} />}
        {l.pg && <Pill x={gX} y={gY + 63 + 30} text="PostgreSQL" />}
      </g>}
    </svg>
    </UI.Provider>
  )
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

/* ---------- 連線:線先畫出來,再有小圓點沿線流動 ---------- */
function Flow({ d, n, color, slow }: { d: string; n: number; color: string; slow: boolean }) {
  const dur = slow ? 3.2 : 2
  return (
    <g>
      <path className="link" d={d} pathLength={1} />
      {Array.from({ length: n + 2 }, (_, k) => (
        <circle key={k} r={6} fill={color} stroke={INK} strokeWidth={1.5}>
          <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${-k * (dur / (n + 2))}s`} path={d} />
        </circle>
      ))}
    </g>
  )
}

/* ---------- 金幣堆:每一枚代表一份授權費(示意) ---------- */
const MAX_COINS = 8
function Coins({ at, n, fine = false, free = false }: { at: Pt; n: number; fine?: boolean; free?: boolean }) {
  const FINES = 3
  return (
    <g transform={`translate(${at[0]} ${at[1]})`}>
      <Drop delay={0.5}>
        <ellipse cx={0} cy={8} rx={34} ry={16} fill="#6b5236" opacity={0.18} filter="url(#blur)" />
        {free && <g className="ghost-g"><Cyl r={20} h={8} grad="gCoin" top="none" dash /></g>}
        {Array.from({ length: MAX_COINS + FINES }, (_, k) => {
          const isFine = k >= MAX_COINS
          const on = isFine ? fine && k - MAX_COINS < FINES : k < n
          const z = isFine ? (n + (k - MAX_COINS)) * 9 : k * 9
          return (
            <g key={k} transform={`translate(0 ${-z})`}>
              <g className={`coin${on ? " on" : ""}${isFine ? " fine" : ""}`} style={{ transitionDelay: on ? `${(isFine ? k - MAX_COINS : k) * 0.06}s` : `${(MAX_COINS - k) * 0.04}s` }}>
                <Cyl r={20} h={8} grad={isFine ? "gFine" : "gCoin"} top={isFine ? "#f8c9c4" : "#fbe5a6"} sw={1.6} />
              </g>
            </g>
          )
        })}
      </Drop>
    </g>
  )
}

/* ---------- 負載表 ---------- */
function LoadPill({ x, y, v }: { x: number; y: number; v: number }) {
  const hot = v > 60
  const col = hot ? "#c8402c" : "#2f7d4f"
  const ui = useContext(UI)
  return (
    <g transform={`translate(${x} ${y}) scale(${ui})`} className="pill">
      <rect x={-70} y={-16 + 2.5} width={140} height={32} rx={16} fill={INK} opacity={0.9} />
      <rect x={-70} y={-16} width={140} height={32} rx={16} fill="#fffdf8" stroke={INK} strokeWidth={1.8} />
      <circle cx={-52} cy={0} r={6} fill={col} className={hot ? "blink" : ""} />
      <rect x={-40} y={-5} width={50} height={10} rx={5} fill="#ebe3d4" />
      <rect x={-40} y={-5} width={(50 * v) / 100} height={10} rx={5} fill={col} />
      <text x={44} y={6} textAnchor="middle" fontSize={17} fontWeight={800} fill={col} className="mono">{v}%</text>
    </g>
  )
}

/* ---------- 稽核:放大鏡在 VMware、Oracle 與兩邊的金幣之間來回掃 ---------- */
function Audit({ vm, ora, db }: { vm: Pt; ora: Pt; db: Pt }) {
  const path = `M${vm.join(" ")} L${db.join(" ")} L${ora.join(" ")} Z`
  return (
    <g>
      <g className="alert" transform={`translate(${vm[0] + 34} ${vm[1] - 6})`}><Alert /></g>
      <g className="alert" style={{ animationDelay: "0.3s" }} transform={`translate(${ora[0] + 34} ${ora[1] - 6})`}><Alert /></g>
      <g>
        <animateMotion dur="5s" repeatCount="indefinite" path={path} />
        <g className="lens">
          <line x1={22} y1={22} x2={48} y2={48} stroke={INK} strokeWidth={11} strokeLinecap="round" />
          <circle r={32} fill="#fff" fillOpacity={0.55} stroke={INK} strokeWidth={6} />
          <path d="M-16 -10 A20 20 0 0 1 -4 -20" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
        </g>
      </g>
    </g>
  )
}
function Alert() {
  return (
    <g>
      <circle r={17} fill="#b42622" stroke={INK} strokeWidth={2} />
      <text y={7} textAnchor="middle" fontSize={22} fontWeight={900} fill="#fff">!</text>
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
