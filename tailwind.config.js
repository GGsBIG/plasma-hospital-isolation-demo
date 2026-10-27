/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  // hover: 只在有滑鼠的裝置生效,手機點過後不會黏住 hover 樣式
  future: { hoverOnlyWhenSupported: true },
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // 手機版面(與 src/layout.ts 的判斷一致):pp 直拿、pl 橫拿、cp 兩者皆是(緊湊版)
      screens: {
        pp: { raw: "(max-width: 1023px) and (orientation: portrait)" },
        pl: { raw: "(max-height: 500px) and (orientation: landscape)" },
        // 直拿且很矮(小手機、Safari 網址列展開):說明區只有 45%,字再小一點才放得下;須排在 pp 之後才會覆蓋 pp
        ps: { raw: "(max-width: 1023px) and (orientation: portrait) and (max-height: 699px)" },
        cp: { raw: "(max-width: 1023px) and (orientation: portrait), (max-height: 500px) and (orientation: landscape)" },
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        glow: "hsl(var(--glow))",
        ok: "hsl(var(--ok))",
        warn: "hsl(var(--warn))",
        danger: "hsl(var(--danger))",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      transitionTimingFunction: { brand: "cubic-bezier(0.25, 0.1, 0.25, 1)" },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
