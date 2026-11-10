import { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { ArrowRight, CONTACT, DOCS, SiteHeader } from "./components"
import { COMPONENTS, DELIVERY, SOURCES, WORKSPACE_BOXES } from "./techData"
import "./site.css"
import "./pages/tech.css"

const num = (i: number) => String(i + 1).padStart(2, "0")

function FlowArrow() {
  return <div className="arrow" aria-hidden="true"><ArrowRight size={28} stroke={2.5} /></div>
}

function Column({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="col">
      <h3>{title}</h3>
      <ul>{rows.map(([a, b]) => <li key={a}>{a} <small>{b}</small></li>)}</ul>
    </div>
  )
}

/** 目錄跟著捲動位置標示目前段落 */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id) }),
      { rootMargin: "-30% 0px -60% 0px" },
    )
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [ids])
  return active
}

const IDS = COMPONENTS.map((c) => c.id)

function Tech() {
  const active = useActiveSection(IDS)
  return (
    <>
      <SiteHeader logoHref="../#tech" logoLabel="回到 Plasma Demo 入口"
        crumb={<><a href="../#tech" target="_top">Plasma Demo</a> / 元件總覽</>}
        action={<a className="btn-bar small" href={DOCS} target="_blank" rel="noopener">官方技術文件</a>} />
      <main>
        <section className="intro">
          <div className="container">
            <p className="eyebrow">PLASMA · 給技術人員</p>
            <h1>Plasma 元件總覽</h1>
            <p>Plasma 用一個 Web 介面管完整段資料流程：連上來源資料庫、用 SQL 查詢與轉換、排程寫出，最後發布成資料產品或 MCP 工具給 AI 使用。以下依資料流的順序，說明每個元件做什麼、規格與限制。</p>
            <div className="facts"><span>6 種來源資料庫</span><span>3 種 View</span><span>CDC 串流同步</span><span>內建 MCP 伺服器</span></div>
          </div>
        </section>

        <section className="arch" aria-labelledby="arch-title">
          <div className="container">
            <h2 id="arch-title">架構總覽</h2>
            <p className="sub">點任一元件，跳到該段說明。</p>
            <div className="flow">
              <Column title="來源資料庫" rows={SOURCES} />
              <FlowArrow />
              <div className="ws">
                <h3>工作區 WORKSPACE · 隔離邊界</h3>
                <div className="ws-grid">
                  {WORKSPACE_BOXES.map((b) => (
                    <a key={b.href} className={`box${b.wide ? " wide red" : ""}`} href={b.href}><b>{b.name}</b><span>{b.desc}</span></a>
                  ))}
                </div>
              </div>
              <FlowArrow />
              <Column title="交付與使用" rows={DELIVERY} />
            </div>
          </div>
        </section>

        <section className="body">
          <div className="container">
            <nav className="toc" aria-label="元件目錄">
              <ol>
                {COMPONENTS.map((c, i) => (
                  <li key={c.id}><a href={`#${c.id}`} aria-current={active === c.id ? "true" : undefined}><span>{num(i)}</span>{c.name.replace(" 與 SQL 方言", "")}</a></li>
                ))}
              </ol>
            </nav>

            <div>
              {COMPONENTS.map((c, i) => (
                <article key={c.id} className="comp" id={c.id}>
                  <header><span className="num t-num">{num(i)}</span><h2>{c.name}<small>{c.en}</small></h2></header>
                  <p className="what">{c.what}</p>
                  <div className="grid">
                    <div className="panel">
                      <h3>{c.specTitle ?? "規格"}</h3>
                      {c.specTable ? (
                        <table className="db">
                          <thead><tr><th>資料庫</th><th>讀取</th><th>寫入</th></tr></thead>
                          <tbody>
                            {c.specTable.map(([db, r, w]) => (
                              <tr key={db}><td>{db}</td><td>{r}</td><td className={w === "唯讀" ? "ro" : undefined}>{w}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <ul>{c.spec.map((s, k) => <li key={k}>{s}</li>)}</ul>
                      )}
                    </div>
                    <div className="panel limit">
                      <h3>{c.specTable ? "規格與限制" : "限制"}</h3>
                      <ul>{c.limits.map((s, k) => <li key={k}>{s}</li>)}</ul>
                    </div>
                  </div>
                  <a className="doc" href={c.doc} target="_blank" rel="noopener">官方文件 →</a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="outro">
          <div className="container">
            <div>
              <h2>用你的資料，跑一次 Plasma</h2>
              <p>PoC 一至兩週，接上你的資料庫就能開始。</p>
            </div>
            <a className="btn-bar onred" href={CONTACT}>預約專人諮詢</a>
          </div>
        </section>
      </main>
    </>
  )
}

createRoot(document.getElementById("root")!).render(<StrictMode><Tech /></StrictMode>)
