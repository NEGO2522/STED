import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomTask({ 
  showCustomTaskOverlay, 
  setShowCustomTaskOverlay,
  selectedCustomConcepts, 
  setSelectedCustomConcepts,
  customTaskTheme, 
  setCustomTaskTheme,
  conceptPickerChecked, 
  setConceptPickerChecked,
  userData,
  generatingCustomTask,
  setShowConceptPicker,
  showConceptPicker
}) {
  return (
    <AnimatePresence>
      {showCustomTaskOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 backdrop-blur-2xl"
          onClick={() => setShowCustomTaskOverlay(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white/90 backdrop-blur-xl border border-purple-200/70 rounded-3xl shadow-2xl px-16 py-8 max-w-3xl w-full max-h-[85vh] text-left relative flex flex-col ring-1 ring-slate-200/60"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-5 right-7 text-purple-400 hover:text-purple-700 text-3xl font-extrabold bg-white/70 rounded-full w-12 h-12 flex items-center justify-center shadow-lg border border-purple-100 transition-colors"
              onClick={() => setShowCustomTaskOverlay(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="flex-shrink-0">
              <h2 className="text-3xl font-extrabold mb-6 text-purple-800 tracking-tight drop-shadow">Generate Custom Task using AI</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="mb-6">
                <label className="block text-lg font-semibold text-purple-700 mb-3">Concepts Used</label>
                <div className="flex flex-wrap gap-3 min-h-[3.5rem] max-h-48 overflow-y-auto bg-purple-50/60 rounded-xl p-3 mb-3 border border-purple-200/80">
                  {selectedCustomConcepts.length === 0 && (
                    <span className="text-purple-300 text-base">No concepts selected</span>
                  )}
                  {selectedCustomConcepts.map((concept, i) => (
                    <div key={i} className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 text-white border-2 border-purple-300 text-base font-semibold shadow-md group hover:from-purple-500 hover:to-blue-500 transition-all">
                      <span className="mr-2">{concept}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomConcepts(prev => prev.filter((_, index) => index !== i));
                        }}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                        type="button"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="px-6 py-2 bg-purple-600 cursor-pointer hover:bg-purple-700 active:scale-[0.98] text-white rounded-xl font-bold text-base shadow-lg transition-all"
                  onClick={() => setShowConceptPicker(true)}
                  type="button"
                >
                  + Add Concept
                </button>
              </div>
              
              <div className="border-t border-purple-200 my-4"></div>
              
              <div className="mb-6">
                <label className="block text-lg font-semibold text-purple-700 mb-3">Task Theme</label>
                <input
                  type="text"
                  value={customTaskTheme}
                  onChange={e => setCustomTaskTheme(e.target.value)}
                  placeholder="e.g. Data Analysis Task"
                  className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-lg bg-white/80 shadow"
                />
              </div>
            </div>
            
            <div className="flex-shrink-0 border-t border-purple-200 pt-6">
              <div className="flex justify-end gap-4">
                <button
                  className="px-6 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-[0.98] text-slate-700 font-semibold text-base shadow"
                  onClick={() => setShowCustomTaskOverlay(false)}
                  disabled={generatingCustomTask}
                >
                  Cancel
                </button>
                <div className="flex flex-col items-center gap-1">
                  <button
                    className="px-6 py-2 rounded-xl bg-blue-700/50 text-white/80 font-bold text-base shadow-lg flex items-center justify-center gap-2 min-w-[100px] cursor-not-allowed"
                    disabled={true}
                  >
                    Create Task
                  </button>
                  <span className="text-slate-400 text-xs font-medium">Coming Soon</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}