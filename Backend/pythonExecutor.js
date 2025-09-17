const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const router = express.Router();

// Store active processes to manage them
const activeProcesses = new Map();

// Simple execute endpoint that returns JSON response (for simple code)
router.post('/api/execute-python', async (req, res) => {
  const { code, sessionId } = req.body;
  
  console.log('[DEBUG] Received code execution request');
  console.log('[DEBUG] Code:', JSON.stringify(code));
  console.log('[DEBUG] Session ID:', sessionId);
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  // Kill any existing process for this session
  if (activeProcesses.has(sessionId)) {
    try {
      activeProcesses.get(sessionId).kill();
    } catch (e) {
      // Process might already be dead
    }
    activeProcesses.delete(sessionId);
  }

  try {
    // Try different Python commands
    const pythonCommands = ['python3', 'python', 'py'];
    let pythonCmd = 'python';
    
    // Test which Python command works
    for (const cmd of pythonCommands) {
      try {
        const testProcess = spawn(cmd, ['--version'], { stdio: 'pipe' });
        await new Promise((resolve, reject) => {
          testProcess.on('close', (code) => {
            if (code === 0) {
              pythonCmd = cmd;
              resolve();
            } else {
              reject();
            }
          });
          testProcess.on('error', reject);
        });
        break;
      } catch (e) {
        continue;
      }
    }

    console.log('[DEBUG] Using Python command:', pythonCmd);
    
    // Write code to a temporary file with UTF-8 encoding setup
    const tempFile = path.join(os.tmpdir(), `python_code_${sessionId}_${Date.now()}.py`);
    
    // Add UTF-8 encoding setup at the beginning of the code
    const encodingSetup = `# -*- coding: utf-8 -*-
import sys
import os

# Set UTF-8 encoding for Windows
if sys.platform.startswith('win'):
    # Set environment variables for UTF-8
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    
    # Try to set console code page to UTF-8
    try:
        import subprocess
        subprocess.run(['chcp', '65001'], shell=True, capture_output=True)
    except:
        pass

`;
    
    const fullCode = encodingSetup + code;
    fs.writeFileSync(tempFile, fullCode, 'utf8');
    
    console.log('[DEBUG] Temp file created:', tempFile);
    
    // Spawn Python process with temp file and UTF-8 environment
    const pythonProcess = spawn(pythonCmd, ['-u', tempFile], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONLEGACYWINDOWSSTDIO: '1'
      }
    });

    // Store the process
    activeProcesses.set(sessionId, pythonProcess);

    let output = '';
    let error = '';
    let hasOutput = false;
    let responseAlreadySent = false;

    // Collect stdout
    pythonProcess.stdout.on('data', (data) => {
      const dataStr = data.toString('utf8');
      console.log('[DEBUG] STDOUT:', JSON.stringify(dataStr));
      output += dataStr;
      hasOutput = true;
    });

    // Collect stderr
    pythonProcess.stderr.on('data', (data) => {
      const dataStr = data.toString('utf8');
      console.log('[DEBUG] STDERR:', JSON.stringify(dataStr));
      error += dataStr;
      hasOutput = true;
    });

    // Handle process completion
    pythonProcess.on('close', (exitCode) => {
      if (responseAlreadySent) return;
      responseAlreadySent = true;
      
      activeProcesses.delete(sessionId);
      
      console.log('[DEBUG] Process closed with exit code:', exitCode);
      console.log('[DEBUG] Has output:', hasOutput);
      console.log('[DEBUG] Final output:', JSON.stringify(output));
      console.log('[DEBUG] Final error:', JSON.stringify(error));
      
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
        console.log('[DEBUG] Temp file cleaned up');
      } catch (e) {
        console.log('[DEBUG] Failed to clean up temp file:', e.message);
      }
      
      const actualExitCode = exitCode !== null ? exitCode : (error.trim() ? 1 : 0);
      
      const result = {
        success: actualExitCode === 0,
        output: output.trim(),
        error: error.trim(),
        exitCode: actualExitCode
      };

      // Better handling of different scenarios
      if (actualExitCode === 0) {
        if (hasOutput && output.trim()) {
          // Code ran successfully with output
          result.success = true;
        } else {
          // Code ran but no output
          if (code.includes('import ') || code.includes('from ')) {
            result.output = 'Code executed successfully (no output)\n💡 If you expected output, check if all required packages are installed';
          } else {
            result.output = 'Code executed successfully (no output)';
          }
        }
      } else {
        // Non-zero exit code indicates an error
        result.success = false;
        if (!error.trim() && !output.trim()) {
          result.error = `Process exited with code ${actualExitCode}. This might indicate missing packages or syntax errors.`;
        }
      }

      console.log('[DEBUG] Sending result:', result);
      res.json(result);
    });

    // Handle process error
    pythonProcess.on('error', (err) => {
      if (responseAlreadySent) return;
      responseAlreadySent = true;
      
      activeProcesses.delete(sessionId);
      console.log('[DEBUG] Process error:', err.message);
      
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      res.status(500).json({
        success: false,
        error: `Failed to start Python process: ${err.message}. Make sure Python is installed and accessible.`,
        output: ''
      });
    });

    // No timeout - programs can run indefinitely

  } catch (err) {
    console.log('[DEBUG] Catch error:', err.message);
    res.status(500).json({
      success: false,
      error: `Server error: ${err.message}`,
      output: ''
    });
  }
});

