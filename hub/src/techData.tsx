import type { ReactNode } from "react"

// Plasma 元件內容:整理自官方文件 https://plasma-docs.brobridge.workers.dev/zh-Hant/
// 文件沒寫的不寫;每段都附原文連結
const DOC = "https://plasma-docs.brobridge.workers.dev/zh-Hant/docs/"

export type Component = {
  id: string
  name: string
  en: string
  what: string
  specTitle?: string
  spec: ReactNode[]
  /** 取代規格清單的自訂內容(資料庫連線的支援表) */
  specTable?: [string, string, string][]
  limits: ReactNode[]
  doc: string
}

export const SOURCES: [string, string][] = [
  ["Oracle", "讀寫"], ["SQL Server", "讀寫"], ["PostgreSQL", "讀寫"],
  ["MySQL／MariaDB", "讀寫"], ["Informix", "唯讀"], ["Db2 for i", "唯讀"],
]

export const DELIVERY: [string, string][] = [
  ["資料產品", "跨工作區"], ["資料目錄", "全平台"], ["HTTP 匯出", "BI、應用"],
  ["目標資料庫", "Blueprint"], ["AI 助理", "MCP"],
]

/** 架構圖中間「工作區」裡的方塊,點了跳到對應段落 */
export const WORKSPACE_BOXES: { href: string; name: string; desc: string; wide?: boolean }[] = [
  { href: "#dbc", name: "資料庫連線", desc: "註冊來源、發現資料表" },
  { href: "#streaming", name: "Streaming", desc: "CDC 持續同步" },
  { href: "#sql", name: "SQL Playground", desc: "直接查來源，只允許 SELECT" },
  { href: "#views", name: "Views", desc: "Standard · Materialized · Parameterized" },
  { href: "#blueprint", name: "Data Blueprint", desc: "把 View 結果寫進目標資料表" },
  { href: "#scheduler", name: "排程器 · 觸發器", desc: "何時執行、事件串接" },
  { href: "#mcp", name: "MCP 工具", desc: "Group · Tool · Access entry，給 AI 助理呼叫", wide: true },
]

