# 部署到 WordPress

有兩個網站，分開打包、分開上傳：

- **brobridge.com/demos/**：一般客戶用，製造業、醫院、元件總覽等，不含秀傳。
- **brobridge.com/showchwan/**：只給秀傳醫院，首頁只有秀傳情境和元件總覽。

兩個首頁是同一份程式（`hub/src/home.tsx`），build 時用 `VITE_SITE=showchwan` 切換內容；
/demos/ 的檔案裡不會出現秀傳的字。

## 產生上傳檔

    ./build.sh

會重新 build 兩個網站，產生兩個 zip：

- `release/plasma-demos-wordpress.zip`（內容在 `release/demos/`）
- `release/plasma-showchwan-wordpress.zip`（內容在 `release/showchwan/`）

第一個 zip解壓後的 `demos/` 就對應主機上的 `httpdocs/demos/`：

| 網址 | 內容 | 原始碼 |
|---|---|---|
| `/demos/` | 入口頁 | `hub/`(React) |
| `/demos/tech/` | Plasma 元件總覽 | `hub/`(React) |
| `/demos/hospital/` | 醫院資料隔離 | repo 根目錄(React) |
| `/demos/ui-hospital/` | 醫院 UI 操作 demo | `ui-demo/`(React) |
| `/demos/views/` | View 與 Materialized View 圖解 | `views-demo/`(React,資料隔離 demo 的引擎) |
| `/demos/ops/` | Plasma 操作 demo(跟官網 bbg-web 同一份) | `ops-demo/`(React) |
| `/demos/powerbi/` | Plasma × Power BI 簡報(對外版) | `powerbi/`(靜態 HTML) |
| `/demos/manufacturing/` | 製造業資料隔離 | 另一個 private repo `plasma-data-isolation-demo`,需放在本 repo 旁邊 |

所有頁面都加了 `noindex, nofollow`，搜尋引擎不會收錄。入口頁不要放進官網選單。

## 上傳（WP File Manager）

1. 後台 **外掛 → 安裝外掛**，裝 WP File Manager 並啟用（用完記得停用、刪除）。
2. 進 `httpdocs/demos/`，把裡面舊的東西全部刪掉。
3. 回到 `httpdocs/`，上傳 `plasma-demos-wordpress.zip`，右鍵 **Extract files from archive**。
   解壓會直接產生（或覆蓋）`demos/` 資料夾。確認 `httpdocs/demos/index.html` 存在。
4. 刪掉 zip，開 https://brobridge.com/demos/ 逐一點五張卡確認。
5. 畫面沒更新：**LiteSpeed Cache → 清除所有快取**。

demo 的 JS／CSS 檔名帶雜湊，更新時整個資料夾換掉即可，瀏覽器不會吃到舊快取。

## 秀傳網站（brobridge.com/showchwan/）

| 網址 | 內容 | 原始碼 |
|---|---|---|
| `/showchwan/` | 秀傳專用入口頁 | `hub/`(React,`VITE_SITE=showchwan`) |
| `/showchwan/tech/` | Plasma 元件總覽 | `hub/`(React) |
| `/showchwan/demo/` | 秀傳醫院跨院資料整合 | `showchwan/`(React) |

上傳方式同上，但是在 `httpdocs/` 上傳 `plasma-showchwan-wordpress.zip` 並解壓，會產生（或覆蓋）`showchwan/` 資料夾。
不要上傳到 `demos/` 裡。舊版放在 `httpdocs/demos/showchwan/` 的秀傳要刪掉。
