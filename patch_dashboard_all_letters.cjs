const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

const target = /              if \(code === 'SKM'\) \{[\s\S]*?\} else if \(code === 'SKPH'\) \{[\s\S]*?\}\n\n              return \([\s\S]*?\}\)\(\)\n                  \)\}\n                <\/>\n              \);\n/g;

const newBlock = `
              const DataPenduduk = () => (
                <table className="w-[calc(100%-40px)] border-collapse mb-4 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                  <tbody>
                    <tr><td style={{width: '30%'}}>Nama Lengkap</td><td style={{width: '3%'}}>:</td><td><strong className="uppercase">{name}</strong></td></tr>
                    <tr><td>NIK</td><td>:</td><td>{nik}</td></tr>
                    <tr><td>Tempat, Tanggal lahir</td><td>:</td><td>{birthPlace}, {fmtDate(birthDate)}</td></tr>
                    <tr><td>Jenis Kelamin</td><td>:</td><td>{gender}</td></tr>
                    <tr><td>Agama</td><td>:</td><td>{sd.agama || '-'}</td></tr>
                    <tr><td>Pekerjaan</td><td>:</td><td>{sd.pekerjaan || '-'}</td></tr>
                    <tr><td>Status Perkawinan</td><td>:</td><td>{sd.statusPerkawinan || '-'}</td></tr>
                    <tr><td style={{verticalAlign: 'top'}}>Alamat</td><td style={{verticalAlign: 'top'}}>:</td><td>{address} {rtRw}<br/>Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\\s+/i, '')}</td></tr>
                  </tbody>
                </table>
              );

              const pembuka = (
                <p className="text-justify leading-relaxed indent-8 mb-2">
                  Yang bertanda tangan di bawah ini Kepala {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\\s+/i, '')} Kabupaten {kabupatenName.replace(/^(kabupaten|kota)\\s+/i, '')}, menerangkan dengan sebenarnya bahwa :
                </p>
              );

              const penutup = (keperluan: string, namaSurat: string) => (
                <>
                  <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                    Surat Keterangan {namaSurat} ini diberikan atas dasar permohonan yang bersangkutan, untuk dipergunakan sebagai persyaratan administrasi <strong>{keperluan || '-'}</strong>.
                  </p>
                  <p className="text-justify leading-relaxed indent-8 mb-6">
                    Demikian Surat Keterangan {namaSurat} ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
                  </p>
                </>
              );

              if (code === 'SKM') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Nama tersebut di atas adalah benar-benar penduduk Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\\s+/i, '')}, yang mana berdasarkan laporan dan kesaksian dari pihak keluarga, yang bersangkutan telah meninggal dunia pada:
                    </p>
                    <table className="w-[calc(100%-40px)] border-collapse mb-2 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                      <tbody>
                        <tr><td style={{width: '30%'}}>Hari</td><td style={{width: '3%'}}>:</td><td>{sd.hariMeninggal || '-'}</td></tr>
                        <tr><td>Tanggal</td><td>:</td><td>{fmtDate(sd.tanggalMeninggal)}</td></tr>
                        <tr><td>Pukul</td><td>:</td><td>{sd.pukulMeninggal || '-'}</td></tr>
                        <tr><td>Tempat</td><td>:</td><td>{sd.tempatMeninggal || '-'}</td></tr>
                        <tr><td>Penyebab Kematian</td><td>:</td><td>{sd.penyebabMeninggal || '-'}</td></tr>
                      </tbody>
                    </table>
                    {penutup(surat.keperluan, 'Kematian')}
                    {renderReactSignature(
                      desaName, surat.tanggal, namaKades, 'Kepala Desa',
                      (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })()
                    )}
                  </>
                );
              } else if (code === 'SKAW') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Menyatakan dengan sesungguhnya bahwa nama warga di atas adalah <strong>ahli waris sah</strong> yang diakui secara adat dan administrasi hukum dari garis keturunan almarhum pewaris sah.
                    </p>
                    {penutup(surat.keperluan, 'Ahli Waris')}
                    {renderReactSignature(
                      desaName, surat.tanggal, namaKades, 'Kepala Desa',
                      (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })()
                    )}
                  </>
                );
              } else if (code === 'SKTM') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Nama tersebut di atas adalah benar-benar warga / penduduk yang berdomisili di Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\\s+/i, '')} dan yang bersangkutan benar-benar tergolong keluarga <strong className="italic">Kurang Mampu (Miskin)</strong>.
                    </p>
                    {penutup(surat.keperluan, 'Tidak Mampu')}
                    {renderReactSignature(
                      desaName, surat.tanggal, namaKades, 'Kepala Desa',
                      (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })()
                    )}
                  </>
                );
              } else if (code === 'SKU') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Adalah benar nama tersebut di atas merupakan warga kami yang berdomisili sah di Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\\s+/i, '')}, dan berdasarkan peninjauan kami memang benar memiliki dan aktif mengelola unit usaha perorangan mandiri dengan rincian detail sebagai berikut :
                    </p>
                    <table className="w-[calc(100%-40px)] border-collapse mb-2 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                      <tbody>
                        <tr><td style={{width: '30%'}}>Nama Usaha / Toko</td><td style={{width: '3%'}}>:</td><td><strong className="uppercase">{sd.usahaName || 'WARUNG / TOKO PERORANGAN'}</strong></td></tr>
                        <tr><td>Jenis / Bidang Usaha</td><td>:</td><td>{sd.usahaJenis || '-'}</td></tr>
                        <tr><td>Alamat Lokasi Usaha</td><td>:</td><td>{sd.usahaAlamat || address}</td></tr>
                        <tr><td>Mulai Berdiri Sejak</td><td>:</td><td>{sd.usahaMulai || '-'}</td></tr>
                        {sd.usahaNib && <tr><td>NIB / Izin Usaha</td><td>:</td><td className="font-mono font-bold">{sd.usahaNib}</td></tr>}
                        {sd.usahaOmzet && <tr><td>Estimasi Omset Bulanan</td><td>:</td><td>{sd.usahaOmzet}</td></tr>}
                      </tbody>
                    </table>
                    {penutup(surat.keperluan, 'Usaha')}
                    {renderReactSignature(
                      desaName, surat.tanggal, namaKades, 'Kepala Desa',
                      (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })()
                    )}
                  </>
                );
              } else if (code === 'SKBM') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Adalah benar nama tersebut di atas berstatus belum kawin / belum pernah menikah berdasarkan registrasi kependudukan kami.
                    </p>
                    {penutup(surat.keperluan, 'Belum Menikah')}
                    {renderReactSignature(
                      desaName, surat.tanggal, namaKades, 'Kepala Desa',
                      (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })()
                    )}
                  </>
                );
              } else if (code === 'SKL') {
                return (
                  <>
                    <p className="text-justify leading-relaxed indent-8 mb-2">
                      Yang bertanda tangan di bawah ini Kepala {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\\s+/i, '')}, menerangkan bahwa dari pasangan warga kami telah lahir seorang anak dengan identitas kependudukan terlampir di bawah ini. Adapun orang tua anak tersebut adalah:
                    </p>
                    <DataPenduduk />
                    {penutup(surat.keperluan, 'Kelahiran')}
                    {renderReactSignature(
                      desaName, surat.tanggal, namaKades, 'Kepala Desa',
                      (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })()
                    )}
                  </>
                );
              } else if (code === 'SPH') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Nama tersebut di atas adalah benar-benar penduduk Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\\s+/i, '')}, yang mana yang bersangkutan mengajukan permohonan pindah domisili dengan rincian sebagai berikut:
                    </p>
                    <table className="w-[calc(100%-40px)] border-collapse mb-2 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                      <tbody>
                        <tr><td style={{width: '30%'}}>Tanggal Pindah</td><td style={{width: '3%'}}>:</td><td>{fmtDate(sd.tanggalPindah)}</td></tr>
                        <tr><td>Alasan Pindah</td><td>:</td><td>{sd.alasanPindah || '-'}</td></tr>
                        <tr><td style={{verticalAlign: 'top'}}>Alamat Tujuan</td><td style={{verticalAlign: 'top'}}>:</td><td>{sd.alamatTujuan || '-'} RT.{sd.rtTujuan || '-'} RW.{sd.rwTujuan || '-'}<br/>Desa {sd.desaTujuan || '-'} Kecamatan {sd.kecamatanTujuan || '-'}<br/>Kab. {sd.kabupatenTujuan || '-'} Prov. {sd.provinsiTujuan || '-'}</td></tr>
                      </tbody>
                    </table>
                    {penutup(surat.keperluan, 'Pengantar Pindah')}
                    {renderReactSignature(
                      desaName, surat.tanggal, namaKades, 'Kepala Desa',
                      (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })()
                    )}
                  </>
                );
              } else if (code === 'SKPH') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Adalah benar nama tersebut di atas merupakan warga kami yang berdomisili sah di Desa {desaName.replace(/desa|kelurahan/gi, '').trim()}, dan berdasarkan data/pengakuan yang bersangkutan memiliki rincian penghasilan bulanan yang sah dengan rata-rata sebesar <strong>Rp {sd.penghasilan || '-'}</strong> per bulan.
                    </p>
                    {penutup(surat.keperluan, 'Penghasilan')}
                    {renderReactSignature(
                      desaName, surat.tanggal, namaKades, 'Kepala Desa',
                      (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })()
                    )}
                  </>
                );
              }

              return (
                <>
                  {pembuka}
                  <DataPenduduk />
                  {penutup(surat.keperluan, surat.jenis)}
                  {renderReactSignature(
                    desaName, surat.tanggal, namaKades, 'Kepala Desa',
                    (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })()
                  )}
                </>
              );
`;

const match = code.match(target);
if (match) {
  code = code.replace(target, newBlock);
  fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
  console.log('Successfully replaced logic');
} else {
  console.log('Could not find target');
}
