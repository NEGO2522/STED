import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { getProjectConfig, getAIContext } from './projectConfig';

// Function to format AI response text with proper styling
const formatAIResponse = (text) => {
  if (!text) return text;

  const lines = text.split('\n');
  const formattedLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (line.trim() === '') {
      formattedLines.push(<br key={i} />);
      continue;
    }

    // Headers
    if (line.startsWith('###')) {
      formattedLines.push(
        <h3 key={i} className="text-lg font-bold text-purple-300 mt-3 mb-2">
          {processInlineFormatting(line.replace('###', '').trim())}
        </h3>
      );
    } else if (line.startsWith('##')) {
      formattedLines.push(
        <h2 key={i} className="text-xl font-bold text-purple-200 mt-3 mb-2">
          {processInlineFormatting(line.replace('##', '').trim())}
        </h2>
      );
    } else if (line.startsWith('#')) {
      formattedLines.push(
        <h1 key={i} className="text-2xl font-bold text-purple-100 mt-3 mb-2">
          {processInlineFormatting(line.replace('#', '').trim())}
        </h1>
      );
    }
    // Bullet points
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      formattedLines.push(
        <div key={i} className="flex items-start mb-2 ml-2">
          <span className="text-purple-400 mr-3 mt-1 text-sm">•</span>
          <span className="flex-1">{processInlineFormatting(line.replace(/^[\s\-\*]+/, '').trim())}</span>
        </div>
      );
    }
    // Numbered lists
    else if (/^\s*\d+\./.test(line)) {
      const match = line.match(/^(\s*)(\d+\.)(.*)/);
      if (match) {
        formattedLines.push(
          <div key={i} className="flex items-start mb-2 ml-2">
            <span className="text-purple-400 mr-3 font-semibold min-w-[1.5rem]">{match[2]}</span>
            <span className="flex-1">{processInlineFormatting(match[3].trim())}</span>
          </div>
        );
      }
    }
    // Regular text
    else {
      formattedLines.push(
        <div key={i} className="mb-2 leading-relaxed">
          {processInlineFormatting(line)}
        </div>
      );
    }
  }

  return <div className="space-y-1">{formattedLines}</div>;
};

// Helper function to process inline formatting
const processInlineFormatting = (text) => {
  if (!text) return text;

  const parts = [];
  let key = 0;

  const boldRegex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      parts.push(processCodeFormatting(beforeText, key++));
    }

    parts.push(
      <strong key={key++} className="font-bold text-white">
        {processCodeFormatting(match[1], key++)}
      </strong>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    parts.push(processCodeFormatting(remainingText, key++));
  }

  return parts.length > 0 ? parts : processCodeFormatting(text, 0);
};

// Helper function to process code formatting
const processCodeFormatting = (text, baseKey) => {
  if (!text || typeof text !== 'string') return text;

  const codeRegex = /`([^`]+)`/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = baseKey;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    parts.push(
      <code key={key++} className="bg-gray-800 text-green-400 px-2 py-1 rounded text-sm font-mono">
        {match[1]}
      </code>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

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
        const userRef = ref(db, 'users/' + user.id);
        const userSnap = await get(userRef);

        if (!userSnap.exists()) {
          setProjectConfig(null);
          setLoadError('User data not found.');
          return;
        }

        const userData = userSnap.val();
        const pythonData = userData.python || {};
        let projectKey = pythonData.PythonCurrentProject;

        if (!projectKey) {
          setProjectConfig(null);
          setLoadError('No Python project started.');
          return;
        }

        let projectRef = ref(db, 'PythonProject/' + projectKey);
        let projectSnap = await get(projectRef);

        if (!projectSnap.exists()) {
          const normalizedKey = projectKey.toLowerCase();
          projectRef = ref(db, 'PythonProject/' + normalizedKey);
          projectSnap = await get(projectRef);

          if (projectSnap.exists()) {
            projectKey = normalizedKey;
          }
        }

        if (projectSnap.exists()) {
          const projectData = projectSnap.val();

          const normalizedProject = {
            ...projectData,
            tasks: projectData.tasks || projectData.ProjectTasks || {
              task1: {
                title: projectData.title || 'Main Task',
                subtasks: projectData.subtasks || [],
                description: projectData.description || ''
              }
            }
          };

          setProjectConfig(normalizedProject);
        } else {
          const predefinedConfig = await getProjectConfig(projectKey);

          if (predefinedConfig) {
            setProjectConfig(predefinedConfig);
          } else {
            setProjectConfig(null);
            setLoadError('Project data not found. Please try starting a new project.');
          }
        }
      } catch (error) {
        console.error('AI: Error fetching project data:', error);
        setProjectConfig(null);
        setLoadError('Error loading project data. Please try again later.');
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
          content: 'Hey there! 👋 I\'m Codey, your Python learning buddy!\n\nI\'m here to help you learn by guiding you through problems rather than just giving you answers. Think of me as your coding mentor who asks the right questions to help you think like a programmer.\n\nFeel free to ask me anything - whether it\'s about your code, concepts you\'re learning, or if you just want to chat! What\'s on your mind?',
          timestamp: new Date()
        }
      ]);
    }
  }, [projectConfig, messages.length, setMessages]);

  const sendMessage = async () => {
    const userMessageText = inputMessage.trim();
    if (!userMessageText || isLoading) return;

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
      const context = getAIContext(projectConfig, userCode, inputMessage);
      
      // Build conversation history
      const HISTORY_LIMIT = 6;
      const history = messages.slice(-HISTORY_LIMIT).map(
        m => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n\n');

      // Get project context
      let projectContext = '';
      if (projectConfig && (projectConfig.tasks || projectConfig.ProjectTasks)) {
        const tasks = projectConfig.tasks || projectConfig.ProjectTasks;
        const tasksList = Object.entries(tasks).slice(0, 3).map(
          ([taskKey, task], idx) => {
            let subs = task.subtasks || [];
            if (subs.length === 0 && task.title) {
              subs = Object.entries(task)
                .filter(([key]) => key !== 'title')
                .map(([key, value]) => value);
            }
            const subsList = subs.slice(0, 3).map((s, i) => `  - ${s}`).join('\n');
            return `${idx + 1}. ${task.title}${subsList ? '\n' + subsList : ''}`;
          }
        );
        projectContext = `Current Project: "${context.projectTitle}"\nDescription: ${context.projectDescription}\n\nTasks:\n${tasksList.join('\n')}`;
      }

      // Trim code
      const codeLines = (context.userCode || 'No code written yet').split('\n');
      const MAX_CODE_LINES = 100;
      const trimmedCode = codeLines.length > MAX_CODE_LINES
        ? [...codeLines.slice(0, 70), '...', ...codeLines.slice(-30)].join('\n')
        : codeLines.join('\n');

      // Trim terminal output
      const term = Array.isArray(terminalOutput) ? terminalOutput : [];
      const trimmedTerminal = term.slice(-30).join('\n');

      const prompt = `You are Codey, a friendly and helpful Python programming mentor. You're chatting with a student who is learning Python.

