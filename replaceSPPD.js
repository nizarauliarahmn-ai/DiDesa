const fs = require('fs');
const file = 'C:/Users/Gambar Ibung/.gemini/antigravity/scratch/DiDesa/src/components/admin/surat/AdminSuratSPPD.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = 'srcDoc={`';
const endStr = '`}';
const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex + startStr.length);

if (startIndex > -1 && endIndex > -1) {
  const before = content.substring(0, startIndex + startStr.length);
  const after = content.substring(endIndex);

  const newHtml = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <title>Surat Perjalanan Dinas (SPPD)</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                      @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap');
                      body { font-family: 'Times New Roman', Times, serif; background: white; margin: 0; padding: 0; }
                      .page-a4 { width: 210mm; min-height: 297mm; padding: 15mm 20mm; position: relative; page-break-after: always; box-sizing: border-box; }
                      .page-landscape { width: 330mm; min-height: 210mm; padding: 10mm 15mm; position: relative; page-break-after: always; box-sizing: border-box; }
                      .page-a4:last-child, .page-landscape:last-child { page-break-after: auto; }
                      .print-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                      .print-table th, .print-table td { border: 1px solid black; padding: 4px 8px; vertical-align: top; }
                      
                      @media print {
                        body { background: white; }
                        .page-a4, .page-landscape { padding: 0 !important; min-height: auto; box-shadow: none; margin: 0; }
                        
                        \${printLayout === 'spt' ? \`
                          @page { size: portrait; margin: 15mm 20mm; }
                          .page-spt { display: block; }
                          .page-sppd { display: none; }
                          .page-laporan { display: none; }
                        \` : ''}
                        
                        \${printLayout === 'sppd' ? \`
                          @page { size: landscape; margin: 10mm 15mm; }
                          .page-spt { display: none; }
                          .page-sppd { display: block; }
                          .page-laporan { display: none; }
                        \` : ''}

                        \${printLayout === 'laporan' ? \`
                          @page { size: portrait; margin: 15mm 20mm; }
                          .page-spt { display: none; }
                          .page-sppd { display: none; }
                          .page-laporan { display: block; }
                        \` : ''}

                        \${printLayout === 'semua' ? \`
                          @page { size: portrait; margin: 15mm 20mm; }
                          .page-spt { display: block; }
                          .page-sppd { display: block; }
                          .page-laporan { display: block; }
                        \` : ''}
                      }

                      /* Non-print layout visibility */
                      \${printLayout !== 'semua' ? \`
                        .page-spt { display: \${printLayout === 'spt' ? 'block' : 'none'}; }
                        .page-sppd { display: \${printLayout === 'sppd' ? 'block' : 'none'}; }
                        .page-laporan { display: \${printLayout === 'laporan' ? 'block' : 'none'}; }
                      \` : ''}
                    </style>
                  </head>
                  <body>

                    <!-- HALAMAN 1: SURAT TUGAS -->
                    <div class="page-a4 page-spt bg-white shadow-lg mb-8 mx-auto" style="\${printLayout === 'semua' ? 'margin-bottom: 2rem;' : ''}">
                      \${SAAS_CONFIG.globalHeaderHTML}
                      
                      <div class="text-[14px] text-black">
                        <div class="text-center mb-6">
                          <h6 class="font-bold underline uppercase text-[16px] tracking-wide">SURAT TUGAS</h6>
                          <p class="font-bold">\${kodeKlasifikasi} / \${nomorSurat}</p>
                        </div>

                        <div class="mb-4 text-justify">
                          Berdasarkan \${dasarPenugasan},
                        </div>

                        <div class="text-center font-bold mb-4">MEMERINTAHKAN</div>
                        
                        <table class="print-table mb-6">
                          <thead>
                            <tr>
                              <th class="w-12 text-center">NO</th>
                              <th class="text-center">NAMA</th>
                              <th class="text-center">JABATAN</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td class="text-center">1</td>
                              <td>\${namaPegawai}</td>
                              <td>\${jabatanPegawai}</td>
                            </tr>
                            \${pengikut.map((p, i) => \`
                              <tr>
                                <td class="text-center">\${i+2}</td>
                                <td>\${p.nama}</td>
                                <td>\${p.keterangan || '-'}</td>
                              </tr>
                            \`).join('')}
                          </tbody>
                        </table>

                        <div class="grid grid-cols-[120px_10px_1fr] gap-1 mb-8">
                          <span>Hari/Tanggal</span><span>:</span>
                          <span>\${formatDateFull(tanggalBerangkat)}</span>
                          
                          <span>Perihal</span><span>:</span>
                          <span>\${maksudPerjalanan}</span>

                          <span>Tempat</span><span>:</span>
                          <span>\${tempatTujuan}</span>
                        </div>

                        <div class="mb-8">Demikian surat tugas ini untuk dilaksanakan sebagaimana mestinya.</div>

                        \${getReactSignaturePreview(desaName, currentDateFormatted(), namaKades, roleKades, nipKades, includeCamat)}
                      </div>
                    </div>

                    <!-- HALAMAN 2: VISUM SPPD (LANDSCAPE) -->
                    <div class="page-landscape page-sppd bg-white shadow-lg mb-8 mx-auto" style="\${printLayout === 'semua' ? 'margin-bottom: 2rem;' : ''}">
                      <div class="flex gap-4 h-full">
                        
                        <!-- Kiri -->
                        <div class="w-[53%] pr-4 border-r border-gray-400">
                          \${SAAS_CONFIG.globalHeaderHTML}
                          <div class="flex justify-center my-4">
                            <div class="w-full h-px bg-black"></div>
                          </div>
                          
                          <div class="text-center text-[12px] mb-4">
                            <div class="grid grid-cols-[120px_10px_1fr] text-left mx-auto max-w-[200px]">
                              <span>Kode Nomor</span><span>:</span><span>\${kodeKlasifikasi}</span>
                              <span>Nomor</span><span>:</span><span>\${kodeKlasifikasi}/\${nomorSurat}</span>
                            </div>
                            <h6 class="font-bold underline uppercase text-[14px] mt-2">SURAT PERJALANAN DINAS</h6>
                          </div>

                          <table class="print-table text-[11px] mb-4">
                            <tbody>
                              <tr>
                                <td class="w-6 text-center">1</td>
                                <td class="w-[140px]">Pejabat berwenang yang memberi perintah</td>
                                <td>Kepala \${desaName}</td>
                              </tr>
                              <tr>
                                <td class="text-center">2</td>
                                <td>Nama / NIP Pegawai yang diperintahkan</td>
                                <td class="font-bold">\${namaPegawai} \${nipPegawai ? '/ ' + nipPegawai : ''}</td>
                              </tr>
                              <tr>
                                <td class="text-center">3</td>
                                <td>a. Pangkat dan golongan ruang gaji<br>b. Jabatan<br>c. Tingkat menurut peraturan perjalanan</td>
                                <td>a. \${pangkatGolongan || '-'}<br>b. \${jabatanPegawai || '-'}<br>c. -</td>
                              </tr>
                              <tr>
                                <td class="text-center">4</td>
                                <td>Maksud perjalanan dinas</td>
                                <td>\${maksudPerjalanan}</td>
                              </tr>
                              <tr>
                                <td class="text-center">5</td>
                                <td>Alat angkut yang dipergunakan</td>
                                <td>\${alatAngkut}</td>
                              </tr>
                              <tr>
                                <td class="text-center">6</td>
                                <td>a. Tempat berangkat<br>b. Tempat tujuan</td>
                                <td>a. \${tempatBerangkat}<br>b. \${tempatTujuan}</td>
                              </tr>
                              <tr>
                                <td class="text-center">7</td>
                                <td>a. Lamanya perjalanan dinas<br>b. Tanggal berangkat<br>c. Tanggal harus kembali</td>
                                <td>a. \${lamaPerjalanan}<br>b. \${formatDateFull(tanggalBerangkat)}<br>c. \${formatDateFull(tanggalKembali)}</td>
                              </tr>
                              <tr>
                                <td class="text-center">8</td>
                                <td colspan="2">
                                  <div class="grid grid-cols-[1fr_80px_1fr] font-bold border-b border-black pb-1 mb-1">
                                    <div>Pengikut Nama</div>
                                    <div>Umur/Tgl Lahir</div>
                                    <div>Keterangan</div>
                                  </div>
                                  \${pengikut.length > 0 ? pengikut.map((p, i) => \`
                                    <div class="grid grid-cols-[15px_1fr_80px_1fr]">
                                      <div>\${i+1}.</div>
                                      <div>\${p.nama}</div>
                                      <div>\${p.umur}</div>
                                      <div>\${p.keterangan}</div>
                                    </div>
                                  \`).join('') : '<div class="text-center italic">-</div>'}
                                </td>
                              </tr>
                              <tr>
                                <td class="text-center">9</td>
                                <td>Pembebanan anggaran<br>a. Instansi<br>b. Mata anggaran</td>
                                <td>a. \${bebanAnggaran}<br>b. \${mataAnggaran || '-'}</td>
                              </tr>
                              <tr>
                                <td class="text-center">10</td>
                                <td>Keterangan lain-lain</td>
                                <td>-</td>
                              </tr>
                            </tbody>
                          </table>

                          <div class="flex justify-end text-[11px] mt-4">
                            <div class="w-[200px]">
                              <div class="grid grid-cols-[80px_10px_1fr]">
                                <span>Dikeluarkan di</span><span>:</span><span>\${desaName.replace(/desa|kelurahan/gi, '').trim()}</span>
                                <span>Pada tanggal</span><span>:</span><span>\${currentDateFormatted()}</span>
                              </div>
                              <div class="mt-2 font-bold">\${roleKades},</div>
                              <div class="h-12"></div>
                              <div class="font-bold underline">\${namaKades}</div>
                            </div>
                          </div>
                        </div>
                        
                        <!-- Kanan -->
                        <div class="w-[47%] pl-4 text-[11px] flex flex-col">
                          
                          <!-- Box I -->
                          <div class="grid grid-cols-[1fr_auto] mb-2">
                            <div></div>
                            <div>
                              <div class="grid grid-cols-[20px_100px_10px_1fr]">
                                <span>I.</span><span>SPPD Nomor</span><span>:</span><span>\${kodeKlasifikasi}/\${nomorSurat}</span>
                                <span></span><span>Berangkat dari</span><span>:</span><span>\${tempatBerangkat}</span>
                                <span></span><span>Pada tanggal</span><span>:</span><span>\${formatDateFull(tanggalBerangkat)}</span>
                                <span></span><span>Ke</span><span>:</span><span>\${tempatTujuan}</span>
                              </div>
                              <div class="mt-4 mb-8 text-center">Pejabat Pelaksana Teknis Kegiatan,</div>
                              <div class="text-center font-bold">\${namaPPTK || '................................'}</div>
                            </div>
                          </div>

                          <!-- Box II -->
                          <div class="border-t border-black py-2 grid grid-cols-2 gap-2">
                            <div>
                              <div class="grid grid-cols-[20px_60px_10px_1fr]">
                                <span>II.</span><span>Tiba di</span><span>:</span><span>\${tempatTujuan}</span>
                                <span></span><span>Pada tanggal</span><span>:</span><span>\${formatDateFull(tanggalBerangkat)}</span>
                                <span></span><span>Kepala</span><span>:</span><span></span>
                              </div>
                              <div class="h-10"></div>
                              <div class="text-center">(.......................................)</div>
                            </div>
                            <div>
                              <div class="grid grid-cols-[80px_10px_1fr]">
                                <span>Berangkat dari</span><span>:</span><span>\${tempatTujuan}</span>
                                <span>Ke</span><span>:</span><span>\${tempatBerangkat}</span>
                                <span>Pada Tanggal</span><span>:</span><span>\${formatDateFull(tanggalKembali)}</span>
                              </div>
                              <div class="h-10"></div>
                              <div class="text-center">(.......................................)</div>
                            </div>
                          </div>

                          <!-- Box III -->
                          <div class="border-t border-black py-2 grid grid-cols-2 gap-2">
                            <div>
                              <div class="grid grid-cols-[20px_60px_10px_1fr]">
                                <span>III.</span><span>Tiba di</span><span>:</span><span></span>
                                <span></span><span>Pada tanggal</span><span>:</span><span></span>
                                <span></span><span>Kepala</span><span>:</span><span></span>
                              </div>
                              <div class="h-10"></div>
                              <div class="text-center">(.......................................)</div>
                            </div>
                            <div>
                              <div class="grid grid-cols-[80px_10px_1fr]">
                                <span>Berangkat dari</span><span>:</span><span></span>
                                <span>Ke</span><span>:</span><span></span>
                                <span>Pada Tanggal</span><span>:</span><span></span>
                              </div>
                              <div class="h-10"></div>
                              <div class="text-center">(.......................................)</div>
                            </div>
                          </div>

                          <!-- Box IV -->
                          <div class="border-t border-black py-2 grid grid-cols-2 gap-2">
                            <div>
                              <div class="grid grid-cols-[20px_60px_10px_1fr]">
                                <span>IV.</span><span>Tiba di</span><span>:</span><span></span>
                                <span></span><span>Pada tanggal</span><span>:</span><span></span>
                                <span></span><span>Kepala</span><span>:</span><span></span>
                              </div>
                              <div class="h-10"></div>
                              <div class="text-center">(.......................................)</div>
                            </div>
                            <div>
                              <div class="grid grid-cols-[80px_10px_1fr]">
                                <span>Berangkat dari</span><span>:</span><span></span>
                                <span>Ke</span><span>:</span><span></span>
                                <span>Pada Tanggal</span><span>:</span><span></span>
                              </div>
                              <div class="h-10"></div>
                              <div class="text-center">(.......................................)</div>
                            </div>
                          </div>

                          <!-- Box V -->
                          <div class="border-t border-black py-2 grid grid-cols-2 gap-2">
                            <div>
                              <div class="grid grid-cols-[20px_60px_10px_1fr]">
                                <span>V.</span><span>Tiba di</span><span>:</span><span>\${tempatBerangkat}</span>
                                <span></span><span>Pada tanggal</span><span>:</span><span>\${formatDateFull(tanggalKembali)}</span>
                              </div>
                              <div class="col-span-2 mt-2">
                                Telah diperiksa dengan keterangan bahwa perjalanan tersebut di atas benar dilakukan atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.
                              </div>
                            </div>
                            <div>
                              <div class="mt-8 text-center font-bold">\${roleKades},</div>
                              <div class="h-10"></div>
                              <div class="text-center font-bold">\${namaKades}</div>
                            </div>
                          </div>

                          <!-- Box VI & VII -->
                          <div class="border-t border-black mt-auto pt-1 grid grid-cols-[20px_1fr]">
                            <span>VI.</span><span class="font-bold underline">CATATAN LAIN-LAIN</span>
                          </div>
                          <div class="border-t border-black mt-1 pt-1 grid grid-cols-[20px_1fr]">
                            <span>VII.</span>
                            <div>
                              <span class="font-bold underline">PERHATIAN</span>
                              <div class="text-[9px] mt-1 text-justify">
                                Pejabat yang berwenang menerbitkan SPPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat/tiba serta Bendaharawan bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila Negara menderita kerugian akibat kesalahan, kelalaian dan kealpaannya.
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>

                    <!-- HALAMAN 3: LEMBAR LAPORAN -->
                    <div class="page-a4 page-laporan bg-white shadow-lg mx-auto">
                      
                      <div class="text-[14px] text-black pt-12">
                        <div class="text-center mb-10">
                          <h6 class="font-bold uppercase text-[16px] tracking-wide">LAPORAN PERJALANAN DINAS</h6>
                        </div>

                        <div class="grid grid-cols-[150px_10px_1fr] gap-2 mb-8 max-w-xl mx-auto">
                          <span>Kepada Yth</span><span>:</span><span>\${kepadaYth}</span>
                          <span>Dari</span><span>:</span><span></span>
                          <span>Nama</span><span>:</span><span>\${namaPegawai}</span>
                          <span>Jabatan</span><span>:</span><span>\${jabatanPegawai}</span>
                          <span>Hari/Tanggal</span><span>:</span><span>\${formatDateFull(tanggalBerangkat)}</span>
                          <span>Perihal</span><span>:</span><span>\${maksudPerjalanan}</span>
                          <span>Tempat</span><span>:</span><span>\${tempatTujuan}</span>
                        </div>

                        <div class="grid grid-cols-[150px_10px_1fr] gap-2 mb-8 max-w-xl mx-auto">
                          <span>HASIL PERJALANAN</span><span>:</span><span></span>
                        </div>

                        <div class="flex justify-end pr-10 mt-32">
                          <div class="text-center w-[250px]">
                            <p>Yang Melaporkan,</p>
                            <div class="h-24"></div>
                            <p class="font-bold">\${namaPegawai}</p>
                          </div>
                        </div>

                      </div>
                    </div>

                  </body>
                </html>
  \`;

  content = before + newHtml + after;
  fs.writeFileSync(file, content);
  console.log('Successfully updated AdminSuratSPPD.tsx');
} else {
  console.log('Failed to find boundaries in AdminSuratSPPD.tsx');
}