export const COMPONENTS: Component[] = [
  {
    id: "workspace", name: "工作區", en: "Workspaces",
    what: "每個工作區是一個獨立容器，裝著自己的連線、View、資料產品、Blueprint 與排程。不同部門各用一個工作區，資料與設定互不干擾；要共享時，再把 View 發布成資料產品。",
    spec: [
      "成員角色：Owner、Manager、Member",
      <>每個帳號都有私人工作區 <code>user_&lt;使用者名稱&gt;</code></>,
      "系統管理員在所有工作區都等同 Owner",
    ],
    limits: [
      "角色只管工作區本身（詳情、成員名單），不限制工作區內的一般操作",
      "私人工作區不能共享，也不能刪除",
    ],
    doc: DOC + "workspaces/about-workspaces",
  },
  {
    id: "dbc", name: "資料庫連線", en: "Database Connections (DBC)",
    what: "告訴 Plasma 怎麼連上外部的關聯式資料庫。連上後 Plasma 會發現資料表，可以直接在 SQL 編輯器查詢，也能當 View 的來源或 Blueprint 的寫入目的地。",
    specTitle: "支援的資料庫",
    spec: [],
    specTable: [
      ["Oracle", "✓", "✓"], ["SQL Server", "✓", "✓"], ["PostgreSQL", "✓", "✓"],
      ["MySQL／MariaDB", "✓", "✓"], ["Informix", "✓", "唯讀"], ["Db2 for i（AS/400）", "✓", "唯讀"],
    ],
    limits: [
      "狀態：Preparing → Syncing → Ready，或 Failed",
      "Syncing 期間不能 Edit 或 Sync",
      "連線只屬於一個工作區",
      "Db2 只支援 IBM i，LUW、z/OS 版本不支援",
      <>查詢寫法：<code>&lt;連線名稱&gt;.&lt;資料表&gt;</code></>,
    ],
    doc: DOC + "database-connections/overview",
  },
  {
    id: "streaming", name: "Streaming", en: "Streaming Source · Streaming Sink（選用）",
    what: "讓工作區裡的資料表跟來源資料庫持續同步，逐筆套用新增、更新、刪除（CDC）；也可以再把這份副本推送到下游資料庫。Source 把變更帶進工作區，Sink 把 Source 的資料表複製出去。",
    spec: [
      "使用一般的資料庫連線，支援 CDC",
      "來源有主鍵：Upsert 模式",
      "來源沒有主鍵：Append Only 模式",
      "Sink 沿用 Source 的模式",
    ],
    limits: [
      "模式在啟動後不能切換",
      "主鍵由 Plasma 從來源讀取，不能在 Plasma 裡另外設定",
    ],
    doc: DOC + "streaming/about-streaming",
  },
  {
    id: "sql", name: "SQL Playground 與 SQL 方言", en: "SQL Playground · SQL Reference",
    what: "直接對已連線的來源下 SQL，不必先把資料匯進來。跨不同廠牌的資料庫也用同一種 SQL 寫法，查好的語法可以「Save as View」存成 View。",
    spec: [
      "ANSI SQL 風格的 Plasma 方言，不是各來源資料庫的方言",
      "函式分類：字串、日期時間、陣列與 map、JSON、數字等",
      "同一套語法用在 SQL 編輯器、View 與資料產品",
    ],
    limits: [
      <>只允許 <code>SELECT</code>；INSERT、UPDATE、DELETE、CREATE、ALTER、DROP、TRUNCATE 一律拒絕</>,
      <>SQL 編輯器另外不接受 <code>TRY_CAST</code>、轉成 ARRAY／ROW 的 <code>CAST</code>、單獨的 <code>GROUP BY ALL</code>；改存成 View 即可使用</>,
    ],
    doc: DOC + "sql-reference/overview",
  },
  {
    id: "views", name: "Views", en: "Standard · Materialized · Parameterized",
    what: "把查詢存成可重複使用的 View。三種 View 差在什麼時候執行、結果存不存起來。",
    specTitle: "三種 View",
    spec: [
      <><b>Standard</b>：每次查詢時才執行 SQL，不佔儲存空間</>,
      <><b>Materialized</b>：觸發重新整理時執行一次，結果存成快照；可匯出成 HTTP。狀態 Initializing／Active／Inactive，同步狀態 Void／Syncing／Synced／Failed／Aborted</>,
      <><b>Parameterized</b>：用 <code>@name</code> 當占位符，執行時代入參數；只能在專屬編輯器建立</>,
    ],
    limits: [
      "執行超過 5 分鐘會被中止",
      "單次最多回傳 10,000 列（預覽、View Data、HTTP 匯出、參數化 API 都一樣），超過不會提示截斷；上限只有系統管理員能調整",
      "Materialized 同步失敗時，仍可讀取上一次的快照",
    ],
    doc: DOC + "views/about-views",
  },
  {
    id: "blueprint", name: "Data Blueprint", en: "資料匯出 Job 定義",
    what: "可重複使用的匯出設定：把來源 View 的結果寫進目標資料表。Blueprint 定義「做什麼」，排程器決定「什麼時候做」。適合搬完整資料集，例如把 Informix 這類唯讀來源的資料複製出去。",
    spec: [
      "寫入模式：Overwrite、Append、Truncate",
      "選項：Force Create Table（目標表不存在就建立）、Allow concurrent jobs（預設關閉）",
      "目的地：從工作區連線挑選，或直接輸入連線資訊（儲存前須通過 Verify Connection）",
      "不受 10,000 列上限限制",
      "Execution History：每次執行的狀態、進度、錯誤行號與完整日誌",
    ],
    limits: [
      "唯讀連線不會出現在目的地清單",
      "執行失敗不會改動目標表原有內容",
      "刪除 Blueprint 不會一併刪除排程，留下的排程會持續報錯",
    ],
    doc: DOC + "blueprints-and-scheduling/data-blueprints",
  },
  {
    id: "scheduler", name: "排程器", en: "Scheduler",
    what: "依時間或固定間隔自動執行 Data Blueprint。",
    spec: [
      "Once：只執行一次",
      "Repeat Every：每 N 分鐘、小時、天或週",
      "Calendar：每日、每週、每月、每年",
      "時間以瀏覽器時區輸入，以 UTC 儲存；記錄上次觸發時間與次數",
    ],
    limits: [
      "不是 cron 語法",
      "Calendar 只在 Start Time 設為 Immediately 時可用",
      "停機期間錯過的觸發不會補執行",
      "能否重疊執行由 Blueprint 的 Allow concurrent jobs 決定",
    ],
    doc: DOC + "blueprints-and-scheduling/scheduler",
  },
  {
    id: "triggers", name: "觸發器", en: "Triggers",
    what: "一個工作完成或失敗時，自動接著做下一件事，把多個步驟串成流程（A → B → C）。",
    spec: [
      "事件來源：Blueprint 的 Job 完成或失敗、Materialized View 同步完成或失敗",
      "動作：Sync View（重新整理 Materialized View）或 Spawn Blueprint（執行另一個 Blueprint）",
      "刪除來源時，觸發器會自動移除",
    ],
    limits: [
      "同一事件有多個觸發器時，執行順序不保證",
      "停用後再啟用，不會補發停用期間的事件",
      "不偵測跨資源的循環（A → B → A），只對自我觸發顯示警告",
    ],
    doc: DOC + "triggers",
  },
  {
    id: "products", name: "資料產品", en: "Data Products",
    what: "把 View、Materialized View 或資料表發布成有名稱、可共享的資料集。其他工作區不必知道來源在哪個資料庫，用固定位址就能查詢。",
    spec: [
      "每個資料產品有固定的 key",
      <>從任何工作區查詢都是：<code>SELECT * FROM data_product.default.&lt;key&gt;</code></>,
    ],
    limits: ["位址直接指向來源，不是轉址；來源改名或刪除後，查詢會失敗"],
    doc: DOC + "data-products/about-data-products",
  },
  {
    id: "catalog", name: "資料目錄", en: "Data Catalog",
    what: "全平台共用的目錄，列出所有工作區發布的資料產品，像企業內部的資料市集。",
    spec: [
      "卡片顯示所屬工作區、說明、類型與最後修改時間",
      "任何有 Plasma 帳號的人都能瀏覽",
      "目錄本身不存資料，卡片指向資料產品",
    ],
    limits: [
      "目錄唯讀；能否編輯或刪除，看是不是來源工作區的成員",
      "來源被移除後卡片仍在，但查詢會失敗",
    ],
    doc: DOC + "data-catalog/overview",
  },
  {
    id: "mcp", name: "MCP", en: "Model Context Protocol",
    what: "把 Plasma 變成 MCP 伺服器。AI 助理不自己寫 SQL，而是從事先定義好的工具中挑一個、帶入參數執行，查得到什麼由工具決定。",
    spec: [
      "Group：一組工具",
      "Tool：具名參數的 SQL，參數依型別、必填與允許值檢查",
      "Access entry：對外 URL，各自設定驗證方式與到期日",
      "助理可用兩個動作：Search（用自然語言找工具）、Execute（帶參數執行）",
    ],
    limits: [
      "單次執行最多 1,000 列，截斷時會告知客戶端",
      "Search 需要管理員先設定含 embedding model 的 AI 連線",
      "工具屬於工作區，任何成員都能建立、編輯、刪除",
    ],
    doc: DOC + "mcp/about-mcp",
  },
  {
    id: "admin", name: "系統管理", en: "Administration",
    what: "只有系統管理員能用：管理使用者、工作區、AI 連線與稽核記錄。",
    spec: [
      <>系統角色只有 <code>admin</code> 與 <code>user</code>；admin 可存取所有工作區</>,
      "使用者名稱以小寫字母開頭，只能有小寫字母、數字與底線，建立後不能改",
      "密碼至少 8 個字元，須含大寫、小寫，以及數字或特殊字元",
    ],
    limits: [
      "刪除使用者會連同其私人工作區與內容一起刪除",
      "系統不會阻止刪除最後一個 admin，至少要保留一個",
    ],
    doc: DOC + "administration/managing-users",
  },
]
