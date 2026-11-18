// K8s Sentinel demo 的七個情境:一家線上購物平台(shop)的叢集,從「看不到」到「擋得住、查得到」。
// 文字只留最重要的
export interface ScenarioDef {
  title: string // 情境圖上的標題
  short: string // 下方按鈕
  done: string // Sentinel 操作播完的一句話
  subs: string[] // 情境圖自己的子步驟(依時間自己播)
  pains: string[] // 這個情境要解決的痛點(條列)
  how: string // 在 Sentinel 裡怎麼做(現況頁的路線圖用)
  main: "app" | "scn" // 這個情境預設放大哪個畫面
}

export const STEPS: ScenarioDef[] = [
  {
    title: "容器裡在做什麼，沒人看得到", short: "現況",
    done: "防火牆、權限都設好了，容器裡被放進挖礦程式卻沒人發現。",
    subs: ["服務都跑在 K8s", "容器裡看不到", "被植入也不知道", "出事只能刪 Pod"],
    pains: ["容器裡執行什麼程式，沒有人在看", "被植入惡意程式，設定檢查抓不到", "弱點報告上千筆，不知道先修哪個", "出事只能刪 Pod，證據跟著消失"],
    how: "", main: "scn",
  },
  {
    title: "先觀察，學會正常行為", short: "學會正常行為",
    done: "Sentinel 學會 payment-api 平常只跑兩支程式，白名單自動產生，先觀察不攔截。",
    subs: ["只觀察、不攔截", "學會每個服務的程式", "產生白名單"],
    pains: ["不知道每個服務平常會跑哪些程式", "手寫政策要懂 kernel、寫 YAML"],
    how: "Behavior Discovery 自動學習", main: "app",
  },
  {
    title: "異常程式，當下就擋", short: "擋下異常程式",
    done: "挖礦程式一啟動就被 kernel 終止，值班人員同時收到通知。",
    subs: ["改成攔截", "被植入挖礦程式", "當下終止、通知"],
    pains: ["被植入的程式和正常服務混在一起", "發現時，已經跑了好幾天"],
    how: "Monitoring 切到 Protect", main: "app",
  },
  {
    title: "先止血，再調查", short: "隔離可疑 Pod",
    done: "payment-api 的網路切斷了，但程序和記憶體都還在，資安人員可以進去蒐證。",
    subs: ["一鍵隔離", "網路切斷", "證據保留"],
    pains: ["出事只能刪 Pod", "刪了 Pod，證據跟著消失"],
    how: "Quarantine 一鍵隔離", main: "app",
  },
  {
    title: "管住每一條連線", short: "管住網路",
    done: "payment-api 只能連訂單資料庫，往外連可疑主機的連線直接丟棄。",
    subs: ["看見誰連誰", "建立白名單", "可疑連線被丟棄"],
    pains: ["服務之間誰連誰，沒人說得清楚", "被入侵後可以往外連、橫向移動"],
    how: "Network Topology + Network Policy", main: "app",
  },
  {
    title: "弱點先修對的，高風險擋在門外", short: "弱點管理",
    done: "對外暴露的 Critical 弱點排第一，超過門檻的映像檔進不了叢集。",
    subs: ["對外暴露的先修", "設定弱點門檻", "高風險映像檔被拒絕"],
    pains: ["弱點報告上千筆，不知道先修哪個", "有弱點的映像檔還是部署上線"],
    how: "弱點排序 + Admission Policy", main: "app",
  },
  {
    title: "每一步都查得到", short: "稽核紀錄",
    done: "誰、在什麼時候、做了什麼，全部留在 Audit Log，可以匯出交給稽核。",
    subs: ["每個操作都記錄", "匯出 CSV"],
    pains: ["稽核時要從各個工具拼湊紀錄", "說不清楚誰改了什麼"],
    how: "Audit Log 匯出", main: "app",
  },
]
