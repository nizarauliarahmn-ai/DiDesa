import NumberCounter from '../common/NumberCounter';
import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, UserPlus, Search, Filter, FilterX, Eye, Edit2, ChevronLeft, ChevronRight, Users, Heart, Sparkles, Zap, Trash2, Clock, AlertCircle, MoreHorizontal } from 'lucide-react';
import AdminPendudukDetail from './penduduk/AdminPendudukDetail';
import AdminPendudukEdit from './penduduk/AdminPendudukEdit';
import AdminPendudukImport from './penduduk/AdminPendudukImport';
import AdminPendudukArchive from './penduduk/AdminPendudukArchive';
import { showToast } from '../../utils/toast';
import { ENABLE_AI_FEATURES, AI_DEV_MESSAGE } from '../../utils/featureFlags';
import { supabase } from '../../utils/supabase';
import { addSaaSLog } from '../../utils/saasLogs';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { normalizeStatusKeberadaan } from '../../utils/statusKeberadaan';

// Filter cepat utama — filter lanjutan (RT/RW, status kawin, dll) diakses
// melalui modal tombol Filter di kanan input pencarian.
const FILTERS = ["Semua", "✨ Terbaru", "🎁 Penerima Bansos", "🚫 Non-Penerima", "Pindah", "Meninggal"];

