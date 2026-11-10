import { StrictMode, useEffect, useRef, useState, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { ArrowRight, CONTACT, SiteHeader } from "./components"
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
  { key: "ncsist", href: "ncsist/", kind: "客戶情境", meta: "6 個情境", code: "NCSIST", title: "中科院資料隔離",
    body: "核心資料庫不再被壓垮，各單位只看得到權限內的資料，AI 只能讀不能改。" },
  { key: "hospital", href: "hospital/", kind: "客戶情境", meta: "6 個情境", code: "HOSPITAL", title: "醫院資料隔離",
    body: "HIS 不用動，健保申報、FHIR 交換與院內 AI 都改從 Plasma 取用資料。" },
  { key: "tech", href: "tech/", kind: "技術說明", meta: "12 個元件", code: "TECH", title: "Plasma 元件總覽",
    body: "從資料庫連線、View、排程到 MCP，每個元件做什麼、規格與限制。" },
  { key: "ui", href: "ui-hospital/", kind: "操作示範", meta: "醫院", code: "UI", title: "Plasma 實際操作",
    body: "連上 HIS、LIS、EMR，匯入資料字典，AI Agent 自動建好病歷摘要 API。" },
  { key: "bi", href: "powerbi/", kind: "案例簡報", meta: "醫療 BI", code: "BI", title: "Plasma × Power BI",
    body: "四個資料庫跨庫查詢、物化、出 API，一天串起住院品質儀表板。" },
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

function Home() {
  const [cur, setCur] = useState(0)
  const [still, setStill] = useState(false)
  // 滑鼠移到卡片上時取消輪播高亮,避免兩張卡同時是紅的
  const [hovering, setHovering] = useState(false)
  const [changed, setChanged] = useState(false)
  const first = useRef(true)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setStill(true)
  }, [])
  useEffect(() => {
    if (still) return
    const t = window.setTimeout(() => setCur((c) => (c + 1) % HEADS.length), HOLD)
    return () => window.clearTimeout(t)
  }, [cur, still])
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setChanged(true)
  }, [cur])

  const head = HEADS[cur]
  return (
    <>
      <SiteHeader logoHref="https://brobridge.com/" logoLabel="Brobridge 寬橋 官網" crumb="Plasma Demo"
        action={<a className="btn-bar primary small" href={CONTACT}>預約專人諮詢</a>} />
      <main>
        <section className={`hero${still ? " still" : ""}`}>
          <Backdrop />
          <div className="container">
            <div className="headline">
              <p className="eyebrow"><b>PLASMA</b>企業資料平台 · 展示</p>
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
                    <a className={`card${!hovering && c.key === head.key ? " lit" : ""}`} href={c.href} target="_blank" rel="noopener">
                      <span className="tag"><span>{c.kind}</span><span>{c.meta}</span></span>
                      <span className="code t-num">{c.code}</span>
                      <h2>{c.title}</h2>
                      <p>{c.body}</p>
                      <span className="go">全螢幕開啟 <ArrowRight /></span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>
      </main>
    </>
  )
}

createRoot(document.getElementById("root")!).render(<StrictMode><Home /></StrictMode>)
