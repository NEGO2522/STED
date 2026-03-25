import React from 'react';
import { UserButton, useAuth, useUser } from "@clerk/clerk-react";
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/start') return location.pathname === '/' || location.pathname === '/start';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-5xl z-50 bg-white/95 backdrop-blur-md border border-slate-100 rounded-full shadow-lg font-['Comic_Sans_MS',_cursive]">
      <div className="px-8 flex justify-between items-center h-16">
        {/* Logo */}
        <div className="flex items-center space-x-10">
          <Link to="/" className="text-2xl font-black tracking-tighter text-blue-600">
            STED
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/home" className={`text-[11px] font-black uppercase tracking-widest transition-colors ${isActive('/home') ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}>
              Home
            </Link>
            {/* <Link to="/All-skills" className={`text-[11px] font-black uppercase tracking-widest transition-colors ${isActive('/All-skills') ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}>
              Skills
            </Link> */}
            <Link to="/contact" className={`text-[11px] font-black uppercase tracking-widest transition-colors ${isActive('/contact') ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}>
              Support
            </Link>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          {isSignedIn ? (
            <div className="flex items-center space-x-4 border-l border-slate-100 pl-6 ml-2">
              <div className="hidden sm:block text-right">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Welcome!</div>
                <div className="text-sm font-bold text-slate-900 leading-none">{user?.firstName || 'Learner'}</div>
              </div>
              <div className="scale-110">
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          ) : (
            <Link to="/" className="text-xs font-black uppercase tracking-widest text-white bg-blue-600 px-6 py-2.5 rounded-full hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
              Go to Start
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
