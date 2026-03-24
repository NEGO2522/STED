import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import ProfileIcon from '../components/ProfileIcon';
import { FiMail, FiMapPin, FiTwitter, FiLinkedin, FiGithub } from 'react-icons/fi';

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

function Contact() {
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
                Dashboard
              </Link>
              {isSignedIn && <ProfileIcon />}
            </div>
          </div>
        </header>

        <main className="flex-1 py-16">
          <div className="flex flex-col lg:flex-row gap-20 items-start">
            
            {/* Left Side: Headline */}
            <div className="lg:w-1/3">
              <h1 className="text-6xl font-black text-slate-900 mb-8 leading-[0.9] tracking-tighter">Get in Touch.</h1>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.2em] mb-8">Reach the STED team</p>
              <p className="text-slate-500 leading-relaxed max-w-sm mb-12">
                Have questions about our technical workflows or need support with your projects? Our team is ready to help you level up.
              </p>
              
              <div className="flex gap-6 opacity-40">
                <FiTwitter className="text-2xl hover:text-blue-600 cursor-pointer transition-colors" />
                <FiLinkedin className="text-2xl hover:text-blue-600 cursor-pointer transition-colors" />
                <FiGithub className="text-2xl hover:text-blue-600 cursor-pointer transition-colors" />
              </div>
            </div>

            {/* Right Side: Contact Information Cards */}
            <div className="flex-1 grid gap-8 sm:grid-cols-2 w-full">
              <motion.div 
                whileHover={{ y: -5 }}
                className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm hover:shadow-2xl transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl mb-8">
                  <FiMail />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">Email Us</h3>
                <p className="text-slate-500 mb-6 text-sm">Our support team usually responds within 24 hours.</p>
                <a href="mailto:support@sted.com" className="text-lg font-bold text-blue-600 hover:underline">support@sted.com</a>
              </motion.div>

              <motion.div 
                whileHover={{ y: -5 }}
                className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm hover:shadow-2xl transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl mb-8">
                  <FiMapPin />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">Visit Us</h3>
                <p className="text-slate-500 mb-6 text-sm">Headquarters for technical education and design.</p>
                <p className="text-lg font-bold text-slate-800 leading-snug">
                  123 Code Avenue<br />
                  Innovation District, SF
                </p>
              </motion.div>

              <div className="sm:col-span-2 p-10 bg-slate-50 border border-slate-100/50 rounded-[48px]">
                <h3 className="text-xl font-bold text-slate-800 mb-4 tracking-tight text-center">Open Support Hours</h3>
                <div className="flex justify-center gap-10 items-center">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mon - Fri</p>
                    <p className="text-lg font-bold text-slate-700">9AM - 6PM</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200" />
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sat - Sun</p>
                    <p className="text-lg font-bold text-slate-700">Closed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="py-12 border-t border-slate-100/50 mt-20 font-bold">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-[10px] text-slate-400 uppercase tracking-[0.3em]">
              &copy; 2026 STED Technologies Inc.
            </div>
            <div className="flex gap-12 text-[10px] uppercase tracking-[0.2em] text-slate-400">
              <Link to="/terms" className="hover:text-blue-600">Terms</Link>
              <Link to="/privacy" className="hover:text-blue-600">Privacy</Link>
              <Link to="/" className="hover:text-blue-600 text-blue-600 font-black">Home</Link>
            </div>
          </div>
        </footer>
      </div>
    </motion.div>
  );
}

export default Contact;