// 秀傳 Oracle 減壓:九個步驟。每一步是一個畫面狀態(Look),切換時場景自己動畫過去。
// 主軸只有兩件事:降低 VMware 的使用、降低 Oracle 的使用。負載百分比是示意,只用來比較前後。

export interface Look {
  vm: boolean // VMware 平台與上面的應用程式
  oracle: boolean // Oracle 資料庫與連線
  k8s: boolean // K8s 平台
  moved: boolean // 六支應用搬到 K8s,VMware 縮小
  pg: boolean // PostgreSQL 與 Plasma 同步
  toPg: boolean // K8s 上的應用改連 PostgreSQL
  oraSmall: boolean // Oracle 縮小
  load: number // Oracle 負載 %
  cam: Cam
}

export type Cam = "vm" | "left" | "compute" | "busy" | "data" | "all"

/** 鏡頭:每一步要框進畫面的範圍(等角投影後的座標)。實際放大倍率依螢幕大小自動算,手機、桌機都框得剛好 */
export const CAMS: Record<Cam, { x0: number; y0: number; x1: number; y1: number }> = {
  vm: { x0: -240, y0: -175, x1: 560, y1: 360 },
  left: { x0: -470, y0: -175, x1: 560, y1: 560 },
  compute: { x0: -470, y0: -175, x1: 1120, y1: 580 },
  busy: { x0: -470, y0: -175, x1: 1120, y1: 580 },
  data: { x0: -470, y0: 120, x1: 560, y1: 720 },
  all: { x0: -470, y0: -175, x1: 1120, y1: 720 },
}

export interface Step {
  short: string // 下方步驟軸
  phase: "現況" | "Step 1" | "Step 2" | "成果"
  title: string
  changes: [sign: "+" | "−" | "~" | "!", text: string][]
  look: Look
}

const L0: Look = { vm: true, oracle: false, k8s: false, moved: false, pg: false, toPg: false, oraSmall: false, load: 0, cam: "vm" }
const L1: Look = { ...L0, oracle: true, load: 92, cam: "left" }
const L3: Look = { ...L1, k8s: true, cam: "compute" }
const L4: Look = { ...L3, moved: true }
const L6: Look = { ...L4, pg: true, cam: "data" }
const L7: Look = { ...L6, toPg: true, load: 30, cam: "all" }
const L8: Look = { ...L7, oraSmall: true, cam: "data" }

export const STEPS: Step[] = [
  { short: "應用在 VMware", phase: "現況", title: "所有應用程式都跑在 VMware", look: L0,
    changes: [["+", "8 支應用程式，全在 VMware"]] },
  { short: "全部連 Oracle", phase: "現況", title: "每一支都直接連 Oracle", look: L1,
    changes: [["+", "查詢、報表全擠在 Oracle"], ["!", "Oracle 負載 92%"]] },
  { short: "建立 K8s", phase: "Step 1", title: "第一步：建立 K8s", look: L3,
    changes: [["+", "K8s 平台，和 VMware 並存"]] },
  { short: "搬上 K8s", phase: "Step 1", title: "應用搬上 K8s，VMware 使用降低", look: L4,
    changes: [["~", "6 支應用程式包成容器搬過去"], ["−", "VMware 只留 2 支核心系統"]] },
  { short: "Oracle 還很忙", phase: "Step 1", title: "可是 Oracle 還是一樣忙", look: { ...L4, cam: "busy" },
    changes: [["!", "應用還是全部連 Oracle"], ["!", "Oracle 負載 92%，沒變"]] },
  { short: "即時同步", phase: "Step 2", title: "第二步：Plasma 即時同步", look: L6,
    changes: [["+", "加一套 PostgreSQL"], ["+", "Plasma 把 Oracle 即時同步過去"]] },
  { short: "改連 PostgreSQL", phase: "Step 2", title: "K8s 應用改連 PostgreSQL", look: L7,
    changes: [["~", "6 支應用程式改連 PostgreSQL"], ["−", "Oracle 負載 92% → 30%"]] },
  { short: "Oracle 縮小", phase: "Step 2", title: "Oracle 使用降低", look: L8,
    changes: [["−", "只剩 2 支核心系統連 Oracle"], ["−", "Oracle 規模可以縮小"]] },
  { short: "成果", phase: "成果", title: "VMware、Oracle 的使用都降低了", look: { ...L8, cam: "all" },
    changes: [["−", "VMware：8 支應用 → 2 支"], ["−", "Oracle：負載 92% → 30%"], ["+", "Plasma 即時同步，既有系統不用改"]] },
]

/** 重播用:第一步之前的空場景 */
export const EMPTY: Look = { ...L0, vm: false }

/** 八支應用程式:前兩支是核心系統,留在 VMware */
export const APPS = ["掛號", "醫令", "護理", "檢驗", "藥局", "病歷", "報表", "BI"]
export const CORE = 2
