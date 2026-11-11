import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { SCENES, validateScenes } from "./scenes"
import { agentReveal, AGENT_REVEAL_AT } from "./agentReveal"
import { agentAt, CHAT_SPAN, clamp01, clampProgress, END, LAST, RECAP_AT, RECAP_INDEX, recapAt } from "./timeline"
import { Recap } from "./components/Recap"
import { quantize, scrollStore, useScrollEffect, useScrollSelector } from "./scroll"
import { layoutMode, useLayoutMode } from "./layout"
import { Stepper } from "./components/Stepper"
import { AutoplayButton } from "./components/AutoplayButton"
import { autoplay, useAutoplay } from "./autoplay"
import { cycleMs } from "./phase"
import { uploadGate } from "./upload"
import { Stage } from "./components/Stage"
import { NarrationPanel } from "./components/NarrationPanel"
import { AgentChat } from "./components/AgentChat"
import { ThemeToggle } from "./components/ThemeToggle"
import { PlasmaToggle } from "./components/PlasmaToggle"
import { plasmaOff, plasmaOn, setPlasma } from "./plasma"
import { replay, restartEffects } from "./entry"
import { ReplayButton } from "./components/ReplayButton"
import logo from "./assets/brobridge-logo.png"
import logoDark from "./assets/brobridge-logo-dark.png"

validateScenes() // 載入即檢查情境資料完整性

const AGENT_W = 380
// 最後一頁切到「導入 Plasma 後」時,自動捲完對話所需的秒數(使用者一滾動就交還手動控制)
const CHAT_PLAY = 9
// 等 Agent 面板滑出後再開始播;最後一頁有文件上傳與大腦長出時,等大腦長好再播
// 最後一頁有上傳關卡:對話從按下 Upload 起算,等文件飛完、大腦長好再播
const GATED = !!SCENES[LAST].plasma?.upload
const CHAT_DELAY = GATED ? AGENT_REVEAL_AT + 1000 : 600
// 自動播放時,上傳視窗出現後等多久自動按 Upload
const AUTO_UPLOAD = 2500

// 自動播放每段停多久(毫秒):開場頁、導入後、最後一頁導入後(等大腦長好 + 對話播完 + 看一下結果)
const AUTO_INTRO = 7000
const AUTO_AFTER = 7000
const AUTO_LAST = CHAT_DELAY + CHAT_PLAY * 1000 + 4000
// 導入前:有分幕的頁等一整輪播完;有對話輪播的頁等所有泡泡輪完(每 1.8 秒一格,見 ticker.ts);其餘 6 秒
const TICK_MS = 1800
function beforeMs(i: number) {
  const seq = Object.values(SCENES[i].callouts ?? {}).find((c) => c.seq)?.seq
  return Math.max(6000, cycleMs(i) + 600, seq ? seq.length * TICK_MS + 600 : 0)
}


// 情境 6 的 Agent 對話:面板在情境 5→6 過場中滑出並擠窄舞台(舞台整體縮小左移,不會被擋住);
// 抵達情境 6 後,再往下捲 CHAT_SPAN 段距離,對話才逐步播放完。
// 自己訂閱捲動,只在這兩段重繪,其他時候不影響整頁
// 桌機版面但視窗寬度不足 1400 時,舞台旁邊放不下 380px 的面板(否則舞台會被擠到太小)
const narrowDesktop = window.matchMedia("(max-width: 1399px)")
// 面板滑出程度:過場進度 × 上傳關卡的延後滑出(已經捲進對話段落就直接全開)
const openAt = (p: number) => agentAt(p) * (p > LAST + 0.01 ? 1 : agentReveal())

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
  const visible = useScrollSelector((p) => openAt(p) > 0)
  const chat = useScrollSelector((p) => quantize(clamp01((p - LAST) / CHAT_SPAN), 0.004))
  const ref = useRef<HTMLDivElement>(null)
  useScrollEffect((p) => {
    const el = ref.current
    if (!el) return
    const open = openAt(p)
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

// 頂部進度條:一頁一段,目前這頁(含)以前填滿,過場中跟著捲動漸進;每頁完整抵達處留一道細縫當刻度。
// 每一段都可以點(手機沒有底部切換列,靠它直接跳頁)。填滿長度每格直接寫進 DOM(transform),不觸發重繪
// 最後多一段是結尾總覽
const SEGMENTS = LAST + 2
const progressFill = (p: number) => (clampProgress(p) + 1 + recapAt(p)) / SEGMENTS

function ProgressBar({ onSelect }: { onSelect: (i: number) => void }) {
  const fill = useRef<HTMLDivElement>(null)
  const current = useScrollSelector((p) => (recapAt(p) >= 0.5 ? RECAP_INDEX : Math.round(clampProgress(p))))
  useScrollEffect((p) => {
    if (fill.current) fill.current.style.transform = `scaleX(${progressFill(p)})`
  }, [])
  return (
    // 標題列正下方一條與背景同色的窄帶(蓋住往上捲到這裡的說明文字),進度條在帶子中間,離標題列下緣約 10px
    <div className="pointer-events-none absolute inset-x-0 top-full h-[22px] bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[9px] h-[3px] overflow-hidden rounded-full bg-foreground/10"
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
      {/* 點擊區:每段一顆透明按鈕,往上延伸到標題列下緣、往下只到窄帶底,不蓋到下方的切換鈕與重播鈕 */}
      <nav aria-label="頁面" className="pointer-events-auto absolute -top-2 bottom-0 flex" style={{ left: "var(--bar-x)", right: "var(--bar-x)" }}>
        {[...SCENES.map((s) => ({ id: s.id, title: s.title })), { id: "recap", title: "總覽" }].map((s, k) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(k)}
            aria-label={`第 ${k + 1} 頁：${s.title}`}
            aria-current={k === current ? "page" : undefined}
            className="h-full flex-1 cursor-pointer rounded-sm outline-none focus-visible:bg-foreground/10"
          />
        ))}
      </nav>
    </div>
  )
}

