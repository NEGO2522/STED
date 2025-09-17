import React, { useEffect, useState } from 'react';
import { ref, get, set } from 'firebase/database';
import { db } from '../firebase';
import { useUser } from '@clerk/clerk-react';

// Accepts a render prop for full control of UI
function ProjectRecommender({ learnedConcepts, completedProjects = [], projectType = 'python', children, forceGenerate = false }) {
  const [recommendedProject, setRecommendedProject] = useState(null);
  const [allMatchingProjects, setAllMatchingProjects] = useState([]);
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingProject, setGeneratingProject] = useState(false);
  const { user } = useUser();

  // Generate new project using Gemini
  const generateProjectWithGemini = async (concepts) => {
    setGeneratingProject(true);
    try {
      // Convert concepts to array if needed
      let conceptsArray = Array.isArray(concepts) 
        ? concepts.map(c => c.concept || c)
        : Object.values(concepts || {}).map(c => c.concept || c);
      
      // Filter out any empty or invalid concepts
      conceptsArray = conceptsArray.filter(Boolean);
      
      // Select a random subset of concepts (between 5 and 6 concepts, or fewer if not enough available)
      const minConcepts = 5;
      const maxConcepts = 6;
      const availableConcepts = Math.min(conceptsArray.length, maxConcepts);
      const numConcepts = Math.max(minConcepts, Math.min(availableConcepts, minConcepts + Math.floor(Math.random() * (maxConcepts - minConcepts + 1))));
      
      // Shuffle and select random concepts
      const shuffled = [...conceptsArray].sort(() => 0.5 - Math.random());
      const selectedConcepts = shuffled.slice(0, numConcepts);
      
      const conceptsString = selectedConcepts.join(', ');
      console.log('Selected concepts for project:', conceptsString);

      const prompt = `Create a Python programming project for a student who has learned these concepts: ${conceptsString}

Please generate a project in this EXACT JSON structure:
{
  "Concept": "comma-separated list of concepts used",
  "aiPrompts": {
    "contextInstructions": "You are a helpful Python programming tutor working on [project name]. Give small, chat-like responses (2-3 sentences max). Be encouraging and helpful. Don't provide complete code solutions - give hints and syntax examples instead.",
    "fallbackHint": "💡 **Hint**: Take it step by step! Break down your problem into smaller parts. What's the first thing you need to do?",
    "welcomeMessage": "Hi! I'm here to help you with your **[Project Name]** project. What would you like help with?"
  },
  "description": "Brief description of what the project does",
  "expectedCode": "Complete working Python code solution",
  "id": "generated_project_${Date.now()}",
  "tasks": {
    "task1": {
      "subtasks": ["step 1", "step 2", "step 3", "step 4", "step 5"],
      "title": "Task 1 Title"
    },
    "task2": {
      "subtasks": ["step 1", "step 2", "step 3", "step 4", "step 5"],
      "title": "Task 2 Title"
    }
  },
  "terminalChecks": {
    "check1": {
      "failureMessage": "❌ Feature not working",
      "keywords": ["keyword1", "keyword2"],
      "successMessage": "✅ Feature is working"
    }
  },
  "title": "Project Title",
  "validationRules": {
    "requiredComponents": ["def function1()", "variable = []"],
    "requiredFunctionCalls": ["function1()"],
    "requiredLogic": ["if condition:", "for loop:", "while loop:"]
  }
}

IMPORTANT INSTRUCTIONS:
1. Project must be on a RANDOM topic (see examples below)
2. NEVER create a recipe or food-related project
3. AVOID repeating the same topic category in consecutive projects
4. Be CREATIVE and UNPREDICTABLE with project ideas
5. Use ONLY these concepts: ${conceptsString}
6. Include 3-5 tasks, each with 3-5 subtasks
7. Make it challenging but achievable
8. Include proper validation rules and terminal checks
9. Use emojis in messages for engagement
10. Return ONLY valid JSON, no additional text

REQUIRED: Choose a RANDOM category from this list for each new project:
[1] Finance/Banking (e.g., expense tracker, budget planner, investment calculator)
[2] Productivity (e.g., to-do list, habit tracker, time management tool)
[3] Games (e.g., text adventure, puzzle, quiz)
[4] Education (e.g., flashcard app, language learning tool, math practice)
[5] Health/Fitness (e.g., workout tracker, water intake logger, step counter)
[6] Utilities (e.g., file organizer, password generator, unit converter)
[7] Social (e.g., contact manager, event planner, group organizer)
[8] Creative (e.g., story generator, art project, music player)

PROHIBITED TOPICS:
- Recipe or food-related applications
- Gradebooks or student records
- School management systems
- Any topic used in recent projects

EXAMPLE PROJECT IDEAS (for inspiration only):
- Personal finance dashboard with expense categorization
- Text-based adventure game with multiple endings
- Workout routine generator with progress tracking
- Password manager with encryption
- Weather forecast application with alerts
- Task automation script for file management
- Interactive quiz game with score tracking
- Contact management system with search and filters
- Unit conversion calculator with history
- Simple drawing application with save/load functionality`;

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!generatedText) {
        throw new Error('No response from Gemini');
      }

      // Extract JSON from response (remove markdown formatting if present)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const projectData = JSON.parse(jsonMatch[0]);
      
      // Add to current projects list
      const newProjects = [...allMatchingProjects, projectData];
      setAllMatchingProjects(newProjects);
      setRecommendedProject(projectData);
      setCurrentProjectIndex(newProjects.length - 1);
      
      return projectData;
    } catch (error) {
      console.error('Error generating project:', error);
      setError('Failed to generate new project. Please try again.');
      return null;
    } finally {
      setGeneratingProject(false);
    }
  };

  // Function to get next project from the list or generate new one
  const getNextProject = async (forceNew = false) => {
    if (allMatchingProjects.length === 0) return;
    
    // If forceNew is true, generate a new project with Gemini
    if (forceNew) {
      const newProject = await generateProjectWithGemini(learnedConcepts);
      if (newProject) {
        setRecommendedProject(newProject);
      }
      return;
    }
    
    const nextIndex = (currentProjectIndex + 1) % allMatchingProjects.length;
    
    // If we've cycled through all existing projects, generate a new one
    if (nextIndex === 0 && allMatchingProjects.length > 0) {
      await generateProjectWithGemini(learnedConcepts);
    } else {
      setCurrentProjectIndex(nextIndex);
      setRecommendedProject(allMatchingProjects[nextIndex]);
    }
  };

  // Save project to Firebase when student starts it
  const saveProjectToFirebase = async (project) => {
    if (!project || !user) return false;
    
    try {
      const projectPath = projectType === 'pandas' ? 'PandasProject' : 'PythonProject';
      const projectRef = ref(db, `${projectPath}/${project.id}`);
      await set(projectRef, project);
      return true;
    } catch (error) {
      console.error('Error saving project to Firebase:', error);
      return false;
    }
  };

  useEffect(() => {
    async function fetchAndRecommend() {
      setLoading(true);
      setError('');
      setRecommendedProject(null);
      setAllMatchingProjects([]);
      setCurrentProjectIndex(0);
      
      try {
        // Fetch all projects from Firebase based on project type
        const projectPath = projectType === 'pandas' ? 'PandasProject' : 'PythonProject';
        const projectsRef = ref(db, projectPath);
        const snapshot = await get(projectsRef);
        
        if (!snapshot.exists()) {
          setError('No projects found.');
          setLoading(false);
          return;
        }
        
        const projects = snapshot.val();
        // console.log(`Found ${projectType} projects:`, projects);
        
        // Prepare learned concepts as a Set for fast lookup
        let learnedSet = new Set();
        // console.log('Raw learnedConcepts:', learnedConcepts);
        
        if (Array.isArray(learnedConcepts)) {
          learnedSet = new Set(
            learnedConcepts.map(c => {
              const concept = c.concept || c;
              return typeof concept === 'string' ? concept.toLowerCase().trim() : '';
            }).filter(Boolean)
          );
        } else if (typeof learnedConcepts === 'object' && learnedConcepts !== null) {
          learnedSet = new Set(
            Object.values(learnedConcepts).map(c => {
              const concept = c.concept || c;
              return typeof concept === 'string' ? concept.toLowerCase().trim() : '';
            }).filter(Boolean)
          );
        }
        
        // console.log('Learned concepts:', Array.from(learnedSet));
        // console.log('Total learned concepts:', learnedSet.size);
        
        // Find all projects where all required concepts are learned - make it more flexible
        const matchingProjects = [];
        Object.values(projects).forEach(project => {
          if (!project.Concept) {
            // console.log('Project has no Concept field:', project.title || project.id);
            return;
          }
          
          // Split concepts by comma and trim
          const required = project.Concept.split(',').map(s => s.toLowerCase().trim());
          // console.log('Required concepts for project:', project.title || project.id, required);
          
          // Check if all required concepts are learned - make it more flexible
          let learnedCount = 0;
          const totalRequired = required.length;
          
          required.forEach(concept => {
            if (learnedSet.has(concept)) {
              learnedCount++;
              // console.log(`✓ Concept "${concept}" is learned for project "${project.title || project.id}"`);
            } else {
              // console.log(`✗ Concept "${concept}" not learned for project "${project.title || project.id}"`);
            }
          });
          
          // For now, let's show projects if at least one concept is learned (more lenient)
          if (learnedCount > 0) {
            // console.log(`Project "${project.title || project.id}" matches - ${learnedCount}/${totalRequired} concepts learned`);
            matchingProjects.push(project);
          } else {
            // console.log(`Project "${project.title || project.id}" skipped - no concepts learned (0/${totalRequired})`);
          }
        });
        
        // console.log('Matching projects found:', matchingProjects.length);
        
        // If no projects match by concepts, let's show all projects for debugging
        if (matchingProjects.length === 0 && learnedSet.size > 0) {
          // console.log('No projects match by concepts, showing all projects for debugging');
          Object.values(projects).forEach(project => {
            if (project.Concept) {
              matchingProjects.push(project);
            }
          });
        }
        
        // If still no projects and no learned concepts, show all projects
        if (matchingProjects.length === 0 && learnedSet.size === 0) {
          // console.log('No concepts learned yet, showing all projects');
          Object.values(projects).forEach(project => {
            if (project.Concept) {
            matchingProjects.push(project);
          }
        });
        }
        
        // Filter out completed projects
        const completedProjectKeys = new Set(completedProjects.map(p => p.projectKey || p.key || p.title));
        
        const availableProjects = matchingProjects.filter(project => {
          // Check if this project has been completed - try multiple possible key formats
          const projectId = project.id || project.title;
          const projectTitle = project.title;
          
          // Try different variations of the project key
          const possibleKeys = [
            projectId,
            projectId?.toLowerCase(),
            projectId?.toUpperCase(),
            projectTitle,
            projectTitle?.toLowerCase(),
            projectTitle?.toUpperCase(),
            // Handle the case where project.id is "project1" but saved as "Project1"
            projectId?.replace(/^project/, 'Project'),
            // Handle the case where project.id is "project1" but saved as "Project1"
            projectId?.replace(/^Project/, 'project')
          ];
          
          const isCompleted = possibleKeys.some(key => completedProjectKeys.has(key));
          
          if (isCompleted) {
            // console.log(`Project "${project.title}" already completed`);
          }
          
          return !isCompleted;
        });
        
        // console.log('Available projects:', availableProjects.length);
        
        if (availableProjects.length > 0) {
          setAllMatchingProjects(availableProjects);
          setRecommendedProject(availableProjects[0]);
          setCurrentProjectIndex(0);
        } else {
          setRecommendedProject(null);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to fetch projects.');
      }
      setLoading(false);
    }
    
    if (user) {
      fetchAndRecommend();
    }
  }, [learnedConcepts, user, completedProjects, projectType]);

  // Handle initial load with forceGenerate
  useEffect(() => {
    if (forceGenerate && allMatchingProjects.length > 0) {
      getNextProject(true);
    }
  }, [forceGenerate, allMatchingProjects.length]);

  // Expose the getNextProject function to children
  const api = {
    getNextProject,
    generateProjectWithGemini,
    recommendedProject,
    loading,
    error,
    generatingProject
  };

  // Render prop for full UI control
  if (typeof children === 'function') {
    return children({ 
      ...api,
      hasMultipleProjects: allMatchingProjects.length > 1,
      currentProjectIndex,
      totalProjects: allMatchingProjects.length,
      saveProjectToFirebase,
      generatingProject
    });
  }

  // Default fallback UI (not used in overlay integration)
  if (loading) return <div>Loading project recommendation...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!recommendedProject) return <div>No suitable project found for your learned concepts yet.</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-4">
      <h2 className="text-xl font-bold mb-2 text-purple-700">Recommended Project</h2>
      <div className="text-lg font-semibold mb-1">{recommendedProject.title}</div>
      <div className="mb-2 text-gray-700">{recommendedProject.description}</div>
      <div className="text-sm text-gray-500">Required Concepts: {recommendedProject.Concept}</div>
    </div>
  );
}

export default ProjectRecommender; 