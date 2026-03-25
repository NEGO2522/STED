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
  const [startingProject, setStartingProject] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setIsLoading(false);
      return;
    }
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
    <div className="h-screen overflow-hidden bg-slate-50 relative pt-20 flex flex-col">
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
              className="bg-[#6366F1] hover:bg-[#4f46e5] lg:cursor-pointer active:scale-[0.98] text-white font-semibold px-6 py-2 rounded-xl shadow-md transition-all"
              onClick={() => navigate('/datascience/project')}
            >
              Continue Project
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 lg:cursor-pointer active:scale-[0.98] text-white font-semibold px-6 py-2 rounded-xl shadow-md transition-all"
              onClick={handleEndProject}
            >
              End Project
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="w-full relative px-4 lg:px-8 max-w-7xl mx-auto flex-1 overflow-hidden">
          {/* Header Section */}
           
              <div className="text-left mt-20">
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-slate-800 via-[#6366F1] to-indigo-700 bg-clip-text text-transparent tracking-tight" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>Data Science</h1>
            </div>
          

          {/* Quick Stats Grid - hidden */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <motion.div ...>Projects Completed</motion.div>
            <motion.div ...>Concepts Learned</motion.div>
            <motion.div ...>Concepts Applied</motion.div>
          </div> */}

          {/* ── Static Info Section ── */}
          <div className="mt-10 space-y-8">

            {/* Hero banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4f46e5] via-[#6366F1] to-[#818cf8] p-8 shadow-xl">
              {/* decorative blobs */}
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <p className="text-indigo-200 text-sm font-semibold uppercase tracking-widest mb-2">Your learning path</p>
                  <h2 className="text-3xl font-extrabold text-white mb-3" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>Master Pandas & Data Science</h2>
                  <p className="text-indigo-100 text-base max-w-xl leading-relaxed">Work through hands-on projects that teach you to manipulate, analyse, and visualise real-world data using the industry-standard Python stack.</p>
                </div>
                <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-5 text-center border border-white/30">
                  <p className="text-indigo-100 text-xs mt-1 font-medium">pandas · numpy · matplotlib and more</p>
                </div>
              </div>
            </div>

            {/* 2-column layout: What You'll Be Able To Do | Apply Learning (wider) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* What you'll learn - takes 1 column */}
              <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md transition-shadow md:col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-indigo-50 p-2.5 rounded-xl">
                    <svg className="w-5 h-5 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-800">What You'll Be Able To Do</h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  {["Turn raw data into meaningful insights","Solve real-world problems using data","Answer real business questions","Build end-to-end data projects","Stop depending on project tutorials"].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

             

              {/* Projects KPI — spans 2 columns, wider */}
              <motion.div className="bg-white rounded-2xl shadow-sm overflow-hidden ring-1 ring-slate-200 hover:shadow-md transition-shadow md:col-span-2">
                <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-2">
                  <div className="bg-indigo-50 rounded-lg p-1.5">
                    <svg className="w-4 h-4 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800 tracking-tight">Apply Learning</h2>
                    <p className="text-[#6D7D92] text-xs">Start a project</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {/* Start New Project */}
                  <button
                    onClick={handleNextProjectClick}
                    disabled={isGeneratingProject}
                    className={`group w-full rounded-xl p-5 transition-all duration-300 relative overflow-hidden ${
                      isGeneratingProject ? 'opacity-80 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {/* Animated rainbow border */}
                    <div 
                      className="absolute inset-0 rounded-xl p-[3px]"
                      style={{
                        background: 'linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6, #22c55e, #eab308, #ef4444, #ec4899)',
                        backgroundSize: '200% 100%',
                        animation: 'rainbow-move 3s linear infinite'
                      }}
                    >
                      <div className="w-full h-full rounded-xl bg-white"></div>
                    </div>
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-[#6366F1] rounded-xl p-3 group-hover:scale-110 transition-transform">
                          {isGeneratingProject ? (
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          )}
                        </div>
                        <div className="text-left">
                          <h3 className="text-slate-800 font-bold text-lg">{isGeneratingProject ? 'Generating...' : 'Start New Project'}</h3>
                          <p className="text-slate-500 text-sm">{isGeneratingProject ? 'Finding the perfect project' : 'Begin your coding journey'}</p>
                        </div>
                      </div>
                      {!isGeneratingProject && <svg className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>}
                    </div>
                  </button>
                  {/* Custom Project - Locked */}
                  <button
                    disabled
                    className="group w-full bg-slate-100 border border-slate-200 rounded-xl p-3 opacity-70 cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-200 rounded-lg p-2">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <h3 className="text-slate-500 font-bold text-sm">Custom Project</h3>
                          <p className="text-slate-400 text-xs text-left">Coming Soon · Locked</p>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </button>
                </div>
              </motion.div>
            </div>

            
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
                                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d0d1ff] bg-white/80 lg:cursor-pointer hover:bg-[#f0f1ff] text-[#6366F1] hover:text-[#4f46e5] text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
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
                              if (startingProject) return;
                              setStartingProject(true);
                              console.log('[STED] Starting project click...');

                              try {
                                // Save custom project to Firebase if it's a custom-generated project
                                if (nextProject.id && nextProject.id.startsWith('custom_project_')) {
                                  await set(ref(db, `PandasProject/${nextProject.id}`), nextProject);
                                  console.log('[STED] Custom project saved');
                                }

                                let projectKey = nextProject.id || nextProject.title;

                                if (user?.id) {
                                  const userProjectRef = ref(db, `users/${user.id}/pandas`);
                                  
                                  console.log('[STED] Setting current project to:', projectKey);
                                  await update(userProjectRef, {
                                    PandasCurrentProject: projectKey,
                                    PandasProjectStarted: true
                                  });
                                }

                                // Short delay to show the "Setting Up Workspace" state
                                setTimeout(() => {
                                  console.log('[STED] Navigation triggered with projectKey:', projectKey);
                                  setShowProjectOverlay(false);
                                  navigate(`/datascience/project?id=${encodeURIComponent(projectKey)}`);
                                  setStartingProject(false);
                                }, 1500);
                                
                              } catch (error) {
                                console.error('[STED] Start project failed:', error);
                                setStartingProject(false);
                              }
                            }}
                            disabled={startingProject}
                            className={`flex-1 bg-gradient-to-r from-[#4f46e5] to-[#4338ca] hover:from-[#4338ca] lg:cursor-pointer hover:to-[#3730a3] active:scale-[0.98] text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl ${startingProject ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            {startingProject ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Setting Up Workspace...
                              </>
                            ) : (
                              <>🚀 Start Project</>
                            )}
                          </button>

                            <button
                              onClick={handleCloseProjectOverlay}
                              className="px-8 py-4 border-2 border-slate-300 lg:cursor-pointer text-slate-700 hover:bg-slate-50 active:scale-[0.98] hover:border-slate-400 rounded-xl transition-all duration-300 font-semibold text-lg"
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
                                          className="text-[#6366F1] hover:text-[#4f46e5] lg:cursor-pointer text-sm font-semibold transition-colors relative"
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

                              <div className="flex gap-4">
                                <button
                                  onClick={async () => {
                                    if (startingProject) return;
                                    setStartingProject(true);
                                    console.log('[STED] Recommended project click...');
                                    
                                    try {
                                      // Save generated project to Firebase if it's a new Gemini-generated project
                                      if (recommendedProject.id && recommendedProject.id.startsWith('generated_project_')) {
                                        const saved = await saveProjectToFirebase(recommendedProject);
                                        if (!saved) {
                                          console.error('[STED] Failed to save recommended project');
                                        }
                                      }
                                      
                                      if (user?.id) {
                                        const userProjectRef = ref(db, `users/${user.id}/pandas`);
                                        let projectKey = recommendedProject.id || recommendedProject.title;
                                        
                                        console.log('[STED] Setting recommended project:', projectKey);
                                        await update(userProjectRef, {
                                          PandasCurrentProject: projectKey,
                                          PandasProjectStarted: true
                                        });
                                      }
                                      
                                      setTimeout(() => {
                                        console.log('[STED] Navigation triggered with projectKey:', projectKey);
                                        setShowProjectOverlay(false);
                                        navigate(`/datascience/project?id=${encodeURIComponent(projectKey)}`);
                                        setStartingProject(false);
                                      }, 1500);

                                    } catch (error) {
                                      console.error('[STED] Start recommended failed:', error);
                                      setStartingProject(false);
                                    }
                                  }}
                                  className={`flex-1 bg-gradient-to-r from-[#4f46e5] to-[#4338ca] hover:from-[#4338ca] lg:cursor-pointer hover:to-[#3730a3] text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 ${startingProject ? 'opacity-70 cursor-not-allowed' : ''}`}
                                  disabled={generatingProject || startingProject}
                        >
                          {startingProject ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              Setting Up Workspace...
                            </>
                          ) : generatingProject ? (
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
                                  className="px-8 py-4 border-2 border-slate-300 lg:cursor-pointer text-slate-700 hover:bg-slate-50 hover:border-slate-400 rounded-xl transition-all duration-300 font-semibold text-lg"
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

      {/* Project History Section - hidden */}
      {/* <div className="w-full relative px-4 lg:px-8 max-w-7xl mx-auto text-left mb-10">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Project & Task History</h2>
        ... (commented out)
      </div> */}

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