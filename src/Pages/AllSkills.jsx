import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, get, update } from 'firebase/database';
import { db } from '../firebase';
import { FiArrowRight, FiCheckCircle, FiPlay, FiClock, FiAward, FiBarChart2 } from 'react-icons/fi';
import Navbar from '../components/Navbar';

// Skill Icons
const skillIcons = {
  // Technical Skills
  'python': '🐍',
  'data-science': '📊',
  'powerbi': '📈',
  'pandas': '🐼',
  'public-speaking': '🎤',
  // Government Exam Preparation
  'upsc': '🏛️',
  'teaching': '👨‍🏫',
  // Business & Management
  // Language & Communication
  'english': '🇬🇧',
  'hindi': '🇮🇳'
};

const skillTitles = {
  // Technical Skills
  'python': 'Python Programming',
  'data-science': 'Data Science',
  'powerbi': 'Power BI',
  'pandas': 'Pandas',
  'public-speaking': 'Public Speaking',
  // Government Exam Preparation
  'upsc': 'UPSC Civil Services',
  'teaching': 'Teaching Aptitude',
  // Business & Management
  // Language & Communication
  'english': 'English Proficiency',
  'hindi': 'Hindi Language',
  // Creative Skills
  'graphic-design': 'Graphic Design'
};

const skillDescriptions = {
  // Technical Skills
  'python': 'Master Python programming from basics to advanced concepts including data structures, algorithms, and object-oriented programming',
  'data-science': 'Master the complete data science workflow: data cleaning, exploratory analysis, statistical modeling, and machine learning using Python and popular libraries',
  'powerbi': 'Transform raw data into interactive dashboards and reports with Microsoft Power BI. Learn data modeling, DAX formulas, and visualization best practices',
  'pandas': 'Become proficient in data manipulation and analysis using Pandas. Learn to clean, transform, and analyze structured data efficiently',
  'public-speaking': 'Develop confident public speaking and presentation skills through practical exercises and expert guidance',
  // Government Exam Preparation
  'upsc': 'Comprehensive preparation for UPSC Civil Services Examination including General Studies, CSAT, and interview preparation',
  'teaching': 'Master teaching methodologies, classroom management, and educational psychology for various teaching exams',
  // Business & Management
  // Language & Communication
  'english': 'Improve your English speaking, writing, and comprehension skills for professional and personal growth',
  'hindi': 'Learn Hindi language fundamentals, grammar, and conversation skills for better communication',
};


