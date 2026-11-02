import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { validateScenes } from "./scenes"
import { agentAt, CHAT_SPAN, clamp01, clampProgress, END, LAST, RECAP_AT, RECAP_INDEX, recapAt } from "./timeline"
import { quantize, scrollStore, useScrollEffect, useScrollSelector } from "./scroll"
import { useLayoutMode } from "./layout"
import { Stepper } from "./components/Stepper"
import { Stage } from "./components/Stage"
import { NarrationPanel } from "./components/NarrationPanel"
import { AgentChat } from "./components/AgentChat"
import { ThemeToggle } from "./components/ThemeToggle"
import { PlasmaToggle } from "./components/PlasmaToggle"
import { Recap } from "./components/Recap"
import { plasmaOn, setPlasma } from "./plasma"
import logo from "./assets/brobridge-logo.png"
import logoDark from "./assets/brobridge-logo-dark.png"

validateScenes() // 載入即檢查情境資料完整性

const AGENT_W = 380
// 最後一頁切到「導入 Plasma 後」時,自動捲完對話所需的秒數(使用者一滾動就交還手動控制)
const CHAT_PLAY = 9
const CHAT_DELAY = 600 // 等 Agent 面板滑出後再開始播


// 情境 6 的 Agent 對話:面板在情境 5→6 過場中滑出並擠窄舞台(舞台整體縮小左移,不會被擋住);
// 抵達情境 6 後,再往下捲 CHAT_SPAN 段距離,對話才逐步播放完。
// 自己訂閱捲動,只在這兩段重繪,其他時候不影響整頁
// 桌機版面但視窗寬度不足 1400 時,舞台旁邊放不下 380px 的面板(否則舞台會被擠到太小)
const narrowDesktop = window.matchMedia("(max-width: 1399px)")

function AgentPanel() {
  const mode = useLayoutMode()
  const [narrow, setNarrow] = useState(narrowDesktop.matches)
  useEffect(() => {
    const on = () => setNarrow(narrowDesktop.matches)
    narrowDesktop.addEventListener("change", on)
    return () => narrowDesktop.removeEventListener("change", on)
  }, [])
  // 疊在說明欄上(由左側滑入)而不擠壓舞台:手機橫拿,以及寬度不足的桌機版面
  const overlayLeft = mode === "phone-landscape" || (mode === "desktop" && narrow)
  // 只在「出現/消失」與對話進度跨過一小格時重繪;滑出的位置與寬度每格直接寫進 DOM
  const visible = useScrollSelector((p) => agentAt(p) > 0)
  const chat = useScrollSelector((p) => quantize(clamp01((p - LAST) / CHAT_SPAN), 0.004))
  const ref = useRef<HTMLDivElement>(null)
  useScrollEffect((p) => {
    const el = ref.current
    if (!el) return
    const open = agentAt(p)
    el.style.opacity = `${open}`
    if (mode === "phone-portrait") el.style.transform = `translateY(${(1 - open) * 100}%)`
    else if (overlayLeft) el.style.transform = `translateX(${-(1 - open) * 100}%)`
    else {
      el.style.width = `${(AGENT_W + 20) * open}px`
      el.style.transform = `translateX(${(1 - open) * 30}px)`
    }
  }, [mode, overlayLeft])
  if (!visible) return null
  // 手機:舞台旁沒空間並排,對話框蓋住說明區——直拿從底部滑上來,橫拿從左側滑進來。
  // 用 portal 掛到 body:直拿時舞台與說明區用 order 對調,繪製順序也跟著變,說明區會蓋在面板上
  if (mode !== "desktop" || overlayLeft) {
    const box =
      mode === "phone-portrait"
        ? { className: "fixed inset-x-0 bottom-0 z-10 bg-background px-6 pb-3 pt-2", style: { height: "var(--narr-h)" } }
        : mode === "phone-landscape"
          ? { className: "fixed left-0 z-10 bg-background py-2 pl-3 pr-2", style: { top: "var(--header-h)", width: "calc(var(--narr-w) + 24px)", height: "var(--stage-h)" } }
          : // 剛好蓋住說明欄(main 左內距 24 + 說明欄 300),不蓋到舞台
            { className: "fixed left-0 z-10 bg-background py-3 pl-6 pr-3", style: { top: "var(--header-h)", width: "324px", height: "var(--stage-h)" } }
    return createPortal(
      <div ref={ref} className={box.className} style={box.style}>
        <AgentChat progress={chat} />
      </div>,
      document.body,
    )
  }
  return (
    <div ref={ref} className="shrink-0 overflow-hidden pb-2">
      <div className="ml-5 h-full" style={{ width: AGENT_W }}>
        <AgentChat progress={chat} />
      </div>
    </div>
  )
}

// 頂部進度條:情境之間各一段,再加 Agent 對話播完、結尾總覽各一段,
// 每個情境完整抵達處留一道細縫當刻度,看得出目前在第幾段。
// 填滿長度每格直接寫進 DOM(transform),不觸發重繪
const SEGMENTS = LAST + 2
function progressFill(p: number) {
  const q = Math.max(0, p)
  if (q < LAST) return q / SEGMENTS
  if (q < RECAP_AT) return (LAST + clamp01((q - LAST) / CHAT_SPAN)) / SEGMENTS
  return (LAST + 1 + clamp01(q - RECAP_AT)) / SEGMENTS
}

