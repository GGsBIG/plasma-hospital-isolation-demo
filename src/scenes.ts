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

const HIGH = { "db-oracle": 96, "db-postgres": 88, "db-mssql": 91, "db-mysql": 85, "db-informix": 83 }
const NORMAL = { "db-oracle": 34, "db-postgres": 30, "db-mssql": 31, "db-mysql": 29, "db-informix": 30 }

// 既有系統接回各自的源頭資料庫
const dsEdges = [
  { from: "db-oracle", to: "ds-clinic", state: "normal" as const },
  { from: "db-postgres", to: "ds-ward", state: "normal" as const },
  { from: "db-mssql", to: "ds-admin", state: "normal" as const },
  { from: "db-informix", to: "ds-lab", state: "normal" as const },
]

const MID = PLASMA_POS.y // 單線流程(檔案、IT、報表…)排在 Plasma 那一列

// 情境 2 導入後:資料庫(與對應的既有系統)上下間距收緊,外圍的防護框連同下緣標題才放得進舞台
const TIGHT_Y: Record<string, number> = { "db-oracle": 165, "db-postgres": 350, "db-mssql": 535, "db-mysql": 720, "db-informix": 905 }
const DS_DB: Record<string, string> = { "ds-clinic": "db-oracle", "ds-ward": "db-postgres", "ds-admin": "db-mssql", "ds-lab": "db-informix" }
const tight = (ids: string[], x: number) => Object.fromEntries(ids.map((id) => [id, { x, y: TIGHT_Y[DS_DB[id] ?? id] }]))

