import { useCallback, useEffect, useRef, useState } from "react"
import { initialState, type DemoState } from "./store"
import { buildScenes, type Api } from "./scenes"
import { STEPS } from "@/sc/steps"

const q = (sel: string) => document.querySelector<HTMLElement>(`[data-t="${sel}"]`)
const PACE = 1.2 // 整體放慢倍率

/** 一次播一個情境:先把畫面快轉到這個情境開始前的狀態,再正常速度播放這個情境,播完停住 */
export function useDemo() {
  const [s, setS] = useState<DemoState>(() => structuredClone(initialState))
  const ref = useRef<DemoState>(s)
  ref.current = s
  const apply = useCallback((patch: Partial<DemoState> | ((s: DemoState) => Partial<DemoState>)) => {
    const p = typeof patch === "function" ? patch(ref.current) : patch
    ref.current = { ...ref.current, ...p }
    setS(ref.current)
  }, [])

  const genRef = useRef(0) // 換情境/重播時 +1,舊的播放一發現就停手
  const pausedRef = useRef(false)
  const [paused, setPaused] = useState(false)
  const [cur, setCur] = useState(0)

  const makeApi = useCallback((fast: boolean): Api => {
    const gen = genRef.current
    const sleep = (ms: number) =>
      new Promise<void>((res) => {
        if (gen !== genRef.current) return
        if (fast || ms <= 0) return res()
        let left = ms * PACE
        const id = setInterval(() => {
          if (gen !== genRef.current) { clearInterval(id); return }
          if (pausedRef.current) return
          left -= 50
          if (left <= 0) { clearInterval(id); res() }
        }, 50)
      })
    // Plasma 畫面是固定大小的框,再等比縮放放進窗格;游標畫在框裡,座標換算回框的座標系
    const center = (el: Element) => {
      const frame = document.querySelector<HTMLElement>("[data-plasma-frame]")
      const r = el.getBoundingClientRect()
      if (!frame) return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      const fr = frame.getBoundingClientRect()
      const k = fr.width / frame.offsetWidth || 1
      return { x: (r.left + r.width / 2 - fr.left) / k, y: (r.top + r.height / 2 - fr.top) / k }
    }
    const moveTo = async (sel: string) => {
      const el = q(sel)
      if (!el || fast) return
      apply((st) => ({ cursor: { ...st.cursor, ...center(el) } }))
      await sleep(760)
    }
    const click = async (sel: string) => {
      const el = q(sel)
      if (el && !fast) apply(() => ({ cursor: { ...center(el), clicking: true } }))
      await sleep(200)
      apply((st) => ({ cursor: { ...st.cursor, clicking: false } }))
      await sleep(160)
    }
    return {
      fast,
      update: apply,
      sleep,
      moveTo,
      click,
      focus: async (sel, text, hold = 900) => {
        if (fast) return
        apply({ spot: { sel, text } })
        await moveTo(sel)
        await sleep(hold)
      },
      type: async (set, text, speed = 50) => {
        if (fast) { apply(set(text)); return }
        let v = ""
        for (const ch of text) {
          v += ch
          apply(set(v))
          await sleep(speed)
        }
      },
    }
  }, [apply])

  const scenes = useRef(buildScenes()).current

  const play = useCallback(async (i: number) => {
    const n = Math.max(0, Math.min(scenes.length - 1, i))
    const gen = ++genRef.current
    pausedRef.current = false
    setPaused(false)
    setCur(n)
    // 快轉到這個情境開始前的狀態
    ref.current = structuredClone(initialState)
    setS(ref.current)
    const fastApi = makeApi(true)
    for (let k = 0; k < n; k++) await scenes[k](fastApi)
    if (gen !== genRef.current) return
    apply((st) => ({ scn: n, sub: 0, hot: null, spot: null, done: false, titleCard: false, epoch: st.epoch + 1 }))
    const api = makeApi(false)
    await scenes[n](api)
    if (gen !== genRef.current) return
    apply({ done: true, spot: null, sub: STEPS[n].subs.length })
  }, [apply, makeApi, scenes])

  const togglePause = useCallback(() => { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current) }, [])

  useEffect(() => { play(0) }, [play])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); togglePause() }
      else if (e.key === "ArrowRight") { e.preventDefault(); play(cur + 1) }
      else if (e.key === "ArrowLeft") { e.preventDefault(); play(cur - 1) }
      else if (e.key === "r" || e.key === "R") play(cur)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [cur, play, togglePause])

  return { s, cur, total: scenes.length, paused, play, togglePause }
}
