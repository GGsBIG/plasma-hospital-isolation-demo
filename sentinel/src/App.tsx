import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ArrowLeftRight, Maximize2 } from "lucide-react"
import { useDemo } from "@/demo/engine"
import {
  AuditPage, CRUMBS, DashboardPage, DiscoveryPage, EventsPage, Header, NetpolNewPage, PoliciesPage, PolicyNewPage,
  QuarantinePage, Sidebar, SlackToast, TopologyPage, VapNewPage, VulnsPage,
} from "@/app/Pages"
import { Cursor, ChapterBar, Spotlight, DoneCard, InfoCard } from "@/demo/Overlay"
import { STEPS } from "@/sc/steps"
import { Scenario } from "@/scn/Scenario"
import type { DemoState } from "@/demo/store"
import logo from "@/assets/brobridge-logo.png"

// Sentinel 畫面以固定大小繪製,再等比縮放放進主畫面或右下角的小畫面
const FRAME_W = 1280
const FRAME_H = 800

function SentinelApp({ s }: { s: DemoState }) {
  const page =
    s.page === "discovery" ? <DiscoveryPage />
    : s.page === "policy-new" ? <PolicyNewPage s={s} />
    : s.page === "policies" ? <PoliciesPage s={s} />
    : s.page === "events" ? <EventsPage s={s} />
    : s.page === "quarantine" ? <QuarantinePage />
    : s.page === "topology" ? <TopologyPage s={s} />
    : s.page === "netpol-new" ? <NetpolNewPage s={s} />
    : s.page === "vulns" ? <VulnsPage s={s} />
    : s.page === "vap-new" ? <VapNewPage s={s} />
    : s.page === "audit" ? <AuditPage s={s} />
    : <DashboardPage s={s} />
  return (
    <div className="sentinel-ui relative flex h-full w-full">
      <Sidebar page={s.page} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header crumbs={CRUMBS[s.page]} mode={s.mode} />
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{page}</div>
        {s.slack && <SlackToast />}
      </div>
    </div>
  )
}

/** Sentinel 畫面框:固定大小,依所在窗格等比縮放置中 */
function AppFrame({ s }: { s: DemoState }) {
  const ref = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  // 縮放倍率直接寫進 DOM,不經過 React:對調畫面時窗格大小每格都在變,每格重畫整個 Sentinel 畫面手機會卡
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      if (frameRef.current) frameRef.current.style.transform = `translate(-50%, -50%) scale(${Math.min(el.clientWidth / FRAME_W, el.clientHeight / FRAME_H)})`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-[#f4f4f5]">
      <div
        ref={frameRef}
        data-plasma-frame
        className="absolute left-1/2 top-1/2 overflow-hidden bg-background text-foreground shadow-[0_0_0_1px_rgb(0_0_0/0.08)]"
        style={{ width: FRAME_W, height: FRAME_H, transformOrigin: "50% 50%" }}
      >
        <SentinelApp s={s} />
        <Spotlight s={s} />
        <Cursor s={s} />
      </div>
    </div>
  )
}

export function App({ start = 0, back = "#/" }: { start?: number; back?: string }) {
  const { s, cur, paused, play, togglePause } = useDemo(start)
  // 主畫面:"app" = Sentinel 操作在大畫面、情境圖在右下角;"scn" 反過來
  const [main, setMain] = useState<"app" | "scn">("app")
  const swap = () => setMain((m) => (m === "app" ? "scn" : "app"))
  // 每個情境開始時,換成這個情境預設的主畫面(之後一樣可以自己對調)
  useEffect(() => { setMain(STEPS[cur].main) }, [cur])
  // 第一個情境(現況)只看情境圖,右下角小畫面先不出現
  const solo = cur === 0
  const pane = (which: "app" | "scn") => (main === which ? "sc-pane main" : `sc-pane pip${solo ? " off" : ""}`)
  const label = (which: "app" | "scn") => (which === "app" ? "Sentinel" : "情境圖")

  return (
    <div className="sc-app">
      <header className="sc-top">
        <a href="../#sentinel" target="_top" aria-label="回到 Demo 首頁"><img src={logo} alt="Brobridge" className="h-4 w-auto md:h-[18px]" /></a>
        <span className="flex-1" />
        <a className="sc-swap" href={back}>回到圖解</a>
        {!solo && <button className="sc-swap" onClick={swap} aria-label={`主畫面改看${label(main === "app" ? "scn" : "app")}`}>
          <ArrowLeftRight className="h-4 w-4" />
          對調畫面
        </button>}
      </header>

      <main className={`sc-stage-area ${main === "scn" ? "scn-main" : ""} ${solo ? "solo" : ""}`}>
        <section className={pane("app")} aria-label={label("app")}>
          <AppFrame s={s} />
          {main !== "app" && <PipCover text={label("app")} onClick={swap} />}
        </section>
        <section className={pane("scn")} aria-label={label("scn")}>
          <Scenario step={s.scn} epoch={s.epoch} isMain={main === "scn"} />
          {main !== "scn" && <PipCover text={label("scn")} onClick={swap} />}
        </section>
        {/* Sentinel 操作放大時,左下角列出這個情境要解決的痛點 */}
        {main === "app" && cur > 0 && (
          <div key={cur} className="pain-card" aria-label="痛點">
            <p>痛點</p>
            <ul>{STEPS[cur].pains.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        )}
        <InfoCard s={s} />
        <DoneCard s={s} onReplay={() => play(cur)} onNext={() => play(cur + 1)} />
      </main>

      <ChapterBar cur={cur} paused={paused} done={s.done} onPlay={play} onToggle={togglePause} />
    </div>
  )
}

/** 右下角小畫面:整塊可點,點了就和主畫面對調 */
function PipCover({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button className="sc-pip-cover" onClick={onClick} aria-label={`把${text}放到主畫面`}>
      <span className="sc-pip-tag"><Maximize2 className="h-3.5 w-3.5" />{text}</span>
    </button>
  )
}
