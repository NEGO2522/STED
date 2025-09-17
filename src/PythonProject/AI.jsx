import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { getProjectConfig, getAIContext } from './projectConfig';

// Function to format AI response text with proper styling
const formatAIResponse = (text) => {
  if (!text) return text;
  
  // First, let's process the entire text for inline formatting
  let processedText = text;
  
  // Process the text line by line
  const lines = processedText.split('\n');
  const formattedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Skip empty lines but preserve spacing
    if (line.trim() === '') {
      formattedLines.push(<br key={i} />);
      continue;
    }
    
    // Headers (lines starting with #)
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
    // Bullet points (lines starting with - or *)
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      formattedLines.push(
        <div key={i} className="flex items-start mb-2 ml-2">
          <span className="text-purple-400 mr-3 mt-1 text-sm">•</span>
          <span className="flex-1">{processInlineFormatting(line.replace(/^[\s\-\*]+/, '').trim())}</span>
        </div>
      );
    }
    // Numbered lists (lines starting with numbers)
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
    // Regular text (process for inline formatting)
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

// Helper function to process inline formatting (bold, code, etc.)
const processInlineFormatting = (text) => {
  if (!text) return text;
  
  const parts = [];
  let currentText = text;
  let key = 0;
  
  // Process bold text first (**text**)
  const boldRegex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      parts.push(processCodeFormatting(beforeText, key++));
    }
    
    // Add the bold text
    parts.push(
      <strong key={key++} className="font-bold text-white">
        {processCodeFormatting(match[1], key++)}
      </strong>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    parts.push(processCodeFormatting(remainingText, key++));
  }
  
  return parts.length > 0 ? parts : processCodeFormatting(text, 0);
};

// Helper function to process code formatting (`code`)
const processCodeFormatting = (text, baseKey) => {
  if (!text || typeof text !== 'string') return text;
  
  const codeRegex = /`([^`]+)`/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = baseKey;
  
  while ((match = codeRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add the code text
    parts.push(
      <code key={key++} className="bg-gray-800 text-green-400 px-2 py-1 rounded text-sm font-mono">
        {match[1]}
      </code>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
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
  const [taskCheckStatus, setTaskCheckStatus] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalSubtasks, setModalSubtasks] = useState([]);
  const inputRef = useRef(null);
  const prevMessagesLength = useRef(messages.length);
  const isFirstRender = useRef(true);

  // Fetch project data when component mounts
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!user) return;
      setLoadError('');
      try {
        // Get user's current project
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
        
        console.log('AI: Fetching project with key:', projectKey);
        
        // Try with the exact key first
        let projectRef = ref(db, 'PythonProject/' + projectKey);
        let projectSnap = await get(projectRef);
        
        // If not found, try with normalized (lowercase) key
        if (!projectSnap.exists()) {
          const normalizedKey = projectKey.toLowerCase();
          console.log('AI: Trying with normalized key:', normalizedKey);
          projectRef = ref(db, 'PythonProject/' + normalizedKey);
          projectSnap = await get(projectRef);
          
          if (projectSnap.exists()) {
            projectKey = normalizedKey; // Update to the key that worked
          }
        }
        
        if (projectSnap.exists()) {
          // Found project in PythonProject node
          console.log('AI: Found project in database');
          const projectData = projectSnap.val();
          
          // Ensure tasks exist and have the correct structure for both regular and Gemini-generated projects
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
          // Fall back to predefined config if available
          console.log('AI: Project not found in database, trying predefined config');
          const predefinedConfig = await getProjectConfig(projectKey);
          
          if (predefinedConfig) {
            console.log('AI: Using predefined project config');
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
      // On first render (tab switch), scroll instantly
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isFirstRender.current = false;
    } else if (messages.length > prevMessagesLength.current) {
      // On new message, scroll smoothly
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
          content: `## Welcome! 

Hi! I'm here to help you with your **${projectConfig.title}** project. 

Here's what I can help you with:
- Debug your code
- Explain error messages  
- Guide you through tasks
- Answer Python questions

