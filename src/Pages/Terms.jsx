import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import ProfileIcon from '../components/ProfileIcon';

function FallingStars() {
  const starsArray = Array.from({ length: 15 });
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {starsArray.map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            top: "-10%",
            left: Math.random() * 100 + "%",
            opacity: 0,
            scale: 0.5 + Math.random()
          }}
          animate={{
            top: "110%",
            left: i % 2 === 0 ? "-10%" : "110%",
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 15,
            ease: "linear"
          }}
          className="absolute w-[3px] h-[150px] bg-gradient-to-t from-transparent via-blue-500/60 to-transparent"
          style={{ transform: i % 2 === 0 ? "rotate(45deg)" : "rotate(-45deg)" }}
        />
      ))}
    </div>
  );
}

function Terms() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center font-['Comic_Sans_MS',_cursive]">Loading...</div>;
  }

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "-100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="min-h-screen bg-white text-slate-800 font-['Comic_Sans_MS',_cursive] antialiased relative overflow-hidden"
    >
      <FallingStars />
      
      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10 flex flex-col min-h-screen">
        <header className="py-10">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-3xl font-black tracking-tighter text-blue-600">
              STED
            </Link>
            <div className="flex items-center space-x-6">
              <Link to="/home" className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">
                Go to App
              </Link>
              {isSignedIn && <ProfileIcon />}
            </div>
          </div>
        </header>

        <main className="flex-1 py-16">
          <div className="flex flex-col lg:flex-row gap-20">
            {/* Left Side: Title & Overview */}
            <div className="lg:w-1/3 xl:w-1/4">
              <h1 className="text-6xl font-black text-slate-900 mb-8 leading-[0.9] tracking-tighter">Terms</h1>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.2em] mb-4">Last Update: March 2026</p>
              <p className="text-slate-500 leading-relaxed max-w-xs">
                Welcome to the STED platform. Please review our legal requirements and user guidelines below.
              </p>
            </div>

            {/* Right Side: Content Sections in Grid */}
            <div className="flex-1">
              <div className="grid md:grid-cols-2 gap-12">
                <section className="space-y-6">
                  <div className="w-10 h-1 rounded-full bg-blue-600"></div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">1. Usage Rights</h2>
                  <p className="text-slate-500 leading-relaxed text-[15px]">
                    By accessing STED, you agree to these legal terms. We provide a limited, non-transferable license to use our learning tools for personal growth and educational purposes only.
                  </p>
                </section>

                <section className="space-y-6">
                  <div className="w-10 h-1 rounded-full bg-blue-600/30"></div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">2. User Accounts</h2>
                  <p className="text-slate-500 leading-relaxed text-[15px]">
                    You are responsible for maintaining the security of your account. Any activity performed under your credentials is your responsibility. Do not share your access.
                  </p>
                </section>

                <section className="space-y-6">
                  <div className="w-10 h-1 rounded-full bg-blue-600/30"></div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">3. Code of Conduct</h2>
                  <ul className="space-y-4 text-slate-500 text-[15px]">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      No illegal or unauthorized use.
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      No malicious code or viruses.
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      No system tampering.
                    </li>
                  </ul>
                </section>

                <section className="space-y-6">
                  <div className="w-10 h-1 rounded-full bg-blue-600/30"></div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">4. Property</h2>
                  <p className="text-slate-500 leading-relaxed text-[15px]">
                    STED owns all curriculum, source code, and assets. You may not reproduce our technical workflows without explicit written permission from our legal team.
                  </p>
                </section>
              </div>
            </div>
          </div>
        </main>

        <footer className="py-12 border-t border-slate-100/50 mt-20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              &copy; 2026 STED Technologies Inc.
            </div>
            <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <Link to="/privacy" className="hover:text-blue-600">Privacy</Link>
              <Link to="/contact" className="hover:text-blue-600">Contact</Link>
              <Link to="/" className="hover:text-blue-600">Home</Link>
            </div>
          </div>
        </footer>
      </div>
    </motion.div>
  );
}

export default Terms;