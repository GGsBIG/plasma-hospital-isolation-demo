import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { existsSync, readFileSync, statSync } from "fs"
import { extname, join, resolve } from "path"

// 開發時讓入口卡也點得進各個 demo:
// /ncsist/、/hospital/、/ui-hospital/ 讀 ./build.sh 產出的 release/demos/;/powerbi/ 直接讀 repo 的 powerbi/
const DEMO_DIRS: Record<string, string> = {
  ncsist: resolve(__dirname, "release/demos/ncsist"),
  hospital: resolve(__dirname, "release/demos/hospital"),
  "ui-hospital": resolve(__dirname, "release/demos/ui-hospital"),
  ops: resolve(__dirname, "release/demos/ops"),
  powerbi: resolve(__dirname, "../powerbi"),
}
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
}

function serveDemos(): Plugin {
  return {
    name: "serve-demos",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = decodeURIComponent((req.url ?? "").split("?")[0])
        const m = path.match(/^\/([^/]+)(\/.*)?$/)
        const dir = m && DEMO_DIRS[m[1]]
        if (!dir) return next()
        if (!m[2]) { res.writeHead(302, { Location: `/${m[1]}/` }); return res.end() }
        if (!existsSync(dir)) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
          return res.end(`還沒有 ${m[1]} 的 build:先在 hub 執行 ./build.sh`)
        }
        let file = join(dir, m[2])
        if (!file.startsWith(dir)) return next()
        if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html")
        if (!existsSync(file)) return next()
        res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" })
        res.end(readFileSync(file))
      })
    },
  }
}

// 兩頁的多頁網站:入口頁(/)與元件總覽(/tech/)。相對路徑,放在任何子資料夾都能用
export default defineConfig({
  base: "./",
  plugins: [react(), serveDemos()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        tech: resolve(__dirname, "tech/index.html"),
      },
    },
  },
})
