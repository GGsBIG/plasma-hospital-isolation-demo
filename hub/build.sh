#!/usr/bin/env bash
# 把入口頁、技術頁與四個 demo 收成 release/demos/，並打包成 WordPress 用的 zip。
# 解壓後的 demos/ 直接對應主機上的 httpdocs/demos/。
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DEMOS="$(cd "$HERE/../.." && pwd)"
OUT="$HERE/release/demos"
rm -rf "$HERE/release" && mkdir -p "$OUT"

echo "› 中科院版"
(cd "$DEMOS/plasma-data-isolation-demo" && npx tsc -b && npx vite build --base ./ --outDir "$OUT/ncsist" --emptyOutDir --logLevel warn)
echo "› 醫院版"
(cd "$DEMOS/plasma-hospital-isolation-demo" && npx tsc -b && npx vite build --base ./ --outDir "$OUT/hospital" --emptyOutDir --logLevel warn)
echo "› 醫院 UI 操作"
(cd "$DEMOS/plasma-ui-demo-hospital" && npx tsc -b && npx vite build --base ./ --outDir "$OUT/ui-hospital" --emptyOutDir --logLevel warn)
echo "› Power BI 簡報（對外版）"
mkdir -p "$OUT/powerbi/Plasma-BI"
cp "$DEMOS/plasma-bi-powerbi/plasma-bi-簡報-對外.html" "$OUT/powerbi/index.html"
cp "$DEMOS/plasma-bi-powerbi/Plasma-BI/"*.png "$OUT/powerbi/Plasma-BI/"
echo "› 入口頁與技術頁"
cp "$HERE/index.html" "$OUT/"
cp -R "$HERE/assets" "$HERE/tech" "$OUT/"

# 所有頁面都不讓搜尋引擎收錄
for f in "$OUT"/*/index.html; do
  grep -q 'name="robots"' "$f" || perl -0pi -e 's/<head>/<head>\n    <meta name="robots" content="noindex, nofollow">/' "$f"
done
find "$OUT" -name .DS_Store -delete

(cd "$HERE/release" && zip -qr plasma-demos-wordpress.zip demos)
du -sh "$OUT" "$HERE/release/plasma-demos-wordpress.zip"
