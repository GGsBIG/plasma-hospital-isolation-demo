export type NodeKind = "db" | "downstream" | "app" | "plasma" | "kb" | "serving" | "file"   // serving:Plasma 整理後資料落地的服務資料庫;file:手工匯出的檔案

export interface NodeDef {
  id: string
  kind: NodeKind
  label: string
  sub?: string      // 副標：對應系統 / db_type
  icon: string      // lucide 圖示名(由 Node 解析)
  logo?: { light: string; dark: string }   // 有 logo 時取代文字名稱,依主題切換
}

// risk:有風險、雜亂的直連(紅色虛線,光點稀疏),和負載過高的 overload 區分
export type EdgeState = "normal" | "overload" | "isolated" | "risk"

export interface EdgeDef {
  from: string
  to: string
  state: EdgeState
}

export interface Pos { x: number; y: number }   // 舞台座標 px(見 layout.ts 的 stageSize)

// 情境自訂的節點徽章(取代依連線推算的預設徽章);stat 是徽章下方的一行說明
export interface BadgeOverride {
  tone: "ok" | "warn" | "danger" | "idle"
  text: string
  stat?: string
}

// 一個畫面狀態:出現哪些節點、在哪、哪些連線
export interface SceneState {
  nodes: Record<string, Pos>       // 本狀態出現的節點 id -> 位置
  active: string[]                 // 全亮的節點;其餘出現但變暗
  edges: EdgeDef[]
  loads?: Record<string, number>   // db id -> 負載 0~100
  badges?: Record<string, BadgeOverride>
  callouts?: Record<string, Callout> // 節點旁的問答泡泡
  brain?: boolean                  // 知識庫與 Plasma 合體:外圍光暈 =「資料大腦」
  zone?: { ids: string[]; label: string } // 圍住一組節點的虛線防護框(例如「核心資料庫 · 受保護」)
  showAgent?: boolean
  dimOpacity?: number              // 本狀態非重點節點的透明度,預設 0.28
}

// 節點旁的一問一答小泡泡,用同一個問題對照導入前後的回答
export interface Callout {
  tone: "ok" | "danger"
  q: string
  a: string
}

// 一頁 = 一個痛點。畫面本身是「導入前」;有 plasma 的頁面右上角可切換到「導入 Plasma 後」
export interface SceneDef extends SceneState {
  id: string
  title: string
  short: string                    // 下方進度列的短標籤
  bullets?: string[]               // 開場頁的說明
  pain?: string                    // 導入前的痛點
  fix?: string                     // 導入 Plasma 後
  plasma?: SceneState
}

export interface AgentTurn {
  role: "user" | "assistant" | "tool"
  text: string
}
