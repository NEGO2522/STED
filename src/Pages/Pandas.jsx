import React, { useState, useEffect, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);
import { getDatabase, ref, get, update, onValue, remove, set, child } from "firebase/database";
import { db } from "../firebase";
import ConceptLearned from "../components/ConceptLearned";
import Learned from "../assets/learned.png";
import Applied from "../assets/applied.png";
import Project from "../assets/project.png";
import ProjectRecommender from '../components/ProjectRecommender';
import SeeAnother from "../assets/SeeAnother.png";
import Assignment from '../components/Assignment';
import AssignmentIcon from '../assets/Assignment.png';

// Memoize ConceptLearned to prevent unnecessary re-renders
const MemoizedConceptLearned = memo(ConceptLearned);

function Pandas() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, user } = useUser();
  const [userData, setUserData] = useState({
    level: "",
    xp: 0,
    tasksCompleted: 0,
    pandasSkill: 0,
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
  
  // State for concept details overlay
  const [showConceptDetailsOverlay, setShowConceptDetailsOverlay] = useState(false);
  const [selectedConceptDetails, setSelectedConceptDetails] = useState(null);
  const [nextProject, setNextProject] = useState(null);
  
  // State for editing concept status
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  
  // Handle saving the new status
  const handleSaveStatus = async () => {
    if (!selectedConceptDetails || !newStatus) return;
    
    setIsSavingStatus(true);
    
    try {
      // Get a reference to the user's learned concepts
      const userRef = ref(db, `users/${user.id}/pandas/learnedConcepts`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const learnedConcepts = snapshot.val();
        const conceptKey = `${selectedConceptDetails.category}:${selectedConceptDetails.name}`;
        
        if (learnedConcepts[conceptKey]) {
          // Update the status in Firebase
          await update(ref(db, `users/${user.id}/pandas/learnedConcepts/${conceptKey}`), {
            ...learnedConcepts[conceptKey],
            status: newStatus
          });
          
          // Update local state
          setSelectedConceptDetails(prev => ({
            ...prev,
            status: newStatus
          }));
          
          // Exit edit mode
          setIsEditingStatus(false);
        }
      }
    } catch (error) {
      console.error('Error updating concept status:', error);
    } finally {
      setIsSavingStatus(false);
    }
  };
  
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
            // Ensure pandas object exists with defaults
            if (!userDataFromDb.pandas) {
              userDataFromDb.pandas = {};
            }
            if (userDataFromDb.pandas.PandasProjectStarted === undefined) {
              update(ref(db, 'users/' + user.id + '/pandas'), { PandasProjectStarted: false });
              userDataFromDb.pandas.PandasProjectStarted = false;
            }
            setUserData(userDataFromDb);
          } else {
            // Initialize minimal structure if user node doesn't exist
            const initialUserData = { pandas: { PandasProjectStarted: false } };
            update(ref(db, 'users/' + user.id), initialUserData);
            setUserData(initialUserData);
          }
          setIsLoading(false);
        });
    // Real-time listener for completed projects
    const completedProjectsRef = ref(db, 'users/' + user.id + '/pandas/PandasCompletedProjects');
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
    if (userData.pandas && userData.pandas.PandasCurrentProject) {
      setProjectLoading(true);
      setProjectError("");
      const projectRef = ref(db, `PandasProject/${userData.pandas.PandasCurrentProject}`);
      get(projectRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            setProjectData(snapshot.val());
          } else {
            setProjectError("Project not found.");
            setProjectData(null);
          }
        })
        .catch((err) => {
          setProjectError("Failed to fetch project: " + (err?.message || String(err)));
          setProjectData(null);
        })
        .finally(() => {
          setProjectLoading(false);
        });
    } else {
      setProjectData(null);
      setProjectError("");
    }
  }, [userData.pandas]);

  const fetchConceptStats = async () => {
      if (!userData?.pandas) return;
    
      // Fetch all concepts
      const allConceptsRef = ref(db, 'PandasProject/AllConcepts/category');
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
    let learnedConcepts = userData.pandas?.learnedConcepts || [];
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
        'pandas/PandasProjectStarted': true
      };
      await update(userRef, updates);

      // Update local state
      setUserData(prev => ({
        ...prev,
        pandas: {
          ...prev.pandas,
          PandasProjectStarted: true
        }
      }));

      // Navigate to project page
      navigate('/datascience/project');
    } catch (err) {
      console.error('Failed to update project status:', err);
      // navigate even if update fails
      navigate('/datascience/project');
    }
  };

  // Handler for the main "Next Project" button (with 3s delay)
  const handleNextProjectClick = async () => {
    setIsGeneratingProject(true);
    
    // Show loading for 3 seconds for the main button
    setTimeout(async () => {
      try {
      // Fetch all available projects from Firebase
      const projectsRef = ref(db, 'PandasProject');
      const snapshot = await get(projectsRef);
      
      if (snapshot.exists()) {
        // Get user's completed projects with their details
        let userCompletedProjects = [];
        if (user) {
          const userRef = ref(db, `users/${user.id}/pandas/PandasCompletedProjects`);
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
    }, 3000); // 3 second delay
  };

  // Handler for the overlay's "Next" button (no delay)
  const handleOverlayNextClick = async () => {
    try {
      // Fetch all available projects from Firebase
      const projectsRef = ref(db, 'PandasProject');
      const snapshot = await get(projectsRef);
      
      if (snapshot.exists()) {
        // Get user's completed projects with their details
        let userCompletedProjects = [];
        if (user) {
          const userRef = ref(db, `users/${user.id}/pandas/PandasCompletedProjects`);
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

      const prompt = `Create a Pandas programming project for a student who has learned these concepts: ${conceptsString}

Project Theme: ${theme}

Please generate a project in this EXACT JSON structure:
{
  "Concept": "comma-separated list of concepts used",
  "aiPrompts": {
    "contextInstructions": "You are a helpful Pandas programming tutor working on [project name]. Give small, chat-like responses (2-3 sentences max). Be encouraging and helpful. Don't provide complete code solutions - give hints and syntax examples instead.",
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
      'pandas/PandasProjectStarted': false
    });
    
    // Update local state
    setUserData(prev => ({
      ...prev,
      pandas: {
        ...prev.pandas,
        PandasProjectStarted: false
      }
    }));
  };

  useEffect(() => {
    // Fetch project title for the current project
    const fetchProjectTitle = async () => {
      if (userData.pandas?.PandasCurrentProject) {
        const projectRef = ref(db, `PandasProject/${userData.pandas.PandasCurrentProject}`);
        const snapshot = await get(projectRef);
        if (snapshot.exists()) {
          const project = snapshot.val();
          setCurrentProjectTitle(project?.title || userData.pandas.PandasCurrentProject);
        }
      } else {
        setCurrentProjectTitle('');
      }
    };
    fetchProjectTitle();
  }, [userData.pandas?.PandasCurrentProject]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
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
      <div className="absolute top-0 left-0 w-full h-1 bg-[#6366F1]" />

      {/* Navbar */}
      <div className="sticky top-1 z-50 bg-white shadow-sm">
        <Navbar
          onProgressClick={toggleProgress}
          showProgress={showProgress}
          hideProgressButton={true}
        />
      </div>

      {/* Project Continue/End Box */}
      {userData.pandas?.PandasProjectStarted && (
        <div className="bg-yellow-50/80 backdrop-blur-xl border border-yellow-300/60 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between mb-8 mt-6 max-w-3xl mx-auto shadow-lg ring-1 ring-white/40">
          <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
            <span className="text-lg font-semibold text-yellow-800">Current Project:</span>
            <span className="text-xl font-bold text-yellow-900">{currentProjectTitle || 'Untitled Project'}</span>
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <button
              className="bg-[#6366F1] hover:bg-[#4f46e5] active:scale-[0.98] text-white font-semibold px-6 py-2 rounded-xl shadow-md transition-all"
              onClick={() => navigate('/datascience/project')}
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
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-slate-800 via-[#6366F1] to-indigo-700 bg-clip-text text-transparent tracking-tight">Data Science</h1>
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
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Projects Completed</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">
                    {completedProjects.length}
                    </h3>
                  </div>
                  <div className="bg-gradient-to-br from-[#f0f1ff] to-[#e0e1ff] p-3 rounded-full ring-1 ring-[#e0e1ff]">
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
                <div className="flex items-center justify-between gap-4">
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
                <div className="flex items-center justify-between gap-4">
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
            {/* Learning Resources - Commented out */}
            {/* <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/90 backdrop-blur-sm w-full lg:w-2/3 rounded-xl shadow-md p-6 ring-1 ring-slate-200"
            >
              <MemoizedConceptLearned 
                skillName="pandas"
                completedProjects={completedProjects}
                onConceptClick={(conceptDetails) => {
                  setSelectedConceptDetails(conceptDetails);
                  setShowConceptDetailsOverlay(true);
                  setIsEditingStatus(false);
                  setNewStatus(conceptDetails.status || '');
                }}
              />
            </motion.div> */}

            {/* Concept Details Overlay */}
            {showConceptDetailsOverlay && selectedConceptDetails && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
                  <button
                    className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 text-2xl font-bold"
                    onClick={() => setShowConceptDetailsOverlay(false)}
                  >
                    ×
                  </button>
                  
                  {/* Concept Name */}
                  <div className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                      <h2 className="text-4xl font-bold text-[#4f46e5]">
                        {selectedConceptDetails.name}
                      </h2>
                      <span className="inline-block bg-[#e0e1ff] text-[#4f46e5] px-3 py-1 rounded-full text-sm font-medium capitalize">
                        {selectedConceptDetails.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      {selectedConceptDetails.addedAt && (
                        <span className="text-sm text-slate-500">
                          📅 Added on {new Date(selectedConceptDetails.addedAt).toLocaleDateString()} at {new Date(selectedConceptDetails.addedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    
                    {/* Concept Status */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-700">Status:</span>
                        {isEditingStatus ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={newStatus}
                              onChange={(e) => setNewStatus(e.target.value)}
                              className="border border-slate-300 rounded px-2 py-1 text-sm"
                              disabled={isSavingStatus}
                            >
                              <option value="">Select status</option>
                              <option value="Clear">Clear</option>
                              <option value="Unclear">Unclear</option>
                              <option value="confused">Confused</option>
                            </select>
                            <button
                              onClick={handleSaveStatus}
                              disabled={isSavingStatus || !newStatus}
                              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                              {isSavingStatus ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => {
                                setIsEditingStatus(false);
                                setNewStatus(selectedConceptDetails.status || '');
                              }}
                              className="text-sm text-slate-500 hover:text-slate-700"
                              disabled={isSavingStatus}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span 
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                selectedConceptDetails.status === 'Clear' 
                                  ? 'bg-green-100 text-green-800' 
                                  : selectedConceptDetails.status === 'Unclear' 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : selectedConceptDetails.status === 'confused' 
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {selectedConceptDetails.status || 'Not Set'}
                            </span>
                            <button
                              onClick={() => setIsEditingStatus(true)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Sources Section */}
                  {selectedConceptDetails.sources?.length > 0 && (
                    <div className="mb-8 text-left">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Learning Sources</h3>
                      <div className="space-y-2">
                        {selectedConceptDetails.sources.map((source, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{source.sourceName}</p>
                              <a
                                href={source.sourceLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline truncate block overflow-hidden"
                              >
                                {source.sourceLink}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Applied In Section */}
                  {selectedConceptDetails.appliedIn?.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Applied In</h3>
                      <div className="space-y-3">
                        {selectedConceptDetails.appliedIn.map((project, index) => (
                          <div key={index} className="bg-slate-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium text-slate-900">{project.title}</p>
                                <p className="text-sm text-slate-500">
                                  {project.date ? new Date(project.date).toLocaleDateString() : 'Date not available'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Close Button */}
                  <div className="flex justify-end pt-4 border-t border-slate-200">
                    <button
                      onClick={() => setShowConceptDetailsOverlay(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Concept Status Box - Commented out */}
            {/* <motion.div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-6 w-full max-w-md h-auto min-h-[22rem] flex flex-col justify-between ring-1 ring-slate-200">
              <div>
                <p className="text-sm text-slate-600 font-medium mb-4">Concepts Status</p>
                {(() => {
                  let learnedConcepts = userData.pandas?.learnedConcepts || [];
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

                  // Chart data
                  const chartData = {
                    labels: ['Clear', 'Unclear', 'Confused'],
                    datasets: [
                      {
                        data: [statusCounts.Clear, statusCounts.Unclear, statusCounts.confused],
                        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
                        borderWidth: 0,
                      },
                    ],
                  };

                  const chartOptions = {
                    cutout: '70%',
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100) || 0;
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    },
                  };

                  return (
                    <div className="flex flex-col items-center px-2">
                      <div className="relative w-32 h-32 mb-4">
                        <Doughnut data={chartData} options={chartOptions} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-xl font-bold text-slate-800">{totalLearned}</div>
                            <div className="text-xs text-slate-500">Total</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full px-2">
                        <div className="space-y-3 py-1">
                            <div className="flex items-center justify-between w-full bg-green-50 px-4 py-2 rounded-lg">
                              <div className="flex items-center">
                                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 flex-shrink-0"></span>
                                <span className="text-sm text-slate-800">Clear</span>
                              </div>
                              <span className="text-sm font-medium text-slate-900">{statusCounts.Clear}</span>
                          </div>
                            <div className="flex items-center justify-between w-full bg-amber-50 px-4 py-2 rounded-lg">
                              <div className="flex items-center">
                                <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 flex-shrink-0"></span>
                                <span className="text-sm text-slate-800">Unclear</span>
                              </div>
                              <span className="text-sm font-medium text-slate-900">{statusCounts.Unclear}</span>
                          </div>
                            <div className="flex items-center justify-between w-full bg-red-50 px-4 py-2 rounded-lg">
                              <div className="flex items-center">
                                <span className="w-2 h-2 rounded-full bg-red-500 mr-2 flex-shrink-0"></span>
                                <span className="text-sm text-slate-800">Confused</span>
                              </div>
                              <span className="text-sm font-medium text-slate-900">{statusCounts.confused}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div> */}
          </div>

          {/* --- Project/Assignment Grid --- */}
          <h2 className="text-2xl text-left font-bold text-slate-800 mb-6 mt-10 tracking-tight">Apply learning</h2>
          <div className="grid grid-cols-1 gap-6 items-start">
            {/* Commented out Assignment Box
            <div className="w-full">
              <Assignment learnedConcepts={userData.pandas?.learnedConcepts || []} />
            </div>
            */}
            {/* Project Box */}
            <motion.div className="w-full bg-white rounded-2xl shadow-md overflow-hidden lg:sticky lg:top-28 ring-1 ring-slate-200">
              {/* Header Section */}
              <div className="backdrop-blur-sm border-b border-white/20 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white ring-1 ring-slate-200 rounded p-2">
                    <svg className="w-6 h-6 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl text-left font-bold tracking-tight">Projects</h2>
                    <p className="text-[#6D7D92] text-sm">Start building amazing projects</p>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6">
              {userData.pandas && userData.pandas.PandasCurrentProject ? (
                projectLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                      <p>Loading project...</p>
                    </div>
                  </div>
                ) : projectError ? (
                  <div className="bg-red-500/20 border border-red-300/30 rounded-xl p-4 text-red-100">
                    {projectError}
                  </div>
                ) : projectData ? (
                  <div className="space-y-4">
                    {/* New Project Button */}
                    <button
                      onClick={handleNextProjectClick}
                      disabled={isGeneratingProject}
                      className={`group w-full ring-1 ring-slate-200 rounded-xl p-5 transition-all duration-300 ${
                        isGeneratingProject ? 'opacity-80 cursor-not-allowed' : 'hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-[#6366F1] rounded-lg p-3 group-hover:scale-110 transition-transform">
                            {isGeneratingProject ? (
                              <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            )}
                          </div>
                          <div className="text-left">
                            <h3 className="text-black font-bold text-lg">
                              {isGeneratingProject ? 'Generating...' : 'Next Project'}
                            </h3>
                            <p className="text-slate-500 text-sm">
                              {isGeneratingProject ? 'Finding the perfect project for you' : 'Discover new challenges'}
                            </p>
                          </div>
                        </div>
                        {!isGeneratingProject && (
                          <svg className="w-6 h-6 text-slate-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                    
                    {/* Custom Project Button */}
                    <button
                      onClick={handleCustomProjectClick}
                      className="group w-full ring-1 ring-slate-200 rounded-xl p-5 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-[#6366F1] rounded-lg p-3 group-hover:scale-110 transition-transform shadow-md">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <h3 className="text-black font-bold text-lg">Custom Project</h3>
                            <p className="text-slate-500 text-sm">Build your own project idea</p>
                          </div>
                        </div>
                        <svg className="w-6 h-6 text-slate-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* New Project Button */}
                    <button
                      onClick={handleNextProjectClick}
                      className="group w-full bg-white/10 backdrop-blur-sm hover:bg-white/20 border-2 border-white/30 hover:border-white/50 rounded-xl p-5 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-gradient-to-br bg-[#6366F1] rounded-lg p-3 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <h3 className="text-white font-bold text-lg">Start New Project</h3>
                            <p className="text-white/70 text-sm">Begin your coding journey</p>
                          </div>
                        </div>
                        <svg className="w-6 h-6 text-white/80 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                    
                    {/* Custom Project Button */}
                    <button
                      onClick={handleCustomProjectClick}
                      className="group w-full bg-gradient-to-r bg-[#6366F1] hover:bg-[#6366F1]/90 border-2 border-[#c0c1ff]/40 hover:border-[#d0d1ff]/50 rounded-xl p-5 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-gradient-to-br bg-[#6366F1] rounded-lg p-3 group-hover:scale-110 transition-transform shadow-md">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <h3 className="text-white font-bold text-lg">Custom Project</h3>
                            <p className="text-white/70 text-sm">Build your own project idea</p>
                          </div>
                        </div>
                        <svg className="w-6 h-6 text-white/80 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {/* Start New Project Button */}
                  <button
                    onClick={handleNextProjectClick}
                    className="group w-full bg-white/10 backdrop-blur-sm hover:bg-white/20 border-2 border-white/30 hover:border-white/50 rounded-xl p-5 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br bg-[#6366F1] rounded-lg p-3 group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <h3 className="text-white font-bold text-lg">Start New Project</h3>
                          <p className="text-white/70 text-sm">Begin your coding journey</p>
                        </div>
                      </div>
                      <svg className="w-6 h-6 text-white/80 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                  
                  {/* Custom Project Button - Disabled */}
                  <button
                    disabled
                    className="group w-full bg-white/5 border-2 border-white/10 rounded-xl p-5 cursor-not-allowed opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-gray-400/30 rounded-lg p-3">
                          <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <h3 className="text-white/50 font-bold text-lg">Custom Project</h3>
                          <p className="text-white/40 text-sm">Unlock by starting a project</p>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              )}
              </div>
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
                                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d0d1ff] bg-white/80 hover:bg-[#f0f1ff] text-[#6366F1] hover:text-[#4f46e5] text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
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
                              
                              <h2 className="text-4xl font-bold mb-4 text-[#4f46e5] bg-gradient-to-r from-[#4f46e5] to-[#6366F1] bg-clip-text text-transparent">
                                {nextProject.title}
                              </h2>
                              <div className="w-24 h-1 bg-[#6366F1] mx-auto rounded-full"></div>
                            </div>
                            
                            <div className="bg-gradient-to-br from-white to-[#f0f1ff] rounded-2xl p-8 mb-8 border border-[#e0e1ff]">
                              <p className="text-gray-700 text-lg leading-relaxed mb-6">{nextProject.description}</p>
                              
                              <div className="bg-white rounded-xl p-6 border border-[#d0d1ff]">
                                <h3 className="text-lg font-semibold text-[#4f46e5] mb-3 flex items-center gap-2">
                                  <span className="text-[#6366F1]">📚</span>
                                  Required Concepts
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                  {(nextProject.Concept || nextProject.conceptsUsed || 'Pandas Basics').split(', ').map((concept, index) => (
                                    <span
                                      key={index}
                                      className="inline-block bg-[#e0e1ff] text-[#4f46e5] px-4 py-2 rounded-full text-sm font-medium border border-[#d0d1ff]"
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
                                  const projectRef = ref(db, 'PandasProject');
                                  const customProjectRef = child(projectRef, nextProject.id);
                                  await set(customProjectRef, nextProject);
                                  console.log('Custom project saved to Firebase');
                                }

                                // Set this project as the user's current project in Firebase
                                const userRef = ref(db, 'users/' + user.id);
                                let projectKey = nextProject.id;
                                await update(userRef, {
                                  'pandas/PandasCurrentProject': projectKey,
                                  'pandas/PandasProjectStarted': true
                                });

                                setUserData(prev => ({
                                  ...prev,
                                  pandas: {
                                    ...prev.pandas,
                                    PandasCurrentProject: projectKey,
                                    PandasProjectStarted: true
                                  }
                                }));

                                setShowProjectOverlay(false);
                                navigate('/datascience/project');
                              } catch (error) {
                                console.error('Error saving project to Firebase:', error);
                                alert('Failed to save project. Please try again.');
                              }
                            }}
                            className="flex-1 bg-gradient-to-r from-[#4f46e5] to-[#4338ca] hover:from-[#4338ca] hover:to-[#3730a3] active:scale-[0.98] text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl"
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
                        <ProjectRecommender 
                          learnedConcepts={userData.pandas?.learnedConcepts} 
                          completedProjects={completedProjects}
                          projectType="pandas"
                        >
                        {({ recommendedProject, loading, error, getNextProject, hasMultipleProjects, currentProjectIndex, totalProjects, saveProjectToFirebase, generatingProject }) => {
                          if (loading) return (
                            <div className="flex items-center justify-center py-16">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1] mx-auto mb-4"></div>
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
                                          className="text-[#6366F1] hover:text-[#4f46e5] text-sm font-semibold transition-colors relative"
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
                                  
                                  <h2 className="text-4xl font-bold mb-4 text-[#4f46e5] bg-gradient-to-r from-[#4f46e5] to-[#6366F1] bg-clip-text text-transparent">
                                    {recommendedProject.title}
                                  </h2>
                                  <div className="w-24 h-1 bg-[#6366F1] mx-auto rounded-full"></div>
                                </div>
                                
                                <div className="bg-gradient-to-br from-white to-[#f0f1ff] rounded-2xl p-8 mb-8 border border-[#e0e1ff]">
                                  <p className="text-gray-700 text-lg leading-relaxed mb-6">{recommendedProject.description}</p>
                                  
                                  <div className="bg-white rounded-xl p-6 border border-[#d0d1ff]">
                                    <h3 className="text-lg font-semibold text-[#4f46e5] mb-3 flex items-center gap-2">
                                      <span className="text-[#6366F1]">📚</span>
                                      Required Concepts
                        </h3>
                                    <div className="flex flex-wrap gap-2">
                                      {recommendedProject.Concept.split(', ').map((concept, index) => (
                                        <span
                              key={index}
                                          className="inline-block bg-[#e0e1ff] text-[#4f46e5] px-4 py-2 rounded-full text-sm font-medium border border-[#d0d1ff]"
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
                                    let projectKey = recommendedProject.id || recommendedProject.title;
                                    
                                    await update(userRef, {
                                      'pandas/PandasCurrentProject': projectKey,
                                      'pandas/PandasProjectStarted': true
                                    });
                                    setUserData(prev => ({
                                      ...prev,
                                      pandas: {
                                        ...prev.pandas,
                                        PandasCurrentProject: projectKey,
                                        PandasProjectStarted: true
                                      }
                                    }));
                                    setShowProjectOverlay(false);
                                    navigate('/datascience/project');
                                  }}
                                  className="flex-1 bg-gradient-to-r from-[#4f46e5] to-[#4338ca] hover:from-[#4338ca] hover:to-[#3730a3] text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
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
                    <div className="text-2xl font-semibold text-slate-800 group-hover:text-[#4f46e5] transition-colors">{project.projectTitle || project.key}</div>
                    <div className="text-slate-500 text-sm mt-2">Completed: {new Date(project.completedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex-none flex flex-col items-end gap-2 md:gap-3">
                    <span className="inline-block text-slate-700/80 px-3 py-1 text-lg group-hover:text-[#4f46e5] transition-colors">Click to view details</span>
                    {project.publicUrl && (
                      <div className="flex gap-2 mt-2">
                        <button
                          className="px-3 py-1 bg-[#e0e1ff] text-[#4f46e5] rounded hover:bg-purple-200 active:scale-[0.98] text-xs font-semibold border border-[#d0d1ff] transition-all"
                          onClick={e => {
                            e.stopPropagation();
                            const url = project.publicUrl.replace('/public/datascience-project/', '/datascience-project/');
                            navigator.clipboard.writeText(window.location.origin + url);
                            setCopiedProjectId(project._projectKey);
                            setTimeout(() => setCopiedProjectId(null), 1500);
                          }}
                        >
                          {copiedProjectId === project._projectKey ? 'Copied!' : 'Share'}
                        </button>
                        <a
                          href={project.publicUrl.replace('/public/datascience-project/', '/datascience-project/')}
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
                className="absolute top-6 right-8 text-slate-700 hover:text-[#6366F1] text-4xl font-bold z-10 transition-colors"
              >
                ×
              </button>
              
              <div className="p-8 overflow-y-auto max-h-[90vh]">
                {/* Project Header */}
                <div className="mb-8 border-b border-gray-200 pb-6">
                  <h2 className="text-3xl font-bold mb-6 text-[#4f46e5]">{selectedProject.projectTitle}</h2>
                  
                  {/* Concepts Used Section */}
                  <div className="bg-gradient-to-r from-white to-[#f0f1ff] rounded-xl p-6 border border-[#d0d1ff]">
                    <h3 className="text-lg font-semibold text-[#4f46e5] mb-4 flex items-center gap-2">
                      <span className="text-[#6366F1]">📚</span>
                      Concepts Used
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {selectedProject.conceptUsed ? 
                        selectedProject.conceptUsed.split(', ').map((concept, index) => (
                          <span
                            key={index}
                            className="inline-block bg-white text-[#4f46e5] px-4 py-2 rounded-full text-sm font-medium border border-[#c0c1ff] shadow-sm hover:shadow-md transition-shadow"
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
                        <span className="text-[#6366F1]">💻</span>
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
                          <span className="text-[#6366F1]">🖥️</span>
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
                <div className="bg-gradient-to-br from-white to-[#f0f1ff] rounded-xl p-6 border border-[#e0e1ff]">
                  <h3 className="text-xl font-semibold mb-4 text-[#4f46e5] flex items-center gap-2">
                    <span>📊</span>
                    Project Statistics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-[#d0d1ff]">
                      <div className="text-sm text-gray-600 mb-1">Code Length</div>
                      <div className="text-lg font-semibold text-[#4f46e5]">
                        {selectedProject.code ? selectedProject.code.split('\n').length : 0} lines
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-[#d0d1ff]">
                      <div className="text-sm text-gray-600 mb-1">Completion Date</div>
                      <div className="text-lg font-semibold text-[#4f46e5]">
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
    </div>
  );
}

export default Pandas;