// import project1Config from './Project1.json';
import { getDatabase, ref, get } from 'firebase/database';

// Project configurations mapping (no longer needed for dynamic fetch)
// const projectConfigs = {
//   'project1': project1Config,
// };

// Load project configuration from Firebase
export const getProjectConfig = async (projectId) => {
  const db = getDatabase();
  
  // Try with the exact key first
  let projectRef = ref(db, `PythonProject/${projectId}`);
  let snapshot = await get(projectRef);
  
  // If not found, try with capitalized key for backward compatibility
  if (!snapshot.exists()) {
    const projectKey = projectId.charAt(0).toUpperCase() + projectId.slice(1);
    projectRef = ref(db, `PythonProject/${projectKey}`);
    snapshot = await get(projectRef);
  }
  
  // If still not found, try with lowercase key for Gemini-generated projects
  if (!snapshot.exists()) {
    const lowercaseKey = projectId.toLowerCase();
    projectRef = ref(db, `PythonProject/${lowercaseKey}`);
    snapshot = await get(projectRef);
  }
  
  if (snapshot.exists()) {
    const projectData = snapshot.val();
    
    // Normalize the structure to handle both regular and Gemini-generated projects
    const normalizedProject = {
      ...projectData,
      // If ProjectTasks exists but tasks doesn't, use ProjectTasks as tasks
      tasks: projectData.tasks || projectData.ProjectTasks || {
        task1: { 
          title: projectData.title || 'Main Task', 
          subtasks: projectData.subtasks || [],
          description: projectData.description || ''
        }
      }
    };
    
    return normalizedProject;
  }
  return null;
};

// Generic validation functions that work with any project config
export const validateCodeAgainstExpected = (userCode, config) => {
  if (!config || !config.validationRules) return [];
  
  const missing = [];
  const userCodeClean = userCode.replace(/\s+/g, ' ').toLowerCase();
  
  // Check required components with flexible input detection
  config.validationRules.requiredComponents.forEach(component => {
    const componentLower = component.toLowerCase();
    let found = false;
    
    // Special handling for input detection
    if (componentLower === 'input(') {
      found = userCodeClean.includes('input(') || userCodeClean.includes('input_async(');
    } else {
      found = userCodeClean.includes(componentLower);
    }
    
    if (!found) {
      missing.push(component);
    }
  });
  
  return missing;
};

// Anti-gaming detection function
export const detectGamingAttempts = (userCode) => {
  const userCodeClean = userCode.replace(/\s+/g, ' ').toLowerCase();
  const issues = [];
  
  // Check for suspicious text-only implementations
  const suspiciousPatterns = [
    'marked completed',
    'task completed', 
    'completed successfully',
    'done',
    'finished',
    'implemented',
    'working',
    'functional'
  ];
  
  const hasSuspiciousText = suspiciousPatterns.some(pattern => 
    userCodeClean.includes(pattern) && 
    !userCodeClean.includes('print') && 
    !userCodeClean.includes('def') &&
    !userCodeClean.includes('if') &&
    !userCodeClean.includes('while') &&
    !userCodeClean.includes('for')
  );
  
  if (hasSuspiciousText) {
    issues.push('⚠️ Detected text-only implementation attempt. Please write actual code instead of just describing what should happen.');
  }
  
  // Check for code patterns that are just strings
  const codePatterns = [
    'input(',
    'def show_menu',
    'while true',
    'append(',
    'pop(',
    'enumerate',
    't["completed"] = true'
  ];
  
  codePatterns.forEach(pattern => {
    if (userCodeClean.includes(`"${pattern}"`) || userCodeClean.includes(`'${pattern}'`)) {
      issues.push(`⚠️ Found "${pattern}" as a string instead of actual code. Please implement the functionality, not just write it as text.`);
    }
  });
  
  // Check for minimal code that doesn't actually do anything
  const lines = userCode.split('\n').filter(line => line.trim().length > 0);
  const codeLines = lines.filter(line => 
    !line.trim().startsWith('#') && 
    !line.trim().startsWith('"""') &&
    !line.trim().startsWith("'''") &&
    line.trim().length > 0
  );
  
  if (codeLines.length < 5) {
    issues.push('⚠️ Very minimal code detected. Make sure you\'re implementing the full functionality, not just placeholder code.');
  }
  
  // Check for excessive comments vs actual code
  const commentLines = lines.filter(line => 
    line.trim().startsWith('#') || 
    line.trim().startsWith('"""') ||
    line.trim().startsWith("'''")
  );
  
  if (commentLines.length > codeLines.length) {
    issues.push('⚠️ Too many comments compared to actual code. Focus on implementing the functionality.');
  }
  
  return issues;
};

