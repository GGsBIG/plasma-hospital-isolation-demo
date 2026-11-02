import { useEffect, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { Brain, Building2, Database, FileSpreadsheet, Network, Share2, ShieldAlert, ShieldCheck, TriangleAlert, Users } from "lucide-react"
import { SCENES } from "../scenes"
import { recapAt } from "../timeline"
import { useScrollEffect, useScrollSelector } from "../scroll"
import plasmaLogo from "../assets/plasma-logo.svg"
import plasmaLogoDark from "../assets/plasma-logo-dark.svg"

const ICON: Record<string, LucideIcon> = {
  protect: Database,
  api: Network,
  manual: FileSpreadsheet,
  campus: Building2,
  fhir: Share2,
  "ai-risk": ShieldAlert,
  knowledge: Brain,
  mcp: Users,
}

// 有導入前後對照的頁面 = 痛點
const PAINS = SCENES.map((s, i) => ({ s, i })).filter(({ s }) => s.plasma)

// 結尾總覽:Agent 對話播完後再往下捲,整塊蓋住說明欄與舞台。
// 痛點卡片先是紅色(導入前),完整出現後依序轉成綠色(已解決);往回捲會轉回紅色。點卡片回到該頁
export function Recap({ onSelect }: { onSelect: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useScrollSelector((p) => recapAt(p) > 0)
  // 完整出現後稍等一下才轉綠,先讓人看到一排紅色(直接跳到這頁時也一樣)
  const full = useScrollSelector((p) => recapAt(p) > 0.98)
  const [solved, setSolved] = useState(false)
  useEffect(() => {
    if (!full) return setSolved(false)
    const t = window.setTimeout(() => setSolved(true), 700)
    return () => window.clearTimeout(t)
  }, [full])
  useScrollEffect((p) => {
    const el = ref.current
    if (!el) return
    const r = recapAt(p)
    el.style.display = r > 0 ? "" : "none"
    el.style.opacity = `${r}`
    el.style.pointerEvents = r > 0.5 ? "" : "none"
    el.style.setProperty("--rise", `${(1 - r) * 24}px`)
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden={!visible || undefined}
      className="fixed inset-x-0 z-[15] flex items-center justify-center overflow-y-auto bg-background px-6"
      style={{ top: "var(--header-h)", bottom: "var(--footer-h)", display: "none" }}
    >
      <div className="w-full max-w-[1080px] py-6" style={{ transform: "translateY(var(--rise))" }}>
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={plasmaLogo} alt="Plasma" className="h-12 w-auto dark:hidden pp:h-9" />
          <img src={plasmaLogoDark} alt="Plasma" className="hidden h-12 w-auto dark:block pp:h-9" />
          <h2 className="text-[30px] font-semibold tracking-tight text-foreground pp:text-[22px] pl:text-[20px]">
            一個資料中台，解決 {PAINS.length} 個痛點
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-4 gap-4 pp:mt-5 pp:grid-cols-2 pp:gap-3 pl:mt-4 pl:gap-2">
          {PAINS.map(({ s, i }, k) => {
            const Icon = ICON[s.id] ?? ShieldCheck
            return (
              <button
                key={s.id}
                onClick={() => onSelect(i)}
                className={`group flex flex-col items-start gap-3 rounded-2xl border bg-card p-5 text-left transition-[border-color,box-shadow,transform] duration-500 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgb(0_0_0/0.08)] pp:gap-2 pp:p-3.5 pl:gap-1.5 pl:p-3
                  ${solved ? "border-ok/40" : "border-danger/30"}`}
                // 轉綠時依序延遲;轉回紅色時一起變
                style={{ transitionDelay: solved ? `${k * 160}ms` : "0ms" }}
              >
                <span className="flex w-full items-center justify-between">
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-xl transition-colors duration-500 pp:h-9 pp:w-9 pl:h-8 pl:w-8 ${solved ? "bg-ok/10 text-ok" : "bg-danger/10 text-danger"}`}
                    style={{ transitionDelay: solved ? `${k * 160}ms` : "0ms" }}
                  >
                    <Icon className="h-6 w-6 pp:h-5 pp:w-5 pl:h-4 pl:w-4" />
                  </span>
                  <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                </span>
                <span className="text-[19px] font-medium text-foreground pp:text-[16px] pl:text-[14px]">{s.short}</span>
                {/* 狀態列:導入前(紅)與已解決(綠)疊在同一格,交叉淡入 */}
                <span className="relative h-5 w-full text-[14px] pp:text-[13px] pl:text-[12px]">
                  {[
                    { on: !solved, Ic: TriangleAlert, text: "導入前", cls: "text-danger" },
                    { on: solved, Ic: ShieldCheck, text: "導入 Plasma 後", cls: "text-ok" },
                  ].map(({ on, Ic, text, cls }) => (
                    <span
                      key={text}
                      className={`absolute inset-0 flex items-center gap-1.5 transition-opacity duration-500 ${cls} ${on ? "opacity-100" : "opacity-0"}`}
                      style={{ transitionDelay: solved ? `${k * 160}ms` : "0ms" }}
                    >
                      <Ic className="h-4 w-4" />
                      {text}
                    </span>
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
