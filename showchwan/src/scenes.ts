import type { Callout, Phase, SceneDef } from "./types"
import { NODE_BY_ID } from "./data"

// 由左至右的資料流:四家分院資料庫 → (Plasma) → 總院,y 為舞台 px
const DB_Y: Record<string, number> = { "db-oracle": 202, "db-postgres": 417, "db-mssql": 632, "db-mysql": 847 }
// 各分院護理站與自己的資料庫對齊
const DS_Y: Record<string, number> = {
  "ds-clinic": DB_Y["db-oracle"], "ds-ward": DB_Y["db-postgres"], "ds-admin": DB_Y["db-mssql"], "ds-pacs": DB_Y["db-mysql"],
}

const PLASMA_POS = { x: 800, y: 525 }
// 知識庫疊在 Plasma 核心立方體頂面;nodes 裡 kb 要寫在 plasma 後面
const KB_DOCK = { x: 800, y: 439 }
const MID = PLASMA_POS.y
const ASK = "B 分院有幾位護理師？"
const BRAIN_BADGE = { tone: "ok" as const, text: "已讀懂四家分院的欄位" }

const col = (ys: Record<string, number>, x: number) =>
  Object.fromEntries(Object.entries(ys).map(([id, y]) => [id, { x, y }]))
const dbCol = (x: number) => col(DB_Y, x)
const dsCol = (x: number) => col(DS_Y, x)
const dbIds = Object.keys(DB_Y)
const dsIds = Object.keys(DS_Y)

const dsEdges = [
  { from: "db-oracle", to: "ds-clinic", state: "normal" as const },
  { from: "db-postgres", to: "ds-ward", state: "normal" as const },
  { from: "db-mssql", to: "ds-admin", state: "normal" as const },
  { from: "db-mysql", to: "ds-pacs", state: "normal" as const },
]

const viaPlasma = (ids: string[]) => [
  ...dbIds.map((id) => ({ from: id, to: "plasma", state: "isolated" as const })),
  ...ids.map((id) => ({ from: "plasma", to: id, state: "isolated" as const })),
]

// 同一份「護理人員」資料,四家分院的資料表、欄位與職稱代碼都不同
const SCHEMA: Record<string, string> = {
  "db-oracle": "NURSE_MST.NRS_NAME",
  "db-postgres": "emp.title_cd = 'N02'",
  "db-mssql": "HR_STAFF.JOB = '護理師'",
  "db-mysql": "staff.role_id = 7",
}
const PULL_DAY: Record<string, string> = {
  "db-oracle": "第 1 天", "db-postgres": "第 2 天", "db-mssql": "第 3 天", "db-mysql": "第 4 天",
}

// 情境 2 導入前:總院逐家要資料,每家匯出的欄位都不一樣,合併後數字兜不攏
const WAIT = { "app-bi": { tone: "idle" as const, text: "等待資料" } }
const MANUAL_PHASES: Phase[] = [
  ...dbIds.map((id, k) => ({
    ms: 1900,
    patch: {
      edges: [
        { from: "manual", to: id, state: "risk" as const, lane: -9, reveal: 0 },
        { from: id, to: "manual", state: "risk" as const, lane: 9, reveal: 450 },
      ],
      badges: {
        ...WAIT,
        ...Object.fromEntries(dbIds.slice(0, k).map((d) => [d, { tone: "idle" as const, text: "已匯出" }])),
        [id]: { tone: "warn" as const, text: "匯出 Excel" },
        manual: { tone: "warn" as const, text: `收集檔案 ${k + 1}／4` },
      },
      callouts: { manual: { tone: "idle" as const, q: `${NODE_BY_ID[id].label}：${SCHEMA[id]}`, time: PULL_DAY[id] } },
    },
  })),
  {
    ms: 2400,
    patch: {
      edges: [],
      badges: { ...WAIT, manual: { tone: "danger", text: "四種欄位對不起來" } },
      callouts: { manual: { tone: "idle", q: "Excel 逐欄比對職稱代碼", time: "第 6 天" } },
    },
  },
  {
    ms: 2400,
    patch: {
      edges: [{ from: "manual", to: "app-bi", state: "risk" as const, reveal: 0 }],
      badges: { "app-bi": { tone: "warn", text: "需人工核對" } },
      callouts: { manual: { tone: "idle", q: "產出跨院護理人力表", time: "第 8 天" } },
    },
  },
  {
    ms: 2600,
    patch: {
      edges: [],
      badges: { "app-bi": { tone: "danger", text: "人數兜不攏" } },
      callouts: { manual: { tone: "danger", q: "主管：數字不對，重拉一次", time: "從頭來過" } },
    },
  },
]

