// 圖例:放在左側說明欄底部(桌機才有),說明連線與徽章圓點的意思。
// 樣式對應 Edge.tsx 實際畫法:risk 紅色虛線、overload 紅色實線＋密集光點、normal／isolated 灰線＋光點
function Line({ color, dash, dots }: { color: string; dash?: boolean; dots: string; }) {
  return (
    <svg width="44" height="12" viewBox="0 0 44 12" aria-hidden className="shrink-0">
      <line x1="2" y1="6" x2="42" y2="6" stroke={color} strokeWidth="2" strokeDasharray={dash ? "5 4" : undefined} />
      {(dots === "dense" ? [8, 14, 20, 26, 32, 38] : [12, 30]).map((x) => (
        <circle key={x} cx={x} cy="6" r="2.4" fill={dots === "dense" ? "var(--dot-overload)" : "var(--dot-isolated)"} />
      ))}
    </svg>
  )
}

export function Legend() {
  const row = "flex items-center gap-3"
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-background pb-5 pt-3 text-[14px] leading-tight text-muted-foreground cp:hidden">
      <div className="mb-2 text-[12px] font-semibold tracking-wider">圖例</div>
      <div className="space-y-2">
        <div className={row}><Line color="var(--edge-overload)" dash dots="sparse" />同步失敗</div>
        <div className={row}><Line color="var(--edge-overload)" dots="dense" />負載過高</div>
        <div className={row}><Line color="var(--edge-isolated)" dots="sparse" />資料流</div>
        <div className={row}>
          <span className="flex w-[44px] shrink-0 justify-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ok" />
            <span className="h-2.5 w-2.5 rounded-full bg-warn" />
            <span className="h-2.5 w-2.5 rounded-full bg-danger" />
          </span>
          正常／注意／異常
        </div>
      </div>
    </div>
  )
}
