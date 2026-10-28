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
const cache = new Map<string, Phase[]>()
export function phasesOf(i: number, cycle = 0): Phase[] {
  const def = SCENES[i].phases!
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

const total = (i: number) => phasesOf(i).reduce((n, ph) => n + ph.ms, 0)

export function phaseOf(i: number): { idx: number; cycle: number } {
  const t0 = start.get(i)
  if (!SCENES[i]?.phases || t0 === undefined) return { idx: 0, cycle: 0 }
  const phases = phasesOf(i)
  const elapsed = performance.now() - t0
  const len = total(i)
  let r = elapsed % len
  let idx = 0
  while (r >= phases[idx].ms) {
    r -= phases[idx].ms
    idx++
  }
  return { idx, cycle: Math.floor(elapsed / len) }
}

// 下一次換幕還有多久
function untilNext(i: number) {
  const phases = phasesOf(i)
  let r = (performance.now() - start.get(i)!) % total(i)
  for (const ph of phases) {
    if (r < ph.ms) return ph.ms - r
    r -= ph.ms
  }
  return 0
}

function visible(p: number) {
  const q = Math.min(SCENES.length - 1, Math.max(0, p))
  return SCENES.map((s, i) => (s.phases && Math.abs(q - i) < 1 ? i : -1)).filter((i) => i >= 0)
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
