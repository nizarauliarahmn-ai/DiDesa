with open('C:/Users/ASUS/.gemini/antigravity/scratch/DiDesa/src/components/admin/surat/AdminSuratSKTM.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find line numbers for the grids
start1 = None
end1 = None
start2 = None
end2 = None

for i, line in enumerate(lines):
    if 'grid grid-cols-2 gap-4' in line and start1 is None:
        start1 = i
    if 'grid grid-cols-1 md:grid-cols-3 gap-4' in line and start2 is None:
        start2 = i
    if start2 is not None and '            </div>' in line and line.strip() == '</div>' and end2 is None:
        # Check if this is the closing div for the second grid
        # Look for the closing div that matches the second grid
        pass

# Find end of second grid - look for the closing </div> after the second grid starts
if start2 is not None:
    for i in range(start2, len(lines)):
        if lines[i].strip() == '</div>' and i > start2:
            # Check if this closes the second grid (should be at indent level of the grid)
            if lines[i-1].strip() == '</div>' or lines[i].strip() == '</div>':
                end2 = i
                break

print(f"start1: {start1}, end1: {start1 + 44}")  # approx
print(f"start2: {start2}")

# Print lines around the grids
for i in range(665, 780):
    print(f"{i}: {lines[i].rstrip()}")