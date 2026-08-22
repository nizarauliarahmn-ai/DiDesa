$c = Get-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx' -Raw
$i1 = $c.IndexOf('grid grid-cols-2 gap-4')
$i2 = $c.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')
$end = $c.IndexOf('            </div>', $i2) + 16

Write-Host "i1: $i1"
Write-Host "i2: $i2"
Write-Host "end: $i"

$old = $c.Substring($i, $end - $i)
$old = $old -replace "`r`n", "|NL|"
$old = $old -replace "`n", "|NL|"
Write-Host $old