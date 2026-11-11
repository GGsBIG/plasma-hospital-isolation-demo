# Plasma View 與 Materialized View 圖解

沿用資料隔離 demo 的引擎(等角舞台、流動光點、捲動與切換列、自動播放),右上角的切換改成 View ↔ Materialized View,
說明欄兩段分別是 View 與 Materialized View。情境與畫面內容在 `src/scenes.ts`、節點在 `src/data.ts`。

1. View 是什麼(開場)
2. 執行時機:View 每次查詢都執行 SQL;MView 同步時執行一次,查詢讀快照
3. 查詢量:四個系統同時查,View 讓來源負載升高;MView 都讀同一份快照
4. 資料新鮮度:View 查詢當下;MView 要等下次同步
5. 同步方式:排程、手動、觸發器;同步失敗仍讀上一份快照(沒有切換)
6. 怎麼選:對照表(手機版只留文字)

引擎改動:切換後的那一側(SceneDef.plasma)也可以有 phases 分幕輪播(`src/phase.ts`、`src/timeline.ts`)。

    npm install
    npm run dev
