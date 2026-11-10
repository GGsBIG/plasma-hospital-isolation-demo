import {
  Save, Undo2, Redo2, Scissors, Copy, ClipboardPaste, Paintbrush2,
  Database, FileSpreadsheet, Boxes, Server, TableProperties, Clock,
  Wand2, RefreshCw, ImagePlus, Type, LayoutGrid, Calculator, Zap, UploadCloud,
  BarChart3, BarChartHorizontal, LineChart, AreaChart, PieChart, ScatterChart,
  Table2, Map, Gauge, Hash, ListTree, MessageSquare, KeyRound, Shapes,
  ChevronLeft, ChevronRight, ChevronDown, Filter as FilterIcon, Minus, Square, X, Plus,
} from "lucide-react"
import type { DemoState } from "@/demo/store"
import { ContributionDashboard } from "@/opencode/DashboardMock"

// 最終畫面：BI 工具外框（上下左右 navbar）+ 中間客戶貢獻度 dashboard 畫布（與丟給 agent 的截圖共用同一個元件）。
export function PowerBIDashboard({ s }: { s: DemoState }) {
  if (!s.powerbiOpen) return null
  const filled = s.dashFilled

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-sheet overflow-hidden animate-in fade-in-0 duration-500 select-none">
      {/* ===== 標題列 ===== */}
      <div className="h-8 shrink-0 bg-ink text-paper flex items-center px-2 text-[12px] border-t-[4px] border-red box-content">
        <div className="flex items-center gap-3 text-paper">
          <Save className="h-3.5 w-3.5" />
          <Undo2 className="h-3.5 w-3.5" />
          <Redo2 className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 text-center text-paper font-bold">客戶貢獻分析 - BI</div>
        <div className="flex items-center gap-3">
          <span className="text-paper">user_admin</span>
          <div className="h-5 w-5 bg-red text-paper text-[10px] font-black flex items-center justify-center">U</div>
          <div className="flex items-center gap-3 pl-2 text-paper">
            <Minus className="h-3.5 w-3.5" />
            <Square className="h-3 w-3" />
            <X className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* ===== Ribbon 分頁列 ===== */}
      <div className="h-9 shrink-0 bg-paper flex items-end px-1 text-[13px] border-b border-hair">
        <span className="px-3 h-9 flex items-center bg-red text-paper font-bold">File</span>
        {["Home", "Insert", "Modeling", "View", "Help"].map((t) => (
          <span
            key={t}
            className={
              "px-3 h-9 flex items-center " +
              (t === "Home" ? "text-ink border-b-4 border-red font-bold" : "text-ink-soft font-medium")
            }
          >
            {t}
          </span>
        ))}
      </div>

      {/* ===== Ribbon 按鈕列 ===== */}
      <div className="h-[86px] shrink-0 bg-paper border-b-2 border-ink flex items-stretch px-1 text-ink">
        <RibbonGroup label="Clipboard">
          <RibbonBig icon={<ClipboardPaste className="h-6 w-6" />} label="Paste" />
          <div className="flex flex-col justify-center gap-1 px-1 text-[11px] text-ink">
            <span className="flex items-center gap-1"><Scissors className="h-3.5 w-3.5" /> Cut</span>
            <span className="flex items-center gap-1"><Copy className="h-3.5 w-3.5" /> Copy</span>
            <span className="flex items-center gap-1"><Paintbrush2 className="h-3.5 w-3.5" /> Format painter</span>
          </div>
        </RibbonGroup>
        <RibbonGroup label="Data">
          <RibbonBig icon={<Database className="h-6 w-6 text-red" />} label="Get data" caret />
          <RibbonBig icon={<FileSpreadsheet className="h-6 w-6 text-ink" />} label="Excel" />
          <RibbonBig icon={<Boxes className="h-6 w-6 text-ink" />} label="BI datasets" />
          <RibbonBig icon={<Server className="h-6 w-6 text-ink" />} label="SQL Server" />
          <RibbonBig icon={<TableProperties className="h-6 w-6 text-ink" />} label="Enter data" />
          <RibbonBig icon={<Clock className="h-6 w-6 text-ink" />} label="Recent sources" caret />
        </RibbonGroup>
        <RibbonGroup label="Queries">
          <RibbonBig icon={<Wand2 className="h-6 w-6 text-ink" />} label="Transform data" caret />
          <RibbonBig icon={<RefreshCw className="h-6 w-6 text-ink" />} label="Refresh" />
        </RibbonGroup>
        <RibbonGroup label="Insert">
          <RibbonBig icon={<ImagePlus className="h-6 w-6 text-ink" />} label="New visual" />
          <RibbonBig icon={<Type className="h-6 w-6 text-ink" />} label="Text box" />
          <RibbonBig icon={<LayoutGrid className="h-6 w-6 text-ink" />} label="More visuals" caret />
        </RibbonGroup>
        <RibbonGroup label="Calculations">
          <RibbonBig icon={<Calculator className="h-6 w-6 text-ink" />} label="New measure" />
          <RibbonBig icon={<Zap className="h-6 w-6 text-ink" />} label="Quick measure" />
        </RibbonGroup>
        <RibbonGroup label="Share" last>
          <RibbonBig icon={<UploadCloud className="h-6 w-6 text-ink" />} label="Publish" />
        </RibbonGroup>
      </div>

      {/* ===== 主體：左鐵軌 + 畫布 + 右側面板 ===== */}
      <div className="flex-1 min-h-0 flex">
        {/* 左側 view 鐵軌 */}
        <div className="w-9 shrink-0 bg-paper border-r border-ink flex flex-col items-center pt-3 gap-4 text-ink">
          <BarChart3 className="h-5 w-5 text-red" />
          <Table2 className="h-5 w-5" />
          <Boxes className="h-5 w-5" />
        </div>

        {/* 畫布 */}
        <div className="flex-1 min-w-0 overflow-auto p-4">
          <div className="mx-auto w-full max-w-[1040px] border border-ink shadow-[0_8px_24px_rgb(17_17_17/0.10)]">
            <ContributionDashboard filled={filled} />
          </div>
        </div>

        {/* 右：Filters 直排 tab + Visualizations 面板 */}
        <div className="shrink-0 flex text-ink">
          <div className="w-7 bg-paper border-l border-ink flex flex-col items-center pt-3 gap-2">
            <ChevronLeft className="h-4 w-4 text-ink" />
            <div className="mt-2 flex flex-col items-center gap-1 text-[11px] font-bold text-ink">
              <FilterIcon className="h-4 w-4" />
              <span style={{ writingMode: "vertical-rl" }}>Filters</span>
            </div>
          </div>
          <div className="w-60 bg-paper border-l border-hair flex flex-col">
            <div className="px-3 py-2 t-label text-[12px] border-b-2 border-ink">Visualizations</div>
            {/* viz 類型 icon 網格 */}
            <div className="p-2 grid grid-cols-6 gap-1.5 border-b border-hair">
              {[
                BarChartHorizontal, BarChart3, LineChart, AreaChart, PieChart, ScatterChart,
                Table2, Map, Gauge, Hash, ListTree, MessageSquare,
                KeyRound, Shapes, LayoutGrid, TableProperties, Boxes, ChevronRight,
              ].map((Icon, i) => (
                <div key={i} className={"h-7 rounded-sm border flex items-center justify-center " + (i === 6 ? "border-red bg-paper border-2" : "border-transparent hover:bg-sheet")}>
                  <Icon className={"h-4 w-4 " + (i === 6 ? "text-red" : "text-ink")} />
                </div>
              ))}
            </div>
            <div className="px-3 py-2 t-label text-ink-soft">Values</div>
            <div className="mx-3 mb-2 h-9 border border-dashed border-ink bg-sheet flex items-center px-2 text-[11px] text-ink-soft">
              Add data fields here
            </div>
            <div className="px-3 py-2 text-[13px] font-bold flex items-center justify-between border-t border-hair">
              Drill through <ChevronDown className="h-3.5 w-3.5 text-ink" />
            </div>
            <div className="px-3 py-1 text-[12px] text-ink-soft">Cross-report</div>
            <div className="px-3 py-1 flex items-center gap-2 text-[12px] text-ink-soft">
              Off <span className="h-3.5 w-7 border border-ink bg-sheet relative"><span className="absolute left-0.5 top-0.5 h-2 w-2.5 bg-ink" /></span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 底部：頁籤 + 狀態列 ===== */}
      <div className="h-8 shrink-0 bg-paper border-t-2 border-ink flex items-center px-2 gap-1 text-[12px]">
        <ChevronLeft className="h-3.5 w-3.5 text-ink-soft" />
        <ChevronRight className="h-3.5 w-3.5 text-ink-soft" />
        <div className="px-3 h-full flex items-center bg-paper border-t-4 border-red border-x border-x-hair font-bold text-ink">Overview</div>
        <div className="h-5 w-5 border border-ink flex items-center justify-center"><Plus className="h-3.5 w-3.5 text-ink" /></div>
        <div className="ml-auto flex items-center gap-3 text-ink">
          {filled ? (
            <span className="flex items-center gap-1.5 font-bold"><span className="inline-block h-2 w-2 bg-ink" /> Connected: Plasma Data API</span>
          ) : (
            <span className="flex items-center gap-1.5 text-red font-bold"><span className="inline-block h-2 w-2 border-2 border-red" /> No data source connected</span>
          )}
          <span className="t-label">Page 1 of 1</span>
        </div>
      </div>
    </div>
  )
}

function RibbonGroup({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={"flex flex-col " + (last ? "" : "border-r border-hair")}>
      <div className="flex-1 flex items-stretch px-1.5 gap-0.5">{children}</div>
      <div className="text-center text-[9px] font-bold uppercase tracking-[0.08em] text-ink-soft pb-0.5">{label}</div>
    </div>
  )
}

function RibbonBig({ icon, label, caret }: { icon: React.ReactNode; label: string; caret?: boolean }) {
  return (
    <div className="w-14 flex flex-col items-center justify-center gap-0.5 px-0.5 py-1 hover:bg-sheet cursor-default">
      {icon}
      <span className="text-[10px] leading-tight text-center text-ink font-medium flex items-center gap-0.5">
        {label}{caret && <ChevronDown className="h-2.5 w-2.5" />}
      </span>
    </div>
  )
}
