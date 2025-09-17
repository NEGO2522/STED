import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { getProjectConfig, getAIContext } from '../PythonProject/projectConfig';

function AI({ userCode, messages, setMessages, terminalOutput = [] }) {
  const { user } = useUser();
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [projectConfig, setProjectConfig] = useState(null);
  const [loadError, setLoadError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const prevMessagesLength = useRef(messages.length);
  const isFirstRender = useRef(true);

  // Fetch project data when component mounts
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!user) return;
      setLoadError('');
      try {
        // Get user's current Pandas project
        const userRef = ref(db, 'users/' + user.id + '/pandas');
        const userSnap = await get(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.val();
          const projectKey = userData.PandasCurrentProject;
          if (projectKey) {
            // Get project data
            const projectRef = ref(db, 'PandasProject/' + projectKey);
            const projectSnap = await get(projectRef);
            if (projectSnap.exists()) {
              setProjectConfig(projectSnap.val());
            } else {
              setProjectConfig(null);
              setLoadError('Project not found in PandasProject: ' + projectKey);
            }
          } else {
            setProjectConfig(null);
            setLoadError('No PandasCurrentProject set for user.');
          }
        } else {
          setProjectConfig(null);
          setLoadError('User data not found.');
        }
      } catch (error) {
        setProjectConfig(null);
        setLoadError('Error fetching project data: ' + error.message);
      }
    };
    fetchProjectData();
  }, [user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isFirstRender.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isFirstRender.current = false;
    } else if (messages.length > prevMessagesLength.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  // Initialize with welcome message only if no messages exist
  useEffect(() => {
    if (projectConfig && messages.length === 0) {
      setMessages([
        {
          id: 1,
          type: 'ai',
          content: `Hi! I'm here to help you with your ${projectConfig.title} project.  What would you like help with?`,
          timestamp: new Date()
        }
      ]);
    }
  }, [projectConfig, messages.length, setMessages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    try {
      // For Pandas, just use the projectConfig and userCode for context
      const context = projectConfig || {};
      const history = messages.slice(-6).map(
        m => `${m.type === 'user' ? 'User' : 'AI'}: ${m.content}`
      ).join('\n');
      let allTasksText = '';
      if (projectConfig && projectConfig.tasks) {
        allTasksText = Object.entries(projectConfig.tasks).map(
          ([taskKey, task], idx) => {
            const subtasks = (task.subtasks || []).map((s, i) => `    ${i + 1}. ${s}`).join('\n');
            return `${idx + 1}. ${task.title}${subtasks ? '\n' + subtasks : ''}`;
          }
        ).join('\n');
      }
      const prompt = `You are a helpful Pandas programming tutor. The user is working on a project called "${context.title || ''}".\n\nProject Description: ${context.description || ''}\n\nALL TASKS AND SUBTASKS:\n${allTasksText}\n\nUser's Current Code:\n\u0060\u0060\u0060python\n${userCode || 'No code written yet'}\n\u0060\u0060\u0060\n\nConversation so far:\n${history}\n\nUser's latest question: ${inputMessage}\n\nIMPORTANT INSTRUCTIONS:\n- Respond ONLY to the user's latest question, and help them with their current task/subtask.\n- Do not provide extra information or answer unasked questions.\n- Give small, chat-like responses (2-3 sentences max)\n- Focus on actionable, specific feedback for the user's code and question\n- Avoid generic encouragements like "Great start" or "Good job" unless the user has completed all tasks\n- DO NOT provide complete code solutions\n- Give hints for the current task/subtask only\n- ONLY give hints about the tasks and subtasks defined in the project\n- If all tasks are complete, congratulate the user and offer to review or answer questions.\n- Only answer what the user has asked. Do NOT suggest next steps, future tasks, or what to do next unless the user specifically asks.`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      let aiText = 'Sorry, I encountered an error. Please try again.';
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        aiText = data.candidates[0].content.parts[0].text;
      }
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', content: aiText, timestamp: new Date() }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [inputMessage]);

  return (
    <div className="flex flex-col bg-gray-900 text-white h-155">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-purple-400">AI Mentor</h2>
        <p className="text-sm text-gray-400 mt-1">
          {loadError
            ? <span className="text-red-400">{loadError}</span>
            : projectConfig
              ? `Helping with: ${projectConfig.title}`
              : 'Loading project...'}
        </p>
      </div>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 text-left space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-100 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Input Area */}
      <div className="p-3 border-t text-left border-gray-700">
        <div className="flex space-x-2 items-end">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={e => {
              setInputMessage(e.target.value);
              if (inputRef.current) {
                inputRef.current.style.height = 'auto';
                inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your project..."
            className="flex-1 bg-gray-800 text-left text-white"
            style={{
              borderRadius: 6,
              padding: '7px 10px',
              fontSize: 14,
              minHeight: 40,
              maxHeight: 120,
              resize: 'none',
              lineHeight: 1.3,
              outline: 'none',
              border: '1px solid #444',
              overflow: 'hidden',
            }}
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            style={{
              background: '#a78bfa',
              color: 'white',
              padding: '6px 14px',
              fontSize: 14,
              borderRadius: 6,
              fontWeight: 600,
              minHeight: 40,
              minWidth: 0,
              border: 'none',
              transition: 'background 0.2s',
              cursor: (!inputMessage.trim() || isLoading) ? 'not-allowed' : 'pointer',
              opacity: (!inputMessage.trim() || isLoading) ? 0.7 : 1,
            }}
            className="transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default AI;
