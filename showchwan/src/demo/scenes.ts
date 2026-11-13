import type { DemoState } from "./store"
import { A_COLUMNS, BRANCHES, HQ_WS, KB_FILES, HQ_SQL } from "./data"

export interface Api {
  fast: boolean
  update(patch: Partial<DemoState> | ((s: DemoState) => Partial<DemoState>)): void
  sleep(ms: number): Promise<void>
  moveTo(sel: string): Promise<void>
  click(sel: string): Promise<void>
  /** 聚光燈:圈住要操作的元素、旁邊說一句,停一下再繼續 */
  focus(sel: string, text: string, hold?: number): Promise<void>
  /** 打字到任意字串欄位(工作區名稱、AI 提問、SQL、表單) */
  type(set: (v: string) => Partial<DemoState>, text: string, speed?: number): Promise<void>
}

export type SceneRun = (a: Api) => Promise<void>

const A = BRANCHES[0]
const emptyForm = { display_name: "", db_type: "", description: "", host: "", port: "", db_name: "", username: "", password: "" }
const nav = (path: string, page: DemoState["page"]) => ({ navActive: path, page, screen: "app" as const })
const sub = (n: number, hot: string | null = null) => ({ sub: n, hot })

// 點一下:先打聚光燈說明,再點,然後收掉聚光燈
async function press(a: Api, sel: string, text: string) {
  await a.focus(sel, text)
  await a.click(sel)
  a.update({ spot: null })
}

