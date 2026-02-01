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
  
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  // Debug: Check if API key is available
  if (!apiKey) {
    console.error('OpenAI API key not found. Please check VITE_OPENAI_API_KEY environment variable.');
    return {};
  }
  
  console.log('Starting AI check with OpenAI API...');
  
  const tasks = {};
  
  for (const [taskKey, task] of Object.entries(config.tasks)) {
    const subtasks = task.subtasks || [];
    const completed = [];
    const reasons = {};
    
    for (const subtask of subtasks) {
      const prompt = `Project: ${config.title}\nDescription: ${config.description}\n\nUser's Code:\n\n${userCode}\n\nSubtask: ${subtask}\n\nIs this subtask completed in the user's code? Respond only with true or false. Consider the subtask complete if the main functionality is present, even if minor improvements (like error handling) are missing.`;
      
      let isComplete = false;
      let answer = '';
      
      try {
        console.log(`Checking subtask: ${subtask}`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            max_tokens: 10
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`OpenAI API error for subtask "${subtask}":`, response.status, errorText);
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
          answer = data.choices[0].message.content.trim().toLowerCase();
          console.log(`OpenAI response for "${subtask}":`, answer);
        } else {
          console.warn(`Unexpected response format for subtask "${subtask}":`, data);
        }
        
        if (answer.startsWith('true')) {
          completed.push(subtask);
          isComplete = true;
        }
      } catch (e) {
        console.error(`Error checking subtask "${subtask}":`, e);
        // Continue with next subtask even if this one fails
      }
      
      // Always ask for reason/explanation
      const reasonPrompt = `Project: ${config.title}\nDescription: ${config.description}\n\nUser's Code:\n\n${userCode}\n\nSubtask: ${subtask}\n\nIf this subtask is not completed, explain why in one sentence. If it is completed, explain why it is considered complete.`;
      
      let reason = '';
      try {
        const reasonResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: reasonPrompt }],
            temperature: 0.2,
            max_tokens: 128
          })
        });
        
        if (reasonResponse.ok) {
          const reasonData = await reasonResponse.json();
          if (reasonData.choices && reasonData.choices[0] && reasonData.choices[0].message && reasonData.choices[0].message.content) {
            reason = reasonData.choices[0].message.content.trim();
            console.log(`Reason for "${subtask}":`, reason);
          }
        } else {
          console.warn(`Failed to get reason for subtask "${subtask}":`, reasonResponse.status);
        }
      } catch (e) {
        console.error(`Error getting reason for subtask "${subtask}":`, e);
        reason = 'Unable to get explanation due to API error.';
      }
      
      reasons[subtask] = reason || 'No explanation available.';
      
      // Check if reason indicates completion even if answer wasn't true
      if (!isComplete && reason && /(subtask (is|has been)? ?complete(?!.*incomplete)|main functionality is present|core functionality is present|the code fulfills|the code implements|the code achieves)(?!.*incomplete)/i.test(reason)) {
        completed.push(subtask);
      }
    }
    
    tasks[taskKey] = { completed, reasons };
  }
  
  console.log('AI check completed. Results:', tasks);
  return tasks;
};
