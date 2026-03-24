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

function Privacy() {
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
      className="min-h-screen bg-white text-slate-800 font-['Comic_Sans_MS',_cursive] antialiased relative overflow-hidden selection:bg-blue-100"
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
          <div className="flex flex-col lg:flex-row gap-20 items-start">
            
            {/* Left Side: Headline */}
            <div className="lg:w-1/3">
              <h1 className="text-6xl font-black text-slate-900 mb-8 leading-[0.9] tracking-tighter">Privacy.</h1>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.2em] mb-8">Data Ethics at STED</p>
              <p className="text-slate-500 leading-relaxed max-w-sm">
                We believe in total transparency. Your data is your property, and we treat it with the highest level of respect and security.
              </p>
            </div>

            {/* Right Side: Privacy Content */}
            <div className="flex-1 space-y-16">
              <section className="space-y-6">
                <div className="w-10 h-1 rounded-full bg-blue-600"></div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Security First</h2>
                <div className="grid gap-12 sm:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-700">Data Encryption</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      All your progress, projects, and personal details are encrypted at rest and in transit using industry-standard protocols.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-700">Minimal Collection</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      We only collect the minimum amount of information necessary to provide you with a high-quality learning experience.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="w-10 h-1 rounded-full bg-blue-600/30"></div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Cookie Policy</h2>
                <p className="text-slate-500 leading-relaxed text-[15px]">
                  STED uses cookies to remember your preferences and keep you logged in. We do not use tracking cookies for third-party advertising. Your learning journey remains private and focused.
                </p>
              </section>

              <section className="space-y-6 p-10 bg-slate-50 rounded-[48px]">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Your Rights</h2>
                <ul className="space-y-6 text-slate-500 text-[15px]">
                  <li className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-blue-600 shadow-sm">1</div>
                    <span>Right to access and export all your data anytime.</span>
                  </li>
                  <li className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-blue-600 shadow-sm">2</div>
                    <span>Right to permanent deletion of your account.</span>
                  </li>
                  <li className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-blue-600 shadow-sm">3</div>
                    <span>Right to request corrections to any information.</span>
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </main>

        <footer className="py-12 border-t border-slate-100/50 mt-20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              &copy; 2026 STED Technologies Inc.
            </div>
            <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="text-blue-600 font-bold transition-colors">Privacy Policy</Link>
              <Link to="/contact" className="hover:text-blue-600 transition-colors">Contact US</Link>
            </div>
          </div>
        </footer>
      </div>
    </motion.div>
  );
}

export default Privacy;