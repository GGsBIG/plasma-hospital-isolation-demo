import plasmaLogo from "./assets/plasma-logo.svg"
import plasmaLogoDark from "./assets/plasma-logo-dark.svg"
import oracleLogo from "./assets/db/oracle.svg"
import postgresLogo from "./assets/db/postgresql.svg"
import mssqlLogo from "./assets/db/mssql.svg"
import mysqlLogo from "./assets/db/mysql.svg"
import type { NodeDef, AgentTurn } from "./types"

// 四家分院各有一套 HIS 資料庫:廠牌不同、資料表與欄位命名也不同(畫面上顯示分院名稱,左上角是資料庫品牌)
export const DBS: NodeDef[] = [
  { id: "db-oracle",   kind: "db", label: "A 分院", icon: "database", brand: oracleLogo },
  { id: "db-postgres", kind: "db", label: "B 分院", icon: "database", brand: postgresLogo },
  { id: "db-mssql",    kind: "db", label: "C 分院", icon: "database", brand: mssqlLogo },
  { id: "db-mysql",    kind: "db", label: "D 分院", icon: "database", brand: mysqlLogo },
]

// 各分院院內照常運作的護理系統(與各自的資料庫一一對應)
export const DOWNSTREAM: NodeDef[] = [
  { id: "ds-clinic", kind: "downstream", label: "A 分院護理站", icon: "heart-pulse" },
  { id: "ds-ward",   kind: "downstream", label: "B 分院護理站", icon: "heart-pulse" },
  { id: "ds-admin",  kind: "downstream", label: "C 分院護理站", icon: "heart-pulse" },
  { id: "ds-pacs",   kind: "downstream", label: "D 分院護理站", icon: "heart-pulse" },
  // 導入前:各分院 IT 各自寫 SQL 撈資料
  { id: "ds-it",     kind: "person",     label: "各分院 IT",  icon: "person" },
  // 總院手工整併各分院的匯出檔
  { id: "manual",    kind: "person",     label: "總院人工彙整", icon: "person-clock" },
  // 提出跨院統計需求的總院
  { id: "ds-aiteam", kind: "downstream", label: "總院管理部", icon: "users" },
]

export const APPS: NodeDef[] = [
  { id: "app-bi",   kind: "app", label: "總院彙整報表", icon: "receipt" },
  { id: "app-ai",   kind: "app", label: "地端 AI",      icon: "sparkles" },
  // 上架的資料產品
  { id: "app-claim",    kind: "app", label: "護理人員名冊", icon: "package" },
  { id: "app-accredit", kind: "app", label: "護理排班表", icon: "package" },
]

export const PLASMA: NodeDef = { id: "plasma", kind: "plasma", label: "Plasma", icon: "layers", logo: { light: plasmaLogo, dark: plasmaLogoDark } }
// Plasma 整理後的資料落地到這台 PostgreSQL,再提供給 AP 使用(與左側源頭資料庫的 PostgreSQL 不同台)
export const SERVING_PG: NodeDef = { id: "serving-pg", kind: "serving", label: "PostgreSQL", icon: "database", brand: postgresLogo }
export const KB: NodeDef = { id: "kb", kind: "kb", label: "知識庫", icon: "book-open" }

export const ALL_NODES: NodeDef[] = [...DBS, ...DOWNSTREAM, ...APPS, PLASMA, SERVING_PG, KB]
export const NODE_BY_ID: Record<string, NodeDef> =
  Object.fromEntries(ALL_NODES.map((n) => [n.id, n]))

// AI 看懂各分院 schema 頁:切到導入後,依序上傳到知識庫的文件;icon 對應 fileIcons.ts 的圖示
export const DOC_FILES: { name: string; icon: "share" | "link" | "upload" | "alert" | "user" }[] = [
  { name: "各分院系統規格書", icon: "share" },
  { name: "資料表說明", icon: "link" },
  { name: "資料字典", icon: "upload" },
  { name: "職稱代碼表", icon: "alert" },
  { name: "人事系統手冊", icon: "user" },
]

// Plasma 對外開放的 MCP 工具
export const MCP_TOOLS = ["list_tables", "describe_columns", "query"]

// AI 整理資料頁的 Agent 對話腳本(全寫死)
export const AGENT_SCRIPT: AgentTurn[] = [
  { role: "user", text: "把四家分院的護理人員整理成同一張表：員工編號、姓名、職稱、單位、分院。" },
  { role: "tool", text: "呼叫 Plasma MCP · list_tables → A 分院 NURSE_MST、B 分院 emp、C 分院 HR_STAFF、D 分院 staff" },
  { role: "tool", text: "呼叫 describe_columns → 由知識庫對出職稱代碼（B 分院 title_cd N02、D 分院 role_id 7 = 護理師）" },
  { role: "tool", text: "呼叫 query → 四家分院欄位對齊成同一格式，只讀取，不影響各分院正式資料庫" },
  { role: "assistant", text: "完成。四家分院共 812 位護理人員：A 分院 248、B 分院 186、C 分院 214、D 分院 164。已存成「護理人員名冊」，可以上架成資料產品給總院使用。" },
]

// Agent 產出的示意圖表
export const AGENT_CHART_TITLE = "各分院護理人員 · 人"
export const AGENT_CHART: { dept: string; amount: number }[] = [
  { dept: "A 分院", amount: 248 },
  { dept: "B 分院", amount: 186 },
  { dept: "C 分院", amount: 214 },
  { dept: "D 分院", amount: 164 },
]
