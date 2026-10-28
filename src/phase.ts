import { SCENES } from "./scenes"
import { scrollStore } from "./scroll"

// 依時間輪播的「分幕」(SceneState.phases):例如情境 6 先過載 → 送出 DELETE → 資料庫停機,循環播放。
// 頁面進入畫面時從第 1 幕開始;每到換幕時間通知 scrollStore,畫面照常依捲動重算
const start = new Map<number, number>()
let timer = 0
let visibleKey = ""

const total = (i: number) => SCENES[i].phases!.reduce((n, ph) => n + ph.ms, 0)

export function phaseOf(i: number): { idx: number; cycle: number } {
  const phases = SCENES[i]?.phases
  const t0 = start.get(i)
  if (!phases || t0 === undefined) return { idx: 0, cycle: 0 }
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
  const phases = SCENES[i].phases!
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
  for (const i of list) if (!start.has(i)) start.set(i, performance.now())
  schedule()
})
