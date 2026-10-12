# generate-pwa-icons.ps1 — hasilkan varian icon PWA dari master (public/icons/icons.png)
# Nama file diberi hash konten agar Chrome selalu menganggap icon "baru" saat ada perubahan
# (icon PWA yang sudah ter-install di Android di-cache launcher; URL baru memaksa re-fetch).
# Cara pakai: pwsh -File scripts/generate-pwa-icons.ps1  (atau dari PowerShell biasa)
param([string]$Master = 'public/icons/icons.png')

Add-Type -AssemblyName System.Drawing

$masterPath = (Get-Item $Master).FullName
$bytes = [System.IO.File]::ReadAllBytes($masterPath)
$md5 = [System.Security.Cryptography.MD5]::Create()
$hash = ([System.BitConverter]::ToString($md5.ComputeHash($bytes)) -replace '-', '').Substring(0, 8).ToLower()
$md5.Dispose()

$src = New-Object System.Drawing.Bitmap($masterPath)
$outDir = Split-Path $masterPath -Parent

# hapus varian lama (kecuali master itu sendiri)
Get-ChildItem $outDir -Filter '*.png' | Where-Object { $_.FullName -ne $masterPath } | Remove-Item -Force

function Save-From($size, $name) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.DrawImage($script:src, 0, 0, $size, $size)
  $g.Dispose()
  $out = Join-Path $outDir ($name + '.' + $script:hash + '.png')
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output (Split-Path $out -Leaf)
}

Save-From 192 'icon-192'
Save-From 301 'icon-301'
Save-From 512 'icon-512'
Save-From 512 'icon-512-maskable'
Save-From 180 'apple-touch-icon'
$src.Dispose()
Write-Output ("HASH=" + $hash)
