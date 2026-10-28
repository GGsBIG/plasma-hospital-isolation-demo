import type { EdgeState, Pos, SceneDef, SceneState } from "./types"
import { SCENES } from "./scenes"
import { NODE_BY_ID } from "./data"
import { edgePath } from "./geometry"
import { layoutMode, lineScale, place, verticalFlow } from "./layout"
import { plasmaMix } from "./plasma"

// 捲動進度 p:0 = 情境 1 置中,1 = 情境 2 置中…,小數就是卡在兩個情境之間。
// 所有過場都由 p 直接算出畫面,不再依時間播放,所以停在中途就會停在過場的一半。

// 每段過場只在中間這段捲動距離內進行,頭尾各留一小段停在完整情境上,比較好停
const HOLD = 0.15
const DIM = 0.28          // 非重點節點的透明度(情境可用 dimOpacity 覆寫)
const ENTER_OFFSET = 24   // 節點進出場時的位移(舞台 px)

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smoothstep = (x: number) => x * x * (3 - 2 * x)

export const LAST = SCENES.length - 1
export const clampProgress = (p: number) => Math.min(LAST, Math.max(0, p))

// 目前所在的兩個情境與兩者之間的過場進度(已 ease)
export function segmentAt(p: number): { a: SceneDef; b: SceneDef; t: number } {
  const q = clampProgress(p)
  const i = Math.min(Math.floor(q), LAST - 1)
  return { a: SCENES[i], b: SCENES[i + 1], t: smoothstep(clamp01((q - i - HOLD) / (1 - 2 * HOLD))) }
}

// 套用與舞台相同緩動後的進度(整數停留、中間加速),給需要跟著過場走的 UI 用
export function easedProgress(p: number): number {
  const q = clampProgress(p)
  const i = Math.min(Math.floor(q), LAST - 1)
  return i + segmentAt(q).t
}

export const segmentIndex = (p: number) => Math.min(Math.floor(clampProgress(p)), LAST - 1)

// ---- 畫面狀態:每段過場有前後兩頁,每頁又有「沒有／有 Plasma」兩種畫面,共四個狀態,
// 依捲動進度 t 與兩頁各自的切換程度加權混合 ----

export interface Weighted { s: SceneState; key: string; w: number }

const variants = (scene: SceneDef): [SceneState, SceneState] => [scene, scene.plasma ?? scene]

export function statesAt(p: number): Weighted[] {
  const { a, b, t } = segmentAt(p)
  const i = segmentIndex(p)
  const ma = plasmaMix(i)
  const mb = plasmaMix(i + 1)
  const [a0, a1] = variants(a)
  const [b0, b1] = variants(b)
  return [
    { s: a0, key: a.id, w: (1 - t) * (1 - ma) },
    { s: a1, key: `${a.id}+`, w: (1 - t) * ma },
    { s: b0, key: b.id, w: t * (1 - mb) },
    { s: b1, key: `${b.id}+`, w: t * mb },
  ]
}

// 權重最高的狀態排前面:徽章文字、滑鼠停留的連線都依「目前看起來最像」的那個狀態
export const dominantStates = (p: number) => statesAt(p).sort((x, y) => y.w - x.w)

// ---- 結構:只跟「在哪兩頁之間」有關,整段過場不變,所以只在換段時算一次、React 才重繪 ----

export interface EdgeSlot { key: string; from: string; to: string; state: EdgeState; length: number; lane: number }
export interface Structure { nodeIds: string[]; edges: EdgeSlot[] }

const edgeKey = (e: SceneState["edges"][number]) => `${e.from}--${e.to}--${e.state}`

