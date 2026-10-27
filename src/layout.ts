import { useSyncExternalStore } from "react"
import type { NodeKind, Pos } from "./types"

// 三種版面:
//   desktop          桌機/平板,橫式舞台 1600×1100,說明欄在左
//   phone-portrait   手機或平板直拿(寬 < 1024),上舞台、下說明,資料流由左而右
//   phone-landscape  手機橫拿,左說明、右舞台,資料流由左而右
// 兩種手機版面都用「緊湊版」舞台(見下方座標),元件、字、線、光點都放大
export type LayoutMode = "desktop" | "phone-portrait" | "phone-landscape"

// 與 tailwind.config.js 的 pp / pl 斷點一致
const MQ_PORTRAIT = "(max-width: 1023px) and (orientation: portrait)"
const MQ_LANDSCAPE = "(max-height: 500px) and (orientation: landscape)"

const mqP = window.matchMedia(MQ_PORTRAIT)
const mqL = window.matchMedia(MQ_LANDSCAPE)
const compute = (): LayoutMode => (mqP.matches ? "phone-portrait" : mqL.matches ? "phone-landscape" : "desktop")
let mode = compute()
const listeners = new Set<() => void>()
const onChange = () => {
  const next = compute()
  if (next === mode) return
  mode = next
  listeners.forEach((fn) => fn())
}
mqP.addEventListener("change", onChange)
mqL.addEventListener("change", onChange)

export const layoutMode = () => mode
export const isCompact = () => mode !== "desktop"

export function useLayoutMode() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    () => mode,
  )
}

// ---- 緊湊版座標:兩種手機版面都用「由左而右」的資料流 ----
// 橫軸(流向):源頭資料庫 → Plasma → 應用;縱軸:同一層的元件由上而下排
// 5 個源頭資料庫折成兩欄(3+2,第二欄往右錯開半格),4 個應用排成一欄,整張圖接近方形,
// 手機直拿時舞台只佔畫面 4 成、寬高比約 1:1,這樣縮放後才放得最大

const W = 1390
const H = 1250
const PAD_L = 170 // 最左欄的名稱比圖示寬,留邊才不會被舞台左緣切掉

// 縱軸位置:A 欄 3 個、B 欄 2 個(置於 A 欄之間);應用一欄 4 個
const ROW_A = [200, 515, 830]
const ROW_B = [357, 673]
// 間距 300:名稱 + 徽章才不會壓到下一個;整欄中心對齊源頭資料庫那組的中心(515),上下置中
const APP_ROW = [65, 365, 665, 965]
// 橫軸位置:B 欄比 A 欄往右 B_SHIFT
const B_SHIFT = 250
const FLOW_APP = 1050
const FLOW_SOURCE = 0 // 最左層:各情境的源頭資料庫、情境 2 的既有系統
const FLOW_MID = 560 // 情境 1 的既有系統
// 情境 2 的源頭資料庫:A、B 兩欄的中心(+B_SHIFT/2)剛好在左側既有系統與右側應用的正中間
const FLOW_MID_DB = (FLOW_SOURCE + FLOW_APP) / 2 - B_SHIFT / 2
const FLOW_PLASMA = 640 // Plasma、知識庫、落地 PostgreSQL

const SLOT: Record<string, { y: number; b: boolean }> = {
  "db-oracle": { y: ROW_A[0], b: false },
  "db-postgres": { y: ROW_A[1], b: false },
  "db-mssql": { y: ROW_A[2], b: false },
  "db-mysql": { y: ROW_B[0], b: true },
  "db-informix": { y: ROW_B[1], b: true },
  // 既有系統 4 個排成同一欄,間距同應用欄(名稱 + 徽章不會壓到下一個)
  "ds-clinic": { y: APP_ROW[0], b: false },
  "ds-ward": { y: APP_ROW[1], b: false },
  "ds-admin": { y: APP_ROW[2], b: false },
  "ds-lab": { y: APP_ROW[3], b: false },
  // 情境 4 的三個院區:同一欄,和 A 欄的源頭資料庫同高
  "campus-main": { y: ROW_A[0], b: false },
  "campus-north": { y: ROW_A[1], b: false },
  "campus-south": { y: ROW_A[2], b: false },
  // 情境 6 的資訊室:在 Plasma 的位置
  "ds-it": { y: ROW_A[1], b: false },
}
const APP_SLOT: Record<string, number> = { "app-ap": APP_ROW[0], "app-fhir": APP_ROW[1], "app-bi": APP_ROW[2], "app-ai": APP_ROW[3] }

