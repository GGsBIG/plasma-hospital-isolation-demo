import plasmaLogo from "./assets/plasma-logo.svg"
import plasmaLogoDark from "./assets/plasma-logo-dark.svg"
import oracleLogo from "./assets/db/oracle.svg"
import postgresLogo from "./assets/db/postgresql.svg"
import mssqlLogo from "./assets/db/mssql.svg"
import type { NodeDef, AgentTurn } from "./types"

// 三個來源資料庫:一段跨庫查詢會用到(訂單、客戶、出貨)
// 品牌圖示取自 Simple Icons(官方色)
export const DBS: NodeDef[] = [
  { id: "db-oracle",   kind: "db", label: "Oracle",     icon: "database", brand: oracleLogo },
  { id: "db-mssql",    kind: "db", label: "MS SQL",     icon: "database", brand: mssqlLogo },
  { id: "db-postgres", kind: "db", label: "PostgreSQL", icon: "database", brand: postgresLogo },
]

// 查詢 View 的系統
export const APPS: NodeDef[] = [
  { id: "app-bi",      kind: "app", label: "BI 儀表板", icon: "bar-chart-3" },
  { id: "app-ap",      kind: "app", label: "報表系統",  icon: "app-window" },
  { id: "app-gateway", kind: "app", label: "API 呼叫端", icon: "share-2" },
  { id: "app-ai",      kind: "app", label: "AI 助理",   icon: "sparkles" },
]

export const PLASMA: NodeDef = { id: "plasma", kind: "plasma", label: "Plasma", icon: "layers", logo: { light: plasmaLogo, dark: plasmaLogoDark } }
// Plasma 整理後的資料落地到這台 PostgreSQL,再提供給 AP 使用(與左側源頭資料庫的 PostgreSQL 不同台)
// Materialized View 同步後存下來的結果(快照)
export const SERVING_PG: NodeDef = { id: "serving-pg", kind: "serving", label: "MView 快照", icon: "database" }
export const KB: NodeDef = { id: "kb", kind: "kb", label: "知識庫", icon: "book-open" }

export const ALL_NODES: NodeDef[] = [...DBS, ...APPS, PLASMA, SERVING_PG, KB]
export const NODE_BY_ID: Record<string, NodeDef> =
  Object.fromEntries(ALL_NODES.map((n) => [n.id, n]))

// Plasma 大腦頁:切到導入後,依序上傳到知識庫的文件;icon 對應 fileIcons.ts 的圖示
export const DOC_FILES: { name: string; icon: "share" | "link" | "upload" | "alert" | "user" }[] = [
  { name: "系統規格書", icon: "share" },
  { name: "資料庫描述", icon: "link" },
  { name: "資料字典", icon: "upload" },
  { name: "欄位代碼說明", icon: "alert" },
  { name: "使用者手冊", icon: "user" },
]

// 情境 6 Plasma 對外開放的 MCP 工具
export const MCP_TOOLS = ["list_tables", "describe_columns", "query"]

// 情境 6 的 Agent 對話腳本(全寫死)
export const AGENT_SCRIPT: AgentTurn[] = [
  { role: "user", text: "幫我做這個月的專案經費執行彙總報表，依單位分組。" },
  { role: "tool", text: "呼叫 Plasma MCP · list_tables → 找到 經費（MS SQL）、專案主檔（Oracle ERP）" },
  { role: "tool", text: "呼叫 describe_columns → 由知識庫補上欄位語意（DEPT_C=單位、PRJ_CD=專案代碼…）" },
  { role: "tool", text: "呼叫 query → 由 Plasma 跨 Oracle、MS SQL 彙整，不影響正式資料庫" },
  { role: "assistant", text: "完成。本月專案經費執行彙總（依單位）：研發一處 NT$1.82M、研發二處 NT$2.41M、製造中心 NT$0.96M。報表已產出，全程在院內地端執行，資料不出院。" },
]

// 情境 6 Agent 產出的示意圖表資料
export const AGENT_CHART: { dept: string; amount: number }[] = [
  { dept: "研發一處", amount: 1.82 },
  { dept: "研發二處", amount: 2.41 },
  { dept: "製造中心", amount: 0.96 },
  { dept: "品保中心", amount: 1.33 },
]
