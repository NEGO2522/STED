import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ref, onValue, set, get } from 'firebase/database';
import { db } from '../firebase';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'react-hot-toast';

// Static student (Alex Chen)
const staticStudents = [
  {
    id: 1,
    name: 'Alex Chen',
    avatar: '👨‍💻',
    level: 'Intermediate',
    skills: ['Python', 'Data Science'],
    conceptsLearned: 15,
    projectsCompleted: 3,
    isOnline: true,
    lastActive: '2 minutes ago',
  },
];

function DiscoverStudents() {
  const [students, setStudents] = useState([]);
  const navigate = useNavigate();
  const { user } = useUser();

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersObj = snapshot.val();
        const myEmail = user?.primaryEmailAddress?.emailAddress;
        const usersArr = Object.entries(usersObj)
          .filter(([uid, data]) => {
            // Exclude current user by email
            if (!myEmail) return true;
            return (data.email !== myEmail && data.emailAddress !== myEmail);
          })
          .map(([uid, data]) => {
            const skills = Object.keys(data).filter(k => ['python', 'data-science', 'public-speaking', 'powerbi'].includes(k));
            return {
              id: uid,
              name: data.name || data.username || 'Student',
              avatar: data.avatar || '👤',
              level: data.level || '',
              skills: skills.length > 0 ? skills : ['no skills'],
              isOnline: true, // Optionally implement real online status
              lastActive: '', // Optionally implement last active
            };
          });
        setStudents(usersArr);
      } else {
        setStudents([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Combine static and dynamic students, but keep Alex Chen at the top
  const allStudents = [...staticStudents, ...students];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-8 w-full max-w-[1800px] mx-auto px-4"
      >
        {allStudents.map((student) => (
          <motion.div
            key={student.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 flex flex-col cursor-pointer transform hover:-translate-y-1 border border-gray-100 hover:border-indigo-100 w-full h-full min-h-[380px] max-w-[420px] mx-auto overflow-hidden group"
            onClick={(e) => {
              // Only navigate if clicking directly on the card background
              if (e.target === e.currentTarget) {
                if (student.id !== '1') {
                  navigate(`/userprofile/${student.id}`);
                }
              }
            }}
          >
            <div className="relative w-full h-32 -mx-6 -mt-6 mb-4 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
              <div className="absolute -bottom-10 left-6 flex items-end">
                <div className="relative w-24 h-24 rounded-full border-4 border-white bg-white shadow-lg flex items-center justify-center">
                  <div className="text-4xl text-indigo-600">{student.avatar}</div>
                  <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${student.isOnline ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                </div>
              </div>
            </div>
            <div className="mt-4 px-2 w-full">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 text-xl">{student.name}</h3>
                  <p className="text-sm text-slate-500">{student.level || 'Beginner'}</p>
                </div>
                <div className="flex space-x-2">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-medium text-slate-700">{student.conceptsLearned || 0}</span>
                    <span className="text-xs text-slate-500">Concepts</span>
                  </div>
                  <div className="h-8 w-px bg-gray-200"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-medium text-slate-700">{student.projectsCompleted || 0}</span>
                    <span className="text-xs text-slate-500">Projects</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 mb-6 w-full">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {student.skills.slice(0, 5).map((skill) => (
                    <span 
                      key={skill} 
                      className="bg-white text-indigo-700 px-3 py-1.5 rounded-md text-xs font-medium shadow-sm border border-gray-100 whitespace-nowrap hover:bg-indigo-50 transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                  {student.skills.length > 5 && (
                    <span className="bg-white text-slate-500 px-3 py-1.5 rounded-md text-xs font-medium">
                      +{student.skills.length - 5}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-auto w-full flex flex-col space-y-3">
                <button 
                  className="no-navigation w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 transform group-hover:scale-[1.02] shadow-sm hover:shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (student.id === '1') return; // Skip for static user
                    
                    try {
                      const currentUser = user;
                      if (!currentUser) {
                        toast.error('Please sign in to observe users');
                        return;
                      }
                      
                      // Get current user's ID from Clerk
                      const observerId = currentUser.id;
                      
                      // Get the target user's reference
                      const userRef = ref(db, `users/${student.id}`);
                      const userSnap = await get(userRef);
                      
                      if (!userSnap.exists()) {
                        toast.error('User not found');
                        return;
                      }
                      
                      const userData = userSnap.val();
                      const currentObservers = userData.observers || [];
                      
                      // Check if already observing
                      if (currentObservers.includes(observerId)) {
                        toast.success('You are already observing this user');
                        return;
                      }
                      
                      // Add to observers array
                      const updatedObservers = [...currentObservers, observerId];
                      
                      // Update in Firebase
                      await set(ref(db, `users/${student.id}/observers`), updatedObservers);
                      
                      // Update local state if needed
                      const updatedStudents = students.map(s => 
                        s.id === student.id 
                          ? { ...s, observers: updatedObservers } 
                          : s
                      );
                      setStudents(updatedStudents);
                      
                      toast.success(`Now observing ${student.name}`);
                    } catch (error) {
                      console.error('Error updating observer status:', error);
                      toast.error('Failed to update observer status');
                    }
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Observe</span>
                </button>
                <button 
                  className="no-navigation w-full bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 transform group-hover:scale-[1.02] shadow-sm hover:shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/userprofile/${student.id}`);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>View Profile</span>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default DiscoverStudents;