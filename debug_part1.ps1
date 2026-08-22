$content = Get-Content 'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx' -Raw

# Find the first grid (RT/RW)
$i1 = $content.IndexOf('grid grid-cols-2 gap-4')
$i2 = $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')
$end = $content.IndexOf('            </div>', $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')) + 16

Write-Host "i1: $i1"
Write-Host "i2: $i2"
Write-Host "end: $end"

$old = $content.Substring(0, $end)

# We need to replace from the first grid to the end of the second grid
$old = $content.Substring(0, $end + 16)

# Actually let's be more precise - find the exact content between the two grids
$i1 = $content.IndexOf('grid grid-cols-2 gap-4')
$i2 = $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')
$end = $content.IndexOf('            </div>', $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4')) + 16

Write-Host "i1: $i1"
Write-Host "i2: $i2"
Write-Host "end: $end"

$old_part = $content.Substring($content.IndexOf('grid grid-cols-2 gap-4'), $end - $content.IndexOf('grid grid-cols-2 gap-4'))

Write-Host "Old part length: " + $content.Substring($content.IndexOf('grid grid-cols-2 gap-4'), $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4') - $content.IndexOf('grid grid-cols-2 gap-4')).Length

# Save the part between the two grids for inspection
$part1 = $content.Substring($content.IndexOf('grid grid-cols-2 gap-4'), $content.IndexOf('grid grid-cols-1 md:grid-cols-3 gap-4') - $content.IndexOf('grid grid-cols-2 gap-4'))
Write-Host "Part 1 (between grids):"
Write-Host $part1