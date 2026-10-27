import { memo, useLayoutEffect, useRef } from "react"
import { SCENES } from "../scenes"
import type { SceneDef } from "../types"
import { clamp01, clampProgress } from "../timeline"
import { useScrollEffect, useScrollSelector } from "../scroll"
import { isCompact } from "../layout"
import { plasmaMix } from "../plasma"

// 英數連成一個單位(避免單字被拆行),其餘逐字;句讀黏在前一個字上,避免標點落在行首
const tokens = (text: string) => text.match(/(?:[\x21-\x7E]+|.)[，。、；：！？）」』]*/gu) ?? []

// 逐字浮現的柔邊寬度(同時在過渡中的字數)
const SOFT = 6

// 導入前／導入後兩段的小標
const PAIN_LABEL = "導入前"
const FIX_LABEL = "導入 Plasma 後"

// 捲動浮現的文字:標題,然後是開場說明,或「導入前」那段。
// 「導入後」那段同一時間只顯示一種:切換時舊的淡出、新的再逐字浮現(由切換進度驅動,不是捲動)
const texts = (s: SceneDef) => [s.title, ...(s.bullets ?? []), ...(s.pain ? [PAIN_LABEL, s.pain] : [])]

// 每段的字數,用來把 reveal 0~1 換算成「浮現到第幾個字」
const TOTALS = SCENES.map((s) => texts(s).reduce((n, t) => n + tokens(t).length, 0))

// 切換進度 m 0~1:前 30% 舊的那段淡出,之後新的那段逐字浮現;切回來時倒著播
const SWAP = 0.3

// 把一串字的浮現位置從 prev 移到 head:第 k 個字的浮現程度 v 只在 head - SOFT < k < head 之間介於 0~1,
// 所以只有新舊位置之間的字需要改,其餘不動
function paint(spans: HTMLElement[], prev: number | null, head: number, lite: boolean, blur: boolean) {
  const n = spans.length
  const from = prev === null ? 0 : Math.max(0, Math.floor(Math.min(prev, head) - SOFT))
  const to = prev === null ? n - 1 : Math.min(n - 1, Math.ceil(Math.max(prev, head)))
  for (let k = from; k <= to; k++) {
    const v = clamp01((head - k) / SOFT)
    const st = spans[k].style
    st.opacity = `${v}`
    st.transform = lite || v === 1 || v === 0 ? "" : `translateY(${(1 - v) * 6}px)`
    st.filter = blur && v > 0 && v < 1 ? `blur(${(1 - v) * 6}px)` : ""
  }
}
const TITLE_LENS = SCENES.map((s) => tokens(s.title).length)

