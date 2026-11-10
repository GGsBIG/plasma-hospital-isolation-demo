import { useSyncExternalStore } from "react"
import { scrollStore } from "./scroll"
import { restartPhases } from "./phase"

// 頁面「進場」時間軸:換頁(切換列、方向鍵、說明卡片)與重播鈕都會從頭播放一次目前這一頁的效果。
// 畫面仍然由捲動進度算出,進場只是在上面再乘一層「依時間出現」的程度:
// 節點依資料流順序升起、連線依序畫出、左側說明逐字浮現;播放期間每格通知 scrollStore 重算。
// 手動捲動不觸發進場(捲到一半停在一半的行為不變)。

export const ENTRY_MS = 1900

let t0 = -Infinity
let page = -1
let epoch = 0
let raf = 0
const replayListeners = new Set<(i: number) => void>()
const epochListeners = new Set<() => void>()

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
const easeOut = (x: number) => 1 - (1 - x) ** 3

function loop() {
  cancelAnimationFrame(raf)
  const tick = () => {
    scrollStore.notify()
    if (performance.now() - t0 < ENTRY_MS + 120) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}

function bump(i: number) {
  page = i
  epoch++
  epochListeners.forEach((fn) => fn())
}

// 完整重播第 i 頁:分幕從第 1 幕、需要重掛的元件(大腦)重掛、節點/連線/說明依序進場
export function replay(i: number) {
  restartPhases(i)
  bump(i)
  replayListeners.forEach((fn) => fn(i))
  if (reduced()) {
    t0 = -Infinity
    scrollStore.notify()
    return
  }
  t0 = performance.now()
  loop()
}

// 只重新開始該頁的時間效果(分幕、大腦、對話),不做節點進場:切換導入前後時用,畫面變化交給導入前後的轉場
export function restartEffects(i: number) {
  restartPhases(i)
  bump(i)
}

// 進場是否進行中,以及整段進度 0~1(重播鈕外圈用)
export const entryActive = () => performance.now() - t0 < ENTRY_MS
export const entryProgress = () => Math.min(1, Math.max(0, (performance.now() - t0) / ENTRY_MS))
export const entryPage = () => page

// 某個元素的進場程度:延遲 delay ms 後花 dur ms 從 0 到 1(ease-out);不是進場中的頁就是 1
export function entryAt(i: number, delay: number, dur: number) {
  if (i !== page) return 1
  const e = performance.now() - t0
  if (e >= ENTRY_MS) return 1
  return easeOut(Math.min(1, Math.max(0, (e - delay) / dur)))
}

// 進場中這一格的識別值:讓「畫面沒變就略過」的快取在進場期間每格都重算
export const entryKey = () => (entryActive() ? `e${epoch}:${Math.round(entryProgress() * 200)}` : `e${epoch}`)

// 有新的重播時要清掉的狀態(例如「連線已畫出」的記錄)
export function onReplay(fn: (i: number) => void) {
  replayListeners.add(fn)
  return () => {
    replayListeners.delete(fn)
  }
}

// 目前的重播次數(非 React 的地方讀)
export const entryEpoch = () => epoch

// 重播次數:當 React key 用,讓大腦這類自帶計時器的元件重新掛載、從頭播
export function useEntryEpoch() {
  return useSyncExternalStore(
    (cb) => {
      epochListeners.add(cb)
      return () => {
        epochListeners.delete(cb)
      }
    },
    () => epoch,
  )
}
