// 秀傳 demo 的七個情境:只示範 A 分院,最後跨院交換。文字只留最重要的
export interface ScenarioDef {
  title: string // 標題卡與情境圖上的標題
  short: string // 下方按鈕
  goal: string // 標題卡上的一句話
  done: string // 播完的一句話
  subs: string[] // 情境圖上的子步驟
  main: "plasma" | "scn" // 這個情境預設放大哪個畫面
}

export const STEPS: ScenarioDef[] = [
  { title: "總院統計不出來", short: "現況", goal: "四家分院寫法都不同，資料兜不起來。", done: "問題不是沒資料，是接不起來。", subs: ["四家各自一套資料庫", "寫法都不同", "總院統計不出來"], main: "scn" },
  { title: "登入 Plasma", short: "登入", goal: "從 A 分院開始。", done: "已登入。", subs: ["輸入帳號", "登入"], main: "plasma" },
  { title: "接上 A 分院資料庫", short: "接上資料庫", goal: "唯讀接上，不動原系統。", done: "A 分院已唯讀接上。", subs: ["新增資料庫", "驗證並儲存"], main: "plasma" },
  { title: "AI 看懂欄位", short: "AI 看懂欄位", goal: "上傳系統文件，AI 就懂代碼的意思。", done: "TITLE_CD = N02，就是護理師。", subs: ["上傳文件", "AI 讀文件", "欄位有了說明"], main: "plasma" },
  { title: "用問的整理資料", short: "問答整理", goal: "問一句，整理出護理人員名冊。", done: "一句話，名冊整理好。", subs: ["提問", "AI 查詢", "名冊完成"], main: "plasma" },
  { title: "上架資料產品", short: "資料產品", goal: "名冊發布成資料產品，自動更新。", done: "名冊已上架。", subs: ["新增", "命名", "發布"], main: "plasma" },
  { title: "跨院交換", short: "跨院交換", goal: "四家都整理好，總院直接彙整。", done: "四家同一格式，合計 812 人（示意）。", subs: ["四家完成", "切到總院", "取用資料產品", "彙整"], main: "plasma" },
]
