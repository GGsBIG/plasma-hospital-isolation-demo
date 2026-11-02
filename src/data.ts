import plasmaLogo from "./assets/plasma-logo.svg"
import plasmaLogoDark from "./assets/plasma-logo-dark.svg"
import oracleLogo from "./assets/db/oracle.svg"
import postgresLogo from "./assets/db/postgresql.svg"
import mssqlLogo from "./assets/db/mssql.svg"
import mysqlLogo from "./assets/db/mysql.svg"
import ibmLogo from "./assets/db/ibm.svg"
import type { NodeDef, AgentTurn } from "./types"

// 五個源頭異質資料庫(分別支援 HIS、NIS、ERP、PACS、LIS;畫面上只顯示產品名稱,保持簡潔)
// 品牌圖示取自 Simple Icons(官方色);Informix 沒有獨立圖示,用母公司 IBM
export const DBS: NodeDef[] = [
  { id: "db-oracle",   kind: "db", label: "Oracle",   icon: "database", brand: oracleLogo },
  { id: "db-postgres", kind: "db", label: "PostgreSQL",   icon: "database", brand: postgresLogo },
  { id: "db-mssql",    kind: "db", label: "MS SQL",         icon: "database", brand: mssqlLogo },
  { id: "db-mysql",    kind: "db", label: "MySQL",  icon: "database", brand: mysqlLogo },
  { id: "db-informix", kind: "db", label: "Informix",   icon: "database", brand: ibmLogo },
]

// 跨院區:不同院區各有一套 HIS
export const CAMPUSES: NodeDef[] = [
  { id: "campus-main",  kind: "db", label: "總院", icon: "database" },
  { id: "campus-north", kind: "db", label: "北區分院", icon: "database" },
  { id: "campus-south", kind: "db", label: "南區分院", icon: "database" },
]

// 下方既有使用端
export const DOWNSTREAM: NodeDef[] = [
  { id: "ds-clinic", kind: "downstream", label: "門診工作站", icon: "stethoscope" },
  { id: "ds-ward",   kind: "downstream", label: "護理站",     icon: "heart-pulse" },
  { id: "ds-admin",  kind: "downstream", label: "行政批價",   icon: "receipt" },
  { id: "ds-lab",    kind: "downstream", label: "檢驗室",     icon: "flask-conical" },
  // 情境 8:導入前,資料要靠 IT 人工撈取
  { id: "ds-it",     kind: "person",     label: "IT 部門",    icon: "person" },
  // 情境 4:手工整併匯出檔的人員
  { id: "manual",    kind: "person",     label: "人工處理",   icon: "person-clock" },
  // 情境 8:提出資料需求的 AI 部門
  { id: "ds-aiteam", kind: "downstream", label: "AI 部門",    icon: "users" },
  // FHIR 對外交換:院外的診所、藥局
  { id: "ext-clinic",   kind: "downstream", label: "診所", icon: "building-2" },
  { id: "ext-pharmacy", kind: "downstream", label: "藥局", icon: "pill" },
]

// 上方新應用
export const APPS: NodeDef[] = [
  { id: "app-ap",   kind: "app", label: "AP 應用程式",  icon: "app-window" },
  { id: "app-fhir", kind: "app", label: "FHIR Server",  icon: "share-2" },
  { id: "app-bi",   kind: "app", label: "BI Dashboard", icon: "bar-chart-3" },
  { id: "app-ai",   kind: "app", label: "AI",           icon: "sparkles" },
  // 情境 4:手工整併後的產出
  { id: "app-claim",  kind: "app", label: "健保申報",   icon: "receipt" },
  { id: "app-accredit", kind: "app", label: "評鑑資料", icon: "clipboard-check" },
  // 情境 3:沒人在用、也沒人維護的舊系統,API 還接著
  { id: "ghost-1", kind: "app", label: "停用系統", icon: "ghost" },
  { id: "ghost-2", kind: "app", label: "停用系統", icon: "ghost" },
]

export const PLASMA: NodeDef = { id: "plasma", kind: "plasma", label: "Plasma", icon: "layers", logo: { light: plasmaLogo, dark: plasmaLogoDark } }
// Plasma 整理後的資料落地到這台 PostgreSQL,再提供給 AP 使用(與左側 NIS 的源頭資料庫 PostgreSQL 不同台)
export const SERVING_PG: NodeDef = { id: "serving-pg", kind: "serving", label: "PostgreSQL", icon: "database", brand: postgresLogo }
export const KB: NodeDef = { id: "kb", kind: "kb", label: "知識庫", icon: "book-open" }

export const ALL_NODES: NodeDef[] = [...DBS, ...CAMPUSES, ...DOWNSTREAM, ...APPS, PLASMA, SERVING_PG, KB]
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
