// Demo 資料 —— 沿用 workshop 的 Oracle ERP 難懂欄位

export const DB_FORM = {
  display_name: "oracle_erp",
  db_type: "Oracle",
  description: "ERP order system database",
  host: "oracle-erp.starbridge-erp.svc.cluster.local",
  port: "1521",
  db_name: "FREEPDB1",
  username: "erp",
  password: "erp",
}

// 另外兩個異質資料庫（快速接入示範用）
export const MYSQL_FORM = {
  display_name: "mysql_crm",
  db_type: "MySQL",
  description: "CRM member database",
  host: "mysql-crm.starbridge-crm.svc.cluster.local",
  port: "3306",
  db_name: "crm",
  username: "starbridge",
  password: "starbridge",
}
export const PG_FORM = {
  display_name: "dw_sink",
  db_type: "PostgreSQL",
  description: "Export target: clean database",
  host: "pg-sink.starbridge-sink.svc.cluster.local",
  port: "5432",
  db_name: "dw",
  username: "sink",
  password: "sink",
}

export const DOC_FILES = [
  "系統計算邏輯.md",
  "系統描述.md",
  "系統程式碼規格書.md",
  "資料庫欄位字典.md",
  "業務流程說明.md",
]

// 在 Plasma 註冊、給外部 AI Agent 接上的 MCP server
export const MCP_FORM = {
  name: "plasma-mcp",
  endpoint: "https://plasma.brobridge.com/mcp/v1",
  target: "AI Agent",
}
export const MCP_TOOLS = ["list_tables", "describe_columns", "create_materialized_view"]

export type Column = { name: string; type: string; desc: string }

// T_ORD_M: cryptic column names + type + AI-generated English descriptions
export const T_ORD_M_COLUMNS: Column[] = [
  { name: "ORD_NO", type: "VARCHAR2(10)", desc: "訂單編號（主鍵）" },
  { name: "MBR_ID", type: "VARCHAR2(10)", desc: "會員編號 — 對應 CRM 會員主檔" },
  { name: "PRD_C", type: "VARCHAR2(10)", desc: "商品代碼" },
  { name: "ORD_DT", type: "DATE", desc: "訂單日期" },
  { name: "QTY1", type: "NUMBER", desc: "訂購數量" },
  { name: "AMT1", type: "NUMBER", desc: "訂單金額（含稅，新台幣）" },
  { name: "AMT2", type: "NUMBER", desc: "訂單金額（未稅，新台幣）" },
  { name: "FLG_X", type: "CHAR(1)", desc: "訂單狀態（0 新建 / 1 已出貨 / 2 完成 / 9 取消）" },
]

export const TABLE_NAME = "T_ORD_M"

// View Data 用的樣本資料列（SELECT * FROM T_ORD_M）
export const T_ORD_M_ROWS: Record<string, string>[] = [
  { ORD_NO: "O0001", MBR_ID: "M001", PRD_C: "C3001", ORD_DT: "2026-06-05", QTY1: "3", AMT1: "2048", AMT2: "1950", FLG_X: "2" },
  { ORD_NO: "O0002", MBR_ID: "M001", PRD_C: "C3002", ORD_DT: "2026-06-20", QTY1: "4", AMT1: "1344", AMT2: "1280", FLG_X: "2" },
  { ORD_NO: "O0003", MBR_ID: "M001", PRD_C: "C3001", ORD_DT: "2026-07-10", QTY1: "5", AMT1: "3413", AMT2: "3250", FLG_X: "2" },
  { ORD_NO: "O0006", MBR_ID: "M002", PRD_C: "A1001", ORD_DT: "2026-06-08", QTY1: "2", AMT1: "2709", AMT2: "2580", FLG_X: "2" },
  { ORD_NO: "O0010", MBR_ID: "M003", PRD_C: "B2002", ORD_DT: "2026-06-12", QTY1: "1", AMT1: "2814", AMT2: "2680", FLG_X: "2" },
  { ORD_NO: "O0016", MBR_ID: "M005", PRD_C: "B2002", ORD_DT: "2026-08-10", QTY1: "1", AMT1: "2814", AMT2: "2680", FLG_X: "9" },
  { ORD_NO: "O0017", MBR_ID: "M006", PRD_C: "A1001", ORD_DT: "2026-03-22", QTY1: "1", AMT1: "1355", AMT2: "1290", FLG_X: "2" },
  { ORD_NO: "O0020", MBR_ID: "M008", PRD_C: "A1002", ORD_DT: "2026-08-15", QTY1: "1", AMT1: "935", AMT2: "890", FLG_X: "0" },
]

