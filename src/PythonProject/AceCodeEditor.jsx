import React, { useState, useEffect } from 'react';

// Simple code editor component (we'll enhance this with ACE later)
function AceCodeEditor({ value, onChange, onRun, isRunning }) {
  const [code, setCode] = useState(value || '');

  useEffect(() => {
    if (value !== undefined) {
      setCode(value);
    }
  }, [value]);

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
    if (onChange) {
      onChange(newCode);
    }
  };

  const handleKeyDown = (e) => {
    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);
      if (onChange) {
        onChange(newCode);
      }
      
      // Set cursor position after the inserted tab
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    }
    
    // Ctrl+Enter to run code
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (onRun && !isRunning) {
        onRun();
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor Header */}
      <div className="flex items-center justify-between bg-gray-800 text-white px-4 py-2 text-sm">
        <div className="flex items-center space-x-2">
          <span className="text-green-400">●</span>
          <span>Python Editor</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-400">Ctrl+Enter to run</span>
          <button
            onClick={onRun}
            disabled={isRunning}
            className={`px-3 py-1 rounded text-sm font-medium ${
              isRunning
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isRunning ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 relative">
        <textarea
          value={code}
          onChange={handleCodeChange}
          onKeyDown={handleKeyDown}
          className="w-full h-full p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none outline-none"
          placeholder="# Write your Python code here
def main():
    print('Hello, World!')
    name = input('Enter your name: ')
    print(f'Hello, {name}!')

main()"
          spellCheck={false}
          style={{
            lineHeight: '1.5',
            tabSize: 4,
          }}
        />
        
        {/* Line numbers overlay (simple version) */}
        <div className="absolute left-0 top-0 p-4 pointer-events-none text-gray-500 font-mono text-sm select-none">
          {code.split('\n').map((_, index) => (
            <div key={index} style={{ lineHeight: '1.5' }}>
              {index + 1}
            </div>
          ))}
        </div>
        
        {/* Add left padding to account for line numbers */}
        <style jsx>{`
          textarea {
            padding-left: ${Math.max(2, code.split('\n').length.toString().length) * 8 + 20}px !important;
          }
        `}</style>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-700 text-gray-300 px-4 py-1 text-xs flex items-center justify-between">
        <div>
          Lines: {code.split('\n').length} | Characters: {code.length}
        </div>
        <div>
          Python | UTF-8
        </div>
      </div>
    </div>
  );
}

export default AceCodeEditor;