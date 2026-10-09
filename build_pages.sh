#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="$ROOT/dist"

rm -rf "$DIST"
mkdir -p "$DIST/assets/images" "$DIST/images" "$DIST/lib" "$DIST/routes" "$DIST/controller"

cp "$ROOT/frontend/views/index.html" "$DIST/index.html"
cp "$ROOT/frontend/views/login.html" "$DIST/login.html"
cp "$ROOT/frontend/views/login.html" "$DIST/register.html"
cp "$ROOT/frontend/views/diagram-generator" "$DIST/generador.html"
cp "$ROOT/frontend/views/demo-generator" "$DIST/demo.html"

cp -r "$ROOT/frontend/lib/." "$DIST/lib"/
cp -r "$ROOT/frontend/routes/." "$DIST/routes"/
cp -r "$ROOT/frontend/controller/." "$DIST/controller"/

cp "$ROOT/assets/images/diagrama.webp" "$DIST/assets/images/diagrama.webp"
cp "$ROOT/assets/images/hero-bg.webp" "$DIST/assets/images/hero-bg.webp"
cp "$ROOT/assets/images/fondo.webp" "$DIST/images/fondo.webp"

echo "Build completo en $DIST"