import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ref, update, get } from 'firebase/database';
import { db } from '../firebase';

const JUPYTERLITE_LAB = '/jupyterlite/lab/index.html';

// ── Decode whatever JupyterLite stored in IndexedDB ──────────────────
// JupyterLite's BrowserStorageDrive stores file content as a Uint8Array
// encoded as a plain object with numeric string keys: { '0': 123, '1': 34, ... }
// We must convert that back to a Uint8Array → UTF-8 string → JSON.
function decodeRawValue(raw) {
  if (!raw) return null;

  // Already a notebook
  if (raw.cells) return raw;

  // Wrapped: { content: notebook }
  if (raw.content) {
    if (raw.content.cells) return raw.content;
    if (typeof raw.content === 'string') {
      try { const p = JSON.parse(raw.content); if (p?.cells) return p; } catch (_) {}
    }
  }

  // Uint8Array stored as plain object with numeric keys { '0': n, '1': n, ... }
  const keys = Object.keys(raw);
  const isUint8 = keys.length > 0 && keys.every(k => !isNaN(k)) && typeof raw[0] === 'number';
  if (isUint8) {
    try {
      const arr = new Uint8Array(keys.length);
      for (let i = 0; i < keys.length; i++) arr[i] = raw[i];
      const text = new TextDecoder('utf-8').decode(arr);
      const parsed = JSON.parse(text);
      if (parsed?.cells) return parsed;
      if (parsed?.content?.cells) return parsed.content;
      return parsed;
    } catch (e) {
      console.warn('[STED] Uint8Array decode failed:', e.message);
    }
  }

  // Raw string
  if (typeof raw === 'string') {
    try { const q = JSON.parse(raw); if (q?.cells) return q; } catch (_) {}
  }

  return raw;
}

function codeFromNotebook(nb) {
  const notebook = decodeRawValue(nb);
  if (!notebook) return '';

  let cells = notebook.cells;
  if (!cells && notebook.content) cells = notebook.content.cells;
  if (!Array.isArray(cells)) return '';

  return cells
    .filter(c => c.cell_type === 'code')
    .map(c => {
      const source = Array.isArray(c.source) ? c.source.join('') : c.source || '';

      let outputText = '';
      if (Array.isArray(c.outputs) && c.outputs.length > 0) {
        const outputs = c.outputs.map(out => {
          if (out.output_type === 'stream' && out.text)
            return Array.isArray(out.text) ? out.text.join('') : out.text;
          if (out.output_type === 'execute_result' && out.data?.['text/plain'])
            return Array.isArray(out.data['text/plain']) ? out.data['text/plain'].join('') : out.data['text/plain'];
          if (out.output_type === 'error')
            return `ERROR: ${out.ename}: ${out.evalue}`;
          return '';
        }).filter(s => s.trim()).join('\n');
        if (outputs) outputText = '\n# --- Output ---\n' + outputs;
      }

      return source + outputText;
    })
    .filter(s => s.trim())
    .join('\n\n');
}

