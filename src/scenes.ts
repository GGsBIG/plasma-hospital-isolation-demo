import type { Callout, Phase, SceneDef } from "./types"
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

// 情境 6:五個資料庫輪流被 AI 的 DELETE 打掛
const CRASH_ORDER = ["db-oracle", "db-postgres", "db-mssql", "db-mysql", "db-informix"]
const DS_OF: Record<string, string> = { "db-oracle": "ds-clinic", "db-postgres": "ds-ward", "db-mssql": "ds-admin", "db-informix": "ds-lab" }
const SEV1: Callout = {
  tone: "danger", side: "bottom", q: "重大事故（Sev-1）· 線上系統停機",
  brief: "醫院須於 1 小時內通報主管機關",
  rows: [
    ["機構", "通報時限", "主管機關"],
    ["銀行", "確認後 30 分鐘內（電話）、7 日內補公文", "金管會銀行局"],
    ["政府機關", "知悉後 1 小時內", "數位發展部資安署"],
    ["醫院", "資安事件 1 小時內／重大醫療事故 7 個工作日內", "數位發展部、衛福部"],
  ],
}

// dead:已停機的資料庫;target:正被 DELETE 打的那一個
function crashState(dead: string[], target?: string, alert = false): Phase["patch"] {
  const alive = dbIds.filter((id) => !dead.includes(id))
  const deadDs = dead.map((id) => DS_OF[id]).filter(Boolean)
  return {
    edges: [
      ...dsEdges.map((e) => (dead.includes(e.from) ? { ...e, state: "dead" as const } : e)),
      ...alive.filter((id) => id !== target).map((id) => ({ from: id, to: "app-ai", state: "overload" as const })),
      ...(target ? [{ from: "app-ai", to: target, state: "attack" as const }] : []),
    ],
    loads: Object.fromEntries(alive.map((id) => [id, HIGH[id as keyof typeof HIGH]])),
    down: [...dead, ...deadDs],
    badges: {
      ...Object.fromEntries([...dead, ...deadDs].map((id) => [id, { tone: "danger" as const, text: "停機" }])),
      "app-ai": { tone: "danger", text: target ? "誤下 DELETE 指令" : alert ? "具寫入權限" : "大量查詢" },
    },
    ...(alert ? { callouts: { "app-ai": SEV1 } } : {}),
  }
}

// 簡單的可重現亂數(同一個 seed 得到同樣結果)
function rng(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// 每一輪隨機挑 3 台、隨機順序打掛。各幕長度每輪固定(輪播計時靠它),但間隔一短一長,不像節拍器
const CRASH_COUNT = 3
const GAPS = [500, 1600, 5200]
function crashPhases(seed: number): Phase[] {
  const rand = rng(seed)
  // Fisher–Yates 洗牌(用 sort 搭配亂數比較會有偏差,前面的元素特別容易被選中)
  const pool = [...CRASH_ORDER]
  for (let k = pool.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1))
    ;[pool[k], pool[j]] = [pool[j], pool[k]]
  }
  const order = pool.slice(0, CRASH_COUNT)
  const phases: Phase[] = [{ ms: 2600, patch: {} }]
  order.forEach((id, k) => {
    const before = order.slice(0, k)
    phases.push({ ms: 1300, patch: crashState(before, id) })
    phases.push({ ms: GAPS[k], patch: crashState([...before, id], undefined, k === order.length - 1) })
  })
  return phases
}

// 結構涵蓋:任何一台被攻擊、任何一台停機
const CRASH_ALL: Phase["patch"][] = [
  ...CRASH_ORDER.map((id) => crashState([], id)),
  crashState(CRASH_ORDER, undefined, true),
]

// 情境 8:跨部門協調的來回過程(依時間輪播)
const HANDOFF: Callout = {
  tone: "danger",
  q: "",
  seq: [
    { who: "ds-aiteam", text: "需要資料！", time: "第 0 週" },
    { who: "ds-it", text: "找資料中…", time: "第 2 週" },
    { who: "ds-it", text: "資料給你", time: "第 3 週" },
    { who: "ds-aiteam", text: "資料不對，再協調一次", time: "第 4 週", tone: "danger" },
    { who: "ds-it", text: "重新找資料…（第 2 次）", time: "第 8 週" },
    { who: "ds-aiteam", text: "還是不對…", time: "第 12 週", tone: "danger" },
    { who: "ds-it", text: "重新找資料…（第 3 次）", time: "第 18 週" },
    { who: "ds-aiteam", text: "終於完成", time: "半年後", tone: "ok" },
    { who: "ds-it", text: "負責人離職了…新同仁重新協調", time: "從頭來過", tone: "danger" },
  ],
}

