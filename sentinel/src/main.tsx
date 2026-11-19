import { useCallback, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { App } from "./App"
import { Lesson } from "./lesson/Lesson"
import { LESSON } from "./lesson/steps"

// 網址:#/3 = 圖解第 3 步(預設);#/ui/2 = 實際操作畫面第 2 個情境
function parse() {
  const h = location.hash.replace(/^#\/?/, "")
  const ui = h.match(/^ui\/?(\d+)?/)
  if (ui) return { ui: true, n: Math.max(0, (Number(ui[1]) || 1) - 1) }
  const n = Number(h) || 1
  return { ui: false, n: Math.max(0, Math.min(LESSON.length - 1, n - 1)) }
}

let lastStep = 0 // 從實際操作畫面回來時,回到剛剛那一步

function Root() {
  const [r, setR] = useState(parse)
  useEffect(() => {
    const on = () => setR(parse())
    window.addEventListener("hashchange", on)
    return () => window.removeEventListener("hashchange", on)
  }, [])
  const go = useCallback((i: number) => {
    const n = Math.max(0, Math.min(LESSON.length - 1, i))
    history.replaceState(null, "", `#/${n + 1}`)
    setR({ ui: false, n })
  }, [])
  // 實際操作畫面每次進來都從指定情境重新播
  if (r.ui) return <App key={r.n} start={r.n} back={`#/${lastStep + 1}`} />
  lastStep = r.n
  return <Lesson step={r.n} go={go} />
}

// 不用 StrictMode:這是動畫 demo,命令式時間軸不需要開發期雙掛載
createRoot(document.getElementById("root")!).render(<Root />)
