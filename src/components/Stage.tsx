import { useLayoutEffect, useRef, useState } from "react"
import type { SceneState } from "../types"
import { NODE_BY_ID } from "../data"
import { iconScale, sceneBox, stageSize, useLayoutMode, type Box } from "../layout"
import { dominantStates, frameAt, loadsAt, segmentAt, segmentIndex, stageKey, statesAt, structureAt } from "../timeline"
import { plasmaMix } from "../plasma"
import { scrollStore, useScrollEffect, useScrollSelector } from "../scroll"
import { Node, type Badge } from "./Node"
import { Edge } from "./Edge"

const HOT = 80

function loadBadge(v: number): Badge {
  // 數字(load)每格由 Stage 直接改 DOM,這裡只決定文字與色調
  if (v >= HOT) return { tone: "danger", text: "過載", load: v }
  if (v >= 60) return { tone: "warn", text: "負載", load: v }
  return { tone: "ok", text: "負載", load: v }
}

// 依畫面狀態的連線推出每個節點的狀態徽章;負載用過場中漸變的數值。
// 畫面保持精簡:預設不加統計列,只有情境自訂徽章(badges)時才帶一行說明
function describe(scene: SceneState, loads: Record<string, number>, id: string): { badge?: Badge; stat?: string; hot: boolean } {
  const node = NODE_BY_ID[id]
  const custom = scene.badges?.[id]
  if (custom) return { badge: { tone: custom.tone, text: custom.text }, stat: custom.stat, hot: false }
  const touching = scene.edges.filter((e) => e.from === id || e.to === id)
  const load = loads[id]
  switch (node.kind) {
    case "db":
      // 這個狀態沒有負載數字就不顯示徽章(負載只在講負載的頁面出現)
      if (load === undefined || scene.loads?.[id] === undefined) return { hot: false }
      return { badge: loadBadge(load), hot: load >= HOT }
    case "downstream": {
      const src = touching.find((e) => e.to === id)?.from
      const slow = src !== undefined && (loads[src] ?? 0) >= HOT
      return { badge: slow ? { tone: "warn", text: "回應變慢" } : { tone: "ok", text: "正常運作" }, hot: false }
    }
    case "app": {
      const direct = touching.filter((e) => e.state === "overload").length
      if (direct) return { badge: { tone: "danger", text: "直接存取資料庫" }, hot: false }
      if (touching.some((e) => NODE_BY_ID[e.from].kind === "serving"))
        return { badge: { tone: "ok", text: "經由 PostgreSQL" }, hot: false }
      if (touching.length) return { badge: { tone: "ok", text: "經由 Plasma" }, hot: false }
      return { badge: { tone: "idle", text: "待接入" }, hot: false }
    }
    case "plasma":
      return { badge: { tone: "ok", text: "已隔離正式資料庫" }, hot: false }
    case "serving":
      return { badge: { tone: "ok", text: "資料已同步" }, hot: false }
    case "kb":
      return { badge: { tone: "ok", text: "已匯入資料字典" }, hot: false }
  }
}

