import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';

const ProjectProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const location = useLocation();
  const [projectStarted, setProjectStarted] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProjectStatus = async () => {
      // Only check Python project status for /python/project
      if (location.pathname === '/python/project') {
        if (isLoaded && isSignedIn && user) {
          try {
            const userRef = ref(db, `users/${user.id}/python`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
              const userData = snapshot.val();
              setProjectStarted(userData.PythonProjectStarted === true);
            } else {
              setProjectStarted(false);
            }
          } catch (error) {
            console.error('Error checking project status:', error);
            setProjectStarted(false);
          }
          setLoading(false);
        } else if (isLoaded && !isSignedIn) {
          setProjectStarted(false);
          setLoading(false);
        }
      } else {
        // For other routes (e.g., /pandas/project), always allow
        setProjectStarted(true);
        setLoading(false);
      }
    };

    checkProjectStatus();
  }, [isLoaded, isSignedIn, user, location.pathname]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-slate-600 text-base">
            Checking project status...
          </div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" />;
  }

  if (!projectStarted) {
    return <Navigate to="/python" />;
  }

  return children;
};

export default ProjectProtectedRoute; 