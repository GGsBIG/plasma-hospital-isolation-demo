#!/usr/bin/env bash
# 產生 WordPress 用的靜態 HTML,兩個網站分開打包、分開上傳:
#   release/plasma-demos-wordpress.zip     → 解壓到 httpdocs/,得到 demos/(入口頁、元件總覽、製造業、醫院……,不含秀傳)
#   release/plasma-showchwan-wordpress.zip → 解壓到 httpdocs/,得到 showchwan/(秀傳專用首頁、秀傳情境、元件總覽)
# release/ 不進 git。
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
echo "› Power BI 簡報"
mkdir -p "$OUT/powerbi" && cp -R "$REPO/powerbi/." "$OUT/powerbi/"

echo "› 秀傳網站:首頁、元件總覽、秀傳情境"
(cd "$HERE" && VITE_SITE=showchwan npx vite build --outDir "$SC" --emptyOutDir --logLevel warn)
need "$REPO/showchwan";    (cd "$REPO/showchwan" && npx tsc -b && npx vite build --base ./ --outDir "$SC/demo" --emptyOutDir --logLevel warn)

# 所有頁面都不讓搜尋引擎收錄
for f in "$OUT"/*/index.html "$SC"/*/index.html; do
  grep -q 'name="robots"' "$f" || perl -0pi -e 's/<head>/<head>\n    <meta name="robots" content="noindex, nofollow">/' "$f"
done
find "$HERE/release" -name .DS_Store -delete

(cd "$HERE/release" && zip -qr plasma-demos-wordpress.zip demos && zip -qr plasma-showchwan-wordpress.zip showchwan)
du -sh "$OUT" "$SC" "$HERE/release/"*.zip
