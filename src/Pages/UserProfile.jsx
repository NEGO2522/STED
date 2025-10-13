import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import python from "../assets/python.png";
import PowerBi from "../assets/PowerBi.png";
// No image for pandas, use emoji
const pandasIcon = <span className="text-2xl mr-2">🐼</span>;
import learned from "../assets/learned.png";
import applied from "../assets/applied.png";
import { db } from '../firebase';
import { ref, get, set, onValue } from 'firebase/database';
import { getProjectConfig } from '../PythonProject/projectConfig';
import { FaChevronDown, FaUser, FaUserCheck, FaTimes } from 'react-icons/fa';
import { useUser } from '@clerk/clerk-react';

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [activeSkillDetailTab, setActiveSkillDetailTab] = useState('projects');
  const skillDetailRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [pythonProjectTitles, setPythonProjectTitles] = useState({});
  const [openLearnedCategory, setOpenLearnedCategory] = useState(null);
  const [openAppliedCategory, setOpenAppliedCategory] = useState(null);
  const [copiedProjectId, setCopiedProjectId] = useState(null);
  const [powerbiStats, setPowerbiStats] = useState({ learned: 0, applied: 0, total: 0 });
  const [pandasStats, setPandasStats] = useState({ learned: 0, applied: 0, total: 0 });
  const [showUserList, setShowUserList] = useState(false);
  const [userList, setUserList] = useState([]);
  const [listTitle, setListTitle] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { user } = useUser();

  // Function to fetch user data for the list
  const fetchUserList = async (userIds, title) => {
    if (!userIds || userIds.length === 0) {
      setUserList([]);
      setListTitle(title);
      setShowUserList(true);
      return;
    }

    setLoadingUsers(true);
    try {
      const usersData = [];
      for (const userId of userIds) {
        const userRef = ref(db, `users/${userId}`);
        const userSnap = await get(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.val();
          usersData.push({
            id: userId,
            name: userData.name || userData.username || 'User',
            email: userData.email || userData.emailAddress || '',
            avatar: userData.avatar || '👤',
            level: userData.level || 'Beginner'
          });
        }
      }
      setUserList(usersData);
      setListTitle(title);
      setShowUserList(true);
    } catch (error) {
      console.error('Error fetching user list:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Function to handle opening the observers list
  const handleShowObservers = () => {
    fetchUserList(userData?.observers || [], 'People Who Are Observing You');
  };

  // Function to handle opening the observing list
  const handleShowObserving = () => {
    fetchUserList(userData?.observing || [], 'People You Are Observing');
  };

  // Close the user list modal
  const closeUserList = () => {
    setShowUserList(false);
    setUserList([]);
    setListTitle('');
  };

  useEffect(() => {
    let unsubscribe;
    const userRef = ref(db, 'users/' + id);
    unsubscribe = onValue(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const skills = ['python', 'powerbi', 'pandas', 'data-science', 'public-speaking'].filter(k => data[k]);
        const projectHistory = data.projectHistory || [];
        setUserData({
          id,
          name: data.name || data.fullName || data.username || 'Student',
          avatar: data.avatar || '👤',
          level: data.level || '',
          email: data.email || data.emailAddress || '',
          skills: skills.length > 0 ? skills : ['no skills'],
          conceptsLearned: (data.python?.learnedConcepts ? Object.keys(data.python.learnedConcepts).length : 0),
          projectsCompleted: projectHistory.length,
          isOnline: true,
          lastActive: '',
          observers: data.observers || [],
          observing: data.observing || [],
          projectHistory,
          python: data.python || {},
          powerbi: data.powerbi || {},
          pandas: data.pandas || {},
          'data-science': data['data-science'] || {},
          'public-speaking': data['public-speaking'] || {},
        });
      } else {
        setUserData(null);
      }
      setLoading(false);
    }, (error) => {
      setLoading(false);
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [id]);

  useEffect(() => {
    async function fetchPowerbiStats() {
      if (!userData || !userData.powerbi) return;
      // Get learned concepts
      let learnedConcepts = userData.powerbi?.learnedConcepts || [];
      if (typeof learnedConcepts === 'object' && !Array.isArray(learnedConcepts)) {
        learnedConcepts = Object.values(learnedConcepts);
      }
      const learned = learnedConcepts.length;
      // Applied: count learned concepts that are used in any completed project
      const conceptsUsed = new Set();
      (Object.values(userData.powerbi?.PowerBiCompletedProjects || {})).forEach(project => {
        if (project.conceptUsed) {
          project.conceptUsed.split(',').forEach(c => conceptsUsed.add(c.trim()));
        }
      });
      const applied = learnedConcepts.filter(concept => conceptsUsed.has(concept.concept || concept)).length;
      // Fetch total concepts from PowerBiProject/AllConcepts/category
      let total = 0;
      try {
        const allConceptsSnap = await get(ref(db, 'PowerBiProject/AllConcepts/category'));
        if (allConceptsSnap.exists()) {
          const data = allConceptsSnap.val();
          total = Object.values(data).reduce((acc, arr) => acc + Object.values(arr || {}).length, 0);
        }
      } catch (e) {}
      setPowerbiStats({ learned, applied, total });
    }
    async function fetchPandasStats() {
      if (!userData || !userData.pandas) return;
      let learnedConcepts = userData.pandas?.learnedConcepts || [];
      if (typeof learnedConcepts === 'object' && !Array.isArray(learnedConcepts)) {
        learnedConcepts = Object.values(learnedConcepts);
      }
      const learned = learnedConcepts.length;
      const conceptsUsed = new Set();
      (Object.values(userData.pandas?.PandasCompletedProjects || {})).forEach(project => {
        if (project.conceptUsed) {
          project.conceptUsed.split(',').forEach(c => conceptsUsed.add(c.trim()));
        }
      });
      const applied = learnedConcepts.filter(concept => conceptsUsed.has(concept.concept || concept)).length;
      let total = 0;
      try {
        const allConceptsSnap = await get(ref(db, 'PandasProject/AllConcepts/category'));
        if (allConceptsSnap.exists()) {
          const data = allConceptsSnap.val();
          total = Object.values(data).reduce((acc, arr) => acc + Object.values(arr || {}).length, 0);
        }
      } catch (e) {}
      setPandasStats({ learned, applied, total });
    }
    fetchPowerbiStats();
    fetchPandasStats();
  }, [userData]);

  useEffect(() => {
    if (selectedSkill) {
      setActiveSkillDetailTab('projects');
      setTimeout(() => {
        if (skillDetailRef.current) {
          // Calculate the offset to scroll so the skill name is just below the top
          const rect = skillDetailRef.current.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const offset = rect.top + scrollTop - 20; // 20px below the top
          window.scrollTo({ top: offset, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [selectedSkill]);

  // Fetch missing Python project titles on mount or when userData changes
  useEffect(() => {
    async function fetchTitles() {
      if (!userData?.python?.PythonCompletedProjects) return;
      const pythonProjects = Object.entries(userData.python.PythonCompletedProjects);
      const titles = {};
      for (const [key, project] of pythonProjects) {
        if (project.projectTitle) {
          titles[key] = project.projectTitle;
        } else {
          // Try to fetch from config
          const config = await getProjectConfig(key);
          titles[key] = config?.title || key;
        }
      }
      setPythonProjectTitles(titles);
    }
    fetchTitles();
  }, [userData?.python?.PythonCompletedProjects]);

  const calculateTotalSP = () => {
    if (!userData.projectHistory) return 0;
    return userData.projectHistory.reduce((acc, project) => acc + (project.sp || 0), 0);
  };
  const calculateSkillSP = (skill) => {
    if (!userData.projectHistory) return 0;
    return userData.projectHistory.filter(project => project.skill === skill).reduce((acc, project) => acc + (project.sp || 0), 0);
  };

  // Calculate Python SP and total SP using the same logic as /python and /home
  const getPythonSP = () => {
    if (!userData || !userData.python) return 0;
    const pythonProjects = userData.python.PythonCompletedProjects ? Object.values(userData.python.PythonCompletedProjects) : [];
    let learnedConcepts = userData.python.learnedConcepts || [];
    if (typeof learnedConcepts === 'object' && !Array.isArray(learnedConcepts)) {
      learnedConcepts = Object.values(learnedConcepts);
    }
    const learned = learnedConcepts.length;
    // Applied: count learned concepts that are used in any completed project
    const conceptsUsed = new Set();
    pythonProjects.forEach(project => {
      if (project.conceptUsed) {
        project.conceptUsed.split(',').forEach(c => conceptsUsed.add(c.trim()));
      }
    });
    const applied = learnedConcepts.filter(concept => conceptsUsed.has(concept.concept || concept)).length;
    return pythonProjects.length * 10 + learned * 2 + applied * 5;
  };

  const getTotalSP = () => {
    let totalSP = getPythonSP();
    if (userData && userData.projectHistory) {
      const otherSkills = ['data-science', 'public-speaking', 'powerbi'];
      otherSkills.forEach(skill => {
        totalSP += userData.projectHistory
          .filter(project => project.skill === skill)
          .reduce((acc, project) => acc + (project.sp || 0), 0);
      });
    }
    return totalSP;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-2xl text-slate-600 mb-4">Loading profile...</div>
      </div>
    );
  }
  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-2xl text-slate-600 mb-4">Student not found</div>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-purple-600 text-white rounded-lg">Go Back</button>
      </div>
    );
  }

  const renderSkillDetails = () => {
    if (!selectedSkill) return null;

    const skillNameMapping = {
      'python': 'Python',
      'powerbi': 'Power BI',
      'data-science': 'Data Science',
      'public-speaking': 'Public Speaking'
    };

    const skillName = skillNameMapping[selectedSkill];
    let projects = [], sp = 0, learned = 0, applied = 0, total = 0, learnedConcepts = [], appliedConcepts = [];
    if (selectedSkill === 'python') {
      projects = userData.python?.PythonCompletedProjects ? Object.values(userData.python.PythonCompletedProjects) : [];
      sp = projects.length * 10;
      learnedConcepts = userData.python?.learnedConcepts || [];
      if (typeof learnedConcepts === 'object' && !Array.isArray(learnedConcepts)) {
        learnedConcepts = Object.values(learnedConcepts);
      }
      learned = learnedConcepts.length;
      // Applied: count learned concepts that are used in any completed project
      const conceptsUsed = new Set();
      projects.forEach(project => {
        if (project.conceptUsed) {
          project.conceptUsed.split(',').forEach(c => conceptsUsed.add(c.trim()));
        }
      });
      appliedConcepts = learnedConcepts.filter(concept => conceptsUsed.has(concept.concept || concept));
      applied = appliedConcepts.length;
      total = 15 + 20 + 15; // basic + intermediate + advanced
    } else {
      projects = userData.projectHistory?.filter(p => p.skill === selectedSkill) || [];
      sp = projects.reduce((acc, project) => acc + (project.sp || 0), 0);
      // For other skills, use available data or show message
      learnedConcepts = projects.length > 0 && projects[0].learnedConceptsList ? projects[0].learnedConceptsList : [];
      learned = learnedConcepts.length;
      appliedConcepts = projects.length > 0 && projects[0].appliedConceptsList ? projects[0].appliedConceptsList : [];
      applied = appliedConcepts.length;
      total = projects.length > 0 && projects[0].totalConcepts ? projects[0].totalConcepts : 0;
    }

    const detailContent = {
      projects: (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h4 className="text-lg font-semibold text-slate-800 mb-2">{skillName} Projects</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {projects.length > 0 ? projects.map((p, i) => (
              <div key={i} className="bg-slate-100 rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium text-slate-800">{p.name || p.projectTitle || p._projectKey}</div>
                  <div className="text-slate-600 text-sm">{p.description}</div>
                  <div className="flex items-center text-xs text-slate-500 mt-1">
                    <span>
                      {p.completedDate || p.completedAt ? (
                        <>
                          {new Date(p.completedDate || p.completedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          <span className="mx-1">|</span>
                          {new Date(p.completedDate || p.completedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </>
                      ) : null}
                    </span>
                    <span className="mx-2">|</span>
                    <span>+10 SP</span>
                  </div>
                </div>
                {/* Share/Preview buttons for Python projects */}
                {selectedSkill === 'python' && p.publicUrl && (
                  <div className="flex gap-2 mt-2 md:mt-0 md:ml-4">
                    <button
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-xs font-semibold border border-purple-200 transition-colors"
                      onClick={() => {
                        const url = p.publicUrl.replace('/public/python-project/', '/python-project/');
                        navigator.clipboard.writeText(window.location.origin + url);
                        setCopiedProjectId(p._projectKey);
                        setTimeout(() => setCopiedProjectId(null), 1500);
                      }}
                    >
                      {copiedProjectId === p._projectKey ? 'Copied!' : 'Share'}
                    </button>
                    <a
                      href={p.publicUrl.replace('/public/python-project/', '/python-project/')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-semibold border border-blue-200 transition-colors"
                      style={{ fontWeight: 500 }}
                    >
                      Preview
                    </a>
                  </div>
                )}
              </div>
            )) : <div className="text-slate-500">No projects completed yet.</div>}
          </div>
        </motion.div>
      ),
      learned: (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h4 className="text-lg font-semibold text-slate-800 mb-2">Concepts Learned in {skillName}</h4>
          {['basic', 'intermediate', 'advanced'].map((category) => {
            const categoryConcepts = learnedConcepts.filter(c => c.category === category);
            const isOpen = openLearnedCategory === category;
            if (categoryConcepts.length === 0) return null;
            return (
              <div key={category} className="bg-slate-50 p-3 rounded-lg shadow-sm mb-2">
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => setOpenLearnedCategory(isOpen ? null : category)}
                >
                  <div className='text-base font-medium text-slate-700 capitalize'>
                    {category} <span className='font-normal text-slate-500'>({categoryConcepts.length})</span>
                  </div>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <FaChevronDown className='text-slate-500' />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: '12px' }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden list-disc pl-6 space-y-1"
                    >
                      {categoryConcepts.map((c, i) => (
                        <li
                          key={i}
                          className="w-full flex items-center justify-between bg-slate-100 rounded-lg px-4 py-2 shadow-sm border border-slate-200 cursor-pointer hover:bg-green-100 transition-colors mb-1"
                        >
                          <span className="font-medium text-slate-700 truncate block max-w-full" style={{overflowWrap: 'anywhere'}}>{c.concept || c}</span>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {learnedConcepts.length === 0 && <div className="text-slate-500">No concepts learned yet.</div>}
        </motion.div>
      ),
      applied: (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h4 className="text-lg font-semibold text-slate-800 mb-2">Concepts Applied in {skillName}</h4>
          {['basic', 'intermediate', 'advanced'].map((category) => {
            const categoryConcepts = appliedConcepts.filter(c => c.category === category);
            const isOpen = openAppliedCategory === category;
            if (categoryConcepts.length === 0) return null;
            return (
              <div key={category} className="bg-slate-50 p-3 rounded-lg shadow-sm mb-2">
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => setOpenAppliedCategory(isOpen ? null : category)}
                >
                  <div className='text-base font-medium text-slate-700 capitalize'>
                    {category} <span className='font-normal text-slate-500'>({categoryConcepts.length})</span>
                  </div>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <FaChevronDown className='text-slate-500' />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: '12px' }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden list-disc pl-6 space-y-1"
                    >
                      {categoryConcepts.map((c, i) => (
                        <li
                          key={i}
                          className="w-full flex items-center justify-between bg-slate-100 rounded-lg px-4 py-2 shadow-sm border border-slate-200 cursor-pointer hover:bg-yellow-100 transition-colors mb-1"
                        >
                          <span className="font-medium text-slate-700 truncate block max-w-full" style={{overflowWrap: 'anywhere'}}>{c.concept || c}</span>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {appliedConcepts.length === 0 && <div className="text-slate-500">No concepts applied in projects yet.</div>}
        </motion.div>
      )
    };

    return (
      <motion.div ref={skillDetailRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-slate-50 rounded-lg p-6 border border-slate-200 relative">
        {/* Skill Detail Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold text-slate-800">{skillName}</span>
          </div>
          <button onClick={() => setSelectedSkill(null)} className="text-slate-500 hover:text-slate-800 z-10 text-lg ml-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Skill Switcher Row */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            className="px-3 py-1 rounded-full text-sm font-medium border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
            onClick={() => setSelectedSkill(null)}
          >
            All Skills
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm font-medium border ${selectedSkill === 'python' ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
            onClick={() => setSelectedSkill('python')}
          >
            Python
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm font-medium border ${selectedSkill === 'powerbi' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
            onClick={() => setSelectedSkill('powerbi')}
          >
            Power BI
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm font-medium border ${selectedSkill === 'data-science' ? 'bg-green-600 text-white border-green-600' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
            onClick={() => setSelectedSkill('data-science')}
          >
            Data Science
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm font-medium border ${selectedSkill === 'public-speaking' ? 'bg-yellow-500 text-white border-yellow-500' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
            onClick={() => setSelectedSkill('public-speaking')}
          >
            Public Speaking
          </button>
        </div>
        {/* Metric Boxes */}
        <div className="flex flex-row justify-center gap-8 mb-8">
          {/* Projects Completed */}
          <div
            onClick={() => setActiveSkillDetailTab('projects')}
            className={`bg-white rounded-lg shadow-md h-24 w-80 max-w-xs flex flex-col justify-center items-center cursor-pointer transition-all relative ${activeSkillDetailTab === 'projects' ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:shadow-md'}`}
          >
            <div className="flex flex-col justify-center items-center w-full h-full">
              <p className="text-sm text-slate-600">Projects Completed</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{projects.length}</h3>
            </div>
            <div className="absolute top-3 right-3 bg-purple-50 p-2 rounded-full"></div>
          </div>
          {/* Concepts Learned */}
          <div
            onClick={() => setActiveSkillDetailTab('learned')}
            className={`bg-white rounded-lg shadow-md h-24 w-80 max-w-xs flex flex-col justify-center items-center cursor-pointer transition-all relative ${activeSkillDetailTab === 'learned' ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:shadow-md'}`}
          >
            <div className="flex flex-col justify-center items-center w-full h-full">
              <p className="text-sm text-slate-600">Concepts Learned</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{learned}{total ? `/${total}` : ''}</h3>
            </div>
            <div className="absolute top-3 right-3 bg-purple-50 p-2 rounded-full"></div>
          </div>
          {/* Concepts Applied */}
          <div
            onClick={() => setActiveSkillDetailTab('applied')}
            className={`bg-white rounded-lg shadow-md h-24 w-80 max-w-xs flex flex-col justify-center items-center cursor-pointer transition-all relative ${activeSkillDetailTab === 'applied' ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:shadow-md'}`}
          >
            <div className="flex flex-col justify-center items-center w-full h-full">
              <p className="text-sm text-slate-600">Concepts Applied</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{applied}{learned ? `/${learned}` : ''}</h3>
            </div>
            <div className="absolute top-3 right-3 bg-yellow-50 p-2 rounded-full"></div>
          </div>
        </div>

        {/* Detail Content Area */}
        <div className="bg-white rounded-lg shadow-md p-6 min-h-[200px]">
          {detailContent[activeSkillDetailTab]}
        </div>
      </motion.div>
    );
  };

  // User List Modal Component
  const UserListModal = () => (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-lg rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{listTitle}</h3>
          <button 
            onClick={closeUserList}
            className="text-gray-400 hover:text-gray-500"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-4">
          {loadingUsers ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
            </div>
          ) : userList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaUser className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2">No users to display</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {userList.map((user) => (
                <li key={user.id} className="py-3 flex items-center hover:bg-gray-50 px-2 rounded">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                    {user.avatar}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.level} • {user.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={closeUserList}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pt-16">
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <Navbar />
      </div>
      <div className="flex">
        <div className="w-full p-8 flex justify-center">
          <div className="w-full max-w-4xl">
            {/* Profile Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex items-center space-x-6 w-full">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl">{userData.avatar}</span>
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div className='text-left'>
                    <h1 className="text-2xl font-bold text-slate-800">{userData.name}</h1>
                    {userData.email && (
                      <p className="text-slate-500 text-sm pt-1">{userData.email}</p>
                    )}
                    <div className="flex flex-col gap-1 pt-2">
                      <span className="text-slate-600 text-left">Total SP: <span className="font-semibold">{getTotalSP()}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div 
                      className="text-center cursor-pointer hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
                      onClick={handleShowObserving}
                    >
                      <div className="text-sm font-medium text-gray-500">Observing</div>
                      <div className="text-lg font-semibold text-purple-600 hover:text-purple-700">{userData.observing?.length || 0}</div>
                    </div>
                    <div className="h-10 w-px bg-gray-200"></div>
                    <div 
                      className="text-center cursor-pointer hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
                      onClick={handleShowObservers}
                    >
                      <div className="text-sm font-medium text-gray-500">Observers</div>
                      <div className="text-lg font-semibold text-purple-600 hover:text-purple-700">
                        {userData.observers?.length || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* User List Modal */}
              <AnimatePresence>
                {showUserList && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50"
                  >
                    <UserListModal />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Skills Grid */}
            {selectedSkill ? renderSkillDetails() : (
              <>
                {(() => {
                  const skillMap = {
                    'python': { node: 'python', currentProjectField: 'PythonCurrentProject', img: python, label: 'Python', route: '/python' },
                    'data-science': { node: 'data-science', currentProjectField: 'DataScienceCurrentProject', img: null, label: 'Data Science', icon: <span className="text-xl mr-2">📊</span>, route: '/data-science' },
                    'public-speaking': { node: 'public-speaking', currentProjectField: 'PublicSpeakingCurrentProject', img: null, label: 'Public Speaking', icon: <span className="text-xl mr-2">🎤</span>, route: '/public-speaking' },
                    'powerbi': { node: 'powerbi', currentProjectField: 'PowerBiCurrentProject', img: PowerBi, label: 'Power BI', route: '/powerbi' },
                    'pandas': { node: 'pandas', currentProjectField: 'PandasCurrentProject', img: null, label: 'Pandas', icon: pandasIcon, route: '/pandas' },
                  };
                  const startedSkills = Object.entries(skillMap).filter(([key, skill]) =>
                    userData && userData[skill.node] && userData[skill.node][skill.currentProjectField]
                  );
                  const gridClass = startedSkills.length === 1 ? 'grid grid-cols-1 gap-4 mb-6' : 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-6';
                  return (
                    <div className={gridClass}>
                      {/* Show only started skills, matching /profile logic */}
                      {(() => {
                        const skillMap = {
                          'python': {
                            node: 'python',
                            currentProjectField: 'PythonCurrentProject',
                            img: python,
                            label: 'Python',
                            route: '/python',
                          },
                          'powerbi': {
                            node: 'powerbi',
                            currentProjectField: 'PowerBiCurrentProject',
                            img: PowerBi,
                            label: 'Power BI',
                            route: '/powerbi',
                          },
                          'pandas': {
                            node: 'pandas',
                            currentProjectField: 'PandasCurrentProject',
                            img: null,
                            label: 'Pandas',
                            icon: <span className="text-2xl mr-2">🐼</span>,
                            route: '/pandas',
                          },
                          'data-science': {
                            node: 'data-science',
                            currentProjectField: 'DataScienceCurrentProject',
                            img: null,
                            label: 'Data Science',
                            icon: <span className="text-xl mr-2">📊</span>,
                            route: '/data-science',
                          },
                          'public-speaking': {
                            node: 'public-speaking',
                            currentProjectField: 'PublicSpeakingCurrentProject',
                            img: null,
                            label: 'Public Speaking',
                            icon: <span className="text-xl mr-2">🎤</span>,
                            route: '/public-speaking',
                          },
                        };
                        const startedSkills = Object.entries(skillMap).filter(([key, skill]) =>
                          userData && userData[skill.node] && userData[skill.node][skill.currentProjectField]
                        );
                        if (startedSkills.length === 0) return <div className="text-center text-slate-500 col-span-full py-8">No skills started yet.</div>;
                        return startedSkills.map(([key, skill]) => {
                          // Calculate learned/applied and total for Python
                          let learned = 0, applied = 0, total = 0;
                          if (key === 'python') {
                            let learnedConcepts = userData.python?.learnedConcepts || [];
                            if (typeof learnedConcepts === 'object' && !Array.isArray(learnedConcepts)) {
                              learnedConcepts = Object.values(learnedConcepts);
                            }
                            learned = learnedConcepts.length;
                            const conceptsUsed = new Set();
                            (Object.values(userData.python?.PythonCompletedProjects || {})).forEach(project => {
                              if (project.conceptUsed) {
                                project.conceptUsed.split(',').forEach(c => conceptsUsed.add(c.trim()));
                              }
                            });
                            applied = learnedConcepts.filter(concept => conceptsUsed.has(concept.concept || concept)).length;
                            total = 15 + 20 + 15;
                          } else if (key === 'powerbi') {
                            learned = powerbiStats.learned;
                            applied = powerbiStats.applied;
                            total = powerbiStats.total;
                          } else if (key === 'pandas') {
                            learned = pandasStats.learned;
                            applied = pandasStats.applied;
                            total = pandasStats.total;
                          } else {
                            learned = 8;
                            applied = 2;
                            total = 50;
                          }
                          return (
                            <React.Fragment key={key}>
                              <div
                                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => setSelectedSkill(key)}
                              >
                  <div className="flex items-center mb-3">
                                  {skill.img ? <img src={skill.img} alt={skill.label} className="w-6 h-6 mr-2" /> : skill.icon}
                                  <h3 className="text-lg font-semibold text-slate-800">{skill.label}</h3>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-slate-600">Concepts learned</span>
                                      <span className="text-sm font-medium text-slate-800">{learned}/{total}</span>
                      </div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 min-w-0">
                                      <div
                                        className={`h-1.5 rounded-full ${key === 'python' ? 'bg-purple-600' : key === 'powerbi' ? 'bg-blue-600' : key === 'data-science' ? 'bg-green-600' : 'bg-yellow-500'}`}
                                        style={{ width: `${total > 0 ? (learned / total) * 100 : 0}%` }}
                                      ></div>
                      </div>
                    </div>
                    <div>
                                    <div className="flex justify-between mt-5 mb-1">
                        <span className="text-sm text-slate-600">Concepts applied</span>
                                      <span className="text-sm font-medium text-slate-800">{applied}/{learned}</span>
                      </div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 min-w-0">
                                      <div
                                        className="bg-yellow-400 h-1.5 rounded-full max-w-full transition-all duration-300"
                                        style={{ width: `${learned > 0 ? (applied / learned) * 100 : 0}%` }}
                                      ></div>
                      </div>
                    </div>
                                  <p className="text-sm text-slate-600">SP Earned: <span className="">{getPythonSP()}</span></p>
                      </div>
                    </div>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </div>
                  );
                })()}
              {/* Project History */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-slate-800">Project History</h2>
                  <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                      {/* Count merged projects */}
                      {(() => {
                        const pythonProjects = userData.python?.PythonCompletedProjects ? Object.values(userData.python.PythonCompletedProjects) : [];
                        const otherProjects = userData.projectHistory || [];
                        return pythonProjects.length + otherProjects.length;
                      })()} Projects
                    </div>
                  </div>
                  <div className="space-y-6 text-left">
                    {(() => {
                      const pythonProjects = userData.python?.PythonCompletedProjects ? Object.entries(userData.python.PythonCompletedProjects).map(([key, p]) => ({...p, skill: 'python', _projectKey: key})) : [];
                      const otherProjects = userData.projectHistory || [];
                      // Merge and sort by completedDate if available, else by name
                      const allProjects = [...pythonProjects, ...otherProjects];
                      if (allProjects.length === 0) return <p className="text-slate-600 text-center">No projects completed yet.</p>;
                      // Optionally sort by date descending
                      allProjects.sort((a, b) => {
                        if (a.completedDate && b.completedDate) {
                          return new Date(b.completedDate) - new Date(a.completedDate);
                        }
                        return (b.name || '').localeCompare(a.name || '');
                      });
                      return allProjects.map((project, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start space-x-4 border-b border-slate-200 pb-4 last:border-0"
                      >
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            {project.skill === 'python' && <img src={python} alt="Python" className="w-6 h-6" />}
                            {project.skill === 'powerbi' && <img src={PowerBi} alt="Power BI" className="w-6 h-6" />}
                            {project.skill === 'data-science' && <span className="text-xl">📊</span>}
                            {project.skill === 'public-speaking' && <span className="text-xl">🎤</span>}
                          </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium text-slate-800">
                                {project.skill === 'python'
                                  ? (project.projectTitle || pythonProjectTitles[project._projectKey] || project._projectKey)
                                  : project.name}
                              </h3>
                              <span className="text-sm text-slate-500 text-right min-w-fit">
                                {project.completedAt ? (
                                  <>
                                    {new Date(project.completedAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                    <span className="mx-1">|</span>
                                    {new Date(project.completedAt).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </>
                                ) : null}
                              </span>
                            </div>
                          <p className="text-slate-600 text-sm">{project.description}</p>
                          <div className="flex items-center mt-2 space-x-4">
                              <span className="text-sm font-medium text-green-600">+10 SP</span>
                            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                {project.skill && project.skill.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                              {/* Share button for Python projects with publicUrl */}
                              {project.skill === 'python' && project.publicUrl && (
                                <>
                                  <button
                                    className="ml-2 px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-xs font-semibold border border-purple-200 transition-colors"
                                    onClick={() => {
                                      // Ensure the URL uses /python-project/ instead of /public/python-project/
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
                                    className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-semibold border border-blue-200 transition-colors"
                                    style={{ fontWeight: 500 }}
                                  >
                                    Preview
                                  </a>
                                </>
                              )}
                          </div>
                        </div>
                      </motion.div>
                      ));
                    })()}
                </div>
              </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 