import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { Check, ChevronLeft, ChevronRight, FileText, Pause, Play, X } from "lucide-react"
import { Platform } from "../components/Iso"
import { AgentChat } from "../components/AgentChat"
import { ThemeToggle } from "../components/ThemeToggle"
import { edgePath, sizeOf } from "../geometry"
import { useLayoutMode } from "../layout"
import type { NodeKind, Pos } from "../types"
import logo from "../assets/brobridge-logo.png"
import logoDark from "../assets/brobridge-logo-dark.png"
import oracleLogo from "../assets/db/oracle.svg"
import postgresLogo from "../assets/db/postgresql.svg"
import mssqlLogo from "../assets/db/mssql.svg"
import mysqlLogo from "../assets/db/mysql.svg"
import { BRANCHES, DOCS, PAINS, RESULT_ROWS, ROSTER, STEPS } from "./content"
import "./story.css"

// 三個畫面:0 現在的問題、1 Plasma 解決流程、2 成果一覽;每個畫面有幾步
const SCREENS = ["現在的問題", "Plasma 解決流程", "成果一覽"]
const STEP_COUNT = [PAINS.length, STEPS.length, 1]
// 自動播放:每一步停留的毫秒數(上傳文件、AI 對話兩步動畫較長)
const DWELL = [[4200, 4200, 4200, 4200], [4800, 7000, 12500, 4800, 5600], [9000]]
const AGENT_MS = 10500 // AI 對話動畫播完的時間
const BRAND: Record<string, string> = { a: oracleLogo, b: postgresLogo, c: mssqlLogo, d: mysqlLogo }

type Compact = boolean
// 舞台座標系(桌機橫向、手機直向)
// 手機版的積木會放大(layout.ts 的 iconScale),所以舞台座標系比較大,看板高度跟著比例走
const STAGE = (c: Compact, screen: number) =>
  c ? (screen === 0 ? { w: 900, h: 1100 } : { w: 900, h: 1480 }) : screen === 0 ? { w: 1100, h: 680 } : { w: 1100, h: 560 }

// ---- 節點位置 ----
// 畫面 0 的分院資料庫下方多一行 schema,上下間距拉大;畫面 1 收緊,舞台矮一點、圖可以放大
function dbPos(i: number, c: Compact, screen: number): Pos {
  if (c) return { x: 112 + i * 225, y: 130 }
  return screen === 0 ? { x: 150, y: 100 + i * 160 } : { x: 150, y: 70 + i * 135 }
}
const P = (c: Compact) => ({
  manual: c ? { x: 220, y: 500 } : { x: 560, y: 320 },
  it: c ? { x: 680, y: 500 } : { x: 560, y: 565 },
  hqBefore: c ? { x: 450, y: 820 } : { x: 950, y: 320 },
  plasma: c ? { x: 450, y: 660 } : { x: 500, y: 280 },
  kbDy: c ? 124 : 86, // 知識庫疊在 Plasma 核心立方體頂面
  prod1: c ? { x: 220, y: 1040 } : { x: 820, y: 160 },
  prod2: c ? { x: 680, y: 1040 } : { x: 820, y: 400 },
  hq: c ? { x: 450, y: 1300 } : { x: 1010, y: 280 },
})
// 痛點標記的位置(畫面 0)與說明泡泡放哪一側
const MARK = (c: Compact): { p: Pos; side: "l" | "r" }[] =>
  c
    ? [{ p: { x: 330, y: 400 }, side: "r" }, { p: { x: 40, y: 40 }, side: "r" }, { p: { x: 790, y: 400 }, side: "l" }, { p: { x: 570, y: 720 }, side: "r" }]
    : [{ p: { x: 615, y: 225 }, side: "r" }, { p: { x: 40, y: 340 }, side: "r" }, { p: { x: 615, y: 475 }, side: "r" }, { p: { x: 1005, y: 225 }, side: "l" }]

