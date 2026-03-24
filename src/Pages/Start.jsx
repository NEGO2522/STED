import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import photo1 from '../assets/Photo1.jpeg';
import photo2 from '../assets/Photo2.webp';
import photo3 from '../assets/Photo3.webp';
import { FiArrowRight, FiCheck, FiCode, FiDatabase, FiBarChart, FiCpu, FiLayers, FiZap, FiActivity } from 'react-icons/fi';
import { SiPython, SiPandas, SiNumpy, SiScikitlearn, SiTableau, SiPytorch, SiTensorflow } from 'react-icons/si';

function FallingStars() {
  const starsArray = Array.from({ length: 15 });
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-40">
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
            left: i % 2 === 0 ? "-10%" : "110%", // Diagonal motion alternating
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

function AmbientGlows() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100/30 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100/20 blur-[100px] rounded-full" />
      <div className="absolute top-[30%] right-[10%] w-[20%] h-[30%] bg-blue-50/40 blur-[80px] rounded-full" />
    </div>
  );
}

function TechMarquee() {
  const techs = [
    { icon: <SiPython />, name: 'Python', color: 'text-yellow-500' },
    { icon: <SiPandas />, name: 'Pandas', color: 'text-blue-900' },
    { icon: <SiNumpy />, name: 'NumPy', color: 'text-blue-500' },
    { icon: <SiScikitlearn />, name: 'Scikit-Learn', color: 'text-orange-500' },
    { icon: <FiBarChart />, name: 'Power BI', color: 'text-yellow-600' },
    { icon: <SiTableau />, name: 'Tableau', color: 'text-blue-400' },
    { icon: <SiPytorch />, name: 'PyTorch', color: 'text-red-500' },
    { icon: <SiTensorflow />, name: 'TensorFlow', color: 'text-orange-600' },
  ];

  return (
    <div className="relative w-full py-12 overflow-hidden bg-white/50 backdrop-blur-sm border-y border-slate-50">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />
      
      <motion.div 
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="flex space-x-12 items-center whitespace-nowrap w-fit px-12"
      >
        {[...techs, ...techs].map((tech, i) => (
          <div key={i} className="flex items-center space-x-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-default group">
            <span className="text-2xl group-hover:text-blue-600 transition-colors">{tech.icon}</span>
            <span className="text-xs font-black uppercase tracking-[0.2em]">{tech.name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function StatsSection() {
  const stats = [
    { label: 'Active Learners', value: '12K+', icon: <FiActivity /> },
    { label: 'Courses Built', value: '45+', icon: <FiLayers /> },
    { label: 'Success Rate', value: '98%', icon: <FiZap /> },
    { label: 'Real Projects', value: '150+', icon: <FiCode /> },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-24">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center p-8 rounded-[32px] bg-slate-50/50 border border-slate-100/50 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 text-xl mx-auto mb-6 shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all">
              {stat.icon}
            </div>
            <div className="text-4xl font-black text-slate-800 mb-2">{stat.value}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function useScrollProgress() {
  const [completion, setCompletion] = useState(0);
  useEffect(() => {
    const updateScrollCompletion = () => {
      const currentProgress = window.scrollY;
      const scrollHeight = document.body.scrollHeight - window.innerHeight;
      if (scrollHeight) {
        setCompletion(Number((currentProgress / scrollHeight).toFixed(2)));
      }
    };
    window.addEventListener("scroll", updateScrollCompletion);
    return () => window.removeEventListener("scroll", updateScrollCompletion);
  }, []);
  return completion;
}

function Start() {
  const images = [photo1, photo2, photo3];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000); // 4 seconds interval
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "-100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200, duration: 0.3 }}
      className="min-h-screen bg-white text-slate-800 font-['Comic_Sans_MS',_cursive] antialiased relative overflow-hidden selection:bg-blue-100"
    >
      <FallingStars />
      <AmbientGlows />
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-blue-600 origin-left z-[100]"
        style={{ scaleX: useScrollProgress() }}
      />
      {/* Navbar */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-5xl z-50 bg-white/95 backdrop-blur-md border border-slate-100 rounded-full shadow-lg">
        <div className="px-8 flex justify-between items-center h-16">
          <div className="flex items-center space-x-10">
            <Link to="/" className="text-2xl font-black tracking-tighter text-blue-600">
              STED
            </Link>
            <div className="hidden md:flex items-center space-x-6 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-slate-900 transition-colors cursor-pointer"
              >
                Features
              </button>
              <Link to="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-slate-900 transition-colors">Support</Link>
            </div>
          </div>
          <div className="flex items-center">
            <Link to="/home" className="text-xs font-bold uppercase tracking-widest text-white bg-blue-600 px-6 py-2.5 rounded-full hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 lg:pt-60 lg:pb-64">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-20">
            
            {/* Left Content */}
            <div className="flex-1 max-w-md text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-3 text-blue-600 font-bold text-xs uppercase tracking-[0.3em] mb-8"
              >
                <span className="w-12 h-[2px] bg-blue-600"></span>
                STED Learning
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl lg:text-[72px] font-bold text-slate-800 leading-[1.0] tracking-tight mb-10"
              >
                Learn Skills <br />
                <span className="text-slate-400">Master</span> It.
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg text-slate-500 mb-14 leading-relaxed max-w-md mx-auto lg:mx-0"
              >
                The premium platform for mastering Python, Data Science, and Power BI through industry workflows.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5"
              >
                <Link to="/home" className="w-full sm:w-auto px-12 py-5 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 hover:scale-[1.02] hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 group shadow-lg shadow-blue-50">
                  Start Now
                  <FiArrowRight className="group-hover:translate-x-1" />
                </Link>
                <Link to="/All-skills" className="w-full sm:w-auto px-12 py-5 rounded-full bg-white text-slate-600 font-bold text-lg border border-slate-200 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50/10 transition-all flex items-center justify-center gap-2">
                  Catalog
                </Link>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-16 flex items-center justify-center lg:justify-start gap-8 opacity-60"
              >
                {[
                  { icon: <FiCode />, label: 'Python' },
                  { icon: <FiDatabase />, label: 'Data Science' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center text-xs text-blue-600">
                      {item.icon}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right Content - Image Slideshow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ 
                rotateX: -2, 
                rotateY: 5, 
                scale: 1.01,
                transition: { duration: 0.4, ease: "easeOut" }
              }}
              transition={{ duration: 0.8 }}
              className="flex-1 w-full max-w-lg perspective-[1000px]"
            >
              <div className="relative aspect-square sm:aspect-[4/3] rounded-[48px] overflow-hidden border-[16px] border-white shadow-[0_48px_80px_-24px_rgba(0,0,0,0.1)] bg-white">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImageIndex}
                    src={images[currentImageIndex]}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full object-cover grayscale-[0.1] hover:grayscale-0 transition-all duration-700"
                    alt={`Slide ${currentImageIndex}`}
                  />
                </AnimatePresence>

                {/* Navigation Dots */}
                <div className="absolute bottom-10 left-10 flex gap-3 z-20">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`h-1 rounded-full transition-all duration-500 ${
                        i === currentImageIndex ? 'w-10 bg-blue-600' : 'w-2 bg-black/10 hover:bg-black/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <TechMarquee />

      {/* Stats Breakdown */}
      <StatsSection />

      {/* Simplified Features section */}
      <section id="features" className="py-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-24 max-w-xl mx-auto">
            <h2 className="text-3xl font-black text-slate-800 mb-6 tracking-tight">Focus on Learning.</h2>
            <p className="text-slate-500 font-medium leading-relaxed">A structured platform for professional skill mastery.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            {[
              { title: 'Project-Based', desc: 'Mastery through building. Real industry workflows in every course.' },
              { title: 'Sleek Tools', desc: 'Learn Python, Power BI, and Data Science with cutting-edge assignments.' },
            ].map((feature, i) => (
              <div key={i} className="p-12 bg-white border border-slate-100/60 rounded-[40px] shadow-sm hover:shadow-xl transition-all">
                <h3 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clean Rounded Footer */}
      <div className="bg-white px-6 pb-12 pt-12">
        <footer className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-[32px] p-12 shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="space-y-6 text-center md:text-left w-full md:w-auto">
              <div className="text-3xl font-black tracking-tighter text-blue-600">STED</div>
              <p className="text-slate-500 max-w-xs leading-relaxed text-sm mx-auto md:mx-0">
                A premium learning platform designed for modern professionals and aspiring technologists.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-12 sm:gap-24 w-full md:w-auto">
              <div className="space-y-4">
                <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em]">Platform</h4>
                <ul className="space-y-3 text-sm text-slate-400 font-medium">
                  <li><Link to="/All-skills" className="hover:text-blue-600 transition-colors">Skills Catalog</Link></li>
                  <li><Link to="/home" className="hover:text-blue-600 transition-colors">Dashboard</Link></li>
                  <li><Link to="/progress" className="hover:text-blue-600 transition-colors">Learning Path</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em]">Legal</h4>
                <ul className="space-y-3 text-sm text-slate-400 font-medium">
                  <li><Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link></li>
                  <li><Link to="/terms" className="hover:text-blue-600 transition-colors">Terms</Link></li>
                  <li><Link to="/contact" className="hover:text-blue-600 transition-colors">Contact</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-16 pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-400 text-xs font-bold uppercase tracking-widest">
            <div>&copy; 2026 STED Technologies Inc.</div>
            <div className="flex gap-8">
              <a href="#" className="hover:text-blue-600 transition-colors">Twitter</a>
              <a href="#" className="hover:text-blue-600 transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Discord</a>
            </div>
          </div>
        </footer>
      </div>
    </motion.div>
  );
}

export default Start;