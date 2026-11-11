import { useEffect, useState } from "react"
import { Archive, Zap } from "lucide-react"
import { FloatingButtonGroup } from "@/components/arc/floating-button-group/floating-button-group"
import { SCENES } from "../scenes"
import { clampProgress } from "../timeline"
import { useScrollSelector } from "../scroll"
import { plasmaOn } from "../plasma"
import { useLayoutMode } from "../layout"
import { useAutoplay } from "../autoplay"

// 第一次引導:看過一次「導入 Plasma 後」就不再出現(記在瀏覽器裡;無痕或封鎖儲存時每次都會出現,不影響使用)
const HINT_KEY = "plasma-hint-done"
const hintDone = () => {
  try {
    return localStorage.getItem(HINT_KEY) === "1"
  } catch {
    return false
  }
}

// 舞台右上角的「導入前｜導入 Plasma 後」切換(uiarc FloatingButtonGroup):
// 投影時要一眼看到,所以按鈕放大,目前狀態那顆上色(導入前紅、導入後綠)。
// 還沒切過的人,「導入 Plasma 後」外圈會脈動,下方浮出提示。開場頁沒有對照,整組淡出
export function PlasmaToggle({ onToggle }: { onToggle: (i: number, on: boolean) => void }) {
  const current = useScrollSelector((p) => Math.round(clampProgress(p)))
  const on = useScrollSelector((p) => plasmaOn(Math.round(clampProgress(p))))
  const compact = useLayoutMode() !== "desktop"
  const playing = useAutoplay()
  const has = !!SCENES[current].plasma
  const [done, setDone] = useState(hintDone)
  useEffect(() => {
    if (!on || done) return
    setDone(true)
    try {
      localStorage.setItem(HINT_KEY, "1")
    } catch {}
  }, [on, done])
  const hint = has && !on && !done && !playing

  return (
    <span
      aria-hidden={!has || undefined}
      inert={!has || undefined}
      className={`arc plasma-toggle relative transition-opacity duration-300 ${compact ? "compact" : ""} ${hint ? "hint" : ""} ${has ? "" : "pointer-events-none opacity-0"}`}
    >
      <FloatingButtonGroup
        label="切換 View／Materialized View"
        variant="floating"
        size={compact ? "sm" : "md"}
        tooltipSide="bottom"
        items={[
          { id: "before", label: "View", icon: <Zap />, pressed: !on, shortcut: "P", onSelect: () => onToggle(current, false) },
          { id: "after", label: "Materialized View", icon: <Archive />, pressed: on, shortcut: "P", onSelect: () => onToggle(current, true) },
        ]}
      />
      {hint && (
        <span className="toggle-hint pointer-events-none absolute right-0 top-full mt-3 whitespace-nowrap rounded-xl bg-foreground px-4 py-2.5 font-medium text-background shadow-lg">
          點這裡看 Materialized View<span className="ml-2 opacity-60">或按 P</span>
        </span>
      )}
    </span>
  )
}
