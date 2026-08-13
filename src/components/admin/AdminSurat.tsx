import React, { useState, useEffect } from 'react';
import AdminSuratDashboard from './surat/AdminSuratDashboard';
import AdminSuratInbox from './surat/AdminSuratInbox';
import AdminSuratBuat from './surat/AdminSuratBuat';
import AdminSuratPenomoran from './surat/AdminSuratPenomoran';
import AdminSuratNikah from './surat/AdminSuratNikah';
import AdminSuratSKTM from './surat/AdminSuratSKTM';
import AdminSuratSKBM from './surat/AdminSuratSKBM';
import AdminSuratSKH from './surat/AdminSuratSKH';
import AdminSuratSKL from './surat/AdminSuratSKL';
import AdminSuratSKM from './surat/AdminSuratSKM';
import AdminSuratSKU from './surat/AdminSuratSKU';
import AdminSuratSKPH from './surat/AdminSuratSKPH';
import AdminSuratSKD from './surat/AdminSuratSKD';
import AdminSuratSKP from './surat/AdminSuratSKP';
import AdminSuratSDU from './surat/AdminSuratSDU';
import AdminSuratSPT from './surat/AdminSuratSPT';
import AdminSuratSPPD from './surat/AdminSuratSPPD';
import AdminSuratSKKT from './surat/AdminSuratSKKT';
import AdminSuratUndangan from './surat/AdminSuratUndangan';
import { getLetterFullData } from '../../utils/letterHistory';
import { fetchResidentsCached } from '../../utils/apiCache';

