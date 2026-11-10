import { createRoot } from "react-dom/client"
import "./index.css"
import { App } from "./App"

// 整體比例:介面以約 1200px 寬設計,螢幕越寬整頁等比放大(最多 1.6 倍),字與元件一起變大。
// 用 CSS zoom 放大整頁;假游標的座標來自 getBoundingClientRect,在放大後的座標系裡一樣準。
const DESIGN_W = 1200
function fit() {
  const z = Math.min(1.6, Math.max(1, Math.min(innerWidth / DESIGN_W, innerHeight / 750)))
  document.documentElement.style.setProperty("zoom", String(Math.round(z * 100) / 100))
}
fit()
addEventListener("resize", fit)

// 不用 StrictMode：這是動畫 demo，命令式時間軸不需要開發期雙掛載
createRoot(document.getElementById("root")!).render(<App />)
