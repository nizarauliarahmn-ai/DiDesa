const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminApprovalQueue.tsx', 'utf8');

if (!code.includes('import { AnimatePresence, motion } from "motion/react";')) {
  code = code.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { AnimatePresence, motion } from 'motion/react';");
}

code = code.replace(/<tbody className="divide-y divide-gray-100">/, '<tbody className="divide-y divide-gray-100">\n                <AnimatePresence>');
code = code.replace(/<\/tbody>/, '</AnimatePresence>\n              </tbody>');

code = code.replace(/<tr key=\{item\.nik\} className="hover:bg-gray-50\/50 transition-colors">/, '<motion.tr key={item.nik} initial={{ opacity: 0, height: 0, scale: 0.95 }} animate={{ opacity: 1, height: "auto", scale: 1 }} exit={{ opacity: 0, scale: 0.9, height: 0, transition: { duration: 0.3 } }} className="hover:bg-gray-50/50 transition-colors">');
code = code.replace(/<\/tr>/g, '</motion.tr>');

fs.writeFileSync('src/components/admin/AdminApprovalQueue.tsx', code);
