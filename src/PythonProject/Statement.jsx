import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ref, get, onValue, off } from 'firebase/database';
import { db } from '../firebase';
import { getProjectConfig, checkTasksAndSubtasks } from './projectConfig';
import { FaChevronDown } from 'react-icons/fa';
import { FaQuestionCircle, FaLightbulb } from 'react-icons/fa';
import cross from '../assets/cross.png';
import applied from '../assets/applied.png';
import tick from '../assets/applied.png';

function Statement({ userCode, projectConfig, taskCheckStatus, setTaskCheckStatus, subtaskCheckResults, setSubtaskCheckResults, expandedTask, setExpandedTask, showSubmitOverlay }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [projectKey, setProjectKey] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalSubtasks, setModalSubtasks] = useState([]);
  const [modalTaskTitle, setModalTaskTitle] = useState('');
  const [loadingTaskKey, setLoadingTaskKey] = useState(null);
  const [modalReasons, setModalReasons] = useState({});
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    async function fetchProjectKeyAndData() {
      if (!isLoaded || !isSignedIn || !user) return;
      setLoading(true);
      setError('');
      try {
        // Get user's data
        const userRef = ref(db, 'users/' + user.id);
        const userSnap = await get(userRef);
        
        if (!userSnap.exists()) {
          setError('User data not found.');
          setLoading(false);
          return;
        }
        
        const userData = userSnap.val();
        const pythonData = userData.python || {};
        let startedKey = pythonData.PythonCurrentProject;
        
        if (!startedKey) {
          setError('No Python project started.');
          setLoading(false);
          return;
        }
        
        console.log('Fetching project with key:', startedKey);
        setProjectKey(startedKey);
        
        // Normalize the key to lowercase for generated projects
        const normalizedKey = startedKey.toLowerCase();
        console.log('Normalized project key:', normalizedKey);
        
        // First try to get the project with the exact key
        const projectRef = ref(db, 'PythonProject/' + startedKey);
        const projectSnap = await get(projectRef);
        
        let projectData = null;
        
        if (projectSnap.exists()) {
          // Found with exact key
          projectData = projectSnap.val();
          console.log('Found project with exact key:', projectData);
        } else if (startedKey !== normalizedKey) {
          // Try with normalized key if different
          console.log('Trying with normalized key...');
          const normalizedRef = ref(db, 'PythonProject/' + normalizedKey);
          const normalizedSnap = await get(normalizedRef);
          
          if (normalizedSnap.exists()) {
            projectData = normalizedSnap.val();
            console.log('Found project with normalized key:', projectData);
            // Update the project key to match the stored key
            startedKey = normalizedKey;
            setProjectKey(normalizedKey);
          }
        }
        
        // If still not found, try predefined configs
        if (!projectData) {
          console.log('Project not found in PythonProject, trying predefined configs...');
          projectData = await getProjectConfig(startedKey);
          console.log('Predefined project data:', projectData);
        }
        
        if (!projectData) {
          console.error('Project data is null or undefined');
          setError('Project data not found.');
          setLoading(false);
          return;
        }
        
        // Normalize project data structure
        const normalizedProject = {
          ...projectData,
          tasks: projectData.tasks || {
            task1: { 
              title: projectData.title || 'Main Task', 
              subtasks: projectData.subtasks || [],
              description: projectData.description || ''
            }
          },
          title: projectData.title || 'Python Project',
          description: projectData.description || '',
          difficulty: projectData.difficulty || 'beginner',
          estimatedTime: projectData.estimatedTime || '1-2 hours',
          concepts: projectData.concepts || []
        };
        
        console.log('Normalized project data:', normalizedProject);
        setProject(normalizedProject);
        setLoading(false);
        
      } catch (err) {
        console.error('Error in fetchProjectKeyAndData:', err);
        setError('Failed to load project. Please try again later.');
        setLoading(false);
      }
    }
    
    fetchProjectKeyAndData();
    
    // Set up real-time listener for project updates
    const projectRef = ref(db, 'PythonProject');
    const projectListener = onValue(projectRef, (snapshot) => {
      if (projectKey && snapshot.exists()) {
        const projects = snapshot.val();
        if (projects[projectKey]) {
          setProject(prev => ({
            ...prev,
            ...projects[projectKey]
          }));
        }
      }
    });
    
    return () => {
      // Cleanup listener
      off(projectRef, 'value', projectListener);
    };
  }, [isLoaded, isSignedIn, user, projectKey]);

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

  const handleTaskCheck = async (taskKey, task) => {
    // Do not perform checks while submit overlay is open to avoid differing results
    if (showSubmitOverlay) return;
    if (!userCode || !projectConfig) return;
    setLoadingTaskKey(taskKey);
    try {
      // Handle both standard 'subtasks' array and ProjectTasks structure
      let subtasks = task.subtasks || [];
      
      // For ProjectTasks structure, convert object entries to array
      if (subtasks.length === 0 && task.title) {
        // This might be a ProjectTasks structure where subtasks are separate properties
        subtasks = Object.entries(task)
          .filter(([key]) => key !== 'title')
          .map(([key, value]) => value);
      }
      
      let allComplete = true;
      const subtaskResults = [];
      for (let i = 0; i < subtasks.length; i++) {
        const subtask = subtasks[i];
        const prompt = `User's Code:

${userCode}

Subtask to evaluate: "${subtask}"

CRITICAL INSTRUCTIONS - READ CAREFULLY:
You are evaluating ONLY this specific subtask. Do NOT consider any future subtasks or functionality that comes after this one in the sequence.

EVALUATION PRINCIPLES:
1. Parse the subtask statement carefully and identify ALL requirements it contains
2. Check if ALL parts of THIS subtask are implemented (not just some parts)
3. Do NOT check for functionality from future subtasks
4. Do NOT mark incomplete because future subtasks are missing
5. Each subtask is INDEPENDENT - evaluate it on its own merits

HOW TO EVALUATE:
- If subtask says "Create X to do Y", you need BOTH X created AND Y functionality
- If subtask says "Do X", you only need X done
- If subtask says "Handle X", you need X handling logic
- Evaluate what THIS subtask explicitly asks for, nothing more, nothing less

WHAT NOT TO DO:
- DO NOT penalize for missing future subtasks
- DO NOT add extra requirements not mentioned in THIS subtask
- DO NOT consider code quality, optimization, or completeness of other features

EXAMPLE LOGIC (generic, applies to any subtask):
- Subtask: "Create a loop to display options"
  ✓ Complete if: loop exists AND options are displayed
  ✗ Incomplete if: only loop exists (without display) OR only display exists (without loop)
  ✓ Still complete even if: input handling missing (different subtask)

- Subtask: "Get user input"
  ✓ Complete if: input is captured
  ✗ Incomplete if: no input captured
  ✓ Still complete even if: validation missing (different subtask)

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
      className="p-8 max-w-2xl mt-6 animate-fadeIn"
      style={{
        maxHeight: '79vh',
        overflowY: 'auto',
        background: 'linear-gradient(145deg, #1a1a1e 0%, #1e1e24 100%)',
        color: '#f3f4f6',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        scrollbarWidth: 'thin',
        scrollbarColor: '#4a4a4a #2a2a2a',
      }}
    >
      <h1 
        className="text-3xl text-center justify-center font-bold mb-4 flex gap-2 items-center relative" 
        style={{ 
          color: '#8b5cf6',
          textShadow: '0 0 10px rgba(139, 92, 246, 0.3)',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)'
        }}
      >
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

      <div className="space-y-4 mt-8">
                {project.tasks || project.ProjectTasks
          ? Object.entries(project.tasks || project.ProjectTasks).map(([taskKey, task]) => {
              const isExpanded = expandedTask === taskKey;
              return (
                <div
                  key={taskKey}
                  className="p-0 overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg"
                  style={{
                    background: 'rgba(30, 30, 35, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    transition: 'all 0.3s ease-in-out',
                  }}
                >
                  <div
                    className="px-6 py-4 flex items-center justify-between cursor-pointer select-none transition-colors duration-200 hover:bg-white/5"
                    style={{ 
                      color: '#f3f4f6',
                      fontSize: '1.1rem',
                      fontWeight: 500,
                      borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                    }}
                    onClick={() => setExpandedTask(isExpanded ? null : taskKey)}
                  >
                    <div className="flex items-center gap-3">
                      <FaChevronDown
                        style={{
                          transition: 'all 0.3s ease',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          fontSize: '0.9rem',
                          color: '#8b5cf6',
                          opacity: 0.8,
                        }}
                      />
                      <span className="text-lg font-medium text-white">
                        {task.title}
                      </span>
                    </div>
                    <button
                      className="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)',
                        minWidth: '80px',
                        justifyContent: 'center',
                        opacity: loadingTaskKey === taskKey ? 0.7 : 1,
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        handleTaskCheck(taskKey, task);
                      }}
                      disabled={loadingTaskKey === taskKey}
                    >
                      {loadingTaskKey === taskKey ? (
                        <span className="loader" style={{ 
                          width: 16, 
                          height: 16, 
                          border: '2px solid rgba(255,255,255,0.3)', 
                          borderTop: '2px solid #fff', 
                          borderRadius: '50%', 
                          display: 'inline-block', 
                          animation: 'spin 0.8s linear infinite' 
                        }} />
                      ) : taskCheckStatus[taskKey] === true ? (
                        <img src={tick} alt="Completed" className='w-4 h-4' />
                      ) : taskCheckStatus[taskKey] === false ? (
                        <img src={cross} alt="Not Completed" className='w-4 h-4' />
                      ) : (
                        <span>Check</span>
                      )}
                    </button>
                  </div>
                  {isExpanded && (
                    <ul className="space-y-0.5 px-4 py-2 bg-black/5">
                      {task.subtasks && task.subtasks.map((subDesc, subIdx) => (
                        <li
                          key={subIdx}
                          className="group flex text-left items-center justify-between py-1.5 px-3 rounded hover:bg-gray-800/30 transition-colors"
                          style={{ 
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
                            marginBottom: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.02)'
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm" style={{ color: '#d1d5db' }}>
                              {subDesc}
                            </span>
                          </div>
                          {/* Tick/cross for subtask check and reason - positioned at right border */}
                          <div className="flex items-center gap-2">
                            {loadingTaskKey === taskKey && (!subtaskCheckResults[taskKey] || subtaskCheckResults[taskKey][subIdx] === undefined) ? (
                              <span className="loader" style={{ width: 14, height: 14, border: '2px solid #fff', borderTop: '2px solid #888', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                            ) : subtaskCheckResults[taskKey] && subtaskCheckResults[taskKey][subIdx] !== undefined ? (
                              <div style={{ position: 'relative' }}>
                                <img
                                  src={subtaskCheckResults[taskKey][subIdx].complete ? applied : cross}
                                  alt={subtaskCheckResults[taskKey][subIdx].complete ? 'Completed' : 'Not Completed'}
                                  className="w-5"
                                />
                                {false && (
                                  <div 
                                    style={{
                                      position: 'absolute',
                                      [hoveredReason.left ? 'right' : 'left']: '100%',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      zIndex: 100,
                                      background: '#23232a',
                                      color: '#e5e7eb',
                                      fontSize: 11,
                                      border: '1px solid #444',
                                      borderRadius: 4,
                                      padding: '6px 10px',
                                      minWidth: 120,
                                      maxWidth: 220,
                                      whiteSpace: 'pre-line',
                                      boxShadow: '0 2px 8px #0006',
                                      marginLeft: hoveredReason.left ? 0 : 8,
                                      marginRight: hoveredReason.left ? 8 : 0
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
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          : project.ProjectTasks && Object.entries(project.ProjectTasks).map(([taskKey, task]) => {
              const isExpanded = expandedTask === taskKey;
              return (
                <div
                  key={taskKey}
                  className="p-0 overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg"
                  style={{
                    background: 'rgba(30, 30, 35, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    transition: 'all 0.3s ease-in-out',
                  }}
                >
                  <div
                    className="px-6 py-4 flex items-center justify-between cursor-pointer select-none transition-colors duration-200 hover:bg-white/5"
                    style={{ 
                      color: '#f3f4f6',
                      fontSize: '1.1rem',
                      fontWeight: 500,
                      borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                    }}
                    onClick={() => setExpandedTask(isExpanded ? null : taskKey)}
                  >
                    <div className="flex items-center gap-3">
                      <FaChevronDown
                        style={{
                          transition: 'all 0.3s ease',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          fontSize: '0.9rem',
                          color: '#8b5cf6',
                          opacity: 0.8,
                        }}
                      />
                      <span className="text-lg font-medium text-white">
                        {task.title}
                      </span>
                    </div>
                    <button
                      className="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)',
                        minWidth: '80px',
                        justifyContent: 'center',
                        opacity: loadingTaskKey === taskKey ? 0.7 : 1,
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        handleTaskCheck(taskKey, task);
                      }}
                      disabled={loadingTaskKey === taskKey}
                    >
                      {loadingTaskKey === taskKey ? (
                        <span className="loader" style={{ 
                          width: 16, 
                          height: 16, 
                          border: '2px solid rgba(255,255,255,0.3)', 
                          borderTop: '2px solid #fff', 
                          borderRadius: '50%', 
                          display: 'inline-block', 
                          animation: 'spin 0.8s linear infinite' 
                        }} />
                      ) : taskCheckStatus[taskKey] === true ? (
                        <img src={applied} alt="Completed" className='w-4 h-4' />
                      ) : taskCheckStatus[taskKey] === false ? (
                        <img src={cross} alt="Not Completed" className='w-4 h-4' />
                      ) : (
                        <span>Check</span>
                      )}
                    </button>
                  </div>
                  {isExpanded && (
                    <>
                      <ul className="space-y-1 px-2 py-1">
                        {Object.entries(task)
                          .filter(([k]) => k !== 'title')
                          .map(([subKey, subDesc], idx) => (
                            <li
                              key={idx}
                              className="flex text-left items-center justify-between py-1.5 px-3 rounded transition-colors duration-150 hover:bg-white/5"
                              style={{
                                borderLeft: '1px solid rgba(139, 92, 246, 0.2)',
                                margin: '1px 0',
                                backgroundColor: 'rgba(255, 255, 255, 0.02)'
                              }}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-xs text-gray-400 leading-relaxed">
                                  {subDesc}
                                </span>
                              </div>
                            </li>
                          ))}
                      </ul>
                      <div className="mt-4 border-t border-gray-600"></div>
                    </>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}

export default Statement;
