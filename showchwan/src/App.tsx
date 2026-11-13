import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ArrowLeftRight, Loader2, Maximize2, Sparkles } from "lucide-react"
import { useDemo } from "@/demo/engine"
import { Sidebar, TopBar, DatabaseListPage } from "@/app/Shell"
import { LoginPage } from "@/app/Login"
import { AddDatabaseDialog, UploadDocDialog } from "@/dialogs/Dialogs"
import { AgentScreen, ColumnsDialog, DbDetailPage, KnowledgePage, NewProductDialog, ProductPage, SqlPage } from "@/app/ScPages"
import { Cursor, ChapterBar, Spotlight, DoneCard, WhyCard } from "@/demo/Overlay"
import { STEPS } from "@/sc/steps"
import { Scenario } from "@/scn/Scenario"
import type { DemoState } from "@/demo/store"
import logo from "@/assets/brobridge-logo.png"

// Plasma 畫面以固定大小繪製,再等比縮放放進主畫面或右下角的小畫面
const FRAME_W = 1280
const FRAME_H = 800

const CRUMBS: Record<DemoState["page"], string[]> = {
  list: ["Data Access"], detail: ["Data Access", "Detail"], dbdetail: ["Data Access", "a_his"], mview: ["Materialized View"], api: ["Data Product"], mcp: ["MCP"],
  workspace: ["Workspace"], knowledge: ["AI", "Knowledge"], product: ["Data Product"], sql: ["SQL Playground"],
}

function PlasmaApp({ s }: { s: DemoState }) {
  const page =
    s.page === "dbdetail" ? <DbDetailPage s={s} />
    : s.page === "knowledge" ? <KnowledgePage s={s} />
    : s.page === "product" ? <ProductPage s={s} />
    : s.page === "sql" ? <SqlPage s={s} />
    : <DatabaseListPage s={s} />
  if (s.screen === "login") return <LoginPage s={s} />
  return (
    <div className="relative h-full w-full flex">
      <Sidebar s={s} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar crumbs={CRUMBS[s.page]} ws={s.ws} />
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{page}</div>
      </div>
      <AddDatabaseDialog s={s} />
      <UploadDocDialog s={s} />
      <NewProductDialog s={s} />
      <ColumnsDialog s={s} />
      {s.screen === "agent" && <AgentScreen s={s} />}
      {s.analyzing && (
        <div className="absolute bottom-8 right-8 z-50 flex items-center gap-2 rounded-lg border bg-background px-4 py-3 shadow-lg">
          <Sparkles className="h-4 w-4 text-sidebar-ring" /><span className="text-sm font-medium">AI 正在分析文件…</span>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

/** Plasma 畫面框:固定大小,依所在窗格等比縮放置中 */
function PlasmaFrame({ s }: { s: DemoState }) {
  const ref = useRef<HTMLDivElement>(null)
  const [k, setK] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setK(Math.min(el.clientWidth / FRAME_W, el.clientHeight / FRAME_H)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-[#f4f4f5]">
      <div
        data-plasma-frame
        className="absolute left-1/2 top-1/2 overflow-hidden bg-background text-foreground shadow-[0_0_0_1px_rgb(0_0_0/0.08)]"
        style={{ width: FRAME_W, height: FRAME_H, transform: `translate(-50%, -50%) scale(${k})`, transformOrigin: "50% 50%" }}
      >
        <PlasmaApp s={s} />
        <Spotlight s={s} />
        <Cursor s={s} />
      </div>
    </div>
  )
}

export function App() {
  const { s, cur, paused, play, togglePause } = useDemo()
  // 主畫面:"plasma" = Plasma 操作在大畫面、情境圖在右下角;"scn" 反過來
  const [main, setMain] = useState<"plasma" | "scn">("plasma")
  const swap = () => setMain((m) => (m === "plasma" ? "scn" : "plasma"))
  // 每個情境開始時,換成這個情境預設的主畫面(之後一樣可以自己對調)
  useEffect(() => { setMain(STEPS[cur].main) }, [cur])
  // 第一個情境(現況)只看情境圖,右下角小畫面先不出現
  const solo = cur === 0
  const pane = (which: "plasma" | "scn") => (main === which ? "sc-pane main" : `sc-pane pip${solo ? " off" : ""}`)
  const label = (which: "plasma" | "scn") => (which === "plasma" ? "Plasma" : "情境圖")

  return (
    <div className="sc-app">
      <header className="sc-top">
        <a href="../#showchwan" target="_top" aria-label="回到 Plasma Demo 首頁"><img src={logo} alt="Brobridge" className="h-[18px] w-auto" /></a>
        <span className="flex-1" />
        {!solo && <button className="sc-swap" onClick={swap} aria-label={`主畫面改看${label(main === "plasma" ? "scn" : "plasma")}`}>
          <ArrowLeftRight className="h-4 w-4" />
          對調畫面
        </button>}
      </header>

      <main className={`sc-stage-area ${main === "scn" ? "scn-main" : ""} ${solo ? "solo" : ""}`}>
        <section className={pane("plasma")} aria-label={label("plasma")}>
          <PlasmaFrame s={s} />
          {main !== "plasma" && <PipCover text={label("plasma")} onClick={swap} />}
        </section>
        <section className={pane("scn")} aria-label={label("scn")}>
          <Scenario step={s.scn} epoch={s.epoch} isMain={main === "scn"} />
          {main !== "scn" && <PipCover text={label("scn")} onClick={swap} />}
        </section>
        {/* Plasma 操作放大時,左下角列出這個情境要解決的痛點 */}
        {main === "plasma" && cur > 0 && (
          <div key={cur} className="pain-card" aria-label="痛點">
            <p>痛點</p>
            <ul>{STEPS[cur].pains.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        )}
        <WhyCard s={s} />
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
