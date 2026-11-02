import { useEffect, useMemo, useRef } from "react"
import { BRAIN_LINES, BRAIN_NODES } from "../brainNet"

// 「資料大腦」:節點 + 連線的神經網路大腦(資料見 brainNet.ts),壓扁成 70% 高。
// full(大腦頁):
//   A 長出來:節點從知識庫(中心上方)往外一顆顆亮起,連線跟著由內往外畫出
//   B 神經訊號:光點不定時沿連線流動,抵達的節點閃一下
//   C 滑鼠探照:游標附近的節點與連線變亮、節點微微靠向游標,遠的變淡
//   D 漣漪:每隔幾秒(隨機)從大腦裡隨機一處向外一圈圈亮起
//   E 回答串連:一道訊號從知識庫經過大腦傳到右緣(AI 那側),定時重播
// idle(跨部門頁):直接顯示,只有 B
// 大腦光暈出現時 display 由 none 變回來,CSS 的長出動畫自動重播;JS 的效果在看不見時(brainVisibility.shown 為 false)自動略過

const SQ = 0.7 // 垂直壓扁比例
const X0 = 4
const X1 = 96
const Y0 = 8 * SQ
const Y1 = 92 * SQ
const VW = X1 - X0
const VH = Y1 - Y0
const R_SCALE = 0.55 // 節點半徑縮小(原圖的點偏大)
// 大腦皮質的中心(原圖座標),對齊光暈中心;腦幹往下延伸
const CORE = { x: 50, y: 38 * SQ }
// 知識庫在大腦裡的位置(長出動畫與回答訊號的起點):中心略上方
const ORIGIN = { x: 47, y: 34 * SQ }

const nodes = BRAIN_NODES.map(([x, y, r]) => ({ x, y: y * SQ, r: r * R_SCALE }))
const lines = BRAIN_LINES.map(([x1, y1, x2, y2]) => ({ x1, y1: y1 * SQ, x2, y2: y2 * SQ }))
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

// 連線兩端對到最近的節點,建成圖(回答訊號要沿著連線走)
const nearest = (p: { x: number; y: number }) => {
  let best = 0
  let bd = Infinity
  nodes.forEach((n, i) => {
    const d = dist(n, p)
    if (d < bd) { bd = d; best = i }
  })
  return { i: best, d: bd }
}
const edges = lines.map((l) => [nearest({ x: l.x1, y: l.y1 }), nearest({ x: l.x2, y: l.y2 })] as const)
const adj = nodes.map(() => [] as { to: number; line: number }[])
edges.forEach(([a, b], li) => {
  if (a.d < 2.5 && b.d < 2.5 && a.i !== b.i) {
    adj[a.i].push({ to: b.i, line: li })
    adj[b.i].push({ to: a.i, line: li })
  }
})

// 最短路徑(BFS):回傳依序經過的節點
function path(from: number, to: number): number[] {
  const prev = new Map<number, number>([[from, -1]])
  const q = [from]
  while (q.length) {
    const u = q.shift()!
    if (u === to) break
    for (const { to: v } of adj[u]) if (!prev.has(v)) { prev.set(v, u); q.push(v) }
  }
  if (!prev.has(to)) return []
  const out: number[] = []
  for (let u = to; u !== -1; u = prev.get(u)!) out.unshift(u)
  return out
}

const ORIGIN_NODE = nearest(ORIGIN).i
const RIGHT_NODE = nodes.reduce((best, n, i) => (n.x > nodes[best].x ? i : best), 0)
const ANSWER = path(ORIGIN_NODE, RIGHT_NODE)
const MAX_D = Math.max(...nodes.map((n) => dist(n, ORIGIN)))

const GROW = 1.3 // 長出動畫:最遠的節點延遲多少秒

// 大腦目前是否看得見:由 Stage 在光暈出現/消失時設定(不必每次量元素尺寸,量尺寸會逼瀏覽器重算版面)
export const brainVisibility = { shown: false }

