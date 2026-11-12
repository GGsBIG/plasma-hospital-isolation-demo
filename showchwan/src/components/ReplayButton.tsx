import { RotateCcw } from "lucide-react"
import { FloatingButtonGroup } from "@/components/arc/floating-button-group/floating-button-group"
import { useLayoutMode } from "../layout"
import { useEntryEpoch } from "../entry"
import { useScrollSelector } from "../scroll"
import { clampProgress } from "../timeline"
import { SCENES } from "../scenes"

// 舞台右上角、導入前後切換旁的「重播這一頁」(第一頁不顯示):同一組柔和按鈕樣式,只放圖示,名稱與快捷鍵在 tooltip。
// 按下(或按 R)時圖示轉一圈,回饋「從頭播放」;重播次數當 key,每次都重新轉
export function ReplayButton({ onReplay }: { onReplay: () => void }) {
  const compact = useLayoutMode() !== "desktop"
  const epoch = useEntryEpoch()
  // 沒有導入前後對照的頁面不放重播鍵,跟切換鈕一樣淡出
  const hide = useScrollSelector((p) => !SCENES[Math.round(clampProgress(p))].plasma)
  return (
    <span
      aria-hidden={hide || undefined}
      inert={hide || undefined}
      className={`arc replay-btn ${compact ? "compact" : ""} transition-opacity duration-300 ${hide ? "pointer-events-none opacity-0" : ""}`}
    >
      <FloatingButtonGroup
        label="重播"
        variant="floating"
        size={compact ? "sm" : "md"}
        tooltipSide="bottom"
        items={[
          {
            id: "replay",
            label: "重播這一頁",
            iconOnly: true,
            shortcut: "R",
            icon: <RotateCcw key={epoch} className={epoch ? "replay-spin" : undefined} />,
            onSelect: onReplay,
          },
        ]}
      />
    </span>
  )
}