// 情境資料的桌機 x(流向上的那一欄)→ 緊湊版橫軸
function flowX(x: number): number {
  if (x <= 560) return FLOW_SOURCE
  if (x === 800) return FLOW_PLASMA
  if (x < 1000) return FLOW_MID_DB
  if (x < 1300) return FLOW_MID
  return FLOW_APP
}

const PLASMA_ROW = 525 // 情境資料裡 Plasma 那一列的桌機 y
const SIDE_Y = 130 // 知識庫、落地 PostgreSQL:放在 Plasma 正上方
const KB_DOCK_MIN = 300 // 情境資料裡知識庫 y 大於此值 = 與 Plasma 合體
const KB_DOCK_DY = 180 // 合體時知識庫在 Plasma 上方多少(緊湊版圖示較大)

function compactPos(id: string, p: Pos): Pos {
  if (id === "plasma") return { x: PAD_L + FLOW_PLASMA, y: ROW_A[1] }
  // 知識庫與 Plasma 合體時(情境資料的 y 在 Plasma 上方不遠):疊在 Plasma 正上方
  if (id === "kb" && p.y > KB_DOCK_MIN) return { x: PAD_L + FLOW_PLASMA, y: ROW_A[1] - KB_DOCK_DY }
  if (id === "kb" || id === "serving-pg") return { x: PAD_L + FLOW_PLASMA, y: SIDE_Y }
  if (id in APP_SLOT) {
    // 只有單一應用的頁面,應用和 Plasma 同一列:放在 Plasma 正右方
    const y = p.y === PLASMA_ROW ? ROW_A[1] : APP_SLOT[id]
    return { x: PAD_L + FLOW_APP, y }
  }
  const slot = SLOT[id]
  return { x: PAD_L + flowX(p.x) + (slot.b ? B_SHIFT : 0), y: slot.y }
}

// 舞台座標系大小
export const stageSize = () => (mode === "desktop" ? { w: 1600, h: 1100 } : { w: W, h: H })

// 情境資料都用桌機座標寫;手機版換算成緊湊版
export function place(id: string, p: Pos): Pos {
  return mode === "desktop" ? p : compactPos(id, p)
}

// 連線接法:每種版面的流向都是左 → 右(手機直拿也是),水平為主時接左右角
export const verticalFlow = () => false

// 緊湊版的圖示放大倍率:源頭資料庫與資料中台最大,其餘次之
const ICON_SCALE: Partial<Record<NodeKind, number>> = { db: 1.45, plasma: 1.45 }
export const iconScale = (kind: NodeKind) => (mode === "desktop" ? 1 : ICON_SCALE[kind] ?? 1.3)

// 緊湊版的連線粗細與光點大小倍率
export const lineScale = () => (mode === "desktop" ? 1 : 2.2)
export const dotScale = () => (mode === "desktop" ? 1 : 1.75)

// ---- 手機版的鏡頭:依每個情境實際出現的元件外框縮放,內容填滿寬度、左右留白與下方文字一致 ----
// 外框 = 節點中心 +「圖示 + 名稱 + 徽章」的範圍(舞台座標,依實際量測值;
// 改了緊湊版的字級或圖示倍率要重新量)
const EXTENT: Record<NodeKind, { half: number; top: number; bottom: number }> = {
  db: { half: 113, top: 65, bottom: 222 },
  serving: { half: 113, top: 65, bottom: 222 },
  downstream: { half: 100, top: 41, bottom: 205 },
  app: { half: 140, top: 54, bottom: 214 },
  plasma: { half: 259, top: 98, bottom: 363 },
  kb: { half: 107, top: 215, bottom: 70 }, // 標籤在上方(疊在 Plasma 上時)
}

export interface Box { x0: number; y0: number; x1: number; y1: number }

export function sceneBox(nodes: Record<string, Pos>, kindOf: (id: string) => NodeKind): Box {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  for (const id of Object.keys(nodes)) {
    const p = place(id, nodes[id])
    const e = EXTENT[kindOf(id)]
    b.x0 = Math.min(b.x0, p.x - e.half)
    b.x1 = Math.max(b.x1, p.x + e.half)
    b.y0 = Math.min(b.y0, p.y - e.top)
    b.y1 = Math.max(b.y1, p.y + e.bottom)
  }
  return b
}
