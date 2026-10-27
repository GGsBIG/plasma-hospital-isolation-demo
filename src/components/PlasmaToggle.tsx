import { ShieldCheck, TriangleAlert } from "lucide-react"
import { FloatingButtonGroup } from "@/components/arc/floating-button-group/floating-button-group"
import { SCENES } from "../scenes"
import { clampProgress } from "../timeline"
import { useScrollSelector } from "../scroll"
import { plasmaOn } from "../plasma"
import { useLayoutMode } from "../layout"

// 舞台右上角的「導入前｜導入 Plasma 後」切換(uiarc FloatingButtonGroup):
// 兩顆柔和按鈕,目前狀態那顆以 pressed 保留淡色底,滑鼠所在處有一塊共用高亮滑過去。
// 開場頁沒有對照,整組淡出
export function PlasmaToggle({ onToggle }: { onToggle: (i: number, on: boolean) => void }) {
  const current = useScrollSelector((p) => Math.round(clampProgress(p)))
  const on = useScrollSelector((p) => plasmaOn(Math.round(clampProgress(p))))
  const compact = useLayoutMode() !== "desktop"
  const has = !!SCENES[current].plasma

  return (
    <span
      aria-hidden={!has || undefined}
      inert={!has || undefined}
      className={`arc transition-opacity duration-300 ${has ? "" : "pointer-events-none opacity-0"}`}
    >
      <FloatingButtonGroup
        label="切換導入 Plasma 前後"
        variant="floating"
        size={compact ? "sm" : "md"}
        tooltipSide="bottom"
        items={[
          { id: "before", label: "導入前", icon: <TriangleAlert />, pressed: !on, shortcut: "P", onSelect: () => onToggle(current, false) },
          { id: "after", label: "導入 Plasma 後", icon: <ShieldCheck />, pressed: on, shortcut: "P", onSelect: () => onToggle(current, true) },
        ]}
      />
    </span>
  )
}
