import { SCENES } from "./scenes"
import { scrollStore } from "./scroll"
import { entryEpoch } from "./entry"
import { uploadGate } from "./upload"

// 大腦頁有上傳關卡時,Agent 面板延後出現:上傳、知識庫、大腦生成的期間舞台用全寬,
// 大腦長好才滑出面板(接著播對話)。重播、換頁、切換導入前後都會收回,等下一次按 Upload
const GATED = !!SCENES[SCENES.length - 1].plasma?.upload
export const AGENT_REVEAL_AT = 5100 // 按下 Upload 後多久開始滑出(毫秒;大腦約 3.6 秒開始長、約 5.1 秒長好)
const SLIDE = 800

let r = 0
let forEpoch = -1
let timer = 0
let raf = 0

const ease = (x: number) => 1 - (1 - x) ** 3

// 0 = 收起,1 = 完全滑出;沒有上傳關卡的話一律 1(跟著捲動/切換出現)
export const agentReveal = () => (!GATED ? 1 : forEpoch === entryEpoch() ? r : 0)

uploadGate.subscribe(() => {
  forEpoch = entryEpoch()
  r = 0
  window.clearTimeout(timer)
  cancelAnimationFrame(raf)
  timer = window.setTimeout(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      r = 1
      scrollStore.notify()
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const u = Math.min(1, (now - start) / SLIDE)
      r = ease(u)
      scrollStore.notify()
      if (u < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }, AGENT_REVEAL_AT)
})
