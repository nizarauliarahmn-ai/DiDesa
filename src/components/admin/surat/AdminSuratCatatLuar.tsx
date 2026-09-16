import React, { useState, useEffect, useCallback } from 'react';
import { X, FileText, Search, CheckCircle2, Loader2, User, Calendar, Hash } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import { resolveCurrentTenant } from '../../../utils/tenantResolver';
import { showToast } from '../../../utils/toast';
import { fetchResidentsCached } from '../../../utils/apiCache';
import { getLetterClassifications, LetterClassification, generateLetterNumberAsync } from '../../../utils/letterClassifications';
import { normalizeNomorSurat } from '../../../services/penomoranSuratService';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AdminSuratCatatLuar({ onClose, onSuccess }: Props) {
  const [classifications, setClassifications] = useState<LetterClassification[]>([]);
  const [selectedKlasifikasi, setSelectedKlasifikasi] = useState('');
  const [nomorSurat, setNomorSurat] = useState('');
  const [generatingNomor, setGeneratingNomor] = useState(false);

  const [nik, setNik] = useState('');
  const [nama, setNama] = useState('');
  const [residentSuggestions, setResidentSuggestions] = useState<any[]>([]);
  const [lookupQuery, setLookupQuery] = useState('');

  const [tanggalSurat, setTanggalSurat] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [keperluan, setKeperluan] = useState('');
  const [keterangan, setKeterangan] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cls = getLetterClassifications().filter(c => c.isVisible !== false);
    setClassifications(cls);
    if (cls.length > 0) {
      setSelectedKlasifikasi(cls[0].klasifikasi);
    }
  }, []);

  // Generate nomor when classification or date changes
  const generateNomor = useCallback(async () => {
    const cls = classifications.find(c => c.klasifikasi === selectedKlasifikasi);
    if (!cls) return;
    setGeneratingNomor(true);
    try {
      const date = new Date(tanggalSurat);
      const nomor = await generateLetterNumberAsync(cls.klasifikasi, cls.kodeKlasifikasi, date);
      setNomorSurat(nomor);
    } catch (e) {
      console.error('Gagal generate nomor:', e);
    } finally {
      setGeneratingNomor(false);
    }
  }, [selectedKlasifikasi, tanggalSurat, classifications]);

  useEffect(() => {
    if (selectedKlasifikasi && classifications.length > 0) {
      generateNomor();
    }
  }, [selectedKlasifikasi, tanggalSurat, generateNomor, classifications]);

  // Resident search
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
    setNik(r.nik || '');
    setNama(r.name || '');
    setResidentSuggestions([]);
    setLookupQuery('');
  };

  const handleSave = async () => {
    if (!selectedKlasifikasi) { showToast('Jenis surat wajib dipilih.', 'error'); return; }
    if (!nomorSurat.trim()) { showToast('Nomor surat belum digenerate.', 'error'); return; }
    if (!nama.trim()) { showToast('Nama pemohon wajib diisi.', 'error'); return; }
    if (!keperluan.trim()) { showToast('Keperluan wajib diisi.', 'error'); return; }

    setSaving(true);
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) { showToast('Tenant tidak ditemukan.', 'error'); setSaving(false); return; }

      const cls = classifications.find(c => c.klasifikasi === selectedKlasifikasi);
      const insertData: any = {
        tenant_id: tenantId,
        nomor: normalizeNomorSurat(nomorSurat),
        jenis_surat: cls?.jenis || selectedKlasifikasi,
        nik: nik || null,
        nama: nama,
        keterangan: keperluan,
        status: 'Selesai',
        data: {
          keteranganTambahan: keterangan || '',
          catatanLuar: true,
          tanggalSurat: tanggalSurat,
          namaPejabat: '',
          jabatanPejabat: ''
        }
      };

      // Custom date
      if (tanggalSurat) {
        const parsedDate = new Date(tanggalSurat);
        if (!isNaN(parsedDate.getTime())) {
          insertData.created_at = parsedDate.toISOString();
        }
      }

      const { error } = await supabase.from('surat').insert([insertData]);
      if (error) throw error;

      showToast(`Surat ${nomorSurat} berhasil dicatat.`, 'success');
      onSuccess?.();
      onClose();
    } catch (e: any) {
      console.error('Gagal menyimpan surat:', e);
      showToast('Gagal menyimpan: ' + (e.message || e), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
            <span className="p-2 rounded-lg bg-amber-50 border border-amber-100">
              <FileText className="w-5 h-5 text-amber-600" />
            </span>
            Catat Surat Luar
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-3 rounded-xl text-sm border border-amber-200 dark:border-amber-800">
            Catat surat fisik yang dibuat di luar sistem. Surat akan mendapat nomor otomatis dan masuk ke arsip.
          </div>

          {/* Jenis Surat */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Jenis Surat <span className="text-red-500">*</span></label>
            <select
              value={selectedKlasifikasi}
              onChange={(e) => setSelectedKlasifikasi(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            >
              {classifications.map(c => (
                <option key={c.klasifikasi} value={c.klasifikasi}>
                  {c.jenis} ({c.klasifikasi})
                </option>
              ))}
            </select>
          </div>

          {/* Nomor Surat (Auto-generated) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Nomor Surat</label>
            <div className="relative">
              <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={generatingNomor ? 'Generating...' : nomorSurat}
                readOnly
                placeholder="Otomatis..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-mono font-bold text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Tanggal Surat */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Tanggal Surat</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={tanggalSurat}
                onChange={(e) => setTanggalSurat(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Pencarian Warga */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Cari Warga (NIK / Nama)</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => { setLookupQuery(e.target.value); searchResidents(e.target.value); }}
                placeholder="Ketik NIK atau nama warga..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
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

          {/* NIK */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">NIK</label>
            <input
              type="tel" data-no-cap maxLength={16}
              value={nik}
              onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
              placeholder="16 digit NIK..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-mono text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
            />
          </div>

          {/* Nama Pemohon */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Nama Pemohon <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama lengkap pemohon..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
            />
          </div>

          {/* Keperluan */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Keperluan <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={keperluan}
              onChange={(e) => setKeperluan(e.target.value)}
              placeholder="Contoh: Pengurusan Tanah, Persyaratan Nikah..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
            />
          </div>

          {/* Keterangan Tambahan */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Keterangan (Opsional)</label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Catatan tambahan..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || generatingNomor}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Catat Surat'}
          </button>
        </div>
      </div>
    </div>
  );
}