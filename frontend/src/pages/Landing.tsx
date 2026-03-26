import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Activity, Database, Lock } from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-[#F7FAF9] overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#A8E6CF]/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-50 rounded-full blur-[120px]" />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex flex-col items-center relative z-10 max-w-4xl px-8"
      >
        <motion.div 
           initial={{ scale: 0 }} 
           animate={{ scale: 1 }} 
           transition={{ type: 'spring', damping: 15, stiffness: 100 }}
           className="w-24 h-24 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-10 border border-slate-50"
        >
          <ShieldCheck className="w-12 h-12 text-[#A8E6CF]" />
        </motion.div>

        <h1 className="text-8xl font-black text-slate-800 mb-8 tracking-tighter text-center leading-[0.9]">
          Compliance<span className="text-[#A8E6CF]">IQ</span>
        </h1>
        
        <p className="text-2xl text-slate-400 font-bold mb-16 text-center leading-tight max-w-xl">
          The next-generation <span className="text-slate-800">Intelligence Ledger</span> for regulatory enforcement & risk prediction.
        </p>
        
        <div className="grid grid-cols-3 gap-6 mb-16 w-full max-w-2xl">
           {[
             { icon: Activity, label: 'Real-time Bias' },
             { icon: Database, label: 'Audit Ready' },
             { icon: Lock, label: 'Entity Shield' }
           ].map((item, i) => (
             <motion.div 
               key={i}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.5 + i * 0.1 }}
               className="flex flex-col items-center gap-2 p-6 bg-white rounded-[2rem] shadow-sm border border-slate-50"
             >
                <item.icon className="w-6 h-6 text-[#A8E6CF]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
             </motion.div>
           ))}
        </div>

        <motion.button
          onClick={() => navigate('/home')}
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="h-24 px-16 bg-[#2D5A4C] text-white rounded-[3rem] text-xl font-black shadow-2xl shadow-emerald-500/20 flex items-center gap-6 group transition-all"
        >
          Initialize System Core
          <div className="w-10 h-10 bg-[#A8E6CF] rounded-full flex items-center justify-center group-hover:translate-x-2 transition-transform">
             <ArrowRight className="w-6 h-6 text-[#2D5A4C]" />
          </div>
        </motion.button>
        
        <div className="mt-16 flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-[#A8E6CF]" />
           <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Authorized Access Only • v2.4.0</span>
        </div>
      </motion.div>

      {/* Floating Elements */}
      <motion.div 
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} 
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[20%] right-[15%] p-6 bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-xl hidden lg:block"
      >
         <div className="flex flex-col gap-2">
            <div className="w-20 h-2 bg-[#A8E6CF]/20 rounded-full" />
            <div className="w-32 h-2 bg-slate-100 rounded-full" />
            <div className="w-16 h-2 bg-slate-100 rounded-full" />
         </div>
      </motion.div>

      <motion.div 
        animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }} 
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-[20%] left-[15%] p-6 bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-xl hidden lg:block"
      >
         <div className="flex gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-xl" />
            <div className="flex flex-col gap-2">
               <div className="w-24 h-3 bg-slate-100 rounded-full" />
               <div className="w-16 h-3 bg-rose-50 rounded-full" />
            </div>
         </div>
      </motion.div>
    </div>
  );
};
