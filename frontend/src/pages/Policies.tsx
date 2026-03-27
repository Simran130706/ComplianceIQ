import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { 
  UploadCloud, ShieldCheck, Activity, FileText, 
  AlertCircle, Search, Settings, ShieldAlert,
  TrendingDown, UserCheck, Timer, Info, XCircle,
  Zap, Lightbulb, FileWarning, Cpu, Play, MousePointer2,
  RefreshCcw, ChevronRight, Layers, Target, ArrowDownCircle,
  Maximize2, Eye, ShieldQuestion, Minimize2,
  Link2, Globe, Upload, CheckCircle2, Loader2, X, FileSearch
} from 'lucide-react';
import { 
  ReactFlow, Background, Controls, MarkerType, 
  Handle, Position, type Edge, type Node 
} from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import '@xyflow/react/dist/style.css';

// --- ABSOLUTE SCALE Custom Nodes ---

const RootNode = ({ data }: any) => (
  <motion.div 
    animate={{ boxShadow: ['0 0 50px #10b98122', '0 0 100px #10b98144', '0 0 50px #10b98122'] }}
    transition={{ repeat: Infinity, duration: 4 }}
    className="w-[550px] p-20 rounded-[8rem] border-[12px] border-emerald-500 bg-white shadow-3xl flex flex-col items-center text-center gap-12 relative cursor-pointer"
  >
    <div className="p-12 bg-emerald-500 text-white rounded-[4rem] shadow-2xl">
      <Cpu size={100} className="animate-pulse" />
    </div>
    <div className="space-y-4">
      <h4 className="text-6xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">Neural Policy Matrix</h4>
      <p className="text-[18px] font-black text-emerald-600 uppercase tracking-[0.8em] mt-6 underline decoration-emerald-500/30">Logic Core V4.0</p>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-emerald-400 !w-12 !h-12 !border-white !border-[12px]" />
  </motion.div>
);

const GroupNode = ({ data }: any) => (
  <div className="w-[450px] p-12 rounded-[5rem] border-8 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center text-center gap-6 cursor-pointer">
    <div className="p-6 bg-white text-slate-300 rounded-full border-4 border-slate-100 shadow-sm"><Layers size={48} /></div>
    <h5 className="text-[22px] font-black text-slate-400 uppercase tracking-[0.8em] leading-none mb-2">{data.label}</h5>
    <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-8 !h-8" />
    <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-8 !h-8" />
  </div>
);

const TriggerNode = ({ data }: any) => (
  <motion.div 
    whileHover={{ scale: 1.05 }}
    className={`w-[500px] p-16 rounded-[5rem] border-8 bg-white shadow-3xl transition-all cursor-pointer ${data.focused ? 'border-emerald-500 ring-[40px] ring-emerald-500/5' : 'border-slate-100'}`}
  >
    <Handle type="target" position={Position.Top} className="!bg-emerald-400 !w-8 !h-8" />
    <Handle type="source" position={Position.Bottom} className="!bg-emerald-400 !w-8 !h-8" />
    <div className="flex justify-between items-center mb-12">
      <div className="flex items-center gap-8">
        <div className="p-6 bg-emerald-500 text-white rounded-[2rem] shadow-xl"><Search size={48} /></div>
        <span className="text-[22px] font-black text-emerald-600 uppercase tracking-widest leading-none">Detection Point</span>
      </div>
      <span className="text-[14px] font-black text-slate-200 uppercase italic tracking-tighter">#{data.clause_id}</span>
    </div>
    <p className="text-[28px] font-bold text-slate-700 leading-relaxed italic break-words px-4">
      "{data.condition || 'Flow logic active...'}"
    </p>
  </motion.div>
);

