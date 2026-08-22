$c = Get-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx' -Raw
$i1 = $c.IndexOf('grid grid-cols-2 gap-4')
$i2 = $c.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')
Write-Host "First at $i1"
Write-Host "Second at $i2"