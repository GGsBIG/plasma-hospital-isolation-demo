import { useEffect, useLayoutEffect, useSyncExternalStore } from "react"

// 捲動進度的外部 store。捲動每格都會變,不放進 React state(否則整棵樹每格重繪);
// 需要逐格變化的東西用 useScrollEffect 直接改 DOM,只有離散的狀態才用 useScrollSelector 觸發重繪。
type Listener = (p: number) => void

let progress = 0
const listeners = new Set<Listener>()

export const scrollStore = {
  get: () => progress,
  set(p: number) {
    if (p === progress) return
    progress = p
    listeners.forEach((fn) => fn(p))
  },
  // 進度沒變但畫面要重算(例如有／沒有 Plasma 的切換動畫)
  notify() {
    listeners.forEach((fn) => fn(progress))
  },
  subscribe(fn: Listener) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
}

const subscribeAll = (cb: () => void) => scrollStore.subscribe(cb)

// 只在 select 的結果改變時重繪;select 必須回傳基本型別(數字/字串/布林)
export function useScrollSelector<T extends string | number | boolean>(select: (p: number) => T): T {
  return useSyncExternalStore(subscribeAll, () => select(progress))
}

// 每次捲動都呼叫 fn(不重繪);掛上時與每次 render 後先套一次目前進度,畫面不會停在舊值
export function useScrollEffect(fn: Listener, deps: unknown[]) {
  useLayoutEffect(() => {
    fn(progress)
  })
  useEffect(() => scrollStore.subscribe(fn), deps) // eslint-disable-line react-hooks/exhaustive-deps
}

export const quantize = (x: number, step: number) => Math.round(x / step) * step
