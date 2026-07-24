const fs = require('fs');
let content = fs.readFileSync('server/db.ts', 'utf8');

// 1. Add maritalStatus to pgTable
content = content.replace(
  'statusColor: text("status_color"),',
  'statusColor: text("status_color"),\n  maritalStatus: text("marital_status"),'
);

// 2. Fix dummy data
content = content.replace(/status:\s*"(Kawin|Belum Kawin|Cerai Mati|Cerai Hidup)"/g, 'status: "Aktif", maritalStatus: "$1"');

// 3. Add to CREATE TABLE
content = content.replace(
  'status_color TEXT,',
  'status_color TEXT,\n        marital_status TEXT,'
);

// 4. Add ALTER TABLE
content = content.replace(
  'ALTER TABLE residents ADD COLUMN IF NOT EXISTS is_deleted INTEGER DEFAULT 0;',
  'ALTER TABLE residents ADD COLUMN IF NOT EXISTS is_deleted INTEGER DEFAULT 0;\n      ALTER TABLE residents ADD COLUMN IF NOT EXISTS marital_status TEXT;'
);

// 5. Add to normalizeResident
content = content.replace(
  'statusColor: res.statusColor || res.status_color || "gray",',
  'statusColor: res.statusColor || res.status_color || "gray",\n    maritalStatus: res.maritalStatus || res.marital_status || "Belum Kawin",'
);

// 6. Add to insertResident norm
content = content.replace(
  'status_color: resident.statusColor || "gray",',
  'status_color: resident.statusColor || "gray",\n    marital_status: resident.maritalStatus || "Belum Kawin",'
);

// 7. Add to insertResident drizzle query
content = content.replace(
  'rt, rw, status, status_color,',
  'rt, rw, status, status_color, marital_status,'
);
content = content.replace(
  'rt = EXCLUDED.rt, rw = EXCLUDED.rw,',
  'rt = EXCLUDED.rt, rw = EXCLUDED.rw,\n          marital_status = EXCLUDED.marital_status,'
);
content = content.replace(
  ', $25, $26)',
  ', $25, $26, $27)'
);
content = content.replace(
  'norm.rw, norm.status, norm.status_color,',
  'norm.rw, norm.status, norm.status_color, norm.marital_status,'
);

// 8. Add to insertResident supabase dbFormat
content = content.replace(
  'status_color: resident.statusColor,',
  'status_color: resident.statusColor,\n        marital_status: resident.maritalStatus,'
);

// 9. Add to updateResident drizzle query
content = content.replace(
  'status = $9, status_color = $10',
  'status = $9, status_color = $10, marital_status = $28'
);
content = content.replace(
  'merged.rw,\n          merged.status, merged.statusColor,',
  'merged.rw,\n          merged.status, merged.statusColor, merged.maritalStatus,'
);

// 10. Add to updateResident supabase dbFormat
content = content.replace(
  'status_color: merged.statusColor,',
  'status_color: merged.statusColor,\n        marital_status: merged.maritalStatus,'
);

fs.writeFileSync('server/db.ts', content);
