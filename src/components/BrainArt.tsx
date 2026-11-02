// 「資料大腦」的輪廓:俯視的左右兩個半腦,外緣有起伏,內部是一圈圈彎曲的皺褶。
// 全部用公式產生(不是圖檔),扁平、細線;中下方留白,線條不穿過 Plasma 的 logo 與徽章。
// 每條線 pathLength=1,由 CSS 依序畫出(--brain-delay + 每條錯開一點)

const W = 1000
const H = 520
const CX = W / 2
const CY = H / 2
const RX = 470
const RY = 240

// 半腦上的一點:t 0 = 正上方、π = 正下方;side -1 左、1 右;s 為縮放(1 = 外緣);wig 為起伏幅度、freq 為起伏次數
function pt(t: number, side: number, s: number, wig: number, freq: number, phase = 0) {
  const r = s * (1 + wig * Math.sin(freq * t + phase))
  return [CX + side * (RX * r * Math.sin(t) + 6), CY - RY * r * Math.cos(t)] as const
}

function curve(t0: number, t1: number, side: number, s: number, wig: number, freq: number, phase = 0) {
  const n = Math.max(12, Math.round((t1 - t0) * 60))
  let d = ""
  for (let i = 0; i <= n; i++) {
    const [x, y] = pt(t0 + ((t1 - t0) * i) / n, side, s, wig, freq, phase)
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

// 中線(左右半腦之間的縫):輕微左右擺動
function fissure() {
  let d = ""
  for (let i = 0; i <= 40; i++) {
    const y = CY - RY * 0.98 + (RY * 1.2 * i) / 40
    d += `${i ? "L" : "M"}${(CX + 5 * Math.sin(i * 0.9)).toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

// 皺褶:每圈拆成幾段弧,各圈的起伏次數、相位不同;只畫上方與兩側(t < 2.35),下方中央留給 Plasma 的名稱
const FOLDS: [number, number, number, number, number][] = [
  // [縮放, 起伏幅度, 起伏次數, 起點 t, 終點 t]:起伏次數少、幅度大,像一個個腦回,而不是細碎的鋸齒
  [0.86, 0.07, 12, 0.1, 0.95], [0.86, 0.07, 12, 1.1, 1.9], [0.86, 0.07, 12, 2.05, 2.65],
  [0.72, 0.11, 10, 0.16, 0.8], [0.72, 0.11, 10, 0.95, 1.65], [0.72, 0.11, 10, 1.8, 2.4],
  [0.58, 0.14, 8, 0.22, 1.0], [0.58, 0.14, 8, 1.15, 2.0],
  [0.44, 0.16, 7, 0.3, 0.95], [0.44, 0.16, 7, 1.1, 1.7],
  [0.3, 0.18, 6, 0.35, 1.2],
]

const PATHS: string[] = [
  curve(0, Math.PI, -1, 1, 0.035, 11),
  curve(0, Math.PI, 1, 1, 0.035, 11, 1.3),
  fissure(),
  ...[-1, 1].flatMap((side) =>
    FOLDS.map(([s, wig, freq, t0, t1], k) => curve(t0, t1, side, s, wig, freq, side * 0.7 + k)),
  ),
]

export function BrainArt({ width, delay }: { width: number; delay: string }) {
  return (
    <svg
      aria-hidden
      className="brain-outline absolute"
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={(width * H) / W}
      // 整體略往上提:下緣落在 Plasma 的 logo 上方,不壓到字
      style={{ left: -width / 2, top: -(width * H) / W / 2 - width * 0.05, ["--brain-delay" as string]: delay }}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS.map((d, i) => (
        <path key={i} d={d} pathLength={1} vectorEffect="non-scaling-stroke" style={{ animationDelay: `calc(var(--brain-delay) + ${(i * 0.035).toFixed(3)}s)` }} />
      ))}
    </svg>
  )
}
