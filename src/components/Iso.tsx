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

function Gear({ x, y, r, dur, reverse = false }: { x: number; y: number; r: number; dur: number; reverse?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0" to={reverse ? -360 : 360} dur={`${dur}s`} repeatCount="indefinite" />
        <path d={gearPath(r, 8)} style={{ fill: "var(--iso-line)" }} />
        <circle r={r * 0.32} style={{ fill: "var(--iso-top)" }} />
      </g>
    </g>
  )
}

// 手工匯出的檔案:直立的文件,依格式上色
const FILE_STYLE: Record<string, { fill: string; text: string }> = {
  excel: { fill: "#1f9d55", text: "X" },
  csv: { fill: "#3b82f6", text: "CSV" },
  txt: { fill: "#9ca3af", text: "≡" },
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
          <Gear x={-a * 0.62} y={-30} r={9} dur={4} />
          <Gear x={a * 0.6} y={-8} r={7} dur={3} reverse />
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
// 過載冒煙:幾團灰色煙從平台上方緩緩升起、變大、淡出
function Smoke({ a }: { a: number }) {
  return (
    <g aria-hidden>
      {[-0.35, 0.1, 0.45].map((dx, i) => (
        <circle key={i} className="smoke" cx={dx * a} cy={-a * 0.55} r={a * 0.22} style={{ animationDelay: `${i * 0.7}s` }} />
      ))}
    </g>
  )
}

export function Platform({ kind, hot = false, variant, down = false }: { kind: NodeKind; hot?: boolean; variant?: string; down?: boolean }) {
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
      <g className={down ? "iso-down" : undefined}>
        <Box cx={0} cy={t} w={a} h={t} line={hot ? C.hot : C.line} />
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
      {hot && <Smoke a={a} />}
    </svg>
  )
}
