import { Pause, Play } from "lucide-react"
import { autoplay, useAutoplay } from "../autoplay"

// 自動播放／暫停:每頁先播導入前、自動切到導入後、再換下一頁(流程在 App.tsx)。
// data-autoplay:點這顆不算「手動操作」,不會被當成要中斷自動播放
export function AutoplayButton({ compact = false }: { compact?: boolean }) {
  const playing = useAutoplay()
  return (
    <button
      type="button"
      data-autoplay=""
      onClick={() => autoplay.set(!playing)}
      aria-pressed={playing}
      aria-label={playing ? "暫停自動播放" : "自動播放"}
      title="自動播放（空白鍵）"
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-foreground/40
        ${compact ? "h-[30px] w-[30px] justify-center" : "h-12 px-5 text-[16px]"}
        ${playing ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground hover:bg-foreground/5"}`}
    >
      {playing ? <Pause className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} /> : <Play className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />}
      {/* 手機標題列放不下文字,只留圖示 */}
      {!compact && <span className="autoplay-label">{playing ? "暫停" : "自動播放"}</span>}
    </button>
  )
}
