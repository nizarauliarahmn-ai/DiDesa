import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, MessageSquare, Heart, Image as ImageIcon, X, Upload, Newspaper, AlertTriangle } from 'lucide-react';
import { showToast } from '../../utils/toast';
import { getRelativeDateString } from '../../utils/dateHelper';
import { supabase } from '../../utils/supabase';

interface NewsComment {
  id: string;
  name: string;
  text: string;
  date: string;
}

export interface ProgressPhoto {
  id: string;
  stage: string;
  title: string;
  imageUrl: string;
}

export interface NewsItem {
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

const INITIAL_NEWS: NewsItem[] = [
  {
    id: 'n-1',
    image: 'https://images.unsplash.com/photo-1541888081156-fce1fa5427d6?auto=format&fit=crop&q=80&w=800',
    tag: 'KEGIATAN DESA',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    title: 'Pembangunan Jembatan Tani di RW 03 Telah Selesai',
    excerpt: 'Infrastruktur baru ini diharapkan dapat mempermudah akses pengangkutan hasil panen warga...',
    fullContent: `Pembangunan Jembatan Usaha Tani di wilayah RW 03 Desa Sukamakmur akhirnya rampung 100% dan telah diresmikan secara simbolis oleh Kepala Desa beserta tokoh masyarakat setempat pada hari Senin kemarin.\n\nProyek yang dibiayai dari alokasi Dana Desa (DD) Tahun Anggaran 2023 ini memakan waktu pengerjaan sekitar 45 hari kalender dengan melibatkan tenaga kerja lokal melalui sistem Padat Karya Tunai Desa (PKTD).\n\nJembatan baru dengan konstruksi beton bertulang ini memiliki bentang panjang 6 meter dan lebar 2.5 meter. Infrastruktur krusial ini dibangun khusus untuk menghubungkan jalan desa utama dengan lebih dari 80 hektar lahan persawahan produktif yang selama ini sulit diakses oleh armada pengangkut roda empat.\n\nDengan selesainya pembangunan jembatan tani ini, para petani tidak perlu lagi memikul hasil panen ratusan meter ke jalan besar. Kendaraan pengangkut kini bisa masuk langsung ke bibir persawahan, sehingga memotong ongkos transportasi hasil bumi hingga 40%.`,
    date: '24 Okt 2023',
    author: 'Syarifuddin (Kasi Pembangunan)',
    likes: 42,
    comments: [
      { id: 'c1', name: 'Ahmad Bukhori', text: 'Alhamdulillah, jembatannya sangat kokoh dan membantu sekali untuk mengangkut padi saat panen!', date: '25 Okt 2023' },
      { id: 'c2', name: 'Deddy Setiawan', text: 'Luar biasa Pemdes Sukamakmur. Pembangunan merata dan transparan.', date: '25 Okt 2023' }
    ],
    progressPhotos: [
      { id: 'p-0', stage: '0%', title: 'Titik Nol (Survei Lokasi & Persiapan)', imageUrl: 'https://images.unsplash.com/photo-1541888081156-fce1fa5427d6?auto=format&fit=crop&q=80&w=800' },
      { id: 'p-50', stage: '50%', title: 'Progres Pemasangan Pondasi & Tiang', imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800' },
      { id: 'p-100', stage: '100%', title: 'Serah Terima Pembangunan Rampung 100%', imageUrl: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&q=80&w=800' }
    ]
  },
  {
    id: 'n-2',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
    tag: 'PENGUMUMAN',
    tagColor: 'bg-amber-50 text-amber-700 border-amber-100',
    title: 'Jadwal Vaksinasi Booster ke-2 di Balai Desa',
    excerpt: 'Pemerintah desa memfasilitasi pelayanan kesehatan gratis untuk seluruh warga pada Sabtu mendatang.',
    fullContent: `Dalam rangka meningkatkan imunitas warga dan menyukseskan program jaminan kesehatan nasional, Pemerintah Desa bekerja sama dengan Puskesmas Kecamatan Simpur akan mengadakan Pelayanan Vaksinasi Covid-19 Dosis Booster ke-2 (Vaksinasi ke-4).\n\nKegiatan ini akan dipusatkan di Aula Balai Desa Sukamakmur pada:\n- Hari/Tanggal: Sabtu, 28 Oktober 2023\n- Waktu: 08.00 s/d 12.00 WIB\n- Jenis Vaksin: Pfizer / Astrazeneca (menyesuaikan ketersediaan stok Puskesmas)\n\nPersyaratan Peserta:\n1. Membawa fotokopi KTP / Kartu Keluarga (KK)\n2. Berusia minimal 18 tahun ke atas\n3. Telah mendapatkan vaksinasi Booster ke-1 minimal 6 bulan sebelumnya\n4. Menunjukkan e-ticket vaksinasi di aplikasi SatuSehat\n\nPelayanan ini terbuka gratis bagi seluruh penduduk Desa Sukamakmur maupun warga sekitar yang berdomisili di sini. Mari bersama kita pelihara lingkungan desa yang sehat dan bebas penyakit!`,
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
    fullContent: `Untuk mengurangi ketergantungan para petani terhadap pupuk kimia yang harganya kian melambung tinggi, Dinas Pertanian Daerah bersama Gabungan Kelompok Tani (Gapoktan) Sukamakmur menyelenggarakan pelatihan pembuatan dan pemanfaatan pupuk kompos organik mandiri.\n\nPelatihan ini diselenggarakan selama dua hari berturut-turut dengan materi teori di kelas serta praktik langsung pembuatan pupuk di lapangan.\n\nBahan baku pembuatan kompos memanfaatkan potensi lokal yang melimpah ruah dan belum terkelola optimal, antara lain kotoran hewan ternak sapi/kambing, jerami sisa panen, serta dedaunan hijau dicampur dengan mikroorganisme pengurai EM4.\n\nKepala Desa mengharapkan melalui pelatihan ini, para petani Sukamakmur tidak lagi mengalami kepanikan saat pupuk subsidi langka, sekaligus secara bertahap memperbaiki ekosistem mikroba tanah pertanian agar tetap subur untuk generasi mendatang.`,
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
    fullContent: `Pemerintah Desa Sukamakmur kembali menyalurkan Bantuan Langsung Tunai Dana Desa (BLT-DD) Tahap IV (alokasi bulan Oktober, November, Desember) tahun anggaran 2023. Penyaluran dilaksanakan secara tertib di Aula Kantor Desa.\n\nBantuan diserahkan langsung kepada 75 Keluarga Penerima Manfaat (KPM) yang telah divalidasi melalui forum Musyawarah Desa Khusus (Musdesus). Kriteria penerima manfaat diprioritaskan untuk warga lansia tunggal, penyandang disabilitas, penderita sakit menahun, serta keluarga prasejahtera ekstrem.\n\nMasing-masing KPM menerima bantuan tunai sebesar Rp 300.000 per bulan, sehingga total yang diterima secara rapel pada tahap ini adalah sebesar Rp 900.000.\n\n"Kami berharap bantuan stimulan ini dimanfaatkan sebaik mungkin untuk kebutuhan pokok keluarga, seperti membeli beras, minyak, telur, atau obat-obatan bagi yang lansia, bukan untuk keperluan konsumtif lainnya," pesan Kepala Desa saat memberikan pengantar sambutan.`,
    date: '15 Okt 2023',
    author: 'Aris Munandar (Kaur Keuangan)',
    likes: 55,
    comments: []
  }
];

const CATEGORIES = [
  { label: 'KEGIATAN DESA', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { label: 'PENGUMUMAN', color: 'bg-amber-50 text-amber-700 border-amber-100' },
  { label: 'PEMBANGUNAN', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { label: 'SOSIAL & BANTUAN', color: 'bg-purple-50 text-purple-700 border-purple-100' }
];

const compressImage = (file: File): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> => {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({ blob, originalSize, compressedSize: blob.size });
          } else {
            reject(new Error('Canvas to Blob failed'));
          }
        }, 'image/jpeg', 0.65);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function AdminBerita({ searchQuery = '', setSearchQuery, debouncedSearchQuery = '' }: { searchQuery?: string, setSearchQuery?: (v: string) => void, debouncedSearchQuery?: string }) {
  const [news, setNews] = useState<NewsItem[]>(() => {
    const saved = localStorage.getItem('didesa_news_list');
    return saved ? JSON.parse(saved) : INITIAL_NEWS;
  });

  const [desaName, setDesaName] = useState(() => localStorage.getItem('kop_desa') || 'Desa Sukamakmur');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<NewsItem | null>(null);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    fullContent: '',
    tag: CATEGORIES[0].label,
    image: '',
    author: '',
    progressPhotos: [] as ProgressPhoto[]
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingStageIndex, setUploadingStageIndex] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('didesa_news_list', JSON.stringify(news));
  }, [news]);

