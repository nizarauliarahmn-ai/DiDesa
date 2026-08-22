$content = Get-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx' -Raw

$i1 = $content.IndexOf('grid grid-cols-2 gap-4')
$i2 = $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')
$end = $content.IndexOf('            </div>', $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')) + 16

$old = $content.Substring($i1, $i2 - $i1 + $end - $i2)

$new = @"
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Jl. Keramat, Desa Wasah Hilir"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                  value={formData.alamat}
                  onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                  onBlur={(e) => handleAlamatBlur(e.target.value)}
                />
              </div>
              <div className="md:col-span-1 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RT</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  placeholder="Contoh: 001"
                  value={formData.rt}
                  onChange={(e) => setFormData(prev => ({ ...prev, rt: e.target.value }))}
                />
              </div>
              <div className="md:col-span-1 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RW</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  placeholder="Contoh: 002"
                  value={formData.rw}
                  onChange={(e) => setFormData(prev => ({ ...prev, rw: e.target.value }))}
                />
              </div>
            </div>
"@

$content = Get-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx' -Raw
$i1 = $content.IndexOf('grid grid-cols-2 gap-4')
$i2 = $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')
$end = $content.IndexOf('            </div>', $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')) + 16
$old = $content.Substring($i1, $end - $i1)

if ($content -match [System.Text.RegularExpressions.Regex]::Escape($old)) {
    $content = $content -replace [System.Text.RegularExpressions.Regex]::Escape($old), $new
    Set-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx' -Value $content -Encoding UTF8
    Write-Host 'SUCCESS: SKTM updated'
} else {
    Write-Host 'NOT FOUND'
}