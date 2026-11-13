// 秀傳 demo 的六個情境:只示範 A 分院,最後由總院工作區做跨院交換。
// 每個情境:標題、目的(開場標題卡與下方說明)、完成後的一句總結、子步驟清單(情境圖上打勾)
export interface ScenarioDef {
  title: string
  goal: string
  done: string
  subs: string[]
  main: "plasma" | "scn" // 這個情境預設哪個畫面放大
}

export const STEPS: ScenarioDef[] = [
  {
    title: "現況：總院統計不出來",
    goal: "四家分院的資料庫各自獨立、欄位寫法都不同，總院想知道「各分院的護理師有誰」，兜不起來。",
    done: "問題很清楚：不是沒有資料，是四家分院的資料接不起來、也看不懂彼此。",
    subs: ["四家分院各有一套資料庫", "同樣是護理師，四家寫法都不同", "總院統計不出來"],
    main: "scn",
  },
  {
    title: "登入 Plasma",
    goal: "先從 A 分院開始：用 A 分院的帳號登入 Plasma。",
    done: "已登入 Plasma，接下來把 A 分院的資料庫接上來。",
    subs: ["輸入帳號密碼", "登入"],
    main: "plasma",
  },
  {
    title: "A 分院接上 Plasma",
    goal: "把 A 分院的資料庫以唯讀方式接上 Plasma，不搬資料、不動原本的系統。",
    done: "A 分院的資料庫已經唯讀接上 Plasma，不搬資料，也不動原本的系統。",
    subs: ["新增 A 分院資料庫（唯讀）", "驗證連線並儲存"],
    main: "plasma",
  },
  {
    title: "讓 AI 看懂 A 分院的欄位",
    goal: "上傳 A 分院的系統文件，Plasma 的 AI 讀完後，就知道 NRS_NAME、TITLE_CD 這些代碼是什麼意思。",
    done: "AI 看懂了 A 分院的欄位：NRS_NAME 是護理師姓名，TITLE_CD = N02 代表護理師。",
    subs: ["開啟知識庫", "上傳系統規格書、資料字典、職稱代碼表", "AI 讀完文件", "每個欄位都有了說明"],
    main: "plasma",
  },
  {
    title: "用問的整理資料",
    goal: "不用寫程式，直接問 AI Agent。它透過 Plasma 讀 A 分院的資料，整理出護理人員名冊。",
    done: "AI Agent 用一句話就整理好 A 分院的護理人員名冊，全程只讀取，不影響正式資料庫。",
    subs: ["向 AI Agent 提問", "AI 查資料表、對照欄位說明", "整理成護理人員名冊"],
    main: "plasma",
  },
  {
    title: "上架成資料產品",
    goal: "把整理好的名冊發布成資料產品。來源更新，名冊就跟著更新，需要的單位可以直接取用。",
    done: "「A 分院護理人員名冊」已上架成資料產品，隨時可以拿來用。",
    subs: ["新增資料產品", "命名並選擇來源", "發布"],
    main: "plasma",
  },
  {
    title: "跨院交換：總院彙整",
    goal: "資料整理好之後，就能跨院區交換：B、C、D 分院照同樣步驟完成，總院直接取用四家的資料產品，一次彙整。",
    done: "總院直接拿到四家分院同一格式的名冊，各分院護理師人數一查就有：合計 812 人（示意）。",
    subs: ["B、C、D 分院完成同樣步驟", "切換到總院", "取用四家分院的資料產品", "一次查出各分院人數"],
    main: "plasma",
  },
]
