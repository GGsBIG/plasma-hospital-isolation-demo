import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { SceneState } from "../types"
import { DOC_FILES, NODE_BY_ID } from "../data"
import { SCENES } from "../scenes"
import { ShieldCheck } from "lucide-react"
import { FILE_ICONS, FILE_ICON_VIEWBOX } from "../fileIcons"
import { dotScale, iconScale, nodeExtent, place, sceneBox, setSpreadProvider, stageSize, useLayoutMode, zoneRect, type Box } from "../layout"
import { dominantStates, frameAt, loadsAt, segmentAt, segmentIndex, stageKey, statesAt, structure, type EdgeSlot } from "../timeline"
import { plasmaMix, plasmaOn } from "../plasma"
import { phaseOf } from "../phase"
import { scrollStore, useScrollEffect, useScrollSelector } from "../scroll"
import { Node, type Badge } from "./Node"
import { Edge } from "./Edge"
import { drawDots, dotLen, lutOf, type DotEdge, type Lut } from "./dots"
import { BrainNet, brainVisibility } from "./BrainNet"
import { entryAt, entryKey, onReplay, useEntryEpoch } from "../entry"
import { useUploadDone } from "../upload"
import { UploadDialog } from "./UploadDialog"

// 進場時節點依資料流順序(左 → 右,同一欄由上而下)一個接一個升起
const ENTRY_STEP = 70
const ENTRY_NODE = 420
const ENTRY_RISE = 24

const HOT = 80
// 任何畫面狀態裡會疊到 Plasma 上合體的節點
const mergedIds = new Set(SCENES.flatMap((s) => [...(s.merged ?? []), ...(s.plasma?.merged ?? [])]))
const SAFE = 40 // 桌機舞台四周的安全邊距(螢幕 px)
const REVEAL_MS = 900 // 連線逐步畫出的時間
const DOT_PAD = (compact: boolean) => (compact ? 700 : 80) // 光點 canvas 超出舞台的邊(手機版連線會延伸到舞台外)
// 文件上傳:第一份開始飛的時間、每份間隔(秒),各份的起點(相對大腦中心,舞台 px)
const DOC_DELAY = 1.0 // 按下 Upload 後,文件一起浮現再一起飛進去
const DOC_FLY = 1.5 // 與 index.css 的 doc-fly 時長一致
// 文件飛進 Plasma 之後,知識庫才在 Plasma 上長出來;知識庫長好,大腦才開始長
const KB_AT = DOC_DELAY + DOC_FLY
const KB_GROW = 1.0 // 與 index.css 的 kb-grow 時長一致
// 文件在 Plasma 上方排成一直列,由上到下(相對大腦光暈中心的位移,舞台 px)
const DOC_COL = (top: number, step: number): [number, number][] => [0, 1, 2, 3, 4].map((k) => [0, top + k * step])
const DOC_FROM = DOC_COL(-450, 62)
// 手機版:卡片字大,列距跟著放大
const DOC_FROM_COMPACT = DOC_COL(-566, 70)
const BRAIN_W = 1000 // 大腦網路寬度(舞台 px,壓扁成 70% 高):包住疊在 Plasma 上的知識庫

function loadBadge(v: number): Badge {
  // 數字(load)每格由 Stage 直接改 DOM,這裡只決定文字與色調
  if (v >= HOT) return { tone: "danger", text: "過載", load: v }
  if (v >= 60) return { tone: "warn", text: "負載", load: v }
  return { tone: "ok", text: "負載", load: v }
}

// 依畫面狀態的連線推出每個節點的狀態徽章;負載用過場中漸變的數值。
// 畫面保持精簡:預設不加統計列,只有情境自訂徽章(badges)時才帶一行說明
function describe(scene: SceneState, loads: Record<string, number>, id: string): { badge?: Badge; stat?: string; hot: boolean } {
  const node = NODE_BY_ID[id]
  const custom = scene.badges?.[id]
  if (custom) return { badge: { tone: custom.tone, text: custom.text }, stat: custom.stat, hot: false }
  const touching = scene.edges.filter((e) => e.from === id || e.to === id)
  const load = loads[id]
  switch (node.kind) {
    case "db":
      // 這個狀態沒有負載數字就不顯示徽章(負載只在講負載的頁面出現)
      if (load === undefined || scene.loads?.[id] === undefined) return { hot: false }
      return { badge: loadBadge(load), hot: load >= HOT }
    case "downstream": {
      const src = touching.find((e) => e.to === id)?.from
      const slow = src !== undefined && (loads[src] ?? 0) >= HOT
      return { badge: slow ? { tone: "warn", text: "回應變慢" } : { tone: "ok", text: "正常運作" }, hot: false }
    }
    case "app": {
      const direct = touching.filter((e) => e.state === "overload").length
      if (direct) return { badge: { tone: "danger", text: "直接存取資料庫" }, hot: false }
      if (touching.some((e) => NODE_BY_ID[e.from].kind === "serving"))
        return { badge: { tone: "ok", text: "經由 PostgreSQL" }, hot: false }
      if (touching.length) return { badge: { tone: "ok", text: "經由 Plasma" }, hot: false }
      return { badge: { tone: "idle", text: "待接入" }, hot: false }
    }
    case "plasma":
      return { badge: { tone: "ok", text: "已隔離正式資料庫" }, hot: false }
    case "serving":
      return { badge: { tone: "ok", text: "資料已同步" }, hot: false }
    case "file":
    case "person":
      return { hot: false }
    case "kb":
      return { badge: { tone: "ok", text: "已匯入資料字典" }, hot: false }
  }
}

