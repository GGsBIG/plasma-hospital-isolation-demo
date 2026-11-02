import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { SCENES } from "../scenes"
import { clampProgress, LAST, RECAP_AT, RECAP_INDEX, recapAt } from "../timeline"
import { scrollStore, useScrollEffect, useScrollSelector } from "../scroll"

interface Slot { left: number; width: number }

// 上一步 / 各情境 / 總覽 / 下一步 連成一條 bar;指示器跟著捲動位置等速移動
export function Stepper({ onSelect }: { onSelect: (i: number) => void }) {
  // 只有「目前是哪個情境」改變時重繪;指示器位置每格直接改 DOM
  const current = useScrollSelector((p) => (recapAt(p) >= 0.5 ? RECAP_INDEX : Math.round(clampProgress(p))))
  const barRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const glassRef = useRef<HTMLSpanElement>(null)
  const slots = useRef<Slot[]>([])
  const [ready, setReady] = useState(false)

  const place = useCallback((p: number) => {
    // 對話播完後再往下捲:從最後一個情境移到總覽那格
    const toRecap = p > RECAP_AT
    const q = clampProgress(p)
    const i = toRecap ? LAST : Math.min(Math.floor(q), LAST - 1)
    const a = slots.current[i]
    const b = slots.current[i + 1]
    const el = glassRef.current
    if (!a || !b || !el) return
    const m = toRecap ? recapAt(p) : q - i
    const l = a.left + (b.left - a.left) * m
    const r = a.left + a.width + (b.left + b.width - a.left - a.width) * m
    el.style.transform = `translateX(${l}px)`
    el.style.width = `${r - l}px`
  }, [])

  // 量每個情境按鈕在 bar 內的位置;字型載入或視窗縮放後重量
  useLayoutEffect(() => {
    const bar = barRef.current
    if (!bar) return
    // 用 offset 而非 getBoundingClientRect:目前情境的按鈕有 scale,量 rect 會偏
    const measure = () => {
      slots.current = itemRefs.current.map((el) => ({ left: el!.offsetLeft, width: el!.offsetWidth }))
      setReady(true)
      place(scrollStore.get())
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(bar)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [place])

  useScrollEffect(place, [place])

  const nav = "grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"

  return (
    <div className="liquid-bar flex items-center gap-1 rounded-full p-1">
      <button onClick={() => onSelect(current - 1)} disabled={current === 0} className={nav} aria-label="上一步">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-foreground/10" />

      <div ref={barRef} className="relative flex items-center">
        {[...SCENES, { id: "recap", short: "總覽" }].map((s, k) => (
          <button
            key={s.id}
            ref={(el) => { itemRefs.current[k] = el }}
            onClick={() => onSelect(k)}
            aria-current={k === current ? "step" : undefined}
            className={`relative z-0 inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] transition-[color,transform] duration-300
              ${k === current ? "scale-[1.04] font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <span className="text-[12px] tabular-nums opacity-60">{k + 1}</span>
            <span className="whitespace-nowrap">{s.short}</span>
          </button>
        ))}
        <span
          ref={glassRef}
          aria-hidden
          className="liquid-glass pointer-events-none absolute left-0 top-0 z-10 h-10 rounded-full"
          style={{ visibility: ready ? "visible" : "hidden" }}
        />
      </div>

      <span className="mx-1 h-5 w-px bg-foreground/10" />
      <button onClick={() => onSelect(current + 1)} disabled={current === RECAP_INDEX} className={nav} aria-label="下一步">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
