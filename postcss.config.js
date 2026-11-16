// rem 一律換算成 px(根字級 16px)。
// 手機版舞台在 Safari 用 CSS zoom 縮小排版來省圖層記憶體(見 Stage.tsx 的 useFit),
// 而 Safari 的 zoom 只縮放 px、不縮放 rem;混用的話 Tailwind 的間距(rem)和字級(px)比例會跑掉
const remToPx = () => ({
  postcssPlugin: "rem-to-px",
  Declaration(decl) {
    if (decl.value.includes("rem")) decl.value = decl.value.replace(/(-?\d*\.?\d+)rem\b/g, (_, n) => `${+(n * 16).toFixed(4)}px`)
  },
})
remToPx.postcss = true

export default {
  plugins: [(await import("tailwindcss")).default(), remToPx(), (await import("autoprefixer")).default()],
}
