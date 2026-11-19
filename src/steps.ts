// 醫院資料隔離:每個痛點分成「導入前」與「導入 Plasma 後」兩步,依情境分組。
// 每一步是一個畫面狀態(Look),切換時場景自己動畫過去。數字都是示意,只用來比較前後。
import { AppWindow, BookOpen, Bot, Building2, ChartColumn, ClipboardCheck, FlaskConical, Ghost, HeartPulse, Hospital, Pill, Receipt, ScanLine, Share2, Sparkles, Stethoscope, Users } from "lucide-react"
import type { ChipTone, Link, Look, NodeDef, Put, Step, Tone } from "./model"
import oracleLogo from "./assets/db/oracle.svg"
import pgLogo from "./assets/db/postgresql.svg"
import mssqlLogo from "./assets/db/mssql.svg"
import mysqlLogo from "./assets/db/mysql.svg"
import ibmLogo from "./assets/db/ibm.svg"

export const TITLE = "Plasma 醫院資料隔離"
export const HOME_KEY = "hospital" // logo 回 Demo 首頁的 #hospital
export const CHIP_KEYS = ["直連資料庫的應用", "資料庫負載", "資料到手時間"]

/* ================= 畫面上的東西 ================= */
export const NODES: Record<string, NodeDef> = {
  // 五套不同廠牌的資料庫(支援 HIS、NIS、ERP、PACS、LIS);Informix 沒有獨立圖示,用母公司 IBM
  oracle: { kind: "db", label: "Oracle", logo: oracleLogo },
  pg: { kind: "db", label: "PostgreSQL", logo: pgLogo },
  mssql: { kind: "db", label: "MS SQL", logo: mssqlLogo },
  mysql: { kind: "db", label: "MySQL", logo: mysqlLogo },
  informix: { kind: "db", label: "Informix", logo: ibmLogo },
  // 既有系統(與五套資料庫一一對應)
  clinic: { kind: "sys", label: "門診工作站", icon: Stethoscope },
  ward: { kind: "sys", label: "護理站", icon: HeartPulse },
  admin: { kind: "sys", label: "行政批價", icon: Receipt },
  pacs: { kind: "sys", label: "影像判讀", icon: ScanLine },
  lab: { kind: "sys", label: "檢驗室", icon: FlaskConical },
  // 新應用
  ap: { kind: "app", label: "AP 應用程式", icon: AppWindow },
  fhir: { kind: "app", label: "FHIR Server", icon: Share2 },
  bi: { kind: "app", label: "BI Dashboard", icon: ChartColumn },
  ai: { kind: "app", label: "地端 AI", icon: Sparkles },
  agent: { kind: "app", label: "AI Agent", icon: Bot },
  claim: { kind: "app", label: "健保申報", icon: Receipt },
  accredit: { kind: "app", label: "評鑑資料", icon: ClipboardCheck },
  ghost1: { kind: "ghost", label: "停用系統", icon: Ghost },
  ghost2: { kind: "ghost", label: "停用系統", icon: Ghost },
  // 人員
  manual: { kind: "person", label: "人工處理" },
  it: { kind: "person", label: "IT 部門" },
  aiteam: { kind: "app", label: "AI 部門", icon: Users },
  // 院區
  main: { kind: "site", label: "總院", icon: Hospital },
  north: { kind: "site", label: "北區分院", icon: Hospital },
  south: { kind: "site", label: "南區分院", icon: Hospital },
  // 院外
  extClinic: { kind: "ext", label: "診所", icon: Building2 },
  pharmacy: { kind: "ext", label: "藥局", icon: Pill },
  plasma: { kind: "plasma", label: "Plasma" },
  kb: { kind: "kb", label: "知識庫", icon: BookOpen },
}

/* ================= 版面(地面座標) =================
   x 往右下:既有系統 → 資料庫 → Plasma → 應用 → 院外;y 往左下:同一欄由上往下排 */
const X = { sys: -400, db: 0, mid: 430, app: 860, ext: 1230 }
const ROW5 = [-360, -180, 0, 180, 360]
const ROW4 = [-270, -90, 90, 270]
const DBS = ["oracle", "pg", "mssql", "mysql", "informix"]
const SYS = ["clinic", "ward", "admin", "pacs", "lab"]
const APPS = ["ap", "fhir", "bi", "ai"]
const SYS_OF: Record<string, string> = Object.fromEntries(DBS.map((d, i) => [d, SYS[i]]))

