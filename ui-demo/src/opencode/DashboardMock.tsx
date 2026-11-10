import { HelpCircle } from "lucide-react"

// 病史摘要檢視器（繁中）。同一個元件給診間全螢幕檢視器與丟給 AI agent 的病歷截圖共用，
// 所以「一開始的空摘要」跟「丟到 agent 的截圖」長得一模一樣。
// 匯出名沿用 ContributionDashboard / DashboardMock，避免動到 import 端。

// 空欄位佔位：用問號 icon 表示「資料還沒整合進來」
function Q({ big }: { big?: boolean }) {
  return <HelpCircle strokeWidth={2.5} className={(big ? "h-6 w-6" : "h-5 w-5") + " inline-block align-middle text-amber-400"} />
}

const PATIENT = { name: "陳○明", pid: "P000123", ageSex: "62 歲 / 男", care: "新陳代謝科 林醫師" }
const DIAGNOSES = ["E11.9 第二型糖尿病", "I10 高血壓", "N18.3 慢性腎臟病 第3期"]

const KPIS = [
  { label: "近一年就診", value: "8 次" },
  { label: "住院次數", value: "2 次" },
  { label: "累計住院天數", value: "9 天" },
  { label: "待追蹤異常值", value: "3 項" },
  { label: "長期用藥", value: "5 項" },
  { label: "藥物過敏", value: "Sulfa" },
]

// 就診時序（跨門診／急診／住院、跨科別）
const VISITS = [
  { date: "2026-09-12", dept: "心臟內科", type: "門診", dx: "I10 高血壓" },
  { date: "2026-09-02", dept: "新陳代謝科", type: "住院", dx: "E11.65 糖尿病伴高血糖" },
  { date: "2026-08-15", dept: "腎臟科", type: "門診", dx: "N18.3 CKD 第3期" },
  { date: "2026-08-10", dept: "新陳代謝科", type: "門診", dx: "E11.9 第二型糖尿病" },
  { date: "2026-07-10", dept: "心臟內科", type: "住院", dx: "I20.0 不穩定型心絞痛" },
]

// HbA1c 趨勢（越低越好，7.0 為控制目標）
const HBA1C = [
  { m: "2026-03", v: 9.2 },
  { m: "2026-06", v: 8.5 },
  { m: "2026-09", v: 7.8 },
]

const MEDS = [
  { name: "Metformin 500mg", freq: "BID", since: "2024-05" },
  { name: "Empagliflozin 10mg", freq: "QD", since: "2026-06" },
  { name: "Amlodipine 5mg", freq: "QD", since: "2025-01" },
  { name: "Atorvastatin 20mg", freq: "QN", since: "2025-03" },
  { name: "Aspirin 100mg", freq: "QD", since: "2026-07" },
]

const LABS = [
  { item: "HbA1c", value: "7.8 %", ref: "< 7.0", flag: "H" },
  { item: "Creatinine", value: "1.8 mg/dL", ref: "0.7–1.3", flag: "H" },
  { item: "eGFR", value: "42", ref: "> 60", flag: "L" },
  { item: "LDL-C", value: "96 mg/dL", ref: "< 100", flag: "" },
  { item: "血壓", value: "138 / 85", ref: "< 130/80", flag: "H" },
]

const typeColor: Record<string, string> = { 門診: "#118dff", 急診: "#e66c37", 住院: "#12239e" }
const flagColor = (f: string) => (f === "H" ? "text-rose-600" : f === "L" ? "text-amber-600" : "text-slate-400")

