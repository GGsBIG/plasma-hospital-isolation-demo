#!/usr/bin/env bash
# 產生 WordPress 用的靜態 HTML:入口頁、技術頁與四個 demo 收進 release/demos/,再打包成 zip。
# 解壓後的 demos/ 直接對應主機上的 httpdocs/demos/。release/ 不進 git。
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"   # repo/hub
REPO="$(cd "$HERE/.." && pwd)"           # plasma-hospital-isolation-demo
DEMOS="$(cd "$REPO/.." && pwd)"          # 中科院版在 repo 外(private repo)
OUT="$HERE/release/demos"
rm -rf "$HERE/release" && mkdir -p "$OUT"

need() { [ -d "$1/node_modules" ] || (cd "$1" && npm ci --silent); }

echo "› 入口頁與技術頁"
need "$HERE";              (cd "$HERE" && npx tsc -b && npx vite build --outDir "$OUT" --emptyOutDir --logLevel warn)
echo "› 中科院版"
need "$DEMOS/plasma-data-isolation-demo"
(cd "$DEMOS/plasma-data-isolation-demo" && npx tsc -b && npx vite build --base ./ --outDir "$OUT/ncsist" --emptyOutDir --logLevel warn)
echo "› 醫院版"
need "$REPO";              (cd "$REPO" && npx tsc -b && npx vite build --base ./ --outDir "$OUT/hospital" --emptyOutDir --logLevel warn)
echo "› 醫院 UI 操作"
need "$REPO/ui-demo";      (cd "$REPO/ui-demo" && npx tsc -b && npx vite build --base ./ --outDir "$OUT/ui-hospital" --emptyOutDir --logLevel warn)
echo "› Plasma 操作 demo(官網同一份)"
need "$REPO/ops-demo";     (cd "$REPO/ops-demo" && npx tsc -b && npx vite build --base ./ --outDir "$OUT/ops" --emptyOutDir --logLevel warn)
echo "› Power BI 簡報"
mkdir -p "$OUT/powerbi" && cp -R "$REPO/powerbi/." "$OUT/powerbi/"

# 所有頁面都不讓搜尋引擎收錄
for f in "$OUT"/*/index.html; do
  grep -q 'name="robots"' "$f" || perl -0pi -e 's/<head>/<head>\n    <meta name="robots" content="noindex, nofollow">/' "$f"
done
find "$OUT" -name .DS_Store -delete

(cd "$HERE/release" && zip -qr plasma-demos-wordpress.zip demos)
du -sh "$OUT" "$HERE/release/plasma-demos-wordpress.zip"