function AllSkills() {
    const navigate = useNavigate();
    const { isLoaded, isSignedIn, user } = useUser();
    const [userData, setUserData] = useState({
        level: '',
        xp: 0,
        tasksCompleted: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [showOverlay, setShowOverlay] = useState(false);
    const [pendingSkill, setPendingSkill] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'in-progress', 'completed'

    // Helper function to check if a skill is started
    const isSkillStarted = (skillNode) => {
        const projectStartedField = {
            'python': 'PythonProjectStarted',
            'dataScience': 'DataScienceProjectStarted',
            'publicSpeaking': 'PublicSpeakingProjectStarted',
            'powerbi': 'PowerBiProjectStarted',
            'pandas': 'PandasProjectStarted',
            'upsc': 'UpscProjectStarted',
            'teaching': 'TeachingProjectStarted',
            'english': 'EnglishProjectStarted',
            'hindi': 'HindiProjectStarted'
        }[skillNode];

        return userData?.[skillNode]?.[skillMap[skillNode]?.currentProjectField] || 
               (projectStartedField && userData?.[skillNode]?.[projectStartedField] !== undefined);
    };

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            navigate('/');
        }
    }, [isLoaded, isSignedIn, navigate]);

    
    useEffect(() => {
        if (isLoaded && isSignedIn) {
            const userRef = ref(db, 'users/' + user.id);

            get(userRef).then((snapshot) => {
                if (snapshot.exists()) {
                    setUserData(snapshot.val());
                } else {
                    // console.log('No data available');
                }
            }).catch((error) => {
                console.error(error);
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [isLoaded, isSignedIn]);

    const toggleProgress = () => {
        setShowProgress(!showProgress);
    };

    // Map skill to route and Firebase field 
    const skillMap = {
  // Technical Skills
  'python': { 
    node: 'python', 
    currentProjectField: 'currentPythonProject',
    route: '/python'
  },
  'data-science': { 
    node: 'dataScience', 
    currentProjectField: 'currentDataScienceProject',
    route: '/data-science'
  },
  'powerbi': { 
    node: 'powerbi', 
    currentProjectField: 'currentPowerBIProject',
    route: '/powerbi'
  },
  'pandas': { 
    node: 'pandas', 
    currentProjectField: 'currentPandasProject',
    route: '/pandas'
  },
  'public-speaking': { 
    node: 'publicSpeaking', 
    currentProjectField: 'currentPublicSpeakingProject',
    route: '/public-speaking'
  },
  // Government Exam Preparation
  'upsc': {
    node: 'upsc',
    currentProjectField: 'currentUpscProject',
    route: '/upsc'
  },
  'teaching': {
    node: 'teaching',
    currentProjectField: 'currentTeachingProject',
    route: '/teaching'
  },
  // Language & Communication
  'english': {
    node: 'english',
    currentProjectField: 'currentEnglishProject',
    route: '/english'
  },
  'hindi': {
    node: 'hindi',
    currentProjectField: 'currentHindiProject',
    route: '/hindi'
  },
};

    const handleStartLearning = (skillKey) => {
        const skill = skillMap[skillKey];
        if (userData && skill && userData[skill.node] && userData[skill.node][skill.currentProjectField]) {
            navigate(skill.route);
            return;
        }
        setPendingSkill(skillKey);
        setShowOverlay(true);
        setErrorMsg('');
    };

    const handleOverlayNo = () => {
        setShowOverlay(false);
        setPendingSkill(null);
        setErrorMsg('');
    };

    const handleOverlayYes = async () => {
        if (!pendingSkill || !user) return;
        setIsUpdating(true);
        setErrorMsg('');
        try {
            const skill = skillMap[pendingSkill];
            if (!skill) throw new Error('Unknown skill');
            const userRef = ref(db, 'users/' + user.id);
            const updates = {
                [`${skill.node}/${skill.currentProjectField}`]: skill.value,
            };

            // Add ProjectStarted field for each skill
            const projectStartedFields = {
                'python': 'PythonProjectStarted',
                'dataScience': 'DataScienceProjectStarted',
                'publicSpeaking': 'PublicSpeakingProjectStarted',
                'powerbi': 'PowerBiProjectStarted',
                'pandas': 'PandasProjectStarted',
                'upsc': 'UpscProjectStarted',
                'ssc': 'SscProjectStarted',
                'banking': 'BankingProjectStarted',
                'teaching': 'TeachingProjectStarted',
                'digitalMarketing': 'DigitalMarketingProjectStarted',
                'projectManagement': 'ProjectManagementProjectStarted',
                'financialLiteracy': 'FinancialLiteracyProjectStarted',
                'english': 'EnglishProjectStarted',
                'hindi': 'HindiProjectStarted',
                'contentWriting': 'ContentWritingProjectStarted',
                'graphicDesign': 'GraphicDesignProjectStarted',
                'photography': 'PhotographyProjectStarted'
            };

            if (projectStartedFields[skill.node]) {
                updates[`${skill.node}/${projectStartedFields[skill.node]}`] = false;
            }

            await update(userRef, updates);
            setShowOverlay(false);
            setPendingSkill(null);
            setIsUpdating(false);
            navigate(skill.route);
        } catch (err) {
            setErrorMsg('Failed to update: ' + err.message);
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-slate-600 text-lg font-medium">Loading your learning dashboard...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <Navbar />
            <div className="pt-20">
            {/* Confirmation Modal */}
            <AnimatePresence>
                {showOverlay && pendingSkill && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiPlay className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Start Learning {skillTitles[pendingSkill]}?</h3>
                                <p className="text-slate-500 mb-6">You're about to begin your journey in {skillTitles[pendingSkill]}. Ready to get started?</p>
                                
                                {errorMsg && (
                                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
                                        {errorMsg}
                                    </div>
                                )}

                                <div className="flex gap-3 justify-center">
                                    <button 
                                        onClick={handleOverlayNo}
                                        disabled={isUpdating}
                                        className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleOverlayYes}
                                        disabled={isUpdating}
                                        className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                                    >
                                        {isUpdating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Starting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FiPlay className="w-4 h-4" />
                                                <span>Start Learning</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

                {/* Progress Overview */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-12">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Learning Progress</h3>
                            {isLoading ? (
                                <div className="animate-pulse space-y-2">
                                    <div className="w-full bg-slate-100 rounded-full h-3"></div>
                                    <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                                </div>
                            ) : (
                                <>
                                    <div className="w-full bg-slate-100 rounded-full h-3 mb-2">
                                        {Object.keys(skillMap).map(skillKey => {
                                            const skill = skillMap[skillKey];
                                            return isSkillStarted(skill.node) ? (
                                                <div 
                                                    key={skillKey}
                                                    className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" 
                                                    style={{ 
                                                        width: '30%',
                                                        marginLeft: '0%',
                                                        marginTop: '-12px'
                                                    }}
                                                ></div>
                                            ) : null;
                                        })}
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-500">
                                        <span>
                                            {Math.round((Object.keys(skillMap).filter(skillKey => {
                                                const skill = skillMap[skillKey];
                                                const projectStartedField = {
                                                    'python': 'PythonProjectStarted',
                                                    'dataScience': 'DataScienceProjectStarted',
                                                    'publicSpeaking': 'PublicSpeakingProjectStarted',
                                                    'powerbi': 'PowerBiProjectStarted',
                                                    'pandas': 'PandasProjectStarted',
                                                    'upsc': 'UpscProjectStarted',
                                                    'teaching': 'TeachingProjectStarted',
                                                    'english': 'EnglishProjectStarted',
                                                    'hindi': 'HindiProjectStarted'
                                                }[skill.node];
                                                return userData?.[skill.node]?.[skill.currentProjectField] || 
                                                       (projectStartedField && userData?.[skill.node]?.[projectStartedField] !== undefined);
                                            }).length / Object.keys(skillMap).length) * 100)}% Complete
                                        </span>
                                        <span>
                                            {Object.keys(skillMap).filter(skillKey => {
                                                const skill = skillMap[skillKey];
                                                const projectStartedField = {
                                                    'python': 'PythonProjectStarted',
                                                    'dataScience': 'DataScienceProjectStarted',
                                                    'publicSpeaking': 'PublicSpeakingProjectStarted',
                                                    'powerbi': 'PowerBiProjectStarted',
                                                    'pandas': 'PandasProjectStarted',
                                                    'upsc': 'UpscProjectStarted',
                                                    'teaching': 'TeachingProjectStarted',
                                                    'english': 'EnglishProjectStarted',
                                                    'hindi': 'HindiProjectStarted'
                                                }[skill.node];
                                                return userData?.[skill.node]?.[skill.currentProjectField] || 
                                                       (projectStartedField && userData?.[skill.node]?.[projectStartedField] !== undefined);
                                            }).length} of {Object.keys(skillMap).length} skills
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-4 rounded-xl">
                                <div className="text-2xl font-bold text-blue-600">
                                    {isLoading ? '...' : 
                                        Object.keys(skillMap).filter(skillKey => {
                                            const skill = skillMap[skillKey];
                                            return isSkillStarted(skill.node);
                                        }).length
                                    }
                                </div>
                                <div className="text-sm text-slate-600">In Progress</div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl">
                                <div className="text-2xl font-bold text-green-600">
                                    {isLoading ? '...' : 
                                        Object.keys(skillMap).filter(skillKey => {
                                            const skill = skillMap[skillKey];
                                            return userData?.[skill.node]?.completed === true;
                                        }).length
                                    }
                                </div>
                                <div className="text-sm text-slate-600">Completed</div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl">
                                <div className="text-2xl font-bold text-slate-600">
                                    {isLoading ? '...' : 
                                        Object.keys(skillMap).filter(skillKey => {
                                            const skill = skillMap[skillKey];
                                            return !isSkillStarted(skill.node) && !userData?.[skill.node]?.completed;
                                        }).length
                                    }
                                </div>
                                <div className="text-sm text-slate-600">Available</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Skills Grid */}
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">My Skills</h2>
                        <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                            {['All', 'In Progress', 'Completed'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                        activeTab === tab.toLowerCase().replace(' ', '-') 
                                            ? 'bg-white shadow-sm text-blue-600' 
                                            : 'text-slate-600 hover:text-slate-800'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(skillMap).map(([key, skill]) => {
                            // Define the ProjectStarted field name for this skill
                            const projectStartedField = {
                                'python': 'PythonProjectStarted',
                                'dataScience': 'DataScienceProjectStarted',
                                'publicSpeaking': 'PublicSpeakingProjectStarted',
                                'powerbi': 'PowerBiProjectStarted',
                                'pandas': 'PandasProjectStarted',
                                'upsc': 'UpscProjectStarted',
                                'ssc': 'SscProjectStarted',
                                'banking': 'BankingProjectStarted',
                                'teaching': 'TeachingProjectStarted',
                                'english': 'EnglishProjectStarted',
                                'hindi': 'HindiProjectStarted',
                                'graphicDesign': 'GraphicDesignProjectStarted'
                            }[skill.node];

                            // Check if the skill is started by either currentProjectField or ProjectStarted field
                            const isStarted = userData?.[skill.node]?.[skill.currentProjectField] || 
                                           (projectStartedField && userData?.[skill.node]?.[projectStartedField] !== undefined);
                            const isCompleted = userData?.[skill.node]?.completed === true;
                            
                            // Calculate progress based on the skill's progress field or completion status
                            let progress = 0;
                            if (isCompleted) {
                                progress = 100; // If marked as completed, show 100%
                            } else if (isStarted) {
                                // For in-progress skills, ensure progress is between 1 and 99
                                const rawProgress = userData?.[skill.node]?.progress || 0;
                                progress = Math.max(1, Math.min(99, Number(rawProgress) || 0));
                                
                                // If the skill has a current project, adjust progress based on completed steps
                                const currentProject = userData?.[skill.node]?.[skill.currentProjectField];
                                if (currentProject) {
                                    // If we have specific progress for the current project, use that
                                    const projectProgress = userData?.[skill.node]?.[`${currentProject}Progress`];
                                    if (projectProgress !== undefined) {
                                        progress = Math.max(1, Math.min(99, Number(projectProgress) || 0));
                                    }
                                }
                            }
                            
                            // Skip based on active tab
                            if (activeTab === 'in-progress' && !isStarted) return null;
                            if (activeTab === 'completed' && !isCompleted) return null;
                            
                            return (
                                <motion.div 
                                    key={key}
                                    whileHover={{ y: -5 }}
                                    className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col h-full"
                                >
                                    <div className="p-6 flex-grow">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">
                                                    {skillIcons[key]}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800">{skillTitles[key]}</h3>
                                                    <div className="text-sm text-slate-500">
                                                        {isStarted ? 'In Progress' : 'Not Started'}
                                                    </div>
                                                </div>
                                            </div>
                                            {isStarted && (
                                                <div className="px-2.5 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                                                    In Progress
                                                </div>
                                            )}
                                        </div>
                                        
                                        <p className="text-slate-600 text-sm mb-6">{skillDescriptions[key]}</p>
                                        
                                        <div className="mb-4">
                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                <span>Progress</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div 
                                                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full" 
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 border-t border-slate-100">
                                        {isStarted ? (
                                            <button 
                                                onClick={() => navigate(skill.route)}
                                                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <span>Continue Learning</span>
                                                <FiArrowRight className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleStartLearning(key)}
                                                className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <FiPlay className="w-4 h-4" />
                                                <span>Start Learning</span>
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}

export default AllSkills;
