import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { motion } from 'framer-motion';

function Signup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-200 via-pink-100 to-yellow-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="backdrop-blur-md bg-white/30 p-8 rounded-3xl shadow-2xl max-w-md w-full flex flex-col items-center justify-center"
        style={{ minHeight: '400px' }}
      >
        <div className="w-full flex items-center justify-center">
          <SignUp 
            afterSignUpUrl="/home"
            appearance={{
              elements: {
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
                card: 'shadow-none bg-transparent',
              }
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}

export default Signup;