export const checkTasksAndSubtasks = (userCode, config) => {
  if (!config || !config.tasks) return {};
  
  const tasks = {};
  const userCodeClean = userCode.replace(/\s+/g, ' ').toLowerCase();
  
  Object.entries(config.tasks).forEach(([taskKey, task]) => {
    const subtasks = task.subtasks || [];
    const codeChecks = task.codeChecks || [];
    const completed = [];

    // For each codeCheck, check if it exists in userCode
    codeChecks.forEach((check, idx) => {
      let found = false;
      if (check.startsWith('/') && check.endsWith('/')) {
        // Treat as regex
        try {
          const regex = new RegExp(check.slice(1, -1), 'i');
          found = regex.test(userCode);
        } catch (e) {
          found = false;
        }
      } else {
        found = userCodeClean.includes(check.toLowerCase());
      }
      // If found, mark the corresponding subtask as complete (by index)
      if (found && subtasks[idx] && !completed.includes(subtasks[idx])) {
        completed.push(subtasks[idx]);
      }
    });

    tasks[taskKey] = {
      title: task.title,
      subtasks,
      completed,
    };
  });

  return tasks;
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
      // More forgiving yes/no prompt
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
      } catch (e) {
        // On error, treat as not complete
      }
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
        reasons[subtask] = reason;
      } catch (e) {
        reasons[subtask] = '';
      }
      // If explanation says subtask is complete, mark as complete
      if (!isComplete && reason && /subtask (is|has been)? ?complete|main functionality is present|core functionality is present|the code fulfills|the code implements|the code achieves/i.test(reason)) {
        completed.push(subtask);
      }
    }
    tasks[taskKey] = {
      title: task.title,
      subtasks,
      completed,
      reasons,
    };
  }
  return tasks;
};

export const analyzeTerminalOutput = (output, config) => {
  if (!config || !config.terminalChecks) {
    return {
      hasErrors: false,
      errors: [],
      hasMenu: false,
      hasInput: false,
      isWorking: false,
      feedback: [],
      functionalityChecks: {}
    };
  }
  
  const outputText = output.join('\n');
  // console.log('Terminal output being analyzed:', outputText);
  
  const analysis = {
    hasErrors: false,
    errors: [],
    hasMenu: false,
    hasInput: false,
    isWorking: false,
    feedback: [],
    functionalityChecks: {}
  };

  // Check for errors
  if (outputText.includes('❌ Error:') || 
      outputText.includes('SyntaxError') || 
      outputText.includes('NameError') || 
      outputText.includes('IndentationError') ||
      outputText.includes('TypeError') ||
      outputText.includes('AttributeError') ||
      outputText.includes('ZeroDivisionError')) {
    analysis.hasErrors = true;
    analysis.errors.push("Runtime errors detected in terminal output");
  }

  // Check each terminal check from config
  Object.entries(config.terminalChecks).forEach(([checkKey, checkConfig]) => {
    const hasKeyword = checkConfig.keywords.some(keyword => 
      outputText.includes(keyword)
    );
    
    analysis.functionalityChecks[checkKey] = hasKeyword;
    
    if (hasKeyword) {
      analysis.feedback.push(checkConfig.successMessage);
    } else {
      analysis.feedback.push(checkConfig.failureMessage);
    }
    
    // Set specific flags for backward compatibility
    if (checkKey === 'menuDisplay') {
      analysis.hasMenu = hasKeyword;
    }
    if (checkKey === 'inputPrompts') {
      analysis.hasInput = hasKeyword;
    }
  });

  // Overall assessment
  const allFunctionalityWorking = Object.values(analysis.functionalityChecks).every(check => check);
  if (allFunctionalityWorking && !analysis.hasErrors) {
    analysis.isWorking = true;
    analysis.feedback.push("🎉 Program is working correctly!");
  } else if (analysis.hasErrors) {
    analysis.feedback.push("🚨 Fix the errors before proceeding");
  } else {
    analysis.feedback.push("⚠️ Program needs more work - not all functionality tested");
  }

  // console.log('Analysis result:', analysis);
  return analysis;
};

