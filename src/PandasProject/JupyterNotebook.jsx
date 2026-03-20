import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ref, update, get } from 'firebase/database';
import { db } from '../firebase';

// ──────────────────────────────────────────────────────────────────────
//  JupyterNotebook.jsx
//
//  Reads notebook code directly from JupyterLite via postMessage.
//  The iframe runs a listener that reads IndexedDB (localforage) and
//  posts the notebook JSON back to the parent — no download needed.
//
//  Flow:
//    1. JupyterLite loads in iframe
//    2. Parent sends  { type: 'STED_GET_NOTEBOOK' }  via postMessage
//    3. Injected script inside iframe reads IndexedDB → posts back
//       { type: 'STED_NOTEBOOK_DATA', notebook: {...} }
//    4. Parent extracts code cells → pushes to Statement/AI
//    5. Auto-polls every 20 s; manual "Sync" button also available
// ──────────────────────────────────────────────────────────────────────

const JUPYTERLITE_LAB  = '/jupyterlite/lab/index.html';
const POLL_INTERVAL_MS = 20000;

/** Concatenate all code-cell sources into one string, including outputs */
function codeFromNotebook(nb) {
  console.log('[STED] codeFromNotebook input:', nb);
  
  if (!nb) {
    console.log('[STED] No notebook provided');
    return '';
  }
  
  // JupyterLite may store notebook differently - try multiple paths
  let cells = nb.cells;
  
  if (!cells && nb.content) {
    cells = nb.content.cells;
    console.log('[STED] Found cells in nb.content');
  }
  if (!cells && nb.data) {
    cells = nb.data.cells;
    console.log('[STED] Found cells in nb.data');
  }
  
  if (!Array.isArray(cells) && typeof nb === 'string') {
    try {
      const parsed = JSON.parse(nb);
      cells = parsed.cells || parsed.content?.cells || parsed.data?.cells;
      console.log('[STED] Parsed notebook from string, cells:', cells?.length);
    } catch (e) {
      console.log('[STED] Failed to parse notebook string');
      return '';
    }
  }
  
  if (!Array.isArray(cells)) {
    console.log('[STED] No valid cells array found. Available keys:', Object.keys(nb));
    return '';
  }
  
  console.log('[STED] Processing', cells.length, 'cells');
  
  const code = cells
    .filter(c => c.cell_type === 'code')
    .map((c, idx) => {
      const source = Array.isArray(c.source) ? c.source.join('') : c.source || '';
      
      // Include outputs if present
      let outputText = '';
      if (c.outputs && Array.isArray(c.outputs) && c.outputs.length > 0) {
        const outputs = c.outputs.map(out => {
          // Handle different output types
          if (out.output_type === 'stream' && out.text) {
            return Array.isArray(out.text) ? out.text.join('') : out.text;
          }
          if (out.output_type === 'execute_result' && out.data?.['text/plain']) {
            return Array.isArray(out.data['text/plain']) 
              ? out.data['text/plain'].join('') 
              : out.data['text/plain'];
          }
          if (out.output_type === 'error') {
            return `ERROR: ${out.ename || 'Error'}: ${out.evalue || out.traceback?.join('\n') || 'Unknown error'}`;
          }
          return '';
        }).filter(s => s.trim()).join('\n');
        
        if (outputs) {
          outputText = '\n# --- Output ---\n' + outputs;
        }
      }
      
      console.log(`[STED] Cell ${idx}: type=${c.cell_type}, source length=${source.length}, has output=${!!outputText}`);
      return source + outputText;
    })
    .filter(s => s.trim())
    .join('\n\n');
    
  console.log('[STED] Final code length:', code.length);
  return code;
}

