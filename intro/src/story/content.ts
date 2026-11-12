// Plasma 介紹 demo:三個版本(主管、各產業、醫院)共用同一條故事線與流程圖,只換系統名稱、例子與用語。
// 內容依據:products/PRODUCT_LANDSCAPE.md、products/plasma/02_market/PLASMA_OUTBOUND_PM.md、
// SALES_WEDGE_MATURE_ENTERPRISE.md、01_product/PRODUCT_CN.md。成效只用公司允許公開的匿名產業數字。
import type { NodeKind, Pos } from "../types"

export type IntroKey = "exec" | "general" | "hospital"

export interface Scenario {
  label: string
  systems: [string, string, string, string]
  depts: [string, string, string, string] // 各系統原本的使用單位
  boss: string // 要報表的人
  report: string // 要的那份報表
  it: string // 負責撈資料的單位(IT／資訊室)
  outcome: number // 這個產業的成效數字排第一個
}

export const OUTCOMES = [
  { industry: "製造業", what: "調閱生產數據", before: "50 分鐘", after: "1 秒" },
  { industry: "醫療", what: "財務報表", before: "3 天", after: "秒級" },
  { industry: "零售業", what: "全通路月報", before: "4 天", after: "隨時看" },
]

const GENERIC: Scenario = {
  label: "通用", systems: ["財務系統", "業務系統", "生產系統", "客服系統"], depts: ["財務部", "業務部", "生產部", "客服部"],
  boss: "主管", report: "跨部門營運報表", it: "IT", outcome: 0,
}
const MFG: Scenario = {
  label: "製造業", systems: ["ERP", "生產系統", "品管系統", "倉儲系統"], depts: ["採購", "產線", "品保", "倉管"],
  boss: "廠長", report: "各產線良率與交期", it: "IT", outcome: 0,
}
const HOS: Scenario = {
  label: "醫療", systems: ["HIS 醫療資訊", "護理系統", "檢驗系統", "財務與健保"], depts: ["門診", "病房", "檢驗科", "批價櫃台"],
  boss: "院長", report: "各科住院與費用", it: "資訊室", outcome: 1,
}
const RTL: Scenario = {
  label: "零售業", systems: ["POS 收銀", "電商平台", "會員系統", "庫存系統"], depts: ["門市", "網店", "行銷", "物流"],
  boss: "營運長", report: "全通路月營收", it: "IT", outcome: 2,
}

export interface IntroContent {
  key: IntroKey
  crumb: string
  scenarios: Scenario[]
  headline: string
  lead: (s: Scenario) => string
  oneLiner: (s: Scenario) => string
  boss: (s: Scenario) => string
}

const sp = (it: string) => (it === "IT" ? " IT " : it)
// 中英文之間留空格,但空格不放在標點或字串頭尾
const tidy = (t: string) => t.replace(/\s+([，。、」：；）])/g, "$1").replace(/([「（])\s+/g, "$1").trim()
const lead = (s: Scenario) => `${s.systems.join("、")}，各有一套系統。資料都在，卻拿不出來。`

export const INTROS: Record<IntroKey, IntroContent> = {
  exec: {
    key: "exec", crumb: "認識 Plasma", scenarios: [GENERIC], headline: "你的系統很好，好到把價值都鎖在裡面。", lead,
    oneLiner: () => "讓業務部門自己拿資料，不再等 IT。",
    boss: () => "Plasma 讓各部門自己拿到跨系統的資料，不用等 IT，也不用動現有系統。",
  },
  general: {
    key: "general", crumb: "認識 Plasma · 各產業", scenarios: [MFG, HOS, RTL], headline: "你的系統很好，好到把價值都鎖在裡面。", lead,
    oneLiner: (s) => `讓各部門自己拿資料，不再等${sp(s.it)}。`.replace(" 。", "。"),
    boss: (s) => `Plasma 讓我們把${s.systems[0]}、${s.systems[1]}這些系統的資料接起來，各部門自己就拿得到，不用等${sp(s.it)}，也不用動現有系統。`.replace(" ，", "，"),
  },
  hospital: {
    key: "hospital", crumb: "認識 Plasma · 醫院", scenarios: [HOS], headline: "院內系統都很好，好到把資料都鎖在裡面。", lead,
    oneLiner: () => "讓各部門自己拿資料，不再等資訊室。",
    boss: () => "Plasma 讓各科、各部門自己拿到跨系統的資料，不用等資訊室，也不用動 HIS。",
  },
}

