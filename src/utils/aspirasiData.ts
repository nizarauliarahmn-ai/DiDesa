export interface Aspirasi {
  id: string;
  sender: string;
  category: string;
  subject: string;
  content: string;
  fileName?: string | null;
  adminResponse?: {
    text: string;
    fileName?: string | null;
    date: string;
  } | null;
  status: 'Menunggu' | 'Proses' | 'Selesai';
  date: string;
}

export function getAspirasi(): Aspirasi[] {
  const data = localStorage.getItem('didesa_aspirasi_data');
  
  if (!data) {
    const mockData: Aspirasi[] = [];
    localStorage.setItem('didesa_aspirasi_data', JSON.stringify(mockData));
    return mockData;
  }

  return JSON.parse(data);
}

export function saveAspirasi(newAspirasi: Aspirasi) {
  const current = getAspirasi();
  current.unshift(newAspirasi);
  localStorage.setItem('didesa_aspirasi_data', JSON.stringify(current));
  window.dispatchEvent(new Event('didesa_aspirasi_updated'));
}

export function updateAspirasiStatus(id: string, status: 'Menunggu' | 'Proses' | 'Selesai', response?: { text: string; fileName?: string | null }) {
  const current = getAspirasi();
  const updated = current.map(item => item.id === id ? { 
    ...item, 
    status,
    adminResponse: response ? { ...response, date: new Date().toISOString() } : item.adminResponse
  } : item);
  localStorage.setItem('didesa_aspirasi_data', JSON.stringify(updated));
  window.dispatchEvent(new Event('didesa_aspirasi_updated'));
}
