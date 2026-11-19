import type { LucideIcon } from "lucide-react"

// 場景的資料模型:每一步是一個畫面狀態(Look),切換時場景自己動畫過去。
// 這個檔案在各個 demo 完全相同,差異只在 steps.ts(內容)。

/** 物件的外型:
 *  db 資料庫(圓柱)、sys 既有系統、app 新應用、ext 外部單位(方塊)、ghost 停用系統(虛線方塊)、
 *  person 人員(小人)、site 據點/部門(大樓)、plasma Plasma、kb 知識庫(疊在 Plasma 上) */
export type Kind = "db" | "sys" | "app" | "ext" | "ghost" | "person" | "site" | "plasma" | "kb"

export interface NodeDef {
  label: string
  kind: Kind
  icon?: LucideIcon
  logo?: string // 資料庫的品牌圖示,放在名稱左邊
}

export type Tone = "ok" | "warn" | "bad" | "idle"

/** 物件旁的小卡:一行標題 + 幾行內容(例如同一需求在各資料庫的寫法、AI 的問答) */
export interface Note {
  tone: Tone
  title: string
  lines?: string[]
  dx?: number // 小卡往左(負)或往右(正)挪,尖角仍指向物件;避開旁邊的物件
}

/** 物件在這一步的狀態 */
export interface Put {
  at: [number, number] // 地面座標 (x 往右下, y 往左下)
  load?: number // 資料庫負載 %
  down?: boolean // 停機
  dim?: boolean // 配角,淡化
  tag?: [Tone, string] // 頭上的狀態標籤
  note?: Note
}

/** 連線的樣子:
 *  ok 正常(綠點)、sync Plasma 同步(紅色方塊)、hot 過載(橘色密集)、slow 回應很慢(稀疏慢點)、
 *  risk 雜亂的直連(紅色虛線)、dead 沒人用卻還開著(灰色虛線、沒有點)、attack 破壞性指令、raw 各系統格式不一(各色) */
export type Flow = "ok" | "sync" | "hot" | "slow" | "risk" | "dead" | "attack" | "raw"

export interface Link {
  from: string
  to: string
  flow: Flow
  straight?: boolean // 直線(預設是沿地面格線的折線)
  mx?: number // 折線轉彎的 x(預設兩端中間)
  lane?: number // 一來一回時左右錯開
  color?: string // raw 的點顏色
}

export type ChipTone = "" | "down" | "warn"

export interface Look {
  put: Record<string, Put>
  links: Link[]
  zone?: { ids: string[]; label: string } // 地面上的防護框
  brain?: boolean // Plasma 與知識庫合體的光圈
  chips: [string, ChipTone][] // 上方數字晶片的值
}

export interface Step {
  short: string // 下方步驟軸
  phase: string // 分組名稱
  mode?: "before" | "after" // 導入前 / 導入 Plasma 後
  title: string
  changes: [sign: "+" | "−" | "~" | "!", text: string][]
  look: Look
}
