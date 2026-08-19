import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';
import { addSaaSLog } from './saasLogs';

export interface ResidentCheckResult {
  exists: boolean;          // true ONLY if active resident exists
  isFoundInDb: boolean;     // true if record exists in DB (even if deleted/inactive)
  statusType: 'active' | 'inactive' | 'not_found';
  reason?: string;          // e.g. "Meninggal", "Pindah", "Diarsipkan", "Dihapus"
  resident?: any;
}

export async function checkResidentDetailedStatus(nik?: string, name?: string): Promise<ResidentCheckResult> {
  const cleanNik = (nik && nik !== '-' && nik.trim() !== '') ? nik.trim() : null;
  const cleanName = (name && name !== '-' && name.trim() !== '') ? name.trim() : null;

  if (!cleanNik && !cleanName) {
    return { exists: true, isFoundInDb: false, statusType: 'not_found' };
  }

  try {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) {
      return { exists: false, isFoundInDb: false, statusType: 'not_found' };
    }

    let records: any[] = [];
    if (cleanNik) {
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('nik', cleanNik)
        .limit(10);
      if (!error && data) records = data;
    } else if (cleanName) {
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('tenant_id', tenantId)
        .ilike('name', cleanName)
        .limit(10);
      if (!error && data) records = data;
    }

    if (records.length === 0) {
      return { exists: false, isFoundInDb: false, statusType: 'not_found' };
    }

    // Check if any record is ACTIVE
    const activeRecord = records.find(r => {
      const isDeleted = String(r.is_deleted) === '1' || r.is_deleted === true;
      if (isDeleted) return false;
      const s = (r.status || 'Aktif').toLowerCase();
      if (s.includes('pindah') || s.includes('meninggal') || s === 'mati' || s === 'archived') return false;
      return true;
    });

    if (activeRecord) {
      return { exists: true, isFoundInDb: true, statusType: 'active', resident: activeRecord };
    }

    // If not active, pick the first record to show reason (e.g., Pindah/Meninggal/Archived)
    const inactiveRecord = records[0];
    const isDeleted = String(inactiveRecord.is_deleted) === '1' || inactiveRecord.is_deleted === true;
    let reason = inactiveRecord.status || 'Non-Aktif';
    if (isDeleted) reason = 'Diarsipkan / Dihapus';

    return {
      exists: false,
      isFoundInDb: true,
      statusType: 'inactive',
      reason,
      resident: inactiveRecord
    };

  } catch (err) {
    console.error('Error in checkResidentDetailedStatus:', err);
    return { exists: false, isFoundInDb: false, statusType: 'not_found' };
  }
}

export async function checkResidentExists(nik?: string, name?: string): Promise<boolean> {
  const result = await checkResidentDetailedStatus(nik, name);
  return result.exists;
}

export async function reactivateResident(nik: string): Promise<boolean> {
  if (!nik) return false;
  try {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return false;

    const { error } = await supabase
      .from('residents')
      .update({
        status: 'Aktif',
        statusColor: 'green',
        is_deleted: false
      })
      .eq('tenant_id', tenantId)
      .eq('nik', nik);

    if (error) {
      console.error('Failed to reactivate resident:', error);
      return false;
    }

    const cached = localStorage.getItem('village_residents');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const updated = parsed.map((r: any) => {
          if (r.nik === nik) {
            return { ...r, status: 'Aktif', statusColor: 'green', is_deleted: false };
          }
          return r;
        });
        localStorage.setItem('village_residents', JSON.stringify(updated));
      } catch (e) {}
    }

    window.dispatchEvent(new Event('residents_updated'));
    return true;
  } catch (err) {
    console.error('Error in reactivateResident:', err);
    return false;
  }
}

