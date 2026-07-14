import React, { useState, useEffect } from 'react';
import AdminSuratDashboard from './surat/AdminSuratDashboard';
import AdminSuratBuat from './surat/AdminSuratBuat';
import AdminSuratPenomoran from './surat/AdminSuratPenomoran';
import AdminSuratNikah from './surat/AdminSuratNikah';
import AdminSuratSKTM from './surat/AdminSuratSKTM';
import AdminSuratSKBM from './surat/AdminSuratSKBM';
import AdminSuratSKH from './surat/AdminSuratSKH';
import AdminSuratSKM from './surat/AdminSuratSKM';
import AdminSuratSKU from './surat/AdminSuratSKU';
import AdminSuratSKPH from './surat/AdminSuratSKPH';
import AdminSuratSKD from './surat/AdminSuratSKD';
import AdminSuratSKP from './surat/AdminSuratSKP';
import AdminSuratSDU from './surat/AdminSuratSDU';
import AdminSuratSPT from './surat/AdminSuratSPT';
import AdminSuratSPPD from './surat/AdminSuratSPPD';
import { getLetterFullData } from '../../utils/letterHistory';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'buat' | 'penomoran' | 'nikah' | 'sktm' | 'skbm' | 'skh' | 'skm' | 'sku' | 'skph' | 'skd' | 'skp' | 'sdu' | 'spt' | 'sppd' | 'master_template'>(presetResident ? 'buat' : 'dashboard');
  const [editData, setEditData] = useState<any>(null);
  const [editLetterId, setEditLetterId] = useState<string | null>(null);

  const changeTab = (tab: any) => {
    setEditData(null);
    setEditLetterId(null);
    if (onClearPresetResident && tab !== 'buat') {
      onClearPresetResident();
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

    const jenis = letter.jenis?.toUpperCase() || '';
    if (jenis === 'SKP') {
      setActiveTab('skp');
    } else if (jenis === 'SDP' || jenis === 'SKD' || jenis === 'SURAT KETERANGAN DOMISILI' || jenis === 'SK DOMISILI PERORANGAN') {
      setActiveTab('skd');
    } else if (jenis === 'SDU' || jenis === 'SK DOMISILI USAHA') {
      setActiveTab('sdu');
    } else if (jenis === 'SKM' || jenis === 'SURAT KETERANGAN KEMATIAN') {
      setActiveTab('skm');
    } else if (jenis === 'SKU' || jenis === 'SURAT KETERANGAN USAHA') {
      setActiveTab('sku');
    } else if (jenis === 'SKTM') {
      setActiveTab('sktm');
    } else if (jenis === 'SKBM' || jenis === 'SK BELUM MENIKAH') {
      setActiveTab('skbm');
    } else if (jenis === 'SK KEHILANGAN' || jenis === 'SKH') {
      setActiveTab('skh');
    } else if (jenis === 'SK PENGHASILAN' || jenis === 'SKPH') {
      setActiveTab('skph');
    } else if (jenis === 'SURAT PENGANTAR NIKAH' || jenis === 'SKN') {
      setActiveTab('nikah');
    } else if (jenis === 'SPT' || jenis === 'SURAT PENGURUSAN TASPEN') {
      setActiveTab('spt');
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
    <div className="max-w-6xl mx-auto pb-24 space-y-6">
      {/* Sub Navigation */}
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-700 no-print">
        <button 
          onClick={() => changeTab('dashboard')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors shrink-0 ${activeTab === 'dashboard' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}
        >
          Daftar Surat
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

      <div className="pt-4">
        {activeTab === 'dashboard' && (
          <AdminSuratDashboard 
            onBuatSurat={() => changeTab('buat')} 
            onEditLetter={handleEditLetter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            debouncedSearchQuery={debouncedSearchQuery}
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
            onOpenSDU={() => changeTab('sdu')}
            onOpenSPT={() => changeTab('spt')}
              onOpenSPPD={() => changeTab('sppd')}
          />
        )}
        {activeTab === 'nikah' && (
          <AdminSuratNikah 
            presetResident={presetResident}
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}
        {activeTab === 'sktm' && (
          <AdminSuratSKTM 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}
        {activeTab === 'skbm' && (
          <AdminSuratSKBM 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}
        {activeTab === 'skh' && (
          <AdminSuratSKH 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}
        {activeTab === 'skm' && (
          <AdminSuratSKM 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}
        {activeTab === 'sku' && (
          <AdminSuratSKU 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}
        {activeTab === 'skph' && (
          <AdminSuratSKPH 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}
        {activeTab === 'skd' && (
          <AdminSuratSKD 
            presetResident={presetResident}
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}
        {activeTab === 'skp' && (
          <AdminSuratSKP 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}
        {activeTab === 'sdu' && (
          <AdminSuratSDU 
            presetResident={presetResident}
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}
        {activeTab === 'spt' && (
          <AdminSuratSPT 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}
        {activeTab === 'penomoran' && <AdminSuratPenomoran />}
      </div>
    </div>
  );
}

