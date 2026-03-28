import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from './Navbar';
import { AIAssistant } from './AIAssistant';

export const Layout: React.FC = () => {
  const location = useLocation();

  if (location.pathname === '/') {
    return (
      <main className="w-full h-screen overflow-hidden relative bg-[#F7FAF9]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-50 rounded-full blur-[120px] -z-1" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#A8E6CF]/10 rounded-full blur-[120px] -z-1" />
        <Outlet />
        <AIAssistant />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FAF9] text-slate-800 font-sans">
      <Navbar />
      
      {/* Main Content Area */}
      <div className="pt-20"> 
        <main className="max-w-[1280px] mx-auto px-6 py-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <footer className="py-12 border-t border-slate-100 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-black text-slate-800 tracking-tighter">DhanrakshaQ</span>
            <span className="text-slate-300">|</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Regulatory Ledger Node</span>
          </div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">© 2026 Secured Compliance Intelligence Portal</p>
        </div>
      </footer>

      {/* Floating AI Assistant Widget */}
      <AIAssistant />
    </div>
  );
};
