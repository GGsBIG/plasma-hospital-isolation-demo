// 秀傳醫院・圖解版:七個情境拆成十五個步驟。每一步是一個畫面狀態(Look),切換時場景自己動畫過去。
// 數字(天數、負載百分比)都是示意,只用來比較前後。

export interface Look {
  dbs: boolean // A 分院三套資料庫
  it: boolean // IT 人員
  dialect: boolean // 三種 SQL 語法
  confused: boolean // 欄位看不懂、名冊整理不出來
  plasma: boolean // Plasma 唯讀接上三套資料庫
  sql: boolean // 一句 SQL 查三套,右上出現查詢結果
  docs: boolean // 系統文件 → 知識庫
  brain: boolean // AI 看懂欄位
  agent: boolean // AI Agent 透過 MCP 問答,名冊完成
  product: boolean // 名冊上架成資料產品
  reads: boolean // 強調:讀取都壓在 Oracle
  pg: boolean // PostgreSQL 副本 + 即時同步
  toPg: boolean // 讀取改走 PostgreSQL
  oraSmall: boolean // Oracle 縮小
  sqlN: number // 要寫幾種 SQL(0 = 還沒出現)
  days: string // 整理名冊要多久(空字串 = 還沒出現)
  daysBad: boolean
  load: number // Oracle 負載 %(0 = 還沒出現)
  cam: Cam
}

export type Cam = "dbs" | "now" | "link" | "sql" | "ai" | "agent" | "product" | "data" | "all"

/** 鏡頭:每一步要框進畫面的範圍(等角投影後的座標)。實際倍率依螢幕大小自動算 */
// m = 手機直放時左右可以裁掉多少(預設 1.4:圖是寬的,手機畫面是高的);mc = 手機上畫面中心的 x
export const CAMS: Record<Cam, { x0: number; y0: number; x1: number; y1: number; m?: number; mc?: number }> = {
  dbs: { x0: -540, y0: -240, x1: 200, y1: 330, m: 1.08 },
  now: { x0: -540, y0: -240, x1: 860, y1: 720, m: 1.1 },
  link: { x0: -540, y0: -240, x1: 860, y1: 700, m: 1.1 },
  sql: { x0: -520, y0: -160, x1: 880, y1: 700, m: 1.1 },
  ai: { x0: -150, y0: -200, x1: 900, y1: 700, mc: 440 },
  agent: { x0: -150, y0: -200, x1: 920, y1: 720, mc: 440 },
  product: { x0: -150, y0: -180, x1: 920, y1: 780, mc: 400 },
  data: { x0: -540, y0: -340, x1: 620, y1: 420 },
  all: { x0: -540, y0: -340, x1: 860, y1: 740, m: 1.15 },
}

export type Phase = "現況" | "接上" | "查詢" | "AI" | "產品" | "減壓"

export interface Step {
  short: string // 下方步驟軸、下一步按鈕
  phase: Phase
  title: string
  changes: [sign: "+" | "−" | "~" | "!", text: string][]
  sc: number // 對應「實際操作畫面」的第幾個情境(0 起算)
  look: Look
}

const L0: Look = {
  dbs: true, it: false, dialect: false, confused: false, plasma: false, sql: false, docs: false, brain: false, agent: false,
  product: false, reads: false, pg: false, toPg: false, oraSmall: false, sqlN: 0, days: "", daysBad: false, load: 0, cam: "dbs",
}
const L1: Look = { ...L0, it: true, dialect: true, sqlN: 3, cam: "now" }
const L2: Look = { ...L1, dialect: false, confused: true, days: "5 天", daysBad: true }
const L3: Look = { ...L2, load: 85 }
const L4: Look = { ...L3, dialect: false, plasma: true, cam: "link" }
const L5: Look = { ...L4, sql: true, sqlN: 1, days: "2 天", cam: "sql" }
const L6: Look = { ...L5, docs: true, cam: "ai" }
const L7: Look = { ...L6, brain: true }
const L8: Look = { ...L7, agent: true, days: "10 分鐘", daysBad: false, cam: "agent" }
const L9: Look = { ...L8, product: true, days: "直接取用", cam: "product" }
const L10: Look = { ...L9, reads: true, load: 92, cam: "now" }
const L11: Look = { ...L10, pg: true, cam: "data" }
const L12: Look = { ...L11, reads: false, toPg: true, load: 30, cam: "all" }
const L13: Look = { ...L12, oraSmall: true, cam: "data" }

