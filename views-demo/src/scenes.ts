import type { BadgeOverride, Callout, EdgeDef, Phase, SceneDef } from "./types"
import { NODE_BY_ID } from "./data"

// View 與 Materialized View 的圖解。右上角切換:View(預設)↔ Materialized View。
// 資料流由左至右:來源資料庫 → Plasma → (MView 快照) → 查詢的系統;y 為舞台 px
const DB_Y: Record<string, number> = { "db-oracle": 310, "db-mssql": 525, "db-postgres": 740 }
const APP_Y: Record<string, number> = { "app-bi": 202, "app-ap": 417, "app-gateway": 632, "app-ai": 847 }
const col = (ys: Record<string, number>, x: number) =>
  Object.fromEntries(Object.entries(ys).map(([id, y]) => [id, { x, y }]))
const dbIds = Object.keys(DB_Y)
const appIds = Object.keys(APP_Y)

const DBS = col(DB_Y, 260)
const PLASMA = { x: 760, y: 525 }
const SNAP = { x: 1110, y: 525 }       // MView 快照:在 Plasma 與查詢端之間
const BI_ONE = { x: 1460, y: 525 }     // 只有 BI 一個查詢端的頁面
const APPS = col(APP_Y, 1460)

const IDLE = Object.fromEntries(dbIds.map((id) => [id, 30]))
const BUSY = Object.fromEntries(dbIds.map((id) => [id, 58]))
const HIGH: Record<string, number> = { "db-oracle": 94, "db-mssql": 89, "db-postgres": 91 }

const e = (from: string, to: string, state: EdgeDef["state"] = "normal"): EdgeDef => ({ from, to, state })
const readSources = (to = "plasma") => dbIds.map((id) => e(id, to))
const badge = (tone: BadgeOverride["tone"], text: string): BadgeOverride => ({ tone, text })
const step = (q: string, time: string, tone: Callout["tone"] = "idle"): Callout => ({ tone, q, time })
// BI 旁的步驟卡放在下方,才不會壓到上方「MView 快照」的名稱與徽章
const below = (c: Callout): Callout => ({ ...c, side: "bottom" })

// ---------- 2. 什麼時候執行 ----------
const VIEW_RUN: Phase[] = [
  { ms: 2800, patch: {
    edges: [...readSources(), e("plasma", "app-bi", "isolated")], loads: BUSY,
    badges: { plasma: badge("warn", "執行 SQL"), "app-bi": badge("idle", "查詢中…") },
    callouts: { plasma: step("BI 查詢 View → 執行一次 SQL", "第 1 次查詢") } } },
  { ms: 1600, patch: {
    edges: [], loads: IDLE,
    badges: { plasma: badge("idle", "結果不保存"), "app-bi": badge("ok", "拿到結果") } } },
  { ms: 2800, patch: {
    edges: [...readSources(), e("plasma", "app-bi", "isolated")], loads: BUSY,
    badges: { plasma: badge("warn", "再執行一次 SQL"), "app-bi": badge("idle", "查詢中…") },
    callouts: { plasma: step("再查一次 → 再執行一次 SQL", "第 2 次查詢") } } },
  { ms: 1600, patch: {
    edges: [], loads: IDLE,
    badges: { plasma: badge("idle", "結果不保存"), "app-bi": badge("ok", "拿到結果") } } },
]
const MVIEW_RUN: Phase[] = [
  { ms: 3000, patch: {
    edges: [...readSources(), e("plasma", "serving-pg", "isolated")], loads: BUSY,
    badges: { plasma: badge("warn", "同步：執行 SQL"), "serving-pg": badge("warn", "Syncing"), "app-bi": badge("idle", "等待") },
    callouts: { plasma: step("同步時執行一次 SQL", "08:00 同步") } } },
  { ms: 2600, patch: {
    edges: [e("serving-pg", "app-bi", "isolated")], loads: IDLE,
    badges: { plasma: badge("idle", "不必重算"), "serving-pg": badge("ok", "Synced · 08:00"), "app-bi": badge("ok", "讀快照") },
    callouts: { "app-bi": below(step("第 1 次查詢：讀快照", "08:05")) } } },
  { ms: 2600, patch: {
    edges: [e("serving-pg", "app-bi", "isolated")], loads: IDLE,
    badges: { plasma: badge("idle", "不必重算"), "serving-pg": badge("ok", "Synced · 08:00"), "app-bi": badge("ok", "讀快照") },
    callouts: { "app-bi": below(step("第 2 次查詢：還是讀快照", "10:30")) } } },
]

