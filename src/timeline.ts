import type { EdgeState, Pos, SceneDef, SceneState } from "./types"
import { SCENES } from "./scenes"
import { NODE_BY_ID } from "./data"
import { edgePath } from "./geometry"
import { layoutMode, lineScale, place, verticalFlow } from "./layout"
import { plasmaMix } from "./plasma"
import { phaseOf, phasesOf } from "./phase"

// 捲動進度 p:0 = 情境 1 置中,1 = 情境 2 置中…,小數就是卡在兩個情境之間。
// 所有過場都由 p 直接算出畫面,不再依時間播放,所以停在中途就會停在過場的一半。

const DIM = 0.28          // 非重點節點的透明度(情境可用 dimOpacity 覆寫)
const ENTER_OFFSET = 24   // 節點進出場時的位移(舞台 px)

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export const LAST = SCENES.length - 1
export const clampProgress = (p: number) => Math.min(LAST, Math.max(0, p))

// 抵達最後一個情境(MCP Agent)後,再留多少段 --scroll-step 的捲動距離給右側對話逐步播放
export const CHAT_SPAN = 2.5
// 對話播完後再一段是結尾總覽(不是情境,整塊蓋在說明欄與舞台上);RECAP_INDEX 是它在切換列上的位置
export const RECAP_AT = LAST + CHAT_SPAN
export const END = RECAP_AT + 1
export const RECAP_INDEX = SCENES.length
export const recapAt = (p: number) => clamp01(p - RECAP_AT)

// 目前所在的兩個情境與兩者之間的過場進度:與捲動等速,畫面跟著滾輪與手指走
export function segmentAt(p: number): { a: SceneDef; b: SceneDef; t: number } {
  const q = clampProgress(p)
  const i = Math.min(Math.floor(q), LAST - 1)
  return { a: SCENES[i], b: SCENES[i + 1], t: clamp01(q - i) }
}

export const segmentIndex = (p: number) => Math.min(Math.floor(clampProgress(p)), LAST - 1)

// ---- 畫面狀態:每段過場有前後兩頁,每頁又有「沒有／有 Plasma」兩種畫面,共四個狀態,
// 依捲動進度 t 與兩頁各自的切換程度加權混合 ----

export interface Weighted { s: SceneState; key: string; w: number }

// 有分幕的畫面:套上目前這一幕的覆寫
const resolve = (scene: SceneDef, i: number): SceneState => {
  if (!scene.phases) return scene
  const { idx, cycle } = phaseOf(i)
  return { ...scene, ...phasesOf(i, cycle)[idx].patch }
}
const variants = (scene: SceneDef, i: number): [SceneState, SceneState] => [resolve(scene, i), scene.plasma ?? scene]
// 結構要涵蓋每一幕可能出現的連線
const allStates = (scene: SceneDef): SceneState[] => [
  scene,
  ...(typeof scene.phases === "function" ? scene.phaseAll ?? [] : (scene.phases ?? []).map((ph) => ph.patch)).map((patch) => ({ ...scene, ...patch })),
  scene.plasma ?? scene,
]

export function statesAt(p: number): Weighted[] {
  const { a, b, t } = segmentAt(p)
  const i = segmentIndex(p)
  const ma = plasmaMix(i)
  const mb = plasmaMix(i + 1)
  const [a0, a1] = variants(a, i)
  const [b0, b1] = variants(b, i + 1)
  return [
    { s: a0, key: a.id, w: (1 - t) * (1 - ma) },
    { s: a1, key: `${a.id}+`, w: (1 - t) * ma },
    { s: b0, key: b.id, w: t * (1 - mb) },
    { s: b1, key: `${b.id}+`, w: t * mb },
  ]
}

// 權重最高的狀態排前面:徽章文字、滑鼠停留的連線都依「目前看起來最像」的那個狀態
export const dominantStates = (p: number) => statesAt(p).sort((x, y) => y.w - x.w)

// ---- 結構:全站所有節點與連線,依版面只算一次;舞台一次建好,之後只切換顯示,跨頁時不必拆掉重建 ----

