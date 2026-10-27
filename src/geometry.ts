import type { NodeKind, Pos } from "./types"
import { iconScale } from "./layout"

// 節點整體放大倍率(平台與上面的裝飾一起縮放)
export const NODE_SCALE = 1.3

// 等角平台尺寸(未乘倍率):a = 頂面半寬(頂面半高 = a/2),t = 厚度
const BASE_SIZE: Record<NodeKind, { a: number; t: number }> = {
  db: { a: 54, t: 12 },
  downstream: { a: 48, t: 10 },
  app: { a: 54, t: 12 },
  plasma: { a: 104, t: 18 },
  kb: { a: 50, t: 12 },
  file: { a: 50, t: 12 },
  serving: { a: 54, t: 12 },
}

export const SIZE = Object.fromEntries(
  Object.entries(BASE_SIZE).map(([k, { a, t }]) => [k, { a: a * NODE_SCALE, t: t * NODE_SCALE }]),
) as Record<NodeKind, { a: number; t: number }>

// 實際平台尺寸:手機緊湊版時放大(見 layout.ts 的 iconScale)
export function sizeOf(kind: NodeKind) {
  const s = SIZE[kind]
  const k = iconScale(kind)
  return { a: s.a * k, t: s.t * k }
}

// 兩節點間的三次貝茲曲線:水平為主時接左右角,垂直為主時接上下角。
// 手機直拿的流向是上 → 下(verticalFlow),只要上下有落差就接上下角
export function edgePath(from: Pos, fk: NodeKind, to: Pos, tk: NodeKind, verticalFlow = false): string {
  const f = sizeOf(fk)
  const t = sizeOf(tk)
  const dx = to.x - from.x
  const vertical = verticalFlow ? Math.abs(to.y - from.y) >= 60 : Math.abs(dx) < 60
  if (vertical) {
    const down = to.y > from.y
    const y1 = from.y + (down ? f.a / 2 + f.t : -f.a / 2)
    const y2 = to.y + (down ? -t.a / 2 : t.a / 2 + t.t)
    const m = (y2 - y1) * 0.5
    return `M ${from.x} ${y1} C ${from.x} ${y1 + m} ${to.x} ${y2 - m} ${to.x} ${y2}`
  }
  const dir = Math.sign(dx)
  const x1 = from.x + dir * f.a
  const x2 = to.x - dir * t.a
  const m = (x2 - x1) * 0.5
  return `M ${x1} ${from.y} C ${x1 + m} ${from.y} ${x2 - m} ${to.y} ${x2} ${to.y}`
}
