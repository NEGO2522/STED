import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaBars,
  FaHome,
  FaUserCircle,
  FaTasks,
  FaChartLine,
  FaTrophy,
  FaCog,
  FaQuestionCircle,
  FaPen
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const handleOverlayClick = () => setOpen(false);
  const handleSidebarClick = (e) => e.stopPropagation();

  const menuItems = [
    { icon: FaHome, text: "Home", path: "/home" },
    { icon: FaUserCircle, text: "Profile", path: "/profile" },
    { icon: FaTasks, text: "All skills", path: "/all-skills" },
    { icon: FaChartLine, text: "Your Progress", path: "/progress" },
  ];

  const bottomMenuItems = [
    { icon: FaCog, text: "Settings", path: "/settings" },
    { icon: FaQuestionCircle, text: "Help / FAQ", path: "/help" },
  ];

  const MenuItem = ({ icon: Icon, text, path }) => {
    const isActive = location.pathname === path;
    return (
      <Link
        to={path}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          isActive
            ? "bg-blue-50 text-blue-700 font-medium"
            : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
        }`}
      >
        <Icon size={20} />
        <span>{text}</span>
        {isActive && (
          <motion.div
            className="w-1 h-full bg-blue-700 absolute right-0 rounded-l-full"
            layoutId="activeIndicator"
          />
        )}
      </Link>
    );
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="fixed top-5 left-5 z-60 p-2 rounded-lg bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-200 text-slate-700 hover:text-blue-700 focus:outline-none cursor-pointer"
        aria-label="Toggle Sidebar"
      >
        <FaBars size={20} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleOverlayClick}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: open ? 0 : -300 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 flex flex-col p-6"
        onClick={handleSidebarClick}
      >
        {/* Profile Section */}
        <motion.div 
          className="relative flex flex-col items-center mb-8"
          whileHover={{ scale: 1.02 }}
        >
          <div className="relative">
            <div className="p-2 rounded-full bg-blue-50">
              <FaUserCircle className="text-blue-700" size={64} />
            </div>
            
            {/* Edit Button */}
            
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="absolute -bottom-1 -right-1 bg-white p-2 rounded-full shadow-md cursor-pointer border border-slate-100 hover:border-blue-200 transition-colors duration-200"
            >
              <FaPen className="text-blue-600 text-xs" />
            </motion.div>
          </div>

          <h2 className="mt-4 text-lg font-semibold text-slate-800">Your Profile</h2>
          <p className="text-sm text-slate-500">Manage your account</p>
        </motion.div>
           

        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-6" />

        {/* Main Navigation */}
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <MenuItem key={item.text} {...item} />
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mt-6 mb-6" />
        
        <nav className="space-y-2">
          {bottomMenuItems.map((item) => (
            <MenuItem key={item.text} {...item} />
          ))}
        </nav>

        {/* Version Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">Version 1.0.0</p>
        </div>
      </motion.div>
    </>
  );
}