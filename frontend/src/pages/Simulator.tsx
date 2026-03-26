import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Cpu, Activity, Play } from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatINR } from '../utils/format';
import { motion, AnimatePresence } from 'framer-motion';

export const Simulator: React.FC = () => {
  const { transactions } = useData();
  const [threshold, setThreshold] = useState(10000);
  const [showToast, setShowToast] = useState(false);

  const { currentV, predictedV } = useMemo(() => {
    let cv = 0;
    let pv = 0;
    transactions.forEach(t => {
      if (t['Is Laundering'] === 1 && t['Amount Paid'] > threshold) cv++;
      if (t['Amount Paid'] > threshold) pv++;
    });
    return { currentV: cv, predictedV: pv };
  }, [transactions, threshold]);

  const maxVal = Math.max(currentV, predictedV, 10);
  const isHighImpact = predictedV > currentV * 2;

  const handleApply = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="flex flex-col gap-10 w-full mx-auto pb-20">
      
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="p-5 rounded-3xl bg-white shadow-xl border border-slate-100">
          <Cpu className="w-10 h-10 text-[#A8E6CF]" />
        </div>
        <div className="space-y-2">
           <h2 className="text-5xl font-black text-slate-800 tracking-tighter">What-If Prediction Simulator</h2>
           <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-xl">Dry-run threshold manipulations against historical datasets before applying live-layer sanctions.</p>
        </div>
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card p-12 shadow-2xl shadow-emerald-900/[0.04] bg-white/70 border-slate-50">
        
        <div className="flex flex-col gap-4 mb-12">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Strategy Objective</label>
           <div className="relative">
              <select className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-5 text-slate-800 font-black tracking-tight appearance-none focus:outline-none focus:ring-2 focus:ring-[#A8E6CF]/20 transition-all outline-none">
                <option>Section 3.1 AML Transaction Threshold</option>
                <option>Protocol 3.2: Velocity/frequency Distribution</option>
                <option>Protocol 4.5: Geographic Outlier Detection</option>
              </select>
              <Activity className="absolute right-8 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
           </div>
        </div>

        <div className="flex flex-col gap-8 mb-16 px-2">
          <div className="flex justify-between items-end">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Filter</label>
            <div className="flex flex-col items-end">
               <span className="text-4xl font-black text-slate-800 tracking-tighter">${threshold.toLocaleString()}</span>
               <span className="text-[10px] font-black text-[#A8E6CF] uppercase tracking-[0.2em]">{formatINR(threshold)} INR</span>
            </div>
          </div>
          
          <input 
            type="range" 
            min="5000" max="25000" step="1000"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-100 rounded-full appearance-none outline-none cursor-pointer accent-[#A8E6CF]"
          />
          <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest">
            <span>Minimum Risk Path</span>
            <span>Maximum Regulation Path</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-16">
          <div className="bg-slate-50/50 p-8 rounded-[2.5rem] flex flex-col items-center text-center border border-slate-100 transition-all hover:shadow-lg">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Current Violations</h3>
            <span className="text-6xl font-black text-slate-300 tracking-tighter">{currentV.toLocaleString()}</span>
            <p className="text-[10px] font-black text-slate-300 mt-6 uppercase tracking-widest">Baseline Log Entries</p>
          </div>
          <div className={`p-8 rounded-[2.5rem] flex flex-col items-center text-center transition-all duration-500 border-2 ${isHighImpact ? 'bg-rose-50 border-rose-100 shadow-xl shadow-rose-900/[0.03]' : 'bg-[#F7FAF9] border-[#A8E6CF]/30 shadow-xl shadow-emerald-900/[0.03]'}`}>
            <h3 className={`text-[10px] font-black uppercase tracking-widest mb-6 ${isHighImpact ? 'text-rose-400' : 'text-[#2D5A4C]'}`}>Predicted Violations</h3>
            <span className={`text-6xl font-black tracking-tighter ${isHighImpact ? 'text-rose-500' : 'text-[#2D5A4C]'}`}>{predictedV.toLocaleString()}</span>
            <p className={`text-[10px] font-black mt-6 uppercase tracking-widest ${isHighImpact ? 'text-rose-300' : 'text-[#A8E6CF]'}`}>Projected Outcome</p>
          </div>
        </div>

        {/* Dynamic Bar Distribution */}
        <div className="flex items-end justify-center gap-16 h-56 mb-16 border-b border-slate-100 pb-1 w-full mx-auto px-10">
          <div className="w-32 bg-slate-100 rounded-[1.5rem] relative group flex items-end justify-center transition-all duration-1000 shadow-inner" style={{ height: `${(currentV/maxVal)*100}%` }}>
            <span className="absolute -top-10 text-[11px] font-black text-slate-300 uppercase tracking-widest">Active</span>
          </div>
          <div className={`w-32 rounded-[1.5rem] relative group flex items-end justify-center transition-all duration-1000 shadow-2xl ${isHighImpact ? 'bg-rose-500 shadow-rose-500/20' : 'bg-[#A8E6CF] shadow-emerald-500/20'}`} style={{ height: `${(predictedV/maxVal)*100}%` }}>
            <span className={`absolute -top-10 text-[11px] font-black uppercase tracking-widest ${isHighImpact ? 'text-rose-500' : 'text-[#2D5A4C]'}`}>Projected</span>
          </div>
        </div>

        {isHighImpact && (
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 flex items-start gap-6 mb-12 text-rose-600">
             <div className="p-3 bg-white rounded-2xl shadow-sm"><AlertTriangle className="w-6 h-6 shrink-0" /></div>
             <div>
                <p className="text-lg font-black tracking-tight mb-1 uppercase">Critical Operational Inflation</p>
                <p className="text-sm font-bold opacity-70 leading-relaxed pr-10">
                  This threshold reduction will increase investigation volume by <span className="text-rose-600 font-extrabold">{((predictedV/currentV)*100 - 100).toFixed(0)}%</span>. Ensure escalation resources are optimized.
                </p>
             </div>
           </motion.div>
        )}

        <div className="flex justify-center">
          <button 
            onClick={handleApply}
            className="h-20 px-16 bg-[#2D5A4C] text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-emerald-900/10 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 active:scale-95 group"
          >
            <Play className="w-6 h-6 stroke-[3px] fill-white group-hover:scale-125 transition-transform" />
            LIVE COMMIT THRESHOLD
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: -40, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-0 self-center z-[300]">
            <div className="bg-[#A8E6CF] text-[#2D5A4C] px-10 py-5 rounded-[2rem] shadow-2xl shadow-emerald-500/20 flex items-center gap-4 border-2 border-white">
              <CheckCircle className="w-6 h-6 stroke-[3px]" />
              <span className="font-black text-sm uppercase tracking-widest">Protocol ${threshold.toLocaleString()} committed to policy stack</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