/* ===== Act 2：BI 儀表板 → Data API ===== */

// 儀表板 4 個指標（AI 從截圖辨識，對到現有 oracle_erp × mysql_crm）
export type Metric = { label: string; value: string; source: string; logic: string }
export const DASHBOARD_METRICS: Metric[] = [
  { label: "客戶貢獻度", value: "星睿貿易 34%", source: "t_ord_m × mysql_crm.members", logic: "每位客戶 SUM(amt1) ÷ 總營收，排除取消單" },
  { label: "各等級營收占比", value: "VIP 60% · 金 26%", source: "t_ord_m × mysql_crm.members", logic: "依 members.tier 分組 SUM(amt1) 占比" },
  { label: "各區域營收貢獻", value: "北 22,861 · 中 8,978 · 南 2,416", source: "t_ord_m × mysql_crm.members", logic: "依 members.region 分組 SUM(amt1)" },
  { label: "前 10% 客戶貢獻", value: "68%", source: "t_ord_m × mysql_crm.members", logic: "消費前 10% 會員營收 ÷ 總營收（帕累托）" },
]

// AI 產生、給使用者確認的 SQL（建 MView 用）
export const GENERATED_SQL = `CREATE MATERIALIZED VIEW bi_dashboard AS
SELECT
  c.region,
  c.name                              AS customer,
  SUM(o.amt1)                         AS revenue,
  COUNT(*)                            AS orders,
  CAST(ROUND(AVG(o.amt1)) AS BIGINT)  AS avg_order_value
FROM oracle_erp.t_ord_m o
JOIN mysql_crm.members c ON c.member_id = o.mbr_id
WHERE o.flg_x <> '9'
GROUP BY c.region, c.name;`

export const MVIEW_NAME = "bi_dashboard"
export const API_URL = "https://plasma.brobridge.com/apis/v1/data/bi_dashboard"

/* ================= 秀傳醫院:四家分院 ================= */
// 分院名稱維持 A～D;資料庫廠牌、主機、欄位與人數都是示意
export const BRANCHES = [
  { ws: "A 分院", conn: "a_his", type: "Oracle", desc: "A 分院 HIS 資料庫", host: "his-a.showchwan.local", port: "1521", db: "HISA", schema: "NURSE_MST.NRS_NAME" },
  { ws: "B 分院", conn: "b_his", type: "PostgreSQL", desc: "B 分院 HIS 資料庫", host: "his-b.showchwan.local", port: "5432", db: "his_b", schema: "emp.title_cd = 'N02'" },
  { ws: "C 分院", conn: "c_his", type: "MS SQL", desc: "C 分院 HIS 資料庫", host: "his-c.showchwan.local", port: "1433", db: "HIS_C", schema: "HR_STAFF.JOB = '護理師'" },
  { ws: "D 分院", conn: "d_his", type: "MySQL", desc: "D 分院 HIS 資料庫", host: "his-d.showchwan.local", port: "3306", db: "his_d", schema: "staff.role_id = 7" },
]
export const HQ_WS = "總院"
export const KB_FILES = ["系統規格書.md", "資料表說明.md", "資料字典.md", "職稱代碼表.md", "人事系統手冊.md"]
export const ROSTER_VIEW = "nurse_roster"
export const PRODUCT_KEY = "data_product.default.nurse_roster"
export const ROSTER_SAMPLE = [
  ["A0123", "林○○", "護理師", "內科病房", "A 分院"],
  ["B0456", "陳○○", "護理師", "急診", "B 分院"],
  ["C0789", "王○○", "護理長", "外科病房", "C 分院"],
  ["D0321", "張○○", "護理師", "門診", "D 分院"],
]
export const ROSTER_COUNTS: [string, number][] = [["A 分院", 248], ["B 分院", 186], ["C 分院", 214], ["D 分院", 164]]
export const HQ_SQL = `SELECT branch, COUNT(*) AS nurses
FROM ${"data_product.default.nurse_roster"}
GROUP BY branch
ORDER BY branch`
