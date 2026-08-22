$content = Get-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx' -Raw
$i1 = $content.IndexOf('grid grid-cols-2 gap-4')
$i2 = $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')
Write-Host "First at $i1"
Write-Host "Second at $i2"
if ($i1 -gt 0) {
    $snippet = $content.Substring($i1, 200)
    Write-Host "First 200 chars at i1:`n$($content.Substring($i1, 200))"
}
if ($i2 -gt 0) {
    $snippet = $content.Substring($i2, 200)
    Write-Host "Second at i2:`n$($content.Substring($i2, 200))"
}