// Sinkron status perkawinan penduduk (mis. dari Surat Nikah / penghapusan surat).
// HANYA memperbarui penduduk yang sudah terdata AKTIF (berdomisili di desa admin).
// Tidak pernah menginsert penduduk baru — urusan itu tetap di autoSyncResidentFromLetter.
export async function updateResidentMaritalStatus(
  nik: string,
  maritalStatus: string,
  source: string
): Promise<boolean> {
  if (!nik || nik === '-' || nik.trim() === '') return false;
  try {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return false;

    const { data: existing, error } = await supabase
      .from('residents')
      .select('marital_status, status, is_deleted')
      .eq('nik', nik)
      .eq('tenant_id', tenantId)
      .limit(10);
    if (error) {
      console.error('updateResidentMaritalStatus query error:', error);
      return false;
    }

    const active = existing?.find(r => {
      if (String(r.is_deleted) === '1' || r.is_deleted === true) return false;
      const s = (r.status || 'Aktif').toLowerCase();
      if (s.includes('pindah') || s.includes('meninggal') || s === 'mati' || s === 'archived') return false;
      return true;
    });
    // Bukan warga aktif desa admin => tidak disentuh.
    if (!active) return false;

    if (String(active.marital_status || '').trim().toLowerCase() === maritalStatus.trim().toLowerCase()) {
      return true; // sudah sesuai, tidak perlu update
    }

    const updatePayload: Record<string, any> = { marital_status: maritalStatus };
    let { error: updateError } = await supabase
      .from('residents')
      .update(updatePayload)
      .eq('nik', nik)
      .eq('tenant_id', tenantId);

    let retries = 0;
    while (updateError && updateError.message?.includes('Could not find the') && updateError.message?.includes('column') && retries < 5) {
      const match = updateError.message.match(/'([^']+)' column/);
      if (match && match[1]) {
        delete updatePayload[match[1]];
        const retry = await supabase.from('residents').update(updatePayload).eq('nik', nik).eq('tenant_id', tenantId);
        updateError = retry.error;
        retries++;
      } else {
        break;
      }
    }
    if (updateError) {
      console.error('updateResidentMaritalStatus update error:', updateError);
      return false;
    }

    // Sinkronkan cache lokal agar tabel penduduk langsung berubah tanpa refresh.
    const cached = localStorage.getItem('village_residents');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const updated = parsed.map((r: any) =>
          r.nik === nik ? { ...r, maritalStatus, marital_status: maritalStatus } : r
        );
        localStorage.setItem('village_residents', JSON.stringify(updated));
      } catch (e) {}
    }

    window.dispatchEvent(new Event('residents_updated'));

    addSaaSLog({
      admin: 'Sistem',
      aksi: 'Sinkron Status Perkawinan',
      target: `NIK ${nik} -> ${maritalStatus} (via ${source})`,
      status: 'Berhasil',
      category: 'Penduduk'
    });
    return true;
  } catch (err) {
    console.error('updateResidentMaritalStatus error:', err);
    return false;
  }
}

// Background sync function for places where we want to automatically insert
// the resident without user intervention (e.g. LayananMandiri, AdminApprovalQueue)
export async function autoSyncResidentFromLetter(nik: string, letterData: any, letterType: string) {
  if (!nik || nik === '-' || nik.trim() === '') return;
  
  try {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;

    const { data: existing, error } = await supabase
      .from('residents')
      .select('nik, is_deleted, status')
      .eq('nik', nik)
      .eq('tenant_id', tenantId)
      .limit(10);
      
    if (error) {
      console.error('Supabase query error:', error);
      return;
    }

    const activeData = existing?.filter(r => {
      if (String(r.is_deleted) === '1' || r.is_deleted === true) return false;
      const s = (r.status || 'Aktif').toLowerCase();
      if (s.includes('pindah') || s.includes('meninggal') || s === 'mati' || s === 'archived') return false;
      return true;
    }) || [];

    if (activeData.length === 0) {
      const nowIso = new Date().toISOString();
      const calculateAge = (dob: string) => {
        if (!dob) return 0;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age > 0 ? age : 0;
      };

      const dbPayload = {
        tenant_id: tenantId,
        nik: nik,
        name: letterData.name || letterData.nama || '-',
        no_kk: letterData.noKk || letterData.no_kk || '-',
        gender: letterData.gender || letterData.jenisKelamin || 'Laki-Laki',
        birth_place: letterData.birthPlace || letterData.tempatLahir || '-',
        birth_date: letterData.birthDate || letterData.tanggalLahir || '1990-01-01',
        age: calculateAge(letterData.birthDate || letterData.tanggalLahir),
        blood_type: letterData.bloodType || letterData.golonganDarah || '-',
        religion: letterData.religion || letterData.agama || 'Islam',
        education: letterData.education || letterData.pendidikan || 'SLTA/SEDERAJAT',
        job: letterData.job || letterData.pekerjaan || 'Wiraswasta',
        address: letterData.address || letterData.alamat || '-',
        rt_rw: letterData.rt_rw || `${letterData.rt || '001'}/${letterData.rw || '001'}`,
        rt: letterData.rt || '001',
        rw: letterData.rw || '001',
        desa: letterData.desa || '',
        status: 'Aktif',
        domicile_status: letterData.domicileStatus || 'Tetap',
        family_relation: letterData.familyRelation || 'Kepala Keluarga',
        father_name: letterData.fatherName || letterData.namaAyah || '-',
        mother_name: letterData.motherName || letterData.namaIbu || '-',
        active_aids: '[]',
        gender_color: 'blue',
        status_color: 'emerald'
      };

      let insertPayload = { ...dbPayload };
      let { error } = await supabase.from('residents').insert([insertPayload]);
      
      let retries = 0;
      while (error && error.message?.includes('Could not find the') && error.message?.includes('column') && retries < 5) {
        const match = error.message.match(/'([^']+)' column/);
        if (match && match[1]) {
          delete insertPayload[match[1]];
          const retry = await supabase.from('residents').insert([insertPayload]);
          error = retry.error;
          retries++;
        } else {
          break;
        }
      }
      if (!error) {
        addSaaSLog({
          admin: 'Sistem',
          aksi: 'Pendataan Otomatis',
          target: `${dbPayload.name} (${nik}) via ${letterType}`,
          status: 'Berhasil',
          category: 'Penduduk'
        });

        await supabase.from('notifications').insert([{
          id: `notif-${Date.now()}`,
          tenant_id: tenantId,
          title: "Penduduk Terdata Otomatis",
          message: `Warga a.n. ${dbPayload.name} (NIK: ${nik}) otomatis didaftarkan melalui pembuatan surat ${letterType}.`,
          category: "Residents",
          is_read: false,
          timestamp: new Date().toISOString()
        }]);
      }
    }
  } catch (err) {
    console.error('Auto sync resident error:', err);
  }
}