const LogicNode = ({ data }: any) => (
  <motion.div 
    whileHover={{ scale: 1.05 }}
    className={`w-[450px] p-16 rounded-[5rem] border-8 bg-white shadow-3xl transition-all cursor-pointer ${data.focused ? 'border-emerald-500 ring-[40px] ring-emerald-500/5' : 'border-slate-100'}`}
  >
    <Handle type="target" position={Position.Top} className="!bg-emerald-400 !w-8 !h-8" />
    <Handle type="source" position={Position.Bottom} className="!bg-emerald-400 !w-8 !h-8" />
    <div className="flex items-center gap-10 mb-12">
      <div className="p-8 bg-slate-900 text-white rounded-[2rem] shadow-2xl"><Zap size={48} /></div>
      <span className="text-[22px] font-black text-slate-900 uppercase tracking-widest leading-none">Inference Path</span>
    </div>
    <div className="space-y-10">
       <div className="flex justify-between items-center text-[18px] font-black text-emerald-600 uppercase tracking-[0.4em]">
          <span>Pattern Matching</span>
          <span>{data.confidence || 0}%</span>
       </div>
       <div className="h-4 w-full bg-emerald-50 rounded-full overflow-hidden shadow-inner overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${data.confidence || 0}%` }} className="h-full bg-emerald-500 shadow-[0_0_30px_#10b98188]" />
       </div>
    </div>
  </motion.div>
);

const ActionNode = ({ data }: any) => {
  const isRed = (data.obligation || '').toLowerCase().includes('suspend') || (data.obligation || '').toLowerCase().includes('reject');
  const theme = isRed ? { border: 'border-rose-500', ring: 'ring-rose-500/10', text: 'text-rose-600', badge: 'bg-rose-500' } 
                   : { border: 'border-emerald-500', ring: 'ring-emerald-500/10', text: 'text-emerald-600', badge: 'bg-emerald-500' };

  return (
    <motion.div whileHover={{ scale: 1.05 }} className={`w-[500px] p-16 rounded-[6rem] border-8 bg-white shadow-3xl transition-all cursor-pointer ${data.focused ? `${theme.border} ${theme.ring}` : `border-slate-100 shadow-slate-100/40`}`}>
      <Handle type="target" position={Position.Top} className={`!bg-emerald-400 !w-8 !h-8`} />
      <div className="flex items-center gap-10 mb-12">
        <div className={`p-8 ${theme.badge} text-white rounded-[2rem] shadow-2xl`}><ShieldAlert size={48} /></div>
        <span className={`text-[22px] font-black ${theme.text} uppercase tracking-widest leading-none`}>Audit Mandate</span>
      </div>
      <p className={`text-[32px] font-black ${theme.text} leading-tight uppercase italic break-words px-2`}>
        {data.obligation || 'Enforced Alert'}
      </p>
    </motion.div>
  );
};

const nodeTypes = { root: RootNode, cluster: GroupNode, trigger: TriggerNode, logic: LogicNode, enforcement: ActionNode };

// --- Focused Diagnostic Component (Professional Scale) ---

const DiagnosticModal = ({ node, onClose }: { node: any, onClose: () => void }) => {
  const role = node.nodeRole || (node.label === 'Policy Engine' ? 'root' : 'cluster');
  const id = node.clause_id || 'ID-INF';
  
  const profiles: any = {
    root: {
       title: "CORE NEURAL ENGINE",
       summary: "Central Policy Routing Matrix",
       content: "Primary orchestrator ingesting regulatory PDF context for behavioral clustering.",
       example: "Source: Neural V4.0 Extraction Engine.",
       icon: <Cpu size={80} className="text-emerald-500" />
    },
    cluster: {
       title: "CLUSTER MATRIX",
       summary: `Segment: ${node.label || 'Cluster'}`,
       content: `Logical group organizing policies into behavior-based segments for forensic detection.`,
       example: "Classification: Behavioral Segment.",
       icon: <Layers size={80} className="text-emerald-500" />
    },
    trigger: {
       title: `TRIGGER SIGNAL • ${id}`,
       summary: "Policy Parameter Match",
       content: `System identifies a dynamic event where ${node.condition?.toLowerCase() || 'conditions are met'}.`,
       example: `Trace: Section ${node.section_ref || 'INTERNAL'} mandate.`,
       icon: <Search size={80} className="text-emerald-500" />
    },
    logic: {
       title: `AI INFERENCE • ${id}`,
       summary: "Pattern Correlation",
       content: `AI evaluated a ${node.confidence || 95}% match for behavior patterns defined in global AML protocols.`,
       example: "Analysis: Multi-vector pattern correlation.",
       icon: <Zap size={80} className="text-emerald-500" />
    },
    enforcement: {
       title: `AUDIT MANDATE • ${id}`,
       summary: "Regulatory Enforcement",
       content: `Initiated enforcement: ${node.obligation || 'Regulatory Alert'}. Ensures zero-gap compliance.`,
       example: "Mandate Trace: Final binding obligation executed.",
       icon: <ShieldAlert size={80} className="text-rose-500" />
    }
  };

  const expl = profiles[role] || profiles.root;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2147483647] flex items-center justify-center p-12 bg-slate-900/40 backdrop-blur-[40px]"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
        className="w-full max-w-5xl bg-white rounded-[4rem] shadow-3xl border-[12px] border-white p-16 flex flex-col gap-12 max-h-[90vh] overflow-y-auto pr-8 custom-scrollbar relative"
      >
        <button onClick={onClose} className="absolute top-12 right-12 p-4 text-slate-300 hover:text-rose-500 transition-all"><XCircle size={48} /></button>
        
        <div className="flex flex-col items-center text-center gap-8">
           <div className="p-10 bg-emerald-50 rounded-[3rem] text-emerald-500 shadow-xl border-4 border-emerald-100 flex items-center justify-center">{expl.icon}</div>
           <div className="space-y-3">
              <h5 className="text-[18px] font-black text-emerald-600 tracking-[0.8em] uppercase leading-none italic">{expl.title}</h5>
              <h4 className="text-5xl font-black text-slate-800 italic uppercase leading-none tracking-tighter">{expl.summary}</h4>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-4">
           <div className="p-12 bg-slate-50 rounded-[3rem] border-4 border-slate-100 shadow-inner space-y-8">
              <p className="text-[14px] font-black text-slate-300 uppercase tracking-widest italic flex items-center gap-5 border-b-2 border-slate-100 pb-4"><Info size={32} /> Cognitive Reasoning</p>
              <p className="text-2xl font-bold text-slate-600 leading-relaxed italic break-words">"{expl.content}"</p>
           </div>
           <div className="flex flex-col gap-10">
              <div className="flex gap-8 items-start p-10 bg-emerald-50/50 rounded-[3.5rem] border-4 border-emerald-100 shadow-md">
                 <div className="p-6 bg-emerald-500 text-white rounded-3xl shadow-xl"><Lightbulb size={32} /></div>
                 <div className="space-y-3">
                    <p className="text-[16px] font-black text-emerald-700 uppercase tracking-widest leading-none">Intelligence</p>
                    <p className="text-xl font-bold text-slate-400 italic leading-relaxed">{expl.example}</p>
                 </div>
              </div>
              <div className="p-10 bg-slate-900 text-emerald-400 rounded-[3.5rem] flex items-center gap-10 shadow-2xl">
                 <ShieldCheck size={64} />
                 <div className="space-y-2">
                    <p className="text-[18px] font-black uppercase tracking-[0.4em]">Audit Verified</p>
                    <p className="text-sm opacity-40 font-bold italic">Rule Registry Success</p>
                 </div>
              </div>
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Page Component ---

type InputMode = 'pdf-file' | 'pdf-url' | 'webpage';

interface ExtractionResult {
  rules: any[];
  source: string;
  extractedChars: number;
  preview?: string;
}

export const Policies: React.FC = () => {
  const { rules, setRules } = useData();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Upload panel state
  const [mode, setMode] = useState<InputMode>('pdf-file');
  const [urlInput, setUrlInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractResult, setExtractResult] = useState<ExtractionResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
     if (isFullscreen) document.body.style.overflow = 'hidden';
     else document.body.style.overflow = 'auto';
     return () => { document.body.style.overflow = 'auto'; };
  }, [isFullscreen]);

  // Reset panel state when mode changes
  useEffect(() => {
    setUrlInput('');
    setExtractError(null);
    setExtractResult(null);
  }, [mode]);

  const applyRules = (result: ExtractionResult) => {
    setRules(result.rules || []);
    setExtractResult(null);
    setUrlInput('');
    setExtractError(null);
  };

  // ── PDF file upload ──────────────────────────────────────────
  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setExtractError('Please upload a valid PDF document (.pdf).');
      return;
    }
    setIsExtracting(true);
    setExtractError(null);
    setExtractResult(null);
    const formData = new FormData();
    formData.append('policy', file);
    try {
      const res = await fetch('http://localhost:3001/api/extract-rules', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed.');
      if (!data.rules?.length) throw new Error('No policy rules could be extracted from this PDF.');
      setExtractResult({ rules: data.rules, source: 'pdf-file', extractedChars: 0, preview: `${data.rules.length} rules extracted from "${file.name}"` });
    } catch (err: any) {
      setExtractError(err.message || 'Error communicating with backend.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ── PDF URL ──────────────────────────────────────────────────
  const handlePdfUrl = async () => {
    const url = urlInput.trim();
    if (!url) { setExtractError('Please enter a PDF URL.'); return; }
    setIsExtracting(true);
    setExtractError(null);
    setExtractResult(null);
    try {
      const res = await fetch('http://localhost:3001/api/extract-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed.');
      if (!data.rules?.length) throw new Error('No policy rules could be extracted from this PDF URL.');
      setExtractResult({
        rules: data.rules,
        source: 'pdf-url',
        extractedChars: data.extractedChars,
        preview: `${data.rules.length} rules extracted from remote PDF (${(data.extractedChars / 1000).toFixed(1)}k chars)`
      });
    } catch (err: any) {
      setExtractError(err.message || 'Error processing PDF URL.');
    } finally {
      setIsExtracting(false);
    }
  };

  // ── Webpage URL ──────────────────────────────────────────────
  const handleWebpageUrl = async () => {
    const url = urlInput.trim();
    if (!url) { setExtractError('Please enter a webpage URL.'); return; }
    setIsExtracting(true);
    setExtractError(null);
    setExtractResult(null);
    try {
      const res = await fetch('http://localhost:3001/api/extract-from-webpage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed.');
      if (!data.rules?.length) throw new Error('No policy rules could be extracted from this webpage.');
      setExtractResult({
        rules: data.rules,
        source: 'webpage',
        extractedChars: data.extractedChars,
        preview: data.preview || `${data.rules.length} rules extracted from webpage`
      });
    } catch (err: any) {
      setExtractError(err.message || 'Error processing webpage.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'pdf-file') { fileInputRef.current?.click(); return; }
    if (mode === 'pdf-url') { handlePdfUrl(); return; }
    handleWebpageUrl();
  };

  const TAB_MODES: { id: InputMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'pdf-file', label: 'Upload PDF', icon: <Upload className="w-4 h-4" />, desc: 'Upload a local PDF policy document' },
    { id: 'pdf-url',  label: 'PDF URL',    icon: <Link2  className="w-4 h-4" />, desc: 'Paste a direct link to a .pdf file' },
    { id: 'webpage',  label: 'Webpage URL', icon: <Globe  className="w-4 h-4" />, desc: 'Paste any webpage containing policy text' },
  ];

  const sourceLabel: Record<string, string> = {
    'pdf-file': 'PDF Upload', 'pdf-url': 'Remote PDF', 'webpage': 'Webpage Scrape'
  };

  const { nodes, edges } = useMemo(() => {
    if (!rules || rules.length === 0) return { nodes: [], edges: [] };
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    // SPACING Configuration
    const spacingX = 800;
    const clusterY = 600;
    const triggerY = 1300;
    const logicY = 2000;
    const actionY = 2700;

    newNodes.push({ id: 'root-engine', type: 'root', position: { x: spacingX * 2, y: 0 }, data: { label: 'Policy Engine' } });

    const highValueRules = rules.filter(r => (r.condition || '').toLowerCase().includes('amount') || (r.condition || '').toLowerCase().includes('threshold'));
    const otherRules = rules.filter(r => !highValueRules.includes(r));

    const clusterData = [
       { id: 'cluster-val', label: 'Financial Value Clusters', rules: highValueRules, x: 0 },
       { id: 'cluster-pat', label: 'Behavioral Neural Patterns', rules: otherRules, x: spacingX * 4 }
    ];

    clusterData.forEach((c) => {
       if (c.rules.length > 0) {
          newNodes.push({ id: c.id, type: 'cluster', position: { x: c.x + spacingX / 3, y: clusterY }, data: { label: c.label } });
          newEdges.push({ id: `e-root-${c.id}`, source: 'root-engine', target: c.id, animated: true, style: { stroke: '#10b981', strokeWidth: 10, opacity: 0.3 } });

          c.rules.forEach((rule, idx) => {
             const rIdx = rules.indexOf(rule);
             const x = c.x + idx * spacingX;
             const isFocused = focusedId === `rule-path-${rIdx}`;
             const isCritical = rule.confidence < 75 || c.id === 'cluster-val';

             const tId = `trig-${rIdx}`;
             const lId = `log-${rIdx}`;
             const eId = `enf-${rIdx}`;

             newNodes.push({ id: tId, type: 'trigger', position: { x, y: triggerY }, data: { ...rule, focused: isFocused, nodeRole: 'trigger' } });
             newNodes.push({ id: lId, type: 'logic', position: { x, y: logicY }, data: { ...rule, focused: isFocused, isCritical, nodeRole: 'logic' } });
             newNodes.push({ id: eId, type: 'enforcement', position: { x, y: actionY }, data: { ...rule, focused: isFocused, isCritical, nodeRole: 'enforcement' } });

             newEdges.push({ id: `e-c-${rIdx}`, source: c.id, target: tId, animated: true, style: { stroke: isFocused ? '#10b981' : '#cbd5e1', strokeWidth: 12, opacity: isFocused ? 1 : 0.4 } });
             newEdges.push({ id: `e1-${rIdx}`, source: tId, target: lId, animated: isFocused, type: 'smoothstep', style: { stroke: isFocused ? '#10b981' : '#cbd5e1', strokeWidth: 24, opacity: isFocused ? 1 : 0.2 } });
             newEdges.push({ id: `e2-${rIdx}`, source: lId, target: eId, animated: isFocused, type: 'smoothstep', style: { stroke: isFocused ? (isCritical ? '#ef4444' : '#10b981') : '#cbd5e1', strokeWidth: 24, opacity: isFocused ? 1 : 0.2 } });
          });
       }
    });

    return { nodes: newNodes, edges: newEdges };
  }, [rules, focusedId]);

  return (
    <div className="flex flex-col gap-10 w-full mx-auto pb-10 px-4">
      
      {/* ZERO-MARGIN CINEMATIC OVERLAY */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[2147483647] bg-white flex flex-col overflow-hidden"
          >
             {/* FLOATING HUD */}
             <div className="absolute top-10 left-10 z-[100] flex items-center gap-6 px-10 py-6 bg-white/40 backdrop-blur-3xl rounded-[3rem] border-4 border-white shadow-2xl">
                <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg"><Cpu size={32} /></div>
                <div className="space-y-0">
                   <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">Diagnostic Matrix</h2>
                   <p className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.5em] leading-none mt-1">Forensic Precision Mode</p>
                </div>
             </div>

             <button 
                onClick={() => setIsFullscreen(false)} 
                className="absolute top-10 right-10 z-[100] px-16 py-8 bg-slate-900 text-white rounded-full font-black text-xs uppercase tracking-[0.5em] hover:bg-slate-800 transition-all shadow-[0_50px_100px_rgba(0,0,0,0.5)] active:scale-95"
             >
                <Minimize2 size={32} className="inline mr-6" /> EXIT IMMERSION
             </button>

             <div className="w-full h-full relative">
                <ReactFlow 
                   nodes={nodes} edges={edges} nodeTypes={nodeTypes} 
                   onNodeClick={(e, n) => { e.stopPropagation(); setSelectedNode(n.data); }} 
                   onNodeMouseEnter={(_, node) => { const match = node.id.match(/\d+/); if (match) setFocusedId(`rule-path-${match[0]}`); }} 
                   onNodeMouseLeave={() => setFocusedId(null)} 
                   fitView fitViewOptions={{ padding: 0 }} 
                   minZoom={0.01} maxZoom={5}
                >
                   <Background color="#cbd5e1" gap={150} size={2} />
                   <Controls className="!bg-white !border-slate-100 !shadow-3xl !rounded-full !p-14 scale-150 origin-bottom-left !ml-10 !mb-10" />
                </ReactFlow>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ERGONOMIC DIAGNOSTIC MODAL */}
      <AnimatePresence>
        {selectedNode && (
          <DiagnosticModal node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </AnimatePresence>

      {/* --- HIGH-FIDELITY INGESTION PANEL --- */}
      <div className="w-full max-w-6xl mx-auto">
        <div className="glass-card border-2 border-slate-100 bg-white/40 shadow-2xl rounded-[4rem] overflow-hidden p-12 flex flex-col gap-10 relative">
          
          {/* Extraction Loading Overlay */}
          <AnimatePresence>
            {isExtracting && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center gap-10"
              >
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    className="w-40 h-40 rounded-full border-b-4 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-emerald-500">
                    <Loader2 size={48} className="animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic italic">Analyzing Source</h3>
                  <p className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.5em] animate-pulse">Neural Rule Extraction Pipeline Active</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Navigation */}
          <div className="flex gap-4 p-2 bg-slate-100/50 rounded-[2.5rem] w-fit border border-slate-200 shadow-inner">
            {TAB_MODES.map((t) => (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={`flex items-center gap-4 px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all ${
                  mode === t.id 
                    ? 'bg-white text-emerald-600 shadow-xl border border-emerald-100 scale-105' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-8">
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">
                {TAB_MODES.find(t => t.id === mode)?.label}
              </h2>
              <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">
                {TAB_MODES.find(t => t.id === mode)?.desc}
              </p>
            </div>

            {/* Input Area */}
            {mode === 'pdf-file' ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`h-72 border-4 border-dashed rounded-[3.5rem] flex flex-col items-center justify-center gap-6 cursor-pointer transition-all ${
                  dragOver ? 'border-emerald-500 bg-emerald-50/50 scale-[0.98]' : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-500/30'
                }`}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                <div className="p-8 bg-emerald-500 text-white rounded-[2rem] shadow-2xl transform transition-transform group-hover:scale-110">
                  <UploadCloud size={64} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xl font-black text-slate-700 uppercase tracking-tighter italic">Drop Policy Matrix Here</p>
                  <p className="text-[12px] font-bold text-slate-400">PDF Document Only (Max 20MB)</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="group relative">
                  <div className="absolute inset-y-0 left-8 flex items-center text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                    {mode === 'pdf-url' ? <Link2 size={32} /> : <Globe size={32} />}
                  </div>
                  <input 
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={mode === 'pdf-url' ? "https://regulatory.gov.in/policy.pdf" : "https://www.rbi.org.in/compliance-news"}
                    className="w-full h-24 pl-24 pr-10 bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] font-bold text-xl text-slate-700 outline-none focus:bg-white focus:border-emerald-500 focus:shadow-[0_0_80px_rgba(16,185,129,0.1)] transition-all placeholder:text-slate-200 placeholder:italic"
                  />
                  {urlInput && (
                    <button onClick={() => setUrlInput('')} className="absolute inset-y-0 right-8 text-slate-300 hover:text-rose-500">
                      <XCircle size={32} />
                    </button>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <button 
                    onClick={handleSubmit}
                    className="px-20 py-8 bg-emerald-500 text-white rounded-full font-black text-sm uppercase tracking-[0.5em] shadow-3xl hover:bg-emerald-600 transition-all active:scale-95 flex items-center gap-6"
                  >
                    <Cpu size={28} /> Start Extraction Matrix
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            <AnimatePresence>
              {extractError && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="p-8 bg-rose-50 border-2 border-rose-100 rounded-[2rem] flex items-center gap-6 text-rose-600 shadow-sm"
                >
                  <AlertCircle size={32} />
                  <p className="font-bold text-sm tracking-tight">{extractError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Extraction Result Preview Card */}
            <AnimatePresence>
              {extractResult && (
                <motion.div 
                  initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  className="p-12 bg-emerald-50 border-4 border-emerald-100 rounded-[3.5rem] flex flex-col gap-10 shadow-xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 text-emerald-200"><ShieldCheck size={120} /></div>
                  
                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-6">
                      <div className="p-5 bg-emerald-500 text-white rounded-[1.5rem] shadow-lg"><FileSearch size={32} /></div>
                      <div>
                        <h4 className="text-2xl font-black text-emerald-800 uppercase italic tracking-tighter">Extraction Signal Detected</h4>
                        <div className="flex gap-4 items-center mt-2">
                          <span className="text-[10px] font-black text-emerald-600 bg-white border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-widest">{sourceLabel[extractResult.source]}</span>
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{extractResult.rules.length} Logic Clauses Indexed</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setExtractResult(null)} className="p-3 text-emerald-300 hover:text-rose-500 transition-all"><X size={32} /></button>
                  </div>

                  <div className="bg-white/60 p-8 rounded-[2rem] border border-emerald-100/50 shadow-inner max-h-48 overflow-y-auto custom-scrollbar relative">
                    <p className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-4 italic sticky top-0 bg-white/60 z-10">Content Fragment</p>
                    <p className="text-xl font-bold text-slate-500 italic leading-relaxed break-words leading-tight">
                      {extractResult.preview ? `"${extractResult.preview}..."` : "Extraction payload verified and ready for tree injection."}
                    </p>
                  </div>

                  <div className="flex gap-6 relative z-10">
                    <button 
                      onClick={() => applyRules(extractResult)}
                      className="flex-1 py-8 bg-emerald-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.5em] shadow-3xl hover:bg-emerald-600 transition-all shadow-emerald-500/20"
                    >
                      <CheckCircle2 size={24} className="inline mr-4" /> Inject Into Neural Matrix
                    </button>
                    <button 
                      onClick={() => setExtractResult(null)}
                      className="px-12 py-8 bg-white text-slate-400 rounded-[2rem] font-black text-xs uppercase tracking-[0.5em] border border-slate-100 shadow-sm hover:text-rose-500 transition-all"
                    >
                      ABORT
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>

      {rules?.length > 0 && (
        <div className="flex flex-col gap-10">
          
          {/* CAROUSEL */}
          <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center px-4">
               <div className="space-y-1">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none italic">Clause Engine</h2>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Matrix Pool Indexed</p>
               </div>
               <button onClick={() => setRules([])} className="p-4 bg-white text-slate-400 rounded-2xl hover:bg-rose-50 border border-slate-100 shadow-md transition-all"><RefreshCcw size={22} /></button>
            </div>
            
            <div className="flex overflow-x-auto gap-10 pb-12 px-4 snap-x snap-mandatory custom-scrollbar items-start">
              {rules.map((r, i) => {
                 const isFocused = focusedId === `rule-path-${i}`;
                 return (
                  <motion.div 
                    key={i} 
                    onMouseEnter={() => setFocusedId(`rule-path-${i}`)}
                    onMouseLeave={() => setFocusedId(null)}
                    className={`min-w-[440px] max-w-[440px] bg-white rounded-[2.5rem] p-10 transition-all border-2 border-transparent shadow-2xl snap-start border-l-[15px] border-l-emerald-500 flex flex-col gap-8 ${isFocused ? 'ring-8 ring-emerald-500/10 scale-[1.02] bg-emerald-50/10' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                       <span className="text-[12px] font-black text-emerald-800 bg-emerald-100 px-4 py-1.5 rounded-full uppercase tracking-widest border border-emerald-200 shadow-sm">{r.clause_id}</span>
                       <div className="flex gap-4 items-center">
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">SEC {r.section_ref}</span>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-500 rounded-2xl border border-emerald-100 shadow-sm">
                             <ShieldCheck size={16} /><span className="text-[9px] font-black uppercase tracking-tighter">AI VERIFIED</span>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-6 flex-1">
                       <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Audit Trigger Logic</p>
                          <p className="text-[16px] font-black text-slate-800 italic leading-relaxed break-words px-2">"{r.condition}"</p>
                       </div>
                       <div className="px-4">
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Mandatory Result</p>
                          <p className="text-2xl font-black text-emerald-500 uppercase tracking-tighter leading-tight break-words">{r.obligation}</p>
                       </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-10 bg-white rounded-[5rem] p-16 border border-slate-100 relative overflow-hidden min-h-[1200px] shadow-sm">
             <div className="flex justify-between items-center relative z-20 px-8">
                <div className="space-y-2">
                   <div className="flex items-center gap-4 text-emerald-500"><Target size={48}/><h3 className="text-sm font-black uppercase tracking-[1em] italic">Forensic Matrix</h3></div>
                   <h4 className="text-6xl font-black text-slate-800 italic uppercase tracking-tighter leading-none">Decision Neural Tree</h4>
                </div>
                <button onClick={() => setIsFullscreen(true)} className="px-16 py-8 bg-emerald-500 text-white rounded-[3rem] font-black text-sm uppercase tracking-[0.5em] hover:bg-emerald-600 shadow-3xl shadow-emerald-500/30 transition-all active:scale-95">Launch Full-Display Immersion</button>
             </div>

             <div className="w-full h-[1000px] relative mt-16 border-4 border-slate-50 rounded-[5rem] bg-slate-50/10 shadow-inner cursor-pointer group" onClick={() => setIsFullscreen(true)}>
                <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={(e, n) => { e.stopPropagation(); setSelectedNode(n.data); }} fitView fitViewOptions={{ padding: 40 }}>
                   <Background color="#cbd5e1" gap={80} size={1} />
                </ReactFlow>
                <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/[0.01] flex items-center justify-center transition-all">
                   <div className="px-16 py-8 bg-white/90 backdrop-blur-3xl rounded-full shadow-3xl border-4 border-emerald-100 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-8 transform translate-y-10 group-hover:translate-y-0 duration-500">
                      <Maximize2 className="text-emerald-500" size={56} /> <span className="text-[20px] font-black text-emerald-600 uppercase tracking-[0.5em]">Focus Presentation Matrix</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