export const STEPS: Step[] = [
  { short: "三套資料庫", phase: "現況", sc: 0, title: "A 分院有三套資料庫", look: L0,
    changes: [["+", "HIS 門診：Oracle"], ["+", "護理系統：PostgreSQL"], ["+", "人事系統：MS SQL"]] },
  { short: "三種語法", phase: "現況", sc: 0, title: "IT 要寫三種 SQL", look: L1,
    changes: [["+", "IT 一套一套去查"], ["!", "ROWNUM、LIMIT、TOP，語法都不一樣"]] },
  { short: "欄位看不懂", phase: "現況", sc: 0, title: "欄位看不懂，名冊要整理好幾天", look: L2,
    changes: [["!", "TITLE_CD、N02 是什麼？只有資深 IT 知道"], ["!", "一份護理人員名冊要整理 5 天"]] },
  { short: "Oracle 很忙", phase: "現況", sc: 0, title: "HIS 的 Oracle 一直很忙", look: L3,
    changes: [["!", "門診交易、查詢、報表都擠在 Oracle"], ["!", "Oracle 負載 85%"]] },
  { short: "接上 Plasma", phase: "接上", sc: 1, title: "Plasma 唯讀接上三套資料庫", look: L4,
    changes: [["+", "Plasma 放在資料庫和使用者中間"], ["+", "三套資料庫都唯讀接上"], ["~", "原本的系統不用改"]] },
  { short: "一句 SQL", phase: "查詢", sc: 2, title: "一句 SQL 查三套資料庫", look: L5,
    changes: [["−", "三種語法 → 一種"], ["+", "一句 JOIN，跨三套資料庫"], ["−", "不用先匯出再合併"]] },
  { short: "上傳文件", phase: "AI", sc: 3, title: "上傳系統文件給 AI 讀", look: L6,
    changes: [["+", "規格書、資料字典、職稱代碼表"], ["+", "Plasma 整理成知識庫"]] },
  { short: "看懂欄位", phase: "AI", sc: 3, title: "AI 看懂每個欄位", look: L7,
    changes: [["+", "N02 = 護理師"], ["+", "TITLE_CD = 職稱代碼"], ["−", "不用再等資深 IT 解釋"]] },
  { short: "AI 問答", phase: "AI", sc: 4, title: "AI Agent 透過 MCP 問答", look: L8,
    changes: [["+", "AI Agent 透過 MCP 接上 Plasma"], ["~", "一句話：整理 A 分院護理人員名冊"], ["−", "名冊 5 天 → 10 分鐘"]] },
  { short: "資料產品", phase: "產品", sc: 5, title: "名冊上架成資料產品", look: L9,
    changes: [["+", "護理人員名冊上架"], ["+", "護理部、人事室直接取用"], ["~", "來源更新，名冊跟著更新"]] },
  { short: "都讀 Oracle", phase: "減壓", sc: 6, title: "可是讀取都壓在 Oracle", look: L10,
    changes: [["!", "查詢、AI、資料產品都在讀 Oracle"], ["!", "Oracle 負載 92%"]] },
  { short: "即時同步", phase: "減壓", sc: 6, title: "Plasma 即時同步到 PostgreSQL", look: L11,
    changes: [["+", "加一套 PostgreSQL 副本"], ["+", "Oracle 有變動，逐筆即時同步"]] },
  { short: "改讀副本", phase: "減壓", sc: 6, title: "讀取改走 PostgreSQL", look: L12,
    changes: [["~", "查詢、AI、資料產品改讀 PostgreSQL"], ["−", "Oracle 負載 92% → 30%"]] },
  { short: "Oracle 縮小", phase: "減壓", sc: 6, title: "Oracle 只跑門診交易", look: L13,
    changes: [["−", "Oracle 只留門診交易"], ["−", "Oracle 規模可以縮小"]] },
  { short: "成果", phase: "減壓", sc: 6, title: "資料好整理，Oracle 也輕鬆了", look: { ...L13, cam: "all" },
    changes: [["−", "SQL 語法：3 種 → 1 種"], ["−", "名冊：5 天 → 10 分鐘"], ["−", "Oracle 負載：92% → 30%"], ["+", "既有系統都不用改"]] },
]

/** 重播用:第一步之前的空場景 */
export const EMPTY: Look = { ...L0, dbs: false }
