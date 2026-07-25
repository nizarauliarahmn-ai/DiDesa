import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, User, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';

export default function AdminAiAssistant() {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Halo! Saya Desi, Asisten Pintar DiDesa. Ada yang bisa saya bantu terkait informasi desa, statistik penduduk, atau administrasi hari ini?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    
    try {
      const authUserStr = localStorage.getItem('didesa_auth_user');
      let tenantId = null;
      if (authUserStr) {
        try {
          const authUser = JSON.parse(authUserStr);
          tenantId = authUser.tenantId;
        } catch(e) {}
      }

      if (!tenantId) {
        tenantId = localStorage.getItem('tenant_id') || 'sukamakmur';
      }

      const response = await fetch('/api/chat-desi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, tenantId })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Terjadi kesalahan pada server');

      setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', content: `Maaf, terjadi kesalahan: ${error.message}. Pastikan API Key sudah dikonfigurasi.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 h-[calc(100vh-80px)] flex flex-col px-4 sm:px-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner text-white">
          <Bot size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Desi (Asisten AI DiDesa)
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-200 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={10} /> Unggulan
            </span>
            <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white shadow-sm dark:shadow-none">
              ONLINE
            </span>
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Tanya informasi layanan, statistik, atau panduan secara instan.</p>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
          {messages.map((msg, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i} 
              className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-100 dark:bg-slate-800' : 'bg-indigo-100 text-indigo-600'}`}>
                {msg.role === 'user' ? <User size={14} className="text-gray-600 dark:text-slate-400" /> : <Bot size={14} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm font-medium ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-tl-sm border border-gray-100 dark:border-slate-800'}`}>
                {msg.role === 'ai' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 max-w-[85%]"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-indigo-100 text-indigo-600">
                <Bot size={14} />
              </div>
              <div className="p-4 rounded-2xl text-sm font-medium bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-tl-sm border border-gray-100 dark:border-slate-800 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-indigo-500" />
                <span className="text-gray-500">Desi sedang berpikir...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-800">
          <form onSubmit={handleSend} className="relative">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanyakan jumlah penduduk, profesi, dsb..."
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none disabled:bg-gray-100 disabled:text-gray-400 dark:bg-slate-900 dark:text-white"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg transition-colors"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