function ProgressBar() {
  const fill = useRef<HTMLDivElement>(null)
  useScrollEffect((p) => {
    if (fill.current) fill.current.style.transform = `scaleX(${progressFill(p)})`
  }, [])
  return (
    // 標題列正下方一條與背景同色的窄帶(蓋住往上捲到這裡的說明文字),進度條在帶子中間,離標題列下緣約 10px
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-full h-[22px] bg-background">
      <div
        className="absolute top-[9px] h-[3px] overflow-hidden rounded-full bg-foreground/10"
        style={{ left: "var(--bar-x)", right: "var(--bar-x)" }}
      >
        <div ref={fill} className="h-full origin-left rounded-full bg-foreground/80" style={{ transform: "scaleX(0)" }} />
        {Array.from({ length: SEGMENTS - 1 }, (_, k) => (
          <span
            key={k}
            className="absolute top-0 h-full w-[2px] -translate-x-1/2 bg-background"
            style={{ left: `${((k + 1) / SEGMENTS) * 100}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function App() {
  // 捲動進度(整數 = 某情境置中,小數 = 卡在兩情境之間)放在 scrollStore,不是 React state:
  // App 本身只在「目前情境」改變時重繪(標題列的頁碼)
  const current = useScrollSelector((p) => Math.round(clampProgress(p)))
  const recap = useScrollSelector((p) => recapAt(p) >= 0.5)
  // 版面模式只在換版面(例如手機轉向)時改變
  const mode = useLayoutMode()

  const stepRef = useRef<HTMLDivElement>(null)

  // 情境 i 的捲動位置 = i × --scroll-step(由隱藏的量測元素取得 px 值)。
  // 快取起來,只在視窗大小改變時重量:捲動中讀 offsetHeight 會逼瀏覽器當場重算版面
  const step = useRef(0)
  const stepPx = useCallback(() => {
    if (!step.current) step.current = stepRef.current?.offsetHeight ?? 0
    return step.current
  }, [])

  useEffect(() => {
    // 瀏覽器原生捲動(無阻尼):滾多少走多少,可停在任何位置(含過場中途),觸控板慣性照常
    const update = () => {
      const h = stepPx()
      if (h) scrollStore.set(window.scrollY / h)
    }
    const onResize = () => {
      step.current = 0
      update()
    }
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", onResize)
    update()
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", onResize)
    }
  }, [stepPx])

  // 對話自動播放:等速捲到對話播完;使用者一滾動、觸控或按鍵就停,交還手動控制
  const autoRaf = useRef(0)
  const stopAuto = useCallback(() => cancelAnimationFrame(autoRaf.current), [])
  useEffect(() => {
    const opts = { passive: true } as const
    window.addEventListener("wheel", stopAuto, opts)
    window.addEventListener("touchstart", stopAuto, opts)
    window.addEventListener("keydown", stopAuto)
    return () => {
      window.removeEventListener("wheel", stopAuto)
      window.removeEventListener("touchstart", stopAuto)
      window.removeEventListener("keydown", stopAuto)
    }
  }, [stopAuto])
  const autoScroll = useCallback((to: number, seconds: number) => {
    stopAuto()
    const from = window.scrollY
    const start = performance.now()
    const tick = (now: number) => {
      const u = Math.min(1, (now - start) / (seconds * 1000))
      window.scrollTo(0, from + (to - from) * u)
      if (u < 1) autoRaf.current = requestAnimationFrame(tick)
    }
    autoRaf.current = requestAnimationFrame(tick)
  }, [stopAuto])

  // 分頁在背景時暫停所有持續動畫(光點、光暈、閃爍、轉圈),不佔資源
  useEffect(() => {
    const onVisibility = () => {
      const hidden = document.hidden
      document.documentElement.classList.toggle("page-hidden", hidden)
      document.querySelectorAll("svg").forEach((svg) => (hidden ? svg.pauseAnimations() : svg.unpauseAnimations()))
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  // 按鈕與方向鍵:用瀏覽器原生的短平滑捲動到目標情境,過場跟著捲動一路播放
  const goTo = useCallback((i: number) => {
    const h = stepPx()
    if (!h) return
    stopAuto()
    // 最後一個情境之後可以再往下捲到對話播完(RECAP_AT),再往下是結尾總覽(END)
    const target = i === RECAP_INDEX ? END : Math.max(0, Math.min(i, END))
    window.scrollTo({ top: target * h, behavior: "smooth" })
  }, [stepPx, stopAuto])

  // 切換導入前後。最後一頁切到導入後:自動往下捲,讓 Agent 對話一路播完;
  // 對話仍由捲動位置驅動,所以使用者隨時可以用滾輪/觸控接手
  const chatTimer = useRef(0)
  const togglePlasma = useCallback((i: number, on: boolean) => {
    setPlasma(i, on)
    if (i !== LAST) return
    window.clearTimeout(chatTimer.current)
    // 切回導入前:停在目前位置
    if (!on) return stopAuto()
    chatTimer.current = window.setTimeout(() => {
      const h = stepPx()
      const end = (LAST + CHAT_SPAN) * h
      if (!h || !plasmaOn(LAST) || window.scrollY >= end - 1) return
      // 已經捲到一半就只播剩下的部分
      const left = (end - window.scrollY) / (CHAT_SPAN * h)
      autoScroll(end, Math.max(1, CHAT_PLAY * Math.min(1, left)))
    }, CHAT_DELAY)
  }, [stepPx, stopAuto, autoScroll])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const raw = scrollStore.get()
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault()
        const cur = Math.round(clampProgress(raw))
        // 在最後一個情境按 →:導入後先捲到對話播完,再按一次到結尾總覽(導入前沒有對話,直接到總覽);
        // 在總覽按 ←:回到最後一個情境
        if (e.key === "ArrowRight") goTo(cur < LAST ? cur + 1 : plasmaOn(LAST) && raw < RECAP_AT - 0.01 ? RECAP_AT : END)
        else goTo(raw > RECAP_AT + 0.01 ? LAST : cur - 1)
      } else if ((e.key === "p" || e.key === "P") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // P:切換目前這頁導入前後(總覽沒有切換)
        if (raw > RECAP_AT + 0.5) return
        const cur = Math.round(clampProgress(raw))
        togglePlasma(cur, !plasmaOn(cur))
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [goTo, togglePlasma])

  return (
    <div className="min-h-full">
      <header
        className="sticky top-0 z-20 flex h-[var(--header-h)] items-center justify-between border-b border-border bg-background px-5 pl:px-4 pp:px-6"
      >
        <ProgressBar />
        <div className="flex items-center gap-4">
          <img src={logo} alt="Brobridge" className="h-[22px] w-auto dark:hidden" />
          <img src={logoDark} alt="Brobridge" className="hidden h-[26px] w-auto dark:block" />
          <span className="h-5 w-px bg-border cp:hidden" />
          <h1 className="text-[15px] text-foreground/85 cp:hidden">Plasma 醫院資料隔離</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs tabular-nums text-muted-foreground">
            {String(recap ? RECAP_INDEX + 1 : current + 1).padStart(2, "0")} / {String(RECAP_INDEX + 1).padStart(2, "0")}
            <span className="ml-3 hidden sm:inline">捲動或 ← → 換頁，P 切換導入前後</span>
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* 頁面高度只用來提供捲動距離:舞台高 + 每個過場一段 --scroll-step;左右兩欄都固定在畫面上 */}
      <main
        className="relative flex items-start gap-5 px-6 pp:flex-col pp:items-stretch pp:gap-0 pp:px-6 pl:gap-3 pl:px-3"
        style={{ height: `calc(var(--pin-h) + ${END} * var(--scroll-step))` }}
      >
        <div ref={stepRef} aria-hidden className="pointer-events-none invisible absolute h-[var(--scroll-step)] w-0" />

        {/* 情境說明:固定在畫面上,段落列表依捲動進度上移,上下相鄰段落淡淡露出 */}
        {/* 手機:排在舞台下方(order-2),固定在舞台底下的那塊區域 */}
        <aside
          className="sticky top-[var(--header-h)] h-[var(--stage-h)] w-[300px] shrink-0 overflow-hidden border-r border-border pr-6
            pp:order-2 pp:top-[calc(var(--header-h)+var(--stage-h))] pp:h-[var(--narr-h)] pp:w-full pp:border-r-0 pp:border-t pp:pr-0
            pl:w-[var(--narr-w)] pl:pr-3"
        >
          <NarrationPanel onSelect={goTo} />
        </aside>

        {/* 舞台固定在畫面上,不隨頁面捲動 */}
        {/* 上方留一列給「導入前｜導入 Plasma 後」切換(在進度條遮罩帶下方,不被切到),舞台從切換列下面開始,不會被擋住 */}
        <div className="sticky top-[var(--header-h)] flex h-[var(--stage-h)] min-w-0 flex-1 pt-[84px] pp:order-1 pp:w-full pp:flex-none pp:pb-1.5 pp:pt-[66px] pl:pt-[64px]">
          <div className="relative min-h-0 min-w-0 flex-1">
            <Stage />
            <div className="absolute bottom-full right-0 z-10 mb-2 pp:mb-1.5 pl:mb-1">
              <PlasmaToggle onToggle={togglePlasma} />
            </div>
          </div>

          <AgentPanel />
        </div>
      </main>

      <Recap onSelect={goTo} />

      {/* 底部情境切換列只在桌機出現;手機用捲動切換(也可點說明卡片) */}
      {mode === "desktop" && (
        <footer
          className="sticky bottom-0 z-20 flex h-[var(--footer-h)] items-center justify-center border-t border-border bg-background px-6"
        >
          <Stepper onSelect={goTo} />
        </footer>
      )}
    </div>
  )
}