// Interactive execution endpoint using Server-Sent Events
router.post('/api/execute-python-interactive', async (req, res) => {
  const { code, sessionId } = req.body;
  
  console.log('[DEBUG] Interactive execution request');
  console.log('[DEBUG] Code:', JSON.stringify(code));
  console.log('[DEBUG] Session ID:', sessionId);
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial message
  res.write(`data: ${JSON.stringify({ type: 'start', message: 'Execution started' })}\n\n`);

  // Kill any existing process for this session
  if (activeProcesses.has(sessionId)) {
    try {
      activeProcesses.get(sessionId).kill();
    } catch (e) {
      // Process might already be dead
    }
    activeProcesses.delete(sessionId);
  }

  try {
    // Find Python command
    const pythonCommands = ['python3', 'python', 'py'];
    let pythonCmd = 'python';
    
    for (const cmd of pythonCommands) {
      try {
        const testProcess = spawn(cmd, ['--version'], { stdio: 'pipe' });
        await new Promise((resolve, reject) => {
          testProcess.on('close', (code) => {
            if (code === 0) {
              pythonCmd = cmd;
              resolve();
            } else {
              reject();
            }
          });
          testProcess.on('error', reject);
        });
        break;
      } catch (e) {
        continue;
      }
    }

    // Write code to temp file with UTF-8 encoding setup
    const tempFile = path.join(os.tmpdir(), `python_code_${sessionId}_${Date.now()}.py`);
    
    // Add UTF-8 encoding setup at the beginning of the code
    const encodingSetup = `# -*- coding: utf-8 -*-
import sys
import os

# Set UTF-8 encoding for Windows
if sys.platform.startswith('win'):
    # Set environment variables for UTF-8
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    
    # Try to set console code page to UTF-8
    try:
        import subprocess
        subprocess.run(['chcp', '65001'], shell=True, capture_output=True)
    except:
        pass

`;
    
    const fullCode = encodingSetup + code;
    fs.writeFileSync(tempFile, fullCode, 'utf8');
    
    // Spawn Python process with UTF-8 environment
    const pythonProcess = spawn(pythonCmd, ['-u', tempFile], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONLEGACYWINDOWSSTDIO: '1'
      }
    });

    activeProcesses.set(sessionId, pythonProcess);

    let lastOutput = '';

    // Handle stdout
    pythonProcess.stdout.on('data', (data) => {
      const dataStr = data.toString('utf8');
      console.log('[DEBUG] Interactive STDOUT:', JSON.stringify(dataStr));
      
      res.write(`data: ${JSON.stringify({ type: 'output', data: dataStr })}\n\n`);
      lastOutput += dataStr;
      
      // Check if waiting for input
      const lines = dataStr.split('\n');
      const lastLine = lines[lines.length - 1] || lines[lines.length - 2];
      if (lastLine && lastLine.trim() && (lastLine.includes(':') || lastLine.includes('?') || lastLine.toLowerCase().includes('enter'))) {
        res.write(`data: ${JSON.stringify({ type: 'input_request', prompt: lastLine.trim() })}\n\n`);
      }
    });

    // Handle stderr
    pythonProcess.stderr.on('data', (data) => {
      const dataStr = data.toString('utf8');
      console.log('[DEBUG] Interactive STDERR:', JSON.stringify(dataStr));
      res.write(`data: ${JSON.stringify({ type: 'error', data: dataStr })}\n\n`);
    });

    // Handle process completion
    pythonProcess.on('close', (exitCode) => {
      activeProcesses.delete(sessionId);
      
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      res.write(`data: ${JSON.stringify({ type: 'exit', code: exitCode })}\n\n`);
      res.end();
    });

    // Handle process error
    pythonProcess.on('error', (err) => {
      activeProcesses.delete(sessionId);
      
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      res.write(`data: ${JSON.stringify({ type: 'error', data: `Process error: ${err.message}` })}\n\n`);
      res.end();
    });

    // Handle client disconnect
    req.on('close', () => {
      if (activeProcesses.has(sessionId)) {
        try {
          activeProcesses.get(sessionId).kill();
        } catch (e) {
          // Process might already be dead
        }
        activeProcesses.delete(sessionId);
      }
    });

    // No timeout - programs can run indefinitely

  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', data: `Server error: ${err.message}` })}\n\n`);
    res.end();
  }
});

