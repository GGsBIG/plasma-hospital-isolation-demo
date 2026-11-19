import { useEffect, useRef } from "react"
import { BRAIN_LINES, BRAIN_NODES } from "./brainNet"

/* ================= Plasma 大腦:浮在知識庫上方的神經網路圖(與醫院、製造業圖解同一套) =================
   正面朝向觀眾的平面圖,節點 + 連線的資料在 brainNet.ts(原圖座標 0–100)。
   grow:節點從腦幹往外一顆顆亮起、連線跟著畫出,接著訊號沿連線流動;
   target:一道訊號從大腦沿連線走到最靠近對象的節點,再跑到對象身上。
   精簡模式(lite)不跑循環的效果;暫停時全部停住。 */
type Pt = [number, number]
type XY = { x: number; y: number }
const BSQ = 0.72
const BX0 = 4
const BY0 = 8 * BSQ
const BVW = 92
export const BVH = (92 - 8) * BSQ
export const BRAIN_RATIO = BVH / BVW
const TONES = ["#8f9be0", "#6f63d9", "#b7bff0", "#9b7fe0", "#5b6fd6", "#c9b8f2"]
const BN = BRAIN_NODES.map(([x, y, r], i) => ({ x, y: y * BSQ, r: r * 0.72, c: TONES[(i * 7) % TONES.length] }))
const BL = BRAIN_LINES.map(([x1, y1, x2, y2]) => ({ x1, y1: y1 * BSQ, x2, y2: y2 * BSQ }))
const bdist = (a: XY, b: XY) => Math.hypot(a.x - b.x, a.y - b.y)
function bnear(p: XY) {
  let i = 0
  let d = Infinity
  BN.forEach((n, k) => { const e = bdist(n, p); if (e < d) { d = e; i = k } })
  return { i, d }
}
const BADJ = BN.map(() => [] as number[])
BL.forEach((l) => {
  const a = bnear({ x: l.x1, y: l.y1 })
  const b = bnear({ x: l.x2, y: l.y2 })
  if (a.d < 2.5 && b.d < 2.5 && a.i !== b.i) { BADJ[a.i].push(b.i); BADJ[b.i].push(a.i) }
})
function bpath(from: number, to: number): number[] {
  const prev = new Map<number, number>([[from, -1]])
  const q = [from]
  while (q.length) {
    const u = q.shift()!
    if (u === to) break
    for (const v of BADJ[u]) if (!prev.has(v)) { prev.set(v, u); q.push(v) }
  }
  if (!prev.has(to)) return [from]
  const out: number[] = []
  for (let u = to; u !== -1; u = prev.get(u)!) out.unshift(u)
  return out
}
const B_ORIGIN = bnear({ x: 56, y: 89 * BSQ }).i
const B_MAXD = Math.max(...BN.map((n) => bdist(n, BN[B_ORIGIN])))
const B_SPREAD = 1.3
const B_LINE_DELAY = BL.map((l) => (Math.min(bdist({ x: l.x1, y: l.y1 }, BN[B_ORIGIN]), bdist({ x: l.x2, y: l.y2 }, BN[B_ORIGIN])) / B_MAXD) * B_SPREAD)
const B_NODE_DELAY = BN.map((n) => (bdist(n, BN[B_ORIGIN]) / B_MAXD) * B_SPREAD)