// 情境 4 導入前:總院與各分院 IT 來回協調
const HANDOFF: Callout = {
  tone: "danger",
  q: "",
  seq: [
    { who: "ds-aiteam", text: "要四家分院的護理人員名單", time: "第 0 週" },
    { who: "ds-it", text: "四家各自寫 SQL…", time: "第 2 週" },
    { who: "ds-it", text: "名單給你（四種格式）", time: "第 3 週" },
    { who: "ds-aiteam", text: "職稱代碼看不懂，再問一次", time: "第 4 週", tone: "danger" },
    { who: "ds-it", text: "重新整理…（第 2 次）", time: "第 7 週" },
    { who: "ds-aiteam", text: "C 分院少了兼任護理師", time: "第 9 週", tone: "danger" },
    { who: "ds-it", text: "重新整理…（第 3 次）", time: "第 12 週" },
    { who: "ds-aiteam", text: "終於對齊", time: "三個月後", tone: "ok" },
    { who: "ds-it", text: "下個月要更新，再來一次", time: "從頭來過", tone: "danger" },
  ],
}

// 情境 6:總院彙整表(四家分院的護理人力)
const ROSTER_Q = "上月各分院護理師人數"
const FULL: [string, string][] = [["A 分院", "248"], ["B 分院", "186"], ["C 分院", "214"], ["D 分院", "164"]]

