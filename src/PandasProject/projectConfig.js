// Pandas Project Config and Gemini Check

import { ref, get } from 'firebase/database';
import { db } from '../firebase';

export const getPandasProjectConfig = async (projectKey) => {
  // Try to fetch the config from Firebase using the projectKey
  try {
    const projectRef = ref(db, `PandasProject/${projectKey}`);
    const snap = await get(projectRef);
    if (snap.exists()) {
      const data = snap.val();
      // Ensure the structure matches what is expected
      return {
        title: data.title || 'Pandas Project',
        description: data.description || 'A project using pandas in Colab',
        tasks: data.tasks || {},
      };
    }
  } catch (e) {
    // ignore and fall back to mock
  }
  // Fallback: return a mock config
  return {
    title: 'Pandas Project',
    description: 'A project using pandas in Colab',
    tasks: {
      'task1': {
        subtasks: [
          'Import pandas',
          'Read a CSV file',
          'Display the first 5 rows',
        ]
      }
    }
  };
};

export const checkTasksAndSubtasksGemini = async (userCode, config) => {
  if (!config || !config.tasks) return {};
  const tasks = {};
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = 'gemini-1.5-flash';

  for (const [taskKey, task] of Object.entries(config.tasks)) {
    const subtasks = task.subtasks || [];
    const completed = [];
    const reasons = {};
    for (const subtask of subtasks) {
      const prompt = `Project: ${config.title}\nDescription: ${config.description}\n\nUser's Code:\n\n${userCode}\n\nSubtask: ${subtask}\n\nIs this subtask completed in the user's code? Respond only with true or false. Consider the subtask complete if the main functionality is present, even if minor improvements (like error handling) are missing.`;
      let isComplete = false;
      let answer = '';
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
          answer = data.candidates[0].content.parts[0].text.trim().toLowerCase();
        }
        if (answer === 'true') {
          completed.push(subtask);
          isComplete = true;
        }
      } catch (e) {}
      // Always ask for reason/explanation
      const reasonPrompt = `Project: ${config.title}\nDescription: ${config.description}\n\nUser's Code:\n\n${userCode}\n\nSubtask: ${subtask}\n\nIf this subtask is not completed, explain why in one sentence. If it is completed, explain why it is considered complete.`;
      let reason = '';
      try {
        const reasonResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: reasonPrompt }] }] })
        });
        const reasonData = await reasonResponse.json();
        if (reasonData.candidates && reasonData.candidates[0] && reasonData.candidates[0].content && reasonData.candidates[0].content.parts) {
          reason = reasonData.candidates[0].content.parts[0].text.trim();
        }
      } catch (e) {}
      reasons[subtask] = reason;
    }
    tasks[taskKey] = { completed, reasons };
  }
  return tasks;
};
