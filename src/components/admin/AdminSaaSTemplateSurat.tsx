import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Edit3, Trash2, CheckCircle2, X } from 'lucide-react';
import { showToast } from '../../utils/toast';

export default function AdminSaaSTemplateSurat() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // SaaS requests state
  const [requests, setRequests] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    jenis: '',
    klasifikasi: '',
    kodeKlasifikasi: '',
    deskripsi: '',
    noUrutTerakhir: 0
  });

  useEffect(() => {
    // We fetch global templates from localStorage or fallback
    import('../../utils/letterClassifications').then((mod) => {
      const initial = mod.INITIAL_CLASSIFICATIONS;
      const stored = localStorage.getItem('saas_global_letter_catalog');
      
      if (stored) {
        const parsedStored = JSON.parse(stored);
        const missingTemplates = initial.filter(initItem => 
          !parsedStored.some((storedItem: any) => storedItem.klasifikasi === initItem.klasifikasi)
        );
        
        if (missingTemplates.length > 0) {
          const merged = [...parsedStored, ...missingTemplates];
          if (!merged.find(m => m.klasifikasi === 'SPPD')) {
            merged.push({ id: '31', jenis: 'SURAT PERJALANAN DINAS', klasifikasi: 'SPPD', kodeKlasifikasi: '094', deskripsi: 'Surat Perintah & Perjalanan Dinas', noUrutTerakhir: 0, isVisible: true });
          }
          setTemplates(merged);
          localStorage.setItem('saas_global_letter_catalog', JSON.stringify(merged));
        } else {
          const toSet = [...parsedStored];
          if (!toSet.find(m => m.klasifikasi === 'SPPD')) {
            toSet.push({ id: '31', jenis: 'SURAT PERJALANAN DINAS', klasifikasi: 'SPPD', kodeKlasifikasi: '094', deskripsi: 'Surat Perintah & Perjalanan Dinas', noUrutTerakhir: 0, isVisible: true });
            localStorage.setItem('saas_global_letter_catalog', JSON.stringify(toSet));
          }
          setTemplates(toSet);
        }
      } else {
        setTemplates(initial);
        localStorage.setItem('saas_global_letter_catalog', JSON.stringify(initial));
      }
    });

    const storedReqs = localStorage.getItem('saas_letter_requests');
    if (storedReqs) {
      setRequests(JSON.parse(storedReqs));
    }
  }, []);

    const generateKodeKlasifikasi = (jenisSurat: string) => {
    const j = jenisSurat.toLowerCase();
    if (j.includes('lahir') || j.includes('kelahiran')) return '474.1';
    if (j.includes('mati') || j.includes('kematian')) return '474.3';
    if (j.includes('pindah')) return '475';
    if (j.includes('nikah') || j.includes('kawin') || j.includes('perawan') || j.includes('belum kawin')) return '474.2';
    if (j.includes('tanah') || j.includes('agraria') || j.includes('jual beli')) return '593';
    if (j.includes('usaha') || j.includes('dagang') || j.includes('ekonomi')) return '500';
    if (j.includes('keuangan') || j.includes('penghasilan') || j.includes('gaji')) return '900';
    if (j.includes('hilang') || j.includes('kehilangan') || j.includes('skck') || j.includes('kelakuan baik') || j.includes('skkb')) return '331';
    if (j.includes('domisili') || j.includes('tinggal') || j.includes('penduduk')) return '470';
    if (j.includes('kuasa') || j.includes('rekomendasi') || j.includes('perjanjian')) return '100';
    if (j.includes('pegawai') || j.includes('undur')) return '800';
    if (j.includes('miskin') || j.includes('sktm') || j.includes('bantuan')) return '460';
    if (j.includes('ahli waris') || j.includes('waris')) return '474';
    if (j.includes('umum') || j.includes('keterangan') || j.includes('pengantar')) return '400';
    if (j.includes('undangan')) return '005';
    return '140';
  };

  const generateSingkatan = (jenisSurat: string, existingSingkatan: string[]) => {
    if (!jenisSurat) return '';
    let words = jenisSurat.toUpperCase().replace(/[^A-Z\s]/g, '').trim().split(/\s+/);
    if (words.length === 0 || words[0] === '') return '';
    
    let baseSingkatan = '';
    
    if (words[0] === 'SURAT' && words[1] === 'KETERANGAN' && words.length > 2) {
      baseSingkatan = 'SK' + words.slice(2).map(w => w[0]).join('');
    } else if (words[0] === 'SURAT' && words.length > 1) {
      baseSingkatan = 'S' + words.slice(1).map(w => w[0]).join('');
    } else {
      baseSingkatan = words.map(w => w[0]).join('');
    }

    if (baseSingkatan.length < 2 && words.length === 1) {
      baseSingkatan = words[0].substring(0, 3).toUpperCase();
    }
    
    baseSingkatan = baseSingkatan.substring(0, 5);
    
    let attempt = baseSingkatan;
    let counter = 1;
    while (existingSingkatan.includes(attempt)) {
        if (counter < 10 && baseSingkatan.length < 5) {
            attempt = baseSingkatan + counter;
        } else if (counter < 10) {
            attempt = baseSingkatan.substring(0, 4) + counter;
        } else {
            attempt = baseSingkatan.substring(0, 3) + counter;
        }
        counter++;
    }
    
    return attempt;
  };

  const handleJenisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const jenis = e.target.value.toUpperCase();
    const existing = templates.filter(t => t.id !== editingId).map(t => t.klasifikasi);
    const singkatan = generateSingkatan(jenis, existing);
    const kode = generateKodeKlasifikasi(jenis);
    
    setFormData({
      ...formData,
      jenis,
      klasifikasi: singkatan,
      kodeKlasifikasi: kode
    });
  };

  const saveTemplates = (newTemplates: any[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('saas_global_letter_catalog', JSON.stringify(newTemplates));
  };

  const handleSave = () => {
    if (!formData.jenis || !formData.klasifikasi || !formData.kodeKlasifikasi) {
      showToast('Harap lengkapi semua field', 'error');
      return;
    }

    if (editingId) {
      const updated = templates.map(t => 
        t.id === editingId ? { ...t, ...formData } : t
      );
      saveTemplates(updated);
      showToast('Template berhasil diperbarui', 'success');
    } else {
      const newTemplate = {
        id: 'global_' + Date.now().toString(),
        ...formData,
        isVisible: true
      };
      saveTemplates([...templates, newTemplate]);
      showToast('Template berhasil ditambahkan', 'success');
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Yakin ingin menghapus template surat ini?')) {
      const updated = templates.filter(t => t.id !== id);
      saveTemplates(updated);
      showToast('Template berhasil dihapus', 'success');
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      jenis: '',
      klasifikasi: '',
      kodeKlasifikasi: '',
      deskripsi: '',
      noUrutTerakhir: 0
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setFormData({
      jenis: item.jenis,
      klasifikasi: item.klasifikasi,
      kodeKlasifikasi: item.kodeKlasifikasi,
      deskripsi: item.deskripsi || '',
      noUrutTerakhir: item.noUrutTerakhir
    });
    setIsModalOpen(true);
  };

  const filtered = templates.filter(t => 
    t.jenis.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.klasifikasi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-6">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <FileText size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Manajemen Template Surat</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Kelola katalog jenis surat secara global. Semua desa akan mewarisi daftar jenis surat yang dibuat di sini. Admin Desa dapat memilih untuk menampilkan atau menyembunyikan jenis surat di akun mereka.
          </p>
        </div>
      </div>

      {requests.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-3xl p-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-400 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" /> Pengajuan Tambah Surat ({requests.length})
          </h3>
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-blue-50 dark:border-blue-900/30 shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-gray-900 dark:text-white">{req.letterName}</span>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">Dari: {req.villageName}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    Lampiran: {req.fileData ? (
                      <a href={req.fileData} download={req.fileName} className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 underline cursor-pointer" title="Download Lampiran">
                        {req.fileName}
                      </a>
                    ) : (
                      <span className="font-medium text-slate-500">{req.fileName}</span>
                    )} • {new Date(req.timestamp).toLocaleString('id-ID')}
                  </div>
                </div>
                <button 
                  onClick={() => {
                     setFormData({
                       jenis: req.letterName,
                       klasifikasi: '',
                       kodeKlasifikasi: '',
                       deskripsi: '',
                       noUrutTerakhir: 0
                     });
                     // Mark as resolved
                     const newReqs = requests.filter((r: any) => r.id !== req.id);
                     setRequests(newReqs);
                     localStorage.setItem("saas_letter_requests", JSON.stringify(newReqs));
                     setIsModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shrink-0"
                >
                  Tinjau & Tambahkan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Cari nama atau singkatan surat..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm font-medium bg-white dark:bg-slate-900"
            />
          </div>
          <button 
            onClick={openAddModal}
            className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" /> Tambah Template
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 pl-6">Jenis Surat</th>
                <th className="p-4">Singkatan</th>
                <th className="p-4">Kode Klasifikasi</th>
                <th className="p-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="p-4 pl-6">
                    <span className="font-bold text-slate-900 dark:text-white">{item.jenis}</span>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">{item.klasifikasi}</span>
                  </td>
                  <td className="p-4 font-mono text-sm text-slate-600 dark:text-slate-400">
                    {item.kodeKlasifikasi}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => openEditModal(item)}
                        className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                        title="Edit Template"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors"
                        title="Hapus Template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                    Tidak ada template surat yang ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingId ? 'Edit Template Surat' : 'Tambah Template Surat'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Jenis Surat Lengkap</label>
                <input 
                  type="text" 
                  value={formData.jenis}
                  onChange={handleJenisChange}
                  placeholder="Contoh: SURAT KETERANGAN USAHA"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Deskripsi / Subjudul (Kecil)</label>
                <input 
                  type="text" 
                  value={formData.deskripsi}
                  onChange={e => setFormData({ ...formData, deskripsi: e.target.value })}
                  placeholder="Contoh: Surat Keterangan Kehilangan / Miskin"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Singkatan (Dibuat Otomatis)</label>
                <input 
                  type="text" 
                  value={formData.klasifikasi}
                  readOnly
                  placeholder="Akan dibuat otomatis"
                  className="w-full px-4 py-3 rounded-xl border border-emerald-100 bg-emerald-50/50 focus:ring-0 outline-none text-sm font-bold text-emerald-700 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Kode Klasifikasi Arsip (Dibuat Otomatis)</label>
                <input 
                  type="text" 
                  value={formData.kodeKlasifikasi}
                  readOnly
                  placeholder="Akan dibuat otomatis"
                  className="w-full px-4 py-3 rounded-xl border border-emerald-100 bg-emerald-50/50 focus:ring-0 outline-none text-sm font-mono text-emerald-700 cursor-not-allowed"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm dark:shadow-none transition-all"
              >
                <CheckCircle2 className="w-5 h-5" /> {editingId ? 'Simpan' : 'Tambahkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
