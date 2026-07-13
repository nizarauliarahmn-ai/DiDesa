import React, { useState } from 'react';
import { Bot, Sparkles, Send, User } from 'lucide-react';
import { motion } from 'motion/react';

export default function AiAssistant() {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Halo! Saya Asisten Pintar DiDesa. Ada yang bisa saya bantu terkait informasi desa, layanan, atau kependudukan hari ini?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', content: 'Terima kasih atas pertanyaannya. Fitur AI Generatif saat ini sedang dalam pengembangan lebih lanjut untuk memberikan jawaban yang lebih akurat dari database desa.' }]);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 h-[calc(100vh-80px)] flex flex-col px-4 sm:px-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner text-white">
          <Bot size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Asisten AI DiDesa
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-200 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={10} /> Unggulan
            </span>
            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white shadow-sm">
              DEV
            </span>
          </h2>
          <p className="text-gray-500 text-sm font-medium">Tanya informasi layanan, statistik, atau panduan secara instan.</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
          {messages.map((msg, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i} 
              className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-100' : 'bg-indigo-100 text-indigo-600'}`}>
                {msg.role === 'user' ? <User size={14} className="text-gray-600" /> : <Bot size={14} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm font-medium ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-gray-50 text-gray-700 rounded-tl-sm border border-gray-100'}`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </div>
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <form onSubmit={handleSend} className="relative">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanyakan sesuatu..."
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none"
            />
            <button 
              type="submit" 
              disabled={!input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