What would you like help with?`,
          timestamp: new Date()
        }
      ]);
    }
  }, [projectConfig, messages.length, setMessages]);

  // Generic: find first incomplete task and subtasks
  const getIncompleteTaskAndSubtasks = () => {
    if (!projectConfig || (!projectConfig.tasks && !projectConfig.ProjectTasks)) return {};
    const tasks = projectConfig.tasks || projectConfig.ProjectTasks;
    const userCodeLower = (userCode || '').toLowerCase();
    for (const [taskKey, task] of Object.entries(tasks)) {
      let allSubtasks = task.subtasks || [];
      
      // Handle ProjectTasks structure where subtasks are individual properties
      if (allSubtasks.length === 0 && task.title) {
        allSubtasks = Object.entries(task)
          .filter(([key]) => key !== 'title')
          .map(([key, value]) => value);
      }
      
      // Consider a subtask complete if any keyword from codeChecks is present in user code
      const completed = (task.codeChecks || []).filter(check => 
        userCodeLower.includes(check.toLowerCase().replace(/[`'"().:]/g, ''))
      );
      if (completed.length < (task.codeChecks ? task.codeChecks.length : allSubtasks.length)) {
        return {
          taskTitle: task.title,
          subtasks: allSubtasks.filter((_, idx) => !(completed.includes((task.codeChecks||[])[idx])))
        };
      }
    }
    return {};
  };

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
      const context = getAIContext(projectConfig, userCode, inputMessage);
      const { taskTitle, subtasks } = getIncompleteTaskAndSubtasks();
      // Build conversation history (last 6 messages)
      const history = messages.slice(-6).map(
        m => `${m.type === 'user' ? 'User' : 'AI'}: ${m.content}`
      ).join('\n');
      // Build a list of all tasks and subtasks
      let allTasksText = '';
      if (projectConfig && (projectConfig.tasks || projectConfig.ProjectTasks)) {
        const tasks = projectConfig.tasks || projectConfig.ProjectTasks;
        allTasksText = Object.entries(tasks).map(
          ([taskKey, task], idx) => {
            let subtasks = task.subtasks || [];
            
            // Handle ProjectTasks structure where subtasks are individual properties
            if (subtasks.length === 0 && task.title) {
              subtasks = Object.entries(task)
                .filter(([key]) => key !== 'title')
                .map(([key, value]) => value);
            }
            
            const subtasksList = subtasks.map((s, i) => `    ${i + 1}. ${s}`).join('\n');
            return `${idx + 1}. ${task.title}${subtasksList ? '\n' + subtasksList : ''}`;
          }
        ).join('\n');
      }
      const prompt = `You are a helpful Python programming tutor. The user is working on a project called "${context.projectTitle}".

Project Description: ${context.projectDescription}

ALL TASKS AND SUBTASKS:
${allTasksText}

User's Current Code:
\u0060\u0060\u0060python
${context.userCode || 'No code written yet'}
\u0060\u0060\u0060

Latest Terminal Output (including errors, if any):
\u0060\u0060\u0060
${(terminalOutput && terminalOutput.length > 0) ? terminalOutput.join('\n') : 'No output yet.'}
\u0060\u0060\u0060

Conversation so far:
${history}

User's latest question: ${inputMessage}

IMPORTANT INSTRUCTIONS:
- Answer ONLY what the user specifically asked
- Keep responses extremely short and direct
- Do NOT provide extra information or context unless asked
- Do NOT give encouragement or generic advice
- Do NOT suggest next steps unless specifically asked
- Focus only on the exact question asked
- If user asks about an error, explain only that error
- If user asks how to do something, give only the specific steps for that thing
- Maximum 1-2 sentences per response unless the question requires more detail

RESPONSE FORMAT REQUIREMENTS:
- Use bullet points (-) only when listing multiple related items
- Use **bold text** for important keywords and function names
- Use \`code\` for code snippets and variable names
- Keep responses to 1-3 bullet points maximum
- Each bullet point should be one short, direct answer
- No introductory phrases like "Here's what you need to do" or "The issue is"
- Start directly with the answer

STRICT RULES:
- If user asks "What's wrong?" - tell them only what's wrong
- If user asks "How do I...?" - tell them only how to do that specific thing
- If user asks about a specific function - explain only that function
- Do NOT add related information they didn't ask for
- Do NOT explain why something works unless asked`;
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

  const analyzeUserCode = (code) => {
    if (!code || code.trim() === '') {
      return "You haven't written any code yet. Start by creating the basic structure!";
    }

    const analysis = [];
    
    if (code.includes('def ')) {
      analysis.push("✅ You have functions defined");
    } else {
      analysis.push("⚠️ No functions found - you'll need to create functions for this project");
    }
    
    if (code.includes('input(')) {
      analysis.push("✅ You're getting user input");
    }
    
    if (code.includes('while ') || code.includes('for ')) {
      analysis.push("✅ You have loops in your code");
    }
    
    if (code.includes('[') && code.includes(']')) {
      analysis.push("✅ You're using lists");
    }
    
    if (code.includes('{') && code.includes('}')) {
      analysis.push("✅ You're using dictionaries");
    }
    
    if (code.includes('if ') || code.includes('elif ') || code.includes('else:')) {
      analysis.push("✅ You have conditional statements");
    }
    
    return analysis.length > 0 ? analysis.join('\n') : "Your code looks good! Keep going!";
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTaskCheck = (taskKey) => {
    if (!projectConfig || !projectConfig.tasks) return;
    const task = projectConfig.tasks[taskKey];
    const userCodeLower = (userCode || '').toLowerCase();
    const completed = (task.codeChecks || []).filter(check =>
      userCodeLower.includes(check.toLowerCase().replace(/[`'"().:]/g, ''))
    );
    const allComplete = completed.length === (task.codeChecks ? task.codeChecks.length : (task.subtasks ? task.subtasks.length : 0));
    if (allComplete) {
      setTaskCheckStatus(prev => ({ ...prev, [taskKey]: true }));
    } else {
      // Find incomplete subtasks
      const incomplete = (task.subtasks || []).filter((_, idx) => !(completed.includes((task.codeChecks||[])[idx])));
      setModalSubtasks(incomplete);
      setTaskCheckStatus(prev => ({ ...prev, [taskKey]: false }));
      setShowModal(true);
    }
  };

  // Helper to provide what to do for a subtask
  const getSubtaskHelp = (subtask) => {
    // You can customize this mapping for more detailed help per subtask
    if (subtask.toLowerCase().includes('function')) return 'Write the required function definition in your code.';
    if (subtask.toLowerCase().includes('input')) return 'Use input() to get user input.';
    if (subtask.toLowerCase().includes('print')) return 'Use print() to display output.';
    if (subtask.toLowerCase().includes('loop')) return 'Implement a while or for loop as needed.';
    if (subtask.toLowerCase().includes('list')) return 'Initialize and use a list as described.';
    if (subtask.toLowerCase().includes('dictionary')) return 'Use a dictionary to store data as needed.';
    if (subtask.toLowerCase().includes('return')) return 'Make sure to return the required value from your function.';
    if (subtask.toLowerCase().includes('summary')) return 'Display the summary as described.';
    return 'Check the project instructions for this subtask.';
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
              <div>
                {message.type === 'ai' ? formatAIResponse(message.content) : <div className="whitespace-pre-wrap">{message.content}</div>}
              </div>
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
              // Auto-resize
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