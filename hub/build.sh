#!/usr/bin/env bash
# 產生 WordPress 用的靜態 HTML,兩個網站分開放、分開上傳(repo 根目錄的 上傳WordPress/,不進 git):
#   上傳WordPress/一般客戶/ + 一般客戶.zip  → 入口頁、元件總覽、製造業、醫院、K8s Sentinel……(不含秀傳)
#   上傳WordPress/秀傳醫院/ + 秀傳醫院.zip  → 秀傳專用首頁、秀傳情境、Oracle 減壓故事、元件總覽
# zip 裡直接是網站檔案(沒有外層資料夾):進到 WordPress 上要放的那個資料夾,上傳後解壓即可,
# 網站全用相對路徑,放在哪個網址底下都能用。hub/release/ 是中間產物(開發伺服器也讀它)。
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"   # repo/hub
REPO="$(cd "$HERE/.." && pwd)"           # plasma-hospital-isolation-demo
# 製造業版在另一個 private repo:預設找本 repo 旁邊,找不到就用 ~/Brobridge/demos/ 底下那份;也可以用 MFG=路徑 指定
MFG="${MFG:-$REPO/../plasma-data-isolation-demo}"
[ -d "$MFG" ] || MFG="$HOME/Brobridge/demos/plasma-data-isolation-demo"
[ -d "$MFG" ] || { echo "找不到製造業版 repo(plasma-data-isolation-demo),用 MFG=路徑 ./build.sh 指定" >&2; exit 1; }
OUT="$HERE/release/demos"
SC="$HERE/release/showchwan"
rm -rf "$HERE/release" && mkdir -p "$OUT" "$SC"

need() { [ -d "$1/node_modules" ] || (cd "$1" && npm ci --silent); }

echo "› 入口頁與技術頁"
need "$HERE";              (cd "$HERE" && npx tsc -b && npx vite build --outDir "$OUT" --emptyOutDir --logLevel warn)
echo "› 製造業版"
need "$MFG"
(cd "$MFG" && npx tsc -b && npx vite build --base ./ --outDir "$OUT/manufacturing" --emptyOutDir --logLevel warn)
echo "› 醫院版"
need "$REPO";              (cd "$REPO" && npx tsc -b && npx vite build --base ./ --outDir "$OUT/hospital" --emptyOutDir --logLevel warn)
echo "› 醫院 UI 操作"
need "$REPO/ui-demo";      (cd "$REPO/ui-demo" && npx tsc -b && npx vite build --base ./ --outDir "$OUT/ui-hospital" --emptyOutDir --logLevel warn)
echo "› Plasma 操作 demo(官網同一份)"
need "$REPO/ops-demo";     (cd "$REPO/ops-demo" && npx tsc -b && npx vite build --base ./ --outDir "$OUT/ops" --emptyOutDir --logLevel warn)
echo "› View 與 Materialized View 圖解"
need "$REPO/views-demo";   (cd "$REPO/views-demo" && npx tsc -b && npx vite build --base ./ --outDir "$OUT/views" --emptyOutDir --logLevel warn)
echo "› K8s Sentinel 情境"
need "$REPO/sentinel";     (cd "$REPO/sentinel" && npx tsc -b && npx vite build --base ./ --outDir "$OUT/sentinel" --emptyOutDir --logLevel warn)
echo "› Power BI 簡報"
mkdir -p "$OUT/powerbi" && cp -R "$REPO/powerbi/." "$OUT/powerbi/"

echo "› 秀傳網站:首頁、元件總覽、秀傳情境"
(cd "$HERE" && VITE_SITE=showchwan npx vite build --outDir "$SC" --emptyOutDir --logLevel warn)
need "$REPO/showchwan";    (cd "$REPO/showchwan" && npx tsc -b && npx vite build --base ./ --outDir "$SC/demo" --emptyOutDir --logLevel warn)
echo "› 秀傳網站:Oracle 減壓故事(獨立的另一版)"
need "$REPO/showchwan-oracle"; (cd "$REPO/showchwan-oracle" && npx tsc -b && npx vite build --base ./ --outDir "$SC/oracle" --emptyOutDir --logLevel warn)

# 所有頁面都不讓搜尋引擎收錄
for f in "$OUT"/*/index.html "$SC"/*/index.html; do
  grep -q 'name="robots"' "$f" || perl -0pi -e 's/<head>/<head>\n    <meta name="robots" content="noindex, nofollow">/' "$f"
done
find "$HERE/release" -name .DS_Store -delete

UP="$REPO/上傳WordPress"
rm -rf "$UP" && mkdir -p "$UP"
cp -R "$OUT" "$UP/一般客戶" && cp -R "$SC" "$UP/秀傳醫院"
(cd "$UP/一般客戶" && zip -qr ../一般客戶.zip .)
(cd "$UP/秀傳醫院" && zip -qr ../秀傳醫院.zip .)
du -sh "$UP"/*