/** box:大腦範圍(畫面座標);base:腦幹往下接到的點;target:回答的對象;world:靜態層左上角 */
export function BrainNet({ box, base, grow, start, target, world, R, paused, lite }: {
  box: { x0: number; y0: number; w: number; h: number }; base: Pt; grow: boolean; start: number; target: Pt | null
  world: { x: number; y: number }; R: number; paused: boolean; lite: boolean
}) {
  const fx = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const g = box.w / BVW
  const px = (p: XY): Pt => [(p.x - BX0) * g * R, (p.y - BY0) * g * R]
  const tgt: Pt | null = target ? [(target[0] - box.x0) * R, (target[1] - box.y0) * R] : null
  const stem = { x: BX0 + (base[0] - box.x0) / g, y: BY0 + (base[1] - box.y0) / g }
  const key = `${grow}|${R}|${box.w.toFixed(1)}|${tgt?.map((v) => v.toFixed(0)).join(",") ?? ""}`

  useEffect(() => {
    const host = fx.current
    if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const add = (cls: string, size: number) => {
      const e = document.createElement("i")
      e.className = cls
      e.style.width = e.style.height = `${size}px`
      e.style.marginLeft = e.style.marginTop = `${-size / 2}px`
      host.appendChild(e)
      return e
    }
    const run = (e: HTMLElement, frames: Keyframe[], ms: number) => {
      const a = e.animate(frames, { duration: ms, easing: "linear", fill: "forwards" })
      a.finished.then(() => e.remove()).catch(() => e.remove())
      return a
    }
    const at = ([x, y]: Pt) => `translate3d(${x}px, ${y}px, 0)`
    const spark = () => {
      const ln = BL[Math.floor(Math.random() * BL.length)]
      const fwd = Math.random() < 0.5
      const a = px(fwd ? { x: ln.x1, y: ln.y1 } : { x: ln.x2, y: ln.y2 })
      const z = px(fwd ? { x: ln.x2, y: ln.y2 } : { x: ln.x1, y: ln.y1 })
      run(add("bn-spark", 8 * R), [{ transform: at(a), opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { transform: at(z), opacity: 0 }], 800 + Math.random() * 500)
    }
    const ripple = () => {
      const n = BN[Math.floor(Math.random() * BN.length)]
      run(add("bn-ring", 150 * R), [{ transform: `${at(px(n))} scale(.05)`, opacity: 0.8 }, { transform: `${at(px(n))} scale(1)`, opacity: 0 }], 1100)
    }
    const answer = () => {
      if (!tgt) return
      const local = { x: BX0 + tgt[0] / R / g, y: BY0 + tgt[1] / R / g }
      const route = bpath(B_ORIGIN, bnear(local).i).map((i) => px(BN[i]))
      route.push(tgt)
      const cum = [0]
      for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]))
      const total = cum[cum.length - 1] || 1
      const ms = Math.min(2600, 900 + (total / R) * 2.2)
      run(add("bn-answer", 15 * R), route.map((p, i) => ({ transform: at(p), offset: cum[i] / total, opacity: i === 0 ? 0 : 1 })), ms)
        .finished.then(() => run(add("bn-hit", 90 * R), [{ transform: `${at(tgt)} scale(.1)`, opacity: 0.9 }, { transform: `${at(tgt)} scale(1)`, opacity: 0 }], 700)).catch(() => {})
    }
    // 時鐘只在沒暫停、分頁看得到時走
    let t = 0
    let nextSpark = lite ? Infinity : (start + B_SPREAD + 0.6) * 1000
    let nextRipple = nextSpark + 2500
    let nextAnswer = tgt ? (grow ? (start + B_SPREAD + 1) * 1000 : 1400) : Infinity
    const id = window.setInterval(() => {
      if (pausedRef.current || document.hidden) return
      t += 100
      if (t >= nextSpark) { spark(); nextSpark = t + (grow ? 450 : 1600) + Math.random() * (grow ? 300 : 1400) }
      if (t >= nextRipple) { ripple(); nextRipple = t + (grow ? 3500 : 7000) + Math.random() * 3000 }
      if (t >= nextAnswer) { answer(); nextAnswer = !lite ? t + 9000 : Infinity }
      if (nextSpark === Infinity && nextAnswer === Infinity) window.clearInterval(id)
    }, 100)
    return () => {
      window.clearInterval(id)
      host.getAnimations({ subtree: true }).forEach((a) => a.cancel())
      host.replaceChildren()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lite])

  useEffect(() => {
    fx.current?.getAnimations({ subtree: true }).forEach((a) => (paused ? a.pause() : a.play()))
  }, [paused])

  const W = box.w * R
  const H = box.h * R
  return (
    <div className={`brain${grow ? " grow" : ""}`} style={{ width: W, height: H, transform: `translate3d(${(box.x0 - world.x) * R}px, ${(box.y0 - world.y) * R}px, 0)`, ["--bd" as string]: `${start}s` }}>
      <div className="brain-glow" />
      <svg className="brain-svg" width={W} height={H} viewBox={`${BX0} ${BY0} ${BVW} ${BVH}`} aria-hidden>
        <line className="bn-stem" x1={stem.x} y1={stem.y} x2={BN[B_ORIGIN].x} y2={BN[B_ORIGIN].y} />
        <g>
          {BL.map((ln, i) => (
            <line key={i} className="bn-line" x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} pathLength={1} style={{ animationDelay: `${(start + B_LINE_DELAY[i]).toFixed(2)}s` }} />
          ))}
        </g>
        {BN.map((n, i) => (
          <circle key={i} className="bn-node" cx={n.x} cy={n.y} r={n.r} fill={n.c} style={{ animationDelay: `${(start + B_NODE_DELAY[i]).toFixed(2)}s` }} />
        ))}
      </svg>
      <div ref={fx} className="brain-fx" />
    </div>
  )
}