interface NodeSpec {
  id: string
  kind: NodeKind
  variant?: string
  pos: Pos
  label?: string
  sub?: ReactNode
  tone?: "ok" | "danger" | "idle"
  brand?: string
  dim?: boolean
  grow?: boolean // 知識庫:在 Plasma 上方長出來再疊上去
  bare?: boolean
}
interface EdgeSpec { from: string; to: string; tone: "red" | "ok" }

// 依目前的畫面與步驟,算出舞台上有哪些節點與連線
function scene(screen: number, step: number, c: Compact) {
  const p = P(c)
  const nodes: NodeSpec[] = BRANCHES.map((b, i) => ({
    id: `db-${b.id}`, kind: "db", pos: dbPos(i, c, screen), label: b.label, brand: BRAND[b.id],
    sub: screen === 0 && !c ? <code className="sc-code">{b.schema}</code> : undefined,
  }))
  const edges: EdgeSpec[] = []
  if (screen === 0) {
    nodes.push(
      { id: "manual", kind: "person", variant: "person-clock", pos: p.manual, label: "總院人工彙整", sub: "收集 4 份 Excel", tone: "danger" },
      { id: "it", kind: "person", pos: p.it, label: "各分院 IT", sub: "各寫各的 SQL", tone: "danger" },
      { id: "hq", kind: "app", variant: "receipt", pos: p.hqBefore, label: "總院彙整報表", sub: "人數兜不攏", tone: "danger" },
    )
    BRANCHES.forEach((b) => edges.push({ from: `db-${b.id}`, to: "manual", tone: "red" }))
    edges.push({ from: "manual", to: "hq", tone: "red" }, { from: "it", to: "hq", tone: "red" })
  } else {
    const s = screen === 2 ? 4 : step
    nodes.push({
      id: "plasma", kind: "plasma", pos: p.plasma,
      sub: s >= 1 ? "已讀懂四家欄位" : "唯讀接入 · 各分院工作區", tone: "ok",
    })
    if (s >= 1) nodes.push({ id: "kb", kind: "kb", pos: { x: p.plasma.x, y: p.plasma.y - p.kbDy }, bare: true, grow: s === 1 })
    BRANCHES.forEach((b) => edges.push({ from: `db-${b.id}`, to: "plasma", tone: "ok" }))
    if (s >= 3) {
      nodes.push(
        { id: "prod1", kind: "app", variant: "package", pos: p.prod1, label: "護理人員名冊", sub: "資料產品", tone: "ok" },
        { id: "prod2", kind: "app", variant: "package", pos: p.prod2, label: "護理排班表", sub: "資料產品", tone: "ok" },
      )
      edges.push({ from: "plasma", to: "prod1", tone: "ok" }, { from: "plasma", to: "prod2", tone: "ok" })
    }
    if (s >= 4) {
      nodes.push({ id: "hq", kind: "app", variant: "receipt", pos: p.hq, label: "總院彙整報表", sub: "四家合計 812 人", tone: "ok" })
      edges.push({ from: "prod1", to: "hq", tone: "ok" }, { from: "prod2", to: "hq", tone: "ok" })
    }
  }
  return { nodes, edges }
}

// ---- 舞台:固定座標系,等比縮放放進容器 ----
function useFit(w: number, h: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [k, setK] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setK(Math.min(el.clientWidth / w, el.clientHeight / h)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [w, h])
  return { ref, k }
}

function IsoNode({ n }: { n: NodeSpec }) {
  const { a, t } = sizeOf(n.kind)
  return (
    <div className="sc-node" style={{ left: n.pos.x, top: n.pos.y, opacity: n.dim ? 0.3 : 1 }}>
      <div className={n.grow ? "kb-grow absolute" : "absolute"} style={n.grow ? { animationDelay: "2.3s" } : undefined}>
        <Platform kind={n.kind} variant={n.variant} bare={n.bare} />
      </div>
      {(n.label || n.sub) && (
        <div className="sc-label" style={{ top: a / 2 + t + 6 }}>
          {n.label && (
            <div className="sc-pill flex items-center justify-center gap-[0.35em] font-semibold text-foreground">
              {n.brand && <img src={n.brand} alt="" className="h-[1.15em] w-auto" />}
              {n.label}
            </div>
          )}
          {n.sub && <div className={`sc-pill sc-sub ${n.tone ? `tone-${n.tone}` : ""}`}>{n.sub}</div>}
        </div>
      )}
    </div>
  )
}

