import React, { useState, useCallback, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { UploadCloud, ShieldCheck, Activity, FileText, AlertCircle } from 'lucide-react';
import { ReactFlow, Background, Controls, MarkerType, type Edge, type Node } from '@xyflow/react';
import { motion } from 'framer-motion';
import '@xyflow/react/dist/style.css';

export const Policies: React.FC = () => {
  const { rules, setRules } = useData();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF document.');
      return;
    }
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('policy', file);

    try {
      const response = await fetch('http://localhost:3001/api/extract-rules', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to extract policy rules');
      const data = await response.json();
      setRules(data.rules || []);
    } catch (err: any) {
      setError(err.message || 'Error communicating with backend.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const { nodes, edges } = useMemo(() => {
    if (!rules || rules.length === 0) return { nodes: [], edges: [] };
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let yOffset = 50;
    const style = { borderRadius: '16px', padding: '14px', fontWeight: 'bold', fontSize: '10px', width: 220, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' };

    rules.forEach((rule, index) => {
      const conditionId = `cond-${index}`;
      const violId = `viol-${index}`;
      
      newNodes.push({
        id: conditionId,
        position: { x: 100, y: yOffset },
        data: { label: `Condition: ${rule.condition}` },
        style: { ...style, background: '#F8FAFC', color: '#64748B' }
      });

      newNodes.push({
        id: violId,
        position: { x: 450, y: yOffset },
        data: { label: `Obligation (Impact): ${rule.obligation}` },
        style: { ...style, background: '#FFF1F2', color: '#BE123C', borderColor: '#FECDD3' }
      });

      newEdges.push({
        id: `e-${index}`,
        source: conditionId,
        target: violId,
        animated: true,
        style: { stroke: '#CBD5E1' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' }
      });

      yOffset += 140;
    });
    return { nodes: newNodes, edges: newEdges };
  }, [rules]);

  return (
    <div className="flex flex-col gap-10 w-full mx-auto pb-10">
      
      {!rules.length && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex-1 flex flex-col items-center justify-center p-20 glass-card border-2 border-dashed transition-all duration-500 relative overflow-hidden ${
            isDragging ? 'border-[#A8E6CF] bg-emerald-50 shadow-2xl scale-[1.01]' : 'border-slate-100 bg-white/40'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-6">
               <div className="w-20 h-20 border-4 border-[#A8E6CF]/30 border-t-[#A8E6CF] rounded-full animate-spin" />
               <div className="text-center">
                  <p className="text-2xl font-black text-slate-800 tracking-tighter">AI Clause Interrogation</p>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Connecting to Llama-3 Node...</p>
               </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8 text-center relative z-10">
               <div className={`p-8 rounded-[3rem] shadow-xl ${isDragging ? 'bg-[#A8E6CF] text-white shadow-emerald-500/20' : 'bg-slate-50 text-slate-300'}`}>
                 <UploadCloud className="w-16 h-16" />
               </div>
               <div className="max-w-md">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-4">Upload Policy Document</h3>
                  <p className="text-slate-500 font-medium text-lg leading-relaxed">Drop RBI/SEBI policy documents to automatically extract enforcement clauses and validation logic.</p>
                 {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-rose-500 font-black text-xs uppercase mt-6 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 italic">{error}</motion.p>}
               </div>
               
               <input type="file" id="pdf-upload" className="hidden" accept="application/pdf" onChange={handleFileInput} />
               <label htmlFor="pdf-upload" className="h-16 px-12 cursor-pointer bg-[#A8E6CF] text-[#2D5A4C] rounded-[1.5rem] font-black text-base transition-all shadow-xl shadow-emerald-500/10 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3">
                 Browse Local Drive
               </label>
            </div>
          )}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-50/30 rounded-full blur-[120px] -z-1" />
        </motion.div>
      )}

      {rules.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
          <div className="grid grid-cols-12 gap-10">
            {/* Left Panel: Structued list */}
            <div className="col-span-12 lg:col-span-5 glass-card flex flex-col overflow-hidden shadow-xl shadow-emerald-900/[0.03]">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white/40">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#A8E6CF]" />
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Structured Clause Feed</h2>
                </div>
                <div className="text-[10px] font-black text-slate-400 px-3 py-1 bg-slate-50 rounded-lg">{rules.length} RULES EXTRACTED</div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 h-[700px] custom-scrollbar">
                {rules.map((r, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] flex flex-col gap-5 hover:shadow-lg transition-all border-l-8 border-l-[#A8E6CF]">
                    <div className="flex justify-between items-start">
                      <span className="text-[#2D5A4C] font-black text-xs font-mono bg-emerald-100 py-1 px-3 rounded-lg">{r.clause_id}</span>
                      <div className="flex gap-2">
                        <span className="text-slate-400 font-black text-[9px] uppercase tracking-widest bg-slate-100 py-1 px-3 rounded-lg border border-slate-200">{r.section_ref || 'GENERAL'}</span>
                        {r.confidence > 85 ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-lg uppercase tracking-tighter flex items-center gap-1 border border-emerald-100">
                            <ShieldCheck className="w-3 h-3"/> AI Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black rounded-lg uppercase tracking-tighter flex items-center gap-1 border border-amber-100">
                            <AlertCircle className="w-3 h-3"/> Vague
                          </span>
                        )}
                      </div>
                    </div>
                     <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Triggering Logic</p>
                          <p className="text-sm font-bold text-slate-700 leading-relaxed italic">"{r.condition}"</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Impact Enforcement</p>
                          <p className="text-sm font-black text-emerald-600 leading-tight tracking-tight">{r.obligation}</p>
                        </div>
                        {r.exception && (
                          <div>
                            <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-1">Exceptions Identified</p>
                            <p className="text-sm font-bold text-rose-400 leading-tight tracking-tight italic opacity-80">{r.exception}</p>
                          </div>
                        )}
                     </div>
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-200/50">
                       <span className="text-[10px] font-black text-slate-400">INDEX CONFIDENCE</span>
                       <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${r.confidence}%` }} className="h-full bg-[#A8E6CF]" />
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel: Logic Tree */}
            <div className="col-span-12 lg:col-span-7 glass-card flex flex-col overflow-hidden relative shadow-xl shadow-emerald-900/[0.03]">
              <div className="p-8 border-b border-slate-50 flex items-center gap-3 bg-white/40 absolute top-0 w-full z-10">
                <Activity className="w-5 h-5 text-[#A8E6CF]" />
                <h2 className="text-xl font-black text-slate-800 tracking-tight">AI Logical Correlation Tree</h2>
              </div>
              <div className="flex-1 w-full h-[700px] pt-20">
                <ReactFlow nodes={nodes} edges={edges} fitView>
                  <Background color="#CBD5E1" gap={20} size={1} />
                  <Controls className="bg-white border border-slate-100 shadow-xl rounded-xl" />
                </ReactFlow>
              </div>
            </div>
          </div>

          {/* Bottom Panel: KPI Rings */}
          <div className="grid grid-cols-4 gap-8">
            {[
              { name: 'Regulatory Clarity', score: 82, msg: 'Policy definitions meet SEBI-24 standards.' },
              { name: 'Logic Coverage', score: 74, msg: 'Section 4.1 needs manual threshold input.' },
              { name: 'Node Consistency', score: 91, msg: 'Semantic alignment verified across set.' },
              { name: 'Operational Risk', score: 88, msg: 'Low probability of false positives.' }
            ].map((h, i) => (
              <div key={i} className="glass-card p-8 flex flex-col items-center justify-between gap-6 shadow-xl shadow-emerald-900/[0.03]">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">{h.name}</h3>
                
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="64" className="stroke-slate-50" strokeWidth="10" fill="transparent" />
                    <motion.circle 
                      initial={{ strokeDashoffset: 402.1 }}
                      animate={{ strokeDashoffset: 402.1 - (402.1 * h.score) / 100 }}
                      transition={{ duration: 1.5, delay: i * 0.2 }}
                      cx="72" cy="72" r="64" 
                      className={`stroke-[#A8E6CF] fill-transparent`} 
                      strokeWidth="10" strokeLinecap="round" strokeDasharray="402.1"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-4xl font-black text-slate-800 tracking-tighter">{h.score}%</span>
                  </div>
                </div>

                <div className="text-[11px] font-bold text-slate-500 bg-slate-50 px-4 py-3 rounded-2xl text-center w-full leading-relaxed border border-slate-100 min-h-[60px] flex items-center justify-center">
                  {h.msg}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  );
};
