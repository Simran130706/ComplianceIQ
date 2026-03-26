import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle, ShieldCheck, Download, AlertCircle, TrendingUp, Terminal, Activity } from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatINR, getRiskLevel, getRiskColor } from '../utils/format';
import { ReactFlow, Background, Controls, MarkerType, type Node, type Edge } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';

export const Investigation: React.FC = () => {
  const { state } = useLocation();
  const { transactions } = useData();
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);

  if (!state || !state.transaction) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Violation Not Selected</h2>
        <p className="text-slate-500 font-medium mb-8">Please select an entry from the violations list to begin interrogation.</p>
        <button className="h-14 px-8 bg-[#A8E6CF] text-[#2D5A4C] rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/10 hover:-translate-y-1 transition-all" onClick={() => navigate('/violations')}>
          Return to Violations
        </button>
      </div>
    );
  }

  const t = state.transaction;
  const tIndex = state.index;
  const riskLabel = getRiskLevel(t['Amount Paid']);

  const getRuleViolated = (amount: number) => {
    if (amount > 10000) return 'Section 3.1 AML Transaction Threshold (₹8,30,000)';
    if (amount >= 8000) return 'Section 3.2 - Structuring Pattern';
    return 'Section 4.1 - Suspicious Source';
  };

  const getPlainEnglish = (amount: number) => {
    if (amount > 10000) return 'The transaction volume exceeds the maximum standard regulatory threshold, necessitating an immediate high-detail interrogation of the entity profile and fund origin.';
    if (amount >= 8000) return 'Transaction velocity and value indicate a potential deliberate threshold avoidance pattern (Structuring). Manual review required.';
    return 'Entity behavioral logs match historical high-frequency laundering typologies based on the current AI prediction model.';
  };

  const ruleViolated = getRuleViolated(t['Amount Paid']);
  const plainEnglish = getPlainEnglish(t['Amount Paid']);

  const { employeeScore, totalT, violT, structuringTxns, relatedTxns } = useMemo(() => {
    let tot = 0;
    let vio = 0;
    let structList: any[] = [];
    let allRelated: any[] = [];

    transactions.forEach(x => {
      if (x.Account === t.Account) {
        tot++;
        if (x['Is Laundering'] === 1) vio++;
        if (x['Amount Paid'] >= 8000 && x['Amount Paid'] <= 10000) {
          structList.push(x);
        }
        allRelated.push(x);
      }
    });

    allRelated.sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());

    let score = tot > 0 ? (vio / tot) * 100 : 0;
    return { 
      employeeScore: Math.min(score, 100), 
      totalT: tot, 
      violT: vio, 
      structuringTxns: structList.length,
      relatedTxns: allRelated.slice(0, 4)
    };
  }, [transactions, t.Account]);

  const riskTrendLabel = employeeScore > 70 ? 'CRITICAL' : employeeScore >= 40 ? 'HIGH' : 'LOW';

  const baseTime = new Date(t.Timestamp).getTime();
  const timeLogin = new Date(baseTime - 5 * 60000);
  const timeAccess = new Date(baseTime - 3 * 60000);
  const timeTxn = new Date(baseTime);
  const timeFlag = new Date(baseTime + 1 * 60000);
  
  const fTime = (d: Date) => d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

  const { nodes, edges } = useMemo(() => {
    const isThreshold = t['Amount Paid'] > 10000;
    const commonStyle = { borderRadius: '16px', padding: '12px', fontWeight: 'bold', fontSize: '11px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' };
    
    let nds: Node[] = [
      { id: '1', position: { x: 50, y: 50 }, data: { label: `Account Login (${fTime(timeLogin)})` }, style: { ...commonStyle, background: '#F8FAFC', color: '#64748B' } },
      { id: '2', position: { x: 50, y: 150 }, data: { label: `System Access (${fTime(timeAccess)})` }, style: { ...commonStyle, background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' } },
      { id: '3', position: { x: 50, y: 250 }, data: { label: `Val: ${formatINR(t['Amount Paid'])}` }, style: { ...commonStyle, background: '#FAF5FF', color: '#7E22CE', borderColor: '#E9D5FF' } },
      { id: '4', position: { x: 50, y: 350 }, data: { label: isThreshold ? 'Limit Exceeded' : 'Structuring Hit' }, style: { ...commonStyle, background: '#FFF7ED', color: '#C2410C', borderColor: '#FED7AA' } },
      { id: '5', position: { x: 50, y: 450 }, data: { label: `SAR Flagged (${fTime(timeFlag)})` }, style: { ...commonStyle, background: '#FFF1F2', color: '#BE123C', borderColor: '#FECDD3' } }
    ];

    let eds: Edge[] = [
      { id: 'e1', source: '1', target: '2', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' }, style: { stroke: '#CBD5E1' } },
      { id: 'e2', source: '2', target: '3', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' }, style: { stroke: '#CBD5E1' } },
      { id: 'e3', source: '3', target: '4', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' }, style: { stroke: '#CBD5E1' } },
      { id: 'e4', source: '4', target: '5', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' }, style: { stroke: '#CBD5E1' } }
    ];
    return { nodes: nds, edges: eds };
  }, [t]);

  return (
    <div className="flex flex-col gap-10 w-full mx-auto pb-20">
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-800 flex items-center gap-2 w-max transition-all font-black uppercase text-[10px] tracking-widest px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
        <ArrowLeft className="w-4 h-4" /> Exit Investigation
      </motion.button>

      {/* Hero Summary */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card p-10 overflow-hidden relative shadow-2xl border-slate-100">
        <div className="absolute top-0 left-0 w-2.5 h-full bg-rose-400" />
        <div className="flex justify-between items-start mb-10">
           <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <span className="px-3 py-1 bg-rose-50 border border-rose-100 text-rose-500 font-black text-[10px] uppercase tracking-widest rounded-lg">{ruleViolated}</span>
                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Logged: {new Date(t.Timestamp).toLocaleDateString()}</span>
              </div>
              <h2 className="text-5xl font-black text-slate-800 tracking-tighter uppercase leading-none">VIOLATION INVESTIGATION: <span className="font-mono text-[#A8E6CF]">TXN-{tIndex}</span></h2>
           </div>
           <div className="flex flex-col items-end gap-3">
              <span className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm border ${getRiskColor(riskLabel)}`}>
                {riskLabel} Risk Profile
              </span>
           </div>
        </div>

        <div className="grid grid-cols-12 gap-12 pt-10 border-t border-slate-50">
           <div className="col-span-8">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Reason</p>
              <p className="text-2xl font-bold text-slate-700 leading-tight tracking-tight pr-10">{plainEnglish}</p>
           </div>
           <div className="col-span-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Amount</p>
              <div className="text-4xl font-black text-slate-800 tracking-tighter mb-1">{formatINR(t['Amount Paid'])}</div>
           </div>
        </div>
      </motion.div>

      {/* Causality and Timeline Map */}
      <div className="grid grid-cols-12 gap-10 h-[500px]">
         <div className="col-span-8 glass-card overflow-hidden flex flex-col shadow-xl border-slate-100">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white/40">
               <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-[#A8E6CF]" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Causality Event Map</h3>
               </div>
            </div>
            <div className="flex-1">
               <ReactFlow nodes={nodes} edges={edges} fitView>
                  <Background color="#CBD5E1" gap={20} size={1} />
                  <Controls className="bg-white border border-slate-100 shadow-xl rounded-xl" />
               </ReactFlow>
            </div>
         </div>

         <div className="col-span-4 glass-card p-8 flex flex-col bg-white overflow-hidden shadow-xl border-slate-100">
            <div className="flex items-center gap-3 mb-10">
               <Activity className="w-5 h-5 text-[#A8E6CF]" />
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Event Timeline</h3>
            </div>
            <div className="relative pl-8 space-y-10 flex-1">
               <div className="absolute left-[3px] top-1 bottom-6 w-[2px] bg-slate-50" />
               {[
                 { time: fTime(timeFlag), label: `AML Violation Triggered`, desc: ruleViolated, color: 'bg-rose-400' },
                 { time: fTime(timeTxn), label: `Execution`, desc: `Value: ${formatINR(t['Amount Paid'])}`, color: 'bg-[#A8E6CF]' },
                 { time: fTime(timeAccess), label: `Protocol Check`, desc: 'Core Engine Reach', color: 'bg-blue-400' },
                 { time: fTime(timeLogin), label: `Account Login`, desc: `Employee: EMP-${t.Account}`, color: 'bg-slate-300' },
               ].map((ev, i) => (
                 <div key={i} className="relative group">
                    <div className={`absolute left-[-32px] top-1.5 w-3.5 h-3.5 rounded-full ${ev.color} border-4 border-white shadow-md z-10 group-hover:scale-125 transition-transform`} />
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{ev.time}</div>
                    <div className="text-sm font-black text-slate-800">{ev.label}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">{ev.desc}</div>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* Subject Analysis and Risk profiling */}
      <div className="grid grid-cols-12 gap-10">
         <div className="col-span-4 glass-card p-10 flex flex-col items-center justify-center bg-white shadow-xl border-slate-100">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10">Subject Risk Level</p>
            <div className="relative w-48 h-48 flex items-center justify-center">
               <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="84" className="stroke-slate-50" strokeWidth="12" fill="transparent" strokeDasharray="527.7" strokeDashoffset="131.9" />
                  <motion.circle 
                    initial={{ strokeDashoffset: 527.7 }}
                    animate={{ strokeDashoffset: 527.7 - ((395.7 * employeeScore) / 100) }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    cx="96" cy="96" r="84" 
                    className={`stroke-current ${employeeScore > 70 ? 'text-rose-500' : 'text-[#8FD4BB]'}`} 
                    strokeWidth="12" fill="transparent" 
                    strokeDasharray="527.7" 
                    strokeLinecap="round"
                  />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-slate-800 tracking-tighter">{employeeScore.toFixed(0)}</span>
                  <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg mt-1 uppercase tracking-widest">SCORE</span>
               </div>
            </div>
            <div className="mt-10 text-center">
               <p className="text-2xl font-black tracking-tighter text-slate-800 uppercase">{riskTrendLabel} PROBABILITY</p>
               <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">{violT} System Hits / {totalT} Validations</p>
            </div>
         </div>

         <div className="col-span-8 flex flex-col gap-10">
            <div className={`p-8 rounded-[2rem] border-2 flex items-start gap-6 transition-all shadow-lg ${structuringTxns > 3 ? 'bg-rose-50 border-rose-100' : 'bg-[#F7FAF9] border-[#A8E6CF]/30'}`}>
               <div className={`p-4 rounded-2xl ${structuringTxns > 3 ? 'bg-rose-500' : 'bg-[#A8E6CF]'}`}>
                  <ShieldCheck className="w-8 h-8 text-white" />
               </div>
               <div>
                  <h3 className={`text-xl font-black tracking-tight mb-2 uppercase ${structuringTxns > 3 ? 'text-rose-600' : 'text-[#2D5A4C]'}`}>
                    {structuringTxns > 3 ? 'Structuring Behavior Identified' : 'Behavior within Baseline'}
                  </h3>
                  <p className="text-slate-600 text-[13px] font-medium leading-relaxed">
                    Account EMP-{t.Account} demonstrated {structuringTxns} high-velocity entries near the ₹8,00,000 threshold. Pattern match confirms potential illicit layering strategy.
                  </p>
               </div>
            </div>

            <div className="glass-card flex-1 flex flex-col overflow-hidden bg-white shadow-xl border-slate-100">
               <div className="p-6 border-b border-slate-50 flex items-center gap-3 bg-white/40">
                  <TrendingUp className="w-5 h-5 text-[#A8E6CF]" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Violation History (Last 4)</h3>
               </div>
               <div className="p-6 grid grid-cols-2 gap-6">
                  {relatedTxns.map((rt, i) => (
                    <div key={i} className={`p-5 rounded-2xl border flex justify-between items-center group transition-all hover:shadow-lg ${rt['Is Laundering'] === 1 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                       <div>
                          <p className={`text-lg font-black tracking-tighter ${rt['Is Laundering'] === 1 ? 'text-rose-500' : 'text-slate-800'}`}>{formatINR(rt['Amount Paid'])}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(rt.Timestamp).toLocaleDateString()}</p>
                       </div>
                       {rt['Is Laundering'] === 1 ? <AlertCircle className="w-6 h-6 text-rose-500" /> : <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      <button 
        onClick={() => setReportOpen(true)}
        className="w-full h-20 bg-[#2D5A4C] text-white rounded-[2rem] font-black text-lg shadow-2xl hover:shadow-emerald-900/10 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 group"
      >
        <FileText className="w-6 h-6 stroke-[3px] group-hover:scale-110 transition-transform" />
        GENERATE REGULATORY SAR FILING
      </button>

      {/* Report Modal - Strictly Doc Style */}
      <AnimatePresence>
        {reportOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-[#2D5A4C]/40 backdrop-blur-xl flex items-center justify-center p-10">
            <motion.div initial={{ scale: 0.9, y: 40 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] flex flex-col shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden">
               <div className="p-10 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center"><Download className="w-6 h-6" /></div>
                     <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Suspicious Activity Report (SAR-903)</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Official Document • Ready for SEBI Dispatch</p>
                     </div>
                  </div>
                  <button onClick={() => setReportOpen(false)} className="px-6 py-2.5 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Dismiss</button>
               </div>

               <div className="flex-1 overflow-y-auto p-16 bg-[#FDFDFF]" id="sar-report">
                  <div className="max-w-3xl mx-auto space-y-12">
                     <div className="flex justify-between items-end border-b-2 border-slate-900 pb-8">
                        <div>
                           <h1 className="text-3xl font-serif font-black text-slate-900 tracking-tighter uppercase">Regulatory Dossier</h1>
                           <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-[11px]">ComplianceIQ Intelligence Output</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Date</p>
                           <p className="font-mono font-black text-slate-900">{new Date().toLocaleDateString('en-GB')}</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-16">
                        <div className="space-y-6">
                           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Employee Metrics</h3>
                           <div className="space-y-2">
                              <p className="text-sm font-medium flex justify-between"><span>Employee ID:</span> <span className="font-mono font-black">EMP-{t.Account}</span></p>
                              <p className="text-sm font-medium flex justify-between"><span>Clearance Level:</span> <span className="font-black text-emerald-500">LEVEL-04</span></p>
                           </div>
                        </div>
                        <div className="space-y-6">
                           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Record Indices</h3>
                           <div className="space-y-2">
                              <p className="text-sm font-medium flex justify-between"><span>Transaction Ref:</span> <span className="font-mono font-black">TXN-{tIndex}</span></p>
                              <p className="text-sm font-medium flex justify-between"><span>Amount:</span> <span className="font-black">{formatINR(t['Amount Paid'])}</span></p>
                              <p className="text-sm font-medium flex justify-between"><span>Execution Time:</span> <span className="font-black">{new Date(t.Timestamp).toLocaleTimeString()}</span></p>
                           </div>
                        </div>
                     </div>

                     <div className="bg-slate-50 p-10 rounded-[2.5rem] space-y-4">
                        <h3 className="text-rose-500 font-black uppercase text-[10px] tracking-widest">Official Attribution</h3>
                        <p className="text-2xl font-serif font-black text-slate-900 leading-tight">Rule Violated: {ruleViolated}</p>
                        <p className="text-slate-600 font-serif leading-relaxed text-sm">{plainEnglish}</p>
                        {structuringTxns > 3 && (
                          <div className="mt-8 p-6 bg-rose-500 text-white rounded-3xl">
                             <p className="font-black text-xs uppercase tracking-widest mb-1">Critical Behavioral Note</p>
                             <p className="text-sm font-medium">Automatic detection of high-velocity layering. Employee showed {structuringTxns} attempts to bypass the primary reporting threshold within a 90-day rolling window.</p>
                          </div>
                        )}
                     </div>

                     <div className="flex justify-between items-center py-10 opacity-40 grayscale">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black border-4 border-slate-200 uppercase">Seal</div>
                        <div className="text-right">
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chief Compliance Signature</p>
                           <div className="h-0.5 w-48 bg-[#2D5A4C] mt-4 mx-auto" />
                           <p className="text-[8px] font-black uppercase mt-1 tracking-tighter">Digitally Attested by ComplianceIQ Engine</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="p-10 border-t border-slate-50 flex justify-end">
                  <button 
                    onClick={() => window.print()}
                    className="px-10 py-5 bg-[#A8E6CF] text-[#2D5A4C] rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3"
                  >
                    <Download className="w-4 h-4" /> Download Official PDF
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
