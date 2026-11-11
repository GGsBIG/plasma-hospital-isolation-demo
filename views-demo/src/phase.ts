import { SCENES } from "./scenes"
import { scrollStore } from "./scroll"
import type { Phase } from "./types"

// 依時間輪播的「分幕」(SceneState.phases):例如情境 6 先過載 → 送出 DELETE → 資料庫停機,循環播放。
// 頁面進入畫面時從第 1 幕開始;每到換幕時間通知 scrollStore,畫面照常依捲動重算
const start = new Map<number, number>()
// 每次進入畫面給一個隨機起點,每一輪 seed = 起點 + 輪次,所以每輪、每次觀看的隨機結果都不同
const base = new Map<number, number>()
let timer = 0
let visibleKey = ""

// 第 i 頁第 cycle 輪的分幕(函式型的每輪重新產生,快取起來)
// after = true 時取「切換後」(SceneDef.plasma)那一側的分幕;兩側共用同一個起點,切換時會重新起算
const cache = new Map<string, Phase[]>()
const defOf = (i: number, after: boolean) => (after ? SCENES[i]?.plasma?.phases : SCENES[i]?.phases)
const hasPhases = (i: number) => !!(SCENES[i]?.phases || SCENES[i]?.plasma?.phases)
export function phasesOf(i: number, cycle = 0, after = false): Phase[] {
  const def = defOf(i, after)!
  if (typeof def !== "function") return def
  const seed = (base.get(i) ?? 0) + cycle
  const k = `${i}|${seed}`
  let ph = cache.get(k)
  if (!ph) {
    if (cache.size > 50) cache.clear()
    ph = def(seed)
    cache.set(k, ph)
  }
  return ph
}

const total = (i: number, after = false) => phasesOf(i, 0, after).reduce((n, ph) => n + ph.ms, 0)

// 第 i 頁分幕一整輪多長(毫秒);沒有分幕回傳 0。自動播放用來決定每一側停多久
export const cycleMs = (i: number, after = false) => (defOf(i, after) ? total(i, after) : 0)

export function phaseOf(i: number, after = false): { idx: number; cycle: number } {
  const t0 = start.get(i)
  if (!defOf(i, after) || t0 === undefined) return { idx: 0, cycle: 0 }
  const phases = phasesOf(i, 0, after)
  const elapsed = performance.now() - t0
  const len = total(i, after)
  let r = elapsed % len
  let idx = 0
  while (r >= phases[idx].ms) {
    r -= phases[idx].ms
    idx++
  }
  return { idx, cycle: Math.floor(elapsed / len) }
}

// 下一次換幕還有多久(兩側都看,取較近的)
function untilNextSide(i: number, after: boolean) {
  if (!defOf(i, after)) return Infinity
  const phases = phasesOf(i, 0, after)
  let r = (performance.now() - start.get(i)!) % total(i, after)
  for (const ph of phases) {
    if (r < ph.ms) return ph.ms - r
    r -= ph.ms
  }
  return 0
}
const untilNext = (i: number) => Math.min(untilNextSide(i, false), untilNextSide(i, true))

function visible(p: number) {
  const q = Math.min(SCENES.length - 1, Math.max(0, p))
  return SCENES.map((_, i) => (hasPhases(i) && Math.abs(q - i) < 1 ? i : -1)).filter((i) => i >= 0)
}

function schedule() {
  window.clearTimeout(timer)
  const list = visible(scrollStore.get())
  if (!list.length) return
  const dt = Math.min(...list.map(untilNext))
  timer = window.setTimeout(() => {
    scrollStore.notify()
    schedule()
  }, dt + 10)
}

// 有分幕的頁面進入/離開畫面時重新排程;離開後下次進來從第 1 幕重播
scrollStore.subscribe((p) => {
  const list = visible(p)
  const key = list.join(",")
  if (key === visibleKey) return
  visibleKey = key
  for (const i of [...start.keys()]) if (!list.includes(i)) start.delete(i)
  for (const i of list) {
    if (start.has(i)) continue
    start.set(i, performance.now())
    base.set(i, Math.floor(Math.random() * 1e6))
  }
  schedule()
})

// 重播／換頁時:這一頁的分幕從第 1 幕重新開始,隨機結果也重新抽
export function restartPhases(i: number) {
  if (!hasPhases(i)) return
  start.set(i, performance.now())
  base.set(i, Math.floor(Math.random() * 1e6))
  schedule()
  scrollStore.notify()
}
