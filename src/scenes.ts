import type { SceneDef } from "./types"
import { NODE_BY_ID } from "./data"

// 由左至右的資料流:源頭資料庫 → (Plasma) → 應用,y 為舞台 px
const DB_Y: Record<string, number> = {
  "db-oracle": 95, "db-postgres": 310, "db-mssql": 525, "db-mysql": 740, "db-informix": 955,
}
const APP_Y: Record<string, number> = {
  "app-ap": 202, "app-fhir": 417, "app-bi": 632, "app-ai": 847,
}
// 既有系統與各自的源頭資料庫對齊
const DS_Y: Record<string, number> = {
  "ds-clinic": DB_Y["db-oracle"], "ds-ward": DB_Y["db-postgres"],
  "ds-admin": DB_Y["db-mssql"], "ds-lab": DB_Y["db-informix"],
}

// Plasma 出現後(情境 3 起)固定在同一位置,切換時只有周邊節點移動
// (情境 6 的 Agent 面板會擠窄舞台,整個舞台縮小左移,這是刻意的)
const PLASMA_POS = { x: 800, y: 525 }

const col = (ys: Record<string, number>, x: number) =>
  Object.fromEntries(Object.entries(ys).map(([id, y]) => [id, { x, y }]))
const dbCol = (x: number) => col(DB_Y, x)
const appCol = (x: number) => col(APP_Y, x)
const dsCol = (x: number) => col(DS_Y, x)

const dbIds = Object.keys(DB_Y)
const appIds = Object.keys(APP_Y)
const dsIds = Object.keys(DS_Y)

