import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { getDatabase, ref, get } from 'firebase/database';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import Feed from '../components/Feed';
import openImg from '../assets/open.png';
import python from '../assets/python.png';
import PowerBi from '../assets/PowerBi.png';
import DiscoverStudents from './DiscoverStudents';

function Home() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [activeTab, setActiveTab] = useState('feed');
  const [userData, setUserData] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const navigate = useNavigate();
  
  // Skill states
  const [pythonStats, setPythonStats] = useState({ learned: 0, applied: 0, total: 0 });
  const [pythonProjects, setPythonProjects] = useState([]);
  const [powerbiStats, setPowerbiStats] = useState({ learned: 0, applied: 0, total: 0 });
  const [powerbiProjects, setPowerbiProjects] = useState([]);
  const [pandasStats, setPandasStats] = useState({ learned: 0, applied: 0, total: 0 });
  const [pandasProjects, setPandasProjects] = useState([]);

  // Always default to Learning Feed on page visit
  useEffect(() => {
    setActiveTab('feed');
    localStorage.setItem('sted-active-tab', 'feed');
  }, []);

  // Calculate SP for each skill
  const pythonSP = pythonProjects.length * 10 + pythonStats.learned * 2 + pythonStats.applied * 5;
  const powerbiSP = powerbiProjects.length * 10 + powerbiStats.learned * 2 + powerbiStats.applied * 5;
  const pandasSP = pandasProjects.length * 10 + pandasStats.learned * 2 + pandasStats.applied * 5;

  // When tab changes, persist to localStorage
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem('sted-active-tab', tabId);
  };

  // Get SP for a specific skill
  const getSkillSP = (skillKey) => {
    switch (skillKey) {
      case 'python': return pythonSP;
      case 'powerbi': return powerbiSP;
      case 'pandas': return pandasSP;
      default: return 0;
    }
  };

  // Skill map for rendering
  const skillMap = {
    'python': {
      route: '/python',
      node: 'python',
      currentProjectField: 'PythonCurrentProject',
      img: python,
      label: 'Python',
    },
    'data-science': {
      route: '/data-science',
      node: 'data-science',
      currentProjectField: 'DataScienceCurrentProject',
      img: null,
      label: 'Data Science',
      icon: <span className="text-xl mr-2">📊</span>,
    },
    'public-speaking': {
      route: '/public-speaking',
      node: 'public-speaking',
      currentProjectField: 'PublicSpeakingCurrentProject',
      img: null,
      label: 'Public Speaking',
      icon: <span className="text-xl mr-2">🎤</span>,
    },
    'powerbi': {
      route: '/powerbi',
      node: 'powerbi',
      currentProjectField: 'PowerBiCurrentProject',
      img: PowerBi,
      label: 'Power BI',
    },
    'pandas': {
      route: '/pandas',
      node: 'pandas',
      currentProjectField: 'PandasCurrentProject',
      img: null,
      label: 'Pandas',
      icon: <span className="text-2xl mr-2">🐼</span>,
    },
  };

  // Get started skills
  const startedSkills = Object.entries(skillMap).filter(([key, skill]) =>
    userData && userData[skill.node] && userData[skill.node][skill.currentProjectField]
  );

  // Fetch user data and skills
  useEffect(() => {
    if (isLoaded && isSignedIn && user?.id) {
      const userRef = ref(db, 'users/' + user.id);
      
      // Fetch user data
      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          setUserData(snapshot.val());
        }
        setIsLoadingProfile(false);
      });

      // Fetch Python data
      const fetchPythonData = async () => {
        const [projectsSnap, conceptsSnap, learnedSnap] = await Promise.all([
          get(ref(db, `users/${user.id}/python/PythonCompletedProjects`)),
          get(ref(db, 'PythonProject/AllConcepts/category')),
          get(ref(db, `users/${user.id}/python/learnedConcepts`))
        ]);

        // Completed projects
        let projects = [];
        if (projectsSnap.exists()) {
          projects = Object.values(projectsSnap.val() || {});
          setPythonProjects(projects);
        } else {
          setPythonProjects([]);
        }

        // Total concepts from catalog
        let total = 0;
        if (conceptsSnap.exists()) {
          const data = conceptsSnap.val();
          total = [
            ...Object.values(data.basic || {}),
            ...Object.values(data.intermediate || {}),
            ...Object.values(data.advanced || {}),
          ].length;
        }

        // Learned concepts
        let learnedConcepts = [];
        if (learnedSnap.exists()) {
          const val = learnedSnap.val() || [];
          learnedConcepts = Array.isArray(val) ? val : Object.values(val);
        }
        const learned = learnedConcepts.length;

        // Applied concepts: learned concepts that appear in any completed project.conceptUsed
        const conceptsUsedInProjects = new Set();
        projects.forEach(project => {
          if (project.conceptUsed) {
            project.conceptUsed.split(', ').map(c => c.trim()).forEach(c => { if (c) conceptsUsedInProjects.add(c); });
          }
        });
        const applied = learnedConcepts.filter(c => conceptsUsedInProjects.has(c.concept || c)).length;

        setPythonStats({ learned, applied, total });
      };

      // Fetch PowerBI data
      const fetchPowerBIData = async () => {
        const [projectsSnap, conceptsSnap, learnedSnap] = await Promise.all([
          get(ref(db, `users/${user.id}/powerbi/PowerBiCompletedProjects`)),
          get(ref(db, 'PowerBiProject/AllConcepts/category')),
          get(ref(db, `users/${user.id}/powerbi/learnedConcepts`))
        ]);

        // Completed projects
        let projects = [];
        if (projectsSnap.exists()) {
          projects = Object.values(projectsSnap.val() || {});
          setPowerbiProjects(projects);
        } else {
          setPowerbiProjects([]);
        }

        // Total concepts
        let total = 0;
        if (conceptsSnap.exists()) {
          const data = conceptsSnap.val();
          total = Object.values(data).reduce((acc, arr) => acc + Object.values(arr || {}).length, 0);
        }

        // Learned concepts
        let learnedConcepts = [];
        if (learnedSnap.exists()) {
          const val = learnedSnap.val() || [];
          learnedConcepts = Array.isArray(val) ? val : Object.values(val);
        }
        const learned = learnedConcepts.length;

        // Applied concepts
        const conceptsUsedInProjects = new Set();
        projects.forEach(project => {
          if (project.conceptUsed) {
            project.conceptUsed.split(', ').map(c => c.trim()).forEach(c => { if (c) conceptsUsedInProjects.add(c); });
          }
        });
        const applied = learnedConcepts.filter(c => conceptsUsedInProjects.has(c.concept || c)).length;

        setPowerbiStats({ learned, applied, total });
      };

      // Fetch Pandas data
      const fetchPandasData = async () => {
        const [projectsSnap, conceptsSnap, learnedSnap] = await Promise.all([
          get(ref(db, `users/${user.id}/pandas/PandasCompletedProjects`)),
          get(ref(db, 'PandasProject/AllConcepts/category')),
          get(ref(db, `users/${user.id}/pandas/learnedConcepts`))
        ]);

        // Completed projects
        let projects = [];
        if (projectsSnap.exists()) {
          projects = Object.values(projectsSnap.val() || {});
          setPandasProjects(projects);
        } else {
          setPandasProjects([]);
        }

        // Total concepts
        let total = 0;
        if (conceptsSnap.exists()) {
          const data = conceptsSnap.val();
          total = Object.values(data).reduce((acc, arr) => acc + Object.values(arr || {}).length, 0);
        }

        // Learned concepts
        let learnedConcepts = [];
        if (learnedSnap.exists()) {
          const val = learnedSnap.val() || [];
          learnedConcepts = Array.isArray(val) ? val : Object.values(val);
        }
        const learned = learnedConcepts.length;

        // Applied concepts
        const conceptsUsedInProjects = new Set();
        projects.forEach(project => {
          if (project.conceptUsed) {
            project.conceptUsed.split(', ').map(c => c.trim()).forEach(c => { if (c) conceptsUsedInProjects.add(c); });
          }
        });
        const applied = learnedConcepts.filter(c => conceptsUsedInProjects.has(c.concept || c)).length;

        setPandasStats({ learned, applied, total });
      };

      fetchPythonData();
      fetchPowerBIData();
      fetchPandasData();
    }
  }, [isLoaded, isSignedIn, user]);

  // Render skill card
  const renderSkillCard = (key, skillData, isCompact = false) => {
    // skillData could be either a string (skill name) or an object with skill details
    const skillName = typeof skillData === 'string' ? skillData : (skillData.label || key);
    let learned = 0, applied = 0, total = 0;
    
    if (key === 'python') {
      learned = pythonStats.learned;
      applied = pythonStats.applied;
      total = pythonStats.total;
    } else if (key === 'powerbi') {
      learned = powerbiStats.learned;
      applied = powerbiStats.applied;
      total = powerbiStats.total;
    } else if (key === 'pandas') {
      learned = pandasStats.learned;
      applied = pandasStats.applied;
      total = pandasStats.total;
    }
    
    if (isCompact) {
      const progress = total > 0 ? Math.round((learned / total) * 100) : 0;
      return (
        <Link to={skillData.route} key={key} className="block">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:border-indigo-100 transition-colors hover:shadow">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                {key === 'python' && <img src={python} alt="Python" className="w-6 h-6" />}
                {key === 'powerbi' && <img src={PowerBi} alt="Power BI" className="w-6 h-6" />}
                {key === 'pandas' && <span className="text-indigo-600 font-bold">PD</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{skillName}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{learned}/{total} concepts</span>
                  <span className="text-xs font-medium text-indigo-600">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-indigo-600 h-1.5 rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </Link>
      );
    }

    return (
      <Link to={skill.route} key={key} className="block">
        <motion.div 
          whileHover={{ y: -4 }}
          className="h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
        >
          <div className="p-6">
            <div className="flex items-center mb-4">
              {skill.img ? (
                <img src={skill.img} alt={skill.label} className="w-8 h-8 mr-3" />
              ) : (
                <span className="text-2xl mr-3">{skill.icon}</span>
              )}
              <h3 className="text-lg font-semibold text-gray-900">{skill.label}</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Concepts Learned</span>
                  <span className="font-medium text-gray-900">
                    {learned} / {total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${total > 0 ? Math.min(100, (learned / total) * 100) : 0}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Concepts Applied</span>
                  <span className="font-medium text-gray-900">
                    {applied} / {learned}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${learned > 0 ? Math.min(100, (applied / learned) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Skill Points</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {getSkillSP(key)} SP
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">No skills yet</h3>
      <p className="mt-1 text-sm text-gray-500">Get started by adding your first skill</p>
      <div className="mt-6">
        <Link
          to="/all-skills"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Skill
        </Link>
      </div>
    </div>
  );

  // Render profile section
  const renderProfileSection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center min-w-0">
              <div className="h-16 w-16 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-2xl text-indigo-600 font-semibold">
                {user?.firstName?.[0] || 'U'}
              </div>
              <div className="ml-4 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {user?.fullName || 'User'}
                </h3>
                <p className="text-sm text-gray-500 truncate w-full max-w-[180px]" title={user?.primaryEmailAddress?.emailAddress || 'user@example.com'}>
                  {user?.primaryEmailAddress?.emailAddress || 'user@example.com'}
                </p>
              </div>
            </div>
            <Link 
              to="/profile" 
              className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-50 flex-shrink-0"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>

      </div>
    </motion.div>
  );

  // Render quick actions
  const renderQuickActions = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="p-6">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h4>
        <div className="space-y-2">
          <Link
            to="/all-skills"
            className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
          >
            <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add New Skill
          </Link>
          <Link
            to="/profile"
            className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
          >
            <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            View My Projects
          </Link>
          <Link
            to="/progress"
            className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
          >
            <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Progress
          </Link>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 relative">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl animate-float" />
        <div className="absolute bottom-1/3 -left-20 w-80 h-80 bg-indigo-100 rounded-full opacity-40 blur-3xl animate-float animation-delay-2000" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-violet-100 rounded-full opacity-30 blur-3xl animate-float animation-delay-4000" />
      </div>

      <div className="relative z-10">
        <Navbar />
        
        <div className="flex pt-16 min-h-screen">
          {/* Fixed Sidebar - Outside the scrollable area */}
          <div className="hidden lg:block w-80 flex-shrink-0 p-6 pr-0 fixed left-0 top-16 bottom-0 overflow-y-auto">
            <div className="space-y-8">
              {renderProfileSection()}
              {renderQuickActions()}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-slate-800">My Learning</h2>
                  <Link 
                    to="/all-skills" 
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500"
                  >
                    + Add Skill
                  </Link>
                </div>
                <div className="space-y-4">
                  {startedSkills.length > 0 ? (
                    startedSkills.map(([key, skill]) => renderSkillCard(key, skill, true))
                  ) : (
                    <div className="text-sm text-gray-500">
                      No skills added yet. Click "+ Add Skill" to get started.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Scrollable area */}
          <div className="flex-1 lg:ml-80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Tab Navigation */}
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex justify-start mb-8"
              >
                <div className="flex space-x-1 bg-white/80 backdrop-blur-sm rounded-xl p-1.5 shadow-md">
                  {[
                    { id: 'feed', label: 'Learning Feed' },
                    { id: 'discover', label: 'Discover Students' },
                  ].map((tab) => (
                    <motion.button
                      key={tab.id}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === tab.id
                          ? 'bg-white shadow-sm text-indigo-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                      }`}
                      onClick={() => {
                        setActiveTab(tab.id);
                        localStorage.setItem('sted-active-tab', tab.id);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {tab.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Tab Content - Only this part will change */}
              <div className="w-full">
                {activeTab === 'feed' && <Feed />}
                {activeTab === 'discover' && <DiscoverStudents />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