// ─────────────────────────────────────────────────────────────────────
//  Script injected into the iframe via a <script> in the JupyterLite
//  index.html — this is the bridge that reads IndexedDB and posts back.
//
//  JupyterLite stores files in IndexedDB using localforage.
//  DB name:  "JupyterLite Storage - /"
//  Store:    "files"   (BrowserStorageDrive)
//  Keys are the file paths, e.g. "notebook.ipynb"
// ─────────────────────────────────────────────────────────────────────
const BRIDGE_SCRIPT = `
(function() {
  if (window.__STED_BRIDGE_INSTALLED__) return;
  window.__STED_BRIDGE_INSTALLED__ = true;

  // Open the JupyterLite contents IndexedDB
  async function readNotebookFromIDB(filename) {
    return new Promise((resolve, reject) => {
      // JupyterLite Storage DB name includes the baseUrl
      const baseUrl = (window.location.pathname.replace(/\\/lab.*/, '') || '/').replace(/\\/$/, '') + '/';
      const dbName  = 'JupyterLite Storage - ' + baseUrl;

      const req = indexedDB.open(dbName);
      req.onerror = () => reject(new Error('Cannot open IndexedDB: ' + dbName));
      req.onsuccess = (e) => {
        const db = e.target.result;
        const storeNames = Array.from(db.objectStoreNames);

        // Find the files store (could be "files" or similar)
        const filesStore = storeNames.find(s => s === 'files') || storeNames[0];
        if (!filesStore) { reject(new Error('No object store found in ' + dbName)); return; }

        const tx  = db.transaction(filesStore, 'readonly');
        const store = tx.objectStore(filesStore);

        // Try exact key first, then search all keys for .ipynb files
        const getReq = store.get(filename);
        getReq.onsuccess = (e) => {
          if (e.target.result !== undefined) {
            resolve({ name: filename, content: e.target.result });
          } else {
            // Scan all keys for any .ipynb file
            const allReq = store.getAllKeys();
            allReq.onsuccess = (ke) => {
              const keys = ke.target.result;
              const ipynbKeys = keys.filter(k => String(k).endsWith('.ipynb'));
              if (ipynbKeys.length === 0) {
                reject(new Error('No .ipynb files found in store. Keys: ' + keys.slice(0,10).join(', ')));
                return;
              }
              // Get the first .ipynb file found
              const firstKey = ipynbKeys[0];
              const getFirst = store.get(firstKey);
              getFirst.onsuccess = (fe) => resolve({ name: firstKey, content: fe.target.result });
              getFirst.onerror = () => reject(new Error('Cannot read file: ' + firstKey));
            };
            allReq.onerror = () => reject(new Error('Cannot list keys in store'));
          }
        };
        getReq.onerror = () => reject(new Error('Cannot get file: ' + filename));
      };
    });
  }

  // List all .ipynb files in the DB
  async function listNotebooks() {
    return new Promise((resolve) => {
      const baseUrl = (window.location.pathname.replace(/\\/lab.*/, '') || '/').replace(/\\/$/, '') + '/';
      const dbName  = 'JupyterLite Storage - ' + baseUrl;
      const req = indexedDB.open(dbName);
      req.onerror = () => resolve([]);
      req.onsuccess = (e) => {
        const db = e.target.result;
        const storeNames = Array.from(db.objectStoreNames);
        const filesStore = storeNames.find(s => s === 'files') || storeNames[0];
        if (!filesStore) { resolve([]); return; }
        const tx = db.transaction(filesStore, 'readonly');
        const store = tx.objectStore(filesStore);
        const allReq = store.getAllKeys();
        allReq.onsuccess = (ke) => {
          const keys = ke.target.result.filter(k => String(k).endsWith('.ipynb'));
          resolve(keys);
        };
        allReq.onerror = () => resolve([]);
      };
    });
  }

  // Listen for messages from the parent (STED)
  window.addEventListener('message', async (event) => {
    if (!event.data || event.data.type !== 'STED_GET_NOTEBOOK') return;

    const filename = event.data.filename || 'notebook.ipynb';

    try {
      // Try to list all notebooks first
      const allNbs = await listNotebooks();

      // Pick the requested file or first available
      const target = allNbs.includes(filename) ? filename
                   : allNbs.length > 0 ? allNbs[0]
                   : filename;

      const { name, content } = await readNotebookFromIDB(target);

      // content may be a string (JSON) or already an object
      let nb = content;
      if (typeof content === 'string') {
        try { nb = JSON.parse(content); } catch(_) { nb = content; }
      }

      event.source.postMessage({
        type:      'STED_NOTEBOOK_DATA',
        notebook:  nb,
        filename:  name,
        allFiles:  allNbs,
      }, event.origin);

    } catch (err) {
      event.source.postMessage({
        type:  'STED_NOTEBOOK_ERROR',
        error: err.message,
      }, event.origin);
    }
  });

  console.log('[STED Bridge] installed — listening for STED_GET_NOTEBOOK');
})();
`;