const CALM = [35, 30, 32, 28, 30]
const HIGH = [96, 88, 91, 85, 83]
const NORMAL = [34, 30, 31, 29, 30]

const col = (ids: string[], x: number, ys: number[], more: Partial<Put> = {}): Record<string, Put> =>
  Object.fromEntries(ids.map((id, i) => [id, { at: [x, ys[i]], ...more }]))
/** 五套資料庫;loads 給 null 表示不顯示負載 */
const dbs = (loads: number[] | null, more: Partial<Put> = {}): Record<string, Put> =>
  Object.fromEntries(DBS.map((id, i) => [id, { at: [X.db, ROW5[i]] as [number, number], ...(loads ? { load: loads[i] } : {}), ...more }]))
const sys = (more: Partial<Put> = {}) => col(SYS, X.sys, ROW5, more)
const apps = (more: Partial<Put> = {}) => col(APPS, X.app, ROW4, more)
const at = (x: number, y: number, more: Partial<Put> = {}): Put => ({ at: [x, y], ...more })
const tag = (tone: Tone, text: string): [Tone, string] => [tone, text]

/** 既有系統接回各自的資料庫 */
const sysLinks = (flow: Link["flow"] = "ok", skip: string[] = []): Link[] =>
  DBS.filter((d) => !skip.includes(d)).map((d) => ({ from: d, to: SYS_OF[d], flow }))
/** 資料都經過 Plasma:資料庫 → Plasma(同步)→ 各應用 */
const viaPlasma = (to: string[], src = DBS, toX = X.app): Link[] => [
  ...src.map((d) => ({ from: d, to: "plasma", flow: "sync" as const, mx: X.db + 215 })),
  ...to.map((t) => ({ from: "plasma", to: t, flow: "ok" as const, mx: (X.mid + toX) / 2 })),
]

const PLASMA = at(X.mid, 0)
const KB = at(X.mid, 0)
const c = (v: string, tone: ChipTone = ""): [string, ChipTone] => [v, tone]
const NONE = c("—")

/* ================= 步驟 ================= */
const S1: Look = {
  put: { ...dbs(CALM), ...sys() },
  links: sysLinks(),
  chips: [c("0 個"), c("35%"), NONE],
}

// 保護核心
const S2: Look = {
  put: { ...dbs(HIGH), ...sys({ dim: true }), ...apps() },
  links: [
    ...sysLinks("slow"),
    ...([["oracle", "ap"], ["oracle", "fhir"], ["pg", "fhir"], ["mssql", "bi"], ["informix", "bi"], ["mysql", "ai"], ["oracle", "ai"]] as const).map(([f, t]) => ({ from: f, to: t, flow: "hot" as const, straight: true })),
  ],
  chips: [c("4 個", "warn"), c("96%", "warn"), NONE],
}
S2.put.clinic = { ...S2.put.clinic, dim: false, tag: tag("warn", "回應變慢") }
S2.put.ward = { ...S2.put.ward, dim: false, tag: tag("warn", "回應變慢") }
const S3: Look = {
  put: { ...dbs(NORMAL), ...sys(), plasma: PLASMA, ...apps() },
  links: [...sysLinks(), ...viaPlasma(APPS)],
  zone: { ids: [...DBS, ...SYS], label: "核心資料庫 · 受保護" },
  chips: [c("0 個", "down"), c("34%", "down"), NONE],
}