// ---- 每一段的文字與圖 ----
export interface BeatNode { id: string; kind: NodeKind; variant?: string; label: string; sub?: string; tone?: "ok" | "danger" | "idle" }
export interface BeatEdge { from: string; to: string; tone: "red" | "ok" | "plain" }
export interface BeatMark { at: string; text: string; tone: "red" | "ink"; side?: "l" | "r" }
export interface Beat {
  chapter: 0 | 1
  title: string
  text: string
  solves?: string // 解決了哪個問題(第二章)
  nodes: BeatNode[]
  edges: BeatEdge[]
  marks?: BeatMark[]
  zone?: string // 圍住各系統的框線標題
}

const SYS = ["s0", "s1", "s2", "s3"]

export function beats(s: Scenario): Beat[] {
  return rawBeats(s).map((b) => ({ ...b, title: tidy(b.title), text: tidy(b.text), solves: b.solves && tidy(b.solves) }))
}

function rawBeats(s: Scenario): Beat[] {
  const it = s.it
  const itw = sp(it)
  const sys = (sub?: string, tone?: BeatNode["tone"]): BeatNode[] =>
    s.systems.map((label, i) => ({ id: SYS[i], kind: "db" as const, label, sub, tone }))
  const plasma = (sub: string): BeatNode => ({ id: "plasma", kind: "plasma", label: "", sub, tone: "ok" })
  const report = (sub: string, tone: BeatNode["tone"]): BeatNode => ({ id: "report", kind: "app", variant: "receipt", label: `${s.boss}的報表`, sub, tone })
  const toPlasma = SYS.map((id) => ({ from: id, to: "plasma", tone: "ok" as const }))
  return [
    {
      chapter: 0,
      title: "每套系統都運作得很好",
      text: `${s.systems.join("、")}，各自服務自己的單位，每天都很穩定。`,
      nodes: [...sys(), ...s.depts.map((label, i) => ({ id: `d${i}`, kind: "downstream" as const, label, sub: "正常運作", tone: "ok" as const }))],
      edges: SYS.map((id, i) => ({ from: id, to: `d${i}`, tone: "plain" as const })),
    },
    {
      chapter: 0,
      title: `可是${s.boss}要一份報表，得等兩週`,
      text: `${s.boss}想看「${s.report}」，只能開單給${itw}，請他們一套一套系統去撈、再用 Excel 拼起來，來回確認幾次，常常就是兩週。`,
      nodes: [...sys(), { id: "it", kind: "person", variant: "person-clock", label: `${it}`, sub: "一套一套去撈", tone: "danger" }, report("還在等…", "danger")],
      edges: [...SYS.map((id) => ({ from: id, to: "it", tone: "red" as const })), { from: "it", to: "report", tone: "red" }],
      marks: [{ at: "report", text: "第 14 天，還在等", tone: "red", side: "l" }],
    },
    {
      chapter: 0,
      title: "原因：系統之間沒有橋",
      text: `不是系統不好，是它們彼此不相通。每一次跨系統的問題，都只能靠人工把資料搬來搬去。`,
      nodes: [...sys("各自獨立", "idle"), report("拿不到全貌", "danger")],
      edges: [],
      marks: [{ at: "gap", text: "系統之間沒有橋", tone: "red" }],
    },
    {
      chapter: 1,
      title: "Plasma 就是那座橋",
      text: "Plasma 以唯讀的方式接上每一套系統，資料不用搬家，原本的系統也不用改，照常運作。",
      nodes: [...sys("照常運作", "ok"), plasma("唯讀接上，不搬資料")],
      edges: toPlasma,
      solves: "系統之間沒有橋",
    },
    {
      chapter: 1,
      title: "自己拿資料，馬上出來",
      text: `${s.boss}選好年份、部門這類條件，「${s.report}」馬上出來，不用再開單等${itw}。`,
      nodes: [...sys(), plasma("一次從四套系統拿資料"), report("選條件，馬上出來", "ok")],
      edges: [...toPlasma, { from: "plasma", to: "report", tone: "ok" }],
      marks: [{ at: "report", text: "從兩週變成幾秒", tone: "ink", side: "l" }],
      solves: `報表要等${itw}兩週`,
    },
    {
      chapter: 1,
      title: "整理一次，各部門共用",
      text: "整理好的資料包成「資料產品」，各部門像逛 App Store 一樣自己取用；來源更新，大家拿到的也跟著更新。",
      nodes: [...sys(), plasma("整理好的資料"), { id: "prod", kind: "app", variant: "package", label: "資料產品", sub: "自動更新", tone: "ok" },
        { id: "c0", kind: "downstream", label: s.depts[0], sub: "自己取用", tone: "ok" }, { id: "c1", kind: "downstream", label: s.depts[1], sub: "自己取用", tone: "ok" }],
      edges: [...toPlasma, { from: "plasma", to: "prod", tone: "ok" }, { from: "prod", to: "c0", tone: "ok" }, { from: "prod", to: "c1", tone: "ok" }],
      solves: `${itw}被撈資料綁住`,
    },
    {
      chapter: 1,
      title: "AI 也能安全地用資料",
      text: `AI 透過 Plasma 這個有權限把關的入口讀資料：讀得到、改不了，不會一句錯誤指令就拖垮系統${s.it === "資訊室" ? "；全部在院內執行，病歷不出院" : ""}。`,
      nodes: [...sys(), plasma("權限把關 · 只能讀"), { id: "ai", kind: "app", label: s.it === "資訊室" ? "院內 AI" : "公司的 AI", sub: "讀得到、改不了", tone: "ok" }],
      edges: [...toPlasma, { from: "plasma", to: "ai", tone: "ok" }],
      marks: [{ at: "ai", text: "不能刪、不能改", tone: "ink", side: "l" }],
      solves: s.it === "資訊室" ? "AI 讀不到院內的資料" : "AI 讀不到公司的資料",
    },
    {
      chapter: 1,
      title: "為什麼放心",
      text: `只讀不寫、不在原系統裡裝任何東西、可以裝在自己的機房${s.it === "資訊室" ? "（資料不出院）" : ""}，不喜歡隨時可以拆掉，原本的系統完全不受影響。`,
      nodes: [...sys("只讀 · 不改不刪", "ok"), plasma("裝在自己的機房")],
      edges: toPlasma,
      zone: s.it === "資訊室" ? "HIS 等核心系統 · 不受影響" : "核心系統 · 不受影響",
      solves: "怕動到老系統",
    },
  ]
}

