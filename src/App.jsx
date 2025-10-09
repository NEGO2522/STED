
import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import Start from './Pages/Start';
import Login from './Pages/Login';
import Signup from './Pages/Signup';
import Home from './Pages/Home';
import PublicSpeaking from './Pages/PublicSpeaking';
import DataScience from './Pages/DataScience';
import Python from './Pages/Python';
import Terms from './Pages/Terms';
import Privacy from './Pages/Privacy';
import Contact from './Pages/Contact';
import AllSkills from './Pages/AllSkills';
import Project from './PythonProject/Project';
import PowerBi from './Pages/PowerBi';
import Pandas from './Pages/Pandas';
import PandasProject from './PandasProject/Project';
import Profile from './Pages/Profile';
import UserProfile from './Pages/UserProfile';
import PublicPythonProject from './PythonProject/PublicPythonProject';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import Progress from './Pages/Progress';

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div style={{ minHeight: '100vh' }} className="flex flex-col items-center justify-center bg-slate-50">
        <div className="text-3xl font-bold text-slate-800 mb-4">No internet connection</div>
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold px-8 py-4 rounded-lg shadow-md transition-colors"
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/start" element={<Start />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />

        <Route path="/login" element={<SignedOut><Login /></SignedOut>} />
        <Route path="/signup" element={<SignedOut><Signup /></SignedOut>} />

        <Route path="/home" element={<SignedIn><Home /></SignedIn>} />
        <Route path="/public-speaking" element={<SignedIn><PublicSpeaking /></SignedIn>} />
        <Route path="/data-science" element={<SignedIn><DataScience /></SignedIn>} />
        <Route path="/python" element={<SignedIn><Python /></SignedIn>} />
        <Route path="/powerbi" element={<SignedIn><PowerBi /></SignedIn>} />
        <Route path="/pandas" element={<SignedIn><Pandas /></SignedIn>} />
        <Route path="/python/project" element={<SignedIn><Project /></SignedIn>} />
        <Route path="/pandas/project" element={<SignedIn><PandasProject /></SignedIn>} />
        <Route path="/All-skills" element={<SignedIn><AllSkills /></SignedIn>} />
        <Route path="/profile" element={<SignedIn><Profile /></SignedIn>} />
        <Route path="/progress" element={<SignedIn><Progress /></SignedIn>} />
        
        <Route path="/userprofile/:id" element={<UserProfile />} />
        <Route path="/python-project/:userId/:projectId" element={<PublicPythonProject />} />
      </Routes>
    </>
  );
}

export default App;
