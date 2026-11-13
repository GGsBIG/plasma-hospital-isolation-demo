// 情境圖固定用桌機座標畫,再整張等比縮放放進主畫面或右下角小畫面,所以圖示不另外放大
import type { NodeKind } from "./types"
export const iconScale = (_kind: NodeKind) => 1
