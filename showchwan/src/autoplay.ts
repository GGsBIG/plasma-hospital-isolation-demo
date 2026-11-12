import { useSyncExternalStore } from "react"

// 自動播放模式的開關(外部 store,不是 React state):播放流程在 App.tsx,
// 按鈕、切換鈕的第一次引導、標題列提示都只讀這個值
let playing = false
const listeners = new Set<() => void>()

export const autoplay = {
  get: () => playing,
  set(v: boolean) {
    if (v === playing) return
    playing = v
    listeners.forEach((fn) => fn())
  },
  subscribe(cb: () => void) {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
}

export function useAutoplay() {
  return useSyncExternalStore(autoplay.subscribe, autoplay.get)
}
