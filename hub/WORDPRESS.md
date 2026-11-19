# 部署到 WordPress

有兩個網站，分開打包、分開上傳：

- **brobridge.com/demos/**：一般客戶用，製造業、醫院、元件總覽等，不含秀傳。
- **brobridge.com/showchwan/**：只給秀傳醫院，首頁只有秀傳情境和元件總覽。

兩個首頁是同一份程式（`hub/src/home.tsx`），build 時用 `VITE_SITE=showchwan` 切換內容；
/demos/ 的檔案裡不會出現秀傳的字。

## 產生上傳檔

    ./build.sh

會重新 build 兩個網站，放在 repo 根目錄的 `上傳WordPress/`（不進 git）：

| 檔案 | 內容 |
|---|---|
| `一般客戶/`、`一般客戶.zip` | 入口頁、元件總覽、製造業、醫院、View 圖解、UI 操作、Power BI（不含秀傳） |
| `秀傳醫院/`、`秀傳醫院.zip` | 秀傳專用入口頁、秀傳情境（`demo/`）、Oracle 減壓（`oracle/`）、元件總覽（`tech/`） |
| `秀傳Oracle減壓/`、`秀傳Oracle減壓.zip` | Oracle 減壓故事單獨一頁，不需要入口頁；左上角 logo 連回官網首頁 |

zip 裡直接是網站檔案，沒有外層資料夾；網站全用相對路徑，放在哪個網址底下都能用。

## 上傳（WP File Manager）

兩個網站各做一次：

1. 後台 **外掛 → 安裝外掛**，裝 WP File Manager 並啟用（用完記得停用、刪除）。
2. 在 `httpdocs/` 底下進到要放的資料夾（例如一般客戶用 `demos/`，秀傳用 `showchwan/`；沒有就新建）。
   裡面舊的東西全部刪掉。
3. 在這個資料夾裡上傳對應的 zip，右鍵 **Extract files from archive**。確認這個資料夾裡有 `index.html`。
4. 刪掉 zip，開網址逐一點首頁的卡片確認。
5. 畫面沒更新：**LiteSpeed Cache → 清除所有快取**。

Oracle 減壓單獨一頁：照上面的步驟，在 `httpdocs/` 底下開一個新資料夾（例如 `showchwan-oracle/`），
上傳 `秀傳Oracle減壓.zip` 解壓縮即可，網址就是 brobridge.com/showchwan-oracle/。

秀傳不要放進一般客戶的資料夾裡；舊版放在 `demos/showchwan/` 的秀傳要刪掉。
demo 的 JS／CSS 檔名帶雜湊，更新時整個資料夾換掉即可，瀏覽器不會吃到舊快取。

所有頁面都加了 `noindex, nofollow`，搜尋引擎不會收錄。入口頁不要放進官網選單。
