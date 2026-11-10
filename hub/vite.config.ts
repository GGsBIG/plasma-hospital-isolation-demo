import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

// 兩頁的多頁網站:入口頁(/)與元件總覽(/tech/)。相對路徑,放在任何子資料夾都能用
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        tech: resolve(__dirname, "tech/index.html"),
      },
    },
  },
})
