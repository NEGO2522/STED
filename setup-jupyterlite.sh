#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# setup-jupyterlite.sh
#
# Run ONCE from the project root to build JupyterLite and place it
# in public/jupyterlite/ so Vite/Vercel can serve it as static assets.
#
# Usage:
#   chmod +x setup-jupyterlite.sh
#   ./setup-jupyterlite.sh
#
# Requirements:
#   Python 3.8+   →  already installed
#   pip install jupyterlite-core jupyterlite-pyodide-kernel
# ─────────────────────────────────────────────────────────────────────
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD_TMP="$PROJECT_ROOT/_jlite_build"
OUTPUT="$PROJECT_ROOT/public/jupyterlite"

echo "📦 Installing JupyterLite (Python packages)…"
pip3 install --quiet jupyterlite-core jupyterlite-pyodide-kernel

# Create piplite configuration for additional packages
echo "📦 Configuring additional packages (seaborn, scipy)…"
mkdir -p "$BUILD_TMP/piplite"
cat > "$BUILD_TMP/piplite/piplite.json" << 'EOF'
{
  "packages": [
    "seaborn",
    "scipy"
  ]
}
EOF

echo "� Building JupyterLite static site…"
mkdir -p "$BUILD_TMP"
cd "$BUILD_TMP"
jupyter lite build --output-dir "$BUILD_TMP/dist" --piplite-wheels-dir "$BUILD_TMP/piplite"
cd "$PROJECT_ROOT"

echo "📁 Copying to public/jupyterlite/…"
mkdir -p "$OUTPUT"
cp -r "$BUILD_TMP/dist/." "$OUTPUT/"

echo ""
echo "✅  Done!  JupyterLite is now at public/jupyterlite/"
echo "    Vite will serve it at  /jupyterlite/lab/index.html"
echo ""
echo "    You can now start the dev server:  npm run dev"
