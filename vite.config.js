import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    headers: {
      // Required for JupyterLite / Pyodide SharedArrayBuffer support
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },

  preview: {
    headers: {
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
});
