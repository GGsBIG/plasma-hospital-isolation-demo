# Plasma Demo 入口(hub)

業務展示用的入口頁與給技術人員看的元件總覽。React + Vite 多頁專案,沿用官網 bbg-web 首頁的設計(紅橋背景、輪播主標、紅邊入口卡)。

    npm install
    npm run dev       # 開發:http://localhost:5173/ 與 /tech/;入口卡也點得進各 demo(要先跑過一次 ./build.sh)
    ./build.sh        # 產生 WordPress 用的 HTML 與 zip(見 WORDPRESS.md)

| 檔案 | 內容 |
|---|---|
| `src/home.tsx` | 入口頁:主標輪播 `HEADS`、入口卡 `CARDS` |
| `src/tech.tsx` | 元件總覽頁面版型 |
| `src/techData.tsx` | 12 個元件的內容,整理自 https://plasma-docs.brobridge.workers.dev/zh-Hant/ ,文件沒寫的不寫 |
| `src/site.css` | 共用設計 token、頁首、按鈕 |
| `src/pages/*.css` | 各頁樣式 |
