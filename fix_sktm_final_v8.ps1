$content = Get-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx' -Raw

# Find exact positions
$i1 = $content.IndexOf('grid grid-cols-2 gap-4')
$i2 = $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')
$end = $content.IndexOf('            </div>', $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')) + 16

$old = $content.Substring($i1, $end - $i1)

$new = @"
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                <textarea 
                  rows={2}
                  placeholder="Contoh: Jl. Keramat, RT.001 RW.002, Desa Wasah Hilir"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                  value={formData.alamat}
                  onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                  onBlur={(e) => handleAlamatBlur(e.target.value)}
                />
              </div>
              <div className="md:col-span-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RT</label>
                {rtList.length > 0 ? (
                  <select
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.rt}
                    onChange={(e) => setFormData({...formData, rt: e.target.value})}
                  >
                    <option value="">Pilih RT</option>
                    {rtList.map((rt, i) => <option key={i} value={rt.no}>{rt.no}</option>)}
                  </select>
                ) : (
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.rt}
                    onChange={(e) => setFormData({...formData, rt: e.target.value})}
                    placeholder="Contoh: 001"
                  />
                )}
              </div>
              <div className="md:col-span-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RW</label>
                {rwList.length > 0 ? (
                  <select
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.rw}
                    onChange={(e) => setFormData({...formData, rw: e.target.value})}
                  >
                    <option value="">Pilih RW</option>
                    {rwList.map((rw, i) => <option key={i} value={rw.no}>{rw.no}</option>)}
                  </select>
                ) : (
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.rw}
                    onChange={(e) => setFormData({...formData, rw: e.target.value})}
                    placeholder="Contoh: 002"
                  />
                )}
              </div>
            </div>
"@

$content = Get-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx' -Raw
$i1 = $content.IndexOf('grid grid-cols-2 gap-4')
$i2 = $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')
$end = $content.IndexOf('            </div>', $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')) + 16
$old = $content.Substring(0, $i1) + $content.Substring($i1, $end - $i1) + $content.Substring($end)

# Replace using exact match of the portion between i1 and end
$before = $content.Substring(0, $i1)
$middle = $content.Substring($i1, $end - $i1)
$after = $content.Substring($end)

if ($middle -eq $old) {
    $new_content = $before + $new + $content.Substring($end)
    Set-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx' -Value $new_content -Encoding UTF8
    Write-Host 'SUCCESS: SKTM updated'
} else {
    Write-Host 'NOT FOUND - content mismatch'
    Write-Host "Old length: $($old.Length)"
    Write-Host "Expected old length: $($old.Length)"
}