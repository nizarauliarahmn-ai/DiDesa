import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { getRelativeDateString } from '../../utils/dateHelper';

export default function NewsSection({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const [news, setNews] = useState<any[]>([]);

  useEffect(() => {
    const loadNews = () => {
      const saved = localStorage.getItem('didesa_news_list');
      if (saved) {
        setNews(JSON.parse(saved).slice(0, 2)); // Ambil 2 terbaru
      } else {
        // Fallback default
        setNews([
          {
            id: 'n-1',
            image: 'https://images.unsplash.com/photo-1541888081156-fce1fa5427d6?auto=format&fit=crop&q=80&w=800',
            tag: 'KEGIATAN DESA',
            tagColor: 'bg-emerald-50 text-emerald-700',
            title: 'Pembangunan Jembatan Tani di RW 03 Telah Selesai',
            excerpt: 'Infrastruktur baru ini diharapkan dapat mempermudah akses pengangkutan hasil panen warga...',
            date: getRelativeDateString(1)
          },
          {
            id: 'n-2',
            image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
            tag: 'PENGUMUMAN',
            tagColor: 'bg-amber-50 text-amber-700',
            title: 'Jadwal Vaksinasi Booster ke-2 di Balai Desa',
            excerpt: 'Pemerintah desa memfasilitasi pelayanan kesehatan gratis untuk seluruh warga pada Sabtu mendatang.',
            date: getRelativeDateString(3)
          }
        ]);
      }
    };

    loadNews();
    window.addEventListener('storage', loadNews);
    return () => window.removeEventListener('storage', loadNews);
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between mb-6 px-1">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Berita & Pengumuman</h3>
        <button onClick={() => onTabChange && onTabChange('berita')} className="text-emerald-700 text-sm font-bold hover:text-emerald-800 flex items-center gap-1 group cursor-pointer">
          Lihat Semua <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {news.map((item, idx) => (
          <NewsCard 
            key={item.id || idx}
            image={item.image}
            tag={item.tag}
            tagColor={item.tagColor || 'bg-emerald-50 text-emerald-700'}
            title={item.title}
            excerpt={item.excerpt}
          />
        ))}
      </div>
    </section>
  );
}

function NewsCard({ image, tag, tagColor, title, excerpt }: { image: string, tag: string, tagColor: string, title: string, excerpt: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 hover:shadow-md transition-all group cursor-pointer flex flex-col h-full">
      <div className="h-48 bg-cover bg-center overflow-hidden" >
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <span className={`inline-block px-3 py-1.5 text-[10px] font-bold rounded-lg mb-4 w-fit tracking-wider uppercase ${tagColor}`}>
          {tag}
        </span>
        <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
          {title}
        </h5>
        <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {excerpt}
        </p>
      </div>
    </div>
  );
}
