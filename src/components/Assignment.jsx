
import React, { useState, useEffect } from 'react';
import { FaForward } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { getDatabase, ref, get } from 'firebase/database';
import { db } from '../firebase';

function Assignment({ learnedConcepts = [] }) {
  const [assignments, setAssignments] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showTaskOverlay, setShowTaskOverlay] = useState(false);
  const [isGeneratingTask, setIsGeneratingTask] = useState(false);

  useEffect(() => {
    const fetchAssignments = async () => {
      const tasksRef = ref(db, 'PythonTask');
      const snapshot = await get(tasksRef);
      if (snapshot.exists()) {
        const tasksData = snapshot.val();
        const tasksArray = Object.keys(tasksData).map(key => ({
          id: key,
          ...tasksData[key]
        }));
        setAssignments(tasksArray);
      }
    };

    fetchAssignments();
  }, []);

  const handleSkip = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (assignments.length === 0 ? 0 : (prev + 1) % assignments.length));
  };

  const handleNextTaskClick = () => {
    setIsGeneratingTask(true);
    setTimeout(() => {
      setShowTaskOverlay(true);
      setIsGeneratingTask(false);
    }, 3000);
  };

  if (!assignments.length) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200 max-w-xl mx-auto mt-10">
        <div className="text-slate-500 italic text-center">No assignments available yet. Learn some concepts to unlock assignments!</div>
      </div>
    );
  }

  const a = assignments[currentIdx];

  return (
    <motion.div 
      className={`bg-gradient-to-br from-[#C642F5] via-[#A633D9] to-[#8C1EB6] w-full h-76 rounded-2xl shadow-2xl p-6 lg:sticky lg:top-28 ring-1 ring-white/10 ${showTaskOverlay ? 'z-[100]' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-bold text-white mb-6">Tasks</h2>
      <div className="flex flex-col items-center justify-center h-[calc(100%-3rem)]">
        <div className="space-y-6 w-full max-w-md">
          <button
            onClick={handleNextTaskClick}
            disabled={isGeneratingTask}
            className={`w-full text-white flex items-center justify-center gap-3 px-6 py-4 text-lg font-semibold rounded-xl shadow-lg transition-all duration-300 ${
              isGeneratingTask
                ? 'bg-white/20 cursor-not-allowed'
                : 'bg-white/10 hover:bg-white/20 text-white border-2 border-white/20 hover:border-white/30'
            }`}
          >
            {isGeneratingTask ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Task...
              </>
            ) : (
              <>
                <FaForward className="w-5 h-5" />
                Next Task
              </>
            )}
          </button>
          <button
            className="w-full flex items-center justify-center gap-2 px-6 py-4 text-lg font-semibold text-white/90 hover:text-white rounded-xl border-2 border-white/20 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Custom Tasks
          </button>
        </div>
      </div>

      {/* Next Task Overlay */}
      <AnimatePresence>
        {showTaskOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
            onClick={() => setShowTaskOverlay(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300,
                bounce: 0.2
              }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl mx-auto my-8 overflow-hidden relative"
              style={{
                maxHeight: '90vh',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                position: 'relative',
                zIndex: 10000,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {a.Category && (
                <span className="absolute top-6 left-6 bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-bold border border-blue-200 shadow-sm">
                    {a.Category}
                </span>
              )}
              <div className="p-8">
                <div className="mb-8">
                  <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold mb-3 text-purple-700 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      {a.title}
                    </h2>
                    <div className="w-20 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 mx-auto rounded-full mb-6"></div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-purple-100">
                    <div className="bg-white rounded-xl p-5 border border-purple-200 mb-6">
                      <h3 className="text-lg font-semibold text-purple-700 mb-3 flex items-center gap-2">
                        <span className="text-purple-600">🎯</span>
                        Your Task
                      </h3>
                      <p className="text-gray-700 mb-4">
                        {a.YourTask}
                      </p>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-purple-700 mb-2 flex items-center gap-2">
                        <span className="text-purple-600">📝</span>
                        Task Description
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {a.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium text-purple-700 mb-2">Concepts Used:</h4>
                    <div className="flex flex-wrap gap-2">
                      {a.Concept && a.Concept.split(',').map((concept, index) => (
                        <span key={index} className="inline-block bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium border border-purple-200">
                          {concept.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setShowTaskOverlay(false)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl"
                  >
                    🚀 Start Task
                  </button>

                  <button
                    onClick={() => setShowTaskOverlay(false)}
                    className="px-8 py-4 border-2 border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-[0.98] hover:border-slate-400 rounded-xl transition-all duration-300 font-semibold text-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Assignment;
