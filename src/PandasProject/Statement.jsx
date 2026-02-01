import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { getPandasProjectConfig, checkTasksAndSubtasksGemini } from './projectConfig';
import { FaChevronDown, FaQuestionCircle, FaLightbulb } from 'react-icons/fa';
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
  const [hoveredReason, setHoveredReason] = useState({ taskKey: null, subIdx: null, left: false, clicked: false, offsetRight: 20 });
  const tooltipRef = useRef(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        // Check if the click is not on a bulb icon
        const isBulbIcon = event.target.closest('.bulb-icon-container');
        if (!isBulbIcon) {
          setHoveredReason(prev => ({ ...prev, clicked: false }));
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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


  // OpenAI check state
  const [checkResults, setCheckResults] = useState({});
  const [checking, setChecking] = useState({});
  const [checkError, setCheckError] = useState({});

  // Handler for checking a task using OpenAI
  const handleTaskCheck = async (taskKey, task) => {
    if (!userCode) return;
    setLoadingTaskKey(taskKey);
    try {
      const subtasks = task.subtasks || [];
      let allComplete = true;
      const subtaskResults = [];
      for (let i = 0; i < subtasks.length; i++) {
        const subtask = subtasks[i];
        const prompt = `User's Code:

${userCode}

Subtask to evaluate: "${subtask}"

CRITICAL INSTRUCTIONS - READ CAREFULLY:
You are evaluating ONLY this specific subtask. Do NOT consider any future subtasks or functionality that comes after this one in the sequence.

EVALUATION RULES:
1. Evaluate ONLY what THIS specific subtask requires - nothing more, nothing less
2. DO NOT check if future subtasks are implemented
3. DO NOT mark this subtask as incomplete because future functionality is missing
4. Each subtask is INDEPENDENT and should be evaluated on its own merits
5. If a subtask asks to "create a DataFrame", ONLY check if a DataFrame is created
6. If a subtask asks to "filter data", ONLY check if filtering is done
7. If a subtask asks to "handle missing values", ONLY then check for missing value handling

Respond in this exact format:
Status: [true/false]
Reason: [Your explanation - mention ONLY what THIS subtask requires]

The reason must:
- Only address THIS specific subtask's requirements
- NOT mention future subtasks or unrelated functionality
- Be specific about what's implemented or missing for THIS subtask ONLY`;
        let isSubtaskComplete = false;
        let reason = '';
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.2,
              max_tokens: 256
            })
          });
          const data = await response.json();
          let answer = '';
          if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            answer = data.choices[0].message.content.trim().toLowerCase();
          }
          // Parse status and reason from the single response
          const statusMatch = answer.match(/Status\s*:?\s*(true|false)/i);
          const reasonMatch = answer.split(/\n/).find(line => line.toLowerCase().startsWith('reason:'));
          
          if (statusMatch) {
            isSubtaskComplete = statusMatch[1].toLowerCase() === 'true';
          }
          
          if (reasonMatch) {
            reason = reasonMatch.replace(/^reason\s*:?\s*/i, '').trim();
          } else {
            // If no reason found, use the rest of the response
            reason = answer.replace(/Status\s*:?\s*(true|false)[\s\n]*/i, '').trim();
          }
          
          // Ensure we have a reason
          if (!reason) {
            reason = isSubtaskComplete 
              ? 'The task requirements appear to be met.' 
              : 'The task requirements are not fully implemented.';
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

  // Handler for checking a subtask using OpenAI
  const handleOpenAICheck = async (taskKey, subIdx, subDesc) => {
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
      setCheckResults(prev => ({ ...prev, [`${taskKey}_${subIdx}`]: { complete: isComplete, reason } }));
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
      {project.DataLink && (
        <div className="text-center mb-6">
          <div className="inline-block" style={{ maxWidth: '600px', width: '100%' }}>
            <p className="text-sm text-gray-400" style={{ fontSize: '14px', color: '#9ca3af' }}>
              <span className='font-semibold'>Data Link -</span>{' '}
              <a 
                href={project.DataLink} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#a78bfa', textDecoration: 'underline' }}
              >
                click here
              </a>
            </p>
          </div>
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
                    style={{ background: '#23232a',textAlign: 'left', color: '#e5e7eb', borderRadius: 0, fontWeight: 400, fontSize: 16, lineHeight: '2.2rem' }}
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
                <div className="ml-2 mt-2">
                  {/* Display Goal if exists */}
                  {task.Goal && (
                    <div className="mb-4 p-3" style={{ background: '#1a1a1d', border: '1px solid #444', borderRadius: 0 }}>
                      <h4 className="text-sm text-left font-semibold mb-2" style={{ color: '#a78bfa', fontSize: 14 }}>Goal</h4>
                      <p className="text-xs text-left" style={{ color: '#e5e7eb', lineHeight: '1.4' }}>{task.Goal}</p>
                    </div>
                  )}
                  
                  <ul className="space-y-2">
                    {task.subtasks && task.subtasks.map((subDesc, subIdx) => {
                    const checkKey = `${taskKey}_${subIdx}`;
                    const result = checkResults[checkKey];
                    const isChecking = checking[checkKey];
                    const errorMsg = checkError[checkKey];
return (
                      <li
                        key={subIdx}
                        className="group flex text-left items-center justify-between"
                        style={{ borderBottom: '1px solid #333', paddingBottom: 6, marginBottom: 4, paddingRight: 0 }}
                      >
                        <div className="flex items-center gap-3 flex-1" style={{ minWidth: 'calc(100% - 80px)', maxWidth: 'calc(100% - 80px)' }}>
                          <span
                            className={`text-xs ${checked[taskKey]?.[subIdx] ? 'line-through text-gray-500' : ''}`}
                            style={{ color: checked[taskKey]?.[subIdx] ? '#6b7280' : '#f3f4f6' }}
                          >
                            {subDesc}
                          </span>
                        </div>
                        
                        {/* Bulb icon for showing reason */}
                        {(loadingTaskKey === taskKey || (subtaskCheckResults[taskKey] && subtaskCheckResults[taskKey][subIdx] !== undefined)) && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity relative bulb-icon-container">
                            <FaLightbulb 
                              className="text-yellow-400/60 hover:text-yellow-400 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHoveredReason(prev => {
                                  const isSame = prev.taskKey === taskKey && prev.subIdx === subIdx && prev.clicked;
                                  // shift overlay a bit left from the right edge
                                  const newOffset = 80; // px from right
                                  return { taskKey, subIdx, left: false, clicked: !isSame, offsetRight: newOffset };
                                });
                              }}
                            />
                            {hoveredReason.clicked && hoveredReason.taskKey === taskKey && hoveredReason.subIdx === subIdx && (
                              <div 
                                ref={tooltipRef}
                                className="tooltip-container"
                                style={{
                                  position: 'fixed',
                                  right: hoveredReason.offsetRight || 20,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  zIndex: 1000,
                                  background: '#23232a',
                                  color: '#e5e7eb',
                                  fontSize: 14,
                                  border: '1px solid #444',
                                  borderRadius: 8,
                                  padding: '12px 16px',
                                  maxWidth: 'min(500px, 40vw)',
                                  minWidth: '300px',
                                  maxHeight: '80vh',
                                  overflowY: 'auto',
                                  whiteSpace: 'pre-line',
                                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
                                  lineHeight: '1.5',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word'
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseLeave={() => {
                                  setHoveredReason({ taskKey: null, subIdx: null, clicked: false });
                                }}
                              >
                                {subtaskCheckResults[taskKey]?.[subIdx]?.reason || 'No reason available'}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Tick/cross for subtask check and reason - positioned at right border */}
                        {loadingTaskKey === taskKey && (!subtaskCheckResults[taskKey] || subtaskCheckResults[taskKey][subIdx] === undefined) ? (
                          <span className="loader" style={{ width: 14, height: 14, border: '2px solid #fff', borderTop: '2px solid #888', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: 0 }} />
                        ) : subtaskCheckResults[taskKey] && subtaskCheckResults[taskKey][subIdx] !== undefined ? (
                          <img
                            src={subtaskCheckResults[taskKey][subIdx].complete ? applied : cross}
                            alt=""
                            className="w-5"
                            style={{ marginRight: 0 }}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                
                {/* Display Output if exists - show after subtasks */}
                {task.Output && (
                  <div className="mt-4 p-3" style={{ background: '#1a1a1d', border: '1px solid #444', borderRadius: 0 }}>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: '#a78bfa', fontSize: 14 }}>Expected Output</h4>
                    {task.Output && task.Output.startsWith('http') ? (
                      <img 
                        src={task.Output} 
                        alt="Expected Output" 
                        style={{ 
                          maxWidth: '100%', 
                          height: 'auto', 
                          borderRadius: 0,
                          border: '1px solid #444'
                        }} 
                      />
                    ) : (
                      <p className="text-xs" style={{ color: '#e5e7eb', lineHeight: '1.4' }}>{task.Output}</p>
                    )}
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
