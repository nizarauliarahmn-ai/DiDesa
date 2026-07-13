import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, MapPin, Building, ShieldCheck, FileText, ChevronRight, X } from 'lucide-react';

export default function ProfilDesa() {
  const [selectedLembaga, setSelectedLembaga] = useState<typeof lembagaDesa[0] | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1 } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const [perangkatDesa, setPerangkatDesa] = useState([
    { name: 'Fazakkir Rahmad', role: 'Kepala Desa', photo: 'https://i.pravatar.cc/150?img=12' },
    { name: 'Siti Aminah', role: 'Sekretaris Desa', photo: 'https://i.pravatar.cc/150?img=47' },
    { name: 'Budi Santoso', role: 'Kasi Pemerintahan', photo: 'https://i.pravatar.cc/150?img=11' },
    { name: 'Dewi Lestari', role: 'Kasi Kesejahteraan', photo: 'https://i.pravatar.cc/150?img=5' },
    { name: 'Agus Pratama', role: 'Kasi Pelayanan', photo: 'https://i.pravatar.cc/150?img=8' },
    { name: 'Rina Wati', role: 'Kaur Keuangan', photo: 'https://i.pravatar.cc/150?img=9' },
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('village_officers');
    if (saved) {
      try {
        const officers = JSON.parse(saved);
        if (Array.isArray(officers) && officers.length > 0) {
          // Filter to only include actual Perangkat Desa (not BPD, LPM, etc. which usually have 'Ketua' or specific keywords, or just use all for now since they are managed centrally)
          const mapped = officers.map((o: any, idx: number) => ({
            name: o.name,
            role: o.role,
            photo: `https://i.pravatar.cc/150?img=${(idx % 50) + 1}`
          }));
          setPerangkatDesa(mapped);
        }
      } catch (e) {
        console.error('Failed to parse village officers', e);
      }
    }
  }, []);

  const lembagaDesa = [
    { name: 'BPD (Badan Permusyawaratan Desa)', members: 7, description: 'Lembaga yang melaksanakan fungsi pemerintahan yang anggotanya wakil dari penduduk desa.', longDescription: 'BPD merupakan pilar utama dalam pemerintahan desa yang berfungsi membahas dan menyepakati Rancangan Peraturan Desa bersama Kepala Desa, menampung dan menyalurkan aspirasi masyarakat desa, dan melakukan pengawasan kinerja Kepala Desa.' },
    { name: 'LPM (Lembaga Pemberdayaan Masyarakat)', members: 12, description: 'Mitra kerja Kepala Desa dalam memberdayakan masyarakat.', longDescription: 'LPM berfungsi sebagai mitra kerja pemerintah desa dalam menyusun rencana pembangunan secara partisipatif, menggerakkan swadaya gotong royong masyarakat, melaksanakan dan mengendalikan pembangunan.' },
    { name: 'PKK', members: 15, description: 'Pemberdayaan Kesejahteraan Keluarga untuk kesejahteraan masyarakat mulai dari keluarga.', longDescription: 'PKK bertujuan memberdayakan keluarga untuk meningkatkan kesejahteraan menuju terwujudnya keluarga yang beriman dan bertaqwa kepada Tuhan Yang Maha Esa, berakhlak mulia dan berbudi luhur, sehat sejahtera, maju dan mandiri.' },
    { name: 'Karang Taruna', members: 25, description: 'Organisasi sosial wadah pembinaan generasi muda.', longDescription: 'Karang Taruna adalah organisasi sosial kemasyarakatan sebagai wadah dan sarana pengembangan setiap anggota masyarakat yang tumbuh dan berkembang atas dasar kesadaran dan tanggung jawab sosial dari, oleh dan untuk masyarakat terutama generasi muda di wilayah desa.' },
  ];

  return (
    <>
      <motion.div 
        className="space-y-8 pb-20 lg:pb-0"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="text-center py-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Profil & Informasi Desa</h1>
        <p className="text-gray-500 mt-2">Mengenal lebih dekat pemerintahan dan kelembagaan desa</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kepala Desa Highlight */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Building className="w-48 h-48" />
            </div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-32 h-32 rounded-full border-4 border-emerald-500/30 overflow-hidden bg-white/10 p-1">
                <img src={perangkatDesa[0].photo} alt={perangkatDesa[0].name} className="w-full h-full object-cover rounded-full" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{perangkatDesa[0].name}</h3>
                <p className="text-emerald-300 font-semibold mt-1 tracking-wider uppercase text-sm">{perangkatDesa[0].role}</p>
              </div>
              <p className="text-emerald-100/80 text-sm mt-4 italic leading-relaxed">
                "Bersama masyarakat membangun desa yang mandiri, transparan, dan berkeadilan untuk kesejahteraan bersama."
              </p>
            </div>
          </div>
        </motion.div>

        {/* Info Geografis */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Lokasi & Demografi</h3>
                <p className="text-sm text-gray-500">Informasi geografis wilayah</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Luas Wilayah</p>
                <p className="text-xl font-black text-gray-900">4.5 <span className="text-sm font-medium text-gray-500">km²</span></p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Penduduk</p>
                <p className="text-xl font-black text-gray-900">1,245 <span className="text-sm font-medium text-gray-500">Jiwa</span></p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Ketinggian</p>
                <p className="text-xl font-black text-gray-900">45 <span className="text-sm font-medium text-gray-500">mdpl</span></p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Batas Utara</p>
                <p className="text-sm font-black text-gray-900">Desa Sukamaju</p>
              </div>
            </div>
            
            <div className="mt-4 bg-gray-100 rounded-2xl h-32 overflow-hidden relative flex items-center justify-center border border-gray-200">
               <span className="text-sm font-bold text-gray-400">Peta Interaktif Dimatikan</span>
               <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")'}}></div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Perangkat Desa & Staf</h3>
            <p className="text-sm text-gray-500">Struktur organisasi pemerintahan desa</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {perangkatDesa.slice(1).map((person, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -5 }}
              className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center text-center group transition-colors hover:bg-emerald-50 hover:border-emerald-100"
            >
              <img src={person.photo} alt={person.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm mb-3 group-hover:border-emerald-200 transition-colors" />
              <h4 className="font-bold text-gray-900 text-sm">{person.name}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{person.role}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Lembaga Desa</h3>
            <p className="text-sm text-gray-500">Badan dan lembaga pendukung operasional desa</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lembagaDesa.map((lembaga, idx) => (
            <div key={idx} onClick={() => setSelectedLembaga(lembaga)} className="flex gap-4 p-4 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors cursor-pointer group">
              <div className="w-12 h-12 bg-gray-50 group-hover:bg-white rounded-xl flex items-center justify-center text-gray-400 group-hover:text-emerald-600 shrink-0 transition-colors">
                <Building className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{lembaga.name}</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{lembaga.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                    {lembaga.members} Anggota Aktif
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <ChevronRight className="text-gray-300 group-hover:text-emerald-500 w-5 h-5 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      </motion.div>

      <AnimatePresence>
        {selectedLembaga && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedLembaga(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                  <Building className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedLembaga.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600">{selectedLembaga.members} Anggota Aktif</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Deskripsi Singkat</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedLembaga.description}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Tugas & Fungsi Utama</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedLembaga.longDescription}</p>
                </div>
              </div>
              
              <div className="mt-8">
                <button 
                  onClick={() => setSelectedLembaga(null)}
                  className="w-full bg-slate-900 text-white font-bold text-sm py-3 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