// ─────────────────────────────────────────────────────────────────────

export default function JupyterNotebook({ setUserCode, onCodeSync }) {
  const { user, isLoaded, isSignedIn } = useUser();

  const [projectKey,   setProjectKey]   = useState(null);
  const [iframeReady,  setIframeReady]  = useState(false);
  const [bridgeReady,  setBridgeReady]  = useState(false);
  const [status,       setStatus]       = useState('');
  const [statusType,   setStatusType]   = useState('info');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [notebooks,    setNotebooks]    = useState([]);
  const [activeNb,     setActiveNb]     = useState('notebook.ipynb');
  const [showPreview,  setShowPreview]  = useState(false);
  const [previewCells, setPreviewCells] = useState([]);
  const [syncing,      setSyncing]      = useState(false);

  const iframeRef   = useRef(null);
  const pollTimer   = useRef(null);
  const pendingSync = useRef(null); // resolve/reject for the current sync request

  // ── 1. Fetch project key ─────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    (async () => {
      try {
        const snap = await get(ref(db, `users/${user.id}`));
        if (snap.exists()) {
          const pk = snap.val()?.pandas?.PandasCurrentProject;
          if (pk) setProjectKey(pk);
        }
      } catch (e) { console.error('fetchProjectKey', e); }
    })();
  }, [isLoaded, isSignedIn, user]);

  // ── 2. Load last saved code from Firebase on mount ────────────────
  useEffect(() => {
    if (!user || !projectKey) return;
    (async () => {
      try {
        const snap = await get(ref(db, `users/${user.id}/pandas/${projectKey}`));
        if (snap.exists()) {
          const data = snap.val();
          if (data.notebook) {
            try {
              const nb   = JSON.parse(data.notebook);
              const code = codeFromNotebook(nb);
              if (setUserCode) setUserCode(code);
              if (onCodeSync)  onCodeSync({ code, savedAt: data.notebookSavedAt });
              if (data.notebookSavedAt) setLastSyncedAt(data.notebookSavedAt);
              setPreviewCells(nb.cells || []);
            } catch (_) {}
          }
        }
      } catch (e) { console.error('loadNotebook', e); }
    })();
  }, [user, projectKey]);

  // ── 3. Inject bridge script into iframe after it loads ────────────
  const injectBridge = useCallback(() => {
    try {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.eval(BRIDGE_SCRIPT);
      setBridgeReady(true);
      console.log('[STED] Bridge injected into JupyterLite iframe');
    } catch (err) {
      console.warn('[STED] Bridge injection failed (cross-origin?):', err.message);
    }
  }, []);

  // ── 4. Listen for postMessage responses from iframe ───────────────
  useEffect(() => {
    function onMessage(event) {
      console.log('[STED] Message received:', event.data?.type, event.data);
      if (!event.data) return;

      if (event.data.type === 'STED_NOTEBOOK_DATA') {
        const { notebook, filename, allFiles } = event.data;
        console.log('[STED] Raw notebook structure:', JSON.stringify(notebook, null, 2)?.substring(0, 500));
        console.log('[STED] Notebook data received:', { filename, cells: notebook?.cells?.length, allFiles, notebookKeys: Object.keys(notebook || {}) });
        
        if (allFiles?.length > 0) setNotebooks(allFiles);
        if (filename) setActiveNb(filename);

        const code = codeFromNotebook(notebook);
        console.log('[STED] Extracted code length:', code?.length, 'First 100 chars:', code?.substring(0, 100));
        
        const now  = new Date().toISOString();

        console.log('[STED] Calling setUserCode and onCodeSync with code length:', code?.length);
        if (setUserCode) setUserCode(code);
        if (onCodeSync)  onCodeSync({ code, savedAt: now });
        setLastSyncedAt(now);
        setPreviewCells(notebook?.cells || []);

        // Save to Firebase
        if (user && projectKey) {
          update(ref(db, `users/${user.id}/pandas/${projectKey}`), {
            notebook:         JSON.stringify(notebook),
            notebookSavedAt:  now,
            notebookFilename: filename,
          }).catch(console.error);
        }

        if (pendingSync.current) {
          pendingSync.current.resolve(notebook);
          pendingSync.current = null;
        }

        setSyncing(false);
        showToast(`✓ Synced "${filename}"`, 'success');
      }

      if (event.data.type === 'STED_NOTEBOOK_ERROR') {
        const msg = event.data.error || 'Unknown error';
        console.warn('[STED] Notebook error from iframe:', msg);

        if (pendingSync.current) {
          pendingSync.current.reject(new Error(msg));
          pendingSync.current = null;
        }

        setSyncing(false);
        // Only show error on manual sync, not auto-poll
        if (msg.includes('No .ipynb')) {
          showToast('No notebook found yet. Create one in JupyterLite first.', 'info');
        } else {
          showToast(`Could not read notebook: ${msg}`, 'error');
        }
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [user, projectKey, setUserCode, onCodeSync]);

  // ── 5. Request notebook from iframe ──────────────────────────────
  const requestNotebook = useCallback((silent = false) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    if (!silent) setSyncing(true);

    // Inject bridge if not ready yet
    if (!bridgeReady) injectBridge();

    iframe.contentWindow.postMessage(
      { type: 'STED_GET_NOTEBOOK', filename: activeNb },
      '*'
    );

    // Timeout — if no response in 5s, clear spinner
    setTimeout(() => {
      if (pendingSync.current) {
        pendingSync.current = null;
        if (!silent) {
          setSyncing(false);
          showToast('No response from notebook. Try again.', 'error');
        }
      }
    }, 5000);
  }, [activeNb, bridgeReady, injectBridge]);

  // ── 6. On iframe load: inject bridge, start auto-poll ─────────────
  const handleIframeLoad = useCallback(() => {
    setIframeReady(true);
    // Give JupyterLite ~4s to fully initialise before injecting
    setTimeout(() => {
      injectBridge();
      // First sync after 5s
      setTimeout(() => requestNotebook(true), 1000);
    }, 4000);
  }, [injectBridge, requestNotebook]);

  // ── 7. Auto-poll every 20 s ───────────────────────────────────────
  useEffect(() => {
    if (!iframeReady) return;
    pollTimer.current = setInterval(() => requestNotebook(true), POLL_INTERVAL_MS);
    return () => clearInterval(pollTimer.current);
  }, [iframeReady, requestNotebook]);

  // ── Helpers ──────────────────────────────────────────────────────
  const showToast = (msg, type = 'info') => {
    setStatus(msg);
    setStatusType(type);
    setTimeout(() => setStatus(''), 4000);
  };

  const syncLabel = lastSyncedAt
    ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : null;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#18181b] text-white">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-[#1e1e24] shrink-0 gap-2 flex-wrap">
        <span className="text-purple-300 font-bold text-base tracking-wide flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
          Jupyter Notebook
        </span>

        <div className="flex items-center gap-2 flex-wrap">

          {/* Sync badge */}
          {syncLabel && !status && (
            <span className="flex items-center gap-1 text-green-400 text-xs font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              {syncLabel}
            </span>
          )}

          {/* Toast */}
          {status && (
            <span className={`text-xs font-medium max-w-xs truncate ${
              statusType === 'error' ? 'text-red-400' : statusType === 'info' ? 'text-blue-300' : 'text-green-400'
            }`}>
              {status}
            </span>
          )}

          {/* Notebook selector */}
          {notebooks.length > 1 && (
            <select
              value={activeNb}
              onChange={e => setActiveNb(e.target.value)}
              className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200"
            >
              {notebooks.map(nb => <option key={nb} value={nb}>{nb}</option>)}
            </select>
          )}

          {/* Preview toggle */}
          {previewCells.length > 0 && (
            <button
              onClick={() => setShowPreview(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                showPreview ? 'bg-indigo-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              {showPreview ? 'Hide' : 'Preview'}
            </button>
          )}

          {/* Sync button */}
          <button
            onClick={() => requestNotebook(false)}
            disabled={syncing || !iframeReady}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 active:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-md transition-colors shadow"
            title="Read your notebook code directly from JupyterLite"
          >
            {syncing ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            )}
            {syncing ? 'Syncing…' : 'Sync Code'}
          </button>
        </div>
      </div>

      {/* ── Banner ── */}
      <HowToBanner iframeReady={iframeReady} synced={!!lastSyncedAt} />

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        <div className={`flex flex-col min-h-0 h-full ${showPreview ? 'w-1/2' : 'w-full'}`}>
          {!iframeReady && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <svg className="w-8 h-8 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span className="text-sm">Loading JupyterLite…</span>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={JUPYTERLITE_LAB}
            title="JupyterLite"
            className={`w-full border-0 ${iframeReady ? 'block' : 'hidden'}`}
            style={{ height: '100%', flex: 1 }}
            onLoad={handleIframeLoad}
          />
        </div>

        {showPreview && previewCells.length > 0 && (
          <div className="w-1/2 h-full overflow-y-auto border-l border-gray-700 bg-[#111113] p-3">
            <p className="text-[10px] text-gray-500 mb-3 font-semibold uppercase tracking-widest">
              Live Code Preview
            </p>
            <NotebookPreview cells={previewCells} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
function HowToBanner({ iframeReady, synced }) {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('jupyter_banner_v4') === '1'
  );
  if (dismissed) return null;
  return (
    <div className="flex items-start gap-3 bg-indigo-950/70 border-b border-indigo-800/50 px-4 py-2 text-xs text-indigo-200 shrink-0">
      <svg className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
      </svg>
      {synced
        ? <span><b className="text-green-400">✓ Code is synced.</b> STED auto-reads your notebook every 20s. Click <b>Sync Code</b> for an instant update after changes.</span>
        : <span>Write your code in JupyterLite below. STED will read it <b>automatically</b> — no download needed. Click <b>Sync Code</b> to sync immediately.</span>
      }
      <button onClick={() => { sessionStorage.setItem('jupyter_banner_v4', '1'); setDismissed(true); }}
              className="ml-auto text-indigo-400 hover:text-white shrink-0 text-base leading-none">✕</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
function NotebookPreview({ cells = [] }) {
  if (!cells.length) return <p className="text-gray-500 text-xs italic">No cells yet.</p>;
  return (
    <div className="space-y-3">
      {cells.map((cell, idx) => {
        const src = Array.isArray(cell.source) ? cell.source.join('') : cell.source || '';
        if (cell.cell_type === 'code') return (
          <div key={idx} className="rounded bg-[#23232a] border border-gray-700 overflow-hidden">
            <div className="text-[9px] text-gray-500 px-2 pt-1 uppercase tracking-widest">In [{idx+1}]</div>
            <pre className="text-green-300 text-xs p-2 overflow-x-auto whitespace-pre-wrap leading-relaxed">{src}</pre>
            {cell.outputs?.length > 0 && (
              <div className="border-t border-gray-700 bg-black/50 px-2 py-1 space-y-1">
                {cell.outputs.map((out, oi) => {
                  for (const fmt of ['image/png','image/jpeg'])
                    if (out.data?.[fmt]) return <img key={oi} src={`data:${fmt};base64,${out.data[fmt]}`} alt="" className="max-w-full my-1 rounded"/>;
                  if (out.data?.['text/html']) {
                    const html = Array.isArray(out.data['text/html']) ? out.data['text/html'].join('') : out.data['text/html'];
                    return <div key={oi} className="text-xs text-white overflow-x-auto" dangerouslySetInnerHTML={{__html: html}}/>;
                  }
                  const txt = out.data?.['text/plain'] ?? out.text;
                  if (txt) return <pre key={oi} className="text-gray-200 text-xs whitespace-pre-wrap">{Array.isArray(txt)?txt.join(''):txt}</pre>;
                  if (out.ename) return <div key={oi} className="text-red-400 text-xs">{out.ename}: {out.evalue}</div>;
                  return null;
                })}
              </div>
            )}
          </div>
        );
        if (cell.cell_type === 'markdown') return (
          <div key={idx} className="rounded bg-[#1e1e24] border border-gray-700 px-3 py-2">
            <div className="text-[9px] text-gray-500 mb-1 uppercase tracking-widest">Markdown</div>
            <pre className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">{src}</pre>
          </div>
        );
        return null;
      })}
    </div>
  );
}
