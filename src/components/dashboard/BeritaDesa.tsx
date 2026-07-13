import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, User, ArrowRight, X, Heart, MessageSquare, Share2, Send } from 'lucide-react';
import { showToast } from '../../utils/toast';
import { getRelativeDateString } from '../../utils/dateHelper';

interface NewsComment {
  id: string;
  name: string;
  text: string;
  date: string;
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
}

const INITIAL_NEWS: NewsItem[] = [
  {
    id: 'n-1',
    image: 'https://images.unsplash.com/photo-1541888081156-fce1fa5427d6?auto=format&fit=crop&q=80&w=800',
    tag: 'KEGIATAN DESA',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    title: 'Pembangunan Jembatan Tani di RW 03 Telah Selesai',
    excerpt: 'Infrastruktur baru ini diharapkan dapat mempermudah akses pengangkutan hasil panen warga...',
    fullContent: `Pembangunan Jembatan Usaha Tani di wilayah RW 03 Desa Wasah Hilir akhirnya rampung 100% dan telah diresmikan secara simbolis oleh Kepala Desa beserta tokoh masyarakat setempat pada hari Senin kemarin.\n\nProyek yang dibiayai dari alokasi Dana Desa (DD) Tahun Anggaran 2023 ini memakan waktu pengerjaan sekitar 45 hari kalender dengan melibatkan tenaga kerja lokal melalui sistem Padat Karya Tunai Desa (PKTD).\n\nJembatan baru dengan konstruksi beton bertulang ini memiliki bentang panjang 6 meter dan lebar 2.5 meter. Infrastruktur krusial ini dibangun khusus untuk menghubungkan jalan desa utama dengan lebih dari 80 hektar lahan persawahan produktif yang selama ini sulit diakses oleh armada pengangkut roda empat.\n\nDengan selesainya pembangunan jembatan tani ini, para petani tidak perlu lagi memikul hasil panen ratusan meter ke jalan besar. Kendaraan pengangkut kini bisa masuk langsung ke bibir persawahan, sehingga memotong ongkos transportasi hasil bumi hingga 40%.`,
    date: '24 Okt 2023',
    author: 'Syarifuddin (Kasi Pembangunan)',
    likes: 42,
    comments: [
      { id: 'c1', name: 'Ahmad Bukhori', text: 'Alhamdulillah, jembatannya sangat kokoh dan membantu sekali untuk mengangkut padi saat panen!', date: '25 Okt 2023' },
      { id: 'c2', name: 'Deddy Setiawan', text: 'Luar biasa Pemdes Wasah Hilir. Pembangunan merata dan transparan.', date: '25 Okt 2023' }
    ]
  },
  {
    id: 'n-2',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
    tag: 'PENGUMUMAN',
    tagColor: 'bg-amber-50 text-amber-700 border-amber-100',
    title: 'Jadwal Vaksinasi Booster ke-2 di Balai Desa',
    excerpt: 'Pemerintah desa memfasilitasi pelayanan kesehatan gratis untuk seluruh warga pada Sabtu mendatang.',
    fullContent: `Dalam rangka meningkatkan imunitas warga dan menyukseskan program jaminan kesehatan nasional, Pemerintah Desa bekerja sama dengan Puskesmas Kecamatan Simpur akan mengadakan Pelayanan Vaksinasi Covid-19 Dosis Booster ke-2 (Vaksinasi ke-4).\n\nKegiatan ini akan dipusatkan di Aula Balai Desa Wasah Hilir pada:\n- Hari/Tanggal: Sabtu, 28 Oktober 2023\n- Waktu: 08.00 s/d 12.00 WIB\n- Jenis Vaksin: Pfizer / Astrazeneca (menyesuaikan ketersediaan stok Puskesmas)\n\nPersyaratan Peserta:\n1. Membawa fotokopi KTP / Kartu Keluarga (KK)\n2. Berusia minimal 18 tahun ke atas\n3. Telah mendapatkan vaksinasi Booster ke-1 minimal 6 bulan sebelumnya\n4. Menunjukkan e-ticket vaksinasi di aplikasi SatuSehat\n\nPelayanan ini terbuka gratis bagi seluruh penduduk Desa Wasah Hilir maupun warga sekitar yang berdomisili di sini. Mari bersama kita pelihara lingkungan desa yang sehat dan bebas penyakit!`,
    date: '22 Okt 2023',
    author: 'Siti Aminah (Kader Poskesdes)',
    likes: 18,
    comments: []
  },
  {
    id: 'n-3',
    image: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&q=80&w=800',
    tag: 'PEMBANGUNAN',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-100',
    title: 'Pelatihan Pengolahan Kompos Organik Kelompok Tani',
    excerpt: 'Langkah strategis desa menuju kemandirian pupuk organik guna menjaga kesuburan sawah.',
    fullContent: `Untuk mengurangi ketergantungan para petani terhadap pupuk kimia yang harganya kian melambung tinggi, Dinas Pertanian Daerah bersama Gabungan Kelompok Tani (Gapoktan) Wasah Hilir menyelenggarakan pelatihan pembuatan dan pemanfaatan pupuk kompos organik mandiri.\n\nPelatihan ini diselenggarakan selama dua hari berturut-turut dengan materi teori di kelas serta praktik langsung pembuatan pupuk di lapangan.\n\nBahan baku pembuatan kompos memanfaatkan potensi lokal yang melimpah ruah dan belum terkelola optimal, antara lain kotoran hewan ternak sapi/kambing, jerami sisa panen, serta dedaunan hijau dicampur dengan mikroorganisme pengurai EM4.\n\nKepala Desa mengharapkan melalui pelatihan ini, para petani Wasah Hilir tidak lagi mengalami kepanikan saat pupuk subsidi langka, sekaligus secara bertahap memperbaiki ekosistem mikroba tanah pertanian agar tetap subur untuk generasi mendatang.`,
    date: '19 Okt 2023',
    author: 'Drs. Suprayitno (Penyuluh Pertanian)',
    likes: 31,
    comments: [
      { id: 'c3', name: 'Hendra Saputra', text: 'Sangat bagus pelatihannya, langsung dipraktikkan di kandang kelompok tani RT 05.', date: '20 Okt 2023' }
    ]
  },
  {
    id: 'n-4',
    image: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&q=80&w=800',
    tag: 'SOSIAL & BANTUAN',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-100',
    title: 'Penyaluran BLT Dana Desa Tahap IV Selesai Tersalurkan',
    excerpt: 'Sebanyak 75 Keluarga Penerima Manfaat (KPM) telah menerima bantuan langsung secara tertib.',
    fullContent: `Pemerintah Desa Wasah Hilir kembali menyalurkan Bantuan Langsung Tunai Dana Desa (BLT-DD) Tahap IV (alokasi bulan Oktober, November, Desember) tahun anggaran 2023. Penyaluran dilaksanakan secara tertib di Aula Kantor Desa.\n\nBantuan diserahkan langsung kepada 75 Keluarga Penerima Manfaat (KPM) yang telah divalidasi melalui forum Musyawarah Desa Khusus (Musdesus). Kriteria penerima manfaat diprioritaskan untuk warga lansia tunggal, penyandang disabilitas, penderita sakit menahun, serta keluarga prasejahtera ekstrem.\n\nMasing-masing KPM menerima bantuan tunai sebesar Rp 300.000 per bulan, sehingga total yang diterima secara rapel pada tahap ini adalah sebesar Rp 900.000.\n\n"Kami berharap bantuan stimulan ini dimanfaatkan sebaik mungkin untuk kebutuhan pokok keluarga, seperti membeli beras, minyak, telur, atau obat-obatan bagi yang lansia, bukan untuk keperluan konsumtif lainnya," pesan Kepala Desa saat memberikan pengantar sambutan.`,
    date: '15 Okt 2023',
    author: 'Aris Munandar (Kaur Keuangan)',
    likes: 55,
    comments: []
  }
];

