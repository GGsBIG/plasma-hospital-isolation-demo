import { SCENES } from "./scenes"
import { scrollStore } from "./scroll"

// 每頁「導入前／導入 Plasma 後」的切換狀態。按鈕切換時用時間動畫(不是捲動)在兩種畫面之間過渡;
// 每格更新後通知 scrollStore,所有依捲動繪製的東西照常重算
// 前 30% 舊說明淡出、圖開始變化,之後新說明逐字浮現(見 NarrationPanel)
const DURATION = 1100

const target = SCENES.map(() => 0)
const mix = SCENES.map(() => 0)

export const plasmaMix = (i: number) => mix[i] ?? 0
export const plasmaOn = (i: number) => target[i] === 1

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

let raf = 0
let anim: { i: number; from: number; to: number; start: number } | null = null

export function setPlasma(i: number, on: boolean) {
  if (!SCENES[i]?.plasma) return
  const to = on ? 1 : 0
  if (target[i] === to) return
  target[i] = to
  cancelAnimationFrame(raf)
  // 上一個動畫還沒跑完就先跳到終點(只可能是同一頁)
  if (anim && anim.i !== i) mix[anim.i] = target[anim.i]
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    mix[i] = to
    anim = null
    scrollStore.notify()
    return
  }
  anim = { i, from: mix[i], to, start: performance.now() }
  const tick = (now: number) => {
    if (!anim) return
    const u = Math.min(1, (now - anim.start) / DURATION)
    mix[anim.i] = anim.from + (anim.to - anim.from) * ease(u)
    scrollStore.notify()
    if (u < 1) raf = requestAnimationFrame(tick)
    else anim = null
  }
  raf = requestAnimationFrame(tick)
}

// 先痛再解:某頁完全離開畫面後就回到「導入前」,下次捲回來又從痛點開始
scrollStore.subscribe((p) => {
  const q = Math.min(SCENES.length - 1, Math.max(0, p))
  for (let j = 0; j < SCENES.length; j++) {
    if (Math.abs(q - j) >= 1 && target[j] !== 0) {
      if (anim?.i === j) {
        cancelAnimationFrame(raf)
        anim = null
      }
      target[j] = 0
      mix[j] = 0
    }
  }
})
