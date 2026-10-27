import { useLayoutEffect, useRef } from "react"
import { User, Bot, Wrench, Check, Loader2 } from "lucide-react"
import { AGENT_SCRIPT, AGENT_CHART, MCP_TOOLS } from "../data"
import type { AgentTurn } from "../types"
import { clamp01 } from "../timeline"

// 對話的每一步依捲動進度推進;每一步佔的份量(權重)不同,工具呼叫與最終回答有 loading 階段,給多一點
const WEIGHT: Record<AgentTurn["role"], number> = { user: 0.6, tool: 1, assistant: 1.6 }
const CHART_WEIGHT = 1.2

// 工具呼叫:前 60% 是「呼叫中」(轉圈 + 進度條),之後顯示結果
const TOOL_LOADING = 0.6
// 最終回答:前 35% 是「分析中」跳動點點,之後逐字打出
const THINKING = 0.35
// 圖表:前 30% 是骨架閃爍,之後長條長出來
const CHART_LOADING = 0.3

const appear = (v: number) => ({ opacity: v, transform: `translateY(${(1 - v) * 8}px)` })

// 把 0~1 的總進度切給每一步,回傳每一步自己的 0~1 進度
function stepProgress(progress: number) {
  const weights = [...AGENT_SCRIPT.map((t) => WEIGHT[t.role]), CHART_WEIGHT]
  const total = weights.reduce((a, b) => a + b, 0)
  let start = 0
  return weights.map((w) => {
    const v = clamp01((progress * total - start) / w)
    start += w
    return v
  })
}

// 「呼叫 Plasma MCP · list_tables → 找到…」拆成工具名稱與結果
function splitTool(text: string) {
  const [call, result = ""] = text.split(" → ")
  const tool = MCP_TOOLS.find((t) => call.includes(t)) ?? call
  return { tool, result }
}

// 標題列的狀態文字:依目前進行到哪一步、哪個階段
function status(steps: number[]): { text: string; busy: boolean } {
  const k = steps.findIndex((v) => v < 1)
  if (k === -1) return { text: "完成", busy: false }
  const v = steps[k]
  if (k === AGENT_SCRIPT.length) return { text: "產生圖表", busy: true }
  const turn = AGENT_SCRIPT[k]
  if (turn.role === "user") return { text: v > 0 ? "理解需求" : "待命", busy: v > 0 }
  if (turn.role === "tool") return { text: `呼叫 ${splitTool(turn.text).tool}`, busy: true }
  return { text: v < THINKING ? "分析中" : "撰寫回覆", busy: true }
}

