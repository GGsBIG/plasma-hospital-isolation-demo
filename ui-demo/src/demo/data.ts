// Demo 資料 —— 醫院病史整合情境：HIS / LIS / EMR 三個異質系統，天書欄位（DX_CD/RX_FLG…）

export const DB_FORM = {
  display_name: "his_oltp",
  db_type: "Oracle",
  description: "門診／住院核心系統（HIS）",
  host: "his-oltp.hgh-his.svc.cluster.local",
  port: "1521",
  db_name: "FREEPDB1",
  username: "his",
  password: "his",
}

// 另外兩個異質資料庫（快速接入示範用）
export const MYSQL_FORM = {
  display_name: "lis_db",
  db_type: "MySQL",
  description: "檢驗資訊系統（LIS）",
  host: "lis-db.hgh-lis.svc.cluster.local",
  port: "3306",
  db_name: "lis",
  username: "lis",
  password: "lis",
}
export const PG_FORM = {
  display_name: "emr_sink",
  db_type: "PostgreSQL",
  description: "病歷整合／交付庫（EMR）",
  host: "pg-emr.hgh-emr.svc.cluster.local",
  port: "5432",
  db_name: "emr",
  username: "emr",
  password: "emr",
}

export const DOC_FILES = [
  "院內系統資料字典.md",
  "就診紀錄欄位說明.md",
  "檢驗代碼對照.md",
  "ICD-10診斷碼說明.md",
  "病歷整合規格書.md",
]

// 在 Plasma 註冊、給外部 AI Agent 接上的 MCP server
export const MCP_FORM = {
  name: "plasma-mcp",
  endpoint: "https://plasma.brobridge.com/mcp/v1",
  target: "AI Agent",
}
export const MCP_TOOLS = ["list_tables", "describe_columns", "query"]

export type Column = { name: string; type: string; desc: string }

// PT_VST_M: 病人就診主檔 —— 天書欄位名 + 型別 + AI 生成的中文描述
export const T_ORD_M_COLUMNS: Column[] = [
  { name: "VST_NO", type: "VARCHAR2(12)", desc: "就診序號（主鍵）" },
  { name: "PID", type: "VARCHAR2(10)", desc: "病歷號 — 對應各系統病人主鍵" },
  { name: "DEPT_C", type: "VARCHAR2(6)", desc: "就診科別代碼（03=新陳代謝 / 05=心臟內科…）" },
  { name: "VST_DT", type: "DATE", desc: "就診日期" },
  { name: "VST_TP", type: "CHAR(1)", desc: "就診類別（1 門診 / 2 急診 / 3 住院）" },
  { name: "DX_CD", type: "VARCHAR2(10)", desc: "主診斷碼（ICD-10，如 E11.9 第二型糖尿病）" },
  { name: "ADM_DT", type: "DATE", desc: "入院日期（住院才有）" },
  { name: "DIS_DT", type: "DATE", desc: "出院日期（住院才有）" },
  { name: "RX_FLG", type: "CHAR(1)", desc: "醫囑／用藥旗標（1 當次有開立處方 / 0 無）" },
]

export const TABLE_NAME = "PT_VST_M"

// View Data 用的樣本資料列（SELECT * FROM PT_VST_M）—— 同一位病人 P000123 的跨科就診
export const T_ORD_M_ROWS: Record<string, string>[] = [
  { VST_NO: "V25060501", PID: "P000123", DEPT_C: "03", VST_DT: "2026-06-05", VST_TP: "1", DX_CD: "E11.9", ADM_DT: "", DIS_DT: "", RX_FLG: "1" },
  { VST_NO: "V25062002", PID: "P000123", DEPT_C: "05", VST_DT: "2026-06-20", VST_TP: "1", DX_CD: "I10", ADM_DT: "", DIS_DT: "", RX_FLG: "1" },
  { VST_NO: "V25071003", PID: "P000123", DEPT_C: "99", VST_DT: "2026-07-10", VST_TP: "2", DX_CD: "R073", ADM_DT: "", DIS_DT: "", RX_FLG: "1" },
  { VST_NO: "V25071004", PID: "P000123", DEPT_C: "05", VST_DT: "2026-07-10", VST_TP: "3", DX_CD: "I200", ADM_DT: "2026-07-10", DIS_DT: "2026-07-15", RX_FLG: "1" },
  { VST_NO: "V25081005", PID: "P000123", DEPT_C: "03", VST_DT: "2026-08-10", VST_TP: "1", DX_CD: "E11.9", ADM_DT: "", DIS_DT: "", RX_FLG: "1" },
  { VST_NO: "V25081506", PID: "P000123", DEPT_C: "07", VST_DT: "2026-08-15", VST_TP: "1", DX_CD: "N183", ADM_DT: "", DIS_DT: "", RX_FLG: "1" },
  { VST_NO: "V25090207", PID: "P000123", DEPT_C: "03", VST_DT: "2026-09-02", VST_TP: "3", DX_CD: "E11.65", ADM_DT: "2026-09-02", DIS_DT: "2026-09-06", RX_FLG: "1" },
  { VST_NO: "V25091208", PID: "P000123", DEPT_C: "05", VST_DT: "2026-09-12", VST_TP: "1", DX_CD: "I10", ADM_DT: "", DIS_DT: "", RX_FLG: "1" },
]

// Plasma 內部 Materialized View / Data API 名稱（Shell 的 MView / Data API 頁沿用；本 demo 流程未走到）
export const MVIEW_NAME = "patient_summary"
export const API_URL = "https://plasma.brobridge.com/apis/v1/data/patient_summary"
