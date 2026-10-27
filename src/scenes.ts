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
// 知識庫與 Plasma 合體時,知識庫疊在 Plasma 正上方(兩者之間不再有連線)
const KB_DOCK = { x: 800, y: 400 }
const BRAIN_BADGE = { tone: "ok" as const, text: "資料大腦 · 理解所有表與欄位" }
const ASK = "上月心臟內科住院幾人？"

const col = (ys: Record<string, number>, x: number) =>
  Object.fromEntries(Object.entries(ys).map(([id, y]) => [id, { x, y }]))
const dbCol = (x: number) => col(DB_Y, x)
const appCol = (x: number) => col(APP_Y, x)
const dsCol = (x: number) => col(DS_Y, x)

const dbIds = Object.keys(DB_Y)
const appIds = Object.keys(APP_Y)
const dsIds = Object.keys(DS_Y)

const campusIds = ["campus-main", "campus-north", "campus-south"]
const campusCol = (x: number) => Object.fromEntries(campusIds.map((id, k) => [id, { x, y: 310 + k * 215 }]))

// 資料都經過 Plasma:源頭資料庫 → Plasma → 各應用
const viaPlasma = (ids: string[]) => [
  ...dbIds.map((id) => ({ from: id, to: "plasma", state: "isolated" as const })),
  ...ids.map((id) => ({ from: "plasma", to: id, state: "isolated" as const })),
]