function Stage({ screen, step, compact, agent }: { screen: number; step: number; compact: boolean; agent: number }) {
  const S = STAGE(compact, screen)
  const { ref, k } = useFit(S.w, S.h)
  const { nodes, edges } = scene(screen, step, compact)
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const marks = MARK(compact)
  const p = P(compact)
  const showDocs = screen === 1 && step === 1
  const showAgent = screen === 1 && step === 2
  return (
    <div ref={ref} className={`relative h-full w-full ${compact ? "sc-compact" : ""}`}>
      <div className="sc-stage" style={{ width: S.w, height: S.h, transform: `translate(-50%, -50%) scale(${k})` }}>
        <svg className="absolute inset-0 overflow-visible" width={S.w} height={S.h}>
          <defs>
            <radialGradient id="plasma-glow">
              <stop offset="0" style={{ stopColor: "var(--iso-glow)", stopOpacity: "var(--iso-glow-opacity)" }} />
              <stop offset="1" style={{ stopColor: "var(--iso-glow)", stopOpacity: 0 }} />
            </radialGradient>
          </defs>
          {edges.map((e) => {
            const f = byId[e.from]
            const t = byId[e.to]
            const d = edgePath(f.pos, f.kind, t.pos, t.kind, compact)
            return (
              <g key={`${screen}-${e.from}-${e.to}`} className="sc-fade">
                {e.tone === "red" ? (
                  <path d={d} className="sc-edge red" />
                ) : (
                  <>
                    <path d={d} className="sc-edge ok-base" />
                    <path d={d} className="sc-edge ok-flow" />
                  </>
                )}
              </g>
            )
          })}
        </svg>
        {nodes.map((n) => <IsoNode key={n.id + (n.grow ? "-grow" : "")} n={n} />)}

        {/* 畫面 0:痛點編號標在問題發生的位置,目前講到的那個放大並跳出一句說明 */}
        {screen === 0 &&
          marks.map((m, i) => (
            <div key={i} className={`sc-mark ${i === step ? "on" : ""}`} style={{ left: m.p.x, top: m.p.y }}>
              <span className="sc-mark-dot">{i + 1}</span>
              {i === step && !compact && <span className={`sc-bubble ${m.side === "l" ? "left" : ""}`}>{PAINS[i].bubble}</span>}
            </div>
          ))}

        {/* 手機:說明泡泡固定在圖的下方置中,不會蓋到其他標記 */}
        {screen === 0 && compact && (
          <div key={step} className="sc-bubble sc-bubble-c" style={{ left: S.w / 2, top: S.h - 70 }}>
            <b className="mr-2">{step + 1}</b>{PAINS[step].bubble}
          </div>
        )}

        {/* 步驟 2:文件飛進 Plasma */}
        {showDocs &&
          DOCS.map((name, i) => {
            const x0 = compact ? -150 : 250
            const y0 = compact ? -285 + i * 60 : -170 + i * 46
            return (
              <div key={name} className="sc-doc-anchor" style={{ left: p.plasma.x, top: p.plasma.y - p.kbDy }}>
                <div className="sc-doc" style={{ "--x0": `${x0}px`, "--y0": `${y0}px`, animationDelay: `${0.15 * i}s` } as CSSProperties}>
                  <FileText className="h-[1.2em] w-[1.2em] text-muted-foreground" />
                  {name}
                </div>
              </div>
            )
          })}
      </div>

      {/* 步驟 3:AI Agent 對話 */}
      {showAgent && (
        <div className={`sc-agent absolute ${compact ? "inset-x-0 bottom-0 top-[8%]" : "bottom-2 right-2 top-2 w-[400px]"}`}>
          <AgentChat progress={agent} />
        </div>
      )}
    </div>
  )
}

