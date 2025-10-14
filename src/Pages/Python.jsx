import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDatabase, ref, get, update, onValue, remove, set } from "firebase/database";
import { db } from "../firebase";
import ConceptLearned from "../components/ConceptLearned";
import Learned from "../assets/learned.png";
import Applied from "../assets/applied.png";
import Project from "../assets/project.png";
import ProjectRecommender from '../components/ProjectRecommender';
import SeeAnother from "../assets/SeeAnother.png";
import { getProjectConfig } from '../PythonProject/projectConfig';
import Assignment from '../components/Assignment';
import AssignmentIcon from '../assets/Assignment.png';

function Python() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, user } = useUser();
  const [userData, setUserData] = useState({
    level: "",
    xp: 0,
    tasksCompleted: 0,
    pythonSkill: 0,
    sqlSkill: 0,
    mlSkill: 0,   
  });
  const [completedProjects, setCompletedProjects] = useState([]);
  const [showProjectDetailsOverlay, setShowProjectDetailsOverlay] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [projectData, setProjectData] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [conceptStats, setConceptStats] = useState({ learned: 0, applied: 0, total: 0 });
  const [showProjectOverlay, setShowProjectOverlay] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProjectTitle, setCurrentProjectTitle] = useState('');
  const [copiedProjectId, setCopiedProjectId] = useState(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showCustomProjectOverlay, setShowCustomProjectOverlay] = useState(false);
  const [selectedCustomConcepts, setSelectedCustomConcepts] = useState([]);
  const [customProjectTheme, setCustomProjectTheme] = useState("");
  const [showConceptPicker, setShowConceptPicker] = useState(false);
  const [conceptPickerChecked, setConceptPickerChecked] = useState({});
  const [shownProjects, setShownProjects] = useState([]);
  const [nextProject, setNextProject] = useState(null);
  const [generatingCustomProject, setGeneratingCustomProject] = useState(false);
  const [isGeneratingProject, setIsGeneratingProject] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate("/");
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    if (!user) return;
    // Real-time listener for user data
    const userRef = ref(db, 'users/' + user.id);
    const unsubscribeUser = onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const userDataFromDb = snapshot.val();
            // Ensure python object exists with defaults (mirrors Pandas page behavior)
            if (!userDataFromDb.python) {
              userDataFromDb.python = {};
            }
            if (userDataFromDb.python.PythonProjectStarted === undefined) {
              update(ref(db, 'users/' + user.id + '/python'), { PythonProjectStarted: false });
              userDataFromDb.python.PythonProjectStarted = false;
            }
            setUserData(userDataFromDb);
          } else {
            // Initialize minimal structure if user node doesn't exist
            const initialUserData = { python: { PythonProjectStarted: false } };
            update(ref(db, 'users/' + user.id), initialUserData);
            setUserData(initialUserData);
          }
          setIsLoading(false);
        });
    // Real-time listener for completed projects
    const completedProjectsRef = ref(db, 'users/' + user.id + '/python/PythonCompletedProjects');
    const unsubscribeProjects = onValue(completedProjectsRef, (snapshot) => {
      if (snapshot.exists()) {
        const projects = snapshot.val();
        const projectsArray = Object.entries(projects).map(([key, project]) => ({
          key,
          ...project
        }));
        setCompletedProjects(projectsArray);
      } else {
        setCompletedProjects([]);
      }
    });
    return () => {
      unsubscribeUser();
      unsubscribeProjects();
    };
  }, [user]);

  useEffect(() => {
    const loadProject = async () => {
      if (userData.python && userData.python.PythonCurrentProject) {
        setProjectLoading(true);
        setProjectError("");
        try {
          const config = await getProjectConfig(userData.python.PythonCurrentProject);
          if (config) {
            setProjectData(config);
          } else {
            setProjectError("Project not found.");
            setProjectData(null);
          }
        } catch (err) {
          setProjectError("Failed to fetch project: " + (err?.message || String(err)));
          setProjectData(null);
        } finally {
          setProjectLoading(false);
        }
      } else {
        setProjectData(null);
        setProjectError("");
      }
    };
    loadProject();
  }, [userData.python]);

  const fetchConceptStats = async () => {
      if (!userData?.python) return;
    
      // Fetch all concepts
      const allConceptsRef = ref(db, 'PythonProject/AllConcepts/category');
      const allConceptsSnap = await get(allConceptsRef);
      let totalConcepts = 0;
      if (allConceptsSnap.exists()) {
        const data = allConceptsSnap.val();
        totalConcepts = [
          ...Object.values(data.basic || {}),
          ...Object.values(data.intermediate || {}),
          ...Object.values(data.advanced || {}),
        ].length;
      }
    
      // Get learned concepts
    let learnedConcepts = userData.python?.learnedConcepts || [];
    if (typeof learnedConcepts === 'object' && !Array.isArray(learnedConcepts)) {
      learnedConcepts = Object.values(learnedConcepts);
    }
      const learned = learnedConcepts.length;
    
    // Analyze concepts used in completed projects
    const conceptsUsedInProjects = new Set();
    
    // Extract concepts from completed projects
    completedProjects.forEach(project => {
      if (project.conceptUsed) {
        const projectConcepts = project.conceptUsed.split(', ').map(concept => concept.trim());
        projectConcepts.forEach(concept => {
          if (concept) {
            conceptsUsedInProjects.add(concept);
          }
        });
      }
    });
    
    // Count how many learned concepts have been used in projects
    const applied = learnedConcepts.filter(concept => {
      // Check if the concept name is in the concepts used in projects
      return conceptsUsedInProjects.has(concept.concept || concept);
    }).length;
    
      setConceptStats({ learned, applied, total: totalConcepts });
  };

  useEffect(() => {
    fetchConceptStats();
  }, [userData, completedProjects]);

  const toggleProgress = () => {
    setShowProgress(!showProgress);
  };

  const handleStartProject = async () => {
    if (!user) return;

    try {
      const userRef = ref(db, 'users/' + user.id);
      const updates = {
        'python/PythonProjectStarted': true
      };
      await update(userRef, updates);

      // Update local state
      setUserData(prev => ({
        ...prev,
        python: {
          ...prev.python,
          PythonProjectStarted: true
        }
      }));

      // Navigate to project page
      navigate('/python/project');
    } catch (err) {
      console.error('Failed to update project status:', err);
      // navigate even if update fails
      navigate('/python/project');
    }
  };

  // Handler for the main "Next Project" button (with 3s delay)
  const handleNextProjectClick = async () => {
    setIsGeneratingProject(true);
    
    // Show loading for 3 seconds for the main button
    setTimeout(async () => {
      try {
      // Fetch all available projects from Firebase
      const projectsRef = ref(db, 'PythonProject');
      const snapshot = await get(projectsRef);
      
      if (snapshot.exists()) {
        // Get user's completed projects with their details
        let userCompletedProjects = [];
        if (user) {
          const userRef = ref(db, `users/${user.id}/python/PythonCompletedProjects`);
          const userSnapshot = await get(userRef);
          if (userSnapshot.exists()) {
            userCompletedProjects = Object.entries(userSnapshot.val() || {}).map(([id, data]) => ({
              id,
              projectKey: data.projectKey || id,
              projectTitle: data.projectTitle || ''
            }));
          }
        }
        
        // Get all projects and filter out completed ones
        let allProjects = Object.entries(snapshot.val())
          .filter(([id]) => id !== 'AllConcepts') // Filter out non-project entries
          .map(([id, project]) => ({
            id,
            title: project.title || project.id,
            ...project
          }))
          // Filter out completed projects by checking both ID and title
          .filter(project => {
            return !userCompletedProjects.some(completed => 
              completed.id === project.id || 
              completed.projectKey === project.id ||
              completed.projectTitle === project.title
            );
          });

        if (allProjects.length === 0) {
          console.log('No new projects available. You have completed all projects!');
          return;
        }

        // If no projects have been shown yet, start with a random one
        if (shownProjects.length === 0) {
          const randomIndex = Math.floor(Math.random() * allProjects.length);
          const selectedProject = allProjects[randomIndex];
          setShownProjects([selectedProject.id]);
          setNextProject(selectedProject);
          setShowProjectOverlay(true);
          return;
        }

        // Find the index of the last shown project in allProjects
        const lastShownProjectId = shownProjects[shownProjects.length - 1];
        const lastShownIndex = allProjects.findIndex(p => p.id === lastShownProjectId);
        
        // Calculate the next project index (loop back to start if at the end)
        const nextIndex = (lastShownIndex + 1) % allProjects.length;
        const selectedProject = allProjects[nextIndex];
        
        // Update shown projects
        setShownProjects(prev => [...prev, selectedProject.id]);
        
        // Add to shown projects
        setShownProjects(prev => [...prev, selectedProject.id]);
        setNextProject(selectedProject);
        setShowProjectOverlay(true);
      }
      } catch (err) {
        console.error('Error loading next project:', err);
        // Fallback to ProjectRecommender on error
        setNextProject(null);
        setShowProjectOverlay(true);
      } finally {
        setIsGeneratingProject(false);
      }
    }, 3000); // 5 second delay
  };

  // Handler for the overlay's "Next" button (no delay)
  const handleOverlayNextClick = async () => {
    try {
      // Fetch all available projects from Firebase
      const projectsRef = ref(db, 'PythonProject');
      const snapshot = await get(projectsRef);
      
      if (snapshot.exists()) {
        // Get user's completed projects with their details
        let userCompletedProjects = [];
        if (user) {
          const userRef = ref(db, `users/${user.id}/python/PythonCompletedProjects`);
          const userSnapshot = await get(userRef);
          if (userSnapshot.exists()) {
            userCompletedProjects = Object.entries(userSnapshot.val() || {}).map(([id, data]) => ({
              id,
              projectKey: data.projectKey || id,
              projectTitle: data.projectTitle || ''
            }));
          }
        }
        
        // Get all projects and filter out completed ones
        let allProjects = Object.entries(snapshot.val())
          .filter(([id]) => id !== 'AllConcepts') // Filter out non-project entries
          .map(([id, project]) => ({
            id,
            title: project.title || project.id,
            ...project
          }))
          // Filter out completed projects by checking both ID and title
          .filter(project => {
            return !userCompletedProjects.some(completed => 
              completed.id === project.id || 
              completed.projectKey === project.id ||
              completed.projectTitle === project.title
            );
          });

        if (allProjects.length === 0) {
          console.log('No new projects available. You have completed all projects!');
          return;
        }

        // If no projects have been shown yet, start with a random one
        if (shownProjects.length === 0) {
          const randomIndex = Math.floor(Math.random() * allProjects.length);
          const selectedProject = allProjects[randomIndex];
          setShownProjects([selectedProject.id]);
          setNextProject(selectedProject);
          setShowProjectOverlay(true);
          return;
        }

        // Find the index of the last shown project in allProjects
        const lastShownProjectId = shownProjects[shownProjects.length - 1];
        const lastShownIndex = allProjects.findIndex(p => p.id === lastShownProjectId);
        
        // Calculate the next project index (loop back to start if at the end)
        const nextIndex = (lastShownIndex + 1) % allProjects.length;
        const selectedProject = allProjects[nextIndex];
        
        // Update shown projects
        setShownProjects(prev => [...prev, selectedProject.id]);
        setNextProject(selectedProject);
        setShowProjectOverlay(true);
      }
    } catch (err) {
      console.error('Error loading next project in overlay:', err);
      setNextProject(null);
      setShowProjectOverlay(true);
    }
  };

  const handleCustomProjectClick = () => {
    setShowCustomProjectOverlay(true);
    // Reset states
    setSelectedCustomConcepts([]);
    setCustomProjectTheme("");
    setConceptPickerChecked({});
  };

  const handleCloseProjectOverlay = () => {
    setShowProjectOverlay(false);
  };

  const generateCustomProjectWithGemini = async (selectedConcepts, theme) => {
    setGeneratingCustomProject(true);
    try {
      const conceptsString = selectedConcepts.join(', ');
      console.log('Generating custom project with concepts:', conceptsString, 'and theme:', theme);

      const prompt = `Create a Python programming project for a student who has learned these concepts: ${conceptsString}

Project Theme: ${theme}

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
  "id": "custom_project_${Date.now()}",
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
1. Project MUST be based on the theme: "${theme}"
2. Use ONLY these concepts: ${conceptsString}
3. Include 3-5 tasks, each with 3-5 subtasks
4. Make it challenging but achievable for a student who knows these concepts
5. Include proper validation rules and terminal checks
6. Use emojis in messages for engagement
7. The project should be practical and useful within the theme context
8. Return ONLY valid JSON, no additional text
9. Make sure the project title reflects the theme and is engaging
10. Ensure the description clearly explains what the student will build`;

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        const msg = data?.error?.message || 'Gemini API request failed';
        throw new Error(msg);
      }

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
      
      // Return the generated project
      return projectData;
    } catch (error) {
      console.error('Error generating custom project:', error);
      throw new Error('Failed to generate custom project. Please try again.');
    } finally {
      setGeneratingCustomProject(false);
    }
  };

  const handleCreateCustomProject = async () => {
    if (selectedCustomConcepts.length === 0 || !customProjectTheme.trim()) {
      return;
    }

    try {
      // Generate the project using Gemini
      const customProject = await generateCustomProjectWithGemini(
        selectedCustomConcepts,
        customProjectTheme.trim()
      );

      if (customProject) {
        // Close the custom project overlay
        setShowCustomProjectOverlay(false);
        
        // Set the generated project as nextProject and show the project overlay
        setNextProject(customProject);
        setShowProjectOverlay(true);
      }
    } catch (error) {
      console.error('Error creating custom project:', error);
      alert('Failed to create custom project. Please try again.');
    }
  };

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setShowProjectDetailsOverlay(true);
  };

  const handleCloseProjectDetails = () => {
    setShowProjectDetailsOverlay(false);
    setSelectedProject(null);
  };

  // Add handler for ending project
  const handleEndProject = async () => {
    if (!user) return;
    
    const userRef = ref(db, 'users/' + user.id);
    await update(userRef, { 
      'python/PythonProjectStarted': false
    });
    
    // Update local state
    setUserData(prev => ({
      ...prev,
      python: {
        ...prev.python,
        PythonProjectStarted: false
      }
    }));
  };

  useEffect(() => {
    // Fetch project title for the current project
    const fetchProjectTitle = async () => {
      if (userData.python?.PythonCurrentProject) {
        const config = await getProjectConfig(userData.python.PythonCurrentProject);
        setCurrentProjectTitle(config?.title || userData.python.PythonCurrentProject);
      } else {
        setCurrentProjectTitle('');
      }
    };
    fetchProjectTitle();
  }, [userData.python?.PythonCurrentProject]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-slate-600 text-base">
            Loading your dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pt-20">
      {/* Professional top accent line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-purple-600" />

      {/* Navbar */}
      <div className="sticky top-1 z-50 bg-white shadow-sm">
        <Navbar
          onProgressClick={toggleProgress}
          showProgress={showProgress}
          hideProgressButton={true}
        />
      </div>

      {/* Project Continue/End Box */}
      {userData.python?.PythonProjectStarted && (
        <div className="bg-yellow-50/80 backdrop-blur-xl border border-yellow-300/60 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between mb-8 mt-6 max-w-3xl mx-auto shadow-lg ring-1 ring-white/40">
          <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
            <span className="text-lg font-semibold text-yellow-800">Current Project:</span>
            <span className="text-xl font-bold text-yellow-900">{currentProjectTitle || 'Untitled Project'}</span>
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <button
              className="bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-semibold px-6 py-2 rounded-xl shadow-md transition-all"
              onClick={() => navigate('/python/project')}
            >
              Continue Project
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-semibold px-6 py-2 rounded-xl shadow-md transition-all"
              onClick={handleEndProject}
            >
              End Project
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="w-full relative px-4 lg:px-8 pb-12 max-w-7xl mx-auto">
          {/* Header Section */}
           
              <div className="text-left mt-6">
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-slate-800 via-purple-800 to-indigo-700 bg-clip-text text-transparent tracking-tight">Python</h1>
            </div>
          

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {/* Projects Completed Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-xl shadow-md p-6 ring-1 ring-slate-200 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Projects Completed</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">
                    {completedProjects.length}
                    </h3>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-3 rounded-full ring-1 ring-purple-100">
                    <span className=""><img className="w-7" src={Project} alt="" /></span>
                  </div>
                </div>
              </motion.div>

            

                        {/* Concepts Learned Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-xl shadow-md p-6 ring-1 ring-slate-200 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Concepts Learned</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">
                      {conceptStats.learned} / {conceptStats.total}
                    </h3>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-full ring-1 ring-yellow-100">
                    <span className="text-2xl"><img className="w-7" src={Learned} alt="" /></span>
                  </div>
                </div>
              </motion.div>

            {/* Concepts Applied Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-all ring-1 ring-slate-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Concepts Applied</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">
                      {conceptStats.applied} / {conceptStats.learned}
                    </h3>
                  </div>
                  <div className="bg-green-50 p-3 rounded-full ring-1 ring-green-100">
                    <span className="text-2xl"><img className="w-7" src={Applied} alt="" /></span>
                  </div>
                </div>
              </motion.div>

            </div>

          {/* Assignment Section */}
         

          {/* Main Content Grid */}
          <div className="flex flex-col lg:flex-row gap-6 mt-13 items-start">
            {/* Learning Resources */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/90 backdrop-blur-sm w-full lg:w-2/3 rounded-xl shadow-md p-6 ring-1 ring-slate-200"
            >
              <ConceptLearned completedProjects={completedProjects} />
            </motion.div>

            {/* Concept Status Box */}
            <motion.div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-6 w-150 h-76 flex flex-col justify-between ring-1 ring-slate-200">
              <div>
              <p className="text-sm text-slate-600">Concepts Status</p>
              {(() => {
                  let learnedConcepts = userData.python?.learnedConcepts || [];
                  if (typeof learnedConcepts === 'object' && !Array.isArray(learnedConcepts)) {
                    learnedConcepts = Object.values(learnedConcepts);
                  }
                  const totalLearned = learnedConcepts.length;
                  const statusCounts = learnedConcepts.reduce((acc, c) => {
                    if (c.status === 'Clear') acc.Clear++;
                    else if (c.status === 'Unclear') acc.Unclear++;
                    else if (c.status === 'confused') acc.confused++;
                    return acc;
                  }, { Clear: 0, Unclear: 0, confused: 0 });
                  return (
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-2 mt-3 border-b border-slate-200 pb-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                        <span className="text-slate-800 font-normal">Clear</span>
                        <span className="ml-auto text-slate-800 px-2 py-0.5 rounded-full text-lg font-semibold">{statusCounts.Clear} / {totalLearned}</span>
                      </div>
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                        <span className="text-slate-800 font-normal">Unclear</span>
                        <span className="ml-auto text-slate-800 px-2 py-0.5 rounded-full text-lg font-semibold">{statusCounts.Unclear} / {totalLearned}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                        <span className="text-slate-800 font-normal">Confused</span>
                        <span className="ml-auto text-slate-800 px-2 py-0.5 rounded-full text-lg font-semibold">{statusCounts.confused} / {totalLearned}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>

          {/* --- Project/Assignment Grid --- */}
          <h2 className="text-2xl text-left font-bold text-slate-800 mb-6 mt-10 tracking-tight">Apply learning</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

             {/* Assignment Box */}
             <div className="w-full">
              <Assignment learnedConcepts={userData.python?.learnedConcepts || []} />
            </div>
            {/* Project Box */}
            <motion.div className="bg-gradient-to-br from-[#C642F5] via-[#A633D9] to-[#8C1EB6] w-full h-76 rounded-2xl shadow-2xl p-6 lg:sticky lg:top-28 ring-1 ring-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">
                Project
              </h2>
              {userData.python && userData.python.PythonCurrentProject ? (
                projectLoading ? (
                  <div className="text-white">Loading project...</div>
                ) : projectError ? (
                  <div className="text-red-300">{projectError}</div>
                ) : projectData ? (
                  <>
                    <div className="flex justify-center mt-10">
                    <div className="space-y-9 w-100">
                      <button
                        onClick={handleNextProjectClick}
                        disabled={isGeneratingProject}
                        className={`w-full inline-flex items-center justify-center gap-2 ${
                          isGeneratingProject ? 'bg-purple-700' : 'bg-purple-900 hover:bg-purple-700 active:scale-[0.98]'
                        } text-white font-semibold px-4 py-3 rounded-xl shadow-md transition-all ring-1 ring-white/10`}
                      >
                        {isGeneratingProject ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                          </>
                        ) : (
                          <>
                            🚀 Next Project
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={handleCustomProjectClick}
                        className="w-full inline-flex items-center justify-center gap-2 text-white cursor-pointer font-semibold px-4 py-3 rounded-xl shadow-md transition-all border border-white/30 hover:bg-white/10 active:scale-[0.98]"
                      >
                        ⚙️ Custom Project
                        
                      </button>
                    </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center mt-10">
                    <div className="space-y-9 w-100">
                      <button
                        onClick={handleNextProjectClick}
                        className="w-full inline-flex items-center cursor-pointer justify-center gap-2 bg-purple-900 text-white hover:bg-purple-700 font-semibold px-4 py-3 rounded-xl shadow-md transition-colors ring-1 ring-white/10"
                      >
                        🚀 Start New Project
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                      
                      <button
                        onClick={handleCustomProjectClick}
                        className="w-full inline-flex items-center justify-center gap-2 text-white cursor-pointer font-semibold px-4 py-3 rounded-lg shadow-md transition-colors border border-white border-opacity-30"
                      >
                        ⚙️ Custom Project
                        
                      </button>
                    </div>
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className="flex justify-center mt-10">
                  <div className="space-y-9 w-100">
                    <button
                      onClick={handleNextProjectClick}
                      className="w-full inline-flex items-center cursor-pointer justify-center gap-2 bg-purple-900 text-white hover:bg-purple-700 active:scale-[0.98] font-semibold px-4 py-3 rounded-xl shadow-md transition-all ring-1 ring-white/10"
                    >
                      ✨ Start New Project
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                    
                    <button
                      disabled
                      className="w-full inline-flex items-center justify-center gap-2 text-white/50 font-semibold px-4 py-3 rounded-xl shadow-md transition-colors border border-white/20 bg-gray-400/20 cursor-not-allowed"
                    >
                      🔒 Custom Project
                    </button>
                  </div>
                  </div>
                </>
              )}
            </motion.div>
           
          </div>

            {/* Project Details Overlay */}
            <AnimatePresence>
              {showProjectOverlay && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xl"
                  onClick={handleCloseProjectOverlay}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden ring-1 ring-slate-200/60"
                    onClick={(e) => e.stopPropagation()}
                  >

                    <div className="p-12">
                      {nextProject ? (
                        <>
                          <div className="mb-10">
                            <div className="text-center mb-8 relative">
                              {/* Next Project Icon */}
                              <div className="absolute top-0 right-0 z-10">
                                <div className="group">
                                  <button
                                    onClick={handleOverlayNextClick}
                                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-white/80 hover:bg-purple-50 text-purple-600 hover:text-purple-700 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                                  >
                                    <img 
                                      className="w-5 h-5" 
                                      src={SeeAnother} 
                                      alt="" 
                                    />
                                    <span className="text-sm font-semibold">Next</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 ml-0.5 -mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              
                              <h2 className="text-4xl font-bold mb-4 text-purple-700 bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                                {nextProject.title}
                              </h2>
                              <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-purple-700 mx-auto rounded-full"></div>
                            </div>
                            
                            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 mb-8 border border-purple-100">
                              <p className="text-gray-700 text-lg leading-relaxed mb-6">{nextProject.description}</p>
                              
                              <div className="bg-white rounded-xl p-6 border border-purple-200">
                                <h3 className="text-lg font-semibold text-purple-700 mb-3 flex items-center gap-2">
                                  <span className="text-purple-600">📚</span>
                                  Required Concepts
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                  {(nextProject.Concept || nextProject.conceptsUsed || 'Python Basics').split(', ').map((concept, index) => (
                                    <span
                                      key={index}
                                      className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium border border-purple-200"
                                    >
                                      {concept.trim()}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-4">
                           <button
                            onClick={async () => {
                              if (!user) return;

                              try {
                                // Save custom project to Firebase if it's a custom-generated project
                                if (nextProject.id && nextProject.id.startsWith('custom_project_')) {
                                  const projectRef = ref(db, 'PythonProject');
                                  const customProjectRef = child(projectRef, nextProject.id); // ✅ preserves case
                                  await set(customProjectRef, nextProject);
                                  console.log('Custom project saved to Firebase');
                                }

                                // Set this project as the user's current project in Firebase
                                const userRef = ref(db, 'users/' + user.id);
                                let projectKey = nextProject.id;
                                await update(userRef, {
                                  'python/PythonCurrentProject': projectKey,
                                  'python/PythonProjectStarted': true
                                });

                                setUserData(prev => ({
                                  ...prev,
                                  python: {
                                    ...prev.python,
                                    PythonCurrentProject: projectKey,
                                    PythonProjectStarted: true
                                  }
                                }));

                                setShowProjectOverlay(false);
                                navigate('/python/project');
                              } catch (error) {
                                console.error('Error saving project to Firebase:', error);
                                alert('Failed to save project. Please try again.');
                              }
                            }}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:scale-[0.98] text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl"
                          >
                            🚀 Start Project
                          </button>

                            <button
                              onClick={handleCloseProjectOverlay}
                              className="px-8 py-4 border-2 border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-[0.98] hover:border-slate-400 rounded-xl transition-all duration-300 font-semibold text-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <ProjectRecommender learnedConcepts={userData.python?.learnedConcepts} completedProjects={completedProjects}>
                        {({ recommendedProject, loading, error, getNextProject, hasMultipleProjects, currentProjectIndex, totalProjects, saveProjectToFirebase, generatingProject }) => {
                          if (loading) return (
                            <div className="flex items-center justify-center py-16">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                                <div className="text-xl text-gray-600">Loading project recommendation...</div>
                      </div>
                    </div>
                          );
                          if (error) return (
                            <div className="text-center py-16">
                              <div className="text-red-500 text-xl mb-4">⚠️</div>
                              <div className="text-red-500 text-lg">{error}</div>
                            </div>
                          );
                          if (!recommendedProject) return (
                            <div className="text-center py-16">
                              <div className="text-gray-500 text-xl mb-4">🔍</div>
                              <div className="text-gray-600 text-lg">No suitable project found for your learned concepts yet.</div>
                            </div>
                          );
                          return (
                            <>
                              <div className="mb-10">
                                <div className="text-center mb-8 relative">
                                  {/* See Another Link */}
                                  {hasMultipleProjects && (
                                    <div className="absolute top-0 right-0 z-10">
                                      <div className="group">
                                        <button
                                          onClick={getNextProject}
                                          className="text-purple-600 hover:text-purple-700 text-sm font-semibold transition-colors relative"
                                          disabled={generatingProject}
                                        >
                                          <img 
                                            className={`w-7 ${generatingProject ? 'opacity-50' : ''}`} 
                                            src={SeeAnother} 
                                            alt="Next project" 
                                          />
                                          {/* Hover Overlay */}
                                          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20">
                                            Next Project
                                            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                          </div>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <h2 className="text-4xl font-bold mb-4 text-purple-700 bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                                    {recommendedProject.title}
                                  </h2>
                                  <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-purple-700 mx-auto rounded-full"></div>
                                </div>
                                
                                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 mb-8 border border-purple-100">
                                  <p className="text-gray-700 text-lg leading-relaxed mb-6">{recommendedProject.description}</p>
                                  
                                  <div className="bg-white rounded-xl p-6 border border-purple-200">
                                    <h3 className="text-lg font-semibold text-purple-700 mb-3 flex items-center gap-2">
                                      <span className="text-purple-600">📚</span>
                                      Required Concepts
                        </h3>
                                    <div className="flex flex-wrap gap-2">
                                      {recommendedProject.Concept.split(', ').map((concept, index) => (
                                        <span
                              key={index}
                                          className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium border border-purple-200"
                            >
                                          {concept.trim()}
                                        </span>
                          ))}
                                    </div>
                                  </div>
                                </div>
                      </div>

                              <div className="flex gap-4"><button
                                  onClick={async () => {
                                    if (!user) return;
                                    
                                    // Save generated project to Firebase if it's a new Gemini-generated project
                                    if (recommendedProject.id && recommendedProject.id.startsWith('generated_project_')) {
                                      const saved = await saveProjectToFirebase(recommendedProject);
                                      if (!saved) {
                                        alert('Failed to save project. Please try again.');
                                        return;
                                      }
                                    }
                                    
                                    // Set this project as the user's current project in Firebase
                                    const userRef = ref(db, 'users/' + user.id);
                                    // Ensure project key starts with capital 'P'
                                    let projectKey = recommendedProject.id || recommendedProject.title;
                                    
                                    await update(userRef, {
                                      'python/PythonCurrentProject': projectKey,
                                      'python/PythonProjectStarted': true
                                    });
                                    setUserData(prev => ({
                                      ...prev,
                                      python: {
                                        ...prev.python,
                                        PythonCurrentProject: projectKey,
                                        PythonProjectStarted: true
                                      }
                                    }));
                                    setShowProjectOverlay(false);
                                    navigate('/python/project');
                                  }}
                                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                                  disabled={generatingProject}
                        >
                          {generatingProject ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              Generating...
                            </>
                          ) : (
                            <>🚀 Start Project</>
                          )}
                        </button>
                        <button
                          onClick={handleCloseProjectOverlay}
                                  className="px-8 py-4 border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 rounded-xl transition-all duration-300 font-semibold text-lg"
                        >
                          Cancel
                        </button>
                      </div>
                            </>
                          );
                        }}
                      </ProjectRecommender>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          
        </div>

      {/* Project History Section */}
      <div className="w-full relative px-4 lg:px-8 max-w-7xl mx-auto text-left mb-10">
        
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Project & Task History</h2>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-6 ring-1 ring-slate-200">
          {completedProjects.length === 0 ? (
            <div className="text-slate-500 italic">No completed projects or tasks yet.</div>
          ) : (
              <ul className="divide-y divide-slate-200">
              {completedProjects.map((project, idx) => (
                <li 
                  key={project.key} 
                  className="group flex flex-col md:flex-row gap-2 md:gap-6 py-4 cursor-pointer transition-all rounded-lg hover:bg-gray-50 hover:shadow-sm hover:translate-x-[2px]"
                  onClick={() => handleProjectClick(project)}
                >
                    <div className="flex-1">
                    <div className="text-2xl font-semibold text-slate-800 group-hover:text-purple-700 transition-colors">{project.projectTitle || project.key}</div>
                    <div className="text-slate-500 text-sm mt-2">Completed: {new Date(project.completedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex-none flex flex-col items-end gap-2 md:gap-3">
                    <span className="inline-block text-slate-700/80 px-3 py-1 text-lg group-hover:text-purple-700 transition-colors">Click to view details</span>
                    {project.publicUrl && (
                      <div className="flex gap-2 mt-2">
                        <button
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 active:scale-[0.98] text-xs font-semibold border border-purple-200 transition-all"
                          onClick={e => {
                            e.stopPropagation();
                            const url = project.publicUrl.replace('/public/python-project/', '/python-project/');
                            navigator.clipboard.writeText(window.location.origin + url);
                            setCopiedProjectId(project._projectKey);
                            setTimeout(() => setCopiedProjectId(null), 1500);
                          }}
                        >
                          {copiedProjectId === project._projectKey ? 'Copied!' : 'Share'}
                        </button>
                        <a
                          href={project.publicUrl.replace('/public/python-project/', '/python-project/')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 active:scale-[0.98] text-xs font-semibold border border-blue-200 transition-all"
                          style={{ fontWeight: 500 }}
                          onClick={e => e.stopPropagation()}
                        >
                          Preview
                        </a>
                      </div>
                    )}
                    </div>
                  </li>
                ))}
              </ul>
          )}
        </div>
      </div>

      {/* Project Details Overlay */}
      <AnimatePresence>
        {showProjectDetailsOverlay && selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xl"
            onClick={handleCloseProjectDetails}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] ring-1 ring-slate-200/60"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseProjectDetails}
                className="absolute top-6 right-8 text-slate-700 hover:text-purple-600 text-4xl font-bold z-10 transition-colors"
              >
                ×
              </button>
              
              <div className="p-8 overflow-y-auto max-h-[90vh]">
                {/* Project Header */}
                <div className="mb-8 border-b border-gray-200 pb-6">
                  <h2 className="text-3xl font-bold mb-6 text-purple-700">{selectedProject.projectTitle}</h2>
                  
                  {/* Concepts Used Section */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
                    <h3 className="text-lg font-semibold text-purple-700 mb-4 flex items-center gap-2">
                      <span className="text-purple-600">📚</span>
                      Concepts Used
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {selectedProject.conceptUsed ? 
                        selectedProject.conceptUsed.split(', ').map((concept, index) => (
                          <span
                            key={index}
                            className="inline-block bg-white text-purple-700 px-4 py-2 rounded-full text-sm font-medium border border-purple-300 shadow-sm hover:shadow-md transition-shadow"
                          >
                            {concept.trim()}
                          </span>
                        )) : 
                        <span className="text-gray-500 italic">No concepts specified</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Code Section with Dropdown */}
                <div className="mb-8">
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <span className="text-purple-600">💻</span>
                        Project Code
                      </h3>
                      <svg 
                        className="w-5 h-5 text-gray-600 group-open:rotate-180 transition-transform" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="mt-4">
                      <div className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto">
                        <pre className="text-sm text-left text-white leading-relaxed">{selectedProject.code}</pre>
                      </div>
                    </div>
                  </details>
                </div>

                {/* Terminal Output Section with Dropdown */}
                {selectedProject.terminalOutput && selectedProject.terminalOutput.length > 0 && (
                  <div className="mb-8">
                    <details className="group">
                      <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                          <span className="text-purple-600">🖥️</span>
                          Terminal Output
                        </h3>
                        <svg 
                          className="w-5 h-5 text-gray-600 group-open:rotate-180 transition-transform" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="mt-4">
                        <div className="bg-gray-900/95 text-green-400 p-6 rounded-lg overflow-x-auto ring-1 ring-gray-800">
                          <pre className="text-sm leading-relaxed">{selectedProject.terminalOutput.join('\n')}</pre>
                        </div>
                      </div>
                    </details>
                  </div>
                )}

                {/* Project Statistics */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
                  <h3 className="text-xl font-semibold mb-4 text-purple-700 flex items-center gap-2">
                    <span>📊</span>
                    Project Statistics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="text-sm text-gray-600 mb-1">Code Length</div>
                      <div className="text-lg font-semibold text-purple-700">
                        {selectedProject.code ? selectedProject.code.split('\n').length : 0} lines
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="text-sm text-gray-600 mb-1">Completion Date</div>
                      <div className="text-lg font-semibold text-purple-700">
                        {new Date(selectedProject.completedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {new Date(selectedProject.completedAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Coming Soon Overlay */}
      <AnimatePresence>
        {showComingSoon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xl"
            onClick={() => setShowComingSoon(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl px-10 py-8 max-w-sm w-full text-center relative ring-1 ring-slate-200/60"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-4 text-slate-400 hover:text-slate-700 text-2xl font-bold"
                onClick={() => setShowComingSoon(false)}
                aria-label="Close"
              >
                ×
              </button>
              <div className="text-4xl mb-4">🚧</div>
              <h2 className="text-2xl font-bold mb-2 text-slate-800">Coming soon...</h2>
              <p className="text-slate-600 mb-4">Custom projects are on the way! Stay tuned for updates.</p>
              <button
                className="mt-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow"
                onClick={() => setShowComingSoon(false)}
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Custom Project Overlay */}
      <AnimatePresence>
        {showCustomProjectOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xl"
            onClick={() => setShowCustomProjectOverlay(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white/90 backdrop-blur-xl border border-purple-200/70 rounded-3xl shadow-2xl px-16 py-8 max-w-3xl w-full max-h-[85vh] text-left relative flex flex-col ring-1 ring-slate-200/60"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-5 right-7 text-purple-400 hover:text-purple-700 text-3xl font-extrabold bg-white/70 rounded-full w-12 h-12 flex items-center justify-center shadow-lg border border-purple-100 transition-colors"
                onClick={() => setShowCustomProjectOverlay(false)}
                aria-label="Close"
              >
                ×
              </button>
              <div className="flex-shrink-0">
                <h2 className="text-3xl font-extrabold mb-6 text-purple-800 tracking-tight drop-shadow">Generate Custom Project using AI</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <div className="mb-6">
                  <label className="block text-lg font-semibold text-purple-700 mb-3">Concepts Used</label>
                  <div className="flex flex-wrap gap-3 min-h-[3.5rem] max-h-48 overflow-y-auto bg-purple-50/60 rounded-xl p-3 mb-3 border border-purple-200/80">
                    {selectedCustomConcepts.length === 0 && (
                      <span className="text-purple-300 text-base">No concepts selected</span>
                    )}
                    {selectedCustomConcepts.map((concept, i) => (
                      <div key={i} className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 text-white border-2 border-purple-300 text-base font-semibold shadow-md group hover:from-purple-500 hover:to-blue-500 transition-all">
                        <span className="mr-2">{concept}</span>
                        <button
                          onClick={() => {
                            setSelectedCustomConcepts(prev => prev.filter((_, index) => index !== i));
                          }}
                          className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                          type="button"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="px-6 py-2 bg-purple-600 cursor-pointer hover:bg-purple-700 active:scale-[0.98] text-white rounded-xl font-bold text-base shadow-lg transition-all"
                    onClick={() => setShowConceptPicker(true)}
                    type="button"
                  >
                    + Add Concept
                  </button>
                </div>
                
                <div className="border-t border-purple-200 my-4"></div>
                
                <div className="mb-6">
                  <label className="block text-lg font-semibold text-purple-700 mb-3">Project Theme</label>
                  <input
                    type="text"
                    value={customProjectTheme}
                    onChange={e => setCustomProjectTheme(e.target.value)}
                    placeholder="e.g. Personal Finance Tracker"
                    className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-lg bg-white/80 shadow"
                  />
                </div>
              </div>
              
              <div className="flex-shrink-0 border-t border-purple-200 pt-6">
                <div className="flex justify-end gap-4">
                  <button
                    className="px-6 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-[0.98] text-slate-700 font-semibold text-base shadow"
                    onClick={() => setShowCustomProjectOverlay(false)}
                    disabled={generatingCustomProject}
                  >
                    Cancel
                  </button>
                  <div className="flex flex-col items-center gap-1">
                    <button
                      className="px-6 py-2 rounded-xl bg-blue-700/50 text-white/80 font-bold text-base shadow-lg flex items-center justify-center gap-2 min-w-[100px] cursor-not-allowed"
                      disabled={true}
                    >
                      Create
                    </button>
                    <span className="text-slate-400 text-xs font-medium">Coming Soon</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Concept Picker Overlay */}
      <AnimatePresence>
        {showConceptPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xl"
            onClick={() => setShowConceptPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl px-10 py-8 max-w-lg w-full text-left relative ring-1 ring-slate-200/60"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-4 text-slate-400 hover:text-slate-700 text-2xl font-bold"
                onClick={() => setShowConceptPicker(false)}
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-xl font-bold mb-4 text-slate-800">Select Concepts</h2>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                {['basic', 'intermediate', 'advanced'].map(cat => {
                  const allConcepts = userData.python?.learnedConcepts
                    ? (Array.isArray(userData.python.learnedConcepts)
                        ? userData.python.learnedConcepts
                        : Object.values(userData.python.learnedConcepts))
                    : [];
                  const catConcepts = allConcepts.filter(c => c.category === cat);
                  if (catConcepts.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="font-semibold text-lg mb-2 capitalize">{cat}</div>
                      <div className="grid grid-cols-2 gap-3">
                        {catConcepts.map((c, i) => (
                          <label key={c.concept} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="accent-purple-600"
                              checked={!!conceptPickerChecked[c.concept]}
                              onChange={e => setConceptPickerChecked(prev => ({ ...prev, [c.concept]: e.target.checked }))}
                            />
                            <span>{c.concept}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  className="px-4 py-2 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                  onClick={() => setShowConceptPicker(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-purple-700 hover:bg-purple-800 text-white font-semibold"
                  onClick={() => {
                    const selected = Object.entries(conceptPickerChecked)
                      .filter(([_, v]) => v)
                      .map(([k]) => k);
                    setSelectedCustomConcepts(prev => Array.from(new Set([...prev, ...selected])));
                    setShowConceptPicker(false);
                  }}
                  disabled={Object.values(conceptPickerChecked).every(v => !v)}
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Python;
