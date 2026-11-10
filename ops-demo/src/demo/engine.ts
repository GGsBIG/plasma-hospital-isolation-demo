import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { initialState, type DemoState } from "./store"
import { buildSteps, type Step, type Api } from "./scenes"

const q = (sel: string) => document.querySelector<HTMLElement>(`[data-t="${sel}"]`)

export type Mode = "auto" | "speaker"

export function useDemo() {
  const [s, setS] = useState<DemoState>(() => structuredClone(initialState))
  const ref = useRef<DemoState>(s)
  ref.current = s
  const apply = useCallback((patch: Partial<DemoState> | ((s: DemoState) => Partial<DemoState>)) => {
    const p = typeof patch === "function" ? patch(ref.current) : patch
    ref.current = { ...ref.current, ...p }
    setS(ref.current)
  }, [])

  const params = new URLSearchParams(location.search)
  const mode: Mode = params.get("mode") === "speaker" ? "speaker" : "auto"
  const startFast = params.has("fast")
  const startAt = Number(params.get("s") ?? 0)

  const [idx, setIdx] = useState(-1)
  const idxRef = useRef(-1)
  const runningRef = useRef(false)
  const pausedRef = useRef(false)
  const [paused, setPaused] = useState(false)
  // 每次跳段/重播都 +1；舊的播放迴圈與其 sleep 一發現 gen 變了就停手，避免兩個迴圈打架
  const genRef = useRef(0)

  const makeApi = useCallback((fast: boolean): Api => {
    const gen = genRef.current // 這個 api 屬於哪一輪播放；被跳段取代後其 sleep 就不再 resolve
    // 整體放慢倍率；並讓 sleep 支援暫停（暫停期間不倒數，故打字/游標中途按空白鍵也會停）
    const PACE = 1.7
    const sleep = (ms: number) =>
      new Promise<void>((res) => {
        if (gen !== genRef.current) return // 已被新一輪取代：讓這個 promise 永遠 pending，凍結舊步驟
        if (fast || ms <= 0) return res()
        let remaining = ms * PACE
        const stepMs = 50
        const id = setInterval(() => {
          if (gen !== genRef.current) { clearInterval(id); return } // 中途被取代 → 停手
          if (pausedRef.current) return
          remaining -= stepMs
          if (remaining <= 0) {
            clearInterval(id)
            res()
          }
        }, stepMs)
      })
    const moveTo = async (sel: string) => {
      const el = q(sel)
      if (!el) return
      const r = el.getBoundingClientRect()
      const x = r.left + r.width / 2
      const y = r.top + r.height / 2
      apply((st) => ({ cursor: { ...st.cursor, x, y } }))
      await sleep(720)
    }
    const click = async (sel: string) => {
      const el = q(sel)
      if (el) {
        const r = el.getBoundingClientRect()
        apply(() => ({ cursor: { x: r.left + r.width / 2, y: r.top + r.height / 2, clicking: true } }))
      }
      await sleep(180)
      apply((st) => ({ cursor: { ...st.cursor, clicking: false } }))
      await sleep(120)
    }
    const typeInto = async (setter: (v: string) => void, text: string, speed = 45) => {
      if (fast) { setter(text); return }
      let cur = ""
      for (const ch of text) {
        cur += ch
        setter(cur)
        await sleep(speed)
      }
    }
    return {
      fast,
      update: apply,
      sleep,
      moveTo,
      click,
      subtitle: (text) => apply({ subtitle: text }),
      chapter: (name) => apply({ chapter: name }),
      typeField: async (field, text, speed) =>
        typeInto((v) => apply((st) => ({ form: { ...st.form, [field]: v } })), text, speed),
      typeLogin: async (field, text, speed) =>
        typeInto((v) => apply({ [field]: v } as any), text, speed),
      typeChat: async (text, speed) =>
        typeInto((v) => apply({ chatInput: v }), text, speed ?? 55),
      typeColumnDesc: async (i, text, speed) =>
        typeInto(
          (v) => apply((st) => ({ columns: st.columns.map((c, k) => (k === i ? { ...c, desc: v } : c)) })),
          text,
          speed ?? 26
        ),
    }
  }, [apply])

  const steps: Step[] = useMemo(() => buildSteps(), [])

  // 重播到指定 index（用於 ←、跳段、?fast&s=N）：重置狀態再快速跑到 target
  const rebuildTo = useCallback(async (target: number) => {
    genRef.current++ // 取消任何進行中的播放迴圈，本次 rebuild 用新 gen
    ref.current = structuredClone(initialState)
    setS(ref.current)
    const api = makeApi(true)
    for (let k = 0; k <= target && k < steps.length; k++) {
      api.chapter(steps[k].scene)
      if (steps[k].sub) api.subtitle(steps[k].sub!)
      await steps[k].run(api)
    }
    idxRef.current = target
    setIdx(target)
  }, [makeApi, steps])

  const runStep = useCallback(async (k: number) => {
    if (k < 0 || k >= steps.length) return
    const api = makeApi(false)
    api.chapter(steps[k].scene)
    if (steps[k].sub) api.subtitle(steps[k].sub!)
    await steps[k].run(api)
    idxRef.current = k
    setIdx(k)
  }, [makeApi, steps])

  // autoplay loop（gen 一變就整個退出，讓跳段/重播能安全接手）
  // 無限輪播：一輪播完就重置回開頭再播，直到跳段/重播（gen 改變）才停
  const autoRun = useCallback(async () => {
    const gen = ++genRef.current
    runningRef.current = true
    let start = idxRef.current + 1
    // eslint-disable-next-line no-constant-condition
    while (true) {
      for (let k = start; k < steps.length; k++) {
        if (gen !== genRef.current) return
        while (pausedRef.current) {
          if (gen !== genRef.current) return
          await new Promise((r) => setTimeout(r, 120))
        }
        await runStep(k)
        if (gen !== genRef.current) return
        await new Promise((r) => setTimeout(r, 500))
      }
      // 一輪結束 → 停一下、重置回開頭，從頭再播
      if (gen !== genRef.current) return
      await new Promise((r) => setTimeout(r, 1200))
      if (gen !== genRef.current) return
      ref.current = structuredClone(initialState)
      setS(ref.current)
      idxRef.current = -1
      setIdx(-1)
      start = 0
    }
  }, [runStep, steps.length])

  // 片段列點擊：直接在記憶體內跳到該段（不重新載入頁面 → 不會閃登入頁），auto 模式接著往下播
  const jump = useCallback(async (target: number) => {
    pausedRef.current = false
    setPaused(false)
    await rebuildTo(Math.max(target, 0)) // 快速跑到 target（含），直接顯示該段畫面
    if (mode === "auto") autoRun()
  }, [rebuildTo, autoRun, mode])

  // init
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (startAt > 0 || startFast) {
        await rebuildTo(Math.min(startAt, steps.length - 1))
      }
      if (cancelled) return
      if (mode === "auto") autoRun()
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
        else document.exitFullscreen?.()
        return
      }
      if (e.key === "r" || e.key === "R") {
        idxRef.current = -1; setIdx(-1); runningRef.current = false
        ref.current = structuredClone(initialState); setS(ref.current)
        if (mode === "auto") setTimeout(autoRun, 100)
        return
      }
      if (mode === "auto") {
        if (e.key === " ") { e.preventDefault(); pausedRef.current = !pausedRef.current; setPaused(pausedRef.current) }
        return
      }
      // speaker mode
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault()
        if (!runningRef.current) { runningRef.current = true; runStep(idxRef.current + 1).finally(() => (runningRef.current = false)) }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        const t = idxRef.current - 1
        if (t >= -1 && !runningRef.current) { runningRef.current = true; rebuildTo(Math.max(t, 0)).finally(() => (runningRef.current = false)) }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mode, autoRun, runStep, rebuildTo, steps.length])

  return { s, idx, total: steps.length, mode, paused, jump }
}
