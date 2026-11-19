// 秀傳 Oracle 減壓:九個步驟。每一步是一個畫面狀態(Look),切換時場景自己動畫過去。
// 主軸只有兩件事:降低 ESXi 的使用、降低 Oracle 的使用。負載百分比是示意,只用來比較前後。

export interface Look {
  vm: boolean // ESXi 平台與上面的應用程式
  oracle: boolean // Oracle 資料庫與連線
  k8s: boolean // Proxmox 平台
  moved: boolean // 六支應用遷移到 Proxmox,ESXi 縮小
  pg: boolean // PostgreSQL 與 Plasma 同步
  toPg: boolean // Proxmox 上的應用改連 PostgreSQL
  oraSmall: boolean // Oracle 縮小
  kube: boolean // 未來:Proxmox 上面加一層 Kubernetes
  containers: boolean // 未來:Proxmox 上的應用改成容器
  micro: boolean // 未來:每個大服務拆成微服務
  load: number // Oracle 負載 %
  cam: Cam
}

export type Cam = "vm" | "left" | "compute" | "busy" | "data" | "all" | "kube"

/** 鏡頭:每一步要框進畫面的範圍(等角投影後的座標)。實際放大倍率依螢幕大小自動算,手機、桌機都框得剛好 */
export const CAMS: Record<Cam, { x0: number; y0: number; x1: number; y1: number }> = {
  vm: { x0: -240, y0: -120, x1: 560, y1: 360 },
  left: { x0: -470, y0: -120, x1: 560, y1: 560 },
  compute: { x0: -470, y0: -120, x1: 1120, y1: 580 },
  busy: { x0: -470, y0: -120, x1: 1120, y1: 580 },
  data: { x0: -470, y0: 140, x1: 680, y1: 790 },
  kube: { x0: 380, y0: 90, x1: 1080, y1: 610 }, // 推近看 Kubernetes 上的微服務
  all: { x0: -470, y0: -120, x1: 1120, y1: 720 },
}

export interface Step {
  short: string // 下方步驟軸
  phase: "現況" | "Step 1" | "Step 2" | "成果" | "未來"
  title: string
  changes: [sign: "+" | "−" | "~" | "!", text: string][]
  look: Look
}

const L0: Look = { vm: true, oracle: false, k8s: false, moved: false, pg: false, toPg: false, oraSmall: false, kube: false, containers: false, micro: false, load: 0, cam: "vm" }
const L1: Look = { ...L0, oracle: true, load: 92, cam: "left" }
const L3: Look = { ...L1, k8s: true, cam: "compute" }
const L4: Look = { ...L3, moved: true }
const L6: Look = { ...L4, pg: true, cam: "data" }
const L7: Look = { ...L6, toPg: true, load: 30, cam: "all" }
const L8: Look = { ...L7, oraSmall: true, cam: "data" }

export const STEPS: Step[] = [
  { short: "應用在 ESXi", phase: "現況", title: "所有應用程式都跑在 ESXi", look: L0,
    changes: [["+", "8 支應用程式，全在 ESXi"]] },
  { short: "全部連 Oracle", phase: "現況", title: "每一支都直接連 Oracle", look: L1,
    changes: [["+", "查詢、報表全擠在 Oracle"], ["!", "Oracle 負載 92%"]] },
  { short: "建立 Proxmox", phase: "Step 1", title: "第一步：建立 Proxmox", look: L3,
    changes: [["+", "Proxmox 虛擬化平台，和 ESXi 並存"]] },
  { short: "遷移 VM", phase: "Step 1", title: "VM 遷移到 Proxmox，ESXi 使用降低", look: L4,
    changes: [["~", "6 支應用程式的 VM 遷移過去"], ["−", "ESXi 只留 2 支核心系統"]] },
  { short: "Oracle 還很忙", phase: "Step 1", title: "可是 Oracle 還是一樣忙", look: { ...L4, cam: "busy" },
    changes: [["!", "應用還是全部連 Oracle"], ["!", "Oracle 負載 92%，沒變"]] },
  { short: "即時同步", phase: "Step 2", title: "第二步：Plasma 即時同步", look: L6,
    changes: [["+", "加一套 PostgreSQL"], ["+", "Plasma 把 Oracle 即時同步過去"]] },
  { short: "改連 PostgreSQL", phase: "Step 2", title: "Proxmox 上的應用改連 PostgreSQL", look: L7,
    changes: [["~", "6 支應用程式改連 PostgreSQL"], ["−", "Oracle 負載 92% → 30%"]] },
  { short: "Oracle 縮小", phase: "Step 2", title: "Oracle 使用降低", look: L8,
    changes: [["−", "只剩 2 支核心系統連 Oracle"], ["−", "Oracle 規模可以縮小"]] },
  { short: "成果", phase: "成果", title: "ESXi、Oracle 的使用都降低了", look: { ...L8, cam: "all" },
    changes: [["−", "ESXi：8 支應用 → 2 支"], ["−", "Oracle：負載 92% → 30%"], ["+", "Plasma 即時同步，既有系統不用改"]] },
  { short: "加上 Kubernetes", phase: "未來", title: "未來：在 Proxmox 上加一層 Kubernetes", look: { ...L8, kube: true, cam: "all" },
    changes: [["+", "Kubernetes 疊在 Proxmox 上"], ["~", "應用先照常以 VM 執行"]] },
  { short: "容器化", phase: "未來", title: "應用程式容器化，跑在 Kubernetes 上", look: { ...L8, kube: true, containers: true, cam: "all" },
    changes: [["~", "6 支應用程式包成容器"], ["!", "每支還是一個大服務，改一點就要整包重新部署"]] },
  { short: "拆成微服務", phase: "未來", title: "大服務拆成微服務", look: { ...L8, kube: true, containers: true, micro: true, cam: "kube" },
    changes: [["~", "每支應用拆成 4 個小服務，例：藥局 → 處方、庫存、配藥、計價"], ["+", "6 支應用 → 24 個微服務，可以各自更新、各自擴充"], ["+", "一樣讀 PostgreSQL，Plasma 照常即時同步"]] },
]

/** 重播用:第一步之前的空場景 */
export const EMPTY: Look = { ...L0, vm: false }

/** 八支應用程式:前兩支是核心系統,留在 ESXi */
export const APPS = ["掛號", "醫令", "護理", "檢驗", "藥局", "病歷", "報表", "BI"]
export const CORE = 2
