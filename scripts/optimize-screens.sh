#!/bin/bash
# Makes the web copies of screens/*.png in screens/web/, as JPEG: macOS's AVIF encoder writes files some Chrome setups draw transparent.
# Run on a Mac after adding or replacing a screenshot: ./scripts/optimize-screens.sh
set -euo pipefail
cd "$(dirname "$0")/../screens"
rm -rf web
mkdir web
for png in *.png; do
  name="${png%.png}"
  case "$name" in *_old) continue ;; esac
  # Portrait screens show narrow on the page.
  case "$name" in iphone|closed) widths="400 800" ;; *) widths="800 1600" ;; esac
  for w in $widths; do
    sips -s format jpeg -s formatOptions 82 --resampleWidth "$w" "$png" --out "web/$name-$w.jpg" >/dev/null
  done
  echo "$name: $widths"
done
