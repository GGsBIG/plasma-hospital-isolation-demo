// 秀傳 demo 的七個情境:只示範 A 分院(三套資料庫)。文字只留最重要的
export interface ScenarioDef {
  title: string // 情境圖上的標題
  short: string // 下方按鈕
  done: string // Plasma 操作播完的一句話
  subs: string[] // 情境圖自己的子步驟(依時間自己播)
  main: "plasma" | "scn" // 這個情境預設放大哪個畫面
}

export const STEPS: ScenarioDef[] = [
  { title: "整理資料很麻煩", short: "現況", done: "三種語法、欄位看不懂，整理一份名冊要好幾天。", subs: ["三套資料庫", "三種語法", "欄位看不懂"], main: "scn" },
  { title: "登入 Plasma", short: "登入", done: "已登入。", subs: ["登入"], main: "plasma" },
  { title: "接上三套資料庫", short: "接上資料庫", done: "三套資料庫都已唯讀接上。", subs: ["HIS 門診", "護理系統", "人事系統"], main: "plasma" },
  { title: "AI 看懂欄位", short: "AI 看懂欄位", done: "TITLE_CD = N02，就是護理師。", subs: ["上傳文件", "長出大腦", "看懂欄位"], main: "plasma" },
  { title: "一種 SQL 查三套資料庫", short: "跨庫查詢", done: "一句 SQL，同時查三套資料庫。", subs: ["以前：三種語法", "現在：一句 SQL"], main: "plasma" },
  { title: "用問的整理資料", short: "問答整理", done: "一句話，名冊整理好。", subs: ["提問", "AI 查詢", "名冊完成"], main: "plasma" },
  { title: "上架資料產品", short: "資料產品", done: "名冊已上架，需要的單位直接取用。", subs: ["發布", "自動更新"], main: "plasma" },
]