export function buildScenes(): SceneRun[] {
  return [
    /* 1 · 現況:只看情境圖 */
    async (a) => {
      a.update({ screen: "login", ...sub(0, "dbs") })
      await a.sleep(2600)
      a.update(sub(1, "schema"))
      await a.sleep(3200)
      a.update(sub(3, "hq"))
      await a.sleep(2600)
    },

    /* 2 · A 分院接上 Plasma */
    async (a) => {
      a.update({ screen: "login", loginUser: "", loginPass: "", ...sub(0) })
      await a.focus("login-user", "用 A 分院的帳號登入")
      await a.type((v) => ({ loginUser: v }), "a-admin")
      await a.moveTo("login-pass")
      await a.type((v) => ({ loginPass: v }), "••••••••", 70)
      a.update({ spot: null })
      await a.click("login-submit")
      a.update({ loggingIn: true })
      await a.sleep(800)
      a.update({ loggingIn: false, ...nav("/database", "list"), ...sub(1) })
      await a.sleep(700)

      await press(a, "nav-workspace", "到 Workspace 頁")
      a.update(nav("/workspace", "workspace"))
      await a.sleep(500)
      await press(a, "btn-add-ws", "新增 A 分院的工作區")
      a.update({ wsOpen: true, wsName: "" })
      await a.focus("f-ws-name", "輸入工作區名稱", 400)
      await a.type((v) => ({ wsName: v }), A.ws, 110)
      a.update({ spot: null })
      await press(a, "btn-ws-save", "建立")
      a.update((s) => ({ wsOpen: false, workspaces: [A.ws], ws: A.ws, ...sub(2, "plasma") }))
      await a.sleep(1200)

      await press(a, "nav-database", "到 Data Access，接上資料庫")
      a.update({ ...nav("/database", "list"), connections: [] })
      await a.sleep(500)
      await press(a, "btn-add-db", "新增 A 分院的 HIS 資料庫")
      a.update({ addOpen: true, form: { ...emptyForm }, connStatus: "void" })
      await a.focus("f-name", "填入連線名稱與主機", 500)
      await a.type((v) => ({ form: { ...emptyForm, display_name: v } }), A.conn)
      a.update((s) => ({ form: { ...s.form, db_type: A.type, description: A.desc } }))
      await a.sleep(500)
      await a.moveTo("f-host")
      await a.type((v) => ({ form: { ...emptyForm, display_name: A.conn, db_type: A.type, description: A.desc, host: v } }), A.host, 24)
      a.update((s) => ({ spot: null, form: { ...s.form, port: A.port, db_name: A.db, username: "readonly", password: "readonly" } }))
      await a.sleep(600)
      await press(a, "btn-verify", "用唯讀帳號驗證連線")
      a.update({ connStatus: "preparing", ...sub(3) })
      await a.sleep(1300)
      a.update({ connStatus: "ready" })
      await a.sleep(700)
      await press(a, "btn-save", "連線成功，儲存")
      a.update({ addOpen: false, connections: [{ name: A.conn, type: A.type, status: "ready" }], ...sub(4, "edgeA") })
      await a.sleep(1600)
    },

    /* 3 · 讓 AI 看懂 A 分院的欄位 */
    async (a) => {
      a.update({ ...nav("/database", "list"), ws: A.ws, ...sub(0) })
      await a.sleep(500)
      await press(a, "nav-knowledge", "到 AI › Knowledge 知識庫")
      a.update({ ...nav("/knowledge", "knowledge"), ...sub(1) })
      await a.sleep(500)
      await press(a, "btn-kb-upload", "上傳 A 分院的系統文件")
      a.update({ uploadOpen: true, files: [] })
      await a.focus("dropzone", "規格書、資料字典、職稱代碼表…", 500)
      for (const f of KB_FILES) {
        a.update((s) => ({ files: [...s.files, f] }))
        await a.sleep(300)
      }
      a.update({ spot: null })
      await a.sleep(500)
      await press(a, "btn-upload", "上傳")
      a.update({ uploadOpen: false, kbDocs: KB_FILES.map((name) => ({ name, status: "processing" })), ...sub(2, "docs") })
      await a.sleep(2000)
      for (let i = 0; i < KB_FILES.length; i++) {
        a.update((s) => ({ kbDocs: s.kbDocs.map((d, k) => (k === i ? { ...d, status: "ready" } : d)) }))
        await a.sleep(350)
      }
      a.update({ ...sub(3, "kb"), columns: A_COLUMNS.map((c) => ({ ...c, desc: "" })) })
      await a.sleep(900)
      // 欄位說明一個一個補上
      for (let i = 0; i < A_COLUMNS.length; i++) {
        await a.type((v) => ({ columns: A_COLUMNS.map((c, k) => ({ ...c, desc: k < i ? c.desc : k === i ? v : "" })) }), A_COLUMNS[i].desc, 45)
        await a.sleep(250)
      }
      a.update(sub(4, "kb"))
      await a.focus("col-panel", "AI 看懂了：TITLE_CD = N02 就是護理師", 2600)
      a.update({ spot: null })
    },

    /* 4 · 用問的整理資料 */
    async (a) => {
      const q = "把 A 分院的護理人員整理成一份名冊：員工編號、姓名、職稱、單位。"
      a.update({ screen: "agent", agentMsgs: [], agentInput: "", ws: A.ws, ...sub(0, "ai") })
      await a.sleep(900)
      await a.focus("agent-input", "直接用問的，不用寫程式", 600)
      await a.type((v) => ({ agentInput: v }), q, 55)
      a.update({ spot: null })
      await a.click("agent-send")
      a.update((s) => ({ agentInput: "", agentMsgs: [...s.agentMsgs, { role: "user", text: q }], ...sub(1, "ai") }))
      const tools = [
        "list_tables → 找到 A 分院 NURSE_MST（護理人員主檔）",
        "describe_columns → 由知識庫得知 TITLE_CD = N02 是護理師、DEPT_C 是單位",
        "create_view → a_nurse_roster（只讀取，不影響 A 分院資料庫）",
      ]
      for (const t of tools) {
        await a.sleep(1400)
        a.update((s) => ({ agentMsgs: [...s.agentMsgs, { role: "tool", text: t }] }))
      }
      await a.sleep(1400)
      a.update((s) => ({ agentMsgs: [...s.agentMsgs, { role: "ai", text: "完成。A 分院共 248 位護理人員，已整理成名冊「a_nurse_roster」，下面是前幾筆（示意資料）：", table: true }], ...sub(3, "ai") }))
      await a.focus("agent-answer", "一句話就整理好，全程只讀取", 2600)
      a.update({ spot: null })
    },

    /* 5 · 上架成資料產品 */
    async (a) => {
      a.update({ ...nav("/data-product", "product"), ws: A.ws, form: { ...emptyForm }, products: [], ...sub(0) })
      await a.sleep(700)
      await press(a, "btn-add-product", "把名冊發布成資料產品")
      a.update({ productOpen: true, ...sub(1, "prod") })
      await a.focus("f-product-name", "取一個大家看得懂的名字", 500)
      await a.type((v) => ({ form: { ...emptyForm, display_name: v } }), "A 分院護理人員名冊", 100)
      a.update({ spot: null, ...sub(2, "prod") })
      await a.sleep(500)
      await a.focus("f-product-share", "分享給總院的工作區", 1600)
      a.update({ spot: null, ...sub(3, "prod") })
      await press(a, "btn-product-save", "發布")
      a.update({ productOpen: false, products: ["A 分院護理人員名冊"], ...sub(4, "prod") })
      await a.sleep(2200)
    },

    /* 6 · 跨院交換:總院彙整 */
    async (a) => {
      a.update({ ...nav("/data-product", "product"), ws: A.ws, products: ["A 分院護理人員名冊"], sqlText: "", sqlRan: false, ...sub(0, "others") })
      await a.sleep(3200) // 情境圖:B、C、D 分院照同樣步驟接上、上架
      a.update(sub(1, "hq"))
      await press(a, "ws-switch", "切換到總院的工作區")
      a.update({ ws: HQ_WS, products: BRANCHES.map((b) => `${b.ws}護理人員名冊`), ...sub(2, "hq") })
      await a.sleep(800)
      await a.focus("product-table", "四家分院分享過來的資料產品，格式都一樣", 2200)
      a.update({ spot: null })
      await press(a, "nav-sql-playground", "到 SQL Playground 一次查四家")
      a.update(nav("/sql-playground", "sql"))
      await a.moveTo("sql-editor")
      await a.type((v) => ({ sqlText: v }), HQ_SQL, 12)
      await press(a, "btn-run-sql", "執行")
      await a.sleep(700)
      a.update({ sqlRan: true, ...sub(4, "hq") })
      await a.focus("sql-result", "各分院護理師人數，一查就有", 2600)
      a.update({ spot: null })
    },
  ]
}
