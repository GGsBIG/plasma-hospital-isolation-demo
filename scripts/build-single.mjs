// 產生單一 HTML 檔(JS、CSS、圖片全部內嵌),雙擊即可用瀏覽器開啟,不需安裝或架站。
// 直接開 file:// 時瀏覽器不允許載入外部的 JS 模組檔,所以必須全部內嵌。
//
//   npm run build:single   →  dist-single/plasma-hospital-demo.html
import { build } from "vite"
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs"
import { join } from "node:path"

const tmp = "dist-single/.tmp"
const out = "dist-single/plasma-hospital-demo.html"

rmSync("dist-single", { recursive: true, force: true })
await build({
  base: "./",
  logLevel: "warn",
  build: {
    outDir: tmp,
    // 圖片(logo、svg)一律轉成 base64 內嵌進 JS/CSS
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: false,
    // 刻意打成單一檔,大小警告不適用
    chunkSizeWarningLimit: Number.MAX_SAFE_INTEGER,
  },
})

const assets = join(tmp, "assets")
const files = readdirSync(assets)
let html = readFileSync(join(tmp, "index.html"), "utf8")

// 把 <link rel="stylesheet"> 換成 <style>、<script src> 換成內嵌 <script>。
// 用函式當替換值,避免程式碼裡的 $& 之類被當成取代語法;"</script" 要跳脫才不會提早結束標籤
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/assets\/([^"]+)"[^>]*>/g, (_, f) =>
  `<style>${readFileSync(join(assets, f), "utf8")}</style>`)
html = html.replace(/<script type="module" crossorigin src="\.\/assets\/([^"]+)"><\/script>/g, (_, f) =>
  `<script type="module">${readFileSync(join(assets, f), "utf8").replace(/<\/script/gi, "<\\/script")}</script>`)

const leftover = html.match(/\.\/assets\/[^"')\s]+/g)
if (leftover) throw new Error(`仍有未內嵌的資源:${leftover.join(", ")}(assets: ${files.join(", ")})`)

mkdirSync("dist-single", { recursive: true })
writeFileSync(out, html)
rmSync(tmp, { recursive: true, force: true })
console.log(`${out}  ${(html.length / 1024).toFixed(0)} KB`)
