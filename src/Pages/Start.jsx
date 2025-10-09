import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import ProfileIcon from '../components/ProfileIcon';
import speaker from '../assets/Photo1.jpeg';
import mic from '../assets/Photo2.webp';
import ano from '../assets/Photo3.webp';
import speak from '../assets/Photo5.jpg';

const skillItems = [
  { image: speaker },
  { image: speak },
  { image: ano },
  { image: mic }
].map((item, index) => ({
  ...item,
  id: index + 1
}));

function Start() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [hoveredSkill, setHoveredSkill] = useState(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/login');
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-1/4 -right-20 w-96 h-96 bg-gradient-to-br from-blue-900 to-gray-900 rounded-full opacity-40 blur-3xl"
          animate={{
            y: [0, -15, 0],
            x: [0, 10, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div 
          className="absolute bottom-1/3 -left-20 w-80 h-80 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-full opacity-40 blur-3xl"
          animate={{
            y: [0, 15, 0],
            x: [0, -10, 0],
          }}
          transition={{
            duration: 10,
            delay: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div 
          className="absolute top-1/3 left-1/4 w-64 h-64 bg-gradient-to-br from-violet-900 to-blue-900 rounded-full opacity-30 blur-3xl"
          animate={{
            y: [0, 20, 0],
            x: [0, 15, 0],
          }}
          transition={{
            duration: 12,
            delay: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col">
        {/* Navigation */}
        <header className="py-6">
          <div className="flex items-center justify-between">
            <Link to="/home" className="text-2xl font-bold text-blue-400">STED-LS</Link>
            <div className="flex items-center space-x-4">
              {isSignedIn ? (
                <ProfileIcon />
              ) : (
                <>
                  <Link to="/login" className="text-slate-300 hover:text-blue-400 transition-colors">Sign In</Link>
                  <Link to="/signup" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Enhanced Hero Section */}
        <main className="flex-grow flex flex-col lg:flex-row items-center justify-center py-8 lg:py-12">
          {/* Left Column */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-1/2 text-center lg:text-left mb-12 lg:mb-0 lg:pr-12"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center bg-gray-800 text-blue-400 text-sm font-medium px-4 py-2 rounded-full mb-6 border border-gray-700 shadow-sm"
            >
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Apply &gt; Memorize
            </motion.div>

            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-200 mb-6 leading-tight"
            >
              <span className="block">Apply & Track</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                your <span className="italic">Learning</span>
              </span>
            </motion.h1>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="space-y-4 mb-8 max-w-lg mx-auto lg:mx-0"
            >
              <p className="text-lg text-slate-400 leading-relaxed">
                Learn a concept → apply it in a task → master it with projects.
              </p>
              <div className="flex items-center space-x-2 text-sm text-slate-400">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Interactive Learning
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Track Progress
                </span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link to="/home" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isSignedIn ? 'Go to Dashboard' : 'Start Building'}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                  </svg>
                </motion.button>
              </Link>
              <Link to="/all-skills" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gray-800 text-slate-300 hover:bg-gray-700 border-2 border-gray-700 px-8 py-4 rounded-xl font-medium text-lg shadow-sm hover:shadow-md transition-all duration-300"
                >
                  Explore Skills
                </motion.button>
              </Link>
            </motion.div>

          </motion.div>

          {/* Enhanced Right Column */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="w-full lg:w-1/2 px-4 relative"
          >
            <div className="relative">
              <motion.div 
                className="absolute -inset-4 bg-gradient-to-r from-blue-800 to-indigo-800 rounded-2xl opacity-20 blur-xl"
                animate={{
                  opacity: [0.15, 0.25, 0.15],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <div className="relative bg-gray-800/90 backdrop-blur-sm p-1.5 rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden">
                <div className="grid grid-cols-2 gap-3 p-2">
                  {skillItems.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.5,
                        delay: 0.2 + (item.id * 0.1)
                      }}
                      onHoverStart={() => setHoveredSkill(item.id)}
                      onHoverEnd={() => setHoveredSkill(null)}
                      className="relative group overflow-hidden rounded-xl aspect-square bg-gray-900 shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <img
                        src={item.image}
                        alt=""
                        className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                      />
                    </motion.div>
                  ))}
                </div>
                <div className="absolute inset-0 border border-white/10 rounded-2xl pointer-events-none" />
              </div>
            </div>
            
            {/* Floating Elements */}
            <motion.div 
              className="absolute -bottom-6 -right-6 w-12 h-12 bg-blue-900 rounded-full opacity-70"
              animate={{
                y: [0, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div 
              className="absolute -top-4 -left-4 w-8 h-8 bg-indigo-900 rounded-full opacity-70"
              animate={{
                y: [0, 10, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 5,
                delay: 1,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        </main>

        {/* Enhanced Footer */}
        <footer className="py-6 border-t border-gray-800 mt-auto  backdrop-blur-sm">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 text-gray-400 text-sm mb-4 md:mb-0">
              <span>&copy; {new Date().getFullYear()} STED. All rights reserved.</span>
              <span className="hidden md:inline-block">•</span>
              <span className="hidden md:inline-block">Made with ❤️ for better learning</span>
            </div>
            <div className="flex items-center space-x-6">
              <Link 
                to="/terms" 
                className="text-gray-400 hover:text-blue-400 transition-colors text-sm font-medium hover:underline"
              >
                Terms
              </Link>
              <Link 
                to="/privacy" 
                className="text-gray-400 hover:text-blue-400 transition-colors text-sm font-medium hover:underline"
              >
                Privacy
              </Link>
              <Link 
                to="/contact" 
                className="text-gray-400 hover:text-blue-400 transition-colors text-sm font-medium hover:underline"
              >
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Start;