// ---------- 4. 資料多新 ----------
const NEW_ORDER = badge("warn", "08:10 新增一筆訂單")
const VIEW_FRESH: Phase[] = [
  { ms: 2400, patch: { edges: [], loads: IDLE, badges: { "db-mssql": NEW_ORDER, "app-bi": badge("idle", "還沒查詢") },
    callouts: { "db-mssql": step("來源資料更新", "08:10") } } },
  { ms: 3000, patch: { edges: [...readSources(), e("plasma", "app-bi", "isolated")], loads: BUSY,
    badges: { "db-mssql": NEW_ORDER, "app-bi": badge("ok", "查得到 08:10 的訂單") },
    callouts: { "app-bi": below(step("查詢 View：讀來源", "08:12", "ok")) } } },
]
const MVIEW_FRESH: Phase[] = [
  { ms: 2400, patch: { edges: [], loads: IDLE,
    badges: { "db-mssql": NEW_ORDER, "serving-pg": badge("idle", "快照時間 08:00"), "app-bi": badge("idle", "還沒查詢") },
    callouts: { "db-mssql": step("來源資料更新", "08:10") } } },
  { ms: 2800, patch: { edges: [e("serving-pg", "app-bi", "isolated")], loads: IDLE,
    badges: { "db-mssql": NEW_ORDER, "serving-pg": badge("idle", "快照時間 08:00"), "app-bi": badge("warn", "還看不到 08:10 的訂單") },
    callouts: { "app-bi": below(step("查詢 MView：讀 08:00 的快照", "08:12", "danger")) } } },
  { ms: 3000, patch: { edges: [...readSources(), e("plasma", "serving-pg", "isolated")], loads: BUSY,
    badges: { "db-mssql": NEW_ORDER, "serving-pg": badge("warn", "Syncing"), "app-bi": badge("idle", "等待") },
    callouts: { plasma: step("下一次同步", "09:00") } } },
  { ms: 3000, patch: { edges: [e("serving-pg", "app-bi", "isolated")], loads: IDLE,
    badges: { "serving-pg": badge("ok", "快照時間 09:00"), "app-bi": badge("ok", "查得到 08:10 的訂單") },
    callouts: { "app-bi": below(step("同步後再查", "09:05", "ok")) } } },
]

// ---------- 5. 同步方式(只有 Materialized View,沒有切換) ----------
const SYNC_WAYS: Phase[] = [
  { ms: 3000, patch: { edges: [...readSources(), e("plasma", "serving-pg", "isolated")], loads: BUSY,
    badges: { "serving-pg": badge("warn", "Syncing"), "app-bi": badge("ok", "讀上一份快照") },
    callouts: { plasma: step("排程時間到，開始同步", "排程") } } },
  { ms: 2200, patch: { edges: [e("serving-pg", "app-bi", "isolated")], loads: IDLE,
    badges: { "serving-pg": badge("ok", "Synced"), "app-bi": badge("ok", "讀新快照") } } },
  { ms: 3000, patch: { edges: [...readSources(), e("plasma", "serving-pg", "isolated")], loads: BUSY,
    badges: { "serving-pg": badge("warn", "Syncing"), "app-bi": badge("ok", "讀上一份快照") },
    callouts: { plasma: step("上游工作完成，觸發器自動同步", "Trigger") } } },
  { ms: 2200, patch: { edges: [e("serving-pg", "app-bi", "isolated")], loads: IDLE,
    badges: { "serving-pg": badge("ok", "Synced"), "app-bi": badge("ok", "讀新快照") } } },
  { ms: 3200, patch: { edges: [...dbIds.map((id) => e(id, "plasma", "risk")), e("serving-pg", "app-bi", "isolated")], loads: IDLE,
    badges: { "serving-pg": badge("danger", "Failed"), "app-bi": badge("ok", "仍讀得到上一份快照") },
    callouts: { plasma: step("同步失敗", "Failed", "danger") } } },
]

// ---------- 6. 怎麼選 ----------
const COMPARE: Callout = {
  tone: "idle", q: "View 和 Materialized View 怎麼選", side: "bottom",
  brief: "資料要最新、查詢量小用 View；查詢量大、運算重用 Materialized View",
  rows: [
    ["", "View", "Materialized View"],
    ["什麼時候執行", "每次查詢", "同步時執行一次"],
    ["結果", "不保存", "存成快照"],
    ["資料新鮮度", "查詢當下", "上次同步的時間點"],
    ["來源資料庫負載", "隨查詢次數增加", "只在同步時"],
    ["適合", "資料要最新、查詢量小", "查詢量大、跨庫運算重"],
  ],
}

