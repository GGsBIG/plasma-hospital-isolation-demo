import { StrictMode, useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { CONTACT, SiteHeader } from "./components"
import "./site.css"
import "./pages/home.css"

import d960a from "./assets/hero/bridge-desktop-960.avif"
import d1280a from "./assets/hero/bridge-desktop-1280.avif"
import d1672a from "./assets/hero/bridge-desktop-1672.avif"
import d960w from "./assets/hero/bridge-desktop-960.webp"
import d1280w from "./assets/hero/bridge-desktop-1280.webp"
import d1672w from "./assets/hero/bridge-desktop-1672.webp"
import m640a from "./assets/hero/bridge-mobile-640.avif"
import m941a from "./assets/hero/bridge-mobile-941.avif"
import m640w from "./assets/hero/bridge-mobile-640.webp"
import m941w from "./assets/hero/bridge-mobile-941.webp"

/** 主標輪播:每則對應一張入口卡,輪到時那張卡轉紅 */
const HEADS: { key: string; tab: string; lines: [string, string]; lead: ReactNode }[] = [
  {
    key: "ncsist", tab: "中科院", lines: ["核心資料庫", "不再被壓垮"],
    lead: <>新應用、報表與 AI 都改向 Plasma 取資料。<b>正式資料庫不受影響</b>，各單位<b>只看得到權限內的資料</b>。</>,
  },
  {
    key: "hospital", tab: "醫院", lines: ["HIS 不用動", "資料照樣用"],
    lead: <>健保申報、FHIR 對外交換、院內 AI，全部從 Plasma 取用。<b>門診、護理系統照常運作</b>。</>,
  },
  {
    key: "tech", tab: "技術人員", lines: ["從連線到 MCP", "一個平台管到底"],
    lead: <>資料庫連線、View、排程、資料產品到 MCP，<b>每個元件做什麼、規格與限制</b>一次看完。</>,
  },
]
const HOLD = 6500

/** 入口卡:href 對應 WordPress 上 /demos/ 底下的子資料夾 */
const CARDS = [
  { key: "ncsist", href: "ncsist/", title: "中科院情境" },
  { key: "hospital", href: "hospital/", title: "醫院情境" },
  { key: "tech", href: "tech/", title: "元件總覽" },
]

const srcset = (files: string[], widths: number[]) => files.map((f, i) => `${f} ${widths[i]}w`).join(", ")

function Backdrop() {
  return (
    <picture aria-hidden="true">
      <source media="(min-width: 768px)" type="image/avif" srcSet={srcset([d960a, d1280a, d1672a], [960, 1280, 1672])} sizes="100vw" />
      <source media="(min-width: 768px)" type="image/webp" srcSet={srcset([d960w, d1280w, d1672w], [960, 1280, 1672])} sizes="100vw" />
      <source type="image/avif" srcSet={srcset([m640a, m941a], [640, 941])} sizes="100vw" />
      <img src={m941w} srcSet={srcset([m640w, m941w], [640, 941])} sizes="100vw" alt="" width={941} height={1672}
        fetchPriority="high" decoding="async" />
    </picture>
  )
}

type Card = (typeof CARDS)[number]

/** 點入口按鈕後,在同一頁疊一層全螢幕視窗顯示 demo,不換頁、沒有額外的工具列。
 *  關閉:點 demo 左上角 logo、瀏覽器「上一頁」或 Esc(同網域,直接聽 iframe 裡的點擊與按鍵) */
function Viewer({ card, onClose }: { card: Card; onClose: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    // 開啟時塞一筆瀏覽紀錄(網址不變),按「上一頁」就關閉視窗而不是離開首頁
    // (開發模式的 StrictMode 會跑兩次 effect,已經推過就不再推)
    if (history.state?.viewer !== card.key) history.pushState({ viewer: card.key }, "")
    const onPop = () => onClose()
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") history.back() }
    window.addEventListener("popstate", onPop)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("popstate", onPop)
      window.removeEventListener("keydown", onKey)
    }
  }, [card.key, onClose])
  const onLoad = () => {
    try {
      const win = frameRef.current?.contentWindow
      win?.addEventListener("keydown", (e) => { if (e.key === "Escape") history.back() })
      // demo 左上角 logo 連回入口頁:在這裡就直接關掉視窗,不重新載入首頁
      win?.document.addEventListener("click", (e) => {
        const a = (e.target as Element | null)?.closest?.("a")
        if (a && new URL(a.href, win.location.href).pathname === location.pathname) { e.preventDefault(); history.back() }
      })
      win?.focus()
    } catch { /* 不同網域時聽不到,只剩上一頁可關 */ }
  }
  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={card.title}>
      <iframe ref={frameRef} className="viewer-frame" src={card.href} title={card.title} allow="autoplay; fullscreen" onLoad={onLoad} />
    </div>
  )
}

