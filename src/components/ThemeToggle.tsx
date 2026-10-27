import { useState } from "react"
import { flushSync } from "react-dom"
import { ThemeSwitch, type Theme } from "@/components/arc/theme-switch/theme-switch"

const KEY = "theme"

// 初始值與 index.html 的預載腳本一致:讀上次的選擇,預設淺色
function initial(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // 無痕模式等情況存不了,只影響下次開啟的預設值
  }
}

// uiarc ThemeSwitch(reveal 變體):新主題以圓形從按鈕中心展開到整個畫面。
// 瀏覽器不支援 View Transitions 或使用者偏好減少動態時,直接切換
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initial)

  const change = (next: Theme, _variant: string, trigger: HTMLElement) => {
    const commit = () => {
      flushSync(() => setTheme(next))
      apply(next)
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!document.startViewTransition || reduce) return commit()

    const r = trigger.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    document.startViewTransition(commit).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 550, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
      )
    })
  }

  return (
    <span className="arc">
      <ThemeSwitch
        theme={theme}
        variant="reveal"
        iconOnly
        label={theme === "light" ? "切換為深色模式" : "切換為淺色模式"}
        onThemeChange={change}
      />
    </span>
  )
}
