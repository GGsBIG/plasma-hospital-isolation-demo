
// 客戶貢獻度儀表板（繁中）。同一個元件給全螢幕面板與丟給 AI agent 的截圖共用，
// 所以「第一頁的空面板」跟「丟到 agent 的截圖」長得一模一樣。

// 空面板佔位：灰色虛線骨架 + 紅色問號，表示「還沒有資料」
function Q({ big }: { big?: boolean }) {
  return (
    <span
      aria-label="尚無資料"
      className={
        "inline-flex items-center justify-center align-middle border border-dashed border-ink/45 bg-sheet font-black leading-none text-red " +
        (big ? "h-7 w-12 text-[15px]" : "h-[18px] w-7 text-[11px]")
      }
    >
      ?
    </span>
  )
}

const KPIS = [
  { label: "總營收", value: "NT$ 34,255" },
  { label: "前 10% 客戶貢獻", value: "68%" },
  { label: "活躍客戶數", value: "8" },
  { label: "平均客單價", value: "NT$ 1,803" },
  { label: "VIP 客戶數", value: "2" },
  { label: "回購率", value: "46%" },
]

// 依貢獻度（消費占總營收比）排序的高貢獻客戶（B2B 企業客戶）
const CUSTOMERS = [
  { name: "星睿貿易", tier: "VIP", region: "北區", spend: 11656, pct: 34 },
  { name: "鼎豐實業", tier: "VIP", region: "中區", spend: 8905, pct: 26 },
  { name: "群峰國際", tier: "金卡", region: "北區", spend: 7371, pct: 22 },
  { name: "昌立企業", tier: "銀卡", region: "南區", spend: 1607, pct: 5 },
  { name: "恆宇通路", tier: "金卡", region: "中區", spend: 1408, pct: 4 },
]

const REGIONS = [
  { r: "北區", v: 22861, pct: 100 },
  { r: "中區", v: 8978, pct: 39 },
  { r: "南區", v: 2416, pct: 11 },
]

const TIERS = [
  { t: "VIP", pct: 60, c: "#b42622" },
  { t: "金卡", pct: 26, c: "#111111" },
  { t: "銀卡", pct: 9, c: "#7a7a7a" },
  { t: "一般", pct: 5, c: "#d9d4c8" },
]

