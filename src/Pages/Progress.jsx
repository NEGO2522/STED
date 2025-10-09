import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getDatabase, ref, get } from 'firebase/database';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import ProgressCard from '../components/ProgressCard';
import python from '../assets/python.png';
import PowerBi from '../assets/PowerBi.png';

const Progress = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const [pythonStats, setPythonStats] = useState({ learned: 0, total: 0 });
  const [powerbiStats, setPowerbiStats] = useState({ learned: 0, total: 0 });
  const [pandasStats, setPandasStats] = useState({ learned: 0, total: 0 });

  useEffect(() => {
    if (isLoaded && isSignedIn && user?.id) {
      // Fetch Python data
      const fetchPythonData = async () => {
        const [conceptsSnap, learnedSnap] = await Promise.all([
          get(ref(db, 'PythonProject/AllConcepts/category')),
          get(ref(db, `users/${user.id}/python/learnedConcepts`))
        ]);

        let total = 0;
        if (conceptsSnap.exists()) {
          const data = conceptsSnap.val();
          total = [
            ...Object.values(data.basic || {}),
            ...Object.values(data.intermediate || {}),
            ...Object.values(data.advanced || {}),
          ].length;
        }

        let learned = 0;
        if (learnedSnap.exists()) {
          const val = learnedSnap.val() || [];
          learned = (Array.isArray(val) ? val : Object.values(val)).length;
        }

        setPythonStats({ learned, total });
      };

      // Fetch PowerBI data
      const fetchPowerBIData = async () => {
        const [conceptsSnap, learnedSnap] = await Promise.all([
          get(ref(db, 'PowerBiProject/AllConcepts/category')),
          get(ref(db, `users/${user.id}/powerbi/learnedConcepts`))
        ]);

        let total = 0;
        if (conceptsSnap.exists()) {
          const data = conceptsSnap.val();
          total = Object.values(data).reduce((acc, arr) => acc + Object.values(arr || {}).length, 0);
        }

        let learned = 0;
        if (learnedSnap.exists()) {
            const val = learnedSnap.val() || [];
            learned = (Array.isArray(val) ? val : Object.values(val)).length;
        }

        setPowerbiStats({ learned, total });
      };

      // Fetch Pandas data
      const fetchPandasData = async () => {
        const [conceptsSnap, learnedSnap] = await Promise.all([
            get(ref(db, 'PandasProject/AllConcepts/category')),
            get(ref(db, `users/${user.id}/pandas/learnedConcepts`))
        ]);

        let total = 0;
        if (conceptsSnap.exists()) {
            const data = conceptsSnap.val();
            total = Object.values(data).reduce((acc, arr) => acc + Object.values(arr || {}).length, 0);
        }

        let learned = 0;
        if (learnedSnap.exists()) {
            const val = learnedSnap.val() || [];
            learned = (Array.isArray(val) ? val : Object.values(val)).length;
        }

        setPandasStats({ learned, total });
      };

      fetchPythonData();
      fetchPowerBIData();
      fetchPandasData();
    }
  }, [isLoaded, isSignedIn, user]);

  const skills = [
    {
      to: '/python',
      title: 'Python',
      description: 'Learn Python programming.',
      progress: pythonStats.total > 0 ? Math.round((pythonStats.learned / pythonStats.total) * 100) : 0,
      icon: <img src={python} alt="Python" className="w-10 h-10" />
    },
    {
        to: '/powerbi',
        title: 'Power BI',
        description: 'Create interactive dashboards.',
        progress: powerbiStats.total > 0 ? Math.round((powerbiStats.learned / powerbiStats.total) * 100) : 0,
        icon: <img src={PowerBi} alt="Power BI" className="w-10 h-10" />
    },
    {
        to: '/pandas',
        title: 'Pandas',
        description: 'Master data manipulation in Python.',
        progress: pandasStats.total > 0 ? Math.round((pandasStats.learned / pandasStats.total) * 100) : 0,
        icon: <span className="text-4xl">🐼</span>
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My Progress</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {skills.map((skill, index) => (
            <ProgressCard
              key={index}
              to={skill.to}
              title={skill.title}
              description={skill.description}
              progress={skill.progress}
              icon={skill.icon}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Progress;
