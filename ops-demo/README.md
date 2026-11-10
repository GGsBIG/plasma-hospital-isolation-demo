# Plasma UI Demo Animation（React）

看起來就是 Plasma 真實前端的 React demo animation，兩幕故事：

**第一幕（Plasma UI）**：連接資料庫 → 上傳描述文件 → 讓平台理解每個欄位
（Auto-Describe，天書欄位 AMT1／FLG_X 變中文描述）。

**第二幕（OpenCode + MCP → 回 Plasma）**：使用者在 OpenCode 上傳一張 Power BI 儀表板截圖，
說「我想取得這些指標的 API」→ Plasma 透過 MCP 辨識每個指標對應的資料來源與算法、產生 SQL 給使用者
確認 → 自動建立 Materialized View（bi_dashboard）與對外 Data API → 回 Plasma UI 看到 API，接回
Power BI 後畫面立刻有資料。使用者全程不用寫 SQL、不用知道資料在哪。

- 重用 Plasma 前端的設計 token（`--sidebar-ring` 品牌藍、直角卡片、side nav）與 shadcn 風格元件
  （輕量 presentational 版，無後端／無 i18n，全用寫死的 demo 資料）。
- 資料沿用 workshop 的 Oracle ERP `T_ORD_M` 難懂欄位（AMT1／FLG_X…），AI 生成的欄位描述為繁中。

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

## 步驟 index（?fast&s=N 可跳，共 27 步）
| step | 內容 |
|---|---|
| 0 | 前情提要：先秀**空面板**（完全沒數值的 Power BI 儀表板）＝今天要完成的目標 |
| 1 | 說明每格數字要跨多庫拉資料＋運算 → 收起面板，回登入起點 |
| 2 | Plasma 登入畫面 → 打字 admin / 密碼 |
| 3 | 按 Sign In → 進入 Workspace（Database 頁） |
| 4–7 | 連接 oracle_erp（填連線 → Verify → Save），再快速接 mysql_crm、dw_sink |
| 8–11 | 點 Tables 進詳情 → View Data（原始資料）→ View Schema（天書欄位） |
| 12–13 | 上傳「欄位說明」「系統規格書」→ AI 分析 |
| 14–15 | 開 T_ORD_M 編輯描述 → AI 逐欄生成中文描述 → 儲存 |
| 16 | **MCP 頁 → Add MCP**：填 name / endpoint / 目標 agent（ChatGPT） |
| 17 | Create & Connect → MCP 列表新增 plasma-mcp（Ready），工具開放並授權給 ChatGPT |
| 18 | 切到 ChatGPT：因已在 Plasma 授權，一進來就顯示 Connected（Authorized in Plasma） |
| 19 | 上傳 Power BI 截圖 + 問「我想取得這些指標的 API」 |
| 20 | AI 透過 Plasma MCP 辨識 4 指標 → 指標對應表（來源 / 算法） |
| 21 | AI 產生 SQL（CREATE MATERIALIZED VIEW bi_dashboard）給確認 |
| 22 | 使用者確認 → 透過 MCP 建 MView + 產生 Data API |
| 23–24 | 回 Plasma → Materialized View 頁看到 bi_dashboard（Ready）→ 複製 Data API |
| 25–26 | Power BI 取得資料 → **OData 摘要** 貼上 API → 確定 → **空面板全部填滿數值** |

## 檔案地圖
- `src/demo/scenes.ts`　兩幕腳本（要改流程／文案改這裡）
- `src/demo/data.ts`　連線值、文件名、T_ORD_M 欄位＋中文描述、MCP 設定、BI 指標／SQL／API URL
- `src/demo/engine.ts`　時間軸引擎（autoplay／speaker、假游標、打字、重播）
- `src/demo/Overlay.tsx`　假游標＋字幕條＋片段選單（CHAPTERS）
- `src/dialogs/Dialogs.tsx`　對話框（Add DB / Upload / Schema / Data / Edit Desc / **Add MCP**）
- `src/agent/ChatGPTAgent.tsx`　外部 ChatGPT 面板（Plasma MCP connector，已授權）
- `src/opencode/DashboardMock.tsx`　Power BI 縮圖 mock（截圖用）
- `src/opencode/PowerBIDashboard.tsx`　擬真 Power BI Desktop（`dashFilled`：空面板／填值）
- `src/app/Shell.tsx`　側欄／頂列／DB 頁／**MCP 頁**／Materialized View 頁／Data API 頁
- `src/components/ui.tsx`　輕量 shadcn 風格原件（className 對齊真前端）
- token：`src/index.css`（CSS 變數）＋ `tailwind.config.js`

> 範圍外（未做）：ElevenLabs 旁白與 mp4 render（autoplay 模式可直接螢幕錄影）、接真實後端。