// 依「段落 + 版面」快取
const structures = new Map<string, Structure>()
export function structureAt(i: number): Structure {
  const cacheKey = `${i}|${layoutMode()}`
  const cached = structures.get(cacheKey)
  if (cached) return cached
  const states = [...variants(SCENES[i]), ...variants(SCENES[i + 1])]
  const nodeIds = [...new Set(states.flatMap((s) => Object.keys(s.nodes)))]
  const edges = new Map<string, EdgeSlot>()
  // 光點速度與數量依「所在狀態裡」的連線長度決定,過場中不變,SMIL 動畫才不會一直重啟
  for (const scene of states) {
    for (const e of scene.edges) {
      const k = edgeKey(e)
      if (edges.has(k)) continue
      const from = place(e.from, scene.nodes[e.from])
      const to = place(e.to, scene.nodes[e.to])
      edges.set(k, { key: k, from: e.from, to: e.to, state: e.state, length: Math.hypot(to.x - from.x, to.y - from.y), lane: e.lane ?? 0 })
    }
  }
  const s = { nodeIds, edges: [...edges.values()] }
  structures.set(cacheKey, s)
  return s
}

// ---- 每格的連續值:位置、透明度、連線形狀、負載;由 useScrollEffect 直接寫進 DOM ----

export interface NodeFrame { id: string; pos: Pos; opacity: number }
export interface EdgeFrame { key: string; d: string; opacity: number }
export interface Frame { nodes: NodeFrame[]; edges: EdgeFrame[]; loads: Record<string, number> }

// 負載:有定義該節點負載的狀態加權平均
export function loadsAt(p: number): Record<string, number> {
  const states = statesAt(p)
  const ids = new Set(states.flatMap(({ s }) => Object.keys(s.loads ?? {})))
  const loads: Record<string, number> = {}
  for (const id of ids) {
    let sum = 0
    let w = 0
    let first: number | undefined
    for (const x of states) {
      const v = x.s.loads?.[id]
      if (v === undefined) continue
      first ??= v
      sum += v * x.w
      w += x.w
    }
    loads[id] = Math.round(w > 0 ? sum / w : first!)
  }
  return loads
}

// 最後一頁的 Agent 面板展開程度 0~1
export function agentAt(p: number): number {
  return statesAt(p).reduce((n, x) => n + (x.s.showAgent ? x.w : 0), 0)
}

// 並排連線的上下平移;手機版線較粗,間距跟著放大
const shift = (p: Pos, lane: number) => (lane ? { x: p.x, y: p.y + lane * lineScale() } : p)

export function frameAt(p: number): Frame {
  const states = statesAt(p)
  const { nodeIds, edges: slots } = structureAt(segmentIndex(p))

  const nodes: NodeFrame[] = []
  const posById: Record<string, Pos> = {}
  for (const id of nodeIds) {
    // 位置 = 有這個節點的狀態加權平均;不在的狀態佔的權重讓它淡出並略為下沉
    let x = 0, y = 0, w = 0, opacity = 0
    let any: Pos | undefined
    for (const st of states) {
      const at = st.s.nodes[id]
      if (!at) continue
      const P = place(id, at)
      any ??= P
      x += P.x * st.w
      y += P.y * st.w
      w += st.w
      opacity += st.w * (st.s.active.includes(id) ? 1 : st.s.dimOpacity ?? DIM)
    }
    const base = w > 0 ? { x: x / w, y: y / w } : any!
    const pos = { x: base.x, y: base.y + ENTER_OFFSET * (1 - w) }
    posById[id] = pos
    nodes.push({ id, pos, opacity })
  }

  // 同一條連線在各狀態有無不同時交叉淡化(例如過載 → 隔離)
  const keySets = states.map((x) => new Set(x.s.edges.map(edgeKey)))
  const edges = slots.map((e) => ({
    key: e.key,
    opacity: states.reduce((n, x, k) => n + (keySets[k].has(e.key) ? x.w : 0), 0),
    d: edgePath(shift(posById[e.from], e.lane), NODE_BY_ID[e.from].kind, shift(posById[e.to], e.lane), NODE_BY_ID[e.to].kind, verticalFlow()),
  }))

  return { nodes, edges, loads: loadsAt(p) }
}

// 決定徽章文字/過載光暈的離散狀態;只有它改變時舞台才需要重繪
const tone = (v: number) => (v >= 80 ? "d" : v >= 60 ? "w" : "o")
export function stageKey(p: number): string {
  const loads = loadsAt(p)
  return `${layoutMode()}|${segmentIndex(p)}|${dominantStates(p)[0].key}|${Object.keys(loads).map((id) => tone(loads[id])).join("")}`
}
