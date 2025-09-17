import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import ProfileIcon from '../components/ProfileIcon';

function Terms() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl animate-float" />
        <div className="absolute bottom-1/3 -left-20 w-80 h-80 bg-indigo-100 rounded-full opacity-40 blur-3xl animate-float animation-delay-2000" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-violet-100 rounded-full opacity-30 blur-3xl animate-float animation-delay-4000" />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col">
        <header className="py-6">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-700 cursor-pointer" onClick={() => navigate('/')}>STED-LS</div>
            <div className="flex items-center space-x-4">
              {isSignedIn ? (
                <ProfileIcon />
              ) : (
                <>
                  <Link to="/login" className="text-slate-700 hover:text-blue-600 transition-colors">Sign In</Link>
                  <Link to="/signup" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </header>
        
        <main className="flex-1 py-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }} 
            className="w-full max-w-7xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20 p-10"
          >
            <div className="grid md:grid-cols-1 gap-8 mt-10">
              <div className="space-y-8">
                <div className="bg-slate-50 p-6 rounded-xl hover:shadow-md transition-shadow">
                  <h2 className="text-xl font-semibold text-slate-800 mb-4">1. Introduction</h2>
                  <p className="text-slate-600">
                    Welcome to STED. These Terms of Service ("Terms") govern your use of our website and services. By accessing or using our services, you agree to be bound by these Terms.
                  </p>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl hover:shadow-md transition-shadow">
                  <h2 className="text-xl font-semibold text-slate-800 mb-4">2. Account Registration</h2>
                  <p className="text-slate-600">
                    To access certain features, you must create an account. You agree to provide accurate information and keep your account secure. You are responsible for all activities under your account.
                  </p>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl hover:shadow-md transition-shadow">
                  <h2 className="text-xl font-semibold text-slate-800 mb-4">3. User Responsibilities</h2>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>You will not use our services for any illegal or unauthorized purpose.</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>You will not violate any laws in your jurisdiction.</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>You will not upload or transmit viruses or any malicious code.</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>You will not attempt to gain unauthorized access to our systems.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl hover:shadow-md transition-shadow">
                  <h2 className="text-xl font-semibold text-slate-800 mb-4">4. Intellectual Property</h2>
                  <p className="text-slate-600">
                    All content, features, and functionality on our platform are owned by STED and are protected by international copyright, trademark, and other intellectual property laws.
                  </p>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl hover:shadow-md transition-shadow">
                  <h2 className="text-xl font-semibold text-slate-800 mb-4">5. Limitation of Liability</h2>
                  <p className="text-slate-600">
                    STED shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use our services.
                  </p>
                </div>

              </div>
            </div>
          </motion.div>
        </main>

        <footer className="py-6 border-t border-slate-100 mt-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-slate-500 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} STED. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <Link to="/terms" className="text-slate-500 hover:text-blue-600 text-sm transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="text-slate-500 hover:text-blue-600 text-sm transition-colors">Privacy Policy</Link>
              <Link to="/contact" className="text-slate-500 hover:text-blue-600 text-sm transition-colors">Contact Us</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Terms;