import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Search, Filter, ShieldAlert, ArrowDownUp, ArrowRight, Database, TrendingUp, TrendingDown, Calendar, AlertCircle, DollarSign, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatINR, getRiskLevel, getRiskColor } from '../utils/format';
import { motion } from 'framer-motion';

export const Violations: React.FC = () => {
  const { transactions } = useData();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 50;

  // Sidebar filters
  const [riskFilter, setRiskFilter] = useState<{ High: boolean, Medium: boolean, Low: boolean, Critical: boolean }>({ High: true, Medium: true, Low: true, Critical: true });
  const [amountRange, setAmountRange] = useState<number>(0);
  const [typeFilter, setTypeFilter] = useState<Record<string, boolean>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const violations = useMemo(() => transactions.filter(t => t['Is Laundering'] === 1), [transactions]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalViolations = violations.length;
    const highRiskCount = violations.filter(v => ['High', 'Critical'].includes(getRiskLevel(v['Amount Paid']))).length;
    const totalAmountAtRisk = violations.reduce((acc, v) => acc + v['Amount Paid'], 0);
    return { totalViolations, highRiskCount, totalAmountAtRisk };
  }, [violations]);

  // Unique types
  useMemo(() => {
    const types: Record<string, boolean> = {};
    violations.forEach(v => {
      if (!typeFilter[v['Payment Format']]) types[v['Payment Format']] = true;
    });
    if (Object.keys(typeFilter).length === 0) {
      setTypeFilter(types);
    }
  }, [violations]);

  const getRuleViolated = (amount: number) => {
    if (amount > 10000) return "Section 3.1 AML Transaction Threshold (₹8,30,000)";
    if (amount >= 8000) return 'Section 3.2 - Structuring Pattern';
    return 'Section 4.1 - Suspicious Source';
  };

  const getPlainEnglish = (amount: number) => {
    if (amount > 10000) return 'Transaction exceeds the maximum regulatory limit for a single transfer without enhanced due diligence.';
    if (amount >= 8000) return 'Transaction amount is unusually close to the reporting threshold, indicating potential structuring or smurfing.';
    return 'The transaction pattern matches known typologies for illicit fund transfers based on previous historical behavior models.';
  };

  const filteredResults = useMemo(() => {
    let list = [...violations];

    // Natural Language Query Parsing
    let nlQueryUsed = false;
    const query = search.toLowerCase();
    
    if (query.includes('high risk')) {
       list = list.filter(t => ['High', 'Critical'].includes(getRiskLevel(t['Amount Paid'])));
       nlQueryUsed = true;
    }
    if (query.includes('structuring') || query.includes('smurfing')) {
       list = list.filter(t => {
         const inr = t['Amount Paid'] * 83;
         return inr >= 800000 && inr <= 1000000;
       });
       nlQueryUsed = true;
    }
    const aboveMatch = query.match(/(?:above|greater than|more than)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:,\d+)*)/);
    if (aboveMatch) {
       const val = parseInt(aboveMatch[1].replace(/,/g, ''));
       list = list.filter(t => (t['Amount Paid'] * 83) > val);
       nlQueryUsed = true;
    }

    // Sidebar Filters (Additive)
    if (!nlQueryUsed) {
       list = list.filter(t => riskFilter[getRiskLevel(t['Amount Paid']) as keyof typeof riskFilter]);
       if (amountRange > 0) {
         list = list.filter(t => (t['Amount Paid'] * 83) >= amountRange * 100000); 
       }
       list = list.filter(t => typeFilter[t['Payment Format']] !== false);
    }

    if (dateFrom) {
       list = list.filter(t => new Date(t.Timestamp) >= new Date(dateFrom));
    }
    if (dateTo) {
       list = list.filter(t => new Date(t.Timestamp) <= new Date(dateTo));
    }

    // Keyword Search (Runs on the result of NL/Sidebar filters)
    let cleanedSearch = search.toLowerCase()
      .replace('show ', '')
      .replace('find ', '')
      .replace('filter ', '')
      .replace('high risk', '')
      .replace('critical', '')
      .replace('structuring', '')
      .replace('smurfing', '')
      .replace(/above\s*(?:rs\.?|inr|₹)?\s*\d+(?:,\d+)*/, '')
      .replace(/greater than\s*(?:rs\.?|inr|₹)?\s*\d+(?:,\d+)*/, '')
      .replace(/more than\s*(?:rs\.?|inr|₹)?\s*\d+(?:,\d+)*/, '')
      .trim();

    if (cleanedSearch) {
      const s = cleanedSearch;
      list = list.filter(t => 
        JSON.stringify(t).toLowerCase().includes(s) || 
        getRuleViolated(t['Amount Paid']).toLowerCase().includes(s) ||
        (t['Payment Format'] || '').toLowerCase().includes(s) ||
        `emp-${t.Account}`.toLowerCase().includes(s)
      );
    }

    list.sort((a, b) => {
      let valA: any = a.Timestamp;
      let valB: any = b.Timestamp;

      if (sortCol === 'amount') { valA = a['Amount Paid']; valB = b['Amount Paid']; }
      else if (sortCol === 'rule') { valA = getRuleViolated(a['Amount Paid']); valB = getRuleViolated(b['Amount Paid']); }
      else if (sortCol === 'risk') { valA = a['Amount Paid']; valB = b['Amount Paid']; }
      else if (sortCol === 'emp') { valA = a.Account; valB = b.Account; }
      else if (sortCol === 'timestamp') { valA = new Date(a.Timestamp).getTime(); valB = new Date(b.Timestamp).getTime(); }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return { list, nlQueryUsed };
  }, [violations, search, sortCol, sortDir, riskFilter, amountRange, typeFilter, dateFrom, dateTo]);

  const { list: filteredData, nlQueryUsed: nlQueryActive } = filteredResults;

  // Trend Calculation
  const getTrend = (account: string) => {
    const empViolations = violations.filter(v => v.Account === account).sort((a,b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());
    if (empViolations.length < 2) return 'stable';
    const mid = Math.floor(empViolations.length / 2);
    const firstHalf = empViolations.slice(0, mid);
    const secondHalf = empViolations.slice(mid);
    return secondHalf.length >= firstHalf.length ? 'up' : 'down';
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const SortHeader: React.FC<{ label: string, col: string }> = ({ label, col }) => (
    <th 
      className="py-4 px-5 text-left font-black text-[11px] uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors group select-none"
      onClick={() => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
      }}
    >
      <div className="flex items-center gap-2">
        {label}
        <ArrowDownUp className={`w-3 h-3 ${sortCol === col ? 'text-[#A8E6CF]' : 'opacity-20'}`} />
      </div>
    </th>
  );

  return (
    <div className="flex gap-10 w-full mx-auto pb-20">
      
      {/* Sidebar Filters */}
      <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-80 glass-card p-10 flex flex-col gap-10 shrink-0 h-max bg-white/70 shadow-2xl border-slate-100">
        <div className="flex items-center gap-3 text-slate-800 font-black text-xs uppercase tracking-[0.3em] pb-6 border-b border-slate-100">
          <Filter className="w-5 h-5 text-[#A8E6CF]" />
          Audit Filters
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Risk Level</h3>
          <div className="flex flex-col gap-4">
            {['Critical', 'High', 'Medium', 'Low'].map(level => (
              <label key={level} className="flex items-center gap-4 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={riskFilter[level as keyof typeof riskFilter]} 
                  onChange={(e) => {
                    setRiskFilter(prev => ({ ...prev, [level]: e.target.checked }));
                    setPage(1);
                  }}
                  className="w-5 h-5 rounded-lg border-slate-200 text-[#A8E6CF] focus:ring-[#A8E6CF]/20 transition-all cursor-pointer"
                />
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-800 transition-colors">{level} Priority</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-6">
           <div className="flex justify-between items-end">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Amount Filter</h3>
              <span className="text-[#2D5A4C] font-black text-[10px] bg-[#A8E6CF]/20 px-3 py-1 rounded-lg uppercase tracking-widest">{amountRange > 0 ? `₹${amountRange}L+` : 'ANY'}</span>
           </div>
           <input 
             type="range" 
             value={amountRange} 
             onChange={(e) => { setAmountRange(Number(e.target.value)); setPage(1); }}
             min="0" max="25" step="1"
             className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-[#A8E6CF]"
           />
           <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest">
             <span>Min Flow</span>
             <span>Max Exposure</span>
           </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Transaction Type</h3>
          <div className="flex flex-col gap-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.keys(typeFilter).map(type => (
              <label key={type} className="flex items-center gap-4 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={typeFilter[type] !== false} 
                  onChange={(e) => {
                    setTypeFilter(prev => ({ ...prev, [type]: e.target.checked }));
                    setPage(1);
                  }}
                  className="w-5 h-5 rounded-lg border-slate-200 text-[#A8E6CF] focus:ring-[#A8E6CF]/20 transition-all cursor-pointer"
                />
                <span className="text-[11px] font-black text-slate-500 group-hover:text-slate-800 transition-colors truncate uppercase tracking-widest">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-6">
           <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Date Range</h3>
           <div className="flex flex-col gap-3">
              <div className="relative group">
                 <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#A8E6CF] transition-colors" />
                 <input 
                   type="date" 
                   value={dateFrom} 
                   onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                   className="w-full bg-slate-50 border border-slate-100 py-3 pl-12 pr-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none focus:border-[#A8E6CF] transition-all"
                 />
              </div>
              <div className="relative group">
                 <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#A8E6CF] transition-colors" />
                 <input 
                   type="date" 
                   value={dateTo} 
                   onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                   className="w-full bg-slate-50 border border-slate-100 py-3 pl-12 pr-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none focus:border-[#A8E6CF] transition-all"
                 />
              </div>
           </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-10 overflow-hidden">
        
        {/* Metric Cards Top Row */}
        <div className="grid grid-cols-3 gap-6">
           {[
             { label: 'Violations Detected', value: metrics.totalViolations.toLocaleString(), icon: AlertCircle, color: '#FF6B6B' },
             { label: 'High Risk Violations', value: metrics.highRiskCount.toLocaleString(), icon: ShieldAlert, color: '#F1C40F' },
             { label: 'Capital at Risk', value: formatINR(metrics.totalAmountAtRisk), icon: DollarSign, color: '#3BB77E' }
           ].map((m, i) => (
             <motion.div 
               initial={{ opacity: 0, y: 10 }} 
               animate={{ opacity: 1, y: 0 }} 
               transition={{ delay: i * 0.1 }}
               key={i} 
               className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between"
             >
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                   <p className="text-3xl font-black text-slate-800 tracking-tighter">{m.value}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-3xl" style={{ color: m.color }}>
                   <m.icon className="w-8 h-8" />
                </div>
             </motion.div>
           ))}
        </div>

        {/* Search / Natural Language bar */}
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-3 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center gap-4">
           <div className="w-14 h-14 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-[#A8E6CF] shadow-inner">
              <Activity className="w-6 h-6" />
           </div>
           <div className="flex-1 relative group">
             <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-[#A8E6CF] transition-colors" />
             <input 
               type="text" 
               value={search}
               onChange={(e) => { setSearch(e.target.value); setPage(1); }}
               placeholder='Try "show high risk" or "show structuring suspects"...'
               className="w-full bg-transparent border-none py-4 pl-12 pr-8 text-slate-800 text-lg font-black tracking-tight outline-none placeholder:text-slate-100"
             />
           </div>
           <div className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${nlQueryActive ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20' : 'bg-[#A8E6CF]/10 text-[#3BB77E] border-[#A8E6CF]/20'}`}>
              {nlQueryActive ? 'AI Filter Active' : 'AI Query Engine'}
           </div>
        </motion.div>

        {/* Violations Table */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden min-h-[600px]">
           <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-white/40">
             <div className="flex items-center gap-4">
                <div className="p-4 bg-rose-50 rounded-3xl text-rose-500 shadow-sm border border-rose-100"><ShieldAlert className="w-8 h-8" /></div>
                <div>
                   <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Violations</h2>
                   <p className="text-[10px] font-black text-slate-300 mt-1 uppercase tracking-[0.2em]">{filteredData.length.toLocaleString()} Violations Found</p>
                </div>
             </div>
           </div>
           
           <div className="flex-1 overflow-x-auto relative">
             <table className="w-full text-left">
               <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md border-b border-slate-100">
                 <tr className="text-slate-400 font-black">
                   <th className="py-6 px-10 text-left text-[11px] uppercase tracking-widest w-36">Registry ID</th>
                   <SortHeader label="Amount" col="amount" />
                   <SortHeader label="Rule Violated" col="rule" />
                   <th className="py-6 px-6 text-left text-[11px] uppercase tracking-widest">Reason</th>
                   <SortHeader label="Risk Level" col="risk" />
                   <SortHeader label="Employee ID" col="emp" />
                   <th className="py-6 px-6 text-left text-[11px] uppercase tracking-widest">Transaction Type</th>
                   <th className="py-6 px-6 text-left text-[11px] uppercase tracking-widest">Timestamp</th>
                   <th className="py-6 px-10 text-right font-black text-[11px] uppercase tracking-widest w-24">Entry</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {paginatedData.map((t) => {
                   const actualIdx = transactions.indexOf(t);
                   const riskLabel = getRiskLevel(t['Amount Paid']);
                   const ruleMsg = getRuleViolated(t['Amount Paid']);
                   const plainEng = getPlainEnglish(t['Amount Paid']);
                   const trend = getTrend(t.Account);
                   
                   return (
                     <tr key={actualIdx} className="hover:bg-slate-50/50 transition-colors group h-28">
                       <td className="py-5 px-10">
                          <div className="flex flex-col">
                             <span className="text-[#A8E6CF] font-black text-[10px] tracking-widest uppercase">TXN</span>
                             <span className="text-xs font-mono font-bold text-slate-800 font-black">#{(actualIdx + 1).toString().padStart(5, '0')}</span>
                          </div>
                       </td>
                       <td className="py-5 px-6">
                         <span className="text-lg font-black text-slate-800 tracking-tighter">{formatINR(t['Amount Paid'])}</span>
                       </td>
                       <td className="py-5 px-6">
                         <span className="px-3 py-2 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black border border-rose-100 uppercase tracking-tighter shadow-sm">{ruleMsg}</span>
                       </td>
                       <td className="py-5 px-6 max-w-[300px]">
                          <p className="text-[11px] font-bold text-slate-400 leading-relaxed italic line-clamp-2">"{plainEng}"</p>
                       </td>
                       <td className="py-5 px-6">
                         <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-tighter shadow-sm border ${getRiskColor(riskLabel)}`}>
                           {riskLabel}
                         </span>
                       </td>
                       <td className="py-5 px-6">
                          <div className="flex items-center gap-3">
                             <div className="flex flex-col">
                                <span className="text-slate-800 font-black text-xs font-mono">EMP-{t.Account}</span>
                                <div className="flex items-center gap-1">
                                   {trend === 'up' ? (
                                      <>
                                         <TrendingUp className="w-3 h-3 text-rose-500" />
                                         <span className="text-[8px] font-black text-rose-500 uppercase">Escalating</span>
                                      </>
                                   ) : (
                                      <>
                                         <TrendingDown className="w-3 h-3 text-emerald-500" />
                                         <span className="text-[8px] font-black text-emerald-500 uppercase">Declining</span>
                                      </>
                                   )}
                                </div>
                             </div>
                          </div>
                       </td>
                       <td className="py-5 px-6">
                          <span className="px-3 py-1.5 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-slate-100">{t['Payment Format']}</span>
                       </td>
                       <td className="py-5 px-6">
                          <div className="flex flex-col">
                             <span className="text-[11px] font-bold text-slate-800">{new Date(t.Timestamp).toLocaleDateString('en-IN')}</span>
                             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{new Date(t.Timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                       </td>
                       <td className="py-5 px-10 text-right">
                          <button 
                           onClick={() => navigate('/investigation', { state: { transaction: t, index: actualIdx } })}
                           className="w-14 h-14 bg-white border border-slate-200 rounded-[1.5rem] flex items-center justify-center text-slate-300 hover:bg-[#A8E6CF] hover:border-[#A8E6CF] hover:text-[#2D5A4C] transition-all shadow-xl active:scale-90 group/btn"
                         >
                           <ArrowRight className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" />
                         </button>
                       </td>
                     </tr>
                   )
                 })}
               </tbody>
             </table>
             {paginatedData.length === 0 && (
               <div className="flex flex-col items-center justify-center p-40 text-slate-200">
                 <Database className="w-24 h-24 mb-6 opacity-20" />
                 <p className="text-2xl font-black uppercase tracking-[0.3em] opacity-40">No Registry Data</p>
               </div>
             )}
           </div>

           <div className="p-10 border-t border-slate-50 bg-[#F7FAF9]/50 flex items-center justify-between">
             <div className="text-[11px] font-black uppercase text-slate-300 tracking-[0.4em]">
                System Index Registry — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
             </div>
             <div className="flex gap-4 items-center">
               <button 
                 disabled={page === 1} 
                 onClick={() => setPage(p => p - 1)}
                 className="h-12 px-8 bg-white border border-slate-200 rounded-2xl font-black text-[11px] text-slate-400 hover:text-slate-800 disabled:opacity-20 transition-all uppercase tracking-widest shadow-sm"
               >
                 Previous
               </button>
               <div className="h-12 px-8 flex items-center bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-800 shadow-sm">
                 {page} <span className="mx-2 opacity-20">/</span> {Math.max(1, totalPages)}
               </div>
               <button 
                 disabled={page === totalPages || totalPages === 0} 
                 onClick={() => setPage(p => p + 1)}
                 className="h-12 px-10 bg-[#A8E6CF] text-[#2D5A4C] rounded-2xl font-black text-[11px] uppercase tracking-widest hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-20 transition-all shadow-lg shadow-emerald-500/10"
               >
                 Next
               </button>
             </div>
           </div>
        </motion.div>

      </div>
    </div>
  );
};
