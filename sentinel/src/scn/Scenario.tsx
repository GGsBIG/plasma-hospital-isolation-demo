import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Platform } from "./components/Iso"
import { edgePath, sizeOf } from "./geometry"
import type { NodeKind, Pos } from "./types"
import postgresLogo from "./assets/db/postgresql.svg"
import { STEPS } from "@/sc/steps"
import "./scn.css"

// 情境圖:線上購物平台的叢集(顧客 → storefront → payment-api → orders-db),上方是 K8s Sentinel。
// 每個情境的圖自己依時間播放(不等左邊的操作),換情境或按重播就從頭播
const W = 1000
const H = 680
const TICK = 1500 // 子步驟間隔
// 每個情境的子步驟間隔:配合左邊 Sentinel 的操作與說明卡
const PACE = [TICK, 7000, 9000, 14000, 10000, 14000, 6000]

interface N { id: string; kind: NodeKind; variant?: string; pos: Pos; label?: string; sub?: ReactNode; tone?: "ok" | "danger"; brand?: string; hot?: boolean; smoke?: boolean; lock?: boolean; dim?: boolean }
interface E { from: string; to: string; tone: "red" | "ok" | "watch" }
interface Note { at: Pos; text: string; tone: "red" | "ink" }

// 位置
const USER = { x: 95, y: 430 }
const STORE = { x: 320, y: 430 }
const PAY = { x: 560, y: 430 }
const DB = { x: 800, y: 430 }
const SENT = { x: 560, y: 150 }
const EVIL = { x: 860, y: 160 }
const REG = { x: 130, y: 170 }
const ZONE = { x: 225, y: 330, w: 700, h: 230 } // 叢集框

