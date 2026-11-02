import { useLayoutEffect, useRef, useState } from "react"
import type { SceneState } from "../types"
import { DOC_FILES, NODE_BY_ID } from "../data"
import { SCENES } from "../scenes"
import { FileText, ShieldCheck } from "lucide-react"
import { iconScale, place, sceneBox, stageSize, useLayoutMode, zoneRect, type Box } from "../layout"
import { dominantStates, frameAt, loadsAt, segmentAt, segmentIndex, stageKey, statesAt, structureAt } from "../timeline"
import { plasmaMix } from "../plasma"
import { phaseOf } from "../phase"
import { scrollStore, useScrollEffect, useScrollSelector } from "../scroll"
import { Node, type Badge } from "./Node"
import { Edge } from "./Edge"
import { BrainNet } from "./BrainNet"

const HOT = 80
// 任何畫面狀態裡會疊到 Plasma 上合體的節點
const mergedIds = new Set(SCENES.flatMap((s) => [...(s.merged ?? []), ...(s.plasma?.merged ?? [])]))
const SAFE = 40 // 桌機舞台四周的安全邊距(螢幕 px)
const REVEAL_MS = 900 // 連線逐步畫出的時間
// 文件上傳:第一份開始飛的時間、每份間隔(秒),各份的起點(相對大腦中心,舞台 px)
const DOC_DELAY = 1.3
const DOC_STEP = 0.5
const DOC_FROM: [number, number][] = [[-480, -400], [-165, -430], [165, -430], [480, -400]]
// 手機版:知識庫疊在 Plasma 正上方、舞台上緣較近,文件排在知識庫上方並往左偏(右邊緊貼鏡頭邊緣),才留在鏡頭內
const DOC_FROM_COMPACT: [number, number][] = [[-715, -390], [-345, -420], [25, -420], [390, -390]]
const BRAIN_W = 1000 // 大腦網路寬度(舞台 px,壓扁成 70% 高):包住疊在 Plasma 上的知識庫
const DOC_COLOR = { pdf: "#e5484d", doc: "#3b82f6", xls: "#1f9d55", md: "#71717a" }

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
function useFit(w: number, h: number, compact: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const size = useRef({ width: 0, height: 0 })
  const lastBox = useRef<Box | null>(null)

  const apply = (box: Box | null) => {
    const el = innerRef.current
    const { width, height } = size.current
    if (!el || !width) return
    const b = compact && box ? box : { x0: 0, y0: 0, x1: w, y1: h }
    // 桌機:四周留同樣寬的安全邊距,最外圈的節點與名稱不會貼到標題列或底部切換列
    const m = compact ? 0 : SAFE
    const s = Math.min((width - 2 * m) / (b.x1 - b.x0), (height - 2 * m) / (b.y1 - b.y0))
    const tx = (width - (b.x1 - b.x0) * s) / 2 - b.x0 * s
    const ty = (height - (b.y1 - b.y0) * s) / 2 - b.y0 * s
    el.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`
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

  const setBox = (box: Box | null) => {
    lastBox.current = box
    apply(box)
  }
  return { ref, innerRef, setBox }
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
  const { ref, innerRef, setBox } = useFit(w, h, compact)
  // 只在離散狀態改變時重繪:換段、徽章文字改用另一端情境、負載跨過門檻
  useScrollSelector(stageKey)
  const p = scrollStore.get()
  const { nodeIds, edges } = structureAt(segmentIndex(p))
  // 目前的幕與輪次:攻擊封包在進入那一幕時重新掛上,動畫才會剛好在那一幕從頭播
  const pa = phaseOf(segmentIndex(p))
  const pb = phaseOf(segmentIndex(p) + 1)
  const cycle = `${pa.cycle}.${pa.idx}/${pb.cycle}.${pb.idx}`
  // 依權重排序的畫面狀態;第一個是「目前看起來最像」的那個
  const ranked = dominantStates(p).map((x) => x.s)
  const near = ranked[0]
  // 大腦頁的文件上傳動畫(大腦光暈出現時,依目前最像的那個有大腦的狀態決定要不要播)
  const upload = ranked.find((x) => x.brain)?.upload ?? false
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
  const edgeEls = useRef(new Map<string, { g: SVGGElement; path: SVGPathElement | null; mask: SVGPathElement | null; reveal?: number; last: string; d: string }>())
  // 已畫出的連線:另外記,重繪時(ref 重新掛上)不會被清掉而重畫一次;換成新的 DOM 元素才重新畫
  const revealed = useRef(new Set<string>())
  const revealEl = useRef(new Map<string, SVGGElement>())
  const revealTimers = useRef(new Map<string, number>())
  const merging = useRef(new Set<string>())
  const hideTimers = useRef(new Map<string, number>())
  const lastKey = useRef("")
  // 重繪後可能有新節點/連線還沒套樣式,下一次一定要完整套一次
  lastKey.current = ""
  // 手機版鏡頭:各畫面狀態的外框依權重內插
  useScrollEffect((p) => {
    if (!compact) return
    const box = { x0: 0, y0: 0, x1: 0, y1: 0 }
    for (const { s, key, w } of statesAt(p)) {
      if (!w) continue
      const b = boxOf(key, s, mode)
      box.x0 += b.x0 * w
      box.y0 += b.y0 * w
      box.x1 += b.x1 * w
      box.y1 += b.y1 * w
    }
    setBox(box)
  }, [compact, mode])

  useScrollEffect((p) => {
    // 過場前後的停留區畫面完全不變,整格略過
    const i = segmentIndex(p)
    const key = `${i}|${segmentAt(p).t.toFixed(4)}|${plasmaMix(i).toFixed(4)}|${plasmaMix(i + 1).toFixed(4)}|${phaseOf(i).idx}|${phaseOf(i + 1).idx}`
    if (key === lastKey.current) return
    lastKey.current = key
    const f = frameAt(p)
    for (const n of f.nodes) {
      const rec = nodeEls.current.get(n.id)
      if (!rec) continue
      // 用 transform 移動(不觸發版面重算),透明度在自己的圖層上變化
      const sig = `${n.pos.x.toFixed(1)},${n.pos.y.toFixed(1)},${n.opacity.toFixed(3)}`
      if (sig !== rec.last) {
        rec.last = sig
        rec.el.style.transform = `translate3d(${n.pos.x}px, ${n.pos.y}px, 0)`
        rec.el.style.opacity = `${n.opacity}`
        // 過場中幾乎看不見的節點不接受滑鼠,免得游標停在空白處也觸發
        rec.el.style.pointerEvents = n.opacity < 0.15 ? "none" : ""
      }
      // 疊到 Plasma 上合體的節點(知識庫):每次出現時重播「落下合體」動畫
      if (mergedIds.has(n.id)) {
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
        aura.style.opacity = `${brain}`
        aura.style.display = ""
      } else {
        aura.style.display = "none"
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
        zoneEl.style.opacity = `${w}`
        zoneEl.style.display = ""
      } else {
        zoneEl.style.display = "none"
      }
    }
    for (const e of f.edges) {
      const rec = edgeEls.current.get(e.key)
      if (!rec) continue
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
            {/* 用舞台座標當濾鏡範圍:水平的連線外框高度為 0,用比例會整條被裁掉 */}
            <filter id="reveal-soft" filterUnits="userSpaceOnUse" x={-4000} y={-4000} width={12000} height={12000}>
              <feGaussianBlur stdDeviation={compact ? 22 : 14} />
            </filter>
          </defs>
          {edges.map((e) => (
            <Edge
              // 攻擊封包每一幕重新掛上,動畫才會從頭播
              key={e.state === "attack" ? `${e.key}#${cycle}` : e.key}
              id={`edge-${e.key}`}
              from={e.from}
              reveal={e.reveal !== undefined}
              gRef={(el) => {
                if (el) {
                  edgeEls.current.set(e.key, { g: el, path: el.querySelector(":scope > g > path"), mask: el.querySelector("[data-reveal]"), reveal: e.reveal, last: "", d: "" })
                  if (revealEl.current.get(e.key) !== el) {
                    revealEl.current.set(e.key, el)
                    revealed.current.delete(e.key)
                  }
                }
                else edgeEls.current.delete(e.key)
              }}
              length={e.length}
              state={e.state}
              highlight={hover !== null && (e.from === hover || e.to === hover)}
              faded={hover !== null && e.from !== hover && e.to !== hover}
            />
          ))}
        </svg>

        {/* 資料大腦光暈:在連線之上、節點之下 */}
        <div ref={auraRef} aria-hidden className="pointer-events-none absolute left-0 top-0 h-0 w-0" style={{ display: "none" }}>
          <div
            className="brain-aura absolute rounded-full"
            style={{ width: 620 * iconScale("plasma"), height: 500 * iconScale("plasma"), left: -310 * iconScale("plasma"), top: -250 * iconScale("plasma") }}
          />
          {/* 大腦輪廓:線條逐筆畫出,把知識庫與 Plasma 包在裡面;有上傳動畫時等文件都飛進去才開始畫 */}
          <BrainNet
            width={BRAIN_W * iconScale("plasma")}
            delay={upload ? DOC_DELAY + DOC_FILES.length * DOC_STEP + 0.3 : 0.2}
            mode={upload ? "full" : "idle"}
          />
          {/* 上傳到知識庫的文件:從上方各自飛進知識庫後消失 */}
          {/* 先一起浮現在上方排成一列(doc-appear),再一份一份飛進去(doc-fly) */}
          {upload && DOC_FILES.map((f, k) => (
            <div key={f.name} className="doc-appear absolute left-0 top-0" style={{ animationDelay: `${0.35 + k * 0.12}s` }}>
            <div
              className="doc-fly absolute left-0 top-0"
              style={{
                ["--x0" as string]: `${(compact ? DOC_FROM_COMPACT : DOC_FROM)[k][0]}px`,
                ["--y0" as string]: `${(compact ? DOC_FROM_COMPACT : DOC_FROM)[k][1]}px`,
                animationDelay: `${DOC_DELAY + k * DOC_STEP}s`,
              }}
            >
              <div className={`flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-xl border border-border bg-card font-medium text-foreground ${compact ? "px-5 py-3 text-[32px]" : "px-3.5 py-2 text-[20px]"}`}>
                <FileText className={compact ? "h-9 w-9" : "h-5 w-5"} style={{ color: DOC_COLOR[f.type] }} />
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
              elRef={(el) => {
                if (el) nodeEls.current.set(id, { el, num: el.querySelector("[data-load]"), last: "", load: "" })
                else nodeEls.current.delete(id)
              }}
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
      {/* 大腦圖示的授權標註(Noun Project 免費圖示須標註作者),只在大腦頁導入後出現 */}
      {near.upload && (
        <span className="pointer-events-none absolute bottom-1 right-2 text-[11px] text-muted-foreground/60">Brain by Clockwise from the Noun Project</span>
      )}
    </div>
  )
}
