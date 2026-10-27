import { SCENES } from "../scenes"
import { clampProgress } from "../timeline"
import { useScrollSelector } from "../scroll"
import { plasmaOn, setPlasma } from "../plasma"

// 舞台右上角的「沒有 Plasma｜有 Plasma」切換。開場頁沒有對照,按鈕淡出。
// 還沒切過去時,「有 Plasma」那格輕輕發光,提示可以按
export function PlasmaToggle() {
  const current = useScrollSelector((p) => Math.round(clampProgress(p)))
  const on = useScrollSelector((p) => plasmaOn(Math.round(clampProgress(p))))
  const has = !!SCENES[current].plasma

  const item = "relative z-10 inline-flex h-8 items-center gap-2 rounded-full px-3.5 transition-colors duration-300 pp:h-7 pp:px-2.5 pl:h-7 pl:px-2.5"
  const choose = (v: boolean) => setPlasma(current, v)

  return (
    <div
      role="radiogroup"
      aria-label="切換有沒有 Plasma"
      aria-hidden={!has}
      className={`liquid-bar relative grid grid-cols-2 rounded-full p-1 text-[13px] transition-opacity duration-300 pp:text-[12px] pl:text-[12px]
        ${has ? "" : "pointer-events-none opacity-0"}`}
    >
      <span
        aria-hidden
        className="liquid-glass absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full transition-transform duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none"
        style={{ transform: on ? "translateX(100%)" : undefined }}
      />
      <button
        role="radio"
        aria-checked={!on}
        tabIndex={has ? 0 : -1}
        onClick={() => choose(false)}
        className={`${item} ${on ? "text-muted-foreground hover:text-foreground" : "font-medium text-foreground"}`}
      >
        <span className="h-2 w-2 rounded-full bg-danger" />
        沒有 Plasma
      </button>
      <button
        role="radio"
        aria-checked={on}
        tabIndex={has ? 0 : -1}
        onClick={() => choose(true)}
        className={`${item} ${on ? "font-medium text-foreground" : "plasma-hint text-muted-foreground hover:text-foreground"}`}
      >
        <span className="h-2 w-2 rounded-full bg-ok" />
        有 Plasma
      </button>
    </div>
  )
}
