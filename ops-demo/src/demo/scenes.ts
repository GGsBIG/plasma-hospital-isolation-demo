import type { DemoState, ChatMsg } from "./store"
import { DB_FORM, MYSQL_FORM, PG_FORM, DOC_FILES, T_ORD_M_COLUMNS, API_URL } from "./data"

export interface Api {
  fast: boolean
  update(patch: Partial<DemoState> | ((s: DemoState) => Partial<DemoState>)): void
  sleep(ms: number): Promise<void>
  moveTo(sel: string): Promise<void>
  click(sel: string): Promise<void>
  subtitle(text: string): void
  chapter(name: string): void
  typeField(field: keyof DemoState["form"], text: string, speed?: number): Promise<void>
  typeLogin(field: "loginUser" | "loginPass", text: string, speed?: number): Promise<void>
  typeChat(text: string, speed?: number): Promise<void>
  typeColumnDesc(i: number, text: string, speed?: number): Promise<void>
}

export interface Step {
  scene: string
  sub?: string
  run: (api: Api) => Promise<void>
}

const SC_INTRO = "前情提要 · 要完成的空面板"
const SC0 = "0 · 登入 Plasma"
const SC1 = "1 · 連接資料庫"
const SC2 = "2 · 上傳描述文件"
const SC3 = "3 · 讓平台理解每個欄位"
const SC4 = "4 · 從 BI 畫面生出 Data API"
const SC5 = "5 · 接回 BI，直接取得資料"

const push = (msg: ChatMsg) => (s: DemoState) => ({ chat: [...s.chat, msg] })