export const SCENES: SceneDef[] = [
  // 1. 開場:四家分院各有一套資料庫
  {
    id: "current",
    title: "秀傳現況",
    short: "秀傳現況",
    bullets: [
      "四家分院各有一套 HIS 資料庫，廠牌不同。",
      "資料表、欄位命名、職稱代碼也都不一樣。",
      "各分院院內系統運作正常，但總院要跨院統計時，資料兜不起來。",
    ],
    nodes: { ...dbCol(560), ...dsCol(1060) },
    active: [...dbIds, ...dsIds],
    edges: dsEdges,
    badges: Object.fromEntries(dbIds.map((id) => [id, { tone: "idle" as const, text: SCHEMA[id].split(/[.= ]/)[0] }])),
  },

  // 2. 總院統計不出來 → 四家分院接上 Plasma
  {
    id: "connect",
    title: "總院統計不出來",
    short: "跨院統計",
    pain: "總院要各分院匯出 Excel\n四家的欄位、代碼都不同\n合併一次要一週以上",
    fix: "四家分院資料庫接上 Plasma\n只讀取，不影響院內系統\n每家分院有自己的工作區",
    nodes: { ...dbCol(260), manual: { x: 800, y: MID }, "app-bi": { x: 1340, y: MID } },
    active: [...dbIds, "manual", "app-bi"],
    edges: [],
    phases: MANUAL_PHASES,
    plasma: {
      // Plasma 往右挪,資料庫與 Plasma 之間留出連線的空間(手機版位置由 layout.ts 固定)
      nodes: { ...dsCol(150), ...dbCol(520), plasma: { x: 1080, y: MID } },
      active: [...dsIds, ...dbIds, "plasma"],
      edges: [...dsEdges, ...viaPlasma([])],
      badges: { plasma: { tone: "ok", text: "唯讀接入 · 各分院工作區" } },
    },
  },

  // 3. AI 看不懂各分院的欄位 → 上傳系統文件,Plasma 讀懂四家 schema
  {
    id: "knowledge",
    title: "AI 看不懂各分院的欄位",
    short: "上傳文件",
    pain: "四家分院的欄位多半是代碼\nAI 不知道 N02、7 代表護理師\n回答容易出錯",
    fix: "各分院上傳系統文件、資料字典\nPlasma 讀懂四家的欄位與代碼\nAI 答得出正確數字",
    nodes: { ...dbCol(150), "app-ai": { x: 1460, y: MID } },
    active: [...dbIds, "app-ai"],
    edges: dbIds.map((id) => ({ from: id, to: "app-ai", state: "risk" as const })),
    badges: { "app-ai": { tone: "danger", text: "回答不準確" } },
    callouts: { "app-ai": { tone: "danger", q: ASK, a: "無法判斷 title_cd = 'N02' 的意思" } },
    plasma: {
      nodes: { ...dbCol(150), plasma: PLASMA_POS, kb: KB_DOCK, "app-ai": { x: 1460, y: MID } },
      active: ["plasma", "kb", "app-ai"],
      edges: viaPlasma(["app-ai"]),
      brain: true,
      upload: true,
      merged: ["kb"],
      badges: { plasma: BRAIN_BADGE, "app-ai": { tone: "ok", text: "回答正確" } },
      callouts: { "app-ai": { tone: "ok", q: ASK, a: "186 人" } },
    },
  },

  // 4. 整理資料要靠 IT 來回協調 → 用問的,AI Agent 自己整理
  {
    id: "mcp",
    title: "用問的整理資料",
    short: "AI 整理",
    pain: "總院要資料得找各分院 IT\n四家各寫各的 SQL\n來回協調要好幾個月",
    fix: "直接用問的\nAI Agent 透過 Plasma 對齊四家欄位\n幾分鐘就整理好名冊",
    nodes: { ...dbCol(260), "ds-it": { x: 800, y: MID }, "ds-aiteam": { x: 1340, y: MID } },
    active: [...dbIds, "ds-it", "ds-aiteam"],
    edges: [
      ...dbIds.map((id) => ({ from: "ds-it", to: id, state: "risk" as const, lane: -9 })),
      ...dbIds.map((id) => ({ from: id, to: "ds-it", state: "risk" as const, lane: 9 })),
      { from: "ds-it", to: "ds-aiteam", state: "risk" },
    ],
    callouts: { "ds-aiteam": HANDOFF, "ds-it": HANDOFF },
    badges: { "ds-aiteam": { tone: "warn", text: "等待資料" } },
    plasma: {
      nodes: { ...dbCol(150), plasma: PLASMA_POS, kb: KB_DOCK, "app-ai": { x: 1460, y: MID } },
      active: ["plasma", "kb", "app-ai"],
      edges: viaPlasma(["app-ai"]),
      brain: true,
      merged: ["kb"],
      badges: { plasma: BRAIN_BADGE, "app-ai": { tone: "ok", text: "幾分鐘整理好" } },
      showAgent: true,
    },
  },

  // 5. 整理好的資料沒辦法重複使用 → 上架成資料產品
  {
    id: "product",
    title: "整理好的資料無法共用",
    short: "資料產品",
    pain: "整理好的名單只存在某人的 Excel\n下個月又要重做一次\n其他單位也拿不到",
    fix: "整理好的資料上架成資料產品\n來源更新，產品跟著更新\n有權限的單位才拿得到",
    nodes: { ...dbCol(260), "ds-aiteam": { x: 1340, y: MID } },
    active: [...dbIds, "ds-aiteam"],
    edges: dbIds.map((id) => ({ from: id, to: "ds-aiteam", state: "risk" as const })),
    badges: {
      ...Object.fromEntries(dbIds.map((id) => [id, { tone: "warn" as const, text: "每月寄 Excel" }])),
      "ds-aiteam": { tone: "danger", text: "四個版本" },
    },
    plasma: {
      nodes: { ...dbCol(150), plasma: PLASMA_POS, "app-claim": { x: 1340, y: 400 }, "app-accredit": { x: 1340, y: 650 } },
      active: [...dbIds, "plasma", "app-claim", "app-accredit"],
      edges: viaPlasma(["app-claim", "app-accredit"]),
      stack: ["app-claim", "app-accredit"],
      badges: {
        plasma: { tone: "ok", text: "統一格式" },
        "app-claim": { tone: "ok", text: "資料產品 · 已上架" },
        "app-accredit": { tone: "ok", text: "資料產品 · 已上架" },
      },
    },
  },

  // 6. 總院彙整:直接取用資料產品
  {
    id: "hq",
    title: "總院跨院彙整",
    short: "總院彙整",
    pain: "總院報表要等各分院回覆\n缺一家就做不出來\n數字常常對不上",
    fix: "總院直接取用資料產品\n四家分院同一格式\n隨時看得到最新人數",
    nodes: { ...dbCol(260), "app-bi": { x: 1340, y: MID } },
    active: [...dbIds, "app-bi"],
    edges: ["db-oracle", "db-mssql"].map((id) => ({ from: id, to: "app-bi", state: "slow" as const })),
    badges: {
      "db-postgres": { tone: "idle", text: "尚未回覆" },
      "db-mysql": { tone: "idle", text: "格式不同" },
      "app-bi": { tone: "danger", text: "缺兩家資料" },
    },
    callouts: {
      "app-bi": {
        tone: "danger", q: ROSTER_Q,
        code: [["A 分院", "248"], ["B 分院", "？"], ["C 分院", "214"], ["D 分院", "格式不同"]],
        a: "總數算不出來",
      },
    },
    plasma: {
      nodes: { ...dbCol(150), plasma: PLASMA_POS, "app-bi": { x: 1340, y: MID } },
      active: [...dbIds, "plasma", "app-bi"],
      edges: viaPlasma(["app-bi"]),
      badges: {
        plasma: { tone: "ok", text: "資料產品：護理人員名冊" },
        "app-bi": { tone: "ok", text: "即時彙整" },
      },
      callouts: {
        "app-bi": { tone: "ok", q: ROSTER_Q, code: FULL, a: "四家分院合計 812 人" },
      },
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
