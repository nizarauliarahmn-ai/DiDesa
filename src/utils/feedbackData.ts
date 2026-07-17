
export interface Feedback {
  id: number;
  nama: string;
  desa: string;
  email: string;
  pesan: string;
  tanggal: string;
  status: 'Baru' | 'Dibaca' | 'Selesai';
  kategori: 'Saran' | 'Kritik' | 'Bug';
}

const STORAGE_KEY = 'didesa_feedbacks';

export const getFeedbacks = (): Feedback[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  
  // Default sample data
  return [
    {
      id: 1,
      nama: 'Budi Santoso',
      desa: 'Desa Sukamakmur',
      email: 'budi@desa.id',
      pesan: 'Mohon tambahkan fitur cetak kartu keluarga secara mandiri.',
      tanggal: '2026-07-09',
      status: 'Baru',
      kategori: 'Saran'
    },
    {
      id: 2,
      nama: 'Siti Aminah',
      desa: 'Desa Sukamaju',
      email: 'siti@desa.id',
      pesan: 'Aplikasi sering logout sendiri saat sedang mengisi form surat.',
      tanggal: '2026-07-08',
      status: 'Dibaca',
      kategori: 'Bug'
    }
  ];
};

export const addFeedback = (feedback: Omit<Feedback, 'id' | 'status'>) => {
  const feedbacks = getFeedbacks();
  const newFeedback: Feedback = {
    ...feedback,
    id: Date.now(),
    status: 'Baru'
  };
  feedbacks.unshift(newFeedback);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbacks));
  window.dispatchEvent(new Event('feedback_updated'));
};

export const updateFeedbackStatus = (id: number, status: Feedback['status']) => {
  const feedbacks = getFeedbacks();
  const index = feedbacks.findIndex(f => f.id === id);
  if (index !== -1) {
    feedbacks[index].status = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbacks));
    window.dispatchEvent(new Event('feedback_updated'));
  }
};

export const deleteFeedback = (id: number) => {
  const feedbacks = getFeedbacks();
  const filtered = feedbacks.filter(f => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new Event('feedback_updated'));
};
