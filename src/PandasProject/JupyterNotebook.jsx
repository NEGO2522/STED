import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ref, update, get } from 'firebase/database';
import { db } from '../firebase';

// ──────────────────────────────────────────────────────────────────────
//  JupyterNotebook.jsx
//
//  Reads notebook code directly from JupyterLite via postMessage.
//  Since both run on the same origin, we eval() a bridge script into
//  the iframe that reads IndexedDB and posts the notebook back.
//
//  Flow:
//    1. JupyterLite loads in iframe (same origin)
//    2. Parent injects bridge via iframe.contentWindow.eval()
//    3. Parent sends { type: 'STED_GET_NOTEBOOK' } via postMessage
//    4. Bridge scans all IndexedDB databases + stores for .ipynb files
//    5. Posts back { type: 'STED_NOTEBOOK_DATA', notebook: {...} }
//    6. Auto-polls every 20 s; manual "Sync Code" also available
// ──────────────────────────────────────────────────────────────────────

const JUPYTERLITE_LAB  = '/jupyterlite/lab/index.html';
const POLL_INTERVAL_MS = 20000;

/** Concatenate all code-cell sources into one string */
function codeFromNotebook(nb) {
  if (!nb || !Array.isArray(nb.cells)) return '';
  return nb.cells
    .filter(c => c.cell_type === 'code')
    .map(c => (Array.isArray(c.source) ? c.source.join('') : c.source || ''))
    .filter(s => s.trim())
    .join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────
//  Bridge script — injected into JupyterLite iframe via eval()
//  Scans ALL IndexedDB databases for any .ipynb file.
// ─────────────────────────────────────────────────────────────────────
const BRIDGE_SCRIPT = `
(function() {
  if (window.__STED_BRIDGE__) return;
  window.__STED_BRIDGE__ = true;

  // ── Get all IndexedDB database names ──────────────────────────────
  async function getAllDatabases() {
    try {
      // Modern browsers support indexedDB.databases()
      if (indexedDB.databases) {
        const dbs = await indexedDB.databases();
        return dbs.map(d => d.name).filter(Boolean);
      }
    } catch(e) {}
    // Fallback: guess the JupyterLite storage name from the base URL
    const base = (location.pathname.match(/^(\\/[^/]+\\/)?/)[0] || '/');
    return ['JupyterLite Storage - ' + base, 'JupyterLite Storage - /'];
  }

  // ── Search one database for .ipynb files ─────────────────────────
  function searchDatabase(dbName) {
    return new Promise((resolve) => {
      const req = indexedDB.open(dbName);
      req.onerror = () => resolve([]);
      req.onsuccess = (e) => {
        const db = e.target.result;
        const storeNames = Array.from(db.objectStoreNames);
        if (!storeNames.length) { db.close(); resolve([]); return; }

        const results = [];
        let pending = storeNames.length;

        storeNames.forEach(storeName => {
          try {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const keysReq = store.getAllKeys();

            keysReq.onsuccess = (ke) => {
              const ipynbKeys = (ke.target.result || []).filter(k => String(k).endsWith('.ipynb'));
              ipynbKeys.forEach(k => results.push({ dbName, storeName, key: k }));
              if (--pending === 0) { db.close(); resolve(results); }
            };
            keysReq.onerror = () => {
              if (--pending === 0) { db.close(); resolve(results); }
            };
          } catch(e) {
            if (--pending === 0) { db.close(); resolve(results); }
          }
        });
      };
    });
  }

  // ── Read one notebook from a known location ───────────────────────
  function readNotebook(dbName, storeName, key) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName);
      req.onerror = () => reject(new Error('Cannot open: ' + dbName));
      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const getReq = store.get(key);
        getReq.onsuccess = (ge) => {
          db.close();
          let content = ge.target.result;
          if (typeof content === 'string') {
            try { content = JSON.parse(content); } catch(_) {}
          }
          resolve(content);
        };
        getReq.onerror = () => { db.close(); reject(new Error('Cannot read: ' + key)); };
      };
    });
  }

  // ── Main handler ──────────────────────────────────────────────────
  async function handleGetNotebook(event, requestedFilename) {
    try {
      const dbNames = await getAllDatabases();
      let allEntries = [];

      for (const dbName of dbNames) {
        const entries = await searchDatabase(dbName);
        allEntries = allEntries.concat(entries);
      }

      if (allEntries.length === 0) {
        event.source.postMessage({
          type: 'STED_NOTEBOOK_ERROR',
          error: 'No .ipynb files found yet. Create a notebook in JupyterLite first.'
        }, event.origin || '*');
        return;
      }

      // Prefer the requested filename, fall back to the first found
      const target = allEntries.find(e => e.key === requestedFilename) || allEntries[0];
      const notebook = await readNotebook(target.dbName, target.storeName, target.key);

      event.source.postMessage({
        type:     'STED_NOTEBOOK_DATA',
        notebook: notebook,
        filename: target.key,
        allFiles: allEntries.map(e => e.key),
      }, event.origin || '*');

    } catch(err) {
      event.source.postMessage({
        type:  'STED_NOTEBOOK_ERROR',
        error: err.message
      }, event.origin || '*');
    }
  }

  window.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'STED_GET_NOTEBOOK') return;
    handleGetNotebook(event, event.data.filename || 'notebook.ipynb');
  });

  console.log('[STED Bridge] ready');
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

  const iframeRef  = useRef(null);
  const pollTimer  = useRef(null);
  const syncTimer  = useRef(null); // timeout guard per manual sync

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

  // ── 3. Inject bridge into iframe ──────────────────────────────────
  const injectBridge = useCallback(() => {
    try {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return false;
      iframe.contentWindow.eval(BRIDGE_SCRIPT);
      setBridgeReady(true);
      return true;
    } catch (err) {
      console.warn('[STED] Bridge injection failed:', err.message);
      return false;
    }
  }, []);

  // ── 4. Handle messages from the iframe ───────────────────────────
  useEffect(() => {
    function onMessage(event) {
      if (!event.data) return;

      if (event.data.type === 'STED_NOTEBOOK_DATA') {
        clearTimeout(syncTimer.current);
        const { notebook, filename, allFiles } = event.data;

        if (allFiles?.length > 0) setNotebooks(allFiles);
        if (filename) setActiveNb(filename);

        const code = codeFromNotebook(notebook);
        const now  = new Date().toISOString();

        if (setUserCode) setUserCode(code);
        if (onCodeSync)  onCodeSync({ code, savedAt: now });
        setLastSyncedAt(now);
        setPreviewCells(notebook?.cells || []);
        setSyncing(false);

        // Persist to Firebase
        if (user && projectKey) {
          update(ref(db, `users/${user.id}/pandas/${projectKey}`), {
            notebook:         JSON.stringify(notebook),
            notebookSavedAt:  now,
            notebookFilename: filename,
          }).catch(console.error);
        }

        showToast(`✓ Synced "${filename}"`, 'success');
      }

      if (event.data.type === 'STED_NOTEBOOK_ERROR') {
        clearTimeout(syncTimer.current);
        const msg = event.data.error || 'Unknown error';
        setSyncing(false);
        if (!msg.includes('No .ipynb')) {
          showToast(msg, 'error');
        } else {
          showToast('No notebook yet — create one in JupyterLite!', 'info');
        }
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [user, projectKey, setUserCode, onCodeSync]);

  // ── 5. Send sync request to iframe ───────────────────────────────
  const requestSync = useCallback((silent = false) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    if (!silent) setSyncing(true);

    // Re-inject bridge if needed
    if (!bridgeReady) injectBridge();

    iframe.contentWindow.postMessage(
      { type: 'STED_GET_NOTEBOOK', filename: activeNb },
      '*'
    );

    // Auto-clear spinner after 6s if no response
    clearTimeout(syncTimer.current);
    if (!silent) {
      syncTimer.current = setTimeout(() => {
        setSyncing(false);
        showToast('No response — try again in a moment.', 'error');
      }, 6000);
    }
  }, [activeNb, bridgeReady, injectBridge]);

  // ── 6. After iframe loads: inject bridge, start poll ─────────────
  const handleIframeLoad = useCallback(() => {
    setIframeReady(true);
    // Give JupyterLite ~5s to fully init, then inject + first sync
    setTimeout(() => {
      injectBridge();
      setTimeout(() => requestSync(true), 1500);
    }, 5000);
  }, [injectBridge, requestSync]);

  // ── 7. Auto-poll ─────────────────────────────────────────────────
  useEffect(() => {
    if (!iframeReady) return;
    pollTimer.current = setInterval(() => requestSync(true), POLL_INTERVAL_MS);
    return () => clearInterval(pollTimer.current);
  }, [iframeReady, requestSync]);

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

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-[#1e1e24] shrink-0 gap-2 flex-wrap">
        <span className="text-purple-300 font-bold text-base tracking-wide flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
          Jupyter Notebook
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          {syncLabel && !status && (
            <span className="flex items-center gap-1 text-green-400 text-xs font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              {syncLabel}
            </span>
          )}

          {status && (
            <span className={`text-xs font-medium max-w-xs truncate ${
              statusType === 'error' ? 'text-red-400' : statusType === 'info' ? 'text-blue-300' : 'text-green-400'
            }`}>
              {status}
            </span>
          )}

          {notebooks.length > 1 && (
            <select
              value={activeNb}
              onChange={e => setActiveNb(e.target.value)}
              className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200"
            >
              {notebooks.map(nb => <option key={nb} value={nb}>{nb}</option>)}
            </select>
          )}

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

          <button
            onClick={() => requestSync(false)}
            disabled={syncing || !iframeReady}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 active:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-md transition-colors shadow"
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

      {/* Banner */}
      <HowToBanner synced={!!lastSyncedAt} />

      {/* Main */}
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
            <p className="text-[10px] text-gray-500 mb-3 font-semibold uppercase tracking-widest">Live Preview</p>
            <NotebookPreview cells={previewCells} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
function HowToBanner({ synced }) {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('jupyter_banner_v5') === '1'
  );
  if (dismissed) return null;
  return (
    <div className="flex items-start gap-3 bg-indigo-950/70 border-b border-indigo-800/50 px-4 py-2 text-xs text-indigo-200 shrink-0">
      <svg className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
      </svg>
      {synced
        ? <span><b className="text-green-400">✓ Code synced.</b> STED reads your notebook every 20 s automatically. Click <b>Sync Code</b> for an instant update.</span>
        : <span>Write your Pandas code in JupyterLite below. STED will read it <b>automatically</b> — no download needed. Click <b>Sync Code</b> anytime.</span>
      }
      <button onClick={() => { sessionStorage.setItem('jupyter_banner_v5', '1'); setDismissed(true); }}
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