// ── Bridge injected into iframe via eval() ───────────────────────────
const BRIDGE_SCRIPT = `
(function() {
  if (window.__STED_BRIDGE_INSTALLED__) return;
  window.__STED_BRIDGE_INSTALLED__ = true;

  async function readNotebookFromIDB(filename) {
    return new Promise((resolve, reject) => {
      const baseUrl = (window.location.pathname.replace(/\\/lab.*/, '') || '/').replace(/\\/$/, '') + '/';
      const dbName  = 'JupyterLite Storage - ' + baseUrl;
      const req = indexedDB.open(dbName);
      req.onerror = () => reject(new Error('Cannot open IndexedDB: ' + dbName));
      req.onsuccess = (e) => {
        const db = e.target.result;
        const storeNames = Array.from(db.objectStoreNames);
        const filesStore = storeNames.find(s => s === 'files') || storeNames[0];
        if (!filesStore) { reject(new Error('No object store found in ' + dbName)); return; }
        const tx = db.transaction(filesStore, 'readonly');
        const store = tx.objectStore(filesStore);
        const getReq = store.get(filename);
        getReq.onsuccess = (e) => {
          if (e.target.result !== undefined) {
            resolve({ name: filename, content: e.target.result });
          } else {
            const allReq = store.getAllKeys();
            allReq.onsuccess = (ke) => {
              const keys = ke.target.result;
              const ipynbKeys = keys.filter(k => String(k).endsWith('.ipynb'));
              if (ipynbKeys.length === 0) {
                reject(new Error('No .ipynb files found in store. Keys: ' + keys.slice(0,10).join(', ')));
                return;
              }
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

  window.addEventListener('message', async (event) => {
    if (!event.data || event.data.type !== 'STED_GET_NOTEBOOK') return;
    const filename = event.data.filename || 'notebook.ipynb';
    try {
      const allNbs = await listNotebooks();
      const target = allNbs.includes(filename) ? filename
                   : allNbs.length > 0 ? allNbs[0]
                   : filename;
      const { name, content } = await readNotebookFromIDB(target);
      event.source.postMessage({
        type:     'STED_NOTEBOOK_DATA',
        notebook: content,
        filename: name,
        allFiles: allNbs,
      }, event.origin);
    } catch (err) {
      event.source.postMessage({
        type:  'STED_NOTEBOOK_ERROR',
        error: err.message,
      }, event.origin);
    }
  });

  console.log('[STED Bridge] installed');
})();
`;

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
  const pendingSync = useRef(null);

  // 1. Fetch project key
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

  // 2. Load saved notebook from Firebase on mount
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

  // 3. Inject bridge via eval()
  const injectBridge = useCallback(() => {
    try {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.eval(BRIDGE_SCRIPT);
      setBridgeReady(true);
      console.log('[STED] Bridge injected');
    } catch (err) {
      console.warn('[STED] Bridge injection failed:', err.message);
    }
  }, []);

  // 4. Handle postMessage from iframe
  useEffect(() => {
    function onMessage(event) {
      if (!event.data) return;

      if (event.data.type === 'STED_NOTEBOOK_DATA') {
        const { notebook, filename, allFiles } = event.data;

        if (allFiles?.length > 0) setNotebooks(allFiles);
        if (filename) setActiveNb(filename);

        const decoded = decodeRawValue(notebook);
        const code    = codeFromNotebook(decoded);
        const now     = new Date().toISOString();

        if (setUserCode) setUserCode(code);
        if (onCodeSync)  onCodeSync({ code, savedAt: now });
        setLastSyncedAt(now);
        setPreviewCells(decoded?.cells || []);
        setSyncing(false);

        if (user && projectKey) {
          update(ref(db, `users/${user.id}/pandas/${projectKey}`), {
            notebook:         JSON.stringify(decoded),
            notebookSavedAt:  now,
            notebookFilename: filename,
          }).catch(console.error);
        }

        if (pendingSync.current) { pendingSync.current.resolve(decoded); pendingSync.current = null; }
        showToast(`✓ Synced "${filename}"`, 'success');
      }

      if (event.data.type === 'STED_NOTEBOOK_ERROR') {
        const msg = event.data.error || 'Unknown error';
        console.warn('[STED] Notebook error:', msg);
        if (pendingSync.current) { pendingSync.current.reject(new Error(msg)); pendingSync.current = null; }
        setSyncing(false);
        if (msg.includes('No .ipynb')) {
          showToast('No notebook found — create one in JupyterLite first.', 'info');
        } else {
          showToast(`Could not read notebook: ${msg}`, 'error');
        }
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [user, projectKey, setUserCode, onCodeSync]);

  // 5. Request notebook from iframe (manual only)
  const requestNotebook = useCallback((silent = false) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    if (!silent) setSyncing(true);
    if (!bridgeReady) injectBridge();
    iframe.contentWindow.postMessage({ type: 'STED_GET_NOTEBOOK', filename: activeNb }, '*');
    setTimeout(() => {
      if (pendingSync.current) {
        pendingSync.current = null;
        if (!silent) { setSyncing(false); showToast('No response. Try again.', 'error'); }
      }
    }, 5000);
  }, [activeNb, bridgeReady, injectBridge]);

  // 6. On iframe load: inject bridge after JupyterLite boots
  const handleIframeLoad = useCallback(() => {
    setIframeReady(true);
    setTimeout(() => {
      injectBridge();
    }, 4000);
  }, [injectBridge]);

  const showToast = (msg, type = 'info') => {
    setStatus(msg); setStatusType(type);
    setTimeout(() => setStatus(''), 4000);
  };

  const syncLabel = lastSyncedAt
    ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <div className="flex flex-col h-full bg-[#18181b] text-white">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-[#1e1e24] shrink-0 gap-2 flex-wrap">
        <span className="text-purple-300 font-bold text-base tracking-wide flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
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
            <span className={`text-xs font-medium max-w-xs truncate ${statusType === 'error' ? 'text-red-400' : statusType === 'info' ? 'text-blue-300' : 'text-green-400'}`}>
              {status}
            </span>
          )}
          {notebooks.length > 1 && (
            <select value={activeNb} onChange={e => setActiveNb(e.target.value)}
                    className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-200">
              {notebooks.map(nb => <option key={nb} value={nb}>{nb}</option>)}
            </select>
          )}
          {previewCells.length > 0 && (
            <button onClick={() => setShowPreview(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${showPreview ? 'bg-indigo-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              {showPreview ? 'Hide' : 'Preview'}
            </button>
          )}
          <button onClick={() => requestNotebook(false)} disabled={syncing || !iframeReady}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 active:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-md transition-colors shadow">
            {syncing ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
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
          <iframe ref={iframeRef} src={JUPYTERLITE_LAB} title="JupyterLite"
                  className={`w-full border-0 ${iframeReady ? 'block' : 'hidden'}`}
                  style={{ height: '100%', flex: 1 }}
                  onLoad={handleIframeLoad} />
        </div>
        {showPreview && previewCells.length > 0 && (
          <div className="w-1/2 h-full overflow-y-auto border-l border-gray-700 bg-[#111113] p-3">
            <p className="text-[10px] text-gray-500 mb-3 font-semibold uppercase tracking-widest">Live Code Preview</p>
            <NotebookPreview cells={previewCells} />
          </div>
        )}
      </div>
    </div>
  );
}

function HowToBanner({ synced }) {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('jupyter_banner_v4') === '1');
  if (dismissed) return null;
  return (
    <div className="flex items-start gap-3 bg-indigo-950/70 border-b border-indigo-800/50 px-4 py-2 text-xs text-indigo-200 shrink-0">
      <svg className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
      </svg>
      {synced
        ? <span><b className="text-green-400">✓ Code synced.</b> Click <b>Sync Code</b> again after making changes to update.</span>
        : <span>Write your code in JupyterLite, then click <b>Sync Code</b> in the toolbar to read your code into STED.</span>
      }
      <button onClick={() => { sessionStorage.setItem('jupyter_banner_v4', '1'); setDismissed(true); }}
              className="ml-auto text-indigo-400 hover:text-white shrink-0 text-base leading-none">✕</button>
    </div>
  );
}

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
