import type { EdgeState, Pos, SceneDef } from "./types"
import { SCENES } from "./scenes"
import { NODE_BY_ID } from "./data"
import { edgePath } from "./geometry"
import { layoutMode, place, verticalFlow } from "./layout"

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

// ---- 結構:只跟「在哪兩個情境之間」有關,整段過場不變,所以只在換段時算一次、React 才重繪 ----

export interface EdgeSlot { key: string; from: string; to: string; state: EdgeState; length: number }
export interface Structure { a: SceneDef; b: SceneDef; nodeIds: string[]; edges: EdgeSlot[] }

const edgeKey = (e: SceneDef["edges"][number]) => `${e.from}--${e.to}--${e.state}`

// 依「段落 + 橫式/直式」快取
const structures = new Map<string, Structure>()
export function structureAt(i: number): Structure {
  const cacheKey = `${i}|${layoutMode()}`
  const cached = structures.get(cacheKey)
  if (cached) return cached
  const a = SCENES[i]
  const b = SCENES[i + 1]
  const nodeIds = [...new Set([...Object.keys(a.nodes), ...Object.keys(b.nodes)])]
  const edges = new Map<string, EdgeSlot>()
  // 光點速度與數量依「所在情境裡」的連線長度決定,過場中不變,SMIL 動畫才不會一直重啟
  for (const [scene, list] of [[a, a.edges], [b, b.edges]] as const) {
    for (const e of list) {
      const k = edgeKey(e)
      if (edges.has(k)) continue
      const from = place(e.from, scene.nodes[e.from])
      const to = place(e.to, scene.nodes[e.to])
      edges.set(k, { key: k, from: e.from, to: e.to, state: e.state, length: Math.hypot(to.x - from.x, to.y - from.y) })
    }
  }
  const s = { a, b, nodeIds, edges: [...edges.values()] }
  structures.set(cacheKey, s)
  return s
}

// ---- 每格的連續值:位置、透明度、連線形狀、負載;由 useScrollEffect 直接寫進 DOM ----

export interface NodeFrame { id: string; pos: Pos; opacity: number }
export interface EdgeFrame { key: string; d: string; opacity: number }
export interface Frame { nodes: NodeFrame[]; edges: EdgeFrame[]; loads: Record<string, number> }

export function loadsAt(p: number): Record<string, number> {
  const { a, b, t } = segmentAt(p)
  const loads: Record<string, number> = {}
  for (const id of new Set([...Object.keys(a.loads ?? {}), ...Object.keys(b.loads ?? {})])) {
    const la = a.loads?.[id]
    const lb = b.loads?.[id]
    loads[id] = Math.round(lerp(la ?? lb ?? 0, lb ?? la ?? 0, t))
  }
  return loads
}

// 情境 6 的 Agent 面板展開程度 0~1
export function agentAt(p: number): number {
  const { a, b, t } = segmentAt(p)
  return lerp(a.showAgent ? 1 : 0, b.showAgent ? 1 : 0, t)
}

export function frameAt(p: number): Frame {
  const { a, b, t } = segmentAt(p)
  const { nodeIds, edges: slots } = structureAt(segmentIndex(p))

  const nodes: NodeFrame[] = []
  const posById: Record<string, Pos> = {}
  for (const id of nodeIds) {
    const A = a.nodes[id] && place(id, a.nodes[id])
    const B = b.nodes[id] && place(id, b.nodes[id])
    const oa = A ? (a.active.includes(id) ? 1 : a.dimOpacity ?? DIM) : 0
    const ob = B ? (b.active.includes(id) ? 1 : b.dimOpacity ?? DIM) : 0
    // 兩邊都有就移動;只有一邊就在原地淡入/淡出並略為下沉
    const pos = A && B
      ? { x: lerp(A.x, B.x, t), y: lerp(A.y, B.y, t) }
      : A ? { x: A.x, y: A.y + ENTER_OFFSET * t } : { x: B.x, y: B.y + ENTER_OFFSET * (1 - t) }
    posById[id] = pos
    nodes.push({ id, pos, opacity: lerp(oa, ob, t) })
  }

  // 同一條連線在前後情境狀態不同時(例如過載 → 正常),兩種狀態交叉淡化
  const inA = new Set(a.edges.map(edgeKey))
  const inB = new Set(b.edges.map(edgeKey))
  const edges = slots.map((e) => ({
    key: e.key,
    opacity: (inA.has(e.key) ? 1 - t : 0) + (inB.has(e.key) ? t : 0),
    d: edgePath(posById[e.from], NODE_BY_ID[e.from].kind, posById[e.to], NODE_BY_ID[e.to].kind, verticalFlow()),
  }))

  return { nodes, edges, loads: loadsAt(p) }
}

// 決定徽章文字/過載光暈的離散狀態;只有它改變時舞台才需要重繪
const tone = (v: number) => (v >= 80 ? "d" : v >= 60 ? "w" : "o")
export function stageKey(p: number): string {
  const { a, b, t } = segmentAt(p)
  const loads = loadsAt(p)
  return `${layoutMode()}|${segmentIndex(p)}|${(t < 0.5 ? a : b).id}|${Object.keys(loads).map((id) => tone(loads[id])).join("")}`
}
