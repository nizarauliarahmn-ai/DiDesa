import React, { useState } from 'react';
import { Bot, Sparkles, Send, User, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { sendAiChat, getActiveTenantId, AiChatMessage } from '../../utils/aiChat';
import { ENABLE_AI_FEATURES, AI_DEV_MESSAGE } from '../../utils/featureFlags';

export default function AiAssistant() {
  const [messages, setMessages] = useState<AiChatMessage[]>([
    { role: 'ai', content: 'Halo! Saya Asisten Pintar DiDesa. Ada yang bisa saya bantu terkait informasi desa, layanan, atau kependudukan hari ini?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = `Kamu adalah Asisten Pintar "DiDesa", asisten digital portal desa Indonesia.
Tugasmu membantu warga dan pengunjung portal desa: menjelaskan layanan desa, prosedur pembuatan surat, informasi umum kependudukan, serta panduan menggunakan fitur portal.
Selalu gunakan bahasa Indonesia yang sopan, ramah, dan mudah dipahami.
Jika tidak tahu jawabannya, katakan dengan jujur dan sarankan menghubungi kantor desa. Jangan mengarang data.
Format jawaban: ringkas, gunakan poin bila perlu.`;

      const result = await sendAiChat(getActiveTenantId(), newMessages, { systemPrompt });
      setMessages(prev => [...prev, { role: 'ai', content: result.reply }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: error && error.name === 'QuotaExceededError'
          ? `⚠️ **Kuota AI Harian Telah Habis**\n\n${error.message}`
          : `Maaf, terjadi kesalahan: ${error?.message || 'Terjadi kesalahan tak terduga.'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!ENABLE_AI_FEATURES) {
    return (
      <div className="max-w-4xl mx-auto pb-24 h-[calc(100vh-80px)] flex flex-col px-4 sm:px-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner text-white">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Asisten AI DiDesa
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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner text-white">
          <Bot size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Asisten AI DiDesa
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-200 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={10} /> Unggulan
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
                {msg.content}
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
                <span className="text-gray-500">Sedang memikirkan jawaban...</span>
              </div>
            </motion.div>
          )}
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-800">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanyakan sesuatu..."
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