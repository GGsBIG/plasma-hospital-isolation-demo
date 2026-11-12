import { useSyncExternalStore } from "react"

// 對話輪播用的共用計時器:每 STEP 毫秒前進一格;有人訂閱時才跑,同頁的多個泡泡共用同一個節拍
const STEP = 1800

let tick = 0
let timer = 0
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  if (!timer) {
    timer = window.setInterval(() => {
      if (document.hidden) return
      tick++
      listeners.forEach((fn) => fn())
    }, STEP)
  }
  return () => {
    listeners.delete(cb)
    if (!listeners.size) {
      window.clearInterval(timer)
      timer = 0
      tick = 0
    }
  }
}

export function useTick() {
  return useSyncExternalStore(subscribe, () => tick)
}
