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
// 知識庫與 Plasma 合體:知識庫疊在 Plasma 的平台上(落下合體),不顯示名稱;
// nodes 裡 kb 要寫在 plasma 後面,才會畫在 Plasma 上層
const KB_DOCK = { x: 800, y: 450 } // Plasma 核心立方體頂面(Plasma 中心往上 PLASMA_LIFT × 1.3)
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
const branchIds = ["campus-north", "campus-south"]
// 總院在左、兩間分院在右;導入後 Plasma 插在中間
const CAMPUS_POS = { "campus-main": { x: 260, y: 525 }, "campus-north": { x: 1340, y: 300 }, "campus-south": { x: 1340, y: 750 } }
// 一來一回兩條線並排(上去、送回來);reveal 給延遲毫秒時,先畫出去程、再畫出回程
const twoWay = (a: string, b: string, reveal?: number) => [
  { from: a, to: b, state: "isolated" as const, lane: -9, reveal },
  { from: b, to: a, state: "isolated" as const, lane: 9, reveal: reveal === undefined ? undefined : reveal + 350 },
]

// 跨院區導入前:分院透過 DB Link 向總院拉資料,白天尖峰不能拉,只能等凌晨離峰;
// 一來一回兩條線(分院送出查詢、總院資料送回)依序畫出
const DBLINK_PHASES: Phase[] = [
  {
    ms: 2600,
    patch: {
      edges: [],
      badges: {
        "campus-main": { tone: "warn", text: "看診尖峰" },
        ...Object.fromEntries(branchIds.map((id) => [id, { tone: "idle" as const, text: "等凌晨同步" }])),
      },
      callouts: { "campus-main": { tone: "idle", q: "白天尖峰，不能拉資料", time: "08:00–24:00" } },
    },
  },
  {
    ms: 3200,
    patch: {
      edges: branchIds.flatMap((id, k) => [
        { from: id, to: "campus-main", state: "risk" as const, lane: -9, reveal: k * 300 },
        { from: "campus-main", to: id, state: "risk" as const, lane: 9, reveal: 450 + k * 300 },
      ]),
      badges: {
        "campus-main": { tone: "idle", text: "離峰" },
        ...Object.fromEntries(branchIds.map((id) => [id, { tone: "warn" as const, text: "DB Link 拉取中" }])),
      },
      callouts: { "campus-main": { tone: "idle", q: "凌晨離峰，DB Link 拉資料", time: "02:00" } },
    },
  },
  {
    ms: 2800,
    patch: {
      edges: [],
      badges: Object.fromEntries(branchIds.map((id) => [id, { tone: "danger" as const, text: "資料是昨天的" }])),
      callouts: { "campus-main": { tone: "danger", q: "分院隔天才看得到", time: "隔天 08:00" } },
    },
  },
]

// FHIR 對外交換:FHIR Server 與院外的診所、藥局
const extIds = ["ext-clinic", "ext-pharmacy"]
// 導入後是五段流程(資料庫 → Plasma → PostgreSQL → FHIR Server → 診所／藥局),這頁的 Plasma 往左移,各欄間距平均
const FHIR_POS = { x: 1230, y: 525 }
const EXT_POS = { "ext-clinic": { x: 1480, y: 400 }, "ext-pharmacy": { x: 1480, y: 650 } }
const FHIR_PLASMA = { x: 640, y: 525 }
const FHIR_PG = { x: 960, y: 525 }

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

