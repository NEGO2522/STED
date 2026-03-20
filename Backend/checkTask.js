// checkTask.js  –  proxy route for AI task/subtask checking
// Uses the Anthropic Claude API — reliable, no CORS, key stays server-side.

const express = require('express');
const router  = express.Router();

// ── call Claude API via native fetch ────────────────────────────────
async function callClaude(apiKey, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',   // fast + cheap
      max_tokens: 200,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(`Claude API ${response.status}: ${json?.error?.message || JSON.stringify(json)}`);
  }

  return json.content?.[0]?.text?.trim() || '';
}

// ── POST /api/check-task ─────────────────────────────────────────────
router.post('/api/check-task', async (req, res) => {
  const { userCode, taskTitle, subtasks, projectTitle } = req.body;

  if (!userCode || !userCode.trim())
    return res.status(400).json({ error: 'No code provided. Sync your notebook first.' });

  if (!Array.isArray(subtasks) || subtasks.length === 0)
    return res.status(400).json({ error: 'No subtasks provided.' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[check-task] ANTHROPIC_API_KEY is not set in Backend/.env');
    return res.status(500).json({ error: 'AI API key not configured. Add ANTHROPIC_API_KEY to Backend/.env' });
  }

  console.log(`[check-task] project="${projectTitle}" task="${taskTitle}" subtasks=${subtasks.length} codeLen=${userCode.length}`);

  const results = [];

  for (const subtask of subtasks) {
    let complete = false;
    let reason   = 'Could not evaluate this subtask.';

    const prompt =
`You are evaluating student Pandas/Python code from a Jupyter Notebook.

Project: "${projectTitle || 'Pandas Project'}"
Task: "${taskTitle || ''}"

Student's Code:
\`\`\`python
${userCode}
\`\`\`

Subtask to evaluate: "${subtask}"

RULES:
- Evaluate ONLY this specific subtask. Ignore missing future subtasks.
- Be lenient: if the main concept is implemented correctly, mark it complete.
- Reply in EXACTLY this two-line format, nothing else:

Status: true
Reason: One concise sentence.`;

    try {
      const raw = await callClaude(apiKey, prompt);
      console.log(`[check-task] subtask="${subtask}" → "${raw}"`);

      const statusMatch = raw.match(/^Status\s*:\s*(true|false)/im);
      const reasonMatch = raw.match(/^Reason\s*:\s*(.+)/im);

      if (statusMatch) complete = statusMatch[1].toLowerCase() === 'true';
      reason = reasonMatch ? reasonMatch[1].trim() : (raw || 'No reason returned.');

    } catch (err) {
      console.error(`[check-task] error for subtask "${subtask}":`, err.message);
      reason = err.message;
    }

    results.push({ subtask, complete, reason });
  }

  console.log('[check-task] done:', results.map(r => `${r.complete ? '✓' : '✗'} ${r.subtask}`).join(' | '));
  res.json({ results });
});

// ── GET /api/check-task-ping  (quick health check) ──────────────────
router.get('/api/check-task-ping', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: 'ANTHROPIC_API_KEY not set in Backend/.env' });

  try {
    const text = await callClaude(apiKey, 'Reply with exactly: pong');
    res.json({ ok: true, response: text, keyPrefix: apiKey.slice(0, 15) + '…' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
