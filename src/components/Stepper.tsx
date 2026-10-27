import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { SCENES } from "../scenes"
import { clampProgress, easedProgress, LAST } from "../timeline"
import { scrollStore, useScrollEffect, useScrollSelector } from "../scroll"

interface Slot { left: number; width: number }
interface Edge { x: number; v: number }

// 磁吸曲線:前半段黏在原本那格,過了一半被下一格加速吸過去(比 smoothstep 陡很多)
const MAGNET = 3
const magnet = (f: number) => (f < 0.5 ? 0.5 * (2 * f) ** MAGNET : 1 - 0.5 * (2 - 2 * f) ** MAGNET)

// 左右兩個邊緣各自用彈簧追目標:朝移動方向的「前緣」彈簧硬、先被吸過去,
// 「後緣」彈簧軟、拖在後面再略帶回彈地跟上,整顆玻璃就像液滴被拉長後啪一下收合
const LEAD = { k: 520, damping: 0.62 }
const TRAIL = { k: 120, damping: 0.78 }
const IDLE = { k: 260, damping: 0.8 }
// 游標停在其他情境上時,玻璃朝那一側被拉出的距離
const HOVER_PULL = 14

function step(e: Edge, target: number, { k, damping }: { k: number; damping: number }, dt: number) {
  const c = 2 * Math.sqrt(k) * damping
  e.v += (k * (target - e.x) - c * e.v) * dt
  e.x += e.v * dt
}

// 上一步 / 六個情境 / 下一步 連成一條 bar;一顆 liquid glass 指示器浮在情境上,
// 跟著捲動進度從一格被「磁吸」到下一格
export function Stepper({ onSelect }: { onSelect: (i: number) => void }) {
  // 只有「目前是哪個情境」改變時重繪;指示器位置每格由下方的訂閱與彈簧迴圈直接改 DOM
  const current = useScrollSelector((p) => Math.round(clampProgress(p)))
  const barRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const glassRef = useRef<HTMLSpanElement>(null)
  const slots = useRef<Slot[]>([])
  const [ready, setReady] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  const hoveredRef = useRef(hovered)
  hoveredRef.current = hovered

  // 彈簧迴圈:只在指示器還在動時跑,停穩就停,有新目標再喚醒
  const target = useRef<{ l: number; r: number } | null>(null)
  const loop = useRef<{ wake: () => void } | null>(null)

  const retarget = useCallback((p: number) => {
    const q = easedProgress(p)
    const i = Math.min(Math.floor(q), LAST - 1)
    const a = slots.current[i]
    const b = slots.current[i + 1]
    if (!a || !b) return
    const m = magnet(q - i)
    let l = a.left + (b.left - a.left) * m
    let r = a.left + a.width + (b.left + b.width - a.left - a.width) * m
    const h = hoveredRef.current
    const cur = Math.round(clampProgress(p))
    if (h !== null && h !== cur) {
      if (h > cur) r += HOVER_PULL
      else l -= HOVER_PULL
    }
    target.current = { l, r }
    loop.current?.wake()
  }, [])

  // 量每個情境按鈕在 bar 內的位置;字型載入或視窗縮放後重量
  useLayoutEffect(() => {
    const bar = barRef.current
    if (!bar) return
    // 用 offset 而非 getBoundingClientRect:目前情境的按鈕有 scale,量 rect 會偏
    const measure = () => {
      slots.current = itemRefs.current.map((el) => ({ left: el!.offsetLeft, width: el!.offsetWidth }))
      setReady(true)
      retarget(scrollStore.get())
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(bar)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [retarget])

  useScrollEffect(retarget, [retarget])
  useEffect(() => retarget(scrollStore.get()), [hovered, retarget])

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let edges: { l: Edge; r: Edge } | null = null
    let last = 0
    let raf = 0
    const tick = (now: number) => {
      const dt = last ? Math.min(0.032, (now - last) / 1000) : 1 / 60
      last = now
      const t = target.current
      const el = glassRef.current
      if (!t || !el) { raf = 0; return }
      if (!edges || reduce) {
        edges = { l: { x: t.l, v: 0 }, r: { x: t.r, v: 0 } }
      } else {
        // 依目標中心相對目前中心判斷移動方向,決定哪一邊是前緣
        const travel = (t.l + t.r) / 2 - (edges.l.x + edges.r.x) / 2
        const dir = Math.abs(travel) < 1 ? 0 : Math.sign(travel)
        step(edges.r, t.r, dir > 0 ? LEAD : dir < 0 ? TRAIL : IDLE, dt)
        step(edges.l, t.l, dir < 0 ? LEAD : dir > 0 ? TRAIL : IDLE, dt)
      }
      const width = Math.max(24, edges.r.x - edges.l.x)
      // 被拉得比目標寬時壓扁一點,像被拉長的液滴
      const stretch = Math.min(1, Math.max(0, width - (t.r - t.l)) / 120)
      el.style.left = `${edges.l.x}px`
      el.style.width = `${width}px`
      el.style.transform = `scaleY(${1 - 0.2 * stretch})`
      const settled = [edges.l, edges.r].every((e, k) => Math.abs(e.v) < 0.05 && Math.abs(e.x - (k ? t.r : t.l)) < 0.05)
      if (settled) { raf = 0; last = 0; return }
      raf = requestAnimationFrame(tick)
    }
    loop.current = { wake: () => { if (!raf) raf = requestAnimationFrame(tick) } }
    loop.current.wake()
    return () => { cancelAnimationFrame(raf); loop.current = null }
  }, [])

  const nav = "grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"

  return (
    <div className="liquid-bar flex items-center gap-1 rounded-full p-1">
      <button onClick={() => onSelect(current - 1)} disabled={current === 0} className={nav} aria-label="上一步">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-foreground/10" />

      <div ref={barRef} className="relative flex items-center" onMouseLeave={() => setHovered(null)}>
        {SCENES.map((s, k) => (
          <button
            key={s.id}
            ref={(el) => { itemRefs.current[k] = el }}
            onClick={() => onSelect(k)}
            onMouseEnter={() => setHovered(k)}
            aria-current={k === current ? "step" : undefined}
            className={`relative z-0 inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] transition-[color,transform] duration-300
              ${k === current ? "scale-[1.04] font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <span className="font-mono text-[12px] tabular-nums opacity-60">{k + 1}</span>
            <span className="whitespace-nowrap">{s.short}</span>
          </button>
        ))}
        <span
          ref={glassRef}
          aria-hidden
          className="liquid-glass pointer-events-none absolute top-0 z-10 h-10 rounded-full"
          style={{ visibility: ready ? "visible" : "hidden" }}
        />
      </div>

      <span className="mx-1 h-5 w-px bg-foreground/10" />
      <button onClick={() => onSelect(current + 1)} disabled={current === LAST} className={nav} aria-label="下一步">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
