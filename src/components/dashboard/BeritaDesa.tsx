import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, Calendar, User, ArrowRight, X, Heart, MessageSquare, Share2, Send, Image as ImageIcon, Trash2 } from 'lucide-react';
import { showToast } from '../../utils/toast';
import { getRelativeDateString } from '../../utils/dateHelper';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';

interface NewsComment {
  id: string;
  name: string;
  text: string;
  date: string;
}

interface ProgressPhoto {
  id: string;
  stage: string;
  title: string;
  imageUrl: string;
}

interface NewsItem {
  id: string;
  image: string;
  tag: string;
  tagColor: string;
  title: string;
  excerpt: string;
  fullContent: string;
  date: string;
  author: string;
  likes: number;
  comments: NewsComment[];
  progressPhotos?: ProgressPhoto[];
}

const sanitizeNewsList = (rawList: NewsItem[]): NewsItem[] => {
  return rawList.map(item => {
    const isLikedByUser = localStorage.getItem(`didesa_liked_${item.id}`) === 'true';
    const isLegacyDummy = item.likes === 35 || item.likes === 42 || item.likes === 18 || item.likes === 55 || item.likes === 31;
    return {
      ...item,
      likes: isLegacyDummy ? (isLikedByUser ? 1 : 0) : item.likes
    };
  });
};

