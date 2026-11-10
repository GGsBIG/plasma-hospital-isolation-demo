# Plasma UI Demo Animation · 醫院病史整合版（React）

Plasma 真實前端的 React demo animation，醫院情境（由零售 BI 版 re-theme 而來），兩幕故事：

**第一幕（Plasma UI）**：連接院內異質系統（HIS 門診住院 / LIS 檢驗 / EMR 病歷庫）→ 上傳系統資料字典、
病歷整合規格書 → 讓平台理解每個欄位（Auto-Describe，天書欄位 DX_CD／RX_FLG 變中文描述）。

**第二幕（AI Agent + MCP → 回 Plasma）**：門診醫師在 AI Agent 上傳一張病人病歷截圖，問
「這位病人的門診、住院、檢驗、影像、用藥紀錄散在不同系統，幫我整合成一份病史摘要，並給我一個診間能直接叫用的 API」
→ Plasma 透過 MCP 辨識每個病史區塊對應的來源系統與整合方式、產生 SQL 給醫師確認 → 自動建立
Materialized View（patient_summary）與對外病史 Data API → 回 Plasma 看到 API，接回診間病史檢視器後
畫面立刻整合出完整病史。醫師全程不用寫 SQL、不用知道資料在哪。

- 重用 Plasma 前端的設計 token（`--sidebar-ring` 品牌藍、直角卡片、side nav）與 shadcn 風格元件
  （輕量 presentational 版，無後端／無 i18n，全用寫死的 demo 資料）。
- 天書欄位為 HIS `PT_VST_M`（VST_NO／DX_CD／RX_FLG…），AI 生成的欄位描述為繁中。病史／檢驗／用藥皆為
  寫死的 demo 值（病人 P000123），非真實病歷。

## 啟動
```bash
cd demos/plasma-ui-demo
npm install
npm run dev            # http://localhost:5173
```

從 **Plasma 登入畫面**開始，整體節奏放慢（適合現場講解）。

## 播放模式（URL 參數）
- `?mode=auto`　自動連播，**按空白鍵暫停／繼續**（暫停會即時凍結，連打字、游標移動中途都能停）— 適合展場輪播、螢幕錄影。預設就是這個模式。
- `?mode=speaker`　講者控制（→ 下一步 · ← 上一步 · R 重播 · F 全螢幕）— 適合現場帶操作。
- `?fast&s=N`　直接跳到第 N 步（0 起算），用於驗收／截圖。

## 配音版 vs 無聲版
- **無聲版（預設）**：不帶 `?voice` 就是無聲，只有字幕。
- **配音版**：加 `?voice`，播放**繁體中文真人配音**（`public/audio/*.mp3`，由 zh-TW 神經語音預先產生）。可與任何模式併用，例如 `?mode=auto&voice`。播放中按 **V** 可即時開/關配音，空白鍵暫停時旁白一起停。
  - 部分瀏覽器首句需先有一次使用者互動才會發聲；直接按一下 V 或空白鍵即可解鎖。
  - 音檔缺漏時會自動退回瀏覽器內建 TTS，不會沒聲音。

### 重新產生配音（改了字幕就要重跑）
音檔對照表 `public/audio/manifest.json`（字幕文字 → 檔名）由腳本產生，`src/demo/voice.ts` 照字幕查表播放。
```bash
# 預設：edge-tts 免費 zh-TW 女聲（HsiaoChen），無需金鑰
python3 scripts/make_audio.py
# 換男聲
VOICE=zh-TW-YunJheNeural python3 scripts/make_audio.py
# 改用 ElevenLabs（需 ELEVEN_API_KEY 或 animation_demo/.eleven_key）
python3 scripts/make_audio.py --eleven
```
腳本會自動從 `src/demo/scenes.ts` 抓所有字幕，逐句轉 mp3、覆蓋 `public/audio/`，不會漏句也不用手動維護清單。

> 放慢倍率在 `src/demo/engine.ts` 的 `PACE`（預設 1.7）；游標速度在 `src/index.css` 的 `.demo-cursor` transition。

## 步驟 index（?fast&s=N 可跳，共 21 步）
> 註：預設 auto 模式跑到最後會重置回開頭重播；要凍結在某一步截圖／驗收，加 `mode=speaker`，例如 `?mode=speaker&fast&s=20`。

| step | 內容 |
|---|---|
| 0 | 前情提要：講今天的目標＝醫師問一句就掌握病人跨系統病史、甚至產出報告（畫面停在登入頁） |
| 1 | 說明資料散在 HIS／LIS／EMR、欄位是天書 → 要先讓 Plasma 讀懂 |
| 2 | Plasma 登入畫面 → 打字 admin / 密碼 |
| 3 | 按 Sign In → 進入 Workspace（Database 頁） |
| 4–7 | 連接 his_oltp（填連線 → Verify → Save），再快速接 lis_db、emr_sink |
| 8–11 | 點 Tables 進詳情 → View Data（原始資料）→ View Schema（天書欄位） |
| 12–13 | 上傳「就診紀錄欄位說明」「病歷整合規格書」→ AI 分析 |
| 14–15 | 開 PT_VST_M 編輯描述 → AI 逐欄生成中文描述（DX_CD／RX_FLG…）→ 儲存 |
| 16 | 切到 AI Agent → 按一下接上 Plasma MCP（Connected · Authorized in Plasma · 3 tools） |
| 17–18 | 醫師問 Q1（P000123 這一年就診重點）→ AI 跨 HIS／LIS 作答＋`Used Plasma MCP` |
| 19 | 醫師問 Q2（血糖控制／腎功能）→ AI 依整合資料回答注意事項 |
| 20 | 醫師請 AI「產出病史摘要報告」→ 對話裡直接生出一份**病史摘要報告**（不需另外的 BI 面板） |

## 檔案地圖
- `src/demo/scenes.ts`　腳本（要改流程／文案／醫師三句提問 Q1–Q3 改這裡）
- `src/demo/data.ts`　連線值、文件名、PT_VST_M 欄位＋中文描述、MCP 設定
- `src/demo/engine.ts`　時間軸引擎（autoplay／speaker、假游標、打字、重播）
- `src/demo/Overlay.tsx`　假游標＋字幕條＋片段選單（CHAPTERS）
- `src/dialogs/Dialogs.tsx`　對話框（Add DB / Upload / Schema / Data / Edit Desc / **Add MCP**）
- `src/agent/ChatGPTAgent.tsx`　外部 AI Agent 面板（Plasma MCP connector＋問答＋`ReportBlock` 病史摘要報告）
- `src/opencode/DashboardMock.tsx`　`ContributionDashboard`：病史摘要報告的內容（filled）
- `src/app/Shell.tsx`　側欄／頂列／DB 頁／**MCP 頁**（Materialized View／Data API 頁保留但流程未走到）
- `src/components/ui.tsx`　輕量 shadcn 風格原件（className 對齊真前端）
- token：`src/index.css`（CSS 變數）＋ `tailwind.config.js`

> 範圍外（未做）：ElevenLabs 旁白與 mp4 render（autoplay 模式可直接螢幕錄影）、接真實後端。