// API 串接
const GHOSTS = { ghost1: at(X.app, -470, { tag: tag("bad", "無人維護 · 資安破口") }), ghost2: at(X.app, 470, { tag: tag("bad", "無人維護 · 資安破口") }) }
const S4: Look = {
  put: {
    ...dbs(HIGH), ...apps(), ...GHOSTS,
  },
  links: [
    ...APPS.flatMap((a) => DBS.map((d) => ({ from: d, to: a, flow: "risk" as const, straight: true }))),
    ...["oracle", "pg", "mssql"].map((d) => ({ from: d, to: "ghost1", flow: "dead" as const, straight: true })),
    ...["mssql", "mysql", "informix"].map((d) => ({ from: d, to: "ghost2", flow: "dead" as const, straight: true })),
  ],
  chips: [c("6 個", "warn"), c("96%", "warn"), NONE],
}
S4.put.bi = { ...S4.put.bi, note: { tone: "bad", dx: -170, title: "同一需求：取前 10 筆", lines: ["Oracle　WHERE ROWNUM <= 10", "MS SQL　SELECT TOP 10", "MySQL／PG　LIMIT 10", "Informix　SELECT FIRST 10"] } }
const S5: Look = {
  put: {
    ...dbs(NORMAL), plasma: { ...PLASMA, note: { tone: "ok", title: "同一需求：取前 10 筆", lines: ["Plasma　SELECT … LIMIT 10", "一種 SQL 查詢 5 套資料庫"] } }, ...apps(),
  },
  links: viaPlasma(APPS),
  chips: [c("0 個", "down"), c("34%", "down"), NONE],
}

// 手工合併
const OUT = { claim: at(X.app, -170), accredit: at(X.app, 170) }
const S6: Look = {
  put: {
    ...dbs(null, { tag: undefined }),
    manual: at(X.mid, 0, { tag: tag("bad", "手動合併 5 份檔案"), note: { tone: "idle", title: "第 1–3 天：逐一匯出", lines: ["第 4 天：Excel 逐筆比對", "第 5 天：主管說數字對不上"] } }),
    claim: { ...OUT.claim, tag: tag("bad", "數字對不上") },
    accredit: { ...OUT.accredit, tag: tag("warn", "版本不一") },
  },
  links: [
    ...DBS.map((d) => ({ from: d, to: "manual", flow: "risk" as const, straight: true })),
    { from: "manual", to: "claim", flow: "risk", straight: true },
    { from: "manual", to: "accredit", flow: "risk", straight: true },
  ],
  chips: [c("0 個"), NONE, c("5 天", "warn")],
}
const S7: Look = {
  put: {
    ...dbs(null), plasma: { ...PLASMA, tag: tag("ok", "自動整合 5 套資料庫") },
    claim: { ...OUT.claim, tag: tag("ok", "自動產出") },
    accredit: { ...OUT.accredit, tag: tag("ok", "單一版本") },
  },
  links: viaPlasma(["claim", "accredit"]),
  chips: [c("0 個", "down"), NONE, c("當天", "down")],
}

// 跨院區
const SITES = { main: at(X.db, 0), north: at(X.app, -260), south: at(X.app, 260) }
const S8: Look = {
  put: {
    main: { ...SITES.main, tag: tag("warn", "白天看診尖峰"), note: { tone: "idle", title: "凌晨 02:00 才能拉資料", lines: ["白天尖峰，不能用 DB Link"] } },
    north: { ...SITES.north, tag: tag("bad", "資料是昨天的") },
    south: { ...SITES.south, tag: tag("bad", "資料是昨天的") },
  },
  links: ["north", "south"].flatMap((b) => [
    { from: b, to: "main", flow: "risk" as const, straight: true, lane: -14 },
    { from: "main", to: b, flow: "risk" as const, straight: true, lane: 14 },
  ]),
  chips: [c("0 個"), c("尖峰 92%", "warn"), c("隔天", "warn")],
}
const S9: Look = {
  put: {
    ...SITES, plasma: { ...PLASMA, tag: tag("ok", "即時同步") },
    north: { ...SITES.north, tag: tag("ok", "即時可查") },
    south: { ...SITES.south, tag: tag("ok", "即時可查") },
  },
  links: ["main", "north", "south"].flatMap((s) => [
    { from: s, to: "plasma", flow: "sync" as const, straight: true, lane: -14 },
    { from: "plasma", to: s, flow: "sync" as const, straight: true, lane: 14 },
  ]),
  chips: [c("0 個"), c("35%", "down"), c("即時", "down")],
}

