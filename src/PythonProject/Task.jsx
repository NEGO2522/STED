import React, { useState, useEffect } from 'react';
import TaskCodeEditor from './TaskCodeEditor';
import TaskAI from './TaskAI';
import { useUser } from '@clerk/clerk-react';
import { ref, get, set } from 'firebase/database';
import { db } from '../firebase';
import { useNavigate, useParams } from 'react-router-dom';

function Task() {
  const [rightPanel, setRightPanel] = useState('statement');
  const defaultCode = `incorrect_concat.py\n def calculate_total(marks):\n     total = ""              # BUG: total is a string\n     for mark in marks:\n         total += mark      # concatenates strings instead of summing numbers\n     return total\n\nmarks = ["85", "90", "78"]\nprint(\"Total Marks:\", calculate_total(marks))`;

  const [userCode, setUserCode] = useState(defaultCode);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [task, setTask] = useState(null);
  const { user } = useUser();
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [completedSubtasks, setCompletedSubtasks] = useState([]);

  // Load task data and code
  useEffect(() => {
    const loadTask = async () => {
      if (!taskId || !user) return;

      try {
        setIsLoading(true);
        const taskRef = ref(db, `PythonTask/${taskId}`);
        const snapshot = await get(taskRef);

        if (snapshot.exists()) {
          const { Code, ...taskDataWithoutCode } = snapshot.val();
          setTask({ id: taskId, ...taskDataWithoutCode });

          // Load completed subtasks from Firebase
          const userTaskRef = ref(db, `users/${user.id}/python/tasks/${taskId}/completedSubtasks`);
          const completedSnapshot = await get(userTaskRef);
          if (completedSnapshot.exists()) {
            setCompletedSubtasks(completedSnapshot.val());
          }
        } else {
          console.error('Task not found');
          navigate('/python');
        }
      } catch (error) {
        console.error('Error loading task:', error);
        navigate('/python');
      } finally {
        setIsLoading(false);
      }
    };

    loadTask();
  }, [taskId, user, navigate]);

  const handleSubtaskToggle = (subtask) => {
    const newCompletedSubtasks = completedSubtasks.includes(subtask)
      ? completedSubtasks.filter((s) => s !== subtask)
      : [...completedSubtasks, subtask];
    
    setCompletedSubtasks(newCompletedSubtasks);

    // Save to Firebase
    if (user) {
      const userTaskRef = ref(db, `users/${user.id}/python/tasks/${taskId}/completedSubtasks`);
      set(userTaskRef, newCompletedSubtasks);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Task Not Found</h2>
          <p className="text-gray-600 mb-4">The requested task could not be loaded.</p>
          <button
            onClick={() => navigate('/python')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Python
          </button>
        </div>
      </div>
    );
  }

  const handleCodeChange = (code) => {
    setUserCode(code);
  };

  const handleOutputChange = (output) => {
    setTerminalOutput(output);
  };

  const handleStuckClick = () => {
    console.log('Stuck button clicked');
  };

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-[95vw] mx-auto h-[calc(100vh-2rem)] flex rounded-lg overflow-hidden border border-[#333]">
        {/* Left Panel - Editor */}
        <div className="w-[70%] h-full flex flex-col bg-[#1e1e1e] rounded-l-lg overflow-hidden">
          <TaskCodeEditor
            value={userCode}
            onCodeChange={handleCodeChange}
            onOutputChange={handleOutputChange}
            onStuckClick={handleStuckClick}
            editorId={`task_${taskId}`}
          />
        </div>

        {/* Right Panel - Statement and AI */}
        <div className="w-[30%] h-full flex flex-col bg-[#1e1e1e] border-l border-[#333] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[#333] bg-[#252526] px-4">
            <button
              className={`px-4 py-3 font-medium text-sm flex items-center ${
                rightPanel === 'statement'
                  ? 'text-[#9cdcfe] border-b-2 border-[#9cdcfe]'
                  : 'text-[#9e9e9e] hover:text-white hover:bg-[#2d2d2d]'
              }`}
              onClick={() => setRightPanel('statement')}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Task
            </button>

            <button
              className={`px-4 py-3 font-medium text-sm flex items-center ${
                rightPanel === 'ai'
                  ? 'text-[#9cdcfe] border-b-2 border-[#9cdcfe]'
                  : 'text-[#9e9e9e] hover:text-white hover:bg-[#2d2d2d]'
              }`}
              onClick={() => setRightPanel('ai')}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
              AI Assistant
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-[#1e1e1e] text-[#d4d4d4] p-0 w-full">
            {rightPanel === 'ai' ? (
              <div className="w-full h-full">
                <TaskAI
                  userCode={userCode}
                  messages={messages}
                  setMessages={setMessages}
                  terminalOutput={terminalOutput}
                  task={task}
                />
              </div>
            ) : (
              <div className="p-6 space-y-8">
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold text-white mb-2">
                    {task.title}
                  </h1>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-0.5 bg-[#3a3d41] text-white rounded-full text-xs font-medium">
                      {task.Category || 'Task'}
                    </span>
                  </div>
                </div>

                {task.subtasks && (
                  <div>
                    <h3 className="text-[#9cdcfe] font-semibold mb-3 flex items-center">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812A3.066 3.066 0 003 13.733a3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zM10 12a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.375 7.625a.375.375 0 11.75 0 .375.375 0 01-.75 0zM10.125 9a.125.125 0 01.25 0v3.5a.125.125 0 01-.25 0V9z" />
                      </svg>
                      Sub-tasks
                    </h3>
                    <div className="space-y-2">
                      {task.subtasks.map((subtask, index) => (
                        <div key={index} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`subtask-${index}`}
                            checked={completedSubtasks.includes(subtask)}
                            onChange={() => handleSubtaskToggle(subtask)}
                            className="h-4 w-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                          />
                          <label
                            htmlFor={`subtask-${index}`}
                            className={`ml-3 text-sm ${completedSubtasks.includes(subtask) ? 'text-gray-500 line-through' : 'text-gray-300'}`}
                          >
                            {subtask}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-[#9cdcfe] font-semibold mb-3 flex items-center">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Your Task
                    </h3>
                    <div className="text-[#d4d4d4] whitespace-pre-line">
                      {task.YourTask}
                    </div>
                  </div>

                  {task.description && (
                    <div>
                      <h3 className="text-[#9cdcfe] font-semibold mb-3 flex items-center">
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                        </svg>
                        Description
                      </h3>
                      <div className="text-[#d4d4d4] whitespace-pre-line">
                        {task.description}
                      </div>
                    </div>
                  )}

                  {task.Concept && (
                    <div>
                      <h3 className="text-[#9cdcfe] font-semibold mb-3 flex items-center">
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                        </svg>
                        Concepts Used
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {task.Concept.split(',').map((concept, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#0e639c] text-white hover:bg-[#1177bb] transition-colors"
                          >
                            {concept.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Task;
