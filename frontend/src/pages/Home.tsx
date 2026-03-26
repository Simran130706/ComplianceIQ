import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatINR, getRiskLevel } from '../utils/format';
import { Activity, Database, ArrowRight, ShieldAlert, TrendingUp, Users, CheckCircle2, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export const Home: React.FC = () => {
  const { transactions, loading } = useData();
  const navigate = useNavigate();

  // Stats for the top cards
  const violationsToday = useMemo(() => transactions.filter(t => t['Is Laundering'] === 1).length, [transactions]);
  const highRiskFlags = useMemo(() => transactions.filter(t => t['Is Laundering'] === 1 && t['Amount Paid'] > 10000).length, [transactions]);
  const cleanRate = useMemo(() => {
    const total = transactions.length || 1;
    const clean = total - violationsToday;
    return ((clean / total) * 100).toFixed(1);
  }, [transactions, violationsToday]);

  const topRiskyEmployees = useMemo(() => {
    const accMap: Record<string, { total: number, violations: number }> = {};
    transactions.forEach(t => {
      if (!accMap[t.Account]) {
        accMap[t.Account] = { total: 0, violations: 0 };
      }
      accMap[t.Account].total++;
      if (t['Is Laundering'] === 1) {
        accMap[t.Account].violations++;
      }
    });
    return Object.keys(accMap).map(acc => {
      const { total, violations } = accMap[acc];
      const riskScore = total > 0 ? Math.min((violations / total) * 100, 100) : 0;
      return { account: `EMP-${acc}`, violations, riskScore };
    }).sort((a, b) => b.violations - a.violations).slice(0, 5);
  }, [transactions]);

  const filteredViolations = useMemo(() => {
    let list = transactions.filter(t => t['Is Laundering'] === 1);
    list.sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());
    return list.slice(0, 8);
  }, [transactions]);

  if (loading) {
    return (
      <div className="w-full h-[80vh] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-[#A8E6CF]/30 border-t-[#A8E6CF] rounded-full animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Initializing Regulatory Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      
      {/* Hero / Overview Section */}
      <section className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-slate-100 flex justify-between items-center relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
             <div className="px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#3BB77E] animate-pulse" />
                <span className="text-[10px] font-black text-[#3BB77E] uppercase tracking-widest">System Live</span>
             </div>
          </div>
          <h1 className="text-6xl font-black text-slate-800 tracking-tighter mb-4">Compliance Dashboard</h1>
          <p className="text-xl text-slate-500 font-medium max-w-xl">Real-time compliance monitoring and employee validation across the entire ecosystem.</p>
        </div>
        <div className="absolute right-[-5%] top-[-10%] opacity-[0.03] rotate-12">
           <Shield className="w-96 h-96 text-slate-900" />
        </div>
      </section>

      {/* Analytics Cards Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Database, title: 'Total Volume', value: transactions.length.toLocaleString(), color: '#3BB77E', trend: 'Audit Ready' },
          { icon: ShieldAlert, title: 'Violations Detected', value: violationsToday, color: '#FF6B6B', trend: 'Critical Attention' },
          { icon: Activity, title: 'High Risk Violations', value: highRiskFlags, color: '#F1C40F', trend: 'Requires Audit' },
          { icon: CheckCircle2, title: 'Clean Records', value: cleanRate + '%', color: '#A8E6CF', trend: 'Verified' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-44 hover:shadow-lg transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.title}</p>
                <p className="text-3xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                 <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 pt-4">
               <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.trend}</span>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Main Content: Stacked Sections */}
      <div className="space-y-12">
        
        {/* Recent Threat Intelligence */}
        <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
           <div className="p-10 border-b border-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-emerald-50 rounded-2xl"><TrendingUp className="w-6 h-6 text-[#3BB77E]" /></div>
                 <h2 className="text-3xl font-black text-slate-800 tracking-tight">Recent Violations</h2>
              </div>
              <button 
                onClick={() => navigate('/compliance')}
                className="px-6 py-3 bg-slate-50 hover:bg-[#A8E6CF]/10 text-slate-400 hover:text-[#3BB77E] rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
              >
                Full Violations <ArrowRight className="w-4 h-4" />
              </button>
           </div>

           <div className="p-6">
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="border-b border-slate-50 text-[11px] font-black text-slate-300 uppercase tracking-widest">
                        <th className="py-5 px-6">Employee ID</th>
                        <th className="py-5 px-6">Amount</th>
                        <th className="py-5 px-6 text-center">Risk Level</th>
                        <th className="py-5 px-6">Timeline</th>
                        <th className="py-5 px-6 text-right">Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredViolations.map((t, i) => {
                        const risk = getRiskLevel(t['Amount Paid']);
                        return (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-6 px-6">
                              <span className="text-xs font-mono font-bold text-slate-800">EMP-{t.Account}</span>
                            </td>
                            <td className="py-6 px-6">
                              <span className="text-lg font-black text-slate-800 tracking-tighter">{formatINR(t['Amount Paid'])}</span>
                            </td>
                            <td className="py-6 px-6 text-center">
                              <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tighter ${
                                risk === 'Critical' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10' : 
                                risk === 'High' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/10' : 
                                'bg-[#A8E6CF] text-[#2D5A4C]'
                              }`}>
                                {risk}
                              </span>
                            </td>
                            <td className="py-6 px-6">
                               <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-800">{new Date(t.Timestamp).toLocaleDateString('en-IN')}</span>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(t.Timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                               </div>
                            </td>
                            <td className="py-6 px-6 text-right">
                              <button 
                                onClick={() => navigate('/investigation', { state: { transaction: t, index: i } })}
                                className="w-12 h-12 bg-white border border-slate-100 rounded-3xl flex items-center justify-center text-slate-300 hover:bg-[#A8E6CF] hover:border-[#A8E6CF] hover:text-[#2D5A4C] transition-all shadow-sm active:scale-90 group/btn"
                              >
                                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                 </table>
              </div>
           </div>
        </section>

        {/* Entity Alerts */}
        <section className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100">
           <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-rose-50 rounded-2xl"><ShieldAlert className="w-6 h-6 text-rose-500" /></div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Critical Entity Alerts</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topRiskyEmployees.map((emp, i) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  key={i}
                  className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-between hover:shadow-xl hover:bg-white transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-100">
                        <Users className="w-6 h-6 text-[#A8E6CF]" />
                     </div>
                     <div>
                        <h4 className="text-slate-800 font-black text-xs font-mono">{emp.account}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{emp.violations} Incidents</p>
                     </div>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl text-[11px] font-black border transition-all ${emp.riskScore > 70 ? 'bg-rose-500 text-white border-rose-600' : 'bg-amber-500 text-white border-amber-600'}`}>
                    {emp.riskScore.toFixed(0)}%
                  </div>
                </motion.div>
              ))}
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center group hover:border-[#A8E6CF] transition-all cursor-pointer">
                 <span className="text-[11px] font-black text-slate-400 group-hover:text-[#3BB77E] uppercase tracking-widest">Access All Entity Logs</span>
              </div>
           </div>
        </section>

      </div>
    </div>
  );
};
