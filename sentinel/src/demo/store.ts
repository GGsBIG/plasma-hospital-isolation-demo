// 示範用的 K8s Sentinel 畫面狀態(全部是假資料,照真正的前端畫面做)
export type Page =
  | "dashboard" | "discovery" | "policy-new" | "policies" | "events" | "quarantine"
  | "topology" | "netpol-new" | "vulns" | "vap-new" | "audit"

export type Card = "ebpf" | "attack" | "forensic" | "vuln"

export interface SecEvent {
  id: string
  severity: "Warning" | "Critical"
  rule: "Process Rule" | "Network Rule"
  detail: string
  ns: string
  pod: string
  container: string
  policy: string
  time: string
  binary?: string
  parent?: string
  user?: string
  fn?: string
  hook?: string
  node?: string
  at?: string
}

export interface Policy { name: string; scope: string; mode: "Monitoring" | "Protect"; ns: string; by: string; created: string }
export interface AuditRow { time: string; user: string; action: string; target: string; status: string }

export interface DemoState {
  page: Page
  mode: "MONITORING" | "PROTECT" | "MIXED" // 頁首的全域模式標示

  // Behavior Discovery → New Policy(白名單)
  peName: string
  peRules: string[]
  policies: Policy[]
  modeOpen: boolean // 列表上 Mode 下拉打開

  // Security Events
  events: SecEvent[]
  expanded: string | null
  confirmOpen: boolean
  quarantined: boolean
  slack: boolean // 右上角的 Slack 告警通知

  // Network Policy 表單與拓撲
  npStep: number // 表單填到哪(0 空白 → 1 名稱 → 2 Applies to → 3 Ingress → 4 Egress)
  npName: string
  denied: boolean // 拓撲上可疑連線變成紅色虛線(被拒絕)
  edgeOpen: boolean // 拓撲右側 Connection Detail

  // 弱點與 Admission Policy
  vFilter: boolean // Exposed + Fix available 篩選
  vapName: string
  vapStep: number // 0 空白 → 1 名稱 → 2 Rule Type → 3 Critical allowed → 4 Binding Deny
  terminal: number // 終端機:0 不顯示、1 指令、2 被拒絕

  audit: AuditRow[]
  exported: boolean

  epoch: number // 重播次數(情境圖用來從頭播)
  card: Card | null // 畫面中央的說明卡
  scn: number // 目前的情境
  sub: number
  hot: string | null
  spot: { sel: string; text: string } | null // 聚光燈提示
  titleCard: boolean
  done: boolean

  cursor: { x: number; y: number; clicking: boolean }
}

export const initialState: DemoState = {
  page: "dashboard",
  mode: "MONITORING",
  peName: "",
  peRules: [],
  policies: [],
  modeOpen: false,
  events: [],
  expanded: null,
  confirmOpen: false,
  quarantined: false,
  slack: false,
  npStep: 0,
  npName: "",
  denied: false,
  edgeOpen: false,
  vFilter: false,
  vapName: "",
  vapStep: 0,
  terminal: 0,
  audit: [],
  exported: false,
  epoch: 0,
  card: null,
  scn: 0,
  sub: 0,
  hot: null,
  spot: null,
  titleCard: false,
  done: false,
  cursor: { x: 640, y: 400, clicking: false },
}