// Send input to Python process
router.post('/api/python-input', (req, res) => {
  const { sessionId, input } = req.body;
  
  console.log('[DEBUG] Received input for session:', sessionId, 'Input:', JSON.stringify(input));
  
  if (activeProcesses.has(sessionId)) {
    const process = activeProcesses.get(sessionId);
    
    try {
      process.stdin.write(input + '\n', 'utf8');
      console.log('[DEBUG] Input sent to process');
      res.json({ success: true });
    } catch (error) {
      console.log('[DEBUG] Failed to send input:', error.message);
      res.status(500).json({ error: 'Failed to send input' });
    }
  } else {
    res.status(404).json({ error: 'No active process found' });
  }
});

// Stop Python execution
router.post('/api/stop-python', (req, res) => {
  const { sessionId } = req.body;
  
  if (activeProcesses.has(sessionId)) {
    try {
      activeProcesses.get(sessionId).kill();
      activeProcesses.delete(sessionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to stop process' });
    }
  } else {
    res.json({ success: true }); // Already stopped
  }
});

// Health check endpoint
router.get('/api/python-health', (req, res) => {
  const pythonCommands = ['python3', 'python', 'py'];
  
  const testPython = async (cmd) => {
    return new Promise((resolve) => {
      const testProcess = spawn(cmd, ['--version'], { stdio: 'pipe' });
      testProcess.on('close', (code) => {
        resolve(code === 0);
      });
      testProcess.on('error', () => {
        resolve(false);
      });
    });
  };

  Promise.all(pythonCommands.map(testPython)).then(results => {
    const availableCommands = pythonCommands.filter((_, i) => results[i]);
    
    res.json({
      pythonAvailable: availableCommands.length > 0,
      availableCommands: availableCommands,
      activeProcesses: activeProcesses.size
    });
  });
});

// Check if specific Python packages are installed
router.post('/api/check-packages', async (req, res) => {
  const { packages } = req.body;
  
  if (!packages || !Array.isArray(packages)) {
    return res.status(400).json({ error: 'Please provide an array of package names' });
  }

  try {
    const pythonCommands = ['python3', 'python', 'py'];
    let pythonCmd = 'python';
    
    for (const cmd of pythonCommands) {
      try {
        const testProcess = spawn(cmd, ['--version'], { stdio: 'pipe' });
        await new Promise((resolve, reject) => {
          testProcess.on('close', (code) => {
            if (code === 0) {
              pythonCmd = cmd;
              resolve();
            } else {
              reject();
            }
          });
          testProcess.on('error', reject);
        });
        break;
      } catch (e) {
        continue;
      }
    }

    const packageStatus = {};
    
    for (const pkg of packages) {
      try {
        const tempFile = path.join(os.tmpdir(), `check_${pkg}_${Date.now()}.py`);
        const checkCode = `import ${pkg}; print("${pkg}: OK")`;
        fs.writeFileSync(tempFile, checkCode, 'utf8');
        
        const checkProcess = spawn(pythonCmd, [tempFile], {
          stdio: 'pipe',
          shell: false,
          env: {
            ...process.env,
            PYTHONIOENCODING: 'utf-8'
          }
        });

        await new Promise((resolve) => {
          let output = '';
          let error = '';
          
          checkProcess.stdout.on('data', (data) => {
            output += data.toString('utf8');
          });
          
          checkProcess.stderr.on('data', (data) => {
            error += data.toString('utf8');
          });
          
          checkProcess.on('close', (code) => {
            try {
              fs.unlinkSync(tempFile);
            } catch (e) {
              // Ignore cleanup errors
            }
            
            if (code === 0 && output.includes('OK')) {
              packageStatus[pkg] = { installed: true, error: null };
            } else {
              packageStatus[pkg] = { 
                installed: false, 
                error: error.trim() || `Package '${pkg}' not found` 
              };
            }
            resolve();
          });
        });
      } catch (e) {
        packageStatus[pkg] = { installed: false, error: e.message };
      }
    }

    res.json({
      pythonCommand: pythonCmd,
      packages: packageStatus
    });

  } catch (err) {
    res.status(500).json({
      error: `Failed to check packages: ${err.message}`
    });
  }
});

module.exports = router;