import React, { useState, useEffect } from 'react';
import CodeEditor from './CodeEditor';
import Statement from './Statement';
import AI from './AI';
import { useUser } from '@clerk/clerk-react';
import { ref, update, get, onValue } from 'firebase/database';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import cross from '../assets/cross.png';
import applied from '../assets/applied.png';
import { 
  getProjectConfig, 
  validateCodeAgainstExpected, 
  checkTasksAndSubtasks, 
  analyzeTerminalOutput, 
  validateCodeLogic 
} from './projectConfig';
import { runPythonCode } from './pythonRunner';

function Project() {
  const [rightPanel, setRightPanel] = useState('statement');
  const [isExplaining, setIsExplaining] = useState(false);
  const [showEndProjectOverlay, setShowEndProjectOverlay] = useState(false);
  const [showCongratulationsOverlay, setShowCongratulationsOverlay] = useState(false);
  const [showSubmitOverlay, setShowSubmitOverlay] = useState(false);
  const [showFinalCongratulationsOverlay, setShowFinalCongratulationsOverlay] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState('');
  const [userCode, setUserCode] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [projectConfig, setProjectConfig] = useState(null);
  const { user } = useUser();
  const navigate = useNavigate();
  const [taskCheckStatus, setTaskCheckStatus] = useState({});
  const [subtaskCheckResults, setSubtaskCheckResults] = useState({});
  const [expandedTask, setExpandedTask] = useState(null);

  // Load project configuration
  useEffect(() => {
      if (!user) return;
        const userRef = ref(db, 'users/' + user.id + '/python');
    // Set up real-time listener for python node
    const unsubscribe = onValue(userRef, async (userSnap) => {
        if (userSnap.exists()) {
          const userData = userSnap.val();
          const projectKey = userData.PythonCurrentProject;
          if (projectKey) {
            const config = await getProjectConfig(projectKey);
            setProjectConfig(config);
          }
        }
    });
    return () => unsubscribe();
  }, [user]);

  // Check if project is still started when component mounts
  useEffect(() => {
    const checkProjectStatus = async () => {
      if (!user) return;
      
      try {
        const userRef = ref(db, `users/${user.id}/python`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          if (!userData.PythonProjectStarted) {
            // Project was ended, redirect to Python page
            navigate('/python');
          }
        }
      } catch (error) {
        console.error('Error checking project status:', error);
        navigate('/python');
      }
    };

    checkProjectStatus();
  }, [user, navigate]);

  const handleEndProjectClick = () => {
    setShowEndProjectOverlay(true);
  };

  const handleEndProject = async () => {
  try {
    if (user) {
      const userRef = ref(db, 'users/' + user.id);
      // Only update PythonProjectStarted, leave PythonCurrentProject as is
      const updates = {
        'python/PythonProjectStarted': false
      };
      await update(userRef, updates);
    }
    setShowEndProjectOverlay(false);
    navigate('/python');
  } catch (err) {
    console.error('Failed to end project:', err);
    setShowEndProjectOverlay(false);
    navigate('/python');
  }
};

  const handleEndProjectCancel = () => {
    setShowEndProjectOverlay(false);
  };

  const handleCongratulationsSubmit = async () => {
    try {
      if (user) {
        const userRef = ref(db, 'users/' + user.id);
        // Determine current project number from PythonCurrentProject or fallback to Project1
        const userPythonRef = ref(db, 'users/' + user.id + '/python');
        const userPythonSnap = await get(userPythonRef);
        let currentProject = 'Project1'; // fallback
        if (userPythonSnap.exists()) {
          const userPythonData = userPythonSnap.val();
          currentProject = userPythonData.PythonCurrentProject || 'Project1';
        }
        
        // Save project data to PythonCompletedProjects
        const publicUrl = `/python-project/${user.id}/${currentProject}`;
        const completedProjectData = {
          code: userCode,
          chatHistory: chatMessages,
          completedAt: new Date().toISOString(),
          projectTitle: projectConfig?.title || 'Personal Finance Tracker',
          conceptUsed: projectConfig?.Concept || '',
          terminalOutput: terminalOutput,
          projectKey: currentProject,
          publicUrl
        };
        
        // Save to users/python/PythonCompletedProjects
        const completedProjectsRef = ref(db, 'users/' + user.id + '/python/PythonCompletedProjects/' + currentProject);
        await update(completedProjectsRef, completedProjectData);
        
        // Determine next project
        let nextProject = null;
        if (currentProject === 'Project1') nextProject = 'Project2';
        else if (currentProject === 'Project2') nextProject = 'Project3';
        // Add more as needed
        const updates = {
          'python/PythonProjectStarted': false
        };
        if (nextProject) {
          updates['python/PythonCurrentProject'] = nextProject;
        }
        await update(userRef, updates);
      }
      // console.log('Project submitted successfully');
      setShowCongratulationsOverlay(false);
      setShowSubmitOverlay(false);
      setShowFinalCongratulationsOverlay(true);
    } catch (err) {
      console.error('Failed to submit project:', err);
      setShowCongratulationsOverlay(false);
      setShowSubmitOverlay(false);
      navigate('/python');
    }
  };

  const handleCongratulationsClose = () => {
    setShowCongratulationsOverlay(false);
  };

  const handleFinalCongratulationsClose = () => {
    setShowFinalCongratulationsOverlay(false);
    navigate('/python');
  };

  const handleSubmit = async () => {
    if (!projectConfig) return;
    setShowSubmitOverlay(true);
    setTaskCheckStatus({});
    setExpandedTask(null);
    const tasks = Object.entries(projectConfig.tasks || projectConfig.ProjectTasks || {});
    let results = [];
    for (let i = 0; i < tasks.length; i++) {
      const [taskKey, task] = tasks[i];
      const subtaskResults = [];
      
      // Handle both standard 'subtasks' array and ProjectTasks structure
      let subtasks = task.subtasks || [];
      
      // For ProjectTasks structure, convert object entries to array
      if (subtasks.length === 0 && task.title) {
        // This might be a ProjectTasks structure where subtasks are separate properties
        subtasks = Object.entries(task)
          .filter(([key]) => key !== 'title')
          .map(([key, value]) => value);
      }
      
      for (let j = 0; j < subtasks.length; j++) {
        const subtask = subtasks[j];
        const prompt = `User's Code:\n\n${userCode}\n\nSubtask: ${subtask}\n\nIs this subtask clearly implemented in the user's code? Respond only with true or false.`;
        let isSubtaskComplete = false;
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
        } catch (e) {
          // On error, treat as not complete
        }
        subtaskResults.push({ subtask, complete: isSubtaskComplete });
      }
      // Mark task as complete only if all subtasks are complete
      const isTaskComplete = subtaskResults.length > 0 && subtaskResults.every(r => r.complete);
      results.push({ taskTitle: task.title, complete: isTaskComplete });
      setTaskCheckStatus(prev => ({ ...prev, [taskKey]: isTaskComplete }));
    }
  };

  const handleStuckClick = () => {
    // Switch to AI tab
    setRightPanel('ai');
    
    // Add a message asking where they're stuck
    const stuckMessage = {
      id: Date.now(),
      type: 'ai',
      content: "I see you're stuck! 🤔 Where exactly are you having trouble?",
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, stuckMessage]);
  };

  const handleTaskClick = async (taskKey, task) => {
    setExpandedTask(taskKey);
    
    // Handle both standard 'subtasks' array and ProjectTasks structure
    let subtasks = task.subtasks || [];
    
    // For ProjectTasks structure, convert object entries to array
    if (subtasks.length === 0 && task.title) {
      // This might be a ProjectTasks structure where subtasks are separate properties
      subtasks = Object.entries(task)
        .filter(([key]) => key !== 'title')
        .map(([key, value]) => value);
    }
    
    // Only check subtasks if not already checked
    if (!subtaskCheckResults[taskKey] && subtasks.length > 0) {
      const results = [];
      for (let i = 0; i < subtasks.length; i++) {
        const subtask = subtasks[i];
        const prompt = `User's Code:\n\n${userCode}\n\nSubtask: ${subtask}\n\nIs this subtask clearly implemented in the user's code? Respond only with true or false.`;
        let isComplete = false;
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
          if (normalized.startsWith('true')) isComplete = true;
          else if (normalized.startsWith('false')) isComplete = false;
        } catch (e) {
          // On error, treat as not complete
        }
        results.push({ subtask, complete: isComplete });
      }
      setSubtaskCheckResults(prev => ({ ...prev, [taskKey]: results }));
    }
  };

  // Add a function to run code using the backend
  const handleRun = async () => {
    setTerminalOutput([]);
    try {
      await runPythonCode({
        code: userCode,
        onOutput: (lines) => setTerminalOutput(prev => [...prev, ...lines]),
        onInput: (prompt, resolve) => {
          // Create input dialog
          const inputValue = window.prompt(prompt);
          resolve(inputValue || '');
        },
        isPreview: false
      });
    } catch (err) {
      setTerminalOutput(prev => [...prev, '❌ Error: ' + err.message]);
    }
  };

  return (
      <>
      {/* End Project Confirmation Overlay */}
      {showEndProjectOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            minWidth: '320px',
            textAlign: 'center',
            boxShadow: '0 2px 16px #0003'
          }}>
            <h2 className="text-xl font-semibold mb-4">End Project?</h2>
            <p className="mb-4">Do you want to end this project?</p>
            <div className="flex gap-4 justify-center mt-4">
              <button 
                onClick={handleEndProject} 
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
              >
                Yes, End Project
              </button>
              <button 
                onClick={handleEndProjectCancel} 
                className="bg-gray-300 text-gray-800 px-6 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Congratulations Overlay */}
      {showCongratulationsOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.7)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px',
            borderRadius: '20px',
            minWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            color: 'white',
            animation: 'fadeInScale 0.5s ease-out'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
            <h2 className="text-3xl font-bold mb-4">Congratulations!</h2>
            <p className="text-xl mb-6">You've successfully completed the Personal Finance Tracker project!</p>
            <p className="text-lg mb-8">All requirements have been met and your code is working perfectly.</p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={handleCongratulationsSubmit} 
                className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold text-lg transition-colors"
              >
                Submit Project
              </button>
              <button 
                onClick={handleCongratulationsClose} 
                className="bg-white text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-100 font-semibold text-lg transition-colors"
              >
                Continue Working
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Congratulations Overlay */}
      {showFinalCongratulationsOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          zIndex: 1002,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '50px',
            borderRadius: '25px',
            minWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
            color: 'white',
            animation: 'fadeInScale 0.6s ease-out'
          }}>
            <div style={{ fontSize: '5rem', marginBottom: '25px' }}>🎉</div>
            <h2 className="text-4xl font-bold mb-6">Congratulations!</h2>
            <p className="text-xl mb-4">You've successfully completed the <strong>{projectConfig?.title || 'Personal Finance Tracker'}</strong> project!</p>
            <p className="text-lg mb-6">Your project has been saved and you're ready for the next challenge.</p>
            
            <div className="bg-white bg-opacity-20 rounded-xl p-6 mb-8">
              <h3 className="text-xl font-semibold mb-3">Project Details</h3>
              <div className="text-left space-y-2">
                <p><strong>Project:</strong> {projectConfig?.title || 'Personal Finance Tracker'}</p>
                <p><strong>Concepts Used:</strong> {projectConfig?.Concept || 'N/A'}</p>
                <p><strong>Completed:</strong> {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            
            <button 
              onClick={handleFinalCongratulationsClose} 
              className="bg-white text-purple-700 px-10 py-4 rounded-xl hover:bg-gray-100 font-bold text-xl transition-colors shadow-lg"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Submit Feedback Overlay */}
      {showSubmitOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(10,10,20,0.96)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'inherit',
        }}>
          <div style={{
            background: '#18181b',
            padding: '36px 32px',
            borderRadius: '18px',
            width: '600px',
            height: '80vh',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            color: '#f3f4f6',
            fontFamily: 'inherit',
            whiteSpace: 'pre-wrap',
            border: '1.5px solid #764ba2',
          }}>
            <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: '#a78bfa', letterSpacing: 1 }}>Submission Review</h2>
            <div style={{ fontSize: 18 }}>
              {Object.entries(projectConfig.tasks || projectConfig.ProjectTasks || {}).map(([taskKey, task], idx) =>
                <div key={taskKey} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#23232a',
                  borderRadius: 10,
                  padding: '16px 20px',
                  marginBottom: 18,
                  border: '1.5px solid #312e81',
                  boxShadow: '0 2px 8px #0002',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                  onClick={() => handleTaskClick(taskKey, task)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, color: '#f3f4f6', fontSize: 17 }}>{task.title}</span>
                    {taskCheckStatus[taskKey] ? (
                      taskCheckStatus[taskKey] ? (
                        <img src={applied} alt="" style={{ width: '28px', height: '28px' }} />
                      ) : (
                        <img src={cross} alt="" style={{ width: '28px', height: '28px' }} />
                      )
                    ) : (
                      <span style={{ color: '#444', fontSize: 28, fontWeight: 700 }}>?</span>
                    )}
                  </div>
                  {expandedTask === taskKey && task.subtasks && (
                    <ul className="mt-4 space-y-2">
                      {(subtaskCheckResults[taskKey] || task.subtasks.map(subtask => ({ subtask, complete: null }))).map((result, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#18181b', borderRadius: 6, padding: '8px 14px' }}>
                          <span style={{ color: '#f3f4f6', fontSize: 15 }}>{result.subtask}</span>
                          {result.complete === true ? (
                            <img src={applied} alt="" style={{ width: '22px', height: '22px' }} />
                          ) : result.complete === false ? (
                            <img src={cross} alt="" style={{ width: '22px', height: '22px' }} />
                          ) : (
                            <span style={{ color: '#a1a1aa', fontSize: 22 }}>⏳</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end mt-8">
              {(() => {
                // Check if all tasks are completed (have ticks)
                const allTasksCompleted = Object.entries(projectConfig.tasks || projectConfig.ProjectTasks || {}).every(([taskKey, task]) => {
                  return taskCheckStatus[taskKey];
                });
                
                if (allTasksCompleted) {
                  return (
                    <div className="flex justify-between w-full">
                      <button
                        onClick={() => setShowSubmitOverlay(false)}
                        className="px-7 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg text-lg"
                      >
                        Close
                      </button>
                      <button
                        onClick={handleCongratulationsSubmit}
                        className="px-7 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg text-lg"
                      >
                        Submit Project
                      </button>
                    </div>
                  );
                } else {
                  return (
                    <button
                      onClick={() => setShowSubmitOverlay(false)}
                      className="px-7 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg text-lg"
                    >
                      Close
                    </button>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* End Project & Submit Buttons */}
      <div style={{ position: 'absolute', top: 12, right: 24, display: 'flex', gap: 8, zIndex: 100 }}>
        <button
          onClick={handleSubmit}
          style={{
            padding: '4px 14px',
            background: '#22c55e',
            color: 'white',
            fontWeight: 600,
            fontSize: 13,
            border: '1px solid #15803d',
            borderRadius: 6,
            boxShadow: '0 1px 4px #0004',
            transition: 'background 0.2s',
            minWidth: 0,
            minHeight: 0,
            lineHeight: '1.2',
            cursor: 'pointer',
          }}
        >
          Submit
        </button>
        <button
          onClick={handleEndProjectClick}
          style={{
            padding: '4px 14px',
            background: '#ef4444',
            color: 'white',
            fontWeight: 600,
            fontSize: 13,
            border: '1px solid #991b1b',
            borderRadius: 6,
            boxShadow: '0 1px 4px #0004',
            transition: 'background 0.2s',
            minWidth: 0,
            minHeight: 0,
            lineHeight: '1.2',
            cursor: 'pointer',
          }}
        >
          End Project
        </button>
      </div>

      <div className="flex h-screen pt-12 p-3 bg-[#0F0F0F] w-screen">
          <div className="w-280 border border-white h-full text-white border-white">
        <CodeEditor onCodeChange={setUserCode} onOutputChange={setTerminalOutput} />
        </div>
      {/* Left side - Code Editor */}
     

      {/* Right side - Statement / AI Panel */}
      <div className="w-150 h-full text-white p-5 border border-white border-white"
      style={{"backgroundColor":"rgb(24, 24, 27)"}}
      >
        {/* Toggle Buttons */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setRightPanel('statement')}
            className={`px-4 py-2 rounded-md font-medium transition ${
              rightPanel === 'statement'
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-600 hover:bg-zinc-500'
            }`}
            disabled={isExplaining}
          >
            Statement
          </button>
          <button
            onClick={() => setRightPanel('ai')}
            className={`px-4 py-2 rounded-md font-medium transition ${
              rightPanel === 'ai'
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-600 hover:bg-zinc-500'
            }`}
            disabled={isExplaining}
          >
            AI
          </button>
        </div>

        {/* Content Section */}
        <div className="mt-2">
          {rightPanel === 'statement' && (
            <Statement
              userCode={userCode}
              projectConfig={projectConfig}
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
              terminalOutput={terminalOutput}
            />
          )}
        </div>
      </div>
        </div>
        </>
  );
}

export default Project;
