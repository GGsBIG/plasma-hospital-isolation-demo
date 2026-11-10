import { useSyncExternalStore } from "react"
import { entryEpoch, useEntryEpoch } from "./entry"

// 大腦頁導入後的「Upload」關卡:先跳出上傳視窗(文件都已就緒),使用者按 Upload 才開始
// 文件飛進知識庫 → 大腦長出 → Agent 對話。記下按下時的重播次數:換頁、重播、切換導入前後都會讓
// 重播次數加一,關卡就自動回到「等使用者按」
let doneEpoch = -1
const listeners = new Set<() => void>()

export const uploadGate = {
  done: () => doneEpoch === entryEpoch(),
  go() {
    if (doneEpoch === entryEpoch()) return
    doneEpoch = entryEpoch()
    listeners.forEach((fn) => fn())
  },
  subscribe(cb: () => void) {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
}

export function useUploadDone() {
  const epoch = useEntryEpoch()
  const at = useSyncExternalStore(uploadGate.subscribe, () => doneEpoch)
  return at === epoch
}
