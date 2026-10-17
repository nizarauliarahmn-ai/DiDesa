import { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Printer, Edit2, User, MapPin, Users, FileText, CheckCircle2, Plus, Trash2, X, ArrowRightLeft, ShieldAlert, Briefcase, Heart, Phone, HandHeart, HeartHandshake, MoreHorizontal, Eye } from 'lucide-react';
import { History } from 'lucide-react';
import AdminPendudukPrint from './AdminPendudukPrint';
import { showToast } from '../../../utils/toast';
import { fetchResidentLettersAsync, LetterHistory, getLetterFullData } from '../../../utils/letterHistory';
import { getLetterClassifications } from '../../../utils/letterClassifications';
import ConfirmModal from '../../common/ConfirmModal';
import { supabase } from '../../../utils/supabase';
import { normalizeStatusKeberadaan } from '../../../utils/statusKeberadaan';
import { loadAparaturLists, findPositionsByNik, PositionEntry } from '../../../utils/aparaturPositions';

interface AdminPendudukDetailProps {
  onBack: () => void;
  onEdit?: () => void;
  data: any;
  residents?: any[];
  onSelectResident?: (resident: any) => void;
  onUpdateResident?: (updatedResident: any) => void;
  onNavigateToTab?: (tab: string) => void;
  onSetPresetResident?: (resident: any) => void;
  onSetPresetBantuanNik?: (nik: string) => void;
}

const AID_PROGRAM_NOMINAL: Record<string, string> = {
  'BLT Dana Desa': 'Rp 300.000',
  'Program Keluarga Harapan (PKH)': 'Rp 600.000',
  'Bantuan Pangan Non-Tunai': 'Rp 200.000',
};

const GENDER_OPTIONS = ['Laki-laki', 'Perempuan'];
const AGAMA_OPTIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'];
const MARITAL_OPTIONS = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'];
const DOMICILE_OPTIONS = ['Sesuai KTP', 'Tetap', 'Luar', 'Pindah', 'Tidak Sesuai'];
const STATUS_KEBERADAAN_OPTIONS = [
  { value: 'TETAP', label: 'TETAP' },
  { value: 'SEMENTARA', label: 'SEMENTARA' },
  { value: 'PINDAH', label: 'PINDAH' },
  { value: 'MENINGGAL', label: 'MENINGGAL' },
  { value: 'GANDA', label: 'GANDA' },
];
const HUBUNGAN_OPTIONS = ['Kepala Keluarga', 'Istri', 'Anak', 'Menantu', 'Cucu', 'Orang Tua', 'Mertua', 'Famili Lain', 'Lainnya'];
const GOLDAR_OPTIONS = ['A', 'B', 'AB', 'O', 'Tidak Diketahui'];

const getFullLetterName = (jenis: string): string => {
  const classifications = getLetterClassifications();
  const clean = (jenis || '').trim();
  const cleanUpper = clean.toUpperCase();
  const found = classifications.find(c => c.klasifikasi.toUpperCase() === cleanUpper || c.jenis.toUpperCase() === cleanUpper);
  if (found) {
    return `${found.klasifikasi} - ${found.jenis}`;
  }
  return clean;
};

const PEKERJAAN_OPTIONS = [
  'Belum / Tidak Bekerja',
  'Mengurus Rumah Tangga',
  'Pelajar / Mahasiswa',
  'Pensiunan',
  'Pegawai Negeri Sipil (PNS)',
  'Tentara Nasional Indonesia (TNI)',
  'Kepolisian RI (POLRI)',
  'Karyawan Swasta',
  'Karyawan BUMN / BUMD',
  'Wiraswasta',
  'Buruh Harian Lepas',
  'Petani / Pekebun',
  'Nelayan / Perikanan',
  'Lainnya'
];
const PENDIDIKAN_OPTIONS = [
  'Tidak/Belum Sekolah',
  'SD / Sederajat',
  'SMP / Sederajat',
  'SMA / Sederajat',
  'Diploma (D1/D2/D3)',
  'Sarjana (S1)',
  'Pascasarjana (S2/S3)'
];

