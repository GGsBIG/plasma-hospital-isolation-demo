// 圖解版:十個步驟,一步一個畫面。文字只是輔助,主角是右邊會動的圖。
export type Tag = "現況" | "問題" | "做法" | "結果" | "回顧"
export type Phase = "現況" | "Step 1 看得見" | "Step 2 擋得住" | "Step 3 修弱點" | "成果"
export type Tone = "bad" | "good" | "warn" | "none"

export interface Metric { v: string; tone: Tone }

export interface LessonStep {
  short: string // 下方步驟列
  tag: Tag
  title: string
  body: string[]
  note: { kind: "idea" | "watch"; text: string }
  phase: Phase
  changed: [("+" | "~" | "−" | "!"), string][]
  /** 上方五個指標:容器內可見度、異常程式、外連可疑主機、模式、上線中的 Critical 弱點 */
  m: [Metric, Metric, Metric, Metric, Metric]
  ui: number // 對應「實際操作畫面」的第幾個情境(0 起算)
}

const n = (v: string, tone: Tone = "none"): Metric => ({ v, tone })

export const METRICS = ["容器裡", "異常程式", "可疑連線", "防護模式", "上線的 Critical"]

export const PAINS: { text: string; at: number }[] = [
  { text: "容器裡在跑什麼，看得到", at: 2 },
  { text: "被植入的程式，當下就擋", at: 4 },
  { text: "出事不用刪 Pod，證據留著", at: 5 },
  { text: "白名單以外的連線一律丟棄", at: 6 },
  { text: "高風險映像檔進不了叢集", at: 8 },
  { text: "誰做了什麼，都查得到", at: 9 },
]