// Sinkron data orang tua dari pembuatan surat (mis. Surat Nikah) ke data penduduk.
// HANYA mengisi field ayah/ibu yang masih kosong (tidak menimpa data yang sudah ada),
// dan mengubah relasi keluarga menjadi "Anak" bila calon masih bukan Kepala Keluarga
// serta orang tua yang dipilih berada di KK yang sama (sameKk).
export async function updateResidentParents(
  nik: string,
  data: { fatherName?: string; motherName?: string; sameKk?: boolean; source?: string }
): Promise<boolean> {
  if (!nik || nik === '-' || nik.trim() === '') return false;
  try {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return false;

    const { data: existing, error: findError } = await supabase
      .from('residents')
      .select('father_name, mother_name, no_kk, family_relation, status, is_deleted')
      .eq('nik', nik)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (findError || !existing) return false;

    const blank = (v: any) => {
      if (v === null || v === undefined) return true;
      const s = String(v).trim();
      return s === '' || s === '-';
    };

    const updates: Record<string, any> = {};
    if (data.fatherName && blank(existing.father_name)) updates.father_name = data.fatherName;
    if (data.motherName && blank(existing.mother_name)) updates.mother_name = data.motherName;

    if (Object.keys(updates).length > 0 && data.sameKk) {
      const relation = String(existing.family_relation || '').trim();
      const isHead = relation.toLowerCase().includes('kepala keluarga');
      if (!isHead && relation !== 'Anak') updates.family_relation = 'Anak';
    }

    if (Object.keys(updates).length === 0) return false;

    let query = supabase.from('residents').update(updates).eq('nik', nik).eq('tenant_id', tenantId);
    let { error } = await query;
    let retries = 0;
    while (error && error.message?.includes('Could not find the') && error.message?.includes('column') && retries < 5) {
      const match = error.message.match(/'([^']+)' column/);
      if (match && match[1]) {
        delete updates[match[1]];
        const retry = await supabase.from('residents').update(updates).eq('nik', nik).eq('tenant_id', tenantId);
        error = retry.error;
        retries++;
      } else {
        break;
      }
    }
    if (error) {
      console.error('updateResidentParents error:', error);
      return false;
    }

    window.dispatchEvent(new Event('residents_updated'));
    if (data.source) {
      addSaaSLog({
        admin: 'Sistem',
        aksi: 'Sinkron Data Orang Tua',
        target: `NIK ${nik} (via ${data.source})`,
        status: 'Berhasil',
        category: 'Penduduk'
      });
    }
    return true;
  } catch (err) {
    console.error('updateResidentParents error:', err);
    return false;
  }
}
