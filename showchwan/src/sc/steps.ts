// 秀傳 demo 的七個情境:只示範 A 分院(三套資料庫)。文字只留最重要的
export interface ScenarioDef {
  title: string // 情境圖上的標題
  short: string // 下方按鈕
  done: string // Plasma 操作播完的一句話
  subs: string[] // 情境圖自己的子步驟(依時間自己播)
  pains: string[] // 這個情境要解決的痛點(條列)
  how: string // 在 Plasma 裡怎麼做(現況頁的路線圖用)
  main: "plasma" | "scn" // 這個情境預設放大哪個畫面
}

export const STEPS: ScenarioDef[] = [
  { title: "整理資料很麻煩", short: "現況", done: "三種語法、欄位看不懂，整理一份名冊要好幾天。", subs: ["三套資料庫", "三種語法", "欄位看不懂", "Oracle 很忙"], pains: ["三套資料庫，三種 SQL 語法", "Schema 看不懂", "整理一份名冊要好幾天", "Oracle 負載高"], how: "", main: "scn" },
  { title: "接上異質資料庫", short: "接上資料庫", done: "三套資料庫都已唯讀接上。", subs: ["HIS 門診", "護理系統", "人事系統"], pains: ["資料分在三套資料庫", "怕動到正式系統"], how: "Data Access 唯讀接上", main: "plasma" },
  { title: "一種 SQL 查三套資料庫", short: "跨資料庫查詢", done: "一句 SQL，同時查三套資料庫。", subs: ["以前：三種語法", "現在：一句 SQL"], pains: ["每套資料庫語法不同", "跨資料庫要先匯出再合併"], how: "SQL Playground 一句查三套", main: "plasma" },
  { title: "AI 看懂欄位", short: "AI 看懂欄位", done: "AI 讀完文件，每個欄位都有了說明：N02 = 護理師。", subs: ["上傳文件", "長出大腦", "看懂欄位"], pains: ["Schema 看不懂", "只有資深 IT 看得懂"], how: "Knowledge 上傳系統文件", main: "plasma" },
  { title: "AI Agent 透過 MCP 問答", short: "問答整理", done: "AI Agent 透過 MCP 接上 Plasma，一句話整理好名冊。", subs: ["MCP 接上", "提問", "名冊完成"], pains: ["不會寫 SQL", "要排隊等 IT"], how: "AI Agent 透過 MCP 用問的", main: "plasma" },
  { title: "上架資料產品", short: "資料產品", done: "名冊已上架，需要的單位直接取用。", subs: ["發布", "自動更新"], pains: ["整理好的資料存在個人 Excel", "下次又要重做"], how: "Data Product 發布", main: "plasma" },
  { title: "Oracle 減壓", short: "Oracle 減壓", done: "查詢、報表、AI 改讀 PostgreSQL，Oracle 只跑門診交易，使用量降低。", subs: ["讀取壓在 Oracle", "同步到 PostgreSQL", "Oracle 縮小"], pains: ["查詢、報表、AI 都讀 Oracle", "Oracle 負載高，一直很忙"], how: "Streaming 同步到 PostgreSQL", main: "plasma" },
]