export const LESSON: LessonStep[] = [
  {
    short: "現況", tag: "現況", title: "線上購物平台的一天",
    body: [
      "顧客下單時，請求會依序經過 storefront、payment-api，最後寫進 orders-db。",
      "防火牆、帳號權限、映像檔掃描都做了，看起來很安全。",
    ],
    note: { kind: "idea", text: "這些防護都守在門口，管的是誰能進來，看不到容器裡正在跑什麼程式。" },
    phase: "現況",
    changed: [["+", "4 個服務跑在 K8s"], ["+", "防火牆、權限、映像檔掃描都做了"], ["!", "容器裡在跑什麼，沒人看得到"]],
    m: [n("看不到", "warn"), n("—"), n("—"), n("—"), n("不清楚", "warn")],
    ui: 0,
  },
  {
    short: "被植入", tag: "問題", title: "挖礦程式混進來了",
    body: [
      "攻擊者混在顧客裡，利用漏洞在 payment-api 裡啟動挖礦程式 xmrig。",
      "請求看起來和一般顧客一樣，防火牆照常放行。CPU 衝到 97%，還不停連到外部礦池。",
    ],
    note: { kind: "watch", text: "沒有人在看容器裡面，通常要等帳單或效能出問題才會發現。" },
    phase: "現況",
    changed: [["!", "攻擊者在 payment-api 啟動 xmrig"], ["!", "CPU 30% → 97%"], ["!", "一直連到外部可疑主機"], ["!", "防火牆照常放行，沒人發現"]],
    m: [n("看不到", "bad"), n("xmrig 執行中", "bad"), n("持續外連", "bad"), n("—"), n("不清楚", "warn")],
    ui: 0,
  },
  {
    short: "看見", tag: "做法", title: "先看見容器裡面",
    body: [
      "Sentinel 用 eBPF 在 Linux kernel 裡觀察：每個程式啟動、每條連線都看得到。",
      "不用改程式碼，也不用在容器裡另外裝東西。",
    ],
    note: { kind: "idea", text: "所有容器共用同一個 kernel。在這裡看，任何容器都躲不掉。" },
    phase: "Step 1 看得見",
    changed: [["+", "Sentinel 用 eBPF 從 kernel 看每個容器"], ["+", "每支程式、每條連線都看得到"], ["~", "不用改程式，容器裡也不用裝東西"]],
    m: [n("看得到", "good"), n("—"), n("—"), n("Monitoring"), n("不清楚", "warn")],
    ui: 1,
  },
  {
    short: "學習", tag: "做法", title: "學會正常行為",
    body: [
      "Behavior Discovery 觀察 24～48 小時，記下每個服務平常會跑哪些程式。",
      "payment-api 平常只跑 payment-server 和 healthcheck，Sentinel 直接把它變成白名單。",
    ],
    note: { kind: "idea", text: "先用 Monitoring 模式：只記錄、不攔截。確認白名單沒問題，再打開攔截。" },
    phase: "Step 1 看得見",
    changed: [["+", "觀察 24～48 小時，學會平常跑哪些程式"], ["+", "payment-api 白名單：payment-server、healthcheck"], ["~", "Monitoring：先記錄、不攔截"]],
    m: [n("看得到", "good"), n("—"), n("—"), n("Monitoring"), n("不清楚", "warn")],
    ui: 1,
  },
  {
    short: "攔截", tag: "結果", title: "異常程式，當下就擋",
    body: [
      "白名單改成 Protect 模式。攻擊者再放一次 xmrig，程式一啟動就在 kernel 裡被終止。",
      "值班人員同時收到 Slack 告警：哪個 Pod、哪支程式、從哪裡啟動。",
    ],
    note: { kind: "idea", text: "攔截發生在 kernel，不用等人看到告警才處理。" },
    phase: "Step 2 擋得住",
    changed: [["~", "Monitoring → Protect"], ["−", "xmrig 一啟動，就在 kernel 被終止"], ["+", "值班人員同時收到 Slack 告警"]],
    m: [n("看得到", "good"), n("已終止", "good"), n("—"), n("Protect", "good"), n("不清楚", "warn")],
    ui: 2,
  },
  {
    short: "隔離", tag: "做法", title: "先止血，再調查",
    body: [
      "從告警一鍵隔離這個 Pod：網路全部切斷，但程式和記憶體都還在。",
      "另一個副本繼續服務顧客，資安人員進去蒐證，查完一鍵解除。",
    ],
    note: { kind: "watch", text: "直接刪 Pod，證據也跟著消失。隔離讓你先止血，再慢慢查。" },
    phase: "Step 2 擋得住",
    changed: [["+", "一鍵隔離 Pod，網路全部切斷"], ["~", "顧客改走另一個副本，服務不中斷"], ["+", "程式、記憶體都留著，可以蒐證"]],
    m: [n("看得到", "good"), n("已隔離", "good"), n("已切斷", "good"), n("Protect", "good"), n("不清楚", "warn")],
    ui: 3,
  },
  {
    short: "網路", tag: "做法", title: "管住每一條連線",
    body: [
      "拓撲圖上發現，另一個副本也在連外部的可疑主機。",
      "替 payment-api 建網路白名單：只收 storefront 的請求、只能連 orders-db。其他連線一律丟棄。",
    ],
    note: { kind: "idea", text: "就算有程式漏網，也連不出去、碰不到其他服務。" },
    phase: "Step 2 擋得住",
    changed: [["!", "另一個副本也在連可疑主機"], ["+", "網路白名單：只收 storefront、只連 orders-db"], ["−", "其他連線一律丟棄"]],
    m: [n("看得到", "good"), n("已隔離", "good"), n("已阻擋", "good"), n("Protect", "good"), n("不清楚", "warn")],
    ui: 4,
  },
  {
    short: "弱點", tag: "問題", title: "弱點報告修不完",
    body: [
      "掃描報告列出上千筆弱點，開發團隊不知道先修哪一個。",
      "Sentinel 把「對外暴露」和「Critical」一起看：storefront 直接面對顧客，又有 3 個 Critical，排第一。",
    ],
    note: { kind: "idea", text: "先修對外暴露、而且已有修補版本的弱點，效益最高。" },
    phase: "Step 3 修弱點",
    changed: [["!", "掃描報告 1,284 筆弱點"], ["+", "對外暴露 × Critical 一起排序"], ["+", "storefront 排第一：3 個 Critical"]],
    m: [n("看得到", "good"), n("已隔離", "good"), n("已阻擋", "good"), n("Protect", "good"), n("3 個", "bad")],
    ui: 5,
  },
  {
    short: "門檻", tag: "做法", title: "高風險映像檔進不來",
    body: [
      "設一道部署門檻：Critical 弱點一個都不允許。",
      "還有 Critical 的新版本，部署時直接被 K8s 拒絕；修好的版本才能上線。",
    ],
    note: { kind: "idea", text: "門檻在部署當下自動檢查，不靠人記得去翻報告。" },
    phase: "Step 3 修弱點",
    changed: [["+", "部署門檻：Critical 一個都不行"], ["−", "還有 Critical 的版本，部署被拒絕"], ["+", "修好的版本才能上線"]],
    m: [n("看得到", "good"), n("已隔離", "good"), n("已阻擋", "good"), n("Protect", "good"), n("0 個", "good")],
    ui: 5,
  },
  {
    short: "稽核", tag: "回顧", title: "每一步都查得到",
    body: [
      "剛剛每一個操作：誰、什麼時候、對哪個對象、結果如何，都記在 Audit Log，可以匯出 CSV 交給稽核。",
      "從看不到，到擋得住、隔得開、查得到。",
    ],
    note: { kind: "idea", text: "看見 → 學習 → 攔截 → 隔離 → 管網路 → 擋弱點，全部在同一個畫面完成。" },
    phase: "成果",
    changed: [["+", "每個操作都記在 Audit Log"], ["+", "一鍵匯出 CSV 交給稽核"], ["~", "看得到、擋得住、隔得開、查得到"]],
    m: [n("看得到", "good"), n("已隔離", "good"), n("已阻擋", "good"), n("Protect", "good"), n("0 個", "good")],
    ui: 6,
  },
]