export function BrainNet({ width, delay, mode }: { width: number; delay: number; mode: "full" | "idle" }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const nodeRefs = useRef<(SVGGElement | null)[]>([])
  const lineRefs = useRef<(SVGLineElement | null)[]>([])
  const pulseRef = useRef<SVGGElement>(null)
  // 訊號光點放在 SVG 外的 HTML 圖層:只動 transform,交給 GPU 合成,不必每格重畫整張大腦 SVG
  const dotsRef = useRef<HTMLDivElement>(null)
  const height = (width * VH) / VW
  const full = mode === "full"

  const lineDelay = useMemo(
    () => lines.map((l) => delay + (Math.min(dist({ x: l.x1, y: l.y1 }, ORIGIN), dist({ x: l.x2, y: l.y2 }, ORIGIN)) / MAX_D) * GROW),
    [delay],
  )

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const shown = () => brainVisibility.shown && !document.hidden
    const timers: number[] = []
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms))

    // 一顆光點沿連線從 a 走到 b(大腦座標 → 圖層 px);回答訊號抵達的節點閃一下
    const kx = width / VW
    const ky = height / VH
    const fire = (a: { x: number; y: number }, b: { x: number; y: number }, ms: number, strong = false, land?: number) => {
      const box = dotsRef.current
      if (!box) return
      const c = document.createElement("span")
      c.className = strong ? "brain-dot strong" : "brain-dot"
      box.appendChild(c)
      const px = (p: { x: number; y: number }) => `translate(${(p.x - X0) * kx}px, ${(p.y - Y0) * ky}px)`
      c.animate([{ transform: px(a) }, { transform: px(b) }], { duration: ms, easing: "ease-in-out" })
        .finished.then(() => {
          c.remove()
          if (strong && land !== undefined) flash(land, 2)
        })
        .catch(() => c.remove())
    }
    const flash = (i: number, s: number, d = 0) => {
      const el = nodeRefs.current[i]?.firstElementChild as SVGCircleElement | null
      el?.animate([{ transform: "scale(1)" }, { transform: `scale(${s})`, opacity: 1 }, { transform: "scale(1)" }], { duration: 600, delay: d, easing: "ease-out" })
    }

    // B 神經訊號:隨機挑一條連線,每 0.5 秒一顆(看不見時略過)
    const start = (full ? delay + GROW + 1 : 0.5) * 1000
    later(() => {
      const id = window.setInterval(() => {
        if (!shown()) return
        const li = Math.floor(Math.random() * lines.length)
        const l = lines[li]
        const [a, b] = edges[li]
        const fwd = Math.random() < 0.5
        fire(fwd ? { x: l.x1, y: l.y1 } : { x: l.x2, y: l.y2 }, fwd ? { x: l.x2, y: l.y2 } : { x: l.x1, y: l.y1 }, 700 + Math.random() * 500, false, (fwd ? b : a).i)
      }, 500)
      timers.push(id)
    }, start)

    if (!full) return () => timers.forEach((t) => { window.clearTimeout(t); window.clearInterval(t) })

    // E 回答串連:知識庫 → 沿最短路徑 → 右緣,一段接一段,每 6 秒一次
    const answer = () => {
      if (shown() && ANSWER.length > 1) {
        ANSWER.slice(1).forEach((to, k) => {
          const from = ANSWER[k]
          later(() => fire(nodes[from], nodes[to], 260, true, to), k * 260)
        })
      }
    }
    later(() => {
      answer()
      timers.push(window.setInterval(answer, 6000))
    }, start + 600)

    // C 滑鼠探照:在整個舞台上聽(大腦在節點層底下,自己收不到滑鼠)
    const stage = svg.closest("[data-stage]") as HTMLElement | null
    const toLocal = (e: PointerEvent) => {
      const m = svg.getScreenCTM()
      if (!m) return null
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
      return { x: p.x, y: p.y }
    }
    const inside = (p: { x: number; y: number }) => p.x > X0 - 6 && p.x < X1 + 6 && p.y > Y0 - 6 && p.y < Y1 + 6
    let raf = 0
    let lit = false
    const RANGE = 22
    const reset = () => {
      if (!lit) return
      lit = false
      nodeRefs.current.forEach((g) => { if (g) { g.style.transform = ""; g.style.opacity = "" } })
      lineRefs.current.forEach((l) => { if (l) l.style.opacity = "" })
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const p = shown() ? toLocal(e) : null
        if (!p || !inside(p)) return reset()
        lit = true
        nodes.forEach((n, i) => {
          const g = nodeRefs.current[i]
          if (!g) return
          const d = dist(n, p)
          const f = Math.max(0, 1 - d / RANGE)
          g.style.opacity = `${0.35 + 0.65 * f}`
          // 往游標靠一點(越近越多,最多 1.6 單位)
          const k = (f * 1.6) / Math.max(d, 0.001)
          g.style.transform = `translate(${(p.x - n.x) * k}px, ${(p.y - n.y) * k}px)`
        })
        lines.forEach((l, i) => {
          const el = lineRefs.current[i]
          if (!el) return
          const f = Math.max(0, 1 - dist({ x: (l.x1 + l.x2) / 2, y: (l.y1 + l.y2) / 2 }, p) / RANGE)
          el.style.opacity = `${0.25 + 0.75 * f}`
        })
      })
    }
    // D 漣漪:節點與連線依離起點的距離,由近而遠亮起,外加一圈擴散的光環
    const ripple = (p: { x: number; y: number }) => {
      nodes.forEach((n, i) => flash(i, 1.9, dist(n, p) * 14))
      lines.forEach((l, i) => {
        const d = dist({ x: (l.x1 + l.x2) / 2, y: (l.y1 + l.y2) / 2 }, p)
        lineRefs.current[i]?.animate([{ opacity: 1, strokeWidth: "0.4" }, { opacity: 1, strokeWidth: "0.4" }], { duration: 260, delay: d * 14 })
      })
      const g = pulseRef.current
      if (g) {
        const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle")
        ring.setAttribute("cx", `${p.x}`)
        ring.setAttribute("cy", `${p.y}`)
        ring.setAttribute("r", "40")
        ring.setAttribute("class", "brain-ring")
        g.appendChild(ring)
        ring.animate([{ transform: "scale(0.02)", opacity: 0.9 }, { transform: "scale(1)", opacity: 0 }], { duration: 900, easing: "ease-out" })
          .finished.then(() => ring.remove()).catch(() => ring.remove())
      }
    }
    // 長出來之後,每 3–7 秒在隨機一個節點的位置發一次(看不見時略過)
    const nextRipple = () =>
      later(() => {
        if (shown()) ripple(nodes[Math.floor(Math.random() * nodes.length)])
        nextRipple()
      }, 3000 + Math.random() * 4000)
    later(nextRipple, start)
    stage?.addEventListener("pointermove", onMove)
    stage?.addEventListener("pointerleave", reset)
    return () => {
      timers.forEach((t) => { window.clearTimeout(t); window.clearInterval(t) })
      cancelAnimationFrame(raf)
      stage?.removeEventListener("pointermove", onMove)
      stage?.removeEventListener("pointerleave", reset)
    }
  }, [full, delay, width, height])

  return (
    <>
    <svg
      ref={svgRef}
      aria-hidden
      className={`brain-net absolute overflow-visible ${full ? "grow" : "idle"}`}
      viewBox={`${X0} ${Y0} ${VW} ${VH}`}
      width={width}
      height={height}
      // 皮質中心對齊光暈中心
      style={{ left: -((CORE.x - X0) / VW) * width, top: -((CORE.y - Y0) / VH) * height }}
    >
      <g>
        {lines.map((l, i) => (
          <line
            key={i}
            ref={(el) => { lineRefs.current[i] = el }}
            className="brain-line"
            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            pathLength={1}
            style={{ animationDelay: `${lineDelay[i].toFixed(2)}s` }}
          />
        ))}
      </g>
      <g>
        {nodes.map((n, i) => (
          <g key={i} ref={(el) => { nodeRefs.current[i] = el }} className="brain-node-wrap">
            <circle
              className="brain-node"
              cx={n.x} cy={n.y} r={n.r}
              style={{ animationDelay: `${(delay + (dist(n, ORIGIN) / MAX_D) * GROW).toFixed(2)}s` }}
            />
          </g>
        ))}
      </g>
      <g ref={pulseRef} />
    </svg>
    <div
      ref={dotsRef}
      aria-hidden
      className="brain-net pointer-events-none absolute"
      style={{ left: -((CORE.x - X0) / VW) * width, top: -((CORE.y - Y0) / VH) * height, width, height }}
    />
    </>
  )
}