export default function BeritaDesa() {
  const [news, setNews] = useState<NewsItem[]>(() => {
    const saved = localStorage.getItem('didesa_news_list');
    return saved ? JSON.parse(saved) : INITIAL_NEWS;
  });

  const [desaName, setDesaName] = useState(() => localStorage.getItem('kop_desa') || 'Desa Wasah Hilir');

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Wasah Hilir');
    };
    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('village_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  // Comments & Likes State
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    localStorage.setItem('didesa_news_list', JSON.stringify(news));
  }, [news]);

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
        res = res.replace(/Desa Wasah Hilir/g, desaName);
        res = res.replace(/Wasah Hilir/g, desaName.replace(/desa|kelurahan/gi, '').trim());
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

  const filteredNews = processedNews.filter(item => {
    const matchesCategory = activeCategory === 'Semua' || item.tag === activeCategory;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.fullContent.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNews(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, likes: item.likes + 1 };
      }
      return item;
    }));
    showToast('Menyukai berita ini!', 'success');
  };

  const handleModalLike = (id: string) => {
    setNews(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, likes: item.likes + 1 };
        setSelectedNews(updated);
        return updated;
      }
      return item;
    }));
    showToast('Menyukai berita ini!', 'success');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Kabar {desaName}</h2>
          <p className="text-sm text-gray-500 mt-1">Dapatkan informasi terkini seputar pengumuman, program kerja, dan agenda kemasyarakatan.</p>
        </div>
        <div className="relative w-full md:w-80">
          <input 
            type="text" 
            placeholder="Cari kabar atau informasi..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-white"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Categories Horizontal Scroll */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-gray-100">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
              activeCategory === cat
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of News */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNews.length > 0 ? (
          filteredNews.map(item => (
            <div 
              key={item.id}
              onClick={() => {
                setSelectedNews(item);
                // Pre-populate user name if logged in
                const auth = localStorage.getItem('didesa_auth_user');
                if (auth) {
                  setCommentName(JSON.parse(auth).name);
                }
              }}
              className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:translate-y-[-4px] transition-all duration-300 group cursor-pointer flex flex-col h-full"
            >
              <div className="h-48 bg-cover bg-center overflow-hidden relative">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className={`absolute top-4 left-4 inline-block px-2.5 py-1 text-[9px] font-bold rounded-lg tracking-wider border shadow-sm ${item.tagColor}`}>
                  {item.tag}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 text-[11px] text-gray-400 font-bold mb-2">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {item.date}</span>
                    <span className="flex items-center gap-1 truncate max-w-[120px]"><User className="w-3.5 h-3.5" /> {item.author.split(' ')[0]}</span>
                  </div>
                  <h4 className="text-base font-bold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-4">
                    {item.excerpt}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-auto">
                  <div className="flex items-center gap-3 text-xs text-gray-400 font-semibold">
                    <button 
                      onClick={(e) => handleLike(item.id, e)}
                      className="flex items-center gap-1 hover:text-rose-600 transition-colors group/btn"
                    >
                      <Heart className="w-4 h-4 group-hover/btn:fill-rose-600 group-hover/btn:text-rose-600 transition-colors" />
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
          ))
        ) : (
          <div className="col-span-full py-16 text-center bg-white border border-gray-100 rounded-3xl">
            <p className="text-sm text-gray-400 font-bold">Tidak ada kabar atau pengumuman yang sesuai kata kunci.</p>
          </div>
        )}
      </div>

      {/* Article Detail Modal */}
      {activeSelectedNews && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <span className={`inline-block px-2.5 py-1 text-[9px] font-extrabold rounded-lg tracking-wider border mb-1 ${activeSelectedNews.tagColor}`}>
                  {activeSelectedNews.tag}
                </span>
                <p className="text-xs text-gray-400 font-bold">Kabar {desaName} &bull; Ditulis oleh {activeSelectedNews.author}</p>
              </div>
              <button 
                onClick={() => setSelectedNews(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {/* Cover Image */}
              <div className="h-64 md:h-80 w-full rounded-2xl overflow-hidden shadow-inner bg-gray-50">
                <img src={activeSelectedNews.image} alt={activeSelectedNews.title} className="w-full h-full object-cover" />
              </div>

              {/* Text Context */}
              <div className="space-y-4">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                  {activeSelectedNews.title}
                </h3>
                <div className="flex items-center gap-4 text-xs text-gray-400 font-bold border-b border-gray-50 pb-4">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-emerald-700" /> Diterbitkan: {activeSelectedNews.date}</span>
                  <span className="flex items-center gap-1"><User className="w-4 h-4 text-emerald-700" /> Penulis: {activeSelectedNews.author}</span>
                </div>
                
                {/* News Article Paragraphs */}
                <div className="text-gray-700 leading-relaxed text-sm space-y-4 text-justify whitespace-pre-wrap font-medium">
                  {activeSelectedNews.fullContent}
                </div>
              </div>

              {/* Likes & Sharing footer */}
              <div className="flex items-center justify-between border-t border-b border-gray-50 py-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleModalLike(activeSelectedNews.id)}
                    className="flex items-center gap-2 bg-rose-50 text-rose-700 hover:bg-rose-100 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    <Heart className="w-4 h-4 fill-rose-600 text-rose-600" />
                    <span>Sukai Berita ({activeSelectedNews.likes})</span>
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      showToast('Tautan berita disalin ke papan klip!', 'success');
                    }}
                    className="flex items-center gap-2 bg-gray-50 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Bagikan</span>
                  </button>
                </div>
                <span className="text-xs text-gray-400 font-bold">{activeSelectedNews.comments.length} Komentar Warga</span>
              </div>

              {/* Comment Section */}
              <div className="space-y-6">
                <h4 className="text-base font-bold text-gray-900">Aspirasi & Tanggapan Warga ({activeSelectedNews.comments.length})</h4>
                
                {/* Comments Stream */}
                <div className="space-y-4">
                  {activeSelectedNews.comments.length > 0 ? (
                    activeSelectedNews.comments.map(c => (
                      <div key={c.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50 space-y-1 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-gray-900">{c.name}</span>
                          <span className="text-[10px] text-gray-400 font-bold">{c.date}</span>
                        </div>
                        <p className="text-gray-600 font-medium">{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 font-bold italic">Belum ada tanggapan untuk kabar ini. Jadilah yang pertama memberikan aspirasi!</p>
                  )}
                </div>

                {/* Comment Form */}
                <form onSubmit={handleSubmitComment} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kirim Aspirasi / Komentar Publik</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input 
                      type="text"
                      placeholder="Nama Lengkap / Inisial..."
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      required
                      className="sm:col-span-1 px-3.5 py-2 border border-gray-200 rounded-xl text-xs outline-none bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="sm:col-span-2 relative">
                      <input 
                        type="text"
                        placeholder="Tulis tanggapan Anda mengenai kabar ini..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        required
                        className="w-full pl-3.5 pr-12 py-2 border border-gray-200 rounded-xl text-xs outline-none bg-white focus:ring-2 focus:ring-emerald-500"
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

    </div>
  );
}
