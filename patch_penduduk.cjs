const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminPenduduk.tsx', 'utf8');

if (!code.includes('import { AnimatePresence, motion } from "motion/react";')) {
  code = code.replace("import React, { useState, useMemo, useEffect } from 'react';", "import React, { useState, useMemo, useEffect } from 'react';\nimport { AnimatePresence, motion } from 'motion/react';");
}

code = code.replace(/<tbody className="divide-y divide-gray-100">/, '<tbody className="divide-y divide-gray-100">\n              <AnimatePresence>');
code = code.replace(/<\/tbody>/, '</AnimatePresence>\n            </tbody>');

code = code.replace(/<tr onClick=\{onView\} className="hover:bg-gray-50\/80 transition-colors group cursor-pointer">/, '<motion.tr initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, height: 0, transition: { duration: 0.3 } }} onClick={onView} className="hover:bg-gray-50/80 transition-colors group cursor-pointer">');
code = code.replace(/<\/tr>/g, '</motion.tr>');

// Fix the thead closing tag, similar to before
code = code.replace(/<thead[\s\S]*?<\/thead>/, match => match.replace(/<\/motion\.tr>/g, '</tr>'));

fs.writeFileSync('src/components/admin/AdminPenduduk.tsx', code);
