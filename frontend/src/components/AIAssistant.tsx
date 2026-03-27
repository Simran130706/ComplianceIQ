import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Send, Sparkles, 
  Cpu, ShieldCheck, Zap, Bot, 
  TrendingUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useData } from '../context/DataContext';

interface Message {
  text: string;
  isUser: boolean;
  id: string;
}

import { QueryEngine } from '../utils/QueryEngine';

export const AIAssistant: React.FC = () => {
  const { transactions, rules, setQueryFilter } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      text: "Hello! I am **ComplianceIQ Intelligence**. I have now synced with your current transaction ledger and policy rules. \n\nAsk me to filter data, find patterns, or analyze specific user behavior.", 
      isUser: false, 
      id: 'initial' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const currentInput = input;
    const userMsg: Message = { text: currentInput, isUser: true, id: Date.now().toString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    // FAST-PATH: RegEx Intent Detection (under 1ms)
    console.time('RegExIntent');
    const intent = QueryEngine.parse(currentInput);
    console.timeEnd('RegExIntent');

    if (intent) {
      console.log('Fast-path triggered:', intent);
      setQueryFilter(intent);
      setMessages(prev => [...prev, { 
        text: `Intelligence identified intent: **${intent.label}**. Neural filter applied instantly across all monitoring modules.`, 
        isUser: false, 
        id: (Date.now() + 1).toString() 
      }]);
      return; // BYPASS LLM API
    }

    setIsTyping(true);

    try {
      const history = messages.slice(-5);
      const response = await fetch('http://127.0.0.1:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: currentInput, 
          history,
          transactions: transactions.slice(0, 50), // Optimized context
          rules 
        })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Intelligence Link Error');

      const aiMsg: Message = { text: data.response, isUser: false, id: (Date.now() + 1).toString() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        text: `**Intelligence Link Failed**: ${error.message || 'Check connection.'}`, 
        isUser: false, id: 'error' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* FLOATING Holographic Bubble - Reduced Z-Index when open to avoid blocking */}
      <motion.div
        className="fixed bottom-6 right-6 z-[999]"
        initial={false}
      >
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all ${
            isOpen ? 'bg-slate-900 border-2 border-slate-700' : 'bg-emerald-500 border-2 border-white'
          }`}
        >
          {isOpen ? <X size={24} className="text-emerald-400" /> : <Bot size={28} className="text-white" />}
          
          {!isOpen && (
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full border-2 border-emerald-400"
            />
          )}
        </motion.button>
      </motion.div>

      {/* CHAT INTERFACE - Higher Z-Index to ensure focus and interactivity */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-28 right-6 z-[1000] w-[400px] h-[650px] max-h-[85vh] bg-white/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] border-4 border-white flex flex-col overflow-hidden"
          >
            {/* Seamless Glass Header */}
            <div className="px-6 py-5 bg-white/40 border-b border-white/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                  <Cpu size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter italic">ComplianceIQ Intelligence</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em]">Matrix v4.1 Connected</span>
                  </div>
                </div>
              </div>
              <Sparkles size={16} className="text-emerald-400 animate-pulse" />
            </div>

            {/* Message Stream */}
            <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar bg-slate-50/10">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[90%] p-4 rounded-2xl relative ${
                    m.isUser 
                    ? 'bg-slate-900 text-white rounded-br-none shadow-lg' 
                    : 'bg-white text-slate-700 rounded-bl-none border border-slate-100 shadow-sm'
                  }`}>
                    {!m.isUser && (
                      <div className="flex items-center gap-2 mb-2">
                         <ShieldCheck size={12} className="text-emerald-500" />
                         <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Diagnostic Report</span>
                      </div>
                    )}
                    <div className="text-[13px] leading-relaxed font-medium prose prose-slate prose-sm max-w-none">
                      <ReactMarkdown 
                        components={{
                          strong: ({node, ...props}) => <span className="font-black text-emerald-600" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          li: ({node, ...props}) => <li className="ml-4 list-disc" {...props} />
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    </div>
                    {m.isUser && (
                       <Zap size={10} className="absolute -bottom-1 -right-1 text-emerald-400" />
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/80 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-1.5">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions - Slimmer Chips */}
            <div className="px-4 flex gap-2 overflow-x-auto pb-4 custom-scrollbar scrollbar-hide">
               {['RBI Circulars', 'KYC Mandates', 'Fraud Detection', 'PMLA Rules'].map(topic => (
                 <button 
                  key={topic}
                  onClick={() => setInput(topic)}
                  className="whitespace-nowrap px-4 py-2 bg-white text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-100 hover:border-emerald-300 hover:text-emerald-600 transition-all flex items-center gap-1.5 shadow-sm"
                 >
                   <TrendingUp size={10} /> {topic}
                 </button>
               ))}
            </div>

            {/* Seamless Typebar Fix */}
            <div className="p-4 bg-white/40 border-t border-white/40 relative">
              <div className="relative flex items-center bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask Intelligence Anything..."
                  className="flex-1 px-4 py-3 bg-transparent outline-none text-[13px] font-bold text-slate-700 placeholder:text-slate-300"
                />
                <button
                  onClick={handleSend}
                  disabled={isTyping}
                  className="p-3 bg-slate-900 text-emerald-400 hover:text-white transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
              
              <div className="flex justify-center mt-3 text-[8px] font-black text-slate-300 uppercase tracking-widest gap-2">
                 Compliance Intelligence Engine Active
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
