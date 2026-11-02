import type { NodeKind } from "../types"
import plasmaLogo from "../assets/plasma-logo.svg"
import plasmaLogoDark from "../assets/plasma-logo-dark.svg"
import { KNOWLEDGE_ICON } from "../fileIcons"
import { NODE_SCALE, sizeOf } from "../geometry"
import { iconScale } from "../layout"

// 等角投影的面色:頂面最亮,右側最暗。取自 index.css 的主題變數,
// 以 style 指定(SVG 屬性不一定吃 var())
const C = {
  top: "var(--iso-top)",
  left: "var(--iso-left)",
  right: "var(--iso-right)",
  line: "var(--iso-line)",
  hot: "var(--iso-hot)",
  raised: "var(--iso-raised)",
}

// 頂面網格座標 (u, v) → 畫面座標
const p = (u: number, v: number) => [u - v, (u + v) / 2] as const

const pts = (...xy: number[]) => xy.join(" ")

// 一個等角方塊:(cx, cy) 為底面中心,w 為頂面半寬,h 為高
function Box({ cx, cy, w, h, top = C.top, line = C.line }: {
  cx: number; cy: number; w: number; h: number; top?: string; line?: string
}) {
  const y = cy - h
  return (
    <g style={{ stroke: line }} strokeWidth={1} strokeLinejoin="round">
      <polygon points={pts(cx - w, y, cx, y + w / 2, cx, cy + w / 2, cx - w, cy)} style={{ fill: C.left }} />
      <polygon points={pts(cx, y + w / 2, cx + w, y, cx + w, cy, cx, cy + w / 2)} style={{ fill: C.right }} />
      <polygon points={pts(cx, y - w / 2, cx + w, y, cx, y + w / 2, cx - w, y)} style={{ fill: top }} />
    </g>
  )
}

function Cylinder({ cx, cy, r, h, hot }: { cx: number; cy: number; r: number; h: number; hot: boolean }) {
  const ry = r / 2
  const stroke = hot ? C.hot : C.line
  return (
    <g style={{ stroke }} strokeWidth={1}>
      <path
        d={`M ${cx - r} ${cy - h} L ${cx - r} ${cy} A ${r} ${ry} 0 0 0 ${cx + r} ${cy} L ${cx + r} ${cy - h} Z`}
        style={{ fill: C.left }}
      />
      <path d={`M ${cx - r} ${cy - h / 2} A ${r} ${ry} 0 0 0 ${cx + r} ${cy - h / 2}`} fill="none" />
      <ellipse cx={cx} cy={cy - h} rx={r} ry={ry} style={{ fill: hot ? "var(--iso-cyl-top-hot)" : "var(--iso-cyl-top)" }} />
    </g>
  )
}

// 齒輪外框:teeth 個齒,外徑 r、內徑 r * 0.78
function gearPath(r: number, teeth: number) {
  const pts: string[] = []
  for (let i = 0; i < teeth * 4; i++) {
    const ang = (i / (teeth * 4)) * Math.PI * 2
    const rr = i % 4 < 2 ? r : r * 0.78
    pts.push(`${(Math.cos(ang) * rr).toFixed(2)} ${(Math.sin(ang) * rr).toFixed(2)}`)
  }
  return `M ${pts.join(" L ")} Z`
}

// 轉動的齒輪:畫在獨立的 HTML 圖層上,用 CSS 旋轉(交給 GPU 合成,不必每格重畫整個平台 SVG)。
// x、y、r 為平台座標(px)
function Gear({ x, y, r, dur, reverse = false }: { x: number; y: number; r: number; dur: number; reverse?: boolean }) {
  return (
    <div className="spin" style={{ left: x - r, top: y - r, width: 2 * r, height: 2 * r, animationDuration: `${dur}s`, animationDirection: reverse ? "reverse" : undefined }}>
      <svg viewBox="-1 -1 2 2" width="100%" height="100%" className="block overflow-visible">
        <path d={gearPath(1, 8)} style={{ fill: "var(--iso-line)" }} />
        <circle r={0.32} style={{ fill: "var(--iso-top)" }} />
      </svg>
    </div>
  )
}

// 手工匯出的檔案:直立的文件,依格式上色
const FILE_STYLE: Record<string, { fill: string; text: string }> = {
  excel: { fill: "#1f9d55", text: "X" },
  csv: { fill: "#3b82f6", text: "CSV" },
  txt: { fill: "#9ca3af", text: "≡" },
}

// Plasma 核心立方體(相對平台半寬 a 的比例)與高度、知識庫立方體的大小(未縮放單位)
export const PLASMA_LIFT = 66
const PLASMA_CORE = 0.86
const KB_CUBE = 1.5