PERSONALITY:
- Friendly, encouraging, and conversational like ChatGPT
- Respond naturally to ALL types of messages (greetings, questions, comments, everything)
- Use emojis occasionally to be friendly 😊
- Be enthusiastic about their progress!
- Keep responses concise and easy to read

TEACHING APPROACH:
- NEVER give complete code solutions or full implementations
- Guide with hints, questions, and concepts instead
- If they ask for code, explain the approach and relevant Python concepts
- Encourage them to try things and learn from mistakes
- Focus on understanding over just getting it to work

PROJECT CONTEXT:
${projectContext}

CURRENT CODE:
\`\`\`python
${trimmedCode}
\`\`\`

TERMINAL OUTPUT:
\`\`\`
${trimmedTerminal || 'No output yet'}
\`\`\`

CONVERSATION HISTORY:
${history}

USER'S MESSAGE: ${userMessageText}

RESPONSE RULES:
1. Respond naturally to their message - if they say "hi", greet them back warmly!
2. If it's a greeting, respond friendly and ask how you can help with their project
3. If it's a question, answer it helpfully with guidance (not full solutions)
4. If they're stuck, ask guiding questions to help them think through it
5. Keep responses conversational and under 150 words unless explaining a complex concept
6. Use formatting: **bold** for emphasis, \`code\` for syntax, and bullet points when listing items
7. If they ask for complete code, politely explain you'll guide them instead and provide conceptual help

Remember: You're a friendly mentor, not a code-writing machine. Help them learn and think!`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 400
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        const msg = data?.error?.message || 'API request failed';
        throw new Error(msg);
      }

      let aiText = 'Sorry, I encountered an error. Please try again! 😅';
      if (data.choices && data.choices[0] && data.choices[0].message && typeof data.choices[0].message.content === 'string') {
        aiText = data.choices[0].message.content;
      }

      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        type: 'ai', 
        content: aiText, 
        timestamp: new Date() 
      }]);

    } catch (error) {
      const errMsg = error.message === 'The operation was aborted' 
        ? 'Request timed out. Please try again!' 
        : `Oops! Something went wrong. ${error.message || 'Please try again!'}`;
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        type: 'ai', 
        content: errMsg, 
        timestamp: new Date() 
      }]);
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
    <div className="flex flex-col bg-gray-900 text-white h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-purple-400">💬 Codey - Your AI Mentor</h2>
        <p className="text-sm text-gray-400 mt-1">
          {loadError
            ? <span className="text-red-400">{loadError}</span>
            : projectConfig
              ? `Working on: ${projectConfig.title}`
              : 'Loading project...'}
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 min-h-0">
        <div className="max-w-3xl mx-auto w-full space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 break-words whitespace-pre-wrap ${
                  message.type === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <div className="text-left">
                  {message.type === 'ai' ? formatAIResponse(message.content) : <div className="whitespace-pre-wrap break-words">{message.content}</div>}
                </div>
                <div className="text-xs opacity-70 mt-1 text-right">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-100 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 border-t text-left border-gray-700 bg-gray-900 shrink-0">
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
            placeholder="Ask me anything... I'm here to help! 😊"
            className="flex-1 bg-gray-800 text-left text-white overflow-y-auto"
            style={{
              borderRadius: 6,
              padding: '10px 12px',
              fontSize: 14,
              minHeight: 44,
              maxHeight: 120,
              resize: 'none',
              lineHeight: 1.4,
              outline: 'none',
              border: '1px solid #4a5568',
              overflow: 'hidden',
            }}
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            style={{
              background: inputMessage.trim() && !isLoading ? '#a78bfa' : '#6b7280',
              color: 'white',
              padding: '8px 16px',
              fontSize: 14,
              borderRadius: 6,
              fontWeight: 600,
              minHeight: 44,
              minWidth: 60,
              border: 'none',
              transition: 'all 0.2s',
              cursor: (!inputMessage.trim() || isLoading) ? 'not-allowed' : 'pointer',
            }}
            className="transition-all hover:brightness-110"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          💡 Tip: I'll guide you with hints, not give you complete answers!
        </p>
      </div>
    </div>
  );
}

export default AI; 