// 情境 4:人工逐一到各資料庫匯出,再手動合併,最後產出健保申報、評鑑資料
const outIds = ["app-claim", "app-accredit"]
const OUT_POS = { "app-claim": { x: 1340, y: 400 }, "app-accredit": { x: 1340, y: 650 } }
const PULL_DAY: Record<string, string> = {
  "db-oracle": "第 1 天", "db-postgres": "第 1 天", "db-mssql": "第 2 天", "db-mysql": "第 2 天", "db-informix": "第 3 天",
}
// 還沒產出前,三種產出都在等資料
const WAIT = Object.fromEntries(outIds.map((id) => [id, { tone: "idle" as const, text: "等待資料" }]))
const MANUAL_PHASES: Phase[] = [
  // 一次只去一個資料庫:先畫出「去要資料」那條,再畫出「檔案送回來」那條(兩條線並排)
  ...dbIds.map((id, k) => ({
    ms: 1800,
    patch: {
      edges: [
        { from: "manual", to: id, state: "risk" as const, lane: -9, reveal: 0 },
        { from: id, to: "manual", state: "risk" as const, lane: 9, reveal: 450 },
      ],
      badges: {
        ...WAIT,
        ...Object.fromEntries(dbIds.slice(0, k).map((d) => [d, { tone: "idle" as const, text: "已匯出" }])),
        [id]: { tone: "warn" as const, text: "匯出中" },
        manual: { tone: "warn" as const, text: `收集檔案 ${k + 1}／5` },
      },
      callouts: { manual: { tone: "idle" as const, q: `匯出 ${NODE_BY_ID[id].label} 資料`, time: PULL_DAY[id] } },
    },
  })),
  {
    ms: 2200,
    patch: {
      edges: [],
      badges: { ...WAIT, manual: { tone: "danger", text: "手動合併 5 份檔案" } },
      callouts: { manual: { tone: "idle", q: "Excel 逐筆比對、合併", time: "第 4 天" } },
    },
  },
  {
    ms: 2600,
    patch: {
      edges: outIds.map((id, k) => ({ from: "manual", to: id, state: "risk" as const, reveal: k * 200 })),
      badges: {
        "app-claim": { tone: "warn", text: "需人工核對" },
        "app-accredit": { tone: "warn", text: "版本不一" },
      },
      callouts: { manual: { tone: "idle", q: "產出申報、評鑑資料", time: "第 5 天" } },
    },
  },
  {
    ms: 2400,
    patch: {
      edges: [],
      badges: {
        "app-claim": { tone: "danger", text: "數字對不上" },
        "app-accredit": { tone: "warn", text: "版本不一" },
      },
      callouts: { manual: { tone: "danger", q: "主管：數字對不上，重拉一次", time: "從頭來過" } },
    },
  },
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
    pain: "新應用直連正式資料庫，門診、護理系統跟著變慢。",
    fix: "新應用改向 Plasma 取用，正式資料庫不受影響。",
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
    pain: "每個應用各接五套資料庫，語法各異；廢棄的 API 成為資安破口。",
    fix: "單一入口、一種 SQL，集中管理所有資料庫。",
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

  // 4. 手工合併資料:人工逐一匯出 → 手動合併 → 產出(健保申報、評鑑資料),數字對不上再重來 → Plasma 自動整合
  {
    id: "manual",
    title: "手工合併資料",
    short: "手工合併",
    pain: "人工逐一到各資料庫匯出，再手動合併，數字要等好幾天。",
    fix: "Plasma 自動整合，健保申報、評鑑資料一次到位。",
    nodes: { ...dbCol(260), manual: { x: 800, y: MID }, ...OUT_POS },
    active: [...dbIds, "manual", ...outIds],
    edges: [],
    // 依時間輪播:Oracle → PostgreSQL → MS SQL → MySQL → Informix → 手動合併 → 產出 → 數字對不上
    phases: MANUAL_PHASES,
    plasma: {
      nodes: { ...dbCol(260), plasma: PLASMA_POS, ...OUT_POS },
      active: [...dbIds, "plasma", ...outIds],
      edges: viaPlasma(outIds),
      badges: {
        plasma: { tone: "ok", text: "自動整合 5 套資料庫" },
        "app-claim": { tone: "ok", text: "自動產出" },
        "app-accredit": { tone: "ok", text: "單一版本" },
      },
    },
  },

  // 5. 跨院區:分院透過 DB Link 向總院拉資料,只能等凌晨離峰 → 各院區與 Plasma 雙向即時同步
  {
    id: "campus",
    title: "跨院區資料不同步",
    short: "跨院區",
    pain: "分院透過 DB Link 向總院拉資料，只能等凌晨離峰，隔天才看得到。",
    fix: "各院區即時同步，資料就在院區本地。",
    nodes: CAMPUS_POS,
    active: campusIds,
    edges: [],
    // 依時間輪播:白天尖峰不能拉 → 凌晨 DB Link 拉資料 → 隔天才看得到
    phases: DBLINK_PHASES,
    plasma: {
      nodes: { ...CAMPUS_POS, plasma: PLASMA_POS },
      active: [...campusIds, "plasma"],
      // 切到導入後:總院、北區、南區依序與 Plasma 畫出雙向連線
      edges: campusIds.flatMap((id, k) => twoWay(id, "plasma", k * 250)),
      badges: {
        plasma: { tone: "ok", text: "即時同步" },
        ...Object.fromEntries(branchIds.map((id) => [id, { tone: "ok" as const, text: "即時可查" }])),
      },
    },
  },

  // 6. FHIR 對外交換:轉檔程式直連核心資料庫 → Plasma 整理後寫入 PostgreSQL,FHIR Server 只讀這台,以標準格式與院外交換
  {
    id: "fhir",
    title: "FHIR 對外交換",
    short: "FHIR 交換",
    pain: "FHIR 轉檔直連核心資料庫，負載過高、格式不一。",
    fix: "Plasma 整理好資料存入 PostgreSQL，FHIR 只讀這一台。",
    nodes: { ...dbCol(220), "app-fhir": FHIR_POS, ...EXT_POS },
    active: [...dbIds, "app-fhir", ...extIds],
    edges: [
      ...dbIds.map((id) => ({ from: id, to: "app-fhir", state: "overload" as const })),
      ...extIds.map((id) => ({ from: "app-fhir", to: id, state: "risk" as const })),
    ],
    loads: HIGH,
    badges: Object.fromEntries(extIds.map((id) => [id, { tone: "danger" as const, text: "格式不一" }])),
    plasma: {
      nodes: { ...dbCol(220), plasma: FHIR_PLASMA, "serving-pg": FHIR_PG, "app-fhir": FHIR_POS, ...EXT_POS },
      active: [...dbIds, "plasma", "serving-pg", "app-fhir", ...extIds],
      // 進 Plasma 前光點各色(各系統格式不一),出來後統一成同一色
      edges: [
        ...dbIds.map((id) => ({ from: id, to: "plasma", state: "raw" as const })),
        { from: "plasma", to: "serving-pg", state: "isolated" },
        { from: "serving-pg", to: "app-fhir", state: "isolated" },
        ...extIds.map((id) => ({ from: "app-fhir", to: id, state: "isolated" as const })),
      ],
      loads: NORMAL,
      stack: ["serving-pg", "app-fhir"],
      badges: {
        plasma: { tone: "ok", text: "清洗 · 統一代碼" },
        "serving-pg": { tone: "ok", text: "標準化資料" },
        ...Object.fromEntries(extIds.map((id) => [id, { tone: "ok" as const, text: "電子處方箋" }])),
      },
    },
  },

  // 7. 資安風險:AI 大量查詢拖垮效能,誤下 DELETE 讓資料庫停機 → 重大事故、依法限時通報
  {
    id: "ai-risk",
    title: "AI 的資安與效能風險",
    short: "資安風險",
    pain: "AI 直連正式資料庫，一個錯誤指令就可能讓系統停機。",
    fix: "AI 只能透過 Plasma 唯讀存取，資料不會被誤刪。",
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

  // 8. AI 不了解院內資料 → 知識庫與 Plasma 合體成資料大腦,AI 答得準
  {
    id: "knowledge",
    title: "AI 不了解院內資料",
    short: "Plasma 大腦",
    pain: "欄位多為代碼，AI 看不懂，答案容易出錯。",
    fix: "匯入資料字典，Plasma 成為最懂院內資料的大腦。",
    // 源頭資料庫靠左、AI 靠右,中間留給大腦輪廓
    nodes: { ...dbCol(150), "app-ai": { x: 1460, y: MID } },
    active: [...dbIds, "app-ai"],
    edges: dbIds.map((id) => ({ from: id, to: "app-ai", state: "risk" as const })),
    badges: { "app-ai": { tone: "danger", text: "回答不準確" } },
    callouts: { "app-ai": { tone: "danger", q: ASK, a: "無法判斷 DEPT_C 欄位意義" } },
    plasma: {
      nodes: { ...dbCol(150), plasma: PLASMA_POS, kb: KB_DOCK, "app-ai": { x: 1460, y: MID } },
      active: ["plasma", "kb", "app-ai"],
      edges: viaPlasma(["app-ai"]),
      brain: true,
      // 系統文件、資料庫描述等文件依序飛進知識庫,接著大腦輪廓把知識庫與 Plasma 包在一起
      upload: true,
      merged: ["kb"],
      badges: { plasma: BRAIN_BADGE, "app-ai": { tone: "ok", text: "回答精準" } },
      callouts: { "app-ai": { tone: "ok", q: ASK, a: "312 人" } },
    },
  },

  // 9. 跨部門溝通成本 → AI Agent 透過 MCP 自助取得資料
  {
    id: "mcp",
    title: "跨部門溝通成本",
    short: "跨部門協作",
    pain: "需求在 AI 部門與 IT 之間來回，動輒數月。",
    fix: "AI Agent 透過 MCP 直接取用資料，數分鐘完成。",
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
      // 同大腦頁:源頭資料庫靠左、AI 靠右,中間留給大腦輪廓
      nodes: { ...dbCol(150), plasma: PLASMA_POS, kb: KB_DOCK, "app-ai": { x: 1460, y: MID } },
      active: ["plasma", "kb", "app-ai"],
      edges: viaPlasma(["app-ai"]),
      brain: true,
      merged: ["kb"],
      badges: { plasma: BRAIN_BADGE, "app-ai": { tone: "ok", text: "數分鐘取得結果" } },
      showAgent: true,
    },
  },
]

// 每頁切到「導入 Plasma 後」時,新出現的連線依資料流的先後逐步畫出:
// 起點離源頭越遠越晚畫(源頭資料庫 → Plasma → 應用…),同一層再依序錯開一點。已自訂 reveal 的頁面不動
const HOP_MS = 450
const STEP_MS = 70
for (const scene of SCENES) {
  const st = scene.plasma
  if (!st || st.edges.some((e) => e.reveal !== undefined)) continue
  const depth = new Map<string, number>()
  const depthOf = (id: string, seen = new Set<string>()): number => {
    if (depth.has(id)) return depth.get(id)!
    if (seen.has(id)) return 0
    seen.add(id)
    const ins = st.edges.filter((e) => e.to === id)
    const d = ins.length ? Math.max(...ins.map((e) => depthOf(e.from, seen) + 1)) : 0
    depth.set(id, d)
    return d
  }
  const perHop = new Map<number, number>()
  st.edges = st.edges.map((e) => {
    const hop = depthOf(e.from)
    const k = perHop.get(hop) ?? 0
    perHop.set(hop, k + 1)
    return { ...e, reveal: hop * HOP_MS + k * STEP_MS }
  })
}

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
