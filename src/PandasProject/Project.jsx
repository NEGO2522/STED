import React, { useState } from 'react';
import Statement from './Statement';
import AI from './AI';
import JupyterNotebook from './JupyterNotebook';

// ──────────────────────────────────────────────────────────────────────
//  Project.jsx  –  Pandas project workspace
//
//  Data flow for the Check button:
//    JupyterNotebook (left)
//      ↓  setUserCode(code)       – called on every Sync Notebook upload
//      ↓  onCodeSync({ code, savedAt }) – optional metadata
//    Project.jsx
//      ↓  userCode prop
//    Statement.jsx (right)
//      → Check button sends userCode to OpenAI for each subtask
//      → Results shown as tick/cross with lightbulb explanation
// ──────────────────────────────────────────────────────────────────────

function Project() {
  const [rightPanel,           setRightPanel]           = useState('statement');
  const [chatMessages,         setChatMessages]         = useState([]);
  const [userCode,             setUserCode]             = useState('');
  const [lastSyncedAt,         setLastSyncedAt]         = useState(null);
  const [taskCheckStatus,      setTaskCheckStatus]      = useState({});
  const [subtaskCheckResults,  setSubtaskCheckResults]  = useState({});
  const [expandedTask,         setExpandedTask]         = useState(null);

  // Called by JupyterNotebook whenever the student syncs a snapshot
  const handleCodeSync = ({ code, savedAt }) => {
    console.log('[STED] handleCodeSync called. code length:', code?.length, 'First 100 chars:', code?.substring(0, 100), 'savedAt:', savedAt);
    setUserCode(code);
    if (savedAt) setLastSyncedAt(savedAt);
    // Reset previous check results so the student gets a fresh evaluation
    setTaskCheckStatus({});
    setSubtaskCheckResults({});
    console.log('[STED] handleCodeSync complete. userCode state updated.');
  };

  return (
    <div className="flex h-screen pt-12 p-3 bg-[#0F0F0F] w-screen">

      {/* ── Left: Jupyter Notebook ── */}
      <div
        className="border border-white h-full text-white"
        style={{ width: '950px', minWidth: '350px', maxWidth: '950px', flexShrink: 0 }}
      >
        <JupyterNotebook
          setUserCode={setUserCode}
          onCodeSync={handleCodeSync}
        />
      </div>

      {/* ── Right: Statement / AI ── */}
      <div
        className="flex-1 h-full text-white p-5 border border-white"
        style={{ backgroundColor: 'rgb(24, 24, 27)', minWidth: 500, borderRadius: 0 }}
      >
        {/* Toggle */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setRightPanel('statement')}
            className={`px-4 py-2 rounded-md font-medium transition ${
              rightPanel === 'statement' ? 'bg-purple-600 text-white' : 'bg-zinc-600 hover:bg-zinc-500'
            }`}
          >
            Statement
          </button>
          <button
            onClick={() => setRightPanel('ai')}
            className={`px-4 py-2 rounded-md font-medium transition ${
              rightPanel === 'ai' ? 'bg-purple-600 text-white' : 'bg-zinc-600 hover:bg-zinc-500'
            }`}
          >
            AI
          </button>
        </div>

        {/* Content */}
        <div className="mt-2">
          {rightPanel === 'statement' && (
            <Statement
              userCode={userCode}
              taskCheckStatus={taskCheckStatus}
              setTaskCheckStatus={setTaskCheckStatus}
              subtaskCheckResults={subtaskCheckResults}
              setSubtaskCheckResults={setSubtaskCheckResults}
              expandedTask={expandedTask}
              setExpandedTask={setExpandedTask}
            />
          )}
          {rightPanel === 'ai' && (
            <AI
              userCode={userCode}
              messages={chatMessages}
              setMessages={setChatMessages}
              terminalOutput={[]}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Project;
