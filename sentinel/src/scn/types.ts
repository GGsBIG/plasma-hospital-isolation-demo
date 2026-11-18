// sentinel:K8s Sentinel 本身;app:叢集裡的服務(Pod);db:資料庫;person:人(顧客、攻擊者);
// file:匯出的檔案;downstream:映像檔倉庫(Registry)
export type NodeKind = "db" | "downstream" | "app" | "sentinel" | "file" | "person"

export interface Pos { x: number; y: number }   // 舞台座標 px
