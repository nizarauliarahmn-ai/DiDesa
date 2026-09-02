import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, MessageSquare, ThumbsUp, ArrowRight } from 'lucide-react';
import PermohonanSuratModal from './PermohonanSuratModal';
import AspirasiModal from './AspirasiModal';
import IndeksKepuasanModal from './IndeksKepuasanModal';

const cards = [
  {
    id: 'surat',
    icon: FileText,
    title: 'Permohonan Surat',
    desc: 'Ajukan surat resmi desa — Domisili, Usaha, SKTM, dan lainnya. Ambil di kantor desa.',
    color: 'from-emerald-500 to-emerald-600',
    iconBg: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'aspirasi',
    icon: MessageSquare,
    title: 'Laporan & Aspirasi',
    desc: 'Sampaikan pengaduan, saran, atau kritik untuk kemajuan desa kita.',
    color: 'from-blue-500 to-blue-600',
    iconBg: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'kepuasan',
    icon: ThumbsUp,
    title: 'Indeks Kepuasan',
    desc: 'Beri penilaian terhadap pelayanan pemerintah desa. Masukan Anda sangat berharga.',
    color: 'from-amber-500 to-amber-600',
    iconBg: 'bg-amber-100 text-amber-700',
  },
];

export default function ServiceCards() {
  const [openModal, setOpenModal] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <button
              onClick={() => setOpenModal(card.id)}
              className="group w-full text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center mb-4`}>
                <card.icon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{card.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{card.desc}</p>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 group-hover:gap-2.5 transition-all duration-300">
                Akses <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      {openModal === 'surat' && <PermohonanSuratModal onClose={() => setOpenModal(null)} />}
      {openModal === 'aspirasi' && <AspirasiModal onClose={() => setOpenModal(null)} />}
      {openModal === 'kepuasan' && <IndeksKepuasanModal onClose={() => setOpenModal(null)} />}
    </>
  );
}
