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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left Panel - Editor */}
      <div className="w-1/2 h-full flex flex-col border-r border-gray-200">
        <div className="h-full">
          <CodeEditor 
            code={userCode}
            onChange={setUserCode}
            onRun={(code) => {
              // Handle code execution
              setTerminalOutput(prev => [...prev, 'Executing task code...']);
            }}
            taskId={taskId}
          />
        </div>
        
        {/* Terminal */}
        <div className="h-1/3 bg-black text-white p-4 overflow-auto font-mono text-sm">
          <div className="mb-2 text-gray-400">Terminal Output:</div>
          <div className="space-y-1">
            {terminalOutput.map((output, index) => (
              <div key={index} className="whitespace-pre-wrap">{output}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Statement and AI */}
      <div className="w-1/2 h-full flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            className={`px-6 py-3 font-medium ${
              rightPanel === 'statement' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setRightPanel('statement')}
          >
            Task
          </button>
          <button
            className={`px-6 py-3 font-medium ${
              rightPanel === 'ai' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setRightPanel('ai')}
          >
            AI Assistant
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {rightPanel === 'statement' ? (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">{task.title}</h1>
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                    {task.Category || 'Task'}
                  </span>
                  <span className="text-sm text-gray-500">• {task.difficulty || 'Difficulty not specified'}</span>
                </div>
                
                <div className="prose max-w-none">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Your Task</h3>
                  <p className="text-gray-700 mb-6">{task.YourTask}</p>
                  
                  {task.description && (
                    <>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Description</h3>
                      <p className="text-gray-700 mb-6 whitespace-pre-line">{task.description}</p>
                    </>
                  )}
                  
                  {task.Concept && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Concepts Used</h3>
                      <div className="flex flex-wrap gap-2">
                        {task.Concept.split(',').map((concept, index) => (
                          <span 
                            key={index} 
                            className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium"
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
  );
}

export default Task;
