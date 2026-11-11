import { Fragment, memo } from "react"
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
interface NodeProps {
  node: NodeDef
  elRef: (el: HTMLDivElement | null) => void
  compact: boolean
  hot: boolean
  badge?: Badge
  stat?: string
  callout?: Callout
  down?: boolean
  stack?: boolean
  merged?: boolean
  hovered: boolean
  faded: boolean
  onHover: (id: string | null) => void
}

export const Node = memo(function Node({
  node, elRef, compact, hot, badge, stat, callout, down = false, stack = false, merged = false, hovered, faded, onHover,
}: NodeProps) {
  const { a, t } = sizeOf(node.kind)
  // 手機版資料庫:logo 放在平台左上角,名稱與負載排同一行(資料庫排成一直列,左右有空間)
  const logoInside = compact && !!node.brand
  // 知識庫在 Plasma 正上方,標籤放右側避免擋到往下的連線
  const side = !compact && node.kind === "kb"
  // 服務資料庫的連線從左下進、往右出,標籤放平台上方才不會被線穿過;
  // 手機版知識庫疊在 Plasma 上方,標籤放下面會蓋住 Plasma,也改放上方
  const above = compact ? node.kind === "kb" : node.kind === "serving"
  // 手機緊湊版:連線可能穿過節點下方的標籤,所以標籤加底色蓋住線;
  // 字放大(手機上舞台縮得比較小)、徽章疊在名稱下方
  const s = compact
    ? { name: "text-[50px]", badge: "text-[36px] px-4 py-1.5", meta: "text-[32px]", brand: "h-[104px] w-[104px]", bubble: "text-[32px] px-5 py-3 rounded-[24px]" }
    : { name: "text-[30px]", badge: "text-[22px] px-3 py-1", meta: "text-[22px]", brand: "h-[44px] w-[44px]", bubble: "text-[22px] px-4 py-2.5 rounded-2xl" }

  const labelStyle = side
    ? { left: a + 22, top: -30 }
    : above ? { left: 0, top: -(a / 2 + 40 * NODE_SCALE) } : { left: 0, top: a / 2 + t + 12 }

  // 名稱列(名稱 + 徽章)、說明列
  const text = (
    <>
      {/* 名稱與狀態徽章同一行,節省垂直空間 */}
      <div className={`flex gap-3 ${side ? "flex-col items-start" : node.logo || (compact && !logoInside) || stack ? `flex-col ${node.brand && !logoInside ? "items-start" : "items-center"}` : "items-center"}`}>
        {/* 有 logo 的節點(Plasma):logo 貼在平台的立方體側面上,名稱列只留徽章 */}
        {!node.logo && <span className={`${s.name} font-medium tracking-tight text-foreground`}>{node.label}</span>}
        {badge && (
          <span
            className={`inline-flex items-center gap-2 rounded-full border bg-card ${s.badge} text-foreground/90 transition-[border-color,box-shadow] duration-300
              ${hovered ? "border-foreground/30" : "border-border"}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${DOT[badge.tone]}`} />
            {badge.text}
            {badge.load !== undefined && <span data-load className="tabular-nums">{badge.load}%</span>}
          </span>
        )}
      </div>
      {/* 說明列只在情境自訂徽章時出現;手機版字大、會撞到旁邊的節點,省略(左側文字已說明) */}
      {stat && !compact && (
        <span className={`mt-1 ${s.meta} tabular-nums text-muted-foreground`}>{stat}</span>
      )}
    </>
  )

  return (
    // 位置用 transform(由 Stage 寫入),自己一個圖層:移動與淡入淡出都交給 GPU 合成,不重排版面
    // 一開始隱藏,由 Stage 依畫面狀態顯示
    <div ref={elRef} className="absolute left-0 top-0 h-0 w-0 will-change-[transform,opacity]" style={{ display: "none" }}>
      <div
        // --ux:手機版舞台橫向拉開時,節點反向縮回去,圖示與文字不變形(見 Stage 的 useFit)
        style={compact ? { transform: "scaleX(var(--ux, 1))" } : undefined}
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
          <Platform kind={node.kind} hot={hot} variant={node.icon} down={down} bare={merged} />
          {/* 手機版:資料庫的品牌 logo 放在平台左上角(左側圓柱的左上方,不擋圓柱),名稱旁就不再放 logo */}
          {logoInside && (
            <img src={node.brand} alt="" className="brand-in absolute h-[76px] w-[124px] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain" style={{ left: -92, top: -86 }} />
          )}
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
          hidden={(!node.label && !badge) || merged}
          className={`absolute h-0 w-0 transition-transform duration-500 motion-reduce:transition-none ${SPRING}`}
          style={{ transform: hovered ? "translateY(-4px)" : undefined }}
        >
          <div
            data-node-text
            className={`absolute flex flex-col whitespace-nowrap ${
              side ? "items-start" : above ? "-translate-x-1/2 -translate-y-full items-center text-center" : "-translate-x-1/2 items-center text-center"
            } ${compact ? "rounded-2xl bg-background/90 px-2 py-1" : ""}`}
            style={labelStyle}
          >
            {/* 資料庫:品牌圖示在左,與右邊文字上下置中(桌機為名稱列一行、手機為名稱 + 徽章兩行) */}
            {node.brand && !logoInside ? (
              <div className="flex items-center gap-3">
                <img src={node.brand} alt="" className={`${s.brand} shrink-0`} />
                <div className="flex flex-col items-start text-left">{text}</div>
              </div>
            ) : (
              text
            )}
          </div>
        </div>
      </div>
    </div>
  )
}, sameNode)

// 只有畫面內容真的改變才重繪(徽章每次都是新物件,比內容;負載數字由 Stage 直接改 DOM,不必重繪)
function sameNode(a: NodeProps, b: NodeProps) {
  for (const k of Object.keys(a) as (keyof NodeProps)[]) {
    if (k === "badge") continue
    if (a[k] !== b[k]) return false
  }
  const x = a.badge
  const y = b.badge
  return x === y || (!!x && !!y && x.tone === y.tone && x.text === y.text && (x.load === undefined) === (y.load === undefined))
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