const fileIds = ["file-1", "file-2", "file-3", "file-4", "file-5"]

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
      // 既有系統等不到資料:單顆慢速光點,工作站旁轉圈等待
      ...dsEdges.map((e) => ({ ...e, state: "slow" as const })),
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
    pain: "每個應用各自串接五套資料庫，SQL 語法各異；大量查詢消耗資源，沒人在用的 API 更成資安破口。",
    fix: "所有應用透過 Plasma 單一入口，用一種標準 SQL 查詢所有資料庫，集中管理，不再重複查詢。",
    nodes: { ...dbCol(260), ...appCol(1340), "ghost-1": { x: 1060, y: 60 }, "ghost-2": { x: 1060, y: 985 } },
    active: [...appIds, ...dbIds, "ghost-1", "ghost-2"],
    edges: [
      ...appIds.flatMap((app) => dbIds.map((db) => ({ from: db, to: app, state: "risk" as const }))),
      // 停用系統的 API 沒拔掉:灰色虛線,沒有資料在流,卻還開著
      ...["db-oracle", "db-postgres", "db-mssql"].map((db) => ({ from: db, to: "ghost-1", state: "dead" as const })),
      ...["db-mssql", "db-mysql", "db-informix"].map((db) => ({ from: db, to: "ghost-2", state: "dead" as const })),
    ],
    loads: HIGH,
    badges: {
      ...Object.fromEntries(appIds.map((id) => [id, { tone: "danger" as const, text: "串接 5 套 API" }])),
      "ghost-1": { tone: "danger", text: "無人維護 · 資安破口" },
      "ghost-2": { tone: "danger", text: "無人維護 · 資安破口" },
    },
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
    // 每個資料庫各匯出一個檔(Excel、CSV、文字檔),全部交給人工處理
    nodes: {
      ...dbCol(260),
      ...Object.fromEntries(fileIds.map((id, k) => [id, { x: 600, y: DB_Y[dbIds[k]] }])),
      manual: { x: 1000, y: MID },
      "app-report": { x: 1340, y: MID },
    },
    active: [...dbIds, ...fileIds, "manual", "app-report"],
    // 手工作業:檔案是人工匯出、人工交付的,沒有系統之間的連線
    edges: [],
    badges: {
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

  // 6. 資安風險:AI 大量查詢拖垮效能,誤下 DELETE 讓資料庫停機 → 重大事故、依法限時通報
  {
    id: "ai-risk",
    title: "AI 的資安與效能風險",
    short: "資安風險",
    pain: "AI 直連正式資料庫，大量查詢拖垮效能；一個錯誤指令就可能刪改資料，導致線上系統停機。",
    fix: "AI 只透過 Plasma 唯讀存取，依角色控管權限，正式資料庫不會被誤刪或改動。",
    nodes: { ...dsCol(150), ...dbCol(480), "app-ai": { x: 1340, y: MID } },
    active: [...dsIds, ...dbIds, "app-ai"],
    // 第 1 幕(預設內容):AI 大量查詢,所有資料庫過載冒煙
    edges: [...dsEdges, ...dbIds.map((id) => ({ from: id, to: "app-ai", state: "overload" as const }))],
    loads: HIGH,
    badges: { "app-ai": { tone: "danger", text: "大量查詢" } },
    // 輪播:先過載,接著 AI 誤下 DELETE,每輪隨機 3 台資料庫依隨機順序垮掉(連帶的既有系統停機),最後跳出重大事故警報
    phases: crashPhases,
    phaseAll: CRASH_ALL,
    plasma: {
      nodes: { ...dsCol(150), ...dbCol(480), plasma: PLASMA_POS, "app-ai": { x: 1340, y: MID } },
      active: [...dsIds, ...dbIds, "plasma", "app-ai"],
      edges: [...dsEdges, ...viaPlasma(["app-ai"])],
      loads: NORMAL,
      badges: {
        plasma: { tone: "ok", text: "唯讀 · 權限控管" },
        "app-ai": { tone: "ok", text: "依權限存取" },
      },
    },
  },

  // 7. AI 不了解院內資料 → 知識庫與 Plasma 合體成資料大腦,AI 答得準
  {
    id: "knowledge",
    title: "AI 不了解院內資料",
    short: "Plasma 大腦",
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
      // IT 與資料庫一來一回:去撈資料、資料送回來,兩條線並排
      ...dbIds.map((id) => ({ from: "ds-it", to: id, state: "risk" as const, lane: -9 })),
      ...dbIds.map((id) => ({ from: id, to: "ds-it", state: "risk" as const, lane: 9 })),
      { from: "ds-it", to: "ds-aiteam", state: "risk" },
    ],
    // 一個泡泡輪流在 AI 部門與 IT 部門上方出現,演出來回協調的過程與累計時間
    callouts: { "ds-aiteam": HANDOFF, "ds-it": HANDOFF },
    badges: { "ds-aiteam": { tone: "warn", text: "等待資料" } },
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
