import { useEffect } from 'react';

const PLATFORM = 'DiDesa';

function getStoredVillageName(): string {
  try {
    const raw = localStorage.getItem('village_name') || localStorage.getItem('kop_desa') || '';
    if (!raw) return '';
    return raw.replace(/^desa\s+/i, '').trim();
  } catch (e) {
    return '';
  }
}

function getStoredAuthRole(): string | null {
  try {
    const saved = localStorage.getItem('didesa_auth_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed && parsed.role ? String(parsed.role) : null;
    }
  } catch (e) {}
  return null;
}

interface UseDynamicTitleOptions {
  villageName?: string;
  role?: string | null;
}

/**
 * Menjadikan judul tab browser dinamis mengikuti tenant/desa yang sedang aktif.
 * Format: `[Nama Desa] | DiDesa`. Untuk akun SaaS tanpa konteks desa: `SaaS Admin | DiDesa`.
 *
 * Tidak melakukan fetching API baru — hanya membaca state klien yang sudah ada
 * (`kop_desa`/`village_name`, `didesa_auth_user`) dan mendengarkan event update-nya.
 */
export function useDynamicTitle({ villageName, role }: UseDynamicTitleOptions = {}) {
  useEffect(() => {
    const computeTitle = () => {
      const vName = (villageName && villageName.trim()) || getStoredVillageName();
      const userRole = role || getStoredAuthRole();

      let title: string;
      if (!vName && userRole === 'saas_admin') {
        title = `SaaS Admin | ${PLATFORM}`;
      } else if (vName) {
        title = `${vName} | ${PLATFORM}`;
      } else {
        title = PLATFORM;
      }

      if (document.title !== title) {
        document.title = title;
      }
    };

    computeTitle();
    window.addEventListener('village_settings_updated', computeTitle);
    window.addEventListener('auth_user_updated', computeTitle);
    window.addEventListener('storage', computeTitle);
    window.addEventListener('popstate', computeTitle);

    return () => {
      window.removeEventListener('village_settings_updated', computeTitle);
      window.removeEventListener('auth_user_updated', computeTitle);
      window.removeEventListener('storage', computeTitle);
      window.removeEventListener('popstate', computeTitle);
    };
  }, [villageName, role]);
}