  // Sync real-time when citizens like or comment from Portal Warga
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

  const filteredNews = useMemo(() => {
    return news.filter(item => 
      item.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      item.excerpt.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      item.tag.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [news, debouncedSearchQuery]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setIsUploading(true);
      const file = e.target.files[0];
      
      const { blob: compressedBlob, originalSize, compressedSize } = await compressImage(file);
      const fileName = `news-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image: publicUrl }));
      const savedKb = Math.round((originalSize - compressedSize) / 1024);
      const compressedKb = Math.round(compressedSize / 1024);
      showToast(`Gambar dikompresi (${compressedKb} KB, hemat ${savedKb} KB)`, 'success');
      
      e.target.value = '';
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showToast('Gagal mengunggah gambar', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProgressPhotoUpload = async (index: number, file: File) => {
    try {
      setUploadingStageIndex(index);
      const { blob: compressedBlob, originalSize, compressedSize } = await compressImage(file);
      const fileName = `progress-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(fileName, compressedBlob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(fileName);

      setFormData(prev => {
        const updated = [...prev.progressPhotos];
        updated[index] = { ...updated[index], imageUrl: publicUrl };
        return { ...prev, progressPhotos: updated };
      });
      const compressedKb = Math.round(compressedSize / 1024);
      showToast(`Foto tahapan terkompresi (${compressedKb} KB)`, 'success');
    } catch (error: any) {
      console.error('Error uploading progress photo:', error);
      showToast('Gagal mengunggah foto tahapan', 'error');
    } finally {
      setUploadingStageIndex(null);
    }
  };

  const addDanaDesaPresets = () => {
    setFormData(prev => ({
      ...prev,
      progressPhotos: [
        { id: `p-0-${Date.now()}`, stage: '0%', title: 'Titik Nol / Persiapan Awal', imageUrl: '' },
        { id: `p-50-${Date.now()}`, stage: '50%', title: 'Progres Pelaksanaan 50%', imageUrl: '' },
        { id: `p-100-${Date.now()}`, stage: '100%', title: 'Penyelesaian & Serah Terima 100%', imageUrl: '' },
      ]
    }));
    showToast('Preset Tahapan Dana Desa (0%, 50%, 100%) dibuat', 'info');
  };

  const addCustomProgressSlot = () => {
    setFormData(prev => ({
      ...prev,
      progressPhotos: [
        ...prev.progressPhotos,
        { id: `p-custom-${Date.now()}-${Math.random()}`, stage: '40%', title: 'Dokumentasi Lapangan', imageUrl: '' }
      ]
    }));
  };

  const removeProgressSlot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      progressPhotos: prev.progressPhotos.filter((_, i) => i !== index)
    }));
  };

  const handleOpenModal = (item?: NewsItem) => {
    if (item) {
      setEditingNews(item);
      setFormData({
        title: item.title,
        excerpt: item.excerpt,
        fullContent: item.fullContent,
        tag: item.tag,
        image: item.image,
        author: item.author || '',
        progressPhotos: item.progressPhotos ? [...item.progressPhotos] : []
      });
    } else {
      setEditingNews(null);
      setFormData({
        title: '',
        excerpt: '',
        fullContent: '',
        tag: CATEGORIES[0].label,
        image: '',
        author: '',
        progressPhotos: []
      });
    }
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;
    setNews(prev => prev.filter(n => n.id !== itemToDelete.id));
    showToast('Berita berhasil dihapus', 'success');
    setItemToDelete(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.excerpt || !formData.fullContent || !formData.image) {
      showToast('Harap lengkapi semua isian', 'error');
      return;
    }

    const tagInfo = CATEGORIES.find(c => c.label === formData.tag) || CATEGORIES[0];
    const currentDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const authorName = formData.author || (localStorage.getItem('didesa_auth_user') ? JSON.parse(localStorage.getItem('didesa_auth_user')!).name : 'Admin');

    if (editingNews) {
      setNews(prev => prev.map(n => n.id === editingNews.id ? {
        ...n,
        title: formData.title,
        excerpt: formData.excerpt,
        fullContent: formData.fullContent,
        tag: tagInfo.label,
        tagColor: tagInfo.color,
        image: formData.image,
        author: formData.author || n.author,
        progressPhotos: formData.progressPhotos.filter(p => p.imageUrl.trim() !== '')
      } : n));
      showToast('Berita berhasil diperbarui', 'success');
    } else {
      const newItem: NewsItem = {
        id: `n-${Date.now()}`,
        title: formData.title,
        excerpt: formData.excerpt,
        fullContent: formData.fullContent,
        tag: tagInfo.label,
        tagColor: tagInfo.color,
        image: formData.image,
        author: authorName,
        date: currentDate,
        likes: 0,
        comments: [],
        progressPhotos: formData.progressPhotos.filter(p => p.imageUrl.trim() !== '')
      };
      setNews(prev => [newItem, ...prev]);
      showToast('Berita berhasil ditambahkan', 'success');
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kelola Berita & Pengumuman</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Buat dan atur informasi yang tampil di Portal Warga {desaName}.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Cari berita..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery?.(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all min-w-[200px]"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tambah Berita
          </button>
        </div>
      </div>

      {/* Grid of News */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredNews.map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col h-full group relative">
            <div className="h-48 bg-cover bg-center overflow-hidden relative">
              <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent" />
              <span className={`absolute top-4 left-4 inline-block px-2.5 py-1 text-[9px] font-bold rounded-lg tracking-wider border ${item.tagColor}`}>
                {item.tag}
              </span>
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white text-blue-600 rounded-lg shadow-sm transition-colors" title="Edit Berita">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setItemToDelete(item); }} className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white text-red-600 rounded-lg shadow-sm transition-colors" title="Hapus Berita">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm line-clamp-2">{item.excerpt}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {item.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-emerald-600" /> {item.likes}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-blue-600" /> {item.comments.length}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredNews.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <Newspaper className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
            <p>Tidak ada berita ditemukan</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-slate-800 relative z-50">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingNews ? 'Edit Berita' : 'Tambah Berita Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="newsForm" onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Judul Berita *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Contoh: Pembangunan Jembatan Tani..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Kategori *</label>
                    <select 
                      value={formData.tag}
                      onChange={e => setFormData({...formData, tag: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Penulis (Opsional)</label>
                    <input 
                      type="text" 
                      value={formData.author}
                      onChange={e => setFormData({...formData, author: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Contoh: Admin Desa"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Gambar Cover *</label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                      <div className="flex-1 w-full">
                        <input 
                          type="text" 
                          required
                          value={formData.image}
                          onChange={e => setFormData({...formData, image: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="URL Gambar atau unggah dari komputer..."
                        />
                      </div>
                      <div className="relative shrink-0 w-full sm:w-auto">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <button 
                          type="button" 
                          disabled={isUploading}
                          className="w-full sm:w-auto px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-800"
                        >
                          {isUploading ? (
                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          Unggah Foto
                        </button>
                      </div>
                    </div>
                    {formData.image && (
                      <div className="mt-3 rounded-xl overflow-hidden h-48 border border-gray-200 dark:border-slate-700 relative w-full sm:w-2/3 md:w-1/2">
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Dokumentasi Multi-Foto Progress Tahapan Dana Desa */}
                  <div className="space-y-3 md:col-span-2 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-emerald-600" />
                          Dokumentasi Progress Tahapan (Laporan Pendamping Dana Desa)
                        </h4>
                        <p className="text-xs text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                          Unggah foto dokumentasi per persentase tahapan (contoh: 0% Titik Nol, 50% Pengerjaan, 100% Selesai).
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={addDanaDesaPresets}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                        >
                          + Presets Dana Desa (0%, 50%, 100%)
                        </button>
                        <button
                          type="button"
                          onClick={addCustomProgressSlot}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all"
                        >
                          + Tambah Foto
                        </button>
                      </div>
                    </div>

                    {formData.progressPhotos.length > 0 ? (
                      <div className="space-y-3 pt-2">
                        {formData.progressPhotos.map((photo, idx) => (
                          <div key={photo.id || idx} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-800 space-y-3 shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                              {/* Stage Selector */}
                              <div className="sm:col-span-1">
                                <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Persentase Tahap</label>
                                <select
                                  value={photo.stage}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setFormData(prev => {
                                      const updated = [...prev.progressPhotos];
                                      updated[idx] = { ...updated[idx], stage: val };
                                      return { ...prev, progressPhotos: updated };
                                    });
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs font-bold text-emerald-700 dark:text-emerald-400 outline-none"
                                >
                                  <option value="0%">0% (Titik Nol / Awal)</option>
                                  <option value="40%">40% (Pelaksanaan Awal)</option>
                                  <option value="50%">50% (Pertengahan)</option>
                                  <option value="80%">80% (Hampir Selesai)</option>
                                  <option value="100%">100% (Serah Terima / Selesai)</option>
                                  <option value="Laporan">Laporan Kegiatan</option>
                                </select>
                              </div>

                              {/* Title / Description */}
                              <div className="sm:col-span-2">
                                <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Keterangan / Judul Foto</label>
                                <input
                                  type="text"
                                  value={photo.title}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setFormData(prev => {
                                      const updated = [...prev.progressPhotos];
                                      updated[idx] = { ...updated[idx], title: val };
                                      return { ...prev, progressPhotos: updated };
                                    });
                                  }}
                                  placeholder="Contoh: Titik Nol Survei Lapangan..."
                                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white outline-none"
                                />
                              </div>

                              {/* Delete Slot Button */}
                              <div className="sm:col-span-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => removeProgressSlot(idx)}
                                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                                </button>
                              </div>
                            </div>

                            {/* Image Input & Upload */}
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                              <input
                                type="text"
                                value={photo.imageUrl}
                                onChange={e => {
                                  const val = e.target.value;
                                  setFormData(prev => {
                                    const updated = [...prev.progressPhotos];
                                    updated[idx] = { ...updated[idx], imageUrl: val };
                                    return { ...prev, progressPhotos: updated };
                                  });
                                }}
                                placeholder="URL foto atau unggah langsung..."
                                className="flex-1 w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
                              />
                              <div className="relative shrink-0 w-full sm:w-auto">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={e => e.target.files?.[0] && handleProgressPhotoUpload(idx, e.target.files[0])}
                                  disabled={uploadingStageIndex === idx}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <button
                                  type="button"
                                  disabled={uploadingStageIndex === idx}
                                  className="w-full sm:w-auto px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800"
                                >
                                  {uploadingStageIndex === idx ? (
                                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Upload className="w-3.5 h-3.5" />
                                  )}
                                  Unggah Foto Tahap Ini
                                </button>
                              </div>
                            </div>

                            {/* Preview thumbnail if available */}
                            {photo.imageUrl && (
                              <div className="h-28 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 relative w-full sm:w-48">
                                <img src={photo.imageUrl} alt={photo.title} className="w-full h-full object-cover" />
                                <span className="absolute top-2 left-2 bg-emerald-700 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">
                                  {photo.stage}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 border-2 border-dashed border-emerald-200 dark:border-emerald-900/50 rounded-xl text-center text-xs text-emerald-700 dark:text-emerald-400">
                        Belum ada foto dokumentasi tahapan. Klik tombol <strong>"+ Presets Dana Desa"</strong> di atas untuk membuat slot foto persentase 0%, 50%, dan 100% secara otomatis.
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Ringkasan (Excerpt) *</label>
                    <textarea 
                      required
                      rows={2}
                      value={formData.excerpt}
                      onChange={e => setFormData({...formData, excerpt: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                      placeholder="Ringkasan singkat berita untuk ditampilkan di kartu..."
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Isi Berita Lengkap *</label>
                    <textarea 
                      required
                      rows={8}
                      value={formData.fullContent}
                      onChange={e => setFormData({...formData, fullContent: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Tuliskan isi berita lengkap di sini..."
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                form="newsForm"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm"
              >
                {editingNews ? 'Simpan Perubahan' : 'Terbitkan Berita'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Confirmation Delete Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-slate-800 transform transition-all text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/50 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Hapus Berita Ini?</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus berita <strong className="text-gray-800 dark:text-slate-200">"{itemToDelete.title}"</strong>? Berita yang dihapus akan hilang dari Portal Warga.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold shadow-lg shadow-red-500/25 transition-all text-sm flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