export interface EdgeSlot { key: string; from: string; to: string; state: EdgeState; length: number; lane: number; reveal?: number }
export interface Structure { nodeIds: string[]; edges: EdgeSlot[] }

const edgeKey = (e: SceneState["edges"][number]) => `${e.from}--${e.to}--${e.state}`

const structures = new Map<string, Structure>()
export function structure(): Structure {
  const cached = structures.get(layoutMode())
  if (cached) return cached
  const states = SCENES.flatMap(allStates)
  const nodeIds = [...new Set(states.flatMap((s) => Object.keys(s.nodes)))]
  const edges = new Map<string, EdgeSlot>()
  // 同一條連線出現在多個畫面時,取第一次出現的長度(決定光點速度與數量)
  for (const scene of states) {
    for (const e of scene.edges) {
      const k = edgeKey(e)
      if (edges.has(k)) continue
      const from = place(e.from, scene.nodes[e.from])
      const to = place(e.to, scene.nodes[e.to])
      edges.set(k, { key: k, from: e.from, to: e.to, state: e.state, length: Math.hypot(to.x - from.x, to.y - from.y), lane: e.lane ?? 0, reveal: e.reveal })
    }
  }
  const s = { nodeIds, edges: [...edges.values()] }
  structures.set(layoutMode(), s)
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

// 只算這一格看得到的:出現在目前四個畫面狀態裡的節點與連線(其餘由舞台隱藏)
export function frameAt(p: number): Frame {
  const states = statesAt(p).filter((x) => x.w > 0)

  const nodeIds = new Set(states.flatMap((x) => Object.keys(x.s.nodes)))
  const nodes: NodeFrame[] = []
  const posById: Record<string, Pos> = {}
  for (const id of nodeIds) {
    // 位置 = 有這個節點的狀態加權平均;不在的狀態佔的權重讓它淡出並略為下沉
    let x = 0, y = 0, w = 0, opacity = 0
    for (const st of states) {
      const at = st.s.nodes[id]
      if (!at) continue
      const P = place(id, at)
      x += P.x * st.w
      y += P.y * st.w
      w += st.w
      opacity += st.w * (st.s.active.includes(id) ? 1 : st.s.dimOpacity ?? DIM)
    }
    const pos = { x: x / w, y: y / w + ENTER_OFFSET * (1 - w) }
    posById[id] = pos
    nodes.push({ id, pos, opacity })
  }

  // 同一條連線在各狀態有無不同時交叉淡化(例如過載 → 隔離)
  const opacity = new Map<string, number>()
  const lane = new Map<string, number>()
  for (const st of states) {
    for (const e of st.s.edges) {
      const k = edgeKey(e)
      opacity.set(k, (opacity.get(k) ?? 0) + st.w)
      lane.set(k, e.lane ?? 0)
    }
  }
  const edges: EdgeFrame[] = []
  for (const [key, op] of opacity) {
    const [from, to] = key.split("--")
    const l = lane.get(key)!
    edges.push({ key, opacity: op, d: edgePath(shift(posById[from], l), NODE_BY_ID[from].kind, shift(posById[to], l), NODE_BY_ID[to].kind, verticalFlow()) })
  }

  return { nodes, edges, loads: loadsAt(p) }
}

// 決定徽章文字/過載光暈的離散狀態;只有它改變時舞台才需要重繪
const tone = (v: number) => (v >= 80 ? "d" : v >= 60 ? "w" : "o")
export function stageKey(p: number): string {
  const loads = loadsAt(p)
  const seg = segmentIndex(p)
  // 換幕也要重繪(徽章、停機狀態;攻擊封包依輪次重新掛上)
  const ph = `${phaseOf(seg).idx}.${phaseOf(seg).cycle}/${phaseOf(seg + 1).idx}.${phaseOf(seg + 1).cycle}`
  return `${layoutMode()}|${ph}|${segmentIndex(p)}|${dominantStates(p)[0].key}|${Object.keys(loads).map((id) => tone(loads[id])).join("")}`
}
