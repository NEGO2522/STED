import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ref, get, onValue, off } from 'firebase/database';
import { db } from '../firebase';
import { getProjectConfig, checkTasksAndSubtasks, checkTasksAndSubtasksGemini } from './projectConfig';
import { FaChevronDown } from 'react-icons/fa';
import { FaQuestionCircle } from 'react-icons/fa';
import cross from '../assets/cross.png';
import applied from '../assets/applied.png';
import tick from '../assets/applied.png';

function Statement({ userCode, projectConfig, taskCheckStatus, setTaskCheckStatus, subtaskCheckResults, setSubtaskCheckResults, expandedTask, setExpandedTask }) {
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
  const [hoveredReason, setHoveredReason] = useState({ taskKey: null, subIdx: null, left: false });

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
        background: '#18181b', // slate-900
        color: '#f3f4f6', // slate-100
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
                {project.tasks || project.ProjectTasks
          ? Object.entries(project.tasks || project.ProjectTasks).map(([taskKey, task]) => {
              const isExpanded = expandedTask === taskKey;
              return (
                <div
                  key={taskKey}
                  className="p-4 shadow border"
                  style={{
                    background: '#23232a',
                    borderColor: '#444',
                    borderRadius: 0,
                  }}
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
                      {task.subtasks && task.subtasks.map((subDesc, subIdx) => (
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
                  className="p-4 shadow border"
                  style={{
                    background: '#23232a',
                    borderColor: '#444',
                    borderRadius: 0,
                  }}
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
                        style={{ background: '#23232a', color: '#e5e7eb', borderRadius: 0, fontWeight: 700, fontSize: 24, lineHeight: '2.2rem' }}
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
                        <img src={applied} alt="" className='w-5' />
                      ) : taskCheckStatus[taskKey] === false ? (
                        <img src={cross} alt="" className='w-5' />
                      ) : (
                        'Check'
                      )}
                    </button>
                  </div>
                  {isExpanded && (
                    <ul className="space-y-2 ml-2 mt-2">
                      {Object.entries(task)
                        .filter(([k]) => k !== 'title')
                        .map(([subKey, subDesc], idx) => (
                          <li
                            key={subKey}
                            className="flex text-left items-center justify-between"
                            style={{ borderBottom: '1px solid #333', paddingBottom: 6, marginBottom: 4, paddingRight: 0 }}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type="checkbox"
                                checked={!!checked[taskKey]?.[idx]}
                                onChange={() => handleCheck(taskKey, idx)}
                                className="border-gray-600 focus:ring-2 bg-[#18181b]"
                                style={{ background: '#18181b', width: 20, height: 20, minWidth: 20, minHeight: 20, flexShrink: 0, borderRadius: 0 }}
                              />
                              <span
                                className={`text-base ${checked[taskKey]?.[idx] ? 'line-through text-gray-500' : ''}`}
                                style={{ color: checked[taskKey]?.[idx] ? '#6b7280' : '#f3f4f6' }}
                              >
                                {subDesc}
                              </span>
                            </div>
                          </li>
                        ))}
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