export default function BeritaDesa() {
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [news, setNews] = useState<NewsItem[]>(() => {
    const saved = localStorage.getItem('didesa_news_list');
    const parsed = saved ? JSON.parse(saved) : [];
    return sanitizeNewsList(parsed);
  });

  const [desaName, setDesaName] = useState(() => localStorage.getItem('kop_desa') || 'Desa Ketupat');

  // Fetch news from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    const fetchNews = async () => {
      const tid = await resolveCurrentTenant();
      if (!isMounted) return;
      setTenantId(tid);
      if (!tid) {
        console.warn('[BeritaDesa] Tenant ID tidak ditemukan. Menggunakan berita default.');
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('saas_settings')
          .select('key,value')
          .eq('tenant_id', tid)
          .eq('key', 'didesa_news_list')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('[BeritaDesa] Gagal memuat berita dari server:', error.message);
          if (isMounted) setLoading(false);
          return;
        }

        if (data && data.value && isMounted) {
          const parsed = JSON.parse(data.value);
          const sanitized = sanitizeNewsList(parsed);
          setNews(sanitized);
          localStorage.setItem('didesa_news_list', JSON.stringify(sanitized));
        }
      } catch (err: any) {
        console.error('[BeritaDesa] Error fetching news:', err?.message || err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchNews();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Ketupat');
    };
    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('village_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; stage?: string } | null>(null);

  // Comments & Likes State
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');

  // Sync real-time (and save to Supabase when user likes or comments)
  useEffect(() => {
    const sanitized = sanitizeNewsList(news);
    const serialized = JSON.stringify(sanitized);
    const savedLocal = localStorage.getItem('didesa_news_list');

    if (savedLocal === serialized) return; // hindari loop

    localStorage.setItem('didesa_news_list', serialized);
    window.dispatchEvent(new Event('didesa_news_updated'));

    if (tenantId) {
      supabase.from('saas_settings').upsert({
        tenant_id: tenantId,
        key: 'didesa_news_list',
        value: serialized
      }, { onConflict: 'tenant_id,key' }).then(({ error }) => {
        if (error) console.error('Gagal menyimpan berita ke server:', error);
      });
    }
  }, [news, tenantId]);

  // Sync when Admin updates news
  useEffect(() => {
    const handleNewsUpdate = () => {
      const saved = localStorage.getItem('didesa_news_list');
      if (saved) {
        setNews(JSON.parse(saved));
      }
    };
    window.addEventListener('didesa_news_updated', handleNewsUpdate);
    window.addEventListener('storage', handleNewsUpdate);
    return () => {
      window.removeEventListener('didesa_news_updated', handleNewsUpdate);
      window.removeEventListener('storage', handleNewsUpdate);
    };
  }, []);

  const processedNews = useMemo(() => {
    return news.map(item => {
      let dateStr = item.date;
      let comments = item.comments;
      
      if (item.id === 'n-1') {
        dateStr = getRelativeDateString(1);
        comments = item.comments.map(c => {
          if (c.id === 'c1' || c.id === 'c2') {
            return { ...c, date: getRelativeDateString(0) };
          }
          return c;
        });
      } else if (item.id === 'n-2') {
        dateStr = getRelativeDateString(3);
      } else if (item.id === 'n-3') {
        dateStr = getRelativeDateString(6);
        comments = item.comments.map(c => {
          if (c.id === 'c3') {
            return { ...c, date: getRelativeDateString(5) };
          }
          return c;
        });
      } else if (item.id === 'n-4') {
        dateStr = getRelativeDateString(10);
      } else {
        // user-added news: replace 2023 with current year if any
        dateStr = item.date.replace(/2023/g, new Date().getFullYear().toString());
      }

      const replaceText = (text: string) => {
        if (!text) return text;
        let res = text;
        res = res.replace(/Desa Ketupat/g, desaName);
        res = res.replace(/Ketupat/g, desaName.replace(/desa|kelurahan/gi, '').trim());
        res = res.replace(/2023/g, new Date().getFullYear().toString());
        return res;
      };

      return {
        ...item,
        title: replaceText(item.title),
        excerpt: replaceText(item.excerpt),
        fullContent: replaceText(item.fullContent),
        date: dateStr,
        comments: comments.map(c => ({
          ...c,
          text: replaceText(c.text),
          date: c.date.includes('2023') ? c.date.replace(/2023/g, new Date().getFullYear().toString()) : c.date
        }))
      };
    });
  }, [news, desaName]);

  const activeSelectedNews = useMemo(() => {
    if (!selectedNews) return null;
    return processedNews.find(item => item.id === selectedNews.id) || null;
  }, [selectedNews, processedNews]);

  const categories = ['Semua', 'KEGIATAN DESA', 'PENGUMUMAN', 'PEMBANGUNAN', 'SOSIAL & BANTUAN'];

  const filteredNews = useMemo(() => processedNews.filter(item => {
    const matchesCategory = activeCategory === 'Semua' || item.tag === activeCategory;
    const matchesSearch = 
      (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.fullContent || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }), [processedNews, activeCategory, searchQuery]);

  const toggleLike = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isLiked = localStorage.getItem(`didesa_liked_${id}`) === 'true';
    if (isLiked) {
      localStorage.removeItem(`didesa_liked_${id}`);
      setNews(prev => prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, likes: Math.max(0, item.likes - 1) };
          if (selectedNews?.id === id) setSelectedNews(updated);
          return updated;
        }
        return item;
      }));
      showToast('Batal memberikan apresiasi', 'info');
    } else {
      localStorage.setItem(`didesa_liked_${id}`, 'true');
      setNews(prev => prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, likes: item.likes + 1 };
          if (selectedNews?.id === id) setSelectedNews(updated);
          return updated;
        }
        return item;
      }));
      showToast('Memberikan apresiasi untuk kegiatan ini!', 'success');
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentText.trim() || !selectedNews) {
      showToast('Harap isi nama dan komentar Anda', 'error');
      return;
    }

    const newComment: NewsComment = {
      id: `c-${Date.now()}`,
      name: commentName.trim(),
      text: commentText.trim(),
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    setNews(prev => prev.map(item => {
      if (item.id === selectedNews.id) {
        const updated = {
          ...item,
          comments: [...item.comments, newComment]
        };
        setSelectedNews(updated);
        return updated;
      }
      return item;
    }));

    setCommentText('');
    showToast('Komentar berhasil dikirim!', 'success');
  };

  // Auto-open selected news modal if navigated from Portal Dashboard
  useEffect(() => {
    const selectedId = localStorage.getItem('didesa_selected_news_id');
    if (selectedId && processedNews.length > 0) {
      const found = processedNews.find(n => n.id === selectedId);
      if (found) {
        setSelectedNews(found);
      }
      localStorage.removeItem('didesa_selected_news_id');
    }
  }, [processedNews]);

  const handleDeleteComment = (newsId: string, commentId: string) => {
    setNews(prev => prev.map(item => {
      if (item.id === newsId) {
        const updated = {
          ...item,
          comments: item.comments.filter(c => c.id !== commentId)
        };
        if (selectedNews?.id === newsId) {
          setSelectedNews(updated);
        }
        return updated;
      }
      return item;
    }));
    showToast('Komentar berhasil dihapus', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Kabar {desaName}</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Dapatkan informasi terkini seputar pengumuman, program kerja, dan agenda kemasyarakatan.</p>
        </div>
        <div className="relative w-full md:w-80">
          <input 
            type="text" 
            placeholder="Cari kabar atau informasi..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-white dark:bg-slate-900"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Categories Horizontal Scroll */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-gray-100 dark:border-slate-800">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
              activeCategory === cat
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm dark:shadow-none'
                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of News */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 animate-pulse">
              <div className="h-48 bg-slate-200 dark:bg-slate-700" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              </div>
            </div>
          ))
        ) : filteredNews.length > 0 ? (
          filteredNews.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div 
                onClick={() => {
                  setSelectedNews(item);
                  const auth = localStorage.getItem('didesa_auth_user');
                  if (auth) {
                    setCommentName(JSON.parse(auth).name);
                  }
                }}
                className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none hover:shadow-md hover:translate-y-[-4px] transition-all duration-300 group cursor-pointer flex flex-col h-full"
              >
              <div className="h-48 bg-cover bg-center overflow-hidden relative">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className={`absolute top-4 left-4 inline-block px-2.5 py-1 text-[9px] font-bold rounded-lg tracking-wider border shadow-sm dark:shadow-none ${item.tagColor}`}>
                  {item.tag}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 text-[11px] text-gray-400 font-bold mb-2">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {item.date}</span>
                    <span className="flex items-center gap-1 truncate max-w-[120px]"><User className="w-3.5 h-3.5" /> {item.author.split(' ')[0]}</span>
                  </div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4">
                    {item.excerpt}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-auto">
                  <div className="flex items-center gap-3 text-xs text-gray-400 font-semibold">
                    <button 
                      onClick={(e) => toggleLike(item.id, e)}
                      className={`flex items-center gap-1 transition-colors group/btn ${localStorage.getItem(`didesa_liked_${item.id}`) === 'true' ? 'text-rose-600 font-bold' : 'hover:text-rose-600'}`}
                    >
                      <Heart className={`w-4 h-4 ${localStorage.getItem(`didesa_liked_${item.id}`) === 'true' ? 'fill-rose-600 text-rose-600' : 'group-hover/btn:fill-rose-600 group-hover/btn:text-rose-600'}`} />
                      <span>{item.likes}</span>
                    </button>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{item.comments.length}</span>
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Selengkapnya <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl">
            <p className="text-sm text-gray-400 font-bold">Tidak ada kabar atau pengumuman yang sesuai kata kunci.</p>
          </div>
        )}
      </div>

      {/* Article Detail Modal */}
      {activeSelectedNews && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div>
                <span className={`inline-block px-2.5 py-1 text-[9px] font-extrabold rounded-lg tracking-wider border mb-1 ${activeSelectedNews.tagColor}`}>
                  {activeSelectedNews.tag}
                </span>
                <p className="text-xs text-gray-400 font-bold">Kabar {desaName} &bull; Ditulis oleh {activeSelectedNews.author}</p>
              </div>
              <button 
                onClick={() => setSelectedNews(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {/* Cover Image */}
              <div className="h-64 md:h-80 w-full rounded-2xl overflow-hidden shadow-inner bg-gray-50 dark:bg-slate-800">
                <img src={activeSelectedNews.image} alt={activeSelectedNews.title} className="w-full h-full object-cover" />
              </div>

              {/* Text Context */}
              <div className="space-y-4">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  {activeSelectedNews.title}
                </h3>
                <div className="flex items-center gap-4 text-xs text-gray-400 font-bold border-b border-gray-50 pb-4">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-emerald-700" /> Diterbitkan: {activeSelectedNews.date}</span>
                  <span className="flex items-center gap-1"><User className="w-4 h-4 text-emerald-700" /> Penulis: {activeSelectedNews.author}</span>
                </div>
                
                {/* News Article Paragraphs */}
                <div className="text-gray-700 dark:text-slate-300 leading-relaxed text-sm space-y-4 text-justify whitespace-pre-wrap font-medium">
                  {activeSelectedNews.fullContent}
                </div>

                {/* Multi-Photo Progress Gallery (Dana Desa / Laporan Pendamping) */}
                {activeSelectedNews.progressPhotos && activeSelectedNews.progressPhotos.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-emerald-600" />
                        Dokumentasi Progress Tahapan Dana Desa
                      </h4>
                      <span className="text-xs text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900">
                        {activeSelectedNews.progressPhotos.length} Foto Dokumentasi
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeSelectedNews.progressPhotos.map((photo, idx) => (
                        <div
                          key={photo.id || idx}
                          onClick={() => setLightboxImage({ url: photo.imageUrl, title: photo.title, stage: photo.stage })}
                          className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col"
                        >
                          <div className="h-40 bg-gray-100 dark:bg-slate-800 overflow-hidden relative">
                            <img
                              src={photo.imageUrl}
                              alt={photo.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                              <span className="text-white text-xs font-semibold flex items-center gap-1">
                                Klik untuk memperbesar
                              </span>
                            </div>
                            <span className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-md tracking-wider">
                              TAHAP {photo.stage}
                            </span>
                          </div>
                          <div className="p-3 bg-white dark:bg-slate-900">
                            <p className="text-xs font-bold text-gray-800 dark:text-slate-200 line-clamp-2">
                              {photo.title || `Dokumentasi Tahap ${photo.stage}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Likes & Sharing footer */}
              <div className="flex items-center justify-between border-t border-b border-gray-50 py-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleLike(activeSelectedNews.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      localStorage.getItem(`didesa_liked_${activeSelectedNews.id}`) === 'true' 
                        ? 'bg-rose-100 text-rose-800 border border-rose-200 shadow-sm' 
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${localStorage.getItem(`didesa_liked_${activeSelectedNews.id}`) === 'true' ? 'fill-rose-600 text-rose-600' : 'fill-rose-600 text-rose-600'}`} />
                    <span>{localStorage.getItem(`didesa_liked_${activeSelectedNews.id}`) === 'true' ? 'Diapresiasi' : 'Apresiasi Warga'} ({activeSelectedNews.likes})</span>
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      showToast('Tautan berita disalin ke papan klip!', 'success');
                    }}
                    className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Bagikan</span>
                  </button>
                </div>
                <span className="text-xs text-gray-400 font-bold">{activeSelectedNews.comments.length} Komentar Warga</span>
              </div>

              {/* Comment Section */}
              <div className="space-y-6">
                <h4 className="text-base font-bold text-gray-900 dark:text-white">Aspirasi & Tanggapan Warga ({activeSelectedNews.comments.length})</h4>
                
                {/* Comments Stream */}
                <div className="space-y-4">
                  {activeSelectedNews.comments.length > 0 ? (
                    activeSelectedNews.comments.map(c => (
                      <div key={c.id} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100/50 space-y-1 text-sm group relative">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-gray-900 dark:text-white">{c.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-bold">{c.date}</span>
                            <button
                              onClick={() => handleDeleteComment(activeSelectedNews.id, c.id)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                              title="Hapus Komentar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-600 dark:text-slate-400 font-medium">{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 font-bold italic">Belum ada tanggapan untuk kabar ini. Jadilah yang pertama memberikan aspirasi!</p>
                  )}
                </div>

                {/* Comment Form */}
                <form onSubmit={handleSubmitComment} className="bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-3">
                  <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Kirim Aspirasi / Komentar Publik</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input 
                      type="text"
                      placeholder="Nama Lengkap / Inisial..."
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      required
                      className="sm:col-span-1 px-3.5 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs outline-none bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="sm:col-span-2 relative">
                      <input 
                        type="text"
                        placeholder="Tulis tanggapan Anda mengenai kabar ini..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        required
                        className="w-full pl-3.5 pr-12 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs outline-none bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                      <button 
                        type="submit"
                        className="p-1.5 bg-emerald-700 text-white rounded-lg absolute right-2 top-1/2 -translate-y-1/2 hover:bg-emerald-800 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={() => setLightboxImage(null)}>
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="p-4 bg-slate-900/90 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                {lightboxImage.stage && (
                  <span className="bg-emerald-600 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-md">
                    TAHAP {lightboxImage.stage}
                  </span>
                )}
                <span className="text-sm font-bold text-white line-clamp-1">{lightboxImage.title}</span>
              </div>
              <button onClick={() => setLightboxImage(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center max-h-[75vh]">
              <img src={lightboxImage.url} alt={lightboxImage.title} className="max-h-[70vh] w-auto object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