// 等角立方體側面的座標系:原點在側面左上角,x 沿側面水平方向(實際長度)、y 垂直向下。
// 立方體底面中心在 (0, 0),半寬 w、高 h(與 Box 相同)
function faceMatrix(side: "left" | "right", w: number, h: number) {
  const len = Math.hypot(w, w / 2)
  const ux = w / len
  const uy = w / 2 / len
  return side === "left"
    ? { m: `matrix(${ux} ${uy} 0 1 ${-w} ${-h})`, len }
    : { m: `matrix(${ux} ${-uy} 0 1 0 ${-h + w / 2})`, len }
}

// 側面貼 logo(深淺色各一張,依主題切換)
function FaceLogo({ side, w, h }: { side: "left" | "right"; w: number; h: number }) {
  const { m, len } = faceMatrix(side, w, h)
  const pad = len * 0.08
  return (
    <g transform={m}>
      <image href={plasmaLogo} x={pad} y={h * 0.2} width={len - 2 * pad} height={h * 0.6} preserveAspectRatio="xMidYMid meet" className="dark:hidden" />
      <image href={plasmaLogoDark} x={pad} y={h * 0.2} width={len - 2 * pad} height={h * 0.6} preserveAspectRatio="xMidYMid meet" className="hidden dark:block" />
    </g>
  )
}

// 立方體的面上貼圖示:左、右側面沿等角水平線,頂面沿等角平面;圖示置中,約佔面的 6–7 成
function FaceIcon({ side, w, h }: { side: "left" | "right" | "top"; w: number; h: number }) {
  const I = KNOWLEDGE_ICON
  const glyph = (cx: number, cy: number, size: number) => {
    const k = size / Math.max(I.w, I.h)
    return (
      <path
        d={I.d}
        transform={`translate(${cx - (I.w * k) / 2} ${cy - (I.h * k) / 2}) scale(${k}) translate(${-I.x} ${-I.y})`}
        style={{ fill: "var(--dot-isolated)" }}
      />
    )
  }
  if (side === "top") return <g transform={`matrix(1 0.5 -1 0.5 0 ${-h})`}>{glyph(0, 0, w * 0.7)}</g>
  const { m, len } = faceMatrix(side, w, h)
  return <g transform={m}>{glyph(len / 2, h / 2, Math.min(len, h) * 0.62)}</g>
}

function Decor({ kind, a, hot, variant }: { kind: NodeKind; a: number; hot: boolean; variant?: string }) {
  const s = a * 0.25
  switch (kind) {
    case "db":
    case "serving": {
      // 2×2 資料庫圓柱,由後往前畫
      const spots = [p(-s, -s), p(s, -s), p(-s, s), p(s, s)]
      return <>{spots.map(([x, y], i) => <Cylinder key={i} cx={x} cy={y} r={10} h={16} hot={hot} />)}</>
    }
    case "app": {
      const spots = [p(-s, -s), p(s, -s * 0.2), p(-s * 0.4, s)]
      return <>{spots.map(([x, y], i) => <Box key={i} cx={x} cy={y} w={11} h={13} />)}</>
    }
    case "downstream": {
      const spots = [p(-s, -s), p(s, -s), p(-s, s), p(s, s)]
      return (
        <>
          {spots.map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx={7} ry={3.5} strokeWidth={1}
              style={{ fill: "var(--iso-pad)", stroke: hot ? C.hot : C.line }} />
          ))}
        </>
      )
    }
    case "file": {
      const f = FILE_STYLE[variant ?? "txt"] ?? FILE_STYLE.txt
      const w = 26
      const h = 32
      const fold = 8
      return (
        <g transform={`translate(${-w / 2} ${-h - 4})`}>
          <path d={`M 0 0 H ${w - fold} L ${w} ${fold} V ${h} H 0 Z`} style={{ fill: f.fill }} />
          <path d={`M ${w - fold} 0 V ${fold} H ${w} Z`} fill="#fff" opacity={0.45} />
          <text x={w / 2} y={h * 0.64} textAnchor="middle" dominantBaseline="central" fontSize={f.text.length > 1 ? 8.5 : 13} fontWeight={800} fill="#fff" fontFamily="ui-sans-serif, system-ui">
            {f.text}
          </text>
        </g>
      )
    }
    case "person": {
      // 人員 + 轉動的齒輪(人工作業);person-clock 再加上紅色時鐘(耗時)
      return (
        <>
          <g transform="translate(0 -6)">
            <circle cx={0} cy={-34} r={8} fill="#f59e0b" />
            <path d="M -14 -6 Q -14 -22 0 -22 Q 14 -22 14 -6 Z" fill="#f59e0b" />
          </g>
          {variant === "person-clock" && (
            <g transform={`translate(${a * 0.55} -44)`}>
              <circle r={9} style={{ fill: "var(--dot-overload)" }} />
              <path d="M 0 -5 V 0 L 4 3" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
            </g>
          )}
        </>
      )
    }
    case "kb": {
      // 知識庫立方體:左、右、頂三個面都貼上知識(書本 + 燈泡)圖示
      const w = a * KB_CUBE
      const h = w * 0.9
      return (
        <>
          <Box cx={0} cy={0} w={w} h={h} top={C.raised} />
          <FaceIcon side="left" w={w} h={h} />
          <FaceIcon side="right" w={w} h={h} />
          <FaceIcon side="top" w={w} h={h} />
        </>
      )
    }
    case "plasma": {
      // 隆起的核心立方體:左右兩個側面都貼 Plasma logo;頂面是等角圓環的底圈(轉動的那一段畫在 Platform 的 HTML 圖層上)
      const lift = PLASMA_LIFT
      const w = a * PLASMA_CORE
      return (
        <>
          <Box cx={0} cy={0} w={w} h={lift} top={C.raised} />
          <FaceLogo side="left" w={w} h={lift} />
          <FaceLogo side="right" w={w} h={lift} />
          <g transform={`matrix(1 0.5 -1 0.5 0 ${-lift})`}>
            <circle r={22} fill="none" style={{ stroke: "var(--iso-ring-track)" }} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <circle r={3.2} style={{ fill: "var(--iso-ring)" }} />
          </g>
        </>
      )
    }
  }
}

