import React, { useState, useEffect } from 'react';
import CodeEditor from './CodeEditor';
import AI from './AI';
import { useUser } from '@clerk/clerk-react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { useNavigate, useParams } from 'react-router-dom';

function Task() {
  const [rightPanel, setRightPanel] = useState('statement');
  const [userCode, setUserCode] = useState('');
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [task, setTask] = useState(null);
  const { user } = useUser();
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // Load task data
  useEffect(() => {
    const loadTask = async () => {
      if (!taskId) return;

      try {
        const taskRef = ref(db, `PythonTask/${taskId}`);
        const snapshot = await get(taskRef);

        if (snapshot.exists()) {
          setTask({
            id: taskId,
            ...snapshot.val(),
          });
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
  }, [taskId, navigate]);

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
          <p className="text-gray-600 mb-4">
            The requested task could not be loaded.
          </p>
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
          <CodeEditor
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
          <div className="flex-1 overflow-auto bg-[#1e1e1e] text-[#d4d4d4] p-0">
            {rightPanel === 'statement' ? (
              <div className="p-6 space-y-6">
                <div className="bg-[#252526] rounded-lg p-6 border border-[#333]">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0e639c] flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h1 className="text-xl font-bold text-white mb-2">
                        {task.title}
                      </h1>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-2.5 py-0.5 bg-[#3a3d41] text-white rounded-full text-xs font-medium">
                          {task.Category || 'Task'}
                        </span>
                        <span className="text-xs text-[#9e9e9e]">
                          • {task.difficulty || 'Difficulty not specified'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <h3 className="text-[#9cdcfe] font-semibold mb-2 flex items-center">
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
                      <div className="text-[#d4d4d4] bg-[#2d2d2d] p-4 rounded border border-[#3a3d41] whitespace-pre-line">
                        {task.YourTask}
                      </div>
                    </div>

                    {task.description && (
                      <div>
                        <h3 className="text-[#9cdcfe] font-semibold mb-2 flex items-center">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                          </svg>
                          Description
                        </h3>
                        <div className="text-[#d4d4d4] bg-[#2d2d2d] p-4 rounded border border-[#3a3d41] whitespace-pre-line">
                          {task.description}
                        </div>
                      </div>
                    )}

                    {task.Concept && (
                      <div>
                        <h3 className="text-[#9cdcfe] font-semibold mb-2 flex items-center">
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
              </div>
            ) : (
              <AI
                userCode={userCode}
                messages={[]}
                setMessages={() => {}}
                terminalOutput={terminalOutput}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Task;