// 舞台以固定座標系(stageSize)繪製,縮放後放進容器(直接改 transform,不重繪)。
// 桌機:整張舞台置中。手機:鏡頭對準目前情境實際的內容外框(過場中在兩個情境的外框間內插),
// 每個情境都填滿寬度,左右留白和下方說明文字一致
type Pt = { x: number; l: number; r: number }
const MAX_STRETCH = 1.8
const MEASURE_SEL = ".node-platform svg, .brand-in, [data-node-text] span, [data-node-text] img"
const FONT = 'ui-sans-serif, system-ui, -apple-system, "SF Pro Text", "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif'
let measureCtx: CanvasRenderingContext2D | null = null
// 徽章膠囊比文字寬多少(內距 + 圓點 + 間距 + 框線):量到第一個徽章後更新
let padSeen = 48

function useFit(w: number, h: number, compact: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const size = useRef({ width: 0, height: 0 })
  const lastBox = useRef<Box | null>(null)
  const scale = useRef(1) // 目前的縮放倍率(canvas 依此決定解析度)
  // 手機:圖被高度限制、左右還有空時,只把橫向間距拉開(stretch > 1)讓左右貼齊下方文字;
  // 節點本身用 --ux 反向縮回去,圖示與文字不變形
  const stretch = useRef(1)
  const scaleX = useRef(1)

  const apply = (box: Box | null) => {
    const el = innerRef.current
    const { width, height } = size.current
    if (!el || !width) return
    const b = compact && box ? box : { x0: 0, y0: 0, x1: w, y1: h }
    // 桌機:四周留同樣寬的安全邊距,最外圈的節點與名稱不會貼到標題列或底部切換列
    const m = compact ? 0 : SAFE
    const s = Math.min((width - 2 * m) / (b.x1 - b.x0), (height - 2 * m) / (b.y1 - b.y0))
    const sx = s * (compact ? stretch.current : 1)
    const tx = (width - (b.x1 - b.x0) * sx) / 2 - b.x0 * sx
    const ty = (height - (b.y1 - b.y0) * s) / 2 - b.y0 * s
    el.style.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${s})`
    el.style.setProperty("--ux", `${s / sx}`)
    scale.current = s
    scaleX.current = sx
  }

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = (width: number, height: number) => {
      size.current = { width, height }
      apply(lastBox.current)
    }
    fit(el.clientWidth, el.clientHeight)
    const ro = new ResizeObserver(([entry]) => fit(entry.contentRect.width, entry.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [w, h, compact]) // eslint-disable-line react-hooks/exhaustive-deps

  const setBox = (box: Box | null, f = 1) => {
    lastBox.current = box
    stretch.current = f
    apply(box)
  }
  // 手機版:給定各點(舞台 x,以及左右的固定延伸;延伸跟著縱向倍率縮放、不跟著橫向拉開),
  // 算出讓內容左右剛好貼齊容器的外框與橫向拉開倍率。純算術,不量 DOM,所以一次就到定位
  const solve = (pts: Pt[], y0: number, y1: number, allowStretch: boolean): { box: Box; f: number } => {
    const { width, height } = size.current
    const x0 = Math.min(...pts.map((p) => p.x - p.l))
    const x1 = Math.max(...pts.map((p) => p.x + p.r))
    if (!width || !height || !pts.length || !allowStretch) return { box: { x0, y0, x1, y1 }, f: 1 }
    const sH = height / (y1 - y0)
    const spanAt = (f: number) => {
      const sx = f * sH
      let L = Infinity
      let R = -Infinity
      for (const p of pts) {
        L = Math.min(L, p.x * sx - p.l * sH)
        R = Math.max(R, p.x * sx + p.r * sH)
      }
      return { L, R }
    }
    // 寬度先頂到:不必拉開,外框就是內容的左右邊界
    const one = spanAt(1)
    if (one.R - one.L >= width - 0.5) return { box: { x0, y0, x1, y1 }, f: 1 }
    // 高度先頂到、左右還有空:橫向拉開到剛好貼齊(最多 MAX_STRETCH 倍),二分搜尋
    const far = spanAt(MAX_STRETCH)
    if (far.R - far.L < width) {
      const sx = MAX_STRETCH * sH
      return { box: { x0: far.L / sx, y0, x1: far.R / sx, y1 }, f: MAX_STRETCH }
    }
    let lo = 1
    let hi = MAX_STRETCH
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      const m = spanAt(mid)
      if (m.R - m.L < width) lo = mid
      else hi = mid
    }
    const f = (lo + hi) / 2
    const sx = f * sH
    const L = spanAt(f).L
    return { box: { x0: L / sx, y0, x1: L / sx + width / sx, y1 }, f }
  }
  return { ref, innerRef, setBox, scale, solve, sizeRef: size }
}

// 每個畫面狀態的內容外框,依版面快取
const boxCache = new Map<string, Box>()
function boxOf(key: string, s: SceneState, mode: string): Box {
  const k = `${key}|${mode}`
  let b = boxCache.get(k)
  if (!b) {
    b = sceneBox(s.nodes, (id) => NODE_BY_ID[id].kind, s.zone?.ids)
    // 節點下方的警報卡也要放進鏡頭(右緣對齊節點)
    for (const [id, c] of Object.entries(s.callouts ?? {})) {
      if (c.side !== "bottom" || !s.nodes[id]) continue
      const p = place(id, s.nodes[id])
      b.y1 = Math.max(b.y1, p.y + 420)
      b.x0 = Math.min(b.x0, p.x - 520)
    }
    boxCache.set(k, b)
  }
  return b
}

export function Stage() {
  const mode = useLayoutMode()
  const compact = mode !== "desktop"
  const { w, h } = stageSize()
  const { ref, innerRef, setBox, scale, solve, sizeRef } = useFit(w, h, compact)
  // 只在離散狀態改變時重繪:換段、徽章文字改用另一端情境、負載跨過門檻
  useScrollSelector(stageKey)
  const p = scrollStore.get()
  const epoch = useEntryEpoch()
  const { nodeIds, edges } = structure()
  // 目前的幕與輪次:攻擊封包在進入那一幕時重新掛上,動畫才會剛好在那一幕從頭播
  const pa = phaseOf(segmentIndex(p))
  const pb = phaseOf(segmentIndex(p) + 1)
  const cycle = `${pa.cycle}.${pa.idx}/${pb.cycle}.${pb.idx}`
  // 依權重排序的畫面狀態;第一個是「目前看起來最像」的那個
  const ranked = dominantStates(p).map((x) => x.s)
  const near = ranked[0]
  // 大腦頁的文件上傳動畫(大腦光暈出現時,依目前最像的那個有大腦的狀態決定要不要播)
  const upload = ranked.find((x) => x.brain)?.upload ?? false
  // 有上傳動畫的頁:使用者按下上傳視窗的 Upload 之後,文件才開始飛、大腦才開始長
  const uploadDone = useUploadDone()
  const loads = loadsAt(p)

  // 滑鼠停在哪個節點:它與直接相連的節點、連線保持清楚,其餘淡化
  const [hover, setHover] = useState<string | null>(null)
  const linked = new Set<string>()
  if (hover) {
    linked.add(hover)
    for (const e of near.edges) {
      if (e.from === hover) linked.add(e.to)
      if (e.to === hover) linked.add(e.from)
    }
  }

  // 每格的位置、透明度、連線形狀、負載數字直接寫進 DOM。
  // DOM 參照在掛上時就存好(每格不再 querySelector);每個值記住上次寫入的內容,沒變就不寫
  // 知識庫與 Plasma 合體時的「資料大腦」光暈:跟著兩者的位置走,濃淡依各狀態的 brain 權重
  const auraRef = useRef<HTMLDivElement>(null)
  // 防護框:圍住指定節點,跟著節點位置走,濃淡依各狀態有沒有這個框
  const zoneRef = useRef<HTMLDivElement>(null)
  const nodeEls = useRef(new Map<string, { el: HTMLDivElement; num: Element | null; last: string; load: string }>())
  // reveal:出現時逐步畫出的連線(mask 為遮罩裡的路徑,shown 記錄目前是否已畫出)
  // 每條連線也是一個 DotEdge:canvas 光點層每格讀它的透明度、形狀查表、逐步畫出進度
  type EdgeRec = DotEdge & { g: SVGGElement; path: SVGPathElement | null; mask: SVGPathElement | null; to: string; last: string; d: string; lut: Lut | null }
  const edgeEls = useRef(new Map<string, EdgeRec>())
  const hoverRef = useRef<string | null>(null)
  hoverRef.current = hover
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // 已畫出的連線:另外記,重繪時(ref 重新掛上)不會被清掉而重畫一次;換成新的 DOM 元素才重新畫
  const revealed = useRef(new Set<string>())
  const revealEl = useRef(new Map<string, SVGGElement>())
  const revealTimers = useRef(new Map<string, number>())
  const merging = useRef(new Set<string>())
  const shownNodes = useRef(new Set<string>())
  const shownEdges = useRef(new Set<string>())
  const hideTimers = useRef(new Map<string, number>())
  const lastKey = useRef("")
  // 重繪後可能有新節點/連線還沒套樣式,下一次一定要完整套一次
  lastKey.current = ""
  // 重播:忘掉「已畫出」的連線與「已合體」的節點,讓它們這次再從頭畫一次
  useEffect(() => onReplay(() => {
    revealed.current.clear()
    merging.current.clear()
    lastKey.current = ""
  }), [])
  // 有上傳關卡的頁:按 Upload 之前看不到知識庫;按下後等文件飛進 Plasma,知識庫才在上面長出來
  const gated = useRef(false)
  useEffect(() => {
    gated.current = upload
    const plat = nodeEls.current.get("kb")?.el.querySelector<HTMLElement>(".node-platform")
    if (!plat) return
    plat.classList.remove("kb-grow")
    plat.style.animationDelay = ""
    plat.style.clipPath = ""
    if (!upload) {
      plat.style.visibility = ""
      return
    }
    plat.classList.remove("kb-drop")
    plat.style.visibility = uploadDone ? "" : "hidden"
    if (!uploadDone) return
    // 量出知識庫立方體的底邊(等角 V 字),V 以下裁掉;換算回舞台座標(舞台有縮放)
    const svg = plat.querySelector("svg")
    const cube = svg?.querySelector("g")
    if (svg && cube) {
      const o = plat.getBoundingClientRect()
      const k = svg.getBoundingClientRect().width / svg.width.baseVal.value || 1
      const r = cube.getBoundingClientRect()
      const bottom = (r.bottom - o.top) / k
      const hw = r.width / 2 / k
      const cx = (r.left + r.width / 2 - o.left) / k
      const far = 5000
      plat.style.clipPath = `polygon(${-far}px ${-far}px, ${far}px ${-far}px, ${far}px ${bottom - hw / 2}px, ${cx + hw}px ${bottom - hw / 2}px, ${cx}px ${bottom}px, ${cx - hw}px ${bottom - hw / 2}px, ${-far}px ${bottom - hw / 2}px)`
      const done = (e: AnimationEvent) => {
        if (e.animationName !== "kb-grow") return
        plat.style.clipPath = ""
        plat.removeEventListener("animationend", done)
      }
      plat.addEventListener("animationend", done)
    }
    plat.style.animationDelay = `${KB_AT}s`
    void plat.offsetWidth
    plat.classList.add("kb-grow")
  }, [upload, uploadDone, epoch])
  // 手機版鏡頭:各畫面狀態的外框依權重內插
  // 手機版鏡頭:外框與橫向拉開倍率用算術直接算出來(見 useFit.solve),換頁、切換導入前後都一次到定位。
  // 算式需要每個節點「圖示 + 名稱 + 徽章」實際的左右延伸:從 DOM 量一次記下來(與位置無關,
  // 過場中量也準);還沒量到的節點先用估計值,量到後重算(那時節點幾乎還是透明的,看不出調整)
  // l、r:平台與品牌 logo 的左右延伸;nameW:名稱(文字區不含徽章)的寬度;pad:徽章膠囊比文字寬多少。
  // 徽章文字會隨分幕變,所以版面用「這個狀態可能出現的最寬徽章」推算,不跟著分幕跳動
  const extents = useRef(new Map<string, { l: number; r: number; nameW: number; pad: number | null }>())
  const extVer = useRef(0)
  // 徽章文字寬度:用 canvas 依徽章字級量,不必真的渲染(舞台單位)
  const textW = (t: string) => {
    if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d")
    if (!measureCtx) return 0
    measureCtx.font = `${compact ? 36 : 22}px ${FONT}`
    return measureCtx.measureText(t).width
  }
  const fitCache = useRef(new Map<string, { ver: number; box: Box; f: number; spread: { f: number; c: number } }>())
  const measureRaf = useRef(0)
  // 每個節點只量一次(圖示、名稱不會變;徽章文字會變,所以徽章另外用文字寬度推算,版面才不會跟著分幕跳動)
  const measureExtents = (ids: string[]) => {
    let changed = false
    const k = scale.current || 1
    for (const id of ids) {
      const rec = nodeEls.current.get(id)
      if (!rec || rec.el.style.display === "none" || extents.current.has(id)) continue
      const cx = rec.el.getBoundingClientRect().left
      const badge = rec.el.querySelector<HTMLElement>("[data-node-text] .inline-flex")
      let l = Infinity
      let r = -Infinity
      let nl = Infinity
      let nr = -Infinity
      rec.el.querySelectorAll<HTMLElement | SVGElement>(MEASURE_SEL).forEach((n) => {
        if (n.closest(".callout-in") || (badge && badge.contains(n))) return
        const q = n.getBoundingClientRect()
        if (!q.width || !q.height) return
        if (n.closest("[data-node-text]")) {
          nl = Math.min(nl, q.left)
          nr = Math.max(nr, q.right)
        } else {
          l = Math.min(l, q.left)
          r = Math.max(r, q.right)
        }
      })
      if (!isFinite(l) && !isFinite(nl)) continue
      const bw = badge?.getBoundingClientRect().width ?? 0
      const pad = badge && bw ? bw / k - textW(badge.textContent ?? "") : null
      if (pad !== null) padSeen = pad
      extents.current.set(id, {
        l: isFinite(l) ? (cx - l) / k : 0,
        r: isFinite(r) ? (r - cx) / k : 0,
        nameW: isFinite(nl) ? (nr - nl) / k : 0,
        pad,
      })
      changed = true
    }
    if (changed) {
      extVer.current++
      fitCache.current.clear()
      scrollStore.notify()
    }
  }
  const fitOf = (key: string, s: SceneState) => {
    const id = `${key}|${mode}|${Math.round(sizeRef.current.width)}x${Math.round(sizeRef.current.height)}`
    const c = fitCache.current.get(id)
    if (c && c.ver === extVer.current) return c
    const est = boxOf(key, s, mode)
    // 這個狀態(含各分幕)裡每個節點可能出現的徽章文字,取最寬的那個:版面在分幕之間不會變,徽章也不會被切到
    const patches = typeof s.phases === "function" ? s.phaseAll ?? [] : (s.phases ?? []).map((ph) => ph.patch)
    const badgeTexts = (nid: string) => {
      const out: string[] = []
      const add = (b?: Badge) => { if (b) out.push(b.load !== undefined ? `${b.text} ${b.load}%` : b.text) }
      add(describe(s, s.loads ?? {}, nid).badge)
      add(s.badges?.[nid])
      for (const ph of patches) {
        add(ph.badges?.[nid])
        if (ph.loads?.[nid] !== undefined) add(loadBadge(ph.loads[nid]))
      }
      return out
    }
    const pts: Pt[] = Object.keys(s.nodes).map((nid) => {
      const p = place(nid, s.nodes[nid])
      const e = extents.current.get(nid)
      if (!e) {
        const f = nodeExtent(nid, NODE_BY_ID[nid].kind)
        return { x: p.x, l: f.l, r: f.r }
      }
      // 最寬的徽章膠囊;文字區置中在節點下方:資料庫(品牌 logo 在平台上)名稱與徽章同一行,其餘節點上下兩行
      const pad = e.pad ?? padSeen
      const badgeW = Math.max(0, ...badgeTexts(nid).map((t) => textW(t) + pad))
      const row = compact && !!NODE_BY_ID[nid].brand
      const half = (row ? e.nameW + (badgeW ? 12 + badgeW : 0) : Math.max(e.nameW, badgeW)) / 2
      return { x: p.x, l: Math.max(e.l, half), r: Math.max(e.r, half) }
    })
    // 防護框的左右緣跟著舞台一起拉開,當成兩個沒有延伸的點
    if (s.zone) {
      // 防護框跟著節點位置一起拉開:用框內最左、最右節點的位置加上框的內距
      const zp = s.zone.ids.map((i) => place(i, s.nodes[i]))
      const z = zoneRect(zp)
      const zx0 = Math.min(...zp.map((q) => q.x))
      const zx1 = Math.max(...zp.map((q) => q.x))
      pts.push({ x: zx0, l: zx0 - z.x0, r: 0 }, { x: zx1, l: 0, r: z.x1 - zx1 })
    }
    // 下方有對照卡的頁面:卡片往左伸出去,左緣保留估計值,也不拉開
    const hasCard = Object.values(s.callouts ?? {}).some((c) => c.side === "bottom")
    // 高度先頂到、左右還有空時:把節點的「位置」橫向拉開到左右剛好貼齊(節點、文字、大腦本身不變形)。
    // 下方有對照卡的頁面不拉開(卡片往左伸出去)
    const { width, height } = sizeRef.current
    const xs = pts.map((q) => q.x)
    const mid0 = (Math.min(...xs) + Math.max(...xs)) / 2
    const span = (f: number) => {
      let L = Infinity
      let R = -Infinity
      for (const q of pts) {
        const x = mid0 + (q.x - mid0) * f
        L = Math.min(L, x - q.l)
        R = Math.max(R, x + q.r)
      }
      return { L, R }
    }
    let f = 1
    let box: Box
    const one = span(1)
    const target = width && height ? (width / height) * (est.y1 - est.y0) : 0
    if (hasCard || !target || one.R - one.L >= target) {
      box = { x0: one.L, y0: est.y0, x1: one.R, y1: est.y1 }
      if (hasCard) box.x0 = Math.min(box.x0, est.x0)
    } else {
      let lo = 1
      let hi = 3
      if (span(hi).R - span(hi).L < target) lo = hi
      else for (let i = 0; i < 28; i++) {
        const mid = (lo + hi) / 2
        const m = span(mid)
        if (m.R - m.L < target) lo = mid
        else hi = mid
      }
      f = lo
      const m = span(f)
      box = { x0: m.L, y0: est.y0, x1: m.L + target, y1: est.y1 }
    }
    const out = { ver: extVer.current, box, f: 1, spread: { f, c: mid0 } }
    fitCache.current.set(id, out)
    return out
  }
  // 節點位置的橫向拉開由 timeline 計算畫面時向這裡要(第一格就用對的值,不會先錯再修正)
  setSpreadProvider(compact ? (key, st) => fitOf(key, st).spread : null)
  useScrollEffect((p) => {
    if (!compact) return
    const box = { x0: 0, y0: 0, x1: 0, y1: 0 }
    let f = 0
    const need: string[] = []
    for (const { s, key, w } of statesAt(p)) {
      if (!w) continue
      const r = fitOf(key, s)
      box.x0 += r.box.x0 * w
      box.y0 += r.box.y0 * w
      box.x1 += r.box.x1 * w
      box.y1 += r.box.y1 * w
      f += r.f * w
      for (const nid of Object.keys(s.nodes)) if (!extents.current.has(nid)) need.push(nid)
    }
    setBox(box, f || 1)
    // 還沒量過的節點(剛出現在畫面上)下一格量一次
    if (need.length) {
      cancelAnimationFrame(measureRaf.current)
      measureRaf.current = requestAnimationFrame(() => measureExtents([...new Set(need)]))
    }
  }, [compact, mode])

  // 節點與連線的 ref 回呼:每個 id 固定一個函式(Node、Edge 有 memo,回呼每次都換新會讓它們每次都重繪)
  const refFns = useRef(new Map<string, (el: never) => void>())
  const nodeRef = (id: string) => {
    let f = refFns.current.get(`n|${id}`)
    if (!f) {
      f = (el: HTMLDivElement | null) => {
        if (el) nodeEls.current.set(id, { el, num: null, last: "", load: "" })
        else nodeEls.current.delete(id)
      }
      refFns.current.set(`n|${id}`, f)
    }
    return f as (el: HTMLDivElement | null) => void
  }
  const edgeRef = (e: EdgeSlot) => {
    const k = `e|${mode}|${e.key}`
    let f = refFns.current.get(k)
    if (!f) {
      f = (el: SVGGElement | null) => {
        if (!el) {
          edgeEls.current.delete(e.key)
          return
        }
        edgeEls.current.set(e.key, {
          g: el, path: el.querySelector(":scope > g > path"), mask: el.querySelector("[data-reveal]"), last: "", d: "",
          state: e.state, from: e.from, to: e.to, len: dotLen(e.length), lut: null, opacity: 0, faded: false,
          reveal: e.reveal, revealStart: -Infinity,
        })
        if (revealEl.current.get(e.key) !== el) {
          revealEl.current.set(e.key, el)
          revealed.current.delete(e.key)
        }
      }
      refFns.current.set(k, f)
    }
    return f as (el: SVGGElement | null) => void
  }

  useScrollEffect((p) => {
    // 畫面沒有任何變化(同一捲動位置、同一切換進度、同一幕)就整格略過
    const i = segmentIndex(p)
    const key = `${i}|${segmentAt(p).t.toFixed(4)}|${plasmaMix(i).toFixed(4)}|${plasmaMix(i + 1).toFixed(4)}|${phaseOf(i).idx}|${phaseOf(i + 1).idx}|${entryKey()}`
    if (key === lastKey.current) return
    lastKey.current = key
    const f = frameAt(p)
    // 上一格看得到、這一格不在任何畫面狀態裡的節點:隱藏(全部節點一次建好,不在畫面上的一律 display:none)
    const seen = new Set(f.nodes.map((n) => n.id))
    for (const id of shownNodes.current) {
      if (seen.has(id)) continue
      const rec = nodeEls.current.get(id)
      if (rec) {
        rec.el.style.display = "none"
        rec.last = ""
      }
      merging.current.delete(id)
    }
    shownNodes.current = seen
    // 進場程度:目前這一頁的節點依資料流順序錯開出現(不是進場中就全部是 1)
    const here = Math.round(Math.min(SCENES.length - 1, Math.max(0, p)))
    const order = [...f.nodes].sort((a, b) => a.pos.x - b.pos.x || a.pos.y - b.pos.y)
    const enter = new Map(order.map((n, k) => [n.id, entryAt(here, 80 + k * ENTRY_STEP, ENTRY_NODE)]))
    for (const raw of f.nodes) {
      const k = enter.get(raw.id) ?? 1
      const n = k === 1 ? raw : { ...raw, opacity: raw.opacity * k, pos: { x: raw.pos.x, y: raw.pos.y + ENTRY_RISE * (1 - k) } }
      const rec = nodeEls.current.get(n.id)
      if (!rec) continue
      // 用 transform 移動(不觸發版面重算),透明度在自己的圖層上變化
      const sig = `${n.pos.x.toFixed(1)},${n.pos.y.toFixed(1)},${n.opacity.toFixed(3)}`
      if (sig !== rec.last) {
        rec.last = sig
        rec.el.style.transform = `translate3d(${n.pos.x}px, ${n.pos.y}px, 0)`
        rec.el.style.opacity = `${n.opacity}`
        // 完全看不見的節點不顯示:裡面的動畫(冒煙、紅點、轉圈)也就停了,不佔資源
        rec.el.style.display = n.opacity < 0.01 ? "none" : ""
        // 過場中幾乎看不見的節點不接受滑鼠,免得游標停在空白處也觸發
        rec.el.style.pointerEvents = n.opacity < 0.15 ? "none" : ""
      }
      // 疊到 Plasma 上合體的節點(知識庫):每次出現時重播「落下合體」動畫
      if (mergedIds.has(n.id) && !gated.current) {
        const vis = n.opacity > 0.5
        if (vis && !merging.current.has(n.id)) {
          const plat = rec.el.querySelector(".node-platform")
          plat?.classList.remove("kb-drop")
          plat?.getBoundingClientRect()
          plat?.classList.add("kb-drop")
          merging.current.add(n.id)
        } else if (!vis) merging.current.delete(n.id)
      }
      const load = f.loads[n.id]
      // 負載數字的元素在徽章出現時才有,找不到就重找一次
      if (load !== undefined && !rec.num?.isConnected) rec.num = rec.el.querySelector("[data-load]")
      if (load !== undefined && rec.num && rec.load !== `${load}`) {
        rec.load = `${load}`
        rec.num.textContent = `${load}%`
      }
    }
    const aura = auraRef.current
    if (aura) {
      const brain = statesAt(p).reduce((n, x) => n + (x.s.brain ? x.w : 0), 0)
      const plasma = f.nodes.find((n) => n.id === "plasma")
      const kb = f.nodes.find((n) => n.id === "kb")
      if (brain > 0.001 && plasma) {
        // 光暈中心在 Plasma 與疊在上面的知識庫之間;--kb-dy 是知識庫相對中心的位置(上傳的文件飛到這裡)
        const cy = kb ? (plasma.pos.y + kb.pos.y) / 2 : plasma.pos.y
        aura.style.transform = `translate3d(${plasma.pos.x}px, ${cy}px, 0)`
        aura.style.setProperty("--kb-dy", `${kb ? kb.pos.y - cy : 0}px`)
        aura.style.opacity = `${brain * entryAt(Math.round(Math.min(SCENES.length - 1, Math.max(0, p))), 500, 600)}`
        aura.style.display = ""
        brainVisibility.shown = true
      } else {
        aura.style.display = "none"
        brainVisibility.shown = false
      }
    }
    const zoneEl = zoneRef.current
    if (zoneEl) {
      const states = statesAt(p)
      const w = states.reduce((n, x) => n + (x.s.zone ? x.w : 0), 0)
      const zone = states.find((x) => x.s.zone)?.s.zone
      if (zone && w > 0.001) {
        const pts = zone.ids.map((id) => f.nodes.find((n) => n.id === id)?.pos).filter((q) => q !== undefined)
        const r = zoneRect(pts)
        zoneEl.style.transform = `translate3d(${r.x0}px, ${r.y0}px, 0)`
        zoneEl.style.width = `${r.x1 - r.x0}px`
        zoneEl.style.height = `${r.y1 - r.y0}px`
        // 進場中:防護框等框內的資料庫大致出現後才浮現
        zoneEl.style.opacity = `${w * entryAt(Math.round(Math.min(SCENES.length - 1, Math.max(0, p))), 380, 520)}`
        zoneEl.style.display = ""
      } else {
        zoneEl.style.display = "none"
      }
    }
    // 上一格看得到、這一格不在畫面狀態裡的連線:當作透明度 0 處理(逐步畫出的連線照樣淡出)
    const now = new Set(f.edges.map((e) => e.key))
    const gone = [...shownEdges.current].filter((k) => !now.has(k)).map((key) => ({ key, opacity: 0, d: edgeEls.current.get(key)?.d ?? "" }))
    shownEdges.current = now
    for (const raw of [...f.edges, ...gone]) {
      const rec = edgeEls.current.get(raw.key)
      if (!rec) continue
      // 進場中:連線等兩端節點都出現了才出現
      const ek = Math.min(enter.get(rec.from) ?? 1, enter.get(rec.to) ?? 1)
      const e = ek === 1 ? raw : { ...raw, opacity: raw.opacity * ek }
      rec.opacity = e.opacity
      const op = e.opacity.toFixed(3)
      if (op !== rec.last) {
        rec.last = op
        // 完全看不見的連線不顯示,光點動畫也不必繪製(逐步畫出的連線等 CSS 淡出完再隱藏)
        if (rec.reveal === undefined) rec.g.style.display = e.opacity < 0.001 ? "none" : ""
        else {
          const g = rec.g
          window.clearTimeout(hideTimers.current.get(e.key))
          if (e.opacity < 0.001) hideTimers.current.set(e.key, window.setTimeout(() => (g.style.display = "none"), 480))
          else g.style.display = ""
        }
        rec.g.style.opacity = op
      }
      // 兩端都沒移動的連線形狀不變,不必重設
      if (e.d !== rec.d) {
        rec.d = e.d
        rec.path?.setAttribute("d", e.d)
        rec.mask?.setAttribute("d", e.d)
        rec.lut = lutOf(e.d)
        // 遮罩與柔邊濾鏡的範圍縮到這條線的外框(留邊給線寬與模糊):原本是整個 12000×12000 的區域,
        // 每條線畫出來時都要對那麼大的範圍做模糊,十幾條線一起畫就會卡
        if (rec.mask && rec.lut) {
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
          for (let i = 0; i < rec.lut.xs.length; i++) {
            x0 = Math.min(x0, rec.lut.xs[i]); x1 = Math.max(x1, rec.lut.xs[i])
            y0 = Math.min(y0, rec.lut.ys[i]); y1 = Math.max(y1, rec.lut.ys[i])
          }
          const m = compact ? 150 : 100
          const box = { x: `${x0 - m}`, y: `${y0 - m}`, width: `${x1 - x0 + 2 * m}`, height: `${y1 - y0 + 2 * m}` }
          const maskEl = rec.mask.parentElement
          const filterEl = maskEl?.querySelector("filter")
          for (const el of [maskEl, filterEl]) if (el) for (const [k, v] of Object.entries(box)) el.setAttribute(k, v)
        }
      }
      // 剛出現:遮罩先歸零,再沿路徑畫到終點(像文字逐字浮現);消失時由 CSS 淡出,下次出現再重畫
      if (rec.mask && rec.reveal !== undefined) {
        const vis = e.opacity > 0.5
        if (vis && !revealed.current.has(e.key)) {
          const m = rec.mask
          const g = rec.g
          // 畫的時候才套遮罩,畫完拿掉:模糊遮罩每格都要重算,常駐會拖慢光點動畫
          g.setAttribute("mask", `url(#edge-${e.key}-mask)`)
          m.style.transition = "none"
          m.style.strokeDashoffset = "1"
          m.getBoundingClientRect()
          m.style.transition = `stroke-dashoffset ${REVEAL_MS}ms cubic-bezier(0.22, 1, 0.36, 1) ${rec.reveal}ms`
          m.style.strokeDashoffset = "0"
          window.clearTimeout(revealTimers.current.get(e.key))
          revealTimers.current.set(e.key, window.setTimeout(() => g.removeAttribute("mask"), REVEAL_MS + rec.reveal + 50))
          rec.revealStart = performance.now()
          revealed.current.add(e.key)
        } else if (!vis && revealed.current.has(e.key)) {
          // 淡出後下次出現要重畫:先把遮罩套回去(歸零),免得出現的瞬間整條閃一下
          window.clearTimeout(revealTimers.current.get(e.key))
          rec.mask.style.transition = "none"
          rec.mask.style.strokeDashoffset = "1"
          revealed.current.delete(e.key)
          const g = rec.g
          revealTimers.current.set(e.key, window.setTimeout(() => g.setAttribute("mask", `url(#edge-${e.key}-mask)`), 460))
        }
      }
    }
  }, [])

  // 光點動畫:每秒 30 格畫在 canvas 上;分頁在背景時 requestAnimationFrame 自動暫停
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const pad = DOT_PAD(compact)
    let raf = 0
    let last = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (now - last < 33) return
      last = now
      // 解析度 = 縮放倍率 × 螢幕密度(以 0.25 為一級,避免每格重設畫布大小)
      // 光點很小,畫布解析度最多 1.5 倍就夠清楚;原本到 2.5 倍,每格要重畫、上傳的像素多出近三倍
      const k = Math.min(1.5, Math.max(0.5, Math.ceil(scale.current * (window.devicePixelRatio || 1) * 4) / 4))
      const cw = Math.round((w + 2 * pad) * k)
      const ch = Math.round((h + 2 * pad) * k)
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw
        canvas.height = ch
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cw, ch)
      ctx.setTransform(k, 0, 0, k, pad * k, pad * k)
      const hv = hoverRef.current
      for (const e of edgeEls.current.values()) e.faded = hv !== null && e.from !== hv && e.to !== hv
      drawDots(ctx, edgeEls.current.values(), now, dotScale(), compact)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [compact, w, h, scale])

  return (
    <div ref={ref} data-stage className="relative h-full w-full overflow-hidden">
      <div ref={innerRef} className="absolute left-0 top-0 origin-top-left" style={{ width: w, height: h }}>
        {/* 連線層 */}
        {/* 連線層:流動光點持續在動,捲動時也不暫停(節點各自是獨立圖層,光點重繪不會連帶重繪節點) */}
        {/* 防護框在最底層(連線、節點之下);標題壓在下緣(上緣常在舞台可視範圍外) */}
        <div
          ref={zoneRef}
          aria-hidden
          className={`zone pointer-events-none absolute left-0 top-0 border-dashed ${compact ? "rounded-[56px] border-[4px]" : "rounded-[32px] border-2"}`}
          style={{ display: "none" }}
        >
          <span className={`absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-1/2 items-center whitespace-nowrap rounded-full bg-background font-medium text-ok ${compact ? "gap-3 px-6 text-[34px]" : "gap-2 px-4 text-[20px]"}`}>
            <ShieldCheck className={compact ? "h-9 w-9" : "h-5 w-5"} />
            {ranked.find((s) => s.zone)?.zone?.label}
          </span>
        </div>
        {/* 連線可能延伸到舞台座標範圍外(手機版最左欄),不裁切 */}
        <svg className="pointer-events-none absolute inset-0 overflow-visible" width={w} height={h}>
          {/* 逐步畫出時遮罩前緣的柔邊 */}
          <defs>
            {/* Plasma 底下的光暈(漸層取代模糊濾鏡) */}
            <radialGradient id="plasma-glow">
              <stop offset="0" style={{ stopColor: "var(--iso-glow)", stopOpacity: "var(--iso-glow-opacity)" }} />
              <stop offset="1" style={{ stopColor: "var(--iso-glow)", stopOpacity: 0 }} />
            </radialGradient>
          </defs>
          {edges.map((e) => (
            <Edge
              // 攻擊封包每一幕重新掛上,動畫才會從頭播
              key={e.state === "attack" ? `${e.key}#${cycle}` : e.key}
              id={`edge-${e.key}`}
              reveal={e.reveal !== undefined}
              gRef={edgeRef(e)}
              state={e.state}
              highlight={hover !== null && (e.from === hover || e.to === hover)}
              faded={hover !== null && e.from !== hover && e.to !== hover}
            />
          ))}
        </svg>
        {/* 光點層:所有連線上流動的光點畫在這張 canvas(四周多留一圈,手機版延伸到舞台外的連線也畫得到) */}
        <canvas
          ref={canvasRef}
          aria-hidden
          className="pointer-events-none absolute"
          style={{ left: -DOT_PAD(compact), top: -DOT_PAD(compact), width: w + 2 * DOT_PAD(compact), height: h + 2 * DOT_PAD(compact) }}
        />

        {/* 資料大腦光暈:在連線之上、節點之下 */}
        <div ref={auraRef} aria-hidden className="pointer-events-none absolute left-0 top-0 h-0 w-0" style={{ display: "none" }}>
          <div
            className="brain-aura absolute rounded-full"
            style={{ width: 620 * iconScale("plasma"), height: 500 * iconScale("plasma"), left: -310 * iconScale("plasma"), top: -250 * iconScale("plasma") }}
          />
          {/* 大腦輪廓:線條逐筆畫出,把知識庫與 Plasma 包在裡面;有上傳動畫時等文件都飛進去才開始畫 */}
          {(!upload || uploadDone) && (
            <BrainNet
              key={`${epoch}-${uploadDone}`}
              width={BRAIN_W * iconScale("plasma")}
              delay={upload ? KB_AT + KB_GROW + 0.1 : 0.2}
              mode={upload ? "full" : "idle"}
            />
          )}
          {/* 上傳到知識庫的文件:從上方各自飛進知識庫後消失 */}
          {/* 在上方由上到下排成一直列浮現(doc-appear),再五份同時飛進去(doc-fly) */}
          {upload && uploadDone && DOC_FILES.map((f, k) => (
            <div key={`${f.name}-${epoch}`} className="doc-appear absolute left-0 top-0" style={{ animationDelay: `${0.2 + k * 0.1}s` }}>
            <div
              className="doc-fly absolute left-0 top-0"
              style={{
                ["--x0" as string]: `${(compact ? DOC_FROM_COMPACT : DOC_FROM)[k][0]}px`,
                ["--y0" as string]: `${(compact ? DOC_FROM_COMPACT : DOC_FROM)[k][1]}px`,
                animationDelay: `${DOC_DELAY}s`,
              }}
            >
              <div className={`flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-none border border-border bg-card font-medium text-foreground ${compact ? "w-[340px] px-5 py-2.5 text-[30px]" : "w-[270px] px-4 py-2.5 text-[26px]"}`}>
                <svg viewBox={FILE_ICON_VIEWBOX} className={`shrink-0 text-[rgb(37_132_235)] dark:text-[rgb(110_175_255)] ${compact ? "h-11 w-11" : "h-9 w-9"}`} fill="currentColor" aria-hidden>
                  {FILE_ICONS[f.icon].map((d, j) => <path key={j} d={d} />)}
                </svg>
                {f.name}
              </div>
            </div>
            </div>
          ))}
        </div>

        {/* 節點層 */}
        {nodeIds.map((id) => {
          // 不在目前狀態的節點,徽章依「有它、權重最高」的那個狀態計算
          const owner = ranked.find((s) => id in s.nodes) ?? near
          const info = describe(owner, loads, id)
          return (
            <Node
              key={id}
              elRef={nodeRef(id)}
              node={NODE_BY_ID[id]}
              compact={compact}
              hot={info.hot}
              badge={info.badge}
              stat={info.stat}
              callout={owner.callouts?.[id]}
              stack={owner.stack?.includes(id) ?? false}
              merged={owner.merged?.includes(id) ?? false}
              down={owner.down?.includes(id) ?? false}
              hovered={hover === id}
              faded={hover !== null && !linked.has(id)}
              onHover={setHover}
            />
          )
        })}
      </div>
      {/* 上傳視窗:文件已就緒,等使用者按 Upload */}
      {/* 只在這頁真的切到導入後時出現(換頁中導入後正在淡出的那一瞬間不跳出來) */}
      {near.upload && !uploadDone && plasmaOn(Math.round(Math.min(SCENES.length - 1, Math.max(0, p)))) && <UploadDialog compact={compact} />}
      {/* 大腦圖示的授權標註(Noun Project 免費圖示須標註作者),只在大腦頁導入後出現 */}
      {near.upload && (
        <span className="pointer-events-none absolute bottom-1 right-2 whitespace-nowrap text-[11px] text-muted-foreground/60 pp:left-auto pp:max-w-[60%] pp:whitespace-normal pp:text-right pp:text-[9px] pp:leading-tight">Brain by Clockwise, File icons by Febri Ardianto, Knowledge by Suwarjo from the Noun Project</span>
      )}
    </div>
  )
}
