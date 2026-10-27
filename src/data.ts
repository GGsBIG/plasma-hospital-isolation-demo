import plasmaLogo from "./assets/plasma-logo.svg"
import plasmaLogoDark from "./assets/plasma-logo-dark.svg"
import type { NodeDef, AgentTurn } from "./types"

// 五個源頭資料庫異質資料庫 → 對應醫院系統
export const DBS: NodeDef[] = [
  { id: "db-oracle",   kind: "db", label: "Oracle",     sub: "HIS 醫療資訊系統",   icon: "database" },
  { id: "db-postgres", kind: "db", label: "PostgreSQL", sub: "NIS 護理資訊系統",   icon: "database" },
  { id: "db-mssql",    kind: "db", label: "MS SQL",     sub: "ERP／計費",         icon: "database" },
  { id: "db-mysql",    kind: "db", label: "MySQL",      sub: "PACS 醫學影像系統",  icon: "database" },
  { id: "db-informix", kind: "db", label: "Informix",   sub: "LIS 檢驗資訊系統",   icon: "database" },
]

// 情境 4:不同院區各有一套 HIS
export const CAMPUSES: NodeDef[] = [
  { id: "campus-main",  kind: "db", label: "總院",     sub: "HIS 醫療資訊系統", icon: "database" },
  { id: "campus-north", kind: "db", label: "北區分院", sub: "HIS 醫療資訊系統", icon: "database" },
  { id: "campus-south", kind: "db", label: "南區分院", sub: "HIS 醫療資訊系統", icon: "database" },
]

// 下方既有使用端
export const DOWNSTREAM: NodeDef[] = [
  { id: "ds-clinic", kind: "downstream", label: "門診工作站", icon: "stethoscope" },
  { id: "ds-ward",   kind: "downstream", label: "護理站",     icon: "heart-pulse" },
  { id: "ds-admin",  kind: "downstream", label: "行政批價",   icon: "receipt" },
  { id: "ds-lab",    kind: "downstream", label: "檢驗室",     icon: "flask-conical" },
  // 情境 6:導入前,報表要靠資訊室人工撈
  { id: "ds-it",     kind: "downstream", label: "資訊室",     icon: "users" },
]

// 上方新應用
export const APPS: NodeDef[] = [
  { id: "app-ap",   kind: "app", label: "AP 應用程式",  icon: "app-window" },
  { id: "app-fhir", kind: "app", label: "FHIR Server",  icon: "share-2" },
  { id: "app-bi",   kind: "app", label: "BI Dashboard", icon: "bar-chart-3" },
  { id: "app-ai",   kind: "app", label: "AI",           icon: "sparkles" },
]

export const PLASMA: NodeDef = { id: "plasma", kind: "plasma", label: "Plasma", sub: "AI-Ready 資料中台", icon: "layers", logo: { light: plasmaLogo, dark: plasmaLogoDark } }
// Plasma 整理後的資料落地到這台 PostgreSQL,再提供給 AP 使用(與左側 NIS 的源頭資料庫 PostgreSQL 不同台)
export const SERVING_PG: NodeDef = { id: "serving-pg", kind: "serving", label: "PostgreSQL", sub: "整理後資料 · 服務資料庫", icon: "database" }
export const KB: NodeDef = { id: "kb", kind: "kb", label: "知識庫", sub: "文件／技術文件", icon: "book-open" }

export const ALL_NODES: NodeDef[] = [...DBS, ...CAMPUSES, ...DOWNSTREAM, ...APPS, PLASMA, SERVING_PG, KB]
export const NODE_BY_ID: Record<string, NodeDef> =
  Object.fromEntries(ALL_NODES.map((n) => [n.id, n]))

// 情境 5 匯入知識庫的文件
export const DOC_FILES = [
  "院內系統資料字典.md",
  "就診紀錄欄位說明.md",
  "檢驗代碼對照.md",
  "ICD-10診斷碼說明.md",
  "病歷整合規格書.md",
]

// 情境 6 Plasma 對外開放的 MCP 工具
export const MCP_TOOLS = ["list_tables", "describe_columns", "query"]

// 情境 6 的 Agent 對話腳本(全寫死)
export const AGENT_SCRIPT: AgentTurn[] = [
  { role: "user", text: "幫我做這個月的住院計費彙總報表，依科別分組。" },
  { role: "tool", text: "呼叫 Plasma MCP · list_tables → 找到 計費（MS SQL）、就診主檔（Oracle HIS）" },
  { role: "tool", text: "呼叫 describe_columns → 由知識庫補上欄位語意（DEPT_C=科別、DX_CD=診斷碼…）" },
  { role: "tool", text: "呼叫 query → 由 Plasma 跨 Oracle、MS SQL 彙整，不影響正式資料庫" },
  { role: "assistant", text: "完成。本月住院計費彙總（依科別）：新陳代謝 NT$1.82M、心臟內科 NT$2.41M、腎臟科 NT$0.96M。報表已產出。" },
]

// 情境 6 Agent 產出的示意圖表資料
export const AGENT_CHART: { dept: string; amount: number }[] = [
  { dept: "新陳代謝", amount: 1.82 },
  { dept: "心臟內科", amount: 2.41 },
  { dept: "腎臟科",   amount: 0.96 },
  { dept: "一般外科", amount: 1.33 },
]
