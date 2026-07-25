import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, User, AlertTriangle, Loader2, Key, Save } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { fetchResidentsCached } from '../../utils/apiCache';

export default function AdminAiAssistant() {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Halo! Saya Desi, Asisten Pintar DiDesa. Ada yang bisa saya bantu terkait informasi desa, statistik penduduk, atau administrasi hari ini?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [tenantId, setTenantId] = useState('sukamakmur');
  const [apiKey, setApiKey] = useState('');
  const [inputApiKey, setInputApiKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    const authUserStr = localStorage.getItem('didesa_auth_user');
    let tId = 'sukamakmur';
    if (authUserStr) {
      try {
        const authUser = JSON.parse(authUserStr);
        if (authUser && authUser.tenantId) tId = authUser.tenantId;
      } catch(e) {}
    }
    setTenantId(tId);
    
    const storedKey = localStorage.getItem(`desi_api_key_${tId}`);
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setShowConfig(true);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const saveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputApiKey.trim()) return;
    localStorage.setItem(`desi_api_key_${tenantId}`, inputApiKey.trim());
    setApiKey(inputApiKey.trim());
    setShowConfig(false);
  };

  const resetApiKey = () => {
    localStorage.removeItem(`desi_api_key_${tenantId}`);
    setApiKey('');
    setInputApiKey('');
    setShowConfig(true);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !apiKey) return;
    
    const userMessage = input.trim();
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    
    try {
      // Fetch residents for context
      const resData = await fetchResidentsCached();
      let totalResidents = 0;
      let male = 0;
      let female = 0;
      let topJobsStr = '-';
      
      if (resData && typeof resData.json === 'function') {
        const residents = await resData.json();
        if (Array.isArray(residents)) {
          totalResidents = residents.length;
          male = residents.filter(r => r.gender === 'Laki-laki').length;
          female = residents.filter(r => r.gender === 'Perempuan').length;
          
          let jobCounts: Record<string, number> = {};
          residents.forEach(r => {
            const job = r.job || "Lainnya";
            jobCounts[job] = (jobCounts[job] || 0) + 1;
          });
          topJobsStr = Object.entries(jobCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(j => `${j[0]}: ${j[1]}`).join(', ');
        }
      }

      const systemPrompt = `Kamu adalah Desi, Asisten Pintar "DiDesa".
Tugasmu adalah membantu admin/perangkat desa dalam mengelola data, memberikan informasi statistik, serta menjawab pertanyaan administratif.
Selalu gunakan bahasa Indonesia yang sopan, ramah, dan profesional. Jangan memberikan informasi fiktif jika kamu tidak tahu. Jawab dengan ringkas jika memungkinkan.

[KONTEKS DATA DESA SAAT INI]
- ID Desa: ${tenantId.toUpperCase()}
- Total Penduduk: ${totalResidents} jiwa
- Laki-laki: ${male} jiwa
- Perempuan: ${female} jiwa
- 5 Profesi Terbanyak: ${topJobsStr}

Gunakan data di atas untuk menjawab pertanyaan terkait desa ini.`;

      const geminiMessages = newMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: geminiMessages
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error && data.error.message.includes('API key not valid')) {
          resetApiKey();
          throw new Error('API Key tidak valid atau telah kadaluarsa.');
        }
        throw new Error(data.error?.message || 'Terjadi kesalahan pada server AI');
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak mengerti maksud Anda.";
      setMessages(prev => [...prev, { role: 'ai', content: reply }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', content: `Maaf, terjadi kesalahan: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 h-[calc(100vh-80px)] flex flex-col px-4 sm:px-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
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
        {!showConfig && apiKey && (
          <button 
            onClick={() => setShowConfig(true)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-2"
          >
            <Key size={14} /> Ganti API Key
          </button>
        )}
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col relative">
        {showConfig ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
              <Key size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Konfigurasi API Key AI</h3>
            <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto mb-8">
              Untuk mengaktifkan fitur Asisten AI bagi desa ini, masukkan API Key Google Gemini Anda. API Key disimpan aman secara lokal di perangkat Anda.
            </p>
            
            <form onSubmit={saveApiKey} className="w-full max-w-md">
              <div className="flex gap-2">
                <input 
                  type="password"
                  value={inputApiKey}
                  onChange={(e) => setInputApiKey(e.target.value)}
                  placeholder="Paste API Key Gemini Anda di sini..."
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none dark:bg-slate-800 dark:text-white"
                  required
                />
                <button 
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 transition-colors"
                >
                  <Save size={18} /> Simpan
                </button>
              </div>
              <div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
                <span>Belum punya API Key?</span>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  Dapatkan gratis di sini &rarr;
                </a>
              </div>
            </form>
            
            {apiKey && (
              <button 
                onClick={() => setShowConfig(false)}
                className="mt-8 text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Batal
              </button>
            )}
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
