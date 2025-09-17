const { spawn } = require('child_process');

console.log('Testing Python execution...');

// Test simple print statement
const testCode = 'print("Hello World!")';
console.log(`Running code: ${testCode}`);

const pythonProcess = spawn('python', ['-c', testCode], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

let output = '';
let error = '';
let hasOutput = false;

pythonProcess.stdout.on('data', (data) => {
  const dataStr = data.toString();
  console.log(`STDOUT: "${dataStr}"`);
  output += dataStr;
  hasOutput = true;
});

pythonProcess.stderr.on('data', (data) => {
  const dataStr = data.toString();
  console.log(`STDERR: "${dataStr}"`);
  error += dataStr;
  hasOutput = true;
});

pythonProcess.on('close', (exitCode) => {
  console.log(`Process closed with exit code: ${exitCode}`);
  console.log(`Has output: ${hasOutput}`);
  console.log(`Final output: "${output}"`);
  console.log(`Final error: "${error}"`);
  console.log(`Output length: ${output.length}`);
  console.log(`Error length: ${error.length}`);
});

pythonProcess.on('error', (err) => {
  console.log(`Process error: ${err.message}`);
});

// Test Python version
setTimeout(() => {
  console.log('\n--- Testing Python version ---');
  const versionProcess = spawn('python', ['--version'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true
  });

  let versionOutput = '';
  let versionError = '';

  versionProcess.stdout.on('data', (data) => {
    versionOutput += data.toString();
  });

  versionProcess.stderr.on('data', (data) => {
    versionError += data.toString();
  });

  versionProcess.on('close', (exitCode) => {
    console.log(`Python version exit code: ${exitCode}`);
    console.log(`Python version output: "${versionOutput}"`);
    console.log(`Python version error: "${versionError}"`);
  });
}, 2000);