// FHIR 對外交換:FHIR Server 在應用欄中間,院外的診所、藥局再往右一欄
const EXT = { extClinic: at(X.ext, -180), pharmacy: at(X.ext, 180) }
const S10: Look = {
  put: {
    ...dbs(HIGH), fhir: at(X.app, 0, { tag: tag("bad", "直連核心資料庫") }),
    extClinic: { ...EXT.extClinic, tag: tag("bad", "格式不一") },
    pharmacy: { ...EXT.pharmacy, tag: tag("bad", "格式不一") },
  },
  links: [
    ...DBS.map((d) => ({ from: d, to: "fhir", flow: "hot" as const, straight: true })),
    { from: "fhir", to: "extClinic", flow: "risk", straight: true },
    { from: "fhir", to: "pharmacy", flow: "risk", straight: true },
  ],
  chips: [c("1 個", "warn"), c("91%", "warn"), NONE],
}
// 進 Plasma 前各系統格式不一(各色),出來後統一
const RAW = ["#c8402c", "#336791", "#d9722b", "#00758f", "#052fad"]
const S11: Look = {
  put: {
    ...dbs(NORMAL), plasma: { ...PLASMA, tag: tag("ok", "清洗 · 統一代碼") }, fhir: at(X.app, 0),
    extClinic: { ...EXT.extClinic, tag: tag("ok", "FHIR 標準格式") },
    pharmacy: { ...EXT.pharmacy, tag: tag("ok", "FHIR 標準格式") },
  },
  links: [
    ...DBS.map((d, i) => ({ from: d, to: "plasma", flow: "raw" as const, mx: X.db + 215, color: RAW[i] })),
    { from: "plasma", to: "fhir", flow: "ok" },
    { from: "fhir", to: "extClinic", flow: "ok", straight: true },
    { from: "fhir", to: "pharmacy", flow: "ok", straight: true },
  ],
  chips: [c("0 個", "down"), c("34%", "down"), NONE],
}

// 資安風險
const AI_AT: [number, number] = [X.app, 0]
const S12: Look = {
  put: { ...sys({ dim: true }), ...dbs(HIGH), ai: { at: AI_AT, tag: tag("bad", "大量查詢 · 具寫入權限") } },
  links: [...sysLinks("slow"), ...DBS.map((d) => ({ from: d, to: "ai", flow: "hot" as const, straight: true }))],
  chips: [c("1 個", "warn"), c("96%", "warn"), NONE],
}
const DEAD = ["oracle", "mssql"]
const S13: Look = {
  put: {
    ...sys({ dim: true }), ...dbs(HIGH),
    ai: { at: AI_AT, tag: tag("bad", "誤下 DELETE 指令"), note: { tone: "bad", title: "重大事故（Sev-1）· 線上系統停機", lines: ["醫院須於知悉後 1 小時內通報主管機關"] } },
  },
  links: [
    ...sysLinks("slow", DEAD), ...DEAD.map((d) => ({ from: d, to: SYS_OF[d], flow: "dead" as const })),
    ...DBS.filter((d) => !DEAD.includes(d) && d !== "pg").map((d) => ({ from: d, to: "ai", flow: "hot" as const, straight: true })),
    { from: "ai", to: "pg", flow: "attack", straight: true },
  ],
  chips: [c("1 個", "warn"), c("2 台停機", "warn"), NONE],
}
for (const d of DEAD) {
  S13.put[d] = { ...S13.put[d], down: true, tag: tag("bad", "停機") }
  S13.put[SYS_OF[d]] = { ...S13.put[SYS_OF[d]], dim: false, down: true, tag: tag("bad", "停機") }
}
const S14: Look = {
  put: { ...sys(), ...dbs(NORMAL), plasma: { ...PLASMA, tag: tag("ok", "唯讀 · 權限控管") }, ai: { at: AI_AT, tag: tag("ok", "依權限存取") } },
  links: [...sysLinks(), ...viaPlasma(["ai"])],
  chips: [c("0 個", "down"), c("34%", "down"), NONE],
}

// Plasma 大腦
const ASK = "上月心臟內科住院幾人？"
const S15: Look = {
  put: { ...dbs(null), ai: { at: AI_AT, tag: tag("bad", "回答不準確"), note: { tone: "bad", title: ASK, lines: ["無法判斷 DEPT_C 欄位意義"] } } },
  links: DBS.map((d) => ({ from: d, to: "ai", flow: "risk" as const, straight: true })),
  chips: [c("1 個", "warn"), NONE, NONE],
}
const S16: Look = {
  put: {
    ...dbs(null, { dim: true }), plasma: { ...PLASMA }, kb: { ...KB, tag: tag("ok", "已匯入資料字典") },
    ai: { at: AI_AT, tag: tag("ok", "回答正確"), note: { tone: "ok", title: ASK, lines: ["312 人（DEPT_C = 心臟內科）"] } },
  },
  links: viaPlasma(["ai"]),
  brain: true,
  chips: [c("0 個", "down"), NONE, NONE],
}

