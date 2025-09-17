import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDatabase, ref, get, update, onValue } from "firebase/database";
import { db } from "../firebase";
import ConceptLearned from "../components/ConceptLearned";
import Learned from "../assets/learned.png";
import Applied from "../assets/applied.png";
import Project from "../assets/project.png";
import ProjectRecommender from '../components/ProjectRecommender';
import SeeAnother from "../assets/SeeAnother.png";
import Assignment from '../components/Assignment';
import AssignmentIcon from '../assets/Assignment.png';

function PowerBi() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, user } = useUser();
  const [userData, setUserData] = useState({
    level: "",
    xp: 0,
    tasksCompleted: 0,
    powerBiSkill: 0,
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
            setUserData(snapshot.val());
          }
          setIsLoading(false);
        });
    // Real-time listener for completed projects
    const completedProjectsRef = ref(db, 'users/' + user.id + '/powerbi/PowerBiCompletedProjects');
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
    if (userData.powerbi && userData.powerbi.PowerBiCurrentProject) {
      setProjectLoading(true);
      setProjectError("");
      const projectRef = ref(db, `PowerBiProject/${userData.powerbi.PowerBiCurrentProject}`);
      get(projectRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            setProjectData(snapshot.val());
          } else {
            setProjectError("Project not found.");
          }
        })
        .catch((err) => {
          setProjectError("Failed to fetch project: " + err.message);
        })
        .finally(() => {
          setProjectLoading(false);
        });
    } else {
      setProjectData(null);
      setProjectError("");
    }
  }, [userData.powerbi]);

  const fetchConceptStats = async () => {
      if (!userData?.powerbi) return;
    
      // Fetch all concepts
      const allConceptsRef = ref(db, 'PowerBiProject/AllConcepts/category');
      const allConceptsSnap = await get(allConceptsRef);
      let totalConcepts = 0;
      if (allConceptsSnap.exists()) {
        const data = allConceptsSnap.val();
        // Sum all concepts in all categories (dynamic, not just basic/intermediate/advanced)
        totalConcepts = Object.values(data).reduce((acc, arr) => acc + Object.values(arr || {}).length, 0);
      }
    
      // Get learned concepts
    let learnedConcepts = userData.powerbi?.learnedConcepts || [];
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
        'powerbi/PowerBiProjectStarted': true
      };
      await update(userRef, updates);

      // Update local state
      setUserData(prev => ({
        ...prev,
        powerbi: {
          ...prev.powerbi,
          PowerBiProjectStarted: true
        }
      }));

      // Navigate to project page
      navigate('/powerbi/project');
    } catch (err) {
      console.error('Failed to update project status:', err);
      // navigate even if update fails
      navigate('/powerbi/project');
    }
  };

  const handleNextProjectClick = () => {
    setShowProjectOverlay(true);
  };

  const handleCustomProjectClick = () => {
    setShowCustomProjectOverlay(true);
  };

  const handleCloseProjectOverlay = () => {
    setShowProjectOverlay(false);
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
    await update(userRef, { 'powerbi/PowerBiProjectStarted': false });
    setUserData(prev => ({
      ...prev,
      powerbi: {
        ...prev.powerbi,
        PowerBiProjectStarted: false
      }
    }));
  };

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
    <div className="min-h-screen bg-slate-50 relative">
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
      {userData.powerbi?.PowerBiProjectStarted && (
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between mb-8 mt-6 max-w-3xl mx-auto shadow">
          <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
            <span className="text-lg font-semibold text-yellow-800">Current Project:</span>
            <span className="text-xl font-bold text-yellow-900">{currentProjectTitle || 'Untitled Project'}</span>
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2 rounded-lg shadow"
              onClick={() => navigate('/powerbi/project')}
            >
              Continue Project
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2 rounded-lg shadow"
              onClick={handleEndProject}
            >
              End Project
            </button>
          </div>
        </div>
      )}

      {/* Main content with sidebar */}
      <div className="flex flex-col lg:flex-row">
        <Sidebar />
        <div className="w-full relative px-4 lg:px-8 pb-12">
          {/* Header Section */}
           
              <div className="text-left mt-6">
                <h1 className="text-3xl font-bold text-slate-800">Power BI</h1>
            </div>
          

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {/* SP (STED Points) Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                if (window.handlePointsClick) {
                  window.handlePointsClick();
                }
              }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">SP(STED Points)</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">
                    {completedProjects.length * 10 + conceptStats.learned * 2 + conceptStats.applied * 5}
                    </h3>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-full">
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
              </motion.div>

            {/* Projects Completed Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Projects Completed</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">
                    {completedProjects.length}
                    </h3>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-full">
                    <span className=""><img className="w-7" src={Project} alt="" /></span>
                  </div>
                </div>
              </motion.div>

            {/* Concepts Applied Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                if (window.handleAppliedConceptsClick) {
                  window.handleAppliedConceptsClick();
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Tasks Completed</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1">
                    04
                  </h3>
                </div>
                <div className="bg-yellow-50 p-3 rounded-full">
                  <span className="text-2xl"><img className="w-7" src={AssignmentIcon} alt="" /></span>
                </div>
              </div>
            </motion.div>

                        {/* Concepts Learned Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Concepts Learned</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">
                      {conceptStats.learned} / {conceptStats.total}
                    </h3>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-full">
                    <span className="text-2xl"><img className="w-7" src={Learned} alt="" /></span>
                  </div>
                </div>
              </motion.div>



            {/* Concepts Applied Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                if (window.handleAppliedConceptsClick) {
                  window.handleAppliedConceptsClick();
                }
              }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Concepts Applied</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">
                      {conceptStats.applied} / {conceptStats.learned}
                    </h3>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-full">
                    <span className="text-2xl"><img className="w-7" src={Applied} alt="" /></span>
                  </div>
                </div>
              </motion.div>

            {/* Concepts Applied Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                if (window.handleAppliedConceptsClick) {
                  window.handleAppliedConceptsClick();
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Concepts Applied</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1">
                    {conceptStats.applied} / {conceptStats.learned}
                  </h3>
                </div>
                <div className="bg-yellow-50 p-3 rounded-full">
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
              className="bg-white w-full lg:w-2/3 rounded-lg shadow-md p-6"
            >
              <ConceptLearned skillName="powerbi" completedProjects={completedProjects} />
            </motion.div>

            {/* Concept Status Box */}
            <motion.div className="bg-white rounded-lg shadow-md p-6 w-150 h-76 flex flex-col justify-between">
              <div>
              <p className="text-sm text-slate-600">Concepts Status</p>
              {(() => {
                  let learnedConcepts = userData.powerbi?.learnedConcepts || [];
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
                        <span className="inline-block w-2 h-2 rounded-full bg-black mr-2"></span>
                        <span className="text-black font-normal">Clear</span>
                        <span className="ml-auto text-black px-2 py-0.5 rounded-full text-lg font-semibold">{statusCounts.Clear} / {totalLearned}</span>
                      </div>
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-black mr-2"></span>
                        <span className="text-black font-normal">Unclear</span>
                        <span className="ml-auto text-black px-2 py-0.5 rounded-full text-lg font-semibold">{statusCounts.Unclear} / {totalLearned}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-black mr-2"></span>
                        <span className="text-black font-normal">Confused</span>
                        <span className="ml-auto text-black px-2 py-0.5 rounded-full text-lg font-semibold">{statusCounts.confused} / {totalLearned}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>

          {/* --- Project/Assignment Grid --- */}
          <h2 className="text-2xl text-left font-bold text-slate-800 mb-6 mt-10">Apply learning</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

             {/* Assignment Box */}
             <div className="w-full">
              <Assignment learnedConcepts={userData.powerbi?.learnedConcepts || []} />
            </div>
            {/* Project Box */}
            <motion.div className="bg-gradient-to-br from-[#C642F5] via-[#A633D9] to-[#8C1EB6] w-full h-76 rounded-lg shadow-2xl p-6 lg:sticky lg:top-28">
              <h2 className="text-2xl font-bold text-white mb-6">
                Project
              </h2>
              {userData.powerbi && userData.powerbi.PowerBiCurrentProject ? (
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
                        className="w-full inline-flex items-center cursor-pointer justify-center gap-2 bg-purple-900 text-white hover:bg-purple-700 font-semibold px-4 py-3 rounded-lg shadow-md transition-colors"
                      >
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
                ) : (
                  <div className="text-white">No project assigned. Click "Start Learning" to begin your first project.</div>
                )
              ) : (
                <div className="text-white">No project assigned. Click "Start Learning" to begin your first project.</div>
              )}
            </motion.div>
           
          </div>
        </div>
      </div>


      {/* Project History Section */}
      <div className="w-full mx-auto lg:px-8 text-left mb-10">
        
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Project History</h2>
        <div className="bg-white hover:bg-[#f7f7f7] rounded-lg shadow-md p-6">
          {completedProjects.length === 0 ? (
            <div className="text-slate-500 italic">No completed projects yet.</div>
          ) : (
              <ul className="divide-y divide-slate-200">
              {completedProjects.map((project, idx) => (
                <li 
                  key={project.key} 
                  className="flex flex-col md:flex-row gap-2 md:gap-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleProjectClick(project)}
                >
                    <div className="flex-1">
                    <div className="text-2xl font-semibold text-slate-800">{project.projectTitle || project.key}</div>
                    <div className="text-slate-500 text-sm mt-2">Completed: {new Date(project.completedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex-none flex flex-col items-end gap-2 md:gap-3">
                    <span className="inline-block text-slate-700 px-3 py-1 text-lg">Click to view details</span>
                    {project.publicUrl && (
                      <div className="flex gap-2 mt-2">
                        <button
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-xs font-semibold border border-purple-200 transition-colors"
                          onClick={e => {
                            e.stopPropagation();
                            const url = project.publicUrl.replace('/public/powerbi-project/', '/powerbi-project/');
                            navigator.clipboard.writeText(window.location.origin + url);
                            setCopiedProjectId(project._projectKey);
                            setTimeout(() => setCopiedProjectId(null), 1500);
                          }}
                        >
                          {copiedProjectId === project._projectKey ? 'Copied!' : 'Share'}
                        </button>
                        <a
                          href={project.publicUrl.replace('/public/powerbi-project/', '/powerbi-project/')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-semibold border border-blue-200 transition-colors"
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
    </div>
  );
}

export default PowerBi; 