// 共用的儀表板卡片。filled=false 時顯示空面板（灰底佔位）。
export function ContributionDashboard({ filled }: { filled: boolean }) {
  const donut = filled
    ? `conic-gradient(${TIERS[0].c} 0 60%, ${TIERS[1].c} 60% 86%, ${TIERS[2].c} 86% 95%, ${TIERS[3].c} 95% 100%)`
    : "#ece9e2"

  // 帕累托累積貢獻
  let cum = 0
  const pareto = CUSTOMERS.map((c) => ({ name: c.name, cum: (cum += c.pct) }))

  return (
    <div className="bg-paper p-5 flex flex-col gap-3 border-t-[6px] border-red">
      {/* Header + KPI 列 */}
      <div className="flex items-stretch gap-4 border-b-4 border-ink pb-3">
        <div className="pr-4 border-r-2 border-ink">
          <div className="text-[19px] font-black tracking-[-0.01em] text-ink">客戶貢獻分析</div>
          <div className="t-label text-ink-soft">Customer Contribution</div>
        </div>
        <div className="flex-1 grid grid-cols-6 divide-x divide-hair">
          {KPIS.map((k) => (
            <div key={k.label} className="px-2 flex flex-col justify-between gap-1">
              <div className="text-[10px] font-bold text-ink-soft leading-tight">{k.label}</div>
              <div className={"t-num text-[clamp(15px,1.5vw,22px)] whitespace-nowrap overflow-hidden " + (filled ? "text-ink" : "text-ink-soft")}>
                {filled ? k.value : <Q big />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 視覺磚 */}
      <div className="grid grid-cols-3 gap-3">
        {/* 客戶貢獻度排行（橫條） */}
        <Tile title="客戶貢獻度排行" className="col-span-2">
          <div className="flex flex-col gap-2.5 pt-1">
            {CUSTOMERS.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-14 text-[11px] font-bold text-ink text-right">{filled ? c.name : <Q />}</span>
                <div className="flex-1 h-5 bg-sheet overflow-hidden">
                  <div className="h-full bg-red transition-[width] duration-700" style={{ width: filled ? `${c.pct * 2.8}%` : 0 }} />
                </div>
                <span className="w-10 text-[11px] font-bold tabular-nums text-ink text-right">{filled ? `${c.pct}%` : <Q />}</span>
                <span className="w-20 text-[11px] tabular-nums text-ink-soft text-right">{filled ? `NT$ ${c.spend.toLocaleString()}` : <Q />}</span>
              </div>
            ))}
            <div className="text-[10px] text-ink-soft text-center pt-1">依消費占總營收比排序</div>
          </div>
        </Tile>

        {/* 各等級營收占比（甜甜圈） */}
        <Tile title="各等級營收占比">
          <div className="flex flex-col items-center gap-3 pt-1">
            <div className={"relative h-28 w-28 rounded-full " + (filled ? "" : "outline-dashed outline-1 outline-offset-0 outline-ink/45")} style={{ background: donut }}>
              <div className={"absolute inset-[26%] rounded-full bg-paper flex items-center justify-center " + (filled ? "" : "border border-dashed border-ink/45")}>
                <span className={"t-num text-[15px] " + (filled ? "text-ink" : "text-ink-soft")}>{filled ? "100%" : <Q />}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
              {TIERS.map((t) => (
                <Legend key={t.t} c={filled ? t.c : "#ece9e2"} label={filled ? `${t.t} ${t.pct}%` : <span>{t.t} <Q /></span>} />
              ))}
            </div>
          </div>
        </Tile>

        {/* 各區域營收貢獻（橫條） */}
        <Tile title="各區域營收貢獻">
          <div className="flex flex-col gap-3 pt-1">
            {REGIONS.map((b) => (
              <div key={b.r} className="flex items-center gap-3">
                <span className="w-12 text-[11px] font-bold text-ink text-right">{b.r}</span>
                <div className="flex-1 h-5 bg-sheet overflow-hidden">
                  <div className="h-full bg-ink transition-[width] duration-700" style={{ width: filled ? `${b.pct}%` : 0 }} />
                </div>
                <span className="w-20 text-[11px] tabular-nums font-bold text-ink text-right">{filled ? `NT$ ${b.v.toLocaleString()}` : <Q />}</span>
              </div>
            ))}
            <div className="text-[10px] text-ink-soft text-center pt-1">各區域營收合計</div>
          </div>
        </Tile>

        {/* 累積貢獻（帕累托） */}
        <Tile title="累積貢獻（帕累托）" className="col-span-2">
          <div className="flex items-end gap-4 h-24 pt-1">
            {pareto.map((p) => (
              <div key={p.name} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-[10px] font-bold tabular-nums text-ink">{filled ? `${p.cum}%` : <Q />}</span>
                <div
                  className={"w-full transition-[height] duration-700 " + (filled ? "bg-ink" : "bg-sheet border border-dashed border-ink/45")}
                  style={{ height: filled ? `${p.cum}%` : "18%" }}
                />
                <span className="text-[10px] text-ink-soft">{filled ? p.name : <Q />}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-ink-soft text-center pt-1">前幾大客戶累積貢獻占比</div>
        </Tile>

        {/* 高貢獻客戶明細（表） */}
        <Tile title="高貢獻客戶明細" className="col-span-3">
          <table className="w-full text-[12px]">
            <thead className="text-ink">
              <tr className="border-b-2 border-ink">
                <th className="text-left t-label py-1.5">客戶</th>
                <th className="text-left t-label py-1.5">等級</th>
                <th className="text-left t-label py-1.5">區域</th>
                <th className="text-right t-label py-1.5">貢獻度</th>
                <th className="text-right t-label py-1.5">消費 (NT$)</th>
              </tr>
            </thead>
            <tbody>
              {CUSTOMERS.map((c) => (
                <tr key={c.name} className="border-b border-hair">
                  <td className={"py-1.5 font-medium " + (filled ? "text-ink" : "text-ink-soft")}>{filled ? c.name : <Q />}</td>
                  <td className={"py-1.5 " + (filled ? "text-ink-soft" : "text-ink-soft")}>{filled ? c.tier : <Q />}</td>
                  <td className={"py-1.5 " + (filled ? "text-ink-soft" : "text-ink-soft")}>{filled ? c.region : <Q />}</td>
                  <td className={"py-1.5 text-right tabular-nums " + (filled ? "text-ink" : "text-ink-soft")}>{filled ? `${c.pct}%` : <Q />}</td>
                  <td className={"py-1.5 text-right tabular-nums " + (filled ? "text-ink" : "text-ink-soft")}>{filled ? c.spend.toLocaleString() : <Q />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tile>
      </div>
    </div>
  )
}

// 丟給 AI agent 的截圖：把同一個儀表板等比縮小成縮圖，所以跟第一頁空面板一模一樣。
export function DashboardMock({ filled }: { filled: boolean; size?: "sm" | "lg" }) {
  return (
    <div className="w-[400px] h-[300px] overflow-hidden border border-ink bg-paper">
      <div className="w-[1040px] origin-top-left scale-[0.3846]">
        <ContributionDashboard filled={filled} />
      </div>
    </div>
  )
}

function Tile({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"border border-hair border-t-2 border-t-ink bg-paper p-3 " + className}>
      <div className="text-[12px] font-black text-ink mb-2">{title}</div>
      {children}
    </div>
  )
}

function Legend({ c, label }: { c: string; label: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-ink">
      <span className="inline-block h-2.5 w-2.5 border border-ink/20" style={{ background: c }} /> {label}
    </span>
  )
}
