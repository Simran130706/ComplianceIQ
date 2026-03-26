import React, { useState } from 'react';
import { Eye, Bell, ShieldAlert, ArrowRight, Loader2, RefreshCcw, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const RBIMonitor: React.FC = () => {
  const [selectedCir, setSelectedCir] = useState<number | null>(null);
  const navigate = useNavigate();

  const circulars = [
    {
      id: 'RBI/AML/2024/156',
      title: 'Updated AML reporting thresholds for digital payment transactions',
      date: '14 March 2024',
      status: 'Gap Found',
      statusColor: 'bg-rose-50 text-rose-500 border-rose-100',
      impact: '312 additional transactions would be flagged under new threshold'
    },
    {
      id: 'RBI/KYC/2024/047',
      title: 'Enhanced KYC requirements for NRI account operations',
      date: '28 February 2024',
      status: 'Clear',
      statusColor: 'bg-[#A8E6CF]/10 text-[#2D5A4C] border-[#A8E6CF]/30',
      impact: null
    },
    {
      id: 'SEBI/IT/2024/012',
      title: 'Insider trading surveillance and reporting obligations',
      date: '15 January 2024',
      status: 'Processing',
      statusColor: 'bg-blue-50 text-blue-500 border-blue-100',
      impact: null
    }
  ];

  return (
    <div className="flex flex-col gap-10 w-full mx-auto pb-20">
      
      {/* Live Status Bar */}
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card p-6 flex items-center justify-between border-[#A8E6CF]/30 shadow-xl shadow-emerald-900/[0.02]">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute" />
            <div className="w-3 h-3 rounded-full bg-emerald-500 relative" />
          </div>
          <span className="text-slate-800 font-black tracking-widest uppercase text-[10px]">
            Real-time feed active: RBI, SEBI, and ED Intelligence Nodes.
          </span>
        </div>
        <button className="flex items-center gap-2 text-slate-400 hover:text-[#A8E6CF] transition-all font-black uppercase text-[10px] tracking-widest">
          <RefreshCcw className="w-4 h-4" /> Sync Violations
        </button>
      </motion.div>

      {/* Header Area */}
      <div className="flex justify-between items-end">
        <div>
           <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-white rounded-3xl shadow-lg border border-slate-100">
                <Eye className="w-10 h-10 text-[#A8E6CF]" />
              </div>
               <h1 className="text-4xl font-black text-slate-800 tracking-tighter">RBI SEBI Monitor</h1>
           </div>
           <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-xl">Continuous cross-validation of internal AI policies against external regulatory movements.</p>
        </div>
      </div>

      {/* Circular Grid */}
      <div className="grid grid-cols-1 gap-6">
        {circulars.map((cir, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            onClick={() => cir.status === 'Gap Found' ? setSelectedCir(i) : null}
            className={`glass-card p-8 flex items-center justify-between transition-all group bg-white/70 shadow-lg shadow-emerald-900/[0.01] ${
              cir.status === 'Gap Found' ? 'cursor-pointer hover:border-rose-300 hover:shadow-2xl' : ''
            } ${selectedCir === i ? 'border-rose-400 shadow-2xl scale-[1.01]' : ''}`}
          >
            <div className="flex items-start gap-6 flex-1">
              <div className={`p-4 rounded-3xl shadow-inner ${cir.status === 'Gap Found' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
                <Bell className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <span className="text-[#A8E6CF] font-black text-xs font-mono">{cir.id}</span>
                  <span className="text-slate-300 font-black text-[10px] uppercase tracking-widest">Released: {cir.date}</span>
                </div>
                <h3 className="text-xl text-slate-800 font-black tracking-tight leading-tight">{cir.title}</h3>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className={`px-5 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[10px] border flex items-center gap-2 ${cir.statusColor}`}>
                {cir.status === 'Processing' && <Loader2 className="w-4 h-4 animate-spin" />}
                {cir.status === 'Gap Found' && <AlertCircle className="w-4 h-4" />}
                {cir.status === 'Clear' && <CheckCircle2 className="w-4 h-4" />}
                {cir.status}
              </div>
              {cir.status === 'Gap Found' && (
                <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-rose-400 shadow-sm group-hover:bg-[#A8E6CF] group-hover:text-white transition-all">
                   <ArrowRight className="w-6 h-6" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Slide-in Overlay Panel */}
      <AnimatePresence>
        {selectedCir !== null && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            className="w-[700px] bg-white fixed right-0 top-0 bottom-0 z-[200] shadow-[-40px_0_100px_rgba(0,0,0,0.1)] flex flex-col p-12 overflow-hidden border-l border-slate-100"
          >
            <div className="flex justify-between items-start mb-16">
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="p-4 bg-rose-50 rounded-2xl text-rose-500"><ShieldAlert className="w-8 h-8" /></div>
                     <div>
                         <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Gap Summary</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit Reference: {circulars[selectedCir].id}</p>
                     </div>
                  </div>
               </div>
               <button onClick={() => setSelectedCir(null)} className="px-6 py-2.5 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Close Panel</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-12 pr-4 custom-scrollbar">
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Logic Discrepancy</h3>
                <div className="p-8 bg-rose-50/50 rounded-[2.5rem] border border-rose-100 text-rose-600 font-bold text-lg leading-relaxed shadow-inner">
                  New state directive requires a reduction of thresholds for all employees from <span className="underline decoration-2 underline-offset-8 decoration-rose-200">₹10,000</span> to <span className="underline decoration-2 underline-offset-8 decoration-rose-500">₹8,000</span>.
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                   <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Affected Internal Strategy</h3>
                   <span className="px-3 py-1 bg-[#A8E6CF]/10 text-[#2D5A4C] font-black text-[10px] uppercase rounded-lg border border-[#A8E6CF]/20">Clause 3.1.A</span>
                </div>
                
                <div className="grid grid-cols-2 rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl shadow-emerald-900/[0.02]">
                  <div className="p-8 bg-slate-50 border-r border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">Active Logic</p>
                    <p className="text-sm font-mono font-bold leading-relaxed text-slate-400">
                      Digital paths cross-referenced for AML if localized amount hits threshold <span className="bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded ml-1 font-black underline underline-offset-4 font-mono">₹10,000</span>.
                    </p>
                  </div>
                  <div className="p-8 bg-[#A8E6CF]/5">
                     <p className="text-[10px] font-black text-[#2D5A4C] uppercase tracking-widest mb-6 border-b border-[#A8E6CF]/20 pb-2">Required Update</p>
                    <p className="text-sm font-mono font-bold leading-relaxed text-[#2D5A4C]">
                      Digital paths cross-referenced for AML if localized amount hits threshold <span className="bg-[#A8E6CF] text-white px-1.5 py-0.5 rounded ml-1 font-black underline underline-offset-4 font-mono">₹8,000</span>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Simulation Prediction</h3>
                <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 text-[#C2410C] flex items-center gap-6 shadow-xl shadow-amber-900/[0.03]">
                   <div className="p-4 bg-white rounded-3xl shadow-sm"><TrendingUp className="w-8 h-8" /></div>
                   <p className="font-black text-lg tracking-tight leading-tight">{circulars[selectedCir].impact}</p>
                </div>
              </div>
            </div>
            
            <div className="pt-10 border-t border-slate-100">
               <button 
                 onClick={() => navigate('/policies')}
                 className="w-full h-20 bg-[#2D5A4C] text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-emerald-900/10 hover:-translate-y-1 transition-all flex items-center justify-center gap-4"
               >
                  Update Policy <ArrowRight className="w-6 h-6" />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
