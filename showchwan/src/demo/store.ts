import type { Column } from "./data"

export type ConnStatus = "void" | "preparing" | "ready" | "failed"

export type ChatMsg = {
  role: "user" | "ai"
  text?: string
  block?: "screenshot" | "metrics" | "sql" | "toolcall" | "mview"
}

export interface DemoState {
  screen: "login" | "app" | "chatgpt" | "agent"
  loginUser: string
  loginPass: string
  loggingIn: boolean

  page: "list" | "detail" | "mview" | "api" | "mcp" | "workspace" | "knowledge" | "product" | "sql"
  detailTab: "general" | "tables" | "mcp"
  connections: { name: string; type: string; status: string }[]
  navActive: string

  // MCP 頁：在 Plasma 註冊對外 MCP server，讓外部 agent（ChatGPT）接上
  mcpServers: { name: string; endpoint: string; target: string; status: string }[]
  mcpAddOpen: boolean
  mcpForm: { name: string; endpoint: string; target: string }

  // Add Database dialog
  addOpen: boolean
  form: {
    display_name: string
    db_type: string
    description: string
    host: string
    port: string
    db_name: string
    username: string
    password: string
  }
  connStatus: ConnStatus

  // Upload documentation dialog
  uploadOpen: boolean
  files: string[]
  analyzing: boolean

  // View schema / view data dialogs (連線後先看表/欄位)
  schemaOpen: boolean
  viewDataOpen: boolean

  // Edit table description dialog (Auto-Describe)
  editOpen: boolean
  columns: Column[]

  toast: string | null

  // Act 2 — 外部 Agent（ChatGPT）透過 Plasma MCP: BI 截圖 → text-to-SQL → MView → API
  mcpConnected: boolean
  chat: ChatMsg[]
  chatInput: string
  chatAttachment: boolean
  apiCopied: boolean
  aiTyping: boolean
  apiUrl: string | null
  mviewCreated: boolean
  powerbiImportOpen: boolean
  powerbiOpen: boolean
  dashFilled: boolean // Power BI 面板：false=空面板（目標），true=接回 API 後填值

  // 秀傳:工作區、知識庫、AI 整理、資料產品、總院查詢
  ws: string
  workspaces: string[]
  wsOpen: boolean
  wsName: string
  kbDocs: { name: string; status: string }[]
  agentMsgs: { role: "user" | "tool" | "ai"; text: string; table?: boolean }[]
  agentInput: string
  productOpen: boolean
  products: string[]
  sqlText: string
  sqlRan: boolean
  scn: number // 情境圖目前是第幾步(0~6)

  // presentation fx
  cursor: { x: number; y: number; clicking: boolean }
  subtitle: string
  chapter: string
}

export const emptyForm: DemoState["form"] = {
  display_name: "",
  db_type: "",
  description: "",
  host: "",
  port: "",
  db_name: "",
  username: "",
  password: "",
}

export const initialState: DemoState = {
  screen: "login",
  loginUser: "",
  loginPass: "",
  loggingIn: false,
  page: "list",
  detailTab: "general",
  connections: [],
  navActive: "/database",
  mcpServers: [],
  mcpAddOpen: false,
  mcpForm: { name: "", endpoint: "", target: "" },
  addOpen: false,
  form: { ...emptyForm },
  connStatus: "void",
  uploadOpen: false,
  files: [],
  analyzing: false,
  schemaOpen: false,
  viewDataOpen: false,
  editOpen: false,
  columns: [],
  toast: null,
  mcpConnected: false,
  chat: [],
  chatInput: "",
  chatAttachment: false,
  apiCopied: false,
  aiTyping: false,
  apiUrl: null,
  mviewCreated: false,
  powerbiImportOpen: false,
  powerbiOpen: false,
  dashFilled: false,
  ws: "Default Workspace",
  workspaces: [],
  wsOpen: false,
  wsName: "",
  kbDocs: [],
  agentMsgs: [],
  agentInput: "",
  productOpen: false,
  products: [],
  sqlText: "",
  sqlRan: false,
  scn: 0,
  cursor: { x: 640, y: 400, clicking: false },
  subtitle: "",
  chapter: "",
}
