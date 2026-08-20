import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';

// ============================================================================
// Portal Warga — Lookup NIK + Sesi warga dengan masa berlaku
// - Lookup NIK dilakukan query 1 baris (privasi: tidak mengunduh seluruh DB).
// - Sesi warga disimpan di localStorage dengan TTL 60 menit (auto-logout).
// Catatan: Autentikasi OTP WhatsApp ditangguhkan (menunggu perangkat selalu-nyala).
// ============================================================================

const SESSION_TTL_MS = 60 * 60 * 1000;     // sesi warga 60 menit
const SESSION_KEY = 'didesa_verified_resident';

export interface WargaSession {
  nik: string;
  name: string;
  rtRw?: string;
  rt?: string;
  rw?: string;
  birthPlace?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  noKk?: string;
  noWhatsapp?: string;
  expiresAt: number;
}

// ----------------------------------------------------------------------------
// Normalisasi field penduduk (snake_case DB -> camelCase UI)
// ----------------------------------------------------------------------------
export function normalizeResidentFields(r: any): any {
  if (!r) return null;
  const rtRw = r.rt_rw || r.rtRw || (r.rt && r.rw ? `${r.rt} / ${r.rw}` : '');
  return {
    nik: r.nik,
    name: r.name || r.nama || '',
    rtRw,
    rt: r.rt || (rtRw ? rtRw.split('/')[0].trim() : ''),
    rw: r.rw || (rtRw ? rtRw.split('/')[1]?.trim() : ''),
    birthPlace: r.birth_place || r.birthPlace,
    birthDate: r.birth_date || r.birthDate,
    gender: r.gender || r.jenis_kelamin,
    address: r.address || r.alamat,
    noKk: r.no_kk || r.noKk,
    noWhatsapp: r.no_whatsapp || r.noWhatsapp || '',
  };
}

// ----------------------------------------------------------------------------
// Lookup NIK — query 1 baris saja (privasi: tidak mengunduh seluruh DB warga)
// ----------------------------------------------------------------------------
export async function lookupResidentByNik(nik: string): Promise<any | null> {
  const cleanNik = String(nik || '').trim();
  if (!cleanNik) return null;

  const tenantId = await resolveCurrentTenant();
  if (!tenantId) return null;

  try {
    const { data, error } = await supabase
      .from('residents')
      .select('nik, name, rt_rw, rt, rw, birth_place, birth_date, gender, address, no_kk, no_whatsapp')
      .eq('tenant_id', tenantId)
      .eq('nik', cleanNik)
      .maybeSingle();

    if (error) {
      console.error('lookupResidentByNik error:', error.message || error);
      return null;
    }
    return normalizeResidentFields(data);
  } catch (e: any) {
    console.error('lookupResidentByNik exception:', e?.message || e);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Sesi warga (TTL 60 menit, auto-logout)
// ----------------------------------------------------------------------------
export function createWargaSession(resident: any): WargaSession {
  const session: WargaSession = {
    nik: resident.nik,
    name: resident.name || '',
    rtRw: resident.rtRw,
    rt: resident.rt,
    rw: resident.rw,
    birthPlace: resident.birthPlace,
    birthDate: resident.birthDate,
    gender: resident.gender,
    address: resident.address,
    noKk: resident.noKk,
    noWhatsapp: resident.noWhatsapp,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('createWargaSession storage error:', e);
  }
  return session;
}

export function getWargaSession(): WargaSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as WargaSession;
    if (!s.expiresAt || Date.now() > s.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch (e) {
    return null;
  }
}

export function clearWargaSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    /* ignore */
  }
}

// Utility: sisa waktu sesi (menit) untuk info tampilan
export function getSessionRemainingMinutes(session: WargaSession | null): number {
  if (!session || !session.expiresAt) return 0;
  return Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 60000));
}