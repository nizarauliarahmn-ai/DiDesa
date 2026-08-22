$c = Get-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKU.tsx' -Raw
$i = $c.IndexOf('Alamat Lengkap')
if ($i -gt 0) {
    $s = [Math]::Max(0, $i - 400)
    $e = [Math]::Min($c.Length, $i + 800)
    $snippet = $c.Substring($s, $e - $s)
    $visible = $snippet.Replace("`r`n", "|NL|")
    Write-Host $visible
}