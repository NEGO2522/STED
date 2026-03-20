#!/usr/bin/env node
/**
 * setup-jupyterlite.js
 * Run ONCE from the project root:  node setup-jupyterlite.js
 *
 * This script builds JupyterLite via Python and copies the output
 * into public/jupyterlite/ so Vite serves it as static assets.
 *
 * Prerequisites (run once):
 *   pip install jupyterlite-core jupyterlite-pyodide-kernel
 */

const { execSync, spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const OUT_DIR    = path.join(__dirname, 'public', 'jupyterlite');
const BUILD_DIR  = path.join(__dirname, '_jupyterlite_build');

console.log('🔧  Building JupyterLite (this takes ~30-60 s the first time)…');

// 1. Build
fs.mkdirSync(BUILD_DIR, { recursive: true });
const result = spawnSync(
  'jupyter',
  ['lite', 'build', '--output-dir', path.join(BUILD_DIR, 'dist')],
  { cwd: BUILD_DIR, stdio: 'inherit' }
);
if (result.status !== 0) {
  console.error('❌  jupyter lite build failed. Make sure you ran:');
  console.error('    pip install jupyterlite-core jupyterlite-pyodide-kernel');
  process.exit(1);
}

// 2. Copy dist → public/jupyterlite
console.log('📦  Copying build output to public/jupyterlite/ …');
fs.mkdirSync(OUT_DIR, { recursive: true });
execSync(`cp -r "${path.join(BUILD_DIR, 'dist', '.')}" "${OUT_DIR}"`, { stdio: 'inherit' });

console.log('✅  Done!  JupyterLite is now at public/jupyterlite/');
console.log('    The iframe src is: /jupyterlite/lab/index.html');
