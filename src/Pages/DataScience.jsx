import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { ref, get, onValue } from 'firebase/database';
import { db } from '../firebase';

const SKILLS = [
  {
    id: 'pandas',
    label: 'Pandas & Data Analysis',
    icon: '🐼',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    route: '/datascience/project',
    description: 'Load, clean and analyse real datasets with Python Pandas.',
  },
  {
    id: 'python',
    label: 'Python Programming',
    icon: '🐍',
    color: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    route: '/python',
    description: 'Build real projects using Python from basics to advanced.',
  },
  {
    id: 'powerbi',
    label: 'Power BI',
    icon: '📊',
    color: 'from-yellow-500 to-orange-500',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    route: '/powerbi',
    description: 'Create stunning dashboards and business intelligence reports.',
  },
];

const BENEFITS = [
  { icon: '🎯', title: 'Project-Based Learning', desc: 'Every concept is applied through real projects — not just theory.' },
  { icon: '🤖', title: 'AI Mentor', desc: 'An AI tutor helps you when you are stuck, without giving away answers.' },
  { icon: '📈', title: 'Track Your Progress', desc: 'See exactly which concepts you have learned and applied.' },
  { icon: '🏆', title: 'Build a Portfolio', desc: 'Each completed project becomes a shareable portfolio piece.' },
  { icon: '⚡', title: 'Learn by Doing', desc: 'Write and run real code inside STED — no setup required.' },
  { icon: '🎓', title: 'Industry-Relevant Skills', desc: 'Pandas, Python and Power BI are the top tools employers look for.' },
];

const ROADMAP = [
  { step: '01', title: 'Pick a skill', desc: 'Choose from Pandas, Python or Power BI to get started.' },
  { step: '02', title: 'Learn concepts', desc: 'Mark concepts as you learn them — from any source you like.' },
  { step: '03', title: 'Work on a project', desc: 'Apply what you know in a guided real-world project.' },
  { step: '04', title: 'Get AI feedback', desc: 'Ask the AI mentor for hints. It checks your work automatically.' },
  { step: '05', title: 'Build your portfolio', desc: 'Complete projects and share your public profile.' },
];