function scene(k: number, t: number) {
  const nodes: N[] = []
  const edges: E[] = []
  let note: Note | null = null
  const sentinel = k >= 1
  const payQ = k === 3 && t >= 1 // payment-api 被隔離

  nodes.push({ id: "user", kind: "person", pos: USER, label: "顧客" })
  nodes.push({ id: "store", kind: "app", pos: STORE, label: "storefront", sub: k === 5 ? (t >= 0 ? "Critical · 對外暴露" : undefined) : undefined, tone: k === 5 ? "danger" : undefined, hot: k === 5 && t === 0 })
  nodes.push({ id: "db", kind: "db", pos: DB, label: "orders-db", brand: postgresLogo })
  if (sentinel) nodes.push({ id: "sent", kind: "sentinel", pos: SENT, label: "K8s Sentinel", hot: k === 6, sub: k === 1 ? (t === 0 ? "Monitoring：只觀察" : "學習中") : k === 6 ? "Audit Log" : undefined, tone: "ok" })

  // payment-api 的狀態
  let pay: Partial<N> = {}
  if (k === 0) pay = t >= 2 ? { sub: "xmrig 挖礦中", tone: "danger", smoke: true, hot: true } : t >= 1 ? { sub: "裡面在跑什麼？" } : {}
  if (k === 1) pay = t >= 2 ? { sub: "白名單：2 支程式", tone: "ok", hot: true } : t >= 1 ? { sub: "payment-server · healthcheck", tone: "ok" } : {}
  if (k === 2) pay = t >= 2 ? { sub: "xmrig 已終止", tone: "ok", hot: true } : t >= 1 ? { sub: "xmrig 啟動", tone: "danger", hot: true } : { sub: "Protect：攔截中", tone: "ok" }
  if (k === 3) pay = t >= 1 ? { sub: t >= 2 ? "已隔離 · 證據保留" : "已隔離", tone: "danger", lock: true } : { sub: "可疑", tone: "danger", hot: true }
  if (k === 4) pay = { sub: t >= 1 ? "只連 orders-db" : "往外連可疑主機", tone: t >= 1 ? "ok" : "danger", hot: t === 0 }
  nodes.push({ id: "pay", kind: "app", pos: PAY, label: "payment-api", ...pay })

  // 一般流量
  edges.push({ from: "user", to: "store", tone: "ok" })
  if (!payQ) { edges.push({ from: "store", to: "pay", tone: "ok" }); edges.push({ from: "pay", to: "db", tone: "ok" }) }
  else edges.push({ from: "store", to: "db", tone: "ok" }) // 隔離後其他副本照常服務(示意)
  // Sentinel 在旁邊看著每個服務
  if (sentinel && k !== 4 && k !== 5) ["store", "pay", "db"].forEach((id) => edges.push({ from: "sent", to: id, tone: "watch" }))

  if (k === 0) {
    if (t >= 2) { nodes.push({ id: "evil", kind: "person", variant: "attacker", pos: EVIL, label: "攻擊者", tone: "danger" }); edges.push({ from: "evil", to: "pay", tone: "red" }) }
    note = t >= 3 ? { at: { x: 560, y: 640 }, text: "出事只能刪 Pod，證據跟著消失", tone: "red" }
      : t >= 2 ? { at: { x: 470, y: 250 }, text: "設定都沒變，沒人發現", tone: "red" }
      : t >= 1 ? { at: { x: 560, y: 250 }, text: "防火牆、權限都設好了，但容器裡看不到", tone: "red" } : null
  }
  if (k === 1) note = t === 0 ? { at: { x: 330, y: 70 }, text: "先觀察，不影響服務", tone: "ink" } : t === 1 ? { at: { x: 330, y: 70 }, text: "記下每個服務平常跑的程式", tone: "ink" } : { at: { x: 330, y: 70 }, text: "學到的，就是白名單", tone: "ink" }
  if (k === 2) {
    if (t >= 1) { nodes.push({ id: "evil", kind: "person", variant: "attacker", pos: EVIL, label: "攻擊者", tone: "danger" }); if (t === 1) edges.push({ from: "evil", to: "pay", tone: "red" }) }
    if (t >= 2) { nodes.push({ id: "slack", kind: "app", pos: { x: 230, y: 160 }, label: "值班人員", sub: "Slack 通知", tone: "ok", hot: true }); edges.push({ from: "sent", to: "slack", tone: "ok" }) }
    note = t === 0 ? { at: { x: 330, y: 70 }, text: "白名單確認後，改成攔截", tone: "ink" } : t === 1 ? { at: { x: 760, y: 300 }, text: "被植入挖礦程式", tone: "red" } : { at: { x: 760, y: 300 }, text: "kernel 當下終止", tone: "ink" }
  }
  if (k === 3) note = t === 0 ? { at: { x: 560, y: 610 }, text: "不刪 Pod", tone: "ink" } : t === 1 ? { at: { x: 560, y: 610 }, text: "網路切斷，攻擊停在這裡", tone: "ink" } : { at: { x: 560, y: 610 }, text: "程序、記憶體都還在，可以蒐證", tone: "ink" }
  if (k === 4) {
    nodes.push({ id: "evil", kind: "downstream", pos: EVIL, label: "可疑主機", sub: "203.0.113.50", tone: "danger" })
    edges.push({ from: "pay", to: "evil", tone: "red" })
    note = t === 0 ? { at: { x: 560, y: 610 }, text: "看見誰連誰：有一條往外連", tone: "red" } : t === 1 ? { at: { x: 560, y: 610 }, text: "白名單：只准 storefront → payment-api → orders-db", tone: "ink" } : { at: { x: 560, y: 610 }, text: "白名單以外的連線，直接丟棄", tone: "ink" }
  }
  if (k === 5) {
    if (t >= 1) nodes.push({ id: "reg", kind: "downstream", pos: REG, label: "storefront:2.4.0", sub: t >= 2 ? "拒絕部署" : "Critical 2 個", tone: "danger", hot: t === 2 })
    if (t === 1) edges.push({ from: "reg", to: "store", tone: "red" })
    note = t === 0 ? { at: { x: 320, y: 610 }, text: "對外暴露又有 Critical，先修", tone: "red" } : t === 1 ? { at: { x: 420, y: 70 }, text: "門檻：Critical 一個都不允許", tone: "ink" } : { at: { x: 420, y: 70 }, text: "超過門檻，進不了叢集", tone: "ink" }
  }
  if (k === 6) {
    nodes.push({ id: "csv", kind: "file", variant: "csv", pos: { x: 830, y: 150 }, label: "audit-log.csv", tone: "ok" })
    if (t >= 1) edges.push({ from: "sent", to: "csv", tone: "ok" })
    note = t === 0 ? { at: { x: 330, y: 70 }, text: "誰、何時、做了什麼，都記下來", tone: "ink" } : { at: { x: 330, y: 70 }, text: "匯出交給稽核", tone: "ink" }
  }
  return { nodes, edges, note }
}

