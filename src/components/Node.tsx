import { Fragment } from "react"
import { Siren, Timer } from "lucide-react"
import type { Callout, NodeDef } from "../types"
import { useTick } from "../ticker"
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
  node, elRef, compact, hot, badge, stat, callout, down = false, stack = false, hovered, faded, onHover,
}: {
  node: NodeDef
  elRef: (el: HTMLDivElement | null) => void
  compact: boolean
  hot: boolean
  badge?: Badge
  stat?: string
  callout?: Callout
  down?: boolean
  stack?: boolean
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
    ? { name: "text-[42px]", badge: "text-[30px] px-3.5 py-1", meta: "text-[28px]", logo: "h-[100px]", brand: "h-[62px] w-[62px]", bubble: "text-[28px] px-5 py-3 rounded-[24px]" }
    : { name: "text-[30px]", badge: "text-[22px] px-3 py-1", meta: "text-[22px]", logo: "h-[64px]", brand: "h-[42px] w-[42px]", bubble: "text-[22px] px-4 py-2.5 rounded-2xl" }

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
          {/* live:徽章為正常(綠)時,戰情室的長條才跳動 */}
          <Platform kind={node.kind} hot={hot} variant={node.icon} down={down} live={badge?.tone === "ok"} />
        </div>

        {callout?.seq && <SeqBubble callout={callout} nodeId={node.id} a={a} compact={compact} bubble={s.bubble} />}

        {/* 小卡:預設在平台上方、靠右對齊節點右緣(左邊常是 Plasma,不往那邊擋);side=left 時在節點左側、上下置中 */}
        {callout && !callout.seq && (
          <div
            key={`${callout.tone}-${callout.q}-${callout.a}`}
            className={`callout-in absolute whitespace-nowrap border bg-card leading-snug ${s.bubble} ${compact && callout.rows ? "!text-[40px]" : ""}
              ${callout.tone === "ok" ? "border-ok/40" : callout.tone === "idle" ? "border-border" : "border-danger/40"} ${callout.side === "left" ? "-translate-y-1/2" : ""}`}
            // 手機版往右多推一點(仍在節點外框內),不碰到左邊疊在 Plasma 上的知識庫
            style={
              callout.side === "left" ? { right: a + 70 * NODE_SCALE, top: 0 }
              : callout.side === "bottom" ? { right: -a, top: a / 2 + t + (compact ? 150 : 70) }
              : { right: compact ? -a - 40 : -a, bottom: a / 2 + 56 * NODE_SCALE }
            }
          >
            {callout.time !== undefined ? (
              <StepCard text={callout.q} time={callout.time} tone={callout.tone} compact={compact} />
            ) : callout.rows ? (
              // 警報卡:標題 + 表格(手機版字太小,改顯示一句重點)
              <>
                <div className="flex items-center gap-2 font-semibold text-danger">
                  <Siren className={compact ? "h-8 w-8" : "h-5 w-5"} />
                  {callout.q}
                </div>
                {compact ? (
                  <div className="mt-1 text-foreground">{callout.brief}</div>
                ) : (
                  <div className="mt-2 grid grid-cols-[auto_auto_auto] gap-x-5 gap-y-1">
                    {callout.rows.map((row, r) =>
                      row.map((cell, c) => (
                        <span
                          key={`${r}-${c}`}
                          className={r === 0 ? "text-[0.85em] text-muted-foreground" : c === 1 ? "font-medium text-foreground" : "text-muted-foreground"}
                        >
                          {cell}
                        </span>
                      )),
                    )}
                  </div>
                )}
              </>
            ) : callout.code ? (
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

        {/* 標籤跟著稍微上移;沒有名稱也沒有徽章的節點(匯出檔)不顯示標籤 */}
        <div
          hidden={!node.label && !badge}
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
            <div className={`flex items-center gap-2.5 ${side ? "flex-col items-start" : node.logo || compact || stack ? "flex-col" : ""}`}>
              {node.logo ? (
                // max-w-none:Tailwind 預設 img max-width:100%,會讓 logo 被下方較短的文字列壓窄,各情境大小不一
                <>
                  <img src={node.logo.light} alt={node.label} className={`${s.logo} w-auto max-w-none dark:hidden`} />
                  <img src={node.logo.dark} alt={node.label} className={`hidden ${s.logo} w-auto max-w-none dark:block`} />
                </>
              ) : (
                <span className={`${s.name} inline-flex items-center gap-2.5 font-medium tracking-tight text-foreground`}>
                  {node.brand && <img src={node.brand} alt="" className={`${s.brand} shrink-0`} />}
                  {node.label}
                </span>
              )}
              {badge && (
                <span
                  className={`inline-flex items-center gap-2 rounded-full border bg-card ${s.badge} text-foreground/90 transition-[border-color,box-shadow] duration-300
                    ${hovered ? "border-foreground/30" : "border-border"}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${DOT[badge.tone]} ${badge.tone === "danger" ? "animate-pulse" : ""}`} />
                  {badge.text}
                  {badge.load !== undefined && <span data-load className="tabular-nums">{badge.load}%</span>}
                </span>
              )}
            </div>
            {node.sub && !compact && <span className={`mt-0.5 ${s.meta} text-muted-foreground`}>{node.sub}</span>}
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

// 對話輪播:依共用節拍輪流顯示每一步,輪到這個節點說話時才出現泡泡;下方一行是累計花費的時間
function SeqBubble({ callout, nodeId, a, compact, bubble }: { callout: Callout; nodeId: string; a: number; compact: boolean; bubble: string }) {
  const tick = useTick()
  const seq = callout.seq!
  const step = seq[tick % seq.length]
  if (step.who !== nodeId) return null
  const color = step.tone === "danger" ? "text-danger border-danger/40" : step.tone === "ok" ? "text-ok border-ok/40" : "text-foreground border-border"
  return (
    <div
      key={tick}
      className={`callout-in absolute whitespace-nowrap border bg-card leading-snug ${bubble} ${color}`}
      // 靠右對齊節點右緣:最右邊的節點(AI 部門)泡泡才不會超出畫面
      style={{ right: -a, bottom: a / 2 + 56 * NODE_SCALE }}
    >
      <StepCard text={step.text} time={step.time} compact={compact} />
    </div>
  )
}

// 一步的內容:在做什麼 + 累計時間(對話輪播與分幕步驟卡共用)
function StepCard({ text, time, tone, compact }: { text: string; time: string; tone?: Callout["tone"]; compact: boolean }) {
  return (
    <>
      <div className={`font-medium ${tone === "danger" ? "text-danger" : tone === "ok" ? "text-ok" : ""}`}>{text}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[0.85em] text-muted-foreground">
        <Timer className={compact ? "h-7 w-7" : "h-4 w-4"} />
        {time}
      </div>
    </>
  )
}
