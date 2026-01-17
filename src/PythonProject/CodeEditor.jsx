import React, { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { runPythonCode } from './pythonRunner';

const defaultCode = `# Write your Python code here`;

// Generate a unique key for localStorage based on the component's props
const getStorageKey = (id = 'default') => `saved_code_${id}`;

function CodeEditor({ onCodeChange, onOutputChange, value, readOnly, hideTerminal, editorId = 'default' }) {
  const storageKey = getStorageKey(editorId);
  const codeRef = useRef('');
  
  // Use the value prop if provided, otherwise use local state
  const [localCode, setLocalCode] = useState(defaultCode);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize the editor with the value from props or localStorage
  useEffect(() => {
    if (isInitialized) return;
    
    try {
      if (value !== undefined && value !== '') {
        // Use the value from props if provided
        codeRef.current = value;
        setLocalCode(value);
      } else {
        // Otherwise, try to load from localStorage
        const savedCode = localStorage.getItem(storageKey);
        if (savedCode !== null) {
          codeRef.current = savedCode;
          setLocalCode(savedCode);
        }
      }
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize code editor:', error);
      codeRef.current = defaultCode;
      setLocalCode(defaultCode);
      setIsInitialized(true);
    }
  }, [value, storageKey, isInitialized]);
  const [outputLines, setOutputLines] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [waitingInput, setWaitingInput] = useState(false);
  const [promptText, setPromptText] = useState('');
  const inputResolver = useRef(null);

  // Save local code changes to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      const currentCode = value !== undefined ? value : localCode;
      codeRef.current = currentCode;
      
      if (value === undefined) {
        // Only save to localStorage if we're in uncontrolled mode
        localStorage.setItem(storageKey, localCode);
      }
      
      if (onCodeChange) {
        onCodeChange(currentCode);
      }
    } catch (error) {
      console.error('Failed to save code:', error);
    }
  }, [localCode, value, storageKey, onCodeChange, isInitialized]);

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

  const handleInput = (prompt, resolve) => {
    // The prompt is now handled by the backend, so we don't need to display it here
    // Just store the resolve function and show the input field
    setWaitingInput(true);
    inputResolver.current = resolve;
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    if (inputResolver.current) {
      // Don't append the prompt again, just the user's input
      appendInputLine(inputValue);
      inputResolver.current(inputValue);
      inputResolver.current = null;
      setInputValue('');
      setWaitingInput(false);
      setPromptText('');
    }
  };

  const appendInputLine = (value) => {
    // Only append the input line with the prompt if there's actual input
    if (value.trim() !== '') {
      appendOutput([`${promptText}${value}`]);
    }
  };

  const runPython = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setOutputLines([]);
    setWaitingInput(false);

    try {
      const codeToRun = value !== undefined ? value : localCode;
      
      await runPythonCode({
        code: codeToRun,
        onOutput: appendOutput,
        onInput: handleInput,
        isPreview: false
      });
    } catch (err) {
      appendOutput([`❌ Error: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          language="python"
          theme="vs-dark"
          value={value !== undefined ? value : localCode}
          onChange={readOnly ? undefined : (val) => {
            const newCode = val || defaultCode;
            if (value === undefined) {
              setLocalCode(newCode);
            } else if (onCodeChange) {
              onCodeChange(newCode);
            }
          }}
          options={{
            readOnly: !!readOnly,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
          }}
          loading={<div style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:15,color:'white'}}>Loading Editor...</div>}
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
          </div>
          <div className='text-left' style={{ background: 'black', color: '#dcdcdc', padding: '10px', height: '250px', overflowY: 'auto', borderTop: '1px solid #555' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <strong>Terminal:</strong>
              {isRunning && (
                <span style={{ marginLeft: '10px', color: '#007acc' }}>● Running</span>
              )}
            </div>
            <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0, fontSize: '13px', lineHeight: '1.3' }}>
              {outputLines.map((line, idx) => (
                <div key={idx} style={{ padding: '1px 0' }}>{line}</div>
              ))}
              {waitingInput && (
                <div style={{ display: 'inline', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {promptText}
                  <input
                    autoFocus
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit(e)}
                    style={{
                      display: 'inline',
                      background: 'transparent',
                      color: 'white',
                      border: 'none',
                      outline: 'none',
                      padding: '0',
                      margin: '0',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      caretColor: 'white',
                      minWidth: '100px',
                      lineHeight: '1.3',
                      letterSpacing: '0.5px',
                      verticalAlign: 'baseline',
                      width: 'auto',
                      boxSizing: 'border-box'
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                </div>
              )}
            </div>
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