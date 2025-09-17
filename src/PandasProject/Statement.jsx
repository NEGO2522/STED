import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { getPandasProjectConfig, checkTasksAndSubtasksGemini } from './projectConfig';
import { FaChevronDown, FaQuestionCircle } from 'react-icons/fa';
import cross from '../assets/cross.png';
import applied from '../assets/applied.png';
import tick from '../assets/applied.png';

function Statement({ userCode, taskCheckStatus, setTaskCheckStatus, subtaskCheckResults, setSubtaskCheckResults, expandedTask, setExpandedTask }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [projectKey, setProjectKey] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState({});
  const [loadingTaskKey, setLoadingTaskKey] = useState(null);
  const hoverTimeout = useRef();
  const [showProjectDesc, setShowProjectDesc] = useState(false);
  const projectDescIconRef = useRef();
  const [hoveredReason, setHoveredReason] = useState({ taskKey: null, subIdx: null, left: false });

  useEffect(() => {
    async function fetchProjectData() {
      setLoading(true);
      setError('');
      try {
        // Fetch PandasProject/Project1 from Firebase
        const projectRef = ref(db, 'PandasProject/Project1');
        const projectSnap = await get(projectRef);
        if (!projectSnap.exists()) {
          setError('Pandas project not found.');
          setLoading(false);
          return;
        }
        setProject(projectSnap.val());
        setLoading(false);
      } catch (err) {
        setError('Failed to load project: ' + err.message);
        setLoading(false);
      }
    }
    fetchProjectData();
  }, []);

  // Close overlay on outside click
  useEffect(() => {
    if (!showProjectDesc) return;
    function handleClick(e) {
      if (projectDescIconRef.current && !projectDescIconRef.current.contains(e.target)) {
        setShowProjectDesc(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showProjectDesc]);

  // Checklist state handler
  const handleCheck = (task, subtask) => {
    setChecked((prev) => ({
      ...prev,
      [task]: {
        ...prev[task],
        [subtask]: !prev[task]?.[subtask],
      },
    }));
  };


  // Gemini check state
  const [checkResults, setCheckResults] = useState({});
  const [checking, setChecking] = useState({});
  const [checkError, setCheckError] = useState({});

  // Handler for checking a task using Gemini
  const handleTaskCheck = async (taskKey, task) => {
    if (!userCode) return;
    setLoadingTaskKey(taskKey);
    try {
      const subtasks = task.subtasks || [];
      let allComplete = true;
      const subtaskResults = [];
      for (let i = 0; i < subtasks.length; i++) {
        const subtask = subtasks[i];
        const prompt = `User's Code:\n\n${userCode}\n\nSubtask: ${subtask}\n\nIs this subtask clearly implemented in the user's code? Respond only with true or false.\nIMPORTANT: Ignore whether other subtasks are complete or not. Only check if THIS subtask is implemented, regardless of the rest of the code.\nIMPORTANT: Only consider the subtask statement itself. Make your decision strictly according to the subtask statement. Do not overthink or infer extra requirements.`;
        let isSubtaskComplete = false;
        let reason = '';
        try {
          const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
          const model = 'gemini-1.5-flash';
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          const data = await response.json();
          let answer = '';
          if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            answer = data.candidates[0].content.parts[0].text.trim().toLowerCase();
          }
          const normalized = answer.replace(/[^a-z]/g, '');
          if (normalized.startsWith('true')) isSubtaskComplete = true;
          else if (normalized.startsWith('false')) isSubtaskComplete = false;
          // Now get the reason/explanation
          const reasonPrompt = `User's Code:\n\n${userCode}\n\nSubtask: ${subtask}\n\nIf this subtask is not completed, explain why in one sentence. If it is completed, explain why it is considered complete.\nIMPORTANT: Ignore whether other subtasks are complete or not. Only check if THIS subtask is implemented, regardless of the rest of the code.\nIMPORTANT: Only consider the subtask statement itself. Make your decision strictly according to the subtask statement. Do not overthink or infer extra requirements.`;
          const reasonResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: reasonPrompt }] }] })
          });
          const reasonData = await reasonResponse.json();
          if (reasonData.candidates && reasonData.candidates[0] && reasonData.candidates[0].content && reasonData.candidates[0].content.parts) {
            reason = reasonData.candidates[0].content.parts[0].text.trim();
          }
        } catch (e) {
          // On error, treat as not complete and no reason
        }
        subtaskResults.push({ subtask, complete: isSubtaskComplete, reason });
        // Update subtasks UI as each result comes in
        setSubtaskCheckResults(prev => ({
          ...prev,
          [taskKey]: [...subtaskResults]
        }));
        if (!isSubtaskComplete) allComplete = false;
      }
      setTaskCheckStatus(prev => ({ ...prev, [taskKey]: allComplete }));
      if (!allComplete) {
        // Optionally, show modal with missing subtasks (reuse modal logic)
      }
    } catch (e) {
      // Optionally handle error
    }
    setLoadingTaskKey(null);
  };

  // Handler for checking a subtask using Gemini
  const handleGeminiCheck = async (taskKey, subIdx, subDesc) => {
    setChecking(prev => ({ ...prev, [`${taskKey}_${subIdx}`]: true }));
    setCheckError(prev => ({ ...prev, [`${taskKey}_${subIdx}`]: '' }));
    try {
      // Get project config (from Firebase or fallback)
      const config = await getPandasProjectConfig('Project1');
      // Use only the code from userCode (should be the Colab code as string)
      const result = await checkTasksAndSubtasksGemini(userCode, config);
      // result: { [taskKey]: { completed: [], reasons: {} } }
      const isComplete = result[taskKey]?.completed?.includes(subDesc);
      const reason = result[taskKey]?.reasons?.[subDesc] || '';
      setCheckResults(prev => ({ ...prev, [`${taskKey}_${subIdx}`]: { isComplete, reason } }));
    } catch (e) {
      setCheckError(prev => ({ ...prev, [`${taskKey}_${subIdx}`]: 'Check failed. Try again.' }));
    } finally {
      setChecking(prev => ({ ...prev, [`${taskKey}_${subIdx}`]: false }));
    }
  };

  if (loading) {
    return <div className="p-8 text-lg text-white">Loading project statement...</div>;
  }
  if (error) {
    return <div className="p-8 text-lg text-red-500">{error}</div>;
  }
  if (!project) {
    return <div className="p-8 text-lg text-slate-600">No project data.</div>;
  }

  return (
    <div
      className="p-8 max-w-2xl shadow-lg mt-6 animate-fadeIn"
      style={{
        maxHeight: '79vh',
        overflowY: 'auto',
        background: '#18181b',
        color: '#f3f4f6',
        boxShadow: '0 4px 32px #000a',
      }}
    >
      <h1 className="text-3xl text-center justify-center font-bold mb-2 flex gap-2 items-center relative" style={{ color: '#a78bfa' }}>
        {project.title}
        <span ref={projectDescIconRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <FaQuestionCircle
            style={{
              color: '#e5e7eb',
              fontSize: 22,
              marginLeft: 8,
              cursor: 'pointer',
              verticalAlign: 'middle',
              opacity: 0.85,
              transition: 'color 0.2s'
            }}
            onClick={() => setShowProjectDesc(v => !v)}
            title="Show project description"
          />
          {showProjectDesc && (
            <div
              style={{
                position: 'absolute',
                top: 32,
                right: 0,
                zIndex: 100,
                background: '#23232a',
                color: '#e5e7eb',
                border: '1px solid #444',
                borderRadius: 8,
                padding: '16px 20px',
                minWidth: 350,
                maxWidth: 340,
                boxShadow: '0 4px 24px #000a',
                fontSize: 16,
                lineHeight: '1.6',
                whiteSpace: 'pre-line',
                transition: 'opacity 0.3s cubic-bezier(.4,0,.2,1), transform 0.3s cubic-bezier(.4,0,.2,1)',
                opacity: 1,
                transform: 'translateY(0px) scale(1)'
              }}
            >
              {project.description}
            </div>
          )}
        </span>
      </h1>
      {project.Concept && (
        <div className="text-center mb-6">
          <p className="text-sm text-gray-400" style={{ fontSize: '14px', color: '#9ca3af' }}>
            <span className='font-semibold'>Concepts Used:</span> {project.Concept}
          </p>
        </div>
      )}
      <div className="space-y-6 mt-10">
        {project.tasks && Object.entries(project.tasks).map(([taskKey, task]) => {
          const isExpanded = expandedTask === taskKey;
          return (
            <div
              key={taskKey}
              className="p-4 shadow border"
              style={{ background: '#23232a', borderColor: '#444', borderRadius: 0 }}
            >
              <div
                className="font-semibold mb-2 text-lg flex items-center justify-between cursor-pointer select-none"
                style={{ color: '#e5e7eb', borderRadius: 0, fontSize: 24, lineHeight: '2.2rem' }}
                onClick={() => setExpandedTask(isExpanded ? null : taskKey)}
              >
                <span className="flex items-center gap-2">
                  <FaChevronDown
                    style={{
                      transition: 'transform 0.3s',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      fontSize: 16,
                    }}
                  />
                  <span
                    className="px-3 py-1"
                    style={{ background: '#23232a', color: '#e5e7eb', borderRadius: 0, fontWeight: 400, fontSize: 20, lineHeight: '2.2rem' }}
                  >
                    {task.title}
                  </span>
                </span>
                <button
                  className="ml-4 px-3 py-1 text-white font-semibold text-sm flex items-center gap-2"
                  style={{ minWidth: 70, minHeight: 32, position: 'relative', background: '#333', borderRadius: 0, border: '1px solid #444' }}
                  onClick={e => {
                    e.stopPropagation();
                    handleTaskCheck(taskKey, task);
                  }}
                  disabled={loadingTaskKey === taskKey}
                >
                  {loadingTaskKey === taskKey ? (
                    <span className="loader mr-2" style={{ width: 16, height: 16, border: '2px solid #fff', borderTop: '2px solid #888', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                  ) : taskCheckStatus[taskKey] === true ? (
                    <img src={tick} alt="" className='w-5' />
                  ) : taskCheckStatus[taskKey] === false ? (
                    <img src={cross} alt="" className='w-5' />
                  ) : (
                    'Check'
                  )}
                </button>
              </div>
              {isExpanded && (
                <ul className="space-y-2 ml-2 mt-2">
                  {task.subtasks && task.subtasks.map((subDesc, subIdx) => {
                    const checkKey = `${taskKey}_${subIdx}`;
                    const result = checkResults[checkKey];
                    const isChecking = checking[checkKey];
                    const errorMsg = checkError[checkKey];
return (
                      <li
                        key={subIdx}
                        className="flex text-left items-center justify-between"
                        style={{ borderBottom: '1px solid #333', paddingBottom: 6, marginBottom: 4, paddingRight: 0 }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={!!checked[taskKey]?.[subIdx]}
                            onChange={() => handleCheck(taskKey, subIdx)}
                            className="border-gray-600 focus:ring-2 bg-[#18181b]"
                            style={{ background: '#18181b', width: 20, height: 20, minWidth: 20, minHeight: 20, flexShrink: 0, borderRadius: 0 }}
                          />
                          <span
                            className={`text-base ${checked[taskKey]?.[subIdx] ? 'line-through text-gray-500' : ''}`}
                            style={{ color: checked[taskKey]?.[subIdx] ? '#6b7280' : '#f3f4f6' }}
                          >
                            {subDesc}
                          </span>
                        </div>
                        
                        {/* Tick/cross for subtask check and reason - positioned at right border */}
                        {loadingTaskKey === taskKey && (!subtaskCheckResults[taskKey] || subtaskCheckResults[taskKey][subIdx] === undefined) ? (
                          <span className="loader" style={{ width: 14, height: 14, border: '2px solid #fff', borderTop: '2px solid #888', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: 0 }} />
                        ) : subtaskCheckResults[taskKey] && subtaskCheckResults[taskKey][subIdx] !== undefined ? (
                          <div style={{ position: 'relative', marginRight: 0 }}>
                            <img
                              src={subtaskCheckResults[taskKey][subIdx].complete ? applied : cross}
                              alt=""
                              className="w-5 cursor-pointer"
                              onMouseEnter={e => {
                                clearTimeout(hoverTimeout.current);
                                const rect = e.target.getBoundingClientRect();
                                const rightSpace = window.innerWidth - rect.right;
                                hoverTimeout.current = setTimeout(() => {
                                  setHoveredReason({ taskKey, subIdx, left: rightSpace < 250 });
                                }, 200);
                              }}
                              onMouseLeave={() => {
                                clearTimeout(hoverTimeout.current);
                                hoverTimeout.current = setTimeout(() => {
                                  setHoveredReason({ taskKey: null, subIdx: null });
                                }, 200);
                              }}
                            />
                            {(hoveredReason.taskKey === taskKey && hoveredReason.subIdx === subIdx) && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 24,
                                  left: hoveredReason.left ? 'auto' : 0,
                                  right: hoveredReason.left ? 0 : 'auto',
                                  zIndex: 100,
                                  background: '#23232a',
                                  color: '#e5e7eb',
                                  fontSize: 11,
                                  border: '1px solid #444',
                                  borderRadius: 0,
                                  padding: '6px 10px',
                                  minWidth: 120,
                                  maxWidth: 220,
                                  whiteSpace: 'pre-line',
                                  boxShadow: '0 2px 8px #0006',
                                  transition: 'opacity 0.4s cubic-bezier(.4,0,.2,1), transform 0.4s cubic-bezier(.4,0,.2,1)',
                                  opacity: 1,
                                  transform: 'translateY(0px) scale(1)',
                                }}
                              >
                                {subtaskCheckResults[taskKey][subIdx].reason
                                  .split(/(?<=[.!?])\s+/)
                                  .slice(0, 2)
                                  .join(' ')
                                  .slice(0, 140)}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Statement;