// 每頁一個痛點:預設畫面是「導入前」,右上角切到「導入 Plasma 後」看解法
export const SCENES: SceneDef[] = [
  // 1. 開場:醫院現況(沒有切換)
  {
    id: "current",
    title: "醫院現況",
    short: "醫院現況",
    bullets: [
      "院內有五套不同廠牌的資料庫，分別支援 HIS、NIS、ERP、PACS、LIS 等系統。",
      "各系統直接存取自己的資料庫，目前運作穩定。",
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

  // 2. 新應用直連源頭資料庫 → 正式系統變慢
  {
    id: "overload",
    title: "新應用影響既有系統效能",
    short: "系統效能",
    pain: "AI、BI、FHIR 等新應用直接查詢正式資料庫，資料庫負載升高，門診、護理等既有系統回應變慢。",
    fix: "新應用統一改由 Plasma 取得資料，正式資料庫只需供應 Plasma，負載恢復正常，既有系統不受影響。",
    nodes: { ...dsCol(220), ...dbCol(720), ...appCol(1320) },
    active: [...appIds, ...dbIds],
    // 左側既有系統是配角,但要看得出「回應變慢」,比預設淡化再清楚一點
    dimOpacity: 0.5,
    edges: [
      { from: "db-oracle", to: "ds-clinic", state: "normal" },
      { from: "db-postgres", to: "ds-ward", state: "normal" },
      { from: "db-mssql", to: "ds-admin", state: "normal" },
      { from: "db-informix", to: "ds-lab", state: "normal" },
      { from: "db-oracle", to: "app-ap", state: "overload" },
      { from: "db-oracle", to: "app-fhir", state: "overload" },
      { from: "db-postgres", to: "app-fhir", state: "overload" },
      { from: "db-mssql", to: "app-bi", state: "overload" },
      { from: "db-informix", to: "app-bi", state: "overload" },
      { from: "db-mysql", to: "app-ai", state: "overload" },
      { from: "db-oracle", to: "app-ai", state: "overload" },
    ],
    loads: { "db-oracle": 96, "db-postgres": 88, "db-mssql": 91, "db-mysql": 85, "db-informix": 83 },
    plasma: {
      nodes: { ...dbCol(260), plasma: PLASMA_POS, ...appCol(1340) },
      active: [...appIds, "plasma", ...dbIds],
      edges: viaPlasma(appIds),
      loads: { "db-oracle": 34, "db-postgres": 30, "db-mssql": 31, "db-mysql": 29, "db-informix": 30 },
    },
  },

  // 3. 每個應用各接五套資料庫 → 單一入口 + 落地 PostgreSQL
  {
    id: "spaghetti",
    title: "系統介接複雜、維護成本高",
    short: "系統介接",
    pain: "每個新應用都要分別介接五套資料庫，各家語法與資料格式不一，開發時間長，後續維護成本也高。",
    fix: "所有應用統一透過 Plasma 取得資料，整理後的資料也可同步到 PostgreSQL，只需介接一次。",
    nodes: { ...dbCol(260), ...appCol(1340) },
    active: [...appIds, ...dbIds],
    edges: appIds.flatMap((app) => dbIds.map((db) => ({ from: db, to: app, state: "risk" as const }))),
    badges: Object.fromEntries(appIds.map((id) => [id, { tone: "danger" as const, text: "需介接 5 套資料庫" }])),
    plasma: {
      nodes: {
        ...dbCol(260),
        plasma: PLASMA_POS,
        "serving-pg": { x: 1100, y: APP_Y["app-ap"] },
        ...appCol(1400),
      },
      active: [...appIds, "plasma", "serving-pg"],
      edges: [
        ...viaPlasma(appIds.filter((id) => id !== "app-ap")),
        { from: "plasma", to: "serving-pg", state: "isolated" },
        { from: "serving-pg", to: "app-ap", state: "isolated" },
      ],
    },
  },

  // 4. 不同院區各有一套 HIS → Plasma 整合成全院視圖
  {
    id: "campus",
    title: "跨院區資料無法整合",
    short: "跨院區整合",
    pain: "各院區各有一套 HIS，病歷號與代碼編碼不同，跨院區報表難以彙整，病人在其他院區的檢驗結果也無法即時查詢。",
    fix: "Plasma 整合各院區資料並統一代碼，提供全院一致的資料視圖。",
    nodes: { ...campusCol(400), "app-bi": { x: 1200, y: PLASMA_POS.y } },
    active: [...campusIds, "app-bi"],
    edges: campusIds.map((id) => ({ from: id, to: "app-bi", state: "risk" as const })),
    badges: { "app-bi": { tone: "danger", text: "資料無法彙整" } },
    plasma: {
      nodes: { ...campusCol(260), plasma: PLASMA_POS, "app-bi": { x: 1340, y: PLASMA_POS.y } },
      active: [...campusIds, "plasma", "app-bi"],
      edges: [
        ...campusIds.map((id) => ({ from: id, to: "plasma", state: "isolated" as const })),
        { from: "plasma", to: "app-bi", state: "isolated" },
      ],
      badges: {
        plasma: { tone: "ok", text: "整合 3 個院區" },
        "app-bi": { tone: "ok", text: "全院資料一致" },
      },
    },
  },

  // 5. AI 不了解院內資料 → 知識庫與 Plasma 合體成資料大腦,AI 答得準
  {
    id: "knowledge",
    title: "AI 不了解院內資料",
    short: "AI 與知識庫",
    pain: "AI 直接連線正式資料庫，可能誤刪或修改資料；欄位多為代碼，AI 不了解其意義，回答容易出錯。",
    fix: "匯入資料字典與系統文件後，Plasma 成為最了解院內所有資料庫與系統的資料大腦；AI 透過 Plasma 唯讀查詢，答案最精準。",
    nodes: { ...dbCol(260), "app-ai": { x: 1340, y: PLASMA_POS.y } },
    active: [...dbIds, "app-ai"],
    edges: dbIds.map((id) => ({ from: id, to: "app-ai", state: "risk" as const })),
    badges: { "app-ai": { tone: "danger", text: "回答不準確" } },
    callouts: { "app-ai": { tone: "danger", q: ASK, a: "無法判斷 DEPT_C 欄位意義" } },
    plasma: {
      nodes: { ...dbCol(260), kb: KB_DOCK, plasma: PLASMA_POS, "app-ai": { x: 1340, y: PLASMA_POS.y } },
      active: ["plasma", "kb", "app-ai"],
      edges: viaPlasma(["app-ai"]),
      brain: true,
      badges: { plasma: BRAIN_BADGE, "app-ai": { tone: "ok", text: "回答精準" } },
      callouts: { "app-ai": { tone: "ok", q: ASK, a: "312 人" } },
    },
  },

  // 6. 報表要排隊等資訊室 → MCP Agent
  {
    id: "mcp",
    title: "報表需求仰賴人工處理",
    short: "報表與 AI Agent",
    pain: "業務單位需要報表時，須向資訊室提出需求，由專人查找欄位、撰寫 SQL，往往需要數天。",
    fix: "AI Agent 透過 MCP 向 Plasma 查詢，數分鐘內即可產出報表，使用者不需了解底層資料結構。",
    nodes: { ...dbCol(260), "ds-it": { x: 800, y: PLASMA_POS.y } },
    active: [...dbIds, "ds-it"],
    edges: dbIds.map((id) => ({ from: id, to: "ds-it", state: "risk" as const })),
    badges: { "ds-it": { tone: "warn", text: "人工處理 · 需數天" } },
    plasma: {
      nodes: { ...dbCol(260), kb: KB_DOCK, plasma: PLASMA_POS, "app-ai": { x: 1340, y: PLASMA_POS.y } },
      active: ["plasma", "kb", "app-ai"],
      edges: viaPlasma(["app-ai"]),
      brain: true,
      badges: { plasma: BRAIN_BADGE, "app-ai": { tone: "ok", text: "數分鐘產出報表" } },
      showAgent: true,
    },
  },
]

// ponytail: 完整性檢查,每次載入都跑;edge 參照到不存在的節點直接 throw
export function validateScenes(scenes: SceneDef[] = SCENES): void {
  for (const s of scenes.flatMap((sc) => (sc.plasma ? [sc, { ...sc.plasma, id: `${sc.id}+plasma` }] : [sc]))) {
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
