import { createRoot } from "react-dom/client"
import "./index.css"
import { App } from "./App"

// 不用 StrictMode:這是動畫 demo,命令式時間軸不需要開發期雙掛載
createRoot(document.getElementById("root")!).render(<App />)
