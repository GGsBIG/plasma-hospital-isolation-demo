import type { DemoState, ChatMsg } from "./store"
import { DB_FORM, MYSQL_FORM, PG_FORM, DOC_FILES, T_ORD_M_COLUMNS } from "./data"

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

const SC_INTRO = "前情提要 · 今天的目標"
const SC0 = "0 · 登入 Plasma"
const SC1 = "1 · 連接院內系統"
const SC2 = "2 · 上傳描述文件"
const SC3 = "3 · 讓平台理解每個欄位"
const SC4 = "4 · 醫師問 AI Agent、產出報告"

const push = (msg: ChatMsg) => (s: DemoState) => ({ chat: [...s.chat, msg] })

// 幕四醫師的三句提問（情境 C：單一病人跨系統病史整合 → 問答 → 產報告）
const Q1 = "陳先生，病歷號 P000123，有糖尿病和高血壓。他這一年在院內各科的就診狀況，幫我整理一下重點。"
const Q2 = "他的血糖控制和腎功能幫我看一下，有沒有要特別注意的？"
const Q3 = "幫我產出一份完整的病史摘要報告，等下轉診要用。"

export function buildSteps(): Step[] {
  return [
    /* ================= 前情提要：今天的目標＝用一句話問到整合病史、還能產報告 ================= */
    {
      scene: SC_INTRO,
      sub: "先看今天的目標 —— 門診醫師想直接問一句，就掌握病人散在各系統的完整病史，甚至請 AI 產出一份報告。",
      async run(a) {
        a.update({ screen: "login" })
        await a.sleep(2800)
      },
    },
    {
      scene: SC_INTRO,
      sub: "但病人的資料分散在 HIS 門診住院、LIS 檢驗、EMR 病歷等系統，欄位還是 DX_CD、RX_FLG 這種天書。要先讓 Plasma 讀懂這些資料，AI Agent 才答得出來。",
      async run(a) {
        await a.sleep(3000)
        a.update({ subtitle: "讓我們從第一步開始。" })
        await a.sleep(1500)
        a.update({ screen: "login", loginUser: "", loginPass: "", loggingIn: false })
        await a.sleep(600)
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

    /* ================= 幕一：連接院內系統 ================= */
    {
      scene: SC1,
      sub: "第一步：把 HIS 門診／住院系統接進 Plasma —— 資料不搬家，只用唯讀連線。",
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
          connections: s.connections.some((c) => c.name === "his_oltp")
            ? s.connections
            : [...s.connections, { name: "his_oltp", type: "Oracle", status: "ready" }],
        }))
        await a.sleep(400)
      },
    },
    {
      scene: SC1,
      sub: "用同樣方式，快速把 LIS 檢驗、EMR 病歷庫也接進來 —— 各種異質系統都行。",
      async run(a) {
        // 快速接入 lis_db 與 emr_sink（大多瞬間填入，短暫 verify）
        for (const [form, conn] of [
          [MYSQL_FORM, { name: "lis_db", type: "MySQL", status: "ready" }],
          [PG_FORM, { name: "emr_sink", type: "PostgreSQL", status: "ready" }],
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
      sub: "連線完成後，點這一列的 Tables，就能進去看這個系統裡有哪些表。",
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
      sub: "這個系統有 PT_VST_M、RX_ORDER 兩張表。",
      async run(a) {
        await a.moveTo("row-tord")
        await a.sleep(1200)
      },
    },
    {
      scene: SC1,
      sub: "點 View Data 看實際資料 —— 有資料，但像 VST_TP = 3、DX_CD = E11.9 這些值，看不出是什麼意思。",
      async run(a) {
        await a.moveTo("btn-view-data")
        await a.click("btn-view-data")
        a.update({ viewDataOpen: true })
        await a.sleep(2200) // 停著看原始資料（下一步才關）
      },
    },
    {
      scene: SC1,
      sub: "再點 View Schema 看欄位 —— VST_NO、PID、DX_CD、RX_FLG，欄位名稱一樣是天書。",
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
      sub: "正因為表和欄位都看不懂，所以要上傳系統資料字典、病歷整合規格書，讓 Plasma 徹底了解這個系統在記什麼。",
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
      sub: "拖入「就診紀錄欄位說明」「病歷整合規格書」，按上傳，交給 AI 分析。",
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
      sub: "上傳完文件後，點 Tables 回到表清單，打開 PT_VST_M 的欄位描述。",
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
      sub: "見證時刻：AI 根據文件，替每一個欄位逐一生成描述 —— 天書變人話。這一步，正是讓 AI Agent 之後答得準的關鍵。",
      async run(a) {
        for (let i = 0; i < T_ORD_M_COLUMNS.length; i++) {
          await a.typeColumnDesc(i, T_ORD_M_COLUMNS[i].desc)
          await a.sleep(160)
        }
        // 等全部填完後的慢速下捲跑完，再存檔
        await a.sleep(3000)
        await a.moveTo("btn-save-desc")
        await a.click("btn-save-desc")
        a.update({ editOpen: false, subtitle: "完成！Plasma 資料中台已徹底理解這個系統的每一個欄位。" })
        await a.sleep(500)
      },
    },

    /* ================= 幕四：門診醫師透過 AI Agent 問答，並產出報告 ================= */
    {
      scene: SC4,
      sub: "切到門診醫師常用的 AI Agent，按一下就接上 Plasma 的 MCP —— 任何支援 MCP 的 agent 都能這樣接。",
      async run(a) {
        a.update({ screen: "chatgpt", chat: [], chatInput: "", aiTyping: false, mcpConnected: false })
        await a.sleep(1000)
        await a.moveTo("mcp-connect")
        await a.click("mcp-connect")
        a.update({ mcpConnected: true })
        await a.sleep(1300)
      },
    },
    {
      scene: SC4,
      sub: "醫師不用登入 HIS、LIS、病歷系統四處查，直接用一句話問 AI Agent。",
      async run(a) {
        await a.typeChat(Q1)
        await a.sleep(400)
        await a.moveTo("agent-send")
        await a.click("agent-send")
        a.update((s) => ({ chatInput: "", chat: [...s.chat, { role: "user", text: Q1 }] }))
        await a.sleep(600)
      },
    },
    {
      scene: SC4,
      sub: "AI Agent 透過 Plasma MCP 跨 HIS、LIS 查詢，用剛剛整理好的欄位語意作答 —— 醫師不用寫任何 SQL、不用知道資料在哪。",
      async run(a) {
        a.update({ aiTyping: true })
        await a.sleep(1800)
        a.update({ aiTyping: false })
        a.update(push({ role: "ai", text: "我查了他跨系統的紀錄：近一年在院內共 8 次就診，橫跨新陳代謝科、心臟內科、腎臟科，其中 2 次住院、合計 9 天。主要問題：第二型糖尿病（E11.9）、高血壓（I10）、慢性腎臟病第 3 期（N18.3）。今年 7 月曾因不穩定型心絞痛住院。", block: "toolcall" }))
        await a.sleep(1600)
      },
    },
    {
      scene: SC4,
      sub: "醫師接著追問 —— 就像跟一位讀過這位病人全部病歷的助理對話。",
      async run(a) {
        await a.typeChat(Q2)
        await a.sleep(300)
        await a.click("agent-send")
        a.update((s) => ({ chatInput: "", chat: [...s.chat, { role: "user", text: Q2 }] }))
        await a.sleep(500)
        a.update({ aiTyping: true })
        await a.sleep(1600)
        a.update({ aiTyping: false })
        a.update(push({ role: "ai", text: "血糖控制有改善：HbA1c 從 9.2% 降到 7.8%，但仍高於 7.0% 的目標。腎功能要注意：Creatinine 1.8 mg/dL、eGFR 42（屬慢性腎臟病第 3 期），像 Metformin 這類藥物的劑量需依腎功能評估，建議持續追蹤。" }))
        await a.sleep(1600)
      },
    },
    {
      scene: SC4,
      sub: "最後，醫師請 AI Agent 直接產出一份報告 —— 問答之外，還能生出可交付的文件。",
      async run(a) {
        await a.typeChat(Q3)
        await a.sleep(300)
        await a.click("agent-send")
        a.update((s) => ({ chatInput: "", chat: [...s.chat, { role: "user", text: Q3 }] }))
        await a.sleep(500)
        a.update({ aiTyping: true })
        await a.sleep(1800)
        a.update({ aiTyping: false })
        a.update(push({ role: "ai", text: "好的，我已整合門診、住院、檢驗與用藥紀錄，產出這位病人的病史摘要報告：", block: "report" }))
        await a.sleep(1800)
        a.update({ subtitle: "完成！醫師只是用自然語言問了幾句，AI Agent 就透過 Plasma 讀懂散在各系統的資料、整合病史、還產出一份可交付的報告 —— 全程不用寫 SQL、不用知道資料在哪。" })
        await a.sleep(1000)
      },
    },
  ]
}