// 三次貝茲曲線(edgePath 產生的 "M x y C ...")依弧長等距取樣:每一點的位置與切線角度
const SAMPLES = 48
function samplePath(d: string) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
  const at = (t: number) => {
    const u = 1 - t
    return {
      x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
      y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      dx: 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2),
      dy: 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2),
    }
  }
  const FINE = 240
  const acc = [0]
  let p = at(0)
  for (let i = 1; i <= FINE; i++) {
    const q = at(i / FINE)
    acc.push(acc[i - 1] + Math.hypot(q.x - p.x, q.y - p.y))
    p = q
  }
  const len = acc[FINE]
  const pts: { x: number; y: number; a: number }[] = []
  let j = 1
  let prev = 0
  for (let k = 0; k <= SAMPLES; k++) {
    const target = (k / SAMPLES) * len
    while (j < FINE && acc[j] < target) j++
    const seg = acc[j] - acc[j - 1] || 1
    const q = at((j - 1 + (target - acc[j - 1]) / seg) / FINE)
    // 角度接續前一點(不跨 ±180° 跳動),中間才不會多轉一圈
    let a = (Math.atan2(q.dy, q.dx) * 180) / Math.PI
    if (k) a += Math.round((prev - a) / 360) * 360
    prev = a
    pts.push({ x: q.x, y: q.y, a })
  }
  return { len, pts }
}

// 連線上流動的點/虛線:每一段是一個沿路徑移動的小方塊。路徑先取樣成 transform 關鍵影格
// (位移 + 沿切線旋轉),整段動畫交給 GPU 合成,主執行緒每格不必做任何事。
// 原本用 offset-path:瀏覽器不會把它交給 GPU,幾十個方塊每格都要重算樣式,手機會卡
const RIDE_SIZE = { dot: [5.1, 5], dash: [7, 2] } as const
function Ride({ d, gap, speed, cls }: { d: string; gap: number; speed: number; cls: "dot" | "dash" }) {
  const ref = useRef<HTMLDivElement>(null)
  const { len, frames } = useMemo(() => {
    const { len, pts } = samplePath(d)
    const [w, h] = RIDE_SIZE[cls]
    return { len, frames: pts.map((q) => ({ transform: `translate(${(q.x - w / 2).toFixed(2)}px, ${(q.y - h / 2).toFixed(2)}px) rotate(${q.a.toFixed(2)}deg)` })) }
  }, [d, cls])
  const n = Math.max(1, Math.round(len / gap))
  const dur = len / speed
  useLayoutEffect(() => {
    const box = ref.current
    if (!box) return
    // 減少動態:停在各自的位置,看起來是靜止的虛線
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const anims = Array.from(box.children, (el, i) => {
      const a = el.animate(frames, { duration: dur * 1000, iterations: Infinity, delay: (-i * dur * 1000) / n })
      if (still) a.pause()
      return a
    })
    return () => anims.forEach((a) => a.cancel())
  }, [frames, n, dur])
  return (
    <div ref={ref} className="scn-fade absolute left-0 top-0">
      {Array.from({ length: n }, (_, i) => <span key={i} className={`scn-ride ${cls}`} style={{ transform: frames[0].transform }} />)}
    </div>
  )
}

// 舞台以固定大小繪製,再等比縮放放進窗格。縮放倍率直接寫進 DOM,不經過 React:
// 對調畫面時窗格大小每格都在變,每格重畫整張情境圖手機會卡
function useFit() {
  const ref = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      if (stageRef.current) stageRef.current.style.transform = `translate(-50%, -50%) scale(${Math.min(el.clientWidth / W, el.clientHeight / H)})`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, stageRef }
}

function IsoNode({ n }: { n: N }) {
  const { a, t } = sizeOf(n.kind)
  return (
    <div className={`scn-node ${n.hot ? "hot" : ""} ${n.dim ? "dim" : ""}`} style={{ left: n.pos.x, top: n.pos.y }}>
      {n.hot && <span className="scn-pulse" aria-hidden="true" />}
      <div className="absolute"><Platform kind={n.kind} variant={n.variant} smoke={n.smoke} /></div>
      {n.lock && <div className="scn-lock" style={{ top: -a / 2 - 46 }} aria-label="已隔離"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></div>}
      {(n.label || n.sub) && (
        <div className="scn-label" style={{ top: a / 2 + t + 6 }}>
          {n.label && <div className="scn-pill scn-name">{n.brand && <img src={n.brand} alt="" />}{n.label}</div>}
          {n.sub && <div className={`scn-pill scn-sub ${n.tone ? `tone-${n.tone}` : ""}`}>{n.sub}</div>}
        </div>
      )}
    </div>
  )
}

