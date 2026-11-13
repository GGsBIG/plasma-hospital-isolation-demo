import type { DemoState } from "./store"
import { BRANCHES, HQ_WS, KB_FILES, HQ_SQL } from "./data"

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

// 任意字串欄位的打字(工作區名稱、AI 提問、SQL)
type Typer = (field: "wsName" | "agentInput" | "sqlText", text: string, speed?: number) => Promise<void>
const typeAny = (a: Api): Typer => (field, text, speed) => a.typeLogin(field as "loginUser", text, speed)

const nav = (path: string, page: DemoState["page"]) => ({ navActive: path, page, screen: "app" as const })
const emptyForm = { display_name: "", db_type: "", description: "", host: "", port: "", db_name: "", username: "", password: "" }

// 七個片段(對應情境圖的 scn 0~6)與每段第一步的 index,給下方片段列使用
export const CHAPTER_FROM = [0, 2, 4, 6, 7, 8, 9]

export function buildSteps(): Step[] {
  const A = BRANCHES[0]
  return [
    /* 1 · 登入 Plasma */
    {
      scene: "1",
      async run(a) {
        a.update({ scn: 0, screen: "login" })
        await a.sleep(2600)
      },
    },
    {
      scene: "1",
      async run(a) {
        await a.moveTo("login-user")
        await a.typeLogin("loginUser", "hq-admin")
        await a.moveTo("login-pass")
        await a.typeLogin("loginPass", "••••••••", 60)
        await a.click("login-submit")
        a.update({ loggingIn: true })
        await a.sleep(900)
        a.update({ loggingIn: false, ...nav("/database", "list") })
        await a.sleep(900)
      },
    },

    /* 2 · 建立四個分院工作區 */
    {
      scene: "2",
      async run(a) {
        a.update({ scn: 1 })
        await a.click("nav-workspace")
        a.update(nav("/workspace", "workspace"))
        await a.sleep(600)
        await a.click("btn-add-ws")
        a.update({ wsOpen: true, wsName: "" })
        await a.moveTo("f-ws-name")
        await typeAny(a)("wsName", A.ws, 90)
        await a.click("btn-ws-save")
        a.update((s) => ({ wsOpen: false, workspaces: [...s.workspaces, A.ws] }))
        await a.sleep(900)
      },
    },
    {
      scene: "2",
      async run(a) {
        for (const ws of [...BRANCHES.slice(1).map((b) => b.ws), HQ_WS]) {
          a.update((s) => ({ workspaces: [...s.workspaces, ws] }))
          await a.sleep(550)
        }
        await a.sleep(900)
      },
    },

    /* 3 · 各分院連接自己的資料庫(唯讀) */
    {
      scene: "3",
      async run(a) {
        a.update({ scn: 2 })
        await a.click("ws-switch")
        a.update({ ws: A.ws })
        await a.sleep(500)
        await a.click("nav-database")
        a.update({ ...nav("/database", "list"), connections: [] })
        await a.sleep(500)
        await a.click("btn-add-db")
        a.update({ addOpen: true, form: { ...emptyForm }, connStatus: "void" })
        await a.moveTo("f-name")
        await a.typeField("display_name", A.conn)
        a.update((s) => ({ form: { ...s.form, db_type: A.type, description: A.desc } }))
        await a.sleep(400)
        await a.moveTo("f-host")
        await a.typeField("host", A.host, 22)
        a.update((s) => ({ form: { ...s.form, port: A.port, db_name: A.db, username: "readonly", password: "readonly" } }))
        await a.sleep(400)
        await a.click("btn-verify")
        a.update({ connStatus: "preparing" })
        await a.sleep(1100)
        a.update({ connStatus: "ready" })
        await a.sleep(500)
        await a.click("btn-save")
        a.update({ addOpen: false, connections: [{ name: A.conn, type: A.type, status: "ready" }] })
        await a.sleep(1200)
      },
    },
    {
      scene: "3",
      async run(a) {
        // 其他三家分院照樣接上:切到各自的工作區,列表出現自己的資料庫
        for (const b of BRANCHES.slice(1)) {
          await a.click("ws-switch")
          a.update({ ws: b.ws, connections: [] })
          await a.sleep(500)
          a.update({ connections: [{ name: b.conn, type: b.type, status: "ready" }] })
          await a.sleep(1000)
        }
      },
    },

    /* 4 · 上傳系統文件到知識庫 */
    {
      scene: "4",
      async run(a) {
        a.update({ scn: 3 })
        await a.click("ws-switch")
        a.update({ ws: A.ws })
        await a.sleep(400)
        await a.click("nav-knowledge")
        a.update(nav("/knowledge", "knowledge"))
        await a.sleep(500)
        await a.click("btn-kb-upload")
        a.update({ uploadOpen: true, files: [] })
        await a.click("dropzone")
        for (const f of KB_FILES) {
          a.update((s) => ({ files: [...s.files, f] }))
          await a.sleep(260)
        }
        await a.sleep(500)
        await a.click("btn-upload")
        a.update({ uploadOpen: false, kbDocs: KB_FILES.map((name) => ({ name, status: "processing" })) })
        await a.sleep(1600)
        for (let i = 0; i < KB_FILES.length; i++) {
          a.update((s) => ({ kbDocs: s.kbDocs.map((d, k) => (k === i ? { ...d, status: "ready" } : d)) }))
          await a.sleep(320)
        }
        await a.sleep(1200)
      },
    },

    /* 5 · 用 AI Agent 問答整理資料 */
    {
      scene: "5",
      async run(a) {
        a.update({ scn: 4, screen: "agent", agentMsgs: [], agentInput: "" })
        await a.sleep(700)
        await a.moveTo("agent-input")
        await typeAny(a)("agentInput", "把四家分院的護理人員整理成同一張表：員工編號、姓名、職稱、單位、分院。", 50)
        await a.click("agent-send")
        a.update((s) => ({ agentInput: "", agentMsgs: [...s.agentMsgs, { role: "user", text: "把四家分院的護理人員整理成同一張表：員工編號、姓名、職稱、單位、分院。" }] }))
        const tools = [
          "list_tables → A 分院 NURSE_MST、B 分院 emp、C 分院 HR_STAFF、D 分院 staff",
          "describe_columns → 由知識庫對出職稱代碼（B 分院 title_cd N02、D 分院 role_id 7 = 護理師）",
          "create_view → nurse_roster（只讀取，不影響各分院資料庫）",
        ]
        for (const t of tools) {
          await a.sleep(1100)
          a.update((s) => ({ agentMsgs: [...s.agentMsgs, { role: "tool", text: t }] }))
        }
        await a.sleep(1200)
        a.update((s) => ({ agentMsgs: [...s.agentMsgs, { role: "ai", text: "完成。四家分院共 812 位護理人員，已存成 View「nurse_roster」，下面是前幾筆（示意資料）：", table: true }] }))
        await a.sleep(2600)
      },
    },

    /* 6 · 發布成資料產品 */
    {
      scene: "6",
      async run(a) {
        a.update({ scn: 5, ...nav("/data-product", "product"), form: { ...emptyForm } })
        await a.sleep(700)
        await a.click("btn-add-product")
        a.update({ productOpen: true })
        await a.moveTo("f-product-name")
        await a.typeField("display_name", "護理人員名冊", 90)
        await a.sleep(400)
        await a.click("btn-product-save")
        a.update({ productOpen: false, products: ["護理人員名冊"] })
        await a.sleep(1800)
      },
    },

    /* 7 · 總院取用、跨院彙整 */
    {
      scene: "7",
      async run(a) {
        a.update({ scn: 6 })
        await a.click("ws-switch")
        a.update({ ws: HQ_WS, sqlText: "", sqlRan: false })
        await a.sleep(500)
        await a.click("nav-sql-playground")
        a.update(nav("/sql-playground", "sql"))
        await a.moveTo("sql-editor")
        await typeAny(a)("sqlText", HQ_SQL, 28)
        await a.click("btn-run-sql")
        await a.sleep(700)
        a.update({ sqlRan: true })
        await a.sleep(4200)
      },
    },
  ]
}
