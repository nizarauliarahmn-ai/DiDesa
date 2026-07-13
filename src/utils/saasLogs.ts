
export interface SaaSLog {
  id: number;
  admin: string;
  aksi: string;
  target: string;
  tanggal: string;
  waktu: string;
  status: 'Berhasil' | 'Gagal' | 'Peringatan';
}

const STORAGE_KEY = 'didesa_saas_logs';

export const getSaaSLogs = (): SaaSLog[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  
  // Default sample logs
  const logs: SaaSLog[] = [
    {
      id: 1,
      admin: 'Nizar Aulia',
      aksi: 'Update Branding Global',
      target: 'Platform DiDesa',
      tanggal: '2026-07-10',
      waktu: '00:15:22',
      status: 'Berhasil'
    },
    {
      id: 2,
      admin: 'Sistem',
      aksi: 'Auto Backup Database',
      target: 'Cloud SQL',
      tanggal: '2026-07-09',
      waktu: '23:00:01',
      status: 'Berhasil'
    },
    {
      id: 3,
      admin: 'Nizar Aulia',
      aksi: 'Login Gagal',
      target: 'SaaS Command Center',
      tanggal: '2026-07-09',
      waktu: '22:45:10',
      status: 'Gagal'
    }
  ];
  return logs;
};

export const addSaaSLog = (log: Omit<SaaSLog, 'id' | 'tanggal' | 'waktu'>) => {
  const logs = getSaaSLogs();
  const now = new Date();
  const newLog: SaaSLog = {
    ...log,
    id: Date.now(),
    tanggal: now.toISOString().split('T')[0],
    waktu: now.toTimeString().split(' ')[0]
  };
  logs.unshift(newLog);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 500))); // Keep last 500
  window.dispatchEvent(new Event('saas_logs_updated'));
};
