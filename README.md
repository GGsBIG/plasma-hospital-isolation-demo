# Plasma 醫院資料隔離互動 Demo

純前端 React 單頁 demo(桌機與手機皆可,窄於 768px 時自動改為直式舞台、上下分割版面),等角(isometric)風格,右上角可切換淺色/深色模式(預設淺色,記住上次選擇),連線上有流動光點表示資料流。
左側六段說明隨頁面捲動,右側舞台固定。所有過場(節點移動、連線、負載數字、左側逐字浮現、
Agent 對話)都由捲動位置直接驅動,捲到一半停下就停在過場的一半,往回捲會倒轉。
也可用下方切換 bar(上一步/情境/下一步)或 ← → 鍵,頁面會平滑捲到該情境。

每頁一個客戶痛點。舞台右上角可切換「導入前｜導入 Plasma 後」(鍵盤 P),
預設先顯示導入前;左側說明同時只顯示一段,切換時舊的淡出、新的逐字浮現。
離開該頁再回來會重新從導入前開始。最後一頁切到導入後,Agent 對話自動播放(可隨時手動捲動接手):

1. 醫院現況 — 五套資料庫分別支援 HIS、NIS、ERP、PACS、LIS(開場,不切換)
2. 新應用影響既有系統效能 — 新應用直接查詢正式資料庫 → 統一改由 Plasma 取得資料
3. 系統介接複雜、維護成本高 — 每個應用分別介接五套資料庫 → 透過 Plasma 只需介接一次
4. 跨院區資料無法整合 — 各院區 HIS 編碼不同 → Plasma 整合並統一代碼
5. AI 不了解院內資料 — 直連有風險、看不懂欄位代碼、回答不準確 → 知識庫與 Plasma 合體成「資料大腦」,AI 唯讀查詢、答案精準(問答泡泡對照同一個問題的回答)
6. 報表需求仰賴人工處理 — 資訊室人工撰寫 SQL → AI Agent 透過 MCP 數分鐘產出

## 開發

    npm install
    npm run dev      # 開發
    npm run build    # 產出 static 到 dist/
    npm run preview  # 預覽 build 結果

技術:Vite + React 19 + TypeScript + Tailwind + framer-motion。
情境內容在 `src/scenes.ts` 與 `src/data.ts`,改情境只改這兩個檔;過場插值在 `src/timeline.ts`;捲動進度放在 `src/scroll.ts` 的外部 store(不是 React state):逐格變化的位置、透明度、連線、文字浮現由 `useScrollEffect` 直接寫 DOM,元件只在離散狀態改變時用 `useScrollSelector` 重繪;過場捲動距離(`--scroll-step`)與左側段落間距(`--section-h`)在 `src/index.css` 開頭;最後一個情境後的 Agent 對話捲動長度是 `src/App.tsx` 的 `CHAT_SPAN`;節點座標為 1600×1100 舞台 px,平台尺寸與連線曲線在 `src/geometry.ts`。
