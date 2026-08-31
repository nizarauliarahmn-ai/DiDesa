import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Table, Type, Minus, ArrowLeft, Printer, Save,
  Undo2, Redo2, Indent, Outdent, RemoveFormatting, Hash, User, Calendar
} from 'lucide-react';
import { generateKopSuratHTML } from '../../../utils/letterFormat';
import { getLetterClassifications, generateLetterNumberAsync } from '../../../utils/letterClassifications';
import { resolveKadesName, getOfficerOptions } from '../../../utils/letterOfficers';
import TemplatePickerModal, { type LetterTemplate } from './TemplatePickerModal';
import { addLetterHistory } from '../../../utils/letterHistory';
import { showToast } from '../../../utils/toast';

const FONT_SIZES = ['10', '11', '12', '14', '16', '18', '20', '24'];
const FONT_FAMILIES = [
  'Arial, sans-serif',
  'Times New Roman, serif',
  'Georgia, serif',
  'Calibri, sans-serif',
  'Courier New, monospace',
];

function execCmd(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

export default function CustomLetterEditor({ onBack }: { onBack: () => void }) {
  const [showPicker, setShowPicker] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<LetterTemplate | null>(null);
  const [letterTitle, setLetterTitle] = useState('');
  const [nomorSurat, setNomorSurat] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState(() => new Date().toISOString().split('T')[0]);
  const [pejabatName, setPejabatName] = useState(() => localStorage.getItem('village_super_admin') || resolveKadesName() || '');
  const [pejabatJabatan, setPejabatJabatan] = useState(() => localStorage.getItem('village_super_admin_role') || 'Kepala Desa');
  const [currentFont, setCurrentFont] = useState('Arial, sans-serif');
  const [currentFontSize, setCurrentFontSize] = useState('12');
  const editorRef = useRef<HTMLDivElement>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [tableGridSize, setTableGridSize] = useState({ rows: 3, cols: 3 });
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const newIndex = historyIndex - 1;
      editorRef.current.innerHTML = historyStack[newIndex];
      setHistoryIndex(newIndex);
    }
  }, [historyIndex, historyStack]);

  const handleRedo = useCallback(() => {
    if (historyIndex < historyStack.length - 1 && editorRef.current) {
      const newIndex = historyIndex + 1;
      editorRef.current.innerHTML = historyStack[newIndex];
      setHistoryIndex(newIndex);
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

  const insertHorizontalRule = () => {
    execCmd('insertHTML', '<hr style="border:none;border-top:1px solid #d1d5db;margin:12px 0;" /><p>&nbsp;</p>');
    recordChange();
  };

  const handlePrint = () => {
    const content = editorRef.current?.innerHTML;
    if (!content || !printFrameRef.current) return;

    const kopSurat = generateKopSuratHTML();
    const globalFooter = localStorage.getItem('global_print_footer') ||
      'Dokumen ini dibuat &amp; dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia';
    const letterFont = localStorage.getItem('village_letter_font') || currentFont;
    const tglFormatted = new Date(tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const desaName = (localStorage.getItem('kop_desa') || 'Desa').replace(/^(desa|kelurahan)\s+/i, '').trim();

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
        .editor-table th{border:1px solid #d1d5db;padding:8px;background:#f3f4f6;font-weight:bold}
        .global-footer{border-top:0.5px solid #cbd5e1;padding-top:5px;font-family:Inter,sans-serif;line-height:1.5;font-size:8px;color:#94a3b8;text-align:left;margin-top:24px}
        ul,ol{margin:8px 0 8px 20px}
        li{margin:4px 0}
        p{margin:0 0 8px 0}
        h1,h2,h3,h4,h5,h6{margin:0 0 8px 0}
        strong,b{font-weight:bold}
        em,i{font-style:italic}
        u{text-decoration:underline}
        hr{border:none;border-top:1px solid #d1d5db;margin:12px 0}
        .meta-line{margin:0 0 4px 0;font-size:12pt}
      </style></head><body>
      ${kopSurat}
      <p class="meta-line" style="text-align:center;font-weight:bold;text-decoration:underline;font-size:14pt;text-transform:uppercase;margin-bottom:4px;">${letterTitle || 'SURAT'}</p>
      <p class="meta-line" style="text-align:center;margin-bottom:16px;">Nomor: ${nomorSurat}</p>
      <div class="letter-content">${content}</div>
      <div style="margin-top:24px;">
        <table style="width:100%;border-collapse:collapse;border:none;">
          <tr>
            <td style="width:50%;vertical-align:top;border:none;padding:0;">
              <p style="margin:0;">Mengetahui,</p>
              <p style="margin:60px 0 0 0;font-weight:bold;text-decoration:underline;text-align:center;">Ketua RT</p>
            </td>
            <td style="width:50%;vertical-align:top;border:none;padding:0;">
              <p style="margin:0;">${desaName}, ${tglFormatted}</p>
              <p style="margin:0;">${pejabatJabatan},</p>
              <p style="margin:60px 0 0 0;font-weight:bold;text-decoration:underline;text-align:center;text-transform:uppercase;">${pejabatName}</p>
            </td>
          </tr>
        </table>
      </div>
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
    const draft = {
      id: Date.now().toString(),
      title: letterTitle || 'Surat Tanpa Judul',
      content,
      templateId: activeTemplate?.id || 'blank',
      nomorSurat,
      tanggalSurat,
      pejabatName,
      pejabatJabatan,
      createdAt: new Date().toISOString(),
    };
    const drafts = JSON.parse(localStorage.getItem('custom_letter_drafts') || '[]');
    drafts.push(draft);
    localStorage.setItem('custom_letter_drafts', JSON.stringify(drafts));
    addLetterHistory({
      nomor: nomorSurat || `draft/${new Date().getFullYear()}`,
      jenis: letterTitle || 'Surat Manual',
      penerima: '',
      status: 'draft',
      tanggal: new Date().toISOString(),
      data: { title: letterTitle, content, nomorSurat, pejabatName, pejabatJabatan },
    });
    showToast('Draft surat berhasil disimpan!', 'success');
  };

  const ToolbarButton = ({ cmd, icon, title, active, onClick }: {
    cmd?: string; icon: React.ReactNode; title: string; active?: boolean; onClick?: () => void;
  }) => (
    <button
      type="button"
      title={title}
      onClick={onClick || (() => { execCmd(cmd!); recordChange(); })}
      className={`p-1.5 rounded-lg transition-all ${active
        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      {icon}
    </button>
  );

  const ToolbarSep = () => <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1" />;

  const desaName = (localStorage.getItem('kop_desa') || 'Desa').replace(/^(desa|kelurahan)\s+/i, '').trim();
  const kecamatan = (localStorage.getItem('kop_kecamatan') || 'Kecamatan').replace(/^kecamatan\s+/i, '').trim();
  const tglFormatted = new Date(tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <TemplatePickerModal isOpen={showPicker} onClose={() => {}} onSelect={handleSelectTemplate} />

      {!showPicker && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 px-5 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
              <div>
                <input
                  type="text"
                  value={letterTitle}
                  onChange={e => setLetterTitle(e.target.value)}
                  placeholder="Judul Surat"
                  className="text-lg font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder:text-gray-300 dark:placeholder:text-slate-600 w-72"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPicker(true)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Ganti Template
              </button>
              <button onClick={handleSaveDraft} className="px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> Simpan Draft
              </button>
              <button onClick={handlePrint} className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Cetak
              </button>
            </div>
          </div>

          {/* Metadata Fields */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 px-5 py-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Nomor Surat
                </label>
                <input
                  type="text"
                  value={nomorSurat}
                  onChange={e => setNomorSurat(e.target.value)}
                  placeholder="001/005/2026"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Tanggal
                </label>
                <input
                  type="date"
                  value={tanggalSurat}
                  onChange={e => setTanggalSurat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" /> Pejabat Penandatangan
                </label>
                <select
                  value={pejabatName}
                  onChange={e => setPejabatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800"
                >
                  <option value="">{pejabatName || 'Pilih Pejabat'}</option>
                  {getOfficerOptions().map((opt) => (
                    <option key={opt.name} value={opt.name}>{opt.name} ({opt.role})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jabatan</label>
                <input
                  type="text"
                  value={pejabatJabatan}
                  onChange={e => setPejabatJabatan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2">
              {desaName} Kec. {kecamatan} • Tanggal Cetak: {tglFormatted}
            </p>
          </div>

          {/* Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 px-3 py-2 shadow-sm flex flex-wrap items-center gap-0.5">
            <ToolbarButton icon={<Undo2 className="w-4 h-4" />} title="Undo (Ctrl+Z)" onClick={handleUndo} />
            <ToolbarButton icon={<Redo2 className="w-4 h-4" />} title="Redo (Ctrl+Y)" onClick={handleRedo} />
            <ToolbarSep />

            <select
              value={currentFont}
              onChange={e => { setCurrentFont(e.target.value); execCmd('fontName', e.target.value); recordChange(); }}
              className="px-2 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              {FONT_FAMILIES.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
            </select>
            <select
              value={currentFontSize}
              onChange={e => { setCurrentFontSize(e.target.value); execCmd('fontSize', '4'); recordChange(); }}
              className="w-14 px-2 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              {FONT_SIZES.map(s => <option key={s} value={s}>{s}pt</option>)}
            </select>
            <ToolbarSep />

            <ToolbarButton cmd="bold" icon={<Bold className="w-4 h-4" />} title="Bold (Ctrl+B)" />
            <ToolbarButton cmd="italic" icon={<Italic className="w-4 h-4" />} title="Italic (Ctrl+I)" />
            <ToolbarButton cmd="underline" icon={<Underline className="w-4 h-4" />} title="Underline (Ctrl+U)" />
            <ToolbarSep />

            <ToolbarButton cmd="justifyLeft" icon={<AlignLeft className="w-4 h-4" />} title="Rata Kiri" />
            <ToolbarButton cmd="justifyCenter" icon={<AlignCenter className="w-4 h-4" />} title="Rata Tengah" />
            <ToolbarButton cmd="justifyRight" icon={<AlignRight className="w-4 h-4" />} title="Rata Kanan" />
            <ToolbarButton cmd="justifyFull" icon={<AlignJustify className="w-4 h-4" />} title="Rata Kiri-Kanan" />
            <ToolbarSep />

            <ToolbarButton cmd="insertUnorderedList" icon={<List className="w-4 h-4" />} title="Bullet List" />
            <ToolbarButton cmd="insertOrderedList" icon={<ListOrdered className="w-4 h-4" />} title="Numbering" />
            <ToolbarButton cmd="indent" icon={<Indent className="w-4 h-4" />} title="Tambah Indent" />
            <ToolbarButton cmd="outdent" icon={<Outdent className="w-4 h-4" />} title="Kurangi Indent" />
            <ToolbarSep />

            <ToolbarButton icon={<Minus className="w-4 h-4" />} title="Garis Horizontal" onClick={insertHorizontalRule} />
            <div className="relative">
              <ToolbarButton
                icon={<Table className="w-4 h-4" />}
                title="Sisipkan Tabel"
                onClick={() => setShowTableGrid(!showTableGrid)}
              />
              {showTableGrid && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-50">
                  <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 mb-2">Ukuran Tabel</p>
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {Array(5).fill(0).map((_, r) =>
                      Array(5).fill(0).map((_, c) => (
                        <button
                          key={`${r}-${c}`}
                          onMouseEnter={() => setTableGridSize({ rows: r + 1, cols: c + 1 })}
                          onClick={() => insertTable(r + 1, c + 1)}
                          className={`w-5 h-5 rounded border transition-colors ${
                            r < tableGridSize.rows && c < tableGridSize.cols
                              ? 'bg-emerald-400 border-emerald-500'
                              : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                          }`}
                        />
                      ))
                    )}
                  </div>
                  <p className="text-[10px] text-center text-gray-400">{tableGridSize.rows} × {tableGridSize.cols}</p>
                </div>
              )}
            </div>
            <ToolbarSep />
            <ToolbarButton cmd="removeFormat" icon={<RemoveFormatting className="w-4 h-4" />} title="Hapus Format" />
          </div>

          {/* A4 Canvas */}
          <div className="flex justify-center bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 min-h-[600px]">
            <div className="bg-white shadow-2xl" style={{ width: '210mm', minHeight: '297mm', padding: '2cm 2.5cm', boxSizing: 'border-box', fontFamily: currentFont, fontSize: `${currentFontSize}pt`, lineHeight: 1.6 }}>
              <div dangerouslySetInnerHTML={{ __html: generateKopSuratHTML() }} />
              <p style={{ textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline', fontSize: '14pt', textTransform: 'uppercase', marginBottom: '4px' }}>{letterTitle || 'SURAT'}</p>
              <p style={{ textAlign: 'center', marginBottom: '16px' }}>Nomor: {nomorSurat}</p>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="outline-none min-h-[200mm] prose prose-sm max-w-none"
                style={{ fontFamily: currentFont, fontSize: `${currentFontSize}pt`, lineHeight: 1.6 }}
                onInput={recordChange}
                onKeyDown={e => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    execCmd('insertHTML', '&emsp;&emsp;');
                  }
                }}
              />
              <div style={{ marginTop: '24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: 0 }}>
                        <p style={{ margin: 0 }}>Mengetahui,</p>
                        <p style={{ margin: '60px 0 0 0', fontWeight: 'bold', textDecoration: 'underline', textAlign: 'center' }}>Ketua RT</p>
                      </td>
                      <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: 0 }}>
                        <p style={{ margin: 0 }}>{desaName}, {tglFormatted}</p>
                        <p style={{ margin: 0 }}>{pejabatJabatan},</p>
                        <p style={{ margin: '60px 0 0 0', fontWeight: 'bold', textDecoration: 'underline', textAlign: 'center', textTransform: 'uppercase' }}>{pejabatName}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-6 pt-3 border-t border-gray-300">
                <p className="text-[8px] text-gray-400 leading-relaxed" dangerouslySetInnerHTML={{
                  __html: localStorage.getItem('global_print_footer') || 'Dokumen ini dibuat &amp; dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia'
                }} />
              </div>
            </div>
          </div>
        </>
      )}

      <iframe ref={printFrameRef} className="hidden" title="Print Preview" />
    </div>
  );
}