export default function AdminSurat({ 
  presetResident, 
  onClearPresetResident,
  searchQuery,
  setSearchQuery,
  debouncedSearchQuery
}: { 
  presetResident?: any;
  onClearPresetResident?: () => void;
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  debouncedSearchQuery?: string;
}) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inbox' | 'buat' | 'penomoran' | 'nikah' | 'sktm' | 'skbm' | 'skh' | 'skl' | 'skm' | 'sku' | 'skph' | 'skd' | 'skp' | 'sdu' | 'spt' | 'sppd' | 'skkt' | 'undangan' | 'master_template'>(presetResident ? 'buat' : 'dashboard');
  const [editData, setEditData] = useState<any>(null);
  const [editLetterId, setEditLetterId] = useState<string | null>(null);
  const [localPresetResident, setLocalPresetResident] = useState<any>(null);
  const [returnTab, setReturnTab] = useState<'buat' | 'dashboard' | 'inbox'>('buat');

  const formTabs = new Set(['nikah', 'sktm', 'skbm', 'skh', 'skl', 'skm', 'sku', 'skph', 'skd', 'skp', 'sdu', 'spt', 'sppd', 'skkt', 'undangan']);

  const changeTab = (tab: any) => {
    setEditData(null);
    setEditLetterId(null);
    setLocalPresetResident(null);
    if (onClearPresetResident && tab !== 'buat') {
      onClearPresetResident();
    }
    if (!formTabs.has(tab)) {
      setReturnTab(tab === 'inbox' ? 'inbox' : tab === 'buat' ? 'buat' : 'dashboard');
    }
    setActiveTab(tab);
  };

  const handleEditLetter = async (letter: any) => {
    const fullData = await getLetterFullData(letter);
    if (!fullData) {
      alert("Detail data surat tidak ditemukan.");
      return;
    }
    
    setEditData(fullData);
    setEditLetterId(letter.id);

    // Auto-fetch resident for Auto-fill functionality
    if (fullData.nik) {
      try {
        const res = await fetchResidentsCached();
        if (res.ok) {
          const residents = await res.json();
          const match = residents.find((r: any) => r.nik === fullData.nik);
          if (match) {
            setLocalPresetResident(match);
          }
        }
      } catch (e) {
        console.error("Error auto-fetching resident:", e);
      }
    }

    const jenis = letter.jenis?.toUpperCase() || '';
    if (jenis.includes('SKP') || jenis.includes('PINDAH')) {
      setActiveTab('skp');
    } else if (jenis.includes('SDP') || jenis.includes('SKD') || jenis.includes('DOMISILI PERORANGAN')) {
      setActiveTab('skd');
    } else if (jenis.includes('SDU') || jenis.includes('DOMISILI USAHA')) {
      setActiveTab('sdu');
    } else if (jenis.includes('SKM') || jenis.includes('KEMATIAN')) {
      setActiveTab('skm');
    } else if (jenis.includes('SKU') || jenis.includes('USAHA')) {
      setActiveTab('sku');
    } else if (jenis.includes('SKTM') || jenis.includes('TIDAK MAMPU')) {
      setActiveTab('sktm');
    } else if (jenis.includes('SKBM') || jenis.includes('BELUM MENIKAH')) {
      setActiveTab('skbm');
    } else if (jenis.includes('SKH') || jenis.includes('KEHILANGAN')) {
      setActiveTab('skh');
    } else if (jenis.includes('SKPH') || jenis.includes('PENGHASILAN')) {
      setActiveTab('skph');
    } else if (jenis.includes('SKN') || jenis.includes('PENGANTAR NIKAH')) {
      setActiveTab('nikah');
    } else if (jenis.includes('SPT') || jenis.includes('TASPEN')) {
      setActiveTab('spt');
    } else if (jenis.includes('SPPD') || jenis.includes('PERJALANAN DINAS')) {
      setActiveTab('sppd');
    } else if (jenis.includes('SKL') || jenis.includes('KELAHIRAN')) {
      setActiveTab('skl');
    } else if (jenis.includes('SKKT') || jenis.includes('TANAH')) {
      setActiveTab('skkt');
    } else if (jenis.includes('UND') || jenis.includes('UNDANGAN')) {
      setActiveTab('undangan');
    }
  };

  useEffect(() => {
    const handleSetTab = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        changeTab(customEvent.detail as any);
      }
    };
    window.addEventListener('set_admin_surat_tab', handleSetTab);
    return () => {
      window.removeEventListener('set_admin_surat_tab', handleSetTab);
    };
  }, [onClearPresetResident]);

  return (
    <div className="pb-24 space-y-6">
      {/* Sub Navigation */}
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-700 no-print">
        <button 
          onClick={() => changeTab('dashboard')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors shrink-0 ${activeTab === 'dashboard' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}
        >
          Daftar Surat
        </button>
        <button 
          onClick={() => changeTab('inbox')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors shrink-0 flex items-center gap-2 ${activeTab === 'inbox' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}
        >
          Inbox Permohonan
          {/* We could add an indicator badge here if we tracked counts globally, but this is sufficient for now */}
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
        </button>
        <button 
          onClick={() => changeTab('buat')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors shrink-0 ${activeTab === 'buat' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}
        >
          Buat Surat
        </button>
        <button 
          onClick={() => changeTab('penomoran')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors shrink-0 ${activeTab === 'penomoran' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}
        >
          Pengaturan Surat
        </button>
      </div>

      <div className="pt-4 admin-surat-wrapper" onKeyDown={(e) => {
        if (e.key === 'Enter') {
          if (document.activeElement?.tagName.toLowerCase() === 'textarea') return;
          if (document.activeElement?.tagName.toLowerCase() === 'button') {
            const btn = document.activeElement as HTMLButtonElement;
            if (btn.type === 'button' && !btn.className.includes('submit')) return;
          }
          
          e.preventDefault();
          const container = e.currentTarget;
          const focusable = container.querySelectorAll(
            'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
          ) as NodeListOf<HTMLElement>;
          
          const elements = Array.from(focusable).filter(el => el.tabIndex !== -1 && el.offsetParent !== null);
          const index = elements.indexOf(document.activeElement as HTMLElement);
          
          if (index > -1 && index < elements.length - 1) {
            elements[index + 1].focus();
          }
        }
      }}>
        {activeTab === 'dashboard' && (
          <AdminSuratDashboard 
            onBuatSurat={() => changeTab('buat')} 
            onEditLetter={handleEditLetter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            debouncedSearchQuery={debouncedSearchQuery}
          />
        )}
        {activeTab === 'inbox' && (
          <AdminSuratInbox 
            onEditLetter={handleEditLetter}
          />
        )}
        {activeTab === 'buat' && (
          <AdminSuratBuat 
            presetResident={presetResident}
            onBack={() => changeTab('dashboard')} 
            onOpenNikah={() => changeTab('nikah')}
            onOpenSKTM={() => changeTab('sktm')}
            onOpenSKBM={() => changeTab('skbm')}
            onOpenSKM={() => changeTab('skm')}
            onOpenSKU={() => changeTab('sku')}
            onOpenSKPH={() => changeTab('skph')}
            onOpenSKD={() => changeTab('skd')}
            onOpenSKP={() => changeTab('skp')}
            onOpenSKH={() => changeTab('skh')}
            onOpenSKL={() => changeTab('skl')}
            onOpenSDU={() => changeTab('sdu')}
            onOpenSPT={() => changeTab('spt')}
            onOpenSPPD={() => changeTab('sppd')}
            onOpenSKKT={() => changeTab('skkt')}
            onOpenUndangan={() => changeTab('undangan')}
          />
        )}
        {activeTab === 'skkt' && (
          <AdminSuratSKKT 
            presetResident={localPresetResident || presetResident}
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'nikah' && (
          <AdminSuratNikah 
            presetResident={localPresetResident || presetResident}
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'sktm' && (
          <AdminSuratSKTM 
            presetResident={localPresetResident || presetResident}
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'skbm' && (
          <AdminSuratSKBM 
            presetResident={localPresetResident || presetResident}
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'skh' && (
          <AdminSuratSKH 
            presetResident={localPresetResident || presetResident}
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'skl' && (
          <AdminSuratSKL 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'skm' && (
          <AdminSuratSKM 
            presetResident={localPresetResident || presetResident}
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'sku' && (
          <AdminSuratSKU 
            presetResident={localPresetResident || presetResident}
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'skph' && (
          <AdminSuratSKPH 
            presetResident={localPresetResident || presetResident}
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'skd' && (
          <AdminSuratSKD 
            presetResident={localPresetResident || presetResident}
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'skp' && (
          <AdminSuratSKP 
            presetResident={localPresetResident || presetResident}
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'sdu' && (
          <AdminSuratSDU 
            presetResident={localPresetResident || presetResident}
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'spt' && (
          <AdminSuratSPT 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'sppd' && (
          <AdminSuratSPPD 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'undangan' && (
          <AdminSuratUndangan 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab(returnTab)} 
          />
        )}
        {activeTab === 'penomoran' && <AdminSuratPenomoran />}
      </div>
    </div>
  );
}

