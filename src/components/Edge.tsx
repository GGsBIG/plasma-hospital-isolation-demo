import { useEffect, useRef } from "react"
import type { EdgeDef } from "../types"
import { dotScale, lineScale } from "../layout"

const LINE: Record<EdgeDef["state"], string> = {
  normal: "var(--edge-normal)",
  overload: "var(--edge-overload)",
  isolated: "var(--edge-isolated)",
  risk: "var(--edge-overload)",
  slow: "var(--edge-normal)",
  dead: "var(--edge-normal)",
  attack: "var(--dot-overload)",
  raw: "var(--edge-isolated)",
}

const DOT: Record<EdgeDef["state"], string> = {
  normal: "var(--dot-normal)",
  overload: "var(--dot-overload)",
  isolated: "var(--dot-isolated)",
  risk: "var(--dot-overload)",
  slow: "var(--dot-normal)",
  dead: "var(--edge-normal)",
  attack: "var(--dot-overload)",
  raw: "var(--dot-isolated)",
}

// 連線(靜態 SVG 路徑)。沿線流動的光點、slow 的轉圈與打勾都畫在 Stage 的 canvas 上(見 dots.ts),
// 這裡只剩線本身、逐步畫出的遮罩,以及攻擊封包。
// 形狀 d 與透明度每格由 Stage 直接寫進 DOM(gRef),這裡不帶,捲動時不重繪;
// highlight / faded 是滑鼠停在節點上時的強調,用 CSS transition
export function Edge({ id, reveal, gRef, state, highlight, faded }: {
  id: string
  reveal: boolean
  gRef: (el: SVGGElement | null) => void
  state: EdgeDef["state"]
  highlight: boolean
  faded: boolean
}) {
  const lw = lineScale()
  const dr = dotScale()
  const href = `#${id}`
  const dashed = state === "risk" || state === "dead"
  return (
    // reveal:整組套上遮罩,遮罩是一條沿同一路徑、模糊柔邊的粗線,由 Stage 控制它從起點畫到終點
    <g ref={gRef} className={reveal ? "edge-reveal" : undefined} mask={reveal ? `url(#${id}-mask)` : undefined}>
      {reveal && (
        <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x={-4000} y={-4000} width={12000} height={12000}>
          <path
            data-reveal
            fill="none"
            stroke="#fff"
            strokeWidth={40 * lw}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1}
            filter="url(#reveal-soft)"
          />
        </mask>
      )}
      <g className={`transition-opacity duration-300 ${faded ? "opacity-20" : state === "dead" ? "opacity-60" : "opacity-100"}`}>
        <path
          id={id}
          className="transition-[stroke-width] duration-300"
          style={{ stroke: highlight ? DOT[state] : LINE[state], strokeWidth: (state === "overload" || state === "attack" ? 1.6 : 1.3) * lw * (highlight ? 2 : 1) }}
          // 有風險、廢棄的連線畫成虛線
          strokeDasharray={dashed ? `${8 * lw} ${6 * lw}` : undefined}
          fill="none"
        />
        {state === "attack" && <AttackPacket href={href} dr={dr} />}
      </g>
    </g>
  )
}

// 破壞性指令:紅色 DELETE 封包衝向資料庫一次,抵達後消失。
// 每一輪由 Stage 重新掛上;begin="indefinite" + 掛上時 beginElement,動畫才會從頭播(否則會接續文件時間軸、從中途開始)
const ATTACK_DUR = 1.1

function AttackPacket({ href, dr }: { href: string; dr: number }) {
  const ref = useRef<SVGGElement>(null)
  useEffect(() => {
    ref.current?.querySelectorAll<SVGAnimationElement>("animateMotion, animate").forEach((a) => a.beginElement())
  }, [])
  return (
    <g ref={ref} opacity={0}>
      <animateMotion begin="indefinite" dur={`${ATTACK_DUR}s`} fill="freeze" calcMode="linear" keyPoints="0;1" keyTimes="0;1">
        <mpath href={href} />
      </animateMotion>
      <animate attributeName="opacity" begin="indefinite" dur={`${ATTACK_DUR}s`} fill="freeze" values="1;1;0" keyTimes="0;0.92;1" />
      <rect x={-34 * dr} y={-11 * dr} width={68 * dr} height={22 * dr} rx={11 * dr} style={{ fill: "var(--dot-overload)" }} />
      <text textAnchor="middle" dominantBaseline="central" fontSize={12 * dr} fontWeight={700} fontFamily="ui-monospace, monospace" fill="#fff">
        DELETE
      </text>
    </g>
  )
}
