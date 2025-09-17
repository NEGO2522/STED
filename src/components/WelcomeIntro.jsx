import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WelcomeIntro = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const totalSteps = 4;

  const StepContent = () => {
    switch (step) {
      case 0:
        return (
          <>
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">Welcome to STED</h2>
            <p className="text-slate-600 text-base mb-6 leading-relaxed">
              STED helps you become a confident public speaker through structured and actionable micro-tasks.
            </p>
            <p className="text-slate-500 text-base leading-relaxed">
              Learn through practical experience and guided exercises.
            </p>
          </>
        );

      case 1:
        return (
          <>
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">Learning Categories</h2>
            <p className="text-slate-600 text-base mb-4 leading-relaxed">
              Your training focuses on four essential skills:
            </p>
            <div className="space-y-3 text-left">
              <div className="flex items-center p-3 bg-white/60 rounded-lg">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mr-3">
                  <span className="text-lg">💪</span>
                </div>
                <span className="text-slate-700">Confidence Building</span>
              </div>
              <div className="flex items-center p-3 bg-white/60 rounded-lg">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mr-3">
                  <span className="text-lg">🕺</span>
                </div>
                <span className="text-slate-700">Body Language & Gestures</span>
              </div>
              <div className="flex items-center p-3 bg-white/60 rounded-lg">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mr-3">
                  <span className="text-lg">🎤</span>
                </div>
                <span className="text-slate-700">Voice Control & Clarity</span>
              </div>
              <div className="flex items-center p-3 bg-white/60 rounded-lg">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mr-3">
                  <span className="text-lg">👥</span>
                </div>
                <span className="text-slate-700">Audience Engagement</span>
              </div>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">Progress Tracking</h2>
            <p className="text-slate-600 text-base mb-4 leading-relaxed">
              Monitor your development with comprehensive tracking tools:
            </p>
            <div className="space-y-3 text-left">
              <div className="flex items-center p-3 bg-white/60 rounded-lg">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mr-3">
                  <span className="text-lg">⭐</span>
                </div>
                <span className="text-slate-700">Task completion and XP tracking</span>
              </div>
              <div className="flex items-center p-3 bg-white/60 rounded-lg">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mr-3">
                  <span className="text-lg">🗓️</span>
                </div>
                <span className="text-slate-700">Progress snapshots and streaks</span>
              </div>
              <div className="flex items-center p-3 bg-white/60 rounded-lg">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mr-3">
                  <span className="text-lg">🥇</span>
                </div>
                <span className="text-slate-700">Performance leaderboard</span>
              </div>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">Begin Your Journey</h2>
            <p className="text-slate-600 text-base mb-4 leading-relaxed">
              You're ready to enhance your public speaking skills through structured practice.
            </p>
            <p className="text-slate-500 text-base leading-relaxed">
              Select 'Start' to begin your training program.
            </p>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed top-0 left-0 w-full h-full z-[9999] backdrop-blur bg-slate-900/50 flex items-center justify-center"
      >
        <motion.div
          key={step}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-b from-slate-50 to-white rounded-xl shadow-xl w-[90%] max-w-xl p-8 relative"
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-xl" />
          
          <div className="mb-8">
            {StepContent()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-1 rounded-full transition-all duration-300 ${
                    i === step ? 'bg-blue-500' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <div className="flex space-x-3">
              {step > 0 && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Back
                </motion.button>
              )}

              {step < totalSteps - 1 ? (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(step + 1)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                >
                  Continue
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                >
                  Start
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeIntro;
