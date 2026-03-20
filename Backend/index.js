require('dotenv').config();               // ← load .env first

const express = require('express');
const fetchColabRouter     = require('./fetchColab');
const pythonExecutorRouter = require('./pythonExecutor');
const checkTaskRouter      = require('./checkTask');
const cors = require('cors');

const app  = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(fetchColabRouter);
app.use(pythonExecutorRouter);
app.use(checkTaskRouter);

app.get('/', (req, res) => {
  res.json({
    message: 'STED Backend running.',
    endpoints: [
      'GET  /api/fetch_colab    – fetch Google Drive .ipynb',
      'POST /api/execute-python – run Python code',
      'POST /api/check-task     – AI task/subtask checker',
    ],
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/test', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`OpenAI key loaded: ${process.env.OPENAI_API_KEY ? 'YES' : 'NO — check Backend/.env'}`);
});
