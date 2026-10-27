export type NodeKind = "db" | "downstream" | "app" | "plasma" | "kb" | "serving"   // serving:Plasma 整理後資料落地的服務資料庫

export interface NodeDef {
  id: string
  kind: NodeKind
  label: string
  sub?: string      // 副標：對應系統 / db_type
  icon: string      // lucide 圖示名(由 Node 解析)
  logo?: { light: string; dark: string }   // 有 logo 時取代文字名稱,依主題切換
}

export type EdgeState = "normal" | "overload" | "isolated"

export interface EdgeDef {
  from: string
  to: string
  state: EdgeState
}

export interface Pos { x: number; y: number }   // 舞台座標 px(見 layout.ts 的 stageSize)

export interface SceneDef {
  id: string
  title: string
  short: string                    // 下方進度列的短標籤
  bullets: string[]
  nodes: Record<string, Pos>       // 本情境出現的節點 id -> 位置
  active: string[]                 // 全亮的節點;其餘出現但變暗
  edges: EdgeDef[]
  loads?: Record<string, number>   // db id -> 負載 0~100
  showAgent?: boolean
  dimOpacity?: number              // 本情境非重點節點的透明度,預設 0.28
}

export interface AgentTurn {
  role: "user" | "assistant" | "tool"
  text: string
}
