// src/PythonProject/pythonRunner.js

/**
 * Python runner using backend server - works with both simple and interactive code
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Extract import statements from Python code
function extractImports(code) {
  const imports = [];
  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Handle "import package" statements
    const importMatch = trimmed.match(/^import\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (importMatch) {
      imports.push(importMatch[1]);
    }
    
    // Handle "from package import ..." statements
    const fromMatch = trimmed.match(/^from\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+import/);
    if (fromMatch) {
      imports.push(fromMatch[1]);
    }
  }
  
  return [...new Set(imports)]; // Remove duplicates
}

export async function runPythonCode({ code, onOutput, onInput, isPreview }) {
  if (isPreview) {
    onOutput && onOutput(['⚠️ Preview mode - code execution not available']);
    return;
  }

  const sessionId = Date.now().toString();

  try {
    // First check if backend is available
    const healthResponse = await fetch(`${BACKEND_URL}/api/python-health`);
    if (!healthResponse.ok) {
      throw new Error('Backend server not available');
    }

    const healthData = await healthResponse.json();
    if (!healthData.pythonAvailable) {
      onOutput && onOutput(['❌ Python is not installed or not accessible on the server']);
      onOutput && onOutput(['💡 Please install Python and make sure it\'s in your PATH']);
      return;
    }

    // Check for imports and verify packages are installed
    const imports = extractImports(code);
    if (imports.length > 0) {
      const builtinModules = ['os', 'sys', 'json', 'time', 'datetime', 'math', 'random', 're', 'collections', 'itertools', 'functools', 'operator'];
      const externalImports = imports.filter(imp => !builtinModules.includes(imp));
      
      if (externalImports.length > 0) {
        onOutput && onOutput(['🔍 Checking required packages...']);
        
        try {
          const packageResponse = await fetch(`${BACKEND_URL}/api/check-packages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              packages: externalImports
            })
          });

          if (packageResponse.ok) {
            const packageData = await packageResponse.json();
            const missingPackages = [];
            
            for (const [pkg, status] of Object.entries(packageData.packages)) {
              if (!status.installed) {
                missingPackages.push(pkg);
              }
            }
            
            if (missingPackages.length > 0) {
              onOutput && onOutput(['❌ Missing required packages:']);
              missingPackages.forEach(pkg => {
                onOutput && onOutput([`   • ${pkg}`]);
              });
              onOutput && onOutput(['💡 Install missing packages with:']);
              onOutput && onOutput([`   pip install ${missingPackages.join(' ')}`]);
              return;
            } else {
              onOutput && onOutput(['✅ All required packages are installed']);
            }
          }
        } catch (packageError) {
          onOutput && onOutput(['⚠️ Could not verify packages, continuing execution...']);
        }
      }
    }

    // Check if code contains input() - if so, use interactive mode
    const hasInput = code.includes('input(');
    
    if (hasInput && onInput) {
      // Use interactive execution for code with input()
      await runInteractiveCode(code, sessionId, onOutput, onInput);
    } else {
      // Use simple execution for code without input()
      await runSimpleCode(code, sessionId, onOutput);
    }

  } catch (error) {
    console.error('Python execution error:', error);
    onOutput && onOutput([`❌ Connection error: ${error.message}`]);
    onOutput && onOutput(['💡 Make sure the backend server is running on port 8000']);
  }
}

// Simple execution for code without input()
async function runSimpleCode(code, sessionId, onOutput) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/execute-python`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        sessionId: sessionId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[DEBUG] Execution result:', result);

    // Handle the response
    if (result.success) {
      if (result.output && result.output.trim()) {
        // Split output into lines and send to terminal
        const lines = result.output.split('\n').filter(line => line.trim() !== '');
        if (lines.length > 0) {
          onOutput && onOutput(lines);
        } else {
          onOutput && onOutput(['✅ Code executed successfully']);
        }
      } else {
        onOutput && onOutput(['✅ Code executed successfully (no output)']);
      }
    } else {
      // Handle errors
      if (result.waitingForInput) {
        onOutput && onOutput(['⚠️ This program requires user input']);
        onOutput && onOutput(['💡 Programs with input() need interactive mode']);
        if (result.output) {
          const outputLines = result.output.split('\n').filter(line => line.trim() !== '');
          onOutput && onOutput(outputLines);
        }
      } else if (result.error) {
        const errorLines = result.error.split('\n').filter(line => line.trim() !== '');
        
        // Check if error is related to missing modules
        const errorText = result.error.toLowerCase();
        if (errorText.includes('no module named') || errorText.includes('modulenotfounderror')) {
          onOutput && onOutput(['❌ Missing Python package detected!']);
          onOutput && onOutput(errorLines.map(line => `   ${line}`));
          
          // Extract package name from error
          const moduleMatch = result.error.match(/No module named '([^']+)'/i);
          if (moduleMatch) {
            const missingModule = moduleMatch[1];
            onOutput && onOutput(['💡 To fix this, install the missing package:']);
            onOutput && onOutput([`   pip install ${missingModule}`]);
          }
        } else {
          onOutput && onOutput(errorLines.map(line => `❌ ${line}`));
        }
      }
      
      if (result.output && !result.waitingForInput) {
        // Show any output that was produced before the error
        const outputLines = result.output.split('\n').filter(line => line.trim() !== '');
        if (outputLines.length > 0) {
          onOutput && onOutput(['📤 Output before error:']);
          onOutput && onOutput(outputLines);
        }
      }
    }

  } catch (error) {
    console.error('Simple execution error:', error);
    onOutput && onOutput([`❌ Execution error: ${error.message}`]);
  }
}

// Interactive execution for code with input()
async function runInteractiveCode(code, sessionId, onOutput, onInput) {
  try {
    // Use Server-Sent Events for interactive execution
    const response = await fetch(`${BACKEND_URL}/api/execute-python-interactive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        sessionId: sessionId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Set up EventSource to read the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case 'start':
                console.log('[DEBUG] Interactive execution started');
                break;
                
              case 'output':
                if (data.data && data.data.trim()) {
                  const outputLines = data.data.split('\n').filter(line => line.trim() !== '');
                  onOutput && onOutput(outputLines);
                }
                break;
                
              case 'error':
                if (data.data && data.data.trim()) {
                  const errorLines = data.data.split('\n').filter(line => line.trim() !== '');
                  onOutput && onOutput(errorLines.map(line => `❌ ${line}`));
                }
                break;
                
              case 'input_request':
                console.log('[DEBUG] Input requested:', data.prompt);
                if (onInput) {
                  onInput(data.prompt || 'Input: ', async (inputValue) => {
                    console.log('[DEBUG] Sending input:', inputValue);
                    
                    try {
                      const inputResponse = await fetch(`${BACKEND_URL}/api/python-input`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          sessionId: sessionId,
                          input: inputValue
                        })
                      });

                      if (!inputResponse.ok) {
                        console.error('Failed to send input');
                        onOutput && onOutput(['❌ Failed to send input to program']);
                      }
                    } catch (error) {
                      console.error('Error sending input:', error);
                      onOutput && onOutput(['❌ Error sending input to program']);
                    }
                  });
                }
                break;
                
              case 'exit':
                console.log('[DEBUG] Process exited with code:', data.code);
                if (data.code !== 0) {
                  onOutput && onOutput([`Process exited with code ${data.code}`]);
                }
                return;
                
              case 'timeout':
                onOutput && onOutput(['❌ Execution timeout']);
                onOutput && onOutput(['💡 Program took too long to execute']);
                return;
            }
          } catch (e) {
            // Ignore JSON parse errors for malformed chunks
            console.warn('Failed to parse SSE data:', line);
          }
        }
      }
    }

  } catch (error) {
    console.error('Interactive execution error:', error);
    onOutput && onOutput([`❌ Interactive execution error: ${error.message}`]);
  }
}

// Test backend connection
export async function testBackendConnection() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/python-health`);
    if (!response.ok) {
      return { connected: false, error: 'Backend server not responding' };
    }
    
    const data = await response.json();
    return {
      connected: true,
      pythonAvailable: data.pythonAvailable,
      availableCommands: data.availableCommands,
      activeProcesses: data.activeProcesses
    };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

// Check specific packages
export async function checkPackages(packages) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/check-packages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ packages })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}