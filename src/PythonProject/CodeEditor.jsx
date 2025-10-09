import React, { useEffect, useState, useRef, useCallback } from 'react';
import { debounce } from 'lodash';
import Editor from '@monaco-editor/react';
import { runPythonCode } from './pythonRunner';

const defaultCode = `# Write your Python code here
def main():
    print("Hello, World!")
    name = input("Enter your name: ")
    print(f"Hello, {name}!")

main()`;

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
  const inputResolver = useRef(null);
  
  // Buffer for batching output updates
  const outputBuffer = useRef([]);
  const outputTimeout = useRef(null);
  
  // Clear any pending timeouts and save code when component unmounts
  useEffect(() => {
    return () => {
      if (outputTimeout.current) {
        clearTimeout(outputTimeout.current);
      }
      // Save code one last time when unmounting, unless project ended
      if (localStorage.getItem('projectEnded') !== 'true') {
        try {
          localStorage.setItem(storageKey, code);
        } catch (error) {
          console.error('Failed to save code to localStorage on unmount:', error);
        }
      }
    };
  }, [code, storageKey]);

  // Debounced save to localStorage
  const saveToStorage = useCallback(
    debounce((codeToSave) => {
      if (localStorage.getItem('projectEnded') !== 'true') {
        try {
          localStorage.setItem(storageKey, codeToSave);
        } catch (error) {
          console.error('Failed to save code to localStorage:', error);
        }
      }
    }, 500), // 500ms debounce delay
    [storageKey]
  );

  const handleEditorChange = (newValue) => {
    const newCode = newValue || '';
    setCode(newCode);
    codeRef.current = newCode; // Update the ref
    
    // Debounced save to localStorage
    saveToStorage(newCode);
    
    // Notify parent component immediately
    if (onCodeChange) {
      onCodeChange(newCode);
    }
  };

  useEffect(() => {
    if (onOutputChange) {
      onOutputChange(outputLines);
    }
  }, [outputLines, onOutputChange]);

  const appendOutput = useCallback((lines) => {
    if (!Array.isArray(lines)) lines = [String(lines)];
    
    // Filter out empty lines if needed
    lines = lines.filter(line => line !== '');
    if (lines.length === 0) return;
    
    // Add new lines to buffer
    outputBuffer.current = [...outputBuffer.current, ...lines];
    
    // Clear any pending updates
    if (outputTimeout.current) {
      clearTimeout(outputTimeout.current);
    }
    
    // Batch updates to reduce re-renders
    outputTimeout.current = setTimeout(() => {
      setOutputLines(prev => {
        // If the first line is our loading message, replace it
        if (prev.length === 1 && prev[0] === '⏳ Running your code...') {
          return [...outputBuffer.current];
        }
        // Otherwise, append to existing output
        return [...prev, ...outputBuffer.current];
      });
      outputBuffer.current = [];
      outputTimeout.current = null;
    }, 30); // Small delay to batch rapid updates
  }, []);

  const handleInput = (prompt, resolve) => {
    // Show the prompt in the output
    appendOutput([prompt]);
    setPromptText(prompt);
    setWaitingInput(true);
    inputResolver.current = resolve;
  };

  const handleInputSubmit = () => {
    if (inputResolver.current && inputValue !== undefined) {
      // Add the user's input to the output
      appendOutput([inputValue]);
      // Send the input to the Python process
      inputResolver.current(inputValue);
      inputResolver.current = null;
      // Clear the input field but keep waiting state until next input is requested
      setInputValue('');
      // Don't set waitingInput to false here - let the Python code handle the next input
    }
  };

  const [isLoading, setIsLoading] = useState(false);

  const runPython = async () => {
    // Clear any pending output updates
    if (outputTimeout.current) {
      clearTimeout(outputTimeout.current);
      outputTimeout.current = null;
    }
    outputBuffer.current = [];
    
    // Clear previous output but keep the history
    setOutputLines(prev => {
      // Only show loading message if there's no existing output
      return prev.length === 0 ? ['⏳ Running your code...'] : [];
    });
    
    // Reset input state
    setWaitingInput(false);
    setInputValue('');
    setPromptText('');
    
    try {
      const codeToRun = value !== undefined ? value : code;
      
      // Run the Python code
      await runPythonCode({
        code: codeToRun,
        onOutput: appendOutput,
        onInput: handleInput,
        isPreview: false
      });
    } catch (err) {
      // Use setTimeout to ensure state updates are batched
      setTimeout(() => {
        setOutputLines(prev => 
          prev[0] === '⏳ Running your code...' 
            ? [`❌ Error: ${err.message}`] 
            : [...prev, `❌ Error: ${err.message}`]
        );
      }, 0);
    }
  };

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          language="python"
          theme="vs-dark"
          value={value !== undefined ? value : code}
          onChange={readOnly ? undefined : handleEditorChange}
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
              style={{
                background: '#007acc',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '5px',
                opacity: 1
              }}
            >
              Run
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
