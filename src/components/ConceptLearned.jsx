import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ref, get, update } from 'firebase/database';
import { db } from '../firebase';
import { useUser } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronDown } from 'react-icons/fa';

// Modal portal helper to render overlays at document body level
const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

function ConceptLearned({ 
  completedProjects = [], 
  skillName = 'python',
  onConceptClick = () => {}
}) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showAddSourceOverlay, setShowAddSourceOverlay] = useState(false);
  const [showAppliedDetailsOverlay, setShowAppliedDetailsOverlay] = useState(false);
  const [showAppliedDetails, setShowAppliedDetails] = useState(false);
  const [allConcepts, setAllConcepts] = useState({});
  const [learnedConcepts, setLearnedConcepts] = useState([]);
  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [openCategory, setOpenCategory] = useState(null);
  const [showStatusOverlay, setShowStatusOverlay] = useState(false);
  const [selectedConcepts, setSelectedConcepts] = useState([]);
  const [conceptStatuses, setConceptStatuses] = useState({});
  const [showAppliedConceptsOverlay, setShowAppliedConceptsOverlay] = useState(false);
  const [appliedConceptsData, setAppliedConceptsData] = useState([]);
  const [showPointsHistoryOverlay, setShowPointsHistoryOverlay] = useState(false);
  const [newSource, setNewSource] = useState({ sourceName: '', sourceLink: '' });
  
  const handleSourceNameChange = (e) => {
    setNewSource(prev => ({
      ...prev,
      sourceName: e.target.value
    }));
  };
  
  const handleSourceLinkChange = (e) => {
    setNewSource(prev => ({
      ...prev,
      sourceLink: e.target.value
    }));
  };
  const [pointsHistory, setPointsHistory] = useState([]);
  const [pointsHistoryLoading, setPointsHistoryLoading] = useState(false);
  const { user } = useUser();
  
  // Refs for maintaining scroll position in overlays
  const addConceptsScrollRef = useRef(null);

  // Skill configuration mapping
  const skillConfig = {
    python: {
      conceptsPath: 'PythonProject/AllConcepts/category',
      userPath: 'python',
      displayName: 'Python'
    },
    powerbi: {
      conceptsPath: 'PowerBiProject/AllConcepts/category',
      userPath: 'powerbi',
      displayName: 'Power BI'
    },
    pandas: {
      conceptsPath: 'PandasProject/AllConcepts/category',
      userPath: 'pandas',
      displayName: 'Pandas'
    },
    'data-science': {
      conceptsPath: 'DataScienceProject/AllConcepts/category',
      userPath: 'data-science',
      displayName: 'Data Science'
    },
    'public-speaking': {
      conceptsPath: 'PublicSpeakingProject/AllConcepts/category',
      userPath: 'public-speaking',
      displayName: 'Public Speaking'
    }
  };

  const currentSkillConfig = skillConfig[skillName] || skillConfig.python;

  // Fetch all concepts and user's learned concepts
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all concepts
        const allConceptsRef = ref(db, currentSkillConfig.conceptsPath);
        const allConceptsSnap = await get(allConceptsRef);
        if (allConceptsSnap.exists()) {
          const data = allConceptsSnap.val();
          // Dynamically set categories based on what exists in Firebase
          const categories = {};
          // Sort categories when first loading them
          const sortedCategories = Object.keys(data).sort((a, b) => {
            const order = { 'basic': 1, 'intermediate': 2, 'advanced': 3 };
            const aOrder = order[a.toLowerCase()] || 99;
            const bOrder = order[b.toLowerCase()] || 99;
            return aOrder - bOrder || a.localeCompare(b);
          });
          
          // Create the categories object with sorted order
          sortedCategories.forEach(category => {
            categories[category] = Object.values(data[category] || {});
          });
          setAllConcepts(categories);
        }

        // Fetch user's learned concepts
        const userConceptsRef = ref(db, `users/${user.id}/${currentSkillConfig.userPath}/learnedConcepts`);
        const userConceptsSnap = await get(userConceptsRef);
        if (userConceptsSnap.exists()) {
          const val = userConceptsSnap.val() || {};
          // Convert object to array for UI
          setLearnedConcepts(Array.isArray(val) ? val : Object.values(val));
        }
      } catch (err) {
        console.error("Error fetching concepts:", err);
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Preserve scroll position in Add Concepts overlay when checking/unchecking items
  useEffect(() => {
    // Don't reset scroll on overlay open/close or when checked state changes
    // The ref will maintain the scroll position automatically
  }, [checked]);

  // Expose functions globally for other components to use
  useEffect(() => {
    window.handlePointsClick = handlePointsClick;
    window.handleAppliedConceptsClick = handleAppliedConceptsClick;
    
    return () => {
      delete window.handlePointsClick;
      delete window.handleAppliedConceptsClick;
    };
  }, [learnedConcepts, completedProjects]);

  // Open overlay
  const handleOpenOverlay = () => {
    setShowOverlay(true);
  };

  // Handle check/uncheck with scroll position preservation
  const handleCheck = (category, concept) => {
    // Save current scroll position
    const scrollPos = addConceptsScrollRef.current?.scrollTop || 0;
    
    setChecked((prev) => ({
      ...prev,
      [`${category}:${concept}`]: !prev[`${category}:${concept}`],
    }));
    
    // Restore scroll position after state update
    if (addConceptsScrollRef.current) {
      setTimeout(() => {
        if (addConceptsScrollRef.current) {
          addConceptsScrollRef.current.scrollTop = scrollPos;
        }
      }, 0);
    }
  };

  // Add selected concepts to user's learned concepts (step 1: show status overlay)
  const handleAddConcepts = () => {
    const selected = Object.entries(checked)
      .filter(([_, v]) => v)
      .map(([k]) => {
        const [cat, concept] = k.split(':');
        return { category: cat, concept, usedInProject: false };
      });
    if (selected.length === 0) {
      setShowOverlay(false);
      setChecked({});
      return;
    }
    setSelectedConcepts(selected);
    // Initialize statuses to empty
    const initialStatuses = {};
    selected.forEach((item) => {
      initialStatuses[`${item.category}:${item.concept}`] = '';
    });
    setConceptStatuses(initialStatuses);
    // Initialize source fields
    setNewSource({ sourceName: '', sourceLink: '' });
    setShowOverlay(false);
    setShowStatusOverlay(true);
  };

  // Save concepts and statuses to Firebase
  const handleSaveConceptStatuses = async () => {
    if (!user) return;
    setAdding(true);
    
    // Prepare sources array if source information is provided
    let sources = [];
    if (newSource.sourceName && newSource.sourceLink) {
      // Validate and format the URL
      let formattedLink = newSource.sourceLink.trim();
      if (!formattedLink.startsWith('http://') && !formattedLink.startsWith('https://')) {
        formattedLink = 'https://' + formattedLink;
      }
      
      sources = [{
        ...newSource,
        sourceLink: formattedLink
      }];
    }
    
    // Avoid duplicates by concept+category
    const updatedLearnedConcepts = [
      ...learnedConcepts,
      ...selectedConcepts.filter(
        (item) => !learnedConcepts.some((c) => c.category === item.category && c.concept === item.concept)
      ).map((item) => ({
        ...item,
        status: conceptStatuses[`${item.category}:${item.concept}`] || 'Clear',
        addedAt: new Date().toISOString(), // Add timestamp
        sources: sources, // Add sources if provided
      })),
    ];
    // Save as object, key by concept:category
    const learnedConceptsObj = {};
    updatedLearnedConcepts.filter(Boolean).forEach((c) => {
      learnedConceptsObj[`${c.category}:${c.concept}`] = c;
    });
    try {
      await update(ref(db, `users/${user.id}/${currentSkillConfig.userPath}`), {
        learnedConcepts: learnedConceptsObj,
      });
      setLearnedConcepts(Object.values(learnedConceptsObj));
    } catch (err) {
      console.error('Error saving concept statuses:', err);
    }
    setAdding(false);
    setShowStatusOverlay(false);
    setChecked({});
    setSelectedConcepts([]);
    setConceptStatuses({});
    setNewSource({ sourceName: '', sourceLink: '' });
  };
  
  const toggleCategory = (category) => {
    setOpenCategory(openCategory === category ? null : category);
  };

  // Get available categories dynamically
  const availableCategories = Object.keys(allConcepts);

  // Calculate progress
  const getCounts = (category) => {
    const total = allConcepts[category] ? allConcepts[category].length : 0;
    const learned = learnedConcepts.filter((c) => c.category === category).length;
    return { total, learned };
  };

  const totalLearned = availableCategories.reduce((sum, category) => {
    return sum + getCounts(category).learned;
  }, 0);
  const totalConcepts = availableCategories.reduce((sum, category) => {
    return sum + getCounts(category).total;
  }, 0);
  const progressPercentage = totalConcepts > 0 ? (totalLearned / totalConcepts) * 100 : 0;
  
  const isLearned = (category, concept) => {
    return learnedConcepts.some(c => c.category === category && c.concept === concept);
  };

  // Check if a concept has been used in completed projects
  const isConceptApplied = (concept) => {
    return completedProjects.some(project => {
      if (project.conceptUsed) {
        const projectConcepts = project.conceptUsed.split(', ').map(c => c.trim());
        return projectConcepts.includes(concept);
      }
      return false;
    });
  };

  // Check if a concept has been mastered (used in more than 5 projects)
  const isConceptMastered = (concept) => {
    const projectsUsingConcept = completedProjects.filter(project => {
      if (project.conceptUsed) {
        const projectConcepts = project.conceptUsed.split(', ').map(c => c.trim());
        return projectConcepts.includes(concept);
      }
      return false;
    });
    return projectsUsingConcept.length > 5;
  };

  // Helper function to ensure URLs have proper protocol
  const formatUrl = (url) => {
    if (!url) return '';
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    return formattedUrl;
  };

  // Memoized component for concepts checklist to prevent unnecessary re-renders
  const ConceptsCheckboxList = useMemo(() => {
    return (
      <div className="space-y-6">
        {Object.keys(allConcepts).sort((a, b) => {
          const order = { 'basic': 1, 'intermediate': 2, 'advanced': 3 };
          const aOrder = order[a.toLowerCase()] || 99;
          const bOrder = order[b.toLowerCase()] || 99;
          return aOrder - bOrder || a.localeCompare(b);
        }).map((cat) => (
          <div key={cat}>
            <div className="font-semibold text-lg mb-2 capitalize">{cat}</div>
            <div className="grid grid-cols-2 gap-3">
              {(allConcepts[cat] || []).map((concept) => (
                <label key={concept} className={`flex items-center gap-2 ${isLearned(cat, concept) ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={!!checked[`${cat}:${concept}`]}
                    onChange={() => handleCheck(cat, concept)}
                    disabled={adding || isLearned(cat, concept)}
                    style={{ flex: 'none' }}
                  />
                  <span style={{ flex: '1' }}>{concept}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }, [allConcepts, checked, adding]);

  // Handle clicking on applied concepts count
  const handleAppliedConceptsClick = () => {
    // Use the learnedConcepts state that's already fetched
    const appliedConcepts = learnedConcepts.filter(concept => {
      return isConceptApplied(concept.concept || concept) || isConceptMastered(concept.concept || concept);
    });

    // For each applied concept, find which projects used it
    const appliedConceptsWithProjects = appliedConcepts.map(concept => {
      const conceptName = concept.concept || concept;
      const projectsUsingConcept = completedProjects.filter(project => {
        if (project.conceptUsed) {
          const projectConcepts = project.conceptUsed.split(', ').map(c => c.trim());
          return projectConcepts.includes(conceptName);
        }
        return false;
      });

      return {
        concept: conceptName,
        category: concept.category,
        projects: projectsUsingConcept,
        isMastered: isConceptMastered(conceptName)
      };
    });

    setAppliedConceptsData(appliedConceptsWithProjects);
    setShowAppliedConceptsOverlay(true);
  };

  // Handle showing applied details for a specific concept
  const handleShowAppliedDetails = (conceptName) => {
    const projectsUsingConcept = completedProjects.filter(project => {
      if (project.conceptUsed) {
        const projectConcepts = project.conceptUsed.split(',').map(c => c.trim());
        return projectConcepts.includes(conceptName);
      }
      return false;
    });
    
    // If we're in the applied concepts overlay, show the details overlay
    if (showAppliedConceptsOverlay) {
      setShowAppliedDetailsOverlay(true);
    } else {
      // If we're in the concept details overlay, show inline details
      setShowAppliedDetails(true);
    }
  };

  // Handle concept click to show details overlay
  const handleConceptClick = (concept, category) => {
    const conceptData = learnedConcepts.find(
      (c) => c.concept === concept && c.category === category
    );

    if (conceptData) {
      const conceptDetails = {
        name: concept,
        category,
        status: conceptData.status || 'Not Set',
        addedAt: conceptData.addedAt,
        sources: conceptData.sources || [],
        appliedIn: completedProjects
          .filter(project => 
            project.conceptsUsed && 
            project.conceptsUsed.some(c => c.concept === concept && c.category === category)
          )
          .map(project => ({
            title: project.title || 'Untitled Project',
            date: project.completedAt || new Date().toISOString()
          }))
      };
      onConceptClick(conceptDetails);
    }
  };

  // Handle STED points click
  const handlePointsClick = () => {
    fetchPointsHistory();
    setShowPointsHistoryOverlay(true);
  };

  return (
    <div className='text-left'>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-800">
          Concept Learned
        </h2>
        <button
          className='text-[#6366F1] underline rounded-md py-1 px-2 cursor-pointer transition-colors'
          onClick={handleOpenOverlay}
        >
          ✚ Add Concept
        </button>
      </div>

      <div className='w-full flex items-center gap-2 my-4'>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="h-2 rounded-full"
            style={{ width: `${progressPercentage}%`, backgroundColor: '#6366F1' }}
          ></div>
        </div>
        <span className='text-sm font-medium text-slate-600'>{Math.round(progressPercentage)}%</span>
      </div>

      <div className='pt-3 flex flex-col space-y-2'>
        {Object.keys(allConcepts)
          .sort((a, b) => {
            // First sort by our custom order
            const order = { 'basic': 1, 'intermediate': 2, 'advanced': 3 };
            const aOrder = order[a.toLowerCase()] || 99;
            const bOrder = order[b.toLowerCase()] || 99;
            
            // If same order, sort alphabetically
            if (aOrder === bOrder) {
              return a.localeCompare(b);
            }
            return aOrder - bOrder;
          })
          .map((category) => {
          const counts = getCounts(category);
          const categoryLearnedConcepts = learnedConcepts.filter((c) => c.category === category);
          const isOpen = openCategory === category;

          return (
            <div key={category} className="p-4 rounded-2xl border border-slate-100 mb-4 last:mb-0">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleCategory(category)}
              >
                <div className='text-lg font-medium text-slate-700 capitalize'>
                  {category} <span className='font-normal text-slate-500'>({counts.learned}/{counts.total})</span>
                </div>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <FaChevronDown className='text-slate-500' />
                </motion.div>
              </div>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginTop: '12px' }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-slate-200 pt-3">
                      {categoryLearnedConcepts.length > 0 ? (
                        <div className="space-y-2">
                          {categoryLearnedConcepts.map((item) => (
                            <div
                              key={item.concept}
                              className="w-full flex items-center justify-between rounded-lg px-4 py-2 border border-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                              onClick={() => handleConceptClick(item.concept, category)}
                            >
                              <div className="flex items-center">
                                <span className="font-medium text-slate-700">{item.concept}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Application Status - Fixed width container */}
                                <div className="w-20 flex justify-center">
                                  {isConceptMastered(item.concept) ? (
                                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold whitespace-nowrap border border-purple-300">
                                      mastered
                                    </span>
                                  ) : isConceptApplied(item.concept) ? (
                                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold whitespace-nowrap border border-green-300">
                                      applied
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold whitespace-nowrap border border-yellow-300">
                                    not applied
                                  </span>
                                )}
                                </div>
                                
                                {/* Divider */}
                                {item.status && (
                                  <div className="w-px h-4 bg-slate-300 mx-2"></div>
                                )}
                                
                                {/* Concept Status - Fixed width container */}
                                {item.status && (
                                  <div className="w-32 flex justify-center">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap border
                                        ${item.status === 'Clear' ? 'bg-green-100 text-green-700 border-green-300' : ''}
                                        ${item.status === 'Unclear' ? 'bg-orange-100 text-orange-700 border-orange-300' : ''}
                                        ${item.status === 'confused' ? 'bg-red-100 text-red-700 border-red-300' : ''}`}
                                    >
                                      {item.status}
                                    </span>
                                  </div>
                                )}
                                <div className="w-4 h-4 flex-shrink-0 ml-4">
                                  <svg className="w-full h-full text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="italic text-slate-400">No concepts learned in this category yet.</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Overlay for adding concepts */}
      {showOverlay && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl relative flex flex-col max-h-[90vh]">
              {/* Header - non-scrollable */}
              <div className="flex justify-between items-center p-8 border-b border-slate-200">
                <h3 className="text-2xl font-bold">Add Concepts</h3>
                <button
                  className="text-slate-500 hover:text-slate-800 text-xl"
                  onClick={() => setShowOverlay(false)}
                  disabled={adding}
                >
                  ×
                </button>
              </div>

              {/* Content - scrollable with scroll restoration */}
              <div ref={addConceptsScrollRef} className="flex-1 overflow-y-auto p-8" style={{ scrollBehavior: 'auto' }}>
                {loading ? (
                  <div className="text-center py-8">Loading concepts...</div>
                ) : (
                  ConceptsCheckboxList
                )}
              </div>

              {/* Footer - non-scrollable */}
              <div className="flex justify-end gap-3 p-8 border-t border-slate-200">
                <button
                  className="px-4 py-2 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                  onClick={() => setShowOverlay(false)}
                  disabled={adding}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-purple-700 hover:bg-purple-800 text-white font-semibold"
                  onClick={handleAddConcepts}
                  disabled={adding || loading}
                >
                  {adding ? 'Adding...' : 'Add Selected'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}


      {/* Overlay for concept status selection */}
      {showStatusOverlay && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with enhanced blur effect */}
            <div 
              className="absolute inset-0 bg-black/30 backdrop-blur-md transition-all duration-300"
              style={{
                opacity: showStatusOverlay ? 1 : 0,
                transition: 'opacity 200ms ease-in-out'
              }}
              onClick={() => { if (!adding) { setShowStatusOverlay(false); setAdding(false); } }}
            />
            
            {/* Modal Content */}
            <div 
              className={`relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transition-all duration-200 transform ${showStatusOverlay ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-slate-800">Set Concept Status</h3>
                  <button
                    onClick={() => { if (!adding) { setShowStatusOverlay(false); setAdding(false); } }}
                    className="text-slate-500 hover:text-slate-700 text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={adding}
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {selectedConcepts.map((item, index) => (
                    <div key={index} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-slate-800">{item.concept}</h4>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full capitalize">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded transition-colors">
                          <input
                            type="radio"
                            name={`status-${item.category}-${item.concept}`}
                            value="Clear"
                            checked={conceptStatuses[`${item.category}:${item.concept}`] === 'Clear'}
                            onChange={(e) => setConceptStatuses(s => ({ ...s, [`${item.category}:${item.concept}`]: e.target.value }))}
                            disabled={adding}
                            className="w-4 h-4 text-green-600 bg-slate-100 border-slate-300 focus:ring-0"
                          />
                          <span className="text-sm text-slate-700">Clear</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded transition-colors">
                          <input
                            type="radio"
                            name={`status-${item.category}-${item.concept}`}
                            value="Unclear"
                            checked={conceptStatuses[`${item.category}:${item.concept}`] === 'Unclear'}
                            onChange={(e) => setConceptStatuses(s => ({ ...s, [`${item.category}:${item.concept}`]: e.target.value }))}
                            disabled={adding}
                            className="w-4 h-4 text-orange-600 bg-slate-100 border-slate-300 focus:ring-0"
                          />
                          <span className="text-sm text-slate-700">Unclear</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded transition-colors">
                          <input
                            type="radio"
                            name={`status-${item.category}-${item.concept}`}
                            value="confused"
                            checked={conceptStatuses[`${item.category}:${item.concept}`] === 'confused'}
                            onChange={(e) => setConceptStatuses(s => ({ ...s, [`${item.category}:${item.concept}`]: e.target.value }))}
                            disabled={adding}
                            className="w-4 h-4 text-red-600 bg-slate-100 border-slate-300 focus:ring-0"
                          />
                          <span className="text-sm text-slate-700">Confused</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Source Information Section */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h4 className="text-lg font-semibold text-slate-800 mb-4">📚 Add Learning Source (Optional)</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Source Name
                      </label>
                      <input
                        type="text"
                        value={newSource.sourceName}
                        onChange={handleSourceNameChange}
                        placeholder="e.g., Python Official Documentation"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={adding}
                        autoComplete="off"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Source Link
                      </label>
                      <input
                        type="url"
                        value={newSource.sourceLink}
                        onChange={handleSourceLinkChange}
                        placeholder="https://example.com/tutorial"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={adding}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-8 gap-3">
                  <button
                    className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => { setShowStatusOverlay(false); setAdding(false); }}
                    disabled={adding}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-6 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSaveConceptStatuses}
                    disabled={adding || Object.values(conceptStatuses).some(v => !v)}
                  >
                    {adding ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Add Source Overlay */}
      <AnimatePresence>
        {showAddSourceOverlay && (
          <motion.div
            key="add-source-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative"
            >
              <button
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 text-2xl font-bold"
                onClick={() => setShowAddSourceOverlay(false)}
                disabled={addingSource}
              >
                ×
              </button>
              
              <h3 className="text-2xl font-bold mb-6 text-purple-700">
                Add Learning Source
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Source Name
                  </label>
                  <input
                    type="text"
                    value={newSource.sourceName}
                    onChange={handleSourceNameChange}
                    placeholder="e.g., Python Official Documentation"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={addingSource}
                    autoComplete="off"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Source Link
                  </label>
                  <input
                    type="url"
                    value={newSource.sourceLink}
                    onChange={handleSourceLinkChange}
                    placeholder="https://example.com/tutorial"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={addingSource}
                    autoComplete="off"
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-6 gap-3">
                <button
                  className="px-4 py-2 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                  onClick={() => setShowAddSourceOverlay(false)}
                  disabled={addingSource}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-purple-700 hover:bg-purple-800 text-white font-semibold"
                  onClick={handleSaveSource}
                  disabled={addingSource || !newSource.sourceName || !newSource.sourceLink}
                >
                  {addingSource ? 'Adding...' : 'Add Source'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Applied Concepts Overlay */}
      {showAppliedConceptsOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 text-2xl font-bold"
              onClick={() => setShowAppliedConceptsOverlay(false)}
            >
              ×
            </button>
            
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-slate-800">
                Concepts Applied
              </h2>
            </div>

            <div className='pt-3 flex flex-col space-y-2'>
              {availableCategories.map((category) => {
                const categoryConcepts = appliedConceptsData.filter(concept => concept.category === category);
                const learnedConceptsInCategory = learnedConcepts.filter(concept => concept.category === category).length;
                const appliedCount = categoryConcepts.length;
                const isOpen = openCategory === category;

                return (
                  <div key={category} className="bg-slate-50 p-4 rounded-lg shadow-sm border border-slate-100 mb-4 last:mb-0">
                    <div
                      className="flex justify-between items-center cursor-pointer"
                      onClick={() => toggleCategory(category)}
                    >
                      <div className='text-lg font-medium text-slate-700 capitalize'>
                        {category} <span className='font-normal text-slate-500'>({appliedCount}/{learnedConceptsInCategory})</span>
                      </div>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <FaChevronDown className='text-slate-500' />
                      </motion.div>
                    </div>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: '12px' }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-200 pt-3">
                            {categoryConcepts.length > 0 ? (
                              <div className="space-y-2">
                                {categoryConcepts.map((conceptData) => (
                                  <div
                                    key={conceptData.concept}
                                    className="w-full flex items-center justify-between bg-slate-100 rounded-lg px-4 py-2 shadow-sm border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors"
                                    onClick={() => {
                                      setShowAppliedConceptsOverlay(false);
                                      handleConceptClick(conceptData.concept, conceptData.category);
                                    }}
                                  >
                                    <span className="font-medium text-slate-700">{conceptData.concept}</span>
                                    <div className="flex items-center gap-2">
                                      {conceptData.isMastered ? (
                                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold whitespace-nowrap border border-purple-300">
                                          mastered
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold whitespace-nowrap border border-green-300">
                                          applied
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="italic text-slate-400">No applied concepts in this category.</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Applied Details Overlay */}
      {showAppliedDetailsOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 text-2xl font-bold"
              onClick={() => setShowAppliedDetailsOverlay(false)}
            >
              ×
            </button>
            
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-slate-800">
                {selectedConceptForDetails?.concept} - Applied Details
              </h2>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="text-left mb-5">
                <h4 className="text-lg text-slate-800">
                  <span className='font-semibold'>Applied into:</span> <span className='text-purple-600'>{selectedConceptForDetails?.projects?.length || 0} project</span>
                </h4>
              </div>
              <div className="space-y-2">
                {selectedConceptForDetails?.projects?.map((project, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-sm font-medium text-slate-800">
                          {project.projectTitle}
                        </h5>
                        <p className="text-xs text-slate-600">
                          {project.completedAt ? (
                            new Date(project.completedAt).toString() !== 'Invalid Date' ? (
                              `${new Date(project.completedAt).toLocaleDateString()} at ${new Date(project.completedAt).toLocaleTimeString()}`
                            ) : (
                              'Date not available'
                            )
                          ) : (
                            'Date not available'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STED Points History Overlay */}
      {showPointsHistoryOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 text-2xl font-bold"
              onClick={() => setShowPointsHistoryOverlay(false)}
            >
              ×
            </button>
            
            <div className="mb-6 flex flex-col items-center justify-center">
              <h2 className="text-3xl font-bold text-slate-800 mb-2 text-center">
                📊 STED Points History
              </h2>
              <div className="flex flex-col items-center justify-center mt-2 mb-2">
                <span className="font-extrabold text-purple-700 text-5xl md:text-6xl leading-tight mb-1">{calculateTotalPoints()}</span>
                <span className="font-semibold text-slate-800 text-lg md:text-2xl tracking-wide">Total Points Earned</span>
              </div>
            </div>

            {pointsHistoryLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-slate-600">Loading points history...</span>
              </div>
            ) : pointsHistory.length > 0 ? (
              <div className="space-y-4">
                {/* Points Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">🚀</span>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Projects</p>
                        <p className="text-xl font-bold text-green-700">{completedProjects.length * 10} pts</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">📚</span>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Concepts Learned</p>
                        <p className="text-xl font-bold text-blue-700">{learnedConcepts.length * 2} pts</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">⚡</span>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Concepts Applied</p>
                        <p className="text-xl font-bold text-purple-700">
                          {learnedConcepts.filter(concept => isConceptApplied(concept.concept)).length * 5} pts
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Points History List */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Detailed History</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {pointsHistory.map((item) => (
                      <div key={item.id} className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              item.type === 'project' ? 'bg-green-100' :
                              item.type === 'concept' ? 'bg-blue-100' :
                              'bg-purple-100'
                            }`}>
                              <span className={`text-sm ${
                                item.type === 'project' ? 'text-green-600' :
                                item.type === 'concept' ? 'text-blue-600' :
                                'text-purple-600'
                              }`}>
                                {item.type === 'project' ? '🚀' : 
                                 item.type === 'concept' ? '📚' : '⚡'}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-800">{item.title}</h4>
                              <p className="text-sm text-slate-600">{item.description}</p>
                              {item.category && (
                                <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs mt-1">
                                  {item.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-purple-700">+{item.points}</div>
                            <div className="text-xs text-slate-500">
                              {new Date(item.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">No Points History Yet</h3>
                <p className="text-slate-600">Complete projects and learn concepts to start earning STED points!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConceptLearned;