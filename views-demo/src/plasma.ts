import { SCENES } from "./scenes"
import { scrollStore } from "./scroll"

// 「導入前／導入 Plasma 後」是全站共用的一個模式:在任一頁切換後,捲到其他頁也維持同一個模式
// (沒有對照的頁面,例如開場,永遠是 0)。
// 按鈕切換時用時間動畫(不是捲動)在兩種畫面之間過渡;每格更新後通知 scrollStore,所有依捲動繪製的東西照常重算。
// 前 30% 舊說明淡出、圖開始變化,之後新說明逐字浮現(見 NarrationPanel)
const DURATION = 1100

let target = 0
let mix = 0

export const plasmaMix = (i: number) => (SCENES[i]?.plasma ? mix : 0)
export const plasmaOn = (i: number) => !!SCENES[i]?.plasma && target === 1

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

let raf = 0

// 全站切回導入前(自動播放換頁前用;沒有對照的頁面也能呼叫)
export function plasmaOff() {
  const i = SCENES.findIndex((s) => s.plasma)
  if (i >= 0) setPlasma(i, false)
}

// i:在哪一頁按的(那一頁要有對照才能切換);切換的是全站的模式
export function setPlasma(i: number, on: boolean) {
  if (!SCENES[i]?.plasma) return
  const to = on ? 1 : 0
  if (target === to) return
  target = to
  cancelAnimationFrame(raf)
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    mix = to
    scrollStore.notify()
    return
  }
  const from = mix
  const start = performance.now()
  const tick = (now: number) => {
    const u = Math.min(1, (now - start) / DURATION)
    mix = from + (to - from) * ease(u)
    scrollStore.notify()
    if (u < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}
