const fs = require('fs');

let code = fs.readFileSync('src/components/admin/surat/AdminSuratSKH.tsx', 'utf8');

// Replace form state
code = code.replace(
  /keperluan: 'Bantuan Beasiswa',/,
  `keperluan: 'Persyaratan Administrasi',
    
    // Data Kehilangan
    barangHilang: '',
    tanggalKehilangan: '',
    tempatKehilangan: '',
    keteranganKehilangan: '',`
);

// Replace UI inputs
const keperluanInputPattern = `<div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700">Keperluan Surat (Diberikan Untuk...)</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Bantuan Beasiswa"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    value={formData.keperluan}
                    onChange={(e) => setFormData({...formData, keperluan: e.target.value})}
                  />
                  <p className="mt-1 text-[10px] text-emerald-600 font-medium">* Tuliskan secara spesifik tujuan pembuatan surat ini.</p>
                </div>`;

const newFieldsUI = `<div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700">Barang yang Hilang</label>
                  <input 
                    type="text"
                    placeholder="Contoh: KTP, Kartu ATM BRI, Buku Tabungan"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    value={formData.barangHilang}
                    onChange={(e) => setFormData({...formData, barangHilang: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Tanggal Kehilangan</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                      value={formData.tanggalKehilangan}
                      onChange={(e) => setFormData({...formData, tanggalKehilangan: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Tempat Kehilangan</label>
                    <input 
                      type="text"
                      placeholder="Contoh: Perjalanan dari Wasah Hilir ke Kandangan"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                      value={formData.tempatKehilangan}
                      onChange={(e) => setFormData({...formData, tempatKehilangan: e.target.value})}
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700">Keterangan Tambahan</label>
                  <textarea 
                    rows={2}
                    placeholder="Contoh: Hilang beserta dompet warna hitam"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none"
                    value={formData.keteranganKehilangan}
                    onChange={(e) => setFormData({...formData, keteranganKehilangan: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700">Keperluan Surat</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Persyaratan pembuatan KTP baru"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    value={formData.keperluan}
                    onChange={(e) => setFormData({...formData, keperluan: e.target.value})}
                  />
                </div>`;

code = code.replace(keperluanInputPattern, newFieldsUI);

// We also need to update the iframe print HTML.
// Looking for the SKTM HTML pattern to replace with SKH HTML.

fs.writeFileSync('src/components/admin/surat/AdminSuratSKH.tsx', code);
console.log('Patched SKH form');
