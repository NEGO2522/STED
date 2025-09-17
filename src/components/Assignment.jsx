import React, { useState, useEffect } from 'react';
import { FaForward } from 'react-icons/fa';

function Assignment({ learnedConcepts = [] }) {
  const [assignments, setAssignments] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showTaskOverlay, setShowTaskOverlay] = useState(false);

  useEffect(() => {
    // Generate assignments based on learned concepts
    let concepts = learnedConcepts;
    if (typeof concepts === 'object' && !Array.isArray(concepts)) {
      concepts = Object.values(concepts);
    }
    // Simple mock assignment generator
    const generated = concepts.slice(0, 10).map((c, i) => {
      const type = i % 2 === 0 ? 'Fix a bug' : 'Add a feature';
      return {
        id: `${c.category}-${c.concept}`,
        title: `Incorrect Total Marks Calculation`,
        description: type === 'Fix a bug'
          ? `The function is designed to calculate total marks from a list of subjects, but it adds a string instead of a number, causing incorrect results or a crash.`
          : `Add a new feature to a codebase using the concept: ${c.concept}.`,
        concept: c.concept,
        category: c.category
      };
    });
    setAssignments(generated);
    setCurrentIdx(0);
  }, [learnedConcepts]);

  const handleSkip = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (assignments.length === 0 ? 0 : (prev + 1) % assignments.length));
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
    <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200 max-200 h-76 mx-auto relative flex flex-col gap-2">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">Tasks</h2>
      <div className="flex justify-center mt-10">
        <div className="space-y-9 w-100">
          <button
            className="w-full inline-flex items-center cursor-pointer justify-center gap-2 text-white font-semibold px-4 py-3 rounded-lg shadow-md transition-colors bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setShowTaskOverlay(true)}
          >
            🚀 Next Tasks
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
          <button
            className="w-full inline-flex items-center justify-center gap-2 cursor-pointer font-semibold px-4 py-3 rounded-lg shadow-md transition-colors border border-white border-opacity-30"
          >
            ⚙️ Custom Tasks
          </button>
        </div>
      </div>

      {/* Next Task Overlay */}
      {showTaskOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.7)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '20px',
            width: '700px',
            textAlign: 'left',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            color: 'black',
            animation: 'fadeInScale 0.5s ease-out',
            position: 'relative'
          }}>
            {/* Cross Button */}
            <button
              onClick={() => setShowTaskOverlay(false)}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                background: 'transparent',
                border: 'none',
                fontSize: '1.7rem',
                color: '#888',
                cursor: 'pointer',
                zIndex: 10
              }}
              aria-label="Close"
            >
              &times;
            </button>
            {/* 1. Tag - Fix Bug */}
            <div style={{
              position: 'absolute',
              top: 20,
              left: 20,
              background: '#ff4d4f',
              color: 'white',
              padding: '6px 16px',
              borderRadius: '16px',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '1px',
              boxShadow: '0 2px 8px #0002'
            }}>
              Fix Bug
            </div>
            {/* 2. Task Title */}
            <h2 className="text-2xl font-bold mb-2 mt-8" style={{marginTop: 48, color: 'black'}}>{a.title}</h2>
            {/* 3. Concept Used */}
            <div className="mb-2 text-lg font-semibold" style={{color: '#764ba2'}}>Concept: List, datatype, function, variable</div>
            {/* 4. Description of the bug */}
            <div className="mb-4 text-base" style={{background: '#f6f6f6', padding: '12px 16px', borderRadius: '10px', color: '#333'}}>
              <span style={{fontWeight: 600}}>Bug Description:</span> <br/>
              {a.description}
            </div>
            {/* 5. Task Description */}
            <div className="mb-6 text-base" style={{color: '#222'}}>
              <span style={{fontWeight: 600}}>Your Task:</span> <br/>
              Fix the bug so that the calculate_total() function correctly sums all the marks and prints the correct total. Make sure the data types are handled properly.
            </div>
            {/* 6. Start Button */}
            <div style={{textAlign: 'center'}}>
              <button
                onClick={() => setShowTaskOverlay(false)}
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 font-semibold text-lg transition-colors"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Assignment; 