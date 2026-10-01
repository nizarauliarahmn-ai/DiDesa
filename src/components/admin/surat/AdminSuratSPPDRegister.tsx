import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, X, CheckCircle2, Plus, Lock, Banknote, Download, Printer } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { fetchLetterHistoryAsync, updateLetterHistoryAsync, LetterHistory } from '../../../utils/letterHistory';
import { showToast } from '../../../utils/toast';

// Syarat SPJ versi lapangan (lihat diskusi): UNDANGAN boleh N/A.
const SPJ_ITEMS = [
  { key: 'suratTugas', label: 'SURAT TUGAS' },
  { key: 'sppdTtd', label: 'SPPD BER-TTD LENGKAP' },
  { key: 'undangan', label: 'UNDANGAN (JIKA ADA)' },
  { key: 'laporan', label: 'LAPORAN TERTULIS' },
  { key: 'foto', label: 'FOTO' },
  { key: 'buktiLain', label: 'BUKTI LAIN' },
] as const;

type SpjKey = typeof SPJ_ITEMS[number]['key'];
type SpjState = 'belum' | 'ada' | 'na';

interface CairItem {
  tgl: string;
  nominal: number;
  ket: string;
}

interface TripRow {
  letterId: string;
  nomor: string;
  nama: string;
  nip: string;
  personKey: string;
  tujuan: string;
  maksud: string;
  tglBerangkat: string;
  tglKembali: string;
  tglSurat: string;
  spj: Record<SpjKey, SpjState>;
  cair: CairItem[];
}

const normKey = (s: any) => String(s || '').trim().toUpperCase();
const emptySpj = (): Record<SpjKey, SpjState> => ({
  suratTugas: 'belum', sppdTtd: 'belum', undangan: 'belum',
  laporan: 'belum', foto: 'belum', buktiLain: 'belum',
});
const normSpj = (raw: any): Record<SpjKey, SpjState> => {
  const base = emptySpj();
  if (raw && typeof raw === 'object') {
    (Object.keys(base) as SpjKey[]).forEach(k => {
      if (raw[k] === 'ada' || raw[k] === 'na') base[k] = raw[k];
    });
  }
  return base;
};

const spjOkCount = (spj: Record<SpjKey, SpjState>) =>
  SPJ_ITEMS.filter(i => spj[i.key] === 'ada' || spj[i.key] === 'na').length;
const isLayakCair = (row: TripRow) => spjOkCount(row.spj) === SPJ_ITEMS.length;

