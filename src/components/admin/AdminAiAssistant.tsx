import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, User, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { fetchResidentsCached } from '../../utils/apiCache';
import { sendAiChat, fetchAiUsage, getActiveTenantId, AiUsage, AiChatMessage } from '../../utils/aiChat';
import { ENABLE_AI_FEATURES, AI_DEV_MESSAGE } from '../../utils/featureFlags';

export default function AdminAiAssistant() {
  const [messages, setMessages] = useState<AiChatMessage[]>([
    { role: 'ai', content: 'Halo! Saya Desi, Asisten Pintar DiDesa. Ada yang bisa saya bantu terkait informasi desa, statistik penduduk, atau administrasi hari ini?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState('sukamakmur');
  const [quotaInfo, setQuotaInfo] = useState<AiUsage | null>(null);
  const [globalDesiLogo, setGlobalDesiLogo] = useState(() => localStorage.getItem('global_desi_logo') || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshQuota = async (tId: string) => {
    try {
      const usage = await fetchAiUsage(tId);
      setQuotaInfo(usage);
    } catch (e) {
      // Kuota tidak dapat dimuat (mis. server offline) — abaikan
    }
  };

  useEffect(() => {
    const tId = getActiveTenantId();
    setTenantId(tId);
    refreshQuota(tId);

    const handleBrandingUpdate = () => {
      setGlobalDesiLogo(localStorage.getItem('global_desi_logo') || '');
    };
    const handleQuotaUpdate = () => {
      refreshQuota(tId);
    };
    window.addEventListener('global_branding_updated', handleBrandingUpdate);
    window.addEventListener('didesa_ai_usage_updated', handleQuotaUpdate);
    return () => {
      window.removeEventListener('global_branding_updated', handleBrandingUpdate);
      window.removeEventListener('didesa_ai_usage_updated', handleQuotaUpdate);
    };
  }, []);

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
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Bangun konteks penduduk real-time untuk system prompt
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

      const result = await sendAiChat(tenantId, newMessages, { systemPrompt });
      setQuotaInfo(result.usage);
      setMessages(prev => [...prev, { role: 'ai', content: result.reply }]);
      // Beri tahu komponen lain (mis. badge kuota) bahwa pemakaian berubah
      window.dispatchEvent(new Event('didesa_ai_usage_updated'));
    } catch (error: any) {
      console.error(error);
      const isQuota = error && error.name === 'QuotaExceededError';
      setMessages(prev => [...prev, {
        role: 'ai',
        content: isQuota
          ? `⚠️ **Kuota AI Harian Telah Habis**\n\n${error.message}`
          : `Maaf, terjadi kesalahan: ${error?.message || 'Terjadi kesalahan tak terduga.'}`
      }]);
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

  const quotaLabel = quotaInfo
    ? `${quotaInfo.usedQuota}/${quotaInfo.totalQuota}`
    : '...';

  if (!ENABLE_AI_FEATURES) {
    return (
      <div className="max-w-4xl mx-auto pb-24 h-[calc(100vh-80px)] flex flex-col px-4 sm:px-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner text-white overflow-hidden shrink-0">
            {globalDesiLogo ? <img src={globalDesiLogo} alt="Desi" className="w-full h-full object-cover" /> : <Bot size={24} />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Desi (Asisten AI DiDesa)
              <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 uppercase tracking-wider">
                [DEV]
              </span>
            </h2>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-10">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-500 mb-4">
            <Sparkles size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Fitur Dalam Pengembangan [DEV]</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md">{AI_DEV_MESSAGE}</p>
        </div>
      </div>
    );
  }

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
            <p className="text-gray-500 dark:text-slate-400 text-sm font-medium flex items-center gap-2">
              Tanya informasi layanan, statistik, atau panduan secara instan.
              {quotaInfo && !quotaInfo.hasQuota && (
                <span className="text-xs font-semibold bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                  <AlertTriangle size={12} /> Kuota Habis
                </span>
              )}
            </p>
          </div>
        </div>
        {quotaInfo && (
          <span className={`hidden sm:flex text-xs font-semibold px-3 py-1.5 rounded-lg border ${
            quotaInfo.hasQuota
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
              : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}>
            Kuota Harian: {quotaLabel} Chat
          </span>
        )}
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col relative">
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
      </div>
    </div>
  );
}