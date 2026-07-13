const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

const target = /              if \(code === 'SKM'\) \{/g;

const skdSkpBlock = `              if (code === 'SKD') {
                return (
                  <>
                    <p className="text-justify leading-relaxed indent-8 mb-2">
                      Menerangkan bahwa:
                    </p>
                    <table className="w-[calc(100%-40px)] border-collapse mb-4 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                      <tbody>
                        <tr><td style={{width: '30%'}}>a. Nama</td><td style={{width: '3%'}}>:</td><td><strong className="uppercase">{name}</strong></td></tr>
                        <tr><td>b. NIK</td><td>:</td><td>{nik}</td></tr>
                        <tr><td>c. Jenis Kelamin</td><td>:</td><td>{gender}</td></tr>
                        <tr><td>d. Tempat, Tgl Lahir</td><td>:</td><td>{birthPlace}, {fmtDate(birthDate)}</td></tr>
                        <tr><td>e. Pekerjaan</td><td>:</td><td>{sd.pekerjaan || '-'}</td></tr>
                        <tr><td>f. Kewarganegaraan</td><td>:</td><td>{sd.kewarganegaraan || 'WNI'}</td></tr>
                        <tr><td>g. Status Perkawinan</td><td>:</td><td>{sd.statusPerkawinan || '-'}</td></tr>
                        <tr><td>h. Agama</td><td>:</td><td>{sd.agama || '-'}</td></tr>
                        <tr><td style={{verticalAlign: 'top'}}>i. Alamat</td><td style={{verticalAlign: 'top'}}>:</td><td>{address} {rtRw}<br/>Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\\s+/i, '')}</td></tr>
                        <tr><td style={{verticalAlign: 'top'}}>j. Alamat Sekarang</td><td style={{verticalAlign: 'top'}}>:</td><td>{sd.alamatSekarang || '-'} RT.{sd.rtSekarang || '-'} RW.{sd.rwSekarang || '-'}<br/>Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\\s+/i, '')}</td></tr>
                      </tbody>
                    </table>
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Berdasarkan surat pernyataan dan keterangan yang dibuat oleh yang bersangkutan, nama tersebut di atas menyatakan dengan sadar bahwa ia memang berstatus <strong className="uppercase">DOMISILI {sd.sifatDomisili || '-'}</strong> di alamat sekarang tersebut.
                    </p>
                    {penutup(surat.keperluan, 'Domisili')}
                    {renderReactSignature(
                      desaName, surat.tanggal, namaKades, 'Kepala Desa',
                      (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })()
                    )}
                  </>
                );
              } else if (code === 'SKP') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Bahwa nama tersebut di atas terhitung mulai tanggal <strong>{fmtDate(sd.tanggalPindah)}</strong> mengajukan permohonan pindah domisili dengan rincian sebagai berikut:
                    </p>
                    <table className="w-[calc(100%-40px)] border-collapse mb-2 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                      <tbody>
                        <tr><td style={{width: '30%'}}>Alamat Tujuan Pindah</td><td style={{width: '3%'}}>:</td><td>{sd.alamatTujuan || '-'}</td></tr>
                        <tr><td>RT / RW Tujuan</td><td>:</td><td>RT. {sd.rtTujuan || '-'} / RW. {sd.rwTujuan || '-'}</td></tr>
                        <tr><td>Desa / Kelurahan Tujuan</td><td>:</td><td>{sd.desaTujuan || '-'}</td></tr>
                        <tr><td>Kecamatan Tujuan</td><td>:</td><td>{sd.kecamatanTujuan || '-'}</td></tr>
                        <tr><td>Kabupaten / Kota Tujuan</td><td>:</td><td>{sd.kabupatenTujuan || '-'}</td></tr>
                        <tr><td>Provinsi Tujuan</td><td>:</td><td>{sd.provinsiTujuan || '-'}</td></tr>
                        <tr><td>Alasan Pindah</td><td>:</td><td><strong>{sd.alasanPindah || '-'}</strong></td></tr>
                        <tr><td>Jml Keluarga Pindah</td><td>:</td><td>{sd.jumlahKeluargaPindah || '0'} Orang</td></tr>
                      </tbody>
                    </table>
                    {penutup(surat.keperluan, 'Pengantar Pindah')}
                    {renderReactSignature(
                      desaName, surat.tanggal, namaKades, 'Kepala Desa',
                      (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })()
                    )}
                  </>
                );
              } else if (code === 'SKM') {`;

code = code.replace(target, skdSkpBlock);

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
console.log('Patched SKD and SKP!');