export const validateCodeLogic = (userCode, config) => {
  if (!config || !config.validationRules) {
    return {
      hasAllMenuOptions: false,
      hasProperIfElifStructure: false,
      hasBreakStatement: false,
      hasErrorHandling: false,
      hasProperFunctionCalls: false,
      feedback: []
    };
  }
  
  const logicChecks = {
    hasAllMenuOptions: false,
    hasProperIfElifStructure: false,
    hasBreakStatement: false,
    hasErrorHandling: false,
    hasProperFunctionCalls: false,
    feedback: []
  };

  // Check required logic
  const requiredLogic = config.validationRules.requiredLogic || [];
  const missingLogic = requiredLogic.filter(logic => !userCode.includes(logic));
  
  if (missingLogic.length === 0) {
    logicChecks.hasAllMenuOptions = true;
    logicChecks.feedback.push("✅ All menu options are handled");
  } else {
    logicChecks.feedback.push(`❌ Missing logic: ${missingLogic.join(', ')}`);
  }

  // Check for proper if-elif structure
  if (userCode.includes("if choice == '1'") && userCode.includes("elif choice == '2'") && userCode.includes("elif choice == '3'") && userCode.includes("elif choice == '4'")) {
    logicChecks.hasProperIfElifStructure = true;
    logicChecks.feedback.push("✅ Proper if-elif structure for menu handling");
  } else {
    logicChecks.feedback.push("❌ Missing proper if-elif structure for menu handling");
  }

  // Check for break statement
  if (userCode.includes("break")) {
    logicChecks.hasBreakStatement = true;
    logicChecks.feedback.push("✅ Break statement for exit functionality");
  } else {
    logicChecks.feedback.push("❌ Missing break statement for exit functionality");
  }

  // Check for error handling
  if (userCode.includes("else:") && (userCode.toLowerCase().includes("invalid choice") || userCode.toLowerCase().includes("invalid") || userCode.toLowerCase().includes("try again"))) {
    logicChecks.hasErrorHandling = true;
    logicChecks.feedback.push("✅ Error handling for invalid choices");
  } else {
    logicChecks.feedback.push("❌ Missing error handling for invalid choices");
  }

  // Check for proper function calls
  const requiredFunctionCalls = config.validationRules.requiredFunctionCalls || [];
  const missingFunctionCalls = requiredFunctionCalls.filter(call => !userCode.includes(call));
  
  if (missingFunctionCalls.length === 0) {
    logicChecks.hasProperFunctionCalls = true;
    logicChecks.feedback.push("✅ All functions are properly called");
  } else {
    logicChecks.feedback.push(`❌ Missing function calls: ${missingFunctionCalls.join(', ')}`);
  }

  return logicChecks;
};

// Get AI prompt context from config
export const getAIContext = (config, userCode, userQuestion) => {
  if (!config) return '';
  
  return {
    projectTitle: config.title,
    projectDescription: config.description,
    expectedCode: config.expectedCode,
    userCode: userCode || '',
    userQuestion: userQuestion,
    aiPrompts: config.aiPrompts || {}
  };
}; 