export function buildSteps(): Step[] {
  return [
    /* ================= 前情提要：先看空面板（目標），再從頭做起 ================= */
    {
      scene: SC_INTRO,
      sub: "先看目標 —— 這是業務要的 BI 營收儀表板，但它現在是空的：總營收、各區業績、客戶排行，全部沒有數值。",
      async run(a) {
        a.update({ screen: "login", powerbiOpen: true, dashFilled: false })
        await a.sleep(2800)
      },
    },
    {
      scene: SC_INTRO,
      sub: "每一格數字，背後都要從 Oracle ERP、MySQL CRM 多個異質資料庫拉資料、做運算才算得出來，欄位還是 AMT1、FLG_X 這種天書。把這些面板填滿，就是我們今天的目標。",
      async run(a) {
        await a.sleep(3000)
        a.update({ subtitle: "讓我們從第一步開始，看 Plasma 如何一步步把它填滿。" })
        await a.sleep(1800)
        // 收起空面板，回到登入起點
        a.update({ powerbiOpen: false, screen: "login", loginUser: "", loginPass: "", loggingIn: false })
        await a.sleep(700)
      },
    },

    /* ================= 幕零：登入 ================= */
    {
      scene: SC0,
      sub: "回到起點，先登入 Plasma —— 企業級資料中台，一切從這裡開始。",
      async run(a) {
        a.update({ screen: "login", loginUser: "", loginPass: "", loggingIn: false })
        await a.sleep(1100)
        await a.moveTo("login-user")
        await a.typeLogin("loginUser", "admin", 90)
        await a.sleep(400)
        await a.moveTo("login-pass")
        await a.typeLogin("loginPass", "••••••••", 90)
        await a.sleep(500)
      },
    },
    {
      scene: SC0,
      sub: "登入後進入自己的 Workspace。",
      async run(a) {
        await a.moveTo("login-submit")
        await a.click("login-submit")
        a.update({ loggingIn: true })
        await a.sleep(1100)
        a.update({ screen: "app", loggingIn: false, page: "list", navActive: "/database" })
        await a.sleep(900)
      },
    },

    /* ================= 幕一：連接資料庫 ================= */
    {
      scene: SC1,
      sub: "第一步：把 Oracle ERP 資料庫接進 Plasma —— 資料不搬家，只用唯讀連線。",
      async run(a) {
        a.update({ page: "list", navActive: "/database" })
        await a.moveTo("nav-database")
        await a.sleep(500)
        await a.moveTo("btn-add-db")
        await a.click("btn-add-db")
        a.update({ addOpen: true, form: { ...DB_FORM, display_name: "", db_type: "", description: "", host: "", port: "", db_name: "", username: "", password: "" }, connStatus: "void" })
        await a.sleep(400)
      },
    },
    {
      scene: SC1,
      sub: "填入連線資訊：名稱、資料庫類型、主機、埠號、帳號密碼。",
      async run(a) {
        await a.moveTo("f-name")
        await a.typeField("display_name", DB_FORM.display_name, 30)
        a.update((s) => ({ form: { ...s.form, db_type: DB_FORM.db_type, description: DB_FORM.description } }))
        await a.moveTo("f-host")
        await a.typeField("host", DB_FORM.host, 14)
        a.update((s) => ({ form: { ...s.form, port: DB_FORM.port, db_name: DB_FORM.db_name, username: DB_FORM.username, password: DB_FORM.password } }))
        await a.sleep(150)
      },
    },
    {
      scene: SC1,
      sub: "按 Verify Connection 測試連線 —— 綠燈代表通了，再 Save。",
      async run(a) {
        await a.moveTo("btn-verify")
        await a.click("btn-verify")
        a.update({ connStatus: "preparing" })
        await a.sleep(600)
        a.update({ connStatus: "ready" })
        await a.sleep(300)
        await a.moveTo("btn-save")
        await a.click("btn-save")
        a.update((s) => ({
          addOpen: false,
          connections: s.connections.some((c) => c.name === "oracle_erp")
            ? s.connections
            : [...s.connections, { name: "oracle_erp", type: "Oracle", status: "ready" }],
        }))
        await a.sleep(400)
      },
    },
    {
      scene: SC1,
      sub: "用同樣方式，快速把 MySQL、PostgreSQL 也接進來 —— 各種異質資料庫都行。",
      async run(a) {
        // 快速接入 mysql_crm 與 dw_sink（大多瞬間填入，短暫 verify）
        for (const [form, conn] of [
          [MYSQL_FORM, { name: "mysql_crm", type: "MySQL", status: "ready" }],
          [PG_FORM, { name: "dw_sink", type: "PostgreSQL", status: "ready" }],
        ] as const) {
          await a.moveTo("btn-add-db")
          await a.click("btn-add-db")
          a.update({ addOpen: true, form: { ...form }, connStatus: "void" })
          await a.sleep(350)
          await a.moveTo("btn-verify")
          await a.click("btn-verify")
          a.update({ connStatus: "preparing" })
          await a.sleep(450)
          a.update({ connStatus: "ready" })
          await a.sleep(200)
          await a.moveTo("btn-save")
          await a.click("btn-save")
          a.update((s) => ({
            addOpen: false,
            connections: s.connections.some((c) => c.name === conn.name) ? s.connections : [...s.connections, conn],
          }))
          await a.sleep(500)
        }
      },
    },

    /* ================= 幕一之二：從列表點 Tables，進去看表、資料與欄位 ================= */
    {
      scene: SC1,
      sub: "連線完成後，點這一列的 Tables，就能進去看這個資料庫裡有哪些表。",
      async run(a) {
        a.update({ page: "list", navActive: "/database" })
        await a.sleep(700)
        await a.moveTo("row-tables")
        await a.click("row-tables")
        a.update({ page: "detail", detailTab: "tables" })
        await a.sleep(1400)
      },
    },
    {
      scene: SC1,
      sub: "這個資料庫有 T_ORD_M、T_PRD_M 兩張表。",
      async run(a) {
        await a.moveTo("row-tord")
        await a.sleep(1200)
      },
    },
    {
      scene: SC1,
      sub: "點 View Data 看實際資料 —— 有資料，但像 FLG_X = 9、PRD_C = C3001 這些值，看不出是什麼意思。",
      async run(a) {
        await a.moveTo("btn-view-data")
        await a.click("btn-view-data")
        a.update({ viewDataOpen: true })
        await a.sleep(2200) // 停著看原始資料（下一步才關）
      },
    },
    {
      scene: SC1,
      sub: "再點 View Schema 看欄位 —— ORD_NO、MBR_ID、AMT1、FLG_X，欄位名稱一樣是天書。",
      async run(a) {
        // 關掉 View Data，改開 View Schema
        await a.moveTo("btn-viewdata-close")
        await a.click("btn-viewdata-close")
        a.update({ viewDataOpen: false })
        await a.sleep(300)
        a.update({ page: "detail", detailTab: "tables" })
        await a.moveTo("btn-view-schema")
        await a.click("btn-view-schema")
        a.update({ schemaOpen: true, columns: T_ORD_M_COLUMNS.map((c) => ({ ...c, desc: "" })) })
        await a.sleep(2200) // 停著看天書欄位（下一幕才關）
      },
    },

    /* ================= 幕二：上傳描述文件 ================= */
    {
      scene: SC2,
      sub: "正因為表和欄位都看不懂，所以要上傳說明文件、系統規格書，讓 Plasma 徹底了解這個資料庫在幹嘛。",
      async run(a) {
        // 關掉 View Schema，回到 Tables 分頁
        await a.moveTo("btn-schema-close")
        await a.click("btn-schema-close")
        a.update({ schemaOpen: false, page: "detail", detailTab: "tables" })
        await a.sleep(400)
        // 先切回 General 分頁
        await a.moveTo("tab-general")
        await a.click("tab-general")
        a.update({ detailTab: "general" })
        await a.sleep(700)
        // 再點 Upload 上傳文件
        await a.moveTo("btn-upload-doc")
        await a.click("btn-upload-doc")
        a.update({ uploadOpen: true, files: [] })
        await a.sleep(400)
      },
    },
    {
      scene: SC2,
      sub: "拖入「資料庫欄位說明」「系統規格書」，按上傳，交給 AI 分析。",
      async run(a) {
        await a.moveTo("dropzone")
        for (const f of DOC_FILES) {
          a.update((s) => ({ files: s.files.includes(f) ? s.files : [...s.files, f] }))
          await a.sleep(450)
        }
        // 停一下，讓清單自動捲到底，露出被擋住的檔案
        await a.sleep(1600)
        await a.moveTo("btn-upload")
        await a.click("btn-upload")
        a.update({ uploadOpen: false, analyzing: true, subtitle: "文件已上傳，AI 分析中…" })
        await a.sleep(1100)
        a.update({ analyzing: false })
      },
    },

    /* ================= 幕三：理解每個欄位（Auto-Describe） ================= */
    {
      scene: SC3,
      sub: "上傳完文件後，點 Tables 回到表清單，打開 T_ORD_M 的欄位描述。",
      async run(a) {
        a.update({ page: "detail", detailTab: "general" })
        await a.sleep(300)
        // 點 Tables 分頁回到表清單
        await a.moveTo("tab-tables")
        await a.click("tab-tables")
        a.update({ detailTab: "tables" })
        await a.sleep(700)
        // 打開欄位描述
        await a.moveTo("btn-edit-desc")
        await a.click("btn-edit-desc")
        a.update({ editOpen: true, columns: T_ORD_M_COLUMNS.map((c) => ({ ...c, desc: "" })) })
        await a.sleep(500)
      },
    },
    {
      scene: SC3,
      sub: "見證時刻：AI 根據文件，替每一個欄位逐一生成描述 —— 天書變人話。",
      async run(a) {
        for (let i = 0; i < T_ORD_M_COLUMNS.length; i++) {
          await a.typeColumnDesc(i, T_ORD_M_COLUMNS[i].desc)
          await a.sleep(160)
        }
        // 等全部填完後的慢速下捲跑完，再存檔
        await a.sleep(3000)
        await a.moveTo("btn-save-desc")
        await a.click("btn-save-desc")
        a.update({ editOpen: false, subtitle: "完成！Plasma 資料中台已徹底理解這個資料庫的每一個欄位。" })
        await a.sleep(500)
      },
    },

    /* ================= 幕四：外部 Agent（AI Agent）接上 Plasma MCP ================= */
    {
      scene: SC4,
      sub: "切到外部的 AI Agent，在 agent 這邊按一下就接上 Plasma 的 MCP —— 任何支援 MCP 的 agent 都能這樣接。",
      async run(a) {
        a.update({
          screen: "chatgpt",
          chat: [], chatInput: "", chatAttachment: false,
          mcpConnected: false, apiCopied: false, mviewCreated: false, apiUrl: null,
          powerbiImportOpen: false, powerbiOpen: false, dashFilled: false,
        })
        await a.sleep(1000)
        await a.moveTo("mcp-connect")
        await a.click("mcp-connect")
        a.update({ mcpConnected: true })
        await a.sleep(1300)
      },
    },
    {
      scene: SC4,
      sub: "業務把 BI 截圖丟給 AI Agent，用中文問：這些指標的 API 要怎麼拿到？",
      async run(a) {
        // 真的做「上傳圖片」的動作：點迴紋針 → 附上截圖縮圖
        await a.moveTo("agent-upload")
        await a.click("agent-upload")
        a.update({ chatAttachment: true })
        await a.sleep(900)
        await a.typeChat("這是我的 BI 儀表板截圖，我想要這些指標的 API，要怎麼拿到？")
        await a.sleep(400)
        await a.moveTo("agent-send")
        await a.click("agent-send")
        a.update((s) => ({ chatInput: "", chatAttachment: false, chat: [...s.chat, { role: "user", block: "screenshot", text: "這是我的 BI 儀表板截圖，我想要這些指標的 API，要怎麼拿到？" }] }))
        await a.sleep(600)
      },
    },
    {
      scene: SC4,
      sub: "AI Agent 透過 Plasma MCP 呼叫工具、讀取 Schema 與欄位描述，辨識每個指標對應的資料來源與算法。",
      async run(a) {
        a.update({ aiTyping: true })
        await a.sleep(1600)
        a.update({ aiTyping: false })
        a.update(push({ role: "ai", text: "我透過 Plasma MCP 查了你的資料結構，把畫面上的 4 個指標對到來源與欄位意義：", block: "toolcall" }))
        await a.sleep(900)
        a.update(push({ role: "ai", block: "metrics" }))
        await a.sleep(1200)
      },
    },
    {
      scene: SC4,
      sub: "AI Agent 自動做 text-to-SQL，先把 SQL 顯示給你確認 —— 你完全不用自己寫。",
      async run(a) {
        a.update(push({ role: "ai", text: "這是我為這個儀表板產生的 SQL（text-to-SQL），確認的話我就透過 Plasma MCP 幫你建立 Materialized View：", block: "sql" }))
        await a.sleep(1400)
      },
    },
    {
      scene: SC4,
      sub: "使用者回一句「好」，AI Agent 就透過 Plasma MCP 直接在 Plasma 建好 Materialized View。",
      async run(a) {
        await a.typeChat("好，沒問題，請幫我建立。")
        await a.sleep(300)
        await a.click("agent-send")
        a.update((s) => ({ chatInput: "", chat: [...s.chat, { role: "user", text: "好，沒問題，請幫我建立。" }] }))
        await a.sleep(500)
        a.update({ aiTyping: true })
        await a.sleep(1500)
        a.update({ aiTyping: false })
        a.update(push({ role: "ai", text: "完成！我已透過 Plasma MCP 在你的 Plasma 建立 Materialized View：", block: "mview" }))
        a.update({ mviewCreated: true, apiUrl: API_URL })
        await a.sleep(1300)
      },
    },

    /* ================= 幕五：回 Plasma 複製 API → BI 匯入 → 精美 dashboard ================= */
    {
      scene: SC5,
      sub: "回到 Plasma —— AI Agent 透過 MCP 建立的 bi_dashboard，已經在 Materialized View 頁面，狀態 Ready。",
      async run(a) {
        a.update({ screen: "app", page: "mview", navActive: "/materialized-view" })
        await a.sleep(1200)
      },
    },
    {
      scene: SC5,
      sub: "在這裡直接複製對外的 Data API 網址。",
      async run(a) {
        await a.moveTo("btn-copy-api")
        await a.click("btn-copy-api")
        a.update({ apiCopied: true })
        await a.sleep(1100)
      },
    },
    {
      scene: SC5,
      sub: "打開 BI，選「連接資料來源」，貼上剛剛從 Plasma 複製的 Data API 網址，按連接。",
      async run(a) {
        // 先顯示空的 BI 儀表板，再疊上連接資料來源對話框
        a.update({ powerbiOpen: true, dashFilled: false, powerbiImportOpen: true })
        await a.sleep(1100)
        await a.moveTo("pbi-load")
        await a.click("pbi-load")
        await a.sleep(700)
      },
    },
    {
      scene: SC5,
      sub: "連上 Plasma 的 Data API，空面板立刻有資料。",
      async run(a) {
        a.update({ powerbiImportOpen: false, powerbiOpen: true, dashFilled: true })
        await a.sleep(1400)
        a.update({ subtitle: "完成！一開始的空面板，全部填滿了 —— 任何 agent 透過 Plasma 的 MCP，就能把一張 BI 截圖變成可用的 Data API、接回 BI。" })
        await a.sleep(800)
      },
    },
  ]
}