export function App() {
  // 捲動進度(整數 = 某情境置中,小數 = 卡在兩情境之間)放在 scrollStore,不是 React state:
  // App 本身只在「目前情境」改變時重繪(標題列的頁碼)
  const current = useScrollSelector((p) => Math.round(clampProgress(p)))
  const recap = useScrollSelector((p) => recapAt(p) >= 0.5)
  // 捲到別頁也一律回到導入前(第一次載入不動)
  const lastPage = useRef(current)
  useEffect(() => {
    if (current === lastPage.current) return
    lastPage.current = current
    plasmaOff()
  }, [current])
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
    // 手機不能手動捲動,碰一下畫面不該打斷對話播放(換頁、切換導入前後本身會停)
    const onTouch = () => {
      if (layoutMode() === "desktop") stopAuto()
    }
    window.addEventListener("wheel", stopAuto, opts)
    window.addEventListener("touchstart", onTouch, opts)
    window.addEventListener("keydown", stopAuto)
    return () => {
      window.removeEventListener("wheel", stopAuto)
      window.removeEventListener("touchstart", onTouch)
      window.removeEventListener("keydown", stopAuto)
    }
  }, [stopAuto])

  // 手機版不用滑動換頁:擋掉手指拖動與滾輪,只能點上方進度條(或說明卡片、自動播放)換頁。
  // 頁面仍保留捲動高度,換頁與最後一頁的對話播放由程式捲動驅動;Agent 對話清單(data-scroll-ok)可自己捲
  useEffect(() => {
    if (mode === "desktop") return
    const block = (e: Event) => {
      if (e.target instanceof Element && e.target.closest("[data-scroll-ok]")) return
      if (e.cancelable) e.preventDefault()
    }
    const opts = { passive: false } as const
    document.documentElement.classList.add("no-swipe")
    window.addEventListener("touchmove", block, opts)
    window.addEventListener("wheel", block, opts)
    return () => {
      document.documentElement.classList.remove("no-swipe")
      window.removeEventListener("touchmove", block)
      window.removeEventListener("wheel", block)
    }
  }, [mode])
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

  // 最後一頁導入後:自動往下捲,讓 Agent 對話一路播完;對話仍由捲動位置驅動,使用者隨時可以用滾輪/觸控接手
  const chatTimer = useRef(0)
  const playChat = useCallback(() => {
    window.clearTimeout(chatTimer.current)
    chatTimer.current = window.setTimeout(() => {
      const h = stepPx()
      const end = (LAST + CHAT_SPAN) * h
      if (!h || !plasmaOn(LAST) || window.scrollY >= end - 1) return
      // 已經捲到一半就只播剩下的部分
      const left = (end - window.scrollY) / (CHAT_SPAN * h)
      autoScroll(end, Math.max(1, CHAT_PLAY * Math.min(1, left)))
    }, CHAT_DELAY)
  }, [stepPx, autoScroll])

  // 切到第 i 頁(切換列、方向鍵、說明卡片):直接切過去,不刷過中間的頁面,
  // 再從頭完整播放那一頁的效果;最後一頁導入後連同 Agent 對話一起從頭播
  const goTo = useCallback((i: number) => {
    const h = stepPx()
    if (!h) return
    stopAuto()
    window.clearTimeout(chatTimer.current)
    // 結尾總覽:捲到最底(總覽整塊蓋上來),不是情境、沒有重播
    if (i >= RECAP_INDEX) {
      window.scrollTo({ top: END * h, behavior: "instant" })
      scrollStore.set(END)
      return
    }
    const target = Math.max(0, Math.min(i, LAST))
    // 換到別頁一律從導入前開始
    if (target !== Math.round(clampProgress(scrollStore.get()))) plasmaOff()
    window.scrollTo({ top: target * h, behavior: "instant" })
    scrollStore.set(target)
    replay(target)
    if (target === LAST && plasmaOn(LAST) && !GATED) playChat()
  }, [stepPx, stopAuto, playChat])

  // 重播目前這一頁(重播鈕、R 鍵):位置不動;在最後一頁的對話中途按,先回到對話開頭再播
  const replayCurrent = useCallback(() => {
    const cur = Math.round(clampProgress(scrollStore.get()))
    if (cur === LAST) return goTo(LAST)
    replay(cur)
  }, [goTo])

  // 切換導入前後:畫面交給導入前後的轉場,同時讓這一頁的分幕、大腦等時間效果從頭開始
  const togglePlasma = useCallback((i: number, on: boolean) => {
    setPlasma(i, on)
    restartEffects(i)
    if (i !== LAST) return
    window.clearTimeout(chatTimer.current)
    // 切回導入前:停在目前位置
    if (!on) return stopAuto()
    // 有上傳關卡時,等使用者按 Upload 才播對話(見下方)
    if (!GATED) playChat()
  }, [stopAuto, playChat])

  // 按下上傳視窗的 Upload:最後一頁導入後,從這時起算播 Agent 對話
  useEffect(() => uploadGate.subscribe(() => {
    if (Math.round(clampProgress(scrollStore.get())) === LAST && plasmaOn(LAST)) playChat()
  }), [playChat])

  // 自動播放:從目前這頁開始,每頁先切回導入前並重播 → 停一段 → 切到導入後 → 停一段 → 下一頁;
  // 最後一頁等文件上傳、大腦長出、Agent 對話播完才停。任何手動操作都會中斷(見下方)
  const playing = useAutoplay()
  useEffect(() => {
    if (!playing) return
    const timers: number[] = []
    let alive = true
    const wait = (ms: number) => new Promise<void>((done) => { timers.push(window.setTimeout(done, ms)) })
    void (async () => {
      for (let i = Math.round(clampProgress(scrollStore.get())); i <= LAST && alive; i++) {
        plasmaOff()
        goTo(i)
        if (!SCENES[i].plasma) {
          await wait(AUTO_INTRO)
          continue
        }
        await wait(beforeMs(i))
        if (!alive) return
        togglePlasma(i, true)
        const gated = !!SCENES[i].plasma?.upload
        if (gated) {
          await wait(AUTO_UPLOAD)
          if (!alive) return
          uploadGate.go()
        }
        // 有上傳的頁:等文件飛完、大腦長好再多看一下;最後一頁等 Agent 對話播完
        await wait(i === LAST ? AUTO_LAST : gated ? AGENT_REVEAL_AT + 4000 : AUTO_AFTER)
      }
      // 全部播完:停在結尾總覽
      if (alive) { goTo(RECAP_INDEX); autoplay.set(false) }
    })()
    // 手動操作(方向鍵、P、R、點切換列／說明卡／切換鈕、滾輪、觸控)中斷自動播放;自動播放鈕本身與空白鍵除外
    const stop = () => autoplay.set(false)
    const onPointer = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest("[data-autoplay]")) stop()
    }
    const onKeyStop = (e: KeyboardEvent) => {
      if (e.key !== " ") stop()
    }
    window.addEventListener("pointerdown", onPointer, true)
    window.addEventListener("keydown", onKeyStop, true)
    window.addEventListener("wheel", stop, { passive: true })
    window.addEventListener("touchstart", stop, { passive: true })
    return () => {
      alive = false
      timers.forEach((t) => window.clearTimeout(t))
      window.removeEventListener("pointerdown", onPointer, true)
      window.removeEventListener("keydown", onKeyStop, true)
      window.removeEventListener("wheel", stop)
      window.removeEventListener("touchstart", stop)
    }
  }, [playing, goTo, togglePlasma])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const raw = scrollStore.get()
      // 空白鍵:開始／暫停自動播放(焦點在按鈕上時讓按鈕自己處理)
      if (e.key === " ") {
        if (e.target instanceof Element && e.target.closest("button, [role='button'], input, textarea")) return
        e.preventDefault()
        autoplay.set(!autoplay.get())
        return
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault()
        const cur = Math.round(clampProgress(raw))
        const onRecap = recapAt(raw) >= 0.5
        // 最後一頁導入後、對話還沒播完:→ 讓對話播完;再按一次到結尾總覽。在總覽按 ← 回到最後一頁
        if (e.key === "ArrowRight" && cur === LAST && plasmaOn(LAST) && raw < RECAP_AT - 0.01 && (!GATED || uploadGate.done())) playChat()
        else if (e.key === "ArrowRight") { if (!onRecap) goTo(cur === LAST ? RECAP_INDEX : cur + 1) }
        else goTo(onRecap ? LAST : cur - 1)
      } else if (recapAt(raw) >= 0.5) {
        // 總覽沒有導入前後切換,也沒有重播
      } else if ((e.key === "p" || e.key === "P") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // P:切換目前這頁導入前後
        const cur = Math.round(clampProgress(raw))
        togglePlasma(cur, !plasmaOn(cur))
      } else if ((e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        replayCurrent()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [goTo, togglePlasma, replayCurrent, playChat])

  return (
    <div className="min-h-full">
      <header
        className="sticky top-0 z-20 flex h-[var(--header-h)] items-center justify-between border-b border-border bg-background px-6 pl:px-3 pp:px-6"
      >
        <ProgressBar onSelect={goTo} />
        <div className="flex items-center gap-4">
          {/* 點 logo 回 Demo 首頁(/demos/#hospital,首頁會停在這個情境);在入口頁的視窗裡開啟時,由入口頁攔下來直接關閉視窗 */}
          <a href="../#hospital" target="_top" aria-label="回到 Plasma Demo 首頁" className="shrink-0">
            <img src={logo} alt="Brobridge" className="h-[22px] w-auto dark:hidden" />
            <img src={logoDark} alt="Brobridge" className="hidden h-[26px] w-auto dark:block" />
          </a>
          <span className="h-5 w-px bg-border cp:hidden" />
          <h1 className="text-[15px] text-foreground/85 cp:hidden">Plasma 醫院資料隔離</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
            {String((recap ? RECAP_INDEX : current) + 1).padStart(2, "0")} / {String(RECAP_INDEX + 1).padStart(2, "0")}
            {/* 操作提示只在桌機顯示(手機不能捲動換頁,靠上方進度條) */}
            <span className={`ml-3 hidden ${mode === "desktop" ? "sm:inline" : ""}`}>{playing ? "自動播放中，按空白鍵暫停" : "捲動或 ← → 換頁，P 切換導入前後，空白鍵自動播放"}</span>
          </span>
          {mode !== "desktop" && <AutoplayButton compact />}
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
          {/* 上一段露出的尾巴:上緣漸層淡出,不會在欄位頂端被硬切成半行字 */}
          <div aria-hidden className="narr-top-fade pointer-events-none absolute inset-x-0 top-0 h-24 pp:h-10" />
        </aside>

        {/* 舞台固定在畫面上,不隨頁面捲動 */}
        {/* 上方留一列給「導入前｜導入 Plasma 後」切換(在進度條遮罩帶下方,不被切到),舞台從切換列下面開始,不會被擋住 */}
        <div className="sticky top-[var(--header-h)] flex h-[var(--stage-h)] min-w-0 flex-1 pt-[92px] pp:order-1 pp:w-full pp:flex-none pp:pb-1.5 pp:pt-[76px] pl:pt-[72px]">
          <div className="relative min-h-0 min-w-0 flex-1">
            <Stage />
          </div>

          <AgentPanel />
          {/* 重播與切換鈕釘在整欄右上角:最後一頁 Agent 面板滑出、舞台變窄時,位置也跟前面各頁一樣 */}
          <div className="absolute right-0 top-0 z-10 flex h-[92px] items-end gap-2 pb-2 pp:h-[76px] pp:pb-1.5 pl:h-[72px] pl:pb-1">
            <ReplayButton onReplay={replayCurrent} />
            <PlasmaToggle onToggle={togglePlasma} />
          </div>
        </div>
      </main>

      {/* 結尾總覽:對話播完後再往下,蓋住說明欄與舞台 */}
      <Recap onSelect={goTo} />

      {/* 底部情境切換列只在桌機出現;手機用捲動切換(也可點說明卡片) */}
      {mode === "desktop" && (
        <footer
          className="sticky bottom-0 z-20 flex h-[var(--footer-h)] items-center justify-center border-t border-border bg-background px-6"
        >
          <div className="flex items-center gap-3">
            <AutoplayButton />
            <Stepper onSelect={goTo} />
          </div>
        </footer>
      )}
    </div>
  )
}
