import React, { useState, useEffect } from 'react';
import CodeEditor from './CodeEditor';
import Statement from './Statement';
import AI from './AI';
import { useUser } from '@clerk/clerk-react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

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
            ...snapshot.val()
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
    // Handle stuck button click if needed
    console.log('Stuck button clicked');
  };

// ... (previous code remains the same until the return statement)

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
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
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
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
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
                {task && (
                  <div className="space-y-4">
                    {/* Task content here */}
                  </div>
                )}
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