import React, { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { runPythonCode } from './pythonRunner';

const defaultCode = ` incorrect_concat.py
 def calculate_total(marks):
     total = ""              # BUG: total is a string
     for mark in marks:
         total += mark      # concatenates strings instead of summing numbers
     return total

marks = ["85", "90", "78"]
print("Total Marks:", calculate_total(marks))`;

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
    setPromptText(prompt);
    setWaitingInput(true);
    inputResolver.current = resolve;
  };

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