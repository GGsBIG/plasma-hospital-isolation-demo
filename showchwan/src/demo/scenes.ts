import type { DemoState } from "./store"
import { A_COLUMNS, A_DBS, KB_FILES, CROSS_SQL } from "./data"

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

const A = A_DBS[0]
const WS_A = "A 分院"
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
      a.update({ screen: "login" })
      await a.sleep(4500)
    },

    /* 2 · 登入 Plasma */
    async (a) => {
      a.update({ screen: "login", loginUser: "", loginPass: "" })
      await a.focus("login-user", "輸入帳號")
      await a.type((v) => ({ loginUser: v }), "a-admin")
      await a.moveTo("login-pass")
      await a.type((v) => ({ loginPass: v }), "••••••••", 70)
      a.update({ spot: null })
      await press(a, "login-submit", "登入")
      a.update({ loggingIn: true })
      await a.sleep(800)
      a.update({ loggingIn: false, ...nav("/database", "list"), ws: WS_A })
      await a.sleep(1200)
    },

    /* 3 · 接上三套資料庫 */
    async (a) => {
      a.update({ ...nav("/database", "list"), ws: WS_A, connections: [] })
      await a.sleep(600)
      await press(a, "btn-add-db", "新增資料庫")
      a.update({ addOpen: true, form: { ...emptyForm }, connStatus: "void" })
      await a.focus("f-name", "HIS 門診", 400)
      await a.type((v) => ({ form: { ...emptyForm, display_name: v } }), A.conn)
      a.update((s) => ({ spot: null, form: { ...s.form, db_type: A.type, description: A.desc, host: A.host, port: A.port, db_name: A.db, username: "readonly", password: "readonly" } }))
      await a.sleep(700)
      await press(a, "btn-verify", "唯讀驗證")
      a.update({ connStatus: "preparing" })
      await a.sleep(1100)
      a.update({ connStatus: "ready" })
      await a.sleep(500)
      await press(a, "btn-save", "儲存")
      a.update({ addOpen: false, connections: [{ name: A.conn, type: A.type, status: "ready" }] })
      await a.sleep(900)
      // 護理系統、人事系統照樣接上
      await a.focus("btn-add-db", "護理系統、人事系統", 700)
      a.update({ spot: null })
      for (const d of A_DBS.slice(1)) {
        a.update((s) => ({ connections: [...s.connections, { name: d.conn, type: d.type, status: "ready" }] }))
        await a.sleep(800)
      }
      await a.sleep(800)
    },

    /* 4 · AI 看懂欄位(Plasma 長出大腦) */
    async (a) => {
      a.update({ ...nav("/knowledge", "knowledge"), ws: WS_A, kbDocs: [], columns: [] })
      await a.sleep(500)
      await press(a, "btn-kb-upload", "上傳文件")
      a.update({ uploadOpen: true, files: [] })
      await a.focus("dropzone", "系統文件", 400)
      for (const f of KB_FILES) {
        a.update((s) => ({ files: [...s.files, f] }))
        await a.sleep(280)
      }
      a.update({ spot: null })
      await press(a, "btn-upload", "上傳")
      a.update({ uploadOpen: false, kbDocs: KB_FILES.map((name) => ({ name, status: "processing" })) })
      await a.sleep(1800)
      for (let i = 0; i < KB_FILES.length; i++) {
        a.update((s) => ({ kbDocs: s.kbDocs.map((d, k) => (k === i ? { ...d, status: "ready" } : d)) }))
        await a.sleep(300)
      }
      a.update({ columns: A_COLUMNS.map((c) => ({ ...c, desc: "" })) })
      await a.sleep(700)
      for (let i = 0; i < A_COLUMNS.length; i++) {
        await a.type((v) => ({ columns: A_COLUMNS.map((c, k) => ({ ...c, desc: k < i ? c.desc : k === i ? v : "" })) }), A_COLUMNS[i].desc, 40)
        await a.sleep(200)
      }
      await a.focus("col-panel", "N02 = 護理師", 2400)
      a.update({ spot: null })
    },

    /* 5 · 一種 SQL 查三套資料庫 */
    async (a) => {
      a.update({ ...nav("/sql-playground", "sql"), ws: WS_A, sqlMode: "cross", sqlText: "", sqlRan: false, dialects: true })
      await a.sleep(500)
      await a.focus("dialects", "以前：三套資料庫，三種語法", 2600)
      a.update({ spot: null })
      await a.moveTo("sql-editor")
      await a.type((v) => ({ sqlText: v }), CROSS_SQL, 14)
      await a.focus("sql-editor", "現在：一句 SQL 查三套", 1400)
      a.update({ spot: null })
      await press(a, "btn-run-sql", "執行")
      await a.sleep(600)
      a.update({ sqlRan: true })
      await a.focus("sql-result", "三套資料庫，一次查到", 2400)
      a.update({ spot: null })
    },

    /* 6 · 用問的整理資料 */
    async (a) => {
      const q = "整理 A 分院的護理人員名冊。"
      a.update({ screen: "agent", agentMsgs: [], agentInput: "", ws: WS_A })
      await a.sleep(600)
      await a.focus("agent-input", "直接問", 500)
      await a.type((v) => ({ agentInput: v }), q, 60)
      a.update({ spot: null })
      await a.click("agent-send")
      a.update((s) => ({ agentInput: "", agentMsgs: [...s.agentMsgs, { role: "user", text: q }] }))
      for (const t of ["list_tables → 三套資料庫", "describe_columns → N02 = 護理師", "create_view → 護理人員名冊"]) {
        await a.sleep(1100)
        a.update((s) => ({ agentMsgs: [...s.agentMsgs, { role: "tool", text: t }] }))
      }
      await a.sleep(1100)
      a.update((s) => ({ agentMsgs: [...s.agentMsgs, { role: "ai", text: "A 分院 248 位護理人員（示意）：", table: true }] }))
      await a.focus("agent-answer", "名冊完成", 2400)
      a.update({ spot: null })
    },

    /* 7 · 上架資料產品 */
    async (a) => {
      a.update({ ...nav("/data-product", "product"), ws: WS_A, form: { ...emptyForm }, products: [] })
      await a.sleep(600)
      await press(a, "btn-add-product", "新增資料產品")
      a.update({ productOpen: true })
      await a.focus("f-product-name", "命名", 400)
      await a.type((v) => ({ form: { ...emptyForm, display_name: v } }), "A 分院護理人員名冊", 90)
      a.update({ spot: null })
      await a.sleep(500)
      await press(a, "btn-product-save", "發布")
      a.update({ productOpen: false, products: ["A 分院護理人員名冊"] })
      await a.sleep(1800)
    },
  ]
}