// 跨部門協作
const S17: Look = {
  put: {
    ...dbs(null),
    it: at(X.mid, 0, { tag: tag("warn", "重新找資料（第 3 次）") }),
    aiteam: at(X.app, 0, { tag: tag("bad", "等待資料"), note: { tone: "bad", title: "第 0 週 → 半年後", lines: ["需要資料 → 資料不對 → 再協調", "負責人離職，新同仁從頭來過"] } }),
  },
  links: [
    ...DBS.map((d) => ({ from: "it", to: d, flow: "risk" as const, straight: true })),
    { from: "it", to: "aiteam", flow: "risk", straight: true, lane: -14 },
    { from: "aiteam", to: "it", flow: "risk", straight: true, lane: 14 },
  ],
  chips: [c("0 個"), NONE, c("半年", "warn")],
}
const S18: Look = {
  put: {
    ...dbs(null, { dim: true }), plasma: { ...PLASMA, tag: tag("ok", "MCP") }, kb: { ...KB },
    agent: { at: AI_AT, tag: tag("ok", "幾分鐘拿到結果"), note: { tone: "ok", dx: -110, title: "本月住院計費彙總（依科別）", lines: ["list_tables → describe_columns → query", "全程在院內地端執行，資料不出院"] } },
  },
  links: viaPlasma(["agent"]),
  brain: true,
  chips: [c("0 個", "down"), NONE, c("幾分鐘", "down")],
}

// 成果:所有應用都經過 Plasma,核心資料庫受保護
const S19: Look = {
  put: { ...sys(), ...dbs(NORMAL), plasma: PLASMA, kb: KB, ...apps() },
  links: [...sysLinks(), ...viaPlasma(APPS)],
  zone: { ids: [...DBS, ...SYS], label: "核心資料庫 · 受保護" },
  brain: true,
  chips: [c("0 個", "down"), c("34%", "down"), c("即時", "down")],
}

