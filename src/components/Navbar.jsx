import React, { useState, useEffect } from 'react';
import { UserButton, useAuth, useUser } from "@clerk/clerk-react";
import { Link, useLocation } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

function Navbar() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const location = useLocation();
  const [activePath, setActivePath] = useState('');

  useEffect(() => {
    setActivePath(location.pathname);
  }, [location]);

  const navItems = [
    { path: '/all-skills', label: 'All Skills' },
    { path: isSignedIn ? '/profile' : '/login', label: 'My Learning' },
    { path: '/home', label: 'Dashboard' },
  ];

  const isActive = (path) => {
    if (path === '/start') return activePath === '/' || activePath === '/start';
    return activePath.startsWith(path);
  };

  return (
    <div className="w-full h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex items-center px-6 z-50 fixed top-0 left-0 right-0">
      {/* Logo */}
      <div className="flex-shrink-0">
        <Link to="/start" className="text-xl font-bold text-gray-800 hover:text-indigo-600 transition-colors tracking-tight">
          STED
        </Link>
      </div>

      {/* Center Navigation */}
      <nav className="hidden md:flex items-center justify-center flex-1 space-x-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive(item.path)
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Right section */}
      <div className="flex-shrink-0 flex items-center">
        {isSignedIn ? (
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-700 leading-tight">{user?.fullName || user?.username || 'User'}</div>
              <div className="text-xs text-gray-500">View Profile</div>
            </div>
            <div className="ml-1">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Link 
              to="/login" 
              className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/signup" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Navbar;
