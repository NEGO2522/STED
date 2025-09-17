const express = require('express');
const fetchColabRouter = require('./fetchColab');
const pythonExecutorRouter = require('./pythonExecutor');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(fetchColabRouter);
app.use(pythonExecutorRouter);

app.get('/', (req, res) => {
  res.json({
    message: 'Backend is running with Python execution support.',
    endpoints: [
      'POST /api/execute-python - Execute Python code',
      'GET /api/python-health - Check Python availability',
      'POST /api/python-input - Send input to running process',
      'POST /api/stop-python - Stop running process'
    ],
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend API is working',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Python execution endpoint available at /api/execute-python');
});
