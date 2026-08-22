$content = Get-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx' -Raw
$idx = $content.IndexOf('Alamat Lengkap')
if ($idx -gt 0) {
    $start = [Math]::Max(0, $idx - 300)
    $end = [Math]::Min($content.Length, $idx + 500)
    $snippet = $content.Substring($start, $end - $start)
    Write-Host ("Found at index {0}:" -f $idx)
    Write-Host $snippet
} else {
    Write-Host 'NOT FOUND'
}