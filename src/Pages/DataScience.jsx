import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { getDatabase, ref, get } from 'firebase/database';
import { db } from '../firebase';

function DataScience() {
    const navigate = useNavigate();
    const { isLoaded, isSignedIn, user } = useUser();
    const [userData, setUserData] = useState({
        level: '',
        xp: 0,
        tasksCompleted: 0,
        pythonSkill: 0,
        sqlSkill: 0,
        mlSkill: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [showProgress, setShowProgress] = useState(false);

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
    }, [isLoaded, isSignedIn, user]);

    const toggleProgress = () => {
        setShowProgress(!showProgress);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-slate-600 text-base">Loading your dashboard...</div>
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

            {/* Main content with sidebar */}
            <div className="flex flex-col lg:flex-row">
                <Sidebar />
                <div className="w-full relative px-4 lg:px-8 pb-12">
                    {/* Header Section */}
                    <div className="mt-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-800">Data Science Learning Path</h1>
                                <p className="text-slate-600 mt-2">Master Python, SQL, and Machine Learning</p>
                            </div>
                            {/* <Link
                                to="/task"
                                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Start Next Challenge
                            </Link> */}
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white rounded-lg shadow-md p-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Current Level</p>
                                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{userData.level || 'Beginner'}</h3>
                                </div>
                                <div className="bg-purple-50 p-3 rounded-full">
                                    <span className="text-2xl">📊</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="bg-white rounded-lg shadow-md p-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Projects Completed</p>
                                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{userData.tasksCompleted || 0}</h3>
                                </div>
                                <div className="bg-purple-50 p-3 rounded-full">
                                    <span className="text-2xl">💻</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="bg-white rounded-lg shadow-md p-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Total XP</p>
                                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{userData.xp || 0}</h3>
                                </div>
                                <div className="bg-purple-50 p-3 rounded-full">
                                    <span className="text-2xl">⭐</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="bg-white rounded-lg shadow-md p-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Learning Streak</p>
                                    <h3 className="text-2xl font-bold text-slate-800 mt-1">0 Days</h3>
                                </div>
                                <div className="bg-purple-50 p-3 rounded-full">
                                    <span className="text-2xl">🔥</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                        {/* Next Project Card */}
                       
                            <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-gradient-to-r from-[#c22ae0] to-[#a01ac0] rounded-2xl shadow-xl p-6 transform transition-transform hover:scale-[1.015]"
                            >
                            <h2 className="text-xl font-semibold text-white mb-4">Next Project</h2>
                            <div className=" rounded-lg p-4 mb-4 border border-white">
                                <p className="text-purple-100 mt-2">Analyze a real-world dataset using Python and Pandas</p>
                                <p className="text-purple-100 mt-2">Analyze a real-world dataset using Python and Pandas</p>
                                <div className="flex items-center mt-4">
                                    <span className="text-sm text-purple-100">+100 XP</span>
                                    <span className="mx-2 text-purple-200">•</span>
                                    <span className="text-sm text-purple-100">45 minutes</span>
                                </div>
                            </div>
                            <Link
                                to="/task"
                                className="inline-flex items-center text-white hover:text-purple-200 font-medium"
                            >
                                Start Project
                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </motion.div>



                        {/* Skill Progress */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white rounded-lg shadow-md p-6"
                        >
                            <h2 className="text-xl font-semibold text-slate-800 mb-4">Skill Progress</h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-slate-600">Python</span>
                                        <span className="text-sm font-medium text-slate-800">{userData.pythonSkill || 45}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${userData.pythonSkill || 45}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-slate-600">SQL</span>
                                        <span className="text-sm font-medium text-slate-800">{userData.sqlSkill || 30}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${userData.sqlSkill || 30}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-slate-600">Machine Learning</span>
                                        <span className="text-sm font-medium text-slate-800">{userData.mlSkill || 20}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${userData.mlSkill || 20}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Learning Resources */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white rounded-lg shadow-md p-6"
                        >
                            <h2 className="text-xl font-semibold text-slate-800 mb-4">Learning Resources</h2>
                            <div className="space-y-4">
                                <div className="flex items-start">
                                    <div className="bg-purple-50 p-2 rounded-full mr-3">
                                        <span className="text-lg">📚</span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-800">Python Documentation</h3>
                                        <p className="text-slate-600 text-sm mt-1">Official Python documentation and tutorials</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="bg-purple-50 p-2 rounded-full mr-3">
                                        <span className="text-lg">🔍</span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-800">SQL Practice</h3>
                                        <p className="text-slate-600 text-sm mt-1">Interactive SQL exercises and challenges</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="bg-purple-50 p-2 rounded-full mr-3">
                                        <span className="text-lg">🤖</span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-800">ML Fundamentals</h3>
                                        <p className="text-slate-600 text-sm mt-1">Basic concepts and algorithms in ML</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Recent Achievements */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white rounded-lg shadow-md p-6"
                        >
                            <h2 className="text-xl font-semibold text-slate-800 mb-4">Recent Achievements</h2>
                            <div className="space-y-4">
                                <div className="flex items-center p-3 bg-slate-50 rounded-lg">
                                    <div className="bg-yellow-100 p-2 rounded-full mr-3">
                                        <span className="text-lg">🏆</span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-800">Python Basics Mastered</h3>
                                        <p className="text-slate-600 text-sm">Completed the Python fundamentals course</p>
                                    </div>
                                    <div className="ml-auto">
                                        <span className="text-sm font-medium text-yellow-600">+200 XP</span>
                                    </div>
                                </div>
                                <div className="flex items-center p-3 bg-slate-50 rounded-lg">
                                    <div className="bg-purple-100 p-2 rounded-full mr-3">
                                        <span className="text-lg">📊</span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-800">First Data Analysis</h3>
                                        <p className="text-slate-600 text-sm">Completed your first data analysis project</p>
                                    </div>
                                    <div className="ml-auto">
                                        <span className="text-sm font-medium text-purple-600">+150 XP</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Professional bottom accent line */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-600" />
        </div>
    );
}

export default DataScience; 