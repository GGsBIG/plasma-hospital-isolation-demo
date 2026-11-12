import { createPortal } from "react-dom"
import { Check, Upload } from "lucide-react"
import { DOC_FILES } from "../data"
import { FILE_ICONS, FILE_ICON_VIEWBOX } from "../fileIcons"
import { uploadGate } from "../upload"

// 大腦頁導入後的上傳視窗:五份文件都已就緒,按 Upload 才開始匯入知識庫(之後大腦長出、Agent 對話接著播)。
// data-autoplay:按這顆不算「手動操作」,不會中斷自動播放(自動播放時會自己幫忙按)
export function UploadDialog({ compact }: { compact: boolean }) {
  // 手機:舞台很矮,視窗放在舞台裡會被切掉,改成蓋在整個畫面上(標題列與下方進度條之間)
  const dialog = (
    <div
      className={compact ? "fixed inset-x-0 z-30 flex items-center justify-center bg-background/70 p-4" : "absolute inset-0 z-[5] flex items-center justify-center bg-background/55 p-4"}
      style={compact ? { top: "var(--header-h)", bottom: "var(--footer-h)" } : undefined}
    >
      <div
        role="dialog"
        aria-label="匯入知識庫"
        className={`callout-in w-full rounded-2xl border border-border bg-card shadow-xl ${compact ? "max-w-[300px] p-4" : "max-w-[400px] p-5"}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Upload className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className={`font-semibold text-foreground ${compact ? "text-[15px]" : "text-[16px]"}`}>匯入知識庫</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">{DOC_FILES.length} 份文件已上傳完成</div>
          </div>
        </div>
        <ul className={`mt-4 divide-y divide-border rounded-xl border border-border ${compact ? "text-[13px]" : "text-[14px]"}`}>
          {DOC_FILES.map((f) => (
            <li key={f.name} className={`flex items-center gap-2.5 px-3 ${compact ? "py-1.5" : "py-2"}`}>
              <svg viewBox={FILE_ICON_VIEWBOX} className="h-5 w-5 shrink-0 text-[rgb(37_132_235)] dark:text-[rgb(110_175_255)]" fill="currentColor" aria-hidden>
                {FILE_ICONS[f.icon].map((d, j) => <path key={j} d={d} />)}
              </svg>
              <span className="flex-1 text-foreground">{f.name}</span>
              <span className="inline-flex items-center gap-1 text-[12px] text-ok">
                <Check className="h-3.5 w-3.5" />完成
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          data-autoplay=""
          onClick={() => uploadGate.go()}
          className={`upload-cta relative mt-4 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary font-semibold text-primary-foreground outline-none transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 ${compact ? "h-10 text-[14px]" : "h-11 text-[15px]"}`}
        >
          {/* 光澤掃過、圖示上下彈跳、外圈脈動:提示這顆要按 */}
          <span aria-hidden className="upload-shine pointer-events-none absolute inset-y-0 left-0 w-1/3" />
          <Upload className="upload-arrow h-4 w-4" />Upload
        </button>
        <p className="upload-tip mt-2 text-center text-[12px] text-muted-foreground">點擊 Upload，把文件匯入知識庫</p>
      </div>
    </div>
  )
  return compact ? createPortal(dialog, document.body) : dialog
}
