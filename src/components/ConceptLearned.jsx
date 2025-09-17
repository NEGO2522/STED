import React, { useState, useEffect } from 'react';
import { ref, get, update } from 'firebase/database';
import { db } from '../firebase';
import { useUser } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronDown } from 'react-icons/fa';

function ConceptLearned({ completedProjects = [], skillName = 'python' }) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [allConcepts, setAllConcepts] = useState({});
  const [learnedConcepts, setLearnedConcepts] = useState([]);
  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [openCategory, setOpenCategory] = useState(null);
  const [showStatusOverlay, setShowStatusOverlay] = useState(false);
  const [selectedConcepts, setSelectedConcepts] = useState([]);
  const [conceptStatuses, setConceptStatuses] = useState({});
  const [showConceptDetailsOverlay, setShowConceptDetailsOverlay] = useState(false);
  const [selectedConceptDetails, setSelectedConceptDetails] = useState(null);
  const [showAddSourceOverlay, setShowAddSourceOverlay] = useState(false);
  const [newSource, setNewSource] = useState({ sourceName: '', sourceLink: '' });
  const [addingSource, setAddingSource] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [showAppliedConceptsOverlay, setShowAppliedConceptsOverlay] = useState(false);
  const [appliedConceptsData, setAppliedConceptsData] = useState([]);
  const [showAppliedDetails, setShowAppliedDetails] = useState(false);
  const [selectedConceptForDetails, setSelectedConceptForDetails] = useState(null);
  const [showAppliedDetailsOverlay, setShowAppliedDetailsOverlay] = useState(false);
  const [showPointsHistoryOverlay, setShowPointsHistoryOverlay] = useState(false);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [pointsHistoryLoading, setPointsHistoryLoading] = useState(false);
  const { user } = useUser();

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
          Object.keys(data).forEach(category => {
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

  // Handle check/uncheck
  const handleCheck = (category, concept) => {
    setChecked((prev) => ({
      ...prev,
      [`${category}:${concept}`]: !prev[`${category}:${concept}`],
    }));
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
        const projectConcepts = project.conceptUsed.split(', ').map(c => c.trim());
        return projectConcepts.includes(conceptName);
      }
      return false;
    });

    setSelectedConceptForDetails({
      concept: conceptName,
      projects: projectsUsingConcept
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
  const handleConceptClick = async (concept, category) => {
    try {
      // Fetch the learnedConcepts object to get sources for this concept
      const learnedConceptsRef = ref(db, `users/${user.id}/${currentSkillConfig.userPath}/learnedConcepts`);
      const learnedConceptsSnap = await get(learnedConceptsRef);
      
      let sources = [];
      let addedAt = null;
      let status = null;
      let isApplied = false;
      
      if (learnedConceptsSnap.exists()) {
        const learnedConceptsData = learnedConceptsSnap.val();
        const conceptKey = `${category}:${concept}`;
        const conceptData = learnedConceptsData[conceptKey];
        
        if (conceptData) {
          if (conceptData.sources) {
            sources = Array.isArray(conceptData.sources) ? conceptData.sources : Object.values(conceptData.sources || {});
          }
          addedAt = conceptData.addedAt || null;
          status = conceptData.status || null;
          isApplied = isConceptApplied(concept);
        }
      }
      
      setSelectedConceptDetails({
        name: concept,
        category: category,
        learnedFrom: sources,
        addedAt: addedAt,
        status: status,
        isApplied: isApplied
      });
      setShowConceptDetailsOverlay(true);
    } catch (err) {
      console.error("Error fetching concept sources:", err);
      setSelectedConceptDetails({
        name: concept,
        category: category,
        learnedFrom: [],
        addedAt: null,
        status: null,
        isApplied: false
      });
      setShowConceptDetailsOverlay(true);
    }
  };

  // Handle adding new source
  const handleAddSource = () => {
    setNewSource({ sourceName: '', sourceLink: '' });
    setShowAddSourceOverlay(true);
  };

  // Handle editing concept status
  const handleEditStatus = () => {
    setNewStatus(selectedConceptDetails.status || '');
    setEditingStatus(true);
  };

  // Save updated concept status
  const handleSaveStatus = async () => {
    if (!user || !selectedConceptDetails || !newStatus) return;
    
    setSavingStatus(true);
    try {
      // Get the existing learnedConcepts object
      const learnedConceptsRef = ref(db, `users/${user.id}/${currentSkillConfig.userPath}/learnedConcepts`);
      const learnedConceptsSnap = await get(learnedConceptsRef);
      
      let learnedConceptsData = {};
      if (learnedConceptsSnap.exists()) {
        learnedConceptsData = learnedConceptsSnap.val();
      }
      
      // Create concept key
      const conceptKey = `${selectedConceptDetails.category}:${selectedConceptDetails.name}`;
      
      // Update the concept data with new status
      const updatedConceptData = {
        ...learnedConceptsData[conceptKey],
        status: newStatus
      };
      
      // Update the learnedConcepts object
      await update(ref(db, `users/${user.id}/${currentSkillConfig.userPath}/learnedConcepts`), {
        [conceptKey]: updatedConceptData
      });
      
      // Update local state
      setSelectedConceptDetails(prev => ({
        ...prev,
        status: newStatus
      }));
      
      setEditingStatus(false);
      setNewStatus('');
    } catch (err) {
      console.error('Error saving status:', err);
    }
    setSavingStatus(false);
  };

  // Save new source to Firebase
  const handleSaveSource = async () => {
    if (!user || !selectedConceptDetails || !newSource.sourceName || !newSource.sourceLink) return;
    
    setAddingSource(true);
    try {
      // Validate and format the URL
      let formattedLink = newSource.sourceLink.trim();
      if (!formattedLink.startsWith('http://') && !formattedLink.startsWith('https://')) {
        formattedLink = 'https://' + formattedLink;
      }
      
      const sourceWithFormattedLink = {
        ...newSource,
        sourceLink: formattedLink
      };
      
      // Get the existing learnedConcepts object
      const learnedConceptsRef = ref(db, `users/${user.id}/${currentSkillConfig.userPath}/learnedConcepts`);
      const learnedConceptsSnap = await get(learnedConceptsRef);
      
      let learnedConceptsData = {};
      if (learnedConceptsSnap.exists()) {
        learnedConceptsData = learnedConceptsSnap.val();
      }
      
      // Create concept key
      const conceptKey = `${selectedConceptDetails.category}:${selectedConceptDetails.name}`;
      
      // Get existing sources for this concept
      let existingSources = [];
      if (learnedConceptsData[conceptKey] && learnedConceptsData[conceptKey].sources) {
        existingSources = Array.isArray(learnedConceptsData[conceptKey].sources) 
          ? learnedConceptsData[conceptKey].sources 
          : Object.values(learnedConceptsData[conceptKey].sources || {});
      }
      
      // Add new source
      const updatedSources = [...existingSources, sourceWithFormattedLink];
      
      // Update the concept data with new sources
      const updatedConceptData = {
        ...learnedConceptsData[conceptKey],
        sources: updatedSources
      };
      
      // Update the learnedConcepts object
      await update(ref(db, `users/${user.id}/${currentSkillConfig.userPath}/learnedConcepts`), {
        [conceptKey]: updatedConceptData
      });
      
      // Update local state
      setSelectedConceptDetails(prev => ({
        ...prev,
        learnedFrom: updatedSources
      }));
      
      setShowAddSourceOverlay(false);
      setNewSource({ sourceName: '', sourceLink: '' });
    } catch (err) {
      console.error('Error saving source:', err);
    }
    setAddingSource(false);
  };

  // Calculate total STED points
  const calculateTotalPoints = () => {
    const projectPoints = completedProjects.length * 10; // 10 points per project
    const learnedPoints = learnedConcepts.length * 2; // 2 points per learned concept
    const appliedPoints = learnedConcepts.filter(concept => 
      isConceptApplied(concept.concept)
    ).length * 5; // 5 points per applied concept
    
    return projectPoints + learnedPoints + appliedPoints;
  };

  // Fetch points history data
  const fetchPointsHistory = async () => {
    if (!user) return;
    
    setPointsHistoryLoading(true);
    try {
      const history = [];
      
      // Add project completions
      completedProjects.forEach((project, index) => {
        history.push({
          id: `project-${index}`,
          type: 'project',
          title: project.projectTitle || `Project ${index + 1}`,
          points: 10,
          date: project.completedAt || new Date().toISOString(),
          description: 'Project completion'
        });
      });
      
      // Add concept learning
      learnedConcepts.forEach((concept, index) => {
        history.push({
          id: `concept-${index}`,
          type: 'concept',
          title: concept.concept,
          points: 2,
          date: concept.addedAt || new Date().toISOString(),
          description: `Learned ${concept.category} concept`,
          category: concept.category
        });
      });
      
      // Add concept applications
      learnedConcepts.forEach((concept, index) => {
        if (isConceptApplied(concept.concept)) {
          history.push({
            id: `applied-${index}`,
            type: 'applied',
            title: concept.concept,
            points: 5,
            date: new Date().toISOString(), // Use current date as approximation
            description: `Applied ${concept.category} concept in project`,
            category: concept.category
          });
        }
      });
      
      // Sort by date (newest first)
      history.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setPointsHistory(history);
    } catch (err) {
      console.error('Error fetching points history:', err);
    }
    setPointsHistoryLoading(false);
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
          className='border border-slate-300 rounded-md py-1 px-2 cursor-pointer hover:bg-slate-50 transition-colors'
          onClick={handleOpenOverlay}
        >
          ➕ Add Concept
        </button>
      </div>

      <div className='w-full flex items-center gap-2'>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-purple-600 h-2 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <span className='text-sm font-medium text-slate-600'>{totalLearned}/{totalConcepts}</span>
      </div>

      <div className='pt-3 flex flex-col space-y-2'>
        {availableCategories.map((category) => {
          const counts = getCounts(category);
          const categoryLearnedConcepts = learnedConcepts.filter((c) => c.category === category);
          const isOpen = openCategory === category;

          return (
            <div key={category} className="bg-slate-50 p-3 rounded-lg shadow-sm">
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
                              className="w-full flex items-center justify-between bg-slate-100 rounded-lg px-4 py-2 shadow-sm border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors"
                              onClick={() => handleConceptClick(item.concept, category)}
                            >
                              <span className="font-medium text-slate-700">{item.concept}</span>
                              <div className="flex items-center gap-2 min-w-[200px] justify-end">
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
                                <div className="w-32 flex justify-center">
                                {item.status && (
                                  <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap border
                                        ${item.status === 'Clear' ? 'bg-green-100 text-green-700 border-green-300' : ''}
                                        ${item.status === 'Unclear' ? 'bg-orange-100 text-orange-700 border-orange-300' : ''}
                                        ${item.status === 'confused' ? 'bg-red-100 text-red-700 border-red-300' : ''}
                                    `}
                                  >
                                    {item.status}
                                  </span>
                                )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl relative">
            <button
              className="absolute top-2 right-2 text-slate-500 hover:text-slate-800 text-xl"
              onClick={() => setShowOverlay(false)}
              disabled={adding}
            >
              ×
            </button>
            <h3 className="text-2xl font-bold mb-4">Add Concepts</h3>
            {loading ? (
              <div className="text-center py-8">Loading concepts...</div>
            ) : (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                {availableCategories.map((cat) => (
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
                          />
                          <span>{concept}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-6 gap-3">
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
      )}

      {/* Overlay for concept status selection */}
      {showStatusOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-xl relative">
            <button
              className="absolute top-2 right-2 text-slate-500 hover:text-slate-800 text-xl"
              onClick={() => { setShowStatusOverlay(false); setAdding(false); }}
              disabled={adding}
            >
              ×
            </button>
            <h3 className="text-2xl font-bold mb-4">Set Concept Status</h3>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {selectedConcepts.map((item) => (
                <div key={`${item.category}:${item.concept}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">{item.concept}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded transition-colors">
                      <input
                        type="radio"
                        name={`status-${item.category}-${item.concept}`}
                        value="Clear"
                        checked={conceptStatuses[`${item.category}:${item.concept}`] === 'Clear'}
                        onChange={(e) => setConceptStatuses(s => ({ ...s, [`${item.category}:${item.concept}`]: e.target.value }))}
                        disabled={adding}
                        className="w-3 h-3 text-green-600 bg-slate-100 border-slate-300 focus:ring-0"
                      />
                      <span className="text-xs text-slate-700">Clear</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded transition-colors">
                      <input
                        type="radio"
                        name={`status-${item.category}-${item.concept}`}
                        value="Unclear"
                        checked={conceptStatuses[`${item.category}:${item.concept}`] === 'Unclear'}
                        onChange={(e) => setConceptStatuses(s => ({ ...s, [`${item.category}:${item.concept}`]: e.target.value }))}
                        disabled={adding}
                        className="w-3 h-3 text-orange-600 bg-slate-100 border-slate-300 focus:ring-0"
                      />
                      <span className="text-xs text-slate-700">Unclear</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded transition-colors">
                      <input
                        type="radio"
                        name={`status-${item.category}-${item.concept}`}
                        value="confused"
                        checked={conceptStatuses[`${item.category}:${item.concept}`] === 'confused'}
                        onChange={(e) => setConceptStatuses(s => ({ ...s, [`${item.category}:${item.concept}`]: e.target.value }))}
                        disabled={adding}
                        className="w-3 h-3 text-red-600 bg-slate-100 border-slate-300 focus:ring-0"
                      />
                      <span className="text-xs text-slate-700">Confused</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Source Information Section */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h4 className="text-lg font-semibold text-slate-800 mb-4">📚 Add Learning Source (Optional)</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Source Name
                  </label>
                  <input
                    type="text"
                    value={newSource.sourceName}
                    onChange={(e) => setNewSource(prev => ({ ...prev, sourceName: e.target.value }))}
                    placeholder="e.g., Python Official Documentation"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={adding}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Source Link
                  </label>
                  <input
                    type="url"
                    value={newSource.sourceLink}
                    onChange={(e) => setNewSource(prev => ({ ...prev, sourceLink: e.target.value }))}
                    placeholder="https://example.com/tutorial"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={adding}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 gap-3">
              <button
                className="px-4 py-2 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                onClick={() => { setShowStatusOverlay(false); setAdding(false); }}
                    disabled={adding}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-purple-700 hover:bg-purple-800 text-white font-semibold"
                onClick={handleSaveConceptStatuses}
                disabled={adding || Object.values(conceptStatuses).some(v => !v)}
              >
                {adding ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Concept Details Overlay */}
      {showConceptDetailsOverlay && selectedConceptDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 text-2xl font-bold"
              onClick={() => setShowConceptDetailsOverlay(false)}
            >
              ×
            </button>
            
            {/* Concept Name */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-4xl font-bold text-purple-700">
                  {selectedConceptDetails.name}
                </h2>
                <span className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium capitalize">
                  {selectedConceptDetails.category}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                {selectedConceptDetails.addedAt && (
                  <span className="text-sm text-slate-500">
                    📅 Added on {new Date(selectedConceptDetails.addedAt).toLocaleDateString()} at {new Date(selectedConceptDetails.addedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              {/* Concept Status and Application Status */}
              <div className="flex items-center justify-between">
                {/* Application Status */}
                <div className="flex items-center gap-2">
                  {selectedConceptDetails.isApplied ? (
                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold border border-green-300">
                      Applied
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold border border-yellow-300">
                      Not Applied
                    </span>
                  )}
                </div>
                
                {/* Concept Status - Right Side */}
                <div className="flex items-center gap-2">
                  {editingStatus ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="border border-slate-300 rounded px-2 py-1 text-xs"
                        disabled={savingStatus}
                  >
                    <option value="">Select status</option>
                    <option value="Clear">Clear</option>
                    <option value="Unclear">Unclear</option>
                    <option value="confused">Confused</option>
                  </select>
                      <button
                        onClick={handleSaveStatus}
                        disabled={savingStatus || !newStatus}
                        className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                      >
                        {savingStatus ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setEditingStatus(false); setNewStatus(''); }}
                        disabled={savingStatus}
                        className="bg-slate-500 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {selectedConceptDetails.status ? (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold border
                            ${selectedConceptDetails.status === 'Clear' ? 'bg-green-100 text-green-700 border-green-300' : ''}
                            ${selectedConceptDetails.status === 'Unclear' ? 'bg-orange-100 text-orange-700 border-orange-300' : ''}
                            ${selectedConceptDetails.status === 'confused' ? 'bg-red-100 text-red-700 border-red-300' : ''}
                          `}
                        >
                          {selectedConceptDetails.status}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">No status set</span>
                      )}
                      <button
                        onClick={handleEditStatus}
                        className="text-purple-600 hover:text-purple-800 text-xs underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Learned From Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-2xl font-semibold text-slate-800">
                  📚 Learned From
                </h3>
                <button
                  onClick={handleAddSource}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full transition-colors"
                  title="Add new source"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {selectedConceptDetails.learnedFrom.map((source, index) => (
                  <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-slate-800 mb-1">
                          {source.sourceName}
                        </h4>
                        <a 
                          href={formatUrl(source.sourceLink)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-800 text-sm underline"
                        >
                          {source.sourceLink}
                        </a>
                      </div>
                      <div className="ml-4">
                        <a 
                          href={formatUrl(source.sourceLink)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Visit
                        </a>
                      </div>
                    </div>
                </div>
              ))}
            </div>
              
              {/* See Applied Details Link - Only for applied concepts */}
              {selectedConceptDetails.isApplied && (
                <div className="flex justify-center pt-6 border-t border-slate-200">
                  {showAppliedDetails ? (
                    <div className="w-full bg-slate-50 rounded-lg p-4 border border-slate-200">
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
                      <div className="text-center mt-3">
                        <button
                          onClick={() => setShowAppliedDetails(false)}
                          className="text-purple-600 hover:text-purple-800 text-sm underline cursor-pointer"
                        >
                          Hide Details
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleShowAppliedDetails(selectedConceptDetails.name)}
                      className="text-purple-600 hover:text-purple-800 text-sm underline cursor-pointer"
                    >
                      See Applied Details
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Source Overlay */}
      {showAddSourceOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
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
                  onChange={(e) => setNewSource(prev => ({ ...prev, sourceName: e.target.value }))}
                  placeholder="e.g., Python Official Documentation"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={addingSource}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Source Link
                </label>
                <input
                  type="url"
                  value={newSource.sourceLink}
                  onChange={(e) => setNewSource(prev => ({ ...prev, sourceLink: e.target.value }))}
                  placeholder="https://example.com/tutorial"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={addingSource}
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
          </div>
        </div>
      )}

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
                  <div key={category} className="bg-slate-50 p-3 rounded-lg shadow-sm">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
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