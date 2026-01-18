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
          content: 'Hey! 👋 I\'m Codey, your Python mentor. I\'m here to guide you through problems with hints, not direct answers. Ask me anything about your code!',
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
      
      // Build conversation history (last 4 messages only)
      const HISTORY_LIMIT = 4;
      const history = messages.slice(-HISTORY_LIMIT).map(
        m => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n');

      // Minimal project context
      let projectContext = '';
      if (projectConfig) {
        projectContext = `Project: "${context.projectTitle}"`;
      }

      // Trim code heavily
      const codeLines = (context.userCode || 'No code').split('\n');
      const trimmedCode = codeLines.length > 50
        ? [...codeLines.slice(0, 35), '...', ...codeLines.slice(-15)].join('\n')
        : codeLines.join('\n');

      // Minimal terminal output
      const term = Array.isArray(terminalOutput) ? terminalOutput : [];
      const trimmedTerminal = term.slice(-10).join('\n');

      const prompt = `You are Codey, a concise Python mentor.

CRITICAL RULES:
- Answer ONLY what the user asked - nothing extra
- Keep responses under 50 words unless specifically asked for more
- For greetings: respond briefly (5-10 words) and ask what they need help with
- For code questions: give ONE specific hint or concept, not explanations
- NEVER give complete code solutions
- If asked for code, give only the concept/approach in 1-2 sentences

${projectContext}

CODE:
\`\`\`python
${trimmedCode}
\`\`\`

TERMINAL:
\`\`\`
${trimmedTerminal || 'None'}
\`\`\`

RECENT CHAT:
${history}

USER: ${userMessageText}

Give a SHORT, DIRECT response (under 50 words). Answer ONLY what they asked.`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 150
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || 'API failed');
      }

      let aiText = 'Sorry, error occurred. Try again!';
      if (data.choices?.[0]?.message?.content) {
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
        ? 'Timeout. Try again!' 
        : 'Error! Try again.';
      
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
        <h2 className="text-xl font-semibold text-purple-400">💬 Codey</h2>
        <p className="text-sm text-gray-400 mt-1">
          {loadError
            ? <span className="text-red-400">{loadError}</span>
            : projectConfig
              ? `${projectConfig.title}`
              : 'Loading...'}
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
            placeholder="Ask me anything..."
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
      </div>
    </div>
  );
}

export default AI;
