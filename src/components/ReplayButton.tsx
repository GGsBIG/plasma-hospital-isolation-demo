import { RotateCcw } from "lucide-react"
import { FloatingButtonGroup } from "@/components/arc/floating-button-group/floating-button-group"
import { useLayoutMode } from "../layout"
import { useEntryEpoch } from "../entry"

// 舞台右上角、導入前後切換旁的「重播這一頁」:同一組柔和按鈕樣式,只放圖示,名稱與快捷鍵在 tooltip。
// 按下(或按 R)時圖示轉一圈,回饋「從頭播放」;重播次數當 key,每次都重新轉
export function ReplayButton({ onReplay }: { onReplay: () => void }) {
  const compact = useLayoutMode() !== "desktop"
  const epoch = useEntryEpoch()
  return (
    <span className="arc replay-btn">
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