// 節點平台:座標原點為頂面中心
// 會動的部分(過載紅光、冒煙、齒輪、Plasma 的轉動圓環)都放在 SVG 外的 HTML 圖層,只動 transform / opacity,
// 由 GPU 合成,不會每格重畫平台 SVG
export function Platform({ kind, hot = false, variant, down = false, bare = false }: { kind: NodeKind; hot?: boolean; variant?: string; down?: boolean; bare?: boolean }) {
  const { a, t } = sizeOf(kind)
  // 裝飾(圓柱、圓環…)跟著平台一起放大:基本倍率 × 直式圖示倍率
  const k = NODE_SCALE * iconScale(kind)
  const b = a / 2
  const padTop = 48 * k
  const vb = { x: -a - 4, y: -b - padTop, w: 2 * a + 8, h: 2 * b + t + padTop + 4 }
  return (
    <>
    {hot && <div className="hot-glow" style={{ left: -a * 1.25, top: t / 2 - b * 1.25, width: a * 2.5, height: b * 2.5 }} />}
    <svg
      width={vb.w}
      height={vb.h}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      className="absolute overflow-visible"
      style={{ left: vb.x, top: vb.y }}
    >
      {kind === "plasma" && (
        <ellipse cx={0} cy={t / 2} rx={a * 1.4} ry={b * 1.4} fill="url(#plasma-glow)" />
      )}
      <g className={down ? "iso-down" : undefined}>
        {/* bare:疊在別的平台上(合體的知識庫),不畫底座,只有上面的立方體 */}
        {!bare && <Box cx={0} cy={t} w={a} h={t} line={hot ? C.hot : C.line} />}
        {/* 裝飾以未縮放尺寸繪製,再整組放大 */}
        <g transform={`scale(${k})`}>
          <Decor kind={kind} a={a / k} hot={hot} variant={variant} />
        </g>
      </g>
      {/* 停機:頂面裂開 */}
      {down && (
        <path
          d={`M ${-a * 0.7} ${-b * 0.1} L ${-a * 0.3} ${b * 0.15} L ${-a * 0.1} ${-b * 0.25} L ${a * 0.2} ${b * 0.3} L ${a * 0.45} ${-b * 0.05} L ${a * 0.75} ${b * 0.2}`}
          fill="none"
          style={{ stroke: "var(--dot-overload)" }}
          strokeWidth={3 * k}
          strokeLinejoin="round"
        />
      )}
    </svg>
    {kind === "person" && (
      <>
        <Gear x={-a * 0.62} y={-30 * k} r={9 * k} dur={4} />
        <Gear x={a * 0.6} y={-8 * k} r={7 * k} dur={3} reverse />
      </>
    )}
    {kind === "plasma" && (
      // 等角平面上轉動的圓環:外層壓成等角,內層旋轉
      <div className="absolute left-0 h-0 w-0" style={{ top: -PLASMA_LIFT * k, transform: "matrix(1, 0.5, -1, 0.5, 0, 0)" }}>
        <div className="spin" style={{ left: -22 * k, top: -22 * k, width: 44 * k, height: 44 * k, animationDuration: "2.4s" }}>
          <svg viewBox="-23 -23 46 46" width="100%" height="100%" className="block overflow-visible">
            <circle r={22} fill="none" style={{ stroke: "var(--iso-ring)" }} strokeWidth={2.5 / k} strokeLinecap="round" strokeDasharray="95 43" />
          </svg>
        </div>
      </div>
    )}
    {hot && [-0.35, 0.1, 0.45].map((dx, i) => (
      <div key={i} className="smoke-puff" style={{ left: dx * a - a * 0.3, top: -a * 0.55 - a * 0.3, width: a * 0.6, height: a * 0.6, animationDelay: `${i * 0.7}s` }} />
    ))}
    </>
  )
}