// 捲動驅動的 text reveal:每個字是一個 .rv span,浮現程度由 NarrationPanel 直接寫進 style,
// 而且每格只改「浮現邊緣」附近約 SOFT 個字(其餘字的狀態沒變),樣式重算量從整段降到幾個字。
// hover:整段是一張可點的卡片(點了捲到該情境);淡化的段落提亮預覽,左側長出強調線,標題往右輕推
const Section = memo(function Section({
  scene, index, isCurrent, cardRef, onSelect,
}: {
  scene: SceneDef
  index: number
  isCurrent: boolean
  cardRef: (el: HTMLDivElement | null) => void
  onSelect: (i: number) => void
}) {
  const title = tokens(scene.title)
  const body = "text-[16px] leading-relaxed text-muted-foreground transition-colors duration-200 hover:text-foreground pl:text-[13.5px] pl:leading-normal pp:text-[16px] pp:leading-relaxed ps:text-[14.5px] ps:leading-normal"
  const label = "mb-1 text-[13px] font-medium pl:mb-0.5 pl:text-[12px] ps:mb-0.5 ps:text-[12px]"
  const word = (text: string, key: number) => (
    <span key={key} className="rv">
      {text}
    </span>
  )

  return (
    // 手機直拿:說明區只放得下一段,文字靠上(緊接在舞台下方),不要上下置中留一大塊空白
    <section className="flex h-[var(--section-h)] flex-col justify-center pp:justify-start pp:pt-4 ps:pt-2">
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-current={isCurrent ? "step" : undefined}
        aria-label={`切換到情境 ${index + 1}：${scene.title}`}
        onClick={() => onSelect(index)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect(index)
          }
        }}
        // --e:捲動決定的亮度,由外部更新;--hover-mix 在 CSS 裡隨 hover 漸變
        className={`narration-card group relative -ml-4 rounded-2xl py-4 pl-4 pr-3 outline-none cp:py-2 pp:mx-0 pp:px-0 pl:ml-0 pl:pl-0 ${isCurrent ? "cursor-default" : "cursor-pointer"}`}
      >
        <span aria-hidden className="narration-accent absolute bottom-5 left-0 top-5 w-[2px] rounded-full bg-foreground" />
        <div className="font-mono text-[15px] tabular-nums text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
          {String(index + 1).padStart(2, "0")}
        </div>
        <h2 className="narration-title mt-2 text-balance text-[26px] font-semibold leading-snug tracking-tight text-foreground cp:mt-1 pl:text-[19px] pp:text-[22px] ps:text-[19px]">
          {title.map(word)}
        </h2>
        <div className="rv-line mt-4 h-px w-12 origin-left bg-foreground/30 cp:mt-2" />
        <div className="mt-4 space-y-3 cp:mt-2 pl:space-y-1.5 pp:space-y-3 ps:space-y-1.5">
          {scene.bullets?.map((b, j) => (
            <p key={j} className={body}>
              {tokens(b).map(word)}
            </p>
          ))}
          {/* 導入前／導入後疊在同一格(高度取較長的那段,切換時版面不跳),同時只顯示一段 */}
          {scene.pain && (
            <div className="grid">
              <div className="pain-block [grid-area:1/1]">
                <div className={`${label} text-danger`}>{tokens(PAIN_LABEL).map(word)}</div>
                <p className={body}>{tokens(scene.pain).map(word)}</p>
              </div>
              {scene.fix && (
                <div className="fix-block [grid-area:1/1]">
                  <div className={`${label} text-ok`}>{tokens(FIX_LABEL).map(word)}</div>
                  <p className={body}>{tokens(scene.fix).map(word)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
})

// 舞台左側的情境說明:六段由上往下排,整串依捲動進度上移,讓目前情境那段停在欄位正中。
// 段落間距(--section-h)與捲動距離(--scroll-step)分開,所以過場可以慢、上下段落仍看得到。
// 每段在捲近中線時逐字浮現,置中時全亮,離開時淡化
export function NarrationPanel({ onSelect }: { onSelect: (i: number) => void }) {
  // 只有「目前是哪個情境」改變時重繪(游標樣式、aria-current)
  const current = useScrollSelector((p) => Math.round(clampProgress(p)))
  const listRef = useRef<HTMLDivElement>(null)
  // 每張卡片:元素、所有字的 span、分隔線,以及上次寫入的浮現位置與亮度(沒變就不寫)
  type Card = {
    el: HTMLDivElement; spans: HTMLElement[]; line: HTMLElement | null; head: number | null; e: string
    pain: HTMLElement | null; fixSpans: HTMLElement[]; fixHead: number | null; m: number
  }
  const cards = useRef<(Card | null)[]>([])
  const setCard = (i: number, el: HTMLDivElement | null) => {
    if (!el) return
    if (cards.current[i]?.el === el) return
    const fix = el.querySelector(".fix-block")
    const all = [...el.querySelectorAll<HTMLElement>(".rv")]
    cards.current[i] = {
      el, spans: all.filter((s) => !fix?.contains(s)), line: el.querySelector(".rv-line"), head: null, e: "",
      pain: el.querySelector(".pain-block"), fixSpans: all.filter((s) => fix?.contains(s)), fixHead: null, m: -1,
    }
  }
  // 欄位高與段高快取,只在尺寸改變時重量(捲動中讀版面尺寸會逼瀏覽器當場重算版面)
  const dims = useRef({ view: 0, section: 0 })
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list?.parentElement) return
    const measure = () => {
      dims.current = { view: list.parentElement!.clientHeight, section: cards.current[0]?.el.parentElement?.offsetHeight ?? 0 }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(list.parentElement)
    return () => ro.disconnect()
  }, [])

  useScrollEffect((raw) => {
    // 最後一個情境之後是 Agent 對話的捲動區段,說明欄停在最後一段
    const p = clampProgress(raw)
    const list = listRef.current
    const { view, section } = dims.current
    if (list && section) {
      // 直接寫 px 的 transform,不用 CSS 變數:變數會繼承到底下每個字,每格都要重算全部樣式
      list.style.transform = `translateY(${view / 2 - (p + 0.5) * section}px)`
    }
    // 減少動態:只淡入;手機:不加模糊(每個模糊字都是一個圖層,合成成本高)
    const lite = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const blur = !lite && !isCompact()
    cards.current.forEach((card, i) => {
      if (!card) return
      // 從前一段過場到一半起開始浮現,接近置中時完整;以 1/4 個字為單位
      const head = Math.round(clamp01((p - (i - 0.75)) / 0.6) * (TOTALS[i] + SOFT) * 4) / 4
      if (head !== card.head) {
        paint(card.spans, card.head, head, lite, blur)
        if (card.line) card.line.style.transform = `scaleX(${clamp01((head - TITLE_LENS[i]) / SOFT)})`
        card.head = head
      }
      // 切換到導入後:導入前那段整段淡出,導入後那段再逐字浮現
      const m = plasmaMix(i)
      if (m !== card.m && card.pain) {
        const out = clamp01(m / SWAP)
        card.pain.style.opacity = `${1 - out}`
        card.pain.style.transform = lite || out === 0 ? "" : `translateY(${-out * 6}px)`
        card.pain.style.visibility = out === 1 ? "hidden" : ""
        const fixHead = Math.round(clamp01((m - SWAP) / (1 - SWAP)) * (card.fixSpans.length + SOFT) * 4) / 4
        if (fixHead !== card.fixHead) {
          paint(card.fixSpans, card.fixHead, fixHead, lite, blur)
          card.fixHead = fixHead
        }
        card.m = m
      }
      const e = (1 - 0.7 * clamp01(Math.abs(p - i))).toFixed(2)
      if (e !== card.e) {
        card.el.style.setProperty("--e", e)
        card.e = e
      }
    })
  }, [])

  return (
    <div ref={listRef} className="will-change-transform">
      {SCENES.map((scene, i) => (
        <Section
          key={scene.id}
          scene={scene}
          index={i}
          isCurrent={i === current}
          cardRef={(el) => setCard(i, el)}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