// 每頁一個痛點:預設畫面是「導入前」,右上角切到「導入 Plasma 後」看解法。
// 每頁左側只有標題 + 導入前一句 + 導入後一句;圖上每個節點最多一個徽章,只強調一個關鍵對比
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
    edges: dsEdges,
    loads: { "db-oracle": 35, "db-postgres": 30, "db-mssql": 32, "db-mysql": 28, "db-informix": 30 },
  },

  // 2. 保護核心資料庫:新應用直連 → 正式系統變慢;導入後資料庫被圍在防護框內,既有系統恢復正常
  {
    id: "protect",
    title: "保護核心資料庫",
    short: "保護核心",
    pain: "新應用直接查詢正式資料庫，負載飆升，門診、護理系統跟著變慢。",
    fix: "Plasma 隔離核心資料庫，新應用只向 Plasma 取用，正式環境運作不受影響。",
    nodes: { ...dsCol(220), ...dbCol(720), ...appCol(1320) },
    active: [...appIds, ...dbIds],
    // 左側既有系統是配角,但要看得出「回應變慢」,比預設淡化再清楚一點
    dimOpacity: 0.5,
    edges: [
      ...dsEdges,
      { from: "db-oracle", to: "app-ap", state: "overload" },
      { from: "db-oracle", to: "app-fhir", state: "overload" },
      { from: "db-postgres", to: "app-fhir", state: "overload" },
      { from: "db-mssql", to: "app-bi", state: "overload" },
      { from: "db-informix", to: "app-bi", state: "overload" },
      { from: "db-mysql", to: "app-ai", state: "overload" },
      { from: "db-oracle", to: "app-ai", state: "overload" },
    ],
    loads: HIGH,
    plasma: {
      // 既有系統留在畫面上,看得到「正常運作」= 正式環境不受影響
      nodes: { ...tight(dsIds, 150), ...tight(dbIds, 480), plasma: PLASMA_POS, ...appCol(1340) },
      active: [...dsIds, ...dbIds, "plasma", ...appIds],
      edges: [...dsEdges, ...viaPlasma(appIds)],
      loads: NORMAL,
      zone: { ids: dbIds, label: "核心資料庫 · 受保護" },
    },
  },

  // 3. API 串接蜘蛛網化 → 單一入口
  {
    id: "api",
    title: "API 串接蜘蛛網化",
    short: "API 串接",
    pain: "每個應用各自串接五套資料庫，各家 SQL 語法不同、錯綜複雜難以管理，大量查詢更消耗正式資料庫資源。",
    fix: "所有應用透過 Plasma 單一入口，用一種標準 SQL 查詢所有資料庫，集中管理，不再重複查詢。",
    nodes: { ...dbCol(260), ...appCol(1340) },
    active: [...appIds, ...dbIds],
    edges: appIds.flatMap((app) => dbIds.map((db) => ({ from: db, to: app, state: "risk" as const }))),
    loads: HIGH,
    badges: Object.fromEntries(appIds.map((id) => [id, { tone: "danger" as const, text: "串接 5 套 API" }])),
    // 同一個需求,各家資料庫寫法都不同
    callouts: {
      "app-bi": {
        tone: "danger", side: "left", q: "同一需求：取前 10 筆",
        code: [["Oracle", "WHERE ROWNUM <= 10"], ["MS SQL", "SELECT TOP 10"], ["MySQL／PG", "LIMIT 10"], ["Informix", "SELECT FIRST 10"]],
      },
    },
    plasma: {
      nodes: { ...dbCol(260), plasma: PLASMA_POS, ...appCol(1340) },
      active: [...appIds, "plasma", ...dbIds],
      edges: viaPlasma(appIds),
      loads: NORMAL,
      badges: { plasma: { tone: "ok", text: "單一入口 · 統一 SQL" } },
      callouts: {
        plasma: { tone: "ok", q: "同一需求：取前 10 筆", code: [["Plasma", "SELECT … LIMIT 10"]], a: "一種 SQL 查詢 5 套資料庫" },
      },
    },
  },

  // 4. 手工合併資料 → Plasma 自動整合、報表即時
  {
    id: "manual",
    title: "手工合併資料",
    short: "手工合併",
    pain: "各資料庫分別匯出檔案，再由 IT 人員手工整併，費時費力、容易出錯，報表無法即時。",
    fix: "Plasma 自動整合五套資料庫，報表直接取用即時、一致的資料。",
    nodes: { ...dbCol(260), files: { x: 640, y: MID }, "ds-it": { x: 1000, y: MID }, "app-report": { x: 1340, y: MID } },
    active: [...dbIds, "files", "ds-it", "app-report"],
    edges: [
      ...dbIds.map((id) => ({ from: id, to: "files", state: "risk" as const })),
      { from: "files", to: "ds-it", state: "risk" },
      { from: "ds-it", to: "app-report", state: "risk" },
    ],
    badges: {
      "ds-it": { tone: "warn", text: "手工整併" },
      "app-report": { tone: "danger", text: "耗時數天 · 易出錯" },
    },
    plasma: {
      nodes: { ...dbCol(260), plasma: PLASMA_POS, "app-report": { x: 1340, y: MID } },
      active: [...dbIds, "plasma", "app-report"],
      edges: viaPlasma(["app-report"]),
      badges: {
        plasma: { tone: "ok", text: "自動整合 5 套資料庫" },
        "app-report": { tone: "ok", text: "即時更新" },
      },
    },
  },

  // 5. 不同院區各有一套 HIS → Plasma 整合成全院視圖
  {
    id: "campus",
    title: "跨院區資料無法整合",
    short: "跨院區",
    pain: "各院區 HIS 的病歷號與代碼各自編碼，跨院區報表難以彙整，其他院區的檢驗結果也查不到。",
    fix: "Plasma 整合各院區資料並統一代碼，提供全院一致的資料視圖。",
    nodes: { ...campusCol(400), "app-bi": { x: 1200, y: MID } },
    active: [...campusIds, "app-bi"],
    edges: campusIds.map((id) => ({ from: id, to: "app-bi", state: "risk" as const })),
    badges: { "app-bi": { tone: "danger", text: "資料無法彙整" } },
    plasma: {
      nodes: { ...campusCol(260), plasma: PLASMA_POS, "app-bi": { x: 1340, y: MID } },
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

  // 6. AI 的資安與效能風險 → 經由 Plasma 控管權限、不衝擊正式資料庫
  {
    id: "ai-risk",
    title: "AI 的資安與效能風險",
    short: "資安風險",
    pain: "AI 頻繁大量查詢，資料庫負載過高；串接後，誰能透過 AI 取用機敏資料也難以掌控。",
    fix: "AI 只透過 Plasma 存取，依角色控管權限、遮罩機敏欄位，正式資料庫不受衝擊。",
    nodes: { ...dbCol(260), "app-ai": { x: 1340, y: MID } },
    active: [...dbIds, "app-ai"],
    edges: dbIds.map((id) => ({ from: id, to: "app-ai", state: "overload" as const })),
    loads: HIGH,
    badges: { "app-ai": { tone: "danger", text: "機敏資料存取無管控" } },
    plasma: {
      nodes: { ...dbCol(260), plasma: PLASMA_POS, "app-ai": { x: 1340, y: MID } },
      active: [...dbIds, "plasma", "app-ai"],
      edges: viaPlasma(["app-ai"]),
      loads: NORMAL,
      badges: {
        plasma: { tone: "ok", text: "權限控管 · 機敏欄位遮罩" },
        "app-ai": { tone: "ok", text: "依權限存取" },
      },
    },
  },

  // 7. AI 不了解院內資料 → 知識庫與 Plasma 合體成資料大腦,AI 答得準
  {
    id: "knowledge",
    title: "AI 不了解院內資料",
    short: "AI 資料大腦",
    pain: "資料庫欄位多為代碼，AI 不了解其意義，回答容易出錯。",
    fix: "匯入資料字典與系統文件，Plasma 成為最了解院內資料的大腦，AI 的答案最精準。",
    nodes: { ...dbCol(260), "app-ai": { x: 1340, y: MID } },
    active: [...dbIds, "app-ai"],
    edges: dbIds.map((id) => ({ from: id, to: "app-ai", state: "risk" as const })),
    badges: { "app-ai": { tone: "danger", text: "回答不準確" } },
    callouts: { "app-ai": { tone: "danger", q: ASK, a: "無法判斷 DEPT_C 欄位意義" } },
    plasma: {
      nodes: { ...dbCol(260), kb: KB_DOCK, plasma: PLASMA_POS, "app-ai": { x: 1340, y: MID } },
      active: ["plasma", "kb", "app-ai"],
      edges: viaPlasma(["app-ai"]),
      brain: true,
      badges: { plasma: BRAIN_BADGE, "app-ai": { tone: "ok", text: "回答精準" } },
      callouts: { "app-ai": { tone: "ok", q: ASK, a: "312 人" } },
    },
  },

  // 8. 跨部門溝通成本 → AI Agent 透過 MCP 自助取得資料
  {
    id: "mcp",
    title: "跨部門溝通成本",
    short: "跨部門協作",
    pain: "AI 部門提出需求，IT 人工撈取、清洗再交付，往返溝通，流程冗長。",
    fix: "AI Agent 透過 MCP 直接向 Plasma 取得資料，數分鐘產出結果，不必跨部門等待。",
    nodes: { ...dbCol(260), "ds-it": { x: 800, y: MID }, "ds-aiteam": { x: 1340, y: MID } },
    active: [...dbIds, "ds-it", "ds-aiteam"],
    edges: [
      ...dbIds.map((id) => ({ from: id, to: "ds-it", state: "risk" as const })),
      { from: "ds-it", to: "ds-aiteam", state: "risk" },
    ],
    badges: {
      "ds-it": { tone: "warn", text: "撈取 · 清洗 · 交付" },
      "ds-aiteam": { tone: "danger", text: "往返數天" },
    },
    plasma: {
      nodes: { ...dbCol(260), kb: KB_DOCK, plasma: PLASMA_POS, "app-ai": { x: 1340, y: MID } },
      active: ["plasma", "kb", "app-ai"],
      edges: viaPlasma(["app-ai"]),
      brain: true,
      badges: { plasma: BRAIN_BADGE, "app-ai": { tone: "ok", text: "數分鐘取得結果" } },
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