export default function AdminPenduduk({ 
  onNavigateToTab, 
  onSetPresetResident,
  searchQuery: externalSearchQuery,
  setSearchQuery: externalSetSearchQuery,
  debouncedSearchQuery: externalDebouncedSearchQuery
}: { 
  onNavigateToTab?: (tab: string) => void;
  onSetPresetResident?: (resident: any) => void;
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  debouncedSearchQuery?: string;
}) {
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localDebouncedSearchQuery, setLocalDebouncedSearchQuery] = useState('');
  
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = externalSetSearchQuery !== undefined ? externalSetSearchQuery : setLocalSearchQuery;

  // Handle local debouncing if no external debounced query is provided
  useEffect(() => {
    if (externalDebouncedSearchQuery !== undefined) return;
    const timer = setTimeout(() => {
      setLocalDebouncedSearchQuery(localSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchQuery, externalDebouncedSearchQuery]);

  const debouncedSearchQuery = externalDebouncedSearchQuery !== undefined ? externalDebouncedSearchQuery : localDebouncedSearchQuery;

  const [activeFilter, setActiveFilter] = useState('Semua');
  const [aidFilter, setAidFilter] = useState('Semua Bantuan');
  const [sortOrder, setSortOrder] = useState('No. KK');
  const [showQuickFilters, setShowQuickFilters] = useState(true);
  const [selectedPenduduk, setSelectedPenduduk] = useState<any>(null);
  const [editingPenduduk, setEditingPenduduk] = useState<any>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const itemsPerPage = 10;
  const [villageName, setVillageName] = useState('Desa');

  useEffect(() => {
    const branding = localStorage.getItem('global_branding');
    if (branding) {
      try {
        const parsed = JSON.parse(branding);
        if (parsed.app_name) {
          setVillageName(parsed.app_name);
        }
      } catch(e) {}
    }
  }, []);

  // Reset current page when debounced search query, filter or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, activeFilter, sortOrder, aidFilter]);

  const fetchResidents = async () => {
    if (residents.length === 0) setLoading(true);
    const resolvedTenant = await resolveCurrentTenant();
    setTenantId(resolvedTenant);

    if (resolvedTenant) {
      let allData: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;

      try {
        while (hasMore) {
          const { data, error } = await supabase
            .from('residents')
            .select('*')
            .eq('tenant_id', resolvedTenant)
            .order('nik', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) {
            console.error('Error fetching residents:', error);
            hasMore = false;
          } else if (data) {
            allData = [...allData, ...data];
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        }
      } catch (e) {
        console.error('Error fetching residents:', e);
      }

      if (allData.length > 0) {
        const formatted = allData.map((r) => ({
           ...r,
           noKk: r.no_kk,
           rtRw: r.rt_rw,
           birthPlace: r.birth_place,
           birthDate: r.birth_date,
           bloodType: r.blood_type || r.golongan_darah,
           maritalStatus: r.marital_status || r.maritalStatus || '',
           domicileStatus: r.domicile_status || r.status_domisili,
           familyRelation: r.family_relation,
           fatherName: r.father_name,
           motherName: r.mother_name,
           education: r.education || r.pendidikan_terakhir,
           gelarDepan: r.gelar_depan || '',
           gelarBelakang: r.gelar_belakang || '',
           noAktaKelahiran: r.no_akta_kelahiran || '',
           noAktaNikah: r.no_akta_nikah || '',
           noBpjs: r.no_bpjs || '',
           statusDtks: r.status_dtks || '',
           disabilitas: r.disabilitas || '',
           noWhatsapp: r.no_whatsapp || '',
           dusun: r.dusun || '',
           noPaspor: r.no_paspor || '',
           activeAids: typeof r.active_aids === 'string' ? JSON.parse(r.active_aids) : (r.active_aids || []),
           genderColor: r.gender_color,
           statusColor: r.status_color,
           _orderKey: r.created_at ? new Date(r.created_at).getTime() : (r.id && !isNaN(Number(r.id)) ? Number(r.id) : 0)
        }));
        setResidents(formatted.filter(r => String(r.is_deleted) !== '1' && r.is_deleted !== true && (r.status || '').toLowerCase() !== 'archived' && (r.status || '').toLowerCase() !== 'deleted'));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResidents();
  }, []);

  const handleSavePenduduk = async (savedResident: any) => {
    if (!tenantId) {
      showToast("Gagal menyimpan, ID Desa tidak ditemukan.", "error");
      return;
    }
    const isEdit = !!editingPenduduk && !!editingPenduduk.nik;
    const nowTimestamp = Date.now();
    
    const dbPayload = {
      tenant_id: tenantId,
      nik: savedResident.nik,
      initials: savedResident.initials || '',
      name: savedResident.name,
      no_kk: savedResident.noKk,
      gender: savedResident.gender,
      birth_place: savedResident.birthPlace,
      birth_date: savedResident.birthDate,
      age: savedResident.age,
      blood_type: savedResident.bloodType,
      religion: savedResident.religion,
      education: savedResident.education,
      pendidikan_terakhir: savedResident.education || '',
      gelar_depan: savedResident.gelarDepan || '',
      gelar_belakang: savedResident.gelarBelakang || '',
      no_akta_kelahiran: savedResident.noAktaKelahiran || '',
      no_akta_nikah: savedResident.noAktaNikah || '',
      no_bpjs: savedResident.noBpjs || '',
      status_dtks: savedResident.statusDtks || '',
      disabilitas: savedResident.disabilitas || '',
      golongan_darah: savedResident.bloodType || '',
      no_whatsapp: savedResident.noWhatsapp || '',
      dusun: savedResident.dusun || '',
      no_paspor: savedResident.noPaspor || '',
      status_domisili: savedResident.domicileStatus || '',
      job: savedResident.job,
      pekerjaan: savedResident.job || '',
      jenis_pekerjaan: savedResident.job || '',
      pekerjaan_nama: savedResident.job || '',
      address: savedResident.address,
      rt_rw: savedResident.rtRw,
      rt: savedResident.rt,
      rw: savedResident.rw,
      desa: savedResident.desa,
      status: normalizeStatusKeberadaan(savedResident.status || savedResident.statusKeberadaan || 'TETAP'),
      status_keberadaan: normalizeStatusKeberadaan(savedResident.statusKeberadaan || savedResident.status || 'TETAP'),
      status_penduduk: normalizeStatusKeberadaan(savedResident.statusKeberadaan || savedResident.status || 'TETAP'),
      domicile_status: savedResident.domicileStatus,
      family_relation: savedResident.familyRelation,
      father_name: savedResident.fatherName,
      mother_name: savedResident.motherName,
      active_aids: typeof savedResident.activeAids === 'string' ? savedResident.activeAids : JSON.stringify(savedResident.activeAids || []),
      gender_color: savedResident.genderColor || 'blue',
      status_color: savedResident.statusColor || 'emerald',
      photo: savedResident.photo || ''
    };

    if (isEdit) {
      const { error } = await supabase
        .from('residents')
        .update(dbPayload)
        .eq('nik', savedResident.nik)
        .eq('tenant_id', tenantId);

      if (!error) {
        // Verify the data actually persisted in Supabase (not just optimistic UI)
        try {
          const { data: savedRow, error: verifyError } = await supabase
            .from('residents')
            .select('father_name, mother_name, name, nik')
            .eq('nik', savedResident.nik)
            .eq('tenant_id', tenantId)
            .maybeSingle();

          if (!verifyError && savedRow) {
            const storedFather = String(savedRow.father_name || '').toLowerCase();
            const storedMother = String(savedRow.mother_name || '').toLowerCase();
            const savedFather = String(dbPayload.father_name || '').toLowerCase();
            const savedMother = String(dbPayload.mother_name || '').toLowerCase();
            if (storedFather !== savedFather || storedMother !== savedMother) {
              console.warn('Verifikasi simpan penduduk: data ayah/ibu tidak cocok di DB.', savedRow, dbPayload);
            }
          }
        } catch (verifyErr) {
          console.warn('Gagal verifikasi simpan penduduk:', verifyErr);
        }

        showToast(`Data penduduk ${savedResident.name} berhasil diperbarui di database!`, "success");
        setResidents(prev => prev.map(r => r.nik === savedResident.nik ? {
          ...r,
          ...dbPayload,
          noKk: dbPayload.no_kk,
          rtRw: dbPayload.rt_rw,
          birthPlace: dbPayload.birth_place,
          birthDate: dbPayload.birth_date,
          bloodType: dbPayload.blood_type,
          domicileStatus: dbPayload.domicile_status,
          familyRelation: dbPayload.family_relation,
          fatherName: dbPayload.father_name,
          motherName: dbPayload.mother_name,
          education: dbPayload.education,
          gelarDepan: dbPayload.gelar_depan,
          gelarBelakang: dbPayload.gelar_belakang,
          noAktaKelahiran: dbPayload.no_akta_kelahiran,
          noAktaNikah: dbPayload.no_akta_nikah,
          noBpjs: dbPayload.no_bpjs,
          statusDtks: dbPayload.status_dtks,
          disabilitas: dbPayload.disabilitas,
          noWhatsapp: dbPayload.no_whatsapp,
          dusun: dbPayload.dusun,
          noPaspor: dbPayload.no_paspor,
          activeAids: savedResident.activeAids,
          _orderKey: nowTimestamp
        } : r));
        
        // Log notification & SaaS Activity Log
        const adminUserStr = localStorage.getItem('didesa_auth_user');
        const adminName = adminUserStr ? JSON.parse(adminUserStr).name : 'Admin Desa';

        addSaaSLog({
          admin: adminName,
          aksi: 'Edit Data Penduduk',
          target: `${savedResident.name} (${savedResident.nik})`,
          status: 'Berhasil',
          category: 'Penduduk'
        });

        await supabase.from('notifications').insert([{
          id: `notif-${Date.now()}`,
          tenant_id: tenantId,
          title: "Data Penduduk Diperbarui",
          message: `Data penduduk ${savedResident.name} (NIK: ${savedResident.nik}) telah diperbarui.`,
          category: "Residents",
          is_read: false,
          timestamp: new Date().toISOString()
        }]);
        window.dispatchEvent(new Event('notifications_updated'));
        fetchResidents();
      } else {
        showToast(`Gagal: ${error.message}`, "error");
      }
    } else {
      // Pre-check: NIK sudah terdaftar?
      const { data: existing } = await supabase
        .from('residents')
        .select('nik')
        .eq('nik', savedResident.nik)
        .maybeSingle();

      if (existing) {
        showToast(
          `NIK ${savedResident.nik} sudah terdaftar! Periksa kembali NIK yang Anda masukkan.`,
          "error"
        );
        return;
      }

      const { error } = await supabase.from('residents').insert([dbPayload]);
      if (!error) {
        showToast(`Warga baru ${savedResident.name} berhasil didaftarkan!`, "success");
        
        // Optimistic UI Update: Put newest resident at the very top of residents list!
        const newRes = { 
          ...dbPayload, 
          noKk: dbPayload.no_kk, 
          rtRw: dbPayload.rt_rw, 
          birthPlace: dbPayload.birth_place, 
          birthDate: dbPayload.birth_date, 
          bloodType: dbPayload.blood_type, 
          domicileStatus: dbPayload.domicile_status, 
          familyRelation: dbPayload.family_relation, 
          fatherName: dbPayload.father_name, 
          motherName: dbPayload.mother_name, 
          activeAids: savedResident.activeAids || [], 
          genderColor: dbPayload.gender_color, 
          statusColor: dbPayload.status_color,
          is_deleted: 0,
          _orderKey: nowTimestamp
        };
        setResidents(prev => [newRes, ...prev.filter(r => r.nik !== newRes.nik)]);
        setActiveFilter('✨ Terbaru');
        setSortOrder('Terbaru');

        // Log notification & SaaS Activity Log
        const adminUserStr = localStorage.getItem('didesa_auth_user');
        const adminName = adminUserStr ? JSON.parse(adminUserStr).name : 'Admin Desa';

        addSaaSLog({
          admin: adminName,
          aksi: 'Tambah Warga Baru',
          target: `${savedResident.name} (${savedResident.nik})`,
          status: 'Berhasil',
          category: 'Penduduk'
        });

        await supabase.from('notifications').insert([{
          id: `notif-${Date.now()}`,
          tenant_id: tenantId,
          title: "Penduduk Baru Ditambahkan",
          message: `Penduduk baru ${savedResident.name} (NIK: ${savedResident.nik}) telah ditambahkan.`,
          category: "Residents",
          is_read: false,
          timestamp: new Date().toISOString()
        }]);
        window.dispatchEvent(new Event('notifications_updated'));
        fetchResidents();
      } else {
        showToast(`Gagal: ${error.message}`, "error");
      }
    }
    setEditingPenduduk(null);
  };

  const filteredData = useMemo(() => {
    let result = residents.filter((item) => {
      // Safe Search filter
      const safeName = (item.name || '').toLowerCase();
      const safeNik = (item.nik || '').toString();
      const query = (debouncedSearchQuery || '').toLowerCase();
      
      const safeKk = (item.noKk || item.no_kk || '').toString();
      const matchesSearch = safeName.includes(query) || safeNik.includes(query) || safeKk.includes(query);

      // Category filter
      let matchesFilter = true;
      if (activeFilter !== 'Semua') {
        if (activeFilter === '✨ Terbaru') {
          // When filtering by Terbaru, include all residents so we can sort newest first
          matchesFilter = true;
        } else if (activeFilter === '🎁 Penerima Bansos') {
          const aids: string[] = Array.isArray(item.activeAids) 
            ? item.activeAids 
            : (typeof item.active_aids === 'string' ? JSON.parse(item.active_aids || '[]') : (item.active_aids || []));
          const activePrograms = aids.filter((a: string) => !a.startsWith('STOPPED'));
          matchesFilter = activePrograms.length > 0;
        } else if (activeFilter === '🚫 Non-Penerima') {
          const aids: string[] = Array.isArray(item.activeAids) 
            ? item.activeAids 
            : (typeof item.active_aids === 'string' ? JSON.parse(item.active_aids || '[]') : (item.active_aids || []));
          const activePrograms = aids.filter((a: string) => !a.startsWith('STOPPED'));
          matchesFilter = activePrograms.length === 0;
        } else if (activeFilter === 'Pindah') {
          const s = (item.status || '').toLowerCase();
          matchesFilter = s.includes('pindah') || s.includes('mutasi');
        } else if (activeFilter === 'Meninggal') {
          const s = (item.status || '').toLowerCase();
          matchesFilter = s.includes('meninggal') || s === 'mati' || s === 'wafat';
        } else if (activeFilter.startsWith('RW')) {
          const rw = activeFilter.split(' ')[1];
          const itemRw = item.rw || (item.rtRw ? item.rtRw.split(/[\/\s-]+/)[1] : '');
          matchesFilter = (itemRw || '').trim().padStart(2, '0') === rw.trim().padStart(2, '0');
        } else if (activeFilter.startsWith('RT')) {
          const rt = activeFilter.split(' ')[1];
          const itemRt = item.rt || (item.rtRw ? item.rtRw.split(/[\/\s-]+/)[0] : '');
          matchesFilter = (itemRt || '').trim().padStart(2, '0') === rt.trim().padStart(2, '0');
        } else if (activeFilter === 'Laki-laki') {
          matchesFilter = item.gender === 'Laki-laki';
        } else if (activeFilter === 'Perempuan') {
          matchesFilter = item.gender === 'Perempuan';
        } else if (activeFilter === 'Anak (0-11)') {
          const age = parseInt(item.age);
          matchesFilter = !isNaN(age) && age >= 0 && age < 12;
        } else if (activeFilter === 'Remaja (12-17)') {
          const age = parseInt(item.age);
          matchesFilter = !isNaN(age) && age >= 12 && age <= 17;
        } else if (activeFilter === 'Dewasa (18-59)') {
          const age = parseInt(item.age);
          matchesFilter = !isNaN(age) && age >= 18 && age <= 59;
        } else if (activeFilter === 'Lansia') {
          matchesFilter = typeof item.age === 'number' ? item.age >= 60 : parseInt(item.age || '0') >= 60;
        } else {
          matchesFilter = item.status === activeFilter;
        }
      }

      // Aid Program dropdown filter
      let matchesAid = true;
      if (aidFilter !== 'Semua Bantuan') {
        const aids: string[] = Array.isArray(item.activeAids) 
          ? item.activeAids 
          : (typeof item.active_aids === 'string' ? JSON.parse(item.active_aids || '[]') : (item.active_aids || []));
        const activePrograms = aids.filter((a: string) => !a.startsWith('STOPPED'));

        if (aidFilter === 'Penerima Bansos') {
          matchesAid = activePrograms.length > 0;
        } else if (aidFilter === 'Non-Penerima Bansos') {
          matchesAid = activePrograms.length === 0;
        } else {
          matchesAid = activePrograms.some((a: string) => a.toLowerCase().includes(aidFilter.toLowerCase()));
        }
      }

      return matchesSearch && matchesFilter && matchesAid;
    });

    // Sorting
    if (sortOrder === 'Terbaru' || activeFilter === '✨ Terbaru') {
      result = [...result].sort((a, b) => {
        const timeA = a._orderKey || (a.created_at ? new Date(a.created_at).getTime() : 0);
        const timeB = b._orderKey || (b.created_at ? new Date(b.created_at).getTime() : 0);
        if (timeA !== timeB) return timeB - timeA;

        const idA = typeof a.id === 'number' ? a.id : (Number(a.id) || 0);
        const idB = typeof b.id === 'number' ? b.id : (Number(b.id) || 0);
        if (idA !== idB) return idB - idA;

        return String(b.nik || '').localeCompare(String(a.nik || ''));
      });
    } else if (sortOrder === 'No. KK') {
      result = [...result].sort((a, b) => {
        const kkA = a.noKk || '';
        const kkB = b.noKk || '';
        if (kkA !== kkB) {
          return kkA.localeCompare(kkB);
        }
        
        // Jika KK sama, urutkan berdasarkan Hubungan Keluarga
        const relationPriority = (relation: string) => {
          const r = (relation || '').toLowerCase();
          if (r.includes('kepala')) return 1;
          if (r.includes('istri')) return 2;
          if (r.includes('anak')) return 3;
          return 4;
        };
        
        const prioA = relationPriority(a.familyRelation);
        const prioB = relationPriority(b.familyRelation);
        
        if (prioA !== prioB) {
          return prioA - prioB;
        }
        
        // Jika status hubungannya juga sama, urutkan A-Z
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (sortOrder === 'A-Z Nama') {
      result = [...result].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortOrder === 'Z-A Nama') {
      result = [...result].sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }

    return result;
  }, [residents, debouncedSearchQuery, activeFilter, sortOrder, aidFilter]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ nik: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const authUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
    } catch (e) {
      return {};
    }
  }, []);

  const isSuperAdmin = authUser.role === 'kades' || authUser.role === 'saas_admin';

  const handleRequestDelete = (nik: string, name: string) => {
    setDeleteConfirmModal({ nik, name });
  };

  const executeDelete = async () => {
    if (!deleteConfirmModal || !tenantId) return;
    const { nik, name } = deleteConfirmModal;
    setIsDeleting(true);

    try {
      if (isSuperAdmin) {
        // Super Admin: Move directly to Trash Bin (soft delete)
        const { error } = await supabase.from('residents')
          .update({ status: 'archived', deleted_at: new Date().toISOString() })
          .eq('nik', nik)
          .eq('tenant_id', tenantId);

        if (error) throw error;
        showToast(`Data ${name} berhasil dipindahkan ke Tong Sampah (Recycle Bin)!`, 'success');
        
        // Log notification
        await supabase.from('notifications').insert([{
          id: `notif-${Date.now()}`,
          tenant_id: tenantId,
          title: "Penduduk Masuk Tong Sampah",
          message: `Data penduduk ${name} (NIK: ${nik}) dipindahkan ke Tong Sampah oleh Super Admin.`,
          category: "Residents",
          is_read: false,
          timestamp: new Date().toISOString()
        }]);

      } else {
        // Admin biasa: Send for Super Admin approval
        const { error } = await supabase.from('residents')
          .update({ status: 'pending_approval', status_color: 'amber' })
          .eq('nik', nik)
          .eq('tenant_id', tenantId);

        if (error) throw error;
        showToast(`Pengajuan hapus data ${name} berhasil dikirim ke Super Admin!`, 'success');
        
        // Log notification
        await supabase.from('notifications').insert([{
          id: `notif-${Date.now()}`,
          tenant_id: tenantId,
          title: "Pengajuan Hapus Penduduk",
          message: `Admin Desa mengajukan penghapusan untuk data penduduk ${name} (NIK: ${nik}).`,
          category: "Residents",
          is_read: false,
          timestamp: new Date().toISOString()
        }]);
      }
      
      window.dispatchEvent(new Event('notifications_updated'));
      fetchResidents();
      setDeleteConfirmModal(null);
    } catch (err: any) {
      showToast(`Gagal: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportData = (format: 'json' | 'csv') => {
    if (residents.length === 0) {
      showToast("Tidak ada data penduduk yang dapat diexport.", "error");
      return;
    }

    let fileContent = '';
    let fileName = '';
    let mimeType = '';

    if (format === 'json') {
      fileContent = JSON.stringify(residents, null, 2);
      fileName = `Backup_Penduduk_${villageName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else {
      // CSV format
      const headers = ['NIK', 'No KK', 'Nama Lengkap', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Golongan Darah', 'Agama', 'Pekerjaan', 'Status Keberadaan', 'Status Perkawinan', 'RT', 'RW', 'Desa', 'Alamat', 'Status Domisili', 'Hubungan Keluarga', 'Pendidikan', 'Nama Ayah Kandung', 'Nama Ibu Kandung'];
      const rows = residents.map(r => [
        `"${r.nik || ''}"`,
        `"${r.noKk || ''}"`,
        `"${r.name || ''}"`,
        `"${r.gender || ''}"`,
        `"${r.birthPlace || ''}"`,
        `"${r.birthDate || ''}"`,
        `"${r.bloodType || ''}"`,
        `"${r.religion || ''}"`,
        `"${r.job || ''}"`,
        `"${r.status || 'Aktif'}"`,
        `"${r.maritalStatus || 'Belum Kawin'}"`,
        `"${r.rt || ''}"`,
        `"${r.rw || ''}"`,
        `"${r.desa || ''}"`,
        `"${r.address || ''}"`,
        `"${r.domicileStatus || ''}"`,
        `"${r.familyRelation || ''}"`,
        `"${r.education || ''}"`,
        `"${r.fatherName || ''}"`,
        `"${r.motherName || ''}"`
      ]);

      fileContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      fileName = `Backup_Penduduk_${villageName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv;charset=utf-8;';
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowMoreMenu(false);
  };

  // Exclude Pindah and Meninggal from active population counts (so they don't count towards active headcounts)
  const activeResidents = useMemo(() => {
    return residents.filter(r => {
      const s = (r.status || 'Aktif').toLowerCase();
      return !s.includes('pindah') && !s.includes('meninggal') && s !== 'mati' && s !== 'archived';
    });
  }, [residents]);

  const totalCount = activeResidents.length;
  const getKepalaKeluarga = (noKk: string) => {
    if (!noKk) return '-';
    const head = residents.find(r => r.noKk === noKk && r.familyRelation === 'Kepala Keluarga');
    return head ? head.name : '-';
  };
  const maleCount = activeResidents.filter(r => r.gender === 'Laki-laki').length;
  const femaleCount = activeResidents.filter(r => r.gender === 'Perempuan').length;

  const childCount = activeResidents.filter(r => {
    const age = parseInt(r.age);
    return !isNaN(age) && age >= 0 && age < 12;
  }).length;
  const teenagerCount = activeResidents.filter(r => {
    const age = parseInt(r.age);
    return !isNaN(age) && age >= 12 && age <= 17;
  }).length;
  const adultCount = activeResidents.filter(r => {
    const age = parseInt(r.age);
    return !isNaN(age) && age >= 18 && age <= 59;
  }).length;
  const elderlyCount = activeResidents.filter(r => {
    const age = parseInt(r.age);
    return !isNaN(age) && age >= 60;
  }).length;

  const statCardData = [
    { label: 'Total', value: totalCount, filter: 'Semua', active: activeFilter === 'Semua', span: 'col-span-2 md:col-span-1', emerald: true },
    { label: 'Laki-Laki', value: maleCount, filter: 'Laki-laki', active: activeFilter === 'Laki-laki', span: '', emerald: false },
    { label: 'Perempuan', value: femaleCount, filter: 'Perempuan', active: activeFilter === 'Perempuan', span: '', emerald: false },
    { label: 'Anak (0-11)', value: childCount, filter: 'Anak (0-11)', active: activeFilter === 'Anak (0-11)', span: '', emerald: false },
    { label: 'Remaja (12-17)', value: teenagerCount, filter: 'Remaja (12-17)', active: activeFilter === 'Remaja (12-17)', span: '', emerald: false },
    { label: 'Dewasa (18-59)', value: adultCount, filter: 'Dewasa (18-59)', active: activeFilter === 'Dewasa (18-59)', span: '', emerald: false },
    { label: 'Lansia (60+)', value: elderlyCount, filter: 'Lansia', active: activeFilter === 'Lansia', span: '', emerald: false },
  ];

  const applyStatFilter = (label: string) => {
    setActiveFilter(label);
    if (label === 'Semua') {
      setSortOrder('No. KK');
    }
    setSearchQuery('');
    setAidFilter('Semua Bantuan');
    setCurrentPage(1);
  };

  if (editingPenduduk) {
    return <AdminPendudukEdit data={editingPenduduk} onBack={() => setEditingPenduduk(null)} onSave={handleSavePenduduk} />;
  }

  if (selectedPenduduk) {
    return (
      <AdminPendudukDetail 
        data={selectedPenduduk} 
        onBack={() => { setSelectedPenduduk(null); fetchResidents(); }} 
        onEdit={() => { setEditingPenduduk(selectedPenduduk); setSelectedPenduduk(null); }} 
        residents={residents}
        onSelectResident={(resident) => setSelectedPenduduk(resident)}
        onUpdateResident={(updatedRes) => {
          setSelectedPenduduk(updatedRes);
          fetchResidents();
        }}
        onNavigateToTab={onNavigateToTab}
        onSetPresetResident={onSetPresetResident}
      />
    );
  }

  if (showArchive) {
    return <AdminPendudukArchive onBack={() => { setShowArchive(false); fetchResidents(); }} />;
  }

  return (
    <div className="pb-24 space-y-4">
      {/* Page Header */}
      <div className="sticky top-16 z-40 bg-slate-50 dark:bg-slate-800 pb-6 -mx-4 -mt-4 px-4 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <nav className="flex text-xs text-gray-500 dark:text-slate-400 mb-2 gap-2 font-medium">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-emerald-700 font-bold">Penduduk</span>
          </nav>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Daftar Penduduk</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">Kelola data informasi kependudukan {villageName}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <button 
              onClick={() => setShowMoreMenu(!showMoreMenu)} 
              className="w-full justify-center flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm dark:shadow-none bg-white dark:bg-slate-900 whitespace-nowrap"
            >
              <MoreHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Opsi Lainnya</span>
            </button>
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-lg dark:shadow-none py-1.5 z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
                  <button 
                    onClick={() => { setShowMoreMenu(false); setShowArchive(true); }} 
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-900/20 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    Tong Sampah
                  </button>
                  <button 
                    onClick={() => { setShowMoreMenu(false); setShowImportModal(true); }} 
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-emerald-50/50 flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    Impor Data
                  </button>
                  <div className="my-1 border-t border-gray-100 dark:border-slate-800"></div>
                  <button 
                    onClick={() => { setShowMoreMenu(false); handleExportData('json'); }} 
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-emerald-50/50 flex items-center gap-2 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                    <div className="flex flex-col">
                      <span>Backup JSON (Lengkap)</span>
                      <span className="text-[10px] text-gray-400 font-normal">Sangat cocok untuk restore</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => { setShowMoreMenu(false); handleExportData('csv'); }} 
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-emerald-50/50 flex items-center gap-2 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <div className="flex flex-col">
                      <span>Unduh CSV (Excel)</span>
                      <span className="text-[10px] text-gray-400 font-normal">Cocok diolah di spreadsheet</span>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button onClick={() => {
            if (!ENABLE_AI_FEATURES) {
              showToast(AI_DEV_MESSAGE, 'info');
              return;
            }
            setShowAiAnalysis(true);
          }} className="relative group overflow-hidden flex-1 md:flex-none justify-center flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm shadow-sm dark:shadow-none hover:from-indigo-700 hover:to-purple-700 transition-all whitespace-nowrap border border-indigo-500/50">
            <Sparkles className="w-4 h-4 text-purple-200 group-hover:animate-pulse" />
            <span>Analisis Data AI</span>
            {!ENABLE_AI_FEATURES && <span className="bg-amber-300 text-amber-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">[DEV]</span>}
            <span className="absolute top-0 right-0 flex w-3 h-3 mt-0.5 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
          </button>
          <button onClick={() => setEditingPenduduk({})} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm dark:shadow-none hover:bg-emerald-800 transition-colors whitespace-nowrap">
            <UserPlus className="w-4 h-4" />
            <span>Tambah Penduduk</span>
          </button>
        </div>
      </div>

      {/* Stats Overview - clickable, triggers table filter */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {statCardData.map((card) => (
          <button
            key={card.label}
            onClick={() => applyStatFilter(card.filter)}
            className={`${card.span} bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm dark:shadow-none flex flex-col justify-center items-center text-center cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all ${
              card.active
                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                : 'border-gray-100 dark:border-slate-800 hover:border-emerald-300'
            }`}
            title={`Klik untuk menampilkan ${card.label}`}
          >
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">{card.label}</p>
            <h3 className={`text-xl font-bold ${card.emerald ? 'text-emerald-700' : 'text-gray-900 dark:text-white'}`}>
              <NumberCounter end={card.value} />
            </h3>
          </button>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 p-6">
        <div className="flex mb-6 flex-col gap-5">
          {showQuickFilters && (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-sm font-bold text-gray-600 dark:text-slate-400 mr-2">Filter Cepat:</span>
              {FILTERS.map((filter) => (
                <button 
                  key={filter}
                  onClick={() => {
                    setActiveFilter(filter);
                    if (filter === '✨ Terbaru') {
                      setSortOrder('Terbaru');
                    } else if (filter === 'Semua') {
                      setSortOrder('No. KK');
                    }
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm dark:shadow-none ${
                    activeFilter === filter 
                      ? 'bg-emerald-700 text-white' 
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
          <div className="flex mb-6 flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Masukkan NIK, No. KK, atau Nama Penduduk..." 
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 outline-none transition-shadow"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select 
                value={aidFilter}
                onChange={(e) => setAidFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 focus:ring-2 focus:ring-emerald-500 text-xs font-extrabold text-emerald-900 dark:text-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/40 outline-none cursor-pointer min-w-[200px] shadow-2xs"
              >
                <option value="Semua Bantuan">🎁 Filter Bantuan: Semua Status</option>
                <option value="Penerima Bansos">🎁 Semua Penerima Bansos</option>
                <option value="Non-Penerima Bansos">🚫 Non-Penerima Bansos</option>
                <option value="BLT Dana Desa">BLT Dana Desa</option>
                <option value="Program Keluarga Harapan">PKH (Keluarga Harapan)</option>
                <option value="Bantuan Pangan Non-Tunai">BPNT (Bantuan Pangan)</option>
                <option value="Bansos Tunai Kemensos">Bansos Tunai Kemensos</option>
                <option value="Bantuan Cadangan Beras">Cadangan Beras (CBP)</option>
                <option value="RTLH">RTLH (Bedah Rumah)</option>
                <option value="Jaminan Kesehatan PBI-JK">BPJS Gratis (PBI-JK)</option>
              </select>

              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 outline-none cursor-pointer min-w-[170px]"
              >
                <option value="No. KK">Urutkan: No. KK</option>
                <option value="Terbaru">Urutkan: ✨ Terbaru Ditambahkan</option>
                <option value="A-Z Nama">Urutkan: A-Z Nama</option>
                <option value="Z-A Nama">Urutkan: Z-A Nama</option>
              </select>
              <button 
                onClick={() => setShowQuickFilters(!showQuickFilters)}
                className={`p-2.5 rounded-xl border transition-colors ${
                  showQuickFilters 
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                    : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'
                }`}
                title="Tampilkan/Sembunyikan Filter Cepat"
              >
                {showQuickFilters ? (
                  <Filter className="w-5 h-5" />
                ) : (
                  <FilterX className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">NIK / No. KK</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Nama Lengkap / KK</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Status Kependudukan / Gender</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Umur</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">RT/RW</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Bantuan Aktif</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center whitespace-nowrap sticky right-0 bg-gray-50 dark:bg-slate-800 z-10 shadow-[-4px_0_8px_rgba(0,0,0,0.02)] border-l border-gray-100 dark:border-slate-800">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100" onClick={(e) => {
              const target = e.target as HTMLElement;
              const viewBtn = target.closest('[data-action="view"]');
              const editBtn = target.closest('[data-action="edit"]');
              const row = target.closest('tr[data-nik]');

              if (editBtn && row) {
                e.stopPropagation();
                const nik = row.getAttribute('data-nik');
                const item = paginatedData.find(d => d.nik === nik);
                if (item) setEditingPenduduk(item);
              } else if (viewBtn && row) {
                e.stopPropagation();
                const nik = row.getAttribute('data-nik');
                const item = paginatedData.find(d => d.nik === nik);
                if (item) setSelectedPenduduk(item);
              } else if (row) {
                const nik = row.getAttribute('data-nik');
                const item = paginatedData.find(d => d.nik === nik);
                if (item) setSelectedPenduduk(item);
              }
            }}>
              {loading && residents.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24 mb-2"></div><div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="flex gap-2 mb-2"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32"></div><div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-12"></div></div><div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16 mb-2"></div><div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-10"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-10"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-12"></div></td>
                    <td className="px-6 py-4 hidden lg:table-cell"><div className="h-5 bg-gray-200 dark:bg-slate-700 rounded-full w-24"></div></td>
                    <td className="px-6 py-4"><div className="flex gap-2 justify-center"><div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-lg"></div><div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-lg"></div><div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-lg"></div></div></td>
                  </tr>
                ))
              ) : (
                <AnimatePresence mode="popLayout">
                {paginatedData.length > 0 ? (
                  paginatedData.map((item) => (
                    <TableRow 
                      key={item.nik}
                      item={item}
                      nik={item.nik} 
                    noKk={item.noKk}
                    initials={item.initials} 
                    name={item.name} 
                    age={item.age}
                    gender={item.gender} 
                    genderColor={item.genderColor} 
                    rtRw={item.rtRw} 
                    status={item.status} 
                    maritalStatus={item.maritalStatus}
                    statusColor={item.statusColor}
                    avatarColor={item.avatarColor}
                    activeAids={item.activeAids || []}
                    onEdit={(selectedItem: any) => setEditingPenduduk(selectedItem)}
                    onRequestDelete={(nik: string, name: string) => handleRequestDelete(nik, name)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-slate-400">
                    Tidak ada data penduduk yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              )}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-gray-50/50 dark:bg-slate-800/50 px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">
            Menampilkan <span className="font-bold text-gray-900 dark:text-white">
              {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredData.length)}
            </span> dari <span className="font-bold text-gray-900 dark:text-white">{filteredData.length}</span> data
          </p>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Show first, last, current, and pages around current
                return (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
                );
              })
              .reduce((acc, page, index, arr) => {
                // Add ellipsis if there is a gap
                if (index > 0 && page - arr[index - 1] > 1) {
                  acc.push(
                    <span key={`ellipsis-${page}`} className="px-1.5 text-gray-400 font-medium text-xs">
                      ...
                    </span>
                  );
                }
                acc.push(
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                      currentPage === page
                        ? "bg-emerald-700 text-white shadow-sm dark:shadow-none font-extrabold"
                        : "hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400 font-semibold"
                    }`}
                  >
                    {page}
                  </button>
                );
                return acc;
              }, [] as React.ReactNode[])}

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {showImportModal && (
        <AdminPendudukImport onClose={() => setShowImportModal(false)} onRefresh={fetchResidents} />
      )}

      {showAiAnalysis && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAiAnalysis(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner text-white">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Analisis Penduduk AI</h3>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Berdasarkan data {residents.length} penduduk terdaftar</p>
                </div>
              </div>
              <button onClick={() => setShowAiAnalysis(false)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <FilterX size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-gray-50/50 dark:bg-slate-800/50">
              <div className="space-y-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm dark:shadow-none">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <Users size={16} className="text-indigo-600" /> Demografi Usia
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                    Sebagian besar penduduk berada pada usia produktif (18-45 tahun). Terdapat potensi besar untuk program pemberdayaan ekonomi dan pelatihan kerja.
                  </p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm dark:shadow-none">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <Heart size={16} className="text-rose-500" /> Bantuan Sosial
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                    AI mendeteksi ada sekitar 15% keluarga yang berpotensi membutuhkan bantuan sosial berdasarkan indikator pekerjaan dan jumlah tanggungan.
                  </p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm dark:shadow-none">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <Zap size={16} className="text-amber-500" /> Rekomendasi Program
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                    Disarankan untuk mengadakan program posyandu lansia di RW 02 dikarenakan tingginya konsentrasi penduduk usia lanjut di area tersebut.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
              <button onClick={() => setShowAiAnalysis(false)} className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 font-bold text-sm rounded-lg transition-colors">
                Tutup Analisis
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative overflow-hidden">
            
            {/* Header Icon */}
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                isSuperAdmin ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/40' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/40'
              }`}>
                {isSuperAdmin ? <Trash2 className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                  {isSuperAdmin ? 'Pindahkan ke Tong Sampah?' : 'Ajukan Penghapusan Penduduk?'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                  {isSuperAdmin ? 'Aksi Penghapusan oleh Super Admin' : 'Antrean Persetujuan Super Admin'}
                </p>
              </div>
            </div>

            {/* Description Body */}
            <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 text-xs leading-relaxed space-y-3">
              <p className="text-gray-700 dark:text-slate-300">
                {isSuperAdmin ? (
                  <>
                    Apakah Anda yakin ingin menghapus data penduduk <strong className="text-gray-900 dark:text-white font-bold">{deleteConfirmModal.name}</strong> (NIK: <code className="font-mono text-emerald-600 font-bold">{deleteConfirmModal.nik}</code>)?
                  </>
                ) : (
                  <>
                    Apakah Anda yakin ingin mengajukan penghapusan data penduduk <strong className="text-gray-900 dark:text-white font-bold">{deleteConfirmModal.name}</strong> (NIK: <code className="font-mono text-emerald-600 font-bold">{deleteConfirmModal.nik}</code>)?
                  </>
                )}
              </p>
              
              <div className={`p-3 rounded-xl border text-[11px] font-semibold flex items-start gap-2.5 ${
                isSuperAdmin ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300' : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'
              }`}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {isSuperAdmin 
                    ? 'Data penduduk ini akan dipindahkan ke Tong Sampah (Recycle Bin) dan akan terhapus otomatis secara permanen setelah 30 hari. Anda dapat memulihkannya kembali dari Tong Sampah kapan saja.' 
                    : 'Data tidak akan langsung hilang dari sistem, melainkan dikirim ke antrean persetujuan Super Admin.'
                  }
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={executeDelete}
                disabled={isDeleting}
                className={`flex-1 py-3 px-4 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                  isSuperAdmin ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                }`}
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isSuperAdmin ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Pindahkan ke Tong Sampah
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    Kirim Pengajuan
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}


const TableRow = React.memo(({ item, nik, noKk, initials, name, age, gender, genderColor, rtRw, status, maritalStatus, statusColor, avatarColor, activeAids, onEdit, onRequestDelete }: any) => {
  const getBadgeColors = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'pink': return 'bg-pink-50 text-pink-700 border-pink-100';
      case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'gray': return 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700';
      default: return 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700';
    }
  };

  return (
    <motion.tr data-nik={nik} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, height: 0, transition: { duration: 0.3 } }} className="hover:bg-gray-50/80 transition-colors group cursor-pointer">
      <td className="px-6 py-3.5 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono group-hover:text-emerald-700 transition-colors">{nik}</span>
          <span className="text-[10px] text-gray-400 font-mono">KK: {noKk || '-'}</span>
        </div>
      </td>
      <td className="px-6 py-3.5 whitespace-nowrap">
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-gray-900 dark:text-white uppercase">{name}</span>
            {item.created_at && (Date.now() - new Date(item.created_at).getTime() < 14 * 24 * 60 * 60 * 1000) && (
              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/80 shrink-0 flex items-center gap-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                BARU
              </span>
            )}
            {maritalStatus && (
              <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                {maritalStatus}
              </span>
            )}
            {status === 'pending_approval' && (
              <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-200 shadow-sm dark:shadow-none shrink-0 uppercase tracking-wider">
                Menunggu Konfirmasi
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-3.5 whitespace-nowrap">
        <div className="flex flex-col gap-1.5 items-start">
          {(() => {
            const s = (status || 'Aktif').trim().toLowerCase();
            if (s.includes('meninggal') || s === 'mati' || s === 'wafat') {
              return <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 leading-none">Meninggal</span>;
            }
            if (s.includes('pindah') || s.includes('mutasi')) {
              return <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 leading-none">Pindah</span>;
            }
            if (s === 'pending_approval' || s === 'pending') {
              return <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 leading-none">Pending</span>;
            }
            return <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 leading-none">{s === 'aktif' ? 'Hidup' : (status || 'Hidup')}</span>;
          })()}
          <span className={`text-[10px] px-2 py-1 rounded-md font-bold border whitespace-nowrap leading-none ${getBadgeColors(genderColor)}`}>
            {gender}
          </span>
        </div>
      </td>
      <td className="px-6 py-3.5 text-sm font-medium text-gray-600 dark:text-slate-400 whitespace-nowrap">
        {age} Thn
      </td>
      <td className="px-6 py-3.5 text-sm font-medium text-gray-600 dark:text-slate-400 whitespace-nowrap">{rtRw}</td>
      <td className="px-6 py-3.5 whitespace-nowrap hidden lg:table-cell">
        {activeAids && activeAids.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm dark:shadow-none whitespace-nowrap" title={activeAids.join(', ')}>
            <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse" fill="currentColor" />
            {activeAids.length} Program
          </span>
        ) : (
          <span className="text-sm font-semibold text-gray-300">-</span>
        )}
      </td>
      <td className="px-6 py-3.5 whitespace-nowrap sticky right-0 bg-white dark:bg-slate-900 z-10 border-l border-gray-50 shadow-[-4px_0_8px_rgba(0,0,0,0.02)] group-hover:bg-gray-50 transition-colors">
        <div className="flex items-center justify-center gap-2">
          <button data-action="view" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Detail">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(item || { nik, name, noKk, gender, rtRw, status, age }); }} disabled={status === 'pending_approval'} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); if (onRequestDelete) onRequestDelete(nik, name); }} disabled={status === 'pending_approval'} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Hapus">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
});