export function AgentChat({ progress }: { progress: number }) {
  const steps = stepProgress(progress)
  const st = status(steps)
  const listRef = useRef<HTMLDivElement>(null)

  // 內容長出來時自動捲到最新一則
  useLayoutEffect(() => {
    const el = listRef.current
    if (el && el.scrollHeight - el.clientHeight - el.scrollTop > 1) el.scrollTop = el.scrollHeight
  })

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2 border-b border-border/70 pb-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">AI Agent</div>
          <div className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${st.busy ? "animate-pulse bg-warn" : "bg-ok"}`} />
            <span className={st.busy ? "shimmer-text" : ""}>{st.text}</span>
          </div>
        </div>
        {/* 手機寬度放不下,工具標籤省略(對話內容已顯示正在呼叫哪個工具) */}
        <span className="ml-auto flex flex-wrap justify-end gap-1 cp:hidden max-[1399px]:hidden">
          {MCP_TOOLS.map((t) => (
            <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {t}
            </span>
          ))}
        </span>
      </div>
      <div ref={listRef} data-lenis-prevent className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto pr-1">
        {AGENT_SCRIPT.map((t, i) => {
          const v = steps[i]
          if (v <= 0) return null
          if (t.role === "user") return <UserBubble key={i} text={t.text} v={v} />
          if (t.role === "tool") return <ToolCall key={i} text={t.text} v={v} />
          return <Answer key={i} text={t.text} v={v} />
        })}
        {steps[AGENT_SCRIPT.length] > 0 && <Chart v={steps[AGENT_SCRIPT.length]} />}
      </div>
    </div>
  )
}

function Avatar({ role }: { role: AgentTurn["role"] }) {
  const Icon = role === "user" ? User : role === "tool" ? Wrench : Bot
  return (
    <span
      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md
        ${role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
    >
      <Icon className="h-3 w-3" />
    </span>
  )
}

function UserBubble({ text, v }: { text: string; v: number }) {
  return (
    <div className="flex justify-end gap-2" style={appear(clamp01(v * 2))}>
      <div className="max-w-[80%] rounded-xl bg-primary px-3 py-2 text-[13px] leading-snug text-primary-foreground">{text}</div>
      <Avatar role="user" />
    </div>
  )
}

// 工具呼叫卡片:呼叫中(轉圈、工具名閃爍、進度條跟著捲動長)→ 完成(打勾、結果滑入)
function ToolCall({ text, v }: { text: string; v: number }) {
  const { tool, result } = splitTool(text)
  const loading = clamp01(v / TOOL_LOADING)
  const done = clamp01((v - TOOL_LOADING) / (1 - TOOL_LOADING))
  return (
    <div className="flex gap-2" style={appear(clamp01(v * 5))}>
      <Avatar role="tool" />
      <div className="min-w-0 max-w-[85%] flex-1 rounded-xl border border-border bg-muted/50 px-3 py-2 font-mono text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {done > 0 ? (
            <Check className="h-3 w-3 shrink-0 text-ok" style={{ opacity: done }} />
          ) : (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
          )}
          <span className={done > 0 ? "text-foreground/80" : "shimmer-text"}>
            {done > 0 ? `${tool} 完成` : `呼叫 ${tool}…`}
          </span>
        </div>
        {done === 0 && (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground/40" style={{ width: `${loading * 100}%` }} />
          </div>
        )}
        {done > 0 && (
          <div className="mt-1 leading-snug" style={appear(done)}>
            → {result}
          </div>
        )}
      </div>
    </div>
  )
}

// 最終回答:分析中(跳動點點)→ 依捲動進度逐字打出,打字時有游標
function Answer({ text, v }: { text: string; v: number }) {
  const typed = clamp01((v - THINKING) / (1 - THINKING))
  const chars = Array.from(text)
  const shown = chars.slice(0, Math.round(chars.length * typed)).join("")
  return (
    <div className="flex gap-2" style={appear(clamp01(v * 5))}>
      <Avatar role="assistant" />
      <div className="max-w-[80%] rounded-xl bg-accent px-3 py-2 text-[13px] leading-snug text-accent-foreground">
        {typed === 0 ? (
          <span className="flex items-center gap-2 py-0.5 text-muted-foreground">
            <span className="shimmer-text">分析中</span>
            <span className="flex gap-1">
              {[0, 1, 2].map((d) => (
                <span key={d} className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </span>
          </span>
        ) : (
          <>
            {shown}
            {typed < 1 && <span className="caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-foreground/70" />}
          </>
        )}
      </div>
    </div>
  )
}

// 圖表:骨架閃爍 → 長條依捲動進度長出
function Chart({ v }: { v: number }) {
  const max = Math.max(...AGENT_CHART.map((d) => d.amount))
  const grow = clamp01((v - CHART_LOADING) / (1 - CHART_LOADING))
  return (
    <div className="mt-1 rounded-xl border border-border bg-card p-3" style={appear(clamp01(v * 4))}>
      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {grow === 0 && <Loader2 className="h-3 w-3 animate-spin" />}
        <span className={grow === 0 ? "shimmer-text" : ""}>{grow === 0 ? "產生圖表中…" : "本月住院計費彙總 · 百萬 NT$"}</span>
      </div>
      <div className="space-y-2">
        {AGENT_CHART.map((d, i) => (
          <div key={d.dept} className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 text-muted-foreground">{grow === 0 ? <span className="skeleton block h-3 w-12 rounded" /> : d.dept}</span>
            <div className={`h-4 flex-1 overflow-hidden rounded bg-muted ${grow === 0 ? "skeleton" : ""}`}>
              {/* 長條依序長出,後面的稍晚 */}
              <div
                className="h-full rounded bg-gradient-to-r from-ring to-glow"
                style={{ width: `${(d.amount / max) * 100 * clamp01(grow * 1.6 - i * 0.2)}%` }}
              />
            </div>
            <span className="w-10 text-right font-mono tabular-nums" style={{ opacity: clamp01(grow * 1.6 - i * 0.2) }}>
              {d.amount.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