// 舞台以固定座標系(stageSize)繪製,縮放後放進容器(直接改 transform,不重繪)。
// 桌機:整張舞台置中。手機:鏡頭對準目前情境實際的內容外框(過場中在兩個情境的外框間內插),
// 每個情境都填滿寬度,左右留白和下方說明文字一致
function useFit(w: number, h: number, compact: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const size = useRef({ width: 0, height: 0 })
  const lastBox = useRef<Box | null>(null)

  const apply = (box: Box | null) => {
    const el = innerRef.current
    const { width, height } = size.current
    if (!el || !width) return
    const b = compact && box ? box : { x0: 0, y0: 0, x1: w, y1: h }
    const s = Math.min(width / (b.x1 - b.x0), height / (b.y1 - b.y0))
    const tx = (width - (b.x1 - b.x0) * s) / 2 - b.x0 * s
    const ty = (height - (b.y1 - b.y0) * s) / 2 - b.y0 * s
    el.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`
  }

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = (width: number, height: number) => {
      size.current = { width, height }
      apply(lastBox.current)
    }
    fit(el.clientWidth, el.clientHeight)
    const ro = new ResizeObserver(([entry]) => fit(entry.contentRect.width, entry.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [w, h, compact]) // eslint-disable-line react-hooks/exhaustive-deps

  const setBox = (box: Box | null) => {
    lastBox.current = box
    apply(box)
  }
  return { ref, innerRef, setBox }
}

// 每個畫面狀態的內容外框,依版面快取
const boxCache = new Map<string, Box>()
function boxOf(key: string, s: SceneState, mode: string): Box {
  const k = `${key}|${mode}`
  let b = boxCache.get(k)
  if (!b) {
    b = sceneBox(s.nodes, (id) => NODE_BY_ID[id].kind)
    boxCache.set(k, b)
  }
  return b
}

export function Stage() {
  const mode = useLayoutMode()
  const compact = mode !== "desktop"
  const { w, h } = stageSize()
  const { ref, innerRef, setBox } = useFit(w, h, compact)
  // 只在離散狀態改變時重繪:換段、徽章文字改用另一端情境、負載跨過門檻
  useScrollSelector(stageKey)
  const p = scrollStore.get()
  const { nodeIds, edges } = structureAt(segmentIndex(p))
  // 依權重排序的畫面狀態;第一個是「目前看起來最像」的那個
  const ranked = dominantStates(p).map((x) => x.s)
  const near = ranked[0]
  const loads = loadsAt(p)

  // 滑鼠停在哪個節點:它與直接相連的節點、連線保持清楚,其餘淡化
  const [hover, setHover] = useState<string | null>(null)
  const linked = new Set<string>()
  if (hover) {
    linked.add(hover)
    for (const e of near.edges) {
      if (e.from === hover) linked.add(e.to)
      if (e.to === hover) linked.add(e.from)
    }
  }

  // 每格的位置、透明度、連線形狀、負載數字直接寫進 DOM。
  // DOM 參照在掛上時就存好(每格不再 querySelector);每個值記住上次寫入的內容,沒變就不寫
  // 知識庫與 Plasma 合體時的「資料大腦」光暈:跟著兩者的位置走,濃淡依各狀態的 brain 權重
  const auraRef = useRef<HTMLDivElement>(null)
  const nodeEls = useRef(new Map<string, { el: HTMLDivElement; num: Element | null; last: string; load: string }>())
  const edgeEls = useRef(new Map<string, { g: SVGGElement; path: SVGPathElement | null; last: string; d: string }>())
  const lastKey = useRef("")
  // 重繪後可能有新節點/連線還沒套樣式,下一次一定要完整套一次
  lastKey.current = ""
  // 手機版鏡頭:各畫面狀態的外框依權重內插
  useScrollEffect((p) => {
    if (!compact) return
    const box = { x0: 0, y0: 0, x1: 0, y1: 0 }
    for (const { s, key, w } of statesAt(p)) {
      if (!w) continue
      const b = boxOf(key, s, mode)
      box.x0 += b.x0 * w
      box.y0 += b.y0 * w
      box.x1 += b.x1 * w
      box.y1 += b.y1 * w
    }
    setBox(box)
  }, [compact, mode])

  useScrollEffect((p) => {
    // 過場前後的停留區畫面完全不變,整格略過
    const i = segmentIndex(p)
    const key = `${i}|${segmentAt(p).t.toFixed(4)}|${plasmaMix(i).toFixed(4)}|${plasmaMix(i + 1).toFixed(4)}`
    if (key === lastKey.current) return
    lastKey.current = key
    const f = frameAt(p)
    for (const n of f.nodes) {
      const rec = nodeEls.current.get(n.id)
      if (!rec) continue
      // 用 transform 移動(不觸發版面重算),透明度在自己的圖層上變化
      const sig = `${n.pos.x.toFixed(1)},${n.pos.y.toFixed(1)},${n.opacity.toFixed(3)}`
      if (sig !== rec.last) {
        rec.last = sig
        rec.el.style.transform = `translate3d(${n.pos.x}px, ${n.pos.y}px, 0)`
        rec.el.style.opacity = `${n.opacity}`
        // 過場中幾乎看不見的節點不接受滑鼠,免得游標停在空白處也觸發
        rec.el.style.pointerEvents = n.opacity < 0.15 ? "none" : ""
      }
      const load = f.loads[n.id]
      if (load !== undefined && rec.num && rec.load !== `${load}`) {
        rec.load = `${load}`
        rec.num.textContent = `${load}%`
      }
    }
    const aura = auraRef.current
    if (aura) {
      const brain = statesAt(p).reduce((n, x) => n + (x.s.brain ? x.w : 0), 0)
      const plasma = f.nodes.find((n) => n.id === "plasma")
      const kb = f.nodes.find((n) => n.id === "kb")
      if (brain > 0.001 && plasma) {
        // 光暈中心在 Plasma 與疊在上面的知識庫之間
        const cy = kb ? (plasma.pos.y + kb.pos.y) / 2 : plasma.pos.y
        aura.style.transform = `translate3d(${plasma.pos.x}px, ${cy}px, 0)`
        aura.style.opacity = `${brain}`
        aura.style.display = ""
      } else {
        aura.style.display = "none"
      }
    }
    for (const e of f.edges) {
      const rec = edgeEls.current.get(e.key)
      if (!rec) continue
      const op = e.opacity.toFixed(3)
      if (op !== rec.last) {
        rec.last = op
        // 完全看不見的連線不顯示,光點動畫也不必繪製
        rec.g.style.display = e.opacity < 0.001 ? "none" : ""
        rec.g.style.opacity = op
      }
      // 兩端都沒移動的連線形狀不變,不必重設
      if (e.d !== rec.d) {
        rec.d = e.d
        rec.path?.setAttribute("d", e.d)
      }
    }
  }, [])

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      <div ref={innerRef} className="absolute left-0 top-0 origin-top-left" style={{ width: w, height: h }}>
        {/* 連線層 */}
        {/* 連線層:流動光點持續在動,捲動時也不暫停(節點各自是獨立圖層,光點重繪不會連帶重繪節點) */}
        <svg className="pointer-events-none absolute inset-0" width={w} height={h}>
          {edges.map((e) => (
            <Edge
              key={e.key}
              id={`edge-${e.key}`}
              gRef={(el) => {
                if (el) edgeEls.current.set(e.key, { g: el, path: el.querySelector("path"), last: "", d: "" })
                else edgeEls.current.delete(e.key)
              }}
              length={e.length}
              state={e.state}
              highlight={hover !== null && (e.from === hover || e.to === hover)}
              faded={hover !== null && e.from !== hover && e.to !== hover}
            />
          ))}
        </svg>

        {/* 資料大腦光暈:在連線之上、節點之下 */}
        <div ref={auraRef} aria-hidden className="pointer-events-none absolute left-0 top-0 h-0 w-0" style={{ display: "none" }}>
          <div
            className="brain-aura absolute rounded-full"
            style={{ width: 620 * iconScale("plasma"), height: 500 * iconScale("plasma"), left: -310 * iconScale("plasma"), top: -250 * iconScale("plasma") }}
          />
        </div>

        {/* 節點層 */}
        {nodeIds.map((id) => {
          // 不在目前狀態的節點,徽章依「有它、權重最高」的那個狀態計算
          const owner = ranked.find((s) => id in s.nodes) ?? near
          const info = describe(owner, loads, id)
          return (
            <Node
              key={id}
              elRef={(el) => {
                if (el) nodeEls.current.set(id, { el, num: el.querySelector("[data-load]"), last: "", load: "" })
                else nodeEls.current.delete(id)
              }}
              node={NODE_BY_ID[id]}
              compact={compact}
              hot={info.hot}
              badge={info.badge}
              stat={info.stat}
              callout={owner.callouts?.[id]}
              hovered={hover === id}
              faded={hover !== null && !linked.has(id)}
              onHover={setHover}
            />
          )
        })}
      </div>
    </div>
  )
}
