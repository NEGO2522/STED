import React from "react";
import { useUser } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, get } from "firebase/database";

const SurveyProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [isAllowed, setIsAllowed] = useState(null);

  useEffect(() => {
    const checkSurvey = async () => {
      if (isLoaded && isSignedIn) {
        const userId = user?.id;
        const responseRef = ref(db, `users/${userId}/responses`);
        const snapshot = await get(responseRef);
        setIsAllowed(snapshot.exists());
      } else if (isLoaded && !isSignedIn) {
        setIsAllowed(false);
      }
    };

    checkSurvey();
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded || isAllowed === null) return null; // Or show loading

  if (!isSignedIn) return <Navigate to="/" replace />;
  if (!isAllowed) return <Navigate to="/survey" replace />;

  return children;
};

export default SurveyProtectedRoute;
