import type { EdgeDef } from "../types"
import { dotScale, isCompact, lineScale } from "../layout"

const LINE: Record<EdgeDef["state"], string> = {
  normal: "var(--edge-normal)",
  overload: "var(--edge-overload)",
  isolated: "var(--edge-isolated)",
  risk: "var(--edge-overload)",
  slow: "var(--edge-normal)",
  dead: "var(--edge-normal)",
  attack: "var(--dot-overload)",
}

const DOT: Record<EdgeDef["state"], string> = {
  normal: "var(--dot-normal)",
  overload: "var(--dot-overload)",
  isolated: "var(--dot-isolated)",
  risk: "var(--dot-overload)",
  slow: "var(--dot-normal)",
  dead: "var(--edge-normal)",
  attack: "var(--dot-overload)",
}

// 每秒移動的 px:過載時資料流明顯更急
const SPEED: Record<EdgeDef["state"], number> = {
  normal: 110,
  overload: 320,
  isolated: 150,
  risk: 110,
  slow: 70,
  dead: 0,
  attack: 260,
}

// 每 px 的光點密度
const DENSITY: Record<EdgeDef["state"], number> = {
  normal: 1 / 170,
  overload: 1 / 55,
  isolated: 1 / 140,
  // 有風險的直連常常一次很多條(蜘蛛網),光點要稀
  risk: 1 / 320,
  slow: 0,
  dead: 0,
  attack: 0,
}

// 過載:衝一段、卡住、再衝(keyPoints = 走到路徑的哪裡,keyTimes = 什麼時候),看起來像傳輸不穩
const STUTTER = { keyPoints: "0;0.3;0.33;0.62;0.65;1", keyTimes: "0;0.18;0.42;0.56;0.8;1" }

// slow:光點走完全程佔一輪的 75%,抵達後消失;同一輪裡終點的轉圈在光點抵達前顯示、抵達後換成打勾。
// 轉圈與光點在同一個 SVG 時間軸、同樣的 dur,所以永遠同步
const ARRIVE = 0.75
const BEFORE = `0;${ARRIVE - 0.01};${ARRIVE};1`

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
  const dur = SPEED[state] ? len / SPEED[state] : 0
  // 手機上光點較大、數量減半,畫面不會太擠,每格要繪製的東西也少一半
  const count = DENSITY[state] ? Math.max(2, Math.round(len * DENSITY[state] * (isCompact() ? 0.5 : 1))) : 0
  const lw = lineScale()
  const dr = dotScale()
  const href = `#${id}`
  const dashed = state === "risk" || state === "dead"
  return (
    <g ref={gRef}>
      <g className={`transition-opacity duration-300 ${faded ? "opacity-20" : state === "dead" ? "opacity-60" : "opacity-100"}`}>
        <path
          id={id}
          className="transition-[stroke-width] duration-300"
          style={{ stroke: highlight ? DOT[state] : LINE[state], strokeWidth: (state === "overload" || state === "attack" ? 1.6 : 1.3) * lw * (highlight ? 2 : 1) }}
          // 有風險、廢棄的連線畫成虛線
          strokeDasharray={dashed ? `${8 * lw} ${6 * lw}` : undefined}
          fill="none"
        />
        {Array.from({ length: count }, (_, i) => (
          // 光點不加 drop-shadow:幾十顆同時移動時每格都要重繪陰影,是捲動卡頓的主因;改用略大的實心點
          <circle key={`${state}-${i}`} r={(state === "overload" ? 3.3 : 3.7) * dr} style={{ fill: DOT[state] }}>
            <animateMotion
              dur={`${dur.toFixed(2)}s`}
              begin={`${(-(i * dur) / count).toFixed(2)}s`}
              repeatCount="indefinite"
              {...(state === "overload" ? { calcMode: "linear", ...STUTTER } : {})}
            >
              <mpath href={href} />
            </animateMotion>
          </circle>
        ))}

        {state === "slow" && (
          <>
            <circle r={3.7 * dr} style={{ fill: DOT.slow }}>
              <animateMotion dur={`${dur.toFixed(2)}s`} repeatCount="indefinite" calcMode="linear" keyPoints="0;1;1" keyTimes={`0;${ARRIVE};1`}>
                <mpath href={href} />
              </animateMotion>
              <animate attributeName="opacity" values="1;1;0;0" keyTimes={BEFORE} dur={`${dur.toFixed(2)}s`} repeatCount="indefinite" />
            </circle>
            {/* 終點(工作站旁):等待中轉圈,資料抵達時換成打勾 */}
            <g>
              <animateMotion dur={`${dur.toFixed(2)}s`} repeatCount="indefinite" calcMode="linear" keyPoints="1;1" keyTimes="0;1">
                <mpath href={href} />
              </animateMotion>
              <g transform={`translate(0 ${-26 * dr})`}>
                <g>
                  <animate attributeName="opacity" values="1;1;0;0" keyTimes={BEFORE} dur={`${dur.toFixed(2)}s`} repeatCount="indefinite" />
                  <circle r={9 * dr} fill="none" style={{ stroke: "var(--iso-ring-track)" }} strokeWidth={2.5 * dr} />
                  <circle r={9 * dr} fill="none" style={{ stroke: "var(--dot-overload)" }} strokeWidth={2.5 * dr} strokeLinecap="round" strokeDasharray={`${18 * dr} ${40 * dr}`}>
                    <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.9s" repeatCount="indefinite" />
                  </circle>
                </g>
                <path
                  d={`M ${-5 * dr} 0 L ${-1 * dr} ${4 * dr} L ${6 * dr} ${-4 * dr}`}
                  fill="none"
                  style={{ stroke: "hsl(var(--ok))" }}
                  strokeWidth={2.8 * dr}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0}
                >
                  <animate attributeName="opacity" values="0;0;1;1" keyTimes={BEFORE} dur={`${dur.toFixed(2)}s`} repeatCount="indefinite" />
                </path>
              </g>
            </g>
          </>
        )}

        {state === "attack" && (
          // 破壞性指令:紅色 DELETE 封包衝向資料庫,抵達後消失,停一下再來一次
          <g>
            <animateMotion dur={`${(dur + 1.2).toFixed(2)}s`} repeatCount="indefinite" calcMode="linear" keyPoints="0;1;1" keyTimes={`0;${(dur / (dur + 1.2)).toFixed(3)};1`}>
              <mpath href={href} />
            </animateMotion>
            <animate attributeName="opacity" values="1;1;0;0" keyTimes={`0;${(dur / (dur + 1.2) - 0.01).toFixed(3)};${(dur / (dur + 1.2)).toFixed(3)};1`} dur={`${(dur + 1.2).toFixed(2)}s`} repeatCount="indefinite" />
            <rect x={-34 * dr} y={-11 * dr} width={68 * dr} height={22 * dr} rx={11 * dr} style={{ fill: "var(--dot-overload)" }} />
            <text textAnchor="middle" dominantBaseline="central" fontSize={12 * dr} fontWeight={700} fontFamily="ui-monospace, monospace" fill="#fff">
              DELETE
            </text>
          </g>
        )}
      </g>
    </g>
  )
}
