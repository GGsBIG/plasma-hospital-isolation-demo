import type { EdgeDef } from "../types"
import { dotScale, isCompact, lineScale } from "../layout"

const LINE: Record<EdgeDef["state"], string> = {
  normal: "var(--edge-normal)",
  overload: "var(--edge-overload)",
  isolated: "var(--edge-isolated)",
}

const DOT: Record<EdgeDef["state"], string> = {
  normal: "var(--dot-normal)",
  overload: "var(--dot-overload)",
  isolated: "var(--dot-isolated)",
}

// 每秒移動的 px:過載時資料流明顯更急
const SPEED: Record<EdgeDef["state"], number> = {
  normal: 110,
  overload: 320,
  isolated: 150,
}

// 每 px 的光點密度
const DENSITY: Record<EdgeDef["state"], number> = {
  normal: 1 / 170,
  overload: 1 / 55,
  isolated: 1 / 140,
}

// 連線 + 沿線流動的光點(SMIL animateMotion 跟著 path 走,path 變形時光點會跟著)。
// 形狀 d 與透明度每格由 Stage 直接寫進 DOM(gRef),這裡不帶,捲動時不重繪;
// highlight / faded 是滑鼠停在節點上時的強調,用 CSS transition
export function Edge({ id, gRef, length, state, highlight, faded }: {
  id: string
  gRef: (el: SVGGElement | null) => void
  length: number
  state: EdgeDef["state"]
  highlight: boolean
  faded: boolean
}) {
  // 長度取所在情境裡的長度(過場中不變),速度與光點數才不會一直變、SMIL 動畫不會重啟
  const len = Math.max(40, Math.round(length / 40) * 40)
  const dur = len / SPEED[state]
  // 手機上光點較大、數量減半,畫面不會太擠,每格要繪製的東西也少一半
  const count = Math.max(2, Math.round(len * DENSITY[state] * (isCompact() ? 0.5 : 1)))
  const lw = lineScale()
  const dr = dotScale()
  return (
    <g ref={gRef}>
      <g className={`transition-opacity duration-300 ${faded ? "opacity-20" : "opacity-100"}`}>
        <path
          id={id}
          className="transition-[stroke-width] duration-300"
          style={{ stroke: highlight ? DOT[state] : LINE[state], strokeWidth: (state === "overload" ? 1.6 : 1.3) * lw * (highlight ? 2 : 1) }}
          fill="none"
        />
        {Array.from({ length: count }, (_, i) => (
          // 光點不加 drop-shadow:幾十顆同時移動時每格都要重繪陰影,是捲動卡頓的主因;改用略大的實心點
          <circle key={`${state}-${i}`} r={(state === "overload" ? 3.3 : 3.7) * dr} style={{ fill: DOT[state] }}>
            <animateMotion
              dur={`${dur.toFixed(2)}s`}
              begin={`${(-(i * dur) / count).toFixed(2)}s`}
              repeatCount="indefinite"
            >
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
        ))}
      </g>
    </g>
  )
}