export const SCENES: SceneDef[] = [
  // 1. 現況架構：DB 供應下方系統
  {
    id: "current",
    title: "現況架構",
    short: "現況架構",
    bullets: [
      "五套異質資料庫各自支撐一個醫院系統。",
      "Oracle HIS、PostgreSQL NIS 護理、MS SQL ERP／計費、MySQL PACS 影像、Informix LIS 檢驗。",
      "各系統直接讀寫自己的源頭資料庫，運作正常。",
    ],
    nodes: { ...dbCol(560), ...dsCol(1060) },
    active: [...dbIds, ...dsIds],
    edges: [
      { from: "db-oracle", to: "ds-clinic", state: "normal" },
      { from: "db-postgres", to: "ds-ward", state: "normal" },
      { from: "db-mssql", to: "ds-admin", state: "normal" },
      { from: "db-informix", to: "ds-lab", state: "normal" },
    ],
    loads: { "db-oracle": 35, "db-postgres": 30, "db-mssql": 32, "db-mysql": 28, "db-informix": 30 },
  },

  // 2. 新應用加入 → 源頭資料庫過載
  {
    id: "overload",
    title: "新應用加入 → 源頭資料庫過載",
    short: "源頭資料庫過載",
    bullets: [
      "導入 AI／BI／FHIR／AP 等新應用。",
      "新應用直接拉源頭資料庫，源頭資料庫同時供應下方系統 + 上方新應用。",
      "源頭資料庫負載飆高，查詢互相排擠、影響正式營運系統。",
    ],
    nodes: { ...dsCol(220), ...dbCol(720), ...appCol(1320) },
    active: [...appIds, ...dbIds],
    // 左側既有系統是配角,但要看得出「回應變慢」,比預設淡化再清楚一點
    dimOpacity: 0.5,
    edges: [
      // 下方原本連線(維持)
      { from: "db-oracle", to: "ds-clinic", state: "normal" },
      { from: "db-postgres", to: "ds-ward", state: "normal" },
      { from: "db-mssql", to: "ds-admin", state: "normal" },
      { from: "db-informix", to: "ds-lab", state: "normal" },
      // 新應用直連源頭資料庫 → 過載
      { from: "db-oracle", to: "app-ap", state: "overload" },
      { from: "db-oracle", to: "app-fhir", state: "overload" },
      { from: "db-postgres", to: "app-fhir", state: "overload" },
      { from: "db-mssql", to: "app-bi", state: "overload" },
      { from: "db-informix", to: "app-bi", state: "overload" },
      { from: "db-mysql", to: "app-ai", state: "overload" },
      { from: "db-oracle", to: "app-ai", state: "overload" },
    ],
    loads: { "db-oracle": 96, "db-postgres": 88, "db-mssql": 91, "db-mysql": 85, "db-informix": 83 },
  },

  // 3. 導入 Plasma 隔離
  {
    id: "plasma",
    title: "導入 Plasma 隔離",
    short: "Plasma 隔離",
    bullets: [
      "把五套源頭資料庫全部接上 Plasma 資料中台。",
      "所有 AP／FHIR／BI／AI 改接 Plasma，不再直接碰源頭資料庫。",
      "源頭資料庫只對 Plasma 供料，負載回落、正式系統不受影響。",
    ],
    nodes: { ...dbCol(260), plasma: PLASMA_POS, ...appCol(1340) },
    active: [...appIds, "plasma", ...dbIds],
    edges: [
      ...dbIds.map((id) => ({ from: id, to: "plasma", state: "isolated" as const })),
      ...appIds.map((id) => ({ from: "plasma", to: id, state: "isolated" as const })),
    ],
    loads: { "db-oracle": 34, "db-postgres": 30, "db-mssql": 31, "db-mysql": 29, "db-informix": 30 },
  },

  // 4. 整理後資料落地 PostgreSQL,再提供給 AP
  {
    id: "serving",
    title: "整理後資料落地 PostgreSQL",
    short: "落地 PostgreSQL",
    bullets: [
      "Plasma 整理、清洗、整合後的資料，可同步落地到 PostgreSQL 資料庫。",
      "PostgreSQL 作為服務資料庫，直接提供給 AP 應用程式使用。",
      "AP 用熟悉的 SQL 取用整理好的資料，完全不碰源頭資料庫。",
    ],
    nodes: {
      ...dbCol(260),
      plasma: PLASMA_POS,
      "serving-pg": { x: 1100, y: APP_Y["app-ap"] },
      ...appCol(1400),
    },
    active: ["plasma", "serving-pg", "app-ap"],
    edges: [
      ...dbIds.map((id) => ({ from: id, to: "plasma", state: "isolated" as const })),
      { from: "plasma", to: "serving-pg", state: "isolated" },
      { from: "serving-pg", to: "app-ap", state: "isolated" },
      ...appIds.filter((id) => id !== "app-ap").map((id) => ({ from: "plasma", to: id, state: "isolated" as const })),
    ],
    loads: { "db-oracle": 33, "db-postgres": 30, "db-mssql": 31, "db-mysql": 29, "db-informix": 30 },
  },

  // 5. 知識庫
  {
    id: "knowledge",
    title: "匯入知識庫",
    short: "知識庫",
    bullets: [
      "把資料字典、欄位說明、ICD-10、規格書等文件匯入 Plasma。",
      "Plasma 不只是搬資料，更理解業務語意與欄位意義。",
      "為上層應用與 AI 提供可被理解的資料基礎。",
    ],
    nodes: { ...dbCol(260), kb: { x: 800, y: 180 }, plasma: PLASMA_POS, ...appCol(1340) },
    active: ["plasma", "kb"],
    edges: [
      ...dbIds.map((id) => ({ from: id, to: "plasma", state: "isolated" as const })),
      ...appIds.map((id) => ({ from: "plasma", to: id, state: "isolated" as const })),
      { from: "kb", to: "plasma", state: "isolated" },
    ],
    loads: { "db-oracle": 33, "db-postgres": 30, "db-mssql": 31, "db-mysql": 29, "db-informix": 30 },
  },

  // 6. MCP → AI Agent
  {
    id: "mcp",
    title: "MCP 外接 AI Agent",
    short: "MCP Agent",
    bullets: [
      "Plasma 對外開放 MCP（list_tables／describe_columns／query）。",
      "AI Agent 透過 MCP 直接取得要的結果：報表、介面、查詢。",
      "人工不需要懂底層每個天書欄位與怎麼計算。",
    ],
    nodes: {
      ...dbCol(260),
      kb: { x: 800, y: 180 },
      plasma: PLASMA_POS,
      "app-ai": { x: 1340, y: PLASMA_POS.y },
    },
    active: ["plasma", "kb", "app-ai"],
    edges: [
      ...dbIds.map((id) => ({ from: id, to: "plasma", state: "isolated" as const })),
      { from: "kb", to: "plasma", state: "isolated" },
      { from: "plasma", to: "app-ai", state: "isolated" },
    ],
    loads: { "db-oracle": 33, "db-postgres": 30, "db-mssql": 31, "db-mysql": 29, "db-informix": 30 },
    showAgent: true,
  },
]

// ponytail: 完整性檢查,每次載入都跑;edge 參照到不存在的節點直接 throw
export function validateScenes(scenes: SceneDef[] = SCENES): void {
  for (const s of scenes) {
    const present = new Set(Object.keys(s.nodes))
    for (const id of Object.keys(s.nodes)) {
      if (!NODE_BY_ID[id]) throw new Error(`scene ${s.id}: 未知節點 ${id}`)
    }
    for (const a of s.active) {
      if (!present.has(a)) throw new Error(`scene ${s.id}: active 節點 ${a} 不在 nodes 內`)
    }
    for (const e of s.edges) {
      if (!present.has(e.from)) throw new Error(`scene ${s.id}: edge from ${e.from} 不在 nodes 內`)
      if (!present.has(e.to)) throw new Error(`scene ${s.id}: edge to ${e.to} 不在 nodes 內`)
    }
  }
}
