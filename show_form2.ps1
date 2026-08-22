$content = Get-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKU.tsx' -Raw
$idx = $content.IndexOf('Alamat Lengkap')
if ($idx -gt 0) {
    $start = [Math]::Max(0, $idx - 400)
    $end = [Math]::Min($content.Length, $idx + 600)
    $snippet = $content.Substring($start, $end - $start)
    Write-Host ("Found at index {0}:" -f $idx)
    Write-Host $snippet
} else {
    Write-Host 'NOT FOUND'
}