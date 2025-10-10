import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ref, get, onValue, off } from 'firebase/database';
import { db } from '../firebase';
import { getProjectConfig, checkTasksAndSubtasks } from './projectConfig';
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
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0,
              max_tokens: 10
            })
          });
          const data = await response.json();
          let answer = '';
          if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            answer = data.choices[0].message.content.trim().toLowerCase();
          }
          const normalized = answer.replace(/[^a-z]/g, '');
          if (normalized.startsWith('true')) isSubtaskComplete = true;
          else if (normalized.startsWith('false')) isSubtaskComplete = false;
          // Now get the reason/explanation
          const reasonPrompt = `User's Code:\n\n${userCode}\n\nSubtask: ${subtask}\n\nIf this subtask is not completed, explain why in one sentence. If it is completed, explain why it is considered complete.\nIMPORTANT: Ignore whether other subtasks are complete or not. Only check if THIS subtask is implemented, regardless of the rest of the code.\nIMPORTANT: Only consider the subtask statement itself. Make your decision strictly according to the subtask statement. Do not overthink or infer extra requirements.`;
          const reasonResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: reasonPrompt }],
              temperature: 0.2,
              max_tokens: 128
            })
          });
          const reasonData = await reasonResponse.json();
          if (reasonData.choices && reasonData.choices[0] && reasonData.choices[0].message && reasonData.choices[0].message.content) {
            reason = reasonData.choices[0].message.content.trim();
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
                    <ul className="space-y-1 px-6 py-3 bg-black/10">
                      {task.subtasks && task.subtasks.map((subDesc, subIdx) => (
                        <li
                          key={subIdx}
                          className="flex text-left items-center justify-between"
                          style={{ borderBottom: '1px solid #333', paddingBottom: 6, marginBottom: 4, paddingRight: 0 }}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-base" style={{ color: '#f3f4f6' }}>
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
                      <ul className="space-y-2 ml-2 mt-2">
                        {Object.entries(task)
                          .filter(([k]) => k !== 'title')
                          .map(([subKey, subDesc], idx) => (
                            <li
                              key={idx}
                              className="flex text-left items-center justify-between py-2 px-3 rounded-md transition-colors duration-150 hover:bg-white/5"
                              style={{
                                borderLeft: '2px solid rgba(139, 92, 246, 0.3)',
                                margin: '2px 0',
                                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
                              }}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-sm text-gray-300 leading-relaxed">
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
