import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { resolveCurrentTenant } from '../../../utils/tenantResolver';
import { showToast } from '../../../utils/toast';
import { generateLetterNumber, incrementSequenceNumber, getLetterClassifications, LetterClassification } from '../../../utils/letterClassifications';
import { fetchResidentsCached } from '../../../utils/apiCache';
import { capitalizeWords } from '../../../utils/textUtils';
import {
  X, Send, BookOpen, Monitor, Inbox, FileText, Search, CheckCircle2, Loader2, User
} from 'lucide-react';

const KEPERLUAN_OPTIONS = [
  'Mengurus Surat Keterangan',
  'Konsultasi / Pengaduan',
  'Urusan Administrasi',
  'Kunjungan Dinas',
  'Bantuan Sosial',
  'Urusan Tanah / Aset',
  'Silaturahmi',
  'Lainnya',
];

/* ─────────────────────────── QUICK ADD TAMU (Broadcast to Kios) ─────────────────────────── */

export function TambahTamuModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [form, setForm] = useState({
    nik: '', nama: '', alamat: '', instansi: '', keperluan: KEPERLUAN_OPTIONS[0]
  });
  const [residentSuggestions, setResidentSuggestions] = useState<any[]>([]);
  const [lookupQuery, setLookupQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const channelRef = React.useRef<any>(null);

  useEffect(() => {
    resolveCurrentTenant().then(tenantId => {
      if (!tenantId) return;
      channelRef.current = supabase.channel(`kiosk-notif-${tenantId}`);
      channelRef.current.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // ready
        }
      });
    });
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const searchResidents = async (query: string) => {
    if (!query || query.trim().length < 3) { setResidentSuggestions([]); return; }
    try {
      const res = await fetchResidentsCached();
      const residents = await res.json();
      const q = query.trim().toLowerCase();
      const matches = Array.isArray(residents)
        ? residents.filter((r: any) =>
            (r.nik || '').includes(q) || (r.name || '').toLowerCase().includes(q)
          ).slice(0, 5)
        : [];
      setResidentSuggestions(matches);
    } catch (e) {
      console.error(e);
    }
  };

  const pickResident = (r: any) => {
    setForm(prev => ({
      ...prev,
      nik: r.nik || prev.nik,
      nama: capitalizeWords(r.name || prev.nama),
      alamat: capitalizeWords(`${r.address || ''} RT ${r.rt || ''} RW ${r.rw || ''}`.trim()),
      instansi: 'Warga Desa',
    }));
    setResidentSuggestions([]);
    setLookupQuery('');
  };

  const handleSend = () => {
    if (!form.nama.trim()) { showToast('Nama tamu wajib diisi.', 'error'); return; }
    if (!form.keperluan.trim()) { showToast('Keperluan kunjungan wajib diisi.', 'error'); return; }

    const payload = {
      nik: form.nik || null,
      nama: form.nama,
      alamat: form.alamat,
      instansi: form.instansi,
      keperluan: form.keperluan
    };

    const doBroadcast = (ch: any) => {
      ch?.send({ type: 'broadcast', event: 'incoming-guest', payload });
      setIsSending(false);
      showToast('Data tamu berhasil dikirim ke layar Kios.', 'success');
      onSuccess?.();
      onClose();
    };

    if (channelRef.current && channelRef.current.state === 'SUBSCRIBED') {
      doBroadcast(channelRef.current);
    } else {
      setIsSending(true);
      resolveCurrentTenant().then(tenantId => {
        if (!tenantId) { setIsSending(false); showToast('Tenant tidak ditemukan.', 'error'); return; }
        const tempChannel = supabase.channel(`kiosk-notif-${tenantId}`);
        tempChannel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            doBroadcast(tempChannel);
          }
        });
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-700" />
            Tambah Tamu (Kirim ke Kios)
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 p-3 rounded-xl text-sm mb-2 flex gap-3 items-start border border-blue-100 dark:border-blue-800">
            <Monitor className="w-5 h-5 shrink-0 mt-0.5" />
            <p>Data akan dikirim ke layar Tablet Kios. Tamu hanya perlu membubuhkan tanda tangannya di layar sana.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Cari Warga (NIK / Nama)</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => { setLookupQuery(e.target.value); searchResidents(e.target.value); }}
                placeholder="Ketik NIK atau nama warga..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
              />
              {residentSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden">
                  {residentSuggestions.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => pickResident(r)}
                      className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{r.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">NIK: {r.nik}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">NIK (Opsional)</label>
            <input
              type="tel" data-no-cap maxLength={16}
              value={form.nik}
              onChange={(e) => setForm(prev => ({ ...prev, nik: e.target.value.replace(/\D/g, '') }))}
              placeholder="16 digit NIK..."
              className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Nama Lengkap <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.nama}
              onChange={(e) => setForm(prev => ({ ...prev, nama: capitalizeWords(e.target.value) }))}
              placeholder="Nama tamu..."
              className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Asal / Alamat / Instansi</label>
            <input
              type="text"
              value={form.instansi}
              onChange={(e) => setForm(prev => ({ ...prev, instansi: capitalizeWords(e.target.value), alamat: capitalizeWords(e.target.value) }))}
              placeholder="Desa / kota / instansi asal..."
              className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
            />
          </div>

          <div className="space-y-1 mt-3">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Keperluan <span className="text-red-500">*</span></label>
            <select
              value={form.keperluan}
              onChange={(e) => setForm(prev => ({ ...prev, keperluan: e.target.value }))}
              className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 cursor-pointer"
            >
              {KEPERLUAN_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
            </select>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-slate-900/50">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
            Batal
          </button>
          <button
            onClick={handleSend}
            disabled={isSending}
            className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Kirim ke Layar Kiosk
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── QUICK ADD PERMOHONAN (Assistive Kiosk Sign) ─────────────────────────── */

export function TambahPermohonanModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [letterTypes, setLetterTypes] = useState<LetterClassification[]>([]);
  const [sendingMode, setSendingMode] = useState<'kiosk' | 'inbox'>('kiosk');
  const [step, setStep] = useState<'form' | 'waiting' | 'done'>('form');

  const [lookupQuery, setLookupQuery] = useState('');
  const [residentSuggestions, setResidentSuggestions] = useState<any[]>([]);
  const [form, setForm] = useState({
    nik: '',
    nama: '',
    jenis: '',
    keperluan: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const replyChannelRef = React.useRef<any>(null);

  useEffect(() => {
    setLetterTypes(getLetterClassifications().filter(t => t.isVisible && !t.isSaaSDisabled));
    resolveCurrentTenant().then(id => setTenantId(id));
  }, []);

  // Listen for confirmation from kiosk that the resident has signed
  useEffect(() => {
    if (!tenantId || step !== 'waiting') return;
    const channel = supabase.channel(`kiosk-notif-${tenantId}`)
      .on('broadcast', { event: 'permohonan-signed' }, ({ payload }) => {
        setStep('done');
        showToast('Warga telah menandatangani di Kios. Permohonan masuk ke Inbox.', 'success');
        onSuccess?.();
      })
      .subscribe();
    replyChannelRef.current = channel;
    return () => {
      if (replyChannelRef.current) supabase.removeChannel(replyChannelRef.current);
    };
  }, [tenantId, step]);

  const searchResidents = async (query: string) => {
    if (!query || query.trim().length < 3) { setResidentSuggestions([]); return; }
    try {
      const res = await fetchResidentsCached();
      const residents = await res.json();
      const q = query.trim().toLowerCase();
      const matches = Array.isArray(residents)
        ? residents.filter((r: any) =>
            (r.nik || '').includes(q) || (r.name || '').toLowerCase().includes(q)
          ).slice(0, 5)
        : [];
      setResidentSuggestions(matches);
    } catch (e) {
      console.error(e);
    }
  };

  const pickResident = (r: any) => {
    setForm(prev => ({ ...prev, nik: r.nik || prev.nik, nama: capitalizeWords(r.name || prev.nama) }));
    setResidentSuggestions([]);
    setLookupQuery('');
  };

  const insertSuratDirect = async () => {
    const klas = getLetterClassifications().find(c => c.id === form.jenis || c.jenis === form.jenis);
    if (!klas || !tenantId) return null;
    incrementSequenceNumber(klas.klasifikasi);
    const finalNumber = generateLetterNumber(klas.klasifikasi, klas.kodeKlasifikasi);
    const { data, error } = await supabase
      .from('surat')
      .insert([{
        tenant_id: tenantId,
        jenis_surat: klas.jenis,
        keterangan: form.keperluan.trim(),
        status: 'pending',
        nomor: finalNumber,
        nik: form.nik || null,
        nama: form.nama,
        data: { source: 'admin_assist', via_kiosk: false }
      }])
      .select('id')
      .single();
    if (error) { console.error(error); return null; }

    await supabase.from('notifications').insert([{
      id: `notif-${Date.now()}`,
      tenant_id: tenantId,
      title: 'Permohonan Surat Baru (Bantuan Admin)',
      message: `${form.nama} (NIK: ${form.nik || '-'}) mengajukan ${klas.jenis}.`,
      category: 'Services',
      is_read: false,
      timestamp: new Date().toISOString()
    }]);
    window.dispatchEvent(new Event('didesa_notification_created'));
    return data?.id;
  };

  const handleSubmit = async () => {
    if (!form.nama.trim()) { showToast('Nama / pilih warga wajib diisi.', 'error'); return; }
    if (!form.jenis) { showToast('Pilih jenis surat yang dimohonkan.', 'error'); return; }

    setIsSubmitting(true);
    try {
      if (sendingMode === 'inbox') {
        const id = await insertSuratDirect();
        setIsSubmitting(false);
        if (id) {
          showToast('Permohonan berhasil disimpan ke Inbox.', 'success');
          onSuccess?.();
          onClose();
        } else {
          showToast('Gagal menyimpan permohonan.', 'error');
        }
        return;
      }

      // Option A: Broadcast ke Tablet Kiosk untuk verifikasi & TTD warga
      const klas = getLetterClassifications().find(c => c.id === form.jenis || c.jenis === form.jenis);
      if (!tenantId) { setIsSubmitting(false); showToast('Tenant tidak ditemukan.', 'error'); return; }

      const payload = {
        type: 'permohonan',
        sessionId: `assist-${Date.now()}`,
        nik: form.nik || null,
        nama: form.nama,
        jenis: klas?.jenis || form.jenis,
        klasifikasi: klas?.klasifikasi || '',
        kodeKlasifikasi: klas?.kodeKlasifikasi || '140',
        keperluan: form.keperluan.trim(),
        timestamp: new Date().toISOString()
      };

      const channel = supabase.channel(`kiosk-notif-${tenantId}`);
      const doBroadcast = () => {
        channel.send({ type: 'broadcast', event: 'incoming-permohonan', payload });
        if (channel) setTimeout(() => supabase.removeChannel(channel), 1500);
        setIsSubmitting(false);
        setStep('waiting');
        showToast('Permohonan terkirim ke Tablet Kios. Menunggu tanda tangan warga...', 'info');
      };
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') doBroadcast();
      });
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
      showToast('Terjadi kesalahan saat mengirim ke Kios.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-700" />
            {step === 'form' ? 'Tambah Permohonan (Bantuan Admin)' : step === 'waiting' ? 'Menunggu Tanda Tangan di Kios' : 'Permohonan Selesai'}
          </h3>
          {step === 'form' && (
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {step === 'form' && (
          <>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  onClick={() => setSendingMode('kiosk')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${sendingMode === 'kiosk' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'}`}
                >
                  <div className={`p-2.5 rounded-xl ${sendingMode === 'kiosk' ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'} transition-colors`}>
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${sendingMode === 'kiosk' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-slate-300'}`}>Kirim ke Tablet Kiosk</div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">Untuk diperiksa & TTD langsung oleh warga</div>
                  </div>
                </button>

                <button
                  onClick={() => setSendingMode('inbox')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${sendingMode === 'inbox' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'}`}
                >
                  <div className={`p-2.5 rounded-xl ${sendingMode === 'inbox' ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'} transition-colors`}>
                    <Inbox className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${sendingMode === 'inbox' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-slate-300'}`}>Simpan Langsung ke Inbox</div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">Warga berhalangan / diwakilkan admin</div>
                  </div>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Cari Warga (NIK / Nama) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={lookupQuery}
                    onChange={(e) => { setLookupQuery(e.target.value); searchResidents(e.target.value); }}
                    placeholder="Ketik NIK atau nama warga..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                  />
                  {residentSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden">
                      {residentSuggestions.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => pickResident(r)}
                          className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                          <User className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{r.name}</div>
                            <div className="text-[11px] text-gray-400 font-mono">NIK: {r.nik}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">NIK Warga</label>
                  <input
                    type="tel" data-no-cap maxLength={16}
                    value={form.nik}
                    onChange={(e) => setForm(prev => ({ ...prev, nik: e.target.value.replace(/\D/g, '') }))}
                    placeholder="16 digit NIK..."
                    className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.nama}
                    onChange={(e) => setForm(prev => ({ ...prev, nama: capitalizeWords(e.target.value) }))}
                    placeholder="Nama warga..."
                    className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Jenis Surat <span className="text-red-500">*</span></label>
                <select
                  value={form.jenis}
                  onChange={(e) => setForm(prev => ({ ...prev, jenis: e.target.value }))}
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 cursor-pointer"
                >
                  <option value="">-- Pilih Jenis Surat --</option>
                  {letterTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>{lt.jenis}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Keperluan / Catatan Tambahan</label>
                <textarea
                  value={form.keperluan}
                  onChange={(e) => setForm(prev => ({ ...prev, keperluan: e.target.value }))}
                  placeholder="Contoh: Untuk persyaratan pendaftaran sekolah anak..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 resize-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-slate-900/50">
              <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-8 py-2.5 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${sendingMode === 'kiosk' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-500/20' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'}`}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : sendingMode === 'kiosk' ? <Monitor className="w-4 h-4" /> : <Inbox className="w-4 h-4" />}
                {sendingMode === 'kiosk' ? 'Kirim ke Tablet Kiosk' : 'Simpan ke Inbox'}
              </button>
            </div>
          </>
        )}

        {step === 'waiting' && (
          <div className="p-10 text-center space-y-4">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Monitor className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">Menunggu Verifikasi Warga</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              Permohonan atas nama <strong>{form.nama}</strong> telah dikirim ke Tablet Kios. Warga tinggal menekan <strong>"Setuju"</strong> dan membubuhkan tanda tangan digital. Halaman ini akan tertutup otomatis setelah warga selesai menandatangani.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="p-10 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">Permohonan Siap Diterbitkan</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              Warga telah menandatangani di Kios dan permohonan sudah masuk ke <strong>Inbox Permohonan</strong> untuk diproses.
            </p>
            <button
              onClick={onClose}
              className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}