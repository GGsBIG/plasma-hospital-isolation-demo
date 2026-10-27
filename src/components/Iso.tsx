import type { NodeKind } from "../types"
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

function Decor({ kind, a, hot }: { kind: NodeKind; a: number; hot: boolean }) {
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
    case "kb": {
      // 疊放的文件
      return (
        <>
          {[0, 1, 2].map((i) => (
            <Box key={i} cx={(i - 1) * 3} cy={-i * 6} w={a * 0.5} h={4} top={i === 2 ? C.raised : C.top} />
          ))}
        </>
      )
    }
    case "plasma": {
      // 隆起的核心 + 旋轉的等角圓環
      const lift = 14
      return (
        <>
          <Box cx={0} cy={0} w={a * 0.5} h={lift} top={C.raised} />
          <g transform={`matrix(1 0.5 -1 0.5 0 ${-lift})`}>
            <circle r={22} fill="none" style={{ stroke: "var(--iso-ring-track)" }} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <circle
              r={22} fill="none" style={{ stroke: "var(--iso-ring)" }} strokeWidth={2.5} strokeLinecap="round"
              strokeDasharray="95 43" vectorEffect="non-scaling-stroke"
            >
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle r={3.2} style={{ fill: "var(--iso-ring)" }} />
          </g>
        </>
      )
    }
  }
}

// 節點平台:座標原點為頂面中心
export function Platform({ kind, hot = false }: { kind: NodeKind; hot?: boolean }) {
  const { a, t } = sizeOf(kind)
  // 裝飾(圓柱、圓環…)跟著平台一起放大:基本倍率 × 直式圖示倍率
  const k = NODE_SCALE * iconScale(kind)
  const b = a / 2
  const padTop = 48 * k
  const vb = { x: -a - 4, y: -b - padTop, w: 2 * a + 8, h: 2 * b + t + padTop + 4 }
  return (
    <svg
      width={vb.w}
      height={vb.h}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      className="absolute overflow-visible"
      style={{ left: vb.x, top: vb.y }}
    >
      {hot && (
        <ellipse cx={0} cy={t / 2} rx={a * 1.1} ry={b * 1.1} fill="#f87171" className="hot-pulse" style={{ filter: "blur(14px)" }} />
      )}
      {kind === "plasma" && (
        <ellipse cx={0} cy={t / 2} rx={a * 1.2} ry={b * 1.2} style={{ fill: "var(--iso-glow)", opacity: "var(--iso-glow-opacity)", filter: "blur(18px)" }} />
      )}
      <Box cx={0} cy={t} w={a} h={t} line={hot ? C.hot : C.line} />
      {/* 裝飾以未縮放尺寸繪製,再整組放大 */}
      <g transform={`scale(${k})`}>
        <Decor kind={kind} a={a / k} hot={hot} />
      </g>
    </svg>
  )
}
