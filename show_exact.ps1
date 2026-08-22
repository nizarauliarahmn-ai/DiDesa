$c = Get-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKU.tsx' -Raw
$i = $c.IndexOf('Alamat Lengkap')
if ($i -gt 0) {
    $s = [Math]::Max(0, $i - 200)
    $e = [Math]::Min($c.Length, $i + 400)
    $snippet = $c.Substring($s, $e - $s)
    # Replace newlines with |NL| for visibility
    $visible = $snippet.Replace("`r`n", "|NL|")
    Write-Host "Snippet: $visible"
}