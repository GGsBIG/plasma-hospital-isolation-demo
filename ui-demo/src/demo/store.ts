import type { Column } from "./data"

export type ConnStatus = "void" | "preparing" | "ready" | "failed"

export type ChatMsg = {
  role: "user" | "ai"
  text?: string
  block?: "toolcall" | "report"
}

export interface DemoState {
  screen: "login" | "app" | "chatgpt"
  loginUser: string
  loginPass: string
  loggingIn: boolean

  page: "list" | "detail" | "mview" | "api" | "mcp"
  detailTab: "general" | "tables"
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

  // 幕四 — 外部 AI Agent 透過 Plasma MCP：自然語言問診間資料 → 整合病史回答 → 產出病史摘要報告
  mcpConnected: boolean
  chat: ChatMsg[]
  chatInput: string
  aiTyping: boolean
  // Plasma 內部 MView / Data API 頁的狀態（Shell 沿用；本 demo 流程未走到）
  apiCopied: boolean
  mviewCreated: boolean

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
  aiTyping: false,
  apiCopied: false,
  mviewCreated: false,
  cursor: { x: 480, y: 320, clicking: false },
  subtitle: "",
  chapter: "",
}
