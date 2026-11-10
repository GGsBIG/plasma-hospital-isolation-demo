import { X } from "lucide-react"
import type { DemoState } from "@/demo/store"
import { API_URL } from "@/demo/data"

// BI 工具的「連接資料來源」對話框：貼上 Plasma 複製來的 Data API，按連接。
// 疊在（空的）dashboard 上，看起來就是 BI 工具跳出的資料來源設定視窗。
export function PowerBIImport({ s }: { s: DemoState }) {
  if (!s.powerbiImportOpen) return null
  const filled = s.apiCopied // 已從 Plasma 複製 → URL 欄位帶入 Data API
  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center bg-ink/40 animate-in fade-in-0 duration-200">
      <div className="mt-[16vh] w-[620px] bg-paper shadow-[0_16px_40px_rgb(17_17_17/0.25)] border-2 border-ink border-t-[6px] border-t-red overflow-hidden">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b-2 border-ink mb-4">
          <h2 className="text-[22px] font-black text-ink">連接資料來源</h2>
          <button className="text-ink hover:text-red"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">
          {/* 來源類型 */}
          <div className="flex items-center gap-6 text-[13px] text-ink font-medium">
            <label className="flex items-center gap-2">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-red">
                <span className="h-2 w-2 rounded-full bg-red" />
              </span>
              REST API
            </label>
            <label className="flex items-center gap-2 text-ink-soft">
              <span className="inline-block h-4 w-4 rounded-full border-2 border-ink-soft" />
              資料庫
            </label>
          </div>

          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <label className="t-label text-ink">資料 API 網址</label>
            <div className="flex items-center border-2 border-ink bg-paper px-3 h-10">
              {filled ? (
                <span className="font-mono text-[13px] text-ink truncate">{API_URL}</span>
              ) : (
                <span className="text-[13px] italic text-ink-soft truncate">
                  https://your-service/data-api/v1/…
                </span>
              )}
            </div>
          </div>

          {/* 按鈕列 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              data-t="pbi-load"
              className="border-2 border-red bg-red px-6 h-9 text-[13px] font-bold text-paper hover:bg-red-deep"
            >
              連接
            </button>
            <button className="border-2 border-ink bg-paper px-6 h-9 text-[13px] font-bold text-ink hover:bg-ink hover:text-paper">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
