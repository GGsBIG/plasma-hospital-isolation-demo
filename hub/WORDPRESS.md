# 部署到 WordPress（brobridge.com/demos/）

## 產生上傳檔

    ./build.sh

會重新 build 入口頁、技術頁與四個 demo，收進 `release/demos/`，打包成
`release/plasma-demos-wordpress.zip`。解壓後的 `demos/` 就對應主機上的 `httpdocs/demos/`：

| 網址 | 內容 | 原始碼 |
|---|---|---|
| `/demos/` | 入口頁 | `hub/`(React) |
| `/demos/tech/` | Plasma 元件總覽 | `hub/`(React) |
| `/demos/hospital/` | 醫院資料隔離 | repo 根目錄(React) |
| `/demos/ui-hospital/` | 醫院 UI 操作 demo | `ui-demo/`(React) |
| `/demos/ops/` | Plasma 操作 demo(跟官網 bbg-web 同一份) | `ops-demo/`(React) |
| `/demos/powerbi/` | Plasma × Power BI 簡報(對外版) | `powerbi/`(靜態 HTML) |
| `/demos/ncsist/` | 中科院資料隔離 | 另一個 private repo `plasma-data-isolation-demo`,需放在本 repo 旁邊 |

所有頁面都加了 `noindex, nofollow`，搜尋引擎不會收錄。入口頁不要放進官網選單。

## 上傳（WP File Manager）

1. 後台 **外掛 → 安裝外掛**，裝 WP File Manager 並啟用（用完記得停用、刪除）。
2. 進 `httpdocs/demos/`，把裡面舊的東西全部刪掉。
3. 回到 `httpdocs/`，上傳 `plasma-demos-wordpress.zip`，右鍵 **Extract files from archive**。
   解壓會直接產生（或覆蓋）`demos/` 資料夾。確認 `httpdocs/demos/index.html` 存在。
4. 刪掉 zip，開 https://brobridge.com/demos/ 逐一點五張卡確認。
5. 畫面沒更新：**LiteSpeed Cache → 清除所有快取**。

demo 的 JS／CSS 檔名帶雜湊，更新時整個資料夾換掉即可，瀏覽器不會吃到舊快取。
