$c = Get-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx' -Raw
$i1 = $c.IndexOf('grid grid-cols-2 gap-4')
$i2 = $c.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')
$end = $c.IndexOf('            </div>', $i2) + 16
$snippet = $c.Substring($i1, $end - $i1)
$snippet = $snippet -replace "`r`n", "|NL|"
$snippet = $snippet -replace "`n", "|NL|"
Write-Host $snippet