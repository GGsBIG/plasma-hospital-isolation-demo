// 秀傳 demo 的文字內容:痛點、解決步驟、成果對照。畫面版面在 Story.tsx
// 痛點編號與解決步驟一一對應:步驟 k 解決痛點 k

export interface Pain {
  title: string
  desc: string
  bubble: string // 圖上標記旁的一句話
}

export const PAINS: Pain[] = [
  {
    title: "跨院資料要人工匯出",
    desc: "總院要各分院匯出 Excel，再人工合併、核對，一次要一週以上。",
    bubble: "匯出、合併、核對，一次一週以上",
  },
  {
    title: "四家分院 schema 都不同",
    desc: "資料表、欄位、職稱代碼都不一樣，合併時對不起來，數字兜不攏。",
    bubble: "同樣是護理師，四家寫法都不同",
  },
  {
    title: "要資料得找各分院 IT",
    desc: "四家各寫各的 SQL，來回協調，常常要好幾個月。",
    bubble: "找 IT 寫 SQL，來回好幾個月",
  },
  {
    title: "整理好的資料不能重複用",
    desc: "名單存在個人的 Excel，下個月又要重做，其他單位也拿不到。",
    bubble: "下個月又要重做一次",
  },
]

export interface Step {
  title: string
  desc: string
}

// 前四步各解決一個痛點,最後一步是總院取用的成果
export const STEPS: Step[] = [
  { title: "接上 Plasma", desc: "四家分院資料庫以唯讀方式接上 Plasma，不用再人工匯出，也不影響院內系統。" },
  { title: "上傳系統文件", desc: "各分院上傳規格書、資料字典、職稱代碼表，Plasma 讀懂四家的欄位與代碼。" },
  { title: "AI 用問的整理", desc: "直接問 AI Agent，它透過 Plasma 對齊四家欄位，幾分鐘整理好護理人員名冊。" },
  { title: "上架資料產品", desc: "整理好的名冊上架成資料產品，來源更新就跟著更新，有權限的單位才拿得到。" },
  { title: "總院彙整", desc: "總院直接取用資料產品，四家分院同一格式，隨時看得到最新人數。" },
]

// 各分院資料庫:同一份「護理人員」資料,資料表與欄位寫法各不相同
export const BRANCHES = [
  { id: "a", label: "A 分院", schema: "NURSE_MST.NRS_NAME" },
  { id: "b", label: "B 分院", schema: "emp.title_cd = 'N02'" },
  { id: "c", label: "C 分院", schema: "HR_STAFF.JOB = '護理師'" },
  { id: "d", label: "D 分院", schema: "staff.role_id = 7" },
]

export const DOCS = ["系統規格書", "資料表說明", "資料字典", "職稱代碼表", "人事系統手冊"]

export const RESULT_ROWS: [string, string, string][] = [
  ["跨院護理人員統計", "一週以上，數字常兜不攏", "問一句，幾分鐘完成"],
  ["四家分院的資料格式", "四種 schema、四種代碼", "統一成同一張表"],
  ["要資料的流程", "找各分院 IT，來回好幾個月", "總院直接取用資料產品"],
  ["資料更新", "每個月人工重做", "來源更新，自動跟著更新"],
  ["院內系統", "匯出、查詢都壓在正式資料庫", "唯讀接入，不受影響"],
]

// 總院彙整表(示意數字)
export const ROSTER = [
  { label: "A 分院", n: 248 },
  { label: "B 分院", n: 186 },
  { label: "C 分院", n: 214 },
  { label: "D 分院", n: 164 },
]