// 共用的病史摘要卡片。filled=false 時顯示空摘要（問號佔位）。
export function ContributionDashboard({ filled }: { filled: boolean }) {
  // HbA1c 柱高用 6.0–10.0 區間拉開，讓 9.2→7.8 的下降趨勢看得出來
  const barH = (v: number) => Math.max(8, ((v - 6) / (10 - 6)) * 100)

  return (
    <div className="bg-white p-5 flex flex-col gap-3">
      {/* Header：病人基本資料 + 主要診斷 */}
      <div className="flex items-stretch gap-4 border-b border-slate-100 pb-3">
        <div className="pr-4 border-r border-slate-100">
          <div className="text-[17px] font-bold tracking-tight text-slate-800">病史摘要</div>
          <div className="text-xs text-slate-400">Patient Summary</div>
        </div>
        <div className="flex-1 flex items-center gap-6">
          <div className="text-sm">
            <div className="font-semibold text-slate-800">{PATIENT.name} <span className="font-mono text-xs text-slate-400 ml-1">{PATIENT.pid}</span></div>
            <div className="text-[12px] text-slate-500">{PATIENT.ageSex} · {PATIENT.care}</div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filled
              ? DIAGNOSES.map((d) => (
                  <span key={d} className="rounded-full bg-sidebar-ring/10 text-sidebar-ring text-[11px] px-2 py-0.5">{d}</span>
                ))
              : DIAGNOSES.map((_, i) => (
                  <span key={i} className="rounded-full bg-slate-100 text-[11px] px-3 py-0.5"><Q /></span>
                ))}
          </div>
        </div>
      </div>

      {/* KPI 列 */}
      <div className="grid grid-cols-6 gap-2 border-b border-slate-100 pb-3">
        {KPIS.map((k) => (
          <div key={k.label} className="text-center">
            <div className={"text-[15px] font-bold " + (filled ? "text-slate-700" : "text-slate-300")}>
              {filled ? k.value : <Q big />}
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">{k.label}</div>
          </div>
        ))}
      </div>

      {/* 視覺磚 */}
      <div className="grid grid-cols-3 gap-3">
        {/* 就診時序 */}
        <Tile title="就診時序（近一年）" className="col-span-2">
          <div className="flex flex-col gap-2 pt-1">
            {VISITS.map((v, i) => (
              <div key={i} className="flex items-center gap-3 text-[12px]">
                <span className="w-20 font-mono text-slate-500">{filled ? v.date : <Q />}</span>
                <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: filled ? typeColor[v.type] : "#e2e5e9" }} />
                <span className="w-14 text-slate-500">{filled ? v.type : <Q />}</span>
                <span className="w-20 text-slate-600">{filled ? v.dept : <Q />}</span>
                <span className="flex-1 text-slate-500 truncate">{filled ? v.dx : <Q />}</span>
              </div>
            ))}
            <div className="text-[10px] text-slate-400 text-center pt-1">整合自 HIS 門診／急診／住院紀錄</div>
          </div>
        </Tile>

        {/* HbA1c 趨勢 */}
        <Tile title="HbA1c 趨勢（目標 < 7.0）">
          <div className="flex items-end gap-4 h-24 pt-1">
            {HBA1C.map((p) => (
              <div key={p.m} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-[10px] font-mono text-slate-500">{filled ? p.v : <Q />}</span>
                <div
                  className="w-full rounded-t bg-[#e66c37] transition-[height] duration-700"
                  style={{ height: filled ? `${barH(p.v)}%` : "6px" }}
                />
                <span className="text-[10px] text-slate-400">{filled ? p.m.slice(2) : <Q />}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-slate-400 text-center pt-1">整合自 LIS 檢驗數值</div>
        </Tile>

        {/* 用藥清單 */}
        <Tile title="長期用藥" className="col-span-2">
          <table className="w-full text-[12px]">
            <thead className="text-slate-400">
              <tr className="border-b border-slate-100">
                <th className="text-left font-medium py-1">藥品</th>
                <th className="text-left font-medium py-1">頻次</th>
                <th className="text-right font-medium py-1">起始</th>
              </tr>
            </thead>
            <tbody>
              {MEDS.map((m) => (
                <tr key={m.name} className="border-b border-slate-50">
                  <td className={"py-1 font-medium " + (filled ? "text-slate-700" : "text-slate-300")}>{filled ? m.name : <Q />}</td>
                  <td className={"py-1 " + (filled ? "text-slate-500" : "text-slate-300")}>{filled ? m.freq : <Q />}</td>
                  <td className={"py-1 text-right font-mono " + (filled ? "text-slate-500" : "text-slate-300")}>{filled ? m.since : <Q />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tile>

        {/* 關鍵檢驗值 */}
        <Tile title="關鍵檢驗值（最新）">
          <div className="flex flex-col gap-2 pt-1">
            {LABS.map((l) => (
              <div key={l.item} className="flex items-center gap-2 text-[12px]">
                <span className="w-20 text-slate-500">{filled ? l.item : <Q />}</span>
                <span className={"flex-1 font-mono " + (filled ? "text-slate-700" : "text-slate-300")}>{filled ? l.value : <Q />}</span>
                {filled && l.flag && <span className={"font-bold " + flagColor(l.flag)}>{l.flag}</span>}
                <span className="w-16 text-right text-[10px] text-slate-400">{filled ? l.ref : ""}</span>
              </div>
            ))}
          </div>
        </Tile>
      </div>
    </div>
  )
}

function Tile({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"rounded-sm border border-[#e1dfdd] bg-white p-3 " + className}>
      <div className="text-[12px] font-semibold text-slate-700 mb-2">{title}</div>
      {children}
    </div>
  )
}
