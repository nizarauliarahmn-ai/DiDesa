import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, User, AlertTriangle, Loader2, Key, Save } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { fetchResidentsCached } from '../../utils/apiCache';

export default function AdminAiAssistant() {
  // Daftar endpoint lengkap: url API + nama model, dari paling baru ke paling stabil
  // Menggunakan v1 (stable) dan v1beta (experimental) untuk coverage maksimal
  const GEMINI_ENDPOINTS = [
    { url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent' },
    { url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent' },
    { url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent' },
    { url: 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-002:generateContent' },
    { url: 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-001:generateContent' },
    { url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent' },
    { url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent' },
    { url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent' },
    { url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent' },
    { url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent' },
  ];

  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Halo! Saya Desi, Asisten Pintar DiDesa. Ada yang bisa saya bantu terkait informasi desa, statistik penduduk, atau administrasi hari ini?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState('gemini-1.5-flash');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [tenantId, setTenantId] = useState('sukamakmur');
  const [apiKey, setApiKey] = useState('');
  const [inputApiKey, setInputApiKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [globalDesiLogo, setGlobalDesiLogo] = useState(() => localStorage.getItem('global_desi_logo') || '');

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
    
    const handleBrandingUpdate = () => {
      setGlobalDesiLogo(localStorage.getItem('global_desi_logo') || '');
    };
    window.addEventListener('global_branding_updated', handleBrandingUpdate);
    return () => window.removeEventListener('global_branding_updated', handleBrandingUpdate);
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
      let ageGroups = '';
      
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

          // Kelompok usia
          const anak = residents.filter(r => { const age = parseInt(r.age); return age >= 0 && age <= 14; }).length;
          const remaja = residents.filter(r => { const age = parseInt(r.age); return age >= 15 && age <= 24; }).length;
          const dewasa = residents.filter(r => { const age = parseInt(r.age); return age >= 25 && age <= 59; }).length;
          const lansia = residents.filter(r => { const age = parseInt(r.age); return age >= 60; }).length;
          ageGroups = `Anak (0-14): ${anak}, Remaja (15-24): ${remaja}, Dewasa (25-59): ${dewasa}, Lansia (60+): ${lansia}`;
        }
      }

      const villageName = localStorage.getItem('village_name') || 'Desa';
      const kecamatan = localStorage.getItem('village_kecamatan') || '-';
      const kabupaten = localStorage.getItem('village_kabupaten') || '-';
      const kadesName = localStorage.getItem('kop_kades') || '-';

      const systemPrompt = `Kamu adalah Desi, Asisten Pintar "DiDesa" — sistem manajemen desa digital berbasis AI.
Tugasmu adalah membantu admin/perangkat desa dalam mengelola data, memberikan informasi statistik, serta menjawab pertanyaan administratif.
Selalu gunakan bahasa Indonesia yang sopan, ramah, dan profesional.
Jika kamu tidak tahu jawabannya, katakan dengan jujur. Jangan mengarang data.
Format jawaban: gunakan poin atau paragraf singkat. Gunakan markdown untuk memformat.

[PROFIL DESA]
- Nama: ${villageName}
- Kecamatan: ${kecamatan}
- Kabupaten/Kota: ${kabupaten}
- Kepala Desa: ${kadesName}

[DATA KEPENDUDUKAN REAL-TIME]
- Total Penduduk: ${totalResidents} jiwa
- Laki-laki: ${male} jiwa | Perempuan: ${female} jiwa
- Kelompok Usia: ${ageGroups || '-'}
- 5 Profesi Terbanyak: ${topJobsStr}

Gunakan data di atas untuk menjawab pertanyaan terkait desa ini. Data ini adalah data aktual sistem.`;

      const geminiMessages = newMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      };

      // Coba setiap model dalam chain sampai berhasil
      let reply = '';
      let lastError = '';
      let usedModel = activeModel;

      // Payload tanpa generationConfig yang bermasalah di beberapa model
      const safePayload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      };

      for (const endpoint of GEMINI_ENDPOINTS) {
        const modelName = endpoint.url.split('/models/')[1]?.split(':')[0] || 'unknown';
        try {
          console.log(`[Desi] Mencoba: ${endpoint.url}`);
          
          let currentPayload = { ...safePayload };
          // Model lama (1.0-pro) tidak mendukung system_instruction, jadi masukkan ke contents
          if (modelName === 'gemini-pro' || modelName === 'gemini-1.0-pro') {
            const contentsWithSystem = [
              { role: 'user', parts: [{ text: `[System Instruction: ${systemPrompt}]\n\nUser: Halo` }] },
              { role: 'model', parts: [{ text: 'Mengerti, saya akan mengikuti instruksi sistem tersebut.' }] },
              ...geminiMessages
            ];
            currentPayload = {
              contents: contentsWithSystem,
              generationConfig: safePayload.generationConfig
            } as any;
          }

          const response = await fetch(`${endpoint.url}?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(currentPayload)
          });

          const data = await response.json();

          if (!response.ok) {
            const errMsg: string = data.error?.message || `HTTP ${response.status}`;
            const errCode: number = data.error?.code || response.status;
            const errStatus: string = data.error?.status || '';

            console.warn(`[Desi] ${modelName} error ${errCode} (${errStatus}): ${errMsg}`);

            // 401 = API key genuinely invalid → reset
            if (errCode === 401 || errMsg.includes('API_KEY_INVALID')) {
              resetApiKey();
              throw new Error('API Key tidak valid (401). Silakan buat API Key baru di aistudio.google.com/app/apikey');
            }

            // 403 = berbagai kemungkinan — jangan reset key dulu, berikan info spesifik
            if (errCode === 403) {
              if (errMsg.includes('has not been used') || errMsg.includes('is disabled') || errStatus === 'PERMISSION_DENIED') {
                // API belum diaktifkan di project ini
                throw new Error(
                  `Generative Language API belum diaktifkan di project Google Cloud Anda.\n\n` +
                  `Cara mengaktifkan:\n` +
                  `1. Buka: console.cloud.google.com/apis/api/generativelanguage.googleapis.com\n` +
                  `2. Klik "Enable API"\n` +
                  `3. Tunggu 1-2 menit lalu coba lagi\n\n` +
                  `Error: ${errMsg}`
                );
              }
              // 403 lain → coba endpoint berikutnya
              lastError = `[${modelName}] 403: ${errMsg}`;
              continue;
            }

            // Semua error lain (404, 429, 500, dll) → coba endpoint berikutnya
            lastError = `[${modelName}] ${errCode}: ${errMsg}`;
            continue;
          }

          reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, saya tidak mengerti maksud Anda.';
          usedModel = modelName;
          setActiveModel(modelName);
          break;
        } catch (modelErr: any) {
          // Jika error auth sudah di-throw dari dalam, re-throw langsung
          if (modelErr.message.includes('API Key') || modelErr.message.includes('kadaluarsa') || modelErr.message.includes('tidak memiliki akses') || modelErr.message.includes('belum diaktifkan')) {
            throw modelErr;
          }
          // Error jaringan / unexpected → coba endpoint berikutnya
          console.warn(`[Desi] Exception ${modelName}:`, modelErr.message);
          lastError = `[${modelName}] ${modelErr.message}`;
        }
      }

      if (!reply) {
        let availableModels = '';
        try {
          // Jika semua gagal, bantu user mengecek model apa yang sebenarnya diizinkan oleh API key ini
          const mRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          const mData = await mRes.json();
          if (mData.models && Array.isArray(mData.models)) {
            const names = mData.models.filter((m: any) => m.name.includes('gemini')).map((m: any) => m.name.replace('models/', '')).join(', ');
            availableModels = `\n\n📌 Model yang diizinkan untuk API Key ini:\n${names || 'Tidak ada model Gemini yang tersedia'}`;
          }
        } catch (e) {}
        
        throw new Error(`Semua model AI tidak tersedia.${availableModels}\n\nPastikan:\n1. API Key Google AI Studio valid (bukan Vertex AI)\n2. Billing aktif di akun Google Cloud\n3. API Key tidak dibatasi hanya untuk model tertentu\n\nError terakhir: ${lastError}`);
      }

      setMessages(prev => [...prev, { role: 'ai', content: reply }]);
      console.log(`[Desi] ✅ Berhasil menggunakan model: ${usedModel}`);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', content: `Maaf, terjadi kesalahan: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    'Berapa total penduduk desa ini?',
    'Profesi terbanyak warga desa?',
    'Bantu saya buat surat keterangan domisili',
    'Jelaskan fitur DiDesa secara singkat',
  ];

  return (
    <div className="max-w-4xl mx-auto pb-24 h-[calc(100vh-80px)] flex flex-col px-4 sm:px-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner text-white overflow-hidden shrink-0">
            {globalDesiLogo ? (
              <img src={globalDesiLogo} alt="Desi" className="w-full h-full object-cover" />
            ) : (
              <Bot size={24} />
            )}
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
            <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">
              Tanya informasi layanan, statistik, atau panduan secara instan.
              {apiKey && <span className="ml-2 text-indigo-400 text-[10px] font-mono bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded">{activeModel}</span>}
            </p>
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${msg.role === 'user' ? 'bg-gray-100 dark:bg-slate-800' : 'bg-indigo-100 text-indigo-600'}`}>
                    {msg.role === 'user' ? (
                      <User size={14} className="text-gray-600 dark:text-slate-400" />
                    ) : (
                      globalDesiLogo ? <img src={globalDesiLogo} alt="Desi" className="w-full h-full object-cover" /> : <Bot size={14} />
                    )}
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
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-indigo-100 text-indigo-600 overflow-hidden">
                    {globalDesiLogo ? <img src={globalDesiLogo} alt="Desi" className="w-full h-full object-cover" /> : <Bot size={14} />}
                  </div>
                  <div className="p-4 rounded-2xl text-sm font-medium bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-tl-sm border border-gray-100 dark:border-slate-800 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-indigo-500" />
                    <span className="text-gray-500">Desi sedang berpikir...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions — tampil hanya ketika percakapan masih awal */}
            {messages.length <= 1 && !isLoading && (
              <div className="px-6 pb-3 flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => { setInput(action); }}
                    className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors font-medium"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

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
