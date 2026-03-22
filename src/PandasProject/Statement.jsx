import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { FaChevronDown, FaQuestionCircle, FaLightbulb } from 'react-icons/fa';
import cross from '../assets/cross.png';
import applied from '../assets/applied.png';

async function checkSubtaskWithOpenAI(userCode, subtask, taskTitle, projectTitle) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  const prompt = `You are evaluating student Pandas/Python code from a Jupyter Notebook.

Project: "${projectTitle || 'Pandas Project'}"
Task: "${taskTitle || ''}"

Student's Code (including execution outputs):
\`\`\`python
${userCode}
\`\`\`

Subtask to evaluate: "${subtask}"

CRITICAL INSTRUCTIONS - READ CAREFULLY:
You are evaluating ONLY this specific subtask. Do NOT consider any future subtasks or functionality that comes after this one in the sequence.

EVALUATION RULES:
1. Be STRICT: Only mark complete if the specific subtask requirement is ACTUALLY accomplished in the code or output.
2. Evaluate ONLY what THIS specific subtask requires — nothing more, nothing less.
3. DO NOT check if future subtasks are implemented.
4. DO NOT mark this subtask as incomplete because future functionality is missing.
5. Each subtask is INDEPENDENT and must be evaluated on its own merits.
6. Just importing libraries or having working code is NOT enough — the subtask requirement must be specifically fulfilled.

EXAMPLES of strict evaluation:
- Subtask "Show first 5 rows": code must actually call .head() or display the first 5 rows. Just loading data is NOT enough.
- Subtask "Create a scatter plot": code must actually create and show the plot. Importing matplotlib is NOT enough.
- Subtask "Handle missing values": code must actually drop or fill NaN values. Just checking for nulls is NOT enough.
- Subtask "Filter rows where column > value": code must actually perform the filter. Just printing the column is NOT enough.

Respond in this EXACT format (two lines only, nothing else):
Status: true
Reason: One sentence referencing specific evidence from the code/output that justifies your decision.

The reason must:
- Reference specific function calls, variable names, or output values from the code
- Explicitly state what was found (complete) or what is missing (incomplete)
- NOT mention future subtasks or unrelated functionality`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 200,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI error ${response.status}`);

  const raw = data.choices?.[0]?.message?.content?.trim() || '';
  const statusMatch = raw.match(/^Status\s*:\s*(true|false)/im);
  const reasonMatch = raw.match(/^Reason\s*:\s*(.+)/im);

  return {
    complete: statusMatch ? statusMatch[1].toLowerCase() === 'true' : false,
    reason:   reasonMatch ? reasonMatch[1].trim() : (raw || 'No reason returned.'),
  };
}

function Statement({
  userCode,
  taskCheckStatus,      setTaskCheckStatus,
  subtaskCheckResults,  setSubtaskCheckResults,
  expandedTask,         setExpandedTask,
}) {
  const { isLoaded, isSignedIn, user } = useUser();

  const [project,        setProject]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [loadingTaskKey, setLoadingTaskKey] = useState(null);
  const [showProjectDesc,setShowProjectDesc]= useState(false);
  const [hoveredReason,  setHoveredReason]  = useState({ taskKey: null, subIdx: null, clicked: false });
  const [noCodeWarning,  setNoCodeWarning]  = useState({});
  const [checkApiError,  setCheckApiError]  = useState('');

  const projectDescIconRef = useRef();
  const tooltipRef         = useRef(null);

  useEffect(() => {
    function handle(event) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target) && !event.target.closest('.bulb-icon-container'))
        setHoveredReason(prev => ({ ...prev, clicked: false }));
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    async function fetchProjectData() {
      if (!isLoaded || !isSignedIn || !user) return;
      setLoading(true); setError('');
      try {
        const userSnap = await get(ref(db, 'users/' + user.id));
        if (!userSnap.exists()) { setError('User data not found.'); setLoading(false); return; }
        const pk = userSnap.val()?.pandas?.PandasCurrentProject;
        if (!pk) { setError('No pandas project started.'); setLoading(false); return; }
        const projectSnap = await get(ref(db, 'PandasProject/' + pk));
        if (!projectSnap.exists()) { setError('Pandas project not found.'); setLoading(false); return; }
        setProject(projectSnap.val());
      } catch (err) {
        setError('Failed to load project: ' + err.message);
      } finally { setLoading(false); }
    }
    fetchProjectData();
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    if (!showProjectDesc) return;
    function handle(e) {
      if (projectDescIconRef.current && !projectDescIconRef.current.contains(e.target)) setShowProjectDesc(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showProjectDesc]);

  const handleTaskCheck = async (taskKey, task) => {
    if (!userCode || !userCode.trim()) {
      setNoCodeWarning(prev => ({ ...prev, [taskKey]: true }));
      setTimeout(() => setNoCodeWarning(prev => ({ ...prev, [taskKey]: false })), 4000);
      return;
    }
    setNoCodeWarning(prev => ({ ...prev, [taskKey]: false }));
    setCheckApiError('');
    setLoadingTaskKey(taskKey);
    setSubtaskCheckResults(prev => ({ ...prev, [taskKey]: [] }));
    setTaskCheckStatus(prev => ({ ...prev, [taskKey]: undefined }));

    const subtasks = task.subtasks || [];
    const results  = [];
    let   allDone  = true;
    try {
      for (const subtask of subtasks) {
        try {
          const { complete, reason } = await checkSubtaskWithOpenAI(
            userCode, subtask, task.title || taskKey, project?.title || 'Pandas Project'
          );
          results.push({ subtask, complete, reason });
          if (!complete) allDone = false;
        } catch (subErr) {
          results.push({ subtask, complete: false, reason: subErr.message });
          allDone = false;
        }
        setSubtaskCheckResults(prev => ({ ...prev, [taskKey]: [...results] }));
      }
      setTaskCheckStatus(prev => ({ ...prev, [taskKey]: allDone }));
    } catch (err) {
      setCheckApiError(`Check failed: ${err.message}`);
      setTaskCheckStatus(prev => ({ ...prev, [taskKey]: false }));
    } finally {
      setLoadingTaskKey(null);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading project…</div>;
  if (error)   return <div className="p-8 text-red-400">{error}</div>;
  if (!project)return <div className="p-8 text-gray-400">No project data.</div>;

  return (
    <div className="p-8 max-w-2xl shadow-lg mt-6"
         style={{ maxHeight: '79vh', overflowY: 'auto', background: '#18181b', color: '#f3f4f6', boxShadow: '0 4px 32px #000a' }}>

      {/* Sync status banner */}
      {!userCode?.trim() ? (
        <div className="mb-5 flex items-start gap-2 bg-yellow-900/40 border border-yellow-700/50 rounded px-3 py-2 text-yellow-300 text-xs">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <span>
            <b>No code synced yet.</b> Write your code in JupyterLite, then click{' '}
            <b>Sync Code</b> in the toolbar on the left. The Check button will work right after.
          </span>
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-2 bg-green-900/30 border border-green-700/40 rounded px-3 py-2 text-green-400 text-xs">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
          <span><b>Notebook synced.</b> Click <b>Check</b> on any task to evaluate your code.</span>
        </div>
      )}

      {checkApiError && (
        <div className="mb-4 flex items-start gap-2 bg-red-900/40 border border-red-700/50 rounded px-3 py-2 text-red-300 text-xs">
          <span>{checkApiError}</span>
        </div>
      )}

      {/* Project title */}
      <h1 className="text-3xl text-center font-bold mb-2 flex gap-2 items-center justify-center relative" style={{ color: '#a78bfa' }}>
        {project.title}
        <span ref={projectDescIconRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <FaQuestionCircle style={{ color: '#e5e7eb', fontSize: 22, marginLeft: 8, cursor: 'pointer', opacity: 0.85 }} onClick={() => setShowProjectDesc(v => !v)}/>
          {showProjectDesc && (
            <div style={{ position: 'absolute', top: 32, right: 0, zIndex: 100, background: '#23232a', color: '#e5e7eb', border: '1px solid #444', borderRadius: 8, padding: '16px 20px', minWidth: 320, maxWidth: 340, boxShadow: '0 4px 24px #000a', fontSize: 15, lineHeight: '1.6', whiteSpace: 'pre-line' }}>
              {project.description}
            </div>
          )}
        </span>
      </h1>

      {project.Concept && (
        <div className="text-center mb-3">
          <p className="text-sm" style={{ color: '#9ca3af' }}><span className="font-semibold">Concepts Used:</span> {project.Concept}</p>
        </div>
      )}
      {project.DataLink && (
        <div className="text-center mb-6">
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            <span className="font-semibold">Data Link — </span>
            <a href={project.DataLink} target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa', textDecoration: 'underline' }}>click here</a>
          </p>
        </div>
      )}

      {/* Tasks */}
      <div className="space-y-6 mt-8">
        {project.tasks && Object.entries(project.tasks).map(([taskKey, task]) => {
          const isExpanded = expandedTask === taskKey;
          const isChecking = loadingTaskKey === taskKey;
          const taskDone   = taskCheckStatus[taskKey];
          const noCode     = noCodeWarning[taskKey];
          const results    = subtaskCheckResults[taskKey] || [];

          return (
            <div key={taskKey} className="p-4 shadow border" style={{ background: '#23232a', borderColor: '#444', borderRadius: 0 }}>
              <div className="font-semibold mb-2 flex items-center justify-between cursor-pointer select-none"
                   style={{ color: '#e5e7eb', fontSize: 16, lineHeight: '2.2rem' }}
                   onClick={() => setExpandedTask(isExpanded ? null : taskKey)}>
                <span className="flex items-center gap-2">
                  <FaChevronDown style={{ transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: 14 }}/>
                  {task.title}
                </span>
                <div className="flex flex-col items-end gap-1">
                  <button
                    className="ml-4 px-3 py-1 text-white font-semibold text-sm flex items-center gap-2"
                    style={{ minWidth: 70, minHeight: 32, background: noCode ? '#7c2d12' : '#333', borderRadius: 0, border: noCode ? '1px solid #ef4444' : '1px solid #444', cursor: isChecking ? 'not-allowed' : 'pointer' }}
                    onClick={e => { e.stopPropagation(); handleTaskCheck(taskKey, task); }}
                    disabled={isChecking}>
                    {isChecking
                      ? <span style={{ width: 14, height: 14, border: '2px solid #fff', borderTop: '2px solid #555', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}/>
                      : taskDone === true  ? <img src={applied} alt="done" className="w-5"/>
                      : taskDone === false ? <img src={cross}   alt="fail" className="w-5"/>
                      : 'Check'}
                  </button>
                  {noCode && <span className="text-red-400 text-[10px] text-right leading-tight" style={{ maxWidth: 130 }}>Sync notebook first</span>}
                </div>
              </div>

              {isExpanded && (
                <div className="ml-2 mt-2">
                  {task.Goal && (
                    <div className="mb-4 p-3" style={{ background: '#1a1a1d', border: '1px solid #444' }}>
                      <h4 className="text-xs font-semibold mb-1 text-left" style={{ color: '#a78bfa' }}>Goal</h4>
                      <p className="text-xs text-left" style={{ color: '#e5e7eb', lineHeight: 1.4 }}>{task.Goal}</p>
                    </div>
                  )}
                  <ul className="space-y-2">
                    {(task.subtasks || []).map((subDesc, subIdx) => {
                      const subResult    = results[subIdx];
                      const subLoading   = isChecking && subResult === undefined;
                      const isReasonOpen = hoveredReason.clicked && hoveredReason.taskKey === taskKey && hoveredReason.subIdx === subIdx;
                      return (
                        <li key={subIdx} className="group flex text-left items-center justify-between"
                            style={{ borderBottom: '1px solid #333', paddingBottom: 6, marginBottom: 4 }}>
                          <span className="text-xs flex-1 mr-3" style={{ color: '#f3f4f6' }}>{subDesc}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {subResult !== undefined && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity relative bulb-icon-container">
                                <FaLightbulb
                                  className="text-yellow-400/60 hover:text-yellow-400 cursor-pointer"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setHoveredReason(prev => ({ taskKey, subIdx, clicked: !(prev.taskKey === taskKey && prev.subIdx === subIdx && prev.clicked) }));
                                  }}/>
                                {isReasonOpen && (
                                  <div ref={tooltipRef} className="tooltip-container"
                                       style={{ position: 'fixed', right: 80, top: '50%', transform: 'translateY(-50%)', zIndex: 1000, background: '#23232a', color: '#e5e7eb', fontSize: 13, border: '1px solid #555', borderRadius: 8, padding: '12px 16px', maxWidth: 'min(480px, 38vw)', minWidth: 260, maxHeight: '80vh', overflowY: 'auto', whiteSpace: 'pre-line', boxShadow: '0 4px 24px rgba(0,0,0,0.5)', lineHeight: 1.5, wordBreak: 'break-word' }}
                                       onClick={e => e.stopPropagation()}
                                       onMouseLeave={() => setHoveredReason({ taskKey: null, subIdx: null, clicked: false })}>
                                    <div className={`text-xs font-semibold mb-1 ${subResult.complete ? 'text-green-400' : 'text-red-400'}`}>
                                      {subResult.complete ? '✓ Complete' : '✗ Incomplete'}
                                    </div>
                                    {subResult.reason}
                                  </div>
                                )}
                              </div>
                            )}
                            {subLoading && <span style={{ width: 13, height: 13, border: '2px solid #fff', borderTop: '2px solid #555', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}/>}
                            {subResult !== undefined && <img src={subResult.complete ? applied : cross} alt="" className="w-4"/>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {task.Output && (
                    <div className="mt-4 p-3" style={{ background: '#1a1a1d', border: '1px solid #444' }}>
                      <h4 className="text-xs font-semibold mb-2" style={{ color: '#a78bfa' }}>Expected Output</h4>
                      {task.Output.startsWith('http')
                        ? <img src={task.Output} alt="Expected Output" style={{ maxWidth: '100%', height: 'auto', border: '1px solid #444' }}/>
                        : <p className="text-xs" style={{ color: '#e5e7eb', lineHeight: 1.4 }}>{task.Output}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Statement;