// 節點位置:桌機(橫向舞台 1000×620)、手機(直向舞台 900×1240)
export function nodePos(id: string, beat: number, compact: boolean): Pos {
  if (compact) {
    const row = (i: number) => ({ x: 112 + i * 225, y: 120 })
    if (id[0] === "s") return row(+id[1])
    if (id[0] === "d") return { x: 112 + +id[1] * 225, y: 470 }
    const P: Record<string, Pos> = {
      it: { x: 450, y: 520 }, report: beat === 2 ? { x: 450, y: 560 } : beat === 1 ? { x: 450, y: 900 } : { x: 450, y: 1000 },
      plasma: { x: 450, y: 560 }, prod: { x: 450, y: 900 }, c0: { x: 220, y: 1140 }, c1: { x: 680, y: 1140 }, ai: { x: 450, y: 1000 },
    }
    return P[id]
  }
  if (id[0] === "s") return { x: 110, y: 80 + +id[1] * 150 }
  if (id[0] === "d") return { x: 470, y: 80 + +id[1] * 150 }
  const P: Record<string, Pos> = {
    it: { x: 520, y: 305 }, report: beat === 2 ? { x: 640, y: 305 } : { x: 860, y: 305 },
    plasma: { x: 470, y: 305 }, prod: { x: 740, y: 305 }, c0: { x: 910, y: 160 }, c1: { x: 910, y: 450 }, ai: { x: 840, y: 305 },
  }
  return P[id]
}
// 標記的位置:「系統之間沒有橋」放在各系統旁
export const GAP = (compact: boolean): Pos => (compact ? { x: 450, y: 300 } : { x: 300, y: 305 })
