import { Fragment } from "react"
import type { Callout, NodeDef } from "../types"
import { sizeOf, NODE_SCALE } from "../geometry"
import { Platform } from "./Iso"

export type Tone = "ok" | "warn" | "danger" | "idle"

export interface Badge { tone: Tone; text: string; load?: number }   // load:負載數字,捲動時由 Stage 直接更新

const DOT: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-danger",
  idle: "border border-muted-foreground bg-transparent",
}

// 觸控裝置沒有真正的 hover,點一下會讓 hover 狀態黏住,所以只在有滑鼠的裝置啟用
const CAN_HOVER = window.matchMedia("(hover: hover)").matches

// 滑鼠移入的彈性曲線(略為過衝),讓平台浮起有一點彈跳感
const SPRING = "ease-[cubic-bezier(0.34,1.56,0.64,1)]"

// 位置與透明度每格由 Stage 直接寫進外層 div(elRef),這裡不帶這兩個值,捲動時不重繪;
// hovered / faded 是滑鼠互動,放在內層用 CSS transition,跟捲動驅動的外層互不干擾
export function Node({
  node, elRef, compact, hot, badge, stat, callout, hovered, faded, onHover,
}: {
  node: NodeDef
  elRef: (el: HTMLDivElement | null) => void
  compact: boolean
  hot: boolean
  badge?: Badge
  stat?: string
  callout?: Callout
  hovered: boolean
  faded: boolean
  onHover: (id: string | null) => void
}) {
  const { a, t } = sizeOf(node.kind)
  // 知識庫在 Plasma 正上方,標籤放右側避免擋到往下的連線
  const side = !compact && node.kind === "kb"
  // 服務資料庫的連線從左下進、往右出,標籤放平台上方才不會被線穿過;
  // 手機版知識庫疊在 Plasma 上方,標籤放下面會蓋住 Plasma,也改放上方
  const above = compact ? node.kind === "kb" : node.kind === "serving"
  // 手機緊湊版:連線可能穿過節點下方的標籤,所以標籤加底色蓋住線;
  // 字放大(手機上舞台縮得比較小)、徽章疊在名稱下方、省略副標題
  const s = compact
    ? { name: "text-[42px]", badge: "text-[30px] px-3.5 py-1", meta: "text-[28px]", logo: "h-[100px]", bubble: "text-[28px] px-5 py-3 rounded-[24px]" }
    : { name: "text-[26px]", badge: "text-[20px] px-3 py-1", meta: "text-[20px]", logo: "h-[64px]", bubble: "text-[19px] px-4 py-2.5 rounded-2xl" }

  const labelStyle = side
    ? { left: a + 22, top: -30 }
    : above ? { left: 0, top: -(a / 2 + 40 * NODE_SCALE) } : { left: 0, top: a / 2 + t + 12 }

  return (
    // 位置用 transform(由 Stage 寫入),自己一個圖層:移動與淡入淡出都交給 GPU 合成,不重排版面
    <div ref={elRef} className="absolute left-0 top-0 h-0 w-0 will-change-[transform,opacity]">
      <div
        className={`absolute h-0 w-0 transition-opacity duration-300 motion-reduce:transition-none ${faded ? "opacity-[0.35]" : "opacity-100"}`}
        onMouseEnter={() => CAN_HOVER && onHover(node.id)}
        onMouseLeave={() => CAN_HOVER && onHover(null)}
      >
        {/* 平台:浮起、微放大,底下投出陰影(深色模式為光暈) */}
        <div
          className={`node-platform absolute h-0 w-0 transition-[transform,filter] duration-500 motion-reduce:transition-none ${SPRING}`}
          style={{ transform: hovered ? "translateY(-12px) scale(1.07)" : undefined }}
          data-hovered={hovered || undefined}
        >
          <Platform kind={node.kind} hot={hot} />
        </div>

        {/* 小卡:預設在平台上方、靠右對齊節點右緣(左邊常是 Plasma,不往那邊擋);side=left 時在節點左側、上下置中 */}
        {callout && (
          <div
            key={`${callout.tone}-${callout.q}-${callout.a}`}
            className={`callout-in absolute whitespace-nowrap border bg-card leading-snug shadow-[0_6px_20px_rgb(0_0_0/0.08)] ${s.bubble}
              ${callout.tone === "ok" ? "border-ok/40" : "border-danger/40"} ${callout.side === "left" ? "-translate-y-1/2" : ""}`}
            // 手機版往右多推一點(仍在節點外框內),不碰到左邊疊在 Plasma 上的知識庫
            style={callout.side === "left" ? { right: a + 70 * NODE_SCALE, top: 0 } : { right: compact ? -a - 40 : -a, bottom: a / 2 + 56 * NODE_SCALE }}
          >
            {callout.code ? (
              <>
                <div className="text-muted-foreground">{callout.q}</div>
                <div className="mt-1 grid grid-cols-[auto_auto] gap-x-4">
                  {callout.code.map(([db, sql]) => (
                    <Fragment key={db}>
                      <span className="text-muted-foreground">{db}</span>
                      <code className={`font-mono ${callout.tone === "ok" ? "text-ok" : "text-foreground"}`}>{sql}</code>
                    </Fragment>
                  ))}
                </div>
                {callout.a && <div className={`mt-1 font-medium ${callout.tone === "ok" ? "text-ok" : "text-danger"}`}>{callout.a}</div>}
              </>
            ) : (
              <>
                <div className="text-muted-foreground">問：{callout.q}</div>
                <div className={`font-medium ${callout.tone === "ok" ? "text-ok" : "text-danger"}`}>答：{callout.a}</div>
              </>
            )}
          </div>
        )}

        {/* 標籤跟著稍微上移 */}
        <div
          className={`absolute h-0 w-0 transition-transform duration-500 motion-reduce:transition-none ${SPRING}`}
          style={{ transform: hovered ? "translateY(-4px)" : undefined }}
        >
          <div
            className={`absolute flex flex-col whitespace-nowrap ${
              side ? "items-start" : above ? "-translate-x-1/2 -translate-y-full items-center text-center" : "-translate-x-1/2 items-center text-center"
            } ${compact ? "rounded-2xl bg-background/90 px-2 py-1" : ""}`}
            style={labelStyle}
          >
            {/* 名稱與狀態徽章同一行,節省垂直空間;有 logo 時徽章放在 logo 下方 */}
            <div className={`flex items-center gap-2.5 ${side ? "flex-col items-start" : node.logo || compact ? "flex-col" : ""}`}>
              {node.logo ? (
                // max-w-none:Tailwind 預設 img max-width:100%,會讓 logo 被下方較短的文字列壓窄,各情境大小不一
                <>
                  <img src={node.logo.light} alt={node.label} className={`${s.logo} w-auto max-w-none dark:hidden`} />
                  <img src={node.logo.dark} alt={node.label} className={`hidden ${s.logo} w-auto max-w-none dark:block`} />
                </>
              ) : (
                <span className={`${s.name} font-medium tracking-tight text-foreground`}>{node.label}</span>
              )}
              {badge && (
                <span
                  className={`inline-flex items-center gap-2 rounded-full border bg-card ${s.badge} text-foreground/90 transition-[border-color,box-shadow] duration-300
                    ${hovered ? "border-foreground/30 shadow-[0_4px_14px_rgb(0_0_0/0.10)]" : "border-border"}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${DOT[badge.tone]} ${badge.tone === "danger" ? "animate-pulse" : ""}`} />
                  {badge.text}
                  {badge.load !== undefined && <span data-load className="tabular-nums">{badge.load}%</span>}
                </span>
              )}
            </div>
            {node.sub && !compact && <span className={`mt-0.5 font-mono ${s.meta} text-muted-foreground`}>{node.sub}</span>}
            {/* 說明列只在情境自訂徽章時出現;手機版字大、會撞到旁邊的節點,省略(左側文字已說明) */}
            {stat && !compact && (
              <span className={`mt-1 ${s.meta} tabular-nums text-muted-foreground`}>{stat}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
