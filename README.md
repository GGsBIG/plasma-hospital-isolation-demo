# Plasma 醫院資料隔離互動 Demo

## 這個 repo 裡還有

| 資料夾 | 內容 |
|---|---|
| `hub/` | Demo 入口頁與 Plasma 元件總覽(React),`hub/build.sh` 產生上傳 WordPress 的 zip |
| `ui-demo/` | 醫院 UI 操作 demo(React) |
| `views-demo/` | View 與 Materialized View 圖解(React,沿用資料隔離 demo 的引擎,切換改成 View／Materialized View) |
| `ops-demo/` | Plasma 操作 demo(React),官網 bbg-web 的 `public/plasma-demo/` 也是它 build 出來的 |
| `powerbi/` | Plasma × Power BI 簡報對外版(靜態 HTML) |


純前端 React 單頁 demo(桌機與手機皆可,窄於 768px 時自動改為直式舞台、上下分割版面),等角(isometric)風格,右上角可切換淺色/深色模式(預設淺色,記住上次選擇),連線上有流動光點表示資料流。
左側九段說明隨頁面捲動,右側舞台固定。所有過場(節點移動、連線、負載數字、左側逐字浮現、
Agent 對話)都由捲動位置直接驅動,捲到一半停下就停在過場的一半,往回捲會倒轉。
用下方切換 bar(上一步/情境/下一步)、← → 鍵、點左側說明卡片、點上方進度條的任一段(一頁一段)換頁時,會直接切到該情境(不刷過中間頁),再從頭完整播放那一頁:節點依資料流順序升起、連線依序畫出、左側說明逐字浮現、分幕輪播從第 1 幕、大腦頁的文件上傳與大腦重新長出、最後一頁導入後的 Agent 對話重新播放(進場時間軸在 `src/entry.ts`)。手機版不能滑動換頁,只靠點上方進度條(或自動播放)切換情境;Agent 對話清單仍可用手指捲動。
舞台右上角的重播鈕(或 R 鍵)只重播目前這一頁;切換導入前／導入後時,該頁的分幕、大腦與對話也從頭開始。手動捲動仍是捲動驅動(捲到一半停在一半)。

左側說明欄底部有圖例(連線與徽章顏色的意思)。
自動播放:底部切換列左邊的「自動播放」(或空白鍵),從目前這頁開始,每頁先播導入前(有輪播的頁等一整輪)、自動切到導入後、再換下一頁,最後一頁等 Agent 對話播完才停;任何手動操作(方向鍵、P、點擊、滾輪、觸控)都會中斷。流程在 `src/App.tsx`,開關在 `src/autoplay.ts`。
第一次引導:還沒切換過導入前後的人,「導入 Plasma 後」按鈕會脈動並浮出提示,切過一次就不再出現(記在 localStorage)。

每頁一個客戶痛點。舞台右上角可切換「導入前｜導入 Plasma 後」(鍵盤 P),
預設先顯示導入前;左側說明導入前、導入後兩段都顯示,目前狀態那段全亮、另一段淡化。
換到別頁(切換列、方向鍵、進度條、說明卡片或捲動)一律從導入前開始。切到導入後,新出現的連線依資料流先後(源頭資料庫 → Plasma → 應用)以柔邊逐步畫出,消失時淡出。最後一頁切到導入後,Agent 對話自動播放(可隨時手動捲動接手):

1. 醫院現況 — 五套資料庫分別支援 HIS、NIS、ERP、PACS、LIS(開場,不切換)
2. 保護核心資料庫 — 新應用直連正式資料庫,門診、護理系統變慢 → 改向 Plasma 取用
3. API 串接蜘蛛網化 — 每個應用各接五套資料庫、SQL 寫法不同,停用系統的 API 還開著 → 只接 Plasma、同一種 SQL
4. 手工合併資料 — 人工逐一匯出、Excel 合併 → 健保申報、評鑑資料直接產出
5. 跨院區資料不同步 — 分院透過 DB Link 等凌晨離峰拉資料 → 各院區即時同步
6. FHIR 對外交換 — FHIR 轉檔直連核心資料庫、代碼不一 → Plasma 統一代碼,FHIR Server 只向 Plasma 取資料
7. AI 的資安與效能風險 — 地端 AI 大量查詢、誤下 DELETE 讓資料庫停機 → 只能讀取
8. AI 不了解院內資料(Plasma 大腦) — 欄位是代碼,AI 答錯 → 按 Upload 匯入資料字典,大腦長出,AI 答得出正確數字
9. 跨部門溝通成本 — AI 部門與 IT 來回協調數月 → AI Agent 透過 MCP 自己取資料(對話自動播放)
10. 總覽 — 不是情境:對話播完後再往下(或點切換列「總覽」),八張問題卡由紅轉綠,點卡片回到該頁(`src/components/Recap.tsx`,位置在 `src/timeline.ts` 的 `RECAP_AT`)

## 效能

- 連線上流動的光點(含 slow 的轉圈、打勾)全部畫在 Stage 的一張 canvas 上,每秒 30 格(`src/components/dots.ts`);連線本身是靜態 SVG,不必每格重畫整張連線圖。
- 會一直動的東西(過載紅光、冒煙、齒輪、Plasma 圓環、大腦訊號光點)都放在 SVG 外的 HTML 圖層,只動 transform / opacity,交給 GPU 合成;不用模糊濾鏡(改用漸層)。
- 看不見的節點與連線一律 `display: none`(裡面的動畫跟著停);分頁在背景時全部暫停。
- 捲動用瀏覽器原生捲動(沒有平滑捲動套件),過場與捲動等速、沒有停留區;按鈕與方向鍵用原生的短平滑捲動。
- 全站節點與連線在載入時一次建好(`structure()`),之後只切換顯示,跨頁不拆掉重建;每格只計算目前畫面狀態裡的節點與連線。
- 靜止時主執行緒負擔(headless Chrome、2 倍密度、軟體合成量測):多數頁面約 2–10%,改版前 17–41%。

## 開發

    npm install
    npm run dev      # 開發
    npm run build    # 產出 static 到 dist/
    npm run preview  # 預覽 build 結果

技術:Vite + React 19 + TypeScript + Tailwind + framer-motion。
資料庫品牌圖示在 `src/assets/db/`(取自 Simple Icons,官方色;MS SQL 與 IBM 已從新版 Simple Icons 移除,取自 v9.0.0;Informix 沒有獨立圖示,用 IBM)。

情境內容在 `src/scenes.ts` 與 `src/data.ts`,改情境只改這兩個檔;過場插值在 `src/timeline.ts`;捲動進度放在 `src/scroll.ts` 的外部 store(不是 React state):逐格變化的位置、透明度、連線、文字浮現由 `useScrollEffect` 直接寫 DOM,元件只在離散狀態改變時用 `useScrollSelector` 重繪;過場捲動距離(`--scroll-step`)與左側段落間距(`--section-h`)在 `src/index.css` 開頭;最後一個情境後的 Agent 對話捲動長度是 `src/App.tsx` 的 `CHAT_SPAN`;節點座標為 1600×1100 舞台 px,平台尺寸與連線曲線在 `src/geometry.ts`。

## 素材授權

- 大腦圖示:「Brain」by Clockwise from the Noun Project(CC BY 3.0),畫面右下角(大腦頁導入後)附標註。
- 文件圖示:「File」系列 by Febri Ardianto from the Noun Project(CC BY 3.0),同一行標註。
- 知識庫立方體圖示:「knowledge」by Suwarjo from the Noun Project(CC BY 3.0),同一行標註。
- 資料庫品牌圖示:取自 Simple Icons,各品牌商標屬其所有人。