export const STEPS: Step[] = [
  { short: "醫院現況", phase: "現況", title: "醫院現況", look: S1,
    changes: [["+", "五套不同廠牌的資料庫"], ["+", "支援 HIS、NIS、ERP、PACS、LIS"], ["~", "各系統直接存取自己的資料庫，運作穩定"]] },

  { short: "新應用直連", phase: "保護核心", mode: "before", title: "保護核心資料庫", look: S2,
    changes: [["+", "AP、FHIR、BI、AI 直接連上正式資料庫"], ["!", "查詢都壓在正式資料庫，負載 96%"], ["!", "門診、護理系統跟著變慢"]] },
  { short: "改接 Plasma", phase: "保護核心", mode: "after", title: "新應用一律向 Plasma 取資料", look: S3,
    changes: [["+", "Plasma 即時同步五套資料庫"], ["~", "新應用改向 Plasma 取資料"], ["−", "資料庫負載 96% → 34%"], ["+", "門診、護理系統維持順暢"]] },

  { short: "蜘蛛網", phase: "API 串接", mode: "before", title: "API 串接蜘蛛網化", look: S4,
    changes: [["!", "每個應用各自接五套資料庫，共 20 條"], ["!", "同一需求，每套的 SQL 寫法都不同"], ["!", "沒人維護的舊 API 還開著，是資安破口"]] },
  { short: "單一入口", phase: "API 串接", mode: "after", title: "應用只接 Plasma 一個入口", look: S5,
    changes: [["~", "應用只接 Plasma 一個入口"], ["+", "用同一種 SQL 查五套資料庫"], ["−", "20 條串接 → 4 條"], ["−", "不再留下沒人管的舊 API"]] },

  { short: "人工匯出", phase: "手工合併", mode: "before", title: "手工合併資料", look: S6,
    changes: [["!", "人工到五套資料庫逐一匯出"], ["!", "再用 Excel 合併"], ["!", "報表要等好幾天，數字對不上就重來"]] },
  { short: "自動產出", phase: "手工合併", mode: "after", title: "Plasma 自動整合各資料庫", look: S7,
    changes: [["+", "Plasma 自動整合五套資料庫"], ["+", "健保申報、評鑑資料直接產出"], ["−", "等 5 天 → 當天就有"]] },

  { short: "DB Link", phase: "跨院區", mode: "before", title: "跨院區資料不同步", look: S8,
    changes: [["!", "分院透過 DB Link 向總院拉資料"], ["!", "只能等凌晨離峰時段"], ["!", "隔天才看得到"]] },
  { short: "即時同步", phase: "跨院區", mode: "after", title: "各院區資料即時同步", look: S9,
    changes: [["+", "總院、分院都和 Plasma 即時同步"], ["+", "分院隨時查得到總院的資料"], ["−", "隔天 → 即時"]] },

  { short: "轉檔直連", phase: "FHIR 交換", mode: "before", title: "FHIR 對外交換", look: S10,
    changes: [["!", "FHIR 轉檔程式直接連上核心資料庫"], ["!", "核心資料庫負載 91%"], ["!", "各系統代碼不一致，院外收到的格式不一"]] },
  { short: "統一代碼", phase: "FHIR 交換", mode: "after", title: "Plasma 先統一代碼，再交給 FHIR", look: S11,
    changes: [["+", "Plasma 先統一各系統代碼"], ["~", "FHIR Server 只向 Plasma 取資料"], ["−", "核心資料庫不再被直連，負載 91% → 34%"]] },

  { short: "AI 直連", phase: "資安風險", mode: "before", title: "AI 的資安與效能風險", look: S12,
    changes: [["+", "AI 直接連上正式資料庫"], ["!", "大量查詢，資料庫負載 96%"], ["!", "AI 帳號還有寫入權限"]] },
  { short: "誤下 DELETE", phase: "資安風險", mode: "before", title: "一個錯誤指令，系統就停機", look: S13,
    changes: [["!", "AI 誤下 DELETE 指令"], ["!", "資料庫停機，門診、批價跟著停擺"], ["!", "重大事故，1 小時內要通報主管機關"]] },
  { short: "唯讀權限", phase: "資安風險", mode: "after", title: "AI 只能透過 Plasma 取資料", look: S14,
    changes: [["~", "AI 改向 Plasma 取資料"], ["+", "只能讀取，不能修改或刪除"], ["−", "資料庫負載 96% → 34%"]] },

  { short: "看不懂欄位", phase: "Plasma 大腦", mode: "before", title: "AI 不了解院內資料", look: S15,
    changes: [["!", "欄位多半是代碼，例如 DEPT_C"], ["!", "AI 看不懂欄位意思"], ["!", "回答容易出錯"]] },
  { short: "匯入字典", phase: "Plasma 大腦", mode: "after", title: "匯入資料字典，AI 看得懂欄位", look: S16,
    changes: [["+", "匯入規格書、資料字典、代碼說明"], ["+", "Plasma 看得懂欄位代碼"], ["~", "AI 答得出正確數字：312 人"]] },

  { short: "來回協調", phase: "跨部門協作", mode: "before", title: "跨部門溝通成本", look: S17,
    changes: [["!", "AI 要資料得先找 IT"], ["!", "資料不對，來回協調好幾次"], ["!", "常常要好幾個月"]] },
  { short: "MCP 取資料", phase: "跨部門協作", mode: "after", title: "AI Agent 透過 MCP 自己取資料", look: S18,
    changes: [["+", "AI Agent 透過 MCP 向 Plasma 取資料"], ["~", "不用等 IT 排程"], ["−", "好幾個月 → 幾分鐘"]] },

  { short: "成果", phase: "成果", title: "核心資料庫受保護，新應用照樣上線", look: S19,
    changes: [["−", "直連資料庫的應用：6 個 → 0 個"], ["−", "資料庫負載：96% → 34%"], ["−", "資料到手：好幾天 → 即時"], ["+", "既有系統不用改，照常運作"]] },
]

/** 重播用:第一步之前的空場景 */
export const EMPTY: Look = { put: {}, links: [], chips: [NONE, NONE, NONE] }
