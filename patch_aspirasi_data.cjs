const fs = require('fs');
let code = fs.readFileSync('src/utils/aspirasiData.ts', 'utf8');

const defaultMock = `
  if (!data) {
    const mockData: Aspirasi[] = [
      { id: 'TKT-109283', subject: 'Infrastruktur Jalan Rusak', category: 'pengaduan', date: '2023-10-12', status: 'Selesai', content: 'Jalan di RT 03 berlubang cukup parah setelah hujan deras.', sender: 'Budi Santoso' },
      { id: 'TKT-109284', subject: 'Lampu Penerangan Jalan', category: 'saran', date: '2023-10-14', status: 'Proses', content: 'Lampu jalan utama di depan gapura RW 01 mati sudah seminggu.', sender: 'Siti Aminah' },
      { id: 'TKT-109285', subject: 'Fasilitas Kesehatan/Posyandu', category: 'umum', date: '2023-10-15', status: 'Menunggu', content: 'Mohon agar jadwal Posyandu bulan depan dipercepat karena banyak balita yang belum imunisasi.', sender: 'Dewi Lestari' },
    ];
    localStorage.setItem('didesa_aspirasi_data', JSON.stringify(mockData));
    return mockData;
  }
`;

code = code.replace("return data ? JSON.parse(data) : [];", defaultMock + "\n  return JSON.parse(data);");

fs.writeFileSync('src/utils/aspirasiData.ts', code);