function EditableField({
  editing,
  value,
  onChange,
  options,
  type = 'text',
  className = '',
  inputClass = '',
  label
}: {
  editing: boolean;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  type?: string;
  className?: string;
  inputClass?: string;
  label?: string;
}) {
  if (!editing) {
    return (
      <span className={className}>
        {value ? value : <span className="italic text-gray-400 dark:text-slate-500">Belum Terisi</span>}
      </span>
    );
  }
  const baseInput = 'w-full h-8 px-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none';
  const field = (() => {
    if (options && options.length) {
      const opts = value && !options.includes(value) ? [value, ...options] : options;
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseInput} cursor-pointer ${inputClass}`}
        >
          <option value="">Pilih...</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    return (
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Belum Terisi"
        className={`${baseInput} ${inputClass}`}
      />
    );
  })();
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
          {label}
        </label>
      )}
      {field}
    </div>
  );
}

// Hybrid parent input: pilih dari anggota KK (dropdown) atau ketik manual
function ParentHybridInput({
  label,
  members,
  value,
  onChange,
  isManual,
  onToggleManual,
  genderFilter,
  excludeNik
}: {
  label: string;
  members: any[];
  value: string;
  onChange: (v: string) => void;
  isManual: boolean;
  onToggleManual: (v: boolean) => void;
  genderFilter: 'Laki-laki' | 'Perempuan';
  excludeNik?: string;
}) {
  const candidates = useMemo(() => {
    const want = genderFilter === 'Laki-laki' ? ['laki-laki', 'l', 'laki'] : ['perempuan', 'p', 'wanita'];
    return (members || []).filter((m: any) =>
      want.includes(String(m.gender || '').toLowerCase()) &&
      String(m.nik || '') !== String(excludeNik || '')
    );
  }, [members, genderFilter, excludeNik]);

  const hasCandidates = candidates.length > 0;
  const effectiveManual = isManual || !hasCandidates;

  const inputClass = 'w-full h-8 px-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        {hasCandidates && (
          <button
            type="button"
            onClick={() => onToggleManual(!effectiveManual)}
            className="text-[9px] font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 shrink-0"
          >
            {effectiveManual ? '↺ Kembali ke Pilih KK' : '✏️ Ketik Manual'}
          </button>
        )}
      </div>
      {effectiveManual ? (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="Ketik nama secara manual..."
          className={inputClass}
        />
      ) : (
        <select
          value={value || ''}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '__MANUAL__') { onToggleManual(true); return; }
            onChange(v);
          }}
          className={`${inputClass} cursor-pointer`}
        >
          <option value="">-- Pilih dari Anggota KK --</option>
          {candidates.map((m: any) => (
            <option key={m.nik || m.id || m.name} value={m.name}>
              {m.name} ({m.familyRelation || 'Anggota KK'})
            </option>
          ))}
          <option value="__MANUAL__">✏️ Ketik Manual / Tulis Nama Lain...</option>
        </select>
      )}
    </div>
  );
}

export default function AdminPendudukDetail({ 
  onBack, 
  onEdit, 
  data, 
  residents = [], 
  onSelectResident,
  onUpdateResident,
  onNavigateToTab,
  onSetPresetResident,
  onSetPresetBantuanNik
}: AdminPendudukDetailProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [detailTab, setDetailTab] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const stickyHeaderRef = useRef<HTMLDivElement | null>(null);
  const biodataTitleRef = useRef<HTMLHeadingElement | null>(null);
  const [morePos, setMorePos] = useState<{ top: number; left: number } | null>(null);
  const openMoreMenu = () => {
    const r = moreBtnRef.current?.getBoundingClientRect();
    if (r) setMorePos({ top: r.bottom + 6, left: Math.max(8, r.right - 192) });
    setShowMoreMenu(true);
  };
  useEffect(() => {
    if (!showMoreMenu) return;
    const close = () => setShowMoreMenu(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [showMoreMenu]);
  const [showAidModal, setShowAidModal] = useState(false);
  const [selectedNewProgram, setSelectedNewProgram] = useState("BLT Dana Desa");
  const [selectedNewYear, setSelectedNewYear] = useState(new Date().getFullYear().toString());
  const [isUpdatingAid, setIsUpdatingAid] = useState(false);
  const [aidError, setAidError] = useState("");
  const [viewLetter, setViewLetter] = useState<any>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [fatherManual, setFatherManual] = useState(false);
  const [motherManual, setMotherManual] = useState(false);

  // Riwayat jabatan dari data Aparatur/BPD/LPM/RT/RW (cocok via NIK)
  const [jabatanList, setJabatanList] = useState<PositionEntry[]>([]);
  useEffect(() => {
    if (!data?.nik) { setJabatanList([]); return; }
    let cancelled = false;
    (async () => {
      const tid = data?.tenant_id || data?.tenantId || null;
      const lists = await loadAparaturLists(tid);
      if (!cancelled) setJabatanList(findPositionsByNik(String(data.nik), lists));
    })();
    return () => { cancelled = true; };
  }, [data?.nik, data?.tenant_id, data?.tenantId]);

  const startEditMode = () => {
    // Sanitasi status_keberadaan: nilai legacy ('Belum Kawin', 'Kawin', 'Aktif', dll)
    // atau nilai tidak valid dipaksa menjadi 'TETAP'.
    const rawStatus = normalizeStatusKeberadaan(data?.status_keberadaan || data?.status_penduduk || data?.status || 'TETAP');
    const sanitizedStatus = STATUS_KEBERADAAN_OPTIONS.some(o => o.value === rawStatus) ? rawStatus : 'TETAP';
    setEditFormData({ ...data, statusKeberadaan: sanitizedStatus, status: sanitizedStatus });
    // Auto-fallback ke mode manual bila nama orang tua tidak cocok dengan anggota KK saat ini
    const kkNames = (familyMembers || []).map((m: any) => String(m.name || '').toLowerCase());
    setFatherManual(!!(data?.fatherName || '').trim() && !kkNames.includes(String(data.fatherName || '').toLowerCase()));
    setMotherManual(!!(data?.motherName || '').trim() && !kkNames.includes(String(data.motherName || '').toLowerCase()));
    setIsEditMode(true);
  };

  const cancelEditMode = () => {
    setEditFormData({});
    setFatherManual(false);
    setMotherManual(false);
    setIsEditMode(false);
  };

  const handleSaveEdit = async () => {
    if (!data?.nik) return;
    const form = editFormData || {};
    const birthYear = new Date(form.birthDate || data?.birthDate || '').getFullYear();
    const currentYear = new Date().getFullYear();
    const age = isNaN(birthYear) ? (data?.age || 30) : Math.max(0, currentYear - birthYear);
    const dbPayload = {
      nik: form.nik ?? data.nik,
      initials: form.initials ?? data?.initials ?? '',
      name: form.name ?? data?.name ?? '',
      no_kk: form.noKk ?? data?.noKk ?? '',
      gender: form.gender ?? data?.gender ?? '',
      birth_place: form.birthPlace ?? data?.birthPlace ?? '',
      birth_date: form.birthDate ?? data?.birthDate ?? '',
      age,
      blood_type: form.bloodType ?? data?.bloodType ?? '',
      religion: form.religion ?? data?.religion ?? '',
      education: form.education ?? data?.education ?? '',
      pendidikan_terakhir: form.education ?? data?.education ?? '',
      no_whatsapp: form.noWhatsapp ?? data?.noWhatsapp ?? '',
      dusun: form.dusun ?? data?.dusun ?? '',
      status_domisili: form.domicileStatus ?? data?.domicileStatus ?? '',
      domicile_status: form.domicileStatus ?? data?.domicileStatus ?? '',
      job: form.job ?? data?.job ?? '',
      pekerjaan: form.job ?? data?.job ?? '',
      jenis_pekerjaan: form.job ?? data?.job ?? '',
      pekerjaan_nama: form.job ?? data?.job ?? '',
      address: form.address ?? data?.address ?? '',
      rt: form.rt ?? data?.rt ?? '',
      rw: form.rw ?? data?.rw ?? '',
      desa: form.desa ?? data?.desa ?? '',
      status: normalizeStatusKeberadaan(form.status ?? data?.status ?? 'TETAP'),
      status_keberadaan: normalizeStatusKeberadaan(form.statusKeberadaan ?? data?.status_keberadaan ?? form.status ?? data?.status ?? 'TETAP'),
      family_relation: form.familyRelation ?? data?.familyRelation ?? '',
      father_name: form.fatherName ?? data?.fatherName ?? '',
      mother_name: form.motherName ?? data?.motherName ?? '',
      marital_status: form.maritalStatus ?? data?.maritalStatus ?? '',
      status_dtks: form.statusDtks ?? data?.statusDtks ?? '',
      disabilitas: form.disabilitas ?? data?.disabilitas ?? '',
      golongan_darah: form.bloodType ?? data?.bloodType ?? '',
      gender_color: form.gender === 'Perempuan' ? 'pink' : 'blue',
      status_color: form.status === 'Meninggal' ? 'rose' : form.status === 'Pindah' ? 'amber' : 'emerald'
    };
    try {
      let payload = { ...dbPayload };
      let query = supabase.from('residents').update(payload).eq('nik', data.nik);
      let { error } = await query;
      // Defensif: kolom yang tidak ada di skema DB dibuang lalu coba lagi
      // (mis. disabilitas/status_dtks/golongan_darah belum ditambahkan via migrasi)
      let retries = 0;
      while (error && error.message?.includes('Could not find the') && error.message?.includes('column') && retries < 12) {
        const match = error.message.match(/'([^']+)' column/);
        if (match && match[1]) {
          delete payload[match[1]];
          let retryQuery = supabase.from('residents').update(payload).eq('nik', data.nik);
          const retry = await retryQuery;
          error = retry.error;
          retries++;
        } else {
          break;
        }
      }
      if (error) throw new Error(error.message || "Gagal memperbarui data");
      showToast("✅ Data penduduk berhasil diperbarui", "success");
      const merged = { ...data, ...form, age };
      if (onUpdateResident) onUpdateResident(merged);
      setIsEditMode(false);
      setEditFormData({});
    } catch (e: any) {
      showToast(e.message || "Gagal menyimpan perubahan.", "error");
    }
  };

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const [residentLetters, setResidentLetters] = useState<LetterHistory[]>([]);

  useEffect(() => {
    if (data?.nik) {
      fetchResidentLettersAsync(data.nik, data.name || "").then(setResidentLetters);
    } else {
      setResidentLetters([]);
    }
  }, [data]);

  // Collapsible Sticky Header & Tabs — deteksi scroll dengan Ambang Batas Ganda (Hysteresis) + rAF throttle
  // Container scroll utama adalah <main>, bukan window; jadi posisi diambil dari scrollTop <main>.
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const container = document.querySelector('main');
          const currentScroll = container ? container.scrollTop : window.scrollY;

          // Ambang Batas Ganda reaktif terhadap judul "Biodata Utama":
          // Morph menyusut ketika judul "Biodata Utama" tinggal ±36px di bawah
          // tab bar (±12px kartu masih mulai di bawah tab bar — saat morph
          // terbentuk seluruh header kartu masih terlihat), dan kembali tinggi
          // ketika judul ≥44px di bawah tab bar atau kembali ke paling atas
          // (hysteresis anti-jitter, header selalu terbuka penuh di posisi atas).
          // Setelah morph terbentuk tidak ada yang dikunci — konten tetap
          // men-scroll bebas di bawah header seperti biasa.
          const headerEl = stickyHeaderRef.current;
          const titleEl = biodataTitleRef.current;
          if (headerEl && titleEl) {
            const gap = titleEl.getBoundingClientRect().top - headerEl.getBoundingClientRect().bottom;
            setIsScrolled((prev) => {
              if (!prev && gap <= 36) return true;
              if (prev && (gap >= 44 || currentScroll < 20)) return false;
              return prev;
            });
          } else {
            // Fallback: ambang statis lama bila ref belum terpasang
            setIsScrolled((prev) => {
              if (!prev && currentScroll > 160) return true;
              if (prev && currentScroll < 50) return false;
              return prev;
            });
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.querySelector('main')?.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // sinkronkan state awal (mis. posisi scroll ter-restore)
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.querySelector('main')?.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const pickFirst = (...keys: string[]): string => {
    if (!data) return '';
    for (const key of keys) {
      const v = data[key];
      if (v !== null && v !== undefined && String(v).trim() !== '' && String(v).trim() !== '-') {
        return String(v);
      }
    }
    return '';
  };

  const renderValue = (val: string | null | undefined) => {
    if (!val || val.trim() === '' || val === '-') {
      return <span className="text-slate-400 italic font-normal text-sm">Belum Terisi</span>;
    }
    return <span className="font-semibold text-slate-800 dark:text-slate-100">{val}</span>;
  };

  const ALL_AID_PROGRAMS = useMemo(() => [
    "BLT Dana Desa",
    "Program Keluarga Harapan (PKH)",
    "Bantuan Pangan Non-Tunai"
  ], []);

  const availablePrograms = useMemo(() => {
    return ALL_AID_PROGRAMS.filter(p => !data?.activeAids?.includes(`${p} (${selectedNewYear})`));
  }, [data?.activeAids, ALL_AID_PROGRAMS, selectedNewYear]);

  useEffect(() => {
    if (availablePrograms.length > 0) {
      setSelectedNewProgram(availablePrograms[0]);
    }
  }, [availablePrograms]);

  const handleDeleteResident = () => {
    const authUser = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
    
    if (authUser.role === 'admin') {
      showConfirm(
        "Ajukan Penghapusan Warga",
        `Apakah Anda yakin ingin mengajukan permohonan hapus data warga ${data.name}? Pengajuan ini memerlukan persetujuan dari Super Admin (Verifikator).`,
        async () => {
          try {
            const { error } = await supabase.from('residents')
              .update({ status: 'pending_approval', status_color: 'amber' })
              .eq('nik', data.nik);
              
            if (!error) {
              await supabase.from('notifications').insert([{
                id: `notif-${Date.now()}`,
                tenant_id: data.tenant_id || data.tenantId,
                title: "Pengajuan Hapus Penduduk",
                message: `Admin Desa mengajukan penghapusan untuk data penduduk ${data.name} (NIK: ${data.nik}).`,
                category: "Residents",
                is_read: false,
                timestamp: new Date().toISOString()
              }]);
              showToast(`Pengajuan hapus data warga ${data.name} berhasil diajukan ke Super Admin!`, "success");
              if (onUpdateResident) {
                onUpdateResident({ ...data, status: 'pending_approval', status_color: 'amber' });
              }
              onBack();
            } else {
              throw new Error("Gagal mengajukan permohonan hapus.");
            }
          } catch (e: any) {
            showToast(e.message || "Gagal mengajukan permohonan.", "error");
          }
        }
      );
    } else {
      showConfirm(
        "Pindahkan ke Tong Sampah",
        `Apakah Anda yakin ingin menghapus data warga ${data.name}? Data akan dipindahkan ke Tong Sampah dan baru akan dihapus permanen secara otomatis setelah 30 hari.`,
        async () => {
          try {
            const { error } = await supabase.from('residents')
              .update({ status: 'archived', deleted_at: new Date().toISOString() })
              .eq('nik', data.nik);
              
            if (!error) {
              await supabase.from('notifications').insert([{
                id: `notif-${Date.now()}`,
                tenant_id: data.tenant_id || data.tenantId,
                title: "Penduduk Masuk Tong Sampah",
                message: `Data penduduk ${data.name} (NIK: ${data.nik}) dipindahkan ke Tong Sampah oleh Super Admin.`,
                category: "Residents",
                is_read: false,
                timestamp: new Date().toISOString()
              }]);
              showToast(`Data warga ${data.name} berhasil dipindahkan ke Tong Sampah!`, "success");
              onBack();
            } else {
              throw new Error("Gagal menghapus data warga.");
            }
          } catch (e: any) {
            showToast(e.message || "Gagal menghapus data warga.", "error");
          }
        }
      );
    }
  };

  const handleMoveResident = () => {
    const authUser = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
    
    if (authUser.role === 'admin') {
      showConfirm(
        "Ajukan Mutasi (Pindah) Warga",
        `Apakah Anda yakin ingin mengajukan permohonan mutasi pindah keluar wilayah untuk warga ${data.name}? Pengajuan ini memerlukan persetujuan dari Super Admin (Verifikator).`,
        async () => {
          try {
            const { error } = await supabase.from('residents')
              .update({ status: 'pending_approval', status_color: 'amber' })
              .eq('nik', data.nik);
              
            if (!error) {
              await supabase.from('notifications').insert([{
                id: `notif-${Date.now()}`,
                tenant_id: data.tenant_id || data.tenantId,
                title: "Pengajuan Mutasi Pindah",
                message: `Admin Desa mengajukan mutasi pindah keluar untuk penduduk ${data.name} (NIK: ${data.nik}).`,
                category: "Residents",
                is_read: false,
                timestamp: new Date().toISOString()
              }]);
              showToast(`Pengajuan mutasi pindah warga ${data.name} berhasil diajukan ke Super Admin!`, "success");
              if (onUpdateResident) {
                onUpdateResident({ ...data, status: 'pending_approval', status_color: 'amber' });
              }
              onBack();
            } else {
              throw new Error("Gagal mengajukan permohonan mutasi.");
            }
          } catch (e: any) {
            showToast(e.message || "Gagal mengajukan permohonan.", "error");
          }
        }
      );
    } else {
      showConfirm(
        "Mutasi Warga (Pindah Keluar)",
        `Apakah Anda yakin ingin memproses mutasi pindah keluar secara langsung untuk warga ${data.name}? Data warga akan langsung dihapus dari sistem kependudukan aktif.`,
        async () => {
          try {
            const { error } = await supabase.from('residents')
              .delete()
              .eq('nik', data.nik);
              
            if (!error) {
              await supabase.from('notifications').insert([{
                id: `notif-${Date.now()}`,
                tenant_id: data.tenant_id || data.tenantId,
                title: "Penduduk Mutasi Pindah Keluar",
                message: `Data penduduk ${data.name} (NIK: ${data.nik}) telah dimutasikan pindah keluar dari sistem oleh Super Admin.`,
                category: "Residents",
                is_read: false,
                timestamp: new Date().toISOString()
              }]);
              showToast(`Data warga ${data.name} berhasil dimutasikan keluar!`, "success");
              onBack();
            } else {
              throw new Error("Gagal memproses mutasi warga.");
            }
          } catch (e: any) {
            showToast(e.message || "Gagal memproses mutasi warga.", "error");
          }
        }
      );
    }
  };

  const handleAddAid = async (programName: string) => {
    const aidToSave = `${programName} (${selectedNewYear})`;
    const currentAids = data?.activeAids || [];
    if (currentAids.includes(aidToSave)) {
      setAidError(`Program bantuan ini sudah aktif untuk warga tersebut di tahun ${selectedNewYear}.`);
      return;
    }
    
    // Validasi Anti-Bantuan Ganda
    if (programName === "BLT Dana Desa") {
      const hasPKH = currentAids.some((a: string) => a.startsWith("Program Keluarga Harapan (PKH)"));
      const hasBPNT = currentAids.some((a: string) => a.startsWith("Bantuan Pangan Non-Tunai"));
      
      if (hasPKH || hasBPNT) {
        setAidError("Gagal: Warga sudah terdaftar sebagai penerima PKH/BPNT yang dilarang menerima BLT Dana Desa.");
        return;
      }
    }
    
    const updatedAids = [...currentAids, aidToSave];
    setIsUpdatingAid(true);
    setAidError("");
    try {
      const { error } = await supabase.from('residents')
        .update({ active_aids: JSON.stringify(updatedAids) })
        .eq('nik', data.nik);
        
      if (!error) {
        showToast("Bantuan sosial berhasil ditambahkan!", "success");
        if (onUpdateResident) onUpdateResident({ ...data, activeAids: updatedAids, active_aids: JSON.stringify(updatedAids) });
      } else {
        throw new Error("Gagal menambah bantuan");
      }
    } catch (e: any) {
      setAidError(e.message || "Terjadi kesalahan saat memproses data.");
    } finally {
      setIsUpdatingAid(false);
    }
  };

  const handleRemoveAidDirect = async (programName: string) => {
    showConfirm(
      "Hentikan Bantuan Sosial",
      `Apakah Anda yakin ingin menghentikan bantuan ${programName} untuk warga ini?`,
      async () => {
        const currentAids = data?.activeAids || [];
        const updatedAids = currentAids.filter((p: string) => p !== programName);
        setIsUpdatingAid(true);
        try {
          const { error } = await supabase.from('residents')
            .update({ active_aids: JSON.stringify(updatedAids) })
            .eq('nik', data.nik);
            
          if (!error) {
            showToast("Bantuan sosial berhasil dihentikan!", "success");
            if (onUpdateResident) onUpdateResident({ ...data, activeAids: updatedAids, active_aids: JSON.stringify(updatedAids) });
          } else {
            throw new Error("Gagal menghentikan bantuan");
          }
        } catch (e: any) {
          showToast(e.message || "Terjadi kesalahan", "error");
        } finally {
          setIsUpdatingAid(false);
        }
      }
    );
  };

  // FIX FOR BUG DUPLIKASI HUBUNGAN KELUARGA
  const familyMembers = useMemo(() => {
    let currentResident = data;
    
    // Jika data yang diklik tidak memiliki noKk (karena snippet), cari data aslinya di residents
    if (!currentResident?.noKk && !currentResident?.no_kk && currentResident?.nik && residents.length > 0) {
      const found = residents.find((r: any) => r.nik === currentResident.nik);
      if (found) {
        currentResident = found;
      }
    }

    const noKk = currentResident?.noKk || currentResident?.no_kk;
    
    if (!noKk) {
      // Jika benar-benar tidak ada noKK, kembalikan data itu sendiri saja, tanpa menduplikasi mock.
      return [currentResident];
    }

    const filtered = residents.filter((r: any) => (r.noKk === noKk || r.no_kk === noKk));
    
    if (filtered.length === 0) {
      return [currentResident];
    }

    return [...filtered].sort((a: any, b: any) => {
      const relationPriority = (relation: string) => {
        const r = (relation || '').toLowerCase();
        if (r.includes('kepala')) return 1;
        if (r.includes('istri')) return 2;
        if (r.includes('anak')) return 3;
        return 4;
      };
      return relationPriority(a.familyRelation) - relationPriority(b.familyRelation);
    });
  }, [data, residents]);

  useEffect(() => {
    if (!data && residents.length > 0) {
      onBack();
    }
  }, [data, residents]);

  if (isPrinting) {
    return <AdminPendudukPrint data={data} familyMembers={familyMembers} residentLetters={residentLetters} onBack={() => setIsPrinting(false)} />;
  }

  const isPending = data?.status === 'pending_approval';
  const isFemale = data?.gender === 'Perempuan';

  // Parsing bansos history from activeAids
  const bansosHistory = useMemo(() => {
    const aids = Array.isArray(data?.activeAids) ? data.activeAids : [];
    return aids.map((aid: string) => {
      const isStopped = aid.startsWith('STOPPED:');
      const raw = isStopped ? aid.replace(/^STOPPED:\s*/, '') : aid;
      const match = raw.match(/^(.*?)\s*\((\d{4})\)/);
      const program = match ? match[1].trim() : raw.split('|')[0].trim();
      const periode = match ? match[2] : '-';
      const nominal = AID_PROGRAM_NOMINAL[program] || AID_PROGRAM_NOMINAL[Object.keys(AID_PROGRAM_NOMINAL).find(k => program.toLowerCase().includes(k.toLowerCase())) || ''] || '-';
      return { program, periode, nominal, status: isStopped ? 'Dihentikan' : 'Aktif' };
    });
  }, [data?.activeAids]);

  const DETAIL_TABS = [
    { id: 0, label: 'Profil & Kependudukan', icon: User },
    { id: 1, label: 'Kesejahteraan & Bansos', icon: HeartHandshake },
    { id: 2, label: 'Riwayat Surat', icon: FileText },
  ];

  return (
    <div className="w-full space-y-6 pb-12 relative">
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm dark:shadow-none animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-950 uppercase tracking-wider">Pengajuan Verifikasi Tertunda (Maker-Checker)</h4>
            <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
              Data warga ini sedang dalam proses review oleh <strong>Super Admin (Verifikator)</strong>. Tindakan modifikasi, mutasi, atau penghapusan dinonaktifkan sementara sampai pengajuan disetujui atau ditolak.
            </p>
          </div>
        </div>
      )}

      {/* UNIFIED STICKY CONTAINER — Kartu Profil + Tab Navigasi */}
      <div ref={stickyHeaderRef} className="sticky top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm transition-all duration-300 ease-out mb-6 overflow-hidden">
        {/* AREA HEADER PROFIL (MORPHING CONTENT) */}
        <div className={`transition-none md:transition-all md:duration-300 md:ease-out px-6 ${isScrolled ? 'py-2.5 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700/50' : 'py-6'}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Sisi Kiri: Back + Avatar + Nama + Badges */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button 
            onClick={onBack}
            className={`flex shrink-0 items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-none md:transition-all md:duration-300 md:ease-out text-gray-600 dark:text-slate-400 border border-gray-100 dark:border-slate-700 ${isScrolled ? 'w-10 h-10' : 'w-11 h-11'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative shrink-0">
            {data?.photo ? (
              <img src={data.photo} alt={data.name} className={`border-2 border-white shadow-md object-cover transition-none md:transition-all md:duration-300 md:ease-out ${isScrolled ? 'w-10 h-10 rounded-lg' : 'w-16 h-16 rounded-2xl'}`} />
            ) : (
              <div className={`border-2 border-white shadow-md flex items-center justify-center text-white transition-none md:transition-all md:duration-300 md:ease-out ${isFemale ? 'bg-gradient-to-br from-pink-400 to-pink-500' : 'bg-gradient-to-br from-blue-400 to-blue-600'} ${isScrolled ? 'w-10 h-10 rounded-lg' : 'w-16 h-16 rounded-2xl'}`}>
                <User className={`transition-none md:transition-all md:duration-300 md:ease-out ${isScrolled ? 'w-5 h-5' : 'w-8 h-8'}`} fill="currentColor" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {isScrolled ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-slate-900 dark:text-white text-base truncate uppercase">
                  {data?.name || "Nama Penduduk"}
                </span>
                <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0 hidden sm:inline">
                  NIK: {data?.nik || "-"}
                </span>
              </div>
            ) : (
              <h2 className="font-black text-gray-900 dark:text-white leading-tight uppercase truncate text-lg sm:text-xl">
                {data?.name || "Nama Penduduk"}
              </h2>
            )}
            <div className={`flex flex-wrap items-center gap-1.5 overflow-hidden transition-all duration-300 ease-out ${isScrolled ? 'hidden md:flex max-h-0 opacity-0 mt-0 pointer-events-none' : 'max-h-40 opacity-100 mt-1.5'}`}>
              {(() => {
                const keberadaan = normalizeStatusKeberadaan(data?.status_keberadaan || data?.status_penduduk || data?.status || 'TETAP').toLowerCase();
                if (keberadaan.includes('meninggal') || keberadaan === 'mati' || keberadaan === 'wafat') {
                  return (
                    <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-black flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                      Meninggal
                    </span>
                  );
                }
                if (keberadaan.includes('pindah') || keberadaan.includes('mutasi')) {
                  return (
                    <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-black flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                      {keberadaan.includes('mutasi') ? 'Mutasi' : 'Pindah'}
                    </span>
                  );
                }
                if (keberadaan === 'sementara') {
                  return (
                    <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-black flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                      Sementara
                    </span>
                  );
                }
                if (keberadaan === 'ganda') {
                  return (
                    <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-black flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                      Ganda
                    </span>
                  );
                }
                if (keberadaan === 'pending_approval' || keberadaan === 'pending') {
                  return (
                    <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-black flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-ping"></span>
                      Pending
                    </span>
                  );
                }
                return (
                  <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-black flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    Tetap
                  </span>
                );
              })()}
              {data?.maritalStatus && (
                <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-black shadow-sm">
                  {data.maritalStatus}
                </span>
              )}
              {data?.familyRelation && (
                <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-black shadow-sm">
                  {data.familyRelation}
                </span>
              )}
              {(() => {
                const birthYear = data?.birthDate ? new Date(data.birthDate).getFullYear() : null;
                const currentYear = new Date().getFullYear();
                const age = birthYear ? Math.max(0, currentYear - birthYear) : (data?.age || 0);
                const isLansia = age >= 60;
                return isLansia ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-black bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 shadow-sm">
                    Lansia
                  </span>
                ) : null;
              })()}
              {jabatanList.slice(0, 2).map((j, i) => (
                <span
                  key={`${j.lembaga}-${j.label}-${i}`}
                  title={`${j.label} — ${j.lembaga}${j.tenureText ? ` • Masa ${j.tenureText}` : ''}${j.active === true ? ' • Aktif' : j.active === false ? ' • Selesai' : ''}`}
                  className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-black shadow-sm max-w-full truncate"
                >
                  {j.label}{j.tenureText ? ` • ${j.tenureText}` : ''}
                </span>
              ))}
              {jabatanList.length > 2 && (
                <span
                  title={jabatanList.slice(2).map(j => `${j.label}${j.tenureText ? ` (${j.tenureText})` : ''}`).join(', ')}
                  className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-black shadow-sm"
                >
                  +{jabatanList.length - 2} Jabatan
                </span>
              )}
            </div>
            <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ease-out ${isScrolled ? 'hidden md:flex max-h-0 opacity-0 mt-0 pointer-events-none' : 'max-h-10 opacity-100 mt-1.5'}`}>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                NIK: {data?.nik || "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Sisi Kanan: Action Buttons */}
        <div className={`flex flex-wrap items-center gap-2 shrink-0 justify-end ${!isScrolled ? 'w-full sm:w-auto' : ''}`}>
          {isEditMode ? (
            <>
              <button
                onClick={handleSaveEdit}
                className={`rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-none md:transition-all md:duration-300 md:ease-out flex items-center text-xs shadow-sm cursor-pointer ${isScrolled ? 'px-2.5 py-2' : 'px-3.5 py-2'}`}
                title="Simpan Perubahan"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${isScrolled ? 'hidden md:inline max-w-0 opacity-0 ml-0' : 'max-w-[140px] opacity-100 ml-2'}`}>Simpan Perubahan</span>
              </button>
              <button
                onClick={cancelEditMode}
                className={`rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-none md:transition-all md:duration-300 md:ease-out flex items-center text-xs shadow-sm cursor-pointer ${isScrolled ? 'px-2.5 py-2' : 'px-3.5 py-2'}`}
                title="Batal"
              >
                <X className="w-4 h-4" />
                <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${isScrolled ? 'hidden md:inline max-w-0 opacity-0 ml-0' : 'max-w-[140px] opacity-100 ml-2'}`}>Batal</span>
              </button>
            </>
          ) : (
            <>
          {!isPending ? (
            <>
              <button onClick={startEditMode} className={`rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-none md:transition-all md:duration-300 md:ease-out flex items-center text-xs shadow-sm cursor-pointer ${isScrolled ? 'px-2.5 py-2' : 'px-3.5 py-2'}`} title="Edit Data">
                <Edit2 className="w-4 h-4" />
                <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${isScrolled ? 'hidden md:inline max-w-0 opacity-0 ml-0' : 'max-w-[140px] opacity-100 ml-2'}`}>Edit Data</span>
              </button>
              <div className="relative">
                <button
                  ref={moreBtnRef}
                  onClick={openMoreMenu}
                  className={`rounded-xl bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-none md:transition-all md:duration-300 md:ease-out flex items-center justify-center text-xs font-bold ${isScrolled ? 'w-9 h-9' : 'w-10 h-10'}`}
                  title="Aksi lainnya"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button onClick={startEditMode} className={`rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-none md:transition-all md:duration-300 md:ease-out flex items-center text-xs shadow-sm cursor-pointer ${isScrolled ? 'px-2.5 py-2' : 'px-3.5 py-2'}`} title="Edit Data">
              <Edit2 className="w-4 h-4" />
              <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${isScrolled ? 'hidden md:inline max-w-0 opacity-0 ml-0' : 'max-w-[140px] opacity-100 ml-2'}`}>Edit Data</span>
            </button>
          )}
            </>
          )}
        </div>
          </div>
        </div>

        {/* AREA TAB NAVIGASI (SELALU MENEMPEL DI DASAR KONTAINER STICKY) */}
        <div className="px-6 py-2 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-700/50 flex items-center gap-2 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
          {DETAIL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = detailTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDetailTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
          </div>
        </div>
      </div>

      {/* Overlay menu aksi (di luar sticky overflow-hidden agar tidak terpotong) */}
      {showMoreMenu && morePos && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setShowMoreMenu(false)} />
          <div
            style={{ top: morePos.top, left: morePos.left }}
            className="fixed z-[100] w-48 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xl py-1.5"
          >
            <button
              onClick={() => { setShowMoreMenu(false); setIsPrinting(true); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
            >
              <Printer className="w-4 h-4" /> Cetak Profil
            </button>
            <button
              onClick={() => { setShowMoreMenu(false); if (onSetPresetResident && onNavigateToTab) { onSetPresetResident(data); onNavigateToTab('surat'); } }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
            >
              <FileText className="w-4 h-4" /> Buat Surat
            </button>
                      <button
                        onClick={() => { setShowMoreMenu(false); handleMoveResident(); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                      >
                        <ArrowRightLeft className="w-4 h-4" /> Mutasi Warga
                      </button>
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          if (!data?.nik) { showToast('NIK warga tidak tersedia.', 'error'); return; }
                          if (onSetPresetBantuanNik && onNavigateToTab) {
                            onSetPresetBantuanNik(String(data.nik));
                            onNavigateToTab('bantuan');
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                      >
                        <HandHeart className="w-4 h-4" /> Usulkan ke Bantuan
                      </button>
            <div className="my-1 border-t border-gray-100 dark:border-slate-800" />
            <button
              onClick={() => { setShowMoreMenu(false); handleDeleteResident(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left"
            >
              <Trash2 className="w-4 h-4" /> Hapus
            </button>
          </div>
        </>
      )}

      {/* ===== TAB 1: Profil & Kependudukan ===== */}
      {detailTab === 0 && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          {/* KOLOM KIRI UTAMA */}
          <div className="lg:col-span-8 space-y-6">
            <>
              {/* Biodata Ringkasan Individu */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-5 border-b border-gray-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 ref={biodataTitleRef} className="font-bold text-gray-900 dark:text-white text-lg">Biodata Utama</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Ringkasan identitas kependudukan</p>
                    </div>
                  </div>

                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Tempat, Tgl Lahir & Usia */}
                  {isEditMode ? (
                    <div className="py-3 space-y-1.5">
                      <EditableField editing value={editFormData.birthPlace || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, birthPlace: v }))} label="Tempat Lahir" />
                      <EditableField editing value={editFormData.birthDate || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, birthDate: v }))} type="date" label="Tanggal Lahir" />
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 py-3">
                      <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Tempat, Tgl Lahir</p>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">
                          {data?.birthPlace || "Belum diisi"}, {data?.birthDate || "-"}
                        </p>
                        {data?.age && (
                          <span className="inline-block text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            {data.age} Tahun
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Jenis Kelamin */}
                  {isEditMode ? (
                    <div className="py-3">
                      <EditableField editing value={editFormData.gender || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, gender: v }))} options={GENDER_OPTIONS} label="Jenis Kelamin" />
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 py-3">
                      <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Jenis Kelamin</p>
                      <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-right">{data?.gender || "-"}</p>
                    </div>
                  )}

                  {/* Status Perkawinan */}
                  {isEditMode ? (
                    <div className="py-3">
                      <EditableField editing value={editFormData.maritalStatus || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, maritalStatus: v }))} options={MARITAL_OPTIONS} label="Status Perkawinan" />
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 py-3">
                      <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Status Perkawinan</p>
                      <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-right">{data?.maritalStatus || "-"}</p>
                    </div>
                  )}

                  {/* Status Kependudukan */}
                  {isEditMode ? (
                    <div className="py-3 flex flex-col gap-1">
                      <label className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Status Kependudukan</label>
                      <select
                        name="status_keberadaan"
                        value={STATUS_KEBERADAAN_OPTIONS.some(o => o.value === editFormData.statusKeberadaan)
                          ? editFormData.statusKeberadaan
                          : 'TETAP'}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, statusKeberadaan: e.target.value, status: e.target.value }))}
                        className="w-full h-8 px-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                      >
                        <option value="">-- Pilih Status --</option>
                        {STATUS_KEBERADAAN_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 py-3">
                      <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Status Kependudukan</p>
                      <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-right">
                        {(() => {
                          const k = normalizeStatusKeberadaan(data?.status_keberadaan || data?.status_penduduk || data?.status || 'TETAP');
                          const lower = k.toLowerCase();
                          if (lower.includes('pending')) return 'Pending';
                          if (lower.includes('archived')) return 'Archived';
                          if (lower.includes('deleted')) return 'Deleted';
                          const map: Record<string, string> = { TETAP: 'Tetap', SEMENTARA: 'Sementara', PINDAH: 'Pindah', MENINGGAL: 'Meninggal', GANDA: 'Ganda' };
                          return map[k] || k;
                        })()}
                      </p>
                    </div>
                  )}

                  {/* Gelar */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 py-3">
                    <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Gelar</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-right">
                      {[data?.gelarDepan, data?.gelarBelakang].filter(Boolean).join(', ') || "-"}
                    </p>
                  </div>

                  {/* Agama & Golongan Darah */}
                  {isEditMode ? (
                    <div className="py-3 space-y-1.5">
                      <EditableField editing value={editFormData.religion || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, religion: v }))} options={AGAMA_OPTIONS} label="Agama" />
                      <EditableField editing value={editFormData.bloodType || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, bloodType: v }))} options={GOLDAR_OPTIONS} label="Golongan Darah" />
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 py-3">
                      <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Agama / Gol. Darah</p>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{data?.religion || "-"}</p>
                        <span className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 px-1.5 py-0.5 rounded font-black border border-rose-200 dark:border-rose-800">
                          Gol. {renderValue(pickFirst('bloodType', 'blood_type', 'golongan_darah', 'goldar'))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Alamat & Domisili */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-5 border-b border-gray-100 dark:border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Alamat & Domisili</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Lokasi tempat tinggal resmi terdaftar</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Alamat Lengkap */}
                  {isEditMode ? (
                    <div className="py-3 space-y-1.5">
                      <EditableField editing value={editFormData.address || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, address: v }))} label="Alamat Jalan" />
                      <EditableField editing value={editFormData.dusun || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, dusun: v }))} label="Dusun" />
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3 py-3">
                      <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider sm:shrink-0">Alamat Lengkap</p>
                      <p className="font-bold text-gray-900 dark:text-white text-sm leading-snug sm:text-right">
                        {data?.address || "Belum ada alamat jalan"}
                        {data?.dusun && <span className="text-emerald-700 dark:text-emerald-400 font-bold">, {data.dusun}</span>}
                      </p>
                    </div>
                  )}

                  {/* RT / RW */}
                  {isEditMode ? (
                    <div className="py-3 grid grid-cols-2 gap-1.5">
                      <EditableField editing value={editFormData.rt || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, rt: v }))} label="RT" />
                      <EditableField editing value={editFormData.rw || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, rw: v }))} label="RW" />
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 py-3">
                      <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">RT / RW</p>
                      <p className="font-mono font-bold text-gray-900 dark:text-white text-sm sm:text-right">RT {data?.rt || '01'} / RW {data?.rw || '01'}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          </div>

          {/* KOLOM KANAN SIDEBAR */}
          <div className="lg:col-span-4 space-y-6">
            {/* Kontak & Informasi Keluarga */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">Kontak & Informasi Keluarga</h4>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">Kontak, domisili, pendidikan & orang tua</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {isEditMode && (
                  <div className="p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-2">
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-black uppercase tracking-wider">Identitas Penduduk</p>
                    <EditableField editing value={editFormData.name || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, name: v }))} inputClass="uppercase" label="Nama Lengkap" />
                    <EditableField editing value={editFormData.nik || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, nik: v }))} label="NIK" />
                    <EditableField editing value={editFormData.noKk || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, noKk: v }))} label="No. KK" />
                    <EditableField editing value={editFormData.familyRelation || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, familyRelation: v }))} options={HUBUNGAN_OPTIONS} label="Hubungan Keluarga" />
                  </div>
                )}
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60">
                  <span className="text-xs text-gray-500 dark:text-slate-400">No. WhatsApp</span>
                  {isEditMode ? (
                    <EditableField editing value={editFormData.noWhatsapp || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, noWhatsapp: v }))} className="w-48 text-right" label="No. WhatsApp" />
                  ) : (
                    <span className="text-xs font-bold text-gray-900 dark:text-white font-mono">{renderValue(pickFirst('noWhatsapp', 'no_whatsapp', 'nomor_wa', 'telepon', 'hp'))}</span>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Status Domisili</span>
                  {isEditMode ? (
                    <EditableField editing value={editFormData.domicileStatus || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, domicileStatus: v }))} options={DOMICILE_OPTIONS} className="w-48 text-right" label="Status Domisili" />
                  ) : (
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{renderValue(pickFirst('domicileStatus', 'domicile_status', 'status_domisili', 'domisili'))}</span>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Pendidikan</span>
                  {isEditMode ? (
                    <EditableField editing value={editFormData.education || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, education: v }))} options={PENDIDIKAN_OPTIONS} className="w-48 text-right" label="Pendidikan" />
                  ) : (
                    <span className="text-xs font-bold text-gray-900 dark:text-white text-right">{renderValue(pickFirst('education', 'pendidikan', 'pendidikan_terakhir', 'pendidikanTerakhir'))}</span>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Pekerjaan</span>
                  {isEditMode ? (
                    <EditableField editing value={editFormData.job || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, job: v }))} options={PEKERJAAN_OPTIONS} className="w-48 text-right" label="Pekerjaan" />
                  ) : (
                    <span className="text-xs font-bold text-gray-900 dark:text-white text-right">{renderValue(pickFirst('job', 'pekerjaan', 'jenis_pekerjaan', 'pekerjaan_nama'))}</span>
                  )}
                </div>
                <div className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-xs">
                  <p className="text-gray-500 dark:text-slate-400 mb-1.5">Orang Tua Kandung</p>
                  {isEditMode ? (
                    <div className="space-y-2">
                      <ParentHybridInput
                        label="Nama Ayah"
                        members={familyMembers}
                        value={editFormData.fatherName || ''}
                        onChange={(v) => setEditFormData(prev => ({ ...prev, fatherName: v }))}
                        isManual={fatherManual}
                        onToggleManual={setFatherManual}
                        genderFilter="Laki-laki"
                        excludeNik={data?.nik}
                      />
                      <ParentHybridInput
                        label="Nama Ibu"
                        members={familyMembers}
                        value={editFormData.motherName || ''}
                        onChange={(v) => setEditFormData(prev => ({ ...prev, motherName: v }))}
                        isManual={motherManual}
                        onToggleManual={setMotherManual}
                        genderFilter="Perempuan"
                        excludeNik={data?.nik}
                      />
                    </div>
                  ) : (
                    <>
                      <p className="font-bold text-gray-900 dark:text-white truncate">
                        Ayah: {renderValue(pickFirst('fatherName', 'father_name', 'nama_ayah'))}
                      </p>
                      <p className="font-bold text-gray-900 dark:text-white truncate mt-0.5">
                        Ibu: {renderValue(pickFirst('motherName', 'mother_name', 'nama_ibu'))}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Kartu Anggota Keluarga (Dalam 1 No. KK) ===== */}
        {(() => {
          const otherMembers = (familyMembers || []).filter((m: any) => m && m.nik !== data?.nik && m.name !== data?.name);

          if (otherMembers.length === 0) {
            return (
              <div className="bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl p-5 border border-emerald-200/60 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-sm">Status Kartu Keluarga</h4>
                      <span className="px-2.5 py-0.5 bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                        KK Mandiri
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
                      Yang bersangkutan terdaftar sebagai <strong>Kepala Keluarga / Anggota Tunggal</strong> dalam Kartu Keluarga ini.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 shrink-0 self-start sm:self-auto">
                  KK: {data?.noKk || data?.no_kk || "-"}
                </span>
              </div>
            );
          }

          return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Anggota Keluarga (Dalam 1 No. KK)</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Relasi dihitung terhadap Kepala Keluarga</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-500 dark:text-slate-400 font-mono bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-slate-700">
                  KK: {data?.noKk || data?.no_kk || "-"}
                </span>
              </div>

              <div className="space-y-3 relative pl-6 pb-2">
                {/* Vertical line connector */}
                <div className="absolute left-[38px] top-8 bottom-8 w-0.5 bg-gray-200 dark:bg-slate-700 z-0"></div>

                {familyMembers.map((member: any, index: number) => {
                  const isCurrent = member.nik === data?.nik;
                  const isKepalaKeluarga = (member.familyRelation || '').toLowerCase().includes('kepala');
                  const memberIsFemale = member.gender === 'Perempuan';

                  return (
                    <div
                      key={member.nik}
                      id={`family-member-${member.nik}`}
                      onClick={() => {
                        if (!isCurrent && onSelectResident) {
                          onSelectResident(member);
                        }
                      }}
                      className={`flex items-center gap-4 relative z-10 p-4 rounded-xl border transition-all duration-200 ${
                        isCurrent
                          ? 'bg-emerald-50/40 border-emerald-200 dark:border-emerald-800/50 shadow-sm dark:shadow-none cursor-default ring-1 ring-emerald-500/20'
                          : 'bg-white dark:bg-slate-900 hover:bg-emerald-50/20 border-gray-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800/50 hover:shadow-sm cursor-pointer group'
                      } ${index > 0 ? 'ml-6' : ''}`}
                    >
                      {/* Horizontal connection line for child nodes */}
                      {index > 0 && (
                        <div className="absolute -left-[24px] top-1/2 w-[24px] h-0.5 bg-gray-200 dark:bg-slate-700"></div>
                      )}

                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm dark:shadow-none shrink-0 ${
                        memberIsFemale
                          ? 'bg-gradient-to-br from-pink-400 to-pink-500 text-white'
                          : 'bg-gradient-to-br from-blue-400 to-blue-500 text-white'
                      }`}>
                        <User className="w-6 h-6" fill="currentColor" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-[15px] truncate ${isCurrent ? 'text-emerald-800 dark:text-emerald-400' : 'text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors'}`}>
                          {member.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 font-medium truncate flex items-center gap-1.5">
                          <span className={`${isCurrent ? 'text-emerald-700 dark:text-emerald-500 font-bold' : ''}`}>
                            {member.familyRelation || 'Anggota'}
                          </span>
                          <span className="opacity-50">•</span>
                          <span className="font-mono">{member.nik}</span>
                        </p>
                      </div>

                      {isCurrent ? (
                        <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0 border border-emerald-200 dark:border-emerald-800">
                          Sedang Dilihat
                        </span>
                      ) : isKepalaKeluarga ? (
                        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0 border border-blue-100 dark:border-blue-800 group-hover:hidden">
                          Kepala Keluarga
                        </span>
                      ) : null}

                      {!isCurrent && (
                        <span className={`${isKepalaKeluarga ? 'hidden group-hover:inline-block' : 'inline-block opacity-0 group-hover:opacity-100'} text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0 transition-all duration-200 translate-x-2 group-hover:translate-x-0`}>
                          Lihat Profil →
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        </>
      )}
      {detailTab === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          {/* KOLOM KIRI UTAMA */}
          <div className="lg:col-span-12 space-y-6">
            {/* Kesejahteraan & Kesehatan */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-5 border-b border-gray-100 dark:border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <HandHeart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">Kesejahteraan & Kesehatan</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Status bantuan sosial dan kesehatan warga</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Status DTKS / Bansos</p>
                    {isEditMode ? (
                      <div className="mt-1">
                        <EditableField editing value={editFormData.statusDtks || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, statusDtks: v }))} label="Status DTKS / Bansos" />
                      </div>
                    ) : (
                      <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">{renderValue(pickFirst('statusDtks', 'status_dtks', 'penerima_bansos'))}</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Disabilitas</p>
                    {isEditMode ? (
                      <div className="mt-1">
                        <EditableField editing value={editFormData.disabilitas || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, disabilitas: v }))} label="Disabilitas" />
                      </div>
                    ) : (
                      <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">{renderValue(pickFirst('disabilitas', 'jenis_disabilitas'))}</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Golongan Darah</p>
                    {isEditMode ? (
                      <div className="mt-1">
                        <EditableField editing value={editFormData.bloodType || ''} onChange={(v) => setEditFormData(prev => ({ ...prev, bloodType: v }))} options={GOLDAR_OPTIONS} label="Golongan Darah" />
                      </div>
                    ) : (
                      <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">{renderValue(pickFirst('bloodType', 'blood_type', 'golongan_darah', 'goldar'))}</p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Bantuan Sosial */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between mb-5 border-b border-gray-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-400">
                    <HandHeart className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Bantuan Sosial</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{bansosHistory.length} catatan bantuan sosial untuk warga ini</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setAidError("");
                    setShowAidModal(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Kelola
                </button>
              </div>

              {bansosHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500">
                        <th className="px-3 py-2.5 font-bold">Jenis Program</th>
                        <th className="px-3 py-2.5 font-bold">Tahun</th>
                        <th className="px-3 py-2.5 font-bold">Nominal</th>
                        <th className="px-3 py-2.5 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bansosHistory.map((entry, idx) => (
                        <tr key={idx} className="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-3 py-3 text-xs font-bold text-gray-900 dark:text-white">{entry.program}</td>
                          <td className="px-3 py-3 font-mono text-xs font-bold text-gray-500 dark:text-slate-400">{entry.periode}</td>
                          <td className="px-3 py-3 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">{entry.nominal}</td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                              entry.status === 'Aktif'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800'
                                : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:border-rose-800'
                            }`}>{entry.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/40 text-center">
                  <HandHeart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 italic">Belum ada catatan bantuan sosial untuk warga ini.</p>
                </div>
              )}

              <div className="pt-4 mt-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-gray-900 dark:text-white">BPJS / JKN</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">{data?.noBpjs || data?.bpjsNumber || data?.bpjs || "Belum ada nomor"}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ${
                    (data?.noBpjs || data?.bpjsNumber || data?.bpjs)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                  }`}>
                    {(data?.noBpjs || data?.bpjsNumber || data?.bpjs) ? 'TERDAFTAR' : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            </div>
        </div>
      )}

      {/* ===== TAB 3: Riwayat Surat ===== */}
      {detailTab === 2 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Riwayat Dokumen (Surat)</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">{residentLetters.length} surat pernah diterbitkan untuk warga ini</p>
              </div>
            </div>
          </div>

          {residentLetters.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500">
                    <th className="px-3 py-2.5 font-bold">Nomor Surat</th>
                    <th className="px-3 py-2.5 font-bold">Jenis Surat</th>
                    <th className="px-3 py-2.5 font-bold">Tgl Terbit</th>
                    <th className="px-3 py-2.5 font-bold">Status</th>
                    <th className="px-3 py-2.5 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {residentLetters.map((letter) => (
                    <tr key={letter.id} className="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-3 font-mono text-xs font-bold text-gray-900 dark:text-white uppercase">{letter.nomor.toUpperCase() || '-'}</td>
                      <td className="px-3 py-3 text-xs text-gray-700 dark:text-slate-300">{getFullLetterName(letter.jenis)}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 dark:text-slate-400">{letter.tanggal}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                          letter.status === 'Selesai' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:border-amber-800'
                        }`}>{letter.status}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            const fullData = await getLetterFullData(letter);
                            setViewLetter({ ...letter, fullData });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/40 text-center">
              <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400 italic">Belum ada riwayat surat untuk warga ini.</p>
            </div>
          )}
        </div>
      )}

      {showAidModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-xl border border-slate-100 dark:border-slate-800 p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Kelola Bantuan Sosial</h3>
              <button 
                onClick={() => setShowAidModal(false)}
                className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Penerima Manfaat</p>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{data?.name}</p>
                <p className="text-xs font-mono text-gray-500 dark:text-slate-400">{data?.nik}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Program Bantuan Aktif</p>
                {data?.activeAids && data.activeAids.filter((a: string) => !a.startsWith("STOPPED:")).length > 0 ? (
                  <div className="space-y-2">
                    {data.activeAids.filter((a: string) => !a.startsWith("STOPPED:")).map((aid: string, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                        <span className="text-sm font-bold text-emerald-800 dark:text-emerald-400">{aid}</span>
                        <button 
                          onClick={() => handleRemoveAidDirect(aid)}
                          disabled={isUpdatingAid}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors disabled:opacity-50"
                          title="Hentikan Bantuan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-slate-400 italic bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                    Tidak ada program bantuan yang sedang aktif.
                  </p>
                )}
              </div>

              {aidError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-xs font-medium text-rose-700 dark:text-rose-400">
                  {aidError}
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tambah Program Bantuan</p>
                {availablePrograms.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value={selectedNewProgram}
                      onChange={(e) => setSelectedNewProgram(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {availablePrograms.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <select
                      value={selectedNewYear}
                      onChange={(e) => setSelectedNewYear(e.target.value)}
                      className="w-24 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="2023">2023</option>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
                    <button
                      onClick={() => handleAddAid(selectedNewProgram)}
                      disabled={isUpdatingAid}
                      className="bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-800 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 italic font-medium bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-dashed border-emerald-100 dark:border-emerald-900/30">
                    Semua program bantuan ketersediaan sudah aktif.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Letter Detail Modal */}
      <AnimatePresenceCustom viewLetter={viewLetter} setViewLetter={setViewLetter} />

      {/* Elegant ConfirmModal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        type="danger"
        confirmText="Ya, Lanjutkan"
        cancelText="Batal"
      />
    </div>
  );
}

function AnimatePresenceCustom({ viewLetter, setViewLetter }: { viewLetter: any; setViewLetter: (v: any) => void }) {
  if (!viewLetter) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setViewLetter(null)} />
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-md border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detail Surat</h3>
          </div>
          <button 
            onClick={() => setViewLetter(null)}
            className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-2.5">
            <span className="text-gray-500 dark:text-slate-400">Nomor Surat</span>
            <span className="font-bold text-gray-900 dark:text-white text-right font-mono uppercase">{viewLetter.nomor.toUpperCase() || '-'}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-2.5">
            <span className="text-gray-500 dark:text-slate-400">Jenis Surat</span>
            <span className="font-bold text-gray-900 dark:text-white text-right">{viewLetter.jenis || '-'}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-2.5">
            <span className="text-gray-500 dark:text-slate-400">Tgl Terbit</span>
            <span className="font-bold text-gray-900 dark:text-white text-right">{viewLetter.tanggal || '-'}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-2.5">
            <span className="text-gray-500 dark:text-slate-400">Status</span>
            <span className="font-bold text-gray-900 dark:text-white text-right">{viewLetter.status || '-'}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-2.5">
            <span className="text-gray-500 dark:text-slate-400">Keperluan</span>
            <span className="font-bold text-gray-900 dark:text-white text-right">{viewLetter.keperluan || '-'}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-500 dark:text-slate-400">NIK</span>
            <span className="font-bold text-gray-900 dark:text-white text-right font-mono">{viewLetter.nik || '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
