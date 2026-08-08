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
        marital_status: letterData.maritalStatus || letterData.statusPerkawinan || 'Belum Kawin',
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
        status_color: 'emerald',
        created_at: nowIso
      };

      const { error } = await supabase.from('residents').insert([dbPayload]);
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
