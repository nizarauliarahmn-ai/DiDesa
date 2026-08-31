import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Table, Minus, ArrowLeft, Printer, Save,
  Undo2, Redo2, Indent, Outdent, RemoveFormatting, Hash, User, Calendar, FileSignature
} from 'lucide-react';
import { generateKopSuratHTML } from '../../../utils/letterFormat';
import { getLetterClassifications, generateLetterNumberAsync } from '../../../utils/letterClassifications';
import { resolveKadesName, getOfficerOptions } from '../../../utils/letterOfficers';
import TemplatePickerModal, { type LetterTemplate } from './TemplatePickerModal';
import { addLetterHistory } from '../../../utils/letterHistory';
import { showToast } from '../../../utils/toast';

const FONT_SIZES = ['10', '11', '12', '14', '16', '18', '20', '24'];
const FONT_FAMILIES = ['Arial, sans-serif', 'Times New Roman, serif', 'Georgia, serif', 'Calibri, sans-serif', 'Courier New, monospace'];

type SignatureLayout = 'kades_only' | 'kades_rt' | 'kades_bpd' | 'kades_rw' | 'kades_rw_rt' | 'custom';

const LAYOUT_OPTIONS: { value: SignatureLayout; label: string }[] = [
  { value: 'kades_only', label: 'Kepala Desa Saja' },
  { value: 'kades_rt', label: 'Kepala Desa + Ketua RT' },
  { value: 'kades_bpd', label: 'Kepala Desa + BPD' },
  { value: 'kades_rw', label: 'Kepala Desa + Ketua RW' },
  { value: 'kades_rw_rt', label: 'Kepala Desa + RW + RT' },
  { value: 'custom', label: 'Custom (Atur Sendiri)' },
];

