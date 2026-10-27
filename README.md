# Plasma 醫院資料隔離互動 Demo

純前端 React 單頁 demo(桌機與手機皆可,窄於 768px 時自動改為直式舞台、上下分割版面),等角(isometric)風格,右上角可切換淺色/深色模式(預設淺色,記住上次選擇),連線上有流動光點表示資料流。
左側六段說明隨頁面捲動,右側舞台固定。所有過場(節點移動、連線、負載數字、左側逐字浮現、
Agent 對話)都由捲動位置直接驅動,捲到一半停下就停在過場的一半,往回捲會倒轉。
也可用下方切換 bar(上一步/情境/下一步)或 ← → 鍵,頁面會平滑捲到該情境:

1. 現況架構 — 五套異質資料庫各自支撐一個醫院系統
2. 新應用加入 → 源頭過載 — AI/BI/FHIR/AP 直連源頭,負載飆高
3. 導入 Plasma 隔離 — 應用改接 Plasma,源頭負載回落
4. 整理後資料落地 PostgreSQL — Plasma 整理後的資料同步到服務用 PostgreSQL,再提供給 AP 使用
5. 匯入知識庫 — 文件/技術文件進 Plasma,中台理解業務語意
6. MCP 外接 AI Agent — Plasma 開 MCP,Agent 直接取得報表

## 開發

    npm install
    npm run dev      # 開發
    npm run build    # 產出 static 到 dist/
    npm run preview  # 預覽 build 結果

技術:Vite + React 19 + TypeScript + Tailwind + framer-motion。
情境內容在 `src/scenes.ts` 與 `src/data.ts`,改情境只改這兩個檔;過場插值在 `src/timeline.ts`;捲動進度放在 `src/scroll.ts` 的外部 store(不是 React state):逐格變化的位置、透明度、連線、文字浮現由 `useScrollEffect` 直接寫 DOM,元件只在離散狀態改變時用 `useScrollSelector` 重繪;過場捲動距離(`--scroll-step`)與左側段落間距(`--section-h`)在 `src/index.css` 開頭;最後一個情境後的 Agent 對話捲動長度是 `src/App.tsx` 的 `CHAT_SPAN`;節點座標為 1600×1100 舞台 px,平台尺寸與連線曲線在 `src/geometry.ts`。
