#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="$ROOT/dist"

rm -rf "$DIST"
mkdir -p "$DIST"

cp "$ROOT/frontend/views/index.html" "$DIST/index.html"
cp "$ROOT/frontend/views/login.html" "$DIST/login.html"
cp "$ROOT/frontend/views/diagram-generator" "$DIST/generador.html"
cp "$ROOT/frontend/views/demo-generator" "$DIST/demo.html"

cp -r "$ROOT/frontend/lib" "$DIST/lib"
cp -r "$ROOT/frontend/routes" "$DIST/routes"
cp -r "$ROOT/frontend/controller" "$DIST/controller"
cp -r "$ROOT/assets" "$DIST/assets"
cp -r "$ROOT/assets/images" "$DIST/images"

cat > "$DIST/_redirects" <<'EOF'
/login     /login.html     200
/register  /login.html     200
/generador /generador.html 200
/demo      /demo.html      200
EOF

echo "Build completo en $DIST"