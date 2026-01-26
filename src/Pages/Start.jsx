import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import ProfileIcon from '../components/ProfileIcon';
import landingpage from '../assets/landingpage.png';

function Start() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] relative overflow-hidden">
      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col">
        {/* Navigation */}
        <header className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-slate-800">STED</span>
            </div>
            <div className="flex items-center space-x-4">
              {isSignedIn ? (
                <>
                  <span className="text-slate-700 text-sm font-medium hidden sm:block">Harsh Agrawal</span>
                  <ProfileIcon />
                </>
              ) : (
                <>
                  <Link to="/signup" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Get Started
                  </Link>
                </>
              )}
              
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-grow flex flex-col lg:flex-row items-center justify-between py-8 lg:py-16 gap-12">
          {/* Left Column */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-[45%] text-left"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center bg-white text-slate-600 text-sm font-medium px-4 py-2.5 rounded-full mb-8 shadow-sm border border-slate-200"
            >
              <span className="relative flex h-2 w-2 mr-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5B5FEE]"></span>
              </span>
              APPLY &gt; MEMORIZE
            </motion.div>

            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-5xl sm:text-6xl lg:text-[72px] font-bold mb-6 leading-[1.1]"
            >
              <span className="block text-slate-900">Apply</span>
              <span className="block text-[#5B5FEE]">your Learning</span>
            </motion.h1>

            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-lg text-slate-600 leading-relaxed mb-8 max-w-lg"
            >
              Learn a concept <span className="inline-flex items-center mx-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span> master it with world-class projects<br />
              and industry-standard workflows.
            </motion.p>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <Link to="/home">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-[#5B5FEE] hover:bg-[#4A4FDD] text-white px-8 py-4 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                >
                  Go to Dashboard
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Column - Image with Cards */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="w-full lg:w-[50%] relative"
          >
            <div className="relative">
              {/* Main Image Container */}
              <div className="relative rounded-[32px] overflow-hidden shadow-2xl">
                {/* Actual circuit board image */}
                <div className="aspect-[4/3] relative">
                  <img 
                    src={landingpage} 
                    alt="Electronics project workspace" 
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Progress Card - Top Left */}
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl min-w-[180px]"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-1">CURRENT PROGRESS</p>
                      <p className="text-2xl font-bold text-slate-900">84% Mastery</p>
                    </div>
                  </div>
                </motion.div>

                {/* New Project Unlocked Card - Bottom Right */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.6 }}
                  className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl min-w-[220px]"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#5B5FEE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">New project unlocked</p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "65%" }}
                      transition={{ delay: 1.2, duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-[#5B5FEE] to-[#7B7FFF]"
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="py-6 border-t border-slate-200 mt-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center text-slate-500 text-sm">
              <span>&copy; 2026 STED. All rights reserved.</span>              
            </div>
            
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Start;
