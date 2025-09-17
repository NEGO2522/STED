import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import ProfileIcon from '../components/ProfileIcon';

function Contact() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl animate-float" />
        <div className="absolute bottom-1/3 -left-20 w-80 h-80 bg-indigo-100 rounded-full opacity-40 blur-3xl animate-float animation-delay-2000" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-violet-100 rounded-full opacity-30 blur-3xl animate-float animation-delay-4000" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col">
        {/* Navigation */}
        <header className="py-6">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-700 cursor-pointer" onClick={() => navigate('/')}>STED-LS</div>
            <div className="flex items-center space-x-4">
              {isSignedIn ? (
                <ProfileIcon />
              ) : (
                <>
                  <Link to="/login" className="text-slate-700 hover:text-blue-600 transition-colors">Sign In</Link>
                  <Link to="/signup" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center py-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20"
          >
            <div className="p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Contact Us</h1>
                <p className="text-slate-600 text-sm">We're here to help and answer any questions you might have.</p>
              </div>

              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-base font-semibold text-slate-800 uppercase tracking-wider mb-1">Contact Information</h3>
                  <div className="w-16 h-1 bg-blue-500 mx-auto mb-4 rounded-full"></div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-center p-6 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-center">
                    <div>
                      <div className="flex justify-center mb-3">
                        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 mx-auto">
                          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-500">Email</p>
                      <a href="mailto:support@sted.com" className="text-base font-medium text-slate-800 hover:text-blue-600 transition-colors">support@sted.com</a>
                    </div>
                  </div>

                  <div className="flex items-center justify-center p-6 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-center">
                    <div>
                      <div className="flex justify-center mb-3">
                        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 mx-auto">
                          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-500">Address</p>
                      <p className="text-base font-medium text-slate-800">123 Learning Street<br />EdTech City, 10001</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-center text-slate-500 mb-4">CONNECT WITH US</h4>
                  <div className="flex justify-center space-x-6">
                    <a href="#" className="text-gray-400 hover:text-gray-500">
                      <span className="sr-only">Facebook</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                      </svg>
                    </a>
                    <a href="#" className="text-gray-400 hover:text-gray-500">
                      <span className="sr-only">Twitter</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                    </a>
                    <a href="#" className="text-gray-400 hover:text-gray-500">
                      <span className="sr-only">LinkedIn</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="py-6 border-t border-slate-100 mt-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-slate-500 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} STED. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <Link to="/terms" className="text-slate-500 hover:text-blue-600 transition-colors">Terms</Link>
              <Link to="/privacy" className="text-slate-500 hover:text-blue-600 transition-colors">Privacy</Link>
              <Link to="/contact" className="text-slate-500 hover:text-blue-600 transition-colors">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Contact;