function execCmd(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

function formatDateID(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function CustomLetterEditor({ onBack }: { onBack: () => void }) {
  const [showPicker, setShowPicker] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<LetterTemplate | null>(null);
  const [letterTitle, setLetterTitle] = useState('');
  const [nomorSurat, setNomorSurat] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentFont, setCurrentFont] = useState('Arial, sans-serif');
  const [currentFontSize, setCurrentFontSize] = useState('12');
  const editorRef = useRef<HTMLDivElement>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [tableGridSize, setTableGridSize] = useState({ rows: 3, cols: 3 });
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sigLayout, setSigLayout] = useState<SignatureLayout>('kades_only');
  const [kadesName, setKadesName] = useState(() => localStorage.getItem('village_super_admin') || resolveKadesName() || '');
  const [kadesJabatan, setKadesJabatan] = useState(() => localStorage.getItem('village_super_admin_role') || 'Kepala Desa');
  const [rtName, setRtName] = useState('');
  const [rwName, setRwName] = useState('');
  const [bpdName, setBpdName] = useState('');
  const [custom1Label, setCustom1Label] = useState('');
  const [custom1Name, setCustom1Name] = useState('');
  const [custom2Label, setCustom2Label] = useState('');
  const [custom2Name, setCustom2Name] = useState('');

  const pushHistory = useCallback((html: string) => {
    setHistoryStack(prev => {
      const newStack = prev.slice(0, historyIndex + 1);
      newStack.push(html);
      if (newStack.length > 50) newStack.shift();
      return newStack;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0 && editorRef.current) {
      editorRef.current.innerHTML = historyStack[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
    }
  }, [historyIndex, historyStack]);

  const handleRedo = useCallback(() => {
    if (historyIndex < historyStack.length - 1 && editorRef.current) {
      editorRef.current.innerHTML = historyStack[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
    }
  }, [historyIndex, historyStack]);

  const recordChange = useCallback(() => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      if (editorRef.current) pushHistory(editorRef.current.innerHTML);
    }, 500);
  }, [pushHistory]);

  useEffect(() => {
    return () => { if (historyTimerRef.current) clearTimeout(historyTimerRef.current); };
  }, []);

  useEffect(() => {
    const configs = getLetterClassifications();
    const custom = configs.find(c => c.klasifikasi === 'UND' || c.klasifikasi === '005') || configs[0];
    if (custom) {
      generateLetterNumberAsync(custom.klasifikasi, custom.kodeKlasifikasi || '005')
        .then(generatedNo => setNomorSurat(generatedNo))
        .catch(() => setNomorSurat(`001/005/${new Date().getFullYear()}`));
    }
  }, []);

  useEffect(() => {
    const officers = getOfficerOptions();
    const rt = officers.find(o => o.role.toLowerCase().includes('rt'));
    if (rt && !rtName) setRtName(rt.name);
    const rw = officers.find(o => o.role.toLowerCase().includes('rw'));
    if (rw && !rwName) setRwName(rw.name);
  }, []);

  const handleSelectTemplate = (tpl: LetterTemplate) => {
    setActiveTemplate(tpl);
    setLetterTitle(tpl.label);
    setShowPicker(false);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = tpl.content;
        pushHistory(tpl.content);
      }
    }, 100);
  };

  const insertTable = (rows: number, cols: number) => {
    execCmd('insertHTML', `<table style="width:100%;border-collapse:collapse;margin:12px 0;border:1px solid #d1d5db;" class="editor-table"><tbody>${
      Array(rows).fill(0).map(() =>
        `<tr>${Array(cols).fill(0).map(() =>
          `<td style="border:1px solid #d1d5db;padding:8px;min-width:60px;">&nbsp;</td>`
        ).join('')}</tr>`
      ).join('')
    }</tbody></table><p>&nbsp;</p>`);
    setShowTableGrid(false);
    recordChange();
  };

  const buildSignatureBlock = (): string => {
    const tgl = formatDateID(tanggalSurat);
    const desaName = (localStorage.getItem('kop_desa') || 'Desa').replace(/^(desa|kelurahan)\s+/i, '').trim();

    const col = (label: string, name: string, opts?: { subtitle?: string }) => `
      <td style="width:${sigLayout === 'kades_only' ? '100' : '50'}%;vertical-align:top;border:none;padding:0;text-align:center;">
        ${opts?.subtitle ? `<p style="margin:0 0 4px 0;font-size:12pt;">${opts.subtitle}</p>` : ''}
        <p style="margin:0 0 4px 0;font-size:12pt;">Mengetahui,</p>
        <p style="margin:10px 0 0 0;font-size:12pt;">&nbsp;</p>
        <p style="margin:10px 0 0 0;font-size:12pt;">&nbsp;</p>
        <p style="margin:10px 0 0 0;font-size:12pt;font-weight:bold;text-decoration:underline;text-transform:uppercase;">${label}</p>
        <p style="margin:2px 0 0 0;font-size:10pt;">${name}</p>
      </td>`;

    const kadesCol = `
      <td style="width:${sigLayout === 'kades_only' ? '100' : '50'}%;vertical-align:top;border:none;padding:0;text-align:center;">
        <p style="margin:0;font-size:12pt;">${desaName}, ${tgl}</p>
        <p style="margin:0;font-size:12pt;">${kadesJabatan},</p>
        <p style="margin:10px 0 0 0;font-size:12pt;">&nbsp;</p>
        <p style="margin:10px 0 0 0;font-size:12pt;">&nbsp;</p>
        <p style="margin:10px 0 0 0;font-size:12pt;font-weight:bold;text-decoration:underline;text-transform:uppercase;">${kadesName}</p>
      </td>`;

    let leftCells = '';
    let rightCells = kadesCol;

    switch (sigLayout) {
      case 'kades_only':
        leftCells = '';
        break;
      case 'kades_rt':
        leftCells = col('Ketua RT', rtName || '................................');
        break;
      case 'kades_bpd':
        leftCells = col('Ketua BPD', bpdName || '................................');
        break;
      case 'kades_rw':
        leftCells = col('Ketua RW', rwName || '................................');
        break;
      case 'kades_rw_rt':
        leftCells = `
          <td style="width:50%;vertical-align:top;border:none;padding:0;">
            <table style="width:100%;border-collapse:collapse;border:none;">
              <tr>
                <td style="width:50%;vertical-align:top;border:none;padding:0;text-align:center;">
                  ${col('Ketua RW', rwName || '................................')}
                </td>
                <td style="width:50%;vertical-align:top;border:none;padding:0;text-align:center;">
                  ${col('Ketua RT', rtName || '................................')}
                </td>
              </tr>
            </table>
          </td>`;
        rightCells = kadesCol;
        break;
      case 'custom':
        const leftParts: string[] = [];
        if (custom1Label) leftParts.push(col(custom1Label, custom1Name || '................................'));
        if (custom2Label) leftParts.push(col(custom2Label, custom2Name || '................................'));
        leftCells = leftParts.length > 0
          ? `<td style="width:50%;vertical-align:top;border:none;padding:0;"><table style="width:100%;border-collapse:collapse;border:none;"><tr>${leftParts.map(p => `<td style="width:${100 / leftParts.length}%;vertical-align:top;border:none;padding:0;">${p}</td>`).join('')}</tr></table></td>`
          : '';
        rightCells = kadesCol;
        break;
    }

    if (sigLayout === 'kades_only') {
      return `<div style="margin-top:24px;"><table style="width:100%;border-collapse:collapse;border:none;"><tr>${kadesCol}</tr></table></div>`;
    }

    return `<div style="margin-top:24px;"><table style="width:100%;border-collapse:collapse;border:none;"><tr>${leftCells}${rightCells}</tr></table></div>`;
  };

  const buildSignatureBlockCanvas = () => {
    const tgl = formatDateID(tanggalSurat);
    const desaName = (localStorage.getItem('kop_desa') || 'Desa').replace(/^(desa|kelurahan)\s+/i, '').trim();

    const sigCell = (label: string, name: string, width = '50%') => (
      <td style={{ width, verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'center' }}>
        <p style={{ margin: '0 0 4px 0' }}>Mengetahui,</p>
        <p style={{ margin: '40px 0 0 0', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>{label}</p>
        <p style={{ margin: '2px 0 0 0', fontSize: '10pt' }}>{name || '................................'}</p>
      </td>
    );

    const kadesCell = (width = '50%') => (
      <td style={{ width, verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'center' }}>
        <p style={{ margin: 0 }}>{desaName}, {tgl}</p>
        <p style={{ margin: 0 }}>{kadesJabatan},</p>
        <p style={{ margin: '40px 0 0 0', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>{kadesName}</p>
      </td>
    );

    if (sigLayout === 'kades_only') {
      return <div style={{ marginTop: '24px' }}><table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}><tbody><tr>{kadesCell('100%')}</tr></tbody></table></div>;
    }

    if (sigLayout === 'kades_rw_rt') {
      return (
        <div style={{ marginTop: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}><tbody><tr>
            <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}><tbody><tr>
                <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px 0' }}>Mengetahui,</p>
                  <p style={{ margin: '40px 0 0 0', fontWeight: 'bold', textDecoration: 'underline' }}>Ketua RW</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '10pt' }}>{rwName || '................................'}</p>
                </td>
                <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px 0' }}>Mengetahui,</p>
                  <p style={{ margin: '40px 0 0 0', fontWeight: 'bold', textDecoration: 'underline' }}>Ketua RT</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '10pt' }}>{rtName || '................................'}</p>
                </td>
              </tr></tbody></table>
            </td>
            {kadesCell()}
          </tr></tbody></table>
        </div>
      );
    }

    let leftContent = null;
    switch (sigLayout) {
      case 'kades_rt': leftContent = sigCell('Ketua RT', rtName); break;
      case 'kades_bpd': leftContent = sigCell('Ketua BPD', bpdName); break;
      case 'kades_rw': leftContent = sigCell('Ketua RW', rwName); break;
      case 'custom':
        leftContent = (
          <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}><tbody><tr>
              {custom1Label && <td style={{ width: custom2Label ? '50%' : '100%', verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px 0' }}>Mengetahui,</p>
                <p style={{ margin: '40px 0 0 0', fontWeight: 'bold', textDecoration: 'underline' }}>{custom1Label}</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '10pt' }}>{custom1Name || '................................'}</p>
              </td>}
              {custom2Label && <td style={{ width: custom1Label ? '50%' : '100%', verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px 0' }}>Mengetahui,</p>
                <p style={{ margin: '40px 0 0 0', fontWeight: 'bold', textDecoration: 'underline' }}>{custom2Label}</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '10pt' }}>{custom2Name || '................................'}</p>
              </td>}
            </tr></tbody></table>
          </td>
        );
        break;
    }

    return <div style={{ marginTop: '24px' }}><table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}><tbody><tr>{leftContent}{kadesCell()}</tr></tbody></table></div>;
  };

  const handlePrint = () => {
    const content = editorRef.current?.innerHTML;
    if (!content || !printFrameRef.current) return;

    const kopSurat = generateKopSuratHTML();
    const globalFooter = localStorage.getItem('global_print_footer') ||
      'Dokumen ini dibuat &amp; dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia';
    const letterFont = localStorage.getItem('village_letter_font') || currentFont;

    const doc = printFrameRef.current.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><title>${letterTitle || 'Surat'}</title>
      <style>
        @page{size:A4;margin:0}
        *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}
        html,body{margin:0;padding:0}
        body{font-family:${letterFont};font-size:12pt;color:#000;padding:2cm 2.5cm;background:white}
        table{border-collapse:collapse}
        td,th{border:1px solid #d1d5db}
        .editor-table td{border:1px solid #d1d5db;padding:8px}
        .global-footer{border-top:0.5px solid #cbd5e1;padding-top:5px;font-family:Inter,sans-serif;line-height:1.5;font-size:8px;color:#94a3b8;text-align:left;margin-top:24px}
        ul,ol{margin:8px 0 8px 20px} li{margin:4px 0} p{margin:0 0 8px 0}
        h1,h2,h3,h4,h5,h6{margin:0 0 8px 0}
        strong,b{font-weight:bold} em,i{font-style:italic} u{text-decoration:underline}
        hr{border:none;border-top:1px solid #d1d5db;margin:12px 0}
      </style></head><body>
      ${kopSurat}
      <p style="text-align:center;font-weight:bold;text-decoration:underline;font-size:14pt;text-transform:uppercase;margin:0 0 4px 0;">${letterTitle || 'SURAT'}</p>
      <p style="text-align:center;margin:0 0 16px 0;">Nomor: ${nomorSurat}</p>
      <div>${content}</div>
      ${buildSignatureBlock()}
      <div class="global-footer">${globalFooter}</div>
    </body></html>`);
    doc.close();

    setTimeout(() => {
      printFrameRef.current?.contentWindow?.focus();
      printFrameRef.current?.contentWindow?.print();
    }, 500);
  };

  const handleSaveDraft = () => {
    const content = editorRef.current?.innerHTML || '';
    addLetterHistory({
      nomor: nomorSurat || `draft/${new Date().getFullYear()}`,
      jenis: letterTitle || 'Surat Manual',
      penerima: '',
      status: 'draft',
      tanggal: new Date().toISOString(),
      data: { title: letterTitle, content, nomorSurat, kadesName, sigLayout },
    });
    showToast('Draft surat berhasil disimpan!', 'success');
  };

  const ToolbarButton = ({ cmd, icon, title, onClick }: {
    cmd?: string; icon: React.ReactNode; title: string; onClick?: () => void;
  }) => (
    <button type="button" title={title}
      onClick={onClick || (() => { execCmd(cmd!); recordChange(); })}
      className="p-1.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-all"
    >{icon}</button>
  );

  const desaName = (localStorage.getItem('kop_desa') || 'Desa').replace(/^(desa|kelurahan)\s+/i, '').trim();
  const kecamatan = (localStorage.getItem('kop_kecamatan') || 'Kecamatan').replace(/^kecamatan\s+/i, '').trim();

  return (
    <div className="flex flex-col h-full">
      <TemplatePickerModal isOpen={showPicker} onClose={() => {}} onSelect={handleSelectTemplate} />

      {!showPicker && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 px-5 py-3 shadow-sm mb-3">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
              <input type="text" value={letterTitle} onChange={e => setLetterTitle(e.target.value)}
                placeholder="Judul Surat"
                className="text-lg font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder:text-gray-300 dark:placeholder:text-slate-600 w-72" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPicker(true)} className="px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Ganti Template</button>
              <button onClick={handleSaveDraft} className="px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Simpan Draft</button>
              <button onClick={handlePrint} className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Cetak</button>
            </div>
          </div>

          {/* Main: Sidebar + Canvas */}
          <div className="flex gap-4 flex-1 min-h-0">

            {/* ─── Sidebar Kiri ─── */}
            <div className="w-72 flex-shrink-0 flex flex-col gap-3">
              {/* Metadata */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 px-4 py-3 shadow-sm space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1"><Hash className="w-3 h-3" /> Nomor Surat</label>
                  <input type="text" value={nomorSurat} onChange={e => setNomorSurat(e.target.value)} placeholder="001/005/2026"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-mono outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" /> Tanggal</label>
                  <input type="date" value={tanggalSurat} onChange={e => setTanggalSurat(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1"><FileSignature className="w-3 h-3" /> Layout Tanda Tangan</label>
                  <select value={sigLayout} onChange={e => setSigLayout(e.target.value as SignatureLayout)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800">
                    {LAYOUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1"><User className="w-3 h-3" /> Pejabat Penandatangan</label>
                  <select value={kadesName} onChange={e => setKadesName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800">
                    <option value="">{kadesName || 'Pilih'}</option>
                    {getOfficerOptions().map(o => <option key={o.name} value={o.name}>{o.name} ({o.role})</option>)}
                  </select>
                </div>

                {/* Signature config fields */}
                {sigLayout !== 'kades_only' && (
                  <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                    {(sigLayout === 'kades_rt' || sigLayout === 'kades_rw_rt') && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ketua RT</label>
                        <input type="text" value={rtName} onChange={e => setRtName(e.target.value)} placeholder="Nama Ketua RT"
                          className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                      </div>
                    )}
                    {(sigLayout === 'kades_rw' || sigLayout === 'kades_rw_rt') && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ketua RW</label>
                        <input type="text" value={rwName} onChange={e => setRwName(e.target.value)} placeholder="Nama Ketua RW"
                          className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                      </div>
                    )}
                    {sigLayout === 'kades_bpd' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ketua BPD</label>
                        <input type="text" value={bpdName} onChange={e => setBpdName(e.target.value)} placeholder="Nama Ketua BPD"
                          className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                      </div>
                    )}
                    {sigLayout === 'custom' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jabatan 1</label>
                          <input type="text" value={custom1Label} onChange={e => setCustom1Label(e.target.value)} placeholder="cth: Sekretaris Desa"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                          <input type="text" value={custom1Name} onChange={e => setCustom1Name(e.target.value)} placeholder="Nama"
                            className="w-full px-2.5 py-1.5 mt-1 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jabatan 2</label>
                          <input type="text" value={custom2Label} onChange={e => setCustom2Label(e.target.value)} placeholder="cth: Bendahara Desa"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                          <input type="text" value={custom2Name} onChange={e => setCustom2Name(e.target.value)} placeholder="Nama"
                            className="w-full px-2.5 py-1.5 mt-1 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                        </div>
                      </>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-gray-400 dark:text-slate-500">{desaName} Kec. {kecamatan}</p>
              </div>

              {/* Toolbar — vertical stack */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 px-2 py-2 shadow-sm flex flex-col gap-0.5">
                <div className="flex items-center gap-0.5">
                  <ToolbarButton icon={<Undo2 className="w-4 h-4" />} title="Undo" onClick={handleUndo} />
                  <ToolbarButton icon={<Redo2 className="w-4 h-4" />} title="Redo" onClick={handleRedo} />
                </div>
                <div className="flex items-center gap-0.5">
                  <select value={currentFont} onChange={e => { setCurrentFont(e.target.value); execCmd('fontName', e.target.value); recordChange(); }}
                    className="flex-1 min-w-0 px-2 py-1.5 text-[11px] font-medium rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 outline-none cursor-pointer">
                    {FONT_FAMILIES.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
                  </select>
                  <select value={currentFontSize} onChange={e => { setCurrentFontSize(e.target.value); execCmd('fontSize', '4'); recordChange(); }}
                    className="w-14 px-1 py-1.5 text-[11px] font-medium rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 outline-none cursor-pointer">
                    {FONT_SIZES.map(s => <option key={s} value={s}>{s}pt</option>)}
                  </select>
                </div>
                <div className="h-px bg-gray-100 dark:bg-slate-800 my-0.5" />
                <div className="flex items-center gap-0.5">
                  <ToolbarButton cmd="bold" icon={<Bold className="w-4 h-4" />} title="Bold" />
                  <ToolbarButton cmd="italic" icon={<Italic className="w-4 h-4" />} title="Italic" />
                  <ToolbarButton cmd="underline" icon={<Underline className="w-4 h-4" />} title="Underline" />
                </div>
                <div className="h-px bg-gray-100 dark:bg-slate-800 my-0.5" />
                <div className="flex items-center gap-0.5">
                  <ToolbarButton cmd="justifyLeft" icon={<AlignLeft className="w-4 h-4" />} title="Rata Kiri" />
                  <ToolbarButton cmd="justifyCenter" icon={<AlignCenter className="w-4 h-4" />} title="Rata Tengah" />
                  <ToolbarButton cmd="justifyRight" icon={<AlignRight className="w-4 h-4" />} title="Rata Kanan" />
                  <ToolbarButton cmd="justifyFull" icon={<AlignJustify className="w-4 h-4" />} title="Rata Kiri-Kanan" />
                </div>
                <div className="h-px bg-gray-100 dark:bg-slate-800 my-0.5" />
                <div className="flex items-center gap-0.5">
                  <ToolbarButton cmd="insertUnorderedList" icon={<List className="w-4 h-4" />} title="Bullet List" />
                  <ToolbarButton cmd="insertOrderedList" icon={<ListOrdered className="w-4 h-4" />} title="Numbering" />
                  <ToolbarButton cmd="indent" icon={<Indent className="w-4 h-4" />} title="Indent" />
                  <ToolbarButton cmd="outdent" icon={<Outdent className="w-4 h-4" />} title="Outdent" />
                </div>
                <div className="h-px bg-gray-100 dark:bg-slate-800 my-0.5" />
                <div className="flex items-center gap-0.5">
                  <ToolbarButton icon={<Minus className="w-4 h-4" />} title="Garis Horizontal" onClick={() => { execCmd('insertHTML', '<hr style="border:none;border-top:1px solid #d1d5db;margin:12px 0;" /><p>&nbsp;</p>'); recordChange(); }} />
                  <div className="relative">
                    <ToolbarButton icon={<Table className="w-4 h-4" />} title="Tabel" onClick={() => setShowTableGrid(!showTableGrid)} />
                    {showTableGrid && (
                      <div className="absolute left-full top-0 ml-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-50">
                        <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 mb-2">Ukuran Tabel</p>
                        <div className="grid grid-cols-5 gap-1 mb-2">
                          {Array(5).fill(0).map((_, r) => Array(5).fill(0).map((_, c) => (
                            <button key={`${r}-${c}`} onMouseEnter={() => setTableGridSize({ rows: r + 1, cols: c + 1 })}
                              onClick={() => insertTable(r + 1, c + 1)}
                              className={`w-5 h-5 rounded border transition-colors ${r < tableGridSize.rows && c < tableGridSize.cols ? 'bg-emerald-400 border-emerald-500' : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-emerald-100'}`} />
                          )))}
                        </div>
                        <p className="text-[10px] text-center text-gray-400">{tableGridSize.rows} × {tableGridSize.cols}</p>
                      </div>
                    )}
                  </div>
                  <ToolbarButton cmd="removeFormat" icon={<RemoveFormatting className="w-4 h-4" />} title="Hapus Format" />
                </div>
              </div>
            </div>

            {/* ─── A4 Canvas Kanan ─── */}
            <div className="flex-1 flex justify-center bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 min-h-[600px] overflow-auto">
              <div className="bg-white shadow-2xl" style={{ width: '210mm', minHeight: '297mm', padding: '2cm 2.5cm', boxSizing: 'border-box', fontFamily: currentFont, fontSize: `${currentFontSize}pt`, lineHeight: 1.6 }}>
                <div dangerouslySetInnerHTML={{ __html: generateKopSuratHTML() }} />
                <p style={{ textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline', fontSize: '14pt', textTransform: 'uppercase', margin: '0 0 4px 0' }}>{letterTitle || 'SURAT'}</p>
                <p style={{ textAlign: 'center', margin: '0 0 16px 0' }}>Nomor: {nomorSurat}</p>
                <div ref={editorRef} contentEditable suppressContentEditableWarning
                  className="outline-none min-h-[200mm] prose prose-sm max-w-none"
                  style={{ fontFamily: currentFont, fontSize: `${currentFontSize}pt`, lineHeight: 1.6 }}
                  onInput={recordChange}
                  onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); execCmd('insertHTML', '&emsp;&emsp;'); } }} />
                {buildSignatureBlockCanvas()}
                <div className="mt-6 pt-3 border-t border-gray-300">
                  <p className="text-[8px] text-gray-400 leading-relaxed" dangerouslySetInnerHTML={{
                    __html: localStorage.getItem('global_print_footer') || 'Dokumen ini dibuat &amp; dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia'
                  }} />
                </div>
              </div>
            </div>

          </div>
        </>
      )}
      <iframe ref={printFrameRef} className="hidden" title="Print Preview" />
    </div>
  );
}
