import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, MessageSquare, Send, Sparkles, 
  Cpu, ShieldCheck, Zap, Bot, 
  CornerDownRight, Globe, TrendingUp, AlertCircle
} from 'lucide-react';

interface Message {
  text: string;
  isUser: boolean;
  id: string;
}

import { useData } from '../context/DataContext';

export const AIAssistant: React.FC = () => {
  const { transactions, rules } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      text: "Hello! I am ComplianceIQ Intelligence. I have now synced with your current transaction ledger and policy rules. Ask me to filter data, find patterns, or analyze specific user behavior.", 
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

    const userMsg: Message = { text: input, isUser: true, id: Date.now().toString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.slice(-5); // Send recent context
      const response = await fetch('http://127.0.0.1:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input, 
          history,
          transactions: transactions.slice(0, 100), // Optimized for context
          rules 
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Server reported an internal error');
      }

      const aiMsg: Message = { text: data.response, isUser: false, id: (Date.now() + 1).toString() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        text: `Intelligence Link Failed: ${error.message || 'Check your local server connection.'}`, 
        isUser: false, id: 'error' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* FLOATING Holographic Bubble */}
      <motion.div
        drag
        dragConstraints={{ left: -1200, right: 0, top: -800, bottom: 0 }}
        className="fixed bottom-10 right-10 z-[1000]"
      >
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          animate={isOpen ? { rotate: 90 } : {}}
          className={`relative p-8 rounded-full shadow-[0_0_50px_rgba(16,185,129,0.3)] flex items-center justify-center transition-all ${
            isOpen ? 'bg-slate-900 border-4 border-emerald-400' : 'bg-emerald-500 border-4 border-white'
          }`}
        >
          {isOpen ? <X size={40} className="text-emerald-400" /> : <Bot size={40} className="text-white" />}
          
          {/* Pulsing Aura */}
          {!isOpen && (
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full border-4 border-emerald-400"
            />
          )}
        </motion.button>
      </motion.div>

      {/* CHAT INTERFACE */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-32 right-8 z-[999] w-[420px] max-w-[calc(100vw-2rem)] h-[750px] max-h-[85vh] bg-white/80 backdrop-blur-[40px] rounded-[3.5rem] shadow-[0_80px_150px_-30px_rgba(0,0,0,0.3)] border-[6px] border-white flex flex-col overflow-hidden"
          >
            {/* Cinematic Header */}
            <div className="p-10 bg-slate-900 text-white relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_20px_#10b981]" />
               <div className="flex items-center gap-6 relative z-10 transition-all">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
                     <Cpu size={32} />
                  </div>
                  <div>
                     <h3 className="text-2xl font-black uppercase tracking-tighter italic">ComplianceIQ AI</h3>
                     <div className="flex items-center gap-3 mt-1">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Neural Link v4.0 Active</span>
                     </div>
                  </div>
               </div>
               
               {/* Background Glow */}
               <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
            </div>

            {/* Message Stream */}
            <div ref={scrollRef} className="flex-1 p-10 overflow-y-auto space-y-8 custom-scrollbar bg-slate-50/20">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: m.isUser ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${m.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-6 rounded-[2rem] shadow-sm relative ${
                    m.isUser 
                    ? 'bg-slate-900 text-white rounded-br-none border-t-2 border-slate-700' 
                    : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'
                  }`}>
                    {!m.isUser && (
                      <div className="flex items-center gap-2 mb-3">
                         <ShieldCheck size={14} className="text-emerald-500" />
                         <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">AI Agent Analysis</span>
                      </div>
                    )}
                    <p className="text-[15px] font-medium leading-relaxed italic break-words">
                      {m.text}
                    </p>
                    {m.isUser && (
                       <Zap size={14} className="absolute -bottom-2 -right-2 text-emerald-400" />
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/80 p-6 rounded-[2rem] rounded-bl-none shadow-sm flex gap-2">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="px-8 flex gap-3 overflow-x-auto pb-6 custom-scrollbar scrollbar-hide">
               {['RBI Circulars', 'KYC Mandates', 'Fraud Detection', 'PMLA Rules'].map(topic => (
                 <button 
                  key={topic}
                  onClick={() => setInput(topic)}
                  className="whitespace-nowrap px-6 py-3 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-2"
                 >
                   <TrendingUp size={12} /> {topic}
                 </button>
               ))}
            </div>

            {/* Cinematic Input */}
            <div className="p-8 bg-white border-t-4 border-emerald-50 relative group">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100 group-focus-within:border-emerald-500 group-focus-within:ring-8 group-focus-within:ring-emerald-500/5 transition-all">
                <Globe className="text-slate-300" size={24} />
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask Intelligence Anything..."
                  className="flex-1 bg-transparent border-none outline-none text-slate-700 font-bold placeholder:text-slate-300 italic"
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSend}
                  disabled={isTyping}
                  className="p-4 bg-slate-900 text-emerald-400 rounded-2xl shadow-xl hover:bg-black transition-all"
                >
                  <Send size={24} />
                </motion.button>
              </div>
              
              <div className="flex justify-center mt-4 text-[9px] font-black text-slate-300 uppercase tracking-widest gap-2">
                 <Sparkles size={10} className="text-emerald-500" />
                 Compliance Intelligence Engine Active
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
