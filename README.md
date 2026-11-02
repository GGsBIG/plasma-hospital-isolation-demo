# Plasma 醫院資料隔離互動 Demo

純前端 React 單頁 demo(桌機與手機皆可,窄於 768px 時自動改為直式舞台、上下分割版面),等角(isometric)風格,右上角可切換淺色/深色模式(預設淺色,記住上次選擇),連線上有流動光點表示資料流。
左側六段說明隨頁面捲動,右側舞台固定。所有過場(節點移動、連線、負載數字、左側逐字浮現、
Agent 對話)都由捲動位置直接驅動,捲到一半停下就停在過場的一半,往回捲會倒轉。
也可用下方切換 bar(上一步/情境/下一步)或 ← → 鍵,頁面會平滑捲到該情境。

每頁一個客戶痛點。舞台右上角可切換「導入前｜導入 Plasma 後」(鍵盤 P),
預設先顯示導入前;左側說明同時只顯示一段,切換時舊的淡出、新的逐字浮現。
離開該頁再回來會重新從導入前開始。切到導入後,新出現的連線依資料流先後(源頭資料庫 → Plasma → 應用)以柔邊逐步畫出,消失時淡出。最後一頁切到導入後,Agent 對話自動播放(可隨時手動捲動接手):

1. 醫院現況 — 五套資料庫分別支援 HIS、NIS、ERP、PACS、LIS(開場,不切換)
2. 保護核心資料庫 — 導入前:過載資料庫冒煙、資料流時快時停,工作站轉圈等待資料 → 改接 Plasma,資料庫圍在「核心資料庫 · 受保護」防護框內,既有系統正常運作
3. API 串接蜘蛛網化 — 20 條 API 直連、資料庫過載、各家 SQL 語法不同(對照卡),加上停用系統的廢棄 API(資安破口)→ Plasma 單一入口、統一 SQL
4. 手工合併資料 — 導入前循環播放:人工依序到 Oracle → PostgreSQL → MS SQL → MySQL → Informix 匯出(每次先畫出「去要資料」、再畫出「檔案送回來」的柔邊連線,舊連線淡出;步驟卡顯示第幾天)→ Excel 手動合併 → 產出健保申報、評鑑資料(需人工核對、版本不一)→ 主管:數字對不上,從頭來過 → Plasma 自動整合,自動產出、單一版本
5. 跨院區資料不同步 — 導入前循環播放:白天看診尖峰不能拉資料 → 凌晨 02:00 離峰,分院透過 DB Link 向總院拉資料(柔邊連線依序畫出)→ 隔天 08:00 分院才看得到(資料是昨天的)→ 切到導入後,總院、北區、南區依序與 Plasma 畫出一來一回的柔邊連線(雙向即時同步),分院即時可查
6. FHIR 對外交換 — FHIR Server 直連五套資料庫(過載)、與診所／藥局格式不一 → 資料庫 → Plasma → PostgreSQL 服務資料庫 → FHIR Server → 診所／藥局;進 Plasma 前光點依來源各一色(格式不一),出來後統一成同一色
7. AI 的資安與效能風險 — 導入前循環播放:AI 大量查詢、資料庫過載 → 每輪隨機挑 3 台資料庫、隨機順序被 DELETE 打掛(晃動後停機、對應系統停擺,間隔一短一長)→ 跳出「重大事故(Sev-1)」警報卡與法定通報時限 → Plasma 唯讀、權限控管
8. AI 不了解院內資料 — 切到導入後:五份文件(系統規格書、資料庫描述、資料字典、欄位代碼說明、使用者手冊,圖示在 `src/fileIcons.ts`)浮現後一份份飛進知識庫;知識庫落下疊到 Plasma 上合體;神經網路大腦由內往外長出(`src/components/BrainNet.tsx`,資料在 `src/brainNet.ts`)。互動:訊號光點沿連線流動、滑鼠移到大腦上探照附近節點、點一下從點擊處發出漣漪、定時有一道綠色訊號從知識庫經大腦傳向 AI
9. 跨部門溝通成本 — AI 部門與 IT 部門的協調過程以泡泡輪播(需要資料 → 找資料 2 週 → 資料不對再來 ×2 → 半年後完成 → 負責人離職重新協調)→ AI Agent 透過 MCP 自助取得資料
10. 總覽(Agent 對話播完後再往下捲,或切換列的「總覽」)— 8 個痛點卡片先是紅色,依序轉成綠色;點卡片回到該頁

## 效能

- 連線上流動的光點(含 slow 的轉圈、打勾)全部畫在 Stage 的一張 canvas 上,每秒 30 格(`src/components/dots.ts`);連線本身是靜態 SVG,不必每格重畫整張連線圖。
- 會一直動的東西(過載紅光、冒煙、齒輪、Plasma 圓環、大腦訊號光點)都放在 SVG 外的 HTML 圖層,只動 transform / opacity,交給 GPU 合成;不用模糊濾鏡(改用漸層)。
- 看不見的節點與連線一律 `display: none`(裡面的動畫跟著停);結尾總覽蓋住時整個舞台隱藏;分頁在背景時全部暫停。
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
- 資料庫品牌圖示:取自 Simple Icons,各品牌商標屬其所有人。
