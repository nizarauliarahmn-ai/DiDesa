import WelcomeBanner from './dashboard/WelcomeBanner';
import StatCards from './dashboard/StatCards';
import LayananMandiri from './dashboard/LayananMandiri';
import ProfilDesa from './dashboard/ProfilDesa';
import TransparansiDana from './dashboard/TransparansiDana';
import BeritaDesa from './dashboard/BeritaDesa';
import AspirasiWarga from './dashboard/AspirasiWarga';

export default function Dashboard({ setPublicTab }: { setPublicTab?: (tab: string) => void }) {
  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-24">
      {/* 1. Hero Welcome Banner */}
      <div id="section-dashboard" className="scroll-mt-24">
        <WelcomeBanner onTabChange={setPublicTab} />
      </div>

      {/* 2. Layanan Mandiri & Kios Surat Digital */}
      <div id="section-layanan_mandiri" className="scroll-mt-24">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2.5 h-8 bg-emerald-600 rounded-full"></div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Persuratan Mandiri & Kios Digital</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pengajuan & cetak surat mandiri online 24 jam dengan TTE Digital</p>
          </div>
        </div>
        <LayananMandiri />
      </div>

      {/* 3. Profil & Statistik Kependudukan */}
      <div id="section-profil_desa" className="scroll-mt-24 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-8 bg-teal-600 rounded-full"></div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Profil & Demografi Kependudukan</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Data kependudukan & statistik perkembangan wilayah desa</p>
          </div>
        </div>
        <StatCards />
        <ProfilDesa />
      </div>

      {/* 4. Transparansi APBD & Keuangan Desa */}
      <div id="section-transparansi" className="scroll-mt-24 space-y-6">
        <TransparansiDana />
      </div>

      {/* 5. Berita & Informasi Kegiatan Desa */}
      <div id="section-berita" className="scroll-mt-24 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-8 bg-amber-500 rounded-full"></div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Berita & Pengumuman Desa</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Kabar kegiatan, proyek Dana Desa, dan informasi resmi pemerintah desa</p>
          </div>
        </div>
        <BeritaDesa />
      </div>

      {/* 7. Aspirasi & Pengaduan Warga 24/7 */}
      <div id="section-aspirasi" className="scroll-mt-24 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-8 bg-rose-600 rounded-full"></div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Kios Aspirasi & Pengaduan Warga</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Kirim masukan, keluhan, atau ide pembangunan desa secara cepat</p>
          </div>
        </div>
        <AspirasiWarga />
      </div>
    </div>
  );
}
