import React, { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { runPythonCode } from './pythonRunner';

const defaultCode = `# Write your code here`;

// Generate a unique key for localStorage based on the component's props
const getStorageKey = (id = 'default') => `saved_code_${id}`;

function CodeEditor({ onCodeChange, onStuckClick, onOutputChange, value, readOnly, hideTerminal, editorId = 'default' }) {
  const storageKey = getStorageKey(editorId);
  // Use a ref to store the current code value to avoid dependency issues
  const codeRef = useRef('');
  
  const [code, setCode] = useState(() => {
    // Load saved code from localStorage on initial render
    try {
      const savedCode = localStorage.getItem(storageKey);
      const initialCode = savedCode !== null ? savedCode : defaultCode;
      codeRef.current = initialCode;
      return initialCode;
    } catch (error) {
      console.error('Failed to load code from localStorage:', error);
      codeRef.current = defaultCode;
      return defaultCode;
    }
  });
  const [outputLines, setOutputLines] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [waitingInput, setWaitingInput] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [showCopyPasteWarning, setShowCopyPasteWarning] = useState(false);
  const inputResolver = useRef(null);
  const editorRef = useRef(null);

  // Save code to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, code);
      codeRef.current = code;
      if (onCodeChange) {
        onCodeChange(code);
      }
    } catch (error) {
      console.error('Failed to save code to localStorage:', error);
    }
  }, [code, storageKey, onCodeChange]);

  // Clear any saved code when component unmounts if project ended
  useEffect(() => {
    return () => {
      if (localStorage.getItem('projectEnded') === 'true') {
        try {
          localStorage.removeItem(storageKey);
        } catch (error) {
          console.error('Failed to clear code from localStorage:', error);
        }
      }
    };
  }, [storageKey]);

  useEffect(() => {
    if (onOutputChange) {
      onOutputChange(outputLines);
    }
  }, [outputLines, onOutputChange]);

  const appendOutput = (lines) => {
    setOutputLines(prev => [...prev, ...lines]);
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Disable right-click context menu
    editor.onContextMenu((e) => {
      e.preventDefault();
      showTemporaryWarning();
    });
    
    // Add keydown event listener to prevent copy/paste shortcuts
    const keyDownListener = editor.onKeyDown((e) => {
      // Block all Ctrl/Cmd + key combinations that could be used for copy/paste
      if (e.ctrlKey || e.metaKey) {
        // Block Ctrl+C, Cmd+C, Ctrl+V, Cmd+V, Ctrl+X, Cmd+X
        if ([67, 86, 88].includes(e.keyCode)) {
          e.preventDefault();
          showTemporaryWarning();
          return;
        }
        // Block Ctrl+A, Cmd+A (select all) to prevent easy copying
        if (e.keyCode === 65) {
          e.preventDefault();
          showTemporaryWarning();
          return;
        }
      }
      // Block right-click menu key
      if (e.keyCode === 93) {
        e.preventDefault();
        showTemporaryWarning();
      }
    });

    // Add paste event listener to the editor container
    const editorContainer = editor.getDomNode();
    if (editorContainer) {
      const handlePaste = (e) => {
        e.preventDefault();
        showTemporaryWarning();
      };
      
      const handleCopy = (e) => {
        e.preventDefault();
        showTemporaryWarning();
      };
      
      const handleCut = (e) => {
        e.preventDefault();
        showTemporaryWarning();
      };
      
      editorContainer.addEventListener('paste', handlePaste);
      editorContainer.addEventListener('copy', handleCopy);
      editorContainer.addEventListener('cut', handleCut);
      
      // Cleanup function
      return () => {
        keyDownListener.dispose();
        editorContainer.removeEventListener('paste', handlePaste);
        editorContainer.removeEventListener('copy', handleCopy);
        editorContainer.removeEventListener('cut', handleCut);
      };
    }
    
    return keyDownListener;
  };
  
  const showTemporaryWarning = () => {
    setShowCopyPasteWarning(true);
    // Clear any existing timeout to prevent rapid toggling
    if (window.copyPasteWarningTimeout) {
      clearTimeout(window.copyPasteWarningTimeout);
    }
    window.copyPasteWarningTimeout = setTimeout(() => {
      setShowCopyPasteWarning(false);
    }, 2000);
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (window.copyPasteWarningTimeout) {
        clearTimeout(window.copyPasteWarningTimeout);
      }
    };
  }, []);

  const handleInputSubmit = () => {
    if (inputResolver.current) {
      appendOutput([`${promptText}${inputValue}`]);
      inputResolver.current(inputValue);
      inputResolver.current = null;
      setInputValue('');
      setWaitingInput(false);
      setPromptText('');
    }
  };
  const runPython = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setOutputLines([]);
    setWaitingInput(false);

    try {
      const codeToRun = value !== undefined ? value : code;
      
      await runPythonCode({
        code: codeToRun,
        onOutput: appendOutput,
        onInput: handleInput,
        onError: (error) => {
          appendOutput([`Error: ${error.message}`]);
        }
      });
    } catch (error) {
      appendOutput([`Error: ${error.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCodeChange = (newValue) => {
    if (!readOnly) {
      setCode(newValue);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col h-full">
      {showCopyPasteWarning && (
        <div className="absolute top-2 right-2 bg-yellow-600 text-white px-3 py-1 rounded-md z-10 text-sm flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Copy/Paste is disabled
        </div>
      )}
      <div className="flex-1 overflow-hidden relative"
        onPaste={(e) => {
          e.preventDefault();
          showTemporaryWarning();
        }}
        onCopy={(e) => {
          e.preventDefault();
          showTemporaryWarning();
        }}
        onCut={(e) => {
          e.preventDefault();
          showTemporaryWarning();
        }}
      >
        <div className="absolute inset-0 z-10 pointer-events-none" />
        <Editor
          height="100%"
          language="python"
          theme="vs-dark"
          value={value !== undefined ? value : code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            readOnly: readOnly,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            contextmenu: false,
            copyWithSyntaxHighlighting: false,
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            tabCompletion: 'off',
          }}
        />
      </div>
      {!hideTerminal && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#1e1e1e', borderTop: '1px solid #555' }}>
            <button
              onClick={runPython}
              disabled={isRunning}
              style={{
                background: isRunning ? '#555' : '#007acc',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                borderRadius: '5px',
                opacity: isRunning ? 0.6 : 1
              }}
            >
              {isRunning ? 'Running...' : 'Run'}
            </button>
            {onStuckClick && (
              <button
                onClick={onStuckClick}
                style={{
                  background: '#222',
                  color: '#fff',
                  padding: '8px 16px',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                  borderRadius: '5px',
                  border: '2px solid #007acc'
                }}
                disabled={!!readOnly}
              >
                Stuck?
              </button>
            )}
          </div>
          <div className='text-left' style={{ background: 'black', color: '#dcdcdc', padding: '10px', height: '250px', overflowY: 'auto', borderTop: '1px solid #555' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <strong>Terminal:</strong>
              {isRunning && (
                <span style={{ marginLeft: '10px', color: '#007acc' }}>● Running</span>
              )}
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {outputLines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </pre>
            {waitingInput && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                <span style={{ color: 'white' }}>{promptText}</span>
                <input
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit()}
                  placeholder="Enter input..."
                  style={{
                    background: '#333',
                    color: 'white',
                    border: '1px solid #555',
                    padding: '5px',
                    borderRadius: '3px'
                  }}
                />
                <button
                  onClick={handleInputSubmit}
                  style={{
                    background: '#007acc',
                    color: 'white',
                    border: 'none',
                    padding: '5px 10px',
                    cursor: 'pointer',
                    borderRadius: '3px'
                  }}
                >
                  Enter
                </button>
              </div>
            )}
            {outputLines.length === 0 && !isRunning && (
              <div style={{ color: '#666', fontStyle: 'italic' }}>
                Click "Run" to execute your Python code
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CodeEditor;