/** 情境圖:step 換了或 epoch(重播)變了,就從第 0 個子步驟開始,依時間自己往下播 */
export const Scenario = memo(function Scenario({ step, epoch, isMain }: { step: number; epoch: number; isMain: boolean }) {
  const { ref, stageRef } = useFit()
  const [t, setT] = useState(0)
  const intro = step === 0 // 現況:右側列出痛點,再一步步帶出「在 Sentinel 裡怎麼做」
  const ROAD = STEPS.slice(1)
  const total = STEPS[step].subs.length + (intro ? ROAD.length : 0)
  useEffect(() => {
    setT(0)
    let n = 0
    const id = setInterval(() => {
      n++
      setT(n)
      if (n >= total) clearInterval(id)
    }, PACE[step])
    return () => clearInterval(id)
  }, [step, epoch, total])

  const tt = Math.min(t, total)
  const ts = Math.min(tt, STEPS[step].subs.length) // 圖與子步驟用
  const { nodes, edges, note } = scene(step, ts)
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const st = STEPS[step]
  return (
    <div className="scn">
      <div className="scn-caption">
        <span className="scn-step">{step + 1}</span>
        <div>
          <p className="scn-title">{st.title}</p>
          <ol className="scn-checks">
            {st.subs.map((x, i) => <li key={i} className={i < ts ? "ok" : i === ts ? "now" : ""}>{x}</li>)}
          </ol>
        </div>
      </div>
      {!intro && isMain && (
        <ul className="scn-pains inline">{st.pains.map((p) => <li key={p}>{p}</li>)}</ul>
      )}
      <div className={intro ? "scn-row" : "contents"}>
      <div ref={ref} className="scn-board">
        <div ref={stageRef} className="scn-stage" style={{ width: W, height: H }}>
          <div className="scn-zone" style={{ left: ZONE.x, top: ZONE.y, width: ZONE.w, height: ZONE.h }}><span>Kubernetes 叢集 · shop</span></div>
          <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1}>
            <defs>
              <radialGradient id="plasma-glow">
                <stop offset="0" style={{ stopColor: "var(--iso-glow)", stopOpacity: "var(--iso-glow-opacity)" }} />
                <stop offset="1" style={{ stopColor: "var(--iso-glow)", stopOpacity: 0 }} />
              </radialGradient>
            </defs>
            {edges.map((e) => {
              const f = byId[e.from]
              const to = byId[e.to]
              const d = edgePath(f.pos, f.kind, to.pos, to.kind)
              return (
                <g key={`${step}-${epoch}-${e.from}-${e.to}`} className="scn-fade">
                  {e.tone === "ok" && <path d={d} className="scn-edge base" />}
                  {e.tone === "watch" && <path d={d} className="scn-edge watch" />}
                </g>
              )
            })}
          </svg>
          {edges.map((e) => {
            const f = byId[e.from]
            const to = byId[e.to]
            const d = edgePath(f.pos, f.kind, to.pos, to.kind)
            const key = `ride-${step}-${epoch}-${e.from}-${e.to}`
            return e.tone === "red" ? <Ride key={key} d={d} gap={14} speed={14} cls="dash" /> : e.tone === "ok" ? <Ride key={key} d={d} gap={26} speed={26 / 1.2} cls="dot" /> : null
          })}
          {nodes.map((n) => <IsoNode key={n.id} n={n} />)}
          {note && <div key={`${step}-${epoch}-${note.text}`} className={`scn-note ${note.tone}`} style={{ left: note.at.x, top: note.at.y }}>{note.text}</div>}
        </div>
      </div>
      {intro && (
        <aside className="scn-side">
          <p className="scn-side-h red">痛點</p>
          <ul className="scn-pains">{st.pains.map((p, i) => <li key={p} className={ts > i ? "on" : ""}>{p}</li>)}</ul>
          <p className="scn-side-h">用 K8s Sentinel 這樣做</p>
          <ol className="scn-road">
            {ROAD.map((r, i) => {
              const on = tt >= st.subs.length + i + 1
              return (
                <li key={r.title} className={on ? "on" : ""}>
                  <span className="n">{i + 2}</span>
                  <span><b>{r.title}</b><small>{r.how}</small></span>
                </li>
              )
            })}
          </ol>
        </aside>
      )}
      </div>
    </div>
  )
})
