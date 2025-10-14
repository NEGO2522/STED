import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ref, get, set, push } from 'firebase/database';
import { db } from '../firebase';

// Function to format AI response text with proper styling
const formatAIResponse = (text) => {
  if (!text) return text;

  // Process the text line by line
  const lines = text.split('\n');
  const formattedLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.trim() === '') {
      formattedLines.push(<br key={i} />);
      continue;
    }

    // Handle headers
    if (line.startsWith('###')) {
      formattedLines.push(
        <h3 key={i} className="text-lg font-bold text-purple-300 mt-3 mb-2">
          {line.replace('###', '').trim()}
        </h3>
      );
    } else if (line.startsWith('##')) {
      formattedLines.push(
        <h2 key={i} className="text-xl font-bold text-purple-200 mt-3 mb-2">
          {line.replace('##', '').trim()}
        </h2>
      );
    } else if (line.startsWith('#')) {
      formattedLines.push(
        <h1 key={i} className="text-2xl font-bold text-purple-100 mt-3 mb-2">
          {line.replace('#', '').trim()}
        </h1>
      );
    } 
    // Handle code blocks
    else if (line.trim().startsWith('```')) {
      const language = line.replace('```', '').trim() || 'python';
      let codeContent = '';
      i++;
      while (i < lines.length && !lines[i].includes('```')) {
        codeContent += lines[i] + '\n';
        i++;
      }
      formattedLines.push(
        <pre key={i} className="bg-gray-800 p-4 rounded-md my-2 overflow-x-auto">
          <code className={`language-${language}`}>{codeContent}</code>
        </pre>
      );
    }
    // Handle bullet points
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      formattedLines.push(
        <div key={i} className="flex items-start mb-2 ml-2">
          <span className="mr-2">•</span>
          <span>{line.replace(/^[\s*\-]+/, '')}</span>
        </div>
      );
    } 
    // Handle regular text
    else {
      formattedLines.push(
        <p key={i} className="mb-2 text-gray-200">
          {line}
        </p>
      );
    }
  }

  return formattedLines;
};
function TaskAI({ userCode, messages, setMessages, terminalOutput = [], task }) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useUser();

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    // Add user message to chat
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    try {
      // Prepare the context for the AI
      const context = {
        task: {
          title: task?.title || 'Current Task',
          description: task?.YourTask || '',
          category: task?.Category || '',
          concepts: task?.Concept ? task.Concept.split(',').map(c => c.trim()) : []
        },
        userCode: userCode || '',
        terminalOutput: terminalOutput.join('\n') || '',
        chatHistory: updatedMessages.slice(-5).map(m => ({
          role: m.role,
          content: m.content
        }))
      };

      // Get AI response
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are a helpful coding assistant helping with a programming task. 
              The current task is: ${context.task.title}. 
              Task description: ${context.task.description}
              Focus on helping with the specific task at hand. Be concise and to the point.`
            },
            ...context.chatHistory,
            { role: 'user', content: input }
          ],
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // Save the conversation to Firebase
      if (user) {
        const chatRef = ref(db, `users/${user.id}/python/taskChats/${task.id}`);
        const newMessageRef = push(chatRef);
        await set(newMessageRef, {
          ...userMessage,
          response: aiResponse,
          timestamp: new Date().toISOString()
        });
      }

      // Add AI response to chat
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString()
        }
      ]);

    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          isError: true,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-white">
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 text-left space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <p>Ask me anything about this task!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <div className="prose prose-invert">
                  {message.role === 'assistant' ? (
                    formatAIResponse(message.content)
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this task..."
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isTyping}
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            disabled={!input.trim() || isTyping}
          >
            {isTyping ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TaskAI;
