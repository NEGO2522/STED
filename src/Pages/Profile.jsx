import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useUser } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDatabase, ref, get, update, onValue } from 'firebase/database';
import { db } from '../firebase';
import python from "../assets/python.png";
import PowerBi from "../assets/PowerBi.png";
// No image for pandas, use emoji
const pandasIcon = <span className="text-2xl mr-2">🐼</span>;
import { Link } from 'react-router-dom';
import { useCallback } from 'react';
import { FaTimes } from 'react-icons/fa';
import UserListModal from '../components/UserListModal';

function Profile() {
    const navigate = useNavigate();
    const { isLoaded, isSignedIn, user } = useUser();
    const [userData, setUserData] = useState({
        level: '',
        xp: 0,
        tasksCompleted: 0,
        python: {},
        pandas: {},
        'data-science': {},
        'public-speaking': {},
        powerbi: {},
        projectHistory: [],
        observers: [],
        observing: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isObserving, setIsObserving] = useState(false);
    const [copiedProjectId, setCopiedProjectId] = useState(null);
    const [powerbiStats, setPowerbiStats] = useState({ learned: 0, applied: 0, total: 0 });
    const [pandasStats, setPandasStats] = useState({ learned: 0, applied: 0, total: 0 });
    const [pythonSP, setPythonSP] = useState(0);
    const [powerbiSP, setPowerbiSP] = useState(0);
    const [pandasSP, setPandasSP] = useState(0);
    const [dataScienceSP, setDataScienceSP] = useState(0);
    const [publicSpeakingSP, setPublicSpeakingSP] = useState(0);
    
    // User list modal state
    const [showUserList, setShowUserList] = useState(false);
    const [listType, setListType] = useState(''); // 'observers' or 'observing'
    const [listTitle, setListTitle] = useState('');

    // Handle showing the user list modal
    const handleShowUserList = (type) => {
        setListType(type);
        setListTitle(type === 'observers' ? 'Your Observers' : 'You Are Observing');
        setShowUserList(true);
    };

    // Close the user list modal
    const closeUserList = () => {
        setShowUserList(false);
        setListType('');
        setListTitle('');
    };

    // Get user IDs for the current list type
    const getUserIdsForList = () => {
        if (!userData) return [];
        return userData[listType] || [];
    };

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            navigate('/');
        }
    }, [isLoaded, isSignedIn, navigate]);

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            const userRef = ref(db, 'users/' + user.id);
            // Set up real-time listener
            const unsubscribe = onValue(userRef, async (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    // Fetch Python completed projects in real-time as well
                    let pythonProjects = [];
                    try {
                        const pythonProjectsRef = ref(db, 'users/' + user.id + '/python/PythonCompletedProjects');
                        onValue(pythonProjectsRef, (pythonProjectsSnap) => {
                            if (pythonProjectsSnap.exists()) {
                                pythonProjects = Object.values(pythonProjectsSnap.val() || {}).map(p => ({
                                    name: p.projectTitle || p.title || 'Python Project',
                                    description: p.description || '',
                                    completedDate: p.completedAt ? new Date(p.completedAt).toLocaleDateString() : '',
                                    sp: p.sp || 10, // fallback if not present
                                    skill: 'python',
                                    conceptUsed: p.conceptUsed || '',
                                    publicUrl: p.publicUrl || '',
                                }));
                            } else {
                                pythonProjects = [];
                            }
                            // Merge with existing projectHistory, avoid duplicates by name+skill
                            let mergedHistory = [...(data.projectHistory || [])];
                            pythonProjects.forEach(pyProj => {
                                if (!mergedHistory.some(ph => ph.name === pyProj.name && ph.skill === 'python')) {
                                    mergedHistory.push(pyProj);
                                }
                            });
                            setUserData({ ...data, projectHistory: mergedHistory });
                        });
                    } catch (e) { /* ignore */ }
                    // If no python projects, still update userData
                    if (!pythonProjects.length) {
                        setUserData({ ...data });
                    }
                    // Check if current user is observing this profile
                    if (data.observers && data.observers.includes(user.id)) {
                        setIsObserving(true);
                    }
                } else {
                    // console.log('No data available');
                }
                setIsLoading(false);
            });
            // Fetch PowerBI stats (learned, applied, total)
            const fetchPowerbiStats = async () => {
                let learnedConcepts = (userData.powerbi?.learnedConcepts) || [];
                if (typeof learnedConcepts === 'object' && !Array.isArray(learnedConcepts)) {
                    learnedConcepts = Object.values(learnedConcepts);
                }
                const learned = learnedConcepts.length;
                const conceptsUsed = new Set();
                (Object.values(userData.powerbi?.PowerBiCompletedProjects || {})).forEach(project => {
                    if (project.conceptUsed) {
                        project.conceptUsed.split(',').forEach(c => conceptsUsed.add(c.trim()));
                    }
                });
                const applied = learnedConcepts.filter(concept => conceptsUsed.has(concept.concept || concept)).length;
                let total = 0;
                try {
                    const allConceptsSnap = await get(ref(db, 'PowerBiProject/AllConcepts/category'));
                    if (allConceptsSnap.exists()) {
                        const data = allConceptsSnap.val();
                        total = Object.values(data).reduce((acc, arr) => acc + Object.values(arr || {}).length, 0);
                    }
                } catch (e) {}
                setPowerbiStats({ learned, applied, total });
            };
            // Fetch Pandas stats (learned, applied, total)
            const fetchPandasStats = async () => {
                let learnedConcepts = (userData.pandas?.learnedConcepts) || [];
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
            };
            fetchPowerbiStats();
            fetchPandasStats();
            return () => unsubscribe();
        }
    }, [isLoaded, isSignedIn, user, userData.powerbi]);

    const handleObserve = async () => {
        if (!user || !isSignedIn) return;

        const userRef = ref(db, 'users/' + user.id);
        const updates = {};

        if (isObserving) {
            // Remove from observers
            updates.observers = userData.observers.filter(id => id !== user.id);
            updates.observing = userData.observing.filter(id => id !== user.id);
        } else {
            // Add to observers
            updates.observers = [...(userData.observers || []), user.id];
            updates.observing = [...(userData.observing || []), user.id];
        }

        try {
            await update(userRef, updates);
            setIsObserving(!isObserving);
            setUserData(prev => ({
                ...prev,
                observers: updates.observers,
                observing: updates.observing
            }));
        } catch (error) {
            console.error('Error updating observers:', error);
        }
    };

    // Calculate SP for each skill
    const calculateSkillSP = (skillKey) => {
        switch (skillKey) {
            case 'python': 
                return pythonSP;
            case 'powerbi': 
                return powerbiSP;
            case 'pandas': 
                return pandasSP;
            case 'data-science':
                return dataScienceSP;
            case 'public-speaking':
                return publicSpeakingSP;
            default: 
                return 0;
        }
    };

    // Calculate total SP
    const calculateTotalSP = () => {
        return pythonSP + powerbiSP + pandasSP + dataScienceSP + publicSpeakingSP;
    };

    // Update SP calculations when stats or projects change
    useEffect(() => {
        // Calculate Python SP
        if (userData?.python) {
            const pythonProjects = Object.values(userData.python.PythonCompletedProjects || {});
            let learnedConcepts = userData.python.learnedConcepts || [];
            if (typeof learnedConcepts === 'object' && !Array.isArray(learnedConcepts)) {
                learnedConcepts = Object.values(learnedConcepts);
            }
            const learned = learnedConcepts.length;
            const conceptsUsed = new Set();
            pythonProjects.forEach(project => {
                if (project.conceptUsed) {
                    project.conceptUsed.split(',').forEach(c => conceptsUsed.add(c.trim()));
                }
            });
            const applied = learnedConcepts.filter(concept => conceptsUsed.has(concept.concept || concept)).length;
            setPythonSP(pythonProjects.length * 10 + learned * 2 + applied * 5);
        }

        // Calculate PowerBI SP
        const powerbiProjects = Object.values(userData?.powerbi?.PowerBiCompletedProjects || {});
        setPowerbiSP(powerbiProjects.length * 10 + powerbiStats.learned * 2 + powerbiStats.applied * 5);

        // Calculate Pandas SP
        const pandasProjects = Object.values(userData?.pandas?.PandasCompletedProjects || {});
        setPandasSP(pandasProjects.length * 10 + pandasStats.learned * 2 + pandasStats.applied * 5);

        // Calculate Data Science SP (from project history)
        const dataScienceProjects = userData?.projectHistory?.filter(p => p.skill === 'data-science') || [];
        setDataScienceSP(dataScienceProjects.reduce((acc, p) => acc + (p.sp || 0), 0));

        // Calculate Public Speaking SP (from project history)
        const publicSpeakingProjects = userData?.projectHistory?.filter(p => p.skill === 'public-speaking') || [];
        setPublicSpeakingSP(publicSpeakingProjects.reduce((acc, p) => acc + (p.sp || 0), 0));
    }, [userData, powerbiStats, pandasStats]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-slate-600 text-base">Loading your profile...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="sticky top-0 z-50 bg-white shadow-sm">
                <Navbar />
            </div>

            <div className="flex flex-col mt-16">
                <div className="p-8 flex justify-center">
                    <div className="w-full max-w-4xl">
                        {/* Profile Header */}
                        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                            
                                <div className="flex items-center space-x-6">
                                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                                        {user?.imageUrl ? (
                                            <img src={user.imageUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                                        ) : (
                                            <span className="text-4xl">👤</span>
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-slate-800">{user?.fullName || 'Student'}</h1>
                                        <p className="text-slate-600 text-left pt-2">Total SP: {calculateTotalSP()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center mt-10 text-sm space-x-4">
                                    <div 
                                        className="flex items-center cursor-pointer hover:text-blue-600 transition-colors"
                                        onClick={() => handleShowUserList('observers')}
                                    >
                                        <span className="text-slate-800 font-semibold hover:underline">{userData.observers?.length || 0}</span>
                                        <span className="text-slate-600 ml-2">Observers</span>
                                    </div>
                                    <div className="w-px h-4 bg-slate-200"></div>
                                    <div 
                                        className="flex items-center cursor-pointer hover:text-blue-600 transition-colors"
                                        onClick={() => handleShowUserList('observing')}
                                    >
                                        <span className="text-slate-800 font-semibold hover:underline">{userData.observing?.length || 0}</span>
                                        <span className="text-slate-600 ml-2">Observing</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* User List Modal */}
                            <AnimatePresence>
                                {showUserList && (
                                    <UserListModal 
                                        userIds={getUserIdsForList()}
                                        title={listTitle}
                                        onClose={closeUserList}
                                    />
                                )}
                            </AnimatePresence>
                       

                        {/* Skills Grid */}
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
                          if (startedSkills.length === 0) return <div className="text-center text-slate-500 col-span-full py-8">No skills started yet.</div>;
                          return (
                            <div className={gridClass}>
                              {startedSkills.map(([key, skill]) => {
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
                                  learned = 0;
                                  applied = 0;
                                  total = 0;
                                }
                                return (
                                  <Link to={skill.route} key={key}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center mb-3">
                                        {skill.img ? <img src={skill.img} alt={skill.label} className="w-6 h-6 mr-2" /> : skill.icon}
                                        <h2 className="text-lg font-semibold text-slate-800">{skill.label}</h2>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm text-slate-600">Concepts learned</span>
                                            <span className="text-sm font-medium text-slate-800">{learned}/{total}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                                            <div className={`h-1.5 rounded-full ${key === 'python' ? 'bg-purple-600' : key === 'powerbi' ? 'bg-blue-600' : key === 'data-science' ? 'bg-green-600' : 'bg-yellow-500'}`} style={{ width: `${total > 0 ? (learned / total) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>
                                    {/* Concepts Applied */}
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm mt-3 text-slate-600">Concepts applied</span>
                                            <span className="text-sm font-medium text-slate-800">{applied}/{learned}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                                            <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${learned > 0 ? (applied / learned) * 100 : 0}%` }}></div>
                                          </div>
                                        </div>
                                        <p className="text-sm text-slate-600">SP Earned: {calculateSkillSP(key)}</p>
                                </div>
                            </motion.div>
                            </Link>
                                );
                              })}
                                </div>
                          );
                        })()}

                        {/* Project History */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-slate-800">Project History</h2>
                                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                    {userData.projectHistory?.length || 0} Projects
                                </div>
                            </div>
                            <div className="space-y-6">
                                {userData.projectHistory && userData.projectHistory.length > 0 ? (
                                    userData.projectHistory.map((project, index) => (
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
                                                    {project.skill === 'pandas' && <span className="text-2xl">🐼</span>}
                                                    {project.skill === 'data-science' && <span className="text-xl">📊</span>}
                                                    {project.skill === 'public-speaking' && <span className="text-xl">🎤</span>}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-medium text-slate-800">{project.name}</h3>
                                                <p className="text-slate-600 text-sm">{project.description}</p>
                                                <div className="flex items-center mt-2 space-x-4">
                                                    <span className="text-sm text-slate-500">{project.completedDate}</span>
                                                    <span className="text-sm font-medium text-green-600">+{project.sp} SP</span>
                                                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                        {project.skill.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    </span>
                                                </div>
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
                                                            style={{fontWeight: 500 }}
                                                        >
                                                            Preview
                                                        </a>
                                                    </>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <p className="text-slate-600 text-center">No projects completed yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile; 