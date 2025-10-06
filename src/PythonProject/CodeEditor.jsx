import React, { useEffect, useState, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { runPythonCode } from './pythonRunner';

const defaultCode = `# Write your Python code here
def main():
    print("Hello, World!")
    name = input("Enter your name: ")
    print(f"Hello, {name}!")

main()`;

function CodeEditor({ onCodeChange, onStuckClick, onOutputChange, value, readOnly, hideTerminal }) {
  const [code, setCode] = useState(defaultCode);
  const [outputLines, setOutputLines] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [waitingInput, setWaitingInput] = useState(false);
  const [promptText, setPromptText] = useState('');
  const inputResolver = useRef(null);
  
  // Buffer for batching output updates
  const outputBuffer = useRef([]);
  const outputTimeout = useRef(null);
  
  // Clear any pending timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (outputTimeout.current) {
        clearTimeout(outputTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (onCodeChange) {
      onCodeChange(code);
    }
  }, [code, onCodeChange]);

  useEffect(() => {
    if (onOutputChange) {
      onOutputChange(outputLines);
    }
  }, [outputLines, onOutputChange]);

  const appendOutput = useCallback((lines) => {
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
        return [...prev, ...outputBuffer.current];
      });
      outputBuffer.current = [];
      outputTimeout.current = null;
    }, 30); // Small delay to batch rapid updates
  }, []);

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

  const [isLoading, setIsLoading] = useState(false);

  const runPython = async () => {
    // Clear any pending output updates
    if (outputTimeout.current) {
      clearTimeout(outputTimeout.current);
      outputTimeout.current = null;
    }
    outputBuffer.current = [];
    
    // Clear previous output and input state
    setOutputLines(['⏳ Running your code...']);
    setWaitingInput(false);
    
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
          onChange={readOnly ? undefined : (val) => setCode(val || '')}
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