function Home() {
  // 從 demo 點 logo 回來時網址帶 #ncsist / #hospital / #tech,首頁就停在那個情境
  const [cur, setCur] = useState(() => Math.max(0, HEADS.findIndex((h) => `#${h.key}` === location.hash)))
  const [still, setStill] = useState(false)
  // 滑鼠移到卡片上時取消輪播高亮,避免兩張卡同時是紅的
  const [hovering, setHovering] = useState(false)
  const [changed, setChanged] = useState(false)
  const [open, setOpen] = useState<Card | null>(null)
  const closeViewer = useCallback(() => setOpen(null), [])
  const first = useRef(true)
  // 一般點擊在本頁開啟;按著 Cmd/Ctrl/Shift 或中鍵,照瀏覽器原本的方式開新分頁
  const openCard = (e: MouseEvent, c: Card) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    const i = HEADS.findIndex((h) => h.key === c.key)
    if (i >= 0) setCur(i)
    setOpen(c)
  }

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setStill(true)
  }, [])
  useEffect(() => {
    if (still || open) return
    const t = window.setTimeout(() => setCur((c) => (c + 1) % HEADS.length), HOLD)
    return () => window.clearTimeout(t)
  }, [cur, still, open])
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setChanged(true)
  }, [cur])

  const head = HEADS[cur]
  return (
    <>
      <SiteHeader logoHref="./" logoLabel="回到 Plasma Demo 首頁" crumb="Plasma Demo"
        action={<a className="btn-bar primary small" href={CONTACT}>預約專人諮詢</a>} />
      <main>
        <section className={`hero${still ? " still" : ""}`}>
          <Backdrop />
          <div className="container">
            <div className="headline">
              <h1>
                <span className="sr-only">{head.lines.join(" ")}</span>
                <span key={cur} className={`lines${changed ? " wipe" : ""}`} aria-hidden="true">
                  {head.lines.map((l) => <span key={l} className="line">{l}</span>)}
                </span>
              </h1>
              <p className="lead" aria-live="polite">{head.lead}</p>
              <div className="tabs" role="group" aria-label="主標切換">
                {HEADS.map((h, i) => (
                  <button key={h.key} type="button" aria-pressed={i === cur} onClick={() => setCur(i)}>
                    <span className="track" aria-hidden="true">
                      <span key={cur} className="fill" style={i === cur ? { animationDuration: `${HOLD}ms` } : undefined} />
                    </span>
                    {h.tab}
                  </button>
                ))}
              </div>
            </div>

            <nav aria-label="Demo 入口">
              <ul className="cards" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
                {CARDS.map((c) => (
                  <li key={c.key}>
                    <a className={`card${!hovering && c.key === head.key ? " lit" : ""}`} href={c.href} onClick={(e) => openCard(e, c)}>
                      {c.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>
      </main>
      {open && <Viewer card={open} onClose={closeViewer} />}
    </>
  )
}

createRoot(document.getElementById("root")!).render(<StrictMode><Home /></StrictMode>)
