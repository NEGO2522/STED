import React, { useEffect } from 'react';
import { SignIn, useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

function Login() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/start');
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4 relative overflow-hidden">
      {/* Professional Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h1>
        <p className="text-slate-600">Sign in to continue your learning journey</p>
      </motion.div>

      {/* Login Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full relative"
      >
        {/* Decorative Elements */}
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-50 rounded-full opacity-50" />
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-50 rounded-full opacity-50" />
        
        {/* Clerk SignIn Component Container */}
        <div className="relative z-10 w-full flex items-center justify-center">
          <SignIn 
            routing="path"
            path="/login"
            signUpUrl="/signup"
            afterSignInUrl="/start"
            afterSignUpUrl="/start"
            appearance={{
              elements: {
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
              }
            }}
          />
        </div>
      </motion.div>

      {/* Professional Accent Line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700" />
    </div>
  );
}

export default Login;