export const SCENES: SceneDef[] = [
  // 1. 開場:View 是什麼
  {
    id: "current",
    title: "View 是存起來的查詢",
    short: "View 是什麼",
    bullets: [
      "把一段 SQL 存成 View，例如把 Oracle 的訂單、MS SQL 的客戶、PostgreSQL 的出貨 JOIN 在一起。",
      "Plasma 有兩種 View：一般的 View 每次查詢時才執行；Materialized View 先執行一次，把結果存成快照。",
    ],
    nodes: { ...DBS, plasma: PLASMA, "app-bi": BI_ONE },
    active: [...dbIds, "plasma", "app-bi"],
    edges: [...readSources(), e("plasma", "app-bi", "isolated")],
    badges: { plasma: badge("ok", "View：跨庫 JOIN 的 SQL"), "app-bi": badge("ok", "查詢 View") },
    callouts: {
      plasma: { tone: "idle", q: "BI 需要的資料", code: [["Oracle", "訂單"], ["MS SQL", "客戶"], ["PostgreSQL", "出貨"]], a: "存成一個 View" },
    },
  },

  // 2. 什麼時候執行
  {
    id: "when",
    title: "SQL 什麼時候執行",
    short: "執行時機",
    pain: "每次有人查詢，Plasma 才執行 SQL，到來源資料庫讀資料，結果不保存。",
    fix: "同步時執行一次 SQL，把結果存成快照；之後的查詢都讀快照，不再到來源資料庫。",
    nodes: { ...DBS, plasma: PLASMA, "app-bi": BI_ONE },
    active: [...dbIds, "plasma", "app-bi"],
    edges: [],
    loads: IDLE,
    phases: VIEW_RUN,
    plasma: {
      nodes: { ...DBS, plasma: PLASMA, "serving-pg": SNAP, "app-bi": BI_ONE },
      active: [...dbIds, "plasma", "serving-pg", "app-bi"],
      edges: [],
      loads: IDLE,
      phases: MVIEW_RUN,
    },
  },

  // 3. 很多系統同時查
  {
    id: "load",
    title: "很多系統同時查",
    short: "查詢量",
    pain: "四個系統同時查，同一段跨庫 SQL 就執行四次，來源資料庫的負載跟著升高。",
    fix: "四個系統讀同一份快照，查詢再多，來源資料庫也不受影響。",
    nodes: { ...DBS, plasma: PLASMA, ...APPS },
    active: [...dbIds, "plasma", ...appIds],
    edges: [...dbIds.map((id) => e(id, "plasma", "overload")), ...appIds.map((id) => e("plasma", id, "isolated"))],
    loads: HIGH,
    badges: {
      plasma: badge("danger", "同一段 SQL 執行 4 次"),
      ...Object.fromEntries(appIds.map((id) => [id, badge("idle", "每次都重新執行")])),
    },
    plasma: {
      nodes: { ...DBS, plasma: PLASMA, "serving-pg": SNAP, ...APPS },
      active: ["serving-pg", ...appIds, ...dbIds],
      edges: appIds.map((id) => e("serving-pg", id, "isolated")),
      loads: IDLE,
      badges: {
        plasma: badge("idle", "不必重算"),
        "serving-pg": badge("ok", "4 個查詢都讀快照"),
        ...Object.fromEntries(appIds.map((id) => [id, badge("ok", "讀快照")])),
      },
    },
  },

  // 4. 資料多新
  {
    id: "fresh",
    title: "查到的資料有多新",
    short: "資料新鮮度",
    pain: "View 每次查詢都讀來源，來源一更新就查得到。",
    fix: "Materialized View 讀的是上次同步的快照，要等下次同步才看得到新資料。",
    nodes: { ...DBS, plasma: PLASMA, "app-bi": BI_ONE },
    active: [...dbIds, "plasma", "app-bi"],
    edges: [],
    loads: IDLE,
    phases: VIEW_FRESH,
    plasma: {
      nodes: { ...DBS, plasma: PLASMA, "serving-pg": SNAP, "app-bi": BI_ONE },
      active: [...dbIds, "plasma", "serving-pg", "app-bi"],
      edges: [],
      loads: IDLE,
      phases: MVIEW_FRESH,
    },
  },

  // 5. Materialized View 怎麼同步(沒有切換)
  {
    id: "sync",
    title: "Materialized View 怎麼同步",
    short: "同步方式",
    bullets: [
      "可以排程同步、手動同步，或在上游工作完成時由觸發器（Trigger）自動同步。",
      "同步失敗時，查詢仍然讀得到上一份快照。",
    ],
    nodes: { ...DBS, plasma: PLASMA, "serving-pg": SNAP, "app-bi": BI_ONE },
    active: [...dbIds, "plasma", "serving-pg", "app-bi"],
    edges: [],
    loads: IDLE,
    phases: SYNC_WAYS,
  },

  // 6. 怎麼選
  {
    id: "choose",
    title: "怎麼選",
    short: "怎麼選",
    bullets: [
      "資料要最新、查詢量小，用 View；查詢量大、跨庫運算重，用 Materialized View。",
      "兩種都有相同限制：執行超過 5 分鐘會中止，單次最多回傳 10,000 列。",
    ],
    nodes: { ...DBS, plasma: PLASMA, "serving-pg": SNAP, "app-bi": BI_ONE },
    active: [...dbIds, "plasma", "serving-pg", "app-bi"],
    edges: [...readSources(), e("plasma", "serving-pg", "isolated"), e("serving-pg", "app-bi", "isolated")],
    loads: IDLE,
    badges: { plasma: badge("ok", "View"), "serving-pg": badge("ok", "Materialized View") },
    callouts: { "serving-pg": COMPARE },
  },
]

// 每頁切到 Materialized View 時,新出現的連線依資料流的先後逐步畫出:
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
