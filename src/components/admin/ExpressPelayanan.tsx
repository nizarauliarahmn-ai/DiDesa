import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, Zap, User, BookOpen, HandCoins, UserPlus, TabletSmartphone, Printer,
  MessageCircle, X, Loader2, ArrowLeft, Clock, Camera, CheckCircle2, Phone,
  ShieldCheck, MapPin, Copy, Send, FileText, ScanLine, Ban, CheckCheck
} from 'lucide-react';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { searchResidentByNIK } from '../../utils/residentSearch';
import { getFormattedDate } from '../../utils/dateHelper';
import KTPScannerModal from './surat/KTPScannerModal';
import { useSuratTemplates, getSuratFormTab } from '../../hooks/useSuratTemplates';
import {
  subscribeKtpScanChannel, sendKtpRequestScanWhenReady, buildKioskScanUrl,
  type ScanCompletePayload
} from '../../utils/ktpRealtime';

interface ExpressResident {
  id?: string;
  nik: string;
  name: string;
  no_kk?: string | null;
  gender?: string | null;
  gender_color?: string | null;
  birth_place?: string | null;
  birth_date?: string | null;
  age?: number | null;
  religion?: string | null;
  job?: string | null;
  address?: string | null;
  rt_rw?: string | null;
  rt?: string | null;
  rw?: string | null;
  dusun?: string | null;
  desa?: string | null;
  status_domisili?: string | null;
  no_whatsapp?: string | null;
  active_aids?: any;
  status_color?: string | null;
  photo?: string | null;
  created_at?: string | null;
}

const toWaNumber = (p?: string | null) => {
  if (!p) return '';
  const d = String(p).replace(/\D/g, '');
  if (!d) return '';
  return d.startsWith('0') ? '62' + d.slice(1) : d;
};

