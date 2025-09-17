import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';

const ProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [surveyCompleted, setSurveyCompleted] = useState(null);

  useEffect(() => {
    const checkSurvey = async () => {
      if (isLoaded && isSignedIn) {
        const userId = user.id;
        const responseRef = ref(db, `users/${userId}/responses`);
        const snapshot = await get(responseRef);
        setSurveyCompleted(snapshot.exists());
      } else if (isLoaded && !isSignedIn) {
        setSurveyCompleted(false);
      }
    };

    checkSurvey();
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded || surveyCompleted === null) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" />;
  }

  if (surveyCompleted) {
    return <Navigate to="/home" />;
  }

  return children;
};

export default ProtectedRoute;