// ---- 右側(手機為下方)說明欄 ----
function PainList({ screen, step, onPick }: { screen: number; step: number; onPick: (i: number) => void }) {
  return (
    <ol className="space-y-2">
      {PAINS.map((p, i) => {
        const solved = screen === 2 || (screen === 1 && step > i)
        const active = screen === 0 && step === i
        const fixing = screen === 1 && step === i
        return (
          <li key={i}>
            <button
              onClick={() => onPick(i)}
              className={`sc-pain w-full text-left ${active ? "active" : ""} ${solved ? "solved" : ""} ${fixing ? "fixing" : ""}`}
            >
              <span className={`sc-num ${solved ? "ok" : ""}`}>{solved ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground">{p.title}</span>
                {screen === 0 ? (
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">{p.desc}</span>
                ) : solved ? (
                  <span className="mt-0.5 block text-[13px] text-ok">由步驟 {i + 1}「{STEPS[i].title}」解決</span>
                ) : (
                  <span className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                    {fixing ? "解決中…" : <><X className="h-3 w-3 text-danger" />尚未解決</>}
                  </span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function StepRail({ step, onPick, compact }: { step: number; onPick: (i: number) => void; compact: boolean }) {
  if (compact) {
    const s = STEPS[step]
    return (
      <div className="sc-step active">
        <div className="text-[12px] text-muted-foreground">步驟 {step + 1} / {STEPS.length}</div>
        <div className="mt-0.5 font-semibold">{s.title}{step < PAINS.length && <span className="sc-solve">解決 {step + 1}</span>}</div>
        <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{s.desc}</div>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-5 gap-2">
      {STEPS.map((s, i) => (
        <button key={i} onClick={() => onPick(i)} className={`sc-step text-left ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}>
          <div className="flex items-center gap-2">
            <span className={`sc-stepnum ${i <= step ? "on" : ""}`}>{i < step ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}</span>
            <span className="font-semibold">{s.title}</span>
          </div>
          <div className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{s.desc}</div>
          {i < PAINS.length && <div className="mt-2"><span className="sc-solve">✓ 解決痛點 {i + 1}</span></div>}
        </button>
      ))}
    </div>
  )
}

function Results({ compact }: { compact: boolean }) {
  const max = Math.max(...ROSTER.map((r) => r.n))
  const total = ROSTER.reduce((a, r) => a + r.n, 0)
  return (
    <div className={`mx-auto grid h-full max-w-[1180px] gap-5 ${compact ? "grid-cols-1 content-start" : "grid-cols-[1.45fr_1fr] content-center"}`}>
      <div className="sc-card">
        <h3 className="mb-3 text-[15px] font-semibold">導入前後對照</h3>
        {compact ? (
          // 手機:三欄太擠,每一項改成上下兩行
          <div className="divide-y divide-border">
            {RESULT_ROWS.map(([k, a, b]) => (
              <div key={k} className="py-3 text-[14px] leading-relaxed">
                <div className="font-semibold">{k}</div>
                <div className="mt-1 flex gap-2"><span className="w-12 shrink-0 text-danger">現在</span><span className="text-muted-foreground">{a}</span></div>
                <div className="flex gap-2"><span className="w-12 shrink-0 text-ok">導入後</span><span className="font-medium">{b}</span></div>
              </div>
            ))}
          </div>
        ) : (
        <div className="sc-table">
          <div className="th" />
          <div className="th text-danger">現在</div>
          <div className="th text-ok">導入 Plasma 後</div>
          {RESULT_ROWS.map(([k, a, b]) => (
            <div key={k} className="contents">
              <div className="td font-medium text-foreground">{k}</div>
              <div className="td text-muted-foreground">{a}</div>
              <div className="td font-medium text-foreground">{b}</div>
            </div>
          ))}
        </div>
        )}
      </div>
      <div className="flex flex-col gap-5">
        <div className="sc-card">
          <h3 className="text-[15px] font-semibold">總院彙整：各分院護理師人數</h3>
          <p className="mb-3 text-[12px] text-muted-foreground">來源：資料產品「護理人員名冊」· 示意數字</p>
          <div className="space-y-2.5">
            {ROSTER.map((r, i) => (
              <div key={r.label} className="flex items-center gap-3 text-[13px]">
                <span className="w-14 shrink-0 text-muted-foreground">{r.label}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                  <div className="sc-bar h-full rounded" style={{ width: `${(r.n / max) * 100}%`, animationDelay: `${0.15 * i}s` }} />
                </div>
                <span className="w-10 text-right font-mono tabular-nums">{r.n}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-[13px] text-muted-foreground">四家分院合計</span>
            <span className="text-2xl font-semibold tabular-nums">{total} <span className="text-sm font-normal text-muted-foreground">人</span></span>
          </div>
        </div>
        <div className="sc-card">
          <h3 className="mb-2 text-[15px] font-semibold">四個痛點都解決了</h3>
          <ul className="space-y-1.5 text-[13px]">
            {PAINS.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="sc-num ok small"><Check className="h-3 w-3" strokeWidth={3} /></span>
                <span className="text-foreground">{p.title}</span>
                <span className="ml-auto text-muted-foreground">步驟 {i + 1}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

const HEAD = [
  { title: "現在遇到的問題", lead: "四家分院資料庫各自獨立、schema 都不同，總院想統計「各分院的護理師有誰」，做不出來。" },
  { title: "Plasma 怎麼解決", lead: "四個步驟，把四家分院的資料整理成總院可以直接取用的資料產品。" },
  { title: "導入 Plasma 之後", lead: "四家分院，一份資料，總院隨時彙整。" },
]

export function Story() {
  const compact = useLayoutMode() !== "desktop"
  const [pos, setPos] = useState({ screen: 0, step: 0 })
  const [playing, setPlaying] = useState(false)
  const [agent, setAgent] = useState(0)
  const { screen, step } = pos

  const go = useCallback((screen: number, step = 0) => setPos({ screen, step }), [])
  const next = useCallback(() => {
    setPos(({ screen, step }) => {
      if (step + 1 < STEP_COUNT[screen]) return { screen, step: step + 1 }
      if (screen + 1 < SCREENS.length) return { screen: screen + 1, step: 0 }
      return { screen, step }
    })
  }, [])
  const prev = useCallback(() => {
    setPos(({ screen, step }) => {
      if (step > 0) return { screen, step: step - 1 }
      if (screen > 0) return { screen: screen - 1, step: STEP_COUNT[screen - 1] - 1 }
      return { screen, step }
    })
  }, [])
  const isLast = screen === SCREENS.length - 1

  // 自動播放:每一步停留固定時間,播到最後停下
  useEffect(() => {
    if (!playing) return
    if (isLast) { const t = setTimeout(() => setPlaying(false), DWELL[2][0]); return () => clearTimeout(t) }
    const t = setTimeout(next, DWELL[screen][step])
    return () => clearTimeout(t)
  }, [playing, screen, step, isLast, next])

  // AI 對話:進到步驟 3 時從頭播
  useEffect(() => {
    if (!(screen === 1 && step === 2)) return
    setAgent(0)
    const t0 = performance.now() + 300
    let raf = 0
    const tick = (now: number) => {
      const v = Math.min(1, Math.max(0, (now - t0) / AGENT_MS))
      setAgent(v)
      if (v < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [screen, step])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") { setPlaying(false); next() }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { setPlaying(false); prev() }
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p) }
      else if (/^[123]$/.test(e.key)) { setPlaying(false); go(+e.key - 1) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev, go])

  const manual = (fn: () => void) => () => { setPlaying(false); fn() }
  const head = HEAD[screen]

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-6 pp:h-12 pp:px-4">
        <a href="../#showchwan" target="_top" aria-label="回到 Plasma Demo 首頁" className="shrink-0">
          <img src={logo} alt="Brobridge" className="h-[22px] w-auto dark:hidden pp:h-[18px]" />
          <img src={logoDark} alt="Brobridge" className="hidden h-[26px] w-auto dark:block pp:h-[21px]" />
        </a>
        <span className="h-5 w-px bg-border pp:hidden" />
        <h1 className="text-[15px] text-foreground/85 pp:hidden">Plasma × 秀傳醫院 跨院資料整合</h1>
        <nav className="mx-auto flex items-center gap-1 pp:hidden" aria-label="段落">
          {SCREENS.map((s, i) => (
            <button key={s} onClick={manual(() => go(i))} className={`sc-tab ${i === screen ? "on" : ""}`}>
              <span className="tabular-nums">{i + 1}</span>{s}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={() => setPlaying((p) => !p)} className="sc-play" aria-label={playing ? "暫停" : "自動播放"}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span className="pp:hidden">{playing ? "暫停" : "自動播放"}</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* 手機:段落切換放在標題列下方 */}
      <nav className="hidden shrink-0 gap-1 border-b border-border px-3 py-2 pp:flex" aria-label="段落">
        {SCREENS.map((s, i) => (
          <button key={s} onClick={manual(() => go(i))} className={`sc-tab flex-1 justify-center ${i === screen ? "on" : ""}`}>
            <span className="tabular-nums">{i + 1}</span>{s.replace("Plasma ", "")}
          </button>
        ))}
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div key={screen} className="sc-screen flex h-full min-h-0 flex-col gap-4 px-6 py-5 pp:h-auto pp:px-4 pp:py-4">
          <div className="shrink-0">
            <h2 className="text-[26px] font-semibold tracking-tight pp:text-[22px]">{head.title}</h2>
            <p className="mt-1 text-[15px] text-muted-foreground pp:text-[14px]">{head.lead}</p>
          </div>

          {screen === 2 ? (
            <div className="min-h-0 flex-1"><Results compact={compact} /></div>
          ) : (
            <div className="flex min-h-0 flex-1 gap-6 pp:flex-col pp:gap-4">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
                <div className={`sc-board ${compact ? "w-full flex-none" : "min-h-0 flex-1"}`} style={compact ? { aspectRatio: `${STAGE(true, screen).w} / ${STAGE(true, screen).h}` } : undefined}>
                  <Stage screen={screen} step={step} compact={compact} agent={agent} />
                </div>
                {screen === 1 && <StepRail step={step} compact={compact} onPick={(i) => { setPlaying(false); go(1, i) }} />}
              </div>
              <aside className="w-[340px] shrink-0 pp:w-full">
                <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {screen === 0 ? "四個痛點" : "痛點解決進度"}
                </div>
                <PainList screen={screen} step={step} onPick={(i) => { setPlaying(false); go(screen, i) }} />
              </aside>
            </div>
          )}
        </div>
      </main>

      <footer className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-border px-6 pp:px-4">
        <button onClick={manual(prev)} disabled={screen === 0 && step === 0} className="sc-navbtn"><ChevronLeft className="h-4 w-4" />上一步</button>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: STEP_COUNT[screen] }, (_, i) => (
            <span key={i} className={`sc-dot ${i === step ? "on" : ""}`} />
          ))}
          <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">← → 換步驟，空白鍵自動播放</span>
        </div>
        <button onClick={manual(next)} disabled={isLast} className="sc-navbtn primary">下一步<ChevronRight className="h-4 w-4" /></button>
      </footer>
    </div>
  )
}
