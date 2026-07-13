const fs = require('fs');

let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

const target = `              if (code === 'SKM') {`;

const newCode = `              const fmtDate = (d: string) => {
                if (!d) return '-';
                try { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); } catch(e) { return d; }
              };
              
              if (code === 'SKH') {
                return (
                  <>
                    <p className="text-justify leading-relaxed indent-8 mb-2">
                      Yang bertanda tangan di bawah ini Kepala {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\\s+/i, '')} Kabupaten {kabupatenName.replace(/^(kabupaten|kota)\\s+/i, '')}, menerangkan dengan sebenarnya bahwa :
                    </p>
                    <table className="w-[calc(100%-40px)] border-collapse mb-2 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
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
                    
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Berdasarkan keterangan yang bersangkutan, bahwa telah kehilangan surat / barang berharga berupa:
                    </p>
                    <table className="w-[calc(100%-40px)] border-collapse mb-2 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                      <tbody>
                        <tr><td style={{width: '30%'}}>Barang yang Hilang</td><td style={{width: '3%'}}>:</td><td><strong>{sd.barangHilang || '-'}</strong></td></tr>
                        <tr><td>Tanggal Kehilangan</td><td>:</td><td>{fmtDate(sd.tanggalKehilangan)}</td></tr>
                        <tr><td>Tempat Kehilangan</td><td>:</td><td>{sd.tempatKehilangan || '-'}</td></tr>
                        <tr><td style={{verticalAlign: 'top'}}>Keterangan</td><td style={{verticalAlign: 'top'}}>:</td><td>{sd.keteranganKehilangan || '-'}</td></tr>
                      </tbody>
                    </table>
                    
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Surat Keterangan ini dibuat untuk <strong>{surat.keperluan || '-'}</strong>.
                    </p>
                    <p className="text-justify leading-relaxed indent-8 mb-6">
                      Demikian Surat Keterangan Kehilangan ini dibuat dengan sebenarnya dan untuk dipergunakan sebagaimana mestinya.
                    </p>
                    {renderReactSignature(
                      desaName,
                      surat.tanggal,
                      namaKades,
                      'Kepala Desa',
                      (() => {
                        try {
                          const officersList = JSON.parse(localStorage.getItem('village_officers') || '[]');
                          const found = officersList.find((o: any) => o.name === namaKades);
                          return found?.nip || '-';
                        } catch(e) { return '-'; }
                      })()
                    )}
                  </>
                );
              }
              
              if (code === 'SKM') {`;

code = code.replace(target, newCode);

// Also remove the old SKH else if block
const oldSkhBlockRegex = /\} else if \(code === 'SKH'\) \{[\s\S]*?middleParagraph = `Surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya untuk keperluan:`;\n\s*/g;
code = code.replace(oldSkhBlockRegex, '} else ');

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
console.log('Patched specific SKH JSX');
