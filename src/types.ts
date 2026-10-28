// serving:Plasma 整理後資料落地的服務資料庫;file:手工匯出的檔案;person:人工作業的人員(IT、人工處理)
export type NodeKind = "db" | "downstream" | "app" | "plasma" | "kb" | "serving" | "file" | "person"

export interface NodeDef {
  id: string
  kind: NodeKind
  label: string
  sub?: string      // 副標：對應系統 / db_type
  icon: string      // lucide 圖示名(由 Node 解析)
  logo?: { light: string; dark: string }   // 有 logo 時取代文字名稱,依主題切換
}

// risk:有風險、雜亂的直連(紅色虛線,光點稀疏),和負載過高的 overload 區分
// slow:資料遲遲不來(單顆慢速光點,終點轉圈等待);dead:廢棄沒人用的連線(灰色虛線,沒有光點)
// attack:AI 送出的破壞性指令(紅色 DELETE 封包)
export type EdgeState = "normal" | "overload" | "isolated" | "risk" | "slow" | "dead" | "attack"

export interface EdgeDef {
  from: string
  to: string
  state: EdgeState
  lane?: number                    // 上下平移(px),讓一來一回的兩條線並排不重疊
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
  down?: string[]                  // 停機的節點(平台變暗、出現裂痕)
  showAgent?: boolean
  dimOpacity?: number              // 本狀態非重點節點的透明度,預設 0.28
}

// 節點旁的小卡,用同一個問題/需求對照導入前後:
//   一問一答(q、a),或語法對照(q 為需求、code 為「資料庫 → 寫法」幾行、a 為結論)
//   對話輪播(seq:依時間輪流顯示在各節點上)、警報表格(rows,第一列為表頭;手機版改顯示 brief)
export interface Callout {
  tone: "ok" | "danger"
  q: string
  a?: string
  code?: [string, string][]
  rows?: string[][]
  brief?: string
  seq?: SeqStep[]
  side?: "top" | "left" | "bottom" // 放在節點上方(預設)、左側或下方
}

// 對話輪播的一步:誰說、說什麼、此時累計花了多久
export interface SeqStep {
  who: string                      // 節點 id
  text: string
  time: string
  tone?: "ok" | "danger"
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