const fmtRp = (n: number) => 'Rp' + (Number(n) || 0).toLocaleString('id-ID');
const fmtTgl = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};
const monthOf = (iso: string, fallback: string) => {
  const src = iso || fallback || '';
  const m = src.match(/^(\d{4}-\d{2})/);
  if (m) return m[1];
  const d = new Date(src);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function expandTrips(letters: LetterHistory[]): TripRow[] {
  const rows: TripRow[] = [];
  letters.forEach(l => {
    const j = (l.jenis || '').toLowerCase();
    if (!(j.includes('sppd') || j.includes('perjalanan dinas') || j.includes('surat tugas'))) return;
    const d: any = l.data || {};
    const reg: Record<string, any> = d.sppdRegister || {};
    const plist: any[] = Array.isArray(d.pelaksanaList) && d.pelaksanaList.length > 0
      ? d.pelaksanaList
      : [{ nama: l.nama, nip: l.nik }];
    plist.forEach((p: any) => {
      const nama = String(p?.nama || l.nama || '-').toUpperCase();
      const nip = String(p?.nip || '').trim();
      const personKey = normKey(nip) || normKey(nama);
      const entry = reg[personKey] || {};
      rows.push({
        letterId: l.id,
        nomor: l.nomor || '-',
        nama,
        nip,
        personKey,
        tujuan: String(d.tempatTujuan || '-'),
        maksud: String(d.maksudPerjalanan || l.keperluan || '-'),
        tglBerangkat: String(d.tanggalBerangkat || ''),
        tglKembali: String(d.tanggalKembali || ''),
        tglSurat: String(l.tanggal || ''),
        spj: normSpj(entry.spj),
        cair: Array.isArray(entry.cair) ? entry.cair : [],
      });
    });
  });
  return rows;
}

export default function AdminSuratSPPDRegister({ onBack, onBuatSPPD }: { onBack: () => void; onBuatSPPD: () => void }) {
  const [letters, setLetters] = useState<LetterHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [qNama, setQNama] = useState('');
  const [qBulan, setQBulan] = useState('');
  const [qSpj, setQSpj] = useState<'semua' | 'layak' | 'belum'>('semua');
  const [spjTarget, setSpjTarget] = useState<TripRow | null>(null);
  const [spjDraft, setSpjDraft] = useState<Record<SpjKey, SpjState>>(emptySpj());
  const [cairTarget, setCairTarget] = useState<TripRow | null>(null);
  const [cairTgl, setCairTgl] = useState(() => new Date().toISOString().slice(0, 10));
  const [cairNominal, setCairNominal] = useState('');
  const [cairKet, setCairKet] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      setLetters(await fetchLetterHistoryAsync());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const persistRow = async (row: TripRow, patch: { spj?: Record<SpjKey, SpjState>; cair?: CairItem[] }) => {
    const letter = letters.find(l => l.id === row.letterId);
    if (!letter) { showToast('Data surat tidak ditemukan, muat ulang halaman.', 'error'); return false; }
    const d: any = { ...(letter.data || {}) };
    const reg: Record<string, any> = { ...(d.sppdRegister || {}) };
    const prev = reg[row.personKey] || {};
    reg[row.personKey] = {
      ...prev,
      ...(patch.spj ? { spj: patch.spj } : {}),
      ...(patch.cair ? { cair: patch.cair } : {}),
    };
    d.sppdRegister = reg;
    setSaving(true);
    try {
      const fresh = await updateLetterHistoryAsync(row.letterId, { data: d });
      if (fresh && fresh.length > 0) setLetters(fresh);
      else await reload();
      return true;
    } catch (e: any) {
      showToast(e?.message || 'Gagal menyimpan.', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => expandTrips(letters), [letters]);

  const filtered = useMemo(() => {
    const q = qNama.trim().toUpperCase();
    return rows.filter(r => {
      if (q && !(r.nama.includes(q) || (r.nip || '').toUpperCase().includes(q))) return false;
      if (qBulan) {
        const m = monthOf(r.tglBerangkat, r.tglSurat);
        if (m !== qBulan) return false;
      }
      if (qSpj === 'layak' && !isLayakCair(r)) return false;
      if (qSpj === 'belum' && isLayakCair(r)) return false;
      return true;
    });
  }, [rows, qNama, qBulan, qSpj, letters]);

  const totalNominal = useMemo(() => filtered.reduce((s, r) => s + r.cair.reduce((a, c) => a + (Number(c.nominal) || 0), 0), 0), [filtered]);
  const layakCount = useMemo(() => filtered.filter(isLayakCair).length, [filtered]);
  const cairCount = useMemo(() => filtered.reduce((s, r) => s + r.cair.length, 0), [filtered]);

  const periodeText = (r: TripRow) =>
    r.tglBerangkat ? (fmtTgl(r.tglBerangkat) + (r.tglKembali ? ` - ${fmtTgl(r.tglKembali)}` : '')) : (r.tglSurat || '-');
  const spjText = (r: TripRow) =>
    `${spjOkCount(r.spj)}/${SPJ_ITEMS.length}${isLayakCair(r) ? ' Layak Cair' : ''}`;
  const cairText = (r: TripRow) =>
    `${r.cair.length}x • ${fmtRp(r.cair.reduce((a, c) => a + (Number(c.nominal) || 0), 0))}`;

  const exportExcel = () => {
    if (filtered.length === 0) { showToast('Tidak ada data untuk di-export.', 'error'); return; }
    const rows = filtered.map((r, i) => ({
      'No': i + 1,
      'Nama Pelaksana': r.nama,
      'NIP': r.nip || '-',
      'No. SPPD': r.nomor,
      'Tujuan': r.tujuan,
      'Maksud': r.maksud,
      'Periode': periodeText(r),
      'SPJ': spjText(r),
      'Pencairan': cairText(r),
    }));
    const ws = utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 40 }, { wch: 22 }, { wch: 16 }, { wch: 22 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Register SPPD');
    writeFile(wb, `register-sppd-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('File Excel berhasil diunduh.', 'success');
  };

  const exportPrint = () => {
    if (filtered.length === 0) { showToast('Tidak ada data untuk dicetak.', 'error'); return; }
    const namaDesa = (localStorage.getItem('kop_desa') || localStorage.getItem('village_name') || 'Wasah Hilir').replace(/^(desa)\s+/i, '').trim();
    const namaKec = (localStorage.getItem('kop_kecamatan') || localStorage.getItem('village_kecamatan') || 'Simpur').replace(/^(kecamatan)\s+/i, '').trim();
    const rowsHtml = filtered.map((r, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td><b>${r.nama}</b>${r.nip ? `<br><span style="font-size:9px">${r.nip}</span>` : ''}</td>
        <td style="white-space:nowrap">${r.nomor}</td>
        <td>${r.tujuan}<br><span style="font-size:9px;color:#555">${r.maksud}</span></td>
        <td style="white-space:nowrap">${periodeText(r)}</td>
        <td style="text-align:center">${spjOkCount(r.spj)}/${SPJ_ITEMS.length}${isLayakCair(r) ? ' ✓' : ''}</td>
        <td style="text-align:right;white-space:nowrap">${cairText(r)}</td>
      </tr>
    `).join('');
    const doc = `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8" /><title>Buku Register SPPD</title>
<style>
@page { size: A4 landscape; margin: 15mm; } * { box-sizing: border-box; }
body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 20px; }
h1 { text-align: center; font-size: 16px; margin-bottom: 2px; }
.sub { text-align: center; font-size: 12px; font-weight: bold; margin: 0 0 2px; }
.sum { text-align: center; font-size: 10px; margin: 0 0 4px; }
table { width: 100%; border-collapse: collapse; margin-top: 12px; table-layout: auto; }
th, td { border: 1px solid #333; padding: 6px 8px; font-size: 10px; }
th { background: #f0f0f0; font-weight: bold; }
tfoot td { border-top: 2px solid #333; font-weight: bold; background: #f9f9f9; }
@media print { body { padding: 0; } }
</style></head><body>
<h1>BUKU REGISTER SPPD</h1>
<p class="sub">DESA ${namaDesa.toUpperCase()} &mdash; KECAMATAN ${namaKec.toUpperCase()}</p>
<p class="sum">Total ${filtered.length} perjalanan • ${cairCount} kali pencairan • ${fmtRp(totalNominal)}</p>
<table><thead><tr>
<th style="width:30px">No</th><th>Pelaksana</th><th>No. SPPD</th><th>Tujuan / Maksud</th>
<th>Periode</th><th>SPJ</th><th>Pencairan</th>
</tr></thead><tbody>${rowsHtml}</tbody></table>
<script>window.onload = function () { window.print(); };</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(doc); w.document.close(); }
  };

  const openSpj = (row: TripRow) => {
    setSpjTarget(row);
    setSpjDraft({ ...row.spj });
  };
  const saveSpj = async () => {
    if (!spjTarget) return;
    const ok = await persistRow(spjTarget, { spj: spjDraft });
    if (ok) {
      showToast('Checklist SPJ disimpan.', 'success');
      setSpjTarget(null);
    }
  };

  const openCair = (row: TripRow) => {
    if (!isLayakCair(row)) {
      showToast('SPJ belum lengkap — lengkapi dulu sebelum mencairkan.', 'error');
      return;
    }
    setCairTarget(row);
    setCairTgl(new Date().toISOString().slice(0, 10));
    setCairNominal('');
    setCairKet('');
  };
  const saveCair = async () => {
    if (!cairTarget) return;
    const nominal = Number(String(cairNominal).replace(/[^0-9]/g, '')) || 0;
    if (nominal <= 0) { showToast('Nominal pencairan harus lebih dari 0.', 'error'); return; }
    const ok = await persistRow(cairTarget, { cair: [...cairTarget.cair, { tgl: cairTgl, nominal, ket: cairKet.trim() }] });
    if (ok) {
      showToast('Pencairan dicatat.', 'success');
      setCairTarget(null);
    }
  };

  return (
    <div className="pb-24 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Buku Register SPPD</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Siapa — kemana — apa • berapa kali • total • kelayakan cair (SPJ)</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Unduh data tampil sebagai Excel"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={exportPrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Cetak register tampil sebagai PDF"
          >
            <Printer size={14} /> Cetak
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700" />
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Kembali
          </button>
          <button
            onClick={onBuatSPPD}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Plus size={14} /> Buat SPPD
          </button>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Perjalanan', value: String(filtered.length) },
          { label: 'Total Nominal Cair', value: fmtRp(totalNominal) },
          { label: 'Layak Cair', value: String(layakCount) },
          { label: 'SPJ Belum Lengkap', value: String(filtered.length - layakCount) },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">{c.value}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{c.label}</p>
          </div>
        ))}
        <div className="col-span-2 lg:col-span-4 text-xs text-gray-500 dark:text-slate-400">
          Pencairan: {cairCount} kali pada data tampil.
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={qNama}
            onChange={e => setQNama(e.target.value)}
            placeholder="Cari nama / NIP pelaksana..."
            className="w-full pl-10 pr-4 h-10 border border-gray-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-emerald-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
          />
        </div>
        <input
          type="month"
          value={qBulan}
          onChange={e => setQBulan(e.target.value)}
          title="Filter bulan berangkat"
          className="h-10 px-3 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-emerald-500"
        />
        <select
          value={qSpj}
          onChange={e => setQSpj(e.target.value as any)}
          className="h-10 px-3 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-semibold bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none"
        >
          <option value="semua">Semua SPJ</option>
          <option value="layak">Layak Cair</option>
          <option value="belum">Belum Lengkap</option>
        </select>
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase whitespace-nowrap">Pelaksana</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase whitespace-nowrap">No. SPPD</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Tujuan / Maksud</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase whitespace-nowrap">Periode</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase whitespace-nowrap">SPJ</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase whitespace-nowrap">Pencairan</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">Memuat register...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                  {rows.length === 0 ? 'Belum ada SPPD tercatat.' : 'Tidak ada yang cocok dengan filter.'}
                </td></tr>
              ) : filtered.map(r => {
                const ok = spjOkCount(r.spj);
                const layak = isLayakCair(r);
                const totCair = r.cair.reduce((a, c) => a + (Number(c.nominal) || 0), 0);
                const rowKey = `${r.letterId}::${r.personKey}`;
                return (
                  <tr key={rowKey} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">{r.nama}</p>
                      {r.nip && <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono">{r.nip}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-300 whitespace-nowrap">{r.nomor}</td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <p className="text-xs font-bold text-gray-800 dark:text-slate-100 truncate" title={r.tujuan}>{r.tujuan}</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate" title={r.maksud}>{r.maksud}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-300 whitespace-nowrap">
                      {r.tglBerangkat ? fmtTgl(r.tglBerangkat) : (r.tglSurat || '-')}
                      {r.tglBerangkat && r.tglKembali ? ` – ${fmtTgl(r.tglKembali)}` : ''}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${layak
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'}`}>
                        {layak && <CheckCircle2 className="w-3 h-3" />}
                        {layak ? 'Layak Cair' : `${ok}/6`}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{r.cair.length}× • {fmtRp(totCair)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openSpj(r)}
                          className="px-3 py-1.5 text-[11px] font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          SPJ
                        </button>
                        <button
                          onClick={() => openCair(r)}
                          disabled={!layak}
                          title={layak ? 'Catat pencairan' : 'SPJ belum lengkap — lengkapi dulu'}
                          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                        >
                          {!layak && <Lock size={12} />}
                          Cair
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal SPJ */}
      {spjTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/50" onClick={() => setSpjTarget(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Checklist SPJ</h3>
              <button onClick={() => setSpjTarget(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"><X size={16} /></button>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">{spjTarget.nama} • {spjTarget.nomor}</p>
            <div className="space-y-2">
              {SPJ_ITEMS.map(it => {
                const st = spjDraft[it.key];
                return (
                  <div key={it.key} className="flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <button
                      onClick={() => setSpjDraft(d => ({ ...d, [it.key]: d[it.key] === 'ada' ? 'belum' : 'ada' }))}
                      className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-slate-100 cursor-pointer min-w-0"
                    >
                      <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${st === 'ada' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 dark:border-slate-600 text-transparent'}`}>
                        <CheckCircle2 size={14} />
                      </span>
                      <span className="truncate">{it.label}</span>
                    </button>
                    <button
                      onClick={() => setSpjDraft(d => ({ ...d, [it.key]: d[it.key] === 'na' ? 'belum' : 'na' }))}
                      title="Tidak berlaku / tidak ada"
                      className={`text-[10px] font-bold px-2 py-1 rounded-md border cursor-pointer shrink-0 ${st === 'na'
                        ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900'
                        : 'text-gray-400 border-gray-200 dark:border-slate-700 hover:text-gray-600'}`}
                    >
                      N/A
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-3">
              Terpenuhi {spjOkCount(spjDraft)}/6 → {spjOkCount(spjDraft) === SPJ_ITEMS.length
                ? <span className="font-bold text-emerald-600">Layak Cair</span>
                : <span className="font-bold text-amber-600">Belum Lengkap</span>}
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setSpjTarget(null)} className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer">Batal</button>
              <button
                onClick={saveSpj}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pencairan */}
      {cairTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/50" onClick={() => setCairTarget(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5"><Banknote size={15} /> Catat Pencairan</h3>
              <button onClick={() => setCairTarget(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"><X size={16} /></button>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">{cairTarget.nama} • {cairTarget.nomor} • SPJ lengkap ✓</p>
            {cairTarget.cair.length > 0 && (
              <div className="mb-4 max-h-32 overflow-y-auto border border-gray-100 dark:border-slate-800 rounded-lg divide-y divide-gray-100 dark:divide-slate-800">
                {cairTarget.cair.map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-gray-500 dark:text-slate-400">{fmtTgl(c.tgl)}{c.ket ? ` • ${c.ket}` : ''}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{fmtRp(c.nominal)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-1">
                <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Tanggal</label>
                <input type="date" value={cairTgl} onChange={e => setCairTgl(e.target.value)} className="w-full h-10 px-3 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none" />
              </div>
              <div className="col-span-1">
                <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Nominal (Rp)</label>
                <input type="text" inputMode="numeric" value={cairNominal} onChange={e => setCairNominal(e.target.value)} placeholder="cth: 1500000" className="w-full h-10 px-3 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none" />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Keterangan</label>
              <input type="text" value={cairKet} onChange={e => setCairKet(e.target.value)} placeholder="cth: Tahap 1 / Lunas" className="w-full h-10 px-3 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setCairTarget(null)} className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer">Batal</button>
              <button
                onClick={saveCair}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
              >
                <Plus size={14} /> Simpan Pencairan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