export default function ExpressPelayanan() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [adminName, setAdminName] = useState('Petugas');
  const [villageName, setVillageName] = useState('Desa');
  const [now, setNow] = useState(new Date());
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ExpressResident[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [activeResident, setActiveResident] = useState<ExpressResident | null>(null);
  const [modal, setModal] = useState<'none' | 'letter' | 'ktp' | 'warga' | 'tamu' | 'bansos' | 'penduduk' | 'kiosk'>('none');
  const [ktpModalOpen, setKtpModalOpen] = useState(false);
  const [quickLetterMode, setQuickLetterMode] = useState(false);
  const [stream, setStream] = useState<any[]>([]);
  const [streamLoading, setStreamLoading] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<any>(null);
  const kioskChannel = useRef<any>(null);
  const kioskSessionRef = useRef(`express-${Date.now()}`);
  const [kioskStatus, setKioskStatus] = useState('');

  // Template Surat Dinamis (Master Template Aktif dari Database)
  const { templates: letterTemplates, loading: templateLoading } = useSuratTemplates();
  const [templateQuery, setTemplateQuery] = useState('');
  const filteredTemplates = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    if (!q) return letterTemplates;
    return letterTemplates.filter((t) =>
      (t.jenis || '').toLowerCase().includes(q) ||
      (t.klasifikasi || '').toLowerCase().includes(q) ||
      (t.kodeKlasifikasi || '').toLowerCase().includes(q) ||
      (t.deskripsi || '').toLowerCase().includes(q)
    );
  }, [letterTemplates, templateQuery]);

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('didesa_auth_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAdminName(parsed.name || 'Petugas');
      } catch {}
    }
    setVillageName(localStorage.getItem('village_name') || 'Desa');
    resolveCurrentTenant().then(setTenantId);
    searchRef.current?.focus();
  }, []);

  // Jam berjalan
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Debounce pencarian nama
  useEffect(() => {
    debounceTimer.current = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(debounceTimer.current);
  }, [q]);

  // Stream harian (surat + buku tamu)
  const loadStream = useCallback(async () => {
    if (!tenantId) return;
    setStreamLoading(true);
    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();
      const [suratRes, tamuRes] = await Promise.all([
        supabase.from('surat').select('*').eq('tenant_id', tenantId).gte('created_at', todayISO).order('created_at', { ascending: false }).limit(10),
        supabase.from('guest_book').select('*').eq('tenant_id', tenantId).gte('created_at', todayISO).order('created_at', { ascending: false }).limit(10),
      ]);
      const suratRows = (suratRes.data || []).map((r: any) => ({
        key: 'surat-' + r.id, type: 'surat', id: r.id, nik: r.nik || '', nama: r.nama || '-',
        jenis: r.jenis_surat || 'Surat', detail: r.nomor || r.jenis_surat || 'Surat',
        petugas: r.data?.petugas || 'Meja Layanan', waktu: r.created_at,
      }));
      const tamuRows = (tamuRes.data || []).map((r: any) => ({
        key: 'tamu-' + r.id, type: 'tamu', id: r.id, nik: r.nik || '', nama: r.nama || '-',
        jenis: 'Buku Tamu', detail: r.keperluan || 'Kunjungan', petugas: 'Meja Layanan', waktu: r.created_at,
      }));
      const merged = [...suratRows, ...tamuRows].sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime()).slice(0, 10);
      setStream(merged);
    } catch (e) {
      console.error('Stream error:', e);
    } finally {
      setStreamLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadStream();
  }, [loadStream]);

  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase
      .channel('express-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surat', filter: `tenant_id=eq.${tenantId}` }, () => loadStream())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_book', filter: `tenant_id=eq.${tenantId}` }, () => loadStream())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenantId, loadStream]);

  // ── Pencarian ──────────────────────────────────────────────────────────
  useEffect(() => {
    const val = debouncedQ.trim();
    if (!val) { setResults([]); return; }
    setSearching(true);
    const isNik = /^\d+$/.test(val);
    (async () => {
      try {
        let builder: any = supabase.from('residents').select('*').eq('tenant_id', tenantId);
        builder = isNik ? builder.ilike('nik', `%${val}%`) : builder.or(`name.ilike.%${val}%,nik.ilike.%${val}%`);
        const { data, error } = await builder.limit(8);
        if (error) throw error;
        setResults(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    })();
  }, [debouncedQ, tenantId]);

  const handleChange = (val: string) => {
    setQ(val);
    setShowResults(true);
    const digits = val.replace(/\D/g, '');
    if (digits.length === 16) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      setSearching(true);
      searchResidentByNIK(digits).then((res) => {
        setSearching(false);
        if (res.found && res.resident) {
          setActiveResident(res.resident);
          setShowResults(false);
          setModal(quickLetterMode ? 'letter' : 'warga');
          setQuickLetterMode(false);
          setQ(res.resident.nik || '');
        }
      });
    }
  };

  const onSearchEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && results.length > 0) {
      const r = results[0];
      openResident(r);
    }
  };

  const openResident = (r: ExpressResident) => {
    setActiveResident(r);
    setShowResults(false);
    setModal(quickLetterMode ? 'letter' : 'warga');
    setQuickLetterMode(false);
  };

  const getResidentPhone = useCallback(async (nik: string) => {
    if (!nik) return '';
    const { data } = await supabase.from('residents').select('no_whatsapp').eq('nik', nik).maybeSingle().catch(() => ({ data: null }));
    return data?.no_whatsapp || '';
  }, []);

  // ── Buku Tamu ──────────────────────────────────────────────────────────
  const [tamuForm, setTamuForm] = useState({ nik: '', nama: '', alamat: '', instansi: '', keperluan: 'Pelayanan Surat' });
  const [savingTamu, setSavingTamu] = useState(false);

  const submitTamu = async () => {
    if (!tamuForm.nama.trim()) { showToast('Nama tamu wajib diisi.', 'error'); return; }
    if (!tenantId) return;
    setSavingTamu(true);
    try {
      const payload = {
        id: `guest-${Date.now()}`,
        tenant_id: tenantId,
        nik: tamuForm.nik.trim() || null,
        nama: tamuForm.nama.trim(),
        alamat: tamuForm.alamat.trim() || null,
        instansi: tamuForm.instansi.trim() || null,
        keperluan: tamuForm.keperluan,
        tujuan_temu: '-',
        signature_url: null,
        tanggal_masuk: new Date().toISOString(),
        tanggal_keluar: null,
        status: 'hadir',
      };
      const { error } = await supabase.from('guest_book').insert(payload);
      if (error) throw error;
      await supabase.from('notifications').insert({
        id: `notif-${Date.now()}`,
        tenant_id: tenantId,
        title: 'Tamu Baru',
        message: `${tamuForm.nama.trim()} tercatat di buku tamu (Express Desk)`,
        category: 'Buku Tamu',
        is_read: false,
        timestamp: new Date().toISOString(),
      }).catch(() => {});
      try {
        await supabase.channel(`kiosk-notif-${tenantId}`).send({ type: 'broadcast', event: 'incoming-guest', payload: { nik: tamuForm.nik || null, nama: tamuForm.nama, alamat: tamuForm.alamat, instansi: tamuForm.instansi, keperluan: tamuForm.keperluan } });
      } catch {}
      showToast('Tamu berhasil dicatat! ✓', 'success');
      setTamuForm({ nik: '', nama: '', alamat: '', instansi: '', keperluan: 'Pelayanan Surat' });
      setModal('none');
      loadStream();
    } catch (e: any) {
      showToast(e?.message || 'Gagal mencatat tamu.', 'error');
    } finally {
      setSavingTamu(false);
    }
  };

  // ── Tambah Penduduk ────────────────────────────────────────────────────
  const [pdForm, setPdForm] = useState({ nik: '', name: '', gender: 'Laki-laki', birth_place: '', birth_date: '', address: '', rt: '', rw: '', no_whatsapp: '', dusun: '' });
  const [savingPd, setSavingPd] = useState(false);

  const submitPenduduk = async () => {
    if (!pdForm.nik.trim() || !pdForm.name.trim()) { showToast('NIK dan Nama wajib diisi.', 'error'); return; }
    if (!tenantId) return;
    setSavingPd(true);
    try {
      const payload = {
        tenant_id: tenantId,
        nik: pdForm.nik.trim(),
        name: pdForm.name.trim(),
        gender: pdForm.gender,
        birth_place: pdForm.birth_place,
        birth_date: pdForm.birth_date || null,
        address: pdForm.address,
        rt: pdForm.rt,
        rw: pdForm.rw,
        rt_rw: pdForm.rt && pdForm.rw ? `${pdForm.rt}/${pdForm.rw}` : null,
        dusun: pdForm.dusun,
        no_whatsapp: pdForm.no_whatsapp,
        status_domisili: 'Ditempat',
        status: 'Aktif',
        age: null,
        active_aids: '[]',
        is_deleted: 0,
      };
      const { error } = await supabase.from('residents').insert(payload);
      if (error) throw error;
      showToast(`Penduduk ${pdForm.name.trim()} berhasil didaftarkan! ✓`, 'success');
      setPdForm({ nik: '', name: '', gender: 'Laki-laki', birth_place: '', birth_date: '', address: '', rt: '', rw: '', no_whatsapp: '', dusun: '' });
      setModal('none');
    } catch (e: any) {
      showToast(e?.message || 'Gagal mendaftarkan penduduk.', 'error');
    } finally {
      setSavingPd(false);
    }
  };

  // ── Kiosk / Tablet Scanner ─────────────────────────────────────────────
  useEffect(() => {
    if (modal !== 'kiosk' || !tenantId) return;
    setKioskStatus('Menyiapkan channel kiosk...');
    kioskSessionRef.current = `express-${Date.now()}`;
    const ch = subscribeKtpScanChannel(
      tenantId,
      {
        onScanComplete: (p: ScanCompletePayload) => {
          setKioskStatus('Scan berhasil! Mencocokkan data warga...');
          searchResidentByNIK(p.ocr_data.nik).then((res) => {
            if (res.found && res.resident) {
              setKioskStatus(`Ditemukan: ${res.resident.name}`);
              setActiveResident(res.resident);
              setTimeout(() => setModal('warga'), 600);
            } else {
              setKioskStatus(`Data NIK ${p.ocr_data.nik} belum terdaftar. Silakan daftarkan.`);
            }
          });
        },
      },
      (status) => setKioskStatus(status === 'SUBSCRIBED' ? 'Tablet siap menerima perintah.' : status)
    );
    kioskChannel.current = ch;
    return () => { const c = kioskChannel.current; if (c) c.unsubscribe(); kioskChannel.current = null; };
  }, [modal, tenantId]);

  const sendKioskRequest = async () => {
    if (!tenantId || !kioskChannel.current) return;
    setKioskStatus('Mengirim perintah ke tablet...');
    try {
      await sendKtpRequestScanWhenReady(kioskChannel.current, { type: 'REQUEST_SCAN', session_id: kioskSessionRef.current, admin_id: 'express-admin', timestamp: Date.now() });
      setKioskStatus('Permintaan dikirim! Arahkan tablet ke KTP warga...');
      showToast('Perintah scan terkirim ke tablet kiosk.', 'success');
    } catch (e) {
      setKioskStatus('Gagal mengirim perintah ke tablet.');
      showToast('Pastikan tablet kiosk terbuka di halaman scanner.', 'error');
    }
  };

  // ── Buat Surat Cepat (OCR) ─────────────────────────────────────────────
  const handleKtpResult = async (result: any) => {
    setKtpModalOpen(false);
    try {
      const res = await searchResidentByNIK(result.nik);
      if (res.found && res.resident) {
        setActiveResident(res.resident);
        setModal('letter');
        showToast(`Warga ditemukan: ${res.resident.name}`, 'success');
      } else {
        setActiveResident({
          nik: result.nik, name: result.nama || 'Warga Baru', gender: result.jenisKelamin,
          birth_place: result.tempatLahir, birth_date: result.tanggalLahir, address: result.alamat,
          rt_rw: result.rtRw, status_domisili: 'Ditempat', age: null,
        });
        setModal('letter');
        showToast('Data KTP terbaca. Verifikasi & lanjutkan surat.', 'info');
      }
    } catch (e) {
      showToast('Gagal mencocokkan data KTP.', 'error');
    }
  };

  const launchLetter = (template: any) => {
    if (!activeResident) return;
    const tab = getSuratFormTab(template.klasifikasi);
    localStorage.setItem('express_preset_resident', JSON.stringify(activeResident));
    localStorage.setItem('express_letter_tab', tab);
    localStorage.setItem('express_letter_klasifikasi', template.klasifikasi);
    localStorage.setItem('express_letter_nama', template.jenis || template.klasifikasi);
    window.location.href = '/?mode=admin&admin_tab=surat';
  };

  // ── Cetak & WA ─────────────────────────────────────────────────────────
  const printStreamRow = (row: any) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cetak</title><style>
      body{font-family:'Segoe UI',sans-serif;padding:30px;color:#111;}
      .head{text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:20px;}
      h1{margin:0;font-size:20px;} h2{margin:4px 0 0;font-size:14px;font-weight:normal;}
      table{width:100%;border-collapse:collapse;margin-top:16px;}
      td,th{padding:8px 10px;border:1px solid #ccc;font-size:13px;text-align:left;}
      th{background:#f1f5f9;}
    </style></head><body>
      <div class="head"><h1>${villageName}</h1><h2>Bukti Pelayanan Hari Ini</h2></div>
      <table>
        <tr><th>Waktu</th><td>${new Date(row.waktu).toLocaleString('id-ID')}</td></tr>
        <tr><th>Warga / Tamu</th><td>${row.nama}</td></tr>
        <tr><th>Jenis</th><td>${row.jenis}</td></tr>
        <tr><th>Detail</th><td>${row.detail}</td></tr>
        <tr><th>Petugas</th><td>${row.petugas}</td></tr>
      </table>
    </body></html>`;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 800); }, 400);
  };

  const sendRowWa = async (row: any) => {
    let phone = await getResidentPhone(row.nik);
    if (!phone && row.nik) phone = '';
    const waNumber = toWaNumber(phone);
    const text = `Assalamualaikum ${row.nama}, kami dari ${villageName}. Berikut catatan pelayanan Anda hari ini: ${row.jenis} - ${row.detail} (${new Date(row.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}). Terima kasih.`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const sendActiveResidentWa = () => {
    if (!activeResident) return;
    const waNumber = toWaNumber(activeResident.no_whatsapp);
    const text = `Assalamualaikum ${activeResident.name}, kami dari ${villageName}.`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ── Helper render ──────────────────────────────────────────────────────
  const parseAids = (r: ExpressResident | null): string[] => {
    if (!r?.active_aids) return [];
    try {
      if (Array.isArray(r.active_aids)) return r.active_aids;
      const parsed = JSON.parse(r.active_aids);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const closeModal = () => { setModal('none'); setKioskStatus(''); };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-8">

        {/* Top Bar */}
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={() => window.location.href = '/?mode=admin&admin_tab=dashboard'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-black flex items-center gap-2 justify-center">
              <Zap className="w-6 h-6 text-emerald-600" /> Express Desk
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold">{villageName} • Pelayanan Cepat</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-2.5">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-emerald-600" />{now.toLocaleTimeString('id-ID')}</span>
            <span className="hidden sm:inline text-gray-400">|</span>
            <span className="hidden sm:inline">{getFormattedDate()}</span>
            <span className="hidden sm:inline text-gray-400">|</span>
            <span className="hidden sm:inline"><ShieldCheck className="w-4 h-4 inline text-emerald-600" /> {adminName}</span>
          </div>
        </header>

        {/* Search Bar */}
        <div>
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-600" />
            <input
              ref={searchRef}
              type="text"
              value={q}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={onSearchEnter}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              placeholder="🔍 Tempelkan Barcode KTP / Ketik NIK atau Nama Warga di Sini..."
              className="w-full text-xl p-5 pl-16 rounded-2xl border-2 border-emerald-500 bg-white dark:bg-slate-800 shadow-md focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-900/40 focus:border-emerald-600 outline-none transition-all"
            />
            {searching && <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-emerald-600" />}
            {showResults && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {results.map((r) => (
                  <button
                    key={r.nik}
                    onMouseDown={() => openResident(r)}
                    className="w-full text-left px-5 py-3.5 flex items-center gap-4 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-50 dark:border-slate-700 last:border-0 cursor-pointer"
                  >
                    {r.photo ? (
                      <img src={r.photo} alt="" className="w-11 h-11 rounded-xl object-cover bg-gray-100" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><User className="w-5 h-5" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{r.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{r.nik}</p>
                    </div>
                    <span className="text-[10px] text-gray-400">{r.rt_rw || r.dusun || 'RT/RW -'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1.5">
            <ScanLine className="w-3.5 h-3.5" /> Modes: USB barcode scanner otomatis (NIK 16 digit langsung terdeteksi), tekan Enter untuk membuka hasil pertama.
          </p>
        </div>

        {/* Grid Kartu */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button onClick={() => { setKtpModalOpen(true); }} className="group text-left bg-emerald-600 text-white hover:bg-emerald-700 rounded-3xl p-7 shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-1 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4"><Camera className="w-6 h-6" /></div>
            <h3 className="text-lg font-black flex items-center gap-2"><Zap className="w-5 h-5" /> Buat Surat Cepat</h3>
            <p className="text-sm text-emerald-50 mt-1.5">Scan KTP & Terbit Surat &lt; 30 Detik</p>
          </button>

          <button onClick={() => { setModal('warga'); }} className="text-left bg-blue-600 text-white hover:bg-blue-700 rounded-3xl p-7 shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-1 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4"><User className="w-6 h-6" /></div>
            <h3 className="text-lg font-black">Cek Data Warga</h3>
            <p className="text-sm text-blue-50 mt-1.5">Cari Biodata, KK, & Status Domisili</p>
          </button>

          <button onClick={() => { setTamuForm({ nik: '', nama: '', alamat: '', instansi: '', keperluan: 'Pelayanan Surat' }); setModal('tamu'); }} className="text-left bg-amber-600 text-white hover:bg-amber-700 rounded-3xl p-7 shadow-lg shadow-amber-600/20 hover:shadow-xl hover:shadow-amber-600/30 hover:-translate-y-1 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4"><BookOpen className="w-6 h-6" /></div>
            <h3 className="text-lg font-black">Catat Buku Tamu Digital</h3>
            <p className="text-sm text-amber-50 mt-1.5">Rekam Kedatangan Warga / Tamu Desa</p>
          </button>

          <button onClick={() => setModal('bansos')} className="text-left bg-purple-600 text-white hover:bg-purple-700 rounded-3xl p-7 shadow-lg shadow-purple-600/20 hover:shadow-xl hover:shadow-purple-600/30 hover:-translate-y-1 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4"><HandCoins className="w-6 h-6" /></div>
            <h3 className="text-lg font-black">Cek Status Bansos Warga</h3>
            <p className="text-sm text-purple-50 mt-1.5">Validasi Penerima BLT, PKH, & BPNT</p>
          </button>

          <button onClick={() => { setPdForm({ nik: '', name: '', gender: 'Laki-laki', birth_place: '', birth_date: '', address: '', rt: '', rw: '', no_whatsapp: '', dusun: '' }); setModal('penduduk'); }} className="text-left bg-teal-600 text-white hover:bg-teal-700 rounded-3xl p-7 shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30 hover:-translate-y-1 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4"><UserPlus className="w-6 h-6" /></div>
            <h3 className="text-lg font-black">Tambah Penduduk Baru</h3>
            <p className="text-sm text-teal-50 mt-1.5">Registrasi Pemohon / Pendatang</p>
          </button>

          <button onClick={() => setModal('kiosk')} className="text-left bg-indigo-600 text-white hover:bg-indigo-700 rounded-3xl p-7 shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/30 hover:-translate-y-1 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4"><TabletSmartphone className="w-6 h-6" /></div>
            <h3 className="text-lg font-black">Panggil Kiosk / Tablet Scanner</h3>
            <p className="text-sm text-indigo-50 mt-1.5">Aktifkan Kamera Tablet Depan</p>
          </button>
        </div>

        {/* Stream Pelayanan Hari Ini */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-black flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Pelayanan Hari Ini
            </h3>
            <span className="text-[10px] font-bold text-gray-400">{streamLoading ? 'Memuat...' : 'Live • Realtime'}</span>
          </div>
          {stream.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-bold">Belum ada transaksi hari ini</p>
              <p className="text-[11px]">Transaksi surat & buku tamu akan tampil di sini secara langsung.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3">Waktu</th>
                    <th className="px-6 py-3">Nama Warga</th>
                    <th className="px-6 py-3">Jenis Surat / Layanan</th>
                    <th className="px-6 py-3">Petugas</th>
                    <th className="px-6 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/70">
                  {stream.map((row) => (
                    <tr key={row.key} className="hover:bg-emerald-50/30 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="px-6 py-3.5 text-xs font-mono text-gray-500 dark:text-slate-400">{new Date(row.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-6 py-3.5 font-bold text-sm">{row.nama}</td>
                      <td className="px-6 py-3.5 text-xs">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">{row.jenis}</span>
                        <span className="text-gray-400 ml-2 text-[11px]">{row.detail}</span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-500">{row.petugas}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => printStreamRow(row)} className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-emerald-600 transition-colors cursor-pointer" title="Cetak">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => sendRowWa(row)} className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-emerald-600 transition-colors cursor-pointer" title="Kirim WA">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────────── */}
      {modal === 'warga' && (
        <Modal onClose={closeModal} title="👤 Cek Data Warga">
          {activeResident ? (
            <ResidentDetail
              r={activeResident}
              aids={parseAids(activeResident)}
              onBuatSurat={() => setModal('letter')}
              onBansos={() => setModal('bansos')}
              onWhatsApp={sendActiveResidentWa}
              onCopyNik={() => { navigator.clipboard?.writeText(activeResident.nik || ''); showToast('NIK disalin!', 'success'); }}
            />
          ) : (
            <div className="text-center text-gray-400 py-8">
              <User className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold">Gunakan pencarian di atas untuk memilih warga</p>
              <p className="text-[11px] mt-1">Scan barcode KTP atau ketik NIK / nama</p>
              <button onClick={() => searchRef.current?.focus()} className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer">Pergi ke Pencarian</button>
            </div>
          )}
        </Modal>
      )}

      {modal === 'letter' && (
        <Modal onClose={closeModal} title="⚡ Buat Surat Cepat" wide>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-4">
            {activeResident?.photo ? (
              <img src={activeResident.photo} alt="" className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-emerald-600 text-white flex items-center justify-center"><User className="w-6 h-6" /></div>
            )}
            <div>
              <p className="font-black">{activeResident?.name}</p>
              <p className="text-xs font-mono text-gray-500">{activeResident?.nik}</p>
              {activeResident?.address && <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-xs">{activeResident.address}</p>}
            </div>
          </div>

          <p className="text-xs font-bold text-gray-500 mt-5 mb-3 uppercase tracking-wider">Pilih Jenis Surat:</p>

          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={templateQuery}
              onChange={(e) => setTemplateQuery(e.target.value)}
              placeholder="🔍 Cari nama surat (contoh: Domisili, Keterangan Usaha...)"
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {templateLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-[74px] rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold">Template tidak ditemukan</p>
              <p className="text-[11px] mt-1">Coba kata kunci lain atau aktifkan template di Pengaturan Surat.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {filteredTemplates.map((t) => (
                <button key={t.id} onClick={() => launchLetter(t)} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer text-left">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{t.jenis || t.klasifikasi}</p>
                    <p className="text-[10px] text-gray-400 truncate">
                      <span className="font-mono font-bold text-emerald-600">{t.klasifikasi}</span>
                      {t.kodeKlasifikasi ? ` • Kode: ${t.kodeKlasifikasi}` : ''}
                      {t.deskripsi ? ` • ${t.deskripsi}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {modal === 'tamu' && (
        <Modal onClose={() => setModal('none')} title="📖 Catat Buku Tamu Digital">
          <div className="space-y-4">
            <Field label="Nama Tamu / Warga" value={tamuForm.nama} onChange={(v) => setTamuForm((p) => ({ ...p, nama: v }))} placeholder="Nama lengkap" />
            <Field label="NIK (opsional)" value={tamuForm.nik} onChange={(v) => setTamuForm((p) => ({ ...p, nik: v }))} placeholder="16 digit NIK" />
            <Field label="Alamat" value={tamuForm.alamat} onChange={(v) => setTamuForm((p) => ({ ...p, alamat: v }))} placeholder="Alamat" />
            <Field label="Instansi / Asal" value={tamuForm.instansi} onChange={(v) => setTamuForm((p) => ({ ...p, instansi: v }))} placeholder="Instansi" />
            <div>
              <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5 block">Keperluan</label>
              <select value={tamuForm.keperluan} onChange={(e) => setTamuForm((p) => ({ ...p, keperluan: e.target.value }))} className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                <option>Pelayanan Surat</option>
                <option>Pengaduan / Aspirasi</option>
                <option>Bansos / Bantuan</option>
                <option>Kependudukan</option>
                <option>Silaturahmi</option>
                <option>Lainnya</option>
              </select>
            </div>
            <button onClick={submitTamu} disabled={savingTamu} className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black transition-colors disabled:opacity-50 cursor-pointer">
              {savingTamu ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Catat Tamu
            </button>
          </div>
        </Modal>
      )}

      {modal === 'bansos' && (
        <Modal onClose={closeModal} title="🤝 Cek Status Bansos Warga">
          {activeResident ? (
            <div>
              <div className="flex items-center gap-4 mb-5">
                {activeResident.photo ? (
                  <img src={activeResident.photo} alt="" className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-purple-600 text-white flex items-center justify-center"><User className="w-6 h-6" /></div>
                )}
                <div>
                  <p className="font-black">{activeResident.name}</p>
                  <p className="text-xs font-mono text-gray-500">{activeResident.nik}</p>
                </div>
              </div>
              {parseAids(activeResident).length > 0 ? (
                <div className="space-y-2.5">
                  {parseAids(activeResident).map((aid, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                      <span className="text-sm font-bold text-purple-700 dark:text-purple-300"><CheckCircle2 className="w-4 h-4 inline mr-1.5" />{aid}</span>
                      <span className="text-[10px] font-bold text-purple-500 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-full">AKTIF</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <Ban className="w-9 h-9 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold">Bukan penerima bansos aktif</p>
                  <p className="text-[11px] mt-1">Warga ini tidak terdaftar dalam program BLT / PKH / BPNT.</p>
                </div>
              )}
              <button onClick={() => window.open(`https://wa.me/${toWaNumber(activeResident.no_whatsapp)}?text=${encodeURIComponent(`Assalamualaikum ${activeResident.name}, status bansos Anda saat ini: ${parseAids(activeResident).length ? parseAids(activeResident).join(', ') : 'tidak terdaftar'}.`)}`, '_blank')} className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold transition-colors cursor-pointer">
                <MessageCircle className="w-4 h-4" /> Kirim Status via WhatsApp
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <User className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold">Pilih warga terlebih dahulu</p>
              <button onClick={() => searchRef.current?.focus()} className="mt-4 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer">Cari Warga</button>
            </div>
          )}
        </Modal>
      )}

      {modal === 'penduduk' && (
        <Modal onClose={() => setModal('none')} title="➕ Tambah Penduduk Baru">
          <div className="space-y-4">
            <Field label="NIK *" value={pdForm.nik} onChange={(v) => setPdForm((p) => ({ ...p, nik: v }))} placeholder="16 digit NIK" />
            <Field label="Nama Lengkap *" value={pdForm.name} onChange={(v) => setPdForm((p) => ({ ...p, name: v }))} placeholder="Nama sesuai KTP" />
            <div>
              <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5 block">Jenis Kelamin</label>
              <div className="grid grid-cols-2 gap-2">
                {['Laki-laki', 'Perempuan'].map((g) => (
                  <button key={g} type="button" onClick={() => setPdForm((p) => ({ ...p, gender: g }))} className={`px-4 py-3 rounded-2xl border text-sm font-bold transition-colors cursor-pointer ${pdForm.gender === g ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 dark:border-slate-700 text-gray-500'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3"><Field label="Tempat Lahir" value={pdForm.birth_place} onChange={(v) => setPdForm((p) => ({ ...p, birth_place: v }))} /><Field label="Tanggal Lahir" type="date" value={pdForm.birth_date} onChange={(v) => setPdForm((p) => ({ ...p, birth_date: v }))} /></div>
            <Field label="Alamat" value={pdForm.address} onChange={(v) => setPdForm((p) => ({ ...p, address: v }))} placeholder="Alamat lengkap" />
            <div className="grid grid-cols-3 gap-3">
              <Field label="RT" value={pdForm.rt} onChange={(v) => setPdForm((p) => ({ ...p, rt: v }))} />
              <Field label="RW" value={pdForm.rw} onChange={(v) => setPdForm((p) => ({ ...p, rw: v }))} />
              <Field label="Dusun" value={pdForm.dusun} onChange={(v) => setPdForm((p) => ({ ...p, dusun: v }))} />
            </div>
            <Field label="No. WhatsApp" value={pdForm.no_whatsapp} onChange={(v) => setPdForm((p) => ({ ...p, no_whatsapp: v }))} placeholder="08xxxxxxxxxx" />
            <button onClick={submitPenduduk} disabled={savingPd} className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black transition-colors disabled:opacity-50 cursor-pointer">
              {savingPd ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />} Daftarkan Penduduk
            </button>
          </div>
        </Modal>
      )}

      {modal === 'kiosk' && (
        <Modal onClose={closeModal} title="📱 Panggil Kiosk / Tablet Scanner">
          <div className="text-center py-2">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-600 text-white flex items-center justify-center mb-4"><TabletSmartphone className="w-8 h-8" /></div>
            <h3 className="font-black text-lg">Aktifkan Kamera Tablet Depan</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">Kirim perintah ke tablet kiosk untuk memindai KTP warga. Arahkan tablet ke KTP, hasil akan otomatis tertampil di sini.</p>

            <div className="mt-5 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-left space-y-2">
              <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">URL Tablet Kiosk</p>
              <p className="text-[11px] font-mono break-all text-indigo-600">{buildKioskScanUrl(kioskSessionRef.current, tenantId || undefined)}</p>
              <button onClick={() => { navigator.clipboard?.writeText(buildKioskScanUrl(kioskSessionRef.current, tenantId || undefined)); showToast('URL kiosk disalin!', 'success'); }} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 cursor-pointer"><Copy className="w-3.5 h-3.5" /> Salin URL</button>
            </div>

            <button onClick={sendKioskRequest} className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black transition-colors cursor-pointer">
              <Send className="w-5 h-5" /> Kirim Perintah Scan ke Tablet
            </button>

            {kioskStatus && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin" /> {kioskStatus}
              </div>
            )}
          </div>
        </Modal>
      )}

      <KTPScannerModal
        open={ktpModalOpen}
        onClose={() => setKtpModalOpen(false)}
        onResult={handleKtpResult}
        onManualSearch={() => {
          setQuickLetterMode(true);
          setTimeout(() => { setQ(''); searchRef.current?.focus(); }, 80);
        }}
      />

      <button
        onClick={() => window.location.href = '/?mode=admin&admin_tab=dashboard'}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black shadow-2xl hover:scale-105 transition-transform cursor-pointer"
        title="Keluar Mode Express"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
      </button>
    </div>
  );
}

// ── UI helpers ───────────────────────────────────────────────────────────
function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`bg-white dark:bg-slate-800 ${wide ? 'w-full max-w-3xl' : 'w-full max-w-lg'} rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 rounded-t-3xl">
          <h3 className="font-black text-sm">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}

function ResidentDetail({ r, aids, onBuatSurat, onBansos, onWhatsApp, onCopyNik }: {
  r: ExpressResident; aids: string[]; onBuatSurat: () => void; onBansos: () => void; onWhatsApp: () => void; onCopyNik: () => void;
}) {
  const info = (label: string, value?: string | number | null, mono = false) => (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-50 dark:border-slate-700/50 last:border-0">
      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className={`text-xs text-right font-semibold ${mono ? 'font-mono' : ''}`}>{value || <span className="text-gray-300 dark:text-slate-600">-</span>}</span>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        {r.photo ? (
          <img src={r.photo} alt="" className="w-16 h-16 rounded-2xl object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center"><User className="w-7 h-7" /></div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-base truncate">{r.name}</h4>
          <button onClick={onCopyNik} className="text-xs font-mono text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer mt-0.5"><Copy className="w-3 h-3" /> {r.nik}</button>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${r.status_domisili ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-400'}`}>
          {r.status_domisili || 'Domisili'}
        </span>
      </div>

      <div className="rounded-2xl border border-gray-100 dark:border-slate-700 px-4 py-1">
        {info('Jenis Kelamin', r.gender)}
        {info('Tempat / Tgl Lahir', [r.birth_place, r.birth_date].filter(Boolean).join(', '))}
        {info('No. KK', r.no_kk, true)}
        {info('RT / RW', r.rt_rw || [r.rt, r.rw].filter(Boolean).join('/'))}
        {info('Dusun', r.dusun)}
        {info('Alamat', r.address)}
        {info('Agama', r.religion)}
        {info('Pekerjaan', r.job)}
        {info('No. WhatsApp', r.no_whatsapp, true)}
      </div>

      {(aids.length > 0) && (
        <div className="mt-4">
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Program Bansos</p>
          <div className="flex flex-wrap gap-1.5">
            {aids.map((a, i) => <span key={i} className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800">{a}</span>)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mt-5">
        <button onClick={onBuatSurat} className="flex flex-col items-center gap-1 px-2 py-3.5 rounded-2xl bg-emerald-600 text-white text-[11px] font-black transition-colors hover:bg-emerald-700 cursor-pointer"><Zap className="w-4 h-4" /> Buat Surat</button>
        <button onClick={onBansos} className="flex flex-col items-center gap-1 px-2 py-3.5 rounded-2xl bg-purple-600 text-white text-[11px] font-black transition-colors hover:bg-purple-700 cursor-pointer"><HandCoins className="w-4 h-4" /> Bansos</button>
        <button onClick={onWhatsApp} className="flex flex-col items-center gap-1 px-2 py-3.5 rounded-2xl bg-emerald-600 text-white text-[11px] font-black transition-colors hover:bg-emerald-700 cursor-pointer"><Phone className="w-4 h-4" /> WhatsApp</button>
      </div>
    </div>
  );
}