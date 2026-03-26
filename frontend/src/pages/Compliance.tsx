import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { 
  CheckCircle2, Play, Database, ShieldAlert, Search, 
  ArrowRight, ArrowDownUp, AlertTriangle, Upload, 
  ShieldCheck, FileText, Activity,
  ListFilter, ShieldQuestion, Wallet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { formatINR } from '../utils/format';
import { motion, AnimatePresence } from 'framer-motion';

export const Compliance: React.FC = () => {
  const { transactions, rules, setRules, setTransactions, setLoading, setError } = useData();
  const navigate = useNavigate();

  const [hasRun, setHasRun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'violations' | 'all'>('violations');

  // Table states
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState('amount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const itemsPerPage = 12;

  const getVal = (obj: any, keys: string[]) => {
    if (!obj) return undefined;
    const foundKey = Object.keys(obj).find(k => 
      keys.some(searchedKey => k.toLowerCase().trim().includes(searchedKey.toLowerCase().trim()))
    );
    return foundKey ? obj[foundKey] : undefined;
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCsvUploading(true);
    setLoading(true);
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().replace(/^\uFEFF/, ''),
      complete: (results) => {
        const data = results.data as any[];
        const filtered = data.filter(t => t && Object.values(t).some(v => v !== null && v !== ''));
        setTransactions(filtered || []);
        setHasRun(false);
        setLoading(false);
        setIsCsvUploading(false);
      },
      error: (err: any) => {
        setError("Parse error: " + err.message);
        setLoading(false);
        setIsCsvUploading(false);
      }
    });
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsPdfUploading(true);
    setLoading(true);
    const formData = new FormData();
    formData.append('policy', file);
    try {
      const response = await fetch('http://localhost:3001/api/extract-rules', { method: 'POST', body: formData });
      const data = await response.json();
      setRules(data.rules || []);
      setHasRun(false);
    } catch (err: any) {
      alert('AI Extraction Error: ' + err.message);
    } finally {
      setIsPdfUploading(false);
      setLoading(false);
    }
  };

  const runCheck = () => {
    setIsRunning(true);
    setProgress(0);
    const total = transactions.length;
    let curr = 0;
    const interval = setInterval(() => {
      curr += total / 40;
      if (curr >= total) {
        curr = total;
        clearInterval(interval);
        setTimeout(() => { 
          setIsRunning(false); 
          setHasRun(true); 
          setPage(1);
        }, 500);
      }
      setProgress(Math.floor(curr));
    }, 80);
  };

  const getRuleMatch = (txn: any) => {
    const amount = Number(getVal(txn, ['amount paid', 'amount', 'value', 'received']) || 0);
    const isLaundering = getVal(txn, ['is laundering', 'is_laundering', 'laundering', 'flag']) == 1;
    if (rules.length > 0) {
      const inr = amount * 83;
      const matchingRule = rules.find(r => {
        const numbers = r.condition.match(/\d+([,]\d+)*/g);
        if (numbers) {
          const threshold = parseInt(numbers[0].replace(/,/g, ''), 10);
          return inr > threshold;
        }
        return false;
      });
      if (matchingRule) return matchingRule;
    }
    if (isLaundering) return { clause_id: 'ML-01', requirement: 'Suspicious Activity Detected', condition: 'Matches historical ML pattern' };
    if (amount > 10000) return { clause_id: 'THRESHOLD-01', requirement: 'Limit Exceeded', condition: 'Transaction exceeds AML threshold of ₹10,000' };
    return null;
  };

  const reportData = useMemo(() => {
    return transactions.map(t => {
      const rule = getRuleMatch(t);
      const amount = Number(getVal(t, ['amount paid', 'amount', 'value']) || 0);
      const format = getVal(t, ['payment format', 'format', 'type']) || 'Credit Card';
      const riskScore = rule ? (amount > 10000 ? 98 : 75) : (amount > 5000 ? 20 : 8);
      return {
        ...t,
        _rule: rule,
        _isViolation: !!rule,
        _amount: amount,
        _format: format,
        _riskScore: riskScore,
        _riskLabel: riskScore > 80 ? 'CRITICAL' : (riskScore > 50 ? 'HIGH' : (riskScore > 20 ? 'MEDIUM' : 'LOW'))
      };
    });
  }, [transactions, rules]);

  const stats = useMemo(() => ({
    total: reportData.length,
    violations: reportData.filter(d => d._isViolation).length,
    highRisk: reportData.filter(d => d._riskScore > 80).length,
    volume: reportData.reduce((acc, d) => acc + d._amount, 0),
    avgRisk: reportData.reduce((acc, d) => acc + d._riskScore, 0) / (reportData.length || 1)
  }), [reportData]);

  const filteredData = useMemo(() => {
    let list = viewMode === 'violations' ? reportData.filter(d => d._isViolation) : reportData;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(t => JSON.stringify(t).toLowerCase().includes(s));
    }
    list.sort((a, b) => {
      const valA = sortCol === 'amount' ? a._amount : a._riskScore;
      const valB = sortCol === 'amount' ? b._amount : b._riskScore;
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
    return list;
  }, [reportData, search, sortCol, sortDir, viewMode]);

  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const SortHeader: React.FC<{ label: string, col: string }> = ({ label, col }) => (
    <th className="py-4 px-5 text-left font-bold text-[10px] uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
      onClick={() => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
      }}>
      <div className="flex items-center gap-2">
        {label}
        <ArrowDownUp className={`w-3 h-3 ${sortCol === col ? 'text-[#A8E6CF]' : 'opacity-20'}`} />
      </div>
    </th>
  );

  return (
    <div className="flex flex-col gap-8 pb-20 w-full mx-auto px-4">
      <AnimatePresence>
        {isRunning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-xl flex flex-col items-center justify-center">
            <div className="relative flex flex-col items-center">
              <div className="w-56 h-56 mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="112" cy="112" r="96" className="stroke-slate-100" strokeWidth="6" fill="transparent" />
                  <circle cx="112" cy="112" r="96" className="stroke-[#A8E6CF] transition-all duration-200" strokeWidth="6" fill="transparent" strokeDasharray="603.18" strokeDashoffset={603.18 - (603.18 * (progress / (transactions.length || 1)))} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-800 font-mono">{Math.floor((progress / (transactions.length || 1)) * 100)}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Analyzing</span>
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-800">Compliance Audit in Progress</h2>
              <p className="text-slate-400 font-medium text-sm mt-1">{progress.toLocaleString()} records scanned...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasRun ? (
        <div className="flex flex-col items-center justify-center h-[75vh]">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card p-12 w-full max-w-4xl shadow-2xl border-slate-100">
            <div className="flex flex-col items-center text-center mb-12">
               <div className="w-20 h-20 bg-[#A8E6CF] rounded-[2rem] p-5 mb-6 shadow-xl shadow-emerald-500/20 flex items-center justify-center">
                 <ShieldCheck className="w-10 h-10 text-[#2D5A4C]" />
               </div>
               <h1 className="text-4xl font-black text-slate-800 tracking-tighter mb-4">Compliance Engine</h1>
               <p className="text-slate-500 max-w-md text-lg leading-relaxed">Automated regulatory oversight. Upload policy documents and transactions to begin profiling.</p>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-10">
               <div className="space-y-4">
                 <label className="flex items-center gap-2 px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                   <FileText className="w-3.5 h-3.5 text-[#A8E6CF]" /> Upload Policy Document
                 </label>
                 <input type="file" id="pdf-up" className="hidden" accept=".pdf" onChange={handlePdfUpload} />
                 <label htmlFor="pdf-up" className={`group h-48 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-[2rem] transition-all cursor-pointer ${rules.length > 0 ? 'border-[#A8E6CF] bg-emerald-50/50' : 'border-slate-100 hover:border-[#A8E6CF] hover:bg-slate-50/50'}`}>
                   {isPdfUploading ? <Activity className="w-12 h-12 text-[#A8E6CF] animate-pulse" /> : (rules.length > 0 ? <ShieldCheck className="w-12 h-12 text-[#A8E6CF]" /> : <Upload className="w-12 h-12 text-slate-200 group-hover:text-[#A8E6CF]" />)}
                   <div className="text-center mt-4">
                     <div className="font-bold text-slate-800 text-sm">{rules.length > 0 ? `${rules.length} Active Rules` : (isPdfUploading ? 'Processing...' : 'Drop Policy PDF')}</div>
                   </div>
                 </label>
               </div>
               <div className="space-y-4">
                 <label className="flex items-center gap-2 px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                   <Database className="w-3.5 h-3.5 text-[#8FD4BB]" /> Ledger Ingestion (CSV)
                 </label>
                 <input type="file" id="csv-up" className="hidden" accept=".csv" onChange={handleCsvUpload} />
                 <label htmlFor="csv-up" className={`group h-48 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-[2rem] transition-all cursor-pointer ${transactions.length > 0 ? 'border-[#8FD4BB] bg-[#8FD4BB]/5' : 'border-slate-100 hover:border-[#8FD4BB] hover:bg-slate-50/50'}`}>
                   {isCsvUploading ? <Activity className="w-12 h-12 text-[#8FD4BB] animate-pulse" /> : (transactions.length > 0 ? <CheckCircle2 className="w-12 h-12 text-[#8FD4BB]" /> : <Upload className="w-12 h-12 text-slate-200 group-hover:text-[#8FD4BB]" />)}
                   <div className="text-center mt-4">
                     <div className="font-bold text-slate-800 text-sm">{transactions.length > 0 ? `${transactions.length.toLocaleString()} Violations Loaded` : (isCsvUploading ? 'Loading...' : 'Drop Data CSV')}</div>
                   </div>
                 </label>
               </div>
            </div>

            <button 
              onClick={runCheck} 
              disabled={transactions.length === 0}
              className="w-full h-16 bg-[#A8E6CF] text-[#2D5A4C] rounded-[1.5rem] font-black text-lg shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale group"
            >
              <Play className="w-5 h-5 fill-[#2D5A4C] group-hover:scale-110 transition-transform" />
              Run Analysis
            </button>
          </motion.div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 mt-6">
          
          {/* Top Dashboard Cards */}
          <div className="grid grid-cols-4 gap-8">
            {[
              { label: 'Total Volume', value: stats.total.toLocaleString(), icon: Database, color: 'emerald', trend: 'Audit Ready' },
              { label: 'Violations Detected', value: stats.violations.toLocaleString(), icon: ShieldAlert, color: 'rose', trend: 'High Priority' },
              { label: 'High Risk Violations', value: stats.highRisk.toLocaleString(), icon: AlertTriangle, color: 'amber', trend: 'Needs Review' },
              { label: 'Clean Records', value: ((stats.total - stats.violations) / (stats.total || 1) * 100).toFixed(1) + '%', icon: CheckCircle2, color: 'teal', trend: 'Verified' },
            ].map((stat, i) => (
              <div key={i} className="glass-card p-7 shadow-lg shadow-slate-200/40 relative overflow-hidden flex flex-col justify-between h-40">
                <div className={`absolute -right-4 -bottom-4 opacity-5 text-slate-900`}><stat.icon className="w-32 h-32" /></div>
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</span>
                    <span className="text-3xl font-black text-slate-800 tracking-tighter">{stat.value}</span>
                  </div>
                  <div className={`p-2.5 rounded-xl bg-${stat.color}-50 text-${stat.color}-500 shadow-inner`}><stat.icon className="w-5 h-5" /></div>
                </div>
                <div className="flex items-center gap-1.5 mt-auto">
                   <div className={`w-1.5 h-1.5 rounded-full bg-${stat.color}-400 animate-pulse`} />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.trend}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card shadow-2xl overflow-hidden min-h-[700px] flex flex-col bg-white">
            {/* Header / Search Area */}
            <div className="p-8 border-b border-slate-50 flex flex-col gap-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#A8E6CF]/20 rounded-2xl"><Wallet className="w-6 h-6 text-[#2D5A4C]" /></div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Violations</h2>
                 </div>
                 
                 <div className="flex bg-slate-100 p-1.5 rounded-[1rem]">
                    <button 
                      onClick={() => setViewMode('violations')}
                      className={`px-6 py-2.5 rounded-[0.8rem] text-xs font-black transition-all flex items-center gap-2 ${viewMode === 'violations' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> Violations Only
                    </button>
                    <button 
                      onClick={() => setViewMode('all')}
                      className={`px-6 py-2.5 rounded-[0.8rem] text-xs font-black transition-all flex items-center gap-2 ${viewMode === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <ListFilter className="w-3.5 h-3.5" /> Complete Registry
                    </button>
                 </div>
               </div>

               <div className="relative group">
                 <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#A8E6CF] transition-colors" />
                 <input 
                   type="text" 
                   placeholder="Search..." 
                   className="w-full h-14 bg-slate-50 border-none rounded-[1.2rem] pl-14 pr-6 text-sm font-medium text-slate-800 outline-none focus:ring-4 focus:ring-[#A8E6CF]/10 transition-all placeholder:text-slate-200"
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                 />
               </div>
            </div>

            {/* Ledger Table */}
            <div className="flex-1 overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-100">
                   <tr>
                     <th className="py-5 px-8 text-left font-black text-[11px] uppercase tracking-widest text-slate-400 w-32">Index</th>
                     <SortHeader label="Amount" col="amount" />
                     <th className="py-5 px-6 text-left font-black text-[11px] uppercase tracking-widest text-slate-400">Transaction Type</th>
                     <th className="py-5 px-6 text-left font-black text-[11px] uppercase tracking-widest text-slate-400">Employee ID</th>
                     <th className="py-5 px-6 text-left font-black text-[11px] uppercase tracking-widest text-slate-400">Rule Violated</th>
                     <SortHeader label="Risk Level" col="risk" />
                     <th className="py-5 px-8 text-right font-black text-[11px] uppercase tracking-widest text-slate-400 w-24">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {paginatedData.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-6 px-8 flex flex-col">
                           <span className="text-[10px] font-mono text-slate-800 font-bold uppercase">TXN-{(transactions.indexOf(d) + 1).toString().padStart(6, '0')}</span>
                        </td>
                        <td className="py-6 px-6">
                           <div className="flex flex-col">
                              <span className="text-lg font-black text-slate-800 tracking-tighter">{formatINR(d._amount)}</span>
                           </div>
                        </td>
                        <td className="py-6 px-6">
                           <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg font-black text-[10px] uppercase tracking-tighter border border-slate-200">{d._format}</span>
                        </td>
                        <td className="py-6 px-6">
                           <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <span className="text-slate-800 font-bold text-xs font-mono">EMP-{getVal(d, ['account', 'user']) || 'ANONYMOUS'}</span>
                              </div>
                           </div>
                        </td>
                        <td className="py-6 px-6">
                           {d._rule ? (
                             <div className="flex flex-col max-w-[320px]">
                               <div className="flex items-center gap-2 mb-1.5">
                                 <span className="px-2 py-0.5 bg-rose-50 text-rose-500 rounded-md text-[9px] font-black border border-rose-100 uppercase tracking-tighter">{d._rule.clause_id}</span>
                                 <span className="text-[11px] font-bold text-slate-700">{d._rule.requirement}</span>
                               </div>
                               <p className="text-[10px] text-slate-400 italic font-medium line-clamp-2 leading-relaxed">"{d._rule.condition}"</p>
                             </div>
                           ) : (
                             <div className="flex items-center gap-2 text-emerald-500">
                               <ShieldCheck className="w-4 h-4" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Valid Profile</span>
                             </div>
                           )}
                        </td>
                        <td className="py-6 px-6">
                           <div className="flex flex-col gap-1.5 w-28">
                             <div className="flex justify-between items-center px-0.5">
                               <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm tracking-tighter ${
                                 d._riskLabel === 'CRITICAL' ? 'bg-rose-500 text-white' : 
                                 d._riskLabel === 'HIGH' ? 'bg-amber-500 text-white' : 
                                 d._riskLabel === 'MEDIUM' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                               }`}>{d._riskLabel}</span>
                               <span className="text-[10px] font-black text-slate-400">{d._riskScore}%</span>
                             </div>
                             <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                               <motion.div initial={{ width: 0 }} animate={{ width: `${d._riskScore}%` }} className={`h-full ${d._riskScore > 80 ? 'bg-rose-500' : d._riskScore > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                             </div>
                           </div>
                        </td>
                        <td className="py-6 px-8 text-right">
                           <button onClick={() => navigate('/investigation', { state: { transaction: d } })} className="p-3 bg-white border border-slate-100 rounded-2xl hover:bg-[#A8E6CF] hover:border-[#A8E6CF] hover:text-[#2D5A4C] text-slate-300 transition-all shadow-sm active:scale-90 group/btn">
                             <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                           </button>
                        </td>
                      </tr>
                    ))}
                    {paginatedData.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-40 text-center">
                           <div className="flex flex-col items-center opacity-20">
                             <ShieldQuestion className="w-16 h-16 mb-4 text-slate-400" />
                             <p className="text-xl font-black text-slate-800 uppercase tracking-widest">No Violations Found</p>
                           </div>
                        </td>
                      </tr>
                    )}
                 </tbody>
               </table>
            </div>

            {/* Pagination */}
            <div className="p-8 border-t border-slate-50 bg-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-6 text-[11px] font-black uppercase text-slate-300 tracking-widest">
                  <span>Page {page} of {totalPages || 1}</span>
                  <div className="h-4 w-[1px] bg-slate-200" />
                  <span>Showing {paginatedData.length} Violations Found</span>
               </div>
               <div className="flex items-center gap-3">
                  <button onClick={()=>setPage(p=>p-1)} disabled={page===1} className="h-11 px-6 bg-white border border-slate-100 rounded-2xl font-black text-[11px] text-slate-400 hover:text-slate-800 disabled:opacity-20 transition-all">Previous</button>
                  <button onClick={()=>setPage(p=>p+1)} disabled={page===totalPages || totalPages === 0} className="h-11 px-8 bg-[#A8E6CF] rounded-2xl font-black text-[11px] text-[#2D5A4C] hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-sm">Next</button>
               </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