function DataScience() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, user } = useUser();

  const [userData, setUserData] = useState({ level: '', xp: 0, tasksCompleted: 0 });
  const [pandasProjects, setPandasProjects]   = useState(0);
  const [pythonProjects, setPythonProjects]   = useState(0);
  const [isLoading, setIsLoading]             = useState(true);
  const [activeTab, setActiveTab]             = useState('benefits');

  useEffect(() => {
    if (isLoaded && !isSignedIn) { setIsLoading(false); return; }
    if (!isLoaded || !isSignedIn || !user) return;

    const userRef = ref(db, 'users/' + user.id);
    const unsub = onValue(userRef, (snap) => {
      if (snap.exists()) {
        const d = snap.val();
        setUserData({ level: d.level || 'Beginner', xp: d.xp || 0, tasksCompleted: d.tasksCompleted || 0 });

        // count completed projects
        const pandasDone = d.pandas?.PandasCompletedProjects ? Object.keys(d.pandas.PandasCompletedProjects).length : 0;
        const pythonDone = d.python?.PythonCompletedProjects ? Object.keys(d.python.PythonCompletedProjects).length : 0;
        setPandasProjects(pandasDone);
        setPythonProjects(pythonDone);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [isLoaded, isSignedIn, user]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"/>
        <p className="text-slate-500">Loading…</p>
      </div>
    </div>
  );

  const totalProjects = pandasProjects + pythonProjects;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top accent */}
      <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-600" />

      {/* Navbar */}
      <div className="sticky top-1 z-50 bg-white shadow-sm">
        <Navbar hideProgressButton={true} />
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 pb-20">

        {/* ── Hero ── */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                    className="mt-10 rounded-3xl overflow-hidden bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-700 p-8 md:p-12 text-white shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wide uppercase">
                Data Science Track
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
                Learn Data Science<br/>by <span className="text-yellow-300">Building Real Projects</span>
              </h1>
              <p className="mt-3 text-purple-100 text-base max-w-lg">
                Master Pandas, Python and Power BI through hands-on projects. No boring lectures — just code, data, and results.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <Link to="/datascience/project"
                      className="bg-white text-purple-700 font-bold px-6 py-3 rounded-xl hover:bg-purple-50 transition-colors shadow-lg text-sm">
                  Start with Pandas →
                </Link>
                <Link to="/python"
                      className="border border-white/40 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm">
                  Start with Python
                </Link>
              </div>
            </div>

            {/* Mini stat cards */}
            {isSignedIn && (
              <div className="grid grid-cols-2 gap-3 min-w-[200px]">
                {[
                  { label: 'Level', value: userData.level, icon: '🎯' },
                  { label: 'Total XP', value: userData.xp, icon: '⭐' },
                  { label: 'Projects', value: totalProjects, icon: '🚀' },
                  { label: 'Streak', value: '0 days', icon: '🔥' },
                ].map(s => (
                  <div key={s.label} className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
                    <div className="text-xl">{s.icon}</div>
                    <div className="font-bold text-lg leading-tight mt-1">{s.value}</div>
                    <div className="text-purple-200 text-[11px]">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Skills ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}
                    className="mt-10">
          <h2 className="text-xl font-bold text-slate-800 mb-5">Choose Your Skill</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SKILLS.map((skill, i) => (
              <motion.div key={skill.id} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link to={skill.route}
                      className={`block rounded-2xl border ${skill.border} ${skill.bg} p-6 shadow-sm hover:shadow-md transition-all group`}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${skill.color} flex items-center justify-center text-2xl mb-4 shadow-md`}>
                    {skill.icon}
                  </div>
                  <h3 className={`font-bold text-base ${skill.text}`}>{skill.label}</h3>
                  <p className="text-slate-500 text-sm mt-1 leading-relaxed">{skill.description}</p>
                  <div className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${skill.text} group-hover:gap-2 transition-all`}>
                    Start learning <span>→</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Tabs: Benefits / Roadmap ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }}
                    className="mt-12">
          <div className="flex gap-2 mb-6">
            {[
              { id: 'benefits', label: '✨ Why STED?' },
              { id: 'roadmap',  label: '🗺️ How it works' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                        activeTab === tab.id
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-purple-300'
                      }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Benefits */}
          {activeTab === 'benefits' && (
            <motion.div key="benefits" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {BENEFITS.map((b, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                            className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="text-3xl mb-3">{b.icon}</div>
                  <h3 className="font-bold text-slate-800 text-sm">{b.title}</h3>
                  <p className="text-slate-500 text-sm mt-1 leading-relaxed">{b.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Roadmap */}
          {activeTab === 'roadmap' && (
            <motion.div key="roadmap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                        className="relative">
              {/* vertical line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-purple-100 hidden md:block" />
              <div className="space-y-5">
                {ROADMAP.map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                              className="flex gap-5 items-start bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md z-10">
                      {r.step}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{r.title}</h3>
                      <p className="text-slate-500 text-sm mt-1">{r.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ── Progress Summary (signed-in only) ── */}
        {isSignedIn && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}
                      className="mt-12 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">Your Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Pandas Projects', value: pandasProjects, route: '/datascience/project', color: 'bg-violet-500' },
                { label: 'Python Projects', value: pythonProjects, route: '/python', color: 'bg-indigo-500' },
                { label: 'Total XP Earned', value: `${userData.xp} XP`, route: null, color: 'bg-yellow-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center text-white font-extrabold text-lg shadow`}>
                    {typeof item.value === 'number' ? item.value : '⭐'}
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">{item.label}</p>
                    <p className="text-slate-800 font-bold text-xl">{item.value}</p>
                  </div>
                  {item.route && (
                    <Link to={item.route}
                          className="ml-auto text-xs text-purple-600 font-semibold hover:underline">
                      Continue →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── CTA Banner ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }}
                    className="mt-10 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center text-white shadow-xl">
          <h2 className="text-2xl font-extrabold">Ready to start building?</h2>
          <p className="text-purple-200 mt-2 text-sm">Pick a skill, work on real projects, and grow your data science career.</p>
          <div className="flex justify-center gap-4 mt-6 flex-wrap">
            <Link to="/datascience/project"
                  className="bg-white text-purple-700 font-bold px-8 py-3 rounded-xl hover:bg-purple-50 transition-colors shadow-lg text-sm">
              Start Pandas Track
            </Link>
            <Link to="/python"
                  className="border border-white/40 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm">
              Start Python Track
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

export default DataScience;
